import * as localforage from "localforage";

/**
 * The app's IndexedDB handles, created in one place.
 *
 * Both stores live in the same database. IndexedDB can only add an object
 * store during a *version upgrade*, so two localforage instances sharing a
 * database each raise the version when their store is missing. Done
 * concurrently, both read the same current version, both request version+1,
 * and the loser throws:
 *
 *   VersionError: The requested version (6) is less than the existing version (7)
 *   The database "ExpenseTrackerV2" can't be downgraded from version 6 to 5
 *
 * Opening them strictly in sequence removes that race. Anything touching
 * `queueStore` must await `idbReady` first (see MutationQueueManager).
 */

const DB_NAME = "ExpenseTrackerV2";

export const dataStore = localforage.createInstance({
  name: DB_NAME,
  storeName: "local_first_data",
  description: "Local-first data storage with cloud sync capabilities",
});

export const queueStore = localforage.createInstance({
  name: DB_NAME,
  storeName: "mutation_queue",
  description: "FIFO queue of pending Convex mutations for offline-first sync",
});

/** Resolves once both stores exist. Never rejects. */
export const idbReady: Promise<void> = dataStore
  .ready()
  .then(() => queueStore.ready())
  .then(() => undefined)
  .catch((err) => {
    console.warn("[IDB] Store initialization failed:", err);
  });

/**
 * Wipe every store without deleting the database.
 *
 * `indexedDB.deleteDatabase()` looks tidier but breaks the live localforage
 * instances: they keep the version they last saw, so their next open requests
 * a version the recreated database has already passed — the VersionError
 * above. Clearing the stores removes exactly the same data and leaves the
 * schema (and everyone's cached version) intact.
 */
export async function clearAllStores(): Promise<void> {
  await idbReady;
  await Promise.all([dataStore.clear(), queueStore.clear()]);
}
