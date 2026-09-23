type LoanTestStores = Map<string, Map<string, unknown>>;

jest.mock("localforage", () => ({
  createInstance: jest.fn(({ storeName }: { storeName: string }) => {
    const globalWithStores = globalThis as typeof globalThis & {
      __loanTestStores?: LoanTestStores;
    };
    const stores = (globalWithStores.__loanTestStores ??= new Map());
    if (!stores.has(storeName)) stores.set(storeName, new Map());
    const store = () => stores.get(storeName) as Map<string, unknown>;
    return {
      getItem: jest.fn(async (key: string) => store().get(key) ?? null),
      setItem: jest.fn(async (key: string, value: unknown) => {
        store().set(key, value);
        return value;
      }),
      removeItem: jest.fn(async (key: string) => store().delete(key)),
      clear: jest.fn(async () => store().clear()),
      keys: jest.fn(async () => Array.from(store().keys())),
      ready: jest.fn(() => Promise.resolve()),
    };
  }),
}));

import { clearAllStores } from "../../src/lib/storage/idb";
import { localDataStore } from "../../src/lib/store/LocalDataStore";
import { mutationQueue } from "../../src/lib/queue/MutationQueueManager";

const payment = {
  amount: 100,
  title: "Car",
  category: ["Installment"],
  for: [],
  date: new Date("2026-09-15").getTime(),
};

async function clearQueue() {
  for (const mutation of await mutationQueue.getAll()) {
    await mutationQueue.remove(mutation.id);
  }
}

async function createTestLoan() {
  const loan = await localDataStore.createLoan({
    name: "Car",
    totalAmount: 300,
    totalInstallments: 3,
    paidInstallments: 0,
    installmentAmount: 100,
    monthlyPaymentDay: 5,
    startMonth: 9,
    startYear: 2026,
  });
  await clearQueue();
  return loan;
}

describe("LocalDataStore.payInstallment", () => {
  beforeEach(async () => {
    await clearAllStores();
    localDataStore.reset();
    await localDataStore.init("user-1");
  });

  it("does not write when the displayed installment is not next", async () => {
    const loan = await createTestLoan();

    const paid = await localDataStore.payInstallment(loan._id, payment, 1);

    expect(paid).toBeNull();
    expect(localDataStore.getSnapshot().loans[0].paidInstallments).toBe(0);
    expect(localDataStore.getSnapshot().expenses).toHaveLength(0);
    expect(await mutationQueue.getAll()).toHaveLength(0);
  });

  it("writes one expense and one queued payment when the index matches", async () => {
    const loan = await createTestLoan();

    const paid = await localDataStore.payInstallment(loan._id, payment, 0);

    expect(paid?.paidInstallments).toBe(1);
    const expenses = localDataStore.getSnapshot().expenses;
    expect(expenses).toHaveLength(1);
    expect(expenses[0].installmentIndex).toBe(0);

    const queued = await mutationQueue.getAll();
    expect(queued).toHaveLength(1);
    expect(queued[0].action).toBe("loans:payInstallment");
    expect(queued[0].payload.installmentIndex).toBe(0);
  });
});
