/**
 * Issue 3 — a mutation the server rejects for good must not leave the UI
 * presenting its optimistic rows as saved. Rows are flagged `failed` (never
 * silently deleted); the user can retry or discard; a rejected delete stops
 * hiding the server's copy.
 */

jest.mock("../convex/_generated/api", () => ({
  api: {
    expenses: { createExpense: "expenses:createExpense", updateExpense: "expenses:updateExpense", deleteExpense: "expenses:deleteExpense", createCategory: "expenses:createCategory", createForValue: "f", archiveCategory: "a", deleteCategory: "d", getExpenses: "expenses:getExpenses", getCategories: "c", getForValues: "fv" },
    cardsAndIncome: { createIncome: "income:createIncome", updateIncome: "u", deleteIncome: "di", addCard: "cards:addCard", updateCard: "uc", deleteCard: "cards:deleteCard", transferFunds: "transferFunds", archiveIncomeCategory: "ai", deleteIncomeCategory: "dic", createIncomeCategory: "cic", getIncome: "i", getMyCards: "m", getIncomeCategories: "ic" },
    loans: { createLoan: "l", updateLoan: "ul", deleteLoan: "dl", payInstallment: "loans:payInstallment", getLoans: "gl" },
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
    const all: Map<string, Map<string, any>> = ((globalThis as any).__dlStores ??= new Map());
    if (!all.has(storeName)) all.set(storeName, new Map());
    const store = () => all.get(storeName)!;
    return {
      getItem: jest.fn(async (key: string) => { const v = store().get(key); return v === undefined ? null : JSON.parse(JSON.stringify(v)); }),
      setItem: jest.fn(async (key: string, value: any) => { store().set(key, JSON.parse(JSON.stringify(value))); return value; }),
      removeItem: jest.fn(async (key: string) => store().delete(key)),
      clear: jest.fn(async () => store().clear()),
      keys: jest.fn(async () => Array.from(store().keys())),
      ready: jest.fn(() => Promise.resolve()),
    };
  }),
}));

import { localDataStore } from "../src/lib/store/LocalDataStore";
import { mutationQueue, MAX_ATTEMPTS } from "../src/lib/queue/MutationQueueManager";
import { localStorageManager } from "../src/lib/storage/LocalStorageManager";
import { syncEngine } from "../src/lib/sync/SyncEngine";
import { hydrationService } from "../src/lib/sync/HydrationService";
import { getTombstonedIds } from "../src/lib/sync/tombstones";

let mutationImpl: (fn: string, args: any) => Promise<any>;
let expensesOnServer: any[];
const hydrationClient = { query: (...a: any[]) => (globalThis as any).__convexQuery(...a) } as any;

const reject = (msg: string) => async () => { throw new Error(`[CONVEX M(x)] Server Error\nUncaught ConvexError: ${msg}`); };
const drainUntilDead = async () => { for (let i = 0; i < MAX_ATTEMPTS; i++) await syncEngine.drainNow(); };

beforeEach(async () => {
  ((globalThis as any).__dlStores as Map<string, Map<string, any>>)?.forEach((s) => s.clear());
  expensesOnServer = [];
  mutationImpl = async (fn) => (fn === "expenses:createExpense" ? "cloud_e1" : fn === "cards:addCard" ? "cloud_c1" : { ok: true });
  (globalThis as any).__convexMutation = (fn: string, args: any) => mutationImpl(fn, args);
  (globalThis as any).__convexQuery = async (fn: string) => (fn === "expenses:getExpenses" ? expensesOnServer : []);
  hydrationService.reset();
  localDataStore.reset();
  (localStorageManager as any).initializedFor = null;
  await localDataStore.init("user-1");
  syncEngine.start("https://example.convex.cloud", "token-1");
  (syncEngine as any).isOnline = false; // enqueue without draining
});

afterEach(() => syncEngine.stop());

describe("Issue 3 — rejected create", () => {
  it("flags the row as failed instead of leaving it looking saved, and lets the user discard it", async () => {
    const created = await localDataStore.addExpense({ amount: 500, title: "Phantom", category: ["Food"], for: [], date: 1 });
    mutationImpl = reject("Amount must be a positive number");
    (syncEngine as any).isOnline = true;
    await drainUntilDead();

    expect(await mutationQueue.getDeadLetters()).toHaveLength(1);
    const row = await localStorageManager.getEntityById<any>("expenses", created._id);
    expect(row).not.toBeNull(); // never silently deleted
    expect(row.syncStatus).toBe("failed");
    expect(localDataStore.getSnapshot().expenses[0].syncStatus).toBe("failed");

    // Hydration must neither overwrite nor remove a failed row.
    await hydrationService.hydrate(hydrationClient, "token-1", { force: true });
    expect((await localStorageManager.getEntityById<any>("expenses", created._id))?.syncStatus).toBe("failed");

    await syncEngine.discardDeadLetters();
    expect(await mutationQueue.getDeadLetters()).toHaveLength(0);
    expect(await localStorageManager.getEntityById("expenses", created._id)).toBeNull();
    expect(localDataStore.getSnapshot().expenses).toHaveLength(0);
  });

  it("retry delivers the row once the server accepts it", async () => {
    const created = await localDataStore.addExpense({ amount: 5, title: "Later ok", category: ["Food"], for: [], date: 1 });
    mutationImpl = reject("Card not found or not authorized");
    (syncEngine as any).isOnline = true;
    await drainUntilDead();
    expect((await localStorageManager.getEntityById<any>("expenses", created._id)).syncStatus).toBe("failed");

    mutationImpl = async () => "cloud_e1";
    await mutationQueue.retryDeadLetters();
    await syncEngine.drainNow();
    const row = await localStorageManager.getEntityById<any>("expenses", created._id);
    expect(row.syncStatus).toBe("synced");
    expect(row.cloudId).toBe("cloud_e1");
    expect(await mutationQueue.getDeadLetters()).toHaveLength(0);
  });
});

