import { useMemo, useState } from "react";
import { Virtuoso } from "react-virtuoso";
import {
  dateSlash,
  entityTimeMsFromId,
  loanGivenDaysOnBook,
  loanGivenDueDaysRemaining,
  loanGivenEconomicOutstanding,
  loanGivenMonthlyRatePct,
  loanGivenPrincipalOutstandingCalc,
  money,
  sumLoansGivenEstimatedInterestToDate,
  sumLoansGivenEconomicOutstanding,
  sumLoansGivenInterestOutstandingOpen,
  sumLoansGivenPrincipalOutstandingOpen,
  todayStr,
} from "@/domain/index.js";
import { IcPlus } from "@/shared/ui/icons/AppIcons.jsx";
import { EmptyState, TabPageChrome } from "@/shared/ui/layout/AppChrome.jsx";
import { useMainStageScrollParent } from "@/features/main-stage/MainStageScrollContext.jsx";

const FILTER_OPEN = "open";
const FILTER_OVERDUE = "overdue";
const FILTER_SETTLED = "settled";

function LoansGivenSummaryBoard({
  asOf,
  filter,
  setFilter,
  counts,
  principalOpen,
  interestBooks,
  totalPlusI,
  interestEstToDate,
  showColHeaders,
  onOpenPartys,
  onOpenPartners,
}) {
  return (
    <section className="loan-given-summary-board" aria-labelledby="loans-given-summary-h">
      <header className="loan-given-summary-board-hdr loan-given-summary-board-hdr--row">
        <div>
          <h2 id="loans-given-summary-h" className="loan-given-summary-board-title">
            Portfolio
          </h2>
          <p className="loan-given-summary-board-asof">As of {dateSlash(asOf)}</p>
        </div>
        <div className="loan-given-summary-actions">
          <button type="button" className="loan-given-nav-chip" onClick={onOpenPartys}>
            Borrowers
          </button>
          <button type="button" className="loan-given-nav-chip" onClick={onOpenPartners}>
            Partners
          </button>
        </div>
      </header>
      <div className="kpi-grid-loans-given kpi-grid-loans-given--4col" role="group" aria-label="Loan portfolio totals">
        <div className="kpi-card kpi-card--static kpi-loan-total">
          <span className="kpi-lbl">Total P+I outstanding</span>
          <span className="kpi-val">{money(totalPlusI)}</span>
        </div>
        <div className="kpi-card kpi-card--static kpi-loan-prin">
          <span className="kpi-lbl">Principal outstanding</span>
          <span className="kpi-val">{money(principalOpen)}</span>
        </div>
        <div className="kpi-card kpi-card--static kpi-loan-int-books">
          <span className="kpi-lbl">Interest in books</span>
          <span className="kpi-val">{money(interestBooks)}</span>
        </div>
        <div className="kpi-card kpi-card--static kpi-loan-est">
          <span className="kpi-lbl">Est. interest accrued</span>
          <span className="kpi-val">{money(interestEstToDate)}</span>
        </div>
      </div>
      <div className="loan-given-seg-bar seg-bar" role="tablist" aria-label="Filter loans">
        <button
          type="button"
          role="tab"
          aria-selected={filter === FILTER_OPEN}
          className={`seg-btn${filter === FILTER_OPEN ? " active" : ""}`}
          onClick={() => setFilter(FILTER_OPEN)}
        >
          Active ({counts.open})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={filter === FILTER_OVERDUE}
          className={`seg-btn${filter === FILTER_OVERDUE ? " active" : ""}`}
          onClick={() => setFilter(FILTER_OVERDUE)}
        >
          Overdue ({counts.overdue})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={filter === FILTER_SETTLED}
          className={`seg-btn${filter === FILTER_SETTLED ? " active" : ""}`}
          onClick={() => setFilter(FILTER_SETTLED)}
        >
          Settled ({counts.settled})
        </button>
      </div>
      {showColHeaders ? (
        <div className="loan-given-list-cols-hd" aria-hidden="true">
          <span>Borrower</span>
          <span>Principal</span>
          <span>Outstanding</span>
        </div>
      ) : null}
    </section>
  );
}

