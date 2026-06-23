import { useCallback } from "react";
import { normEmiPaidDates } from "@/domain/index.js";

/**
 * EMI due-date paid/unpaid toggles.
 */
export function useEmiActions({ state, showToast, setState, persistWholeStateImmediate }) {
  const toggleEmiDuePaid = useCallback(
    async (emiId, dateStr, paid) => {
      const d = String(dateStr).slice(0, 10);
      if (!d || !emiId) return;
      const nextSnap = {
        ...state,
        emiEntries: (state.emiEntries || []).map((e) => {
          if (e.id !== emiId) return e;
          const cur = new Set(normEmiPaidDates(e.paidDueDates));
          if (paid) cur.add(d);
          else cur.delete(d);
          return { ...e, paidDueDates: [...cur].sort() };
        }),
      };
      try {
        const __p = await persistWholeStateImmediate(nextSnap);
        if (__p) setState(__p);
      } catch {
        showToast("Could not save EMI status");
      }
    },
    [persistWholeStateImmediate, setState, showToast, state],
  );

  return { toggleEmiDuePaid };
}
