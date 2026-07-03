import { LocalStorageManager } from "../src/lib/storage/LocalStorageManager";
import { PendingMutation } from "../src/lib/types/local-storage";

// Mock localforage
jest.mock("localforage", () => ({
  createInstance: jest.fn(() => {
    const store: { [key: string]: any } = {};
    return {
      setItem: jest.fn((key: string, val: any) => {
        store[key] = val;
        return Promise.resolve(val);
      }),
      getItem: jest.fn((key: string) => {
        return Promise.resolve(store[key] || null);
      }),
      removeItem: jest.fn((key: string) => {
        delete store[key];
        return Promise.resolve();
      }),
      clear: jest.fn(() => {
        Object.keys(store).forEach((key) => delete store[key]);
        return Promise.resolve();
      }),
      keys: jest.fn(() => Promise.resolve(Object.keys(store))),
    };
  }),
}));

// Build Convex args — mirrors the logic in useSyncEngine.ts for testability
function buildConvexArgs(
  storeName: string,
  action: string,
  payload: any,
): Record<string, any> {
  const base = { ...payload };
  delete base.id;
  delete base.localId;
  delete base.syncStatus;
  delete base.version;
  delete base.createdAt;
  delete base.updatedAt;
  delete base.lastSyncedAt;
  delete base.cloudId;
  delete base._id;
  delete base._creationTime;

  switch (storeName) {
    case "expenses":
      if (action === "DELETE") return { expenseId: payload.id };
      if (action === "UPDATE") return { ...base, expenseId: payload.id };
      return base;
    case "income":
      if (action === "DELETE") return { incomeId: payload.id };
      if (action === "UPDATE") return { ...base, incomeId: payload.id };
      return base;
    case "categories":
      return { name: payload.name };
    case "cards":
      if (action === "DELETE") return { cardId: payload.id };
      return { name: payload.name };
    case "forValues":
      return { value: payload.value };
    default:
      return base;
  }
}

