/**
 * SyncEngine — Silent Background Sync
 *
 * Responsibilities:
 *  1. Listen for `window.online` / tab-visibility events to drain the queue.
 *  2. Run a 30-second periodic fallback drain while online.
 *  3. Process mutations from MutationQueueManager in strict FIFO order.
 *  4. Stamp the current auth token onto every mutation payload right before
 *     execution, so each background mutation carries the correct, freshest
 *     authentication state (the Convex backend resolves the user via
 *     `args.token`, not `ctx.auth`).
 *  5. On success: atomically dequeue the item.
 *  6. On failure: halt and wait for the next trigger. A mutation is *never*
 *     discarded — after `MAX_ATTEMPTS` it moves to the dead-letter list where
 *     the UI can surface it and the user can retry.
 *  7. On logout (clearAndStop): wipe all IndexedDB data, then stop.
 *
 * This class is completely decoupled from the React tree.
 */

import { ConvexClient } from "convex/browser";
import { api } from "../../../convex/_generated/api";
import { mutationQueue } from "../queue/MutationQueueManager";
import { localStorageManager } from "../storage/LocalStorageManager";
import { clearAllStores } from "../storage/idb";
import { LocalLoan, PendingMutation } from "../types/local-storage";
import { localDataStore } from "../store/LocalDataStore";
import { connectivity } from "../connectivity";
import { runSyncPhase } from "./syncPhaseLock";
import { removeTombstone } from "./tombstones";

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
  "expenses:archiveCategory": api.expenses.archiveCategory,
  "expenses:deleteCategory": api.expenses.deleteCategory,

  // Income
  "income:createIncome": api.cardsAndIncome.createIncome,
  "income:updateIncome": api.cardsAndIncome.updateIncome,
  "income:deleteIncome": api.cardsAndIncome.deleteIncome,
  "incomeCategories:archiveIncomeCategory": api.cardsAndIncome.archiveIncomeCategory,
  "incomeCategories:deleteIncomeCategory": api.cardsAndIncome.deleteIncomeCategory,
  "incomeCategories:createIncomeCategory": api.cardsAndIncome.createIncomeCategory,

  // Cards
  "cards:addCard": api.cardsAndIncome.addCard,
  "cards:updateCard": api.cardsAndIncome.updateCard,
  "cards:deleteCard": api.cardsAndIncome.deleteCard,

  // Loans
  "loans:createLoan": api.loans.createLoan,
  "loans:updateLoan": api.loans.updateLoan,
  "loans:deleteLoan": api.loans.deleteLoan,
  "loans:payInstallment": api.loans.payInstallment,

  // Settings
  "userSettings:update": api.userSettings.update,

  // Transfers
  "transferFunds": api.cardsAndIncome.transferFunds,
};

/**
 * Which local collection a create-action's row lives in.
 *
 * This cannot be derived from the action prefix: `expenses:createCategory`
 * writes to `categories`, not `expenses`. Getting it wrong means the cloud id
 * is never written back and the row duplicates on the next hydration.
 */
const CREATE_TARGET_COLLECTION: Record<string, string> = {
  "expenses:createExpense": "expenses",
  "expenses:createCategory": "categories",
  "expenses:createForValue": "forValues",
  "income:createIncome": "income",
  "incomeCategories:createIncomeCategory": "incomeCategories",
  "cards:addCard": "cards",
  "loans:createLoan": "loans",
};

/**
 * Which payload field names the row a delete-action removes, so its durable
 * id mapping can be dropped once the document is gone from both sides.
 */
const DELETE_TARGET_ID_FIELD: Record<string, string> = {
  "expenses:deleteExpense": "expenseId",
  "income:deleteIncome": "incomeId",
  "cards:deleteCard": "cardId",
  "loans:deleteLoan": "loanId",
};

/**
 * Which local row an update-action refers to, so it can be flipped back to
 * `synced` once the server has accepted it. A row left permanently `pending`
 * is never refreshed from the server again.
 */
const UPDATE_TARGET: Record<string, { collection: string; idField: string }> = {
  "expenses:updateExpense": { collection: "expenses", idField: "expenseId" },
  "income:updateIncome": { collection: "income", idField: "incomeId" },
  "cards:updateCard": { collection: "cards", idField: "cardId" },
  "loans:updateLoan": { collection: "loans", idField: "loanId" },
  "loans:payInstallment": { collection: "loans", idField: "loanId" },
};

