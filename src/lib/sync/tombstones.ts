/**
 * Tombstones for offline deletes.
 *
 * When a synced row is deleted locally, its delete mutation may still be
 * sitting in the queue when the next hydration pass runs — and the server,
 * not yet knowing about the delete, still returns the document. Without a
 * marker, hydration re-inserts it and the deleted record "resurrects" (for
 * categories, permanently: their delete is queued by name and their
 * collection is excluded from authoritative deletion).
 *
 * A tombstone records the deleted row's cloudId; hydration skips any server
 * document carrying a tombstoned id. A tombstone is dropped once the server
 * stops returning the document (the delete has landed, or the record was
 * removed elsewhere), or after MAX_AGE_MS as a safety valve so a
 * dead-lettered delete cannot suppress a server-side record forever.
 *
 * Stored under a reserved key in the existing data store — adding a real
 * IndexedDB object store would need a DB version upgrade and re-open races
 * (see src/lib/storage/idb.ts). `clearAllStores()` wipes it with the rest.
 */

import { dataStore, idbReady } from "../storage/idb";
import { createAsyncLock } from "../storage/asyncLock";

const STORE_KEY = "sync_tombstones";
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/** `${collection}:${cloudId}` → deletion timestamp. */
type TombstoneMap = Record<string, number>;

const runExclusive = createAsyncLock();

async function read(): Promise<TombstoneMap> {
  await idbReady;
  const stored: TombstoneMap | null = await dataStore.getItem(STORE_KEY);
  return stored && typeof stored === "object" ? stored : {};
}

/** Record that the synced row `cloudId` of `collection` was deleted locally. */
export async function addTombstone(
  collection: string,
  cloudId: string,
): Promise<void> {
  await runExclusive(async () => {
    const map = await read();
    map[`${collection}:${cloudId}`] = Date.now();
    await dataStore.setItem(STORE_KEY, map);
  });
}

/** The cloudIds of `collection` that are currently tombstoned. */
export async function getTombstonedIds(
  collection: string,
): Promise<Set<string>> {
  const map = await read();
  const prefix = `${collection}:`;
  const now = Date.now();
  const ids = new Set<string>();
  for (const [key, at] of Object.entries(map)) {
    if (key.startsWith(prefix) && now - at < MAX_AGE_MS) {
      ids.add(key.slice(prefix.length));
    }
  }
  return ids;
}

/**
 * Drop one tombstone: the delete it guarded was rejected by the server, so
 * the document still exists upstream and the next hydration should restore it.
 */
export async function removeTombstone(
  collection: string,
  cloudId: string,
): Promise<void> {
  await runExclusive(async () => {
    const map = await read();
    const key = `${collection}:${cloudId}`;
    if (!(key in map)) return;
    delete map[key];
    await dataStore.setItem(STORE_KEY, map);
  });
}

/**
 * Drop tombstones of `collection` whose document the server no longer
 * returns — the delete has landed — plus any that aged out.
 */
export async function pruneTombstones(
  collection: string,
  serverIds: Set<string>,
): Promise<void> {
  await runExclusive(async () => {
    const map = await read();
    const prefix = `${collection}:`;
    const now = Date.now();
    let changed = false;
    for (const [key, at] of Object.entries(map)) {
      if (!key.startsWith(prefix)) continue;
      const cloudId = key.slice(prefix.length);
      if (!serverIds.has(cloudId) || now - at >= MAX_AGE_MS) {
        delete map[key];
        changed = true;
      }
    }
    if (changed) await dataStore.setItem(STORE_KEY, map);
  });
}
