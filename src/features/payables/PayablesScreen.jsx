import { useMemo, useState } from "react";
import { Virtuoso } from "react-virtuoso";
import { addDaysStr, dateHuman, money, num, todayStr } from "@/domain/index.js";
import { IcUpload } from "@/shared/ui/icons/AppIcons.jsx";
import { EmptyState, TabPageChrome } from "@/shared/ui/layout/AppChrome.jsx";
import { useMainStageScrollParent } from "@/features/main-stage/MainStageScrollContext.jsx";

function payableDueDate(purchase, defaultDueDays = 30) {
  const due = String(purchase?.dueDate || "").slice(0, 10);
  if (due) return due;
  return addDaysStr(String(purchase?.date || "").slice(0, 10), defaultDueDays);
}

export function PayablesScreen({ purchases, defaultDueDays = 30, onOpenPurchase, onOpenSidebar }) {
  const [filter, setFilter] = useState("all");
  const [sortBy, setSortBy] = useState("due");
  const today = todayStr();

  const allUnpaid = useMemo(
    () =>
      (Array.isArray(purchases) ? purchases : [])
        .filter((p) => num(p?.outstanding) > 0.01)
        .sort((a, b) => {
          const da = payableDueDate(a, defaultDueDays) || "";
          const db = payableDueDate(b, defaultDueDays) || "";
          if (da === db) return 0;
          return da < db ? -1 : 1;
        }),
    [purchases, defaultDueDays],
  );

  const overdue = useMemo(
    () => allUnpaid.filter((p) => payableDueDate(p, defaultDueDays) < today),
    [allUnpaid, today, defaultDueDays],
  );
  const dueSoon = useMemo(
    () =>
      allUnpaid.filter((p) => {
        const d = payableDueDate(p, defaultDueDays);
        return d >= today && d <= addDaysStr(today, 7);
      }),
    [allUnpaid, today, defaultDueDays],
  );

  const baseDisplayed = filter === "overdue" ? overdue : filter === "soon" ? dueSoon : allUnpaid;
  const displayed = useMemo(() => {
    const arr = [...baseDisplayed];
    if (sortBy === "amount") {
      arr.sort(
        (a, b) =>
          num(b.outstanding) - num(a.outstanding) ||
          String(payableDueDate(a, defaultDueDays)).localeCompare(String(payableDueDate(b, defaultDueDays))),
      );
    } else {
      arr.sort((a, b) => {
        const da = payableDueDate(a, defaultDueDays) || "";
        const db = payableDueDate(b, defaultDueDays) || "";
        if (da === db) return 0;
        return da < db ? -1 : 1;
      });
    }
    return arr;
  }, [baseDisplayed, sortBy, defaultDueDays]);

  const totalDue = useMemo(() => allUnpaid.reduce((s, x) => s + num(x.outstanding), 0), [allUnpaid]);
  const totalOverdue = useMemo(() => overdue.reduce((s, x) => s + num(x.outstanding), 0), [overdue]);

  const scrollParent = useMainStageScrollParent();

  return (
    <TabPageChrome title="Payables" onOpenSidebar={onOpenSidebar}>
      <div className="receivables-summary">
        <div className="recv-kpi">
          <div className="recv-kpi-lbl">Total owed</div>
          <div className={`recv-kpi-val ${totalDue > 0 ? "primary" : ""}`}>{money(totalDue)}</div>
        </div>
        <div className="recv-kpi">
          <div className="recv-kpi-lbl">Overdue (est.)</div>
          <div className={`recv-kpi-val ${totalOverdue > 0 ? "danger" : ""}`}>{money(totalOverdue)}</div>
        </div>
        <div className="recv-kpi">
          <div className="recv-kpi-lbl">Suppliers</div>
          <div className="recv-kpi-val">{new Set(allUnpaid.map((p) => (p.supplierName || "").trim() || "—")).size}</div>
        </div>
      </div>
      <div className="seg-bar">
        <button type="button" className={`seg-btn${filter === "all" ? " active" : ""}`} aria-pressed={filter === "all"} onClick={() => setFilter("all")}>
          All ({allUnpaid.length})
        </button>
        <button type="button" className={`seg-btn${filter === "overdue" ? " active" : ""}`} aria-pressed={filter === "overdue"} onClick={() => setFilter("overdue")}>
          Overdue ({overdue.length})
        </button>
        <button type="button" className={`seg-btn${filter === "soon" ? " active" : ""}`} aria-pressed={filter === "soon"} onClick={() => setFilter("soon")}>
          Due soon ({dueSoon.length})
        </button>
      </div>
      <div className="sort-bar" role="group" aria-label="Sort payables">
        <span className="sort-bar-lbl">Sort</span>
        <button type="button" className={`sort-chip${sortBy === "due" ? " active" : ""}`} aria-pressed={sortBy === "due"} onClick={() => setSortBy("due")}>
          Due (est.)
        </button>
        <button type="button" className={`sort-chip${sortBy === "amount" ? " active" : ""}`} aria-pressed={sortBy === "amount"} onClick={() => setSortBy("amount")}>
          Amount
        </button>
      </div>
      <div className="list-area">
        {displayed.length === 0 ? (
          <EmptyState icon={<IcUpload />} title="No supplier balances" sub="Record credit purchases under Purchases." />
        ) : !scrollParent ? (
          <div aria-hidden style={{ minHeight: 1 }} />
        ) : (
          <Virtuoso
            customScrollParent={scrollParent}
            data={displayed}
            computeItemKey={(_, p) => p.id}
            overscan={400}
            itemContent={(_, p) => {
              const dueEst = payableDueDate(p, defaultDueDays);
              const isOd = dueEst < today;
              return (
                <button
                  type="button"
                  className="sale-row sale-row--clickable"
                  onClick={() => onOpenPurchase?.(p.id)}
                >
                  <div className="sr-left">
                    <span className="sr-name">{(p.supplierName || "").trim() || "Supplier"}</span>
                    <span className="sr-item">{p.invoiceRef ? p.invoiceRef : "Credit purchase"}</span>
                    <span className="sr-sub">Purchased {dateHuman(p.date)} · Due (est.) {dateHuman(dueEst)}</span>
                  </div>
                  <div className="sr-right">
                    <span className={`sr-amount${isOd ? " sr-amount--overdue" : " sr-amount--due"}`}>{money(p.outstanding)}</span>
                    <span className={`status-badge ${isOd ? "s-overdue" : "s-unpaid"}`}>{isOd ? "Overdue" : "Open"}</span>
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
