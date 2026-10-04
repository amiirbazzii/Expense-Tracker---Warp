"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { ConvexError } from "convex/values";
import { motion } from "framer-motion";
import { toast } from "sonner";
import Link from "next/link";
import { Shield, ArrowLeft } from "lucide-react";
import { RECOVERY_CODE_KEY } from "@/lib/recoveryCodeHandoff";

export default function ForgotPasswordPage() {
  const [recoveryCode, setRecoveryCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const validateRecoveryMutation = useMutation(api.auth.validateRecoveryCode);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!recoveryCode.trim()) {
      toast.error("Please enter your recovery code.");
      return;
    }

    setIsLoading(true);
    try {
      await validateRecoveryMutation({ recoveryCode: recoveryCode.trim() });
      toast.success("Recovery code verified!");

      // Hand the code to the reset page via sessionStorage rather than the URL.
      // A code in the query string leaks into browser history, Referer headers,
      // server logs and the service worker's page cache.
      sessionStorage.setItem(RECOVERY_CODE_KEY, recoveryCode.trim());
      router.push("/reset-password");
    } catch (error: unknown) {
      const message = error instanceof ConvexError 
        ? (error.data as { message: string }).message 
        : error instanceof Error 
        ? error.message 
        : "Invalid recovery code. Please try again.";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-page flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full space-y-8"
      >
        <div className="text-center">
          <Shield className="mx-auto mb-4 text-accent" size={48} />
          <h2 className="text-3xl font-extrabold text-ink-primary">
            Forgot Password?
          </h2>
          <p className="mt-2 text-sm text-ink-secondary">
            Enter your recovery code to reset your password
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="recoveryCode" className="block text-sm font-medium text-ink-primary mb-2">
              Recovery Code
            </label>
            <input
              id="recoveryCode"
              name="recoveryCode"
              type="text"
              required
              placeholder="AB12-CD34-EF"
              className="appearance-none rounded-md relative block w-full px-3 py-2 border border-border-default placeholder-ink-tertiary text-ink-primary bg-surface-raised focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent sm:text-sm font-mono"
              value={recoveryCode}
              onChange={(e) => setRecoveryCode(e.target.value.toUpperCase())}
              disabled={isLoading}
              maxLength={12}
            />
            <p className="mt-1 text-xs text-ink-tertiary">
              Enter the 10-character recovery code from your settings
            </p>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-accent-foreground bg-accent hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent disabled:opacity-50 min-h-[44px] cursor-pointer"
            >
              {isLoading ? "Verifying..." : "Verify Recovery Code"}
            </button>
          </div>
        </form>

        <div className="text-center space-y-2">
          <Link
            href="/login"
            className="inline-flex items-center space-x-2 font-medium text-ink-link hover:text-ink-link-hover text-sm"
          >
            <ArrowLeft size={16} />
            <span>Back to Login</span>
          </Link>
          
          <div className="text-xs text-ink-tertiary">
            Don&apos;t have a recovery code? Contact support or access Settings from a logged-in device.
          </div>
        </div>
      </motion.div>
    </div>
  );
}
