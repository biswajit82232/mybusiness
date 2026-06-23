import { useEffect } from "react";
import { readWelcomeDismissed } from "@/features/bootstrap/index.js";

/** After auth is ready, open welcome onboarding if this device has not dismissed it. */
export function useWelcomeOnFirstVisit(authState, setWelcomeOpen) {
  useEffect(() => {
    if (authState !== "ready") return;
    if (!readWelcomeDismissed()) setWelcomeOpen(true);
  }, [authState, setWelcomeOpen]);
}
