"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { HeaderRow } from "@/components/HeaderRow";
import { ArrowLeft } from "lucide-react";
import { syncEngine } from "@/lib/sync/SyncEngine";

const MAIN_PAGES: Record<string, string> = {
  "/dashboard": "Report",
  "/add": "Add Transaction",
  "/settings": "Setting",
  "/expenses": "Add Transaction",
  "/income": "Add Transaction",
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

export function AppHeader({
  title: overrideTitle,
  right,
}: {
  title?: string;
  right?: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const isMain = pathname in MAIN_PAGES;
  const title = overrideTitle || deriveTitleFromPath(pathname);
  const [logoError, setLogoError] = useState(false);
  const [usePngFallback, setUsePngFallback] = useState(false);

  if (isMain) {
    // Main pages: logo + page name + sync status dot
    const SyncDot = () => {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const [synced, setSynced] = useState(false);

      // eslint-disable-next-line react-hooks/rules-of-hooks
      useEffect(() => {
        let active = true;
        const check = async () => {
          if (!active) return;
          const [pending, draining] = await Promise.all([
            syncEngine.getPendingCount(),
            syncEngine.getIsDraining(),
          ]);
          const online = syncEngine.getIsOnline();
          setSynced(online && !draining && pending === 0);
        };
        check();
        const id = setInterval(check, 1500);
        return () => { active = false; clearInterval(id); };
      }, []);

      return (
        <span
          className={`block w-2 h-2 rounded-full transition-opacity duration-500 ${
            synced ? "opacity-100 bg-[#10B981]" : "opacity-0"
          }`}
          title={synced ? "Synced" : undefined}
        />
      );
    };

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
                  src={(usePngFallback ? "/logo.png" : "/logo.webp") + "?v=2"}
                  alt="Spendly Logo"
                  width={24}
                  height={24}
                  priority
                  quality={100}
                  unoptimized
                  onError={() => {
                    if (!usePngFallback) {
                      // Try PNG fallback once if WebP fails
                      setUsePngFallback(true);
                    } else {
                      // If PNG also fails, show placeholder
                      setLogoError(true);
                    }
                  }}
                />
              </div>
            )}
            <h1 className="text-xl font-bold text-gray-900 pr-2">{title}</h1>
            <SyncDot />
          </div>
        }
        right={right}
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
      right={right}
    />
  );
}

export default AppHeader;
