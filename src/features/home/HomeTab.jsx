import { useMemo } from "react";
import { compareRecordsByRecency, money, dateHuman, num, saleStatus } from "@/domain/index.js";
import {
  IcBell,
  IcBook,
  IcBox,
  IcChart,
  IcNetWorth,
  IcPlus,
  IcReceivable,
  IcSales,
  IcSearch,
  IcSpend,
} from "@/shared/ui/icons/AppIcons.jsx";
import { MonthFilterCompact } from "@/shared/ui/shell/MonthFilterCompact.jsx";
import { NotifPanel } from "./NotifPanel.jsx";

const RECENT_LIMIT = 5;
const AV_COLORS = ["av-blue", "av-green", "av-purple", "av-orange", "av-teal", "av-indigo", "av-amber", "av-red"];

function getInitials(name) {
  return (name || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] || "")
    .join("")
    .toUpperCase() || "?";
}

function avatarColor(name) {
  let h = 0;
  for (let i = 0; i < (name || "").length; i++) h = ((h << 5) - h + (name || "").charCodeAt(i)) | 0;
  return AV_COLORS[Math.abs(h) % AV_COLORS.length];
}

function RecentSection({ title, emptyHint, children }) {
  return (
    <div className="home-section">
      <div className="home-section-hdr">
        <span className="home-section-hd">{title}</span>
      </div>
      {children || <p className="home-empty-hint">{emptyHint}</p>}
    </div>
  );
}

