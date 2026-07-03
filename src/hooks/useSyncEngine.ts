"use client";

import { useCallback, useEffect, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAuth } from "@/contexts/AuthContext";
import { LocalStorageManager } from "@/lib/storage/LocalStorageManager";
import { PendingMutation } from "@/lib/types/local-storage";

/**
 * Map a storeName + action to the correct Convex mutation function reference.
 * Returns null if no mapping exists (the mutation will be skipped gracefully).
 */
function getConvexMutation(
  storeName: string,
  action: string,
  convexMutations: ReturnType<typeof useMutations>,
): ((args: any) => Promise<any>) | null {
  const key = `${storeName}:${action}` as keyof typeof convexMutations;
  return convexMutations[key] ?? null;
}

/**
 * Hook that returns all Convex mutation references needed by the sync engine.
 * We call useMutation unconditionally (hooks must not be conditional).
 */
function useMutations() {
  return {
    // Expenses
    "expenses:CREATE": useMutation(api.expenses.createExpense),
    "expenses:UPDATE": useMutation(api.expenses.updateExpense),
    "expenses:DELETE": useMutation(api.expenses.deleteExpense),
    // Income
    "income:CREATE": useMutation(api.cardsAndIncome.createIncome),
    "income:UPDATE": useMutation(api.cardsAndIncome.updateIncome),
    "income:DELETE": useMutation(api.cardsAndIncome.deleteIncome),
    // Categories
    "categories:CREATE": useMutation(api.expenses.createCategory),
    // Cards
    "cards:CREATE": useMutation(api.cardsAndIncome.addCard),
    "cards:DELETE": useMutation(api.cardsAndIncome.deleteCard),
    // For Values
    "forValues:CREATE": useMutation(api.expenses.createForValue),
    // Loans
    "loans:CREATE": useMutation(api.loans.createLoan),
    "loans:UPDATE": useMutation(api.loans.updateLoan),
    "loans:DELETE": useMutation(api.loans.deleteLoan),
  } as Record<string, ReturnType<typeof useMutation>>;
}

/**
 * Build the Convex args from a mutation's payload, stripping local-only fields.
 */
function buildConvexArgs(
  storeName: string,
  action: string,
  payload: any,
): Record<string, any> {
  const base = { ...payload };

  // Remove local-only fields that Convex doesn't expect
  delete base.id;
  delete base.localId;
  delete base.syncStatus;
  delete base.version;
  delete base.createdAt;
  delete base.updatedAt;
  delete base.lastSyncedAt;
  delete base.cloudId;
  delete base._id;
  delete base._creationTime;

  switch (storeName) {
    case "expenses":
      if (action === "DELETE") {
        // DELETE only needs the cloud expenseId
        return { expenseId: payload.id };
      }
      if (action === "UPDATE") {
        return { ...base, expenseId: payload.id };
      }
      // CREATE — pass the data as-is (minus local fields)
      return base;

    case "income":
      if (action === "DELETE") {
        return { incomeId: payload.id };
      }
      if (action === "UPDATE") {
        return { ...base, incomeId: payload.id };
      }
      return base;

    case "categories":
      return { name: payload.name };

    case "cards":
      if (action === "DELETE") {
        return { cardId: payload.id };
      }
      return { name: payload.name };

    case "forValues":
      return { value: payload.value };

    case "loans":
      if (action === "DELETE") {
        return { loanId: payload.id };
      }
      // UPDATE — Convex expects loanId + fields to patch
      return { loanId: payload.id, ...base };

    default:
      return base;
  }
}

/**
 * useSyncEngine
 *
 * Watches the pending_mutations queue and processes it FIFO whenever the
 * app is online. Each mutation is dispatched to the correct Convex mutation.
 * On success the mutation is dequeued and the local entity is marked synced.
 * On network error the loop halts and retries later.
 */
export function useSyncEngine(
  localStorageManager: LocalStorageManager | null,
  isOnline: boolean,
) {
  const { token } = useAuth();
  const convexMutations = useMutations();
  const processingRef = useRef(false);

  const processQueue = useCallback(async () => {
    if (!localStorageManager || !token || processingRef.current) return;
    processingRef.current = true;

    try {
      const mutations = await localStorageManager.fetchOrdered();
      if (mutations.length === 0) return;

      for (const mutation of mutations) {
        const { id, action, storeName, payload } = mutation;

        const convexFn = getConvexMutation(storeName, action, convexMutations);
        if (!convexFn) {
          // Unknown store/action — dequeue to avoid blocking the queue
          console.warn(
            `[SyncEngine] No Convex mutation for ${storeName}:${action}, skipping`,
          );
          await localStorageManager.dequeue(id);
          continue;
        }

        try {
          const convexArgs = buildConvexArgs(storeName, action, payload);
          const result = await convexFn({ token, ...convexArgs });

          // On success: dequeue the mutation and mark the entity synced
          await localStorageManager.dequeue(id);

          // For CREATE mutations, Convex returns the new _id — store it as cloudId
          if (action === "CREATE" && result && typeof result === "object") {
            const cloudId =
              (result as any)._id ?? (result as any).id ?? (result as any);
            if (typeof cloudId === "string" && payload.id) {
              await localStorageManager.markEntityAsSynced(
                storeName,
                payload.id,
                cloudId,
              );
            }
          } else if (payload.id) {
            await localStorageManager.markEntityAsSynced(storeName, payload.id);
          }
        } catch (error: any) {
          // Network / timeout errors — halt the queue, retry later
          const msg = error?.message ?? "";
          const isNetworkError =
            error?.name === "ConvexConnectionError" ||
            msg.includes("network") ||
            msg.includes("timeout") ||
            msg.includes("fetch") ||
            msg.includes("abort") ||
            msg.includes("offline");

          if (isNetworkError) {
            console.warn(
              `[SyncEngine] Network error processing ${storeName}:${action}, halting queue`,
              msg,
            );
            return; // Stop processing — will retry on next online event
          }

          // Non-retryable error — dequeue to avoid blocking
          console.error(
            `[SyncEngine] Non-retryable error for ${storeName}:${action}, removing from queue`,
            msg,
          );
          await localStorageManager.dequeue(id);
        }
      }
    } finally {
      processingRef.current = false;
    }
  }, [localStorageManager, token, convexMutations]);

  // Trigger: online transition or initial boot with network
  useEffect(() => {
    if (isOnline && localStorageManager && token) {
      processQueue();
    }
  }, [isOnline, localStorageManager, token, processQueue]);

  // Expose for manual triggering
  return { processQueue };
}
