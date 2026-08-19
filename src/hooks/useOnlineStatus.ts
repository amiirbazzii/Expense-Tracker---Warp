"use client";

import { useState, useEffect } from 'react';
import { connectivity } from '@/lib/connectivity';

/** Reactive, probe-verified connectivity state (see src/lib/connectivity.ts). */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(() => connectivity.isOnline);

  useEffect(() => {
    // The state can have changed between render and effect.
    setIsOnline(connectivity.isOnline);
    return connectivity.subscribe(setIsOnline);
  }, []);

  return isOnline;
}
