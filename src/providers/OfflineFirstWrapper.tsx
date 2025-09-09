"use client";

import { ReactNode } from 'react';
import { OfflineFirstProvider } from './OfflineFirstProvider';
import { useAuth } from '@/contexts/AuthContext';

interface OfflineFirstWrapperProps {
  children: ReactNode;
}

export function OfflineFirstWrapper({ children }: OfflineFirstWrapperProps) {
  const { user } = useAuth();
  
  return (
    <OfflineFirstProvider userId={user?._id}>
      {children}
    </OfflineFirstProvider>
  );
}