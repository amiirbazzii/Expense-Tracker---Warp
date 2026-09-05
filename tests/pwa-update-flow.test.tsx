/**
 * Update-flow regression coverage for usePwaRegistration.
 *
 * The service worker config uses skipWaiting + clientsClaim, so a new worker
 * activates and claims the page on its own — controllerchange is the "update
 * ready" signal, and the Update button's only job is a single reload:
 *  1. the FIRST install claiming the page shows no update prompt;
 *  2. a replacement controller (a real update) does show it;
 *  3. clicking Update reloads exactly once and needs no SKIP_WAITING;
 *  4. a verified reconnect triggers an update check;
 *  5. the periodic check never overlaps an in-flight one;
 *  6. unmount removes the listener and stops the timer;
 *  7. a legacy stuck-waiting worker is still boot-promoted and reloaded.
 */

// Override the non-callable sonner stub from tests/setup.ts: the hook calls
// toast() as a function and reads back an id for dismissal.
jest.mock("sonner", () => {
  const toast = Object.assign(
    jest.fn(() => "toast-1"),
    { dismiss: jest.fn() },
  );
  return { toast };
});

jest.mock("@/lib/pwa/warmAppShell", () => ({
  ensureAppShell: jest.fn(() => Promise.resolve()),
}));

// jsdom marks window.location/reload unforgeable, so the hook reloads through
// this seam instead.
jest.mock("@/lib/pwa/reloadPage", () => ({ reloadPage: jest.fn() }));

const connectivitySubscribers: Array<(online: boolean) => void> = [];
jest.mock("@/lib/connectivity", () => ({
  connectivity: {
    isOnline: true,
    subscribe: jest.fn((cb: (online: boolean) => void) => {
      connectivitySubscribers.push(cb);
      return () => {
        const i = connectivitySubscribers.indexOf(cb);
        if (i >= 0) connectivitySubscribers.splice(i, 1);
      };
    }),
    verify: jest.fn(),
  },
}));

import { renderHook, act } from "@testing-library/react";
import { toast } from "sonner";
import { reloadPage } from "@/lib/pwa/reloadPage";
import { __resetUpdateStateForTests } from "@/lib/pwa/updateState";
import { usePwaRegistration } from "../src/hooks/usePwaRegistration";

const toastMock = toast as unknown as jest.Mock & { dismiss: jest.Mock };
const reloadSpy = reloadPage as jest.Mock;

type Listener = () => void;

function createSwEnvironment({
  controller = null as object | null,
  waiting = null as { postMessage: jest.Mock } | null,
} = {}) {
  const listeners = new Map<string, Listener[]>();
  const registration = {
    installing: null,
    waiting,
    active: { state: "activated" },
    addEventListener: jest.fn(),
    update: jest.fn(() => Promise.resolve()),
    unregister: jest.fn(),
  };
  const container = {
    controller,
    register: jest.fn(async () => registration),
    ready: Promise.resolve(registration),
    getRegistrations: jest.fn(async () => []),
    addEventListener: (type: string, fn: Listener) => {
      listeners.set(type, [...(listeners.get(type) ?? []), fn]);
    },
    removeEventListener: (type: string, fn: Listener) => {
      listeners.set(
        type,
        (listeners.get(type) ?? []).filter((l) => l !== fn),
      );
    },
    fireControllerChange: () => {
      // The browser updates .controller before dispatching the event.
      container.controller = { state: "activated" };
      for (const fn of listeners.get("controllerchange") ?? []) fn();
    },
    listenerCount: (type: string) => (listeners.get(type) ?? []).length,
  };
  Object.defineProperty(navigator, "serviceWorker", {
    value: container,
    configurable: true,
  });
  return { container, registration };
}

beforeAll(() => {
  Object.defineProperty(document, "readyState", {
    value: "complete",
    configurable: true,
  });
});

beforeEach(() => {
  connectivitySubscribers.length = 0;
  __resetUpdateStateForTests();
});

/** Mount the hook and let the async registerSW settle. */
async function mount() {
  const view = renderHook(() => usePwaRegistration());
  await act(async () => {});
  return view;
}

function lastToastAction(): { label: string; onClick: () => void } {
  const call = toastMock.mock.calls.at(-1);
  expect(call?.[0]).toBe("Update available");
  return call![1].action;
}

