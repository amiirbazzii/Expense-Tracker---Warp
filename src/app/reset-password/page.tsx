"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { ConvexError } from "convex/values";
import { motion } from "framer-motion";
import { toast } from "sonner";
import Link from "next/link";
import { Shield, ArrowLeft, Eye, EyeOff } from "lucide-react";

function ResetPasswordForm() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState("");
  const [username, setUsername] = useState("");
  
  const router = useRouter();
  const searchParams = useSearchParams();

  const resetPasswordMutation = useMutation(api.auth.resetPasswordWithRecoveryCode);

  useEffect(() => {
    const codeParam = searchParams.get("code");
    const usernameParam = searchParams.get("username");
    
    if (codeParam) {
      setRecoveryCode(decodeURIComponent(codeParam));
    }
    
    if (usernameParam) {
      setUsername(decodeURIComponent(usernameParam));
    }
    
    // If no recovery code in URL, redirect to forgot password
    if (!codeParam) {
      router.push("/forgot-password");
    }
  }, [searchParams, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newPassword.trim() || !confirmPassword.trim()) {
      toast.error("Please fill in all password fields.");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters long.");
      return;
    }

    if (!recoveryCode) {
      toast.error("Recovery code is missing.");
      return;
    }

    setIsLoading(true);
    try {
      const result = await resetPasswordMutation({ 
        recoveryCode,
        newPassword 
      });
      
      toast.success("Password reset successfully! Logging you in...");
      
      // Store the new token and redirect
      localStorage.setItem("auth-token", result.token);
      router.push("/expenses");
    } catch (error: unknown) {
      const message = error instanceof ConvexError 
        ? (error.data as { message: string }).message 
        : error instanceof Error 
        ? error.message 
        : "Failed to reset password. Please try again.";
      toast.error(message);
      
      // If recovery code is invalid, redirect back to forgot password
      if (message.toLowerCase().includes("invalid recovery code")) {
        setTimeout(() => router.push("/forgot-password"), 2000);
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!recoveryCode) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
          <div className="mt-4 text-lg font-medium text-gray-900">Redirecting...</div>
          <div className="mt-2 text-sm text-gray-600">Taking you to the forgot password page</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full space-y-8"
      >
        <div className="text-center">
          <Shield className="mx-auto mb-4 text-green-600" size={48} />
          <h2 className="text-3xl font-extrabold text-gray-900">
            Reset Password
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {username ? `Reset password for ${username}` : "Set your new password"}
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
                New Password
              </label>
              <div className="relative">
                <input
                  id="newPassword"
                  name="newPassword"
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Enter new password (at least 6 characters)"
                  className="appearance-none rounded-md relative block w-full px-3 py-2 pr-10 border border-gray-300 placeholder-gray-500 text-gray-900 bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  placeholder="Confirm new password"
                  className="appearance-none rounded-md relative block w-full px-3 py-2 pr-10 border border-gray-300 placeholder-gray-500 text-gray-900 bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 min-h-[44px]"
            >
              {isLoading ? "Resetting Password..." : "Reset Password"}
            </button>
          </div>
        </form>

        <div className="text-center">
          <Link
            href="/forgot-password"
            className="inline-flex items-center space-x-2 font-medium text-blue-600 hover:text-blue-500 text-sm"
          >
            <ArrowLeft size={16} />
            <span>Back to Recovery Code</span>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
          <div className="mt-4 text-lg font-medium text-gray-900">Loading...</div>
          <div className="mt-2 text-sm text-gray-600">Preparing password reset</div>
        </div>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}