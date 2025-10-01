import { 
  ConflictDetectionResult, 
  ConflictItem, 
  ConflictType, 
  ConflictSeverity,
  LocalDataExport,
  CloudDataMapping,
  EntityType,
  LocalEntity,
  ConflictResolution,
  ConflictResolutionStrategy,
  MergeRule
} from '../types/local-storage';

/**
 * Enhanced ConflictDetector with CRDT-like merge strategies, field-level resolution,
 * and comprehensive conflict history tracking for local-first data synchronization.
 */
export class ConflictDetector {
  private conflictHistory: ConflictResolution[] = [];
  private mergeStrategies: Map<string, (local: any, cloud: any) => any> = new Map();

  constructor() {
    this.initializeMergeStrategies();
  }
  
  /**
   * Main conflict detection method that compares local and cloud data
   */
  async detectConflicts(
    localData: LocalDataExport, 
    cloudData: CloudDataMapping
  ): Promise<ConflictDetectionResult> {
    
    const conflicts: ConflictItem[] = [];
    let conflictType: ConflictType;
    let severity: ConflictSeverity = 'low';
    
    // Check for basic data integrity
    const dataIntegrityResult = this.checkDataIntegrity(localData, cloudData);
    if (dataIntegrityResult.hasConflicts) {
      conflicts.push(...dataIntegrityResult.conflicts);
      conflictType = dataIntegrityResult.type;
      severity = this.determineSeverity(dataIntegrityResult.conflicts);
    } else {
      // Perform detailed entity-level conflict detection
      const entityConflicts = await this.detectEntityConflicts(localData, cloudData);
      conflicts.push(...entityConflicts);
      
      if (conflicts.length > 0) {
        conflictType = 'divergent_data';
        severity = this.determineSeverity(conflicts);
      } else {
        conflictType = 'divergent_data'; // Default if no specific type
      }
    }

    const hasConflicts = conflicts.length > 0;
    const recommendedAction = this.getRecommendedAction(conflictType, conflicts, localData, cloudData);

    return {
      hasConflicts,
      conflictType,
      conflictItems: conflicts,
      recommendedAction,
      severity,
      dataStats: {
        localRecords: this.countLocalRecords(localData),
        cloudRecords: this.countCloudRecords(cloudData),
        lastSync: localData.data.syncState?.lastSync ? new Date(localData.data.syncState.lastSync) : null
      }
    };
  }

  /**
   * Check basic data integrity and identify fundamental issues
   */
  private checkDataIntegrity(
    localData: LocalDataExport, 
    cloudData: CloudDataMapping
  ): { hasConflicts: boolean; conflicts: ConflictItem[]; type: ConflictType } {
    
    const conflicts: ConflictItem[] = [];
    
    // Check if cloud data is missing or corrupted
    if (!cloudData || Object.keys(cloudData).length === 0) {
      conflicts.push({
        entityType: 'expenses',
        entityId: 'global',
        localVersion: localData,
        cloudVersion: cloudData,
        conflictReason: 'Cloud data is missing or empty',
        autoResolvable: true,
        severity: 'high'
      });
      return { hasConflicts: true, conflicts, type: 'missing_cloud' };
    }

    // Check if local data is corrupted
    if (!localData.data || Object.keys(localData.data).length === 0) {
      conflicts.push({
        entityType: 'expenses',
        entityId: 'global',
        localVersion: localData,
        cloudVersion: cloudData,
        conflictReason: 'Local data is missing or corrupted',
        autoResolvable: true,
        severity: 'critical'
      });
      return { hasConflicts: true, conflicts, type: 'corrupted_local' };
    }

    // Check schema version compatibility
    if (localData.data.metadata && cloudData.metadata) {
      const localVersion = localData.data.metadata.schemaVersion;
      const cloudVersion = (cloudData.metadata as any).schemaVersion;
      
      if (localVersion && cloudVersion && localVersion !== cloudVersion) {
        conflicts.push({
          entityType: 'expenses',
          entityId: 'schema',
          localVersion: { version: localVersion },
          cloudVersion: { version: cloudVersion },
          conflictReason: `Schema version mismatch: local(${localVersion}) vs cloud(${cloudVersion})`,
          autoResolvable: false,
          severity: 'high'
        });
        return { hasConflicts: true, conflicts, type: 'schema_mismatch' };
      }
    }

    return { hasConflicts: false, conflicts: [], type: 'divergent_data' };
  }

