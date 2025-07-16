import React from 'react';
const variants = {
  variant: {
    default: 'bg-[#e1e1e1] border-[#cacaca] text-black shadow-[0px_2px_6px_0px_rgba(0,0,0,0.15)] [box-shadow:0px_2px_2px_0px_rgba(255,255,255,0.5)_inset]',
    pressed: 'bg-[#cecece] border-[#b1b1b1] text-black shadow-[0px_1px_3px_0px_rgba(0,0,0,0.15)] [box-shadow:0px_2px_4px_0px_rgba(0,0,0,0.25)_inset]',
    hover: 'bg-[#d7d7d7] border-[#b1b1b1] text-black shadow-[0px_2px_6px_0px_rgba(0,0,0,0.15)] [box-shadow:0px_2px_2px_0px_rgba(255,255,255,0.5)_inset]',
  },
  size: {
    large: 'px-6 py-4 text-xl',
    medium: 'px-4 py-3 text-lg',
    icon: 'p-4',
  },
  disabled: {
    'true': 'bg-[#e1e1e1] border-[#cacaca] text-[#a7a7a7] opacity-50 cursor-not-allowed',
    'false': '',
  },
  loading: {
    'true': 'animate-pulse',
    'false': '',
  }
};

interface ButtonVariantProps {
  variant?: keyof typeof variants.variant;
  buttonType?: 'text' | 'icon';
  size?: 'large' | 'medium';
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}

const buttonVariants = ({ size = 'large', buttonType = 'text', disabled = false, loading = false, className = '' }: ButtonVariantProps) => {
  const baseStyles = 'flex items-center justify-center rounded-xl border-2 border-solid transition-all';

  const interactiveStyles = [
    // Default (outer + inner)
    'bg-[#e1e1e1] border-[#cacaca] text-black [box-shadow:0px_2px_6px_0px_rgba(0,0,0,0.15),0px_2px_2px_0px_rgba(255,255,255,0.5)_inset]',
    // Hover (outer stronger + inner)
    'hover:bg-[#e1e1e1] hover:border-[#cacaca] hover:[box-shadow:0px_4px_10px_0px_rgba(0,0,0,0.17),0px_2px_2px_0px_rgba(255,255,255,0.5)_inset]',
    // Active / Pressed (outer smaller + inner darker)
    'active:bg-[#e1e1e1] active:border-[#b1b1b1] active:[box-shadow:0px_1px_3px_0px_rgba(0,0,0,0.15),0px_0px_5px_0px_rgba(101,101,101,0.5)_inset]'
  ].join(' ');

  const sizeStyles = {
    large: buttonType === 'text' ? 'px-6 py-4 text-xl' : 'p-4',
    medium: buttonType === 'text' ? 'px-4 py-3 text-lg' : 'p-3',
  };

  return [
    baseStyles,
    interactiveStyles,
    sizeStyles[size],
    variants.disabled[String(disabled) as keyof typeof variants.disabled],
    variants.loading[String(loading) as keyof typeof variants.loading],
    className
  ].join(' ');
};

const LucideLoaderCircle = () => (
  <svg className="animate-spin" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M21 12a9 9 0 1 1-6.219-8.56" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'pressed' | 'hover';
  buttonType?: 'text' | 'icon';
  size?: 'large' | 'medium';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    className, 
    variant,
    buttonType = 'text',
    size = 'large',
    disabled = false,
    loading = false,
    icon,
    children,
    ...props 
  }, ref) => {
    return (
      <button
        className={buttonVariants({ variant, size, buttonType, disabled, loading, className })}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? <LucideLoaderCircle /> : (buttonType === 'icon' ? icon : children)}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button };
