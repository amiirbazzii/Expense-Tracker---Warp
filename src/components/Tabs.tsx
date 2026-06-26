"use client";

import React from "react";
import { motion } from "framer-motion";

export interface TabItem {
  id: string;
  label: string;
}

interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: any) => void;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onChange,
  className = "",
}) => {
  return (
    <div className={`flex border-b border-gray-150 mb-6 relative bg-[#f9f9f9] ${className}`.trim()}>
      {tabs.map((tab, idx) => (
        <React.Fragment key={tab.id}>
          {idx > 0 && <div className="w-[1px] bg-gray-200 my-3" />}
          <button
            type="button"
            onClick={() => onChange(tab.id)}
            className={`flex-1 py-4 text-center text-base relative outline-none focus:outline-none transition-colors ${
              activeTab === tab.id ? "text-black font-semibold" : "text-gray-500 font-normal"
            }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <motion.div
                layoutId="activeTabUnderline"
                className="absolute bottom-0 left-[30%] right-[30%] h-[4px] bg-black rounded-t-md"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
          </button>
        </React.Fragment>
      ))}
    </div>
  );
};

export default Tabs;
