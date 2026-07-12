/**
 * SyncEngine — Silent Background Sync
 *
 * Responsibilities:
 *  1. Listen for `window.online` events to drain the queue immediately.
 *  2. Run a 30-second periodic fallback drain while online.
 *  3. Process mutations from MutationQueueManager in strict FIFO order.
 *  4. Stamp the current auth token onto every mutation payload right before
 *     execution, so each background mutation carries the correct, freshest
 *     authentication state (the Convex backend resolves the user via
 *     `args.token`, not `ctx.auth`).
 *  5. On success: atomically dequeue the item.
 *  6. On failure: halt and wait for the next trigger.
 *  7. On logout (clearAndStop): wipe all IndexedDB data, then stop.
 *
 * This class is completely decoupled from the React tree.
 * It does NOT share state with OfflineFirstProvider.
 */

import { ConvexClient } from "convex/browser";
import { api } from "../../../convex/_generated/api";
import { MutationQueueManager } from "../queue/MutationQueueManager";
import { LocalStorageManager } from "../storage/LocalStorageManager";

// ── Action router ─────────────────────────────────────────────────────────────
// Maps the opaque `action` string stored in the queue to the correct
// Convex FunctionReference. Keep in sync with LocalDataStore enqueue calls.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ACTION_MAP: Record<string, any> = {
  // Expenses
  "expenses:createExpense": api.expenses.createExpense,
  "expenses:updateExpense": api.expenses.updateExpense,
  "expenses:deleteExpense": api.expenses.deleteExpense,
  "expenses:createCategory": api.expenses.createCategory,
  "expenses:createForValue": api.expenses.createForValue,

  // Income
  "income:createIncome": api.cardsAndIncome.createIncome,
  "income:updateIncome": api.cardsAndIncome.updateIncome,
  "income:deleteIncome": api.cardsAndIncome.deleteIncome,

  // Cards
  "cards:addCard": api.cardsAndIncome.addCard,
  "cards:deleteCard": api.cardsAndIncome.deleteCard,

  // Loans
  "loans:createLoan": api.loans.createLoan,
  "loans:updateLoan": api.loans.updateLoan,
  "loans:deleteLoan": api.loans.deleteLoan,
  "loans:payInstallment": api.loans.payInstallment,

  // Transfers
  "transferFunds": api.cardsAndIncome.transferFunds,
};

// ── Names of all IndexedDB databases created by localforage in this app ──────
// These are deleted wholesale on logout.
const IDB_DATABASES_TO_WIPE = ["ExpenseTrackerV2"];

// ── SyncEngine ────────────────────────────────────────────────────────────────

export class SyncEngine {
  private client: ConvexClient | null = null;
  private queue = new MutationQueueManager();
  private storage = new LocalStorageManager();

  // The auth token (tokenIdentifier) used to authenticate every mutation.
  // Updated via `setAuthToken` when the session token refreshes.
  private authToken: string | null = null;

  // Maps local IDs (e.g. "local_...") to their Convex document IDs.
  // Populated when a create mutation succeeds and returns a Convex ID.
  // Used to translate ID references in subsequent update/delete mutations.
  private localToConvexId: Map<string, string> = new Map();

  // True when the browser reports network connectivity.
  private isOnline: boolean =
    typeof navigator !== "undefined" ? navigator.onLine : true;

  // True while a drain pass is in flight — prevents concurrent runs.
  private isDraining = false;

  // Interval handle for the 30-second periodic fallback.
  private intervalId: ReturnType<typeof setInterval> | null = null;

  // Named handler references so addEventListener/removeEventListener are paired.
  private handleOnline = () => {
    this.isOnline = true;
    console.log("[SyncEngine] Online — triggering drain");
    this.drain();
  };

  private handleOffline = () => {
    this.isOnline = false;
    console.log("[SyncEngine] Offline — pausing sync");
  };

  /** Return the active ConvexClient instance, or null if the engine isn't running. */
  getClient(): ConvexClient | null {
    return this.client;
  }

