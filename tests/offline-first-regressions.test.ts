/**
 * Regression tests for the offline-first defects fixed alongside them.
 *
 * Each block names the failure it locks down, so a future change that
 * reintroduces one of them fails here rather than in a user's data.
 */

import { LocalStorageManager } from "../src/lib/storage/LocalStorageManager";
import { MutationQueueManager, MAX_ATTEMPTS } from "../src/lib/queue/MutationQueueManager";
import { collapseDuplicates } from "../src/lib/storage/migrations";
import { LocalEntity } from "../src/lib/types/local-storage";

// A single in-memory store shared by every localforage instance, mirroring the
// real setup where several managers address the same object store. It lives on
// globalThis because `jest.mock` is hoisted above module-level declarations.
const stores: Map<string, Map<string, any>> = ((
  globalThis as any
).__mockStores ??= new Map());

jest.mock("localforage", () => ({
  createInstance: jest.fn(({ storeName }: { storeName: string }) => {
    const all: Map<string, Map<string, any>> = ((globalThis as any).__mockStores ??=
      new Map());
    if (!all.has(storeName)) all.set(storeName, new Map());
    const store = () => all.get(storeName)!;
    return {
      getItem: jest.fn(async (key: string) => {
        const value = store().get(key);
        // localforage returns structured clones, not live references.
        return value === undefined ? null : JSON.parse(JSON.stringify(value));
      }),
      setItem: jest.fn(async (key: string, value: any) => {
        store().set(key, JSON.parse(JSON.stringify(value)));
        return value;
      }),
      removeItem: jest.fn(async (key: string) => {
        store().delete(key);
      }),
      clear: jest.fn(async () => {
        store().clear();
      }),
      keys: jest.fn(async () => Array.from(store().keys())),
      ready: jest.fn(() => Promise.resolve()),
    };
  }),
}));

beforeEach(() => {
  stores.forEach((store) => store.clear());
});

// ── Queue concurrency ───────────────────────────────────────────────────────

describe("MutationQueueManager concurrency", () => {
  it("does not lose a mutation enqueued while another instance is dequeuing", async () => {
    // The sync engine and the UI hold different manager instances against the
    // same object store. Interleaved read-modify-write cycles used to drop
    // whichever write landed first.
    const engineSide = new MutationQueueManager();
    const uiSide = new MutationQueueManager();

    await engineSide.enqueue("expenses:createExpense", { title: "first" });

    await Promise.all([
      engineSide.dequeue(),
      uiSide.enqueue("expenses:createExpense", { title: "second" }),
    ]);

    const remaining = await uiSide.getAll();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].payload.title).toBe("second");
  });

  it("keeps every mutation when many are enqueued concurrently", async () => {
    const queue = new MutationQueueManager();

    await Promise.all(
      Array.from({ length: 25 }, (_, i) =>
        queue.enqueue("expenses:createExpense", { index: i }),
      ),
    );

    const all = await queue.getAll();
    expect(all).toHaveLength(25);
    expect(new Set(all.map((m) => m.payload.index)).size).toBe(25);
  });

  it("notifies subscribers on every change", async () => {
    const queue = new MutationQueueManager();
    const listener = jest.fn();
    const unsubscribe = queue.subscribe(listener);

    await queue.enqueue("expenses:createExpense", {});
    await queue.dequeue();

    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();

    await queue.enqueue("expenses:createExpense", {});
    expect(listener).toHaveBeenCalledTimes(2);
  });
});

// ── Failure handling ────────────────────────────────────────────────────────