/** Local id fields that must be translated to Convex ids before sending. */
const ID_REFERENCE_FIELDS = [
  "cardId",
  "incomeId",
  "expenseId",
  "fromCardId",
  "toCardId",
  "loanId",
  "categoryId",
] as const;

export type SyncEngineStatus = {
  isOnline: boolean;
  isDraining: boolean;
  /** Set when the queue is stalled waiting for a valid auth token. */
  needsAuth: boolean;
};

// ── SyncEngine ────────────────────────────────────────────────────────────────

export class SyncEngine {
  private client: ConvexClient | null = null;
  private queue = mutationQueue;
  private storage = localStorageManager;

  // The auth token (tokenIdentifier) used to authenticate every mutation.
  // Updated via `setAuthToken` when the session token refreshes.
  private authToken: string | null = null;

  // Set when the server rejected our token. The queue holds its position and
  // resumes as soon as a fresh token arrives — mutations are never discarded
  // because a session expired.
  private needsAuth = false;

  // Maps local IDs (e.g. "local_...") to their Convex document IDs.
  // Populated when a create mutation succeeds and returns a Convex ID.
  // Used to translate ID references in subsequent update/delete mutations.
  private localToConvexId: Map<string, string> = new Map();

  // Mirrors the verified connectivity state (src/lib/connectivity.ts).
  private isOnline: boolean = connectivity.isOnline;

  // Unsubscribe handle for the connectivity subscription.
  private unsubscribeConnectivity: (() => void) | null = null;

  // Unsubscribe handle for the queue subscription (drain-on-enqueue).
  private unsubscribeQueue: (() => void) | null = null;

  // True while a drain pass is in flight — prevents concurrent runs.
  private isDraining = false;

  // The pass in flight, so callers can await a drain someone else started.
  private drainPromise: Promise<void> | null = null;

  // Set when a trigger fires mid-pass; schedules exactly one follow-up pass.
  private drainRequested = false;

  // Bumped on every start(). A logout wipe that is still running when the next
  // session starts must not tear that new session's engine down.
  private epoch = 0;

  // Interval handle for the 30-second periodic fallback.
  private intervalId: ReturnType<typeof setInterval> | null = null;

  private listeners = new Set<(status: SyncEngineStatus) => void>();

  // Named handler references so addEventListener/removeEventListener are paired.
  private handleConnectivityChange = (online: boolean) => {
    this.isOnline = online;
    if (online) {
      console.log("[SyncEngine] Online — triggering drain");
      this.emit();
      this.drain();
    } else {
      console.log("[SyncEngine] Offline — pausing sync");
      this.emit();
    }
  };

  // Returning to a backgrounded tab is the most common moment for a phone to
  // have regained connectivity without having fired an `online` event.
  private handleVisibility = () => {
    if (
      typeof document !== "undefined" &&
      document.visibilityState === "visible"
    ) {
      // Re-probe: the subscription handles the state change; drain either way
      // so a verified-online tab syncs promptly on return.
      void connectivity.verify().then((online) => {
        this.isOnline = online;
        if (online) this.drain();
      });
    }
  };

  /** Return the active ConvexClient instance, or null if the engine isn't running. */
  getClient(): ConvexClient | null {
    return this.client;
  }

  /** Return the engine's own online state (mirrors window online/offline events). */
  getIsOnline(): boolean {
    return this.isOnline;
  }

  // ── Status ────────────────────────────────────────────────────────────────

  getStatus(): SyncEngineStatus {
    return {
      isOnline: this.isOnline,
      isDraining: this.isDraining,
      needsAuth: this.needsAuth,
    };
  }