  /** Return the engine's own online state (mirrors window online/offline events). */
  getIsOnline(): boolean {
    return this.isOnline;
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  /**
   * Start the engine.
   *
   * @param convexUrl  The Convex deployment URL (e.g. process.env.NEXT_PUBLIC_CONVEX_URL).
   * @param authToken  The current auth token (tokenIdentifier). Stamped onto every
   *                   mutation payload in `drain()` so background mutations authenticate
   *                   correctly. If the engine is already running, the token is refreshed
   *                   and a drain is triggered.
   */
  start(convexUrl: string, authToken: string): void {
    // Always keep the freshest token, even on re-entry.
    this.setAuthToken(authToken);

    if (this.client) {
      // Already running — token may have changed, so trigger a drain.
      this.drain();
      return;
    }

    console.log("[SyncEngine] Starting");

    this.client = new ConvexClient(convexUrl);

    // Register connectivity listeners.
    window.addEventListener("online", this.handleOnline);
    window.addEventListener("offline", this.handleOffline);

    // 30-second periodic fallback.
    this.intervalId = setInterval(() => {
      if (this.isOnline) {
        this.drain();
      }
    }, 30_000);

    // Drain immediately in case there are queued items from offline sessions.
    if (this.isOnline) {
      this.drain();
    }
  }

  /**
   * Update the auth token used to authenticate mutations.
   *
   * Call this when the session token refreshes (e.g. after a revalidation).
   * Triggers a drain so any mutations blocked on an expired token retry
   * immediately with the new one.
   */
  setAuthToken(authToken: string): void {
    if (!authToken) return;
    if (this.authToken === authToken) return;
    this.authToken = authToken;
    console.log("[SyncEngine] Auth token updated");
    // If the engine is live, retry anything that may have been waiting.
    if (this.client) {
      this.drain();
    }
  }

  /**
   * Stop the engine without wiping data.
   * Clears timers and event listeners; leaves the queue intact.
   */
  stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    window.removeEventListener("online", this.handleOnline);
    window.removeEventListener("offline", this.handleOffline);

    if (this.client) {
      this.client.close();
      this.client = null;
    }

    this.authToken = null;

    console.log("[SyncEngine] Stopped");
  }

  /**
   * Wipe-on-logout: clear the pending queue, delete all IndexedDB databases,
   * then stop the engine.
   *
   * Call this from the logout handler to guarantee session isolation.
   */
  async clearAndStop(): Promise<void> {
    console.log("[SyncEngine] Wiping local data for logout");

    // 1. Clear the mutation queue first so nothing leaks across sessions.
    await this.queue.clear();
    this.localToConvexId.clear();

    // 2. Delete every IndexedDB database belonging to this app.
    if (typeof indexedDB !== "undefined") {
      const deletePromises = IDB_DATABASES_TO_WIPE.map(
        (name) =>
          new Promise<void>((resolve) => {
            const req = indexedDB.deleteDatabase(name);
            req.onsuccess = () => {
              console.log(`[SyncEngine] Deleted IndexedDB: ${name}`);
              resolve();
            };
            req.onerror = () => {
              console.warn(
                `[SyncEngine] Could not delete IndexedDB: ${name}`,
                req.error,
              );
              resolve(); // Non-fatal — proceed regardless.
            };
            req.onblocked = () => {
              // Another tab has the DB open; it will be deleted when that tab closes.
              console.warn(`[SyncEngine] IndexedDB deletion blocked: ${name}`);
              resolve();
            };
          }),
      );

      await Promise.all(deletePromises);
    }

    // 3. Stop timers and listeners.
    this.stop();
  }

  // ── Public status helpers ────────────────────────────────────────────

  /** Returns the number of mutations waiting in the queue. */
  async getPendingCount(): Promise<number> {
    return this.queue.size();
  }

  /** Returns whether the engine is currently draining the queue. */
  getIsDraining(): boolean {
    return this.isDraining;
  }

  // ── FIFO drain ────────────────────────────────────────────────────────────

