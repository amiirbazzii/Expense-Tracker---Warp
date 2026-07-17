"use client";

import { memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Eye, EyeOff, Copy, CheckCircle } from "lucide-react";
import { useRecoveryCode } from "@/hooks/useRecoveryCode";
import { SettingsCard } from "@/components/settings/SettingsCard";

// Memoized sub-components for better performance
const RecoveryCodeActions = memo(({ onGenerate, isLoading }: { onGenerate: () => void; isLoading: boolean }) => (
  <button
    onClick={onGenerate}
    disabled={isLoading}
    className="px-6 h-[40px] bg-[#e1e1e1] text-black border-2 border-[#cacaca] rounded-[12px] font-medium text-[14px] shadow-[inset_0px_2px_2px_0px_rgba(255,255,255,0.5),0px_2px_6px_0px_rgba(0,0,0,0.15)] hover:bg-[#d5d5d5] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center cursor-pointer"
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
      <SettingsCard title="Security">
        {/* Recovery Code row */}
        <div className="w-full flex items-center justify-between px-4 py-3 drop-shadow-[0px_3px_2px_rgba(0,0,0,0.03)] gap-4">
          <div className="flex flex-col items-start justify-center">
            <p className="font-medium text-[16px] text-black whitespace-nowrap">
              Recovery Code
            </p>
            <p className="font-normal text-[#707070] text-[12px] mt-0.5 leading-tight">
              {statusText}
            </p>
          </div>
          
          <div className="shrink-0">
            <RecoveryCodeActions
              onGenerate={generateCode}
              isLoading={isGenerating}
            />
          </div>
        </div>
      </SettingsCard>

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