export function HomeTab({
  state,
  kpis,
  accountingBasis,
  onToggleAccountingBasis,
  fyStr,
  businessMonth,
  setBusinessMonth,
  dashSales,
  dashPurchases = [],
  safeSales = [],
  openNewSale,
  openSaleDetail,
  openPurchaseDetail,
  openNewExpense,
  openSearch,
  alertItems,
  notifOpen,
  setNotifOpen,
  notifBlocked,
  onDismissAlert,
  onDismissAllAlerts,
  onNotificationClick,
  notifPerm,
  onRequestNotifPerm,
}) {
  const recentSales = useMemo(
    () => [...dashSales].sort(compareRecordsByRecency).slice(0, RECENT_LIMIT),
    [dashSales],
  );
  const recentPurchases = useMemo(
    () => [...dashPurchases].sort(compareRecordsByRecency).slice(0, RECENT_LIMIT),
    [dashPurchases],
  );
  const recentReceivables = useMemo(
    () =>
      [...safeSales]
        .filter((s) => num(s?.outstanding) > 0.01)
        .sort(compareRecordsByRecency)
        .slice(0, RECENT_LIMIT),
    [safeSales],
  );
  const otherIncomeHint =
    kpis.otherIncome > 0.01
      ? `incl. ${money(kpis.otherIncome)} other income`
      : kpis.otherIncome < -0.01
        ? `incl. ${money(kpis.otherIncome)} other income`
        : null;

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const grossCls = kpis.grossProfit >= 0 ? "kpi-gross" : "kpi-gross kpi-gross-neg";
  const profitCls = kpis.netProfit >= 0 ? "kpi-profit" : "kpi-loss";

  return (
    <div className="tab-page home-page">
      {notifOpen && <div className="notif-backdrop" onClick={() => setNotifOpen(false)} aria-hidden="true" />}

      {/* Header — visible on desktop (mobile uses MobileAppBar instead) */}
      <div className="home-hdr">
        <div className="home-hdr-left">
          <div className="home-hdr-titles">
            <p className="home-biz">{state.settings.businessName || "My Business"}</p>
            <p className="home-date">{today}</p>
          </div>
          <span className="fy-chip">FY {fyStr}</span>
        </div>
        <div className="home-hdr-right">
          {typeof onToggleAccountingBasis === "function" && (
            <button
              type="button"
              className={`icon-btn home-hdr-basis${accountingBasis === "accrual" ? " home-hdr-basis--on" : ""}`}
              onClick={onToggleAccountingBasis}
              title={
                accountingBasis === "accrual"
                  ? "Accrual basis (invoiced) — click for cash (operational)"
                  : "Cash (operational) basis — click for accrual (invoiced)"
              }
              aria-label={
                accountingBasis === "accrual"
                  ? "Accrual basis, click for cash operational basis"
                  : "Cash operational basis, click for accrual basis"
              }
            >
              <IcBook />
            </button>
          )}
          <button type="button" className="icon-btn home-hdr-search" onClick={openSearch} aria-label="Search">
            <IcSearch />
          </button>
          <div className={`notif-anchor-home${notifBlocked ? " notif-anchor-hidden" : ""}`}>
            <button
              type="button"
              className={`notif-bell-btn${notifOpen ? " active" : ""}`}
              onClick={() => setNotifOpen((o) => !o)}
              aria-label={`Notifications${alertItems.length ? `, ${alertItems.length} alerts` : ""}`}
              aria-expanded={notifOpen}
            >
              <IcBell />
              {alertItems.length > 0 && (
                <span className="notif-badge">{alertItems.length > 99 ? "99+" : alertItems.length}</span>
              )}
            </button>
            {notifOpen && (
              <NotifPanel
                items={alertItems}
                notifPerm={notifPerm}
                onRequestPerm={onRequestNotifPerm}
                onDismiss={onDismissAlert}
                onDismissAll={() => {
                  onDismissAllAlerts();
                  setNotifOpen(false);
                }}
                onClick={onNotificationClick}
              />
            )}
          </div>
        </div>
      </div>

      {/* Period selector */}
      <div className="period-bar period-bar-compact">
        <span className="sr-only">Period</span>
        <MonthFilterCompact value={businessMonth} onChange={setBusinessMonth} instanceId="global" />
      </div>

      {/* KPI grid — 6 cards with accent color + icon */}
      <div className="kpi-grid kpi-grid-home">
        <div
          className="kpi-card kpi-sales"
          title={
            kpis.accountingBasis === "cash"
              ? "Cash basis: collections by payment date in the selected month or FY."
              : "Accrual: sum of invoice totals by invoice date in the selected period."
          }
        >
          <div className="kpi-hd">
            <span className="kpi-lbl">{kpis.accountingBasis === "cash" ? "Revenue (cash)" : "Revenue"}</span>
            <span className="kpi-icon"><IcSales /></span>
          </div>
          <span className="kpi-val">{money(kpis.revenue)}</span>
        </div>

        <div
          className="kpi-card kpi-cost"
          title="COGS: line cost on invoices / payments in this period."
        >
          <div className="kpi-hd">
            <span className="kpi-lbl">COGS</span>
            <span className="kpi-icon"><IcBox /></span>
          </div>
          <span className="kpi-val">{money(kpis.cogs)}</span>
        </div>

        <div className={`kpi-card ${grossCls}`}>
          <div className="kpi-hd">
            <span className="kpi-lbl">Gross Profit</span>
            <span className="kpi-icon"><IcChart /></span>
          </div>
          <span className="kpi-val">{money(kpis.grossProfit)}</span>
        </div>

        <div
          className="kpi-card kpi-expense"
          title={
            kpis.accountingBasis === "cash"
              ? "Cash: expense outflow in the selected month or FY."
              : "Accrual: operating costs by expense date in the selected month or FY."
          }
        >
          <div className="kpi-hd">
            <span className="kpi-lbl">Operating exp.</span>
            <span className="kpi-icon"><IcSpend /></span>
          </div>
          <span className="kpi-val">{money(kpis.expenses)}</span>
        </div>

        <div className={`kpi-card kpi-card--hero ${profitCls}`}>
          <div className="kpi-hd">
            <span className="kpi-lbl">Net Profit</span>
            <span className="kpi-icon"><IcNetWorth /></span>
          </div>
          <span className="kpi-val">{money(kpis.netProfit)}</span>
          {otherIncomeHint ? <span className="kpi-sub">{otherIncomeHint}</span> : null}
        </div>

        <div
          className="kpi-card kpi-due"
          title="All open invoice balances — not limited to the period filter."
        >
          <div className="kpi-hd">
            <span className="kpi-lbl">Receivables</span>
            <span className="kpi-icon"><IcReceivable /></span>
          </div>
          <span className="kpi-val">{money(kpis.outstanding)}</span>
        </div>
      </div>

      {/* Quick actions */}
      <div className="quick-actions">
        <button type="button" className="qa-btn qa-primary" onClick={openNewSale}>
          <IcPlus />
          <span>New Sale</span>
        </button>
        <button type="button" className="qa-btn qa-secondary" onClick={openNewExpense}>
          <IcSpend />
          <span>Add Expense</span>
        </button>
      </div>

      {/* Recent activity — card-style sections */}
      <div className="home-recent-area">
        <RecentSection
          title="Recent Sales"
          emptyHint="No sales in this period — tap New Sale above."
        >
          {recentSales.length > 0
            ? recentSales.map((sale) => {
                const st = saleStatus(sale, state.settings?.defaultDueDays);
                return (
                  <button
                    key={sale.id}
                    type="button"
                    className="sale-row"
                    onClick={() => openSaleDetail(sale.id)}
                  >
                    <div className={`sr-av ${avatarColor(sale.customerName)}`}>
                      {getInitials(sale.customerName)}
                    </div>
                    <div className="sr-left">
                      <span className="sr-name">{sale.customerName}</span>
                      <span className="sr-sub">
                        {dateHuman(sale.date)}
                        {sale.item ? ` · ${sale.item}` : ""}
                      </span>
                    </div>
                    <div className="sr-right">
                      <span className="sr-amount">{money(sale.totalSale)}</span>
                      <span className={`status-badge ${st.cls}`}>{st.text}</span>
                    </div>
                  </button>
                );
              })
            : null}
        </RecentSection>

        <RecentSection title="Recent Purchases" emptyHint="No purchases in this period.">
          {recentPurchases.length > 0
            ? recentPurchases.map((p) => {
                const due = num(p.outstanding);
                return (
                  <button
                    key={p.id}
                    type="button"
                    className="sale-row sale-row--purchase"
                    onClick={() => openPurchaseDetail?.(p.id)}
                  >
                    <div className={`sr-av ${avatarColor(p.supplierName || "S")}`}>
                      {getInitials(p.supplierName || "S")}
                    </div>
                    <div className="sr-left">
                      <span className="sr-name">{(p.supplierName || "").trim() || "Supplier"}</span>
                      <span className="sr-sub">
                        {dateHuman(p.date)}
                        {p.invoiceRef ? ` · ${p.invoiceRef}` : ""}
                      </span>
                    </div>
                    <div className="sr-right">
                      <span className="sr-amount">{money(p.totalAmount)}</span>
                      {due > 0.01 ? (
                        <span className="status-badge s-unpaid">Due {money(due)}</span>
                      ) : (
                        <span className="status-badge s-paid">Paid</span>
                      )}
                    </div>
                  </button>
                );
              })
            : null}
        </RecentSection>

        <RecentSection title="Receivables" emptyHint="No open balances — all caught up.">
          {recentReceivables.length > 0
            ? recentReceivables.map((sale) => {
                const st = saleStatus(sale, state.settings?.defaultDueDays);
                return (
                  <button
                    key={sale.id}
                    type="button"
                    className="sale-row sale-row--receivable"
                    onClick={() => openSaleDetail(sale.id)}
                  >
                    <div className={`sr-av ${avatarColor(sale.customerName)}`}>
                      {getInitials(sale.customerName)}
                    </div>
                    <div className="sr-left">
                      <span className="sr-name">{sale.customerName}</span>
                      <span className="sr-sub">
                        {dateHuman(sale.date)}
                        {sale.invoiceNo ? ` · ${sale.invoiceNo}` : ""}
                      </span>
                    </div>
                    <div className="sr-right">
                      <span className="sr-amount sr-amount--due">{money(sale.outstanding)}</span>
                      <span className={`status-badge ${st.cls}`}>{st.text}</span>
                    </div>
                  </button>
                );
              })
            : null}
        </RecentSection>
      </div>
    </div>
  );
}
