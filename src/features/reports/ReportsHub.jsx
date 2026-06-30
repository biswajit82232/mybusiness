import { reportPeriodLabel } from "@/domain/reportPeriod.js";
import { IcChevR } from "@/shared/ui/icons/AppIcons.jsx";
import { REPORT_CATEGORIES } from "./reportRegistry.js";
import { ReportDateRangeBar } from "./ReportDateRangeBar.jsx";
import { ReportsSnapshot } from "./ReportsSnapshot.jsx";

export function ReportsHub({
  period,
  onPeriodChange,
  onSelectReport,
  businessName,
  accountingBasis,
  fyStr,
  sales,
  expenses,
  otherIncomes,
  purchases,
  balSum,
  bankTransfers = [],
  fsm,
  fyYear,
}) {
  const periodLabel = reportPeriodLabel(period, fyStr);

  return (
    <>
      <header className="rep-hdr rep-hdr--minimal rep-hdr--hub">
        <div className="rep-hdr-row">
          <p className="rep-hdr-co">{businessName || "My Business"}</p>
          <span className="rep-hdr-pill">{periodLabel}</span>
        </div>
        <p className="rep-hdr-meta">{accountingBasis === "accrual" ? "Accrual basis" : "Cash basis"} · Select a report</p>
      </header>

      <ReportDateRangeBar period={period} onChange={onPeriodChange} fyStr={fyStr} />

      <div className="tab-page-scroll rep-page rep-page--hub">
        <ReportsSnapshot
          sales={sales}
          expenses={expenses}
          otherIncomes={otherIncomes}
          purchases={purchases}
          balSum={balSum}
          bankTransfers={bankTransfers}
          period={period}
          fsm={fsm}
          fyYear={fyYear}
          accountingBasis={accountingBasis}
          businessName={businessName}
          periodLabel={periodLabel}
        />
        {REPORT_CATEGORIES.map((cat) => (
          <section key={cat.id} className="rep-hub-cat" aria-labelledby={`rep-cat-${cat.id}`}>
            <h2 id={`rep-cat-${cat.id}`} className="rep-hub-cat-title">
              {cat.title}
            </h2>
            <ul className="rep-hub-list" role="list">
              {cat.reports.map((r) => (
                <li key={r.id}>
                  <button type="button" className="rep-hub-item" onClick={() => onSelectReport(r.id)}>
                    <span className="rep-hub-item-text">
                      <span className="rep-hub-item-title">{r.title}</span>
                      {r.description ? <span className="rep-hub-item-desc">{r.description}</span> : null}
                    </span>
                    <IcChevR />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}
