import { useMemo } from "react";
import { Virtuoso } from "react-virtuoso";
import { entityTimeMsFromId, money, dateHuman, isDateInFy, num } from "@/domain/index.js";
import { useMainStageScrollParent } from "@/features/main-stage/MainStageScrollContext.jsx";
import { IcPlus, IcUpload } from "@/shared/ui/icons/AppIcons.jsx";
import { EmptyState, TabPageChrome } from "@/shared/ui/layout/AppChrome.jsx";
import { MonthFilterCompact } from "@/shared/ui/shell/MonthFilterCompact.jsx";

export function PurchasesScreen({
  purchases,
  businessMonth,
  setBusinessMonth,
  fsm,
  fyYear,
  onNew,
  onOpenPurchase,
  onOpenSidebar,
}) {
  const safe = useMemo(() => (Array.isArray(purchases) ? purchases : []), [purchases]);
  const scrollParent = useMainStageScrollParent();

  const raw = useMemo(() => {
    if (businessMonth) {
      const mk = String(businessMonth).slice(0, 7);
      return safe.filter((p) => String(p?.date || "").slice(0, 7) === mk);
    }
    // Default view matches the rest of the app: FY when month is not selected.
    return safe.filter((p) => isDateInFy(p?.date, fsm, fyYear));
  }, [businessMonth, safe, fsm, fyYear]);

  const sorted = useMemo(() => {
    return [...raw].sort((a, b) => {
      const da = String(a?.date || "");
      const db = String(b?.date || "");
      if (da !== db) return db.localeCompare(da);
      return (entityTimeMsFromId(b?.id) || 0) - (entityTimeMsFromId(a?.id) || 0);
    });
  }, [raw]);

  const { totalVolume, totalDue } = useMemo(() => {
    let vol = 0;
    let due = 0;
    for (const p of raw) {
      if (!p || typeof p !== "object") continue;
      vol += num(p.totalAmount);
      const o = num(p?.outstanding);
      if (o > 0.01) due += o;
    }
    return { totalVolume: vol, totalDue: due };
  }, [raw]);

  const count = raw.length;

  return (
    <TabPageChrome
      title="Purchases"
      onOpenSidebar={onOpenSidebar}
      className="tab-page--split-scroll"
      right={
        count > 0 ? (
          <span className="page-hdr-meta">
            {count} {count === 1 ? "invoice" : "invoices"}
          </span>
        ) : null
      }
    >
      <div className="period-bar period-bar-compact">
        <span className="sr-only">Purchase period</span>
        <MonthFilterCompact value={businessMonth} onChange={setBusinessMonth} instanceId="global" />
      </div>
      <div className="tab-page-scroll">
        <div className="receivables-summary purchases-kpi-strip">
          <div className="recv-kpi">
            <div className="recv-kpi-lbl">Purchases</div>
            <div className="recv-kpi-val primary">{count}</div>
          </div>
          <div className="recv-kpi">
            <div className="recv-kpi-lbl">Total (volume)</div>
            <div className="recv-kpi-val">{money(totalVolume)}</div>
          </div>
          <div className="recv-kpi">
            <div className="recv-kpi-lbl">Due to suppliers</div>
            <div className={`recv-kpi-val${totalDue > 0.01 ? " warning" : ""}`}>{money(totalDue)}</div>
          </div>
        </div>

        <div className="purchases-actions">
          <button type="button" className="purchases-new-btn" onClick={onNew}>
            <IcPlus />
            <span>New purchase</span>
          </button>
        </div>

        <div className="daily-section-hd purchases-list-hd">
          {businessMonth ? "This month" : "This financial year"}
        </div>

        <div className="list-area purchases-list-area">
          {sorted.length === 0 ? (
            <EmptyState
              icon={<IcUpload />}
              title={businessMonth ? "No purchases this month" : "No purchases this financial year"}
              sub="Record supplier invoices and stock-in; unpaid amounts flow to Payables."
            />
          ) : !scrollParent ? (
            <div aria-hidden style={{ minHeight: 1 }} />
          ) : (
            <Virtuoso
              customScrollParent={scrollParent}
              data={sorted}
              computeItemKey={(_, p) => p.id}
              overscan={400}
              itemContent={(_, p) => {
                const due = num(p?.outstanding);
                const hasDue = due > 0.01;
                return (
                  <button
                    type="button"
                    className="activity-row activity-row--clickable purchases-row"
                    onClick={() => onOpenPurchase?.(p.id)}
                  >
                    <div className="activity-icon-wrap activity-icon-purchase">
                      <IcUpload />
                    </div>
                    <div className="activity-info">
                      <div className="activity-title">{(p.supplierName || "").trim() || "Supplier"}</div>
                      <div className="activity-sub">
                        {dateHuman(p.date)}
                        {p.invoiceRef ? ` · ${p.invoiceRef}` : ""}
                      </div>
                    </div>
                    <div className="purchases-row-amt">
                      <div className="activity-amount">{money(p.totalAmount)}</div>
                      {hasDue && (
                        <span className="purchases-due-pill" title="Outstanding balance">
                          Due {money(due)}
                        </span>
                      )}
                    </div>
                  </button>
                );
              }}
            />
          )}
        </div>
      </div>
    </TabPageChrome>
  );
}