describe("MutationQueueManager failure handling", () => {
  it("dead-letters instead of discarding after MAX_ATTEMPTS", async () => {
    const queue = new MutationQueueManager();
    const mutation = await queue.enqueue("expenses:createExpense", { title: "rent" });

    for (let i = 1; i < MAX_ATTEMPTS; i++) {
      const attempts = await queue.recordFailure(mutation.id, "boom");
      expect(attempts).toBe(i);
      expect(await queue.size()).toBe(1);
    }

    expect(await queue.recordFailure(mutation.id, "boom")).toBe(-1);
    expect(await queue.size()).toBe(0);

    // The user's data still exists — it is parked, not lost.
    const dead = await queue.getDeadLetters();
    expect(dead).toHaveLength(1);
    expect(dead[0].payload.title).toBe("rent");
    expect(dead[0].lastError).toBe("boom");
  });

  it("puts dead letters back on the queue with a clean slate", async () => {
    const queue = new MutationQueueManager();
    const mutation = await queue.enqueue("expenses:createExpense", { title: "rent" });
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      await queue.recordFailure(mutation.id, "boom");
    }

    expect(await queue.retryDeadLetters()).toBe(1);
    expect(await queue.getDeadLetters()).toHaveLength(0);

    const [requeued] = await queue.getAll();
    expect(requeued.payload.title).toBe("rent");
    expect(requeued.attempts).toBe(0);
    expect(requeued.lastError).toBeUndefined();
  });
});

// ── Stable record identity ──────────────────────────────────────────────────

describe("LocalStorageManager record identity", () => {
  const newManager = async () => {
    const manager = new LocalStorageManager();
    await manager.initialize("user-1");
    return manager;
  };

  it("keeps the local key stable after a row syncs, so edits still resolve", async () => {
    // Previously the UI switched to displaying the cloud id once a row synced,
    // and every later edit or delete silently found no record.
    const manager = await newManager();

    const saved = await manager.saveExpense({
      amount: 10,
      title: "Coffee",
      category: ["food"],
      for: [],
      date: Date.now(),
    } as any);

    await manager.markEntityAsSynced("expenses", saved.id, "convex_abc");

    const synced = await manager.getExpenseById(saved.id);
    expect(synced?.id).toBe(saved.id);
    expect(synced?.cloudId).toBe("convex_abc");
    expect(synced?.syncStatus).toBe("synced");

    const updated = await manager.updateExpense(saved.id, { amount: 12 });
    expect(updated?.amount).toBe(12);
    expect(await manager.deleteExpense(saved.id)).toBe(true);
  });

  it("resolves a row from its cloud id", async () => {
    const manager = await newManager();
    const card = await manager.saveCard({ name: "Visa" } as any);
    await manager.markEntityAsSynced("cards", card.id, "convex_card");

    const found = await manager.findByCloudId("cards", "convex_card");
    expect(found?.id).toBe(card.id);
  });

  it("does not enqueue anything of its own", async () => {
    // The storage layer used to maintain a second mutation queue, so an
    // offline write produced two outbound mutations and a duplicate row.
    const manager = await newManager();
    await manager.saveExpense({
      amount: 10,
      title: "Coffee",
      category: ["food"],
      for: [],
      date: Date.now(),
    } as any);

    const legacyQueue = stores.get("local_first_data")?.get("pending_mutations");
    expect(legacyQueue).toBeUndefined();
    expect(await new MutationQueueManager().size()).toBe(0);
  });

  it("only deletes rows that are fully synced", async () => {
    const manager = await newManager();

    const pendingRow = await manager.saveExpense({
      amount: 1,
      title: "Unsent",
      category: [],
      for: [],
      date: Date.now(),
    } as any);
    const syncedRow = await manager.saveExpense({
      amount: 2,
      title: "Sent",
      category: [],
      for: [],
      date: Date.now(),
    } as any);
    await manager.markEntityAsSynced("expenses", syncedRow.id, "convex_sent");

    const removed = await manager.removeSyncedEntities("expenses", [
      pendingRow.id,
      syncedRow.id,
    ]);

    expect(removed).toBe(1);
    expect(await manager.getExpenseById(pendingRow.id)).not.toBeNull();
    expect(await manager.getExpenseById(syncedRow.id)).toBeNull();
  });

  it("wipes local data when a different user signs in", async () => {
    const manager = await newManager();
    await manager.saveExpense({
      amount: 10,
      title: "Coffee",
      category: [],
      for: [],
      date: Date.now(),
    } as any);
    expect(await manager.getExpenses()).toHaveLength(1);

    await manager.initialize("user-2");
    expect(await manager.getExpenses()).toHaveLength(0);
  });

  it("bulk-merges a hydration pass in one write with per-doc semantics", async () => {
    const manager = await newManager();

    // A synced row to update, and a local row whose identity must survive.
    await manager.insertEntity("cards", "convex_a", {
      cloudId: "convex_a",
      name: "Visa",
      updatedAt: 1,
    });
    const localRow = await manager.saveCard({ name: "Cash" } as any);

    await manager.bulkMergeServerDocs(
      "cards",
      {
        convex_a: { cloudId: "convex_a", name: "Visa Gold", updatedAt: 2 },
        // Update targeting a missing key must be a no-op, not an insert.
        ghost: { cloudId: "ghost", name: "Ghost", updatedAt: 2 },
      },
      {
        convex_b: { cloudId: "convex_b", name: "Amex", updatedAt: 3 },
        // Insert colliding with an existing key must not overwrite it.
        [localRow.id]: { cloudId: "convex_c", name: "Clobber", updatedAt: 9 },
      },
    );

    const updatedRow = await manager.getEntityById<any>("cards", "convex_a");
    expect(updatedRow?.name).toBe("Visa Gold");
    expect(updatedRow?.syncStatus).toBe("synced");

    expect(await manager.getEntityById("cards", "ghost")).toBeNull();

    const insertedRow = await manager.getEntityById<any>("cards", "convex_b");
    expect(insertedRow?.name).toBe("Amex");
    expect(insertedRow?.localId).toBe("hydrated_convex_b");

    const untouched = await manager.getEntityById<any>("cards", localRow.id);
    expect(untouched?.name).toBe("Cash");
    expect(untouched?.syncStatus).toBe("pending");
  });

  it("applies server updates without marking the row unsent", async () => {
    const manager = await newManager();
    await manager.insertEntity("cards", "convex_card", {
      cloudId: "convex_card",
      name: "Visa",
      updatedAt: 1,
    });

    await manager.applyServerUpdate("cards", "convex_card", {
      cloudId: "convex_card",
      name: "Visa Gold",
      updatedAt: 2,
    });

    const row = await manager.getEntityById<LocalEntity & { name: string }>(
      "cards",
      "convex_card",
    );
    expect(row?.name).toBe("Visa Gold");
    expect(row?.syncStatus).toBe("synced");
  });
});

