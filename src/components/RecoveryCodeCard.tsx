"use client";

import { memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Eye, EyeOff, Copy, CheckCircle } from "lucide-react";
import { useRecoveryCode } from "@/hooks/useRecoveryCode";

// Memoized sub-components for better performance
const RecoveryCodeActions = memo(({ onGenerate, isLoading }: { onGenerate: () => void; isLoading: boolean }) => (
  <button
    onClick={onGenerate}
    disabled={isLoading}
    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
  >
    {isLoading ? "Generating..." : "Generate"}
  </button>
));
RecoveryCodeActions.displayName = 'RecoveryCodeActions';

const CodeVisibilityToggle = memo(({ isVisible, onToggle }: { isVisible: boolean; onToggle: () => void }) => (
  <button
    onClick={onToggle}
    className="flex items-center space-x-2 px-3 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm transition-colors"
    type="button"
  >
    {isVisible ? <EyeOff size={16} /> : <Eye size={16} />}
    <span>{isVisible ? "Hide" : "Show"}</span>
  </button>
));
CodeVisibilityToggle.displayName = 'CodeVisibilityToggle';

const CopyButton = memo(({ onCopy, isCopied }: { onCopy: () => void; isCopied: boolean }) => (
  <button
    onClick={onCopy}
    className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm transition-colors"
    type="button"
  >
    {isCopied ? <CheckCircle size={16} /> : <Copy size={16} />}
    <span>{isCopied ? "Copied!" : "Copy"}</span>
  </button>
));
CopyButton.displayName = 'CopyButton';

export const RecoveryCodeCard = memo(() => {
  const {
    isGenerating,
    generatedCode,
    isModalOpen,
    isCodeVisible,
    isCopied,
    generateCode,
    copyCode,
    toggleCodeVisibility,
    closeModal,
    statusText,
    maskedCode,
  } = useRecoveryCode();



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
                  {statusText}
                </div>
              </div>
            </div>
            
            <RecoveryCodeActions
              onGenerate={generateCode}
              isLoading={isGenerating}
            />
          </div>
        </div>
      </div>

      {/* Generate Recovery Code Modal */}
      <AnimatePresence>
        {isModalOpen && generatedCode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={closeModal}
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
                    {maskedCode}
                  </div>
                  
                  <div className="flex justify-center space-x-2 mt-3">
                    <CodeVisibilityToggle
                      isVisible={isCodeVisible}
                      onToggle={toggleCodeVisibility}
                    />
                    
                    <CopyButton
                      onCopy={copyCode}
                      isCopied={isCopied}
                    />
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
                onClick={closeModal}
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
});

RecoveryCodeCard.displayName = 'RecoveryCodeCard';