"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export function OfflineCacheHelper() {
  const [show, setShow] = useState(false);
  const [cachedPages, setCachedPages] = useState<string[]>([]);
  const pathname = usePathname();

  useEffect(() => {
    // Check if this is the first visit
    const hasSeenHelper = localStorage.getItem('offline-cache-helper-seen');
    
    if (!hasSeenHelper && typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      // Show helper after 5 seconds
      const timer = setTimeout(() => {
        checkCachedPages();
        setShow(true);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, []);

  const checkCachedPages = async () => {
    if (typeof window === 'undefined' || !('caches' in window)) return;

    try {
      const cache = await caches.open('app-pages');
      const keys = await cache.keys();
      const pages = keys.map(req => new URL(req.url).pathname);
      setCachedPages(pages);
    } catch (error) {
      console.error('Error checking cache:', error);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('offline-cache-helper-seen', 'true');
    setShow(false);
  };

  const importantPages = ['/dashboard', '/expenses', '/income', '/cards', '/settings'];
  const uncachedPages = importantPages.filter(page => !cachedPages.includes(page));

  if (!show || uncachedPages.length === 0) return null;

  return (
    <div className="fixed bottom-20 right-4 max-w-sm bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-xl shadow-2xl p-4 z-40 animate-slide-up">
      <div className="flex items-start gap-3">
        <div className="text-2xl">💡</div>
        <div className="flex-1">
          <h3 className="font-semibold mb-1">Enable Offline Mode</h3>
          <p className="text-sm text-blue-100 mb-3">
            Visit these pages to use them offline:
          </p>
          <div className="space-y-1 mb-3">
            {uncachedPages.map(page => (
              <a
                key={page}
                href={page}
                className="block text-sm bg-blue-800 hover:bg-blue-900 px-3 py-1 rounded transition-colors"
              >
                {page}
              </a>
            ))}
          </div>
          <button
            onClick={handleDismiss}
            className="text-xs text-blue-200 hover:text-white underline"
          >
            Got it, don't show again
          </button>
        </div>
        <button
          onClick={handleDismiss}
          className="text-blue-200 hover:text-white text-xl leading-none"
        >
          ×
        </button>
      </div>
    </div>
  );
}
