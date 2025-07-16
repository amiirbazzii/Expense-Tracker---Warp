import * as React from "react";
import { LucideIcon, ChevronDown, CircleDollarSign } from "lucide-react";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: LucideIcon;
  rightText?: string;
  helperText?: string;
  error?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, icon: Icon, rightText, helperText, error, ...props }, ref) => {
    const [isFocused, setIsFocused] = React.useState(false);

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true);
      if (props.onFocus) {
        props.onFocus(e);
      }
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      if (props.onBlur) {
        props.onBlur(e);
      }
    };
    const stateClasses = {
      default:
        "border border-[#D3D3D3] bg-[#f8f8f8] text-gray-500 placeholder:text-gray-500",
      filled:
        "border border-[#D3D3D3] bg-[#f8f8f8]",
      focus: "border border-black bg-[#f8f8f8] shadow-[inset_0px_0px_0px_1px_#000]",
      error: "border border-red-500 bg-[#f8f8f8] text-red-500 placeholder:text-red-500",
      disabled:
        "border border-transparent bg-[#f8f8f8] text-gray-400 opacity-50 cursor-not-allowed",
    };

    const currentState =
      isFocused ? 'focus' : props.disabled ? 'disabled' : error ? 'error' : props.value ? 'filled' : 'default';

    return (
      <div className="w-full">
        <div
          className={`flex items-center w-full rounded-[10px] transition-all duration-300 ${stateClasses[currentState]} ${className}`}>
          <div className="flex items-center w-full p-4">
            {Icon && <Icon className="size-4 mr-2 shrink-0 text-[#707070]" />}
            <input
              type={type}
              className="w-full bg-transparent outline-none text-black placeholder:text-gray-500"
              ref={ref}
              onFocus={handleFocus}
              onBlur={handleBlur}
              {...props}
            />
          </div>
          {rightText && (
            <div className="flex items-center pr-3">
                <ChevronDown className="size-5 mr-1 text-gray-500" />
                <span className="text-gray-500 whitespace-nowrap">{rightText}</span>
            </div>
          )}
        </div>
        {helperText && (
          <p
            className={`mt-1 text-xs ${error ? "text-red-500" : "text-gray-500"}`}>
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export { Input };