describe("Issue 3 — rejected transfer", () => {
  it("flags both optimistic rows and removes them on discard", async () => {
    const expense = await localStorageManager.saveExpense({ amount: 500, title: "Transfer to Cash", category: ["Card Transfer"], for: [], date: 1, cardId: "card_a" });
    const income = await localStorageManager.saveIncome({ amount: 500, source: "Transfer from Visa", category: "Card Transfer", date: 1, cardId: "card_b" });
    await mutationQueue.enqueue("transferFunds", { token: "t", fromCardId: "card_a", toCardId: "card_b", amount: 500, localExpenseId: expense.id, localIncomeId: income.id });
    mutationImpl = reject("Insufficient funds for the transfer.");
    (syncEngine as any).isOnline = true;
    await drainUntilDead();

    expect((await localStorageManager.getEntityById<any>("expenses", expense.id)).syncStatus).toBe("failed");
    expect((await localStorageManager.getEntityById<any>("income", income.id)).syncStatus).toBe("failed");

    await syncEngine.discardDeadLetters();
    expect(await localStorageManager.getEntityById("expenses", expense.id)).toBeNull();
    expect(await localStorageManager.getEntityById("income", income.id)).toBeNull();
    await localDataStore.refresh();
    // Balances no longer include the phantom transfer.
    expect(localDataStore.getSnapshot().expenses).toHaveLength(0);
    expect(localDataStore.getSnapshot().income).toHaveLength(0);
  });
});

describe("Issue 3 — rejected delete", () => {
  it("drops the tombstone so the next hydration restores the server's row", async () => {
    const created = await localDataStore.addExpense({ amount: 1, title: "Kept upstream", category: ["Food"], for: [], date: 1 });
    (syncEngine as any).isOnline = true;
    await syncEngine.drainNow(); // linked to cloud_e1
    (syncEngine as any).isOnline = false;
    expect(await localDataStore.deleteExpense(created._id)).toBe(true);
    expect(await getTombstonedIds("expenses")).toEqual(new Set(["cloud_e1"]));

    mutationImpl = reject("You are not authorized to delete this expense");
    (syncEngine as any).isOnline = true;
    await drainUntilDead();
    expect(await getTombstonedIds("expenses")).toEqual(new Set());

    expensesOnServer = [{ _id: "cloud_e1", _creationTime: 1, amount: 1, title: "Kept upstream", category: ["Food"], for: [], date: 1 }];
    await hydrationService.hydrate(hydrationClient, "token-1", { force: true });
    expect(await localStorageManager.getEntities("expenses")).toHaveLength(1);
  });
});

describe("Issue 3 — rejected edit", () => {
  it("flags the edited row and never dead-letters silently", async () => {
    const created = await localDataStore.addExpense({ amount: 1, title: "Edit me", category: ["Food"], for: [], date: 1 });
    (syncEngine as any).isOnline = true;
    await syncEngine.drainNow();
    (syncEngine as any).isOnline = false;
    await localDataStore.updateExpense(created._id, { amount: -5, title: "Edit me", category: ["Food"], for: [], date: 1 });
    mutationImpl = reject("Amount must be a positive number");
    (syncEngine as any).isOnline = true;
    await drainUntilDead();
    const row = await localStorageManager.getEntityById<any>("expenses", created._id);
    expect(row.syncStatus).toBe("failed");
    expect(row.amount).toBe(-5); // local data kept for the user to see/fix
    expect((await mutationQueue.getDeadLetters())[0].lastError).toContain("Amount must be a positive number");
  });
});

describe("Issue 3 — rejected rows and money", () => {
  it("excludes failed rows from card balances while keeping them listed", async () => {
    const card = await localStorageManager.saveCard({ name: "Visa" });
    const other = await localStorageManager.saveCard({ name: "Cash" });
    await localStorageManager.markEntityAsSynced("cards", card.id, "cloud_card_a");
    await localStorageManager.markEntityAsSynced("cards", other.id, "cloud_card_b");
    const expense = await localStorageManager.saveExpense({ amount: 500, title: "Transfer to Cash", category: ["Card Transfer"], for: [], date: 1, cardId: card.id });
    const income = await localStorageManager.saveIncome({ amount: 500, source: "Transfer from Visa", category: "Card Transfer", date: 1, cardId: other.id });
    await mutationQueue.enqueue("transferFunds", { token: "t", fromCardId: card.id, toCardId: other.id, amount: 500, localExpenseId: expense.id, localIncomeId: income.id });
    await localDataStore.refresh();
    const before = Object.fromEntries(localDataStore.getSnapshot().cards.map((c) => [c.cardName, c.balance]));
    expect(before).toEqual({ Visa: -500, Cash: 500 }); // optimistic while pending

    mutationImpl = reject("Insufficient funds for the transfer.");
    (syncEngine as any).isOnline = true;
    await drainUntilDead();
    const after = Object.fromEntries(localDataStore.getSnapshot().cards.map((c) => [c.cardName, c.balance]));
    expect(after).toEqual({ Visa: 0, Cash: 0 }); // rejected: no money moved
    // ...but the rows are still there for the user to see, retry or discard.
    expect(localDataStore.getSnapshot().expenses.map((e) => e.syncStatus)).toEqual(["failed"]);
    expect(localDataStore.getSnapshot().income.map((e) => e.syncStatus)).toEqual(["failed"]);
  });
});
