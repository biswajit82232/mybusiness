import { useEffect } from "react";
import {
  loadUserLocalState,
  writeAppCache,
  upsertLocalEntityRecord,
  tombstoneLocalEntityRecord,
} from "@/data/local/indexedDbStore.js";
import { runWithStableStringifyMemoAsync, stableStringify, applyComputedBankBalances } from "@/domain/index.js";

/**
 * Debounced IndexedDB persistence for app state when `authState === "ready"`.
 * Keeps lastPersistedStateRef in sync and mirrors a full snapshot to app cache.
 */
export function useDebouncedLocalPersist({
  authState,
  state,
  currentUserIdRef,
  persistTimerRef,
  persistRunIdRef,
  persistWarnedRef,
  suppressPersistRef,
  lastPersistedStateRef,
  setToast,
}) {
  useEffect(() => {
    if (authState !== "ready") return;
    const userId = currentUserIdRef.current;
    if (!userId) return;

    const prevState = lastPersistedStateRef.current;
    const nextState = state;

    // Reference-equality fast path: if the entire state object hasn't changed,
    // there's nothing new to persist and no need to churn the debounce timer.
    if (prevState === nextState) return;

    if (persistTimerRef.current) clearTimeout(persistTimerRef.current);

    // If we just seeded initial state, skip debounced persist until next real change.
    if (!prevState) {
      lastPersistedStateRef.current = nextState;
      return;
    }
    if (suppressPersistRef.current) {
      lastPersistedStateRef.current = nextState;
      return;
    }

    const runId = ++persistRunIdRef.current;
    persistTimerRef.current = setTimeout(async () => {
      try {
        if (runId !== persistRunIdRef.current) return;
        if (suppressPersistRef.current) {
          lastPersistedStateRef.current = nextState;
          return;
        }

        await runWithStableStringifyMemoAsync(async () => {
        const updatedAt = new Date().toISOString();

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

        // settings + balance — normalize bank balances before persist (sync-safe)
        const normalizedBalance = applyComputedBankBalances(nextState);
        const nextMeta = {
          settings: nextState.settings,
          balance: normalizedBalance.balance,
          servicingCompletions: nextState.servicingCompletions || [],
        };
        const prevMeta = {
          settings: prevState.settings,
          balance: prevState.balance,
          servicingCompletions: prevState.servicingCompletions || [],
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

        // Array entities by id
        const persistEntityList = async (entityType, prevList, nextList) => {
          // Filter nulls/undefineds so x.id never throws on corrupted state entries.
          const prevArr = (Array.isArray(prevList) ? prevList : []).filter((x) => x && typeof x === "object" && x.id != null);
          const nextArr = (Array.isArray(nextList) ? nextList : []).filter((x) => x && typeof x === "object" && x.id != null);
          const prevMap = new Map(prevArr.map((x) => [String(x.id), x]));
          const nextMap = new Map(nextArr.map((x) => [String(x.id), x]));

          // Deletes
          for (const [id] of prevMap) {
            if (!nextMap.has(id)) await remove(entityType, id);
          }
          // Adds/Updates
          for (const [id, nextRec] of nextMap) {
            const prevRec = prevMap.get(id);
            if (!prevRec) {
              await upsert(entityType, id, nextRec);
              continue;
            }
            if (stableStringify(prevRec) !== stableStringify(nextRec)) {
              await upsert(entityType, id, nextRec);
            }
          }
        };

        await persistEntityList("sales", prevState.sales, nextState.sales);
        await persistEntityList("expenses", prevState.expenses, nextState.expenses);
        await persistEntityList("otherIncomes", prevState.otherIncomes, nextState.otherIncomes);
        await persistEntityList("recurringExpenses", prevState.recurringExpenses, nextState.recurringExpenses);
        await persistEntityList("inventoryEntries", prevState.inventoryEntries, nextState.inventoryEntries);
        await persistEntityList("purchases", prevState.purchases || [], nextState.purchases || []);
        await persistEntityList("emiEntries", prevState.emiEntries, nextState.emiEntries);
        await persistEntityList("loansGiven", prevState.loansGiven || [], nextState.loansGiven || []);
        await persistEntityList("customerDirectory", prevState.customerDirectory || [], nextState.customerDirectory || []);
        await persistEntityList("vendorDirectory", prevState.vendorDirectory || [], nextState.vendorDirectory || []);

        // dismissed alerts as a set of strings
        const prevDismissed = new Set((prevState.dismissedAlertIds || []).map((x) => String(x)));
        const nextDismissed = new Set((nextState.dismissedAlertIds || []).map((x) => String(x)));
        for (const id of prevDismissed) {
          if (!nextDismissed.has(id)) await remove("dismissedAlertIds", id);
        }
        for (const id of nextDismissed) {
          if (!prevDismissed.has(id)) await upsert("dismissedAlertIds", id, { id });
        }

        lastPersistedStateRef.current = nextState;
        // Keep a full-state fallback snapshot for crash-safe reload recovery.
        await writeAppCache(normalizedBalance).catch(() => {});
        persistWarnedRef.current = false;
        });
      } catch (persistErr) {
        // Local save failures are handled separately from UI navigation state.
        console.error("[persist] local save failed:", persistErr);
        if (!persistWarnedRef.current) {
          // Only toast once per session to avoid repeated alerts.
          // Most causes are transient (IDB busy, version upgrade in progress).
          persistWarnedRef.current = true;
          // Retry once after a short delay before surfacing to user.
          setTimeout(async () => {
            try {
              const userId2 = currentUserIdRef.current;
              if (userId2) await loadUserLocalState(userId2); // probe IDB
              // If we get here IDB is healthy — transient error, don't toast
            } catch {
              setToast("Storage error — your data may not have saved. Please reload.");
            }
          }, 2000);
        }
      }
    }, 350);

    return () => {
      if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    };
  }, [
    state,
    authState,
    currentUserIdRef,
    persistTimerRef,
    persistRunIdRef,
    persistWarnedRef,
    suppressPersistRef,
    lastPersistedStateRef,
    setToast,
  ]);
}
