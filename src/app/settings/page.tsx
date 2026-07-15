"use client";

import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useOfflineFirst } from "@/providers/OfflineFirstProvider";
import { useSettings, Currency, Calendar } from "@/contexts/SettingsContext";

import { ProtectedRoute } from "@/components/ProtectedRoute";
import { BottomNav } from "@/components/BottomNav";
import AppHeader from "@/components/AppHeader";
import { RecoveryCodeCard } from "@/components/RecoveryCodeCard";
import {
  LogOut,
  Database,
  FileJson,
  FileSpreadsheet,
  DollarSign,
  Calendar as CalendarIcon,
} from "lucide-react";
import { toast } from "sonner";
import { useDataBackup } from "@/hooks/useDataBackup";
import { useEffect, useState } from "react";

import { UserProfileSection } from "@/components/settings/UserProfileSection";
import { ConnectionStatusSection } from "@/components/settings/ConnectionStatusSection";
import { PreferenceSelect } from "@/components/settings/PreferenceSelect";
import { BackupBanner } from "@/components/settings/BackupBanner";
import { ExportButton } from "@/components/settings/ExportButton";

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const { isOnline, pendingOperationsCount, forcSync } = useOfflineFirst();
  const {
    settings,
    updateSettings,
    isLoading: settingsLoading,
  } = useSettings();
  const {
    exportAsJSON,
    exportAsExcel,
    saveToIndexedDB,
    getLastBackupInfo,
    isExporting,
    isUsingOfflineData,
    hasOfflineBackup,
    offlineBackupDate,
  } = useDataBackup();
  const [lastBackup, setLastBackup] = useState<{
    date: Date;
    expenseCount: number;
    incomeCount: number;
  } | null>(null);

  useEffect(() => {
    const loadBackupInfo = async () => {
      const info = await getLastBackupInfo();
      setLastBackup(info);
    };
    loadBackupInfo();
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Logged out successfully");
    } catch {
      toast.error("Failed to logout");
    }
  };

  const CURRENCY_OPTIONS = [
    { value: "USD", label: "USD" },
    { value: "EUR", label: "EUR" },
    { value: "GBP", label: "GBP" },
    { value: "IRR", label: "IRR" },
  ] as const;

  const CALENDAR_OPTIONS = [
    { value: "gregorian", label: "gregorian" },
    { value: "jalali", label: "jalali" },
  ] as const;

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-white">
        <AppHeader />

        <div className="max-w-lg mx-auto p-4 pt-[92px] pb-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-gray-200 bg-[#F9F9F9] p-4 mb-6"
          >
            <UserProfileSection username={user?.username} />

            <ConnectionStatusSection
              isOnline={isOnline}
              pendingOperationsCount={pendingOperationsCount}
              onSync={forcSync}
            />

            <div className="mb-6 space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Preferences
              </h3>
              <div className="space-y-4">
                <PreferenceSelect
                  label="Currency"
                  icon={DollarSign}
                  value={settings?.currency || "USD"}
                  onChange={async (value) => {
                    await updateSettings({ currency: value as Currency });
                    toast.success("Currency updated");
                  }}
                  options={[...CURRENCY_OPTIONS]}
                />

                <PreferenceSelect
                  label="Calendar System"
                  icon={CalendarIcon}
                  value={settings?.calendar || "gregorian"}
                  onChange={async (value) => {
                    await updateSettings({ calendar: value as Calendar });
                    toast.success("Calendar updated");
                  }}
                  options={[...CALENDAR_OPTIONS]}
                />
              </div>
            </div>

            <RecoveryCodeCard />

            <div className="mb-6 space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Data Backup & Export
              </h3>

              <BackupBanner
                isUsingOfflineData={isUsingOfflineData}
                hasOfflineBackup={hasOfflineBackup}
                isOnline={isOnline}
                offlineBackupDate={offlineBackupDate || null}
                lastBackup={lastBackup}
                showLastBackup={!isUsingOfflineData}
              />

              <div className="space-y-3">
                <ExportButton
                  icon={Database}
                  onClick={async () => {
                    await saveToIndexedDB();
                    const info = await getLastBackupInfo();
                    setLastBackup(info);
                  }}
                  disabled={isExporting}
                  title="Save to IndexedDB"
                  description="Local backup in browser storage"
                  iconColor="text-purple-600"
                  bgClass="bg-purple-50"
                  hoverClass="hover:bg-purple-100"
                  borderClass="border-purple-200"
                />

                <ExportButton
                  icon={FileJson}
                  onClick={exportAsJSON}
                  disabled={isExporting}
                  title="Export as JSON"
                  description="Download complete backup file"
                  iconColor="text-blue-600"
                  bgClass="bg-blue-50"
                  hoverClass="hover:bg-blue-100"
                  borderClass="border-blue-200"
                />

                <ExportButton
                  icon={FileSpreadsheet}
                  onClick={exportAsExcel}
                  disabled={isExporting}
                  title="Export as Excel"
                  description="Spreadsheet format for analysis"
                  iconColor="text-green-600"
                  bgClass="bg-green-50"
                  hoverClass="hover:bg-green-100"
                  borderClass="border-green-200"
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Actions</h3>

              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={handleLogout}
                className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 min-h-[44px]"
              >
                <LogOut size={20} />
                <span>Logout</span>
              </motion.button>
            </div>

            <p className="text-center text-xs text-gray-400 mt-6">
              v{process.env.NEXT_PUBLIC_APP_VERSION}
            </p>
          </motion.div>
        </div>

        <BottomNav />
      </div>
    </ProtectedRoute>
  );
}
