import { useMemo, useState } from "react";
import { buildLoanPartnersDirectory, dateSlash, money, todayStr } from "@/domain/index.js";
import { EmptyState, OverlayScreen, PageHeader } from "@/shared/ui/layout/AppChrome.jsx";
import { formatLoanCount } from "./loanGivenDirectoryUtils.js";
import {
  LoanGivenDirectoryKpi,
  LoanGivenDirectoryList,
  LoanGivenDirectoryRow,
  LoanGivenDirectorySummary,
} from "./LoanGivenDirectoryList.jsx";

const FILTER_ALL = "all";
const FILTER_ACTIVE = "active";

export function LoanGivenPartnersScreen({ loansGiven = [], onClose, onOpenPartner }) {
  const [filter, setFilter] = useState(FILTER_ALL);
  const asOf = todayStr();
  const partners = useMemo(() => buildLoanPartnersDirectory(loansGiven, asOf), [loansGiven, asOf]);

  const counts = useMemo(() => {
    let active = 0;
    for (const p of partners) {
      const hasOpen = (p.loans || []).some((l) => !l.closed);
      if (hasOpen) active += 1;
    }
    return { all: partners.length, active };
  }, [partners]);

  const filtered = useMemo(() => {
    if (filter !== FILTER_ACTIVE) return partners;
    return partners.filter((p) => (p.loans || []).some((l) => !l.closed));
  }, [partners, filter]);

  const portfolioTotals = useMemo(() => {
    let given = 0;
    let accrued = 0;
    let collected = 0;
    for (const p of filtered) {
      given += p.totalAmountGiven;
      accrued += p.totalAccruedInterest;
      collected += p.totalCollectedShare;
    }
    return { given, accrued, collected };
  }, [filtered]);

  const emptyTitle = filter === FILTER_ACTIVE ? "No partners on open loans" : "No partners yet";

  return (
    <OverlayScreen>
      <PageHeader title="Partners" onBack={onClose} />
      <div className="overlay-scroll detail-scroll">
        {partners.length === 0 ? (
          <p className="loan-given-partners-empty">No partners yet.</p>
        ) : (
          <>
            <LoanGivenDirectorySummary
              title="Partners"
              asOfLabel={`As of ${dateSlash(asOf)}`}
              kpis={
                <>
                  <LoanGivenDirectoryKpi label="Total invested" value={money(portfolioTotals.given)} />
                  <LoanGivenDirectoryKpi label="Est. accrued" value={money(portfolioTotals.accrued)} className="kpi-loan-est" />
                  <LoanGivenDirectoryKpi label="Interest collected" value={money(portfolioTotals.collected)} />
                </>
              }
              filters={
                <>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={filter === FILTER_ALL}
                    className={`seg-btn${filter === FILTER_ALL ? " active" : ""}`}
                    onClick={() => setFilter(FILTER_ALL)}
                  >
                    All ({counts.all})
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={filter === FILTER_ACTIVE}
                    className={`seg-btn${filter === FILTER_ACTIVE ? " active" : ""}`}
                    onClick={() => setFilter(FILTER_ACTIVE)}
                  >
                    On open loans ({counts.active})
                  </button>
                </>
              }
              colHeaders={["Partner", "Invested", "Accrued"]}
            />
            {filtered.length === 0 ? (
              <EmptyState title={emptyTitle} />
            ) : (
              <LoanGivenDirectoryList
                rows={filtered.map((p) => {
                  const openLoans = (p.loans || []).filter((l) => !l.closed).length;
                  const metaBits = [];
                  if (p.totalCollectedShare > 0) metaBits.push(`Collected ${money(p.totalCollectedShare)}`);
                  if (p.totalBooksShare > 0) metaBits.push(`In books ${money(p.totalBooksShare)}`);
                  return (
                    <LoanGivenDirectoryRow
                      key={p.key}
                      name={p.name}
                      subtitle={formatLoanCount(p.loans.length)}
                      meta={metaBits.join(" · ")}
                      settled={openLoans === 0 && (p.loans || []).length > 0}
                      col2={money(p.totalAmountGiven)}
                      col3={money(p.totalAccruedInterest)}
                      onClick={() => onOpenPartner?.(p.key)}
                    />
                  );
                })}
              />
            )}
          </>
        )}
      </div>
    </OverlayScreen>
  );
}
