"use client";

import React from 'react';

const variantStyles = {
  default: {
    base: 'bg-surface-hover border-2 border-solid border-border-default text-ink-primary shadow-neumo',
    hover: 'hover:shadow-neumo-hover',
    active: 'active:shadow-neumo-active active:border-border-strong',
  },
  secondary: {
    base: 'bg-surface-sunken text-ink-primary border-0 shadow-none',
    hover: 'hover:bg-surface-hover',
    active: 'active:bg-surface-active',
  },
  danger: {
    base: 'bg-danger-surface border-2 border-solid border-danger-border text-ink-primary shadow-neumo',
    hover: 'hover:shadow-neumo-hover',
    active: 'active:bg-danger-active active:border-danger-active-border',
  },
} as const;

const sizeMap = {
  large: {
    text: 'py-4 px-6 text-xl',
    icon: 'p-4',
  },
  medium: {
    text: 'py-3 px-4 text-base',
    icon: 'p-3',
  },
  small: {
    text: 'py-2.5 px-3 text-xs',
    icon: 'p-3',
  },
} as const;

const iconSizeMap = {
  large: 24,
  medium: 20,
  small: 16,
} as const;

const LucideLoaderCircle = ({ size }: { size: number }) => (
  <svg className="animate-spin absolute inset-0 m-auto" width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M21 12a9 9 0 1 1-6.219-8.56" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'secondary' | 'danger';
  buttonType?: 'text' | 'icon';
  size?: 'large' | 'medium' | 'small';
  disabled?: boolean;
  disabledLabel?: string;
  loading?: boolean;
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({
    className,
    variant = 'default',
    buttonType = 'text',
    size = 'large',
    disabled = false,
    disabledLabel,
    loading = false,
    icon,
    children,
    ...props
  }, ref) => {
    const baseStyles = 'relative flex items-center justify-center rounded-xl transition-all duration-150';

    const v = variantStyles[variant];

    const interactiveClasses = !disabled && !loading
      ? `${v.base} ${v.hover} ${v.active}`
      : v.base;

    const sizing = sizeMap[size][buttonType === 'icon' ? 'icon' : 'text'];

    const fontWeightClass = buttonType === 'text' ? (disabled || loading ? 'font-normal' : 'font-medium') : '';

    const stateClasses = loading
      ? 'animate-pulse'
      : disabled
        ? 'bg-surface-hover border-border-default text-ink-disabled opacity-50 cursor-not-allowed'
        : '';

    const classes = [baseStyles, interactiveClasses, sizing, fontWeightClass, stateClasses, className]
      .filter(Boolean)
      .join(' ');

    const iconElement = React.isValidElement(icon) && buttonType === 'icon'
      ? React.cloneElement(icon as React.ReactElement<{width?: number; height?: number}>, {
          width: iconSizeMap[size],
          height: iconSizeMap[size],
        })
      : icon;

    return (
      <button
        className={classes}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {/* content stays in DOM (invisible) while loading so button keeps its size */}
        <span className={`inline-flex items-center justify-center w-full${loading ? ' invisible' : ''}`} aria-hidden={loading}>
          {buttonType === 'icon' ? iconElement : (disabled && !loading) ? (disabledLabel ?? children) : children}
        </span>
        {loading && <LucideLoaderCircle size={iconSizeMap[size]} />}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button };
