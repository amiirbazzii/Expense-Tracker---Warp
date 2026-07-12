/**
 * HydrationService — Seeds IndexedDB from Convex on first online login.
 *
 * Fetches all primary collections via ConvexClient and merges them into
 * LocalDataStore's IndexedDB. Items with pending mutations in the queue
 * are never overwritten — local writes always win.
 */

import { ConvexClient } from "convex/browser";
import { api } from "../../../convex/_generated/api";
import { localDataStore } from "../store/LocalDataStore";
import { MutationQueueManager } from "../queue/MutationQueueManager";
import { LocalStorageManager } from "../storage/LocalStorageManager";
import { EntityType } from "../types/local-storage";

// ── Types ───────────────────────────────────────────────────────────────────

interface HydrationState {
  hydrated: boolean;
  inProgress: boolean;
}

// ── Service ─────────────────────────────────────────────────────────────────

class HydrationService {
  private state: HydrationState = { hydrated: false, inProgress: false };
  private queue = new MutationQueueManager();
  private storage = new LocalStorageManager();

  isHydrated(): boolean {
    return this.state.hydrated;
  }

  isInProgress(): boolean {
    return this.state.inProgress;
  }

  /**
   * Full hydration: fetch all Convex collections and seed IndexedDB.
   *
   * Safe to call multiple times — skips if already hydrated or in progress.
   * Must be called after LocalDataStore.init() with a valid userId.
   */
  async hydrate(
    client: ConvexClient,
    token: string,
  ): Promise<void> {
    if (this.state.hydrated || this.state.inProgress) return;

    this.state.inProgress = true;
    console.log("[HydrationService] Starting hydration");

    try {
      // Snapshot pending mutation IDs so we never overwrite local writes
      const pendingIds = await this.buildPendingIdsMap();

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

      // Merge into IndexedDB — pending local items are never overwritten
      await this.mergeCollection("expenses", expenses, pendingIds.expenses);
      await this.mergeCollection("income", income, pendingIds.income);
      await this.mergeCollection("categories", categories, pendingIds.categories);
      await this.mergeCollection("forValues", forValues, pendingIds.forValues);
      await this.mergeCollection("cards", cards, pendingIds.cards);
      await this.mergeCollection(
        "incomeCategories",
        incomeCategories,
        pendingIds.incomeCategories,
      );
      await this.mergeCollection("loans", loans, pendingIds.loans);

      // Re-read all collections into memory and notify subscribers
      await localDataStore.refresh();

      this.state.hydrated = true;
      console.log("[HydrationService] Hydration complete");
    } catch (err) {
      console.error("[HydrationService] Hydration failed:", err);
      // Allow retry on next attempt
      this.state.hydrated = false;
    } finally {
      this.state.inProgress = false;
    }
  }

  /** Reset state — called on logout so the next login re-hydrates. */
  reset(): void {
    this.state = { hydrated: false, inProgress: false };
  }

  // ── Pending-mutation tracking ───────────────────────────────────────────

  /**
   * Build a map of entity IDs that have pending mutations in the queue.
   * Each mutation's payload contains the entity ID (expenseId, incomeId, etc.).
   * We extract these so hydration never overwrites a pending local write.
   */
  private async buildPendingIdsMap(): Promise<Record<string, Set<string>>> {
    const mutations = await this.queue.getAll();
    const ids: Record<string, Set<string>> = {
      expenses: new Set(),
      income: new Set(),
      categories: new Set(),
      forValues: new Set(),
      cards: new Set(),
      incomeCategories: new Set(),
      loans: new Set(),
    };

    for (const m of mutations) {
      const p = m.payload;
      switch (m.action) {
        case "expenses:createExpense":
        case "expenses:updateExpense":
        case "expenses:deleteExpense":
          if (p.expenseId) ids.expenses.add(p.expenseId);
          break;
        case "income:createIncome":
        case "income:updateIncome":
        case "income:deleteIncome":
          if (p.incomeId) ids.income.add(p.incomeId);
          break;
        case "expenses:createCategory":
          if (p.name) ids.categories.add(p.name);
          break;
        case "expenses:createForValue":
          if (p.value) ids.forValues.add(p.value);
          break;
        case "cards:addCard":
          if (p.__localId) ids.cards.add(p.__localId);
          break;
        case "cards:updateCard":
        case "cards:deleteCard":
          if (p.cardId) ids.cards.add(p.cardId);
          break;
        case "loans:createLoan":
        case "loans:updateLoan":
        case "loans:deleteLoan":
        case "loans:payInstallment":
          if (p.loanId) ids.loans.add(p.loanId);
          break;
      }
    }

    return ids;
  }

