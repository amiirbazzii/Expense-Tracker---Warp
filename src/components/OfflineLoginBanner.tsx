"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

export function OfflineLoginBanner() {
  const { isOfflineMode, offlineGracePeriodWarning } = useAuth();
  const isOnline = useOnlineStatus();

  // Don't show banner if online
  if (isOnline && !isOfflineMode) {
    return null;
  }

  return (
    <div className="bg-yellow-50 border-b border-yellow-200">
      <div className="max-w-7xl mx-auto py-3 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between flex-wrap">
          <div className="flex items-center flex-1">
            <span className="flex p-2 rounded-lg bg-yellow-100">
              <svg
                className="h-5 w-5 text-yellow-600"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </span>
            <div className="ml-3">
              <p className="text-sm font-medium text-yellow-800">
                {offlineGracePeriodWarning || "You're in offline mode"}
              </p>
              {!offlineGracePeriodWarning && (
                <p className="text-xs text-yellow-700 mt-0.5">
                  Your data is stored locally. Connect to sync with the cloud.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
