"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { useOffline } from "@/contexts/OfflineContext";

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(false);
  const router = useRouter();
  const { pendingExpenses } = useOffline();

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    if (isOnline) {
      router.push("/expenses");
    }
  }, [isOnline, router]);

  const handleRetry = () => {
    if (navigator.onLine) {
      router.push("/expenses");
    } else {
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="text-6xl mb-4">📱</div>
        <h1 className="text-2xl font-bold text-gray-900">You're Offline</h1>
        <p className="text-gray-600">
          No internet connection detected. You can still view your cached data and add new expenses.
        </p>
        
        {pendingExpenses.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-yellow-800 text-sm">
              You have {pendingExpenses.length} pending expense{pendingExpenses.length > 1 ? 's' : ''} that will sync when you're back online.
            </p>
          </div>
        )}

        <div className="space-y-3">
          <Button 
            onClick={handleRetry}
            className="w-full"
          >
            Try Again
          </Button>
          
          <Button 
            onClick={() => router.push("/expenses")}
            className="w-full"
          >
            Continue Offline
          </Button>
        </div>

        <p className="text-xs text-gray-500">
          Your data is safely stored locally and will sync automatically when connection is restored.
        </p>
      </div>
    </div>
  );
}