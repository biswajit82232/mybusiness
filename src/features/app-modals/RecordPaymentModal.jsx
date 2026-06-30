import { IcX } from "@/shared/ui/icons/AppIcons.jsx";
import { MenuSelect } from "@/shared/ui/inputs/MenuSelect.jsx";
import { Field } from "@/shared/ui/layout/AppChrome.jsx";
import { moneyFull, num, todayStr } from "@/domain/index.js";

/** Record customer receipt (`sale`) or supplier payment (`purchase`) — pass exactly one. */
export function RecordPaymentModal({
  modalRef,
  sale,
  purchase,
  bankAccounts,
  payBankAccountId,
  onPayBankAccountChange,
  payAmt,
  onPayAmtChange,
  payDate,
  onPayDateChange,
  onSubmit,
  onDismiss,
}) {
  const row = purchase || sale;
  if (!row) return null;
  const isSupplier = !!purchase;
  const outstanding = num(row.outstanding);
  const banks = bankAccounts || [];
  const ariaLabel = isSupplier ? "Record supplier payment" : "Record payment";

  return (
    <div
      ref={modalRef}
      className="modal-overlay"
      onClick={onDismiss}
    >
      <div className="modal" role="dialog" aria-modal="true" aria-label={ariaLabel} onClick={(e) => e.stopPropagation()}>
        <div className="modal-hdr">
          <span className="modal-title">{isSupplier ? "Record supplier payment" : "Record payment"}</span>
          <button type="button" className="icon-btn-sm" onClick={onDismiss} aria-label="Close">
            <IcX />
          </button>
        </div>
        <p className="modal-sub">
          Balance due: <strong>{moneyFull(outstanding)}</strong>
        </p>
        <form onSubmit={onSubmit}>
          <Field label={isSupplier ? "Pay from (bank / cash)" : "Deposit to (bank / cash)"}>
            <MenuSelect
              value={payBankAccountId}
              onChange={(v) => onPayBankAccountChange(v)}
              options={[
                { value: "", label: "Select account" },
                ...banks.map((b) => ({
                  value: b.id,
                  label: (b.name || "").trim() || "Account",
                })),
              ]}
            />
          </Field>
          <Field label={isSupplier ? "Amount (₹)" : "Amount received (₹)"}>
            <input
              type="number"
              min="0.01"
              max={outstanding}
              step="0.01"
              autoFocus
              value={payAmt}
              onChange={(e) => onPayAmtChange(e.target.value)}
              required
            />
          </Field>
          <Field label="Payment date">
            <input
              type="date"
              value={String(payDate || "").slice(0, 10) || todayStr()}
              onChange={(e) => onPayDateChange?.(e.target.value)}
              required
            />
          </Field>
          <div className="modal-btns">
            <button type="button" className="ghost-btn" onClick={onDismiss}>
              Cancel
            </button>
            <button type="submit" className="primary-btn" disabled={!String(payBankAccountId || "").trim()}>
              Record
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
