import React from "react";

interface InputContainerProps {
  leftIcon?: React.ElementType;
  leftElement?: React.ReactNode;
  rightAdornment?: React.ReactNode;
  className?: string;
  contentClassName?: string;
  children: React.ReactNode;
}

/**
 * InputContainer centralizes the shared input field visuals:
 * - Rounded field, surface-field background, border-border-default
 * - Focus state: border-accent + shadow-focus-field via :focus-within
 * - Optional left icon and right adornment areas
 * - "relative" to allow absolute-positioned dropdowns inside children
 */
export const InputContainer: React.FC<InputContainerProps> = ({
  leftIcon: LeftIcon,
  leftElement,
  rightAdornment,
  className = "",
  contentClassName = "",
  children,
}) => {
  return (
    <div className={`relative flex items-center w-full h-14 px-4 rounded-field transition-all duration-300 border border-border-default bg-surface-field focus-within:border-accent focus-within:shadow-focus-field ${className}`.trim()}>
      {LeftIcon && <LeftIcon className="size-4 mr-3 shrink-0 text-ink-secondary" />}
      {leftElement && <div className="mr-3 shrink-0 text-ink-secondary flex items-center justify-center font-normal text-base select-none">{leftElement}</div>}
      <div className={`flex items-center flex-1 min-w-0 ${contentClassName}`.trim()}>
        {children}
      </div>
      {rightAdornment && (
        <div className="flex items-center">
          {rightAdornment}
        </div>
      )}
    </div>
  );
};

export default InputContainer;

