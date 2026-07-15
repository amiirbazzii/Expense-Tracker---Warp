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
        <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
          <div className="flex items-center space-x-2 text-sm text-orange-700 font-medium">
            <WifiOff size={16} />
            <span>Using Offline Backup Data</span>
          </div>
          {offlineBackupDate && (
            <div className="text-xs text-orange-600 mt-1 ml-6">
              Backup from: {offlineBackupDate.toLocaleDateString()} at{" "}
              {offlineBackupDate.toLocaleTimeString()}
            </div>
          )}
          <div className="text-xs text-orange-600 mt-2 ml-6">
            ⚠️ Note: Backup exports work offline. Dashboard requires online
            connection.
          </div>
        </div>
      )}

      {!isOnline && !hasOfflineBackup && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center space-x-2 text-sm text-red-700 font-medium">
            <WifiOff size={16} />
            <span>Offline - No Backup Available</span>
          </div>
          <div className="text-xs text-red-600 mt-1 ml-6">
            Please create a backup when online to enable offline exports.
          </div>
        </div>
      )}

      {lastBackup && showLastBackup && (
        <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Clock size={16} />
            <span>
              Last backup: {lastBackup.date.toLocaleDateString()} at{" "}
              {lastBackup.date.toLocaleTimeString()}
            </span>
          </div>
          <div className="text-xs text-gray-500 mt-1 ml-6">
            {lastBackup.expenseCount} expenses, {lastBackup.incomeCount} income
          </div>
        </div>
      )}
    </>
  );
}
