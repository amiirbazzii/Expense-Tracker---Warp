"use client";

import React from "react";
import { AlertTriangle } from "lucide-react";
import { useOffline } from "@/contexts/OfflineContext";

/**
 * Displays a slim banner at the top of the page whenever the app is offline.
 * Shows the number of expenses waiting to be synced once connectivity returns.
 */
export const OfflineBanner: React.FC = () => {
  const { isOnline, pendingExpenses } = useOffline();

  if (isOnline) return null;

  return (
    <div className="w-full bg-orange-100 text-orange-800 px-4 py-2 text-sm flex items-center gap-2">
      <AlertTriangle size={16} className="shrink-0" />
      <span>
        You are offline. {pendingExpenses.length} pending expense
        {pendingExpenses.length === 1 ? "" : "s"} will sync when you're back
        online.
      </span>
    </div>
  );
};
