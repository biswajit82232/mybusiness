import { dateHuman, dateSlash, money, moneyFull, todayStr, waHref } from "@/domain/index.js";
import { OverlayScreen, PageHeader } from "@/shared/ui/layout/AppChrome.jsx";

/**
 * Full borrower (party) profile: totals and per-loan breakdown (aligned with partner detail).
 */
export function LoanGivenPartyDetailScreen({ party, asOf, onClose, onOpenLoan }) {
  if (!party) return null;
  const asOfLabel = dateSlash(asOf || todayStr());
  const wa = party.phone ? waHref(party.phone) : null;

  return (
    <OverlayScreen>
      <PageHeader title={party.name || "Party"} onBack={onClose} />
      <div className="overlay-scroll detail-scroll">
        <section className="detail-hero detail-hero-v2 loan-given-partner-detail-hero">
          <div className="dh-topline">
            <span className="dh-inv">Borrower</span>
            <span className="loan-given-partner-detail-asof">As of {asOfLabel}</span>
          </div>
          <h2 className="dh-name">{party.name}</h2>
          <p className="loan-given-partner-detail-hero-sub">
            {party.loans.length} loan{party.loans.length === 1 ? "" : "s"} · {money(party.totalPrincipal)} lent
            {party.totalOutstanding > 0 ? ` · ${money(party.totalOutstanding)} outstanding` : null}
            {party.phone ? (
              <>
                {" "}
                ·{" "}
                {wa ? (
                  <a className="loan-given-party-phone-link" href={wa} target="_blank" rel="noopener noreferrer">
                    {party.phone}
                  </a>
                ) : (
                  party.phone
                )}
              </>
            ) : null}
          </p>
        </section>

        <section className="detail-card detail-card-v2">
          <div className="dc-title">Summary</div>
          <div className="detail-kpi-grid loan-given-kpi-grid">
            <div className="detail-kpi">
              <span className="detail-kpi-lbl">Total P+I outstanding</span>
              <strong className="detail-kpi-val kpi-val--primary">{moneyFull(party.totalOutstanding)}</strong>
            </div>
            <div className="detail-kpi">
              <span className="detail-kpi-lbl">Total lent (principal)</span>
              <strong className="detail-kpi-val">{moneyFull(party.totalPrincipal)}</strong>
            </div>
            <div className="detail-kpi">
              <span className="detail-kpi-lbl">Interest in books (open)</span>
              <strong className="detail-kpi-val">{moneyFull(party.totalInterestBooks)}</strong>
            </div>
            <div className="detail-kpi">
              <span className="detail-kpi-lbl">Interest collected</span>
              <strong className="detail-kpi-val">{moneyFull(party.totalInterestCollected)}</strong>
            </div>
          </div>
        </section>

        <section className="detail-card detail-card-v2">
          <div className="dc-title">Loans ({party.loans.length})</div>
          {party.loans.length === 0 ? (
            <p className="loan-given-partners-empty">No linked loans.</p>
          ) : (
            <ul className="loan-given-partner-loan-detail-list" role="list">
              {party.loans.map((link) => (
                <li key={link.loanId}>
                  <button type="button" className="loan-given-partner-loan-detail-row" onClick={() => onOpenLoan?.(link.loanId)}>
                    <div className="loan-given-partner-loan-detail-main">
                      <strong className="loan-given-partner-loan-detail-name">
                        Loan {money(link.principal)}
                        {link.closed ? <span className="loan-given-closed-pill"> Settled</span> : null}
                      </strong>
                      <span className="loan-given-partner-loan-detail-sub">
                        Given {dateHuman(link.dateGiven)} · {money(link.principal)}
                        {link.interestRateMonthlyPct > 0 ? ` · ${link.interestRateMonthlyPct}%/mo` : null}
                      </span>
                      {link.description ? (
                        <span className="loan-given-party-loan-notes">{link.description}</span>
                      ) : null}
                    </div>
                    <div className="loan-given-partner-loan-detail-stats">
                      <div className="loan-given-partner-loan-stat">
                        <span className="loan-given-partner-loan-stat-lbl">Outstanding</span>
                        <span className="loan-given-partner-loan-stat-val">{moneyFull(link.outstanding)}</span>
                      </div>
                      {link.interestRateMonthlyPct > 0 ? (
                        <>
                          <div className="loan-given-partner-loan-stat">
                            <span className="loan-given-partner-loan-stat-lbl">Rate</span>
                            <span className="loan-given-partner-loan-stat-val">{link.interestRateMonthlyPct}%/mo</span>
                          </div>
                          <div className="loan-given-partner-loan-stat">
                            <span className="loan-given-partner-loan-stat-lbl">/mo (est.)</span>
                            <span className="loan-given-partner-loan-stat-val">{money(link.monthlyInterest)}</span>
                          </div>
                          <div className="loan-given-partner-loan-stat">
                            <span className="loan-given-partner-loan-stat-lbl">Accrued (est.)</span>
                            <span className="loan-given-partner-loan-stat-val">{money(link.estInterest)}</span>
                          </div>
                        </>
                      ) : null}
                      <div className="loan-given-partner-loan-stat">
                        <span className="loan-given-partner-loan-stat-lbl">Interest collected</span>
                        <span className="loan-given-partner-loan-stat-val">{money(link.interestCollected)}</span>
                      </div>
                      {!link.closed ? (
                        <>
                          <div className="loan-given-partner-loan-stat">
                            <span className="loan-given-partner-loan-stat-lbl">Principal left</span>
                            <span className="loan-given-partner-loan-stat-val">{moneyFull(link.principalOutstanding)}</span>
                          </div>
                          <div className="loan-given-partner-loan-stat">
                            <span className="loan-given-partner-loan-stat-lbl">Interest (books)</span>
                            <span className="loan-given-partner-loan-stat-val">{moneyFull(link.interestBooks)}</span>
                          </div>
                        </>
                      ) : link.principalRepaid > 0 ? (
                        <div className="loan-given-partner-loan-stat">
                          <span className="loan-given-partner-loan-stat-lbl">Principal repaid</span>
                          <span className="loan-given-partner-loan-stat-val">{moneyFull(link.principalRepaid)}</span>
                        </div>
                      ) : null}
                      <div className="loan-given-partner-loan-stat loan-given-partner-loan-stat--total">
                        <span className="loan-given-partner-loan-stat-lbl">
                          {link.closed ? "P+I collected" : "P+I outstanding"}
                        </span>
                        <span className="loan-given-partner-loan-stat-val loan-given-partner-loan-stat-val--total">
                          {link.closed
                            ? moneyFull((Number(link.principalRepaid) || 0) + (Number(link.interestCollected) || 0))
                            : moneyFull(link.outstanding)}
                        </span>
                      </div>
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
