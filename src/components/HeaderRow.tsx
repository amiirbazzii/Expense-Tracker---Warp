"use client";

import React from "react";

interface HeaderRowProps {
  /**
   * Content to appear on the left side of the header. Usually a title or a combination of icon + text.
   */
  left: React.ReactNode;
  /**
   * Optional content for the right side of the header (for example, an icon button).
   */
  right?: React.ReactNode;
  /**
   * Extra class names for the outer container.
   */
  className?: string;
}

/**
 * Mobile-first header row used across pages to ensure consistent layout.
 * Fixed to the top of the page with a white background in its own card.
 * Automatically adds an 8-pixel gap (Tailwind `gap-2`) between items on the left group.
 */
export const HeaderRow: React.FC<HeaderRowProps> = ({ left, right, className }) => {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-md mx-auto px-4 py-4">
        <div className={`flex items-center justify-between ${className ?? ""}`}>
          <div className="flex items-center gap-2">
            {left}
          </div>
          {right && <div>{right}</div>}
        </div>
      </div>
    </div>
  );
};
