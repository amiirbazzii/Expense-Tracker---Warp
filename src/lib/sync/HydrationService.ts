/**
 * HydrationService — Reconciles IndexedDB with Convex.
 *
 * Fetches all primary collections via ConvexClient and merges them into
 * LocalDataStore's IndexedDB:
 *
 *  • A server document is matched to an existing local row by its `cloudId`,
 *    never inserted a second time under its Convex id.
 *  • Rows with unsent local changes are never overwritten — local writes win.
 *  • References between rows (a transaction's `cardId`) are rewritten to the
 *    local key of the row they point at, so everything stored locally speaks
 *    one id vocabulary.
 *  • Rows that are fully synced but no longer exist on the server are deleted,
 *    so a deletion made on another device propagates here.
 *
 * Unlike the first version this is safe to run repeatedly: `hydrate()` is
 * cheap to call on reconnect, on tab focus, and on a timer.
 */

import { ConvexClient } from "convex/browser";
import { api } from "../../../convex/_generated/api";
import { localDataStore } from "../store/LocalDataStore";
import { mutationQueue } from "../queue/MutationQueueManager";
import { localStorageManager } from "../storage/LocalStorageManager";
import { EntityType, LocalEntity } from "../types/local-storage";

// ── Types ───────────────────────────────────────────────────────────────────

interface HydrationState {
  hydrated: boolean;
  inProgress: boolean;
  lastHydratedAt: number;
}

/** Ignore refresh requests that arrive within this window of the last run. */
const MIN_REHYDRATE_INTERVAL_MS = 30_000;

/**
 * Collections whose Convex query returns the user's complete set, so a row
 * missing from the response really was deleted upstream.
 *
 * `categories` and `incomeCategories` are deliberately absent: their queries
 * filter out archived rows, so "missing from the response" would wrongly
 * delete every category the user has archived.
 */
const DELETION_AUTHORITATIVE: ReadonlySet<string> = new Set([
  "expenses",
  "income",
  "cards",
  "forValues",
  "loans",
]);

// ── Service ─────────────────────────────────────────────────────────────────

class HydrationService {
  private state: HydrationState = {
    hydrated: false,
    inProgress: false,
    lastHydratedAt: 0,
  };
  private queue = mutationQueue;
  private storage = localStorageManager;

  isHydrated(): boolean {
    return this.state.hydrated;
  }

  isInProgress(): boolean {
    return this.state.inProgress;
  }

  /**
   * Pull every Convex collection and reconcile it into IndexedDB.
   *
   * The first call seeds the database. Later calls refresh it — that is how a
   * change made on another device reaches this one. Concurrent calls collapse,
   * and repeat calls inside `MIN_REHYDRATE_INTERVAL_MS` are ignored unless
   * `force` is set.
   */
  async hydrate(
    client: ConvexClient,
    token: string,
    options: { force?: boolean } = {},
  ): Promise<void> {
    if (this.state.inProgress) return;

    const sinceLast = Date.now() - this.state.lastHydratedAt;
    if (
      this.state.hydrated &&
      !options.force &&
      sinceLast < MIN_REHYDRATE_INTERVAL_MS
    ) {
      return;
    }

    this.state.inProgress = true;
    console.log("[HydrationService] Starting hydration");

    try {
      // Rows touched by a queued mutation must not be overwritten by the
      // server's older copy.
      const pendingLocalIds = await this.buildPendingIdSet();

      // Fetch all collections from Convex in parallel
      const [expenses, income, categories, forValues, cards, incomeCategories, loans] =
        await Promise.all([
          client.query(api.expenses.getExpenses, { token }),
          client.query(api.cardsAndIncome.getIncome, { token }),
          client.query(api.expenses.getCategories, { token }),
          client.query(api.expenses.getForValues, { token }),
          client.query(api.cardsAndIncome.getMyCards, { token }),
          client.query(api.cardsAndIncome.getIncomeCategories, { token }),
          client.query(api.loans.getLoans, { token }),
        ]);

      // Cards first: transactions reference them, and the merges below need a
      // complete cloudId → local key map to rewrite those references.
      await this.mergeCollection("cards", cards, pendingLocalIds);
      const cardKeyByCloudId = await this.storage.getCloudIdIndex("cards");

      await this.mergeCollection("categories", categories, pendingLocalIds);
      await this.mergeCollection(
        "incomeCategories",
        incomeCategories,
        pendingLocalIds,
      );
      await this.mergeCollection("forValues", forValues, pendingLocalIds);
      await this.mergeCollection("loans", loans, pendingLocalIds);
      await this.mergeCollection(
        "expenses",
        expenses,
        pendingLocalIds,
        cardKeyByCloudId,
      );
      await this.mergeCollection(
        "income",
        income,
        pendingLocalIds,
        cardKeyByCloudId,
      );

      // Re-read all collections into memory and notify subscribers
      await localDataStore.refresh();

      this.state.hydrated = true;
      this.state.lastHydratedAt = Date.now();
      console.log("[HydrationService] Hydration complete");
    } catch (err) {
      console.error("[HydrationService] Hydration failed:", err);
      // Leave `hydrated` as it was so a later attempt retries.
    } finally {
      this.state.inProgress = false;
    }
  }

