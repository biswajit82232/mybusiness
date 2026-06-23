import { useEffect } from "react";
import { APP_VERSION } from "@/appVersion.js";

/** Listens for `mybusiness:sw-update-ready` (from `main.jsx` SW registration) to show the update banner. */
export function useServiceWorkerUpdateReady(setSwUpdateReady) {
  useEffect(() => {
    const reloadKey = "mb_sw_reloaded_for_version";
    let reloading = false;

    const safeReload = () => {
      if (reloading) return;
      reloading = true;
      try {
        sessionStorage.setItem(reloadKey, APP_VERSION);
      } catch {
        // Ignore storage failures; reload still proceeds.
      }
      setTimeout(() => window.location.reload(), 120);
    };

    const shouldReloadForThisVersion = () => {
      try {
        return sessionStorage.getItem(reloadKey) !== APP_VERSION;
      } catch {
        return true;
      }
    };

    const tryActivateWaitingWorker = async () => {
      if (!("serviceWorker" in navigator)) return;
      const reg = await navigator.serviceWorker.getRegistration();
      const waiting = reg?.waiting;
      if (!waiting) return;
      waiting.postMessage({ type: "SKIP_WAITING" });
      // Fallback: if `controllerchange` is delayed, still refresh to pick latest shell.
      setTimeout(() => {
        if (shouldReloadForThisVersion()) safeReload();
      }, 1800);
    };

    const onSwUpdate = () => {
      setSwUpdateReady(true);
      tryActivateWaitingWorker().catch(() => {});
    };
    const onControllerChange = () => {
      if (!shouldReloadForThisVersion()) return;
      safeReload();
    };
    const onVisibilityChange = () => {
      if (document.visibilityState !== "visible") return;
      navigator.serviceWorker?.getRegistration?.().then((reg) => reg?.update?.()).catch(() => {});
    };

    window.addEventListener("mybusiness:sw-update-ready", onSwUpdate);
    navigator.serviceWorker?.addEventListener?.("controllerchange", onControllerChange);
    document.addEventListener("visibilitychange", onVisibilityChange);
    const id = window.setInterval(() => {
      navigator.serviceWorker?.getRegistration?.().then((reg) => reg?.update?.()).catch(() => {});
    }, 60_000);

    return () => {
      window.removeEventListener("mybusiness:sw-update-ready", onSwUpdate);
      navigator.serviceWorker?.removeEventListener?.("controllerchange", onControllerChange);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      clearInterval(id);
    };
  }, [setSwUpdateReady]);
}