  /** Subscribe to engine status changes. Returns an unsubscribe function. */
  subscribe(listener: (status: SyncEngineStatus) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(): void {
    const status = this.getStatus();
    this.listeners.forEach((listener) => {
      try {
        listener(status);
      } catch (err) {
        console.error("[SyncEngine] listener threw:", err);
      }
    });
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
    this.epoch++;

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
    this.isOnline = connectivity.isOnline;
    this.unsubscribeConnectivity = connectivity.subscribe(
      this.handleConnectivityChange,
    );
    document.addEventListener("visibilitychange", this.handleVisibility);

    // New work while online used to wait for the 30-second timer (or a page
    // reload) before it was sent. Deliver it promptly instead. Only *new*
    // items trigger this — dequeue and failure notifications do not, so the
    // retry cadence for a rejected mutation is unchanged. drain() is
    // re-entrant: a pass already in flight just schedules one follow-up.
    this.unsubscribeQueue = this.queue.subscribe((event) => {
      if (event === "enqueue" && this.isOnline) this.drain();
    });

    // 30-second periodic fallback.
    this.intervalId = setInterval(() => {
      if (this.isOnline) {
        this.drain();
      }
    }, 30_000);

    // Recover anything parked for a reason that has since been reclassified as
    // recoverable — a write that was dead-lettered against a backend missing
    // its function comes back on its own once that backend is deployed.
    void this.rehabilitateDeadLetters();

    // Drain immediately in case there are queued items from offline sessions.
    if (this.isOnline) {
      this.drain();
    }
  }

  /**
   * Return dead letters whose recorded failure is now considered transient to
   * the live queue. Runs once per `start()`, so a fixed backend heals the
   * queue without the user having to find a retry button.
   */
  private async rehabilitateDeadLetters(): Promise<void> {
    try {
      const recovered = await this.queue.retryDeadLetters((mutation) =>
        isTransientError(mutation.lastError ?? ""),
      );
      if (recovered > 0) {
        console.log(
          `[SyncEngine] Recovered ${recovered} parked mutation(s) for retry`,
        );
        this.drain();
      }
    } catch (err) {
      console.warn("[SyncEngine] Could not rehabilitate dead letters:", err);
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
    this.needsAuth = false;
    console.log("[SyncEngine] Auth token updated");
    this.emit();
    // If the engine is live, retry anything that may have been waiting.
    if (this.client) {
      this.drain();
    }
  }

  /** Trigger a drain on demand (manual "retry now" affordances). */
  async drainNow(): Promise<void> {
    await this.drain();
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

    if (this.unsubscribeConnectivity) {
      this.unsubscribeConnectivity();
      this.unsubscribeConnectivity = null;
    }
    if (this.unsubscribeQueue) {
      this.unsubscribeQueue();
      this.unsubscribeQueue = null;
    }
    document.removeEventListener("visibilitychange", this.handleVisibility);

    if (this.client) {
      // Close only once any in-flight drain or hydration has finished with
      // it. Closing immediately left their pending request unsettled, so the
      // sync-phase lock and `isDraining` stayed held for the rest of the
      // session — after a re-login, nothing ever drained again. Detach the
      // field now (no new work reaches this client); the close waits its turn.
      const client = this.client;
      this.client = null;
      void runSyncPhase(async () => client.close());
    }

    this.authToken = null;
    this.needsAuth = false;

    console.log("[SyncEngine] Stopped");
    this.emit();
  }

  /**
   * Wipe-on-logout: clear the pending queue, delete all IndexedDB databases,
   * then stop the engine.
   *
   * Call this from the logout handler to guarantee session isolation.
   */
  async clearAndStop(): Promise<void> {
    console.log("[SyncEngine] Wiping local data for logout");
    const epoch = this.epoch;

    this.localToConvexId.clear();

    // Empty every store rather than deleting the database.
    //
    // `indexedDB.deleteDatabase()` removed the database out from under the
    // live localforage instances, which keep the schema version they last
    // saw. Their next open then asked for a version the recreated database
    // had already moved past — "can't be downgraded from version 6 to 5",
    // and a VersionError that broke queue reads. Clearing the stores wipes
    // exactly the same data and keeps the schema (and cached versions) valid.
    try {
      await clearAllStores();
      console.log("[SyncEngine] Local stores cleared");
    } catch (err) {
      console.warn("[SyncEngine] Could not clear local stores:", err);
    }

    // A new session may have signed in while the wipe was running. Tearing
    // the engine down now would leave that session with no sync at all.
    if (this.epoch !== epoch) {
      console.warn("[SyncEngine] Restarted during wipe — leaving engine running");
      return;
    }

    // 3. Drop the in-memory snapshot so the next account cannot read it.
    localDataStore.reset();

    // 4. Stop timers and listeners.
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
   * - Halts on the first failure so ordering is preserved.
   * - Each mutation is removed from the queue only after Convex confirms success.
   * - The current auth token is stamped onto every payload at execution time,
   *   so a refreshed token applies to items enqueued with a stale one.
   */
  private drain(): Promise<void> {
    if (this.isDraining) {
      // Work may have been queued after the running pass last looked; make
      // sure one more pass follows it. Callers await the pass in flight.
      this.drainRequested = true;
      return this.drainPromise ?? Promise.resolve();
    }
    if (!this.client || !this.isOnline) return Promise.resolve();
    // Without a token, mutations will be rejected — wait for one to be set.
    if (!this.authToken) return Promise.resolve();

    this.isDraining = true;
    this.drainRequested = false;

    // Serialized against hydration merges — see syncPhaseLock.ts.
    const pass = runSyncPhase(() => this.runDrain())
      .catch((err) => {
        console.error("[SyncEngine] Drain crashed:", err);
      })
      .then(() => {
        this.isDraining = false;
        this.drainPromise = null;
        if (this.drainRequested) {
          this.drainRequested = false;
          return this.drain();
        }
        return undefined;
      });

    this.drainPromise = pass;
    return pass;
  }

  private async runDrain(): Promise<void> {
    // Captured once: `stop()` can null the field mid-pass, and each mutation
    // must go to the client this pass started with.
    const client = this.client;
    if (!client) return;

    this.emit();
    console.log("[SyncEngine] Drain started");

    let syncedAny = false;

    try {
      while (true) {
        const mutation = await this.queue.peek();
        if (!mutation) break; // Queue is empty — we're done.

        const fn = ACTION_MAP[mutation.action];
        if (!fn) {
          // Unknown action — park it rather than dropping the user's data.
          console.warn(
            `[SyncEngine] Unknown action "${mutation.action}" — dead-lettering`,
          );
          const attempts = await this.queue.recordFailure(
            mutation.id,
            `Unknown action: ${mutation.action}`,
          );
          // 0 means the item is no longer in the queue; without this the loop
          // would peek the same head forever.
          if (attempts === 0) break;
          continue;
        }

        try {
          // ── Build payload ─────────────────────────────────────────────
          // 1. Stamp the current auth token.
          // 2. Translate any local ID references to Convex IDs.
          // 3. Strip internal fields before sending to Convex.
          const {
            __localId: _localId,
            localExpenseId: _lei,
            localIncomeId: _lii,
            ...rest
          } = mutation.payload;
          const payload: Record<string, unknown> = {
            ...rest,
            token: this.authToken,
            // The queue item's UUID doubles as the idempotency key: if the
            // response is lost (crash or dropped connection after the server
            // committed), the retry re-sends the same key and the server
            // returns the recorded result instead of writing twice.
            idempotencyKey: mutation.id,
          };

          await this.resolveIdReferences(payload, mutation.action);

          // Execute the Convex mutation.
          const result = await client.mutation(fn, payload);

          await this.linkCloudIds(mutation, result, _localId);

          // ✓ Success — atomically remove the head item.
          await this.queue.dequeue();
          syncedAny = true;
          console.log(
            `[SyncEngine] ✓ synced: ${mutation.action} (${mutation.id})`,
          );
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);

          if (isAuthError(message)) {
            // The session token is invalid or expired. Hold the queue exactly
            // where it is: discarding the item here would silently destroy
            // whatever the user entered while offline. It resumes the moment
            // `setAuthToken` supplies a working token.
            console.warn(
              `[SyncEngine] ✗ auth rejected on ${mutation.action} (${mutation.id}) — pausing until a fresh token arrives`,
              err,
            );
            this.needsAuth = true;
            break;
          }

          if (isTransientError(message)) {
            // Network / server blip — retry on the next trigger without
            // burning an attempt.
            console.warn(
              `[SyncEngine] ✗ halted (transient) on: ${mutation.action} (${mutation.id})`,
              err,
            );
            break;
          }

          // A genuine rejection (validation, missing document, …). Count it;
          // after MAX_ATTEMPTS the item moves to the dead-letter list so one
          // bad mutation cannot block the queue forever.
          const attempts = await this.queue.recordFailure(mutation.id, message);
          console.warn(
            attempts === -1
              ? `[SyncEngine] ✗ dead-lettered after repeated failures: ${mutation.action} (${mutation.id})`
              : `[SyncEngine] ✗ attempt ${attempts} failed: ${mutation.action} (${mutation.id})`,
            err,
          );

          if (attempts === -1) {
            // The mutation will never be delivered — undo its optimistic
            // local writes so the UI stops showing state the server rejected.
            await this.compensateDeadLetter(mutation);
          }
          break;
        }
      }
    } finally {
      // `isDraining` is cleared by drain(), which owns the pass lifecycle.
      console.log("[SyncEngine] Drain complete");

      if (syncedAny) {
        // Cloud ids were written back — re-read so the UI reflects them.
        try {
          await localDataStore.refresh();
        } catch (err) {
          console.warn("[SyncEngine] Failed to refresh store after drain:", err);
        }
      }

      this.emit();
    }
  }

  /**
   * Mark the local effects of a mutation that will never be delivered (it just
   * moved to the dead-letter list) so the UI stops presenting them as saved.
   *
   * Nothing is deleted here — the user decides via retry or discard. Rows the
   * server refused are flagged `failed` (the cards show the badge, Settings
   * lists the failure); a refused *delete* drops its tombstone so the next
   * hydration restores the server's copy; a refused installment payment is
   * rolled back because its local write is a derived counter.
   */
  private async compensateDeadLetter(
    mutation: Pick<PendingMutation, "action" | "payload">,
  ): Promise<void> {
    try {
      if (mutation.action === "loans:payInstallment") {
        await this.rollbackInstallmentPayment(mutation.payload);
      } else {
        for (const { collection, id } of this.localRowsOf(mutation)) {
          const row = await this.storage.getEntityById(collection, id);
          if (!row) continue;
          // A create that somehow already links to a server document is real.
          if (this.isCreateAction(mutation.action) && row.cloudId) continue;
          await this.storage.setEntitySyncStatus(collection, id, "failed");
        }
        await this.restoreRejectedDelete(mutation);
      }
      await localDataStore.refresh();
    } catch (err) {
      console.error("[SyncEngine] Failed to compensate dead-lettered mutation:", err);
    }
  }

  /**
   * Discard every dead-lettered mutation: rows that never reached the server
   * are removed, rows with a rejected edit go back to `synced` so hydration
   * can reconcile them with the server's copy. Explicit user action only.
   */
  async discardDeadLetters(): Promise<void> {
    const dead = await this.queue.getDeadLetters();
    for (const mutation of dead) {
      try {
        if (mutation.action === "loans:payInstallment") continue; // already rolled back
        for (const { collection, id } of this.localRowsOf(mutation)) {
          const row = await this.storage.getEntityById(collection, id);
          if (!row) continue;
          if (!row.cloudId) {
            await this.storage.deleteEntity(collection, id);
          } else {
            await this.storage.setEntitySyncStatus(collection, id, "synced");
          }
        }
        await this.restoreRejectedDelete(mutation);
      } catch (err) {
        console.error("[SyncEngine] Failed to discard dead letter:", err);
      }
    }
    await this.queue.clearDeadLetters();
    await localDataStore.refresh();
  }

  private isCreateAction(action: string): boolean {
    return action in CREATE_TARGET_COLLECTION || action === "transferFunds";
  }

  /** Local rows a mutation wrote optimistically. */
  private localRowsOf(
    mutation: Pick<PendingMutation, "action" | "payload">,
  ): Array<{ collection: string; id: string }> {
    const rows: Array<{ collection: string; id: string }> = [];
    const p = mutation.payload ?? {};
    const created = CREATE_TARGET_COLLECTION[mutation.action];
    if (created && typeof p.__localId === "string") {
      rows.push({ collection: created, id: p.__localId });
    }
    const updated = UPDATE_TARGET[mutation.action];
    if (updated && typeof p[updated.idField] === "string") {
      rows.push({ collection: updated.collection, id: p[updated.idField] });
    }
    if (mutation.action === "transferFunds") {
      if (typeof p.localExpenseId === "string") rows.push({ collection: "expenses", id: p.localExpenseId });
      if (typeof p.localIncomeId === "string") rows.push({ collection: "income", id: p.localIncomeId });
    }
    return rows;
  }

  /** A rejected delete: the document still exists upstream — stop hiding it. */
  private async restoreRejectedDelete(
    mutation: Pick<PendingMutation, "action" | "payload">,
  ): Promise<void> {
    const idField = DELETE_TARGET_ID_FIELD[mutation.action];
    if (!idField) return;
    const key = mutation.payload?.[idField];
    if (typeof key !== "string") return;
    const collection = entityTypeForField(idField, mutation.action);
    if (!collection) return;
    const cloudId = key.startsWith("local_")
      ? await this.storage.getCloudIdForLocalId(key)
      : key;
    if (cloudId) await removeTombstone(collection, cloudId);
  }

  /**
   * Roll back a dead-lettered installment payment: the local write is a
   * derived counter, so leaving it would show a month as paid that the server
   * refused to charge.
   */
  private async rollbackInstallmentPayment(
    payload: PendingMutation["payload"],
  ): Promise<void> {
    const { loanId, localExpenseId, installmentIndex } = payload;

    // 1. Remove the local payment expense, unless it somehow already linked
    //    to a server document (then it is real and must stay).
    if (typeof localExpenseId === "string") {
      const expense = await this.storage.getEntityById(
        "expenses",
        localExpenseId,
      );
      if (expense && !expense.cloudId) {
        await this.storage.deleteEntity("expenses", localExpenseId);
      }
    }

    // 2. Roll the counter back — but only while it still reflects this
    //    payment, so a later successful payment is never undone.
    if (typeof loanId === "string") {
      const loan = await this.storage.getEntityById<any>("loans", loanId);
      const expected =
        typeof installmentIndex === "number" ? installmentIndex + 1 : null;
      if (
        loan &&
        loan.paidInstallments > 0 &&
        (expected === null || loan.paidInstallments === expected)
      ) {
        await this.storage.updateEntity<LocalLoan>("loans", loanId, {
          paidInstallments: loan.paidInstallments - 1,
        });
        // updateEntity marks the row as an unsent local change; this
        // rollback is not one — flip it back so hydration keeps syncing it.
        await this.storage.markEntityAsSynced("loans", loanId);
      }
    }

    console.warn(
      `[SyncEngine] ↩ rolled back local installment payment for loan ${loanId}`,
    );
  }

  /**
   * Replace `local_…` references in a payload with the Convex ids they now
   * map to, looking first in the in-session map and then in IndexedDB.
   */
  private async resolveIdReferences(
    payload: Record<string, unknown>,
    action: string,
  ): Promise<void> {
    for (const field of ID_REFERENCE_FIELDS) {
      const value = payload[field];
      if (typeof value !== "string") continue;

      const mapped = this.localToConvexId.get(value);
      if (mapped) {
        payload[field] = mapped;
        continue;
      }

      const entityType = entityTypeForField(field, action);
      if (!entityType) continue;

      let cloudId: string | null | undefined;
      try {
        const entity = await this.storage.getEntityById(entityType, value);
        cloudId = entity?.cloudId;

        // The row may be gone — a queued delete removes it before this
        // mutation drains — so fall back to the durable mapping, which
        // outlives both the row and the page.
        if (!cloudId) {
          cloudId = await this.storage.getCloudIdForLocalId(value);
        }
      } catch {
        // Fall through to the unresolved check below.
      }

      if (cloudId) {
        this.localToConvexId.set(value, cloudId);
        payload[field] = cloudId;
      } else if (value.startsWith("local_")) {
        // Nothing knows this id: no in-memory mapping, no row, no durable
        // entry. Its create has not run yet (FIFO should have prevented that)
        // or never succeeded. Fail rather than send an id Convex cannot parse.
        throw new Error(
          `Unresolved local reference ${field}=${value} for ${action}`,
        );
      }
    }
  }

  /**
   * Persist the Convex ids returned by a successful mutation so that later
   * updates, deletes and hydrations resolve to the same row.
   */
  private async linkCloudIds(
    mutation: { action: string; payload: any },
    result: unknown,
    localId: string | undefined,
  ): Promise<void> {
    if (localId && result) {
      const convexId =
        typeof result === "string"
          ? result
          : ((result as any)._id ?? (result as any).id);

      if (convexId) {
        this.localToConvexId.set(localId, convexId);

        const collection = CREATE_TARGET_COLLECTION[mutation.action];
        if (collection) {
          try {
            await this.storage.markEntityAsSynced(collection, localId, convexId);
          } catch (err) {
            console.warn(
              `[SyncEngine] Failed to persist cloudId for ${localId}:`,
              err,
            );
          }
        }
      }
    }

    // The document is now gone from both sides; nothing can reference it
    // again, so its mapping is no longer worth keeping.
    const deletedIdField = DELETE_TARGET_ID_FIELD[mutation.action];
    if (deletedIdField) {
      const deletedKey = mutation.payload[deletedIdField];
      if (typeof deletedKey === "string") {
        this.localToConvexId.delete(deletedKey);
        try {
          await this.storage.forgetCloudIdMapping(deletedKey);
        } catch (err) {
          console.warn(`[SyncEngine] Failed to prune mapping for ${deletedKey}:`, err);
        }
      }
    }

    // An accepted update means the local row matches the server again.
    const updateTarget = UPDATE_TARGET[mutation.action];
    if (updateTarget) {
      const rowKey = mutation.payload[updateTarget.idField];
      if (typeof rowKey === "string") {
        try {
          await this.storage.markEntityAsSynced(updateTarget.collection, rowKey);
        } catch (err) {
          console.warn(`[SyncEngine] Failed to mark ${rowKey} synced:`, err);
        }
      }
    }

    // transferFunds and payInstallment create rows on the server that were
    // already written locally under their own ids; link both sides.
    const res = result as any;
    if (mutation.action === "transferFunds" && res) {
      await this.linkLocalRow(
        "expenses",
        mutation.payload.localExpenseId,
        res.expenseId,
      );
      await this.linkLocalRow(
        "income",
        mutation.payload.localIncomeId,
        res.incomeId,
      );
    }

    if (mutation.action === "loans:payInstallment" && res) {
      // Normal success — and the idempotent retry case, where the server
      // returns the expense id of the payment it already applied: both link
      // the local expense to its server document.
      await this.linkLocalRow(
        "expenses",
        mutation.payload.localExpenseId,
        res.expenseId,
      );

      // `alreadyPaid` with no expense id: the installment was covered
      // elsewhere (another device, or a legacy untagged payment) and the
      // server applied nothing. Our local expense is an orphan duplicate —
      // remove it; hydration reconciles the counter from the server.
      if (
        res.alreadyPaid &&
        !res.expenseId &&
        typeof mutation.payload.localExpenseId === "string"
      ) {
        try {
          const orphan = await this.storage.getEntityById(
            "expenses",
            mutation.payload.localExpenseId,
          );
          if (orphan && !orphan.cloudId) {
            await this.storage.deleteEntity(
              "expenses",
              mutation.payload.localExpenseId,
            );
            console.warn(
              `[SyncEngine] Removed duplicate installment expense ${mutation.payload.localExpenseId} (already paid upstream)`,
            );
          }
        } catch (err) {
          console.warn("[SyncEngine] Failed to remove duplicate payment:", err);
        }
      }
    }
  }

  private async linkLocalRow(
    collection: string,
    localId: unknown,
    cloudId: unknown,
  ): Promise<void> {
    if (typeof localId !== "string" || typeof cloudId !== "string") return;
    try {
      this.localToConvexId.set(localId, cloudId);
      await this.storage.markEntityAsSynced(collection, localId, cloudId);
    } catch (err) {
      console.warn(`[SyncEngine] Failed to link ${localId} → ${cloudId}:`, err);
    }
  }
}

// ── Error classification ──────────────────────────────────────────────────────

function isAuthError(message: string): boolean {
  return (
    message.includes("Authentication required") ||
    message.includes("Unauthorized") ||
    message.includes("Invalid token")
  );
}

function isTransientError(message: string): boolean {
  const lower = message.toLowerCase();

  // Deployment skew: the client is calling a function the backend has not
  // received yet. The mutation and its data are perfectly valid — they just
  // arrived before `convex deploy` did — so this must not burn retries and
  // must never cost the user their write. It resolves itself the moment the
  // backend catches up. (An action we genuinely no longer support is not in
  // ACTION_MAP at all, and takes the dead-letter path above instead.)
  if (
    lower.includes("could not find public function") ||
    lower.includes("could not find function")
  ) {
    return true;
  }

  return (
    lower.includes("network") ||
    lower.includes("failed to fetch") ||
    lower.includes("timeout") ||
    lower.includes("timed out") ||
    lower.includes("connection") ||
    lower.includes("offline") ||
    lower.includes("aborted") ||
    lower.includes("websocket") ||
    lower.includes("503") ||
    lower.includes("502")
  );
}

function entityTypeForField(field: string, action: string): string | null {
  switch (field) {
    case "categoryId":
      return action.includes("incomeCategories")
        ? "incomeCategories"
        : "categories";
    case "cardId":
    case "fromCardId":
    case "toCardId":
      return "cards";
    case "expenseId":
      return "expenses";
    case "incomeId":
      return "income";
    case "loanId":
      return "loans";
    default:
      return null;
  }
}

// ── Singleton ─────────────────────────────────────────────────────────────────
// One engine per browser tab; lifecycle is managed by OfflineFirstWrapper.

export const syncEngine = new SyncEngine();
