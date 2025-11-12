"use client";

import { motion } from "framer-motion";

export function LoadingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex justify-start mb-4"
    >
      <div className="max-w-[80%] flex flex-col items-start">
        <div className="rounded-2xl px-4 py-3 bg-[#F3F4F6]">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-700">Thinking</span>
            <div className="flex gap-1">
              <motion.span
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 0,
                }}
                className="w-1.5 h-1.5 bg-gray-500 rounded-full"
              />
              <motion.span
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 0.2,
                }}
                className="w-1.5 h-1.5 bg-gray-500 rounded-full"
              />
              <motion.span
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 0.4,
                }}
                className="w-1.5 h-1.5 bg-gray-500 rounded-full"
              />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
