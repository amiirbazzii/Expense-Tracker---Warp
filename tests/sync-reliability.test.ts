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
import { getTombstonedIds } from "../src/lib/sync/tombstones";

type Call = { fn: string; args: any };

let calls: Call[];
let mutationImpl: (fn: string, args: any) => Promise<any>;
let expensesOnServer: any[];

const hydrationClient = {
  query: (...args: any[]) => (globalThis as any).__convexQuery(...args),
} as any;

const serverExpense = (id: string) => ({
  _id: id,
  _creationTime: 1,
  amount: 12,
  title: "Coffee",
  category: ["Food"],
  for: [],
  date: 1,
});

beforeEach(async () => {
  ((globalThis as any).__syncStores as Map<string, Map<string, any>>)?.forEach(
    (store) => store.clear(),
  );
  calls = [];
  expensesOnServer = [];
  mutationImpl = async (fn) =>
    fn === "expenses:createExpense" ? "cloud_expense_1" : { ok: true };

  (globalThis as any).__convexMutation = (fn: string, args: any) => {
    calls.push({ fn, args });
    return mutationImpl(fn, args);
  };
  (globalThis as any).__convexQuery = async (fn: string) =>
    fn === "expenses:getExpenses" ? expensesOnServer : [];

  hydrationService.reset();
  localDataStore.reset();
  await localDataStore.init("user-1");
  syncEngine.start("https://example.convex.cloud", "token-1");
});

afterEach(() => {
  syncEngine.stop();
});

describe("idempotency key", () => {
  it("is sent with every drained mutation and stays stable across retries", async () => {
    await localDataStore.addExpense({
      amount: 12,
      title: "Coffee",
      category: ["Food"],
      for: [],
      date: Date.now(),
    });

    // First delivery dies transiently after reaching the server.
    let failNext = true;
    mutationImpl = async () => {
      if (failNext) {
        failNext = false;
        throw new Error("NetworkError: connection lost");
      }
      return "cloud_expense_1";
    };

    await syncEngine.drainNow();
    expect(await mutationQueue.size()).toBe(1); // halted, not dropped

    await syncEngine.drainNow();
    expect(await mutationQueue.size()).toBe(0);

    expect(calls).toHaveLength(2);
    const [first, second] = calls;
    expect(typeof first.args.idempotencyKey).toBe("string");
    expect(first.args.idempotencyKey.length).toBeGreaterThan(0);
    // The retry must present the SAME key, or server-side dedupe is useless.
    expect(second.args.idempotencyKey).toBe(first.args.idempotencyKey);
  });
});

describe("settings through the queue", () => {
  it("drains a queued settings update with its idempotency key", async () => {
    await mutationQueue.enqueue("userSettings:update", {
      token: "stale-token",
      currency: "EUR",
      calendar: "jalali",
    });

    await syncEngine.drainNow();

    expect(await mutationQueue.size()).toBe(0);
    const call = calls.find((c) => c.fn === "userSettings:update");
    expect(call).toBeDefined();
    expect(call!.args).toMatchObject({ currency: "EUR", calendar: "jalali" });
    // The engine stamps the fresh session token, not the enqueued one.
    expect(call!.args.token).toBe("token-1");
    expect(typeof call!.args.idempotencyKey).toBe("string");
  });
});

describe("offline delete vs hydration", () => {
  it("does not resurrect a deleted record the server still returns", async () => {
    const created = await localDataStore.addExpense({
      amount: 12,
      title: "Coffee",
      category: ["Food"],
      for: [],
      date: Date.now(),
    });
    await syncEngine.drainNow(); // row now linked to cloud_expense_1

    // Deleted while "offline": the delete mutation stays queued.
    expect(await localDataStore.deleteExpense(created._id)).toBe(true);

    // Reconnect: hydration runs while the server still has the document
    // (the queued delete has not drained yet).
    expensesOnServer = [serverExpense("cloud_expense_1")];
    await hydrationService.hydrate(hydrationClient, "token-1", { force: true });

    const rows = await localStorageManager.getEntities("expenses");
    expect(rows).toHaveLength(0); // stays deleted

    // The delete drains; the next hydration no longer sees the document and
    // the tombstone is pruned.
    await syncEngine.drainNow();
    expensesOnServer = [];
    await hydrationService.hydrate(hydrationClient, "token-1", { force: true });
    expect(await getTombstonedIds("expenses")).toEqual(new Set());
  });
});

describe("hydration racing the drain", () => {
  it("does not insert a duplicate local copy of a freshly-synced row", async () => {
    const created = await localDataStore.addExpense({
      amount: 12,
      title: "Coffee",
      category: ["Food"],
      for: [],
      date: Date.now(),
    });

    // The server commits the create and (as of that instant) returns the new
    // document from queries — while the drain's response is still in flight.
    mutationImpl = async () => {
      expensesOnServer = [serverExpense("cloud_expense_1")];
      await new Promise((resolve) => setTimeout(resolve, 50));
      return "cloud_expense_1";
    };

    // Reconnect: both phases fire together.
    const drain = syncEngine.drainNow();
    await new Promise((resolve) => setTimeout(resolve, 10)); // drain is mid-mutation
    const hydrate = hydrationService.hydrate(hydrationClient, "token-1", {
      force: true,
    });
    await Promise.all([drain, hydrate]);

    // Exactly one local row, linked to the cloud id — not one per phase.
    const rows = await localStorageManager.getEntities<any>("expenses");
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe(created._id);
    expect(rows[0].cloudId).toBe("cloud_expense_1");
  });
});
