import { useEffect, useState } from "react";

/** Generic in-app confirm dialog (replaces window.confirm for destructive or important actions). */
export function SimpleConfirmModal({ modalRef, confirm, onCancel, onConfirm }) {
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!confirm) return;
    const onKey = (e) => {
      if (e.key === "Escape" && !busy) onCancel?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onCancel, confirm]);

  if (!confirm) return null;

  const handleConfirm = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await onConfirm?.();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div ref={modalRef} className="modal-overlay" onClick={() => !busy && onCancel?.()}>
      <div
        className="modal"
        role="alertdialog"
        aria-modal="true"
        aria-label={confirm.title || "Confirm"}
        aria-describedby="simple-confirm-desc"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-hdr">
          <span className="modal-title">{confirm.title || "Confirm?"}</span>
        </div>
        {confirm.message ? <p id="simple-confirm-desc" className="modal-sub">{confirm.message}</p> : null}
        <div className="modal-btns">
          <button type="button" className="ghost-btn" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            className={confirm.danger ? "danger-btn" : "primary-btn"}
            onClick={handleConfirm}
            disabled={busy}
          >
            {busy ? "Working\u2026" : confirm.confirmLabel || "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}
