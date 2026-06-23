import { useEffect } from "react";

/**
 * Global keyboard shortcuts:
 *   /        → open search (unless typing in a field)
 *   ?        → toggle shortcut help (Shift+/)
 *   Ctrl+K / Cmd+K → open search (power-user)
 *   Esc      → handled by useGlobalBackNavigation
 *
 * Skipped when:
 *   - Focus is in input/textarea/[contenteditable] or a modal/overlay
 *   - Any modifier other than Ctrl/Cmd is active (so it does not block accents/IME)
 */
function isEditable(el) {
  if (!el) return false;
  if (el.isContentEditable) return true;
  const tag = el.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return false;
}

export function useGlobalShortcuts({ onOpenSearch, onShowHelp, suspended = false }) {
  useEffect(() => {
    if (suspended) return undefined;

    const onKey = (e) => {
      // Don't interfere when typing
      if (isEditable(e.target)) return;

      const meta = e.metaKey || e.ctrlKey;
      const k = e.key;

      // Cmd/Ctrl+K → search
      if (meta && (k === "k" || k === "K")) {
        e.preventDefault();
        onOpenSearch?.();
        return;
      }

      // Bare key: avoid when modifiers (except shift for `?`) are held
      if (e.altKey || e.metaKey || e.ctrlKey) return;

      if (k === "/" && !e.shiftKey) {
        e.preventDefault();
        onOpenSearch?.();
        return;
      }

      if (k === "?" || (e.shiftKey && k === "/")) {
        e.preventDefault();
        onShowHelp?.();
        return;
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onOpenSearch, onShowHelp, suspended]);
}
