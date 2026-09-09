/**
 * Regression tests for the bounded RSC fetch plugin (src/lib/pwa/rscNetworkTimeout.js),
 * attached to the `rsc-v3` NetworkFirst route in next.config.js.
 *
 * Root cause it addresses: Workbox NetworkFirst's `networkTimeoutSeconds` does
 * NOT abort the underlying fetch — on a cache MISS it falls back to awaiting the
 * original network promise unbounded, so an App Router navigation to a route
 * whose RSC payload is not cached can hang forever on a "lie-fi" connection.
 * The plugin bounds the actual fetch with an AbortController so NetworkFirst
 * always settles (cache HIT returned, or a prompt error that Next recovers from
 * with a full-document navigation served by the precache).
 *
 * These tests exercise the real exported plugin object with fake timers, so
 * they cover the mechanism without a real 3.5s wall-clock wait.
 */
import {
  boundedRscFetchPlugin,
  RSC_FETCH_TIMEOUT_MS,
} from "@/lib/pwa/rscNetworkTimeout";

// jsdom does not expose fetch's Request/Response. The plugin only constructs a
// Request (carrying url/method/signal) and passes Response through, so minimal
// stand-ins are enough and keep the test focused on the abort mechanism.
type ReqInput = string | { url?: string; method?: string; signal?: AbortSignal };
type ReqInit = { method?: string; signal?: AbortSignal };
const g = globalThis as {
  Request?: unknown;
  Response?: unknown;
};
if (typeof g.Request === "undefined") {
  g.Request = class {
    url: string;
    method: string;
    signal?: AbortSignal;
    constructor(input: ReqInput, init: ReqInit = {}) {
      this.url = typeof input === "string" ? input : input.url ?? "";
      this.method =
        init.method ?? (typeof input === "object" ? input.method : undefined) ?? "GET";
      this.signal =
        init.signal ?? (typeof input === "object" ? input.signal : undefined);
    }
  };
}
if (typeof g.Response === "undefined") {
  g.Response = class {
    body: unknown;
    constructor(body?: unknown) {
      this.body = body;
    }
  };
}

const RSC_URL = "https://example.test/cards?_rsc=abc123";

describe("boundedRscFetchPlugin", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it("has a timeout a touch above networkTimeoutSeconds (3s) so a cache HIT wins first", () => {
    expect(RSC_FETCH_TIMEOUT_MS).toBeGreaterThan(3000);
    expect(RSC_FETCH_TIMEOUT_MS).toBeLessThanOrEqual(5000);
  });

  it("attaches an abort signal that is not aborted before the timeout", async () => {
    const state: Record<string, unknown> = {};
    const req = await boundedRscFetchPlugin.requestWillFetch({
      request: new Request(RSC_URL),
      state,
    });
    expect(req.signal).toBeDefined();
    expect(req.signal.aborted).toBe(false);
    jest.advanceTimersByTime(RSC_FETCH_TIMEOUT_MS - 1);
    expect(req.signal.aborted).toBe(false);
  });

  it("aborts the underlying fetch once the bound elapses (MISS cannot hang forever)", async () => {
    const state: Record<string, unknown> = {};
    const req = await boundedRscFetchPlugin.requestWillFetch({
      request: new Request(RSC_URL),
      state,
    });
    jest.advanceTimersByTime(RSC_FETCH_TIMEOUT_MS);
    expect(req.signal.aborted).toBe(true);
  });

  it("clears the timer on a successful fetch so a healthy navigation never aborts (no-op online)", async () => {
    const state: Record<string, unknown> = {};
    const req = await boundedRscFetchPlugin.requestWillFetch({
      request: new Request(RSC_URL),
      state,
    });
    const response = new Response("flight-payload");
    const passed = await boundedRscFetchPlugin.fetchDidSucceed({ response, state });
    expect(passed).toBe(response);
    jest.advanceTimersByTime(RSC_FETCH_TIMEOUT_MS * 2);
    expect(req.signal.aborted).toBe(false);
  });

  it("clears the timer on a failed fetch too, leaving nothing pending", async () => {
    const state: Record<string, unknown> = {};
    const req = await boundedRscFetchPlugin.requestWillFetch({
      request: new Request(RSC_URL),
      state,
    });
    await boundedRscFetchPlugin.fetchDidFail({ state });
    jest.advanceTimersByTime(RSC_FETCH_TIMEOUT_MS * 2);
    expect(req.signal.aborted).toBe(false);
  });

  it("does not throw when Workbox provides no state object", async () => {
    await expect(
      boundedRscFetchPlugin.requestWillFetch({ request: new Request(RSC_URL) })
    ).resolves.toBeInstanceOf(Request);
    await expect(
      boundedRscFetchPlugin.fetchDidSucceed({ response: new Response("x") })
    ).resolves.toBeInstanceOf(Response);
    await expect(boundedRscFetchPlugin.fetchDidFail({})).resolves.toBeUndefined();
  });

  it("preserves the request URL and query (fallback navigates to the intended route)", async () => {
    const req = await boundedRscFetchPlugin.requestWillFetch({
      request: new Request("https://example.test/add?tab=income&_rsc=z"),
      state: {},
    });
    expect(req.url).toBe("https://example.test/add?tab=income&_rsc=z");
    expect(req.method).toBe("GET");
  });
});
