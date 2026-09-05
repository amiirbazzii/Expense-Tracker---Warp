import { PendingMutation } from '../types/local-storage';
import { createAsyncLock } from '../storage/asyncLock';
import { queueStore, idbReady } from '../storage/idb';

const STORE_KEY = 'pending_mutations';
const DEAD_LETTER_KEY = 'failed_mutations';

/** How many times a mutation may fail with a non-retryable error before it is
 *  parked in the dead-letter list instead of blocking the queue forever. */
export const MAX_ATTEMPTS = 5;

/**
 * Every MutationQueueManager instance addresses the same object store, so the
 * lock and the listener set are module-scoped. Without this, an `enqueue()`
 * that interleaves with the sync engine's `dequeue()` is silently dropped:
 * both read the same array and the later `setItem` wins.
 */
const runExclusive = createAsyncLock();

/** `enqueue` — new work arrived; `change` — anything else (dequeue, failure…). */
export type QueueEvent = "enqueue" | "change";
type QueueListener = (event: QueueEvent) => void;
const listeners = new Set<QueueListener>();

function notify(event: QueueEvent = "change"): void {
  listeners.forEach((listener) => {
    try {
      listener(event);
    } catch (err) {
      console.error('[MutationQueue] listener threw:', err);
    }
  });
}

/**
 * Lightweight FIFO queue for offline-first pending mutations.
 *
 * • Every enqueued mutation automatically receives a UUIDv4 idempotency key.
 * • Stored in a dedicated localforage instance (separate IndexedDB object store).
 * • All read-modify-write cycles are serialized through a module-level lock.
 * • Subscribers are notified on every change so the UI never has to poll.
 */
export class MutationQueueManager {
  private storage: typeof queueStore;

  constructor() {
    // Shared handle. Every method below awaits `idbReady` so this store is
    // never opened while the sibling store is still negotiating its own
    // IndexedDB version upgrade — that race is what produced
    // "requested version (6) is less than the existing version (7)".
    this.storage = queueStore;
  }

  // ── Change notification ─────────────────────────────────────────────────

  /** Subscribe to queue changes. Returns an unsubscribe function. */
  subscribe(listener: QueueListener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }

  // ── Ingestion ──────────────────────────────────────────────────────────

  /**
   * Enqueue a new mutation.
   *
   * A UUIDv4 idempotency key is assigned automatically via `crypto.randomUUID()`.
   * The caller only provides the `action` (Convex route) and `payload`.
   */
  async enqueue(action: string, payload: any): Promise<PendingMutation> {
    const mutation: PendingMutation = {
      id: crypto.randomUUID(),
      action,
      payload,
      timestamp: Date.now(),
    };

    await runExclusive(async () => {
      const queue = await this.readQueue();
      queue.push(mutation);
      await this.storage.setItem(STORE_KEY, queue);
    });

    notify("enqueue");
    return mutation;
  }

  // ── Reads ──────────────────────────────────────────────────────────────

  /** Raw read. Callers that go on to write must hold the lock. */
  private async readQueue(): Promise<PendingMutation[]> {
    await idbReady;
    const queue: PendingMutation[] | null = await this.storage.getItem(STORE_KEY);
    if (!Array.isArray(queue)) return [];

    // Defensive sort – guarantees FIFO even if ordering drifted
    return [...queue].sort((a, b) => a.timestamp - b.timestamp);
  }

  /** Return the full queue ordered by timestamp (FIFO, earliest first). */
  async getAll(): Promise<PendingMutation[]> {
    return this.readQueue();
  }

  /** Return the next mutation in the queue (earliest timestamp) or null. */
  async peek(): Promise<PendingMutation | null> {
    const queue = await this.readQueue();
    return queue.length > 0 ? queue[0] : null;
  }

  /** Return the number of pending mutations. */
  async size(): Promise<number> {
    const queue = await this.readQueue();
    return queue.length;
  }

  // ── Mutations ───────────────────────────────────────────────────────────

  /**
   * Remove a mutation by its UUID.
   * Returns `true` if a mutation was removed, `false` if not found.
   */
  async remove(id: string): Promise<boolean> {
    const removed = await runExclusive(async () => {
      const queue = await this.readQueue();
      const filtered = queue.filter((m) => m.id !== id);
      if (filtered.length === queue.length) return false;

      await this.storage.setItem(STORE_KEY, filtered);
      return true;
    });

    if (removed) notify();
    return removed;
  }

