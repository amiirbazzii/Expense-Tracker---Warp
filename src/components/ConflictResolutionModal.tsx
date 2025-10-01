'use client';

import React, { useState, useEffect } from 'react';
import { ConflictItem, ConflictResolutionStrategy, EntityType } from '@/lib/types/local-storage';
import { Button } from './Button';
import { BottomSheet } from './BottomSheet';

interface ConflictResolutionModalProps {
  conflicts: ConflictItem[];
  isOpen: boolean;
  onClose: () => void;
  onResolve: (strategy: ConflictResolutionStrategy) => Promise<void>;
  onResolveIndividual: (conflictId: string, resolution: 'local' | 'cloud' | 'merge') => Promise<void>;
}

export function ConflictResolutionModal({
  conflicts,
  isOpen,
  onClose,
  onResolve,
  onResolveIndividual
}: ConflictResolutionModalProps) {
  const [selectedStrategy, setSelectedStrategy] = useState<'local_wins' | 'cloud_wins' | 'merge' | 'user_choice'>('merge');
  const [applyToAll, setApplyToAll] = useState(false);
  const [currentConflictIndex, setCurrentConflictIndex] = useState(0);
  const [individualResolutions, setIndividualResolutions] = useState<Record<string, 'local' | 'cloud' | 'merge'>>({});
  const [isResolving, setIsResolving] = useState(false);

  const currentConflict = conflicts[currentConflictIndex];
  const hasMultipleConflicts = conflicts.length > 1;

  const handleBulkResolve = async () => {
    setIsResolving(true);
    try {
      const strategy: ConflictResolutionStrategy = {
        strategy: selectedStrategy,
        applyToAll,
        preserveDeleted: true,
        mergeRules: []
      };
      await onResolve(strategy);
      onClose();
    } catch (error) {
      console.error('Failed to resolve conflicts:', error);
    } finally {
      setIsResolving(false);
    }
  };

  const handleIndividualResolve = async (resolution: 'local' | 'cloud' | 'merge') => {
    if (!currentConflict) return;
    
    setIsResolving(true);
    try {
      await onResolveIndividual(currentConflict.entityId, resolution);
      
      // Move to next conflict or close if done
      if (currentConflictIndex < conflicts.length - 1) {
        setCurrentConflictIndex(currentConflictIndex + 1);
      } else {
        onClose();
      }
    } catch (error) {
      console.error('Failed to resolve conflict:', error);
    } finally {
      setIsResolving(false);
    }
  };

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return 'Not set';
    if (Array.isArray(value)) return value.join(', ');
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    if (typeof value === 'number' && value > 1000000000) {
      return new Date(value).toLocaleString();
    }
    return String(value);
  };

  const getEntityDisplayName = (entityType: EntityType): string => {
    const names = {
      expenses: 'Expense',
      income: 'Income',
      categories: 'Category',
      cards: 'Card',
      forValues: 'For Value',
      incomeCategories: 'Income Category'
    };
    return names[entityType] || entityType;
  };

  const getSeverityColor = (severity: string): string => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-50';
      case 'high': return 'text-orange-600 bg-orange-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-blue-600 bg-blue-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  if (!isOpen || conflicts.length === 0) return null;

  return (
    <BottomSheet open={isOpen} onClose={onClose} title="Resolve Data Conflicts">
      <div className="p-4 space-y-6">
        {/* Conflict Summary */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
            <h3 className="font-medium text-yellow-800">
              {conflicts.length} conflict{conflicts.length > 1 ? 's' : ''} detected
            </h3>
          </div>
          <p className="text-sm text-yellow-700 mt-1">
            Your local data differs from the cloud. Choose how to resolve these conflicts.
          </p>
        </div>

        {/* Bulk Resolution Options */}
        {hasMultipleConflicts && (
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-3">Resolve All Conflicts</h4>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setSelectedStrategy('local_wins')}
                  className={`p-3 text-left border rounded-lg transition-colors ${
                    selectedStrategy === 'local_wins'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium">Keep Local</div>
                  <div className="text-sm text-gray-600">Use your device's data</div>
                </button>
                <button
                  onClick={() => setSelectedStrategy('cloud_wins')}
                  className={`p-3 text-left border rounded-lg transition-colors ${
                    selectedStrategy === 'cloud_wins'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium">Keep Cloud</div>
                  <div className="text-sm text-gray-600">Use cloud data</div>
                </button>
              </div>
              <button
                onClick={() => setSelectedStrategy('merge')}
                className={`w-full p-3 text-left border rounded-lg transition-colors ${
                  selectedStrategy === 'merge'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-medium">Smart Merge</div>
                <div className="text-sm text-gray-600">Automatically combine compatible changes</div>
              </button>
              
              <Button
                onClick={handleBulkResolve}
                disabled={isResolving}
                className="w-full"
              >
                {isResolving ? 'Resolving...' : `Resolve All ${conflicts.length} Conflicts`}
              </Button>
            </div>
          </div>
        )}

        {/* Individual Conflict Resolution */}
        {currentConflict && (
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="font-medium text-gray-900">
                  {getEntityDisplayName(currentConflict.entityType)} Conflict
                </h4>
                <div className="flex items-center space-x-2 mt-1">
                  <span className={`px-2 py-1 text-xs rounded-full ${getSeverityColor(currentConflict.severity)}`}>
                    {currentConflict.severity}
                  </span>
                  {hasMultipleConflicts && (
                    <span className="text-sm text-gray-500">
                      {currentConflictIndex + 1} of {conflicts.length}
                    </span>
                  )}
                </div>
              </div>
              {currentConflict.autoResolvable && (
                <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">
                  Auto-resolvable
                </span>
              )}
            </div>

            <div className="text-sm text-gray-600 mb-4">
              {currentConflict.conflictReason}
            </div>

            {/* Data Comparison */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="border border-gray-200 rounded-lg p-3">
                <h5 className="font-medium text-gray-900 mb-2 flex items-center">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                  Local Version
                </h5>
                <div className="space-y-2">
                  {currentConflict.localVersion && typeof currentConflict.localVersion === 'object' ? (
                    Object.entries(currentConflict.localVersion)
                      .filter(([key]) => !['id', 'localId', 'cloudId', 'syncStatus', 'version'].includes(key))
                      .map(([key, value]) => (
                        <div key={key} className="text-sm">
                          <span className="font-medium text-gray-700">{key}:</span>
                          <span className="ml-2 text-gray-600">{formatValue(value)}</span>
                        </div>
                      ))
                  ) : (
                    <div className="text-sm text-gray-600">{formatValue(currentConflict.localVersion)}</div>
                  )}
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg p-3">
                <h5 className="font-medium text-gray-900 mb-2 flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  Cloud Version
                </h5>
                <div className="space-y-2">
                  {currentConflict.cloudVersion && typeof currentConflict.cloudVersion === 'object' ? (
                    Object.entries(currentConflict.cloudVersion)
                      .filter(([key]) => !['_id', '_creationTime'].includes(key))
                      .map(([key, value]) => (
                        <div key={key} className="text-sm">
                          <span className="font-medium text-gray-700">{key}:</span>
                          <span className="ml-2 text-gray-600">{formatValue(value)}</span>
                        </div>
                      ))
                  ) : (
                    <div className="text-sm text-gray-600">{formatValue(currentConflict.cloudVersion)}</div>
                  )}
                </div>
              </div>
            </div>

            {/* Resolution Actions */}
            <div className="flex flex-col space-y-2">
              <div className="grid grid-cols-3 gap-2">
                <Button
                  onClick={() => handleIndividualResolve('local')}
                  disabled={isResolving}
                  className="text-sm"
                >
                  Keep Local
                </Button>
                <Button
                  onClick={() => handleIndividualResolve('cloud')}
                  disabled={isResolving}
                  className="text-sm"
                >
                  Keep Cloud
                </Button>
                <Button
                  onClick={() => handleIndividualResolve('merge')}
                  disabled={isResolving}
                  className="text-sm"
                >
                  {currentConflict.autoResolvable ? 'Auto Merge' : 'Smart Merge'}
                </Button>
              </div>
              
              {hasMultipleConflicts && currentConflictIndex < conflicts.length - 1 && (
                <Button
                  onClick={() => setCurrentConflictIndex(currentConflictIndex + 1)}
                  className="text-sm"
                >
                  Skip for Now
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Progress Indicator */}
        {hasMultipleConflicts && (
          <div className="flex items-center space-x-2">
            <div className="flex-1 bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentConflictIndex + 1) / conflicts.length) * 100}%` }}
              ></div>
            </div>
            <span className="text-sm text-gray-600">
              {currentConflictIndex + 1}/{conflicts.length}
            </span>
          </div>
        )}
      </div>
    </BottomSheet>
  );
}