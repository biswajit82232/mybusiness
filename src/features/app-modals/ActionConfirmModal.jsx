export function ActionConfirmModal({
  modalRef,
  actionConfirm,
  onCancel,
  onConfirmImportBackup,
  onContinueResetStep2,
  onCompleteReset,
  onDownloadBackupBeforeReset,
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
            {actionConfirm.importMeta?.warning ? (
              <p className="modal-sub modal-sub--warn">{actionConfirm.importMeta.warning}</p>
            ) : null}
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
            <p className="modal-sub">
              Download a backup first if you may need your books later. Reset erases sales, expenses, inventory, and
              settings on this device.
            </p>
            <div className="modal-btns modal-btns--stack">
              <button
                type="button"
                className="ghost-btn"
                onClick={() => {
                  onDownloadBackupBeforeReset?.();
                }}
              >
                Download backup now
              </button>
              <div className="modal-btns">
                <button type="button" className="ghost-btn" onClick={onCancel}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="primary-btn"
                  onClick={() =>
                    onContinueResetStep2?.({
                      backupDownloaded: actionConfirm.backupDownloaded,
                    })
                  }
                >
                  Continue
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="modal-hdr">
              <span className="modal-title">Erase everything?</span>
            </div>
            <p className="modal-sub">
              Permanent. Cannot be undone.
              {actionConfirm.backupDownloaded
                ? " You downloaded a backup in this session."
                : " No backup was downloaded in this session."}
            </p>
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
