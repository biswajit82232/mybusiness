import { useMemo, useState } from "react";
import { buildLoanPartysDirectory, dateSlash, money, todayStr } from "@/domain/index.js";
import { EmptyState, OverlayScreen, PageHeader } from "@/shared/ui/layout/AppChrome.jsx";
import { formatLoanCount } from "./loanGivenDirectoryUtils.js";
import {
  LoanGivenDirectoryKpi,
  LoanGivenDirectoryList,
  LoanGivenDirectoryRow,
  LoanGivenDirectorySummary,
} from "./LoanGivenDirectoryList.jsx";

const FILTER_ALL = "all";
const FILTER_OPEN = "open";
const FILTER_SETTLED = "settled";

export function LoanGivenPartysScreen({ loansGiven = [], onClose, onOpenParty }) {
  const [filter, setFilter] = useState(FILTER_OPEN);
  const asOf = todayStr();
  const partys = useMemo(() => buildLoanPartysDirectory(loansGiven, asOf), [loansGiven, asOf]);

  const counts = useMemo(() => {
    let open = 0;
    let settled = 0;
    for (const p of partys) {
      if ((p.openCount || 0) > 0) open += 1;
      else settled += 1;
    }
    return { all: partys.length, open, settled };
  }, [partys]);

  const filtered = useMemo(() => {
    if (filter === FILTER_SETTLED) return partys.filter((p) => (p.openCount || 0) === 0);
    if (filter === FILTER_OPEN) return partys.filter((p) => (p.openCount || 0) > 0);
    return partys;
  }, [partys, filter]);

  const totals = useMemo(() => {
    let lent = 0;
    let outstanding = 0;
    let open = 0;
    for (const p of filtered) {
      lent += p.totalPrincipal;
      outstanding += p.totalOutstanding;
      open += p.openCount;
    }
    return { lent, outstanding, open };
  }, [filtered]);

  const emptyTitle =
    filter === FILTER_SETTLED
      ? "No settled borrowers"
      : filter === FILTER_OPEN
        ? "No borrowers with open loans"
        : "No borrowers yet";

  return (
    <OverlayScreen>
      <PageHeader title="Borrowers" onBack={onClose} />
      <div className="overlay-scroll detail-scroll">
        {partys.length === 0 ? (
          <p className="loan-given-partners-empty">No borrowers yet.</p>
        ) : (
          <>
            <LoanGivenDirectorySummary
              title="Borrowers"
              asOfLabel={`As of ${dateSlash(asOf)}`}
              kpis={
                <>
                  <LoanGivenDirectoryKpi label="Total lent" value={money(totals.lent)} />
                  <LoanGivenDirectoryKpi label="P+I outstanding" value={money(totals.outstanding)} className="kpi-loan-total" />
                  <LoanGivenDirectoryKpi label="Open loans" value={String(totals.open)} />
                </>
              }
              filters={
                <>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={filter === FILTER_OPEN}
                    className={`seg-btn${filter === FILTER_OPEN ? " active" : ""}`}
                    onClick={() => setFilter(FILTER_OPEN)}
                  >
                    Open ({counts.open})
                  </button>
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
                    aria-selected={filter === FILTER_SETTLED}
                    className={`seg-btn${filter === FILTER_SETTLED ? " active" : ""}`}
                    onClick={() => setFilter(FILTER_SETTLED)}
                  >
                    Settled ({counts.settled})
                  </button>
                </>
              }
              colHeaders={["Borrower", "Lent", "Outstanding"]}
            />
            {filtered.length === 0 ? (
              <EmptyState title={emptyTitle} />
            ) : (
              <LoanGivenDirectoryList
                rows={filtered.map((p) => {
                  const settled = (p.openCount || 0) === 0;
                  const metaBits = [];
                  if ((p.phone || "").trim()) metaBits.push((p.phone || "").trim());
                  if (p.totalInterestCollected > 0) metaBits.push(`Int collected ${money(p.totalInterestCollected)}`);
                  return (
                    <LoanGivenDirectoryRow
                      key={p.key}
                      name={p.name}
                      subtitle={formatLoanCount(p.loans.length)}
                      meta={metaBits.join(" · ")}
                      settled={settled}
                      col2={money(p.totalPrincipal)}
                      col3={settled ? "—" : money(p.totalOutstanding)}
                      onClick={() => onOpenParty?.(p.key)}
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