  /** Reset state — called on logout so the next login re-hydrates. */
  reset(): void {
    this.state = { hydrated: false, inProgress: false, lastHydratedAt: 0 };
  }

  // ── Pending-mutation tracking ───────────────────────────────────────────

  /**
   * Local keys referenced by anything still sitting in the mutation queue.
   *
   * Reading ids straight off the queue payloads — rather than enumerating each
   * action's shape — means a newly added mutation type cannot accidentally let
   * hydration clobber an unsent local write.
   */
  private async buildPendingIdSet(): Promise<Set<string>> {
    const mutations = await this.queue.getAll();
    const ids = new Set<string>();

    const ID_FIELDS = [
      "__localId",
      "expenseId",
      "incomeId",
      "cardId",
      "loanId",
      "categoryId",
      "localExpenseId",
      "localIncomeId",
    ];

    for (const mutation of mutations) {
      const payload = mutation.payload ?? {};
      for (const field of ID_FIELDS) {
        const value = payload[field];
        if (typeof value === "string") ids.add(value);
      }
    }

    return ids;
  }

  // ── IndexedDB merge ─────────────────────────────────────────────────────

  /**
   * Reconcile one collection of Convex documents into IndexedDB.
   *
   * For each server document:
   *  - resolve it to an existing local row via `cloudId` (or its own key)
   *  - skip it if that row has unsent local changes
   *  - otherwise update in place, or insert when it is new here
   *
   * Then remove synced local rows the server no longer has.
   */
  private async mergeCollection(
    collection: EntityType,
    serverDocs: any[],
    pendingLocalIds: Set<string>,
    cardKeyByCloudId?: Map<string, string>,
  ): Promise<void> {
    const localCollection =
      await this.storage.getEntityCollection<LocalEntity>(collection);

    // cloudId → local key, for rows already linked to the server.
    const keyByCloudId = new Map<string, string>();
    for (const [key, row] of Object.entries(localCollection)) {
      if (row.cloudId) keyByCloudId.set(row.cloudId, key);
    }

    let skipped = 0;
    const seenKeys = new Set<string>();

    // Accumulate the whole pass, then write each collection ONCE. Writing per
    // document rewrote the entire collection N times and froze the UI on
    // reconnect, when hydration and queue drain fire together.
    const updates: Record<string, Record<string, any>> = {};
    const inserts: Record<string, Record<string, any>> = {};

    for (const doc of serverDocs) {
      const cloudId = doc._id;
      const key =
        keyByCloudId.get(cloudId) ??
        (localCollection[cloudId] ? cloudId : undefined);
      const fields = this.toLocalFields(collection, doc, cardKeyByCloudId);

      if (key === undefined) {
        // Unknown here — insert under the Convex id.
        inserts[cloudId] = fields;
        seenKeys.add(cloudId);
        continue;
      }

      seenKeys.add(key);
      const existing = localCollection[key];

      // Never overwrite a row with an unsent local change.
      if (existing.syncStatus !== "synced" || pendingLocalIds.has(key)) {
        skipped++;
        continue;
      }

      // Last-write-wins against the local copy.
      const serverUpdatedAt = fields.updatedAt ?? 0;
      if (serverUpdatedAt >= (existing.updatedAt ?? 0)) {
        updates[key] = fields;
      } else {
        skipped++;
      }
    }

    const inserted = Object.keys(inserts).length;
    const updated = Object.keys(updates).length;
    await this.storage.bulkMergeServerDocs(collection, updates, inserts);

    // Anything synced that the server no longer returns was deleted elsewhere.
    // Rows that never reached the server are always kept, and collections
    // whose query is filtered server-side never take part.
    let removed = 0;
    if (DELETION_AUTHORITATIVE.has(collection)) {
      const removable = Object.keys(localCollection).filter(
        (key) => !seenKeys.has(key) && !pendingLocalIds.has(key),
      );
      removed = await this.storage.removeSyncedEntities(collection, removable);
    }

    console.log(
      `[HydrationService] ${collection}: +${inserted} new, ~${updated} updated, =${skipped} kept local, -${removed} deleted upstream`,
    );
  }

