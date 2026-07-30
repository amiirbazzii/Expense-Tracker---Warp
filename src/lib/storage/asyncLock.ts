/**
 * Minimal FIFO mutex for serializing read-modify-write cycles.
 *
 * IndexedDB (via localforage) offers no compare-and-swap: every write here is
 * "read the whole collection → mutate it in memory → write it back". Two of
 * those interleaving means the second write silently discards the first one's
 * change. Every such cycle has to run through a lock.
 *
 * The lock must be created at *module* scope, not per instance: several
 * managers point at the same object store, so a per-instance lock would not
 * serialize anything.
 */
export type ExclusiveRunner = <T>(fn: () => Promise<T>) => Promise<T>;

export function createAsyncLock(): ExclusiveRunner {
  let tail: Promise<unknown> = Promise.resolve();

  return function runExclusive<T>(fn: () => Promise<T>): Promise<T> {
    // Chain on both settle paths so one rejection cannot wedge the queue.
    const result = tail.then(fn, fn);
    tail = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  };
}
