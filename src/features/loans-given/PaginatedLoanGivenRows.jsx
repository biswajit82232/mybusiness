import { useState } from "react";
import { LIST_PAGE_SIZE, dateHuman, loanGivenStatus, money, num, todayStr } from "@/domain/index.js";

export function PaginatedLoanGivenRows({ displayed, onOpenLoan, emptyState }) {
  const [listCap, setListCap] = useState(LIST_PAGE_SIZE);
  const visible = displayed.slice(0, listCap);
  const remaining = displayed.length - visible.length;
  const today = todayStr();
  if (displayed.length === 0) return emptyState;
  return (
    <>
      {visible.map((loan) => {
        const st = loanGivenStatus(loan, today);
        const principal = num(loan.principal);
        const received = num(loan.received);
        const pct = principal > 0 ? Math.min(100, Math.round((received / principal) * 100)) : 0;
        return (
          <button key={loan.id} type="button" className="sale-row loan-given-row" onClick={() => onOpenLoan(loan.id)}>
            <div className="sr-left">
              <span className="sr-name">{loan.borrowerName}</span>
              <span className="sr-sub">Due {dateHuman(loan.dueDate || loan.date)}</span>
              <div className="loan-given-progress-wrap" aria-hidden="true">
                <div className="cashflow-bar-wrap">
                  <div className="cashflow-bar-in" style={{ width: `${pct}%` }} />
                </div>
                <span className="loan-given-progress-lbl">{pct}% repaid</span>
              </div>
            </div>
            <div className="sr-right">
              <span className="sr-amount sr-amount--due">{money(loan.outstanding)}</span>
              <span className={`status-badge ${st.cls}`}>{st.text}</span>
            </div>
          </button>
        );
      })}
      {remaining > 0 && (
        <div className="list-load-more-wrap">
          <button type="button" className="list-load-more-btn" onClick={() => setListCap((c) => c + LIST_PAGE_SIZE)}>
            Load more ({remaining} remaining)
          </button>
        </div>
      )}
    </>
  );
}
