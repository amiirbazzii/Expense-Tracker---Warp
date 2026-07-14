import * as localforage from 'localforage';
import { PendingMutation } from '../types/local-storage';

const STORE_KEY = 'pending_mutations';

/**
 * Lightweight FIFO queue for offline-first pending mutations.
 *
 * • Every enqueued mutation automatically receives a UUIDv4 idempotency key.
 * • Stored in a dedicated localforage instance (separate IndexedDB object store).
 * • Flat contract — no versioning, retry counters, or multi-device fields.
 */
export class MutationQueueManager {
  private storage: typeof localforage;

  constructor() {
    this.storage = localforage.createInstance({
      name: 'ExpenseTrackerV2',
      storeName: 'mutation_queue',
      description: 'FIFO queue of pending Convex mutations for offline-first sync',
    });
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
      storeName: action.includes(':') ? action.split(':')[0] : action,
      payload,
      timestamp: Date.now(),
    };

    const queue = await this.getAll();
    queue.push(mutation);
    await this.storage.setItem(STORE_KEY, queue);

    return mutation;
  }

  // ── Reads ──────────────────────────────────────────────────────────────

  /** Return the full queue ordered by timestamp (FIFO, earliest first). */
  async getAll(): Promise<PendingMutation[]> {
    const queue: PendingMutation[] | null = await this.storage.getItem(STORE_KEY);
    if (!queue) return [];

    // Defensive sort – guarantees FIFO even if ordering drifted
    return [...queue].sort((a, b) => a.timestamp - b.timestamp);
  }

  /** Return the next mutation in the queue (earliest timestamp) or null. */
  async peek(): Promise<PendingMutation | null> {
    const queue = await this.getAll();
    return queue.length > 0 ? queue[0] : null;
  }

  /** Return the number of pending mutations. */
  async size(): Promise<number> {
    const queue = await this.getAll();
    return queue.length;
  }

  // ── Mutations ───────────────────────────────────────────────────────────

  /**
   * Remove a mutation by its UUID.
   * Returns `true` if a mutation was removed, `false` if not found.
   */
  async remove(id: string): Promise<boolean> {
    const queue = await this.getAll();
    const before = queue.length;

    const filtered = queue.filter((m) => m.id !== id);
    if (filtered.length === before) return false;

    await this.storage.setItem(STORE_KEY, filtered);
    return true;
  }

  /**
   * Atomically dequeue the head mutation (oldest timestamp).
   * Returns the dequeued mutation, or `null` if the queue is empty.
   */
  async dequeue(): Promise<PendingMutation | null> {
    const queue = await this.getAll();
    if (queue.length === 0) return null;

    const [head, ...rest] = queue;
    await this.storage.setItem(STORE_KEY, rest);
    return head;
  }

  /**
   * Clear the entire queue.
   */
  async clear(): Promise<void> {
    await this.storage.setItem(STORE_KEY, []);
  }
}
