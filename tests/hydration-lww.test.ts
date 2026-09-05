/**
 * Issue 5 — an edit made on another device must reach a row this device
 * edited earlier. Server documents now carry `updatedAt` (set by every update
 * mutation); hydration compares it against the local row's `updatedAt`.
 * Documents created before the field existed fall back to `_creationTime`.
 */

jest.mock("../convex/_generated/api", () => ({
  api: {
    expenses: { createExpense: "expenses:createExpense", updateExpense: "expenses:updateExpense", deleteExpense: "d", createCategory: "cc", createForValue: "f", archiveCategory: "a", deleteCategory: "dc", getExpenses: "expenses:getExpenses", getCategories: "c", getForValues: "fv" },
    cardsAndIncome: { createIncome: "ci", updateIncome: "u", deleteIncome: "di", addCard: "ac", updateCard: "uc", deleteCard: "dcard", transferFunds: "t", archiveIncomeCategory: "ai", deleteIncomeCategory: "dic", createIncomeCategory: "cic", getIncome: "i", getMyCards: "m", getIncomeCategories: "ic" },
    loans: { createLoan: "l", updateLoan: "ul", deleteLoan: "dl", payInstallment: "p", getLoans: "gl" },
    userSettings: { update: "us" },
  },
}));
jest.mock("convex/browser", () => ({
  ConvexClient: jest.fn().mockImplementation(() => ({
    mutation: (...a: any[]) => (globalThis as any).__convexMutation(...a),
    query: (...a: any[]) => (globalThis as any).__convexQuery(...a),
    close: jest.fn(),
  })),
}));
jest.mock("localforage", () => ({
  createInstance: jest.fn(({ storeName }: { storeName: string }) => {
    const all: Map<string, Map<string, any>> = ((globalThis as any).__lwwStores ??= new Map());
    if (!all.has(storeName)) all.set(storeName, new Map());
    const store = () => all.get(storeName)!;
    return {
      getItem: jest.fn(async (k: string) => { const v = store().get(k); return v === undefined ? null : JSON.parse(JSON.stringify(v)); }),
      setItem: jest.fn(async (k: string, v: any) => { store().set(k, JSON.parse(JSON.stringify(v))); return v; }),
      removeItem: jest.fn(async (k: string) => store().delete(k)),
      clear: jest.fn(async () => store().clear()),
      keys: jest.fn(async () => Array.from(store().keys())),
      ready: jest.fn(() => Promise.resolve()),
    };
  }),
}));

import { localDataStore } from "../src/lib/store/LocalDataStore";
import { localStorageManager } from "../src/lib/storage/LocalStorageManager";
import { syncEngine } from "../src/lib/sync/SyncEngine";
import { hydrationService } from "../src/lib/sync/HydrationService";

let expensesOnServer: any[];
const client = { query: (...a: any[]) => (globalThis as any).__convexQuery(...a) } as any;
const hydrate = () => hydrationService.hydrate(client, "token-1", { force: true });
const doc = (amount: number, extra: Record<string, unknown> = {}) => ({ _id: "cloud_1", _creationTime: 1000, amount, title: "Row", category: ["Food"], for: [], date: 1, ...extra });

beforeEach(async () => {
  ((globalThis as any).__lwwStores as Map<string, Map<string, any>>)?.forEach((s) => s.clear());
  expensesOnServer = [];
  (globalThis as any).__convexMutation = async () => "cloud_1";
  (globalThis as any).__convexQuery = async (fn: string) => (fn === "expenses:getExpenses" ? expensesOnServer : []);
  hydrationService.reset(); localDataStore.reset(); (localStorageManager as any).initializedFor = null;
  await localDataStore.init("user-1");
  syncEngine.start("https://example.convex.cloud", "token-1");
  (syncEngine as any).isOnline = false;
});
afterEach(() => syncEngine.stop());

/** Create + edit locally, sync both, so the local row is `synced` with a recent updatedAt. */
async function syncedLocallyEditedRow() {
  const created = await localDataStore.addExpense({ amount: 10, title: "Row", category: ["Food"], for: [], date: 1 });
  await localDataStore.updateExpense(created._id, { amount: 11, title: "Row", category: ["Food"], for: [], date: 1 });
  (syncEngine as any).isOnline = true;
  await syncEngine.drainNow();
  (syncEngine as any).isOnline = false;
  const row = await localStorageManager.getEntityById<any>("expenses", created._id);
  expect(row.syncStatus).toBe("synced");
  expect(row.cloudId).toBe("cloud_1");
  return created._id;
}

describe("Issue 5 — cross-device edits vs locally edited rows", () => {
  it("applies a server edit stamped after the local edit", async () => {
    const id = await syncedLocallyEditedRow();
    expensesOnServer = [doc(99, { updatedAt: Date.now() + 1000 })];
    await hydrate();
    expect((await localStorageManager.getEntityById<any>("expenses", id)).amount).toBe(99);
    expect(localDataStore.getSnapshot().expenses[0].amount).toBe(99);
  });

  it("keeps the local copy when the server's stamp is older", async () => {
    const id = await syncedLocallyEditedRow();
    expensesOnServer = [doc(99, { updatedAt: 500 })];
    await hydrate();
    expect((await localStorageManager.getEntityById<any>("expenses", id)).amount).toBe(11);
  });

  it("never overwrites an unsent local edit, whatever the server says", async () => {
    const id = await syncedLocallyEditedRow();
    await localDataStore.updateExpense(id, { amount: 12, title: "Row", category: ["Food"], for: [], date: 1 }); // pending
    expensesOnServer = [doc(99, { updatedAt: Date.now() + 1000 })];
    await hydrate();
    expect((await localStorageManager.getEntityById<any>("expenses", id)).amount).toBe(12);
  });

  it("stays compatible with documents that predate updatedAt (creation time fallback)", async () => {
    const id = await syncedLocallyEditedRow();
    expensesOnServer = [doc(99)]; // no updatedAt: legacy document, creation time 1000 is older than the local edit
    await hydrate();
    expect((await localStorageManager.getEntityById<any>("expenses", id)).amount).toBe(11);
    // ...and a never-edited hydrated row still takes the server's values.
    expensesOnServer = [doc(99), { _id: "cloud_2", _creationTime: 1000, amount: 5, title: "Other", category: [], for: [], date: 1 }];
    await hydrate();
    expensesOnServer = [doc(99), { _id: "cloud_2", _creationTime: 1000, amount: 55, title: "Other", category: [], for: [], date: 1 }];
    await hydrate();
    expect((await localStorageManager.getEntityById<any>("expenses", "cloud_2")).amount).toBe(55);
  });
});