  /**
   * Detect conflicts at entity level by comparing individual records
   */
  private async detectEntityConflicts(
    localData: LocalDataExport, 
    cloudData: CloudDataMapping
  ): Promise<ConflictItem[]> {
    
    const conflicts: ConflictItem[] = [];
    
    // Check expenses conflicts
    if (localData.data.expenses && cloudData.expenses) {
      const expenseConflicts = this.detectEntityTypeConflicts(
        'expenses',
        Object.values(localData.data.expenses),
        cloudData.expenses
      );
      conflicts.push(...expenseConflicts);
    }

    // Check income conflicts
    if (localData.data.income && cloudData.income) {
      const incomeConflicts = this.detectEntityTypeConflicts(
        'income',
        Object.values(localData.data.income),
        cloudData.income
      );
      conflicts.push(...incomeConflicts);
    }

    // Check categories conflicts
    if (localData.data.categories && cloudData.categories) {
      const categoryConflicts = this.detectEntityTypeConflicts(
        'categories',
        Object.values(localData.data.categories),
        cloudData.categories
      );
      conflicts.push(...categoryConflicts);
    }

    // Check cards conflicts
    if (localData.data.cards && cloudData.cards) {
      const cardConflicts = this.detectEntityTypeConflicts(
        'cards',
        Object.values(localData.data.cards),
        cloudData.cards
      );
      conflicts.push(...cardConflicts);
    }

    return conflicts;
  }

  /**
   * Detect conflicts for a specific entity type
   */
  private detectEntityTypeConflicts(
    entityType: EntityType,
    localEntities: LocalEntity[],
    cloudEntities: any[]
  ): ConflictItem[] {
    
    const conflicts: ConflictItem[] = [];
    
    // Create lookup maps
    const localMap = new Map(localEntities.map(entity => [entity.cloudId || entity.id, entity]));
    const cloudMap = new Map(cloudEntities.map(entity => [entity._id, entity]));
    
    // Check for local entities not in cloud
    for (const [id, localEntity] of localMap) {
      if (!cloudMap.has(id) && localEntity.cloudId) {
        conflicts.push({
          entityType,
          entityId: id,
          localVersion: localEntity,
          cloudVersion: null,
          conflictReason: 'Local entity exists but not found in cloud',
          autoResolvable: true,
          severity: 'medium'
        });
      }
    }
    
    // Check for cloud entities not in local
    for (const [id, cloudEntity] of cloudMap) {
      if (!localMap.has(id)) {
        conflicts.push({
          entityType,
          entityId: id,
          localVersion: null,
          cloudVersion: cloudEntity,
          conflictReason: 'Cloud entity exists but not found locally',
          autoResolvable: true,
          severity: 'medium'
        });
      }
    }
    
    // Check for data differences in existing entities
    for (const [id, localEntity] of localMap) {
      const cloudEntity = cloudMap.get(id);
      if (cloudEntity) {
        const hasDataConflict = this.hasDataConflict(localEntity, cloudEntity);
        if (hasDataConflict) {
          conflicts.push({
            entityType,
            entityId: id,
            localVersion: localEntity,
            cloudVersion: cloudEntity,
            conflictReason: 'Entity data differs between local and cloud',
            autoResolvable: this.isAutoResolvable(localEntity, cloudEntity),
            severity: 'low'
          });
        }
      }
    }

    return conflicts;
  }

  /**
   * Check if two entities have conflicting data
   */
  private hasDataConflict(localEntity: LocalEntity, cloudEntity: any): boolean {
    // Compare key fields that should be synchronized
    const localData = this.normalizeEntityForComparison(localEntity);
    const cloudData = this.normalizeEntityForComparison(cloudEntity);
    
    return JSON.stringify(localData) !== JSON.stringify(cloudData);
  }

  /**
   * Normalize entity data for comparison by removing sync-specific fields
   */
  private normalizeEntityForComparison(entity: any): any {
    const normalized = { ...entity };
    
    // Remove fields that shouldn't be compared
    delete normalized.syncStatus;
    delete normalized.lastSyncedAt;
    delete normalized.localId;
    delete normalized.version;
    delete normalized._id;
    delete normalized._creationTime;
    
    return normalized;
  }

