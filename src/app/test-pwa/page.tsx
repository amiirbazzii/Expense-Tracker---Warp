"use client";

import { useEffect, useState } from "react";

export default function TestPWAPage() {
  const [isOnline, setIsOnline] = useState(true);
  const [swRegistered, setSwRegistered] = useState(false);
  const [swStatus, setSwStatus] = useState("Checking...");
  const [cacheStatus, setCacheStatus] = useState("Checking...");
  const [isInstalled, setIsInstalled] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // Check online status
    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine);
    }
    
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Check if installed as PWA
    if (typeof window !== 'undefined') {
      const isPWA = window.matchMedia('(display-mode: standalone)').matches;
      setIsInstalled(isPWA);
    }

    // Check service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then(registration => {
        if (registration) {
          setSwRegistered(true);
          setSwStatus(`Active: ${registration.active?.state || 'unknown'}`);
        } else {
          setSwStatus("Not registered");
        }
      });
    } else {
      setSwStatus("Not supported");
    }

    // Check cache
    if ('caches' in window) {
      caches.keys().then(cacheNames => {
        if (cacheNames.length > 0) {
          setCacheStatus(`${cacheNames.length} cache(s) found: ${cacheNames.join(', ')}`);
        } else {
          setCacheStatus("No caches found");
        }
      });
    } else {
      setCacheStatus("Cache API not supported");
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const clearCaches = async () => {
    if (typeof window !== 'undefined' && 'caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
      setCacheStatus("All caches cleared!");
      setTimeout(() => window.location.reload(), 1000);
    }
  };

  const unregisterSW = async () => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await registration.unregister();
        setSwStatus("Unregistered!");
        setTimeout(() => window.location.reload(), 1000);
      }
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white flex items-center justify-center">
        <div className="text-2xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-2">PWA Test Dashboard</h1>
        <p className="text-gray-400 mb-8">Check your Progressive Web App status</p>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {/* Online Status */}
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-4 h-4 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
              <h2 className="text-xl font-semibold">Connection Status</h2>
            </div>
            <p className="text-2xl font-bold">{isOnline ? "Online" : "Offline"}</p>
            <p className="text-sm text-gray-400 mt-2">
              {isOnline ? "Connected to the internet" : "No internet connection"}
            </p>
          </div>

          {/* Installation Status */}
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-4 h-4 rounded-full ${isInstalled ? 'bg-green-500' : 'bg-yellow-500'}`} />
              <h2 className="text-xl font-semibold">Installation</h2>
            </div>
            <p className="text-2xl font-bold">{isInstalled ? "Installed" : "Browser"}</p>
            <p className="text-sm text-gray-400 mt-2">
              {isInstalled ? "Running as standalone app" : "Running in browser"}
            </p>
          </div>

          {/* Service Worker Status */}
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-4 h-4 rounded-full ${swRegistered ? 'bg-green-500' : 'bg-red-500'}`} />
              <h2 className="text-xl font-semibold">Service Worker</h2>
            </div>
            <p className="text-lg font-bold">{swRegistered ? "Registered" : "Not Registered"}</p>
            <p className="text-sm text-gray-400 mt-2">{swStatus}</p>
          </div>

          {/* Cache Status */}
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-4 h-4 rounded-full bg-blue-500" />
              <h2 className="text-xl font-semibold">Cache Storage</h2>
            </div>
            <p className="text-sm text-gray-300 mt-2 break-words">{cacheStatus}</p>
          </div>
        </div>

        {/* Feature Checklist */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6 mb-8">
          <h2 className="text-2xl font-semibold mb-4">PWA Features</h2>
          <div className="space-y-3">
            <FeatureItem 
              enabled={mounted && 'serviceWorker' in navigator}
              label="Service Worker API"
            />
            <FeatureItem 
              enabled={mounted && typeof window !== 'undefined' && 'caches' in window}
              label="Cache Storage API"
            />
            <FeatureItem 
              enabled={mounted && typeof window !== 'undefined' && 'PushManager' in window}
              label="Push Notifications"
            />
            <FeatureItem 
              enabled={mounted && typeof window !== 'undefined' && 'SyncManager' in window}
              label="Background Sync"
            />
            <FeatureItem 
              enabled={mounted && typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches}
              label="Standalone Display Mode"
            />
            <FeatureItem 
              enabled={mounted && typeof window !== 'undefined' && 'BeforeInstallPromptEvent' in window}
              label="Install Prompt"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
          <h2 className="text-2xl font-semibold mb-4">Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={clearCaches}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              Clear All Caches
            </button>
            <button
              onClick={unregisterSW}
              className="bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              Unregister Service Worker
            </button>
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              Reload Page
            </button>
            <button
              onClick={() => window.location.href = '/'}
              className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              Go to Home
            </button>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-blue-900/20 border border-blue-700 rounded-xl p-6">
          <h3 className="text-xl font-semibold mb-3">🧪 How to Test Offline Mode</h3>
          <ol className="space-y-2 text-gray-300">
            <li>1. Make sure Service Worker is registered (green status above)</li>
            <li>2. Navigate to a few pages (dashboard, expenses, etc.)</li>
            <li>3. Open DevTools (F12) → Network tab</li>
            <li>4. Check the "Offline" checkbox</li>
            <li>5. Refresh the page - it should still work!</li>
            <li>6. Try navigating to different pages</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

function FeatureItem({ enabled, label }: { enabled: boolean; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
        enabled ? 'bg-green-500' : 'bg-gray-600'
      }`}>
        {enabled ? '✓' : '✗'}
      </div>
      <span className={enabled ? 'text-white' : 'text-gray-500'}>{label}</span>
    </div>
  );
}
