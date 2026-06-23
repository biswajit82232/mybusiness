import { useEffect } from "react";

/**
 * Syncs effective theme to `<html data-theme>`, PWA `theme-color` meta, and persistence.
 *
 * Reads `themeMode` from localStorage (`biz_theme_mode`): "light" | "dark" | "auto".
 * - `auto` honours `prefers-color-scheme` and live-updates on system changes.
 * - `darkMode` boolean (from app state) still wins for back-compat: when defined we
 *    write the matching mode and persist `biz_dark` so the pre-paint script in
 *    `index.html` stays in sync on next launch.
 *
 * Briefly suspends transitions when the theme flips so the swap is instant —
 * no half-second cross-fade of every element.
 */
const THEME_LIGHT = "#f6f8fb";
const THEME_DARK = "#0a1224";

function applyTheme(isDark) {
  const root = document.documentElement;
  root.classList.add("theme-switching");
  root.setAttribute("data-theme", isDark ? "dark" : "light");
  localStorage.setItem("biz_dark", isDark ? "1" : "0");
  const meta = document.querySelector('meta[name="theme-color"]:not([media])');
  if (meta) meta.setAttribute("content", isDark ? THEME_DARK : THEME_LIGHT);
  // Force reflow then clear class so transitions resume next frame
  // (browsers batch class changes — RAF gives us a clean repaint boundary)
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      root.classList.remove("theme-switching");
    });
  });
}

export function useDarkModeDocument(darkMode) {
  useEffect(() => {
    const mode = localStorage.getItem("biz_theme_mode") || "manual";

    if (mode === "auto") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = (e) => applyTheme(!!e.matches);
      applyTheme(!!mq.matches);
      mq.addEventListener?.("change", handler);
      return () => mq.removeEventListener?.("change", handler);
    }

    applyTheme(!!darkMode);
  }, [darkMode]);
}

/** Read current theme mode preference (returns "light" | "dark" | "auto"). */
export function getThemeMode() {
  const m = localStorage.getItem("biz_theme_mode");
  if (m === "auto" || m === "light" || m === "dark") return m;
  return localStorage.getItem("biz_dark") === "1" ? "dark" : "light";
}

/** Persist theme mode preference. Returns the effective `darkMode` boolean to use in state. */
export function setThemeMode(mode) {
  if (mode === "auto") {
    localStorage.setItem("biz_theme_mode", "auto");
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  }
  if (mode === "dark") {
    localStorage.setItem("biz_theme_mode", "dark");
    return true;
  }
  localStorage.setItem("biz_theme_mode", "light");
  return false;
}
