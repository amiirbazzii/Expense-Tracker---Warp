"use client";

import { useEffect, useState } from "react";

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Auto-redirect when back online
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 1000);
    };
    
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handleContinue = () => {
    window.location.href = "/dashboard";
  };

  const handleRetry = () => {
    if (navigator.onLine) {
      window.location.href = "/dashboard";
    } else {
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-black px-4">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Icon */}
        <div className="relative inline-block">
          <div className="text-7xl mb-4 animate-bounce">
            {isOnline ? "✅" : "📱"}
          </div>
          {!isOnline && (
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full animate-pulse" />
          )}
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-white">
          {isOnline ? "Back Online!" : "You're Offline"}
        </h1>

        {/* Description */}
        <p className="text-gray-300 text-lg">
          {isOnline 
            ? "Reconnecting to sync your data..."
            : "No internet connection. Don't worry - the app still works!"
          }
        </p>

        {/* Features list */}
        {!isOnline && (
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6 text-left space-y-3">
            <p className="text-white font-semibold mb-3">You can still:</p>
            <div className="space-y-2 text-gray-300">
              <div className="flex items-start gap-3">
                <span className="text-green-400 mt-1">✓</span>
                <span>View your expenses and income</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-green-400 mt-1">✓</span>
                <span>Add new transactions</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-green-400 mt-1">✓</span>
                <span>Edit existing data</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-green-400 mt-1">✓</span>
                <span>View your dashboard</span>
              </div>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="space-y-3 pt-4">
          <button 
            onClick={handleContinue}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg"
          >
            Continue to App
          </button>
          
          <button 
            onClick={handleRetry}
            className="w-full bg-gray-700 hover:bg-gray-600 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200"
          >
            Check Connection
          </button>
        </div>

        {/* Info text */}
        <div className="pt-4 space-y-2">
          <p className="text-sm text-gray-400">
            💾 All changes are saved locally
          </p>
          <p className="text-xs text-gray-500">
            Your data will sync automatically when you're back online
          </p>
        </div>
      </div>
    </div>
  );
}