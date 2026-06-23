export function ActionConfirmModal({
  modalRef,
  actionConfirm,
  onCancel,
  onConfirmImportBackup,
  onContinueResetStep2,
  onCompleteReset,
}) {
  if (!actionConfirm) return null;

  return (
    <div ref={modalRef} className="modal-overlay" onClick={onCancel}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={
          actionConfirm.kind === "importBackup"
            ? "Confirm import backup"
            : actionConfirm.step === 2
              ? "Confirm erase all data"
              : "Confirm reset data"
        }
        onClick={(e) => e.stopPropagation()}
      >
        {actionConfirm.kind === "importBackup" ? (
          <>
            <div className="modal-hdr">
              <span className="modal-title">Replace all data?</span>
            </div>
            <p className="modal-sub">Replaces all data on this device. Cannot be undone.</p>
            <div className="modal-btns">
              <button type="button" className="ghost-btn" onClick={onCancel}>
                Cancel
              </button>
              <button type="button" className="danger-btn" onClick={() => onConfirmImportBackup(actionConfirm.next)}>
                Replace with backup
              </button>
            </div>
          </>
        ) : actionConfirm.step === 1 ? (
          <>
            <div className="modal-hdr">
              <span className="modal-title">Reset all data?</span>
            </div>
            <p className="modal-sub">Erases all data on this device.</p>
            <div className="modal-btns">
              <button type="button" className="ghost-btn" onClick={onCancel}>
                Cancel
              </button>
              <button type="button" className="primary-btn" onClick={onContinueResetStep2}>
                Continue
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="modal-hdr">
              <span className="modal-title">Erase everything?</span>
            </div>
            <p className="modal-sub">Permanent. Cannot be undone.</p>
            <div className="modal-btns">
              <button type="button" className="ghost-btn" onClick={onCancel}>
                Cancel
              </button>
              <button type="button" className="danger-btn" onClick={() => void onCompleteReset()}>
                Reset everything
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
