import { v } from "convex/values";
import { mutation, query, QueryCtx, MutationCtx } from "./_generated/server";
import { ConvexError } from "convex/values";
import { Doc } from "./_generated/dataModel";

// Look up a user by session token.
//
// Deliberately NOT cached in module scope: Convex spreads execution across many
// isolates, so a process-local cache can only ever be cleared in one of them.
// That let revoked tokens keep authenticating from warm isolates, and it hid the
// `users` read from Convex's dependency tracking, breaking query reactivity.
// The `by_token` index makes this lookup cheap on its own.
export const getUserByToken = async ({ ctx, token }: { ctx: any; token: string }): Promise<Doc<"users"> | null> => {
  if (!token) {
    return null;
  }

  return await ctx.db
    .query("users")
    .withIndex("by_token", (q: any) => q.eq("tokenIdentifier", token))
    .first();
};

// Helper function to hash password (simple version for demo)
function hashPassword(password: string): string {
  // In production, use bcrypt or similar
  // Using a simple hash for demo purposes
  let hash = 0;
  const saltedPassword = password + "expense-tracker-salt";
  for (let i = 0; i < saltedPassword.length; i++) {
    const char = saltedPassword.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(36);
}

// Helper function to generate token with better entropy
function generateToken(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Helper function to generate recovery code with cryptographically secure randomness
function createRecoveryCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  // 256 is not a multiple of 36, so `byte % 36` would bias the first four
  // letters. Reject bytes in the short tail instead of folding them in.
  const limit = 256 - (256 % chars.length); // 252

  let result = '';
  const buf = new Uint8Array(1);
  while (result.length < 10) {
    crypto.getRandomValues(buf);
    if (buf[0] >= limit) continue;
    result += chars.charAt(buf[0] % chars.length);
  }
  // Format as AB12-CD34-EF
  return `${result.slice(0, 4)}-${result.slice(4, 8)}-${result.slice(8)}`;
}

// Helper function to hash recovery code (same method as password)
function hashRecoveryCode(recoveryCode: string): string {
  return hashPassword(recoveryCode);
}

// Constant-time over equal-length inputs, so credential checks don't leak the
// hash byte-by-byte via response timing. Length is compared up front, which is
// fine here: both sides are fixed-format base36 hashes.
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

// Minimum password length, enforced on the server for every path that sets a
// password. The client checks this too, but the client can be bypassed.
const MIN_PASSWORD_LENGTH = 6;

function assertPasswordPolicy(password: string) {
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new ConvexError({
      message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters long`,
    });
  }
}

// Look up a user by recovery code hash using the `by_recovery_code` index.
// The previous implementation used `.filter()`, which scans the entire users
// table on every attempt from an unauthenticated endpoint.
async function findUserByRecoveryCode(
  ctx: QueryCtx | MutationCtx,
  recoveryCode: string,
): Promise<Doc<"users"> | null> {
  const hashedRecoveryCode = hashRecoveryCode(recoveryCode);

  return await ctx.db
    .query("users")
    .withIndex("by_recovery_code", (q) =>
      q.eq("hashedRecoveryCode", hashedRecoveryCode),
    )
    .first();
}

export const register = mutation({
  args: {
    username: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    // Normalize username to lowercase
    const normalizedUsername = args.username.trim().toLowerCase();

    if (!normalizedUsername) {
      throw new ConvexError({ message: "Username cannot be empty" });
    }

    assertPasswordPolicy(args.password);

    // Check if user already exists (case-insensitive because we always store lowercase)
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", normalizedUsername))
      .first();

    if (existingUser) {
      throw new ConvexError({ message: "Username already exists" });
    }

    // Create new user
    const hashedPassword = hashPassword(args.password);
    const tokenIdentifier = generateToken();

    const user = {
      username: normalizedUsername,
      hashedPassword,
      tokenIdentifier,
      hasSeenOnboarding: false,
    };

    const userId = await ctx.db.insert("users", user);

    // Seed default income categories
    const defaultIncomeCategories = [
      "Salary",
      "Freelance",
      "Investment",
      "Gift",
      "Other",
    ];

    for (const categoryName of defaultIncomeCategories) {
      await ctx.db.insert("incomeCategories", {
        name: categoryName,
        userId: userId,
      });
    }

    return { userId, token: tokenIdentifier };
  },
});

export const login = mutation({
  args: {
    username: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const normalizedUsername = args.username.trim().toLowerCase();
    const user = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", normalizedUsername))
      .first();

    // Same error whether the username is unknown or the password is wrong, so
    // the endpoint can't be used to enumerate which accounts exist.
    const invalidCredentials = new ConvexError({
      message: "Invalid username or password",
    });

    if (!user) {
      throw invalidCredentials;
    }

    const hashedPassword = hashPassword(args.password);
    if (!safeEqual(user.hashedPassword, hashedPassword)) {
      throw invalidCredentials;
    }

    // Generate new token
    const tokenIdentifier = generateToken();
    await ctx.db.patch(user._id, { tokenIdentifier });

    return { userId: user._id, token: tokenIdentifier };
  },
});

export const getCurrentUser = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", args.token))
      .first();

    if (!user) {
      return null;
    }

    return {
      _id: user._id,
      username: user.username,
    };
  },
});

export const logout = mutation({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", args.token))
      .first();

    if (user) {
      // Invalidate token
      const newToken = generateToken();
      await ctx.db.patch(user._id, { tokenIdentifier: newToken });
    }

    return { success: true };
  },
});

// Generate recovery code for user
export const generateRecoveryCode = mutation({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getUserByToken({ ctx, token: args.token });
    if (!user) {
      throw new ConvexError({ message: "Authentication required" });
    }

    const recoveryCode = createRecoveryCode();
    const hashedRecoveryCode = hashRecoveryCode(recoveryCode);
    const recoveryCodeCreatedAt = Date.now();

    await ctx.db.patch(user._id, {
      hashedRecoveryCode,
      recoveryCodeCreatedAt,
    });

    return { recoveryCode };
  },
});

// Validate recovery code and allow password reset
export const validateRecoveryCode = mutation({
  args: {
    recoveryCode: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await findUserByRecoveryCode(ctx, args.recoveryCode);

    if (!user) {
      throw new ConvexError({ message: "Invalid recovery code" });
    }

    // Deliberately does not return the userId or username: this endpoint is
    // unauthenticated, and echoing back the account it matched turns it into a
    // user-enumeration oracle.
    return { valid: true };
  },
});

// Reset password using recovery code
export const resetPasswordWithRecoveryCode = mutation({
  args: {
    recoveryCode: v.string(),
    newPassword: v.string(),
  },
  handler: async (ctx, args) => {
    assertPasswordPolicy(args.newPassword);

    const user = await findUserByRecoveryCode(ctx, args.recoveryCode);

    if (!user) {
      throw new ConvexError({ message: "Invalid recovery code" });
    }

    const hashedPassword = hashPassword(args.newPassword);
    const tokenIdentifier = generateToken();

    await ctx.db.patch(user._id, {
      hashedPassword,
      tokenIdentifier,
      // Recovery codes are single-use. Leaving the code valid after a reset
      // means anyone who ever saw it keeps a permanent password-reset backdoor,
      // even once the password has been changed. The user can mint a new one
      // from Settings at any time.
      hashedRecoveryCode: undefined,
      recoveryCodeCreatedAt: undefined,
    });

    return { userId: user._id, token: tokenIdentifier };
  },
});
