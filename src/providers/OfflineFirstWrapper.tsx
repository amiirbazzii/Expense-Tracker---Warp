"use client";

import { ReactNode, useEffect, useRef } from 'react';
import { OfflineFirstProvider } from './OfflineFirstProvider';
import { useAuth } from '@/contexts/AuthContext';
import { syncEngine } from '@/lib/sync/SyncEngine';
import { hydrationService } from '@/lib/sync/HydrationService';
import { localDataStore } from '@/lib/store';
import { connectivity } from '@/lib/connectivity';

interface OfflineFirstWrapperProps {
  children: ReactNode;
}

/** How often to re-pull server state while the tab is open and online. */
const REHYDRATE_INTERVAL_MS = 5 * 60 * 1000;

export function OfflineFirstWrapper({ children }: OfflineFirstWrapperProps) {
  const { user, token } = useAuth();
  const engineRunning = useRef(false);

  useEffect(() => {
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!convexUrl) {
      console.warn('[OfflineFirstWrapper] NEXT_PUBLIC_CONVEX_URL is not set — sync disabled');
      return;
    }

    if (!token || !user) {
      if (engineRunning.current) {
        // Token cleared (logout) — wipe data, stop engine, reset hydration.
        engineRunning.current = false;
        hydrationService.reset();
        syncEngine.clearAndStop().catch((err) => {
          console.error('[OfflineFirstWrapper] Error during clearAndStop:', err);
        });
      }
      return;
    }

    // User is authenticated — start sync engine.
    syncEngine.start(convexUrl, token);
    engineRunning.current = true;

    let cancelled = false;

    // Initialize the local store, then keep it in step with the server.
    const ready = localDataStore.init(user._id);

    const pull = (force = false) => {
      if (cancelled || !connectivity.isOnline) return;
      const client = syncEngine.getClient();
      if (!client) return;
      hydrationService.hydrate(client, token, { force });
    };

    ready.then(() => pull());

    // Booting offline used to mean the session never hydrated at all, and a
    // change made on another device never arrived. Re-pull whenever the app
    // regains connectivity, comes back to the foreground, or has been open
    // for a while.
    const unsubscribe = connectivity.subscribe((online) => {
      if (online) ready.then(() => pull(true));
    });
    const onVisible = () => {
      if (document.visibilityState === 'visible') ready.then(() => pull());
    };

    document.addEventListener('visibilitychange', onVisible);
    const interval = setInterval(() => ready.then(() => pull()), REHYDRATE_INTERVAL_MS);

    return () => {
      cancelled = true;
      unsubscribe();
      document.removeEventListener('visibilitychange', onVisible);
      clearInterval(interval);
    };
  }, [token, user]);

  return (
    <OfflineFirstProvider userId={user?._id}>
      {children}
    </OfflineFirstProvider>
  );
}
