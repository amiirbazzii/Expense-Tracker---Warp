"use client";

import { ReactNode, useEffect, useRef } from 'react';
import { OfflineFirstProvider } from './OfflineFirstProvider';
import { useAuth } from '@/contexts/AuthContext';
import { syncEngine } from '@/lib/sync/SyncEngine';

interface OfflineFirstWrapperProps {
  children: ReactNode;
}

export function OfflineFirstWrapper({ children }: OfflineFirstWrapperProps) {
  const { user, token } = useAuth();
  // Track whether the engine is currently running so we only stop it once.
  const engineRunning = useRef(false);

  useEffect(() => {
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!convexUrl) {
      console.warn('[OfflineFirstWrapper] NEXT_PUBLIC_CONVEX_URL is not set — sync disabled');
      return;
    }

    if (token) {
      // User is authenticated — start (or keep) the sync engine running.
      syncEngine.start(convexUrl, token);
      engineRunning.current = true;
    } else if (engineRunning.current) {
      // Token was cleared (logout) — wipe local data and stop the engine.
      engineRunning.current = false;
      syncEngine.clearAndStop().catch((err) => {
        console.error('[OfflineFirstWrapper] Error during clearAndStop:', err);
      });
    }
  }, [token]);

  return (
    <OfflineFirstProvider userId={user?._id}>
      {children}
    </OfflineFirstProvider>
  );
}