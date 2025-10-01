'use client';

import React from 'react';
import { ConflictItem } from '@/lib/types/local-storage';

interface ConflictStatusIndicatorProps {
  conflicts: ConflictItem[];
  autoResolvableCount: number;
  isResolving: boolean;
  onOpenResolution: () => void;
  onAutoResolve: () => void;
  className?: string;
}

export function ConflictStatusIndicator({
  conflicts,
  autoResolvableCount,
  isResolving,
  onOpenResolution,
  onAutoResolve,
  className = ''
}: ConflictStatusIndicatorProps) {
  const totalConflicts = conflicts.length;
  const manualConflicts = totalConflicts - autoResolvableCount;

  if (totalConflicts === 0) {
    return null;
  }

  const getSeverityColor = () => {
    const hasCritical = conflicts.some(c => c.severity === 'critical');
    const hasHigh = conflicts.some(c => c.severity === 'high');
    
    if (hasCritical) return 'bg-red-500 border-red-600';
    if (hasHigh) return 'bg-orange-500 border-orange-600';
    return 'bg-yellow-500 border-yellow-600';
  };

  const getTextColor = () => {
    const hasCritical = conflicts.some(c => c.severity === 'critical');
    const hasHigh = conflicts.some(c => c.severity === 'high');
    
    if (hasCritical) return 'text-red-800';
    if (hasHigh) return 'text-orange-800';
    return 'text-yellow-800';
  };

  const getBgColor = () => {
    const hasCritical = conflicts.some(c => c.severity === 'critical');
    const hasHigh = conflicts.some(c => c.severity === 'high');
    
    if (hasCritical) return 'bg-red-50 border-red-200';
    if (hasHigh) return 'bg-orange-50 border-orange-200';
    return 'bg-yellow-50 border-yellow-200';
  };

  return (
    <div className={`${getBgColor()} border rounded-lg p-3 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {/* Status Indicator */}
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${getSeverityColor()} ${isResolving ? 'animate-pulse' : ''}`}></div>
            <div>
              <div className={`font-medium text-sm ${getTextColor()}`}>
                {isResolving ? 'Resolving conflicts...' : `${totalConflicts} conflict${totalConflicts > 1 ? 's' : ''} detected`}
              </div>
              <div className="text-xs text-gray-600">
                {autoResolvableCount > 0 && (
                  <span className="text-green-600">
                    {autoResolvableCount} auto-resolvable
                  </span>
                )}
                {autoResolvableCount > 0 && manualConflicts > 0 && (
                  <span className="text-gray-500"> • </span>
                )}
                {manualConflicts > 0 && (
                  <span className="text-orange-600">
                    {manualConflicts} need attention
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          {autoResolvableCount > 0 && (
            <button
              onClick={onAutoResolve}
              disabled={isResolving}
              className="px-3 py-1 text-xs font-medium text-green-700 bg-green-100 hover:bg-green-200 rounded-md transition-colors disabled:opacity-50"
            >
              Auto-resolve {autoResolvableCount}
            </button>
          )}
          
          <button
            onClick={onOpenResolution}
            disabled={isResolving}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors disabled:opacity-50 ${
              conflicts.some(c => c.severity === 'critical')
                ? 'text-red-700 bg-red-100 hover:bg-red-200'
                : conflicts.some(c => c.severity === 'high')
                ? 'text-orange-700 bg-orange-100 hover:bg-orange-200'
                : 'text-yellow-700 bg-yellow-100 hover:bg-yellow-200'
            }`}
          >
            Resolve All
          </button>
        </div>
      </div>

      {/* Conflict Summary */}
      {totalConflicts > 0 && (
        <div className="mt-2 pt-2 border-t border-gray-200">
          <div className="flex flex-wrap gap-1">
            {Object.entries(
              conflicts.reduce((acc, conflict) => {
                acc[conflict.entityType] = (acc[conflict.entityType] || 0) + 1;
                return acc;
              }, {} as Record<string, number>)
            ).map(([entityType, count]) => (
              <span
                key={entityType}
                className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full"
              >
                {entityType}: {count}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}