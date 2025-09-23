/**
 * Efficient clipboard utility with fallback support
 * Provides cross-browser clipboard functionality with error handling
 */

interface ClipboardOptions {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  fallbackElement?: HTMLElement;
}

class ClipboardManager {
  private static instance: ClipboardManager;
  
  private constructor() {}
  
  public static getInstance(): ClipboardManager {
    if (!ClipboardManager.instance) {
      ClipboardManager.instance = new ClipboardManager();
    }
    return ClipboardManager.instance;
  }

  /**
   * Efficiently copy text to clipboard with modern API and fallback
   */
  public async copyText(text: string, options: ClipboardOptions = {}): Promise<boolean> {
    const { onSuccess, onError } = options;
    
    try {
      // Try modern clipboard API first
      if (this.isClipboardAPISupported()) {
        await navigator.clipboard.writeText(text);
        onSuccess?.();
        return true;
      }
      
      // Fallback to execCommand for older browsers
      const success = await this.fallbackCopyText(text, options.fallbackElement);
      if (success) {
        onSuccess?.();
        return true;
      }
      
      throw new Error('All clipboard methods failed');
    } catch (error) {
      const clipboardError = error instanceof Error ? error : new Error('Unknown clipboard error');
      onError?.(clipboardError);
      return false;
    }
  }

  /**
   * Check if modern clipboard API is supported
   */
  private isClipboardAPISupported(): boolean {
    return !!(
      navigator.clipboard &&
      typeof navigator.clipboard.writeText === 'function' &&
      window.isSecureContext
    );
  }

  /**
   * Fallback clipboard method using execCommand
   */
  private async fallbackCopyText(text: string, containerElement?: HTMLElement): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        const textArea = document.createElement('textarea');
        
        // Configure textarea for reliable copying
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        textArea.style.top = '-9999px';
        textArea.style.opacity = '0';
        textArea.style.pointerEvents = 'none';
        textArea.style.zIndex = '-1';
        textArea.setAttribute('readonly', '');
        textArea.setAttribute('aria-hidden', 'true');
        textArea.setAttribute('tabindex', '-1');
        
        // Use provided container or document body
        const container = containerElement || document.body;
        container.appendChild(textArea);
        
        // Select and copy text
        textArea.select();
        textArea.setSelectionRange(0, text.length);
        
        const success = document.execCommand('copy');
        container.removeChild(textArea);
        
        resolve(success);
      } catch (error) {
        console.error('Fallback copy failed:', error);
        resolve(false);
      }
    });
  }

  /**
   * Read text from clipboard (if supported)
   */
  public async readText(): Promise<string | null> {
    try {
      if (this.isClipboardAPISupported() && navigator.clipboard.readText) {
        return await navigator.clipboard.readText();
      }
      return null;
    } catch (error) {
      console.error('Clipboard read failed:', error);
      return null;
    }
  }

  /**
   * Check if clipboard contains text
   */
  public async hasText(): Promise<boolean> {
    try {
      const text = await this.readText();
      return text !== null && text.length > 0;
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const clipboardManager = ClipboardManager.getInstance();

// Convenience function for simple text copying
export const copyToClipboard = async (
  text: string, 
  options: ClipboardOptions = {}
): Promise<boolean> => {
  return clipboardManager.copyText(text, options);
};

// React hook for clipboard operations
import { useCallback, useState } from 'react';

interface UseClipboardReturn {
  copyText: (text: string) => Promise<boolean>;
  isCopied: boolean;
  resetCopiedState: () => void;
  error: Error | null;
}

export const useClipboard = (resetDelay: number = 2000): UseClipboardReturn => {
  const [isCopied, setIsCopied] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const copyText = useCallback(async (text: string): Promise<boolean> => {
    setError(null);
    
    const success = await copyToClipboard(text, {
      onSuccess: () => {
        setIsCopied(true);
        if (resetDelay > 0) {
          setTimeout(() => setIsCopied(false), resetDelay);
        }
      },
      onError: (err) => {
        setError(err);
        setIsCopied(false);
      }
    });
    
    return success;
  }, [resetDelay]);

  const resetCopiedState = useCallback(() => {
    setIsCopied(false);
    setError(null);
  }, []);

  return {
    copyText,
    isCopied,
    resetCopiedState,
    error
  };
};