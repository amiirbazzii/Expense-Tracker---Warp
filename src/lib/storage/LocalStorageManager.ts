import * as localforage from "localforage";
import {
  LocalDataSchema,
  LocalExpense,
  LocalIncome,
  LocalCategory,
  LocalCard,
  LocalForValue,
  LocalLoan,
  LocalEntity,
  DataFilters,
  EntityType,
  LocalDataExport,
  PendingOperation,
  SyncState,
  LocalMetadata,
} from "../types/local-storage";
import { createAsyncLock } from "./asyncLock";
import { dataStore } from "./idb";
import { migrateLocalData, CURRENT_SCHEMA_VERSION } from "./migrations";

/**
 * Every instance addresses the same object store, so the lock is module-scoped:
 * a per-instance lock would not serialize a write made by LocalDataStore
 * against one made by the SyncEngine.
 */
const runExclusive = createAsyncLock();

/** Storage key for the durable local-key → Convex-id map. */
const CLOUD_ID_MAP_KEY = "cloud_id_map";

/**
 * LocalStorageManager provides a comprehensive interface for local data operations
 * using IndexedDB via localforage abstraction. Handles all CRUD operations,
 * data export/import, and storage management for the local-first architecture.
 *
 * Records are keyed by a **stable** id that never changes once assigned. For
 * locally created rows that is a `local_…` id; the Convex document id lands in
 * the separate `cloudId` field after the mutation syncs. Nothing may re-key a
 * record, because the UI holds ids across renders.
 */
export class LocalStorageManager {
  private storage: typeof localforage;
  private initializedFor: string | null = null;

  constructor() {
    // Shared handle — see src/lib/storage/idb.ts for why the two stores in
    // this database must not be opened concurrently.
    this.storage = dataStore;
  }

  /**
   * Initialize the storage manager and set up the database structure
   */
  async initialize(userId: string): Promise<void> {
    // Re-run whenever the account changes, otherwise the wipe below is skipped
    // and the previous user's rows stay readable for the whole session.
    if (this.initializedFor === userId) return;

    try {
      // Initialize metadata if it doesn't exist
      let metadata = await this.getMetadata();

      // The entity collections in this store are not partitioned by user, so
      // data left behind by a previous account would otherwise be readable by
      // whoever logs in next on this device. Wipe on user change.
      if (metadata && metadata.userId !== userId) {
        await this.clearAllData();
        metadata = null;
      }

      if (!metadata) {
        await this.initializeMetadata(userId);
      } else if ((metadata.schemaVersion ?? 0) < CURRENT_SCHEMA_VERSION) {
        // Existing install: repair rows written by earlier versions before any
        // read path sees them.
        await runExclusive(() => migrateLocalData(this.storage));
        await this.updateMetadata({ schemaVersion: CURRENT_SCHEMA_VERSION });
      }

      // Initialize sync state if it doesn't exist
      const syncState = await this.getSyncState();
      if (!syncState) {
        await this.initializeSyncState();
      }

      this.initializedFor = userId;
    } catch (error) {
      console.error("Failed to initialize LocalStorageManager:", error);
      throw error;
    }
  }

  /** True once `initialize()` has completed for the given user. */
  isInitializedFor(userId: string): boolean {
    return this.initializedFor === userId;
  }

  private async initializeMetadata(userId: string): Promise<void> {
    const metadata: LocalMetadata = {
      version: "2.0.0",
      deviceId: this.generateDeviceId(),
      userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      schemaVersion: CURRENT_SCHEMA_VERSION,
    };

    await this.storage.setItem("metadata", metadata);
  }

  private async initializeSyncState(): Promise<void> {
    const syncState: SyncState = {
      lastSync: 0,
      pendingOperations: [],
      dataHash: "",
      conflictResolutions: [],
      totalRecords: 0,
      lastModified: Date.now(),
    };

    await this.storage.setItem("syncState", syncState);
  }

  private generateDeviceId(): string {
    return (
      "device_" + Math.random().toString(36).substr(2, 9) + "_" + Date.now()
    );
  }

  // Metadata operations
  async getMetadata(): Promise<LocalMetadata | null> {
    return await this.storage.getItem("metadata");
  }

  async updateMetadata(updates: Partial<LocalMetadata>): Promise<void> {
    const metadata = await this.getMetadata();
    if (metadata) {
      const updated = { ...metadata, ...updates, updatedAt: Date.now() };
      await this.storage.setItem("metadata", updated);
    }
  }

  // Sync state operations
  async getSyncState(): Promise<SyncState | null> {
    return await this.storage.getItem("syncState");
  }

  async updateSyncState(updates: Partial<SyncState>): Promise<void> {
    const syncState = await this.getSyncState();
    if (syncState) {
      const updated = { ...syncState, ...updates };
      await this.storage.setItem("syncState", updated);
    }
  }

  // ==========================================
  // Cloud id resolution
  // ==========================================

  /**
   * Resolve a record by its Convex document id.
   *
   * The UI and the local store address rows by their stable local key; the
   * server only knows the `cloudId`. This is the bridge between the two.
   */
  async findByCloudId<T extends LocalEntity>(
    entityType: EntityType,
    cloudId: string,
  ): Promise<T | null> {
    const collection = await this.getEntityCollection<T>(entityType);
    const direct = collection[cloudId];
    if (direct) return direct;

    for (const entity of Object.values(collection)) {
      if (entity.cloudId === cloudId) return entity;
    }
    return null;
  }

  /** Map of cloudId → stable local key for a whole collection. */
  async getCloudIdIndex(
    entityType: EntityType,
  ): Promise<Map<string, string>> {
    const collection = await this.getEntityCollection<LocalEntity>(entityType);
    const index = new Map<string, string>();
    for (const [key, entity] of Object.entries(collection)) {
      if (entity.cloudId) index.set(entity.cloudId, key);
      // A hydrated row is keyed by its own cloud id.
      index.set(key, key);
    }
    return index;
  }

