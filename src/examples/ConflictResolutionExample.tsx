'use client';

import React, { useState, useEffect } from 'react';
import { ConflictResolutionDemo } from '@/components/ConflictResolutionDemo';
import { useConflictResolution } from '@/hooks/useConflictResolution';
import { ConflictResolutionModal } from '@/components/ConflictResolutionModal';
import { ConflictHistoryViewer } from '@/components/ConflictHistoryViewer';
import { ConflictStatusIndicator } from '@/components/ConflictStatusIndicator';

/**
 * Complete example showing how to integrate the enhanced ConflictDetector
 * with CRDT-like merge strategies, field-level resolution, and audit trail
 * into a real application.
 */
export function ConflictResolutionExample() {
  const [localData, setLocalData] = useState<any>(null);
  const [cloudData, setCloudData] = useState<any>(null);

  const {
    conflicts,
    isResolving,
    showResolutionModal,
    showHistoryViewer,
    hasConflicts,
    autoResolvableCount,
    detectConflicts,
    resolveConflicts,
    resolveIndividualConflict,
    autoResolveConflicts,
    getConflictHistory,
    getConflictStats,
    clearConflictHistory,
    exportConflictHistory,
    openResolutionModal,
    closeResolutionModal,
    openHistoryViewer,
    closeHistoryViewer
  } = useConflictResolution({
    onConflictResolved: (resolution) => {
      console.log('✅ Conflict resolved:', resolution);
      // In a real app, you would update your data store here
      // For example: updateLocalStorage(resolution) or syncToCloud(resolution)
    },
    onError: (error) => {
      console.error('❌ Conflict resolution error:', error);
      // In a real app, you would show user-friendly error messages
    }
  });

  // Simulate loading data from local storage and cloud
  useEffect(() => {
    // Mock local data (what's stored locally)
    const mockLocalData = {
      version: '1.0.0',
      exportedAt: Date.now(),
      deviceId: 'device_123',
      userId: 'user_456',
      data: {
        expenses: {
          'expense_1': {
            id: 'expense_1',
            localId: 'local_expense_1',
            cloudId: 'expense_1',
            syncStatus: 'synced' as const,
            version: 1,
            createdAt: Date.now() - 86400000,
            updatedAt: Date.now() - 3600000,
            amount: 25.50,
            title: 'Coffee Shop',
            category: ['food', 'drinks'],
            for: ['personal'],
            date: Date.now() - 86400000
          },
          'expense_2': {
            id: 'expense_2',
            localId: 'local_expense_2',
            cloudId: 'expense_2',
            syncStatus: 'pending' as const,
            version: 1,
            createdAt: Date.now() - 172800000,
            updatedAt: Date.now() - 7200000,
            amount: 150.00,
            title: 'Grocery Shopping',
            category: ['food', 'groceries'],
            for: ['family'],
            date: Date.now() - 172800000
          }
        },
        income: {
          'income_1': {
            id: 'income_1',
            localId: 'local_income_1',
            cloudId: 'income_1',
            syncStatus: 'conflict' as const,
            version: 1,
            createdAt: Date.now() - 259200000,
            updatedAt: Date.now() - 10800000,
            amount: 1500.00,
            cardId: 'card_1',
            date: Date.now() - 259200000,
            source: 'Freelance Work',
            category: 'consulting'
          }
        },
        syncState: {
          lastSync: Date.now() - 3600000,
          pendingOperations: [],
          dataHash: 'local_hash_123',
          conflictResolutions: [],
          totalRecords: 3,
          lastModified: Date.now() - 3600000
        },
        metadata: {
          version: '1.0.0',
          deviceId: 'device_123',
          userId: 'user_456',
          createdAt: Date.now() - 604800000,
          updatedAt: Date.now() - 3600000,
          schemaVersion: 1
        }
      },
      checksum: 'local_checksum_123'
    };

    // Mock cloud data (what's on the server)
    const mockCloudData = {
      expenses: [
        {
          _id: 'expense_1',
          amount: 27.00, // Different amount
          title: 'Coffee & Pastry', // Different title
          category: ['food', 'drinks', 'snacks'], // Additional category
          for: ['personal'],
          date: Date.now() - 86400000,
          createdAt: Date.now() - 86400000,
          updatedAt: Date.now() - 1800000 // More recent update
        },
        {
          _id: 'expense_3', // New expense not in local
          amount: 75.00,
          title: 'Gas Station',
          category: ['transport', 'fuel'],
          for: ['personal'],
          date: Date.now() - 43200000,
          createdAt: Date.now() - 43200000,
          updatedAt: Date.now() - 43200000
        }
      ],
      income: [
        {
          _id: 'income_1',
          amount: 1500.00,
          cardId: 'card_2', // Different card
          date: Date.now() - 259200000,
          source: 'Freelance Project', // Different source
          category: 'consulting',
          createdAt: Date.now() - 259200000,
          updatedAt: Date.now() - 5400000 // More recent update
        }
      ],
      categories: [],
      cards: [],
      forValues: [],
      incomeCategories: [],
      metadata: {
        dataHash: 'cloud_hash_456',
        lastModified: Date.now() - 1800000,
        totalRecords: 3
      }
    };

    setLocalData(mockLocalData);
    setCloudData(mockCloudData);
  }, []);

  const handleDetectConflicts = async () => {
    if (!localData || !cloudData) {
      console.warn('Data not loaded yet');
      return;
    }

    try {
      console.log('🔍 Detecting conflicts between local and cloud data...');
      const result = await detectConflicts(localData, cloudData);
      
      console.log('📊 Conflict detection result:', {
        hasConflicts: result.hasConflicts,
        conflictCount: result.conflictItems.length,
        severity: result.severity,
        recommendedAction: result.recommendedAction
      });

      if (result.hasConflicts) {
        console.log('⚠️ Conflicts found:', result.conflictItems);
      } else {
        console.log('✅ No conflicts detected');
      }
    } catch (error) {
      console.error('❌ Failed to detect conflicts:', error);
    }
  };

  const handleDataUpdate = (updatedData: any) => {
    console.log('📝 Data updated after conflict resolution:', updatedData);
    // In a real app, you would:
    // 1. Update your local storage
    // 2. Update your UI state
    // 3. Trigger a sync to cloud if needed
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Enhanced Conflict Resolution System
          </h1>
          <p className="text-gray-600">
            Demonstration of CRDT-like merge strategies, field-level conflict resolution, 
            and comprehensive audit trail for offline-first applications.
          </p>
        </div>

        {/* Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="font-semibold text-gray-900 mb-2">Data Status</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Local Records:</span>
                <span className="font-medium">{localData?.data ? Object.keys(localData.data.expenses || {}).length + Object.keys(localData.data.income || {}).length : 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Cloud Records:</span>
                <span className="font-medium">{cloudData ? (cloudData.expenses?.length || 0) + (cloudData.income?.length || 0) : 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Last Sync:</span>
                <span className="font-medium text-xs">
                  {localData?.data?.syncState?.lastSync 
                    ? new Date(localData.data.syncState.lastSync).toLocaleTimeString()
                    : 'Never'
                  }
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="font-semibold text-gray-900 mb-2">Conflict Status</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Active Conflicts:</span>
                <span className={`font-medium ${conflicts.length > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {conflicts.length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Auto-Resolvable:</span>
                <span className="font-medium text-green-600">{autoResolvableCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Need Attention:</span>
                <span className="font-medium text-orange-600">{conflicts.length - autoResolvableCount}</span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="font-semibold text-gray-900 mb-2">Resolution History</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Resolved:</span>
                <span className="font-medium">{getConflictStats().total}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Recent (24h):</span>
                <span className="font-medium">{getConflictStats().recentConflicts}</span>
              </div>
              <button
                onClick={openHistoryViewer}
                className="text-xs text-blue-600 hover:text-blue-800 underline"
              >
                View Full History
              </button>
            </div>
          </div>
        </div>

        {/* Conflict Status Indicator */}
        {hasConflicts && (
          <div className="mb-6">
            <ConflictStatusIndicator
              conflicts={conflicts}
              autoResolvableCount={autoResolvableCount}
              isResolving={isResolving}
              onOpenResolution={openResolutionModal}
              onAutoResolve={autoResolveConflicts}
            />
          </div>
        )}

        {/* Action Buttons */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
          <h3 className="font-semibold text-gray-900 mb-4">Actions</h3>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleDetectConflicts}
              disabled={!localData || !cloudData || isResolving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Detect Conflicts
            </button>
            
            {hasConflicts && (
              <>
                <button
                  onClick={openResolutionModal}
                  disabled={isResolving}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Resolve Conflicts
                </button>
                
                {autoResolvableCount > 0 && (
                  <button
                    onClick={autoResolveConflicts}
                    disabled={isResolving}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Auto-Resolve ({autoResolvableCount})
                  </button>
                )}
              </>
            )}
            
            <button
              onClick={openHistoryViewer}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              View History
            </button>
          </div>
        </div>

        {/* Demo Component */}
        <ConflictResolutionDemo
          localData={localData}
          cloudData={cloudData}
          onDataUpdate={handleDataUpdate}
        />

        {/* Modals */}
        <ConflictResolutionModal
          conflicts={conflicts}
          isOpen={showResolutionModal}
          onClose={closeResolutionModal}
          onResolve={resolveConflicts}
          onResolveIndividual={resolveIndividualConflict}
        />

        <ConflictHistoryViewer
          isOpen={showHistoryViewer}
          onClose={closeHistoryViewer}
          getHistory={getConflictHistory}
          getStats={getConflictStats}
          onClearHistory={clearConflictHistory}
          onExportHistory={exportConflictHistory}
        />
      </div>
    </div>
  );
}