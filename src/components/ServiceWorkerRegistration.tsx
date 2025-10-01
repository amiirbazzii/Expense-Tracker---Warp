"use client";

import { useEffect } from 'react';
import { serviceWorkerManager } from '../lib/workers/ServiceWorkerManager';

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      // Register both service workers
      const registerServiceWorkers = async () => {
        try {
          // Register the background sync service worker
          const backgroundSyncRegistration = await navigator.serviceWorker.register('/background-sync-sw.js', {
            scope: '/'
          });
          console.log('Background Sync SW registered:', backgroundSyncRegistration);

          // Register the default PWA service worker in production
          if (process.env.NODE_ENV === 'production') {
            const pwaRegistration = await navigator.serviceWorker.register('/sw.js');
            console.log('PWA SW registered:', pwaRegistration);
          }
        } catch (error) {
          console.error('Service Worker registration failed:', error);
        }
      };

      registerServiceWorkers();
    }
  }, []);

  return null;
}