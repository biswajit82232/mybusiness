import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { viteEnv } from "./config/env.js";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import { initTelemetry } from "./data/telemetry/telemetry.js";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

initTelemetry();

// ── Service worker policy ────────────────────────────────
// Never run service worker in dev: stale caches can serve old JS and hide fixes.
if ("serviceWorker" in navigator) {
  if (viteEnv.PROD) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then((reg) => {
          // A new version may already be waiting (updatefound fired before this ran).
          if (reg.waiting && navigator.serviceWorker.controller) {
            window.dispatchEvent(new CustomEvent("mybusiness:sw-update-ready"));
          }
          reg.addEventListener("updatefound", () => {
            const worker = reg.installing;
            if (!worker) return;
            worker.addEventListener("statechange", () => {
              if (worker.state === "installed" && navigator.serviceWorker.controller) {
                window.dispatchEvent(new CustomEvent("mybusiness:sw-update-ready"));
              }
            });
          });
          // Check for a new deploy right away, then the hook polls periodically.
          reg.update().catch(() => {});
        })
        .catch((err) => {
          console.warn("[SW] registration failed:", err);
        });
    });
  } else {
    // Cleanup previously registered SWs in local development.
    navigator.serviceWorker.getRegistrations()
      .then((regs) => Promise.all(regs.map((r) => r.unregister())))
      .catch(() => {});
  }
}
