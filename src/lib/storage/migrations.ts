/**
 * One-shot repairs for IndexedDB data written by earlier versions of the app.
 *
 * Runs from `LocalStorageManager.initialize()` when the stored metadata is
 * behind `CURRENT_SCHEMA_VERSION`, before any read path sees the data.
 *
 * Schema 3 fixes three legacy defects:
 *
 *  1. A second, never-drained mutation queue was accumulating a full copy of
 *     every entity under `pending_mutations` in this object store.
 *  2. A row created locally and later hydrated from Convex ended up stored
 *     twice — once under its `local_…` key, once under its Convex id.
 *  3. Because the UI exposed `cloudId || id` as the record id, transactions
 *     could reference a card by an id that is not the card row's key.
 */

import type { LocalEntity, EntityType } from "../types/local-storage";

export const CURRENT_SCHEMA_VERSION = 3;

/** The subset of the localforage API the migration needs. */
interface KeyValueStore {
  getItem<T>(key: string): Promise<T | null>;
  setItem<T>(key: string, value: T): Promise<T>;
  removeItem(key: string): Promise<void>;
}

type Collection = Record<string, LocalEntity>;

const COLLECTIONS: EntityType[] = [
  "expenses",
  "income",
  "categories",
  "cards",
  "forValues",
  "incomeCategories",
  "loans",
];

/** Rows that carry a `cardId` pointing at the cards collection. */
const CARD_REFERENCING_COLLECTIONS: EntityType[] = ["expenses", "income"];

export async function migrateLocalData(storage: KeyValueStore): Promise<void> {
  // 1. Drop the abandoned legacy queue.
  await storage.removeItem("pending_mutations");

  // 2. Collapse duplicates, remembering how every old id maps to the key that
  //    survived so references can be repointed in step 3.
  const cardKeyRemap = new Map<string, string>();

  for (const collection of COLLECTIONS) {
    const stored = await storage.getItem<Collection>(collection);
    if (!stored || typeof stored !== "object") continue;

    const { rows, remap, changed } = collapseDuplicates(stored);
    if (collection === "cards") {
      remap.forEach((to, from) => cardKeyRemap.set(from, to));
    }
    if (changed) {
      await storage.setItem(collection, rows);
    }
  }

  // 3. Repoint `cardId` references at the surviving card keys.
  if (cardKeyRemap.size > 0) {
    for (const collection of CARD_REFERENCING_COLLECTIONS) {
      const stored = await storage.getItem<Collection>(collection);
      if (!stored || typeof stored !== "object") continue;

      let changed = false;
      for (const [key, row] of Object.entries(stored)) {
        const cardId = (row as { cardId?: string }).cardId;
        if (!cardId) continue;
        const target = cardKeyRemap.get(cardId);
        if (target && target !== cardId) {
          stored[key] = { ...row, cardId: target } as LocalEntity;
          changed = true;
        }
      }

      if (changed) await storage.setItem(collection, stored);
    }
  }
}

/**
 * Merge rows that describe the same logical entity.
 *
 * The surviving key is the one that equals the row's `cloudId` when such a row
 * exists (it is what the UI has been displaying as the record id), otherwise
 * the existing local key. Field values come from whichever duplicate was
 * updated most recently.
 *
 * Exported for tests.
 */
export function collapseDuplicates(collection: Collection): {
  rows: Collection;
  remap: Map<string, string>;
  changed: boolean;
} {
  const groups = new Map<string, string[]>();
  const singles: string[] = [];

  for (const [key, row] of Object.entries(collection)) {
    const cloudId = row?.cloudId;
    if (!cloudId) {
      singles.push(key);
      continue;
    }
    const group = groups.get(cloudId);
    if (group) group.push(key);
    else groups.set(cloudId, [key]);
  }

  const rows: Collection = {};
  const remap = new Map<string, string>();
  let changed = false;

  for (const key of singles) {
    const row = collection[key];
    rows[key] = row.id === key ? row : { ...row, id: key };
    if (row.id !== key) changed = true;
    remap.set(key, key);
  }

  for (const [cloudId, keys] of Array.from(groups.entries())) {
    // Prefer the hydrated row (key === cloudId) as the survivor.
    const survivor = keys.find((key) => key === cloudId) ?? keys[0];
    const newest = keys
      .map((key) => collection[key])
      .reduce((a, b) => ((b.updatedAt ?? 0) > (a.updatedAt ?? 0) ? b : a));
    const base = collection[survivor];

    rows[survivor] = {
      ...newest,
      // Identity always comes from the survivor, never from the duplicate.
      id: survivor,
      localId: base.localId,
      cloudId,
      createdAt: base.createdAt,
    };

    for (const key of keys) {
      remap.set(key, survivor);
      if (key !== survivor) changed = true;
    }
    // Both spellings of the id resolve to the survivor.
    remap.set(cloudId, survivor);

    if (base.id !== survivor) changed = true;
  }

  return { rows, remap, changed };
}
