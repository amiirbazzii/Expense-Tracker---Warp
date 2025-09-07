"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Cloud, HardDrive, RefreshCw, X, CheckCircle } from 'lucide-react';
import { 
  ConflictType, 
  ConflictDetectionResult, 
  ConflictSeverity 
} from '../lib/types/local-storage';

interface ConflictPromptProps {
  conflictResult: ConflictDetectionResult;
  onAccept: () => Promise<void>;
  onDismiss: () => void;
  isVisible: boolean;
  isLoading?: boolean;
  progress?: number;
}

interface ConflictPromptContent {
  title: string;
  description: string;
  acceptLabel: string;
  dismissLabel: string;
  icon: React.ComponentType<any>;
  severity: 'info' | 'warning' | 'error';
  actionDescription: string;
}

/**
 * ConflictPrompt displays data synchronization conflicts to users
 * and provides clear options for resolution
 */
export function ConflictPrompt({
  conflictResult,
  onAccept,
  onDismiss,
  isVisible,
  isLoading = false,
  progress
}: ConflictPromptProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleAccept = async () => {
    setIsProcessing(true);
    try {
      await onAccept();
    } finally {
      setIsProcessing(false);
    }
  };

  const content = getConflictContent(conflictResult);
  const severityColors = getSeverityColors(content.severity);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -100 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="fixed top-0 left-0 right-0 z-50 mx-4 mt-4"
          role="dialog"
          aria-labelledby="conflict-prompt-title"
          aria-describedby="conflict-prompt-description"
        >
          <div className={`
            rounded-lg shadow-lg border-l-4 backdrop-blur-sm
            ${severityColors.background} 
            ${severityColors.border}
          `}>
            <div className="p-4">
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className={`
                    p-2 rounded-full 
                    ${severityColors.iconBackground}
                  `}>
                    <content.icon 
                      className={`w-5 h-5 ${severityColors.iconColor}`} 
                      aria-hidden="true"
                    />
                  </div>
                  <div>
                    <h3 
                      id="conflict-prompt-title"
                      className={`font-semibold text-lg ${severityColors.textColor}`}
                    >
                      {content.title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Data Synchronization Issue
                    </p>
                  </div>
                </div>
                <button
                  onClick={onDismiss}
                  className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  aria-label="Dismiss conflict prompt"
                  disabled={isProcessing || isLoading}
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Content */}
              <div className="mb-4">
                <p 
                  id="conflict-prompt-description"
                  className="text-gray-700 dark:text-gray-200 mb-3"
                >
                  {content.description}
                </p>

                {/* Data Statistics */}
                <div className="grid grid-cols-2 gap-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {conflictResult.dataStats.localRecords}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                      Local Records
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {conflictResult.dataStats.cloudRecords}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                      Cloud Records
                    </div>
                  </div>
                </div>

                {/* Last Sync Info */}
                {conflictResult.dataStats.lastSync && (
                  <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    Last sync: {formatLastSync(conflictResult.dataStats.lastSync)}
                  </div>
                )}

                {/* Conflict Details */}
                {conflictResult.conflictItems.length > 0 && (
                  <details className="mt-3">
                    <summary className="cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100">
                      View conflict details ({conflictResult.conflictItems.length} conflicts)
                    </summary>
                    <div className="mt-2 max-h-32 overflow-y-auto">
                      {conflictResult.conflictItems.slice(0, 5).map((conflict, index) => (
                        <div key={index} className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                          • {conflict.entityType}: {conflict.conflictReason}
                        </div>
                      ))}
                      {conflictResult.conflictItems.length > 5 && (
                        <div className="text-xs text-gray-500 dark:text-gray-500">
                          ... and {conflictResult.conflictItems.length - 5} more
                        </div>
                      )}
                    </div>
                  </details>
                )}
              </div>

              {/* Progress Bar */}
              {(isLoading || isProcessing) && (
                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-300 mb-1">
                    <span>{content.actionDescription}</span>
                    {progress !== undefined && (
                      <span>{Math.round(progress)}%</span>
                    )}
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <motion.div
                      className={`h-2 rounded-full ${severityColors.progressBar}`}
                      initial={{ width: 0 }}
                      animate={{ 
                        width: progress !== undefined ? `${progress}%` : '100%' 
                      }}
                      transition={{ 
                        duration: progress !== undefined ? 0.3 : 2,
                        repeat: progress === undefined ? Infinity : 0,
                        ease: "linear"
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-3">
                <button
                  onClick={onDismiss}
                  disabled={isProcessing || isLoading}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors disabled:opacity-50"
                >
                  {content.dismissLabel}
                </button>
                <button
                  onClick={handleAccept}
                  disabled={isProcessing || isLoading}
                  className={`
                    px-4 py-2 text-sm font-medium text-white rounded-lg
                    transition-colors disabled:opacity-50 flex items-center space-x-2
                    ${severityColors.acceptButton}
                  `}
                >
                  {(isProcessing || isLoading) ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      <span>{content.acceptLabel}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Get content configuration based on conflict type
 */
function getConflictContent(conflictResult: ConflictDetectionResult): ConflictPromptContent {
  switch (conflictResult.conflictType) {
    case 'missing_cloud':
      return {
        title: 'Restore Cloud Backup',
        description: 'Your local data appears to be newer than what\'s stored in the cloud. Would you like to upload your local data to restore your cloud backup?',
        acceptLabel: 'Upload Local Data',
        dismissLabel: 'Not Now',
        icon: Cloud,
        severity: 'info',
        actionDescription: 'Uploading local data to cloud...'
      };

    case 'corrupted_local':
      return {
        title: 'Local Data Issue Detected',
        description: 'There appears to be an issue with your local data. Would you like to download a fresh copy from the cloud to fix this?',
        acceptLabel: 'Download Cloud Data',
        dismissLabel: 'Not Now',
        icon: HardDrive,
        severity: 'warning',
        actionDescription: 'Downloading data from cloud...'
      };

    case 'schema_mismatch':
      return {
        title: 'App Update Required',
        description: 'Your app version is incompatible with the cloud data format. Please update the app or contact support for assistance.',
        acceptLabel: 'Force Sync',
        dismissLabel: 'Dismiss',
        icon: AlertTriangle,
        severity: 'error',
        actionDescription: 'Attempting to sync data...'
      };

    case 'divergent_data':
    default:
      if (conflictResult.recommendedAction === 'upload_local') {
        return {
          title: 'Sync Local Changes',
          description: 'You have local changes that need to be synchronized with the cloud. Your data will be safely uploaded.',
          acceptLabel: 'Sync Changes',
          dismissLabel: 'Later',
          icon: Cloud,
          severity: 'info',
          actionDescription: 'Syncing changes to cloud...'
        };
      } else if (conflictResult.recommendedAction === 'download_cloud') {
        return {
          title: 'Download Latest Data',
          description: 'The cloud has newer data available. Would you like to download the latest version?',
          acceptLabel: 'Download Latest',
          dismissLabel: 'Keep Local',
          icon: HardDrive,
          severity: 'info',
          actionDescription: 'Downloading latest data...'
        };
      } else {
        return {
          title: 'Data Sync Conflict',
          description: 'There are conflicts between your local data and cloud data that need manual resolution.',
          acceptLabel: 'Resolve Conflicts',
          dismissLabel: 'Ignore',
          icon: AlertTriangle,
          severity: 'warning',
          actionDescription: 'Resolving data conflicts...'
        };
      }
  }
}

/**
 * Get color scheme based on severity
 */
function getSeverityColors(severity: 'info' | 'warning' | 'error') {
  switch (severity) {
    case 'info':
      return {
        background: 'bg-blue-50 dark:bg-blue-900/20',
        border: 'border-blue-400',
        textColor: 'text-blue-800 dark:text-blue-200',
        iconBackground: 'bg-blue-100 dark:bg-blue-800',
        iconColor: 'text-blue-600 dark:text-blue-300',
        acceptButton: 'bg-blue-600 hover:bg-blue-700',
        progressBar: 'bg-blue-600'
      };
    case 'warning':
      return {
        background: 'bg-orange-50 dark:bg-orange-900/20',
        border: 'border-orange-400',
        textColor: 'text-orange-800 dark:text-orange-200',
        iconBackground: 'bg-orange-100 dark:bg-orange-800',
        iconColor: 'text-orange-600 dark:text-orange-300',
        acceptButton: 'bg-orange-600 hover:bg-orange-700',
        progressBar: 'bg-orange-600'
      };
    case 'error':
      return {
        background: 'bg-red-50 dark:bg-red-900/20',
        border: 'border-red-400',
        textColor: 'text-red-800 dark:text-red-200',
        iconBackground: 'bg-red-100 dark:bg-red-800',
        iconColor: 'text-red-600 dark:text-red-300',
        acceptButton: 'bg-red-600 hover:bg-red-700',
        progressBar: 'bg-red-600'
      };
  }
}

/**
 * Format last sync timestamp for display
 */
function formatLastSync(lastSync: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - lastSync.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  
  return lastSync.toLocaleDateString();
}