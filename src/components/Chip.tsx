"use client";

import React from 'react';

export type ChipVariant = 'default' | 'enabled';

export interface ChipProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: ChipVariant;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Chip component
 * - default: semi-transparent white background, #D9D9D9 border, #707070 text
 * - enabled: black background, no border, white text
 * - Text container has px-[4px] (4px) and there is no gap between icon and text
 */
export function Chip({
  variant = 'default',
  leftIcon,
  rightIcon,
  className = '',
  children,
  style,
  ...props
}: ChipProps) {
  const isEnabled = variant === 'enabled';

  const base = 'inline-flex items-center rounded-full text-[12px] font-medium select-none';

  // We use inline style for exact visual tokens that should not be overridden by Tailwind config.
  const visualStyle: React.CSSProperties = {
    ...(isEnabled
      ? { backgroundColor: '#000000', color: '#FFFFFF', border: '0' }
      : { backgroundColor: 'rgba(255, 255, 255, 0.5)', color: '#707070', border: '1px solid #D9D9D9' }),
    ...style,
  };

  // Vertical padding always 6px per spec. Horizontal padding comes from text span (px-[4px]).
  const padding = 'py-[6px] px-3';

  return (
    <div className={[base, padding, className].join(' ')} style={visualStyle} {...props}>
      {leftIcon}
      <span className="px-[4px] py-[2px] leading-none">{children}</span>
      {rightIcon}
    </div>
  );
}

export default Chip;
