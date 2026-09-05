/**
 * Phase-3 sync reliability:
 *  1. a queued mutation carries a stable idempotency key across retries, and
 *     the server-side wrapper turns a re-delivery into a no-op replay;
 *  2. a record deleted offline is not resurrected by a hydration pass that
 *     still sees it on the server, and its tombstone is pruned once the
 *     server catches up;
 *  3. a hydration pass racing the queue drain does not leave a duplicate
 *     local copy of a freshly-synced record.
 */

jest.mock("../convex/_generated/api", () => ({
  api: {
    expenses: {
      createExpense: "expenses:createExpense",
      updateExpense: "expenses:updateExpense",
      deleteExpense: "expenses:deleteExpense",
      createCategory: "expenses:createCategory",
      createForValue: "expenses:createForValue",
      archiveCategory: "expenses:archiveCategory",
      deleteCategory: "expenses:deleteCategory",
      getExpenses: "expenses:getExpenses",
      getCategories: "expenses:getCategories",
      getForValues: "expenses:getForValues",
    },
    cardsAndIncome: {
      createIncome: "income:createIncome",
      updateIncome: "income:updateIncome",
      deleteIncome: "income:deleteIncome",
      addCard: "cards:addCard",
      updateCard: "cards:updateCard",
      deleteCard: "cards:deleteCard",
      transferFunds: "transferFunds",
      archiveIncomeCategory: "incomeCategories:archiveIncomeCategory",
      deleteIncomeCategory: "incomeCategories:deleteIncomeCategory",
      createIncomeCategory: "incomeCategories:createIncomeCategory",
      getIncome: "cardsAndIncome:getIncome",
      getMyCards: "cardsAndIncome:getMyCards",
      getIncomeCategories: "cardsAndIncome:getIncomeCategories",
    },
    loans: {
      createLoan: "loans:createLoan",
      updateLoan: "loans:updateLoan",
      deleteLoan: "loans:deleteLoan",
      payInstallment: "loans:payInstallment",
      getLoans: "loans:getLoans",
    },
    userSettings: { update: "userSettings:update" },
  },
}));

jest.mock("convex/browser", () => ({
  ConvexClient: jest.fn().mockImplementation(() => ({
    mutation: (...args: any[]) => (globalThis as any).__convexMutation(...args),
    query: (...args: any[]) => (globalThis as any).__convexQuery(...args),
    close: jest.fn(),
  })),
}));

jest.mock("localforage", () => ({
  createInstance: jest.fn(({ storeName }: { storeName: string }) => {
    const all: Map<string, Map<string, any>> = ((globalThis as any).__syncStores ??=
      new Map());
    if (!all.has(storeName)) all.set(storeName, new Map());
    const store = () => all.get(storeName)!;
    return {
      getItem: jest.fn(async (key: string) => {
        const value = store().get(key);
        return value === undefined ? null : JSON.parse(JSON.stringify(value));
      }),
      setItem: jest.fn(async (key: string, value: any) => {
        store().set(key, JSON.parse(JSON.stringify(value)));
        return value;
      }),
      removeItem: jest.fn(async (key: string) => store().delete(key)),
      clear: jest.fn(async () => store().clear()),
      keys: jest.fn(async () => Array.from(store().keys())),
      ready: jest.fn(() => Promise.resolve()),
    };
  }),
}));

import { localDataStore } from "../src/lib/store/LocalDataStore";
import { mutationQueue } from "../src/lib/queue/MutationQueueManager";
import { localStorageManager } from "../src/lib/storage/LocalStorageManager";
import { syncEngine } from "../src/lib/sync/SyncEngine";
import { hydrationService } from "../src/lib/sync/HydrationService";

/**
 * Issue 1 — hydration fetched the server snapshot *before* the drain had
 * committed the offline creates, then merged *after* the drain had linked the
 * rows, and deleted them locally as "removed upstream".
 * Issue 6 — a mutation enqueued while online waited for the 30 s timer.
 */

let calls: { fn: string; args: any }[];
let expensesOnServer: any[];
let queryStartedWith: any[][];

const hydrationClient = {
  query: (...args: any[]) => (globalThis as any).__convexQuery(...args),
} as any;

const serverExpense = (id: string, title: string) => ({
  _id: id,
  _creationTime: 1,
  amount: 12,
  title,
  category: ["Food"],
  for: [],
  date: 1,
});

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

beforeEach(async () => {
  ((globalThis as any).__syncStores as Map<string, Map<string, any>>)?.forEach(
    (store) => store.clear(),
  );
  calls = [];
  expensesOnServer = [];
  queryStartedWith = [];
  (globalThis as any).__convexMutation = async (fn: string, args: any) => {
    calls.push({ fn, args });
    // The server commits after a network round-trip.
    await delay(40);
    if (fn === "expenses:createExpense") {
      const id = `cloud_${calls.length}`;
      expensesOnServer = [...expensesOnServer, serverExpense(id, args.title)];
      return id;
    }
    return { ok: true };
  };
  (globalThis as any).__convexQuery = async (fn: string) => {
    if (fn === "expenses:getExpenses") {
      // Snapshot taken at request time, delivered after a round-trip.
      const snapshot = expensesOnServer;
      queryStartedWith.push(snapshot);
      await delay(20);
      return snapshot;
    }
    return [];
  };

  hydrationService.reset();
  localDataStore.reset();
  await localDataStore.init("user-1");
});

