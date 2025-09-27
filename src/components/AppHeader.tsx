"use client";

import React, { useState } from "react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { HeaderRow } from "@/components/HeaderRow";
import { ArrowLeft } from "lucide-react";

const MAIN_PAGES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/expenses": "Expenses",
  "/income": "Income",
  "/settings": "Settings",
};

function deriveTitleFromPath(pathname: string): string {
  if (MAIN_PAGES[pathname]) return MAIN_PAGES[pathname];
  // Fallback: take the first segment after root
  const parts = pathname.split("?")[0].split("/").filter(Boolean);
  if (parts.length === 0) return "Home";
  const first = parts[0];
  // Normalize
  return first.replace(/[-_]/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

export function AppHeader({ title: overrideTitle }: { title?: string }) {
  const pathname = usePathname();
  const router = useRouter();

  const isMain = pathname in MAIN_PAGES;
  const title = overrideTitle || deriveTitleFromPath(pathname);
  const [logoError, setLogoError] = useState(false);

  if (isMain) {
    // Main pages: logo + page name
    return (
      <HeaderRow
        left={
          <div className="flex items-center">
            {logoError ? (
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-black text-white text-sm font-semibold">
                S
              </div>
            ) : (
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg overflow-hidden bg-white">
                <Image
                  src="/logo.png"
                  alt="Spendly Logo"
                  width={24}
                  height={24}
                  priority
                  onError={() => setLogoError(true)}
                />
              </div>
            )}
            <h1 className="text-xl font-bold text-gray-900">{title}</h1>
          </div>
        }
      />
    );
  }

  // Internal pages: back icon + page name
  return (
    <HeaderRow
      left={
        <div className="flex items-center">
          <button
            onClick={() => router.back()}
            className="p-2 text-gray-700 hover:text-black hover:bg-gray-100 rounded-full transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Go back"
            title="Go Back"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold text-gray-900">{title}</h1>
        </div>
      }
    />
  );
}

export default AppHeader;
