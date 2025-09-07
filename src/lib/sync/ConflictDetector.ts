import { 
  ConflictDetectionResult, 
  ConflictItem, 
  ConflictType, 
  ConflictSeverity,
  LocalDataExport,
  CloudDataMapping,
  EntityType,
  LocalEntity
} from '../types/local-storage';

/**
 * ConflictDetector provides comprehensive conflict detection capabilities
 * for local-first data synchronization. Uses hash-based comparison and
 * intelligent analysis to identify and categorize data conflicts.
 */
export class ConflictDetector {
  
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
   * Merge data by comparing timestamps
   */
  private mergeByTimestamp(localData: any, cloudData: CloudDataMapping): any {
    // Implementation would compare each entity by timestamp and keep the newer version
    // This is a simplified version - full implementation would handle each entity type
    return localData; // Placeholder
  }
}