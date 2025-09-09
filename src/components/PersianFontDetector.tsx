"use client";

import { useEffect } from "react";

/**
 * Hook that automatically detects Persian text in the DOM and applies Persian font
 */
export function usePersianFontDetection() {
  useEffect(() => {
    const persianRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
    
    const detectAndApplyPersianFont = () => {
      // Select all text-containing elements
      const textElements = document.querySelectorAll(
        'h1, h2, h3, h4, h5, h6, p, span, div, label, button, a, li, td, th, option'
      );
      
      textElements.forEach((element) => {
        // Skip if already processed or is an input/textarea/select
        if (
          element.hasAttribute('data-font-processed') ||
          ['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName)
        ) {
          return;
        }
        
        const textContent = element.textContent || '';
        
        // Check if element contains Persian characters
        if (persianRegex.test(textContent)) {
          element.classList.add('force-persian');
          // Keep everything LTR for now - no RTL behavior
          // Future: This is where RTL direction would be applied
        }
        
        // Mark as processed
        element.setAttribute('data-font-processed', 'true');
      });
    };
    
    // Initial detection
    detectAndApplyPersianFont();
    
    // Set up mutation observer to detect dynamically added content
    const observer = new MutationObserver((mutations) => {
      let shouldReprocess = false;
      
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              shouldReprocess = true;
            }
          });
        }
      });
      
      if (shouldReprocess) {
        // Debounce the reprocessing
        setTimeout(detectAndApplyPersianFont, 100);
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    return () => {
      observer.disconnect();
    };
  }, []);
}

/**
 * Component that enables automatic Persian font detection for its children
 */
export function PersianFontDetector({ children }: { children: React.ReactNode }) {
  usePersianFontDetection();
  return <>{children}</>;
}