"use client";

import { useEffect } from "react";

/**
 * Hook that automatically detects Persian text in the DOM and applies Persian font
 */
export function usePersianFontDetection() {
  useEffect(() => {
    const persianRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
    const processed = new WeakSet<Element>();

    const detectAndApplyPersianFont = () => {
      const textElements = document.querySelectorAll(
        'h1, h2, h3, h4, h5, h6, p, span, div, label, button, a, li, td, th, option'
      );

      textElements.forEach((element) => {
        if (processed.has(element) || ['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName)) {
          return;
        }

        const textContent = element.textContent || '';

        if (persianRegex.test(textContent)) {
          element.classList.add('force-persian');
        }

        processed.add(element);
      });
    };

    detectAndApplyPersianFont();

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
        setTimeout(detectAndApplyPersianFont, 100);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
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