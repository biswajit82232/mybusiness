import { useState } from "react";
import { IcX } from "@/shared/ui/icons/AppIcons.jsx";
import { Field } from "@/shared/ui/layout/AppChrome.jsx";
import {
  loanGivenEconomicOutstanding,
  loanGivenInterestOutstandingReconciled,
  moneyFull,
  num,
  todayStr,
} from "@/domain/index.js";

/** Record interest-only or principal-only repayment on a loan (no banking). */
export function LoanGivenRecordPaymentModal({
  modalRef,
  loan,
  onSubmit,
  onDismiss,
}) {
  const [kind, setKind] = useState("interest");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayStr());

  if (!loan) return null;

  const today = todayStr();
  const principalLeft = Math.max(0, num(loan.principal) - num(loan.principalRepaid));
  const interestInBooks = loanGivenInterestOutstandingReconciled(loan, today);
  const economicOut = loanGivenEconomicOutstanding(loan);
  const effectiveInterestLeft = interestInBooks;
  const maxAmt = kind === "principal" ? principalLeft : effectiveInterestLeft > 0 ? effectiveInterestLeft : undefined;

  const fillMax = () => {
    if (kind === "principal" && principalLeft > 0) setAmount(String(principalLeft));
    else if (kind === "interest" && effectiveInterestLeft > 0) setAmount(String(effectiveInterestLeft));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const pay = num(amount);
    if (!(pay > 0)) return;
    onSubmit({ kind, amount: pay, date: String(date || todayStr()).slice(0, 10) });
  };

  return (
    <div ref={modalRef} className="modal-overlay" onClick={onDismiss}>
      <div
        className="modal modal--loan-pay"
        role="dialog"
        aria-modal="true"
        aria-label="Record loan payment"
        onClick={(ev) => ev.stopPropagation()}
      >
        <div className="modal-hdr">
          <span className="modal-title">Record payment</span>
          <button type="button" className="icon-btn-sm" onClick={onDismiss} aria-label="Close">
            <IcX />
          </button>
        </div>

        <div className="loan-pay-context">
          <div className="loan-pay-context-name">{(loan.borrowerName || "").trim() || "Borrower"}</div>
          <div className="loan-pay-context-row">
            <span>P+I outstanding</span>
            <strong>{moneyFull(economicOut)}</strong>
          </div>
          <div className="loan-pay-context-row">
            <span>Principal left</span>
            <span>{moneyFull(principalLeft)}</span>
          </div>
          <div className="loan-pay-context-row">
            <span>Interest in books</span>
            <span>{effectiveInterestLeft > 0 ? moneyFull(effectiveInterestLeft) : "—"}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <Field label="Payment type">
            <div className="loan-pay-kind-toggle" role="group" aria-label="Payment type">
              <button
                type="button"
                className={`loan-pay-kind-btn${kind === "interest" ? " is-active" : ""}`}
                onClick={() => setKind("interest")}
              >
                Interest
              </button>
              <button
                type="button"
                className={`loan-pay-kind-btn${kind === "principal" ? " is-active" : ""}`}
                onClick={() => setKind("principal")}
              >
                Principal
              </button>
            </div>
          </Field>
          <Field label="Amount (₹)">
            <div className="loan-pay-amt-row">
              <input
                type="number"
                min="0.01"
                step="0.01"
                max={maxAmt}
                autoFocus
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
              {((kind === "interest" && effectiveInterestLeft > 0) || (kind === "principal" && principalLeft > 0)) ? (
                <button type="button" className="loan-pay-fill-btn" onClick={fillMax} tabIndex={-1}>
                  Fill max
                </button>
              ) : null}
            </div>
          </Field>
          <Field label="Date">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </Field>
          <div className="modal-btns">
            <button type="button" className="ghost-btn" onClick={onDismiss}>
              Cancel
            </button>
            <button type="submit" className="primary-btn">
              Save payment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
