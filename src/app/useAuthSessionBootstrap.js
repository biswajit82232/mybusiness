import { useEffect, useRef } from "react";
import { getAuthSessionReady } from "@/data/auth/auth.js";
import { withTimeout } from "@/app/withTimeout.js";

/** Hard cap so the splash never blocks the app indefinitely (offline / IDB / auth edge cases). */
const BOOT_WATCHDOG_MS = 14_000;
const BOOT_STEP_TIMEOUT_MS = 12_000;

/**
 * On mount: if session is ready, hydrate IndexedDB then set auth to `"ready"`; else `"needsAuth"`.
 * @param {(pct: number, label?: string) => void} [reportBootProgress]
 */
export function useAuthSessionBootstrap(hydrateLocalApp, setAuthState, reportBootProgress) {
  const bootDoneRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    bootDoneRef.current = false;

    const finish = (state) => {
      if (cancelled || bootDoneRef.current) return;
      bootDoneRef.current = true;
      setAuthState(state);
    };

    const watchdog = setTimeout(() => {
      if (cancelled || bootDoneRef.current) return;
      console.warn("[boot] watchdog — unblocking UI");
      reportBootProgress?.(90, "Continuing offline");
      finish("ready");
    }, BOOT_WATCHDOG_MS);

    (async () => {
      try {
        reportBootProgress?.(6, "Checking session");
        const ok = await withTimeout(getAuthSessionReady(), BOOT_STEP_TIMEOUT_MS, "session-check");
        if (cancelled) return;
        if (!ok) {
          finish("needsAuth");
          return;
        }
        reportBootProgress?.(14, "Opening workspace");
        await withTimeout(
          hydrateLocalApp(reportBootProgress),
          BOOT_STEP_TIMEOUT_MS,
          "local-hydrate",
        );
        if (cancelled) return;
        reportBootProgress?.(90, "Almost ready");
        finish("ready");
      } catch (err) {
        if (cancelled) return;
        console.warn("[boot] bootstrap step failed, opening with local fallback:", err);
        reportBootProgress?.(86, "Recovering");
        try {
          await withTimeout(
            hydrateLocalApp(reportBootProgress),
            BOOT_STEP_TIMEOUT_MS,
            "local-hydrate-retry",
          );
        } catch {
          /* hydrateLocalApp already falls back to defaultState */
        }
        finish("ready");
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(watchdog);
    };
  }, [hydrateLocalApp, setAuthState, reportBootProgress]);
}
