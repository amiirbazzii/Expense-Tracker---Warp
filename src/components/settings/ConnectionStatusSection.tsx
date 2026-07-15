"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Wifi, WifiOff, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface ConnectionStatusSectionProps {
  isOnline: boolean;
  pendingOperationsCount: number;
  onSync: () => Promise<unknown>;
}

export function ConnectionStatusSection({
  isOnline,
  pendingOperationsCount,
  onSync,
}: ConnectionStatusSectionProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="mb-6">
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-3">
            <Wifi className="text-green-600" size={20} />
            <div>
              <div className="font-medium text-gray-900">Online</div>
              <div className="text-sm text-gray-600">Data syncing enabled</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleSync = async () => {
    if (pendingOperationsCount === 0) {
      toast.info("No pending expenses to sync");
      return;
    }
    try {
      await onSync();
      toast.success("Expenses synced successfully!");
    } catch {
      toast.error("Failed to sync expenses");
    }
  };

  return (
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
                : `${pendingOperationsCount} pending expenses`}
            </div>
          </div>
        </div>

        {!isOnline && pendingOperationsCount > 0 && (
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
  );
}