  /**
   * Mark an entity as synced after a successful Convex mutation.
   *
   * Records the `cloudId` mapping without ever re-keying the row — the UI is
   * holding the existing key, so changing it would orphan every reference.
   */
  async markEntityAsSynced(
    entityType: string,
    id: string,
    cloudId?: string,
  ): Promise<void> {
    await runExclusive(async () => {
      if (cloudId) {
        // Record the mapping durably *before* touching the row. The row is not
        // a safe place to keep it: a later delete removes the row while its
        // delete mutation is still queued, and an in-memory map dies with the
        // page — leaving the queued mutation with no way to name the document.
        const map = await this.getCloudIdMap();
        if (map[id] !== cloudId) {
          map[id] = cloudId;
          await this.storage.setItem(CLOUD_ID_MAP_KEY, map);
        }
      }

      const collection = await this.getEntityCollection<any>(entityType);
      const entity = collection[id];
      if (!entity) return;
      collection[id] = {
        ...entity,
        syncStatus: "synced",
        ...(cloudId ? { cloudId } : {}),
        lastSyncedAt: Date.now(),
      };
      await this.setEntityCollection(entityType, collection);
    });
  }

  /** The durable local-key → Convex-id map. */
  private async getCloudIdMap(): Promise<Record<string, string>> {
    const map = await this.storage.getItem<Record<string, string>>(
      CLOUD_ID_MAP_KEY,
    );
    return map && typeof map === "object" ? map : {};
  }

  /**
   * Convex id for a local key, from the durable map.
   *
   * Survives both a page reload and deletion of the row itself, which is the
   * whole point: a queued delete has to be able to name a document whose local
   * copy is already gone.
   */
  async getCloudIdForLocalId(localId: string): Promise<string | null> {
    const map = await this.getCloudIdMap();
    return map[localId] ?? null;
  }

  /** Drop a mapping once the document it names no longer exists anywhere. */
  async forgetCloudIdMapping(localId: string): Promise<void> {
    await runExclusive(async () => {
      const map = await this.getCloudIdMap();
      if (!(localId in map)) return;
      delete map[localId];
      await this.storage.setItem(CLOUD_ID_MAP_KEY, map);
    });
  }

  // ==========================================
  // Generic Dynamic CRUD Operations
  // ==========================================

  /**
   * Seed an entity into a local collection without enqueuing any mutation.
   * Used when the entity already exists on the server and we only need a
   * local copy for offline reads / subsequent updates.
   */
  async seedEntity<T extends LocalEntity>(
    entityType: string,
    data: any,
  ): Promise<T> {
    return runExclusive(async () => {
      const collection = await this.getEntityCollection<T>(entityType);

      const id = data.id || data.cloudId || data._id;
      if (!id) throw new Error("seedEntity requires an id, cloudId, or _id");

      const localEntity: T = {
        ...data,
        id,
        localId: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        syncStatus: "synced",
        version: 1,
        createdAt: data.createdAt || Date.now(),
        updatedAt: Date.now(),
      } as unknown as T;

      collection[id] = localEntity;
      await this.setEntityCollection(entityType, collection);
      return localEntity;
    });
  }

