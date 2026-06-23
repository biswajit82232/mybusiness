import { useEffect } from "react";

/** Show boot overlay again while auth returns to the checking state (e.g. re-login flow). */
export function useBootVisibleWhenAuthChecking(authState, setBootVisible) {
  useEffect(() => {
    if (authState === "checking") setBootVisible(true);
  }, [authState, setBootVisible]);
}
