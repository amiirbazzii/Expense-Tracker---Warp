import * as React from "react";
import { LucideIcon, ChevronDown } from "lucide-react";

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
        "border border-border-default bg-surface-field text-ink-secondary placeholder:text-ink-secondary",
      filled:
        "border border-border-default bg-surface-field",
      focus: "border border-accent bg-surface-field shadow-focus-field",
      error: "border border-danger-text bg-surface-field text-danger-text placeholder:text-danger-text",
      disabled:
        "border border-transparent bg-surface-field text-ink-disabled opacity-50 cursor-not-allowed",
    };

    const currentState =
      isFocused ? 'focus' : props.disabled ? 'disabled' : error ? 'error' : props.value ? 'filled' : 'default';

    return (
      <div className="w-full">
        <div
          className={`flex items-center w-full rounded-field transition-all duration-300 ${stateClasses[currentState]} ${className}`}>
          <div className="flex items-center w-full p-4">
            {Icon && <Icon className="size-4 mr-2 shrink-0 text-ink-secondary" />}
            <input
              type={type}
              className="w-full bg-transparent outline-none text-ink-primary placeholder:text-ink-secondary"
              ref={ref}
              onFocus={handleFocus}
              onBlur={handleBlur}
              {...props}
            />
          </div>
          {rightText && (
            <div className="flex items-center pr-3">
                <ChevronDown className="size-5 mr-1 text-ink-secondary" />
                <span className="text-ink-secondary whitespace-nowrap">{rightText}</span>
            </div>
          )}
        </div>
        {helperText && (
          <p
            className={`mt-1 text-xs ${error ? "text-danger-text" : "text-ink-secondary"}`}>
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export { Input };
