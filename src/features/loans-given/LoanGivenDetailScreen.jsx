import { useRef, useState } from "react";
import {
  dateHuman,
  dateSlash,
  digitsOnly,
  loanGivenDaysOnBook,
  loanGivenEconomicOutstanding,
  loanGivenDueDaysRemaining,
  loanGivenEstimatedSimpleInterest,
  loanGivenInterestCollected,
  loanGivenInterestOutstandingReconciled,
  loanGivenMonthlyInterestOnOutstanding,
  loanGivenMonthlyRatePct,
  loanGivenPrincipalOutstandingCalc,
  loanGivenTrackOnBalanceSheet,
  money,
  moneyFull,
  num,
  loanGivenPartnerAccruedInterestOnPrincipal,
  loanGivenPartnerInterestBases,
  loanGivenPartnerMonthlyInterestOnPrincipal,
  loanGivenPartnerShareOfInterestPool,
  sumLoanGivenPartnersPrincipal,
  sumLoanRepaymentEntriesAmount,
  todayStr,
  waMessageHref,
} from "@/domain/index.js";
import { LoanGivenRecordPaymentModal } from "@/features/loans-given/LoanGivenRecordPaymentModal.jsx";
import { IcEdit, IcPayment, IcTimerReset, IcTrash, IcWhatsApp } from "@/shared/ui/icons/AppIcons.jsx";
import { OverlayScreen, PageHeader } from "@/shared/ui/layout/AppChrome.jsx";

function repaymentKindLabel(kind) {
  if (kind === "principal") return "Principal";
  if (kind === "interest") return "Interest";
  return "Payment";
}

/**
 * Loan summary with record payment (interest / principal) and timer reset.
 */
