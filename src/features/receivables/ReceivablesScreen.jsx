import { useMemo, useState } from "react";
import { Virtuoso } from "react-virtuoso";
import { compareYmdAsc, dateHuman, money, resolveSaleDueDate, todayStr } from "@/domain/index.js";
import { signedOutstanding } from "@/domain/saleDocuments.js";
import { useMainStageScrollParent } from "@/features/main-stage/MainStageScrollContext.jsx";
import { IcReceivable } from "@/shared/ui/icons/AppIcons.jsx";
import { EmptyState, TabPageChrome } from "@/shared/ui/layout/AppChrome.jsx";

export function ReceivablesScreen({ sales, onOpenSale, onOpenSidebar, defaultDueDays = 30 }) {
  const [filter, setFilter] = useState("all");
  const [sortBy, setSortBy] = useState("due");
  const today = todayStr();

  const allUnpaid = useMemo(
    () =>
      sales
        .filter((s) => signedOutstanding(s) > 0.01)
        .sort((a, b) => {
          const da = resolveSaleDueDate(a, defaultDueDays) || "";
          const db = resolveSaleDueDate(b, defaultDueDays) || "";
          if (da === db) return 0;
          return da < db ? -1 : 1;
        }),
    [sales, defaultDueDays],
  );
  const overdue = useMemo(
    () => allUnpaid.filter((s) => resolveSaleDueDate(s, defaultDueDays) < today),
    [allUnpaid, defaultDueDays, today],
  );
  const dueSoon = useMemo(
    () =>
      allUnpaid.filter((s) => {
        const d = resolveSaleDueDate(s, defaultDueDays);
        const upper = new Date(`${today}T00:00:00`);
        upper.setDate(upper.getDate() + 7);
        const upperYmd = `${upper.getFullYear()}-${String(upper.getMonth() + 1).padStart(2, "0")}-${String(upper.getDate()).padStart(2, "0")}`;
        return d >= today && d <= upperYmd;
      }),
    [allUnpaid, defaultDueDays, today],
  );

  const baseDisplayed = filter === "overdue" ? overdue : filter === "soon" ? dueSoon : allUnpaid;
  const displayed = useMemo(() => {
    const arr = [...baseDisplayed];
    if (sortBy === "amount") {
      arr.sort(
        (a, b) =>
          signedOutstanding(b) - signedOutstanding(a) ||
          resolveSaleDueDate(a, defaultDueDays).localeCompare(resolveSaleDueDate(b, defaultDueDays)),
      );
    } else {
      arr.sort((a, b) =>
        compareYmdAsc(resolveSaleDueDate(a, defaultDueDays), resolveSaleDueDate(b, defaultDueDays)),
      );
    }
    return arr;
  }, [baseDisplayed, defaultDueDays, sortBy]);

  const totalDue = useMemo(() => allUnpaid.reduce((s, x) => s + signedOutstanding(x), 0), [allUnpaid]);
  const totalOverdue = useMemo(() => overdue.reduce((s, x) => s + signedOutstanding(x), 0), [overdue]);
  const scrollParent = useMainStageScrollParent();

  return (
    <TabPageChrome title="Receivables" onOpenSidebar={onOpenSidebar}>
      <div className="receivables-summary">
        <div className="recv-kpi">
          <div className="recv-kpi-lbl">Total outstanding</div>
          <div className={`recv-kpi-val ${totalDue > 0 ? "primary" : ""}`}>{money(totalDue)}</div>
        </div>
        <div className="recv-kpi">
          <div className="recv-kpi-lbl">Overdue</div>
          <div className={`recv-kpi-val ${totalOverdue > 0 ? "danger" : ""}`}>{money(totalOverdue)}</div>
        </div>
        <div className="recv-kpi">
          <div className="recv-kpi-lbl">Customers</div>
          <div className="recv-kpi-val">{new Set(allUnpaid.map((s) => s.customerName)).size}</div>
        </div>
      </div>
      <div className="seg-bar" role="group" aria-label="Filter receivables">
        <button type="button" className={`seg-btn${filter === "all" ? " active" : ""}`} aria-pressed={filter === "all"} onClick={() => setFilter("all")}>
          All ({allUnpaid.length})
        </button>
        <button type="button" className={`seg-btn${filter === "overdue" ? " active" : ""}`} aria-pressed={filter === "overdue"} onClick={() => setFilter("overdue")}>
          Overdue ({overdue.length})
        </button>
        <button type="button" className={`seg-btn${filter === "soon" ? " active" : ""}`} aria-pressed={filter === "soon"} onClick={() => setFilter("soon")}>
          Due Soon ({dueSoon.length})
        </button>
      </div>
      <div className="sort-bar" role="group" aria-label="Sort receivables">
        <span className="sort-bar-lbl">Sort</span>
        <button type="button" className={`sort-chip${sortBy === "due" ? " active" : ""}`} aria-pressed={sortBy === "due"} onClick={() => setSortBy("due")}>
          Due date
        </button>
        <button type="button" className={`sort-chip${sortBy === "amount" ? " active" : ""}`} aria-pressed={sortBy === "amount"} onClick={() => setSortBy("amount")}>
          Amount
        </button>
      </div>
      <div className="list-area">
        {displayed.length === 0 ? (
          <EmptyState icon={<IcReceivable />} title="No outstanding invoices" />
        ) : !scrollParent ? (
          <div aria-hidden style={{ minHeight: 1 }} />
        ) : (
          <Virtuoso
            customScrollParent={scrollParent}
            data={displayed}
            computeItemKey={(_, s) => s.id}
            overscan={400}
            itemContent={(_, s) => {
              const dueDate = resolveSaleDueDate(s, defaultDueDays);
              const isOverdue = dueDate < today;
              return (
                <button type="button" className="sale-row sale-row--clickable" onClick={() => onOpenSale(s.id)}>
                  <div className="sr-left">
                    <span className="sr-name">{s.customerName}</span>
                    <span className="sr-item">
                      {s.invoiceNo}
                      {s.item ? ` · ${s.item}` : ""}
                    </span>
                    <span className="sr-sub">Due {dateHuman(dueDate)}</span>
                  </div>
                  <div className="sr-right">
                    <span className={`sr-amount${isOverdue ? " sr-amount--overdue" : " sr-amount--due"}`}>{money(signedOutstanding(s))}</span>
                    <span className={`status-badge ${isOverdue ? "s-overdue" : "s-unpaid"}`}>{isOverdue ? "Overdue" : "Due"}</span>
                  </div>
                </button>
              );
            }}
          />
        )}
      </div>
    </TabPageChrome>
  );
}
