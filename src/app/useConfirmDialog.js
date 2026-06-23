import { useCallback, useRef, useState } from "react";

/**
 * In-app confirm dialog (replaces window.confirm for branches, bundles, assets, etc.).
 */
export function useConfirmDialog() {
  const [simpleConfirm, setSimpleConfirm] = useState(null);
  const simpleConfirmActionRef = useRef(null);

  const requestConfirm = useCallback((opts) => {
    simpleConfirmActionRef.current = typeof opts?.onConfirm === "function" ? opts.onConfirm : null;
    setSimpleConfirm({
      title: opts?.title || "Confirm?",
      message: opts?.message || "",
      confirmLabel: opts?.confirmLabel || "Confirm",
      danger: !!opts?.danger,
    });
  }, []);

  const cancelSimpleConfirm = useCallback(() => {
    simpleConfirmActionRef.current = null;
    setSimpleConfirm(null);
  }, []);

  const onSimpleConfirm = useCallback(async () => {
    const fn = simpleConfirmActionRef.current;
    simpleConfirmActionRef.current = null;
    setSimpleConfirm(null);
    await fn?.();
  }, []);

  return { simpleConfirm, requestConfirm, cancelSimpleConfirm, onSimpleConfirm };
}
