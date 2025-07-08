"use client";

import { useOffline } from "@/contexts/OfflineContext";
import { motion, AnimatePresence } from "framer-motion";
import { WifiOff } from "lucide-react";

export function OfflineBanner() {
  const { isOnline, pendingExpenses } = useOffline();

  if (isOnline) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        exit={{ y: -100 }}
        className="fixed top-0 left-0 right-0 z-50 bg-orange-500 text-white p-3"
      >
        <div className="flex items-center justify-center space-x-2 text-sm">
          <WifiOff size={16} />
          <span>
            You&apos;re offline. Changes will sync when reconnected.
            {pendingExpenses.length > 0 && (
              <span className="ml-2 font-semibold">
                ({pendingExpenses.length} pending)
              </span>
            )}
          </span>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
