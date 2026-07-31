/**
 * App-shell warm-up.
 *
 * The service worker precaches every JS/CSS chunk, but page *documents* only
 * enter the runtime cache when the user happens to visit them — so a screen
 * never opened while online was a white screen offline. This fetches each core
 * route's HTML once and stores it in the exact runtime caches the service
 * worker's StaleWhileRevalidate handlers read from, making the whole app
 * navigable offline after a single online launch.
 *
 * Runs at most once per day per app version (each deploy re-warms once, so
 * cached documents track the current build).
 */

// Must mirror the `appPages` list and cache names in next.config.js — the
// warm-up writes into the caches those rules read.
const SW_CACHE_VERSION = process.env.NEXT_PUBLIC_SW_CACHE_VERSION ?? "v3";
const APP_PAGES_CACHE = `app-pages-${SW_CACHE_VERSION}`;
const ROOT_PAGES_CACHE = `root-pages-${SW_CACHE_VERSION}`;

const APP_ROUTES = [
  "/add",
  "/dashboard",
  "/settings",
  "/expenses",
  "/expenses/edit",
  "/income",
  "/income/edit",
  "/cards",
  "/loans",
  "/onboarding",
];

const ROOT_ROUTES = ["/login", "/register"];

const THROTTLE_KEY = "pwa-shell-warmed";
const THROTTLE_MS = 24 * 60 * 60 * 1000;

function alreadyWarmedRecently(version: string): boolean {
  try {
    const raw = localStorage.getItem(THROTTLE_KEY);
    if (!raw) return false;
    const { v, at } = JSON.parse(raw);
    return v === version && Date.now() - at < THROTTLE_MS;
  } catch {
    return false;
  }
}

function recordWarmed(version: string): void {
  try {
    localStorage.setItem(
      THROTTLE_KEY,
      JSON.stringify({ v: version, at: Date.now() }),
    );
  } catch {
    // Storage full/blocked — we'll simply warm again next launch.
  }
}

/**
 * Rebuild a response into a plain cacheable 200.
 *
 * Two reasons: Next's `Vary: rsc, next-router-*` header makes later
 * `cache.match` calls fail against requests with different headers, and a
 * `redirected` response served to a navigation is rejected by the browser
 * outright. Storing a clean copy sidesteps both.
 */
async function sanitize(response: Response): Promise<Response> {
  const headers = new Headers(response.headers);
  headers.delete("Vary");
  return new Response(await response.blob(), { status: 200, headers });
}

async function warmInto(cacheName: string, routes: string[]): Promise<number> {
  const cache = await caches.open(cacheName);
  let cached = 0;

  // Individually, not addAll: one failed route must not void the rest.
  await Promise.all(
    routes.map(async (route) => {
      try {
        const response = await fetch(route, { credentials: "same-origin" });
        if (response.ok) {
          await cache.put(route, await sanitize(response));
          cached++;
        }
      } catch {
        // Offline or flaky — skip; the next warm-up pass picks it up.
      }
    }),
  );

  return cached;
}

/** Fetch and cache the core routes' documents. Never throws. */
export async function warmAppShell(): Promise<void> {
  if (typeof window === "undefined" || typeof caches === "undefined") return;
  if (!navigator.onLine) return;

  const version = process.env.NEXT_PUBLIC_APP_VERSION ?? "unknown";
  if (alreadyWarmedRecently(version)) return;

  try {
    const [app, root] = await Promise.all([
      warmInto(APP_PAGES_CACHE, APP_ROUTES),
      warmInto(ROOT_PAGES_CACHE, ROOT_ROUTES),
    ]);

    // Only mark done when everything landed, so a partial pass (connection
    // dropped mid-way) retries on the next launch.
    if (app === APP_ROUTES.length && root === ROOT_ROUTES.length) {
      recordWarmed(version);
      console.log(`[PWA] App shell warmed (${app + root} routes)`);
    } else {
      console.log(
        `[PWA] App shell partially warmed (${app + root}/${APP_ROUTES.length + ROOT_ROUTES.length}) — will retry next launch`,
      );
    }
  } catch (err) {
    console.warn("[PWA] App shell warm-up failed:", err);
  }
}
