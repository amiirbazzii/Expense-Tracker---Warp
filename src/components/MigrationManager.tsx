/**
 * Main migration manager component that handles schema migrations
 * and provides user interface for migration operations
 */

import React, { useEffect, useState } from 'react';
import { LocalStorageManager } from '../lib/storage/LocalStorageManager';
import { useMigration, useMigrationCheck, useMigrationNotifications } from '../hooks/useMigration';
import { MigrationProgressModal } from './MigrationProgressModal';
import { MigrationNotificationContainer } from './MigrationNotification';

interface MigrationManagerProps {
  storageManager: LocalStorageManager;
  autoRunMigrations?: boolean;
  showNotifications?: boolean;
  onMigrationComplete?: () => void;
  onMigrationError?: (error: string) => void;
}

export const MigrationManager: React.FC<MigrationManagerProps> = ({
  storageManager,
  autoRunMigrations = false,
  showNotifications = true,
  onMigrationComplete,
  onMigrationError
}) => {
  const [showModal, setShowModal] = useState(false);
  const [hasCheckedMigrations, setHasCheckedMigrations] = useState(false);

  const { notifications, addNotification, removeNotification, clearAllNotifications } = useMigrationNotifications();

  const [migrationState, migrationActions] = useMigration(storageManager, {
    autoCheck: true,
    onMigrationComplete: (result) => {
      if (result.success) {
        addNotification(
          'success',
          'Migration Completed',
          `Successfully updated to version ${result.toVersion}`
        );
        onMigrationComplete?.();
      } else {
        addNotification(
          'error',
          'Migration Failed',
          `Failed to migrate: ${result.errors.join(', ')}`
        );
      }
      setShowModal(false);
    },
    onMigrationError: (error) => {
      addNotification('error', 'Migration Error', error);
      onMigrationError?.(error);
    },
    onProgressUpdate: (progress) => {
      if (progress.errors.length > 0) {
        progress.errors.forEach(error => {
          addNotification('warning', 'Migration Warning', error);
        });
      }
    }
  });

  const migrationCheck = useMigrationCheck(storageManager);

  // Check for migrations on mount
  useEffect(() => {
    if (!hasCheckedMigrations && migrationCheck && !migrationCheck.isLoading) {
      setHasCheckedMigrations(true);

      if (migrationCheck.needsMigration) {
        addNotification(
          'info',
          'Database Update Available',
          `Your database needs to be updated from ${migrationCheck.currentVersion} to ${migrationCheck.latestVersion}`
        );

        if (autoRunMigrations) {
          handleRunMigrations();
        } else {
          setShowModal(true);
        }
      }
    }
  }, [migrationCheck, hasCheckedMigrations, autoRunMigrations, addNotification]);

  const handleRunMigrations = async () => {
    try {
      setShowModal(true);
      await migrationActions.runMigrations();
    } catch (error) {
      console.error('Migration failed:', error);
    }
  };

  const handleRollback = async (backupId: string) => {
    try {
      await migrationActions.rollbackMigration(backupId);
      addNotification(
        'info',
        'Rollback Completed',
        'Database has been rolled back to previous version'
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Rollback failed';
      addNotification('error', 'Rollback Failed', errorMessage);
    }
  };

  const handleCloseModal = () => {
    if (!migrationState.isRunning) {
      setShowModal(false);
    }
  };

  const handleDismissError = () => {
    migrationActions.clearError();
  };

  return (
    <>
      {/* Migration Progress Modal */}
      <MigrationProgressModal
        isOpen={showModal}
        isRunning={migrationState.isRunning}
        progress={migrationState.progress}
        result={migrationState.result}
        error={migrationState.error}
        availableBackups={migrationState.availableBackups}
        schemaInfo={migrationState.schemaInfo}
        onRunMigrations={handleRunMigrations}
        onRollback={handleRollback}
        onClose={handleCloseModal}
        onDismissError={handleDismissError}
      />

      {/* Notification Container */}
      {showNotifications && (
        <MigrationNotificationContainer
          notifications={notifications}
          onDismiss={removeNotification}
          position="top-right"
        />
      )}
    </>
  );
};

/**
 * Hook for manually triggering migration UI
 */
export function useMigrationUI(storageManager: LocalStorageManager) {
  const [showMigrationModal, setShowMigrationModal] = useState(false);

  const openMigrationModal = () => setShowMigrationModal(true);
  const closeMigrationModal = () => setShowMigrationModal(false);

  const MigrationUI = () => (
    <MigrationManager
      storageManager={storageManager}
      autoRunMigrations={false}
      showNotifications={true}
    />
  );

  return {
    showMigrationModal,
    openMigrationModal,
    closeMigrationModal,
    MigrationUI
  };
}

/**
 * Simple migration status indicator component
 */
interface MigrationStatusIndicatorProps {
  storageManager: LocalStorageManager;
  onClick?: () => void;
}

export const MigrationStatusIndicator: React.FC<MigrationStatusIndicatorProps> = ({
  storageManager,
  onClick
}) => {
  const migrationCheck = useMigrationCheck(storageManager);

  if (migrationCheck.isLoading) {
    return (
      <div className="flex items-center text-gray-500 text-sm">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400 mr-2"></div>
        Checking database...
      </div>
    );
  }

  if (migrationCheck.error) {
    return (
      <div className="flex items-center text-red-600 text-sm cursor-pointer" onClick={onClick}>
        <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
        Database error
      </div>
    );
  }

  if (migrationCheck.needsMigration) {
    return (
      <div className="flex items-center text-orange-600 text-sm cursor-pointer" onClick={onClick}>
        <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
        Update available (v{migrationCheck.latestVersion})
      </div>
    );
  }

  return (
    <div className="flex items-center text-green-600 text-sm">
      <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
      Database up to date (v{migrationCheck.currentVersion})
    </div>
  );
};