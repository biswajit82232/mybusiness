import { useEffect, useState } from "react";

export function DeleteConfirmModal({ modalRef, onCancel, onConfirm }) {
  const [busy, setBusy] = useState(false);
  const handleConfirm = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await onConfirm?.();
    } finally {
      setBusy(false);
    }
  };
  /* Escape closes the modal, matching other overlays in the app. Cancel is
   * blocked while a delete is in-flight to avoid double-tap races. */
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape" && !busy) onCancel?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onCancel]);
  return (
    <div ref={modalRef} className="modal-overlay" onClick={() => !busy && onCancel?.()}>
      <div className="modal" role="alertdialog" aria-modal="true" aria-label="Delete confirmation" aria-describedby="del-confirm-desc" onClick={(e) => e.stopPropagation()}>
        <div className="modal-hdr">
          <span className="modal-title">Delete?</span>
        </div>
        <p id="del-confirm-desc" className="modal-sub">This cannot be undone.</p>
        <div className="modal-btns">
          <button type="button" className="ghost-btn" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button type="button" className="danger-btn" onClick={handleConfirm} disabled={busy}>
            {busy ? "Deleting\u2026" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
