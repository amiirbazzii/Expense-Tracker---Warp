/**
 * Issue 2 — a rejected/rotated session token must not destroy unsent offline
 * work. Only an explicit sign-out (or a different account signing in) wipes
 * the pending queue.
 */

jest.mock("localforage", () => ({
  createInstance: jest.fn(({ storeName }: { storeName: string }) => {
    const all: Map<string, Map<string, any>> = ((globalThis as any).__sessStores ??=
      new Map());
    if (!all.has(storeName)) all.set(storeName, new Map());
    const store = () => all.get(storeName)!;
    return {
      getItem: jest.fn(async (key: string) => {
        const v = store().get(key);
        return v === undefined ? null : JSON.parse(JSON.stringify(v));
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

jest.mock("../convex/_generated/api", () => ({
  api: {
    expenses: { createExpense: "expenses:createExpense", getExpenses: "expenses:getExpenses", getCategories: "c", getForValues: "f" },
    cardsAndIncome: { getIncome: "i", getMyCards: "m", getIncomeCategories: "ic" },
    loans: { getLoans: "l" },
    userSettings: { update: "userSettings:update" },
    auth: { login: "auth:login", register: "auth:register", logout: "auth:logout", getCurrentUser: "auth:getCurrentUser" },
  },
}));

jest.mock("convex/browser", () => ({
  ConvexClient: jest.fn().mockImplementation(() => ({
    mutation: jest.fn(async () => "cloud_1"),
    query: jest.fn(async () => []),
    close: jest.fn(),
  })),
}));

jest.mock("../src/lib/connectivity", () => ({
  connectivity: { isOnline: false, subscribe: () => () => {}, verify: async () => false, whenOnline: () => new Promise(() => {}) },
}));

let mockAuth: any = { token: "token-1", user: { _id: "user-1", username: "u" } };
jest.mock("../src/contexts/AuthContext", () => ({
  useAuth: () => mockAuth,
}));

process.env.NEXT_PUBLIC_CONVEX_URL = "https://example.convex.cloud";

import { act, render } from "@testing-library/react";
import { createElement } from "react";
import { OfflineFirstWrapper } from "../src/providers/OfflineFirstWrapper";
import { mutationQueue } from "../src/lib/queue/MutationQueueManager";
import { localDataStore } from "../src/lib/store/LocalDataStore";
import { localStorageManager } from "../src/lib/storage/LocalStorageManager";
import { syncEngine } from "../src/lib/sync/SyncEngine";

const flush = () => new Promise((r) => setTimeout(r, 20));

beforeEach(async () => {
  ((globalThis as any).__sessStores as Map<string, Map<string, any>>)?.forEach((s) => s.clear());
  mockAuth = { token: "token-1", user: { _id: "user-1", username: "u" } };
  localDataStore.reset();
  // Singleton remembers the last account across tests; the stores were just cleared.
  (localStorageManager as any).initializedFor = null;
});

afterEach(() => {
  syncEngine.stop();
});

describe("Issue 2 — session invalidation with pending offline work", () => {
  it("keeps the pending queue and local rows when the token is rejected", async () => {
    const { rerender } = render(createElement(OfflineFirstWrapper, null, createElement("div")));
    await act(flush);
    expect(syncEngine.getClient()).not.toBeNull();

    // Recorded offline (connectivity mock is offline, so nothing drains).
    await localDataStore.addExpense({ amount: 7, title: "Pending", category: ["Food"], for: [], date: 1 });
    expect(await mutationQueue.size()).toBe(1);

    // Server rejected the token (rotated by a login elsewhere) → AuthContext
    // clears the session.
    mockAuth = { token: null, user: null };
    rerender(createElement(OfflineFirstWrapper, null, createElement("div")));
    await act(flush);

    expect(syncEngine.getClient()).toBeNull(); // sync paused
    expect(await mutationQueue.size()).toBe(1); // work preserved
    expect(await localStorageManager.getEntities("expenses")).toHaveLength(1);

    // Same user signs in again: the queue is still there to drain.
    mockAuth = { token: "token-2", user: { _id: "user-1", username: "u" } };
    rerender(createElement(OfflineFirstWrapper, null, createElement("div")));
    await act(flush);
    expect(syncEngine.getClient()).not.toBeNull();
    expect(await mutationQueue.size()).toBe(1);
  });

  it("wipes the previous account's queue when a different user initializes storage", async () => {
    await localStorageManager.initialize("user-1");
    await localDataStore.init("user-1");
    await localDataStore.addExpense({ amount: 7, title: "Mine", category: ["Food"], for: [], date: 1 });
    expect(await mutationQueue.size()).toBe(1);

    await localStorageManager.initialize("user-2");
    expect(await mutationQueue.size()).toBe(0);
    expect(await localStorageManager.getEntities("expenses")).toHaveLength(0);
  });
});

describe("Issue 2 — engine stopped mid-drain", () => {
  it("drains again after a stop()/start() while a mutation was in flight", async () => {
    const { ConvexClient } = jest.requireMock("convex/browser");
    let releaseFirst: (v: any) => void = () => {};
    let sends = 0;
    (ConvexClient as jest.Mock).mockImplementation(() => {
      // Like the real client: once closed, a request that was in flight never
      // settles — its promise just hangs.
      let closed = false;
      return {
        mutation: jest.fn(() => {
          sends++;
          if (sends !== 1) return Promise.resolve("cloud_2");
          return new Promise((res) => {
            releaseFirst = (v) => {
              if (!closed) res(v);
            };
          });
        }),
        query: jest.fn(async () => []),
        close: jest.fn(() => {
          closed = true;
        }),
      };
    });

    await localStorageManager.initialize("user-1");
    await localDataStore.init("user-1");
    syncEngine.start("https://example.convex.cloud", "token-1");
    (syncEngine as any).isOnline = false;
    await localDataStore.addExpense({ amount: 1, title: "In flight", category: ["Food"], for: [], date: 1 });
    (syncEngine as any).isOnline = true;
    const firstDrain = syncEngine.drainNow(); // awaiting the in-flight mutation
    await flush();
    expect(sends).toBe(1);

    // Session invalidated with the request still pending; then a fresh sign-in.
    syncEngine.stop();
    syncEngine.start("https://example.convex.cloud", "token-2");
    (syncEngine as any).isOnline = true;

    // The old response arrives (rejected token). If the client was already
    // closed this never settles and the first drain — and the sync-phase lock
    // it holds — is wedged for good.
    releaseFirst(Promise.reject(new Error("Authentication required")));
    await Promise.race([firstDrain, flush()]);
    await Promise.race([syncEngine.drainNow(), new Promise((r) => setTimeout(r, 300))]);

    expect(await mutationQueue.size()).toBe(0);
    expect(sends).toBe(2);
  });
});
