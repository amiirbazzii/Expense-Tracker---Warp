/**
 * Modal component for displaying migration progress and handling user interactions
 */

import React from 'react';
import { MigrationProgress, MigrationResult, MigrationBackup } from '../lib/migration/MigrationService';

interface MigrationProgressModalProps {
  isOpen: boolean;
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
  onRunMigrations: (targetVersion?: string) => Promise<void>;
  onRollback: (backupId: string) => Promise<void>;
  onClose: () => void;
  onDismissError: () => void;
}

export const MigrationProgressModal: React.FC<MigrationProgressModalProps> = ({
  isOpen,
  isRunning,
  progress,
  result,
  error,
  availableBackups,
  schemaInfo,
  onRunMigrations,
  onRollback,
  onClose,
  onDismissError
}) => {
  if (!isOpen) return null;

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatVersion = (version: string) => {
    return `v${version}`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              Database Migration
            </h2>
            {!isRunning && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Schema Information */}
          {schemaInfo && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-lg font-semibold mb-3">Schema Status</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Current Version:</span>
                  <span className="ml-2">{formatVersion(schemaInfo.currentVersion)}</span>
                </div>
                <div>
                  <span className="font-medium">Latest Version:</span>
                  <span className="ml-2">{formatVersion(schemaInfo.latestVersion)}</span>
                </div>
              </div>
              
              {schemaInfo.migrationsNeeded.length > 0 && (
                <div className="mt-3">
                  <span className="font-medium">Migrations Needed:</span>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {schemaInfo.migrationsNeeded.map(version => (
                      <span
                        key={version}
                        className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs"
                      >
                        {formatVersion(version)}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {schemaInfo.isUpToDate && (
                <div className="mt-3 flex items-center text-green-600">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Database is up to date
                </div>
              )}
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-red-400 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <div className="flex-1">
                  <h4 className="text-red-800 font-medium">Migration Error</h4>
                  <p className="text-red-700 mt-1">{error}</p>
                  <button
                    onClick={onDismissError}
                    className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Migration Progress */}
          {isRunning && progress && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold">Migration Progress</h3>
                <span className="text-sm text-gray-600">
                  {progress.completedSteps} of {progress.totalSteps} steps
                </span>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress.percentage}%` }}
                />
              </div>
              
              <p className="text-sm text-gray-700 mb-2">{progress.currentStep}</p>
              
              {progress.estimatedTimeRemaining && (
                <p className="text-xs text-gray-500">
                  Estimated time remaining: {Math.ceil(progress.estimatedTimeRemaining / 1000)}s
                </p>
              )}

              {progress.errors.length > 0 && (
                <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                  <h4 className="text-yellow-800 font-medium text-sm">Warnings:</h4>
                  <ul className="mt-1 text-xs text-yellow-700">
                    {progress.errors.map((error, index) => (
                      <li key={index}>• {error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Migration Result */}
          {result && !isRunning && (
            <div className="mb-6">
              <div className={`p-4 rounded-lg border ${
                result.success 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-red-50 border-red-200'
              }`}>
                <div className="flex items-start">
                  {result.success ? (
                    <svg className="w-5 h-5 text-green-400 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-red-400 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  )}
                  <div className="flex-1">
                    <h4 className={`font-medium ${
                      result.success ? 'text-green-800' : 'text-red-800'
                    }`}>
                      {result.success ? 'Migration Completed' : 'Migration Failed'}
                    </h4>
                    <p className={`mt-1 text-sm ${
                      result.success ? 'text-green-700' : 'text-red-700'
                    }`}>
                      {result.success 
                        ? `Successfully migrated from ${formatVersion(result.fromVersion)} to ${formatVersion(result.toVersion)}`
                        : `Failed to migrate from ${formatVersion(result.fromVersion)} to ${formatVersion(result.toVersion)}`
                      }
                    </p>
                    
                    {result.migrationsApplied.length > 0 && (
                      <div className="mt-2">
                        <span className="text-sm font-medium">Applied migrations:</span>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {result.migrationsApplied.map(version => (
                            <span
                              key={version}
                              className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs"
                            >
                              {formatVersion(version)}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {result.errors.length > 0 && (
                      <div className="mt-2">
                        <span className="text-sm font-medium text-red-800">Errors:</span>
                        <ul className="mt-1 text-xs text-red-700">
                          {result.errors.map((error, index) => (
                            <li key={index}>• {error}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {!isRunning && (
            <div className="space-y-4">
              {schemaInfo && !schemaInfo.isUpToDate && (
                <div>
                  <button
                    onClick={() => onRunMigrations()}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    Run Migrations
                  </button>
                  <p className="text-xs text-gray-500 mt-1 text-center">
                    This will update your database to the latest version
                  </p>
                </div>
              )}

              {/* Rollback Options */}
              {availableBackups.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    Available Backups ({availableBackups.length})
                  </h4>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {availableBackups.slice(0, 3).map(backup => (
                      <div
                        key={backup.id}
                        className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm"
                      >
                        <div>
                          <span className="font-medium">{formatVersion(backup.version)}</span>
                          <span className="text-gray-500 ml-2">
                            {formatDate(backup.createdAt)}
                          </span>
                        </div>
                        <button
                          onClick={() => onRollback(backup.id)}
                          className="text-orange-600 hover:text-orange-800 text-xs underline"
                        >
                          Rollback
                        </button>
                      </div>
                    ))}
                  </div>
                  {availableBackups.length > 3 && (
                    <p className="text-xs text-gray-500 mt-1">
                      And {availableBackups.length - 3} more backups...
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Loading State */}
          {isRunning && (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">
                {progress?.currentStep || 'Processing migration...'}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};