export function LoansGivenListScreen({ loansGiven, onOpenSidebar, onAdd, onOpenLoan, onOpenPartners, onOpenPartys }) {
  const [filter, setFilter] = useState(FILTER_OPEN);
  const asOf = todayStr();
  const all = useMemo(() => (Array.isArray(loansGiven) ? loansGiven : []), [loansGiven]);

  const principalOpen = useMemo(() => sumLoansGivenPrincipalOutstandingOpen(all), [all]);
  const interestBooks = useMemo(() => sumLoansGivenInterestOutstandingOpen(all), [all]);
  const totalPlusI = useMemo(() => sumLoansGivenEconomicOutstanding(all), [all]);
  const interestEstToDate = useMemo(() => sumLoansGivenEstimatedInterestToDate(all, asOf), [all, asOf]);

  const counts = useMemo(() => {
    let open = 0;
    let settled = 0;
    let overdue = 0;
    for (const r of all) {
      if (r?.closed === true) {
        settled += 1;
        continue;
      }
      open += 1;
      const due = loanGivenDueDaysRemaining(r, asOf);
      if (r?.dueDate && due !== null && due < 0) overdue += 1;
    }
    return { open, settled, overdue };
  }, [all, asOf]);

  const sorted = useMemo(() => {
    const filtered = all.filter((r) => {
      const closed = r?.closed === true;
      if (filter === FILTER_SETTLED) return closed;
      if (closed) return false;
      if (filter === FILTER_OVERDUE) {
        const due = loanGivenDueDaysRemaining(r, asOf);
        return r?.dueDate && due !== null && due < 0;
      }
      return true;
    });
    return filtered.sort((a, b) => {
      const dc = String(b.dateGiven || "").localeCompare(String(a.dateGiven || ""));
      if (dc !== 0) return dc;
      return entityTimeMsFromId(b.id) - entityTimeMsFromId(a.id);
    });
  }, [all, filter, asOf]);

  const scrollParent = useMainStageScrollParent();

  const summaryProps = {
    asOf,
    filter,
    setFilter,
    counts,
    principalOpen,
    interestBooks,
    totalPlusI,
    interestEstToDate,
    onOpenPartys,
    onOpenPartners,
  };

  const emptyTitle =
    filter === FILTER_SETTLED
      ? "No settled loans"
      : filter === FILTER_OVERDUE
        ? "No overdue loans"
        : "No active loans";

  return (
    <TabPageChrome title="Loans given" onOpenSidebar={onOpenSidebar} className="tab-page--loans-given">
      <div className="tab-page-scroll">
        {all.length === 0 ? (
          <EmptyState title="No loans tracked" />
        ) : sorted.length === 0 ? (
          <>
            <LoansGivenSummaryBoard {...summaryProps} showColHeaders={false} />
            <EmptyState title={emptyTitle} />
          </>
        ) : !scrollParent ? (
          <div aria-hidden style={{ minHeight: 1 }} />
        ) : (
          <div className="list-area list-area--loans-given">
            <LoansGivenSummaryBoard {...summaryProps} showColHeaders />
            <Virtuoso
              customScrollParent={scrollParent}
              data={sorted}
              computeItemKey={(_, r) => r.id}
              overscan={400}
              itemContent={(_, r) => {
                const closed = r.closed === true;
                const rowOut = closed ? 0 : loanGivenEconomicOutstanding(r, asOf);
                const rate = loanGivenMonthlyRatePct(r);
                const dueRemain = closed ? null : loanGivenDueDaysRemaining(r, asOf);
                const overdue = !closed && r.dueDate && dueRemain !== null && dueRemain < 0;
                const prinLeft = closed ? 0 : loanGivenPrincipalOutstandingCalc(r);
                const days = closed ? 0 : loanGivenDaysOnBook(r, asOf);

                const metaBits = [];
                if (!closed) {
                  if (rate > 0) metaBits.push(`${rate}%/mo`);
                  if (days > 0) metaBits.push(`${days}d on book`);
                  if (prinLeft > 0 && rowOut > prinLeft) metaBits.push(`Int ${money(rowOut - prinLeft)}`);
                }
                const metaLine = metaBits.join(" · ");

                return (
                  <div className={`exp-row loan-given-list-row${overdue ? " loan-given-list-row--overdue" : ""}`}>
                    <button type="button" className="exp-row-main loan-given-list-row-main" onClick={() => onOpenLoan(r)}>
                      <span className="loan-given-list-borrower" title={r.borrowerName || ""}>
                        <span className="loan-given-list-topline">
                          <span className="loan-given-list-name-text">{(r.borrowerName || "").trim() || "—"}</span>
                          <span className="loan-given-list-pills">
                            {closed ? <span className="loan-given-closed-pill">Settled</span> : null}
                            {!closed && overdue ? <span className="loan-given-overdue-pill">Overdue</span> : null}
                          </span>
                        </span>
                        <span className="loan-given-list-date">Given {dateSlash(r.dateGiven) || "—"}</span>
                        <span className="loan-given-list-meta-slot">{metaLine}</span>
                      </span>
                      <span className="loan-given-list-loan">{money(r.principal)}</span>
                      <span className={`loan-given-list-out${closed ? " loan-given-list-out--settled" : ""}`}>
                        {closed ? "—" : money(rowOut)}
                      </span>
                    </button>
                  </div>
                );
              }}
            />
          </div>
        )}
      </div>
      <button type="button" className="fab" onClick={onAdd} aria-label="Add loan">
        <IcPlus />
      </button>
    </TabPageChrome>
  );
}
