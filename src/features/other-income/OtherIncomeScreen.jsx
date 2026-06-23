import { useMemo } from "react";
import { entityTimeMsFromId, money, num, dateHuman } from "@/domain/index.js";
import { IcIncome, IcPlus, IcTrash } from "@/shared/ui/icons/AppIcons.jsx";
import { EmptyState, TabPageChrome } from "@/shared/ui/layout/AppChrome.jsx";
import { MonthFilterCompact } from "@/shared/ui/shell/MonthFilterCompact.jsx";

export function OtherIncomeScreen({ rows = [], businessMonth, setBusinessMonth, onOpenSidebar, onAdd, onOpenRow, onDelete }) {
  const total = useMemo(() => rows.reduce((s, x) => s + num(x.amount), 0), [rows]);
  const sorted = useMemo(
    () =>
      [...rows].sort((a, b) => {
        const dc = String(b.date || "").localeCompare(String(a.date || ""));
        if (dc !== 0) return dc;
        return entityTimeMsFromId(b.id) - entityTimeMsFromId(a.id);
      }),
    [rows],
  );
  return (
    <TabPageChrome title="Other income" onOpenSidebar={onOpenSidebar} right={<span className="page-hdr-meta">{money(total)}</span>}>
      <div className="period-bar period-bar-compact">
        <span className="sr-only">Period</span>
        <MonthFilterCompact value={businessMonth} onChange={setBusinessMonth} instanceId="global" />
      </div>
      <div className="tab-page-scroll">
        {sorted.length === 0 ? (
          <EmptyState
            icon={<IcIncome />}
            title={businessMonth ? "No other income this month" : "No other income this financial year"}
            sub="Non-invoice receipts: interest, rent received, cashback, etc."
          />
        ) : (
          <div className="list-area">
            <div className="exp-spend-overview">
              <p className="exp-spend-overview-hd">Income (not from invoices)</p>
            </div>
            {sorted.map((r) => (
              <div key={r.id} className="exp-row exp-row-with-actions">
                <button type="button" className="exp-row-main" onClick={() => onOpenRow(r)}>
                  <div className="exp-left">
                    <span className="exp-desc">{(r.description || "").trim() || r.category || "Income"}</span>
                    <span className="exp-sub">
                      {r.category} · {dateHuman(r.date)}
                    </span>
                    {r.note && <span className="exp-note">{r.note}</span>}
                  </div>
                  <span className="exp-amount exp-amount--income">{money(r.amount)}</span>
                </button>
                <button type="button" className="del-btn-sm" onClick={() => onDelete(r.id)} aria-label="Delete income">
                  <IcTrash />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      <button type="button" className="fab" onClick={onAdd} aria-label="Add other income">
        <IcPlus />
      </button>
    </TabPageChrome>
  );
}
