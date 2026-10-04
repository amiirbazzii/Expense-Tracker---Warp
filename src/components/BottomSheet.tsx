"use client";

import { useEffect, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

export function BottomSheet({
  open,
  onClose,
  title,
  children,
}: BottomSheetProps) {
  // Close on escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-[60] bg-surface-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            className="fixed inset-x-0 bottom-0 z-[70] px-2"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 280, damping: 30 }}
          >
            <div className="mx-auto max-w-md bg-surface-raised rounded-t-2xl shadow-raised">
              {/* Drag handle */}
              <div className="flex justify-center pt-3 pb-3">
                <div className="w-16 h-[5px] bg-accent rounded-full" />
              </div>

              {/* Header row */}
              <div className="flex items-center px-4">
                <div className="flex-1" />
                <h3 className="text-xl font-medium text-center text-ink-primary">
                  {title}
                </h3>
                <div className="flex-1 flex justify-end">
                  <button
                    onClick={onClose}
                    className="rounded-full p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-ink-secondary hover:text-ink-primary hover:bg-surface-hover transition-colors"
                    aria-label="Close"
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="max-h-[70vh] overflow-y-auto p-4 pb-10">
                {children}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