describe("Sync Engine — Queue Processing Logic", () => {
  let manager: LocalStorageManager;

  beforeEach(() => {
    manager = new LocalStorageManager();
  });

  describe("buildConvexArgs", () => {
    it("should strip local-only fields from expense CREATE payload", () => {
      const payload = {
        id: "local_123",
        localId: "local_456",
        syncStatus: "pending",
        version: 1,
        createdAt: 1000,
        updatedAt: 1000,
        lastSyncedAt: undefined,
        cloudId: undefined,
        amount: 50,
        title: "Lunch",
        category: ["Food"],
        for: ["Self"],
        date: 1000,
      };

      const args = buildConvexArgs("expenses", "CREATE", payload);
      expect(args.amount).toBe(50);
      expect(args.title).toBe("Lunch");
      expect(args.id).toBeUndefined();
      expect(args.localId).toBeUndefined();
      expect(args.syncStatus).toBeUndefined();
      expect(args.version).toBeUndefined();
    });

    it("should include expenseId for expense UPDATE", () => {
      const payload = { id: "exp_1", amount: 100, title: "Updated" };
      const args = buildConvexArgs("expenses", "UPDATE", payload);
      expect(args.expenseId).toBe("exp_1");
      expect(args.amount).toBe(100);
    });

    it("should include expenseId for expense DELETE", () => {
      const payload = { id: "exp_1" };
      const args = buildConvexArgs("expenses", "DELETE", payload);
      expect(args.expenseId).toBe("exp_1");
    });

    it("should handle income CREATE/UPDATE/DELETE", () => {
      const createPayload = {
        id: "inc_1",
        amount: 200,
        source: "Salary",
        category: "Work",
        date: 1000,
        cardId: "card_1",
      };
      const createArgs = buildConvexArgs("income", "CREATE", createPayload);
      expect(createArgs.amount).toBe(200);
      expect(createArgs.id).toBeUndefined();

      const updateArgs = buildConvexArgs("income", "UPDATE", {
        id: "inc_1",
        amount: 250,
      });
      expect(updateArgs.incomeId).toBe("inc_1");

      const deleteArgs = buildConvexArgs("income", "DELETE", { id: "inc_1" });
      expect(deleteArgs.incomeId).toBe("inc_1");
    });

    it("should handle categories and forValues", () => {
      const catArgs = buildConvexArgs("categories", "CREATE", {
        id: "cat_1",
        name: "Food",
      });
      expect(catArgs.name).toBe("Food");
      expect(catArgs.id).toBeUndefined();

      const fvArgs = buildConvexArgs("forValues", "CREATE", {
        id: "fv_1",
        value: "Friend",
      });
      expect(fvArgs.value).toBe("Friend");
    });

    it("should handle cards CREATE/DELETE", () => {
      const createArgs = buildConvexArgs("cards", "CREATE", {
        id: "card_1",
        name: "Visa",
      });
      expect(createArgs.name).toBe("Visa");

      const deleteArgs = buildConvexArgs("cards", "DELETE", { id: "card_1" });
      expect(deleteArgs.cardId).toBe("card_1");
    });
  });

  describe("markEntityAsSynced", () => {
    it("should update syncStatus to synced and set lastSyncedAt", async () => {
      const expense = await manager.saveExpense(
        {
          amount: 50,
          title: "Test",
          category: ["Food"],
          for: ["Self"],
          date: Date.now(),
        },
        { skipEnqueue: false },
      );

      expect(expense.syncStatus).toBe("pending");

      await manager.markEntityAsSynced("expenses", expense.id, "cloud_exp_1");

      const updatedExpense = await manager.getExpenseById(expense.id);
      expect(updatedExpense?.syncStatus).toBe("synced");
      expect(updatedExpense?.cloudId).toBe("cloud_exp_1");
      expect(updatedExpense?.lastSyncedAt).toBeGreaterThan(0);
    });

    it("should not fail if entity does not exist", async () => {
      await expect(
        manager.markEntityAsSynced("expenses", "nonexistent"),
      ).resolves.not.toThrow();
    });
  });

  describe("FIFO Queue Processing Simulation", () => {
    it("should process mutations in FIFO order and dequeue successful ones", async () => {
      // Seed the queue with 3 mutations
      await manager.enqueue("CREATE", "expenses", { amount: 10, title: "A" });
      await new Promise((resolve) => setTimeout(resolve, 5));
      await manager.enqueue("CREATE", "expenses", { amount: 20, title: "B" });
      await new Promise((resolve) => setTimeout(resolve, 5));
      await manager.enqueue("CREATE", "expenses", { amount: 30, title: "C" });

      let mutations = await manager.fetchOrdered();
      expect(mutations).toHaveLength(3);

      // Simulate processing the first mutation successfully
      await manager.dequeue(mutations[0].id);
      let remaining = await manager.fetchOrdered();
      expect(remaining).toHaveLength(2);
      expect(remaining[0].payload.amount).toBe(20);

      // Process the second
      await manager.dequeue(remaining[0].id);
      remaining = await manager.fetchOrdered();
      expect(remaining).toHaveLength(1);
      expect(remaining[0].payload.amount).toBe(30);

      // Process the third
      await manager.dequeue(remaining[0].id);
      remaining = await manager.fetchOrdered();
      expect(remaining).toHaveLength(0);
    });

    it("should leave failed mutations in queue and skip past non-retryable ones", async () => {
      // Enqueue a mix: one that will fail non-retryably, one that succeeds
      await manager.enqueue("CREATE", "unknownStore", { data: "bad" });
      await new Promise((resolve) => setTimeout(resolve, 5));
      await manager.enqueue("CREATE", "expenses", {
        amount: 50,
        title: "Good",
      });

      // Simulate: first mutation has no mapping → skip (dequeue)
      const mutations = await manager.fetchOrdered();
      expect(mutations).toHaveLength(2);
      expect(mutations[0].storeName).toBe("unknownStore");

      // Dequeue unknown (simulating non-retryable skip)
      await manager.dequeue(mutations[0].id);
      let remaining = await manager.fetchOrdered();
      expect(remaining).toHaveLength(1);
      expect(remaining[0].payload.title).toBe("Good");
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty queue gracefully", async () => {
      const mutations = await manager.fetchOrdered();
      expect(mutations).toHaveLength(0);
    });

    it("should not fail when dequeuing a non-existent ID", async () => {
      const result = await manager.dequeue("nonexistent");
      expect(result).toBe(false);
    });

    it("should track timestamps in correct order", async () => {
      const m1 = await manager.enqueue("CREATE", "expenses", { amount: 1 });
      await new Promise((resolve) => setTimeout(resolve, 5));
      const m2 = await manager.enqueue("UPDATE", "expenses", { amount: 2 });
      await new Promise((resolve) => setTimeout(resolve, 5));
      const m3 = await manager.enqueue("DELETE", "expenses", { amount: 3 });

      const ordered = await manager.fetchOrdered();
      expect(ordered[0].timestamp).toBeLessThan(ordered[1].timestamp);
      expect(ordered[1].timestamp).toBeLessThan(ordered[2].timestamp);
    });
  });
});
