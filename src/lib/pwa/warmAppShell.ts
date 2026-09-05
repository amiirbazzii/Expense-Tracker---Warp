/**
 * App-shell self-heal.
 *
 * Every route document ships in the service worker's precache, so a fresh
 * install can cold-start offline into any route. This module covers the two
 * states where that guarantee has been lost on a real device:
 *
 *  - Cache Storage was evicted under storage pressure. Workbox only fills the
 *    precache during the SW `install` event, and an unchanged sw.js never
 *    reinstalls — without this pass the device would stay broken offline
 *    until the next deploy.
 *  - The installed SW predates full-route precaching, so most documents were
 *    never precached at all.
 *
 * On every online launch it checks each core route for an offline-servable
 * document (precache or runtime cache) and re-fetches only what is missing
 * into the exact runtime caches the SW's document handlers read. Checks are
 * cache lookups — the network is touched only for the gaps.
 */

import { connectivity } from "../connectivity";

// Must mirror the cache names in next.config.js — the self-heal writes into
// the caches those rules read. The version env var is injected by
// next.config.js at build time, so it is always defined in a real build.
const SW_CACHE_VERSION = process.env.NEXT_PUBLIC_SW_CACHE_VERSION;
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

/**
 * True when some cache can answer a document navigation to `route`.
 * Precache entries are keyed with a `?__WB_REVISION__` param and runtime
 * entries carry stripped URLs, so match ignoring search and Vary. Only the
 * caches the SW's document lookups actually consult are checked — an RSC
 * payload cached under the same pathname must not count as a document.
 */
async function hasDocument(route: string): Promise<boolean> {
  const names = (await caches.keys()).filter(
    (name) =>
      name.startsWith("workbox-precache") ||
      name === APP_PAGES_CACHE ||
      name === ROOT_PAGES_CACHE,
  );
  for (const name of names) {
    const cache = await caches.open(name);
    const hit = await cache.match(route, {
      ignoreSearch: true,
      ignoreVary: true,
    });
    if (hit) return true;
  }
  return false;
}

/**
 * Rebuild a response into a plain cacheable 200.
 *
 * Two reasons: Next's `Vary: rsc, next-router-*` header makes later
 * `cache.match` calls fail against requests with different headers, and a
 * `redirected` response served to a navigation is rejected by the browser
 * outright. Storing a clean copy sidesteps both.
 */
function sanitize(body: Blob, original: Response): Response {
  const headers = new Headers(original.headers);
  headers.delete("Vary");
  return new Response(body, { status: 200, headers });
}

/**
 * Restore evicted entries directly into Workbox's precache.
 *
 * This is the load-bearing half of the self-heal. Once a URL is in the
 * precache manifest, Workbox's precache route claims every request for it;
 * on a cache miss it falls back to the network WITHOUT re-caching, and it
 * never falls through to the runtime rules — so after a Cache Storage
 * eviction nothing would ever return to cache and offline startup stays
 * broken until a deploy changes sw.js. Workbox itself only writes the
 * precache during the SW `install` event.
 *
 * The manifest (and each entry's exact `?__WB_REVISION__` cache key) is
 * parsed out of /sw.js, so what gets restored is exactly what install would
 * have stored.
 *
 * Crucial invariant: a revision key must only ever hold content belonging to
 * THAT revision. /sw.js can be a NEWER deploy than the worker currently
 * controlling this page — during the window between a deploy and the new
 * worker activating, and on the launch right after a deploy. In that window a
 * `fetch(url)` for a document is answered cache-first by the OLD worker's
 * precache, returning the OLD document — and storing it under the NEW
 * revision key poisons the incoming worker's precache (it trusts the key at
 * install and never fetches the real new document, so the app reloads into
 * the old build). So heal a document only when it is genuinely missing, never
 * when a DIFFERENT revision of the same URL is already cached: that is an
 * update in progress, and the incoming worker's own install will populate it
 * correctly. Content-hashed assets carry a unique URL per build, so they can
 * never collide this way and are always safe to restore.
 */
function precacheKey(url: string, revision: string | null): string {
  return revision
    ? `${url}${url.includes("?") ? "&" : "?"}__WB_REVISION__=${revision}`
    : url;
}

async function healPrecache(): Promise<number> {
  let manifest: Array<{ url: string; revision: string | null }> = [];
  try {
    const response = await fetch("/sw.js", { cache: "no-store" });
    if (!response.ok) return 0;
    const source = await response.text();
    manifest = Array.from(
      source.matchAll(/\{url:"([^"]+)",revision:(?:null|"([^"]*)")\}/g),
      (match) => ({ url: match[1], revision: match[2] ?? null }),
    );
  } catch {
    return 0;
  }
  if (manifest.length === 0) return 0;

  const preName =
    (await caches.keys()).find((name) => name.startsWith("workbox-precache")) ??
    `workbox-precache-v2-${location.origin}/`;
  const cache = await caches.open(preName);

  // Pathnames that already have SOME precache entry. A manifest entry whose
  // exact revision key is absent but whose pathname is present here is a
  // revision that the active worker has not installed — healing it would risk
  // storing the old worker's content under the new key, so it is skipped.
  const cachedPaths = new Set<string>();
  try {
    for (const request of await cache.keys()) {
      cachedPaths.add(new URL(request.url).pathname);
    }
  } catch {
    // Older cache mock / no keys(): fall back to per-key checks only.
  }

  let healed = 0;

  await Promise.all(
    manifest.map(async ({ url, revision }) => {
      const key = precacheKey(url, revision);
      const pathname = url.split("?")[0];
      try {
        if (await cache.match(key)) return;
        // A different revision of this same document is already cached → an
        // update is in flight; let the incoming worker install it. Never
        // overwrite a fresh revision with content the old worker serves.
        if (revision && cachedPaths.has(pathname)) return;
        const response = await fetch(url, { credentials: "same-origin" });
        if (response.ok) {
          await cache.put(key, sanitize(await response.blob(), response));
          healed++;
        }
      } catch {
        // Offline or flaky — skip; the next pass picks it up.
      }
    }),
  );

  return healed;
}

async function healInto(cacheName: string, routes: string[]): Promise<number> {
  let healed = 0;

  // Individually, not addAll: one failed route must not void the rest.
  await Promise.all(
    routes.map(async (route) => {
      try {
        if (await hasDocument(route)) return;
        const response = await fetch(route, { credentials: "same-origin" });
        if (response.ok) {
          const cache = await caches.open(cacheName);
          await cache.put(route, sanitize(await response.blob(), response));
          healed++;
        }
      } catch {
        // Offline or flaky — skip; the next pass picks it up.
      }
    }),
  );

  return healed;
}

/**
 * Ensure every core route's document is offline-servable, re-fetching only
 * the missing ones. Never throws.
 */
export async function ensureAppShell(): Promise<void> {
  if (typeof window === "undefined" || typeof caches === "undefined") return;
  if (!connectivity.isOnline) return;

  try {
    // Precache first: with it whole, the runtime document heal below finds
    // every route present and becomes a no-op. The runtime heal still covers
    // stale installed SWs whose precache manifest never included the route
    // documents (their document requests do reach the runtime caches).
    const restored = await healPrecache();
    const [app, root] = await Promise.all([
      healInto(APP_PAGES_CACHE, APP_ROUTES),
      healInto(ROOT_PAGES_CACHE, ROOT_ROUTES),
    ]);
    if (restored + app + root > 0) {
      console.log(
        `[PWA] App shell self-heal restored ${restored} precache and ${app + root} document entries`,
      );
    }
  } catch (err) {
    console.warn("[PWA] App shell self-heal failed:", err);
  }
}
