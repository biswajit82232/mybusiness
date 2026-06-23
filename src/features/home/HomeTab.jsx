import { useCallback, useMemo, useState } from "react";
import {
  compareRecordsByRecency,
  currentMonthStr,
  formatMonthLabel,
  money,
  dateHuman,
  num,
  saleStatus,
} from "@/domain/index.js";
import {
  IcBell,
  IcBook,
  IcEye,
  IcEyeOff,
  IcPlus,
  IcSearch,
  IcSpend,
} from "@/shared/ui/icons/AppIcons.jsx";
import { MonthFilterCompact } from "@/shared/ui/shell/MonthFilterCompact.jsx";
import { NotifPanel } from "./NotifPanel.jsx";

const PROFIT_MASK_KEYS = new Set(["profit", "gross", "revenue", "cogs"]);
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

function Md3ListRow({ avatarName, title, subtitle, amount, badge, badgeCls, onClick }) {
  return (
    <button type="button" className="home-md3-list-row" onClick={onClick}>
      <div className={`home-md3-list-av ${avatarColor(avatarName)}`}>{getInitials(avatarName)}</div>
      <div className="home-md3-list-body">
        <span className="home-md3-list-title">{title}</span>
        {subtitle ? <span className="home-md3-list-sub">{subtitle}</span> : null}
      </div>
      <div className="home-md3-list-end">
        {amount ? <span className="home-md3-list-amt">{amount}</span> : null}
        {badge ? <span className={`status-badge status-badge--sm ${badgeCls || ""}`}>{badge}</span> : null}
      </div>
    </button>
  );
}

