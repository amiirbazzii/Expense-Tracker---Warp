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
 * - default: semi-transparent raised background, border-border-default, text-ink-secondary
 * - enabled: accent background, no border, accent foreground text
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

  const base = 'inline-flex items-center rounded-full text-xs font-medium select-none';

  const variantClass = isEnabled
    ? 'bg-accent text-accent-foreground border-0'
    : 'bg-surface-raised/50 border border-border-default text-ink-secondary';

  // Vertical padding always 6px per spec. Horizontal padding comes from text span (px-[4px]).
  const padding = 'py-[6px] px-3';

  return (
    <div className={[base, variantClass, padding, className].join(' ')} style={style} {...props}>
      {leftIcon}
      <span className="px-[4px] py-[2px] leading-none">{children}</span>
      {rightIcon}
    </div>
  );
}

export default Chip;
