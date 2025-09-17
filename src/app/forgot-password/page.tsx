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
      const result = await validateRecoveryMutation({ recoveryCode: recoveryCode.trim() });
      toast.success("Recovery code verified!");
      
      // Navigate to reset password page with the validated user info
      router.push(`/reset-password?code=${encodeURIComponent(recoveryCode.trim())}&username=${encodeURIComponent(result.username)}`);
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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full space-y-8"
      >
        <div className="text-center">
          <Shield className="mx-auto mb-4 text-blue-600" size={48} />
          <h2 className="text-3xl font-extrabold text-gray-900">
            Forgot Password?
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Enter your recovery code to reset your password
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="recoveryCode" className="block text-sm font-medium text-gray-700 mb-2">
              Recovery Code
            </label>
            <input
              id="recoveryCode"
              name="recoveryCode"
              type="text"
              required
              placeholder="AB12-CD34-EF"
              className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm font-mono"
              value={recoveryCode}
              onChange={(e) => setRecoveryCode(e.target.value.toUpperCase())}
              disabled={isLoading}
              maxLength={12}
            />
            <p className="mt-1 text-xs text-gray-500">
              Enter the 10-character recovery code from your settings
            </p>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 min-h-[44px]"
            >
              {isLoading ? "Verifying..." : "Verify Recovery Code"}
            </button>
          </div>
        </form>

        <div className="text-center space-y-2">
          <Link
            href="/login"
            className="inline-flex items-center space-x-2 font-medium text-blue-600 hover:text-blue-500 text-sm"
          >
            <ArrowLeft size={16} />
            <span>Back to Login</span>
          </Link>
          
          <div className="text-xs text-gray-500">
            Don't have a recovery code? Contact support or access Settings from a logged-in device.
          </div>
        </div>
      </motion.div>
    </div>
  );
}