  // ── IndexedDB merge ─────────────────────────────────────────────────────

  /**
   * Merge a single collection of Convex documents into IndexedDB.
   *
   * For each server document:
   *  - If its ID matches a pending mutation → skip (local write wins)
   *  - If it already exists locally → update
   *  - If it's new → insert
   */
  private async mergeCollection(
    collection: EntityType,
    serverDocs: any[],
    pendingIds: Set<string>,
  ): Promise<void> {
    const localCollection = await this.storage.getEntityCollection(collection);
    const localById = new Map(Object.entries(localCollection));

    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    for (const doc of serverDocs) {
      const docId = doc._id;

      // Skip entities with pending mutations — local state wins
      if (pendingIds.has(docId)) {
        skipped++;
        continue;
      }

      const existing = localById.get(docId);
      if (existing) {
        // LWW: only update if server data is newer than local data
        const serverUpdatedAt = doc.updatedAt || doc._creationTime || Date.now();
        const localUpdatedAt = existing.updatedAt || 0;

        if (serverUpdatedAt >= localUpdatedAt) {
          await this.storage.updateEntity(collection, docId, this.toLocalFields(collection, doc));
          updated++;
        } else {
          skipped++;
        }
      } else {
        // New entity from server — insert into IndexedDB
        await this.storage.insertEntity(collection, docId, this.toLocalFields(collection, doc));
        inserted++;
      }
    }

    console.log(
      `[HydrationService] ${collection}: +${inserted} new, ~${updated} updated, =${skipped} skipped (pending)`,
    );
  }

  /**
   * Map Convex document fields to LocalEntity base fields.
   * The storage layer adds id, localId, syncStatus, version, timestamps.
   */
  private toLocalFields(collection: string, doc: any): Record<string, any> {
    const base = { updatedAt: doc.updatedAt || doc._creationTime || Date.now() };
    switch (collection) {
      case "expenses":
        return {
          ...base,
          cloudId: doc._id,
          amount: doc.amount,
          title: doc.title,
          category: doc.category,
          for: doc.for,
          date: doc.date,
          cardId: doc.cardId,
        };
      case "income":
        return {
          ...base,
          cloudId: doc._id,
          amount: doc.amount,
          cardId: doc.cardId,
          date: doc.date,
          source: doc.source,
          category: doc.category,
          notes: doc.notes,
        };
      case "categories":
        return {
          ...base,
          cloudId: doc._id,
          name: doc.name,
        };
      case "incomeCategories":
        return {
          ...base,
          cloudId: doc._id,
          name: doc.name,
          type: "income" as const,
        };
      case "forValues":
        return {
          ...base,
          cloudId: doc._id,
          value: doc.value,
        };
      case "cards":
        return {
          ...base,
          cloudId: doc._id,
          name: doc.name,
          isArchived: doc.isArchived,
        };
      case "loans":
        return {
          ...base,
          cloudId: doc._id,
          name: doc.name,
          totalAmount: doc.totalAmount,
          totalInstallments: doc.totalInstallments,
          paidInstallments: doc.paidInstallments,
          installmentAmount: doc.installmentAmount,
          monthlyPaymentDay: doc.monthlyPaymentDay,
          startMonth: doc.startMonth,
          startYear: doc.startYear,
        };
      default:
        return { ...base, cloudId: doc._id, ...doc };
    }
  }
}

// ── Singleton ───────────────────────────────────────────────────────────────

export const hydrationService = new HydrationService();
