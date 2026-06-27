import {
  upsertLocalEntityRecord,
  tombstoneLocalEntityRecord,
} from "@/data/local/indexedDbStore.js";
import { applyComputedBankBalances, runWithStableStringifyMemoAsync, stableStringify } from "@/domain/index.js";

/**
 * Diff-persist app state slices to IndexedDB + outbox (shared by debounced and immediate paths).
 */
export async function persistEntityStateDiff({ userId, prevState, nextState, updatedAt }) {
  if (!userId || !prevState || !nextState) return null;

  return runWithStableStringifyMemoAsync(async () => {
    const upsert = async (entityType, recordId, payload) => {
      await upsertLocalEntityRecord({
        userId,
        entityType,
        recordId,
        payload,
        deleted: false,
        updatedAt,
      });
    };

    const remove = async (entityType, recordId) => {
      await tombstoneLocalEntityRecord({ userId, entityType, recordId, updatedAt });
    };

    const normalizedBalance = applyComputedBankBalances(nextState);
    const nextMeta = {
      settings: normalizedBalance.settings,
      balance: normalizedBalance.balance,
      servicingCompletions: normalizedBalance.servicingCompletions || [],
      servicingWaSent: normalizedBalance.servicingWaSent || [],
    };
    const prevMeta = {
      settings: prevState.settings,
      balance: prevState.balance,
      servicingCompletions: prevState.servicingCompletions || [],
      servicingWaSent: prevState.servicingWaSent || [],
    };
    if (stableStringify(prevMeta) !== stableStringify(nextMeta)) {
      await upsertLocalEntityRecord({
        userId,
        entityType: "settings",
        recordId: "settings",
        payload: nextMeta,
        deleted: false,
        updatedAt,
      });
    }

    const persistEntityList = async (entityType, prevList, nextList) => {
      const prevArr = (Array.isArray(prevList) ? prevList : []).filter(
        (x) => x && typeof x === "object" && x.id != null,
      );
      const nextArr = (Array.isArray(nextList) ? nextList : []).filter(
        (x) => x && typeof x === "object" && x.id != null,
      );
      const prevMap = new Map(prevArr.map((x) => [String(x.id), x]));
      const nextMap = new Map(nextArr.map((x) => [String(x.id), x]));

      for (const [id] of prevMap) {
        if (!nextMap.has(id)) await remove(entityType, id);
      }
      for (const [id, nextRec] of nextMap) {
        const prevRec = prevMap.get(id);
        if (!prevRec || stableStringify(prevRec) !== stableStringify(nextRec)) {
          await upsert(entityType, id, nextRec);
        }
      }
    };

    await persistEntityList("sales", prevState.sales, normalizedBalance.sales);
    await persistEntityList("expenses", prevState.expenses, normalizedBalance.expenses);
    await persistEntityList("otherIncomes", prevState.otherIncomes, normalizedBalance.otherIncomes);
    await persistEntityList("recurringExpenses", prevState.recurringExpenses, normalizedBalance.recurringExpenses);
    await persistEntityList("inventoryEntries", prevState.inventoryEntries, normalizedBalance.inventoryEntries);
    await persistEntityList("purchases", prevState.purchases || [], normalizedBalance.purchases || []);
    await persistEntityList("emiEntries", prevState.emiEntries, normalizedBalance.emiEntries);
    await persistEntityList("loansGiven", prevState.loansGiven || [], normalizedBalance.loansGiven || []);
    await persistEntityList(
      "customerDirectory",
      prevState.customerDirectory || [],
      normalizedBalance.customerDirectory || [],
    );
    await persistEntityList(
      "vendorDirectory",
      prevState.vendorDirectory || [],
      normalizedBalance.vendorDirectory || [],
    );
    await persistEntityList("auditEvents", prevState.auditEvents || [], normalizedBalance.auditEvents || []);
    await persistEntityList(
      "syncConflictQueue",
      prevState.syncConflictQueue || [],
      normalizedBalance.syncConflictQueue || [],
    );

    const prevDismissed = new Set((prevState.dismissedAlertIds || []).map((x) => String(x)));
    const nextDismissed = new Set((normalizedBalance.dismissedAlertIds || []).map((x) => String(x)));
    for (const id of prevDismissed) {
      if (!nextDismissed.has(id)) await remove("dismissedAlertIds", id);
    }
    for (const id of nextDismissed) {
      if (!prevDismissed.has(id)) await upsert("dismissedAlertIds", id, { id });
    }

    return normalizedBalance;
  });
}
