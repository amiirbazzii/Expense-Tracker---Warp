"use client";

import React from 'react';

const variantStyles = {
  default: {
    base: 'bg-[#e1e1e1] border-2 border-solid border-[#cacaca] text-black [box-shadow:0px_2px_6px_0px_rgba(0,0,0,0.15),0px_2px_2px_0px_rgba(255,255,255,0.5)_inset]',
    hover: 'hover:bg-[#e1e1e1] hover:border-[#cacaca] hover:[box-shadow:0px_4px_10px_0px_rgba(0,0,0,0.17),0px_2px_2px_0px_rgba(255,255,255,0.5)_inset]',
    active: 'active:bg-[#e1e1e1] active:border-[#b1b1b1] active:[box-shadow:0px_1px_3px_0px_rgba(0,0,0,0.15),0px_0px_5px_0px_rgba(101,101,101,0.5)_inset]',
  },
  secondary: {
    base: 'bg-[#F4F4F4] text-black border-0 shadow-none',
    hover: 'hover:bg-[#e8e8e8]',
    active: 'active:bg-[#dcdcdc]',
  },
  danger: {
    base: 'bg-[#E99C9C] border-2 border-solid border-[#C15959] text-black [box-shadow:0px_2px_6px_0px_rgba(0,0,0,0.15),0px_2px_2px_0px_rgba(255,255,255,0.5)_inset]',
    hover: 'hover:bg-[#E99C9C] hover:border-[#C15959] hover:[box-shadow:0px_4px_10px_0px_rgba(0,0,0,0.17),0px_2px_2px_0px_rgba(255,255,255,0.5)_inset]',
    active: 'active:bg-[#d98c8c] active:border-[#b14f4f] active:[box-shadow:0px_1px_3px_0px_rgba(0,0,0,0.15),0px_0px_5px_0px_rgba(101,101,101,0.5)_inset]',
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

const LucideLoaderCircle = () => (
  <svg className="animate-spin" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M21 12a9 9 0 1 1-6.219-8.56" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'secondary' | 'danger';
  buttonType?: 'text' | 'icon';
  size?: 'large' | 'medium' | 'small';
  disabled?: boolean;
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
    loading = false,
    icon,
    children,
    ...props
  }, ref) => {
    const baseStyles = 'flex items-center justify-center rounded-xl transition-all duration-150';

    const v = variantStyles[variant];

    const interactiveClasses = !disabled && !loading
      ? `${v.base} ${v.hover} ${v.active}`
      : v.base;

    const sizing = sizeMap[size][buttonType === 'icon' ? 'icon' : 'text'];

    const fontWeightClass = buttonType === 'text' ? (disabled || loading ? 'font-normal' : 'font-medium') : '';

    const stateClasses = loading
      ? 'animate-pulse'
      : disabled
        ? 'bg-[#e1e1e1] border-[#cacaca] text-[#a7a7a7] opacity-50 cursor-not-allowed'
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
        {loading
          ? <LucideLoaderCircle />
          : (buttonType === 'icon' ? iconElement : disabled ? 'Fill the information' : children)}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button };
