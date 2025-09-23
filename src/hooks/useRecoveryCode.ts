import { useState, useCallback, useMemo } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useClipboard } from '@/lib/clipboard';

interface UseRecoveryCodeReturn {
  isGenerating: boolean;
  generatedCode: string | null;
  isModalOpen: boolean;
  isCodeVisible: boolean;
  isCopied: boolean;
  generateCode: () => Promise<void>;
  copyCode: () => Promise<void>;
  toggleCodeVisibility: () => void;
  closeModal: () => void;
  statusText: string;
  maskedCode: string;
}

export const useRecoveryCode = (): UseRecoveryCodeReturn => {
  const { token } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCodeVisible, setIsCodeVisible] = useState(false);
  
  // Use optimized clipboard hook
  const { copyText, isCopied, error: clipboardError } = useClipboard(2000);

  // No need to check if recovery code exists - always allow generation
  const generateRecoveryMutation = useMutation(api.auth.generateRecoveryCode);

  // Memoized handlers
  const generateCode = useCallback(async () => {
    if (!token || isGenerating) return;
    
    setIsGenerating(true);
    try {
      const result = await generateRecoveryMutation({ token });
      setGeneratedCode(result.recoveryCode);
      setIsModalOpen(true);
      toast.success("Recovery code generated successfully!");
    } catch (error: any) {
      toast.error(error.message || "Failed to generate recovery code");
    } finally {
      setIsGenerating(false);
    }
  }, [token, generateRecoveryMutation, isGenerating]);

  const copyCode = useCallback(async () => {
    if (!generatedCode || isCopied) return;
    
    const success = await copyText(generatedCode);
    if (success) {
      toast.success("Recovery code copied to clipboard!");
    } else {
      toast.error(clipboardError?.message || "Failed to copy to clipboard");
    }
  }, [generatedCode, isCopied, copyText, clipboardError]);

  const toggleCodeVisibility = useCallback(() => {
    setIsCodeVisible(prev => !prev);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setGeneratedCode(null);
    setIsCodeVisible(false);
    // Note: isCopied state is managed by useClipboard hook
  }, []);

  // Memoized computed values
  const statusText = useMemo(() => {
    return "Generate a recovery code for password reset";
  }, []);

  const maskedCode = useMemo(() => {
    return isCodeVisible ? (generatedCode || "") : "••••-••••-••";
  }, [isCodeVisible, generatedCode]);

  return {
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
  };
};