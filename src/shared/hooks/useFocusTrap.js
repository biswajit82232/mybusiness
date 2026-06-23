import { useEffect } from "react";

const SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

function getFocusable(root) {
  if (!root) return [];
  return Array.from(root.querySelectorAll(SELECTOR)).filter((el) => {
    if (el.closest('[aria-hidden="true"]')) return false;
    return el.offsetWidth > 0 || el.offsetHeight > 0 || el === document.activeElement;
  });
}

/**
 * Keeps keyboard focus within `containerRef` while `active` is true.
 * Restores focus to the previously focused element on cleanup.
 */
export function useFocusTrap(containerRef, active) {
  useEffect(() => {
    if (!active) return;
    const root = containerRef.current;
    if (!root) return;

    const previous = document.activeElement;

    const focusFirst = () => {
      const nodes = getFocusable(root);
      (nodes[0] || root).focus?.();
    };

    const t = requestAnimationFrame(() => focusFirst());

    const onKeyDown = (e) => {
      if (e.key !== "Tab") return;
      const nodes = getFocusable(root);
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    root.addEventListener("keydown", onKeyDown);
    return () => {
      cancelAnimationFrame(t);
      root.removeEventListener("keydown", onKeyDown);
      if (previous && typeof previous.focus === "function") {
        try {
          previous.focus();
        } catch {
          /* ignore */
        }
      }
    };
  }, [active, containerRef]);
}
