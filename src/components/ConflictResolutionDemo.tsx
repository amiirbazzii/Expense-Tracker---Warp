'use client';

import React from 'react';
import { useConflictResolution } from '@/hooks/useConflictResolution';
import { ConflictResolutionModal } from './ConflictResolutionModal';
import { ConflictHistoryViewer } from './ConflictHistoryViewer';
import { ConflictStatusIndicator } from './ConflictStatusIndicator';
import { Button } from './Button';

interface ConflictResolutionDemoProps {
  localData?: any;
  cloudData?: any;
  onDataUpdate?: (data: any) => void;
}

export function ConflictResolutionDemo({
  localData,
  cloudData,
  onDataUpdate
}: ConflictResolutionDemoProps) {
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
      console.log('Conflict resolved:', resolution);
      // Here you would typically update your data store
      onDataUpdate?.(resolution);
    },
    onError: (error) => {
      console.error('Conflict resolution error:', error);
    }
  });

  const handleDetectConflicts = async () => {
    if (!localData || !cloudData) {
      console.warn('Local or cloud data not available for conflict detection');
      return;
    }

    try {
      const result = await detectConflicts(localData, cloudData);
      console.log('Conflict detection result:', result);
    } catch (error) {
      console.error('Failed to detect conflicts:', error);
    }
  };

  const handleSimulateConflicts = () => {
    // Create mock conflicts for demonstration
    const mockConflicts = [
      {
        entityType: 'expenses' as const,
        entityId: 'expense_1',
        localVersion: {
          id: 'expense_1',
          localId: 'local_expense_1',
          cloudId: 'expense_1',
          syncStatus: 'conflict' as const,
          version: 1,
          createdAt: Date.now() - 86400000,
          updatedAt: Date.now() - 3600000,
          amount: 25.50,
          title: 'Coffee Shop',
          category: ['food', 'drinks'],
          for: ['personal'],
          date: Date.now() - 86400000
        },
        cloudVersion: {
          _id: 'expense_1',
          amount: 27.00,
          title: 'Coffee & Pastry',
          category: ['food', 'drinks', 'snacks'],
          for: ['personal'],
          date: Date.now() - 86400000,
          updatedAt: Date.now() - 1800000
        },
        conflictReason: 'Amount and title differ between local and cloud versions',
        autoResolvable: true,
        severity: 'low' as const
      },
      {
        entityType: 'income' as const,
        entityId: 'income_1',
        localVersion: {
          id: 'income_1',
          localId: 'local_income_1',
          cloudId: 'income_1',
          syncStatus: 'conflict' as const,
          version: 1,
          createdAt: Date.now() - 172800000,
          updatedAt: Date.now() - 7200000,
          amount: 1500.00,
          cardId: 'card_1',
          date: Date.now() - 172800000,
          source: 'Freelance Work',
          category: 'consulting'
        },
        cloudVersion: {
          _id: 'income_1',
          amount: 1500.00,
          cardId: 'card_2',
          date: Date.now() - 172800000,
          source: 'Freelance Project',
          category: 'consulting',
          updatedAt: Date.now() - 3600000
        },
        conflictReason: 'Card ID and source description differ',
        autoResolvable: false,
        severity: 'medium' as const
      }
    ];

    // Simulate setting conflicts (in real app, this would come from detectConflicts)
    // This is just for demo purposes
    console.log('Simulated conflicts:', mockConflicts);
  };

  return (
    <div className="space-y-6 p-4">
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Conflict Resolution System Demo
        </h2>
        
        <div className="space-y-4">
          {/* Demo Controls */}
          <div className="flex flex-wrap gap-3">
            <Button onClick={handleDetectConflicts} variant="outline">
              Detect Real Conflicts
            </Button>
            <Button onClick={handleSimulateConflicts} variant="outline">
              Simulate Conflicts
            </Button>
            <Button onClick={openHistoryViewer} variant="outline">
              View History
            </Button>
          </div>

          {/* Conflict Status */}
          {hasConflicts && (
            <ConflictStatusIndicator
              conflicts={conflicts}
              autoResolvableCount={autoResolvableCount}
              isResolving={isResolving}
              onOpenResolution={openResolutionModal}
              onAutoResolve={autoResolveConflicts}
            />
          )}

          {/* Feature Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-medium text-blue-900 mb-2">CRDT-like Merge Strategies</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Automatic array union for categories</li>
                <li>• Last-writer-wins for simple fields</li>
                <li>• Numeric max for amounts</li>
                <li>• Smart string concatenation</li>
              </ul>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-medium text-green-900 mb-2">Field-Level Resolution</h3>
              <ul className="text-sm text-green-800 space-y-1">
                <li>• Individual field conflict detection</li>
                <li>• Type-aware merge strategies</li>
                <li>• Configurable resolution rules</li>
                <li>• Automatic vs manual resolution</li>
              </ul>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h3 className="font-medium text-purple-900 mb-2">User-Friendly UI</h3>
              <ul className="text-sm text-purple-800 space-y-1">
                <li>• Side-by-side data comparison</li>
                <li>• Bulk and individual resolution</li>
                <li>• Progress tracking</li>
                <li>• Severity-based prioritization</li>
              </ul>
            </div>

            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <h3 className="font-medium text-orange-900 mb-2">Conflict History & Audit</h3>
              <ul className="text-sm text-orange-800 space-y-1">
                <li>• Complete resolution history</li>
                <li>• Strategy usage statistics</li>
                <li>• Export/import capabilities</li>
                <li>• Performance metrics</li>
              </ul>
            </div>
          </div>

          {/* Current Status */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-2">Current Status</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-gray-600">Total Conflicts</div>
                <div className="font-semibold text-lg">{conflicts.length}</div>
              </div>
              <div>
                <div className="text-gray-600">Auto-Resolvable</div>
                <div className="font-semibold text-lg text-green-600">{autoResolvableCount}</div>
              </div>
              <div>
                <div className="text-gray-600">Need Attention</div>
                <div className="font-semibold text-lg text-orange-600">
                  {conflicts.length - autoResolvableCount}
                </div>
              </div>
              <div>
                <div className="text-gray-600">Status</div>
                <div className={`font-semibold text-lg ${isResolving ? 'text-blue-600' : 'text-gray-600'}`}>
                  {isResolving ? 'Resolving...' : 'Ready'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

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
  );
}