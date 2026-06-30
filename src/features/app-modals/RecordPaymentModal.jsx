import { IcX } from "@/shared/ui/icons/AppIcons.jsx";
import { MenuSelect } from "@/shared/ui/inputs/MenuSelect.jsx";
import { Field } from "@/shared/ui/layout/AppChrome.jsx";
import { moneyFull, num, todayStr } from "@/domain/index.js";
import { COLORS } from "@/tokens.js";

const METHODS = [
  { value: "cash", label: "💵 Cash" },
  { value: "upi", label: "📱 UPI" },
  { value: "bank_transfer", label: "🏦 Bank transfer" },
  { value: "cheque", label: "📝 Cheque" },
  { value: "other", label: "Other" },
];

const REF_LABELS = {
  upi: "UPI Txn ID",
  cheque: "Cheque No.",
  bank_transfer: "Reference",
  cash: "Reference (optional)",
  other: "Reference (optional)",
};

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
  payMethod = "cash",
  onPayMethodChange,
  payReference = "",
  onPayReferenceChange,
  onSubmit,
  onDismiss,
}) {
  const row = purchase || sale;
  if (!row) return null;
  const isSupplier = !!purchase;
  const outstanding = num(row.balanceDuePaise ?? row.outstanding);
  const banks = bankAccounts || [];
  const ariaLabel = isSupplier ? "Record supplier payment" : "Record payment";
  const refLabel = REF_LABELS[payMethod] || "Reference";

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
          Balance due: <strong style={{ color: outstanding > 0 ? COLORS.amountNegative : COLORS.amountPositive }}>{moneyFull(outstanding)}</strong>
        </p>
        <form onSubmit={onSubmit}>
          <Field label="Payment method">
            <MenuSelect value={payMethod} onChange={onPayMethodChange} options={METHODS} />
          </Field>
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
          <Field label={refLabel}>
            <input
              type="text"
              value={payReference}
              onChange={(e) => onPayReferenceChange?.(e.target.value)}
              placeholder={payMethod === "upi" ? "e.g. 123456789012" : ""}
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