export function LoanGivenDetailScreen({
  loan,
  onClose,
  onEdit,
  onDelete,
  onRecordPayment,
  onDeletePayment,
  onResetTimer,
  requestConfirm,
}) {
  const payModalRef = useRef(null);
  const [payOpen, setPayOpen] = useState(false);

  if (!loan) return null;
  const today = todayStr();
  const closed = loan?.closed === true;
  const monthlyRate = loanGivenMonthlyRatePct(loan);
  const economicOut = loan && !closed ? loanGivenEconomicOutstanding(loan) : 0;
  const daysOnBook = loan && !closed ? loanGivenDaysOnBook(loan, today) : 0;
  const estInterest = loan && !closed ? loanGivenEstimatedSimpleInterest(loan, today) : 0;
  const principalOut = loan && !closed ? loanGivenPrincipalOutstandingCalc(loan) : 0;
  const storedInterest = loan && !closed ? loanGivenInterestOutstandingReconciled(loan, today) : 0;
  const monthlyOnOut = loan && !closed ? loanGivenMonthlyInterestOnOutstanding(loan) : 0;
  const dueRemain = loan && !closed ? loanGivenDueDaysRemaining(loan, today) : null;
  const repaySumTotal = loan ? sumLoanRepaymentEntriesAmount(loan) : 0;
  const onBs = loan ? loanGivenTrackOnBalanceSheet(loan) : true;
  const interestCollected = loan ? loanGivenInterestCollected(loan) : 0;
  const totalCollected = (Number(loan?.principalRepaid) || 0) + interestCollected;

  let dueLabel = "—";
  if (!closed && loan?.dueDate) {
    if (dueRemain === null) dueLabel = "—";
    else if (dueRemain < 0) dueLabel = `${Math.abs(dueRemain)} day${Math.abs(dueRemain) === 1 ? "" : "s"} overdue`;
    else if (dueRemain === 0) dueLabel = "Due today";
    else dueLabel = `In ${dueRemain} day${dueRemain === 1 ? "" : "s"}`;
  }

  let waLink = "";
  if (loan && !closed) {
    const phone = digitsOnly(String(loan.phone || ""));
    if (phone.length >= 10) {
      const lines = [
        `Hi ${(loan.borrowerName || "").trim() || "there"},`,
        "",
        `Friendly update on our informal loan.`,
        `Outstanding (principal + interest in books): ${moneyFull(economicOut)}`,
        loan.dueDate ? `Due date: ${dateSlash(loan.dueDate)}` : "",
        `As of ${dateSlash(today)} — days on book: ${daysOnBook}.`,
        monthlyRate > 0 ? `Est. interest (${monthlyRate}%/mo, to today): ${moneyFull(estInterest)}` : "",
        "",
        "Please share your repayment plan. Thank you.",
      ].filter(Boolean);
      waLink = waMessageHref(phone, lines.join("\n"));
    }
  }

  const repayRows = [...(Array.isArray(loan?.repaymentEntries) ? loan.repaymentEntries : [])]
    .filter((r) => r && typeof r === "object" && num(r.amount) > 0)
    .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
  const partnerRows = Array.isArray(loan?.partners) ? loan.partners : [];
  const partnersPrincipalSum = sumLoanGivenPartnersPrincipal(partnerRows);
  const partnerInterestBases = loan ? loanGivenPartnerInterestBases(loan, today) : { collected: 0, books: 0, estimate: 0 };

  const handlePaySubmit = ({ kind, amount, date }) => {
    onRecordPayment?.(loan.id, { kind, amount, date });
    setPayOpen(false);
  };

  const handleResetTimer = () => {
    const todayLabel = dateSlash(today);
    requestConfirm?.({
      title: "Reset loan timer?",
      message: `Days on book will restart from today (${todayLabel}). Estimated interest will be calculated from this new start date. Principal and payments already logged stay unchanged.`,
      confirmLabel: "Reset timer",
      onConfirm: () => onResetTimer?.(loan.id),
    });
  };

  const handleDeletePayment = (repaymentRow) => {
    if (!repaymentRow?.id) return;
    requestConfirm?.({
      title: "Delete this payment?",
      message: "This will remove the payment from the log and reverse its effect on principal/interest (for typed payments).",
      confirmLabel: "Delete payment",
      onConfirm: () => onDeletePayment?.(loan.id, repaymentRow.id),
    });
  };

  return (
    <OverlayScreen className={!closed ? "overlay-screen--form-footer" : ""}>
      <PageHeader
        title="Loan details"
        onBack={onClose}
        right={
          <div className="detail-hdr-actions detail-hdr-actions--loan-given">
            {waLink ? (
              <a className="icon-btn icon-btn-sm" href={waLink} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp borrower" title="WhatsApp">
                <IcWhatsApp />
              </a>
            ) : (
              <button type="button" className="icon-btn icon-btn-sm" disabled aria-label="Add phone on edit to WhatsApp" title="Add phone in edit">
                <IcWhatsApp />
              </button>
            )}
            {!closed ? (
              <>
                <button
                  type="button"
                  className="icon-btn icon-btn-sm"
                  onClick={() => setPayOpen(true)}
                  aria-label="Record payment"
                  title="Record payment"
                >
                  <IcPayment />
                </button>
                <button
                  type="button"
                  className="icon-btn icon-btn-sm"
                  onClick={handleResetTimer}
                  aria-label="Reset timer (day 0)"
                  title="Reset timer (day 0)"
                >
                  <IcTimerReset />
                </button>
              </>
            ) : null}
            <button type="button" className="icon-btn icon-btn-sm" onClick={onEdit} aria-label="Edit loan" title="Edit loan">
              <IcEdit />
            </button>
            <button type="button" className="icon-btn icon-btn-sm detail-hdr-del-ic" onClick={onDelete} aria-label="Delete loan" title="Delete loan">
              <IcTrash />
            </button>
          </div>
        }
      />
      <div className="overlay-scroll detail-scroll">
        <section className="detail-hero detail-hero-v2 loan-given-detail-hero">
          <div className="dh-topline">
            <span className="dh-inv">{closed ? "Settled" : "Active loan"}</span>
          </div>
          <h2 className="dh-name loan-given-detail-name">{(loan.borrowerName || "").trim() || "Borrower"}</h2>
          {!closed ? (
            <>
              <p className="loan-given-detail-hero-out">
                P+I outstanding <strong>{moneyFull(economicOut)}</strong>
              </p>
              {(principalOut > 0 || storedInterest > 0) ? (
                <p className="loan-given-detail-hero-sub">
                  Principal {moneyFull(principalOut)}
                  {storedInterest > 0 ? ` · Interest in books ${moneyFull(storedInterest)}` : ""}
                </p>
              ) : null}
            </>
          ) : (
            <>
              <p className="loan-given-detail-hero-out loan-given-detail-hero-out--muted">Settled</p>
              {totalCollected > 0 ? (
                <p className="loan-given-detail-hero-sub">
                  Collected {moneyFull(totalCollected)} total
                  {interestCollected > 0 ? ` · ₹${money(interestCollected)} interest` : ""}
                </p>
              ) : null}
            </>
          )}
        </section>

        <section className="detail-card detail-card-v2">
          <div className="dc-title">As of {dateSlash(today)}</div>
          <div className="detail-kpi-grid loan-given-kpi-grid">
            <div className="detail-kpi">
              <span className="detail-kpi-lbl">Days on book</span>
              <strong className="detail-kpi-val">{closed ? "—" : String(daysOnBook)}</strong>
            </div>
            <div className="detail-kpi">
              <span className="detail-kpi-lbl">Due status</span>
              <strong className={`detail-kpi-val${dueRemain !== null && dueRemain < 0 ? " is-due" : ""}`}>{dueLabel}</strong>
            </div>
            <div className="detail-kpi">
              <span className="detail-kpi-lbl">Interest (simple, est.)</span>
              <strong className="detail-kpi-val">{closed || monthlyRate <= 0 ? "—" : moneyFull(estInterest)}</strong>
            </div>
            <div className="detail-kpi">
              <span className="detail-kpi-lbl">Interest in books</span>
              <strong className="detail-kpi-val">{closed ? "—" : moneyFull(storedInterest)}</strong>
            </div>
            <div className="detail-kpi">
              <span className="detail-kpi-lbl">Est. / month</span>
              <strong className="detail-kpi-val">{closed || monthlyRate <= 0 ? "—" : moneyFull(monthlyOnOut)}</strong>
            </div>
          </div>
        </section>

        <section className="detail-card detail-card-v2">
          <div className="dc-title">Amounts</div>
          <dl className="dc-dl">
            <div>
              <dt>Principal</dt>
              <dd>{moneyFull(loan.principal)}</dd>
            </div>
            <div>
              <dt>Principal repaid</dt>
              <dd>{moneyFull(loan.principalRepaid)}</dd>
            </div>
            <div>
              <dt>Principal outstanding</dt>
              <dd>{closed ? "—" : moneyFull(principalOut)}</dd>
            </div>
            <div>
              <dt>Rate</dt>
              <dd>{monthlyRate > 0 ? `${monthlyRate}% per month` : "—"}</dd>
            </div>
            <div>
              <dt>Balance sheet</dt>
              <dd>{closed ? "Settled" : onBs ? "Included" : "Excluded"}</dd>
            </div>
            <div>
              <dt>{closed ? "P+I collected" : "P+I outstanding"}</dt>
              <dd>{closed ? moneyFull(totalCollected) : moneyFull(economicOut)}</dd>
            </div>
            {closed && interestCollected > 0 ? (
              <div>
                <dt>Interest collected</dt>
                <dd>{moneyFull(interestCollected)}</dd>
              </div>
            ) : null}
          </dl>
        </section>

        <section className="detail-card detail-card-v2">
          <div className="dc-title">Dates</div>
          <dl className="dc-dl">
            <div>
              <dt>Date given</dt>
              <dd>{dateHuman(loan.dateGiven)}</dd>
            </div>
            <div>
              <dt>Due date</dt>
              <dd>{loan.dueDate ? dateHuman(loan.dueDate) : "—"}</dd>
            </div>
            <div>
              <dt>Phone</dt>
              <dd>{(loan.phone || "").trim() || "—"}</dd>
            </div>
          </dl>
        </section>

        {partnerRows.length > 0 && (
          <section className="detail-card detail-card-v2 loan-given-partners-section">
            <div className="dc-title dc-title--row">
              <span>Partners ({partnerRows.length})</span>
              {partnersPrincipalSum > 0 ? (
                <span className="loan-given-partner-total-inline">{money(partnersPrincipalSum)} in</span>
              ) : null}
            </div>
            <ul className="loan-given-partner-cards" role="list">
              {partnerRows.map((p) => {
                const given = num(p.amountGiven ?? p.amount);
                const intPct = num(p.interestSharePct);
                const perMonth = intPct > 0 ? loanGivenPartnerMonthlyInterestOnPrincipal(p, loan) : 0;
                const accrued = intPct > 0 ? loanGivenPartnerAccruedInterestOnPrincipal(p, loan, today) : 0;
                const splitCollected =
                  intPct > 0 ? loanGivenPartnerShareOfInterestPool(p, partnerRows, loan, partnerInterestBases.collected) : 0;
                const splitBooks =
                  intPct > 0 ? loanGivenPartnerShareOfInterestPool(p, partnerRows, loan, partnerInterestBases.books) : 0;
                return (
                  <li key={p.id} className="loan-given-partner-card">
                    <div className="loan-given-partner-card-hd">
                      <strong className="loan-given-partner-name">{(p.name || "").trim() || "Partner"}</strong>
                      <span className="loan-given-partner-card-meta">
                        {given > 0 ? money(given) : "—"}
                        {intPct > 0 ? ` · ${intPct}%/mo` : ""}
                      </span>
                    </div>
                    {intPct > 0 ? (
                      <dl className="loan-given-partner-stat-grid">
                        <div>
                          <dt>Per month</dt>
                          <dd>{money(perMonth)}</dd>
                        </div>
                        <div>
                          <dt>Accrued</dt>
                          <dd>{money(accrued)}</dd>
                        </div>
                        <div>
                          <dt>Collected</dt>
                          <dd>{money(splitCollected)}</dd>
                        </div>
                        <div>
                          <dt>In books</dt>
                          <dd>{money(splitBooks)}</dd>
                        </div>
                      </dl>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {repayRows.length > 0 && (
          <section className="detail-card detail-card-v2">
            <div className="dc-title">Payments logged ({money(repaySumTotal)} total)</div>
            <ul className="loan-given-repay-list" role="list">
              {repayRows.map((r) => (
                <li key={r.id} className="loan-given-repay-li">
                  <span className="loan-given-repay-date">{dateSlash(r.date)}</span>
                  <span className={`loan-given-repay-kind loan-given-repay-kind--${r.paymentKind || "other"}`}>
                    {repaymentKindLabel(r.paymentKind)}
                  </span>
                  <span className="loan-given-repay-amt">{moneyFull(r.amount)}</span>
                  <button
                    type="button"
                    className="icon-btn icon-btn-xs loan-given-repay-del"
                    onClick={() => handleDeletePayment(r)}
                    aria-label="Delete payment"
                    title="Delete payment"
                  >
                    <IcTrash />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {(loan.description || "").trim() ? (
          <section className="detail-card detail-card-v2">
            <div className="dc-title">Notes</div>
            <p className="loan-given-detail-notes">{(loan.description || "").trim()}</p>
          </section>
        ) : null}
      </div>

      {!closed ? (
        <div className="overlay-form-footer">
          <button type="button" className="primary-btn submit-btn" onClick={() => setPayOpen(true)}>
            Record payment
          </button>
        </div>
      ) : null}

      {payOpen && (
        <LoanGivenRecordPaymentModal
          modalRef={payModalRef}
          loan={loan}
          onSubmit={handlePaySubmit}
          onDismiss={() => setPayOpen(false)}
        />
      )}
    </OverlayScreen>
  );
}
