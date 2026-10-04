"use client";

import type { ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface DropdownMenuProps {
  isOpen: boolean;
  children: ReactNode;
  className?: string;
}

export function DropdownMenu({
  isOpen,
  children,
  className = "",
}: DropdownMenuProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -10 }}
          className={`absolute right-4 top-4 mt-2 pr-3 w-max max-w-[calc(100%-24px)] bg-surface-raised rounded-lg shadow-raised z-50 border border-border-subtle overflow-hidden ${className}`.trim()}
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
