/**
 * healPrecache must never store one revision's content under another
 * revision's key. The poison reproduced in the A->B audit was:
 *   A controls the page, B is deployed, /sw.js now lists B's revisions,
 *   healPrecache fetch()es a document -> A's precache answers cache-first with
 *   A's HTML -> it lands under B's revision key -> B installs, trusts the key,
 *   and the app reloads into the OLD build.
 *
 * The fix: when a DIFFERENT revision of the same document is already cached,
 * that is an update in flight — skip it; the incoming worker installs it.
 * Genuine eviction (nothing cached for that URL) still heals.
 */

import { TextDecoder, TextEncoder } from "node:util";
import { ReadableStream } from "node:stream/web";
Object.assign(global, { ReadableStream, TextDecoder, TextEncoder });
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Response: UndiciResponse } = require("undici");

jest.mock("@/lib/connectivity", () => ({
  connectivity: { isOnline: true, subscribe: () => () => {}, verify: async () => true },
}));

import { ensureAppShell } from "@/lib/pwa/warmAppShell";

const A = "buildA";
const B = "buildB";
const ORIGIN = "http://localhost";

// /sw.js manifest as it reads AFTER B is deployed.
const SW_SOURCE_B = `precacheAndRoute([{url:"/login",revision:"${B}"},{url:"/dashboard",revision:"${B}"},{url:"/_next/static/chunks/b.js",revision:null}])`;

/** A precache cache whose contents we control, with per-key match + keys(). */
function makeCache(entries: Record<string, string>) {
  const store = new Map<string, Response>();
  for (const [key, marker] of Object.entries(entries)) {
    store.set(key, new Response(marker));
  }
  const put = jest.fn(async (key: string, value: Response) => {
    store.set(key, value);
  });
  const match = jest.fn(
    async (
      key: string | { url: string },
      opts?: { ignoreSearch?: boolean },
    ) => {
      const raw = typeof key === "string" ? key : key.url;
      if (opts?.ignoreSearch) {
        // hasDocument() looks up a bare route and must find any revision of it.
        const path = raw.replace(ORIGIN, "").split("?")[0];
        for (const [k, v] of store) {
          if (k.replace(ORIGIN, "").split("?")[0] === path) return v;
        }
        return undefined;
      }
      return store.get(raw);
    },
  );
  const keys = jest.fn(async () =>
    [...store.keys()].map((k) => ({ url: ORIGIN + k })),
  );
  return { put, match, keys };
}

const PRECACHE_NAME = "workbox-precache-v2-x";

/** Precache holds `entries`; every other cache (app-pages/root-pages) starts
 *  empty. Returns the precache mock so a test can assert its writes alone. */
function installCaches(entries: Record<string, string>) {
  const precache = makeCache(entries);
  const others = new Map<string, ReturnType<typeof makeCache>>();
  Object.defineProperty(global, "caches", {
    configurable: true,
    value: {
      keys: jest.fn().mockResolvedValue([PRECACHE_NAME]),
      open: jest.fn(async (name: string) => {
        if (name === PRECACHE_NAME) return precache;
        if (!others.has(name)) others.set(name, makeCache({}));
        return others.get(name)!;
      }),
    },
  });
  return precache;
}

/** Every document fetch is answered by the OLD worker with OLD (A) HTML. */
function installFetch() {
  global.fetch = jest.fn(async (url: string) =>
    url === "/sw.js"
      ? new Response(SW_SOURCE_B)
      : new Response("OLD-A-HTML", { headers: { Vary: "rsc" } }),
  ) as unknown as typeof fetch;
}

beforeEach(() => {
  Object.defineProperty(global, "Response", { configurable: true, value: UndiciResponse });
  installFetch();
});

it("does not store old content under a newer revision key (poison prevented)", async () => {
  // A's documents are already precached under A's revision keys.
  const cache = installCaches({
    [`/login?__WB_REVISION__=${A}`]: "OLD-A-HTML",
    [`/dashboard?__WB_REVISION__=${A}`]: "OLD-A-HTML",
  });

  await ensureAppShell();

  // No B-revision document key may be written from an A-served fetch.
  const keysWritten = cache.put.mock.calls.map(([k]) => k as string);
  expect(keysWritten).not.toContain(`/login?__WB_REVISION__=${B}`);
  expect(keysWritten).not.toContain(`/dashboard?__WB_REVISION__=${B}`);
  // Nothing under a B document key at all.
  expect(keysWritten.some((k) => k.includes(`__WB_REVISION__=${B}`) && !k.startsWith("/_next"))).toBe(false);
});

it("still restores genuinely evicted shell documents (empty precache)", async () => {
  const cache = installCaches({}); // full eviction

  await ensureAppShell();

  const keysWritten = cache.put.mock.calls.map(([k]) => k as string);
  expect(keysWritten).toContain(`/login?__WB_REVISION__=${B}`);
  expect(keysWritten).toContain(`/dashboard?__WB_REVISION__=${B}`);
  // Content-hashed asset (revision null) is keyed by plain URL.
  expect(keysWritten).toContain("/_next/static/chunks/b.js");
});

it("does not rewrite entries already present under the correct revision", async () => {
  const cache = installCaches({
    [`/login?__WB_REVISION__=${B}`]: "B-HTML",
    [`/dashboard?__WB_REVISION__=${B}`]: "B-HTML",
    "/_next/static/chunks/b.js": "chunk",
  });

  await ensureAppShell();

  // Everything the manifest lists is already correct -> no PRECACHE writes.
  const precacheWrites = cache.put.mock.calls.map(([k]) => k as string);
  expect(precacheWrites).toEqual([]);
});
