/**
 * React hook for managing database migrations with user notifications
 * and progress tracking for the local-first architecture.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { MigrationService, MigrationEvent, MigrationResult, MigrationProgress, MigrationBackup } from '../lib/migration/MigrationService';
import { LocalStorageManager } from '../lib/storage/LocalStorageManager';

export interface MigrationState {
  isRunning: boolean;
  progress: MigrationProgress | null;
  result: MigrationResult | null;
  error: string | null;
  availableBackups: MigrationBackup[];
  schemaInfo: {
    currentVersion: string;
    latestVersion: string;
    migrationsNeeded: string[];
    isUpToDate: boolean;
  } | null;
}

export interface MigrationActions {
  runMigrations: (targetVersion?: string) => Promise<MigrationResult>;
  rollbackMigration: (backupId: string) => Promise<MigrationResult>;
  checkSchemaVersion: () => Promise<void>;
  loadAvailableBackups: () => Promise<void>;
  clearError: () => void;
}

export interface UseMigrationOptions {
  autoCheck?: boolean;
  onMigrationComplete?: (result: MigrationResult) => void;
  onMigrationError?: (error: string) => void;
  onProgressUpdate?: (progress: MigrationProgress) => void;
}

export function useMigration(
  storageManager: LocalStorageManager,
  options: UseMigrationOptions = {}
): [MigrationState, MigrationActions] {
  const {
    autoCheck = true,
    onMigrationComplete,
    onMigrationError,
    onProgressUpdate
  } = options;

  const [state, setState] = useState<MigrationState>({
    isRunning: false,
    progress: null,
    result: null,
    error: null,
    availableBackups: [],
    schemaInfo: null
  });

  const migrationServiceRef = useRef<MigrationService | null>(null);

  // Initialize migration service
  useEffect(() => {
    if (!migrationServiceRef.current) {
      migrationServiceRef.current = new MigrationService(storageManager);
      
      // Set up event listeners
      const handleMigrationEvent = (event: MigrationEvent) => {
        setState(prevState => {
          const newState = { ...prevState };

          switch (event.type) {
            case 'started':
              newState.isRunning = true;
              newState.progress = null;
              newState.result = null;
              newState.error = null;
              break;

            case 'progress':
              newState.progress = event.progress || null;
              if (event.progress && onProgressUpdate) {
                onProgressUpdate(event.progress);
              }
              break;

            case 'completed':
              newState.isRunning = false;
              newState.progress = null;
              newState.result = event.result || null;
              if (event.result && onMigrationComplete) {
                onMigrationComplete(event.result);
              }
              break;

            case 'failed':
              newState.isRunning = false;
              newState.progress = null;
              newState.result = event.result || null;
              newState.error = event.error || 'Migration failed';
              if (event.error && onMigrationError) {
                onMigrationError(event.error);
              }
              break;

            case 'rollback_started':
              newState.isRunning = true;
              newState.progress = {
                currentStep: 'Rolling back migration...',
                totalSteps: 1,
                completedSteps: 0,
                percentage: 0,
                errors: []
              };
              break;

            case 'rollback_completed':
              newState.isRunning = false;
              newState.progress = null;
              newState.result = event.result || null;
              if (event.result && onMigrationComplete) {
                onMigrationComplete(event.result);
              }
              break;
          }

          return newState;
        });
      };

      migrationServiceRef.current.addEventListener(handleMigrationEvent);
    }

    // Auto-check schema version on mount
    if (autoCheck) {
      checkSchemaVersion();
    }

    return () => {
      if (migrationServiceRef.current) {
        // Note: MigrationService doesn't expose removeEventListener in the current implementation
        // This would need to be added to properly clean up
      }
    };
  }, [storageManager, autoCheck, onMigrationComplete, onMigrationError, onProgressUpdate]);

  const checkSchemaVersion = useCallback(async () => {
    if (!migrationServiceRef.current) return;

    try {
      const schemaInfo = await migrationServiceRef.current.detectSchemaVersion();
      setState(prevState => ({
        ...prevState,
        schemaInfo,
        error: null
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to check schema version';
      setState(prevState => ({
        ...prevState,
        error: errorMessage
      }));
    }
  }, []);

  const runMigrations = useCallback(async (targetVersion?: string): Promise<MigrationResult> => {
    if (!migrationServiceRef.current) {
      throw new Error('Migration service not initialized');
    }

    try {
      const result = await migrationServiceRef.current.runMigrations(targetVersion);
      
      // Refresh schema info after migration
      await checkSchemaVersion();
      await loadAvailableBackups();
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Migration failed';
      setState(prevState => ({
        ...prevState,
        error: errorMessage,
        isRunning: false
      }));
      throw error;
    }
  }, [checkSchemaVersion]);

  const rollbackMigration = useCallback(async (backupId: string): Promise<MigrationResult> => {
    if (!migrationServiceRef.current) {
      throw new Error('Migration service not initialized');
    }

    try {
      const result = await migrationServiceRef.current.rollbackMigration(backupId);
      
      // Refresh schema info after rollback
      await checkSchemaVersion();
      await loadAvailableBackups();
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Rollback failed';
      setState(prevState => ({
        ...prevState,
        error: errorMessage,
        isRunning: false
      }));
      throw error;
    }
  }, [checkSchemaVersion]);

  const loadAvailableBackups = useCallback(async () => {
    if (!migrationServiceRef.current) return;

    try {
      const backups = await migrationServiceRef.current.getAvailableBackups();
      setState(prevState => ({
        ...prevState,
        availableBackups: backups
      }));
    } catch (error) {
      console.error('Failed to load available backups:', error);
    }
  }, []);

  const clearError = useCallback(() => {
    setState(prevState => ({
      ...prevState,
      error: null
    }));
  }, []);

  // Load available backups on mount
  useEffect(() => {
    loadAvailableBackups();
  }, [loadAvailableBackups]);

  const actions: MigrationActions = {
    runMigrations,
    rollbackMigration,
    checkSchemaVersion,
    loadAvailableBackups,
    clearError
  };

  return [state, actions];
}

/**
 * Hook for checking if migrations are needed without running them
 */
