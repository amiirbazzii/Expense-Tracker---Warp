// background-sync-sw.js
// Handles background sync communication + aggressive cache lifecycle management.
// Imported into the main service worker via importScripts.

// ── Cache versioning ──────────────────────────────────────────────────────────
// Bump CACHE_VERSION when you want to invalidate all existing caches.
// The SW's activate handler will purge anything not in the expected set.
const CACHE_VERSION = "v2";

const EXPECTED_CACHES = new Set([
  // Workbox internal precache (version suffix managed by Workbox itself)
  "workbox-precache-v2",
  // Our versioned runtime caches
  `next-static-chunks-${CACHE_VERSION}`,
  `images-${CACHE_VERSION}`,
  `static-resources-${CACHE_VERSION}`,
  `api-cache-${CACHE_VERSION}`,
  `app-pages-${CACHE_VERSION}`,
  `root-pages-${CACHE_VERSION}`,
  `pages-${CACHE_VERSION}`,
  `general-cache-${CACHE_VERSION}`,
]);

// ── Activate: purge stale caches and claim all clients ────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const allCaches = await caches.keys();
      let deletedCount = 0;

      // Delete any cache not in our expected set.
      // We keep Workbox precaches (workbox-precache-*) even across versions
      // since Workbox manages its own cleanup internally.
      for (const name of allCaches) {
        const isWorkboxPrecache = name.startsWith("workbox-precache-");
        const isExpected = EXPECTED_CACHES.has(name);

        if (!isExpected && !isWorkboxPrecache) {
          console.log(`[PWA] Deleting stale cache: ${name}`);
          await caches.delete(name);
          deletedCount++;
        }
      }

      if (deletedCount > 0) {
        console.log(
          `[PWA] Purged ${deletedCount} stale cache(s). Active caches:`,
          (await caches.keys()).filter(
            (n) => !n.startsWith("workbox-precache-"),
          ),
        );
      }

      // Immediately take control of all clients (no second navigation needed)
      await self.clients.claim();
    })(),
  );
});

// ── Install: skip waiting (activate immediately when a new SW is detected) ────
// Note: next-pwa's skipWaiting + clientsClaim handles this in the generated SW.
// This is a safety net for standalone SW updates.
self.addEventListener("install", () => {
  self.skipWaiting();
});

// ── Message handling ──────────────────────────────────────────────────────────
self.addEventListener("message", (event) => {
  if (!event.data) return;

  switch (event.data.type) {
    case "SYNC_NOW":
      event.waitUntil(notifyClients("syncing"));
      break;

    case "SKIP_WAITING":
      self.skipWaiting();
      break;

    case "CLAIM_CLIENTS":
      event.waitUntil(self.clients.claim());
      break;

    case "PURGE_CACHES":
      // Manual trigger to clean caches (useful for debugging)
      event.waitUntil(
        (async () => {
          const allCaches = await caches.keys();
          let count = 0;
          for (const name of allCaches) {
            if (
              !EXPECTED_CACHES.has(name) &&
              !name.startsWith("workbox-precache-")
            ) {
              await caches.delete(name);
              count++;
            }
          }
          console.log(`[PWA] Manual purge: deleted ${count} caches`);
        })(),
      );
      break;
  }
});

// ── Background sync (periodic) ────────────────────────────────────────────────
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-pending-operations") {
    event.waitUntil(notifyClients("syncing"));
  }
});

// ── Helpers ───────────────────────────────────────────────────────────────────
async function notifyClients(status, error) {
  try {
    const clients = await self.clients.matchAll({ type: "window" });
    const msg = { type: "BACKGROUND_SYNC", status };

    if (error) {
      msg.error = error.message || String(error);
    }

    clients.forEach((client) => {
      client.postMessage(msg);
    });

    return true;
  } catch (err) {
    console.error("[Background Sync] Failed to notify clients:", err);
    return false;
  }
}
