import { MutationQueueManager } from '../src/lib/queue/MutationQueueManager';
import { PendingMutation } from '../src/lib/types/local-storage';

// Mock localforage
const mockStore: Map<string, any> = new Map();

jest.mock('localforage', () => ({
  createInstance: jest.fn(() => ({
    getItem: jest.fn((key: string) => Promise.resolve(mockStore.get(key) ?? null)),
    setItem: jest.fn((key: string, value: any) => {
      mockStore.set(key, value);
      return Promise.resolve();
    }),
    removeItem: jest.fn((key: string) => {
      mockStore.delete(key);
      return Promise.resolve();
    }),
    clear: jest.fn(() => {
      mockStore.clear();
      return Promise.resolve();
    }),
    keys: jest.fn(() => Promise.resolve(Array.from(mockStore.keys()))),
  })),
}));

const UUID_V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('MutationQueueManager', () => {
  let queue: MutationQueueManager;

  beforeEach(() => {
    mockStore.clear();
    queue = new MutationQueueManager();
  });

  // ── enqueue ──────────────────────────────────────────────────────────

  describe('enqueue', () => {
    it('assigns a valid UUIDv4 id to every enqueued mutation', async () => {
      const mutation = await queue.enqueue('api.expenses.createExpense', { amount: 50 });

      expect(mutation.id).toMatch(UUID_V4_RE);
    });

    it('stores the exact action and payload provided', async () => {
      const payload = { title: 'Coffee', amount: 4.5, category: ['food'] };
      const mutation = await queue.enqueue('api.expenses.createExpense', payload);

      expect(mutation.action).toBe('api.expenses.createExpense');
      expect(mutation.payload).toEqual(payload);
    });

    it('sets a numeric timestamp for FIFO ordering', async () => {
      const before = Date.now();
      const mutation = await queue.enqueue('api.expenses.createExpense', {});
      const after = Date.now();

      expect(typeof mutation.timestamp).toBe('number');
      expect(mutation.timestamp).toBeGreaterThanOrEqual(before);
      expect(mutation.timestamp).toBeLessThanOrEqual(after);
    });

    it('returns a mutation that conforms to the PendingMutation interface (4 fields)', async () => {
      const mutation = await queue.enqueue('api.income.createIncome', { amount: 100 });

      const keys = Object.keys(mutation).sort();
      expect(keys).toEqual(['action', 'id', 'payload', 'timestamp']);
    });

    it('generates unique UUIDs per enqueue call', async () => {
      const a = await queue.enqueue('action.a', {});
      const b = await queue.enqueue('action.b', {});

      expect(a.id).not.toBe(b.id);
    });

    it('preserves insertion order when retrieved via getAll', async () => {
      await queue.enqueue('action.first', {});
      await queue.enqueue('action.second', {});
      await queue.enqueue('action.third', {});

      const all = await queue.getAll();
      expect(all).toHaveLength(3);
      expect(all[0].action).toBe('action.first');
      expect(all[1].action).toBe('action.second');
      expect(all[2].action).toBe('action.third');
    });
  });

  // ── getAll ────────────────────────────────────────────────────────────

  describe('getAll', () => {
    it('returns an empty array when the queue is empty', async () => {
      const all = await queue.getAll();
      expect(all).toEqual([]);
    });

    it('always returns FIFO order regardless of internal storage order', async () => {
      // Insert with manipulated timestamps to simulate out-of-order write
      const m1 = await queue.enqueue('slow', {});
      const m2 = await queue.enqueue('fast', {});

      // Tamper: make m2 older than m1 in the stored array
      const stored = await queue.getAll();
      // Reverse the stored array directly in the mock
      mockStore.set('pending_mutations', [...stored].reverse());

      // getAll should re-sort and return FIFO
      const sorted = await queue.getAll();
      expect(sorted[0].timestamp).toBeLessThanOrEqual(sorted[1].timestamp);
    });
  });

  // ── peek ──────────────────────────────────────────────────────────────

  describe('peek', () => {
    it('returns null when the queue is empty', async () => {
      expect(await queue.peek()).toBeNull();
    });

    it('returns the oldest mutation without removing it', async () => {
      await queue.enqueue('old.action', {});
      await queue.enqueue('new.action', {});

      const head = await queue.peek();
      expect(head?.action).toBe('old.action');

      // Queue size should remain unchanged
      expect(await queue.size()).toBe(2);
    });
  });

  // ── size ──────────────────────────────────────────────────────────────

  describe('size', () => {
    it('returns 0 for an empty queue', async () => {
      expect(await queue.size()).toBe(0);
    });

    it('returns the exact count after multiple enqueues', async () => {
      await queue.enqueue('a', {});
      await queue.enqueue('b', {});
      await queue.enqueue('c', {});

      expect(await queue.size()).toBe(3);
    });
  });

  // ── remove ────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('removes a mutation by its UUID and returns true', async () => {
      const mutation = await queue.enqueue('to.remove', {});
      const removed = await queue.remove(mutation.id);

      expect(removed).toBe(true);
      expect(await queue.size()).toBe(0);
    });

    it('returns false when the id does not exist', async () => {
      expect(await queue.remove('nonexistent-id')).toBe(false);
    });

    it('does not affect other mutations', async () => {
      const keep = await queue.enqueue('keep', {});
      const drop = await queue.enqueue('drop', {});

      await queue.remove(drop.id);

      const remaining = await queue.getAll();
      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).toBe(keep.id);
    });
  });

  // ── dequeue ───────────────────────────────────────────────────────────

  describe('dequeue', () => {
    it('returns null when the queue is empty', async () => {
      expect(await queue.dequeue()).toBeNull();
    });

    it('removes and returns the head mutation (FIFO)', async () => {
      await queue.enqueue('first', {});
      await queue.enqueue('second', {});
      await queue.enqueue('third', {});

      const head = await queue.dequeue();
      expect(head?.action).toBe('first');

      const remaining = await queue.getAll();
      expect(remaining).toHaveLength(2);
      expect(remaining[0].action).toBe('second');
    });

    it('dequeues in strict FIFO sequence', async () => {
      await queue.enqueue('a', {});
      await queue.enqueue('b', {});

      const first = await queue.dequeue();
      const second = await queue.dequeue();

      expect(first?.action).toBe('a');
      expect(second?.action).toBe('b');
      expect(await queue.dequeue()).toBeNull();
    });
  });

  // ── clear ──────────────────────────────────────────────────────────────

  describe('clear', () => {
    it('empties the entire queue', async () => {
      await queue.enqueue('x', {});
      await queue.enqueue('y', {});

      await queue.clear();

      expect(await queue.size()).toBe(0);
      expect(await queue.getAll()).toEqual([]);
    });
  });

  // ── Idempotency key contract ──────────────────────────────────────────

  describe('UUID idempotency contract', () => {
    it('never produces colliding IDs across 500 enqueues', async () => {
      const ids = new Set<string>();

      for (let i = 0; i < 500; i++) {
        const mutation = await queue.enqueue('action', { index: i });
        expect(ids.has(mutation.id)).toBe(false);
        ids.add(mutation.id);
      }

      expect(ids.size).toBe(500);
    });

    it('IDs are usable as reliable IndexedDB / Map keys', async () => {
      const mutation = await queue.enqueue('key.test', {});
      const lookup = new Map<string, PendingMutation>();

      lookup.set(mutation.id, mutation);
      expect(lookup.get(mutation.id)?.action).toBe('key.test');
    });
  });
});
