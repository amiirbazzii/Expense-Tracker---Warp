"use client";

import React, { useState } from "react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { HeaderRow } from "@/components/HeaderRow";
import { ArrowLeft } from "lucide-react";
import { useSyncStatus } from "@/hooks/useSyncStatus";

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
    // Main pages: logo + page name + sync status dot. Driven by the queue
    // and engine events (useSyncStatus), not a poll; every state is visible so
    // "not yet synced" and "needs attention" are never just an absent dot.
    const SyncDot = () => {
      const status = useSyncStatus();
      const look = {
        synced: { className: "bg-sync-synced", title: "Synced" },
        syncing: { className: "bg-sync-syncing", title: "Syncing changes…" },
        offline: { className: "bg-sync-offline", title: "Offline — changes are saved on this device" },
        attention: { className: "bg-sync-attention", title: "Some changes were rejected — see Settings" },
      }[status];

      return (
        <span
          className={`block w-2 h-2 rounded-full transition-colors duration-500 ${look.className}`}
          title={look.title}
          aria-label={look.title}
          role="status"
        />
      );
    };

    return (
      <HeaderRow
        left={
          <div className="flex items-center">
            {logoError ? (
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-accent text-accent-foreground text-sm font-semibold">
                S
              </div>
            ) : (
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg overflow-hidden bg-surface-raised">
                <Image
                  src={usePngFallback ? "/logo.png" : "/logo.webp"}
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
            <h1 className="text-xl font-bold text-ink-primary pr-2">{title}</h1>
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
            className="p-2 text-ink-secondary hover:text-ink-primary hover:bg-surface-hover rounded-full transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Go back"
            title="Go Back"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold text-ink-primary">{title}</h1>
        </div>
      }
      right={right}
    />
  );
}

export default AppHeader;