// ── Migration of legacy data ────────────────────────────────────────────────

describe("collapseDuplicates", () => {
  const row = (over: Partial<LocalEntity>): LocalEntity => ({
    id: "x",
    localId: "local_x",
    syncStatus: "synced",
    version: 1,
    createdAt: 1,
    updatedAt: 1,
    ...over,
  });

  it("merges a local row and its hydrated twin onto the hydrated key", () => {
    const collection = {
      local_1: row({ id: "local_1", cloudId: "cloud_1", updatedAt: 5 }),
      cloud_1: row({ id: "cloud_1", cloudId: "cloud_1", updatedAt: 2 }),
    };

    const { rows, remap, changed } = collapseDuplicates(collection);

    expect(Object.keys(rows)).toEqual(["cloud_1"]);
    expect(rows.cloud_1.updatedAt).toBe(5); // newest data wins
    expect(rows.cloud_1.id).toBe("cloud_1"); // identity from the survivor
    expect(remap.get("local_1")).toBe("cloud_1");
    expect(changed).toBe(true);
  });

  it("leaves rows that have never synced alone", () => {
    const collection = { local_1: row({ id: "local_1" }) };
    const { rows, changed } = collapseDuplicates(collection);

    expect(Object.keys(rows)).toEqual(["local_1"]);
    expect(changed).toBe(false);
  });

  it("keeps a synced row that has no duplicate", () => {
    const collection = {
      local_1: row({ id: "local_1", cloudId: "cloud_1" }),
    };
    const { rows, remap } = collapseDuplicates(collection);

    expect(Object.keys(rows)).toEqual(["local_1"]);
    expect(remap.get("cloud_1")).toBe("local_1");
  });
});
