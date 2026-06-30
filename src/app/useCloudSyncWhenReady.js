import { useEffect } from "react";
import { isCloudAuthEnabled } from "@/data/auth/auth.js";

const SYNC_INTERVAL_MS = 10000;
const EVENT_DEBOUNCE_MS = 450;

/** When cloud auth is on and user is signed in, run sync on an interval and when back online / tab visible. */
export function useCloudSyncWhenReady({ authState, currentUserIdRef, executeCloudSync }) {
  useEffect(() => {
    if (authState !== "ready") return;
    if (!isCloudAuthEnabled()) {
      return;
    }
    const uid = currentUserIdRef.current;
    if (!uid || uid === "local-user") {
      return;
    }

    let cancelled = false;
    let inFlight = false;
    let backoffMs = 0;
    let nextAllowedAt = 0;
    const run = async () => {
      if (cancelled || inFlight) return;
      if (backoffMs > 0 && Date.now() < nextAllowedAt) return;
      inFlight = true;
      try {
        const result = await executeCloudSync();
        const hasFailure =
          result &&
          (result.ok === false ||
            (Array.isArray(result.errors) && result.errors.length > 0) ||
            result.reason === "session_timeout");
        if (hasFailure) {
          backoffMs = Math.min(backoffMs > 0 ? backoffMs * 2 : 5000, 60000);
          nextAllowedAt = Date.now() + backoffMs;
        } else {
          backoffMs = 0;
          nextAllowedAt = 0;
        }
      } finally {
        inFlight = false;
      }
    };

    let debounceTimer = null;
    const scheduleAfterEvents = () => {
      if (debounceTimer != null) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        debounceTimer = null;
        run();
      }, EVENT_DEBOUNCE_MS);
    };

    run();
    const id = setInterval(run, SYNC_INTERVAL_MS);
    const onOnline = () => scheduleAfterEvents();
    const onVis = () => {
      if (document.visibilityState === "visible") scheduleAfterEvents();
    };
    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelled = true;
      if (debounceTimer != null) clearTimeout(debounceTimer);
      clearInterval(id);
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [authState, executeCloudSync, currentUserIdRef]);
}
