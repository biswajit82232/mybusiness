import { EmptyState } from "@/shared/ui/layout/AppChrome.jsx";

/**
 * Uniform 3-column directory rows (borrowers / partners) — matches Loans given list layout.
 */
export function LoanGivenDirectorySummary({ title, asOfLabel, kpis, filters, colHeaders }) {
  return (
    <section className="loan-given-summary-board loan-given-directory-board" aria-labelledby="loan-given-directory-summary-h">
      <header className="loan-given-summary-board-hdr">
        <div>
          <h2 id="loan-given-directory-summary-h" className="loan-given-summary-board-title">
            {title}
          </h2>
          {asOfLabel ? <p className="loan-given-summary-board-asof">{asOfLabel}</p> : null}
        </div>
      </header>
      {kpis ? <div className="kpi-grid-loans-given kpi-grid-loans-given--directory">{kpis}</div> : null}
      {filters ? <div className="loan-given-seg-bar seg-bar">{filters}</div> : null}
      {colHeaders ? (
        <div className="loan-given-list-cols-hd loan-given-directory-cols-hd" aria-hidden="true">
          {colHeaders.map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>
      ) : null}
    </section>
  );
}

export function LoanGivenDirectoryRow({
  name,
  subtitle,
  meta = "",
  settled = false,
  col2,
  col3,
  onClick,
}) {
  const col3Class = settled ? " loan-given-list-out--settled" : "";
  return (
    <div className="exp-row loan-given-list-row loan-given-directory-row">
      <button type="button" className="exp-row-main loan-given-list-row-main" onClick={onClick}>
        <span className="loan-given-list-borrower" title={name || ""}>
          <span className="loan-given-list-topline">
            <span className="loan-given-list-name-text">{(name || "").trim() || "—"}</span>
            <span className="loan-given-list-pills">
              {settled ? <span className="loan-given-closed-pill">Settled</span> : null}
            </span>
          </span>
          {subtitle ? <span className="loan-given-list-date">{subtitle}</span> : <span className="loan-given-list-date" aria-hidden="true" />}
          <span className="loan-given-list-meta-slot">{meta}</span>
        </span>
        <span className="loan-given-list-loan">{col2}</span>
        <span className={`loan-given-list-out${col3Class}`}>{col3}</span>
      </button>
    </div>
  );
}

export function LoanGivenDirectoryList({ rows, emptyTitle }) {
  if (!rows?.length) {
    return emptyTitle ? <EmptyState title={emptyTitle} /> : null;
  }
  return (
    <div className="list-area list-area--loans-given list-area--loan-directory">
      {rows}
    </div>
  );
}

/** KPI tile helper */
export function LoanGivenDirectoryKpi({ label, value, className = "" }) {
  return (
    <div className={`kpi-card kpi-card--static${className ? ` ${className}` : ""}`}>
      <span className="kpi-lbl">{label}</span>
      <span className="kpi-val">{value}</span>
    </div>
  );
}
