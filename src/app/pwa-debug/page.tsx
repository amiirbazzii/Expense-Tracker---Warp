"use client";

/**
 * Temporary diagnostic screen for the offline/PWA stack.
 *
 * Renders everything needed to diagnose a device without DevTools: worker
 * states, cache names, whether the core route documents and this page's own
 * chunks are matchable in Cache Storage, and a live probe of each route's
 * cache answer. Remove once the production offline issue is closed.
 */

import { useEffect, useState } from "react";

const DOC_ROUTES = ["/", "/add", "/cards", "/loans", "/dashboard", "/offline"];

async function collect(): Promise<string> {
  const lines: string[] = [];
  const log = (s: string) => lines.push(s);

  log(`time: ${new Date().toISOString()}`);
  log(`ua: ${navigator.userAgent}`);
  log(`navigator.onLine: ${navigator.onLine}`);

  // ── Service worker ──
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) {
      log("registration: NONE — no service worker registered at all");
    } else {
      const w = (sw: ServiceWorker | null) =>
        sw ? `${sw.state} :: ${sw.scriptURL}` : "—";
      log(`active:     ${w(reg.active)}`);
      log(`waiting:    ${w(reg.waiting)}`);
      log(`installing: ${w(reg.installing)}`);
      log(
        `controller: ${
          navigator.serviceWorker.controller
            ? navigator.serviceWorker.controller.scriptURL
            : "NONE — page is NOT controlled"
        }`,
      );
    }
  } catch (e) {
    log(`registration error: ${String(e)}`);
  }

  // ── Cache storage ──
  try {
    const names = (await caches.keys()).sort();
    log(`\ncaches (${names.length}):`);
    for (const n of names) {
      const c = await caches.open(n);
      log(`  ${n}: ${(await c.keys()).length} entries`);
    }

    log(`\ndocument matchability (ignoreSearch+ignoreVary):`);
    for (const r of DOC_ROUTES) {
      const hit = await caches.match(r, {
        ignoreSearch: true,
        ignoreVary: true,
      });
      log(`  ${r}: ${hit ? `HIT (${hit.status})` : "MISS"}`);
    }

    // This page's own scripts — do the chunks the app needs exist in cache?
    const scripts = Array.from(
      document.querySelectorAll<HTMLScriptElement>("script[src]"),
    )
      .map((s) => new URL(s.src).pathname)
      .filter((p) => p.startsWith("/_next/static/"));
    log(`\nthis page's chunks (${scripts.length}):`);
    for (const p of scripts.slice(0, 15)) {
      const hit = await caches.match(p, { ignoreVary: true });
      log(`  ${hit ? "HIT " : "MISS"} ${p}`);
    }
  } catch (e) {
    log(`cache error: ${String(e)}`);
  }

  // ── Live fetch probe per route (shows what actually answers) ──
  log(`\nfetch probe per route (no-store):`);
  for (const r of DOC_ROUTES) {
    try {
      const t0 = performance.now();
      const res = await fetch(r, { cache: "no-store" });
      const text = await res.text();
      const ms = Math.round(performance.now() - t0);
      const kind = text.includes("hasn&#x27;t been saved for offline") ||
        text.includes("hasn't been saved for offline")
        ? "OFFLINE-FALLBACK PAGE"
        : text.includes("/_next/static")
          ? "app document"
          : "unknown body";
      log(`  ${r}: ${res.status} in ${ms}ms → ${kind}`);
    } catch (e) {
      log(`  ${r}: FETCH FAILED (${String(e).slice(0, 60)})`);
    }
  }

  // How this page itself was delivered.
  const nav = performance.getEntriesByType(
    "navigation",
  )[0] as PerformanceNavigationTiming | undefined;
  if (nav) {
    log(
      `\nthis page delivery: transferSize=${nav.transferSize} ` +
        `(0 usually means served by the service worker/cache)`,
    );
  }

  return lines.join("\n");
}

export default function PwaDebugPage() {
  const [report, setReport] = useState("collecting…");
  const [copied, setCopied] = useState(false);

  const run = () => {
    setCopied(false);
    collect().then(setReport).catch((e) => setReport(`collect failed: ${e}`));
  };

  useEffect(run, []);

  return (
    <div style={{ padding: 16, fontFamily: "monospace", fontSize: 12 }}>
      <h1 style={{ fontSize: 16, fontWeight: 700 }}>PWA Debug</h1>
      <div style={{ margin: "8px 0", display: "flex", gap: 8 }}>
        <button
          onClick={run}
          style={{ padding: "6px 12px", border: "1px solid #888", borderRadius: 6 }}
        >
          Refresh
        </button>
        <button
          onClick={() => {
            navigator.clipboard.writeText(report).then(() => setCopied(true));
          }}
          style={{ padding: "6px 12px", border: "1px solid #888", borderRadius: 6 }}
        >
          {copied ? "Copied ✓" : "Copy report"}
        </button>
      </div>
      <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-all" }}>{report}</pre>
    </div>
  );
}
