import { useEffect } from "react";
import { processRecurringExpenses } from "@/domain/index.js";

const SIX_HOURS_MS = 6 * 60 * 60 * 1000;

/**
 * Runs due recurring expenses on mount, when the tab becomes visible, and every 6 hours.
 * The optional `ready` flag (default true) gates execution so the first run happens
 * AFTER local state has been hydrated — running against `defaultState` would post
 * nothing and could miss the window between renders.
 */
export function useRecurringExpensesOnTimer(setState, ready = true) {
  useEffect(() => {
    if (!ready) return undefined;
    const run = () => setState((p) => processRecurringExpenses(p));
    run();
    const onVis = () => {
      if (document.visibilityState === "visible") run();
    };
    document.addEventListener("visibilitychange", onVis);
    const t = setInterval(run, SIX_HOURS_MS);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      clearInterval(t);
    };
  }, [setState, ready]);
}