afterEach(() => {
  syncEngine.stop();
});

describe("Issue 1 — reconnect: hydration vs drain", () => {
  it("keeps rows that finished syncing while the hydration snapshot was in flight", async () => {
    // Engine is offline while the user records expenses (nothing drains yet).
    syncEngine.start("https://example.convex.cloud", "token-1");
    (syncEngine as any).isOnline = false;
    const a = await localDataStore.addExpense({ amount: 1, title: "Race 1", category: ["Food"], for: [], date: 1 });
    const b = await localDataStore.addExpense({ amount: 2, title: "Race 2", category: ["Food"], for: [], date: 1 });
    const c = await localDataStore.addExpense({ amount: 3, title: "Race 3", category: ["Food"], for: [], date: 1 });
    expect(await mutationQueue.size()).toBe(3);

    // Reconnect: OfflineFirstWrapper fires the drain and the pull together.
    (syncEngine as any).isOnline = true;
    const drain = syncEngine.drainNow();
    const hydrate = hydrationService.hydrate(hydrationClient, "token-1", { force: true });
    await Promise.all([drain, hydrate]);

    expect(await mutationQueue.size()).toBe(0);
    const rows = await localStorageManager.getEntities<any>("expenses");
    const byId = Object.fromEntries(rows.map((r) => [r.id, r]));
    // All three rows survive, each linked to its server document, exactly once.
    expect(rows).toHaveLength(3);
    for (const created of [a, b, c]) {
      expect(byId[created._id]).toBeDefined();
      expect(byId[created._id].syncStatus).toBe("synced");
      expect(byId[created._id].cloudId).toMatch(/^cloud_/);
    }
    // The UI snapshot agrees.
    expect(localDataStore.getSnapshot().expenses.map((e) => e.title).sort()).toEqual([
      "Race 1",
      "Race 2",
      "Race 3",
    ]);
    // The server side is intact and not duplicated.
    expect(expensesOnServer.map((e) => e.title).sort()).toEqual(["Race 1", "Race 2", "Race 3"]);
    expect(calls.filter((c) => c.fn === "expenses:createExpense")).toHaveLength(3);
  });

  it("still removes rows that really were deleted upstream", async () => {
    syncEngine.start("https://example.convex.cloud", "token-1");
    const created = await localDataStore.addExpense({ amount: 1, title: "Gone", category: ["Food"], for: [], date: 1 });
    await syncEngine.drainNow();
    expect((await localStorageManager.getEntityById<any>("expenses", created._id))?.cloudId).toBeDefined();

    // Deleted on another device: the server no longer returns it.
    expensesOnServer = [];
    await delay(5); // lastSyncedAt is strictly older than the next fetch
    await hydrationService.hydrate(hydrationClient, "token-1", { force: true });
    expect(await localStorageManager.getEntities("expenses")).toHaveLength(0);
  });

  it("does not remove a row linked after the snapshot was requested (cross-tab drain)", async () => {
    // Simulates another tab draining while this tab hydrates: the row gets
    // its cloudId after our fetch started, with no shared lock to order them.
    syncEngine.start("https://example.convex.cloud", "token-1");
    (syncEngine as any).isOnline = false; // this tab is not draining
    const created = await localDataStore.addExpense({ amount: 1, title: "Other tab", category: ["Food"], for: [], date: 1 });
    (globalThis as any).__convexQuery = async (fn: string) => {
      if (fn === "expenses:getExpenses") {
        const snapshot = expensesOnServer; // still empty
        await mutationQueue.dequeue();
        await localStorageManager.markEntityAsSynced("expenses", created._id, "cloud_x");
        return snapshot;
      }
      return [];
    };
    await hydrationService.hydrate(hydrationClient, "token-1", { force: true });
    expect(await localStorageManager.getEntities("expenses")).toHaveLength(1);
  });
});

describe("Issue 6 — drain on enqueue", () => {
  it("sends a mutation enqueued while online without waiting for the timer", async () => {
    syncEngine.start("https://example.convex.cloud", "token-1");
    (syncEngine as any).isOnline = true;
    await localDataStore.addExpense({ amount: 5, title: "Prompt", category: ["Food"], for: [], date: 1 });
    // No drainNow(), no timer, no reconnect — just wait a round-trip.
    await delay(150);
    expect(await mutationQueue.size()).toBe(0);
    expect(calls.map((c) => c.fn)).toEqual(["expenses:createExpense"]);
  });

  it("does not send while offline and does not re-trigger on failure notifications", async () => {
    syncEngine.start("https://example.convex.cloud", "token-1");
    (syncEngine as any).isOnline = false;
    await localDataStore.addExpense({ amount: 5, title: "Later", category: ["Food"], for: [], date: 1 });
    await delay(100);
    expect(calls).toHaveLength(0);
    expect(await mutationQueue.size()).toBe(1);

    // Back online with a server that rejects: exactly one attempt per pass,
    // no tight retry loop from the queue's own change notifications.
    (globalThis as any).__convexMutation = async (fn: string) => {
      calls.push({ fn, args: {} });
      throw new Error("Amount must be a positive number");
    };
    (syncEngine as any).isOnline = true;
    await syncEngine.drainNow();
    await delay(100);
    expect(calls).toHaveLength(1);
    expect(await mutationQueue.size()).toBe(1);
  });
});
