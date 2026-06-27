import { useCallback } from "react";
import {
  upsertLocalEntityRecord,
  tombstoneLocalEntityRecord,
  writeAppCache,
} from "@/data/local/indexedDbStore.js";
import { withPersistLock } from "@/data/local/persistMutex.js";
import { defaultState, mergePersistedPayload } from "@/domain/index.js";
import { persistEntityStateDiff } from "./localEntityPersistPass.js";

/**
 * Synchronous IndexedDB writes for flows that must persist before UI advances (vs debounced persist).
 */
export function useImmediatePersistence({ currentUserIdRef, lastPersistedStateRef, pendingWritesRef }) {
  const persistSaleImmediate = useCallback(
    async (sale, oldSale = null) => {
      pendingWritesRef.current += 1;
      try {
        const userId = currentUserIdRef.current;
        if (!userId || !sale?.id) return;
        const updatedAt = new Date().toISOString();

        await withPersistLock(async () => {
          await upsertLocalEntityRecord({
            userId,
            entityType: "sales",
            recordId: String(sale.id),
            payload: sale,
            deleted: false,
            updatedAt,
          });

          if (oldSale && oldSale.id && oldSale.id !== sale.id) {
            await tombstoneLocalEntityRecord({
              userId,
              entityType: "sales",
              recordId: String(oldSale.id),
              updatedAt,
            });
          }
        });
      } finally {
        pendingWritesRef.current = Math.max(0, pendingWritesRef.current - 1);
      }
    },
    [currentUserIdRef, pendingWritesRef],
  );

  const persistWholeStateImmediate = useCallback(
    async (nextState) => {
      let persisted = null;
      pendingWritesRef.current += 1;
      try {
        return await withPersistLock(async () => {
          const userId = currentUserIdRef.current;
          if (!userId) throw new Error("Local user context not ready");

          const safe = mergePersistedPayload(nextState) || defaultState;
          persisted = safe;
          const prev = mergePersistedPayload(lastPersistedStateRef.current) || defaultState;
          const updatedAt = new Date().toISOString();

          await persistEntityStateDiff({ userId, prevState: prev, nextState: safe, updatedAt });
          lastPersistedStateRef.current = safe;
          await writeAppCache(safe).catch(() => {});
          return persisted;
        });
      } finally {
        pendingWritesRef.current = Math.max(0, pendingWritesRef.current - 1);
      }
    },
    [currentUserIdRef, lastPersistedStateRef, pendingWritesRef],
  );

  return { persistSaleImmediate, persistWholeStateImmediate };
}
