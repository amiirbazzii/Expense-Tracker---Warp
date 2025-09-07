/**
 * Local Storage Schema Types for Local-First Data Architecture
 * Defines interfaces for local storage with cloud sync capabilities
 */

export type SyncStatus = 'pending' | 'synced' | 'conflict' | 'failed' | 'syncing';
export type ConflictType = 'missing_cloud' | 'corrupted_local' | 'divergent_data' | 'schema_mismatch';
export type ConflictSeverity = 'low' | 'medium' | 'high' | 'critical';
export type OperationType = 'create' | 'update' | 'delete';
export type EntityType = 'expenses' | 'income' | 'categories' | 'cards' | 'forValues' | 'incomeCategories';

// Base interface for all local entities
export interface LocalEntity {
  id: string;
  localId: string;
  cloudId?: string;
  syncStatus: SyncStatus;
  version: number;
  createdAt: number;
  updatedAt: number;
  lastSyncedAt?: number;
}

// Local storage schema for expenses
export interface LocalExpense extends LocalEntity {
  amount: number;
  title: string;
  category: string[];
  for: string[];
  date: number;
  cardId?: string;
}

// Local storage schema for income
export interface LocalIncome extends LocalEntity {
  amount: number;
  cardId: string;
  date: number;
  source: string;
  category: string;
  notes?: string;
}

// Local storage schema for categories
export interface LocalCategory extends LocalEntity {
  name: string;
  type: 'expense' | 'income';
}

// Local storage schema for cards
export interface LocalCard extends LocalEntity {
  name: string;
}

// Local storage schema for "for" values
export interface LocalForValue extends LocalEntity {
  value: string;
}

// Pending operation in offline queue
export interface PendingOperation {
  id: string;
  type: OperationType;
  entityType: EntityType;
  entityId: string;
  data: any;
  timestamp: number;
  retryCount: number;
  status: 'pending' | 'syncing' | 'failed' | 'completed';
  error?: string;
  maxRetries: number;
}

// Conflict resolution data
export interface ConflictResolution {
  id: string;
  entityType: EntityType;
  entityId: string;
  resolvedAt: number;
  strategy: 'local_wins' | 'cloud_wins' | 'merge' | 'user_choice';
  note?: string;
}

// Sync state metadata
export interface SyncState {
  lastSync: number;
  pendingOperations: PendingOperation[];
  dataHash: string;
  conflictResolutions: ConflictResolution[];
  totalRecords: number;
  lastModified: number;
}

// Device and user metadata
export interface LocalMetadata {
  version: string;
  deviceId: string;
  userId: string;
  createdAt: number;
  updatedAt: number;
  schemaVersion: number;
}

// Complete local storage schema
export interface LocalDataSchema {
  expenses: { [id: string]: LocalExpense };
  income: { [id: string]: LocalIncome };
  categories: { [id: string]: LocalCategory };
  cards: { [id: string]: LocalCard };
  forValues: { [id: string]: LocalForValue };
  incomeCategories: { [id: string]: LocalCategory };
  syncState: SyncState;
  metadata: LocalMetadata;
}

// Conflict detection results
export interface ConflictItem {
  entityType: EntityType;
  entityId: string;
  localVersion: any;
  cloudVersion: any;
  conflictReason: string;
  autoResolvable: boolean;
  severity: ConflictSeverity;
}

export interface ConflictDetectionResult {
  hasConflicts: boolean;
  conflictType: ConflictType;
  conflictItems: ConflictItem[];
  recommendedAction: 'upload_local' | 'download_cloud' | 'manual_merge';
  severity: ConflictSeverity;
  dataStats: {
    localRecords: number;
    cloudRecords: number;
    lastSync: Date | null;
  };
}

// Sync operation results
export interface SyncResult {
  success: boolean;
  conflicts: ConflictItem[];
  errors: SyncError[];
  syncedCount: number;
  failedCount: number;
  operationId: string;
  timestamp: number;
}

export interface SyncError {
  entityType: EntityType;
  entityId: string;
  operation: OperationType;
  error: string;
  retryable: boolean;
}

// Cloud data mapping for comparison
export interface CloudDataMapping {
  expenses: any[];
  income: any[];
  categories: any[];
  cards: any[];
  forValues: any[];
  incomeCategories: any[];
  metadata: {
    dataHash: string;
    lastModified: number;
    totalRecords: number;
  };
}

// Data export/import interfaces
export interface LocalDataExport {
  version: string;
  exportedAt: number;
  deviceId: string;
  userId: string;
  data: Partial<LocalDataSchema>;
  checksum: string;
}

// Merge rules for conflict resolution
export interface MergeRule {
  field: string;
  strategy: 'local_wins' | 'cloud_wins' | 'latest_timestamp' | 'user_choice';
  priority: number;
}

export interface ConflictResolutionStrategy {
  strategy: 'local_wins' | 'cloud_wins' | 'merge' | 'user_choice';
  applyToAll: boolean;
  preserveDeleted: boolean;
  mergeRules: MergeRule[];
}

// Queue status information
export interface QueueStatus {
  pending: number;
  processing: number;
  failed: number;
  completed: number;
  lastProcessed: Date | null;
  estimatedSyncTime?: number;
}

// Data filters for queries
export interface DataFilters {
  startDate?: number;
  endDate?: number;
  category?: string[];
  cardId?: string;
  syncStatus?: SyncStatus[];
  limit?: number;
  offset?: number;
}

// Local-first data hook result
export interface LocalFirstDataResult<T> {
  data: T[];
  syncStatus: SyncStatus;
  conflicts: ConflictItem[];
  isLoading: boolean;
  error: string | null;
  lastSyncedAt: Date | null;
  pendingCount: number;
}
