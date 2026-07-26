import { LocalStorageManager } from "@/lib/storage/LocalStorageManager";

/**
 * Purge everything about the signed-in account that lives on this device.
 *
 * The app reads all of its data from IndexedDB, and that store is not
 * partitioned per user, so anything left behind at logout is visible to
 * whoever signs in next on the same device. The service worker additionally
 * caches Convex POST responses (`api-cache-*`), which hold the same financial
 * data, so those are dropped too.
 *
 * Best-effort: a failure here must never block the user from signing out.
 */
export async function clearLocalUserData(): Promise<void> {
  try {
    const manager = new LocalStorageManager();
    await manager.clearAllData();
  } catch (error) {
    console.error("Failed to clear local data on logout:", error);
  }

  try {
    if (typeof caches !== "undefined") {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((name) => name.startsWith("api-cache"))
          .map((name) => caches.delete(name)),
      );
    }
  } catch (error) {
    console.error("Failed to purge cached API responses on logout:", error);
  }
}