export function useMigrationCheck(storageManager: LocalStorageManager) {
  const [migrationInfo, setMigrationInfo] = useState<{
    isLoading: boolean;
    needsMigration: boolean;
    currentVersion: string;
    latestVersion: string;
    migrationsNeeded: string[];
    error: string | null;
  }>({
    isLoading: true,
    needsMigration: false,
    currentVersion: '1.0.0',
    latestVersion: '2.0.0',
    migrationsNeeded: [],
    error: null
  });

  useEffect(() => {
    const checkMigrations = async () => {
      try {
        const migrationService = new MigrationService(storageManager);
        const schemaInfo = await migrationService.detectSchemaVersion();
        
        setMigrationInfo({
          isLoading: false,
          needsMigration: !schemaInfo.isUpToDate,
          currentVersion: schemaInfo.currentVersion,
          latestVersion: schemaInfo.latestVersion,
          migrationsNeeded: schemaInfo.migrationsNeeded,
          error: null
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to check migrations';
        setMigrationInfo(prev => ({
          ...prev,
          isLoading: false,
          error: errorMessage
        }));
      }
    };

    checkMigrations();
  }, [storageManager]);

  return migrationInfo;
}

/**
 * Hook for migration progress notifications
 */
export function useMigrationNotifications() {
  const [notifications, setNotifications] = useState<{
    id: string;
    type: 'info' | 'success' | 'warning' | 'error';
    title: string;
    message: string;
    timestamp: number;
  }[]>([]);

  const addNotification = useCallback((
    type: 'info' | 'success' | 'warning' | 'error',
    title: string,
    message: string
  ) => {
    const notification = {
      id: `migration_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      title,
      message,
      timestamp: Date.now()
    };

    setNotifications(prev => [...prev, notification]);

    // Auto-remove after 10 seconds for non-error notifications
    if (type !== 'error') {
      setTimeout(() => {
        removeNotification(notification.id);
      }, 10000);
    }
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  return {
    notifications,
    addNotification,
    removeNotification,
    clearAllNotifications
  };
}