"use client";

import { motion } from "framer-motion";
import { Download, LucideIcon } from "lucide-react";

interface ExportButtonProps {
  icon: LucideIcon;
  onClick: () => void;
  disabled?: boolean;
  title: string;
  description: string;
  iconColor: string;
  bgClass: string;
  hoverClass: string;
  borderClass: string;
}

export function ExportButton({
  icon: Icon,
  onClick,
  disabled = false,
  title,
  description,
  iconColor,
  bgClass,
  hoverClass,
  borderClass,
}: ExportButtonProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center justify-between p-4 ${bgClass} border ${borderClass} rounded-lg ${hoverClass} transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]`}
    >
      <div className="flex items-center space-x-3">
        <Icon className={iconColor} size={20} />
        <div className="text-left">
          <div className="font-medium text-gray-900">{title}</div>
          <div className="text-sm text-gray-600">{description}</div>
        </div>
      </div>
      <Download className={iconColor} size={20} />
    </motion.button>
  );
}
