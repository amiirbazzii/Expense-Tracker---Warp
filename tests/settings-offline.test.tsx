/**
 * Phase-4 settings offline-first flow:
 *  - a settings change persists locally first and enqueues a sync mutation;
 *  - a remount (offline reload) renders the persisted values;
 *  - the server copy hydrates the local record only when nothing is pending.
 */

jest.mock("localforage", () => ({
  createInstance: jest.fn(({ storeName }: { storeName: string }) => {
    const all: Map<string, Map<string, any>> = ((globalThis as any).__settingsStores ??=
      new Map());
    if (!all.has(storeName)) all.set(storeName, new Map());
    const store = () => all.get(storeName)!;
    return {
      getItem: jest.fn(async (key: string) => store().get(key) ?? null),
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
  api: { userSettings: { get: "userSettings:get", update: "userSettings:update" } },
}));

const mockDrainNow = jest.fn().mockResolvedValue(undefined);
jest.mock("../src/lib/sync/SyncEngine", () => ({
  syncEngine: { drainNow: (...args: any[]) => mockDrainNow(...args) },
}));

let mockOnlineSettings: any = undefined; // Convex query result (offline: undefined)
jest.mock("convex/react", () => ({
  useQuery: () => mockOnlineSettings,
  useMutation: () => jest.fn(),
}));

jest.mock("../src/contexts/AuthContext", () => ({
  useAuth: () => ({ token: "token-1", isOfflineMode: true }),
}));

import { act, render, screen, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { SettingsProvider, useSettings } from "../src/contexts/SettingsContext";
import { mutationQueue } from "../src/lib/queue/MutationQueueManager";
import { getLocalSettings } from "../src/lib/settings/localSettingsStore";

let captured: ReturnType<typeof useSettings>;

function Probe() {
  captured = useSettings();
  const { settings, isLoading } = captured;
  return createElement(
    "div",
    null,
    isLoading ? "loading" : (settings?.currency ?? "none"),
  );
}

const mount = () =>
  render(createElement(SettingsProvider, null, createElement(Probe)));

beforeEach(async () => {
  ((globalThis as any).__settingsStores as Map<string, Map<string, any>>)?.forEach(
    (store) => store.clear(),
  );
  mockOnlineSettings = undefined;
  mockDrainNow.mockClear();
});

describe("settings offline-first", () => {
  it("persists an offline change locally and queues it for sync", async () => {
    mount();
    await waitFor(() => expect(screen.getByText("none")).toBeInTheDocument());

    await act(async () => {
      await captured.updateSettings({ currency: "EUR", calendar: "jalali" });
    });

    expect(screen.getByText("EUR")).toBeInTheDocument();

    // Local record written…
    const stored = await getLocalSettings();
    expect(stored).toMatchObject({ currency: "EUR", calendar: "jalali" });

    // …and the sync mutation is queued with the change.
    const queued = await mutationQueue.getAll();
    const update = queued.find((m) => m.action === "userSettings:update");
    expect(update?.payload).toMatchObject({ currency: "EUR", calendar: "jalali" });
    expect(mockDrainNow).toHaveBeenCalled();
  });

  it("keeps the values after an offline reload (fresh mount, no network)", async () => {
    const first = mount();
    await waitFor(() => expect(screen.getByText("none")).toBeInTheDocument());
    await act(async () => {
      await captured.updateSettings({ currency: "IRR", language: "fa" });
    });
    first.unmount();

    // "Reload": a brand-new provider, still offline (query stays undefined).
    mount();
    await waitFor(() => expect(screen.getByText("IRR")).toBeInTheDocument());
    expect(captured.settings?.language).toBe("fa");
    expect(captured.isLoading).toBe(false);
    expect(captured.isUsingOfflineSettings).toBe(true);
  });

  it("does not let the server copy revert a change that is still queued", async () => {
    mount();
    await waitFor(() => expect(screen.getByText("none")).toBeInTheDocument());
    await act(async () => {
      await captured.updateSettings({ currency: "GBP" });
    });

    // Reconnect: the live query returns the server's stale copy while the
    // update is still in the queue.
    mockOnlineSettings = {
      _id: "srv",
      currency: "USD",
      calendar: "gregorian",
      language: "en",
      updatedAt: 1,
    };
    const remount = mount();
    await waitFor(() => expect(captured.settings?.currency).toBe("GBP"));
    remount.unmount();

    // Once the queue is empty (delivered), the server copy hydrates locally.
    await mutationQueue.clear();
    mockOnlineSettings = { ...mockOnlineSettings, currency: "EUR" };
    mount();
    await waitFor(() => expect(captured.settings?.currency).toBe("EUR"));
    const stored = await getLocalSettings();
    expect(stored?.currency).toBe("EUR");
  });

  it("resolves isLoading offline even when nothing was ever cached", async () => {
    mount();
    await waitFor(() => expect(captured.isLoading).toBe(false));
    expect(captured.settings).toBeNull();
  });
});
