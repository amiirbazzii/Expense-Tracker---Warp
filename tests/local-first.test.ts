/**
 * Test suite for LocalStorageManager's local-first storage behaviour.
 *
 * The ConflictDetector / CloudSyncManager / LocalFirstConvexClient suites that
 * used to live here were removed along with those modules: they were never
 * wired into the app, and the offline path they described was replaced by
 * LocalDataStore + MutationQueueManager + SyncEngine.
 */

import { describe, test, expect, beforeEach, jest } from "@jest/globals";
import { LocalStorageManager } from "../src/lib/storage/LocalStorageManager";
import { LocalExpense } from "../src/lib/types/local-storage";

// Mock localforage.
//
// `function` rather than `const` so the object exists before the modules under
// test are evaluated: they create storage instances at import time, which runs
// before a `const` in this file is initialized.
function getMockLocalforage(): any {
  const g = globalThis as any;
  if (!g.__mockLocalforage) {
    g.__mockLocalforage = {
      config: jest.fn(),
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
      keys: jest.fn(),
      ready: jest.fn(() => Promise.resolve()),
      createInstance: jest.fn(() => getMockLocalforage()),
    };
  }
  return g.__mockLocalforage;
}

const mockLocalforage = getMockLocalforage();

jest.mock("localforage", () => ({
  config: jest.fn((...args: any[]) => getMockLocalforage().config(...args)),
  getItem: jest.fn((...args: any[]) => getMockLocalforage().getItem(...args)),
  setItem: jest.fn((...args: any[]) => getMockLocalforage().setItem(...args)),
  removeItem: jest.fn((...args: any[]) => getMockLocalforage().removeItem(...args)),
  clear: jest.fn((...args: any[]) => getMockLocalforage().clear(...args)),
  keys: jest.fn((...args: any[]) => getMockLocalforage().keys(...args)),
  ready: jest.fn(() => Promise.resolve()),
  createInstance: jest.fn(() => getMockLocalforage()),
}));

describe("LocalStorageManager", () => {
  let storageManager: LocalStorageManager;
  const testUserId = "test-user-123";

  beforeEach(async () => {
    jest.clearAllMocks();
    mockLocalforage.getItem.mockResolvedValue(null);
    storageManager = new LocalStorageManager();
  });

  test("should initialize with user ID", async () => {
    mockLocalforage.getItem.mockResolvedValueOnce(null); // metadata
    mockLocalforage.getItem.mockResolvedValueOnce(null); // syncState

    await storageManager.initialize(testUserId);

    expect(mockLocalforage.setItem).toHaveBeenCalledWith(
      "metadata",
      expect.objectContaining({
        userId: testUserId,
        version: "2.0.0",
      }),
    );
  });

  test("should save expense locally", async () => {
    await storageManager.initialize(testUserId);
    mockLocalforage.getItem.mockResolvedValue({}); // empty expenses collection

    const expenseData = {
      amount: 25.5,
      title: "Coffee",
      category: ["Food"],
      for: ["Personal"],
      date: Date.now(),
      cardId: "card-123",
    };

    const savedExpense = await storageManager.saveExpense(expenseData);

    expect(savedExpense).toMatchObject({
      amount: 25.5,
      title: "Coffee",
      category: ["Food"],
      syncStatus: "pending",
      version: 1,
    });

    expect(savedExpense.id).toBeDefined();
    expect(savedExpense.localId).toBeDefined();
    expect(savedExpense.createdAt).toBeDefined();
  });

  test("should retrieve expenses with filters", async () => {
    await storageManager.initialize(testUserId);

    const mockExpenses = {
      exp1: {
        id: "exp1",
        amount: 25.5,
        title: "Coffee",
        category: ["Food"],
        date: Date.now() - 86400000, // yesterday
        syncStatus: "synced",
      } as LocalExpense,
      exp2: {
        id: "exp2",
        amount: 100.0,
        title: "Groceries",
        category: ["Food"],
        date: Date.now(),
        syncStatus: "pending",
      } as LocalExpense,
    };

    mockLocalforage.getItem.mockResolvedValue(mockExpenses);

    const expenses = await storageManager.getExpenses();
    expect(expenses).toHaveLength(2);
    expect(expenses[0].title).toBe("Groceries"); // sorted by date desc
  });

  test("should update expense and increment version", async () => {
    await storageManager.initialize(testUserId);

    const existingExpense: LocalExpense = {
      id: "exp1",
      localId: "local1",
      amount: 25.5,
      title: "Coffee",
      category: ["Food"],
      for: ["Personal"],
      date: Date.now(),
      syncStatus: "synced",
      version: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    mockLocalforage.getItem.mockResolvedValue({ exp1: existingExpense });

    const updatedExpense = await storageManager.updateExpense("exp1", {
      title: "Premium Coffee",
      amount: 30.0,
    });

    expect(updatedExpense).toMatchObject({
      title: "Premium Coffee",
      amount: 30.0,
      version: 2,
      syncStatus: "pending",
    });
  });

  test("should generate consistent data hash", async () => {
    await storageManager.initialize(testUserId);

    // Mock data for hash calculation
    mockLocalforage.getItem
      .mockResolvedValueOnce({}) // expenses
      .mockResolvedValueOnce({}) // income
      .mockResolvedValueOnce({}) // categories
      .mockResolvedValueOnce({}); // cards

    const hash1 = await storageManager.getDataHash();
    const hash2 = await storageManager.getDataHash();

    expect(hash1).toBe(hash2);
    expect(typeof hash1).toBe("string");
    expect(hash1.length).toBeGreaterThan(0);
  });

  test("should export data correctly", async () => {
    await storageManager.initialize(testUserId);

    const mockMetadata = {
      userId: testUserId,
      deviceId: "device-123",
      version: "2.0.0",
    };

    // Keyed rather than call-ordered: `exportData` reads eight collections and
    // then hashes them, so a fixed sequence of `mockResolvedValueOnce` runs out
    // and hands a collection the metadata object.
    mockLocalforage.getItem.mockImplementation(async (key: unknown) =>
      key === "metadata" ? mockMetadata : {},
    );

    const exportData = await storageManager.exportData();

    expect(exportData).toMatchObject({
      version: "2.0.0",
      userId: testUserId,
      data: {
        expenses: {},
        income: {},
        categories: {},
        cards: {},
      },
    });

    expect(exportData.exportedAt).toBeDefined();
    expect(exportData.checksum).toBeDefined();
  });
});
