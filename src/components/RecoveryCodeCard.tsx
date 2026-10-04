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
    className="px-6 h-[40px] bg-surface-hover text-ink-primary border-2 border-border-default rounded-[12px] font-medium text-[14px] shadow-neumo hover:bg-surface-active disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center cursor-pointer"
  >
    {isLoading ? "Generating..." : "Generate"}
  </button>
));
RecoveryCodeActions.displayName = 'RecoveryCodeActions';

const CodeVisibilityToggle = memo(({ isVisible, onToggle }: { isVisible: boolean; onToggle: () => void }) => (
  <button
    onClick={onToggle}
    className="flex items-center space-x-2 px-3 py-2 bg-surface-hover text-ink-primary rounded-md hover:bg-surface-active border border-border-subtle text-sm transition-colors cursor-pointer"
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
    className="flex items-center space-x-2 px-3 py-2 bg-accent text-accent-foreground rounded-md hover:bg-accent-hover text-sm transition-colors cursor-pointer"
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
        <div className="w-full flex items-center justify-between px-4 py-3 gap-4">
          <div className="flex flex-col items-start justify-center">
            <p className="font-medium text-[16px] text-ink-primary whitespace-nowrap">
              Recovery Code
            </p>
            <p className="font-normal text-ink-secondary text-[12px] mt-0.5 leading-tight">
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
            className="fixed inset-0 bg-surface-overlay flex items-center justify-center p-4 z-50 backdrop-blur-xs"
            onClick={closeModal}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-surface-raised border border-border-subtle rounded-lg p-6 max-w-md w-full shadow-raised"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center mb-6">
                <Shield className="mx-auto mb-4 text-sync-synced" size={48} />
                <h3 className="text-xl font-semibold text-ink-primary mb-2">
                  Recovery Code Generated
                </h3>
                <p className="text-sm text-ink-secondary">
                  Save this code in a safe place. It will not be shown again.
                </p>
              </div>

              <div className="mb-6">
                <div className="relative">
                  <div className="bg-surface-sunken p-4 rounded-lg font-mono text-lg text-center border-2 border-dashed border-border-default text-ink-primary">
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

              <div className="bg-sync-syncing/10 border border-sync-syncing/30 p-4 rounded-lg mb-6">
                <div className="text-sm text-sync-syncing">
                  <strong>Important:</strong> This recovery code allows anyone to reset your password. 
                  Store it securely and never share it with others.
                </div>
              </div>

              <button
                onClick={closeModal}
                className="w-full py-3 bg-accent text-accent-foreground font-medium rounded-md hover:bg-accent-hover cursor-pointer"
              >
                I&apos;ve Saved It Safely
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
});

RecoveryCodeCard.displayName = 'RecoveryCodeCard';