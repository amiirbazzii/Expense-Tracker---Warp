"use client";

import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useOffline } from "@/contexts/OfflineContext";
import { useSettings, Currency, Calendar } from "@/contexts/SettingsContext";

import { ProtectedRoute } from "@/components/ProtectedRoute";
import { BottomNav } from "@/components/BottomNav";
import AppHeader from "@/components/AppHeader";
import { RecoveryCodeCard } from "@/components/RecoveryCodeCard";
import { User, LogOut, Wifi, WifiOff, RefreshCw, Download, FileJson, FileSpreadsheet, Database, Clock, DollarSign, Calendar as CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import { useDataBackup } from "@/hooks/useDataBackup";
import { useEffect, useState } from "react";
import InputContainer from "@/components/InputContainer";

export default function SettingsPage() {
  const { user, logout, token } = useAuth();
  const { isOnline, pendingExpenses, syncPendingExpenses } = useOffline();
  const { settings, updateSettings, isLoading: settingsLoading } = useSettings();
  const { 
    exportAsJSON, 
    exportAsExcel, 
    saveToIndexedDB, 
    getLastBackupInfo, 
    isExporting,
    isUsingOfflineData,
    hasOfflineBackup,
    offlineBackupDate
  } = useDataBackup();
  const [lastBackup, setLastBackup] = useState<{ date: Date; expenseCount: number; incomeCount: number } | null>(null);

  // Load last backup info on mount
  useEffect(() => {
    const loadBackupInfo = async () => {
      const info = await getLastBackupInfo();
      setLastBackup(info);
    };
    loadBackupInfo();
  }, []);

  // Safe recovery code component with error handling
  const SafeRecoveryCodeCard = () => {
    try {
      return <RecoveryCodeCard />;
    } catch (error) {
      console.warn('RecoveryCodeCard error:', error);
      return (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            Recovery code feature temporarily unavailable. Please try refreshing the page.
          </p>
        </div>
      );
    }
  };

  // Debug logging for production issues
  console.log('SettingsPage render - user:', !!user, 'token:', !!token, 'settings:', !!settings);
  if (typeof window !== 'undefined') {
    console.log('SettingsPage current pathname:', window.location.pathname);
  }

  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Logged out successfully");
    } catch {
      toast.error("Failed to logout");
    }
  };

  const handleSync = async () => {
    if (pendingExpenses.length === 0) {
      toast.info("No pending expenses to sync");
      return;
    }

    try {
      await syncPendingExpenses();
      toast.success("Expenses synced successfully!");
    } catch {
      toast.error("Failed to sync expenses");
    }
  };

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
            {/* User Profile */}
            <div className="flex items-center space-x-4 mb-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="text-blue-600" size={32} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {user?.username}
                </h2>
                <p className="text-sm text-gray-600">Expense Tracker User</p>
              </div>
            </div>

            {/* Connection Status */}
            <div className="mb-6">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  {isOnline ? (
                    <Wifi className="text-green-600" size={20} />
                  ) : (
                    <WifiOff className="text-orange-600" size={20} />
                  )}
                  <div>
                    <div className="font-medium text-gray-900">
                      {isOnline ? "Online" : "Offline"}
                    </div>
                    <div className="text-sm text-gray-600">
                      {isOnline 
                        ? "Data syncing enabled" 
                        : `${pendingExpenses.length} pending expenses`
                      }
                    </div>
                  </div>
                </div>
                
                {!isOnline && pendingExpenses.length > 0 && (
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={handleSync}
                    className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 min-h-[44px]"
                  >
                    <RefreshCw size={16} />
                    <span>Sync</span>
                  </motion.button>
                )}
              </div>
            </div>

            {/* Management */}
            <div className="mb-6 space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Preferences</h3>
              {settingsLoading ? (
                <div className="text-center text-gray-500">Loading settings...</div>
              ) : (
                <div className="space-y-4">
                  {/* Currency */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Currency *</label>
                    <InputContainer
                      leftIcon={DollarSign}
                      rightAdornment={(
                        <svg className="size-5 text-gray-500" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    >
                      <select
                        value={settings?.currency || "USD"}
                        onChange={async (e) => {
                          await updateSettings({ currency: e.target.value as Currency });
                          toast.success("Currency updated");
                        }}
                        className="w-full bg-transparent outline-none text-black placeholder:text-gray-500 py-1 px-0 appearance-none"
                      >
                        {( ["USD", "EUR", "GBP", "IRR"] as Currency[]).map((cur) => (
                          <option key={cur} value={cur}>
                            {cur}
                          </option>
                        ))}
                      </select>
                    </InputContainer>
                  </div>

                  {/* Calendar System */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Calendar System *</label>
                    <InputContainer
                      leftIcon={CalendarIcon}
                      rightAdornment={(
                        <svg className="size-5 text-gray-500" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    >
                      <select
                        value={settings?.calendar || "gregorian"}
                        onChange={async (e) => {
                          await updateSettings({ calendar: e.target.value as Calendar });
                          toast.success("Calendar updated");
                        }}
                        className="w-full bg-transparent outline-none text-black placeholder:text-gray-500 py-1 px-0 appearance-none"
                      >
                        {( ["gregorian", "jalali"] as Calendar[]).map((cal) => (
                          <option key={cal} value={cal}>
                            {cal}
                          </option>
                        ))}
                      </select>
                    </InputContainer>
                  </div>




                </div>
              )}
            </div>

            {/* Recovery Code Section */}
            <SafeRecoveryCodeCard />

            {/* Data Backup & Export */}
            <div className="mb-6 space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Data Backup & Export</h3>
              
              {/* Offline Mode Indicator */}
              {isUsingOfflineData && hasOfflineBackup && (
                <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="flex items-center space-x-2 text-sm text-orange-700 font-medium">
                    <WifiOff size={16} />
                    <span>Using Offline Backup Data</span>
                  </div>
                  {offlineBackupDate && (
                    <div className="text-xs text-orange-600 mt-1 ml-6">
                      Backup from: {offlineBackupDate.toLocaleDateString()} at {offlineBackupDate.toLocaleTimeString()}
                    </div>
                  )}
                  <div className="text-xs text-orange-600 mt-2 ml-6">
                    ⚠️ Note: Backup exports work offline. Dashboard requires online connection.
                  </div>
                </div>
              )}
              
              {/* No Backup Warning */}
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
              
              {/* Last Backup Info */}
              {lastBackup && !isUsingOfflineData && (
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Clock size={16} />
                    <span>
                      Last backup: {lastBackup.date.toLocaleDateString()} at {lastBackup.date.toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1 ml-6">
                    {lastBackup.expenseCount} expenses, {lastBackup.incomeCount} income
                  </div>
                </div>
              )}
              
              <div className="space-y-3">
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={async () => {
                    await saveToIndexedDB();
                    const info = await getLastBackupInfo();
                    setLastBackup(info);
                  }}
                  disabled={isExporting}
                  className="w-full flex items-center justify-between p-4 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
                >
                  <div className="flex items-center space-x-3">
                    <Database className="text-purple-600" size={20} />
                    <div className="text-left">
                      <div className="font-medium text-gray-900">Save to IndexedDB</div>
                      <div className="text-sm text-gray-600">Local backup in browser storage</div>
                    </div>
                  </div>
                  <Download className="text-purple-600" size={20} />
                </motion.button>

                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={exportAsJSON}
                  disabled={isExporting}
                  className="w-full flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
                >
                  <div className="flex items-center space-x-3">
                    <FileJson className="text-blue-600" size={20} />
                    <div className="text-left">
                      <div className="font-medium text-gray-900">Export as JSON</div>
                      <div className="text-sm text-gray-600">Download complete backup file</div>
                    </div>
                  </div>
                  <Download className="text-blue-600" size={20} />
                </motion.button>

                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={exportAsExcel}
                  disabled={isExporting}
                  className="w-full flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
                >
                  <div className="flex items-center space-x-3">
                    <FileSpreadsheet className="text-green-600" size={20} />
                    <div className="text-left">
                      <div className="font-medium text-gray-900">Export as Excel</div>
                      <div className="text-sm text-gray-600">Spreadsheet format for analysis</div>
                    </div>
                  </div>
                  <Download className="text-green-600" size={20} />
                </motion.button>
              </div>
            </div>

            {/* Actions */}
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

          </motion.div>
        </div>

        <BottomNav />
      </div>
    </ProtectedRoute>
  );
}
