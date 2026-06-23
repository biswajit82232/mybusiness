import { dateHuman, dateSlash, money, moneyFull, todayStr } from "@/domain/index.js";
import { OverlayScreen, PageHeader } from "@/shared/ui/layout/AppChrome.jsx";

/**
 * Full partner profile: totals and per-loan breakdown (matches loan detail theme).
 */
export function LoanGivenPartnerDetailScreen({ partner, asOf, onClose, onOpenLoan }) {
  if (!partner) return null;
  const asOfLabel = dateSlash(asOf || todayStr());
  const principalTotal = Number(partner.totalAmountGiven) || 0;
  const interestAccrued = Number(partner.totalAccruedInterest) || 0;
  const principalPlusInterest = principalTotal + interestAccrued;

  return (
    <OverlayScreen>
      <PageHeader title={partner.name || "Partner"} onBack={onClose} />
      <div className="overlay-scroll detail-scroll">
        <section className="detail-hero detail-hero-v2 loan-given-partner-detail-hero">
          <div className="dh-topline">
            <span className="dh-inv">Partner</span>
            <span className="loan-given-partner-detail-asof">As of {asOfLabel}</span>
          </div>
          <h2 className="dh-name">{partner.name}</h2>
          <p className="loan-given-detail-hero-out">
            Principal + interest accrued <strong>{moneyFull(principalPlusInterest)}</strong>
          </p>
          <p className="loan-given-partner-detail-hero-sub">
            {partner.loans.length} loan{partner.loans.length === 1 ? "" : "s"} · Principal {money(principalTotal)}
            {interestAccrued > 0 ? ` · Interest accrued ${money(interestAccrued)}` : null}
          </p>
        </section>

        <section className="detail-card detail-card-v2">
          <div className="dc-title">Summary</div>
          <div className="detail-kpi-grid loan-given-kpi-grid">
            <div className="detail-kpi">
              <span className="detail-kpi-lbl">Total amount given</span>
              <strong className="detail-kpi-val">{moneyFull(partner.totalAmountGiven)}</strong>
            </div>
            <div className="detail-kpi">
              <span className="detail-kpi-lbl">Accrued interest (est.)</span>
              <strong className="detail-kpi-val">{moneyFull(partner.totalAccruedInterest)}</strong>
            </div>
            <div className="detail-kpi">
              <span className="detail-kpi-lbl">Share of interest collected</span>
              <strong className="detail-kpi-val">{moneyFull(partner.totalCollectedShare)}</strong>
            </div>
            <div className="detail-kpi">
              <span className="detail-kpi-lbl">Share of interest in books</span>
              <strong className="detail-kpi-val">{moneyFull(partner.totalBooksShare)}</strong>
            </div>
          </div>
        </section>

        <section className="detail-card detail-card-v2">
          <div className="dc-title">Loans ({partner.loans.length})</div>
          {partner.loans.length === 0 ? (
            <p className="loan-given-partners-empty">No linked loans.</p>
          ) : (
            <ul className="loan-given-partner-loan-detail-list" role="list">
              {partner.loans.map((link) => (
                <li key={link.loanId}>
                  <button type="button" className="loan-given-partner-loan-detail-row" onClick={() => onOpenLoan?.(link.loanId)}>
                    <div className="loan-given-partner-loan-detail-main">
                      <strong className="loan-given-partner-loan-detail-name">
                        {link.borrowerName || "Borrower"}
                        {link.closed ? <span className="loan-given-closed-pill"> Settled</span> : null}
                      </strong>
                      <span className="loan-given-partner-loan-detail-sub">
                        Given {dateHuman(link.dateGiven)} · Loan {money(link.loanPrincipal)}
                      </span>
                    </div>
                    <div className="loan-given-partner-loan-detail-stats">
                      <div className="loan-given-partner-loan-stat">
                        <span className="loan-given-partner-loan-stat-lbl">Amount given</span>
                        <span className="loan-given-partner-loan-stat-val">{moneyFull(link.amountGiven)}</span>
                      </div>
                      {link.interestSharePct > 0 ? (
                        <>
                          <div className="loan-given-partner-loan-stat">
                            <span className="loan-given-partner-loan-stat-lbl">Rate</span>
                            <span className="loan-given-partner-loan-stat-val">{link.interestSharePct}%/mo</span>
                          </div>
                          <div className="loan-given-partner-loan-stat">
                            <span className="loan-given-partner-loan-stat-lbl">/mo (est.)</span>
                            <span className="loan-given-partner-loan-stat-val">{money(link.monthlyInterest)}</span>
                          </div>
                          <div className="loan-given-partner-loan-stat">
                            <span className="loan-given-partner-loan-stat-lbl">Accrued (est.)</span>
                            <span className="loan-given-partner-loan-stat-val">{money(link.accruedInterest)}</span>
                          </div>
                          <div className="loan-given-partner-loan-stat">
                            <span className="loan-given-partner-loan-stat-lbl">Collected share</span>
                            <span className="loan-given-partner-loan-stat-val">{money(link.collectedShare)}</span>
                          </div>
                          <div className="loan-given-partner-loan-stat">
                            <span className="loan-given-partner-loan-stat-lbl">Books share</span>
                            <span className="loan-given-partner-loan-stat-val">{money(link.booksShare)}</span>
                          </div>
                        </>
                      ) : null}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </OverlayScreen>
  );
}
