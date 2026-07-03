import { LocalStorageManager } from "../src/lib/storage/LocalStorageManager";
import { PendingMutation, LocalEntity } from "../src/lib/types/local-storage";

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

describe("Dynamic Mutation Queue & Local-First Writes", () => {
  let manager: LocalStorageManager;

  beforeEach(() => {
    manager = new LocalStorageManager();
  });

  describe("Core Queue Contract Operations", () => {
    it("should enqueue a new mutation successfully and generate unique identifiers and timestamps", async () => {
      const payload = { amount: 1500, title: "Dinner" };
      const mutation = await manager.enqueue("CREATE", "expenses", payload);

      expect(mutation).toBeDefined();
      expect(mutation.id).toMatch(/^mut_/);
      expect(mutation.action).toBe("CREATE");
      expect(mutation.storeName).toBe("expenses");
      expect(mutation.payload).toEqual(payload);
      expect(mutation.timestamp).toBeLessThanOrEqual(Date.now());
    });

    it("should retrieve all mutations strictly ordered by First-In, First-Out (FIFO)", async () => {
      // Delay slightly between enqueues to guarantee distinct timestamps
      const m1 = await manager.enqueue("CREATE", "expenses", { item: 1 });
      // Inject tiny delay
      await new Promise((resolve) => setTimeout(resolve, 5));
      const m2 = await manager.enqueue("UPDATE", "income", { item: 2 });
      await new Promise((resolve) => setTimeout(resolve, 5));
      const m3 = await manager.enqueue("DELETE", "loans", { id: "3" });

      const ordered = await manager.fetchOrdered();

      expect(ordered).toHaveLength(3);
      expect(ordered[0].id).toBe(m1.id);
      expect(ordered[1].id).toBe(m2.id);
      expect(ordered[2].id).toBe(m3.id);
      expect(ordered[0].timestamp).toBeLessThan(ordered[1].timestamp);
      expect(ordered[1].timestamp).toBeLessThan(ordered[2].timestamp);
    });

    it("should dequeue a mutation by its ID successfully", async () => {
      const m1 = await manager.enqueue("CREATE", "expenses", { item: 1 });
      const m2 = await manager.enqueue("CREATE", "expenses", { item: 2 });

      let list = await manager.fetchOrdered();
      expect(list).toHaveLength(2);

      const success = await manager.dequeue(m1.id);
      expect(success).toBe(true);

      list = await manager.fetchOrdered();
      expect(list).toHaveLength(1);
      expect(list[0].id).toBe(m2.id);

      const failedDequeue = await manager.dequeue("non-existent-id");
      expect(failedDequeue).toBe(false);
    });
  });

  describe("Local-First Optimistic Write Patterns (Dynamic Collections)", () => {
    it("should dynamically adapt to any collection type including non-standard ones like loans", async () => {
      interface LocalLoan extends LocalEntity {
        name: string;
        totalAmount: number;
      }

      const loanData = {
        name: "Car Loan",
        totalAmount: 12000,
      };

      // Create a loan dynamically using the generic saveEntity method
      const savedLoan = await manager.saveEntity<LocalLoan>("loans", loanData);

      expect(savedLoan).toBeDefined();
      expect(savedLoan.id).toBeDefined();
      expect(savedLoan.syncStatus).toBe("pending");
      expect(savedLoan.name).toBe("Car Loan");
      expect(savedLoan.totalAmount).toBe(12000);

      // Verify it was written instantly to the local collection 'loans'
      const loans = await manager.getEntities<LocalLoan>("loans");
      expect(loans).toHaveLength(1);
      expect(loans[0].id).toBe(savedLoan.id);

      // Verify that it enqueued a CREATE mutation automatically in the unified mutation queue
      const mutations = await manager.fetchOrdered();
      expect(mutations).toHaveLength(1);
      expect(mutations[0].action).toBe("CREATE");
      expect(mutations[0].storeName).toBe("loans");
      expect(mutations[0].payload).toEqual(savedLoan);
    });

    it("should update dynamic collections optimistic writes and queue mutations automatically", async () => {
      interface LocalLoan extends LocalEntity {
        name: string;
        totalAmount: number;
      }

      const savedLoan = await manager.saveEntity<LocalLoan>("loans", {
        name: "Home Loan",
        totalAmount: 250000,
      });
      const updatedLoan = await manager.updateEntity<LocalLoan>(
        "loans",
        savedLoan.id,
        { totalAmount: 240000 },
      );

      expect(updatedLoan).toBeDefined();
      expect(updatedLoan?.totalAmount).toBe(240000);
      expect(updatedLoan?.version).toBe(2);

      const mutations = await manager.fetchOrdered();
      // Should have 2 mutations: 1 CREATE, 1 UPDATE
      expect(mutations).toHaveLength(2);
      expect(mutations[0].action).toBe("CREATE");
      expect(mutations[1].action).toBe("UPDATE");
      expect(mutations[1].storeName).toBe("loans");
      expect(mutations[1].payload).toEqual(updatedLoan);
    });

    it("should delete dynamic collections optimistic writes and queue mutations automatically", async () => {
      const savedLoan = await manager.saveEntity("loans", {
        name: "SBA Loan",
        totalAmount: 50000,
      });
      const success = await manager.deleteEntity("loans", savedLoan.id);

      expect(success).toBe(true);

      const loans = await manager.getEntities("loans");
      expect(loans).toHaveLength(0);

      const mutations = await manager.fetchOrdered();
      expect(mutations).toHaveLength(2);
      expect(mutations[1].action).toBe("DELETE");
      expect(mutations[1].storeName).toBe("loans");
      expect(mutations[1].payload.id).toBe(savedLoan.id);
    });
  });

  describe("Standard Entities Auto-Enqueue Checks", () => {
    it("should automatically enqueue CREATE, UPDATE, DELETE mutations for standard expenses", async () => {
      const expense = await manager.saveExpense(
        {
          amount: 45,
          title: "Lunch",
          category: ["Food"],
          for: ["Self"],
          date: Date.now(),
        },
        { skipEnqueue: false },
      );

      let mutations = await manager.fetchOrdered();
      expect(mutations).toHaveLength(1);
      expect(mutations[0].action).toBe("CREATE");
      expect(mutations[0].storeName).toBe("expenses");
      expect(mutations[0].payload.id).toBe(expense.id);

      const updated = await manager.updateExpense(
        expense.id,
        { amount: 50 },
        { skipEnqueue: false },
      );
      mutations = await manager.fetchOrdered();
      expect(mutations).toHaveLength(2);
      expect(mutations[1].action).toBe("UPDATE");
      expect(mutations[1].payload.amount).toBe(50);

      await manager.deleteExpense(expense.id, { skipEnqueue: false });
      mutations = await manager.fetchOrdered();
      expect(mutations).toHaveLength(3);
      expect(mutations[2].action).toBe("DELETE");
    });
  });
});
