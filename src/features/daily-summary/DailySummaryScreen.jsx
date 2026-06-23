import { useMemo } from "react";
import {
  num,
  money,
  dateHuman,
  todayStr,
  stockInCashAmount,
  sumExpenseCashOutOnDay,
  sumSalePaymentsOnDay,
  sumPurchasePaymentsOnDay,
} from "@/domain/index.js";
import { IcCalDay, IcIncome, IcSales, IcSpend } from "@/shared/ui/icons/AppIcons.jsx";
import { TabPageChrome, EmptyState } from "@/shared/ui/layout/AppChrome.jsx";

export function DailySummaryScreen({
  sales,
  expenses,
  otherIncomes = [],
  inventoryEntries = [],
  purchases = [],
  onOpenSale,
  onOpenExpense,
  onOpenOtherIncome,
  onOpenSidebar,
}) {
  const today = todayStr();
  const todaySales = useMemo(() => sales.filter((s) => s.date === today), [sales, today]);
  const todayExpenses = useMemo(() => expenses.filter((e) => e.date === today), [expenses, today]);
  const todayOi = useMemo(
    () => (otherIncomes || []).filter((x) => x && String(x.date || "").slice(0, 10) === today && String(x.bankAccountId || "").trim()),
    [otherIncomes, today],
  );
  const todayStockInCash = useMemo(() => {
    let o = 0;
    for (const inv of inventoryEntries || []) {
      if (!inv || inv.type === "out") continue;
      if (String(inv.date || "").slice(0, 10) !== today) continue;
      if (!String(inv.bankAccountId || "").trim()) continue;
      o += stockInCashAmount(inv);
    }
    return o;
  }, [inventoryEntries, today]);

  const revenue = todaySales.reduce((s, x) => s + num(x.totalSale), 0);
  const collected = useMemo(() => sumSalePaymentsOnDay(sales, today), [sales, today]);
  const outstandingOpen = useMemo(() => (sales || []).reduce((s, x) => s + num(x.outstanding), 0), [sales]);
  const spent = useMemo(() => sumExpenseCashOutOnDay(expenses, today), [expenses, today]);
  const supplierPaid = useMemo(() => sumPurchasePaymentsOnDay(purchases, today), [purchases, today]);
  const otherInCash = todayOi.reduce((s, x) => s + num(x.amount), 0);
  const net = collected + otherInCash - spent - todayStockInCash - supplierPaid;

  return (
    <TabPageChrome
      className="tab-page--daily"
      title="Daily"
      onOpenSidebar={onOpenSidebar}
      right={<span style={{ fontSize: "0.76rem", color: "var(--muted)", paddingRight: 8 }}>{dateHuman(today)}</span>}
    >
      <div className="tab-page-scroll daily-summary-scroll">
        <div className="daily-kpi-grid">
        <div className="daily-kpi">
          <div className="daily-kpi-lbl">Invoices (count)</div>
          <div className="daily-kpi-val blue">{todaySales.length}</div>
        </div>
        <div className="daily-kpi">
          <div className="daily-kpi-lbl">Invoiced (turnover)</div>
          <div className="daily-kpi-val blue">{money(revenue)}</div>
        </div>
        <div className="daily-kpi" title="Payments recorded today (by payment date), linked to a bank/cash account.">
          <div className="daily-kpi-lbl">Cash received</div>
          <div className="daily-kpi-val green">{money(collected)}</div>
        </div>
        <div className="daily-kpi" title="Expense payments today linked to a bank/cash account.">
          <div className="daily-kpi-lbl">Expenses (paid)</div>
          <div className="daily-kpi-val red">{money(spent)}</div>
        </div>
        <div className="daily-kpi" title="Total unpaid invoice balances (all open invoices).">
          <div className="daily-kpi-lbl">Receivables (open)</div>
          <div className="daily-kpi-val orange">{money(outstandingOpen)}</div>
        </div>
        <div className="daily-kpi">
          <div className="daily-kpi-lbl">Other income (cash)</div>
          <div className="daily-kpi-val green">{money(otherInCash)}</div>
        </div>
        <div className="daily-kpi">
          <div className="daily-kpi-lbl">Stock paid (cash)</div>
          <div className="daily-kpi-val red">{money(todayStockInCash)}</div>
        </div>
        <div className="daily-kpi" title="Supplier payments recorded today (Purchases module), linked to a bank/cash account.">
          <div className="daily-kpi-lbl">Supplier payments</div>
          <div className="daily-kpi-val red">{money(supplierPaid)}</div>
        </div>
        <div className="daily-kpi">
          <div className="daily-kpi-lbl">Net cash (today)</div>
          <div className={`daily-kpi-val ${net >= 0 ? "green" : "red"}`}>{money(net)}</div>
        </div>
        </div>
        <div className="daily-section-hd">Today&apos;s Activity</div>
        <div className="list-area">
        {todaySales.length === 0 && todayExpenses.length === 0 && todayOi.length === 0 ? (
          <EmptyState icon={<IcCalDay />} title="No activity today" />
        ) : (
          <>
            {todaySales.map((s) => (
              <button key={s.id} type="button" className="activity-row" style={{ width: "100%", border: "none", textAlign: "left" }} onClick={() => onOpenSale(s.id)}>
                <div className="activity-icon-wrap activity-icon-sale">
                  <IcSales />
                </div>
                <div className="activity-info">
                  <div className="activity-title">{s.customerName}</div>
                  <div className="activity-sub">
                    {s.invoiceNo}
                    {s.item ? ` · ${s.item}` : ""}
                  </div>
                </div>
                <div className={`activity-amount ${num(s.outstanding) > 0 ? "red" : "green"}`}>{money(s.totalSale)}</div>
              </button>
            ))}
            {todayExpenses.map((e) => (
              <button
                key={e.id}
                type="button"
                className="activity-row"
                style={{ width: "100%", border: "none", textAlign: "left" }}
                onClick={() => onOpenExpense(e.id)}
              >
                <div className="activity-icon-wrap activity-icon-expense">
                  <IcSpend />
                </div>
                <div className="activity-info">
                  <div className="activity-title">{e.description || e.category}</div>
                  <div className="activity-sub">{e.category}</div>
                </div>
                <div className="activity-amount red">{money(e.amount)}</div>
              </button>
            ))}
            {todayOi.map((x) => (
              <button
                key={x.id}
                type="button"
                className="activity-row"
                style={{ width: "100%", border: "none", textAlign: "left" }}
                onClick={() => onOpenOtherIncome(x.id)}
              >
                <div className="activity-icon-wrap activity-icon-sale">
                  <IcIncome />
                </div>
                <div className="activity-info">
                  <div className="activity-title">{(x.description || "").trim() || x.category || "Other income"}</div>
                  <div className="activity-sub">{x.category}</div>
                </div>
                <div className="activity-amount green">{money(x.amount)}</div>
              </button>
            ))}
          </>
        )}
        </div>
      </div>
    </TabPageChrome>
  );
}
