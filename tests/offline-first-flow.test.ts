/**
 * End-to-end flow test for the local-first write path:
 * LocalDataStore → MutationQueueManager → SyncEngine → (mock) Convex.
 *
 * This is the sequence that used to break: a row created in the session would
 * sync, the UI would switch to showing its Convex id, and every later edit or
 * delete silently found no local record.
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
    const all: Map<string, Map<string, any>> = ((globalThis as any).__flowStores ??=
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
import { syncEngine, SyncEngine } from "../src/lib/sync/SyncEngine";

type Call = { fn: string; args: any };

let calls: Call[];
let mutationImpl: (fn: string, args: any) => Promise<any>;

beforeEach(async () => {
  ((globalThis as any).__flowStores as Map<string, Map<string, any>>)?.forEach(
    (store) => store.clear(),
  );
  calls = [];
  mutationImpl = async (fn) =>
    fn === "expenses:createExpense" ? "cloud_expense_1" : { ok: true };

  (globalThis as any).__convexMutation = (fn: string, args: any) => {
    calls.push({ fn, args });
    return mutationImpl(fn, args);
  };
  (globalThis as any).__convexQuery = async () => [];

  localDataStore.reset();
  await localDataStore.init("user-1");
  syncEngine.start("https://example.convex.cloud", "token-1");
});

afterEach(() => {
  syncEngine.stop();
});

describe("create → sync → edit", () => {
  it("keeps the row addressable after it syncs", async () => {
    const created = await localDataStore.addExpense({
      amount: 12,
      title: "Coffee",
      category: ["Food"],
      for: [],
      date: Date.now(),
    });

    await syncEngine.drainNow();

    expect(calls.map((c) => c.fn)).toEqual(["expenses:createExpense"]);
    expect(await mutationQueue.size()).toBe(0);

    // The id the UI holds is unchanged by syncing...
    const [visible] = localDataStore.getSnapshot().expenses;
    expect(visible._id).toBe(created._id);

    // ...and the Convex id was recorded against that same row.
    const row = await localStorageManager.getExpenseById(created._id);
    expect(row?.cloudId).toBe("cloud_expense_1");

    // The edit now resolves, and reaches Convex with the *cloud* id.
    const updated = await localDataStore.updateExpense(created._id, {
      amount: 15,
      title: "Coffee",
      category: ["Food"],
      for: [],
      date: Date.now(),
    });
    expect(updated).not.toBeNull();

    await syncEngine.drainNow();

    const updateCall = calls.find((c) => c.fn === "expenses:updateExpense");
    expect(updateCall).toBeDefined();
    expect(updateCall!.args.expenseId).toBe("cloud_expense_1");
    expect(updateCall!.args.token).toBe("token-1");

    // A synced row must not stay flagged as an unsent local change, or
    // hydration would refuse to ever refresh it again.
    const afterUpdate = await localStorageManager.getExpenseById(created._id);
    expect(afterUpdate?.syncStatus).toBe("synced");

    // And the delete resolves too.
    expect(await localDataStore.deleteExpense(created._id)).toBe(true);
    await syncEngine.drainNow();
    const deleteCall = calls.find((c) => c.fn === "expenses:deleteExpense");
    expect(deleteCall!.args.expenseId).toBe("cloud_expense_1");
    expect(await mutationQueue.size()).toBe(0);
  });

  it("produces exactly one outbound mutation per user action", async () => {
    await localDataStore.addExpense({
      amount: 12,
      title: "Coffee",
      category: ["Food"],
      for: [],
      date: Date.now(),
    });

    expect(await mutationQueue.size()).toBe(1);
    await syncEngine.drainNow();
    expect(calls).toHaveLength(1);
  });

  it("holds the queue, without discarding work, when the token is rejected", async () => {
    mutationImpl = async () => {
      throw new Error("Authentication required");
    };

    await localDataStore.addExpense({
      amount: 12,
      title: "Coffee",
      category: ["Food"],
      for: [],
      date: Date.now(),
    });

    await syncEngine.drainNow();

    // The expense is still queued — an expired session must never destroy it.
    expect(await mutationQueue.size()).toBe(1);
    expect(await mutationQueue.getDeadLetters()).toHaveLength(0);
    expect(syncEngine.getStatus().needsAuth).toBe(true);

    // A fresh token drains it.
    mutationImpl = async () => "cloud_expense_1";
    syncEngine.setAuthToken("token-2");
    await syncEngine.drainNow();

    expect(await mutationQueue.size()).toBe(0);
    expect(calls[calls.length - 1].args.token).toBe("token-2");
  });

  it("retries a network failure without burning an attempt", async () => {
    mutationImpl = async () => {
      throw new Error("Failed to fetch");
    };

    await localDataStore.addExpense({
      amount: 12,
      title: "Coffee",
      category: ["Food"],
      for: [],
      date: Date.now(),
    });

    await syncEngine.drainNow();
    await syncEngine.drainNow();

    const [queued] = await mutationQueue.getAll();
    expect(queued).toBeDefined();
    expect(queued.attempts ?? 0).toBe(0);
  });

  it("can still delete a synced row after a reload", async () => {
    // Real incident: create → syncs → delete → reload before the delete
    // drains. The delete removed the row (which held `cloudId`) and the reload
    // cleared the in-memory map, so nothing could name the document any more.
    const created = await localDataStore.addExpense({
      amount: 12,
      title: "Coffee",
      category: ["Food"],
      for: [],
      date: Date.now(),
    });
    await syncEngine.drainNow();

    await localDataStore.deleteExpense(created._id);
    // The row is gone, so the cloud id cannot come from it any more.
    expect(await localStorageManager.getExpenseById(created._id)).toBeNull();

    // Simulate the reload: a brand-new engine has an empty in-memory map,
    // while the queue and IndexedDB persist.
    syncEngine.stop();
    const afterReload = new SyncEngine();
    afterReload.start("https://example.convex.cloud", "token-1");
    await afterReload.drainNow();

    const deleteCall = calls.find((c) => c.fn === "expenses:deleteExpense");
    expect(deleteCall).toBeDefined();
    expect(deleteCall!.args.expenseId).toBe("cloud_expense_1");
    expect(await mutationQueue.size()).toBe(0);
    expect(await mutationQueue.getDeadLetters()).toHaveLength(0);

    // The mapping is pruned once the document is gone from both sides.
    expect(await localStorageManager.getCloudIdForLocalId(created._id)).toBeNull();
    afterReload.stop();
  });

  it("survives a backend that has not deployed the function yet", async () => {
    // Real incident: `cardsAndIncome:createIncomeCategory` existed in source
    // but not on the deployment. The write is valid — it arrived before the
    // deploy did — so it must not be spent on retries or lost.
    mutationImpl = async () => {
      throw new Error(
        "[CONVEX M(cardsAndIncome:createIncomeCategory)] Server Error\n" +
          "Could not find public function for 'cardsAndIncome:createIncomeCategory'.",
      );
    };

    await localDataStore.addCategory("Salary", "income");

    // Far more passes than MAX_ATTEMPTS: none of them may discard it.
    for (let i = 0; i < 8; i++) await syncEngine.drainNow();

    expect(await mutationQueue.size()).toBe(1);
    expect(await mutationQueue.getDeadLetters()).toHaveLength(0);

    // Once the backend catches up, it goes through.
    mutationImpl = async () => "cloud_income_category_1";
    await syncEngine.drainNow();

    expect(await mutationQueue.size()).toBe(0);
    const call = calls[calls.length - 1];
    expect(call.fn).toBe("incomeCategories:createIncomeCategory");
    expect(call.args.name).toBe("Salary");
  });

  it("un-parks a mutation dead-lettered before the backend was fixed", async () => {
    // Anything already sitting in the dead-letter list from the old
    // classification has to come back on its own, since a user cannot reach
    // the queue by hand.
    await mutationQueue.enqueue("incomeCategories:createIncomeCategory", {
      name: "Salary",
    });
    const [queued] = await mutationQueue.getAll();
    for (let i = 0; i < 5; i++) {
      await mutationQueue.recordFailure(
        queued.id,
        "Could not find public function for 'cardsAndIncome:createIncomeCategory'.",
      );
    }
    expect(await mutationQueue.getDeadLetters()).toHaveLength(1);

    mutationImpl = async () => "cloud_income_category_1";
    syncEngine.stop();
    syncEngine.start("https://example.convex.cloud", "token-1");
    await new Promise((resolve) => setTimeout(resolve, 0));
    await syncEngine.drainNow();

    expect(await mutationQueue.getDeadLetters()).toHaveLength(0);
    expect(await mutationQueue.size()).toBe(0);
    expect(calls.some((c) => c.fn === "incomeCategories:createIncomeCategory")).toBe(
      true,
    );
  });

  it("still parks a genuinely invalid mutation", async () => {
    // The deployment-skew carve-out must not swallow real rejections.
    mutationImpl = async () => {
      throw new Error("ArgumentValidationError: amount must be a number");
    };

    await localDataStore.addExpense({
      amount: 12,
      title: "Coffee",
      category: ["Food"],
      for: [],
      date: Date.now(),
    });

    for (let i = 0; i < 5; i++) await syncEngine.drainNow();

    expect(await mutationQueue.size()).toBe(0);
    expect(await mutationQueue.getDeadLetters()).toHaveLength(1);
  });

  it("pays a loan installment idempotently with a stamped index", async () => {
    mutationImpl = async (fn) =>
      fn === "loans:createLoan"
        ? "cloud_loan_1"
        : { expenseId: "cloud_expense_9", alreadyPaid: false };

    const loan = await localDataStore.createLoan({
      name: "Car",
      totalAmount: 1200,
      totalInstallments: 12,
      paidInstallments: 0,
      installmentAmount: 100,
      monthlyPaymentDay: 5,
      startMonth: 1,
      startYear: 2026,
    });
    await syncEngine.drainNow();

    const paid = await localDataStore.payInstallment(loan._id, {
      amount: 100,
      title: "Car",
      category: ["Installment"],
      for: [],
      date: Date.now(),
    });

    // Fresh-state read: the counter comes from the store, and the enqueued
    // mutation carries the exact installment being paid.
    expect(paid?.paidInstallments).toBe(1);
    const [queued] = await mutationQueue.getAll();
    expect(queued.action).toBe("loans:payInstallment");
    expect(queued.payload.installmentIndex).toBe(0);

    await syncEngine.drainNow();
    const call = calls.find((c) => c.fn === "loans:payInstallment");
    expect(call!.args.installmentIndex).toBe(0);
    expect(call!.args.loanId).toBe("cloud_loan_1");

    // The local payment expense linked to the server's document.
    const expense = localDataStore
      .getSnapshot()
      .expenses.find((e) => e.loanId === loan._id);
    expect(expense).toBeDefined();

    // A fully paid loan refuses further payments at the store level.
    for (let i = 1; i < 12; i++) {
      await localDataStore.payInstallment(loan._id, {
        amount: 100,
        title: "Car",
        category: ["Installment"],
        for: [],
        date: Date.now(),
      });
    }
    const overpay = await localDataStore.payInstallment(loan._id, {
      amount: 100,
      title: "Car",
      category: ["Installment"],
      for: [],
      date: Date.now(),
    });
    expect(overpay).toBeNull();
  });

  it("rolls back the local payment when the mutation dead-letters", async () => {
    mutationImpl = async (fn) => {
      if (fn === "loans:createLoan") return "cloud_loan_1";
      throw new Error("ArgumentValidationError: boom");
    };

    const loan = await localDataStore.createLoan({
      name: "Car",
      totalAmount: 1200,
      totalInstallments: 12,
      paidInstallments: 0,
      installmentAmount: 100,
      monthlyPaymentDay: 5,
      startMonth: 1,
      startYear: 2026,
    });
    await syncEngine.drainNow(); // loan creation succeeds

    mutationImpl = async () => {
      throw new Error("ArgumentValidationError: boom");
    };
    await localDataStore.payInstallment(loan._id, {
      amount: 100,
      title: "Car",
      category: ["Installment"],
      for: [],
      date: Date.now(),
    });

    // Optimistic state is visible…
    expect(
      localDataStore.getSnapshot().loans.find((l) => l._id === loan._id)
        ?.paidInstallments,
    ).toBe(1);

    // …until the mutation permanently fails.
    for (let i = 0; i < 5; i++) await syncEngine.drainNow();
    expect(await mutationQueue.getDeadLetters()).toHaveLength(1);

    // Rollback: counter reverted, phantom expense removed, month not "paid".
    const after = localDataStore.getSnapshot();
    expect(
      after.loans.find((l) => l._id === loan._id)?.paidInstallments,
    ).toBe(0);
    expect(after.expenses.filter((e) => e.loanId === loan._id)).toHaveLength(0);
  });

  it("removes the duplicate expense when the server says already paid", async () => {
    mutationImpl = async (fn) =>
      fn === "loans:createLoan"
        ? "cloud_loan_1"
        : // Paid elsewhere: server applied nothing and has no expense for us.
          { expenseId: null, alreadyPaid: true };

    const loan = await localDataStore.createLoan({
      name: "Car",
      totalAmount: 1200,
      totalInstallments: 12,
      paidInstallments: 0,
      installmentAmount: 100,
      monthlyPaymentDay: 5,
      startMonth: 1,
      startYear: 2026,
    });
    await syncEngine.drainNow();

    await localDataStore.payInstallment(loan._id, {
      amount: 100,
      title: "Car",
      category: ["Installment"],
      for: [],
      date: Date.now(),
    });
    await syncEngine.drainNow();

    // The mutation is acknowledged (dequeued, not dead-lettered) and the
    // orphan local expense is gone — no double-charged month.
    expect(await mutationQueue.size()).toBe(0);
    expect(await mutationQueue.getDeadLetters()).toHaveLength(0);
    expect(
      localDataStore.getSnapshot().expenses.filter((e) => e.loanId === loan._id),
    ).toHaveLength(0);
  });

  it("links a locally created card so its balance still adds up", async () => {
    mutationImpl = async (fn) =>
      fn === "cards:addCard" ? "cloud_card_1" : "cloud_expense_1";

    const card = await localDataStore.addCard("Visa");
    await syncEngine.drainNow();

    await localDataStore.addExpense({
      amount: 20,
      title: "Fuel",
      category: ["Car"],
      for: [],
      date: Date.now(),
      cardId: card._id,
    });
    await syncEngine.drainNow();

    // The expense reached Convex referencing the card's *cloud* id...
    const expenseCall = calls.find((c) => c.fn === "expenses:createExpense");
    expect(expenseCall!.args.cardId).toBe("cloud_card_1");

    // ...while locally both still resolve to one card, so the balance is right.
    const [balance] = localDataStore.getSnapshot().cards;
    expect(balance.cardId).toBe(card._id);
    expect(balance.totalExpenses).toBe(20);
    expect(balance.balance).toBe(-20);
  });
});