  /**
   * Determine if a conflict can be automatically resolved
   */
  private isAutoResolvable(localEntity: LocalEntity, cloudEntity: any): boolean {
    // Check if one version is clearly newer based on updatedAt timestamp
    const localUpdated = localEntity.updatedAt;
    const cloudUpdated = cloudEntity.updatedAt || cloudEntity._creationTime;
    
    if (localUpdated && cloudUpdated) {
      const timeDiff = Math.abs(localUpdated - cloudUpdated);
      // If the time difference is significant (> 5 seconds), it's auto-resolvable
      return timeDiff > 5000;
    }
    
    return false;
  }

  /**
   * Determine the overall severity of conflicts
   */
  private determineSeverity(conflicts: ConflictItem[]): ConflictSeverity {
    if (conflicts.some(c => c.severity === 'critical')) return 'critical';
    if (conflicts.some(c => c.severity === 'high')) return 'high';
    if (conflicts.some(c => c.severity === 'medium')) return 'medium';
    return 'low';
  }

  /**
   * Get recommended action based on conflict analysis
   */
  private getRecommendedAction(
    conflictType: ConflictType,
    conflicts: ConflictItem[],
    localData: LocalDataExport,
    cloudData: CloudDataMapping
  ): 'upload_local' | 'download_cloud' | 'manual_merge' {
    
    // If cloud data is missing, recommend upload
    if (conflictType === 'missing_cloud') {
      return 'upload_local';
    }
    
    // If local data is corrupted, recommend download
    if (conflictType === 'corrupted_local') {
      return 'download_cloud';
    }
    
    // If schema mismatch, require manual intervention
    if (conflictType === 'schema_mismatch') {
      return 'manual_merge';
    }
    
    // For divergent data, analyze the nature of conflicts
    const localRecords = this.countLocalRecords(localData);
    const cloudRecords = this.countCloudRecords(cloudData);
    
    // If local has significantly more recent data, recommend upload
    if (localRecords > cloudRecords * 1.5) {
      return 'upload_local';
    }
    
    // If cloud has significantly more data, recommend download
    if (cloudRecords > localRecords * 1.5) {
      return 'download_cloud';
    }
    
    // Check if conflicts are auto-resolvable
    const autoResolvableCount = conflicts.filter(c => c.autoResolvable).length;
    const totalConflicts = conflicts.length;
    
    if (autoResolvableCount >= totalConflicts * 0.8) {
      // Most conflicts are auto-resolvable, determine direction based on timestamps
      const hasRecentLocal = localData.data.syncState?.lastModified || 0;
      const hasRecentCloud = cloudData.metadata?.lastModified || 0;
      
      return hasRecentLocal > hasRecentCloud ? 'upload_local' : 'download_cloud';
    }
    
    // Default to manual merge for complex conflicts
    return 'manual_merge';
  }

  /**
   * Count total records in local data
   */
  private countLocalRecords(localData: LocalDataExport): number {
    let count = 0;
    if (localData.data.expenses) count += Object.keys(localData.data.expenses).length;
    if (localData.data.income) count += Object.keys(localData.data.income).length;
    if (localData.data.categories) count += Object.keys(localData.data.categories).length;
    if (localData.data.cards) count += Object.keys(localData.data.cards).length;
    return count;
  }

  /**
   * Count total records in cloud data
   */
  private countCloudRecords(cloudData: CloudDataMapping): number {
    let count = 0;
    if (cloudData.expenses) count += cloudData.expenses.length;
    if (cloudData.income) count += cloudData.income.length;
    if (cloudData.categories) count += cloudData.categories.length;
    if (cloudData.cards) count += cloudData.cards.length;
    return count;
  }

  /**
   * Validate data hash consistency
   */
  async validateDataHash(localHash: string, cloudHash: string): Promise<boolean> {
    return localHash === cloudHash;
  }

