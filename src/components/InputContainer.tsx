import React from "react";

interface InputContainerProps {
  leftIcon?: React.ElementType;
  rightAdornment?: React.ReactNode;
  className?: string;
  contentClassName?: string;
  children: React.ReactNode;
}

/**
 * InputContainer centralizes the shared input field visuals:
 * - Rounded 10px, light-gray background #f8f8f8, neutral border #D3D3D3
 * - Focus state: black border + subtle inset shadow via :focus-within
 * - Optional left icon and right adornment areas
 * - "relative" to allow absolute-positioned dropdowns inside children
 */
export const InputContainer: React.FC<InputContainerProps> = ({
  leftIcon: LeftIcon,
  rightAdornment,
  className = "",
  contentClassName = "",
  children,
}) => {
  return (
    <div className={`relative flex items-center w-full rounded-[10px] transition-all duration-300 border border-[#D3D3D3] bg-[#f8f8f8] focus-within:border-black focus-within:shadow-[inset_0px_0px_0px_1px_#000] ${className}`.trim()}>
      <div className={`flex items-center w-full p-4 ${contentClassName}`.trim()}>
        {LeftIcon && <LeftIcon className="size-4 mr-2 shrink-0 text-[#707070]" />}
        {children}
      </div>
      {rightAdornment && (
        <div className="flex items-center pr-3">
          {rightAdornment}
        </div>
      )}
    </div>
  );
};

export default InputContainer;
