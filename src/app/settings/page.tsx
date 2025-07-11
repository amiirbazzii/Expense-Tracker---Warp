"use client";

import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useOffline } from "@/contexts/OfflineContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { BottomNav } from "@/components/BottomNav";
import { OfflineBanner } from "@/components/OfflineBanner";
import { HeaderRow } from "@/components/HeaderRow";
import { User, LogOut, Wifi, WifiOff, RefreshCw, CreditCard, ChevronRight, Settings, CalendarDays, Landmark } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useUserSettings, UserSettings } from "@/contexts/UserSettingsContext";
import { SelectInput } from "@/components/SelectInput"; // New SelectInput component

const currencyOptions = [
  { value: "USD", label: "USD ($)" },
  { value: "EUR", label: "EUR (€)" },
  { value: "GBP", label: "GBP (£)" },
  { value: "IRR", label: "IRR (T)" },
];

const calendarOptions = [
  { value: "gregorian", label: "Gregorian (میلادی)" },
  { value: "jalali", label: "Jalali (شمسی)" },
];

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const { isOnline, pendingExpenses, syncPendingExpenses } = useOffline();
  const { settings, updateSettings, isLoadingSettings } = useUserSettings();
  const router = useRouter();

  const handleSettingChange = async (type: "currency" | "calendar", value: string) => {
    try {
      await updateSettings({ [type]: value });
      toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} updated successfully`);
    } catch (error) {
      toast.error(`Failed to update ${type}`);
      console.error(`Failed to update ${type}:`, error);
    }
  };

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
      <div className="min-h-screen bg-gray-50">
        <OfflineBanner />
         <HeaderRow
                  left={
                    <>
                      <h1 className="text-xl font-bold text-gray-900">Settings</h1>
                    </>
                  }
                />
        
        <div className="max-w-md mx-auto p-4 pt-24 pb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg shadow-sm p-6 mb-6"
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

            {/* App Info */}
            <div className="mb-6 space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">App Information</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Version</span>
                  <span className="text-gray-900 font-medium">1.0.0</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">PWA Enabled</span>
                  <span className="text-green-600 font-medium">Yes</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Offline Support</span>
                  <span className="text-green-600 font-medium">Yes</span>
                </div>
              </div>
            </div>

            {/* Management */}
            <div className="mb-6 space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Management</h3>
              
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => router.push('/cards')}
                className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <CreditCard className="text-blue-600" size={20} />
                  <div className="text-left">
                    <div className="font-medium text-gray-900">My Cards</div>
                    <div className="text-sm text-gray-600">Manage your payment cards</div>
                  </div>
                </div>
                <ChevronRight className="text-gray-400" size={20} />
              </motion.button>
            </div>

            {/* App Settings */}
            <div className="my-6 space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Settings size={22} className="mr-2 text-blue-600" /> App Settings
              </h3>

              <SelectInput
                name="currency"
                label="Currency"
                value={settings?.currency || ""}
                options={currencyOptions}
                onChange={(value) => handleSettingChange("currency", value)}
                disabled={isLoadingSettings}
                placeholder={isLoadingSettings ? "Loading..." : "Select Currency"}
                className="min-h-[44px]"
              />

              <SelectInput
                name="calendar"
                label="Calendar System"
                value={settings?.calendar || ""}
                options={calendarOptions}
                onChange={(value) => handleSettingChange("calendar", value)}
                disabled={isLoadingSettings}
                placeholder={isLoadingSettings ? "Loading..." : "Select Calendar"}
                className="min-h-[44px]"
              />
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

            {/* Future Settings Placeholder */}
            <div className="mt-8 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Coming Soon</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Profile editing</li>
                <li>• Data export</li>
                <li>• Notification settings</li>
                <li>• Theme preferences</li>
              </ul>
            </div>
          </motion.div>
        </div>

        <BottomNav />
      </div>
    </ProtectedRoute>
  );
}