  /**
   * Generate a simple hash for data comparison
   */
  generateDataHash(data: any): string {
    const dataString = JSON.stringify(data, Object.keys(data).sort());
    let hash = 0;
    for (let i = 0; i < dataString.length; i++) {
      const char = dataString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  /**
   * Merge two data sets using the provided strategy
   */
  mergeData(
    localData: LocalDataExport, 
    cloudData: CloudDataMapping, 
    strategy: 'local_wins' | 'cloud_wins' | 'latest_timestamp'
  ): LocalDataExport {
    
    const mergedData: LocalDataExport = {
      ...localData,
      exportedAt: Date.now(),
      checksum: '' // Will be calculated after merge
    };

    switch (strategy) {
      case 'local_wins':
        // Keep local data as-is, just update sync timestamps
        if (mergedData.data.syncState) {
          mergedData.data.syncState.lastSync = Date.now();
        }
        break;
        
      case 'cloud_wins':
        // Replace local data with cloud data
        mergedData.data = this.convertCloudToLocalData(cloudData);
        break;
        
      case 'latest_timestamp':
        // Merge based on timestamps
        mergedData.data = this.mergeByTimestamp(localData.data, cloudData);
        break;
    }

    // Recalculate checksum
    mergedData.checksum = this.generateDataHash(mergedData.data);
    
    return mergedData;
  }

  /**
   * Convert cloud data format to local data format
   */
  private convertCloudToLocalData(cloudData: CloudDataMapping): any {
    const converted: any = {
      expenses: {},
      income: {},
      categories: {},
      cards: {},
      forValues: {},
      incomeCategories: {}
    };

    // Convert expenses
    if (cloudData.expenses) {
      for (const expense of cloudData.expenses) {
        converted.expenses[expense._id] = {
          id: expense._id,
          localId: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          cloudId: expense._id,
          syncStatus: 'synced',
          version: 1,
          createdAt: expense.createdAt,
          updatedAt: expense.updatedAt || expense.createdAt,
          lastSyncedAt: Date.now(),
          amount: expense.amount,
          title: expense.title,
          category: expense.category,
          for: expense.for,
          date: expense.date,
          cardId: expense.cardId
        };
      }
    }

    // Convert other entities similarly...
    // (Implementation would follow the same pattern for income, categories, cards)

    return converted;
  }

  /**
   * Initialize CRDT-like merge strategies for different field types
   */
  private initializeMergeStrategies(): void {
    // Last-Writer-Wins for simple fields
    this.mergeStrategies.set('lww', (local: any, cloud: any) => {
      return local.updatedAt > cloud.updatedAt ? local : cloud;
    });

    // Set union for array fields (categories, for values)
    this.mergeStrategies.set('set_union', (local: any[], cloud: any[]) => {
      const combined = new Set([...local, ...cloud]);
      return Array.from(combined);
    });

    // Numeric max for amounts (assuming higher is more recent/correct)
    this.mergeStrategies.set('numeric_max', (local: number, cloud: number) => {
      return Math.max(local, cloud);
    });

    // String concatenation with separator for notes/titles
    this.mergeStrategies.set('string_concat', (local: string, cloud: string) => {
      if (local === cloud) return local;
      return `${local} | ${cloud}`;
    });

    // Custom merge for complex objects
    this.mergeStrategies.set('object_merge', (local: any, cloud: any) => {
      return { ...cloud, ...local }; // Local takes precedence
    });
  }

  /**
   * Perform field-level conflict detection and resolution
   */
  async resolveFieldLevelConflicts(
    localEntity: LocalEntity,
    cloudEntity: any,
    strategy: ConflictResolutionStrategy
  ): Promise<{ resolved: LocalEntity; conflicts: FieldConflict[] }> {
    const fieldConflicts: FieldConflict[] = [];
    const resolved = { ...localEntity };

    // Compare each field
    for (const [field, value] of Object.entries(localEntity)) {
      if (this.shouldSkipField(field)) continue;

      const cloudValue = cloudEntity[field];
      if (value !== cloudValue) {
        const conflict: FieldConflict = {
          field,
          localValue: value,
          cloudValue,
          conflictType: this.determineFieldConflictType(field, value, cloudValue),
          autoResolvable: this.isFieldAutoResolvable(field, value, cloudValue)
        };

        fieldConflicts.push(conflict);

        // Apply resolution strategy
        const resolvedValue = await this.resolveFieldConflict(
          field,
          value,
          cloudValue,
          strategy,
          conflict
        );
        
        (resolved as any)[field] = resolvedValue;
      }
    }

    return { resolved, conflicts: fieldConflicts };
  }

  /**
   * Resolve individual field conflicts using CRDT-like strategies
   */
  private async resolveFieldConflict(
    field: string,
    localValue: any,
    cloudValue: any,
    strategy: ConflictResolutionStrategy,
    conflict: FieldConflict
  ): Promise<any> {
    // Check if there's a specific merge rule for this field
    const mergeRule = strategy.mergeRules.find(rule => rule.field === field);
    const resolveStrategy = mergeRule?.strategy || strategy.strategy;

    switch (resolveStrategy) {
      case 'local_wins':
        return localValue;
      
      case 'cloud_wins':
        return cloudValue;
      
      case 'merge':
        return this.performCRDTMerge(field, localValue, cloudValue, conflict);
      
      case 'user_choice':
        // This would typically trigger UI for user selection
        // For now, fall back to CRDT merge
        return this.performCRDTMerge(field, localValue, cloudValue, conflict);
      
      default:
        return localValue; // Default to local
    }
  }

  /**
   * Perform CRDT-like merge based on field type and conflict characteristics
   */
  private performCRDTMerge(
    field: string,
    localValue: any,
    cloudValue: any,
    conflict: FieldConflict
  ): any {
    switch (conflict.conflictType) {
      case 'array_difference':
        // Use set union for arrays
        const mergeArrays = this.mergeStrategies.get('set_union');
        return mergeArrays ? mergeArrays(localValue, cloudValue) : localValue;
      
      case 'numeric_difference':
        // Use numeric max for amounts
        const mergeNumeric = this.mergeStrategies.get('numeric_max');
        return mergeNumeric ? mergeNumeric(localValue, cloudValue) : localValue;
      
      case 'string_difference':
        // For titles and notes, prefer non-empty values
        if (!localValue && cloudValue) return cloudValue;
        if (localValue && !cloudValue) return localValue;
        if (localValue.length > cloudValue.length) return localValue;
        return cloudValue;
      
      case 'timestamp_difference':
        // Use latest timestamp
        return localValue > cloudValue ? localValue : cloudValue;
      
      case 'object_difference':
        // Merge objects with local precedence
        const mergeObjects = this.mergeStrategies.get('object_merge');
        return mergeObjects ? mergeObjects(localValue, cloudValue) : localValue;
      
      default:
        return localValue;
    }
  }

  /**
   * Determine the type of field conflict
   */
  private determineFieldConflictType(
    field: string,
    localValue: any,
    cloudValue: any
  ): FieldConflictType {
    if (Array.isArray(localValue) && Array.isArray(cloudValue)) {
      return 'array_difference';
    }
    
    if (typeof localValue === 'number' && typeof cloudValue === 'number') {
      return 'numeric_difference';
    }
    
    if (typeof localValue === 'string' && typeof cloudValue === 'string') {
      return 'string_difference';
    }
    
    if (field.includes('At') || field.includes('date') || field.includes('time')) {
      return 'timestamp_difference';
    }
    
    if (typeof localValue === 'object' && typeof cloudValue === 'object') {
      return 'object_difference';
    }
    
    return 'value_difference';
  }

  /**
   * Check if a field conflict can be automatically resolved
   */
  private isFieldAutoResolvable(field: string, localValue: any, cloudValue: any): boolean {
    // Arrays can usually be merged automatically
    if (Array.isArray(localValue) && Array.isArray(cloudValue)) {
      return true;
    }
    
    // Timestamps can be resolved by taking the latest
    if (field.includes('At') || field.includes('date') || field.includes('time')) {
      return true;
    }
    
    // Empty vs non-empty values can be resolved
    if ((!localValue && cloudValue) || (localValue && !cloudValue)) {
      return true;
    }
    
    // Numeric values can be resolved with max strategy
    if (typeof localValue === 'number' && typeof cloudValue === 'number') {
      return true;
    }
    
    return false;
  }

  /**
   * Check if a field should be skipped during conflict detection
   */
  private shouldSkipField(field: string): boolean {
    const skipFields = [
      'syncStatus', 'lastSyncedAt', 'localId', 'version', 
      '_id', '_creationTime', 'id'
    ];
    return skipFields.includes(field);
  }

  /**
   * Add conflict resolution to history
   */
  addToHistory(resolution: ConflictResolution): void {
    this.conflictHistory.push(resolution);
    
    // Keep only last 1000 resolutions to prevent memory issues
    if (this.conflictHistory.length > 1000) {
      this.conflictHistory = this.conflictHistory.slice(-1000);
    }
  }

  /**
   * Get conflict resolution history
   */
  getConflictHistory(entityType?: EntityType, entityId?: string): ConflictResolution[] {
    let history = this.conflictHistory;
    
    if (entityType) {
      history = history.filter(r => r.entityType === entityType);
    }
    
    if (entityId) {
      history = history.filter(r => r.entityId === entityId);
    }
    
    return history.sort((a, b) => b.resolvedAt - a.resolvedAt);
  }

  /**
   * Get conflict statistics
   */
  getConflictStats(): ConflictStats {
    const total = this.conflictHistory.length;
    const byStrategy = this.conflictHistory.reduce((acc, resolution) => {
      acc[resolution.strategy] = (acc[resolution.strategy] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const byEntityType = this.conflictHistory.reduce((acc, resolution) => {
      acc[resolution.entityType] = (acc[resolution.entityType] || 0) + 1;
      return acc;
    }, {} as Record<EntityType, number>);
    
    const recentConflicts = this.conflictHistory.filter(
      r => r.resolvedAt > Date.now() - 24 * 60 * 60 * 1000 // Last 24 hours
    ).length;

    return {
      total,
      byStrategy,
      byEntityType,
      recentConflicts,
      averageResolutionTime: this.calculateAverageResolutionTime()
    };
  }

  /**
   * Calculate average time between conflict detection and resolution
   */
  private calculateAverageResolutionTime(): number {
    if (this.conflictHistory.length === 0) return 0;
    
    // This is a simplified calculation - in practice, you'd track detection time
    const recentResolutions = this.conflictHistory.slice(-100);
    const intervals = recentResolutions.slice(1).map((resolution, index) => 
      resolution.resolvedAt - recentResolutions[index].resolvedAt
    );
    
    return intervals.length > 0 
      ? intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length
      : 0;
  }

  /**
   * Clear conflict history (for testing or privacy)
   */
  clearHistory(): void {
    this.conflictHistory = [];
  }

  /**
   * Export conflict history for backup
   */
  exportHistory(): ConflictResolution[] {
    return [...this.conflictHistory];
  }

  /**
   * Import conflict history from backup
   */
  importHistory(history: ConflictResolution[]): void {
    this.conflictHistory = [...history];
  }

  /**
   * Merge data by comparing timestamps (enhanced implementation)
   */
  private mergeByTimestamp(localData: any, cloudData: CloudDataMapping): any {
    const merged = { ...localData };
    
    // Merge each entity type
    for (const entityType of ['expenses', 'income', 'categories', 'cards'] as EntityType[]) {
      if (cloudData[entityType] && localData[entityType]) {
        merged[entityType] = this.mergeEntityTypeByTimestamp(
          localData[entityType],
          cloudData[entityType],
          entityType
        );
      }
    }
    
    return merged;
  }

  /**
   * Merge entities of a specific type by timestamp
   */
  private mergeEntityTypeByTimestamp(
    localEntities: Record<string, LocalEntity>,
    cloudEntities: any[],
    entityType: EntityType
  ): Record<string, LocalEntity> {
    const merged = { ...localEntities };
    
    for (const cloudEntity of cloudEntities) {
      const id = cloudEntity._id;
      const localEntity = localEntities[id];
      
      if (!localEntity) {
        // Add cloud entity if not present locally
        merged[id] = this.convertCloudEntityToLocal(cloudEntity, entityType);
      } else {
        // Merge based on timestamp
        const cloudUpdated = cloudEntity.updatedAt || cloudEntity._creationTime;
        const localUpdated = localEntity.updatedAt;
        
        if (cloudUpdated > localUpdated) {
          // Cloud is newer, but preserve local sync metadata
          merged[id] = {
            ...this.convertCloudEntityToLocal(cloudEntity, entityType),
            localId: localEntity.localId,
            syncStatus: 'synced' as SyncStatus,
            lastSyncedAt: Date.now()
          };
        }
        // If local is newer or equal, keep local version
      }
    }
    
    return merged;
  }

  /**
   * Convert cloud entity to local entity format
   */
  private convertCloudEntityToLocal(cloudEntity: any, entityType: EntityType): LocalEntity {
    const base: LocalEntity = {
      id: cloudEntity._id,
      localId: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      cloudId: cloudEntity._id,
      syncStatus: 'synced',
      version: 1,
      createdAt: cloudEntity.createdAt || cloudEntity._creationTime,
      updatedAt: cloudEntity.updatedAt || cloudEntity._creationTime,
      lastSyncedAt: Date.now()
    };

    // Add entity-specific fields
    return { ...base, ...cloudEntity };
  }
}

// Additional types for enhanced conflict resolution
interface FieldConflict {
  field: string;
  localValue: any;
  cloudValue: any;
  conflictType: FieldConflictType;
  autoResolvable: boolean;
}

type FieldConflictType = 
  | 'array_difference' 
  | 'numeric_difference' 
  | 'string_difference' 
  | 'timestamp_difference' 
  | 'object_difference' 
  | 'value_difference';

interface ConflictStats {
  total: number;
  byStrategy: Record<string, number>;
  byEntityType: Record<EntityType, number>;
  recentConflicts: number;
  averageResolutionTime: number;
}