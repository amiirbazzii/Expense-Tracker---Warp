"use client";

import { ReactNode, useEffect, useRef } from 'react';
import { OfflineFirstProvider } from './OfflineFirstProvider';
import { useAuth } from '@/contexts/AuthContext';
import { syncEngine } from '@/lib/sync/SyncEngine';
import { hydrationService } from '@/lib/sync/HydrationService';
import { localDataStore } from '@/lib/store';

interface OfflineFirstWrapperProps {
  children: ReactNode;
}

export function OfflineFirstWrapper({ children }: OfflineFirstWrapperProps) {
  const { user, token } = useAuth();
  const engineRunning = useRef(false);

  useEffect(() => {
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!convexUrl) {
      console.warn('[OfflineFirstWrapper] NEXT_PUBLIC_CONVEX_URL is not set — sync disabled');
      return;
    }

    if (token && user) {
      // User is authenticated — start sync engine.
      syncEngine.start(convexUrl, token);
      engineRunning.current = true;

      // Initialize the local store and hydrate from Convex
      localDataStore.init(user._id).then(() => {
        const client = syncEngine.getClient();
        if (client && navigator.onLine) {
          hydrationService.hydrate(client, token);
        }
      });
    } else if (engineRunning.current) {
      // Token cleared (logout) — wipe data, stop engine, reset hydration.
      engineRunning.current = false;
      hydrationService.reset();
      syncEngine.clearAndStop().catch((err) => {
        console.error('[OfflineFirstWrapper] Error during clearAndStop:', err);
      });
    }
  }, [token, user]);

  return (
    <OfflineFirstProvider userId={user?._id}>
      {children}
    </OfflineFirstProvider>
  );
}
