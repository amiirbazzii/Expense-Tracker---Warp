"use client";

import { WifiOff, Clock } from "lucide-react";

interface LastBackup {
  date: Date;
  expenseCount: number;
  incomeCount: number;
}

interface BackupBannerProps {
  isUsingOfflineData: boolean;
  hasOfflineBackup: boolean;
  isOnline: boolean;
  offlineBackupDate: Date | null;
  lastBackup: LastBackup | null;
  showLastBackup: boolean;
}

export function BackupBanner({
  isUsingOfflineData,
  hasOfflineBackup,
  isOnline,
  offlineBackupDate,
  lastBackup,
  showLastBackup,
}: BackupBannerProps) {
  return (
    <>
      {isUsingOfflineData && hasOfflineBackup && (
        <div className="p-3 bg-sync-syncing/10 border border-sync-syncing/30 rounded-lg">
          <div className="flex items-center space-x-2 text-sm text-sync-syncing font-medium">
            <WifiOff size={16} />
            <span>Using Offline Backup Data</span>
          </div>
          {offlineBackupDate && (
            <div className="text-xs text-sync-syncing mt-1 ml-6">
              Backup from: {offlineBackupDate.toLocaleDateString()} at{" "}
              {offlineBackupDate.toLocaleTimeString()}
            </div>
          )}
          <div className="text-xs text-sync-syncing mt-2 ml-6">
            ⚠️ Note: Backup exports work offline. Dashboard requires online
            connection.
          </div>
        </div>
      )}

      {!isOnline && !hasOfflineBackup && (
        <div className="p-3 bg-danger-subtle border border-danger-subtle rounded-lg">
          <div className="flex items-center space-x-2 text-sm text-danger font-medium">
            <WifiOff size={16} />
            <span>Offline - No Backup Available</span>
          </div>
          <div className="text-xs text-danger mt-1 ml-6">
            Please create a backup when online to enable offline exports.
          </div>
        </div>
      )}

      {lastBackup && showLastBackup && (
        <div className="p-3 bg-surface-raised border border-border-subtle rounded-lg">
          <div className="flex items-center space-x-2 text-sm text-ink-secondary">
            <Clock size={16} />
            <span>
              Last backup: {lastBackup.date.toLocaleDateString()} at{" "}
              {lastBackup.date.toLocaleTimeString()}
            </span>
          </div>
          <div className="text-xs text-ink-tertiary mt-1 ml-6">
            {lastBackup.expenseCount} expenses, {lastBackup.incomeCount} income
          </div>
        </div>
      )}
    </>
  );
}
