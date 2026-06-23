import { useCallback } from "react";
import { makeId, normServicingCompletions, todayStr } from "@/domain/index.js";

export function useServicingActions({ state, setState, showToast, persistWholeStateImmediate, lastPersistedStateRef }) {
  const markServicingComplete = useCallback(
    async (saleId, serviceNum, note = "") => {
      const sid = String(saleId || "").trim();
      const sn = Math.min(3, Math.max(1, Math.round(Number(serviceNum)) || 1));
      if (!sid) return;
      const existing = normServicingCompletions(state.servicingCompletions);
      if (existing.some((c) => c.saleId === sid && c.serviceNum === sn)) {
        showToast("This visit is already marked done");
        return;
      }
      const entry = {
        id: makeId(),
        saleId: sid,
        serviceNum: sn,
        completedDate: todayStr(),
        note: String(note || "").trim(),
      };
      const next = {
        ...state,
        servicingCompletions: [entry, ...existing],
      };
      const persisted = await persistWholeStateImmediate(next);
      if (persisted) {
        setState(persisted);
        lastPersistedStateRef.current = persisted;
      } else {
        setState(next);
      }
      showToast(`Service visit ${sn} marked complete`);
    },
    [state, setState, showToast, persistWholeStateImmediate, lastPersistedStateRef],
  );

  const undoServicingComplete = useCallback(
    async (saleId, serviceNum) => {
      const sid = String(saleId || "").trim();
      const sn = Math.min(3, Math.max(1, Math.round(Number(serviceNum)) || 1));
      const existing = normServicingCompletions(state.servicingCompletions);
      const nextList = existing.filter((c) => !(c.saleId === sid && c.serviceNum === sn));
      if (nextList.length === existing.length) return;
      const next = { ...state, servicingCompletions: nextList };
      const persisted = await persistWholeStateImmediate(next);
      if (persisted) {
        setState(persisted);
        lastPersistedStateRef.current = persisted;
      } else {
        setState(next);
      }
      showToast("Visit marked pending again");
    },
    [state, setState, showToast, persistWholeStateImmediate, lastPersistedStateRef],
  );

  return { markServicingComplete, undoServicingComplete };
}
