import { ReactNode } from "react";

interface PersianTextProps {
  children: ReactNode;
  className?: string;
}

/**
 * Component for explicitly marking Persian text content
 * Applies Persian font but keeps LTR direction for now
 */
export function PersianText({ children, className = "" }: PersianTextProps) {
  return (
    <span className={`force-persian ${className}`}>
      {children}
    </span>
  );
}

interface EnglishTextProps {
  children: ReactNode;
  className?: string;
}

/**
 * Component for explicitly marking English text content
 * Applies English font and keeps LTR direction
 */
export function EnglishText({ children, className = "" }: EnglishTextProps) {
  return (
    <span className={`font-english ltr english-inline ${className}`}>
      {children}
    </span>
  );
}

/**
 * Utility function to wrap Persian text with the appropriate classes
 * Usage: <div className={persianClass()}>فارسی متن</div>
 */
export function persianClass(additionalClasses = "") {
  return `force-persian ${additionalClasses}`.trim();
}

/**
 * Utility function to wrap English text with the appropriate classes
 * Usage: <div className={englishClass()}>English text</div>
 */
export function englishClass(additionalClasses = "") {
  return `font-english ${additionalClasses}`.trim();
}