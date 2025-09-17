"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAuth } from "@/contexts/AuthContext";
import { Shield, Eye, EyeOff, Copy, CheckCircle } from "lucide-react";
import { toast } from "sonner";

export function RecoveryCodeCard() {
  const { token } = useAuth();
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [isCodeVisible, setIsCodeVisible] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const hasRecoveryCode = useQuery(api.auth.hasRecoveryCode, token ? { token } : "skip");
  const generateRecoveryMutation = useMutation(api.auth.generateRecoveryCode);

  const handleGenerateCode = async () => {
    if (!token) return;
    
    try {
      const result = await generateRecoveryMutation({ token });
      setGeneratedCode(result.recoveryCode);
      setShowGenerateModal(true);
      toast.success("Recovery code generated successfully!");
    } catch (error: any) {
      toast.error(error.message || "Failed to generate recovery code");
    }
  };

  const handleCopyCode = async () => {
    if (!generatedCode) return;
    
    try {
      await navigator.clipboard.writeText(generatedCode);
      setIsCopied(true);
      toast.success("Recovery code copied to clipboard!");
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  };

  const handleCloseModal = () => {
    setShowGenerateModal(false);
    setGeneratedCode(null);
    setIsCodeVisible(false);
    setIsCopied(false);
  };

  return (
    <>
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Security</h3>
        
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Shield className="text-blue-600" size={20} />
              <div>
                <div className="font-medium text-gray-900">Recovery Code</div>
                <div className="text-sm text-gray-600">
                  {hasRecoveryCode 
                    ? "You have a recovery code set up" 
                    : "Set up a recovery code for password reset"
                  }
                </div>
              </div>
            </div>
            
            <button
              onClick={handleGenerateCode}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
            >
              {hasRecoveryCode ? "Regenerate" : "Generate"}
            </button>
          </div>
        </div>
      </div>

      {/* Generate Recovery Code Modal */}
      <AnimatePresence>
        {showGenerateModal && generatedCode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={handleCloseModal}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-lg p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center mb-6">
                <Shield className="mx-auto mb-4 text-green-600" size={48} />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Recovery Code Generated
                </h3>
                <p className="text-sm text-gray-600">
                  Save this code in a safe place. It will not be shown again.
                </p>
              </div>

              <div className="mb-6">
                <div className="relative">
                  <div className="bg-gray-100 p-4 rounded-lg font-mono text-lg text-center border-2 border-dashed border-gray-300 text-gray-900">
                    {isCodeVisible ? generatedCode : "••••-••••-••"}
                  </div>
                  
                  <div className="flex justify-center space-x-2 mt-3">
                    <button
                      onClick={() => setIsCodeVisible(!isCodeVisible)}
                      className="flex items-center space-x-2 px-3 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm"
                    >
                      {isCodeVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                      <span>{isCodeVisible ? "Hide" : "Show"}</span>
                    </button>
                    
                    <button
                      onClick={handleCopyCode}
                      className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                    >
                      {isCopied ? <CheckCircle size={16} /> : <Copy size={16} />}
                      <span>{isCopied ? "Copied!" : "Copy"}</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg mb-6">
                <div className="text-sm text-yellow-800">
                  <strong>Important:</strong> This recovery code allows anyone to reset your password. 
                  Store it securely and never share it with others.
                </div>
              </div>

              <button
                onClick={handleCloseModal}
                className="w-full py-3 bg-gray-900 text-white rounded-md hover:bg-gray-800"
              >
                I've Saved It Safely
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}