  async saveEntity<T extends LocalEntity>(
    entityType: string,
    data: any,
  ): Promise<T> {
    return runExclusive(async () => {
      const collection = await this.getEntityCollection<T>(entityType);

      const id =
        data.id ||
        data.cloudId ||
        `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const localEntity: T = {
        ...data,
        id,
        localId: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        syncStatus: "pending",
        version: 1,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      } as unknown as T;

      collection[id] = localEntity;
      await this.setEntityCollection(entityType, collection);
      return localEntity;
    });
  }

  async getEntities<T extends LocalEntity>(entityType: string): Promise<T[]> {
    const collection = await this.getEntityCollection<T>(entityType);
    return Object.values(collection);
  }

  async getEntityById<T extends LocalEntity>(
    entityType: string,
    id: string,
  ): Promise<T | null> {
    const collection = await this.getEntityCollection<T>(entityType);
    return collection[id] || null;
  }

  async updateEntity<T extends LocalEntity>(
    entityType: string,
    id: string,
    updates: Partial<T>,
  ): Promise<T | null> {
    return runExclusive(async () => {
      const collection = await this.getEntityCollection<T>(entityType);
      const entity = collection[id];

      if (!entity) return null;

      const updated: T = {
        ...entity,
        ...updates,
        version: entity.version + 1,
        updatedAt: Date.now(),
        syncStatus: "pending",
      };

      collection[id] = updated;
      await this.setEntityCollection(entityType, collection);
      return updated;
    });
  }

  async deleteEntity(entityType: string, id: string): Promise<boolean> {
    return runExclusive(async () => {
      const collection =
        await this.getEntityCollection<LocalEntity>(entityType);

      if (!collection[id]) return false;

      delete collection[id];
      await this.setEntityCollection(entityType, collection);
      return true;
    });
  }

  // Generic entity operations
  async getEntityCollection<T extends LocalEntity>(
    entityType: EntityType,
  ): Promise<{ [id: string]: T }> {
    const collection = await this.storage.getItem(entityType);
    return (collection as { [id: string]: T }) || {};
  }

  private async setEntityCollection<T extends LocalEntity>(
    entityType: EntityType,
    collection: { [id: string]: T },
  ): Promise<void> {
    await this.storage.setItem(entityType, collection);
    await this.updateLastModified();
  }

  private async updateLastModified(): Promise<void> {
    await this.updateSyncState({ lastModified: Date.now() });
  }

  /**
   * Insert a hydrated server document into a collection.
   * Used by HydrationService to seed IndexedDB with Convex data.
   */
  async insertEntity(
    entityType: EntityType,
    id: string,
    fields: Record<string, any>,
  ): Promise<void> {
    await runExclusive(async () => {
      const collection = await this.getEntityCollection(entityType);
      if (collection[id]) return; // Already exists — don't overwrite

      collection[id] = {
        ...fields,
        id,
        localId: `hydrated_${id}`,
        syncStatus: "synced",
        version: 1,
        createdAt: fields.createdAt ?? Date.now(),
        updatedAt: fields.updatedAt ?? Date.now(),
      } as any;

      await this.setEntityCollection(entityType, collection);
    });
  }

  /**
   * Apply authoritative server fields onto an existing local row.
   *
   * Unlike `updateEntity` this does not bump the version or flip the row back
   * to `pending` — the data came *from* the server, so the row is synced by
   * definition and must not look like an unsent local edit.
   */
  async applyServerUpdate(
    entityType: EntityType,
    key: string,
    fields: Record<string, any>,
  ): Promise<void> {
    await runExclusive(async () => {
      const collection = await this.getEntityCollection<LocalEntity>(entityType);
      const existing = collection[key];
      if (!existing) return;

      collection[key] = {
        ...existing,
        ...fields,
        // Never let server data re-key the row or clobber local identity.
        id: existing.id,
        localId: existing.localId,
        version: existing.version,
        createdAt: existing.createdAt,
        syncStatus: "synced",
        lastSyncedAt: Date.now(),
      };

      await this.setEntityCollection(entityType, collection);
    });
  }

  /**
   * Apply a whole hydration pass onto a collection in ONE read-modify-write.
   *
   * The per-document `applyServerUpdate`/`insertEntity` methods each rewrite
   * the entire collection; calling them in a loop made hydration O(N²) and
   * visibly froze the UI right after reconnecting. Semantics per entry match
   * those methods exactly.
   */
  async bulkMergeServerDocs(
    entityType: EntityType,
    updates: Record<string, Record<string, any>>,
    inserts: Record<string, Record<string, any>>,
  ): Promise<void> {
    const updateKeys = Object.keys(updates);
    const insertKeys = Object.keys(inserts);
    if (updateKeys.length === 0 && insertKeys.length === 0) return;

    await runExclusive(async () => {
      const collection = await this.getEntityCollection<LocalEntity>(entityType);

      for (const key of updateKeys) {
        const existing = collection[key];
        if (!existing) continue;
        collection[key] = {
          ...existing,
          ...updates[key],
          // Never let server data re-key the row or clobber local identity.
          id: existing.id,
          localId: existing.localId,
          version: existing.version,
          createdAt: existing.createdAt,
          syncStatus: "synced",
          lastSyncedAt: Date.now(),
        };
      }

      for (const key of insertKeys) {
        if (collection[key]) continue; // Already exists — don't overwrite
        const fields = inserts[key];
        collection[key] = {
          ...fields,
          id: key,
          localId: `hydrated_${key}`,
          syncStatus: "synced",
          version: 1,
          createdAt: fields.createdAt ?? Date.now(),
          updatedAt: fields.updatedAt ?? Date.now(),
        } as any;
      }

      await this.setEntityCollection(entityType, collection);
    });
  }

  /**
   * Remove rows that no longer exist on the server.
   * Only ever touches rows that are fully synced — a pending local write or a
   * row that has never reached the server is always kept.
   */
  async removeSyncedEntities(
    entityType: EntityType,
    keys: string[],
  ): Promise<number> {
    if (keys.length === 0) return 0;

    return runExclusive(async () => {
      const collection = await this.getEntityCollection<LocalEntity>(entityType);
      let removed = 0;

      for (const key of keys) {
        const entity = collection[key];
        if (!entity) continue;
        if (entity.syncStatus !== "synced" || !entity.cloudId) continue;
        delete collection[key];
        removed++;
      }

      if (removed > 0) await this.setEntityCollection(entityType, collection);
      return removed;
    });
  }

  // ==========================================
  // Entity-specific CRUD
  // ==========================================
  //
  // These are thin, typed wrappers over the generic operations above. They all
  // go through the same locked read-modify-write path, and none of them talks
  // to a queue: enqueuing the matching Convex mutation is LocalDataStore's job,
  // so a single user action can never produce two outbound mutations.

  // Expense operations
  async saveExpense(
    expense: Omit<
      LocalExpense,
      "id" | "localId" | "syncStatus" | "version" | "createdAt" | "updatedAt"
    >,
  ): Promise<LocalExpense> {
    return this.saveEntity<LocalExpense>("expenses", expense);
  }

  async getExpenses(filters?: DataFilters): Promise<LocalExpense[]> {
    const collection = await this.getEntityCollection<LocalExpense>("expenses");
    let expenses = Object.values(collection);

    if (filters) {
      expenses = this.applyFilters(expenses, filters);
    }

    return expenses.sort((a, b) => b.date - a.date);
  }

  async getExpenseById(id: string): Promise<LocalExpense | null> {
    return this.getEntityById<LocalExpense>("expenses", id);
  }

  async updateExpense(
    id: string,
    updates: Partial<LocalExpense>,
  ): Promise<LocalExpense | null> {
    return this.updateEntity<LocalExpense>("expenses", id, updates);
  }

  async deleteExpense(id: string): Promise<boolean> {
    return this.deleteEntity("expenses", id);
  }

  // Income operations
  async saveIncome(
    income: Omit<
      LocalIncome,
      "id" | "localId" | "syncStatus" | "version" | "createdAt" | "updatedAt"
    >,
  ): Promise<LocalIncome> {
    return this.saveEntity<LocalIncome>("income", income);
  }

  async getIncome(filters?: DataFilters): Promise<LocalIncome[]> {
    const collection = await this.getEntityCollection<LocalIncome>("income");
    let income = Object.values(collection);

    if (filters) {
      income = this.applyFilters(income, filters);
    }

    return income.sort((a, b) => b.date - a.date);
  }

  async updateIncome(
    id: string,
    updates: Partial<LocalIncome>,
  ): Promise<LocalIncome | null> {
    return this.updateEntity<LocalIncome>("income", id, updates);
  }

  async deleteIncome(id: string): Promise<boolean> {
    return this.deleteEntity("income", id);
  }

  // Category operations
  async saveCategory(
    category: Omit<
      LocalCategory,
      "id" | "localId" | "syncStatus" | "version" | "createdAt" | "updatedAt"
    >,
  ): Promise<LocalCategory> {
    return this.saveEntity<LocalCategory>("categories", {
      ...category,
      type: category.type ?? "expense",
    });
  }

  async getCategories(type?: "expense" | "income"): Promise<LocalCategory[]> {
    const collection =
      await this.getEntityCollection<LocalCategory>("categories");
    let categories = Object.values(collection);

    if (type) {
      categories = categories.filter((cat) => cat.type === type);
    }

    return categories.sort((a, b) => a.name.localeCompare(b.name));
  }

  async updateCategory(
    id: string,
    updates: Partial<LocalCategory>,
  ): Promise<LocalCategory | null> {
    return this.updateEntity<LocalCategory>("categories", id, updates);
  }

  async deleteCategory(id: string): Promise<boolean> {
    return this.deleteEntity("categories", id);
  }

  // Income category operations (separate collection from expense categories)
  async saveIncomeCategory(
    category: Omit<
      LocalCategory,
      "id" | "localId" | "syncStatus" | "version" | "createdAt" | "updatedAt"
    >,
  ): Promise<LocalCategory> {
    return this.saveEntity<LocalCategory>("incomeCategories", {
      ...category,
      type: "income",
    });
  }

  async getIncomeCategories(): Promise<LocalCategory[]> {
    const collection =
      await this.getEntityCollection<LocalCategory>("incomeCategories");
    return Object.values(collection).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }

  async updateIncomeCategory(
    id: string,
    updates: Partial<LocalCategory>,
  ): Promise<LocalCategory | null> {
    return this.updateEntity<LocalCategory>("incomeCategories", id, {
      ...updates,
      type: "income", // Ensure it remains an income category
    });
  }

  async deleteIncomeCategory(id: string): Promise<boolean> {
    return this.deleteEntity("incomeCategories", id);
  }

  // Card operations
  async saveCard(
    card: Omit<
      LocalCard,
      "id" | "localId" | "syncStatus" | "version" | "createdAt" | "updatedAt"
    >,
  ): Promise<LocalCard> {
    return this.saveEntity<LocalCard>("cards", card);
  }

  async getCards(): Promise<LocalCard[]> {
    const collection = await this.getEntityCollection<LocalCard>("cards");
    return Object.values(collection).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }

  async updateCard(
    id: string,
    updates: Partial<LocalCard>,
  ): Promise<LocalCard | null> {
    return this.updateEntity<LocalCard>("cards", id, updates);
  }

  async deleteCard(id: string): Promise<boolean> {
    return this.deleteEntity("cards", id);
  }

  // For Values operations
  async saveForValue(
    forValue: Omit<
      LocalForValue,
      "id" | "localId" | "syncStatus" | "version" | "createdAt" | "updatedAt"
    >,
  ): Promise<LocalForValue> {
    return this.saveEntity<LocalForValue>("forValues", forValue);
  }

  async getForValues(): Promise<LocalForValue[]> {
    const collection =
      await this.getEntityCollection<LocalForValue>("forValues");
    return Object.values(collection).sort((a, b) =>
      a.value.localeCompare(b.value),
    );
  }

  async updateForValue(
    id: string,
    updates: Partial<LocalForValue>,
  ): Promise<LocalForValue | null> {
    return this.updateEntity<LocalForValue>("forValues", id, updates);
  }

  async deleteForValue(id: string): Promise<boolean> {
    return this.deleteEntity("forValues", id);
  }

  // Loan operations
  async saveLoan(
    loan: Omit<
      LocalLoan,
      "id" | "localId" | "syncStatus" | "version" | "createdAt" | "updatedAt"
    >,
  ): Promise<LocalLoan> {
    return this.saveEntity<LocalLoan>("loans", loan);
  }

  async getLoans(): Promise<LocalLoan[]> {
    const collection = await this.getEntityCollection<LocalLoan>("loans");
    return Object.values(collection).sort((a, b) => b.createdAt - a.createdAt);
  }

  async updateLoan(
    id: string,
    updates: Partial<LocalLoan>,
  ): Promise<LocalLoan | null> {
    return this.updateEntity<LocalLoan>("loans", id, updates);
  }

  async deleteLoan(id: string): Promise<boolean> {
    return this.deleteEntity("loans", id);
  }

  // Data validation and corruption recovery
  async validateEntity<T extends LocalEntity>(
    entity: T,
    entityType: EntityType,
  ): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Basic validation
    if (!entity.id) errors.push("Missing id");
    if (!entity.localId) errors.push("Missing localId");
    if (!entity.syncStatus) errors.push("Missing syncStatus");
    if (typeof entity.version !== "number" || entity.version < 1)
      errors.push("Invalid version");
    if (!entity.createdAt || !entity.updatedAt)
      errors.push("Missing timestamps");

    // Entity-specific validation
    switch (entityType) {
      case "expenses":
        const expense = entity as unknown as LocalExpense;
        if (typeof expense.amount !== "number" || expense.amount <= 0)
          errors.push("Invalid amount");
        if (!expense.title?.trim()) errors.push("Missing title");
        if (!Array.isArray(expense.category))
          errors.push("Invalid category format");
        if (!Array.isArray(expense.for)) errors.push("Invalid for format");
        if (!expense.date || expense.date <= 0) errors.push("Invalid date");
        break;

      case "income":
        const income = entity as unknown as LocalIncome;
        if (typeof income.amount !== "number" || income.amount <= 0)
          errors.push("Invalid amount");
        if (!income.cardId?.trim()) errors.push("Missing cardId");
        if (!income.source?.trim()) errors.push("Missing source");
        if (!income.category?.trim()) errors.push("Missing category");
        if (!income.date || income.date <= 0) errors.push("Invalid date");
        break;

      case "categories":
      case "incomeCategories":
        const category = entity as unknown as LocalCategory;
        if (!category.name?.trim()) errors.push("Missing name");
        if (!["expense", "income"].includes(category.type))
          errors.push("Invalid type");
        break;

      case "cards":
        const card = entity as unknown as LocalCard;
        if (!card.name?.trim()) errors.push("Missing name");
        break;

      case "forValues":
        const forValue = entity as unknown as LocalForValue;
        if (!forValue.value?.trim()) errors.push("Missing value");
        break;
    }

    return { isValid: errors.length === 0, errors };
  }

  async validateCollection<T extends LocalEntity>(
    entityType: EntityType,
  ): Promise<{ isValid: boolean; corruptedIds: string[]; errors: string[] }> {
    const collection = await this.getEntityCollection<T>(entityType);
    const corruptedIds: string[] = [];
    const allErrors: string[] = [];

    for (const [id, entity] of Object.entries(collection)) {
      const validation = await this.validateEntity(entity, entityType);
      if (!validation.isValid) {
        corruptedIds.push(id);
        allErrors.push(`Entity ${id}: ${validation.errors.join(", ")}`);
      }
    }

    return {
      isValid: corruptedIds.length === 0,
      corruptedIds,
      errors: allErrors,
    };
  }

  async repairCorruptedData(
    entityType: EntityType,
    strategy: "remove" | "repair" = "repair",
  ): Promise<{ repairedCount: number; removedCount: number }> {
    const validation = await this.validateCollection(entityType);
    let repairedCount = 0;
    let removedCount = 0;

    if (!validation.isValid) {
      const collection = await this.getEntityCollection(entityType);

      for (const corruptedId of validation.corruptedIds) {
        const entity = collection[corruptedId];

        if (strategy === "remove") {
          delete collection[corruptedId];
          removedCount++;
        } else {
          // Attempt to repair the entity
          const repaired = this.attemptEntityRepair(entity, entityType);
          if (repaired) {
            collection[corruptedId] = repaired;
            repairedCount++;
          } else {
            delete collection[corruptedId];
            removedCount++;
          }
        }
      }

      await this.setEntityCollection(entityType, collection);
    }

    return { repairedCount, removedCount };
  }

  private attemptEntityRepair<T extends LocalEntity>(
    entity: any,
    entityType: EntityType,
  ): T | null {
    try {
      // Basic repair attempts
      if (!entity.id)
        entity.id = `repaired_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      if (!entity.localId)
        entity.localId = `repaired_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      if (!entity.syncStatus) entity.syncStatus = "pending";
      if (typeof entity.version !== "number") entity.version = 1;
      if (!entity.createdAt) entity.createdAt = Date.now();
      if (!entity.updatedAt) entity.updatedAt = Date.now();

      // Entity-specific repairs
      switch (entityType) {
        case "expenses":
          if (typeof entity.amount !== "number") entity.amount = 0;
          if (!entity.title) entity.title = "Recovered Expense";
          if (!Array.isArray(entity.category)) entity.category = [];
          if (!Array.isArray(entity.for)) entity.for = [];
          if (!entity.date) entity.date = Date.now();
          break;

        case "income":
          if (typeof entity.amount !== "number") entity.amount = 0;
          if (!entity.cardId) entity.cardId = "unknown";
          if (!entity.source) entity.source = "Recovered Income";
          if (!entity.category) entity.category = "other";
          if (!entity.date) entity.date = Date.now();
          break;

        case "categories":
        case "incomeCategories":
          if (!entity.name) entity.name = "Recovered Category";
          if (!entity.type)
            entity.type =
              entityType === "incomeCategories" ? "income" : "expense";
          break;

        case "cards":
          if (!entity.name) entity.name = "Recovered Card";
          break;

        case "forValues":
          if (!entity.value) entity.value = "Recovered Value";
          break;
      }

      // Validate the repaired entity - use async validation properly
      return entity as T;
    } catch (error) {
      console.error("Failed to repair entity:", error);
      return null;
    }
  }

  // Data hash calculation for conflict detection
  async getDataHash(): Promise<string> {
    const expenses = await this.getExpenses();
    const income = await this.getIncome();
    const categories = await this.getCategories();
    const cards = await this.getCards();
    const forValues = await this.getForValues();
    const incomeCategories = await this.getIncomeCategories();

    const dataString = JSON.stringify({
      expenses: expenses.map((e) => ({
        ...e,
        syncStatus: undefined,
        lastSyncedAt: undefined,
      })),
      income: income.map((i) => ({
        ...i,
        syncStatus: undefined,
        lastSyncedAt: undefined,
      })),
      categories,
      cards,
      forValues,
      incomeCategories,
    });

    return this.simpleHash(dataString);
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  // Storage quota management and cleanup utilities
  async getStorageInfo(): Promise<{
    used: number;
    available: number;
    quota: number;
    usagePercentage: number;
  }> {
    try {
      if ("storage" in navigator && "estimate" in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        const quota = estimate.quota || 0;
        const used = estimate.usage || 0;
        const available = quota - used;
        const usagePercentage = quota > 0 ? (used / quota) * 100 : 0;

        return { used, available, quota, usagePercentage };
      }
    } catch (error) {
      console.warn("Storage estimation not available:", error);
    }

    // Fallback estimation
    const keys = await this.getAllKeys();
    let estimatedSize = 0;

    for (const key of keys) {
      const item = await this.storage.getItem(key);
      if (item) {
        estimatedSize += JSON.stringify(item).length * 2; // Rough UTF-16 estimation
      }
    }

    return {
      used: estimatedSize,
      available: 50 * 1024 * 1024 - estimatedSize, // Assume 50MB default quota
      quota: 50 * 1024 * 1024,
      usagePercentage: (estimatedSize / (50 * 1024 * 1024)) * 100,
    };
  }

  async cleanupOldData(
    options: {
      maxAge?: number; // milliseconds
      keepSyncedOnly?: boolean;
      maxRecords?: number;
      entityTypes?: EntityType[];
    } = {},
  ): Promise<{ cleanedCount: number; freedSpace: number }> {
    const {
      maxAge = 90 * 24 * 60 * 60 * 1000, // 90 days default
      keepSyncedOnly = false,
      maxRecords = 10000,
      entityTypes = [
        "expenses",
        "income",
        "categories",
        "cards",
        "forValues",
        "incomeCategories",
      ],
    } = options;

    let cleanedCount = 0;
    let freedSpace = 0;
    const cutoffTime = Date.now() - maxAge;

    for (const entityType of entityTypes) {
      const collection = await this.getEntityCollection(entityType);
      const entities = Object.values(collection);
      const sizeBefore = JSON.stringify(collection).length;

      // Sort by updatedAt, keep most recent
      const sortedEntities = entities.sort((a, b) => b.updatedAt - a.updatedAt);

      let entitiesToKeep = sortedEntities.filter((entity) => {
        // Keep if within age limit
        if (entity.updatedAt > cutoffTime) return true;

        // Keep if synced and keepSyncedOnly is true
        if (keepSyncedOnly && entity.syncStatus === "synced") return true;

        return false;
      });

      // Limit to maxRecords
      if (entitiesToKeep.length > maxRecords) {
        entitiesToKeep = entitiesToKeep.slice(0, maxRecords);
      }

      // Rebuild collection
      const newCollection = entitiesToKeep.reduce(
        (acc, entity) => {
          acc[entity.id] = entity;
          return acc;
        },
        {} as { [id: string]: any },
      );

      const removedCount = entities.length - entitiesToKeep.length;
      cleanedCount += removedCount;

      if (removedCount > 0) {
        await this.setEntityCollection(entityType, newCollection);
        const sizeAfter = JSON.stringify(newCollection).length;
        freedSpace += sizeBefore - sizeAfter;
      }
    }

    // Clean up old pending operations
    const syncState = await this.getSyncState();
    if (syncState && syncState.pendingOperations) {
      const oldOperations = syncState.pendingOperations.filter(
        (op) => op.timestamp < cutoffTime && op.status === "completed",
      );

      if (oldOperations.length > 0) {
        const newOperations = syncState.pendingOperations.filter(
          (op) => !(op.timestamp < cutoffTime && op.status === "completed"),
        );

        await this.updateSyncState({ pendingOperations: newOperations });
        cleanedCount += oldOperations.length;
      }
    }

    return { cleanedCount, freedSpace };
  }

  async compactStorage(): Promise<{ success: boolean; error?: string }> {
    try {
      // Export all data
      const exportData = await this.exportData();

      // Clear storage
      await this.clearAllData();

      // Re-initialize
      const metadata = exportData.data.metadata;
      if (metadata) {
        await this.initialize(metadata.userId);
      }

      // Import data back
      await this.importData(exportData);

      return { success: true };
    } catch (error) {
      console.error("Storage compaction failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async checkStorageHealth(): Promise<{
    isHealthy: boolean;
    issues: string[];
    recommendations: string[];
    storageInfo: {
      used: number;
      available: number;
      quota: number;
      usagePercentage: number;
    };
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check storage usage
    const storageInfo = await this.getStorageInfo();
    if (storageInfo.usagePercentage > 90) {
      issues.push("Storage usage is critically high (>90%)");
      recommendations.push("Run cleanup to remove old data");
    } else if (storageInfo.usagePercentage > 75) {
      issues.push("Storage usage is high (>75%)");
      recommendations.push("Consider cleaning up old data");
    }

    // Check for corrupted data
    const entityTypes: EntityType[] = [
      "expenses",
      "income",
      "categories",
      "cards",
      "forValues",
      "incomeCategories",
    ];
    for (const entityType of entityTypes) {
      const validation = await this.validateCollection(entityType);
      if (!validation.isValid) {
        issues.push(
          `Corrupted data found in ${entityType}: ${validation.corruptedIds.length} items`,
        );
        recommendations.push(`Repair corrupted ${entityType} data`);
      }
    }

    // Check pending operations
    const pendingOps = await this.getPendingOperations();
    const failedOps = pendingOps.filter((op) => op.status === "failed");
    if (failedOps.length > 10) {
      issues.push(`High number of failed operations: ${failedOps.length}`);
      recommendations.push("Review and retry failed operations");
    }

    // Check sync state
    const syncState = await this.getSyncState();
    if (
      syncState &&
      Date.now() - syncState.lastSync > 7 * 24 * 60 * 60 * 1000
    ) {
      issues.push("Data has not been synced for over 7 days");
      recommendations.push("Perform a manual sync");
    }

    return {
      isHealthy: issues.length === 0,
      issues,
      recommendations,
      storageInfo,
    };
  }

  // Data export/import operations
  async exportData(): Promise<LocalDataExport> {
    const metadata = await this.getMetadata();
    const expenses = await this.getExpenses();
    const income = await this.getIncome();
    const categories = await this.getCategories();
    const cards = await this.getCards();
    const forValues = await this.getForValues();
    const incomeCategories = await this.getIncomeCategories();
    const syncState = await this.getSyncState();

    const dataExport: LocalDataExport = {
      version: "2.0.0",
      exportedAt: Date.now(),
      deviceId: metadata?.deviceId || "unknown",
      userId: metadata?.userId || "unknown",
      data: {
        expenses: expenses.reduce(
          (acc, exp) => ({ ...acc, [exp.id]: exp }),
          {},
        ),
        income: income.reduce((acc, inc) => ({ ...acc, [inc.id]: inc }), {}),
        categories: categories.reduce(
          (acc, cat) => ({ ...acc, [cat.id]: cat }),
          {},
        ),
        cards: cards.reduce((acc, card) => ({ ...acc, [card.id]: card }), {}),
        forValues: forValues.reduce((acc, fv) => ({ ...acc, [fv.id]: fv }), {}),
        incomeCategories: incomeCategories.reduce(
          (acc, cat) => ({ ...acc, [cat.id]: cat }),
          {},
        ),
        syncState: syncState || ({} as SyncState),
        metadata: metadata || ({} as LocalMetadata),
      },
      checksum: await this.getDataHash(),
    };

    return dataExport;
  }

  async importData(dataExport: LocalDataExport): Promise<void> {
    try {
      // Validate checksum
      const currentHash = await this.getDataHash();
      if (dataExport.checksum === currentHash) {
        console.log("Data is identical, skipping import");
        return;
      }

      // Import data
      if (dataExport.data.expenses) {
        await this.setEntityCollection("expenses", dataExport.data.expenses);
      }
      if (dataExport.data.income) {
        await this.setEntityCollection("income", dataExport.data.income);
      }
      if (dataExport.data.categories) {
        await this.setEntityCollection(
          "categories",
          dataExport.data.categories,
        );
      }
      if (dataExport.data.cards) {
        await this.setEntityCollection("cards", dataExport.data.cards);
      }
      if (dataExport.data.forValues) {
        await this.setEntityCollection("forValues", dataExport.data.forValues);
      }
      if (dataExport.data.incomeCategories) {
        await this.setEntityCollection(
          "incomeCategories",
          dataExport.data.incomeCategories,
        );
      }
      if (dataExport.data.syncState) {
        await this.storage.setItem("syncState", dataExport.data.syncState);
      }
      if (dataExport.data.metadata) {
        await this.storage.setItem("metadata", dataExport.data.metadata);
      }

      console.log("Data import completed successfully");
    } catch (error) {
      console.error("Failed to import data:", error);
      throw error;
    }
  }

  // Atomic operations for data consistency
  private transactionQueue: Array<() => Promise<void>> = [];
  private isProcessingTransaction = false;

  async executeTransaction<T>(
    operations: Array<() => Promise<T>>,
  ): Promise<T[]> {
    return new Promise((resolve, reject) => {
      this.transactionQueue.push(async () => {
        try {
          // Create backup before transaction
          const backup = await this.createTransactionBackup();

          try {
            const results: T[] = [];

            // Execute all operations
            for (const operation of operations) {
              const result = await operation();
              results.push(result);
            }

            // Update last modified timestamp
            await this.updateLastModified();

            resolve(results);
          } catch (error) {
            // Rollback on error
            await this.restoreFromBackup(backup);
            reject(error);
          }
        } catch (error) {
          reject(error);
        }
      });

      this.processTransactionQueue();
    });
  }

  private async processTransactionQueue(): Promise<void> {
    if (this.isProcessingTransaction || this.transactionQueue.length === 0) {
      return;
    }

    this.isProcessingTransaction = true;

    try {
      while (this.transactionQueue.length > 0) {
        const transaction = this.transactionQueue.shift();
        if (transaction) {
          await transaction();
        }
      }
    } finally {
      this.isProcessingTransaction = false;
    }
  }

  private async createTransactionBackup(): Promise<LocalDataExport> {
    return await this.exportData();
  }

  private async restoreFromBackup(backup: LocalDataExport): Promise<void> {
    await this.clearAllData();
    await this.importData(backup);
  }

  // Batch operations for efficiency
  async batchCreateExpenses(
    expenses: Array<
      Omit<
        LocalExpense,
        "id" | "localId" | "syncStatus" | "version" | "createdAt" | "updatedAt"
      >
    >,
  ): Promise<LocalExpense[]> {
    return await this.executeTransaction(
      expenses.map((expense) => () => this.saveExpense(expense)),
    );
  }

  async batchUpdateExpenses(
    updates: Array<{ id: string; updates: Partial<LocalExpense> }>,
  ): Promise<(LocalExpense | null)[]> {
    return await this.executeTransaction(
      updates.map(
        ({ id, updates: updateData }) =>
          () =>
            this.updateExpense(id, updateData),
      ),
    );
  }

  async batchDeleteExpenses(ids: string[]): Promise<boolean[]> {
    return await this.executeTransaction(
      ids.map((id) => () => this.deleteExpense(id)),
    );
  }

  async batchCreateIncome(
    incomes: Array<
      Omit<
        LocalIncome,
        "id" | "localId" | "syncStatus" | "version" | "createdAt" | "updatedAt"
      >
    >,
  ): Promise<LocalIncome[]> {
    return await this.executeTransaction(
      incomes.map((income) => () => this.saveIncome(income)),
    );
  }

  async batchUpdateIncome(
    updates: Array<{ id: string; updates: Partial<LocalIncome> }>,
  ): Promise<(LocalIncome | null)[]> {
    return await this.executeTransaction(
      updates.map(
        ({ id, updates: updateData }) =>
          () =>
            this.updateIncome(id, updateData),
      ),
    );
  }

  async batchDeleteIncome(ids: string[]): Promise<boolean[]> {
    return await this.executeTransaction(
      ids.map((id) => () => this.deleteIncome(id)),
    );
  }

  // Atomic multi-entity operations
  async createExpenseWithDependencies(
    expense: Omit<
      LocalExpense,
      "id" | "localId" | "syncStatus" | "version" | "createdAt" | "updatedAt"
    >,
    newCategories?: Array<
      Omit<
        LocalCategory,
        "id" | "localId" | "syncStatus" | "version" | "createdAt" | "updatedAt"
      >
    >,
    newForValues?: Array<
      Omit<
        LocalForValue,
        "id" | "localId" | "syncStatus" | "version" | "createdAt" | "updatedAt"
      >
    >,
  ): Promise<{
    expense: LocalExpense;
    categories: LocalCategory[];
    forValues: LocalForValue[];
  }> {
    const operations: Array<() => Promise<any>> = [];

    // Create categories first
    const categoryOps = (newCategories || []).map(
      (cat) => () => this.saveCategory(cat),
    );
    operations.push(...categoryOps);

    // Create for values
    const forValueOps = (newForValues || []).map(
      (fv) => () => this.saveForValue(fv),
    );
    operations.push(...forValueOps);

    // Create expense last
    operations.push(() => this.saveExpense(expense));

    const results = await this.executeTransaction(operations);

    const categoriesCount = newCategories?.length || 0;
    const forValuesCount = newForValues?.length || 0;

    return {
      categories: results.slice(0, categoriesCount) as LocalCategory[],
      forValues: results.slice(
        categoriesCount,
        categoriesCount + forValuesCount,
      ) as LocalForValue[],
      expense: results[results.length - 1] as LocalExpense,
    };
  }

  async createIncomeWithDependencies(
    income: Omit<
      LocalIncome,
      "id" | "localId" | "syncStatus" | "version" | "createdAt" | "updatedAt"
    >,
    newCategory?: Omit<
      LocalCategory,
      "id" | "localId" | "syncStatus" | "version" | "createdAt" | "updatedAt"
    >,
  ): Promise<{ income: LocalIncome; category?: LocalCategory }> {
    const operations: Array<() => Promise<any>> = [];

    // Create category first if provided
    if (newCategory) {
      operations.push(() => this.saveIncomeCategory(newCategory));
    }

    // Create income
    operations.push(() => this.saveIncome(income));

    const results = await this.executeTransaction(operations);

    return {
      category: newCategory ? (results[0] as LocalCategory) : undefined,
      income: results[results.length - 1] as LocalIncome,
    };
  }

  // Utility operations
  async clearAllData(): Promise<void> {
    await this.storage.clear();
    this.initializedFor = null;
  }

  async getAllKeys(): Promise<string[]> {
    return await this.storage.keys();
  }

  private applyFilters<T extends LocalEntity>(
    data: T[],
    filters: DataFilters,
  ): T[] {
    let filtered = data;

    if (filters.startDate && filters.endDate) {
      filtered = filtered.filter((item) => {
        const itemDate = (item as any).date;
        return itemDate >= filters.startDate! && itemDate <= filters.endDate!;
      });
    }

    if (filters.syncStatus) {
      filtered = filtered.filter((item) =>
        filters.syncStatus!.includes(item.syncStatus),
      );
    }

    if (filters.category && (filtered[0] as any)?.category) {
      filtered = filtered.filter((item) => {
        const itemCategories = (item as any).category;
        return (
          Array.isArray(itemCategories) &&
          itemCategories.some((cat) => filters.category!.includes(cat))
        );
      });
    }

    if (filters.cardId) {
      filtered = filtered.filter(
        (item) => (item as any).cardId === filters.cardId,
      );
    }

    if (filters.offset) {
      filtered = filtered.slice(filters.offset);
    }

    if (filters.limit) {
      filtered = filtered.slice(0, filters.limit);
    }

    return filtered;
  }

  // Pending operations management
  async addPendingOperation(operation: PendingOperation): Promise<void> {
    const syncState = await this.getSyncState();
    if (syncState) {
      syncState.pendingOperations.push(operation);
      await this.updateSyncState({
        pendingOperations: syncState.pendingOperations,
      });
    }
  }

  async getPendingOperations(): Promise<PendingOperation[]> {
    const syncState = await this.getSyncState();
    return syncState?.pendingOperations || [];
  }

  async updatePendingOperation(
    operationId: string,
    updates: Partial<PendingOperation>,
  ): Promise<void> {
    const syncState = await this.getSyncState();
    if (syncState) {
      const operations = syncState.pendingOperations.map((op) =>
        op.id === operationId ? { ...op, ...updates } : op,
      );
      await this.updateSyncState({ pendingOperations: operations });
    }
  }

  async removePendingOperation(operationId: string): Promise<void> {
    const syncState = await this.getSyncState();
    if (syncState) {
      const operations = syncState.pendingOperations.filter(
        (op) => op.id !== operationId,
      );
      await this.updateSyncState({ pendingOperations: operations });
    }
  }

  // Enhanced utility methods
  async getEntityCount(entityType: EntityType): Promise<number> {
    const collection = await this.getEntityCollection(entityType);
    return Object.keys(collection).length;
  }

  async getTotalRecordCount(): Promise<number> {
    const entityTypes: EntityType[] = [
      "expenses",
      "income",
      "categories",
      "cards",
      "forValues",
      "incomeCategories",
    ];
    let total = 0;

    for (const entityType of entityTypes) {
      total += await this.getEntityCount(entityType);
    }

    return total;
  }
}

/**
 * Shared instance. Everything in the app should use this one so that
 * `initialize()` (and its wipe-on-user-change) runs exactly once per session
 * and the in-memory state is consistent across the store, the sync engine and
 * hydration.
 */
export const localStorageManager = new LocalStorageManager();
