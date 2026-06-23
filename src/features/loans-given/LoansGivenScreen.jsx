import { useMemo, useState } from "react";
import { money, num, todayStr } from "@/domain/index.js";
import { IcReceivable } from "@/shared/ui/icons/AppIcons.jsx";
import { EmptyState, TabPageChrome } from "@/shared/ui/layout/AppChrome.jsx";
import { PaginatedLoanGivenRows } from "./PaginatedLoanGivenRows.jsx";

export function LoansGivenScreen({ loansGiven = [], onOpenLoan, onNewLoan, onOpenSidebar }) {
  const [filter, setFilter] = useState("all");
  const today = todayStr();
  const active = useMemo(() => (loansGiven || []).filter((l) => num(l.outstanding) > 0), [loansGiven]);
  const overdue = useMemo(() => active.filter((l) => (l.dueDate || l.date) < today), [active, today]);
  const closed = useMemo(() => (loansGiven || []).filter((l) => num(l.outstanding) <= 0), [loansGiven]);
  const displayed = filter === "overdue" ? overdue : filter === "closed" ? closed : active;
  const totalOut = useMemo(() => active.reduce((s, l) => s + num(l.outstanding), 0), [active]);

  return (
    <TabPageChrome title="Loans Given" onOpenSidebar={onOpenSidebar} className="tab-page--loans-given">
      <div className="receivables-summary">
        <div className="recv-kpi">
          <div className="recv-kpi-lbl">Outstanding</div>
          <div className={`recv-kpi-val ${totalOut > 0 ? "primary" : ""}`}>{money(totalOut)}</div>
        </div>
        <div className="recv-kpi">
          <div className="recv-kpi-lbl">Active loans</div>
          <div className="recv-kpi-val">{active.length}</div>
        </div>
        <div className="recv-kpi">
          <div className="recv-kpi-lbl">Overdue</div>
          <div className="recv-kpi-val danger">{overdue.length}</div>
        </div>
      </div>
      <div className="quick-actions loans-given-actions">
        <button type="button" className="qa-btn qa-primary" onClick={onNewLoan}>+ New loan</button>
      </div>
      <div className="seg-bar">
        <button type="button" className={`seg-btn${filter === "all" ? " active" : ""}`} onClick={() => setFilter("all")}>Active ({active.length})</button>
        <button type="button" className={`seg-btn${filter === "overdue" ? " active" : ""}`} onClick={() => setFilter("overdue")}>Overdue ({overdue.length})</button>
        <button type="button" className={`seg-btn${filter === "closed" ? " active" : ""}`} onClick={() => setFilter("closed")}>Closed ({closed.length})</button>
      </div>
      <div className="list-area">
        <PaginatedLoanGivenRows key={filter} displayed={displayed} onOpenLoan={onOpenLoan} emptyState={<EmptyState icon={<IcReceivable />} title="No loans in this view" />} />
      </div>
    </TabPageChrome>
  );
}
