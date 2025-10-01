'use client';

import { useState, useCallback, useRef } from 'react';
import { ConflictDetector } from '@/lib/sync/ConflictDetector';
import { 
  ConflictItem, 
  ConflictResolution, 
  ConflictResolutionStrategy,
  EntityType,
  LocalEntity
} from '@/lib/types/local-storage';

interface UseConflictResolutionOptions {
  onConflictResolved?: (resolution: ConflictResolution) => void;
  onError?: (error: Error) => void;
}

export function useConflictResolution(options: UseConflictResolutionOptions = {}) {
  const [conflicts, setConflicts] = useState<ConflictItem[]>([]);
  const [isResolving, setIsResolving] = useState(false);
  const [showResolutionModal, setShowResolutionModal] = useState(false);
  const [showHistoryViewer, setShowHistoryViewer] = useState(false);
  
  const conflictDetectorRef = useRef<ConflictDetector>(new ConflictDetector());

  const detectConflicts = useCallback(async (localData: any, cloudData: any) => {
    try {
      const result = await conflictDetectorRef.current.detectConflicts(localData, cloudData);
      setConflicts(result.conflictItems);
      
      if (result.hasConflicts) {
        setShowResolutionModal(true);
      }
      
      return result;
    } catch (error) {
      options.onError?.(error as Error);
      throw error;
    }
  }, [options]);

  const resolveConflicts = useCallback(async (strategy: ConflictResolutionStrategy) => {
    if (conflicts.length === 0) return;

    setIsResolving(true);
    try {
      const resolutions: ConflictResolution[] = [];

      for (const conflict of conflicts) {
        // Perform field-level resolution for each conflict
        if (conflict.localVersion && conflict.cloudVersion) {
          const { resolved } = await conflictDetectorRef.current.resolveFieldLevelConflicts(
            conflict.localVersion as LocalEntity,
            conflict.cloudVersion,
            strategy
          );

          const resolution: ConflictResolution = {
            id: `resolution_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            entityType: conflict.entityType,
            entityId: conflict.entityId,
            resolvedAt: Date.now(),
            strategy: strategy.strategy,
            note: `Resolved using ${strategy.strategy} strategy`
          };

          conflictDetectorRef.current.addToHistory(resolution);
          resolutions.push(resolution);
          options.onConflictResolved?.(resolution);
        }
      }

      setConflicts([]);
      setShowResolutionModal(false);
    } catch (error) {
      options.onError?.(error as Error);
      throw error;
    } finally {
      setIsResolving(false);
    }
  }, [conflicts, options]);

  const resolveIndividualConflict = useCallback(async (
    conflictId: string, 
    resolution: 'local' | 'cloud' | 'merge'
  ) => {
    const conflict = conflicts.find(c => c.entityId === conflictId);
    if (!conflict) return;

    setIsResolving(true);
    try {
      let strategy: ConflictResolutionStrategy;
      
      switch (resolution) {
        case 'local':
          strategy = {
            strategy: 'local_wins',
            applyToAll: false,
            preserveDeleted: true,
            mergeRules: []
          };
          break;
        case 'cloud':
          strategy = {
            strategy: 'cloud_wins',
            applyToAll: false,
            preserveDeleted: true,
            mergeRules: []
          };
          break;
        case 'merge':
          strategy = {
            strategy: 'merge',
            applyToAll: false,
            preserveDeleted: true,
            mergeRules: []
          };
          break;
      }

      if (conflict.localVersion && conflict.cloudVersion) {
        const { resolved } = await conflictDetectorRef.current.resolveFieldLevelConflicts(
          conflict.localVersion as LocalEntity,
          conflict.cloudVersion,
          strategy
        );

        const resolutionRecord: ConflictResolution = {
          id: `resolution_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          entityType: conflict.entityType,
          entityId: conflict.entityId,
          resolvedAt: Date.now(),
          strategy: strategy.strategy,
          note: `Individual resolution: ${resolution}`
        };

        conflictDetectorRef.current.addToHistory(resolutionRecord);
        options.onConflictResolved?.(resolutionRecord);

        // Remove resolved conflict from list
        setConflicts(prev => prev.filter(c => c.entityId !== conflictId));
      }
    } catch (error) {
      options.onError?.(error as Error);
      throw error;
    } finally {
      setIsResolving(false);
    }
  }, [conflicts, options]);

  const getConflictHistory = useCallback((entityType?: EntityType, entityId?: string) => {
    return conflictDetectorRef.current.getConflictHistory(entityType, entityId);
  }, []);

  const getConflictStats = useCallback(() => {
    return conflictDetectorRef.current.getConflictStats();
  }, []);

  const clearConflictHistory = useCallback(() => {
    conflictDetectorRef.current.clearHistory();
  }, []);

  const exportConflictHistory = useCallback(() => {
    return conflictDetectorRef.current.exportHistory();
  }, []);

  const importConflictHistory = useCallback((history: ConflictResolution[]) => {
    conflictDetectorRef.current.importHistory(history);
  }, []);

  // Auto-resolve conflicts that are marked as auto-resolvable
  const autoResolveConflicts = useCallback(async () => {
    const autoResolvableConflicts = conflicts.filter(c => c.autoResolvable);
    
    if (autoResolvableConflicts.length === 0) return;

    setIsResolving(true);
    try {
      const strategy: ConflictResolutionStrategy = {
        strategy: 'merge',
        applyToAll: true,
        preserveDeleted: true,
        mergeRules: []
      };

      for (const conflict of autoResolvableConflicts) {
        if (conflict.localVersion && conflict.cloudVersion) {
          const { resolved } = await conflictDetectorRef.current.resolveFieldLevelConflicts(
            conflict.localVersion as LocalEntity,
            conflict.cloudVersion,
            strategy
          );

          const resolution: ConflictResolution = {
            id: `auto_resolution_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            entityType: conflict.entityType,
            entityId: conflict.entityId,
            resolvedAt: Date.now(),
            strategy: 'merge',
            note: 'Auto-resolved using CRDT merge strategy'
          };

          conflictDetectorRef.current.addToHistory(resolution);
          options.onConflictResolved?.(resolution);
        }
      }

      // Remove auto-resolved conflicts
      setConflicts(prev => prev.filter(c => !c.autoResolvable));
    } catch (error) {
      options.onError?.(error as Error);
      throw error;
    } finally {
      setIsResolving(false);
    }
  }, [conflicts, options]);

  const openResolutionModal = useCallback(() => {
    setShowResolutionModal(true);
  }, []);

  const closeResolutionModal = useCallback(() => {
    setShowResolutionModal(false);
  }, []);

  const openHistoryViewer = useCallback(() => {
    setShowHistoryViewer(true);
  }, []);

  const closeHistoryViewer = useCallback(() => {
    setShowHistoryViewer(false);
  }, []);

  return {
    // State
    conflicts,
    isResolving,
    showResolutionModal,
    showHistoryViewer,
    hasConflicts: conflicts.length > 0,
    autoResolvableCount: conflicts.filter(c => c.autoResolvable).length,
    
    // Actions
    detectConflicts,
    resolveConflicts,
    resolveIndividualConflict,
    autoResolveConflicts,
    
    // History management
    getConflictHistory,
    getConflictStats,
    clearConflictHistory,
    exportConflictHistory,
    importConflictHistory,
    
    // UI controls
    openResolutionModal,
    closeResolutionModal,
    openHistoryViewer,
    closeHistoryViewer,
    
    // Utilities
    conflictDetector: conflictDetectorRef.current
  };
}