  /**
   * Map Convex document fields to LocalEntity base fields.
   * The storage layer adds id, localId, syncStatus, version.
   */
  private toLocalFields(
    collection: string,
    doc: any,
    cardKeyByCloudId?: Map<string, string>,
  ): Record<string, any> {
    // A transaction's cardId arrives as a Convex id; store the local key of
    // the card row instead, so every local reference uses one vocabulary.
    const localCardId = (cloudCardId: string | undefined) =>
      cloudCardId
        ? (cardKeyByCloudId?.get(cloudCardId) ?? cloudCardId)
        : cloudCardId;

    const base = {
      cloudId: doc._id,
      updatedAt: doc.updatedAt || doc._creationTime || Date.now(),
      createdAt: doc._creationTime || Date.now(),
    };

    switch (collection) {
      case "expenses":
        return {
          ...base,
          amount: doc.amount,
          title: doc.title,
          category: doc.category,
          for: doc.for,
          date: doc.date,
          cardId: localCardId(doc.cardId),
          loanId: doc.loanId,
          installmentIndex: doc.installmentIndex,
        };
      case "income":
        return {
          ...base,
          amount: doc.amount,
          cardId: localCardId(doc.cardId),
          date: doc.date,
          source: doc.source,
          category: doc.category,
          notes: doc.notes,
        };
      case "categories":
        return {
          ...base,
          name: doc.name,
          type: "expense" as const,
          isArchived: doc.isArchived,
        };
      case "incomeCategories":
        return {
          ...base,
          name: doc.name,
          type: "income" as const,
          isArchived: doc.isArchived,
        };
      case "forValues":
        return {
          ...base,
          value: doc.value,
        };
      case "cards":
        return {
          ...base,
          name: doc.name,
          isArchived: doc.isArchived,
        };
      case "loans":
        return {
          ...base,
          name: doc.name,
          totalAmount: doc.totalAmount,
          totalInstallments: doc.totalInstallments,
          paidInstallments: doc.paidInstallments,
          installmentAmount: doc.installmentAmount,
          monthlyPaymentDay: doc.monthlyPaymentDay,
          startMonth: doc.startMonth,
          startYear: doc.startYear,
          userId: doc.userId,
        };
      default:
        return { ...base, ...doc };
    }
  }
}

// ── Singleton ───────────────────────────────────────────────────────────────

export const hydrationService = new HydrationService();
