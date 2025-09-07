"use client";

import React from 'react';
import { OfflineProvider, useOffline } from '../contexts/OfflineContext';
import { ConflictPrompt } from '../components/ConflictPrompt';
import { ConvexProvider } from './ConvexProvider';

/**
 * LocalFirstProvider integrates all local-first data management components
 * including conflict detection, resolution UI, and offline capabilities
 */
function LocalFirstProviderInner({ children }: { children: React.ReactNode }) {
  const {
    conflictState,
    resolveConflict,
    dismissConflict,
    syncStatus
  } = useOffline();

  const handleConflictAccept = async () => {
    if (!conflictState.conflictResult) return;
    
    const action = conflictState.conflictResult.recommendedAction;
    await resolveConflict(action);
  };

  const handleConflictDismiss = () => {
    dismissConflict();
  };

  return (
    <>
      {children}
      
      {/* Conflict Resolution UI */}
      {conflictState.hasConflicts && conflictState.conflictResult && (
        <ConflictPrompt
          conflictResult={conflictState.conflictResult}
          onAccept={handleConflictAccept}
          onDismiss={handleConflictDismiss}
          isVisible={true}
          isLoading={conflictState.isResolving || syncStatus === 'syncing'}
        />
      )}
    </>
  );
}

/**
 * Main provider that wraps the app with local-first data management
 */
export function LocalFirstProvider({ children }: { children: React.ReactNode }) {
  return (
    <ConvexProvider>
      <OfflineProvider>
        <LocalFirstProviderInner>
          {children}
        </LocalFirstProviderInner>
      </OfflineProvider>
    </ConvexProvider>
  );
}

/**
 * Hook to access local-first data management capabilities
 */
export { useOffline as useLocalFirst } from '../contexts/OfflineContext';