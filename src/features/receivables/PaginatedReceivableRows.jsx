import { useState } from "react";
import { LIST_PAGE_SIZE, dateHuman, money, resolveSaleDueDate } from "@/domain/index.js";

export function PaginatedReceivableRows({ displayed = [], today, onOpenSale, emptyState, defaultDueDays = 30 }) {
  const [listCap, setListCap] = useState(LIST_PAGE_SIZE);
  const visible = displayed.slice(0, listCap);
  const remaining = displayed.length - visible.length;
  if (displayed.length === 0) return emptyState;
  return (
    <>
      {visible.map((s) => {
        const dueDate = resolveSaleDueDate(s, defaultDueDays);
        const isOverdue = dueDate < today;
        return (
          <button key={s.id} type="button" className="sale-row" onClick={() => onOpenSale(s.id)}>
            <div className="sr-left">
              <span className="sr-name">{s.customerName}</span>
              <span className="sr-item">
                {s.invoiceNo}
                {s.item ? ` · ${s.item}` : ""}
              </span>
              <span className="sr-sub">Due {dateHuman(dueDate)}</span>
            </div>
            <div className="sr-right">
              <span className={`sr-amount${isOverdue ? " sr-amount--overdue" : " sr-amount--due"}`}>{money(s.outstanding)}</span>
              <span className={`status-badge ${isOverdue ? "s-overdue" : "s-unpaid"}`}>{isOverdue ? "Overdue" : "Due"}</span>
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
