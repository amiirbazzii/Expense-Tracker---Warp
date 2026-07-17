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
  FileJson,
  FileSpreadsheet,
} from "lucide-react";
import { toast } from "sonner";
import { useDataBackup } from "@/hooks/useDataBackup";
import { useEffect, useState } from "react";

import { UserProfileSection } from "@/components/settings/UserProfileSection";

import { PreferenceSelect } from "@/components/settings/PreferenceSelect";
import { BackupBanner } from "@/components/settings/BackupBanner";
import { ExportButton } from "@/components/settings/ExportButton";
import { SettingsCard } from "@/components/settings/SettingsCard";
import { Button } from "@/components/Button";

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const { isOnline } = useOfflineFirst();
  const {
    settings,
    updateSettings,
    isLoading: settingsLoading,
  } = useSettings();
  const {
    exportAsJSON,
    exportAsExcel,
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

        <div className="max-w-md mx-auto px-6 pt-[92px] pb-28">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-3 items-center"
          >
            {/* Profile Container */}
            <UserProfileSection username={user?.username} />



            {/* Preferences Card */}
            <SettingsCard title="Preferences">
              {/* Currency Preference */}
              <PreferenceSelect
                label="Currency"
                value={settings?.currency || "USD"}
                onChange={async (value) => {
                  await updateSettings({ currency: value as Currency });
                  toast.success("Currency updated");
                }}
                options={[...CURRENCY_OPTIONS]}
              />

              {/* Divider */}
              <div className="w-full border-t border-[#e4e4e4] my-1" />

              {/* Calendar Preference */}
              <PreferenceSelect
                label="Calendar System"
                value={settings?.calendar || "gregorian"}
                onChange={async (value) => {
                  await updateSettings({ calendar: value as Calendar });
                  toast.success("Calendar updated");
                }}
                options={[...CALENDAR_OPTIONS]}
              />
            </SettingsCard>

            {/* Security Section (RecoveryCodeCard handles its own container now) */}
            <RecoveryCodeCard />

            {/* Data Backup & Export Card */}
            <SettingsCard title="Data Backup & Export">
              {/* Backup Banner if active */}
              <div className="px-4 py-1">
                <BackupBanner
                  isUsingOfflineData={isUsingOfflineData}
                  hasOfflineBackup={hasOfflineBackup}
                  isOnline={isOnline}
                  offlineBackupDate={offlineBackupDate || null}
                  lastBackup={lastBackup}
                  showLastBackup={!isUsingOfflineData}
                />
              </div>

              {/* Export as JSON */}
              <ExportButton
                icon={FileJson}
                onClick={exportAsJSON}
                disabled={isExporting}
                title="Export as JSON"
                description="Download complete backup file"
              />

              {/* Divider */}
              <div className="w-full border-t border-[#e4e4e4] my-1" />

              {/* Export as Excel */}
              <ExportButton
                icon={FileSpreadsheet}
                onClick={exportAsExcel}
                disabled={isExporting}
                title="Export as Excel"
                description="Spreadsheet format for analysis"
              />
            </SettingsCard>

            {/* Actions Card */}
            <SettingsCard title="Actions">
              {/* Logout Row */}
              <div className="w-full flex items-center justify-between px-4 py-2 drop-shadow-[0px_3px_2px_rgba(0,0,0,0.03)]">
                <p className="font-medium text-[16px] text-black">Logout</p>

                <button
                  onClick={handleLogout}
                  type="button"
                  className="border-2 border-[#c15959] bg-[#e99c9c] text-black p-[10px] rounded-[12px] shadow-[inset_0px_2px_2px_0px_rgba(255,255,255,0.5),0px_2px_6px_0px_rgba(0,0,0,0.15)] hover:bg-[#e48b8b] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center shrink-0 w-10 h-10 cursor-pointer"
                  aria-label="Logout"
                >
                  <LogOut size={16} className="text-black" />
                </button>
              </div>
            </SettingsCard>

            {/* App Version */}
            <p className="text-center text-xs text-[#707070] mt-4">
              v{process.env.NEXT_PUBLIC_APP_VERSION || "0.1.4"}
            </p>
          </motion.div>
        </div>

        <BottomNav />
      </div>
    </ProtectedRoute>
  );
}