describe("first install", () => {
  it("does not show an update prompt when the first worker claims the page", async () => {
    const { container } = createSwEnvironment({ controller: null });
    await mount();

    act(() => container.fireControllerChange());

    expect(toastMock).not.toHaveBeenCalled();
    expect(reloadSpy).not.toHaveBeenCalled();
  });
});

describe("real update (replacement controller)", () => {
  it("shows the prompt on controllerchange and does not reload on its own", async () => {
    const { container } = createSwEnvironment({ controller: {} });
    await mount();

    act(() => container.fireControllerChange());

    expect(toastMock).toHaveBeenCalledTimes(1);
    expect(toastMock.mock.calls[0][0]).toBe("Update available");
    expect(reloadSpy).not.toHaveBeenCalled();
  });

  it("reloads exactly once when Update is clicked, with no SKIP_WAITING", async () => {
    const controller = { postMessage: jest.fn() };
    const { container } = createSwEnvironment({ controller });
    await mount();

    act(() => container.fireControllerChange());
    const action = lastToastAction();
    expect(action.label).toBe("Update");

    act(() => action.onClick());
    act(() => action.onClick()); // a second click must be a no-op

    expect(reloadSpy).toHaveBeenCalledTimes(1);
    expect(controller.postMessage).not.toHaveBeenCalled();
    expect(toastMock.dismiss).toHaveBeenCalledWith("toast-1");
  });

  it("prompts for an update that lands after a first install in the same session", async () => {
    const { container } = createSwEnvironment({ controller: null });
    await mount();

    act(() => container.fireControllerChange()); // first install claims
    expect(toastMock).not.toHaveBeenCalled();

    act(() => container.fireControllerChange()); // later deploy replaces it
    expect(toastMock).toHaveBeenCalledTimes(1);
  });
});

describe("update checks", () => {
  it("runs a check when connectivity is regained", async () => {
    const { registration } = createSwEnvironment({ controller: {} });
    await mount();
    expect(registration.update).not.toHaveBeenCalled();

    await act(async () => {
      connectivitySubscribers.forEach((cb) => cb(true));
    });

    expect(registration.update).toHaveBeenCalledTimes(1);
  });

  it("checks periodically without overlapping an in-flight check", async () => {
    jest.useFakeTimers();
    try {
      const { registration } = createSwEnvironment({ controller: {} });
      let release: () => void = () => {};
      registration.update.mockImplementation(
        () => new Promise<void>((resolve) => (release = resolve)),
      );
      const view = renderHook(() => usePwaRegistration());
      await act(async () => {});

      act(() => void jest.advanceTimersByTime(5 * 60 * 1000));
      expect(registration.update).toHaveBeenCalledTimes(1);

      // Still in flight: further triggers (timer AND reconnect) must not stack.
      act(() => void jest.advanceTimersByTime(5 * 60 * 1000));
      act(() => connectivitySubscribers.forEach((cb) => cb(true)));
      expect(registration.update).toHaveBeenCalledTimes(1);

      await act(async () => release());
      act(() => void jest.advanceTimersByTime(5 * 60 * 1000));
      expect(registration.update).toHaveBeenCalledTimes(2);

      view.unmount();
    } finally {
      jest.useRealTimers();
    }
  });

  it("stops the timer and removes listeners on unmount", async () => {
    jest.useFakeTimers();
    try {
      const { container, registration } = createSwEnvironment({ controller: {} });
      const view = renderHook(() => usePwaRegistration());
      await act(async () => {});
      expect(container.listenerCount("controllerchange")).toBe(1);

      view.unmount();

      expect(container.listenerCount("controllerchange")).toBe(0);
      act(() => void jest.advanceTimersByTime(60 * 60 * 1000));
      expect(registration.update).not.toHaveBeenCalled();
      act(() => container.fireControllerChange());
      expect(toastMock).not.toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });
});

describe("legacy stuck-waiting worker", () => {
  it("boot-promotes it and reloads once on controllerchange, without a prompt", async () => {
    const waiting = { postMessage: jest.fn() };
    const { container } = createSwEnvironment({ controller: {}, waiting });
    await mount();

    expect(waiting.postMessage).toHaveBeenCalledWith({ type: "SKIP_WAITING" });

    act(() => container.fireControllerChange());

    expect(reloadSpy).toHaveBeenCalledTimes(1);
    expect(toastMock).not.toHaveBeenCalled();
  });
});
