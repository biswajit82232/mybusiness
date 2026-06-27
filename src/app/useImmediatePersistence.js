import { useCallback } from "react";
import {
  writeAppCache,
  upsertLocalEntityRecord,
  tombstoneLocalEntityRecord,
} from "@/data/local/indexedDbStore.js";
import { withPersistLock } from "@/data/local/persistMutex.js";
import { defaultState, mergePersistedPayload, runWithStableStringifyMemoAsync, stableStringify } from "@/domain/index.js";

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

        await runWithStableStringifyMemoAsync(async () => {
        const syncEntityList = async (entityType, prevList, nextList) => {
          const prevArr = (Array.isArray(prevList) ? prevList : []).filter((x) => x && typeof x === "object" && x.id != null);
          const nextArr = (Array.isArray(nextList) ? nextList : []).filter((x) => x && typeof x === "object" && x.id != null);
          const prevMap = new Map(prevArr.map((x) => [String(x.id), x]));
          const nextMap = new Map(nextArr.map((x) => [String(x.id), x]));

          for (const [id] of prevMap) {
            if (!nextMap.has(id)) {
              await tombstoneLocalEntityRecord({
                userId,
                entityType,
                recordId: id,
                updatedAt,
              });
            }
          }
          for (const [id, row] of nextMap) {
            const oldRow = prevMap.get(id);
            if (!oldRow || stableStringify(oldRow) !== stableStringify(row)) {
              await upsertLocalEntityRecord({
                userId,
                entityType,
                recordId: id,
                payload: row,
                deleted: false,
                updatedAt,
              });
            }
          }
        };

        await upsertLocalEntityRecord({
          userId,
          entityType: "settings",
          recordId: "settings",
          payload: {
            settings: safe.settings,
            balance: safe.balance,
            servicingCompletions: safe.servicingCompletions || [],
            servicingWaSent: safe.servicingWaSent || [],
          },
          deleted: false,
          updatedAt,
        });

        await syncEntityList("sales", prev.sales, safe.sales);
        await syncEntityList("expenses", prev.expenses, safe.expenses);
        await syncEntityList("otherIncomes", prev.otherIncomes, safe.otherIncomes);
        await syncEntityList("recurringExpenses", prev.recurringExpenses, safe.recurringExpenses);
        await syncEntityList("inventoryEntries", prev.inventoryEntries, safe.inventoryEntries);
        await syncEntityList("purchases", prev.purchases || [], safe.purchases || []);
        await syncEntityList("emiEntries", prev.emiEntries, safe.emiEntries);
        await syncEntityList("loansGiven", prev.loansGiven || [], safe.loansGiven || []);
        await syncEntityList("customerDirectory", prev.customerDirectory || [], safe.customerDirectory || []);
        await syncEntityList("vendorDirectory", prev.vendorDirectory || [], safe.vendorDirectory || []);

        const prevDismissed = new Set((prev.dismissedAlertIds || []).map((x) => String(x)));
        const nextDismissed = new Set((safe.dismissedAlertIds || []).map((x) => String(x)));
        for (const id of prevDismissed) {
          if (!nextDismissed.has(id)) {
            await tombstoneLocalEntityRecord({
              userId,
              entityType: "dismissedAlertIds",
              recordId: id,
              updatedAt,
            });
          }
        }
        for (const id of nextDismissed) {
          if (!prevDismissed.has(id)) {
            await upsertLocalEntityRecord({
              userId,
              entityType: "dismissedAlertIds",
              recordId: id,
              payload: { id },
              deleted: false,
              updatedAt,
            });
          }
        }

        lastPersistedStateRef.current = safe;
        await writeAppCache(safe).catch(() => {});
        });
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