  /**
   * Atomically dequeue the head mutation (oldest timestamp).
   * Returns the dequeued mutation, or `null` if the queue is empty.
   */
  async dequeue(): Promise<PendingMutation | null> {
    const head = await runExclusive(async () => {
      const queue = await this.readQueue();
      if (queue.length === 0) return null;

      const [first, ...rest] = queue;
      await this.storage.setItem(STORE_KEY, rest);
      return first;
    });

    if (head) notify();
    return head;
  }

  /**
   * Record a failed attempt against a mutation.
   *
   * The item stays in place so FIFO ordering is preserved. Once it has burned
   * through `MAX_ATTEMPTS` it is moved to the dead-letter list rather than
   * dropped, so nothing the user entered is ever lost silently.
   *
   * Returns the new attempt count, or `-1` when the item was dead-lettered.
   */
  async recordFailure(id: string, error: string): Promise<number> {
    const attempts = await runExclusive(async () => {
      const queue = await this.readQueue();
      const index = queue.findIndex((m) => m.id === id);
      if (index === -1) return 0;

      const mutation = queue[index];
      const nextAttempts = (mutation.attempts ?? 0) + 1;

      if (nextAttempts >= MAX_ATTEMPTS) {
        queue.splice(index, 1);
        await this.storage.setItem(STORE_KEY, queue);

        const stored: PendingMutation[] | null =
          await this.storage.getItem(DEAD_LETTER_KEY);
        const dead = Array.isArray(stored) ? stored : [];
        dead.push({
          ...mutation,
          attempts: nextAttempts,
          lastError: error,
          failedAt: Date.now(),
        });
        await this.storage.setItem(DEAD_LETTER_KEY, dead);
        return -1;
      }

      queue[index] = { ...mutation, attempts: nextAttempts, lastError: error };
      await this.storage.setItem(STORE_KEY, queue);
      return nextAttempts;
    });

    notify();
    return attempts;
  }

  // ── Dead letters ────────────────────────────────────────────────────────

  /** Mutations that exhausted their retries. Surfaced in the UI, never dropped. */
  async getDeadLetters(): Promise<PendingMutation[]> {
    await idbReady;
    const dead: PendingMutation[] | null =
      await this.storage.getItem(DEAD_LETTER_KEY);
    return Array.isArray(dead) ? dead : [];
  }

  /**
   * Move dead-lettered mutations back onto the queue for another try.
   *
   * With no predicate every dead letter is retried (the "retry all" the user
   * triggers). With one, only matching entries move — used to rehabilitate
   * mutations that failed for a reason since reclassified as recoverable.
   */
  async retryDeadLetters(
    predicate?: (mutation: PendingMutation) => boolean,
  ): Promise<number> {
    const count = await runExclusive(async () => {
      const stored: PendingMutation[] | null =
        await this.storage.getItem(DEAD_LETTER_KEY);
      const dead = Array.isArray(stored) ? stored : [];
      if (dead.length === 0) return 0;

      const retrying = predicate ? dead.filter(predicate) : dead;
      if (retrying.length === 0) return 0;
      const keeping = predicate ? dead.filter((m) => !predicate(m)) : [];

      const queue = await this.readQueue();
      for (const mutation of retrying) {
        const { lastError: _lastError, failedAt: _failedAt, ...rest } = mutation;
        queue.push({ ...rest, attempts: 0 });
      }
      queue.sort((a, b) => a.timestamp - b.timestamp);

      await this.storage.setItem(STORE_KEY, queue);
      await this.storage.setItem(DEAD_LETTER_KEY, keeping);
      return retrying.length;
    });

    if (count > 0) notify();
    return count;
  }

  async clearDeadLetters(): Promise<void> {
    await idbReady;
    await runExclusive(async () => {
      await this.storage.setItem(DEAD_LETTER_KEY, []);
    });
    notify();
  }

  /**
   * Clear the entire queue (including dead letters).
   */
  async clear(): Promise<void> {
    await idbReady;
    await runExclusive(async () => {
      await this.storage.setItem(STORE_KEY, []);
      await this.storage.setItem(DEAD_LETTER_KEY, []);
    });
    notify();
  }
}

/**
 * Shared instance. All app code should use this rather than constructing its
 * own manager, so listeners and in-flight work are visible everywhere.
 */
export const mutationQueue = new MutationQueueManager();