function Md3Section({ title, children, emptyHint }) {
  const hasItems = Array.isArray(children) ? children.length > 0 : !!children;
  return (
    <section className="home-md3-section">
      <div className="home-md3-section-hd">
        <h2 className="home-md3-section-title">{title}</h2>
      </div>
      <div className="home-md3-section-body">
        {hasItems ? children : <p className="home-md3-empty">{emptyHint}</p>}
      </div>
    </section>
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
  const [profitHidden, setProfitHidden] = useState(true);
  const toggleProfitHidden = useCallback(() => {
    setProfitHidden((hidden) => !hidden);
  }, []);

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

  const revenueLabel = kpis.accountingBasis === "cash" ? "Revenue (cash)" : "Revenue";
  const expenseLabel = kpis.accountingBasis === "cash" ? "Cash expenses" : "Operating exp.";
  const profitPositive = kpis.netProfit >= 0;
  const grossPositive = kpis.grossProfit >= 0;

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "short",
  });

  const otherIncomeSub =
    Math.abs(num(kpis.otherIncome)) > 0.01 ? `incl. ${money(kpis.otherIncome)} OI` : null;

  const kpiTiles = useMemo(
    () => [
      {
        key: "profit",
        label: "Net profit",
        value: money(kpis.netProfit),
        sub: otherIncomeSub,
        hero: true,
        tone: profitPositive ? "tone-good" : "tone-bad",
      },
      { key: "revenue", label: revenueLabel, value: money(kpis.revenue), tone: "tone-primary" },
      { key: "cogs", label: "COGS", value: money(kpis.cogs), tone: "tone-warn" },
      {
        key: "gross",
        label: "Gross profit",
        value: money(kpis.grossProfit),
        tone: grossPositive ? "tone-good" : "tone-bad",
      },
      { key: "expense", label: expenseLabel, value: money(kpis.expenses), tone: "tone-neutral" },
      {
        key: "recv",
        label: "Receivables",
        value: money(kpis.outstanding),
        tone: "tone-accent",
        wideMobile: true,
      },
      {
        key: "liquid",
        label: "Total liquid",
        value: money(kpis.totalLiquid),
        tone: "tone-primary",
      },
    ],
    [kpis, revenueLabel, expenseLabel, profitPositive, grossPositive, otherIncomeSub],
  );

  const monthlyTarget = Math.max(0, Math.floor(num(state.settings?.monthlySalesTarget)));
  const targetMonth = businessMonth || currentMonthStr();

  const targetMonthSalesCount = useMemo(() => {
    if (monthlyTarget <= 0) return 0;
    return safeSales.filter((s) => String(s.date || "").startsWith(targetMonth)).length;
  }, [monthlyTarget, targetMonth, safeSales]);

  const salesTargetDisplay = useMemo(() => {
    if (monthlyTarget <= 0) return null;
    const count = targetMonthSalesCount;
    const pct = Math.min(999, Math.round((count / monthlyTarget) * 100));
    const month = formatMonthLabel(targetMonth);
    const unit = monthlyTarget === 1 ? "sale" : "sales";
    return {
      month,
      count,
      goal: monthlyTarget,
      unit,
      pct,
      ariaLabel: `${month}: ${count} of ${monthlyTarget} sales, ${pct} percent`,
    };
  }, [monthlyTarget, targetMonth, targetMonthSalesCount]);

  return (
    <div className="tab-page home-page home-page--md3">
      {notifOpen && <div className="notif-backdrop" onClick={() => setNotifOpen(false)} aria-hidden="true" />}

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
                  ? "Accrual basis — tap for cash"
                  : "Cash basis — tap for accrual"
              }
              aria-label={accountingBasis === "accrual" ? "Accrual basis" : "Cash basis"}
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

      <div className="home-md3-scroll">
        <div className="home-md3-period">
          {salesTargetDisplay ? (
            <div className="home-md3-target" role="status" aria-label={salesTargetDisplay.ariaLabel}>
              <span className="home-md3-target-lbl">{salesTargetDisplay.month}</span>
              <span className="home-md3-target-val">
                {salesTargetDisplay.count} / {salesTargetDisplay.goal} {salesTargetDisplay.unit}
              </span>
              <span className="home-md3-target-pct">({salesTargetDisplay.pct}%)</span>
            </div>
          ) : (
            <span className="home-md3-target-spacer" aria-hidden="true" />
          )}
          <MonthFilterCompact value={businessMonth} onChange={setBusinessMonth} instanceId="global" />
        </div>

        <section className="home-md3-kpi-grid" aria-label="Key metrics">
          {kpiTiles.map((tile) => {
            const maskProfit = profitHidden && PROFIT_MASK_KEYS.has(tile.key);
            return (
            <div
              key={tile.key}
              className={[
                "home-md3-kpi",
                tile.hero ? "home-md3-kpi--hero" : "",
                tile.wideMobile ? "home-md3-kpi--wide-mobile" : "",
                tile.tone || "",
              ]
                .filter(Boolean)
                .join(" ")}
              title={maskProfit ? tile.label : `${tile.label}: ${tile.value}`}
            >
              {tile.hero ? (
                <>
                  <div className="home-md3-kpi-hero-body">
                    <span className="home-md3-kpi-lbl">{tile.label}</span>
                    <span className={`home-md3-kpi-val${maskProfit ? " home-md3-kpi-val--masked" : ""}`}>
                      {tile.value}
                    </span>
                    {tile.sub ? (
                      <span className={`home-md3-kpi-sub${maskProfit ? " home-md3-kpi-val--masked" : ""}`}>
                        {tile.sub}
                      </span>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    className="home-md3-kpi-eye"
                    onClick={toggleProfitHidden}
                    aria-label={
                      profitHidden
                        ? "Show revenue, COGS, net and gross profit"
                        : "Hide revenue, COGS, net and gross profit"
                    }
                    aria-pressed={profitHidden}
                  >
                    {profitHidden ? <IcEyeOff /> : <IcEye />}
                  </button>
                </>
              ) : (
                <>
                  <span className="home-md3-kpi-lbl">{tile.label}</span>
                  <span className={`home-md3-kpi-val${maskProfit ? " home-md3-kpi-val--masked" : ""}`}>
                    {tile.value}
                  </span>
                  {tile.sub ? (
                    <span className={`home-md3-kpi-sub${maskProfit ? " home-md3-kpi-val--masked" : ""}`}>
                      {tile.sub}
                    </span>
                  ) : null}
                </>
              )}
            </div>
            );
          })}
        </section>

        <div className="home-md3-actions">
          <button type="button" className="home-md3-action home-md3-action--filled" onClick={openNewSale}>
            <IcPlus />
            <span>New sale</span>
          </button>
          <button type="button" className="home-md3-action home-md3-action--tonal" onClick={openNewExpense}>
            <IcSpend />
            <span>Expense</span>
          </button>
        </div>

        <Md3Section title="Recent sales" emptyHint="No sales in this period.">
          {recentSales.length > 0
            ? recentSales.map((sale) => {
                const st = saleStatus(sale, state.settings?.defaultDueDays);
                return (
                  <Md3ListRow
                    key={sale.id}
                    avatarName={sale.customerName}
                    title={sale.customerName}
                    subtitle={[dateHuman(sale.date), sale.item].filter(Boolean).join(" · ")}
                    amount={money(sale.totalSale)}
                    badge={st.text}
                    badgeCls={st.cls}
                    onClick={() => openSaleDetail(sale.id)}
                  />
                );
              })
            : null}
        </Md3Section>

        <Md3Section title="Recent purchases" emptyHint="No purchases in this period.">
          {recentPurchases.length > 0
            ? recentPurchases.map((p) => {
                const due = num(p.outstanding);
                return (
                  <Md3ListRow
                    key={p.id}
                    avatarName={p.supplierName || "S"}
                    title={(p.supplierName || "").trim() || "Supplier"}
                    subtitle={[dateHuman(p.date), p.invoiceRef].filter(Boolean).join(" · ")}
                    amount={money(p.totalAmount)}
                    badge={due > 0.01 ? `Due ${money(due)}` : "Paid"}
                    badgeCls={due > 0.01 ? "s-unpaid" : "s-paid"}
                    onClick={() => openPurchaseDetail?.(p.id)}
                  />
                );
              })
            : null}
        </Md3Section>

        <Md3Section title="Open receivables" emptyHint="All caught up — no open balances.">
          {recentReceivables.length > 0
            ? recentReceivables.map((sale) => {
                const st = saleStatus(sale, state.settings?.defaultDueDays);
                return (
                  <Md3ListRow
                    key={sale.id}
                    avatarName={sale.customerName}
                    title={sale.customerName}
                    subtitle={[dateHuman(sale.date), sale.invoiceNo].filter(Boolean).join(" · ")}
                    amount={money(sale.outstanding)}
                    badge={st.text}
                    badgeCls={st.cls}
                    onClick={() => openSaleDetail(sale.id)}
                  />
                );
              })
            : null}
        </Md3Section>
      </div>
    </div>
  );
}
