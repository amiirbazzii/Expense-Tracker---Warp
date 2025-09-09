"use client";

import { useEffect } from "react";
import { PersianFontDetector } from "./PersianFontDetector";

interface LanguageWrapperProps {
  children: React.ReactNode;
}

export function LanguageWrapper({ children }: LanguageWrapperProps) {
  return (
    <PersianFontDetector>
      {children}
    </PersianFontDetector>
  );
}