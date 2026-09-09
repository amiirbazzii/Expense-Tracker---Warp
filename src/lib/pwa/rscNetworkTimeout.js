// Hard upper bound on the actual RSC network fetch, for the `rsc-v3`
// NetworkFirst route in next.config.js.
//
// On a hanging ("lie-fi") connection the browser never fails the request, and
// Workbox's NetworkFirst `networkTimeoutSeconds` is NOT enough on its own: when
// the timeout fires it does a cache lookup, and on a cache MISS it falls back
// to `await`-ing the original network promise, which has no bound — so a
// client-side App Router navigation to a route whose RSC payload is not in the
// `rsc-v3` cache (any non-precached route, or an app-shell route in the window
// after a deploy before its precache reinstalls) can hang for tens of seconds
// or indefinitely. This plugin aborts the underlying fetch after a short
// timeout, so NetworkFirst always settles: a cache HIT is still returned (the
// `networkTimeoutSeconds` cache path wins first), and a cache MISS throws
// promptly into the route's existing `handlerDidError` (which returns
// `Response.error()`, and Next.js recovers by falling back to a full document
// navigation, served from the precache). On a healthy network the fetch
// resolves well before the timer and the abort is a no-op, so online
// navigation and NetworkFirst's "prefer the current server response" semantics
// are unchanged.
//
// CommonJS + inline literal timeout on purpose: next-pwa serializes each plugin
// by `.toString()`-ing its functions into sw.js, so the functions must close
// over nothing but their arguments and globals. The timer is stored on
// Workbox's per-request `state` and cleared when the fetch settles so a
// completed request leaves nothing pending. Kept a touch above the route's
// `networkTimeoutSeconds` (3s) so, on a HIT, the cache-timeout path returns the
// cached payload before the abort ever fires.

const RSC_FETCH_TIMEOUT_MS = 3500;

const boundedRscFetchPlugin = {
  requestWillFetch: async ({ request, state }) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    if (state) state.rscAbortTimer = timer;
    return new Request(request, { signal: controller.signal });
  },
  fetchDidSucceed: async ({ response, state }) => {
    if (state && state.rscAbortTimer) clearTimeout(state.rscAbortTimer);
    return response;
  },
  fetchDidFail: async ({ state }) => {
    if (state && state.rscAbortTimer) clearTimeout(state.rscAbortTimer);
  },
};

module.exports = { boundedRscFetchPlugin, RSC_FETCH_TIMEOUT_MS };
