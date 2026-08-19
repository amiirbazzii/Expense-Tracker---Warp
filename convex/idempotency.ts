import {
  v,
  type ObjectType,
  type PropertyValidators,
} from "convex/values";
import { mutation, type MutationCtx } from "./_generated/server";

/**
 * Wrap a mutation so a retried delivery cannot apply twice.
 *
 * The offline sync queue dequeues an item only *after* the server's response
 * arrives. If the mutation commits but the response is lost (page closed,
 * connection dropped), the next session re-sends it — without this wrapper
 * that meant a duplicate expense/income/card on the server.
 *
 * The client sends the queue item's UUID as `idempotencyKey`. On the first
 * delivery the handler runs and its result is recorded in `mutationLog`
 * atomically with the handler's own writes (a Convex mutation is one
 * transaction). A re-delivery finds the key and returns the recorded result,
 * so the client can still link cloud ids from it.
 *
 * Calls without a key (e.g. direct online mutations) run the handler as-is.
 * The handler body is untouched — auth, validation and writes stay exactly
 * where they were.
 */
export function idempotentMutation<Args extends PropertyValidators>(def: {
  args: Args;
  handler: (ctx: MutationCtx, args: ObjectType<Args>) => Promise<any>;
}) {
  return mutation({
    args: { ...def.args, idempotencyKey: v.optional(v.string()) } as any,
    handler: async (ctx: MutationCtx, args: any) => {
      const { idempotencyKey, ...rest } = args;
      if (!idempotencyKey || typeof args.token !== "string") {
        return def.handler(ctx, rest);
      }

      const user = await ctx.db
        .query("users")
        .withIndex("by_token", (q: any) =>
          q.eq("tokenIdentifier", args.token),
        )
        .first();

      // Unknown token: let the handler raise its own auth error.
      if (!user) return def.handler(ctx, rest);

      const applied = await ctx.db
        .query("mutationLog")
        .withIndex("by_user_key", (q: any) =>
          q.eq("userId", user._id).eq("key", idempotencyKey),
        )
        .first();
      if (applied) return applied.result;

      const result = await def.handler(ctx, rest);
      await ctx.db.insert("mutationLog", {
        userId: user._id,
        key: idempotencyKey,
        result: result ?? null,
        createdAt: Date.now(),
      });
      return result;
    },
  });
}
