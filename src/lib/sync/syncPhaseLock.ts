import { createAsyncLock } from "../storage/asyncLock";

/**
 * Serializes the two write-heavy sync phases — the queue drain and a
 * hydration pass — against each other.
 *
 * Both fire together on reconnect. Unserialized, hydration can snapshot a
 * collection *before* the drain writes a freshly-created row's cloudId back,
 * then insert the server's copy of that same row a second time under its
 * Convex id: a persistent duplicate in IndexedDB. With the lock, whichever
 * phase starts first finishes before the other reads.
 */
export const runSyncPhase = createAsyncLock();
