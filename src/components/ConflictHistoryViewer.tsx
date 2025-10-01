'use client';

import React, { useState, useEffect } from 'react';
import { ConflictResolution, EntityType } from '@/lib/types/local-storage';
import { Button } from './Button';
import { BottomSheet } from './BottomSheet';

interface ConflictHistoryViewerProps {
    isOpen: boolean;
    onClose: () => void;
    getHistory: (entityType?: EntityType, entityId?: string) => ConflictResolution[];
    getStats: () => ConflictStats;
    onClearHistory: () => void;
    onExportHistory: () => ConflictResolution[];
}

interface ConflictStats {
    total: number;
    byStrategy: Record<string, number>;
    byEntityType: Record<EntityType, number>;
    recentConflicts: number;
    averageResolutionTime: number;
}

export function ConflictHistoryViewer({
    isOpen,
    onClose,
    getHistory,
    getStats,
    onClearHistory,
    onExportHistory
}: ConflictHistoryViewerProps) {
    const [selectedTab, setSelectedTab] = useState<'history' | 'stats'>('history');
    const [filterEntityType, setFilterEntityType] = useState<EntityType | 'all'>('all');
    const [history, setHistory] = useState<ConflictResolution[]>([]);
    const [stats, setStats] = useState<ConflictStats | null>(null);

    useEffect(() => {
        if (isOpen) {
            refreshData();
        }
    }, [isOpen, filterEntityType]);

    const refreshData = () => {
        const entityType = filterEntityType === 'all' ? undefined : filterEntityType;
        setHistory(getHistory(entityType));
        setStats(getStats());
    };

    const formatDate = (timestamp: number): string => {
        return new Date(timestamp).toLocaleString();
    };

    const formatDuration = (ms: number): string => {
        if (ms < 1000) return `${ms}ms`;
        if (ms < 60000) return `${Math.round(ms / 1000)}s`;
        if (ms < 3600000) return `${Math.round(ms / 60000)}m`;
        return `${Math.round(ms / 3600000)}h`;
    };

    const getStrategyColor = (strategy: string): string => {
        switch (strategy) {
            case 'local_wins': return 'bg-blue-100 text-blue-800';
            case 'cloud_wins': return 'bg-green-100 text-green-800';
            case 'merge': return 'bg-purple-100 text-purple-800';
            case 'user_choice': return 'bg-orange-100 text-orange-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getEntityTypeColor = (entityType: EntityType): string => {
        const colors = {
            expenses: 'bg-red-100 text-red-800',
            income: 'bg-green-100 text-green-800',
            categories: 'bg-blue-100 text-blue-800',
            cards: 'bg-purple-100 text-purple-800',
            forValues: 'bg-yellow-100 text-yellow-800',
            incomeCategories: 'bg-indigo-100 text-indigo-800'
        };
        return colors[entityType] || 'bg-gray-100 text-gray-800';
    };

    const handleExport = () => {
        const data = onExportHistory();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `conflict-history-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleClearHistory = () => {
        if (confirm('Are you sure you want to clear all conflict history? This action cannot be undone.')) {
            onClearHistory();
            refreshData();
        }
    };

    if (!isOpen) return null;

    return (
        <BottomSheet open={isOpen} onClose={onClose} title="Conflict Resolution History">
            <div className="p-4 space-y-4">
                {/* Tab Navigation */}
                <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
                    <button
                        onClick={() => setSelectedTab('history')}
                        className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${selectedTab === 'history'
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                            }`}
                    >
                        History
                    </button>
                    <button
                        onClick={() => setSelectedTab('stats')}
                        className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${selectedTab === 'stats'
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                            }`}
                    >
                        Statistics
                    </button>
                </div>

                {selectedTab === 'history' && (
                    <div className="space-y-4">
                        {/* Filter Controls */}
                        <div className="flex items-center justify-between">
                            <select
                                value={filterEntityType}
                                onChange={(e) => setFilterEntityType(e.target.value as EntityType | 'all')}
                                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                            >
                                <option value="all">All Types</option>
                                <option value="expenses">Expenses</option>
                                <option value="income">Income</option>
                                <option value="categories">Categories</option>
                                <option value="cards">Cards</option>
                                <option value="forValues">For Values</option>
                                <option value="incomeCategories">Income Categories</option>
                            </select>

                            <div className="flex space-x-2">
                                <Button onClick={handleExport} className="text-sm">
                                    Export
                                </Button>
                                <Button onClick={handleClearHistory} className="text-sm text-red-600">
                                    Clear All
                                </Button>
                            </div>
                        </div>

                        {/* History List */}
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                            {history.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    <div className="text-lg mb-2">No conflicts resolved yet</div>
                                    <div className="text-sm">Conflict resolutions will appear here when they occur</div>
                                </div>
                            ) : (
                                history.map((resolution) => (
                                    <div key={resolution.id} className="border border-gray-200 rounded-lg p-4">
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex items-center space-x-2">
                                                <span className={`px-2 py-1 text-xs rounded-full ${getEntityTypeColor(resolution.entityType)}`}>
                                                    {resolution.entityType}
                                                </span>
                                                <span className={`px-2 py-1 text-xs rounded-full ${getStrategyColor(resolution.strategy)}`}>
                                                    {resolution.strategy.replace('_', ' ')}
                                                </span>
                                            </div>
                                            <span className="text-xs text-gray-500">
                                                {formatDate(resolution.resolvedAt)}
                                            </span>
                                        </div>

                                        <div className="text-sm text-gray-900 mb-1">
                                            Entity ID: <code className="bg-gray-100 px-1 rounded">{resolution.entityId}</code>
                                        </div>

                                        {resolution.note && (
                                            <div className="text-sm text-gray-600 italic">
                                                "{resolution.note}"
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {selectedTab === 'stats' && stats && (
                    <div className="space-y-6">
                        {/* Overview Stats */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <div className="text-2xl font-bold text-blue-900">{stats.total}</div>
                                <div className="text-sm text-blue-700">Total Conflicts Resolved</div>
                            </div>
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                <div className="text-2xl font-bold text-green-900">{stats.recentConflicts}</div>
                                <div className="text-sm text-green-700">Last 24 Hours</div>
                            </div>
                        </div>

                        {/* Average Resolution Time */}
                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                            <div className="text-lg font-semibold text-purple-900 mb-1">
                                Average Resolution Time
                            </div>
                            <div className="text-2xl font-bold text-purple-900">
                                {formatDuration(stats.averageResolutionTime)}
                            </div>
                        </div>

                        {/* Resolution Strategies */}
                        <div className="space-y-3">
                            <h4 className="font-medium text-gray-900">Resolution Strategies</h4>
                            <div className="space-y-2">
                                {Object.entries(stats.byStrategy).map(([strategy, count]) => (
                                    <div key={strategy} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                                        <span className={`px-2 py-1 text-xs rounded-full ${getStrategyColor(strategy)}`}>
                                            {strategy.replace('_', ' ')}
                                        </span>
                                        <div className="flex items-center space-x-2">
                                            <span className="text-sm font-medium">{count}</span>
                                            <span className="text-xs text-gray-500">
                                                ({Math.round((count / stats.total) * 100)}%)
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Entity Types */}
                        <div className="space-y-3">
                            <h4 className="font-medium text-gray-900">By Entity Type</h4>
                            <div className="space-y-2">
                                {Object.entries(stats.byEntityType).map(([entityType, count]) => (
                                    <div key={entityType} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                                        <span className={`px-2 py-1 text-xs rounded-full ${getEntityTypeColor(entityType as EntityType)}`}>
                                            {entityType}
                                        </span>
                                        <div className="flex items-center space-x-2">
                                            <span className="text-sm font-medium">{count}</span>
                                            <span className="text-xs text-gray-500">
                                                ({Math.round((count / stats.total) * 100)}%)
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </BottomSheet>
    );
}