  /**
   * Drain the pending mutation queue in strict FIFO order.
   *
   * - Only one drain runs at a time (re-entrant guard).
   * - Halts immediately on the first network failure.
   * - Each mutation is removed from the queue only after Convex confirms success.
   * - The current auth token is stamped onto every payload at execution time,
   *   so a refreshed token applies to items enqueued with a stale one.
   */
  private async drain(): Promise<void> {
    if (this.isDraining || !this.client || !this.isOnline) return;
    // Without a token, mutations will be rejected — wait for one to be set.
    if (!this.authToken) return;

    this.isDraining = true;
    console.log("[SyncEngine] Drain started");

    try {
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const mutation = await this.queue.peek();
        if (!mutation) break; // Queue is empty — we're done.

        const fn = ACTION_MAP[mutation.action];
        if (!fn) {
          // Unknown action — skip it permanently to unblock the queue.
          console.warn(
            `[SyncEngine] Unknown action "${mutation.action}" — discarding`,
          );
          await this.queue.dequeue();
          continue;
        }

        try {
          // ── Build payload ─────────────────────────────────────────────
          // 1. Stamp the current auth token.
          // 2. Translate any local ID references to Convex IDs.
          // 3. Strip internal fields (__localId, localExpenseId, localIncomeId) before sending to Convex.
          const { __localId: _localId, localExpenseId: _lei, localIncomeId: _lii, ...rest } = mutation.payload;
          const payload: Record<string, unknown> = {
            ...rest,
            token: this.authToken,
          };

          // Translate local IDs to Convex IDs for cardId, incomeId, expenseId, and transfer fields
          for (const idField of ["cardId", "incomeId", "expenseId", "fromCardId", "toCardId"]) {
            if (
              typeof payload[idField] === "string" &&
              (payload[idField] as string).startsWith("local_") &&
              this.localToConvexId.has(payload[idField] as string)
            ) {
              payload[idField] = this.localToConvexId.get(payload[idField] as string)!;
            }
          }

          // Execute the Convex mutation.
          const result = await this.client.mutation(fn, payload);

          // ── Capture ID mapping and persist to IndexedDB ────────────
          if (_localId && result) {
            const convexId = typeof result === "string" ? result : (result as any)._id ?? (result as any).id;
            if (convexId) {
              this.localToConvexId.set(_localId, convexId);
              console.log(`[SyncEngine] 📍 mapped ${mutation.action} ${_localId} → ${convexId}`);

              // Persist cloudId to IndexedDB so the read layer can deduplicate
              const entityType = mutation.action.split(":")[0];
              const collectionMap: Record<string, string> = {
                expenses: "expenses",
                income: "income",
                cards: "cards",
                categories: "categories",
                forValues: "forValues",
                loans: "loans",
              };
              const collection = collectionMap[entityType] || entityType;
              try {
                await this.storage.markEntityAsSynced(collection, _localId, convexId);
              } catch (err) {
                console.warn(`[SyncEngine] Failed to persist cloudId for ${_localId}:`, err);
              }
            }
          }

          // ── Special: link local transfer records to cloud IDs ──────
          if (mutation.action === "transferFunds" && result) {
            const { localExpenseId, localIncomeId } = mutation.payload;
            const res = result as any;
            const cloudExpenseId = res.expenseId;
            const cloudIncomeId = res.incomeId;

            console.log("[SyncEngine] transferFunds response:", res);
            console.log("[SyncEngine] local IDs:", { localExpenseId, localIncomeId });

            if (localExpenseId && cloudExpenseId) {
              await this.storage.markEntityAsSynced("expenses", localExpenseId, cloudExpenseId);
              console.log(`[SyncEngine] 📍 transferFunds: expense ${localExpenseId} → ${cloudExpenseId}`);
            } else {
              console.warn("[SyncEngine] ⚠ Could not link expense:", { localExpenseId, cloudExpenseId });
            }

            if (localIncomeId && cloudIncomeId) {
              await this.storage.markEntityAsSynced("income", localIncomeId, cloudIncomeId);
              console.log(`[SyncEngine] 📍 transferFunds: income ${localIncomeId} → ${cloudIncomeId}`);
            } else {
              console.warn("[SyncEngine] ⚠ Could not link income:", { localIncomeId, cloudIncomeId });
            }

            // Refresh the store so deduplicateEntities() picks up the cloudId links
            try {
              const { localDataStore } = await import("../store");
              await localDataStore.refresh();
            } catch (err) {
              console.warn("[SyncEngine] Failed to refresh store after transferFunds:", err);
            }
          }

          // ✓ Success — atomically remove the head item.
          await this.queue.dequeue();
          console.log(
            `[SyncEngine] ✓ synced: ${mutation.action} (${mutation.id})`,
          );
        } catch (err) {
          // Distinguish auth errors from transient network/server errors.
          const isAuthError =
            err instanceof Error &&
            (err.message.includes("Authentication required") ||
              err.message.includes("Unauthorized") ||
              err.message.includes("Invalid token"));

          if (isAuthError) {
            // Authentication failed — the token is invalid/expired.
            // 1. Invalidate the local token so we don't retry with it.
            // 2. Dequeue this mutation (it's poisoned with a bad token).
            // 3. Continue to next mutation — if a fresh token arrives via
            //    setAuthToken, subsequent mutations will use it.
            console.warn(
              `[SyncEngine] ✗ Auth error on ${mutation.action} (${mutation.id}) — dequeuing poisoned item`,
              err,
            );
            this.authToken = null;
            await this.queue.dequeue();
            continue;
          }

          // ✗ Network / server error (non-auth) — halt and retry on
          //   next trigger. The item stays at the head.
          console.warn(
            `[SyncEngine] ✗ halted on: ${mutation.action} (${mutation.id})`,
            err,
          );
          break;
        }
      }
    } finally {
      this.isDraining = false;
      console.log("[SyncEngine] Drain complete");
    }
  }
}

// ── Singleton ─────────────────────────────────────────────────────────────────
// One engine per browser tab; lifecycle is managed by OfflineFirstWrapper.

export const syncEngine = new SyncEngine();
