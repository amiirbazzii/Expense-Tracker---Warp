/**
 * Example usage of the MigrationService and related components
 */

import React, { useState } from 'react';
import { LocalStorageManager } from '../lib/storage/LocalStorageManager';
import { MigrationManager, MigrationStatusIndicator, useMigrationUI } from '../components/MigrationManager';

// Example of how to integrate migration management into your app
export const MigrationExample: React.FC = () => {
  const [storageManager] = useState(() => new LocalStorageManager());

  // Example 1: Automatic migration management
  const AutoMigrationExample = () => (
    <div className="p-6 bg-gray-50 rounded-lg">
      <h3 className="text-lg font-semibold mb-4">Automatic Migration Management</h3>
      <p className="text-gray-600 mb-4">
        This will automatically check for migrations and show notifications to the user.
      </p>
      
      <MigrationManager
        storageManager={storageManager}
        autoRunMigrations={false} // Set to true for automatic migrations
        showNotifications={true}
        onMigrationComplete={() => {
          console.log('Migration completed successfully!');
        }}
        onMigrationError={(error) => {
          console.error('Migration failed:', error);
        }}
      />
    </div>
  );

  // Example 2: Manual migration control
  const ManualMigrationExample = () => {
    const { showMigrationModal, openMigrationModal, closeMigrationModal, MigrationUI } = useMigrationUI(storageManager);

    return (
      <div className="p-6 bg-blue-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-4">Manual Migration Control</h3>
        <p className="text-gray-600 mb-4">
          This gives you full control over when to show the migration UI.
        </p>
        
        <button
          onClick={openMigrationModal}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
        >
          Open Migration Manager
        </button>

        {showMigrationModal && <MigrationUI />}
      </div>
    );
  };

  // Example 3: Status indicator
  const StatusIndicatorExample = () => (
    <div className="p-6 bg-green-50 rounded-lg">
      <h3 className="text-lg font-semibold mb-4">Migration Status Indicator</h3>
      <p className="text-gray-600 mb-4">
        Shows the current database status in your UI.
      </p>
      
      <MigrationStatusIndicator
        storageManager={storageManager}
        onClick={() => {
          console.log('Status indicator clicked - could open migration UI');
        }}
      />
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Migration Service Examples
        </h1>
        <p className="text-gray-600">
          Different ways to integrate database migrations into your application
        </p>
      </div>

      <AutoMigrationExample />
      <ManualMigrationExample />
      <StatusIndicatorExample />

      <div className="p-6 bg-yellow-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-4">Integration Tips</h3>
        <ul className="space-y-2 text-gray-700">
          <li>• Place the MigrationManager at the root of your app for automatic migration checking</li>
          <li>• Use the status indicator in your settings or admin panel</li>
          <li>• Set autoRunMigrations to true for seamless updates in production</li>
          <li>• Always test migrations thoroughly before deploying</li>
          <li>• Keep backups enabled for rollback capabilities</li>
        </ul>
      </div>
    </div>
  );
};

// Example of integrating into app layout
export const AppWithMigrations: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [storageManager] = useState(() => new LocalStorageManager());

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Your app content */}
      {children}

      {/* Migration management - place at root level */}
      <MigrationManager
        storageManager={storageManager}
        autoRunMigrations={false}
        showNotifications={true}
      />
    </div>
  );
};