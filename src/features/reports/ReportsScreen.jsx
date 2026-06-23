import { useMemo, useState } from "react";
import {
  addDaysStr,
  compareYmdAsc,
  currentMonthStr,
  formatMonthLabel,
  isIncomeTaxExpense,
  isDateInFy,
  money,
  moneyFull,
  num,
  recognizedCogsForSales,
  recognizedCogsForPaymentsAll,
  recognizedCogsForPaymentsInFy,
  recognizedCogsForPaymentsInMonth,
  sumSalePaymentsAll,
  sumSalePaymentsInFy,
  sumSalePaymentsInMonth,
  sumExpenseCashOutAll,
  sumExpenseCashOutInFy,
  sumExpenseCashOutInMonth,
  sumOtherIncomeCashInAll,
  sumOtherIncomeCashInInFy,
  sumOtherIncomeCashInInMonth,
  saleStatus,
  sumBankAccountBalances,
  bankAccountCountsInBalanceSheet,
  dateSlash,
  todayStr,
} from "@/domain/index.js";
import { TabPageChrome } from "@/shared/ui/layout/AppChrome.jsx";

function pctOf(part, whole) {
  if (whole == null || whole <= 0) return null;
  return (num(part) / num(whole)) * 100;
}

function fmtPct(p) {
  if (p == null || Number.isNaN(p)) return "—";
  return `${p.toFixed(1)}%`;
}

export function ReportsScreen({
  sales = [],
  expenses = [],
  otherIncomes = [],
  purchases = [],
  emiEntries = [],
  invRows = [],
  balSum = 0,
  balance,
  fsm,
  fyYear,
  fyStr,
  businessName,
  accountingBasis = "cash",
  defaultDueDays = 30,
  onOpenSidebar,
}) {
  const [range, setRange] = useState("fy");
  const [reportMonth, setReportMonth] = useState(() => currentMonthStr());
  const filtSales = useMemo(() => {
    if (range === "all") return sales;
    if (range === "month") {
      const mk = String(reportMonth || "").slice(0, 7);
      if (mk.length < 7) return [];
      return sales.filter((s) => String(s.date || "").startsWith(mk));
    }
    return sales.filter((s) => isDateInFy(s.date, fsm, fyYear));
  }, [sales, range, fsm, fyYear, reportMonth]);
  const filtExp = useMemo(() => {
    if (range === "all") return expenses;
    if (range === "month") {
      const mk = String(reportMonth || "").slice(0, 7);
      if (mk.length < 7) return [];
      return expenses.filter((e) => String(e.date || "").startsWith(mk));
    }
    return expenses.filter((e) => isDateInFy(e.date, fsm, fyYear));
  }, [expenses, range, fsm, fyYear, reportMonth]);

  const filtPurchases = useMemo(() => {
    const list = Array.isArray(purchases) ? purchases : [];
    if (range === "all") return list;
    if (range === "month") {
      const mk = String(reportMonth || "").slice(0, 7);
      if (mk.length < 7) return [];
      return list.filter((p) => p && String(p.date || "").startsWith(mk));
    }
    return list.filter((p) => p && isDateInFy(p.date, fsm, fyYear));
  }, [purchases, range, fsm, fyYear, reportMonth]);

  const filtOi = useMemo(() => {
    if (range === "all") return otherIncomes;
    if (range === "month") {
      const mk = String(reportMonth || "").slice(0, 7);
      if (mk.length < 7) return [];
      return otherIncomes.filter((x) => x && String(x.date || "").startsWith(mk));
    }
    return otherIncomes.filter((x) => x && isDateInFy(x.date, fsm, fyYear));
  }, [otherIncomes, range, fsm, fyYear, reportMonth]);

  const pl = useMemo(() => {
    const accrual = accountingBasis === "accrual";
    const cogsFromSales = filtSales.reduce((a, s) => a + num(s.totalCost), 0);
    let revenue;
    let cogs;
    let expenseTotal;
    let oiTotal;
    if (accrual) {
      revenue = filtSales.reduce((a, s) => a + num(s.totalSale), 0);
      cogs = recognizedCogsForSales(filtSales, true);
      expenseTotal = filtExp.reduce((a, e) => a + num(e.amount), 0);
      oiTotal = filtOi.reduce((a, x) => a + num(x.amount), 0);
    } else if (range === "month") {
      const mk = String(reportMonth || "").slice(0, 7);
      revenue = mk.length >= 7 ? sumSalePaymentsInMonth(sales, mk) : 0;
      cogs = mk.length >= 7 ? recognizedCogsForPaymentsInMonth(sales, mk) : 0;
      expenseTotal = mk.length >= 7 ? sumExpenseCashOutInMonth(expenses, mk) : 0;
      oiTotal = mk.length >= 7 ? sumOtherIncomeCashInInMonth(otherIncomes, mk) : 0;
    } else if (range === "fy") {
      revenue = sumSalePaymentsInFy(sales, fsm, fyYear);
      cogs = recognizedCogsForPaymentsInFy(sales, fsm, fyYear);
      expenseTotal = sumExpenseCashOutInFy(expenses, fsm, fyYear);
      oiTotal = sumOtherIncomeCashInInFy(otherIncomes, fsm, fyYear);
    } else {
      revenue = sumSalePaymentsAll(sales);
      cogs = recognizedCogsForPaymentsAll(sales);
      expenseTotal = sumExpenseCashOutAll(expenses);
      oiTotal = sumOtherIncomeCashInAll(otherIncomes);
    }
    const taxOp = filtExp.filter((e) => isIncomeTaxExpense(e)).reduce((a, e) => a + num(e.amount), 0);
    const netProfit = revenue - cogs - expenseTotal + oiTotal;
    const pbt = taxOp > 0 ? netProfit + taxOp : netProfit;
    return {
      revenue,
      cogs,
      cogsFromSales,
      expenses: expenseTotal,
      taxExpense: taxOp,
      otherIncome: oiTotal,
      grossProfit: revenue - cogs,
      netProfit,
      pbt,
      pat: netProfit,
    };
  }, [filtSales, filtExp, filtOi, accountingBasis, sales, expenses, otherIncomes, range, reportMonth, fsm, fyYear]);

  const purchasePeriodTotal = useMemo(
    () => filtPurchases.reduce((a, p) => a + num(p.totalAmount), 0),
    [filtPurchases],
  );

  const exec = useMemo(() => {
    const rev = pl.revenue;
    const gp = pl.grossProfit;
    const np = pl.netProfit;
    const invoiced = filtSales.reduce((a, s) => a + num(s.totalSale), 0);
    const receivedOnInvoiceRows = filtSales.reduce((a, s) => a + num(s.received), 0);
    const accrual = accountingBasis === "accrual";
    const received = accrual ? receivedOnInvoiceRows : rev;
    return {
      grossMargin: pctOf(gp, rev),
      netMargin: pctOf(np, rev),
      collection: accrual ? pctOf(received, invoiced) : null,
      expenseRatio: pctOf(pl.expenses, rev),
      received,
    };
  }, [pl, filtSales, accountingBasis]);

  const revenueSpark = useMemo(() => {
    const map = new Map();
    for (const s of sales || []) {
      if (!s || typeof s !== "object") continue;
      const mk = String(s.date || "").slice(0, 7);
      if (mk.length < 7) continue;
      map.set(mk, (map.get(mk) || 0) + num(s.totalSale));
    }
    const keys = [...map.keys()].sort().slice(-6);
    const vals = keys.map((k) => map.get(k) || 0);
    const mx = Math.max(1, ...vals);
    return { keys, vals, mx };
  }, [sales]);

  const saleStats = useMemo(() => {
    const outstanding = filtSales.reduce((a, s) => a + num(s.outstanding), 0);
    const accrual = accountingBasis === "accrual";
    return {
      count: filtSales.length,
      revenue: pl.revenue,
      received: exec.received,
      outstanding,
      revenueLabel: accrual ? "Revenue (invoiced)" : "Revenue (cash collected)",
      collectedLabel: accrual ? "Collected (invoice rows)" : "Collected (payment date)",
    };
  }, [filtSales, accountingBasis, pl.revenue, exec.received]);

  const expByCat = useMemo(() => {
    const map = new Map();
    for (const e of filtExp) {
      const c = e.category || "Other";
      map.set(c, (map.get(c) || 0) + num(e.amount));
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [filtExp]);

  const expTotal = useMemo(() => expByCat.reduce((s, [, v]) => s + v, 0), [expByCat]);

  const receivables = useMemo(
    () =>
      [...sales]
        .filter((s) => s.outstanding > 0)
        .sort((a, b) => {
          const da = a.dueDate || addDaysStr(a.date, 30);
          const db = b.dueDate || addDaysStr(b.date, 30);
          return compareYmdAsc(da, db);
        }),
    [sales],
  );
  const arTotal = useMemo(() => receivables.reduce((a, s) => a + num(s.outstanding), 0), [receivables]);

  const stockLowCt = invRows.filter((r) => r.currentQty <= 0).length;
  const emiLoanSum = emiEntries.reduce((a, e) => a + num(e.loanAmount), 0);
  const bankTotal = sumBankAccountBalances(balance.bankAccounts, bankAccountCountsInBalanceSheet);
  const rangeLabel =
    range === "fy" ? `FY ${fyStr}` : range === "month" ? formatMonthLabel(String(reportMonth).slice(0, 7)) : "All time";

  return (
    <TabPageChrome title="Reports" onOpenSidebar={onOpenSidebar} className="tab-page--reports">
      <a href="#rep-main" className="rep-skip">
        Skip to main content
      </a>

      <header className="rep-hdr rep-hdr--minimal">
        <div className="rep-hdr-row">
          <p className="rep-hdr-co">{businessName || "My Business"}</p>
          <span className="rep-hdr-pill">{rangeLabel}</span>
        </div>
        <p className="rep-hdr-meta">{dateSlash(todayStr())} · {accountingBasis === "accrual" ? "Accrual" : "Cash (operational)"} basis</p>
      </header>

      <div className="rep-period-bar rep-period-bar--minimal">
        <div className="cg-toggle-row rep-toggle cg-toggle-row-3">
          <button type="button" className={`cg-toggle${range === "fy" ? " active" : ""}`} onClick={() => setRange("fy")}>
            FY {fyStr}
          </button>
          <button type="button" className={`cg-toggle${range === "all" ? " active" : ""}`} onClick={() => setRange("all")}>
            All time
          </button>
          <button type="button" className={`cg-toggle${range === "month" ? " active" : ""}`} onClick={() => setRange("month")}>
            Month
          </button>
        </div>
        {range === "month" && (
          <div className="rep-month-picker">
            <label className="rep-month-lbl" htmlFor="rep-month-input">
              Month
            </label>
            <input id="rep-month-input" type="month" className="month-input" value={reportMonth} onChange={(e) => setReportMonth(e.target.value)} />
          </div>
        )}
      </div>

      <div id="rep-main" className="tab-page-scroll rep-page rep-page--minimal" tabIndex={-1}>
        {/* Executive snapshot */}
        <section className="rep-section rep-section--minimal rep-section--flush" aria-labelledby="rep-snapshot-title">
          <h3 id="rep-snapshot-title" className="rep-st">
            Snapshot
          </h3>
          <div className="rep-snap">
            <div className="rep-snap-hero">
              <span className="rep-snap-lbl">Net profit</span>
              <span className={`rep-snap-val ${pl.netProfit >= 0 ? "rep-snap-pos" : "rep-snap-neg"}`}>{moneyFull(pl.netProfit)}</span>
            </div>
            <ul className="rep-snap-grid" role="list">
              <li>
                <span className="rep-snap-k">Gross margin</span>
                <span className="rep-snap-v">{fmtPct(exec.grossMargin)}</span>
              </li>
              <li>
                <span className="rep-snap-k">Net margin</span>
                <span className="rep-snap-v">{fmtPct(exec.netMargin)}</span>
              </li>
              <li>
                <span className="rep-snap-k">Collection rate</span>
                <span className="rep-snap-v" title={accountingBasis === "accrual" ? "Collected ÷ invoiced revenue in this period" : "Shown on accrual only to avoid mixed-cohort percentage"}>
                  {fmtPct(exec.collection)}
                </span>
              </li>
              <li>
                <span className="rep-snap-k">Op. expense ratio</span>
                <span className="rep-snap-v" title="Operating expenses ÷ revenue">
                  {fmtPct(exec.expenseRatio)}
                </span>
              </li>
            </ul>
          </div>
          {(purchasePeriodTotal > 0 || num(balSum.purchaseCredit) > 0 || pl.otherIncome > 0) && (
            <div className="rep-snap-extra">
              {purchasePeriodTotal > 0 && (
                <span>
                  Purchases (period): <strong>{moneyFull(purchasePeriodTotal)}</strong>
                </span>
              )}
              {num(balSum.purchaseCredit) > 0 && (
                <span>
                  Supplier credit open: <strong>{moneyFull(balSum.purchaseCredit)}</strong>
                </span>
              )}
              {pl.otherIncome > 0 && (
                <span>
                  Other income: <strong className="cg-pos">+{moneyFull(pl.otherIncome)}</strong>
                </span>
              )}
            </div>
          )}
        </section>

        {/* P&L */}
        <section className="rep-section rep-section--minimal" aria-labelledby="rep-pl-title">
          <h3 id="rep-pl-title" className="rep-st">
            Profit &amp; loss
          </h3>
          {revenueSpark.vals.length > 1 && (
            <div className="rep-spark rep-spark--minimal" aria-hidden>
              <svg width="100%" height="36" viewBox="0 0 120 36" preserveAspectRatio="none">
                <polyline
                  fill="none"
                  stroke="var(--primary)"
                  strokeWidth="1.25"
                  opacity="0.85"
                  points={revenueSpark.vals
                    .map((v, i) => {
                      const x = (i / Math.max(1, revenueSpark.vals.length - 1)) * 118 + 1;
                      const y = 34 - (v / revenueSpark.mx) * 30;
                      return `${x},${y}`;
                    })
                    .join(" ")}
                />
              </svg>
              <span className="rep-spark-cap">Invoiced revenue — last {revenueSpark.vals.length} months</span>
            </div>
          )}
          <div className="rep-lines rep-lines--tight">
            <div className="rep-line">
              <span>{accountingBasis === "accrual" ? "Revenue (invoiced)" : "Revenue (cash collected)"}</span>
              <strong>{moneyFull(pl.revenue)}</strong>
            </div>
            <div className="rep-line">
              <span>Cost of goods sold</span>
              <strong>−{moneyFull(pl.cogs)}</strong>
            </div>
            <div className="rep-line rep-line-sub rep-line-sub--soft">
              <span>Gross profit</span>
              <strong className={pl.grossProfit >= 0 ? "cg-pos" : "cg-neg"}>{moneyFull(pl.grossProfit)}</strong>
            </div>
            {pl.otherIncome > 0 ? (
              <div className="rep-line">
                <span>Other income</span>
                <strong className="cg-pos">+{moneyFull(pl.otherIncome)}</strong>
              </div>
            ) : null}
            <div className="rep-line">
              <span>Operating expenses</span>
              <strong>−{moneyFull(pl.expenses)}</strong>
            </div>
            {pl.taxExpense > 0 ? (
              <>
                <div className="rep-line rep-line-total rep-line-total--soft">
                  <span>Profit before tax</span>
                  <strong className={pl.pbt >= 0 ? "cg-pos" : "cg-neg"}>{moneyFull(pl.pbt)}</strong>
                </div>
                <div className="rep-line">
                  <span>Income tax</span>
                  <strong className="cg-neg">−{moneyFull(pl.taxExpense)}</strong>
                </div>
                <div className="rep-line rep-line-total">
                  <span>Net profit after tax</span>
                  <strong className={pl.pat >= 0 ? "cg-pos" : "cg-neg"}>{moneyFull(pl.pat)}</strong>
                </div>
              </>
            ) : (
              <div className="rep-line rep-line-total">
                <span>Net profit</span>
                <strong className={pl.netProfit >= 0 ? "cg-pos" : "cg-neg"}>{moneyFull(pl.netProfit)}</strong>
              </div>
            )}
          </div>
        </section>

        {/* Sales */}
        <section className="rep-section rep-section--minimal" aria-labelledby="rep-sales-title">
          <h3 id="rep-sales-title" className="rep-st">
            Sales &amp; collections
          </h3>
          <div className="rep-kpi-grid rep-kpi-grid--minimal">
            <div className="rep-kpi">
              <span className="rep-kpi-l">Invoices</span>
              <span className="rep-kpi-v">{saleStats.count}</span>
            </div>
            <div className="rep-kpi">
              <span className="rep-kpi-l">{saleStats.revenueLabel}</span>
              <span className="rep-kpi-v">{money(saleStats.revenue)}</span>
            </div>
            <div className="rep-kpi">
              <span className="rep-kpi-l">{saleStats.collectedLabel}</span>
              <span className="rep-kpi-v">{money(saleStats.received)}</span>
            </div>
            <div className="rep-kpi">
              <span className="rep-kpi-l">Outstanding</span>
              <span className="rep-kpi-v">{money(saleStats.outstanding)}</span>
            </div>
          </div>
        </section>

        {/* Expenses — single visual: bars */}
        <section className="rep-section rep-section--minimal" aria-labelledby="rep-exp-title">
          <h3 id="rep-exp-title" className="rep-st">
            Expenses by category
          </h3>
          {expByCat.length === 0 ? (
            <p className="rep-empty">No expenses in this range.</p>
          ) : (
            <div className="rep-exp-list">
              {expByCat.map(([cat, amt]) => (
                <div key={cat} className="rep-exp-row">
                  <div className="rep-exp-top">
                    <span className="rep-exp-name">{cat}</span>
                    <span className="rep-exp-amt">{moneyFull(amt)}</span>
                  </div>
                  <div className="rep-exp-track" aria-hidden>
                    <div className="rep-exp-fill" style={{ width: `${expTotal > 0 ? Math.round((amt / expTotal) * 100) : 0}%` }} />
                  </div>
                  <span className="rep-exp-pct">{expTotal > 0 ? `${Math.round((amt / expTotal) * 100)}%` : ""}</span>
                </div>
              ))}
              <div className="rep-exp-total">
                <span>Total</span>
                <strong>{moneyFull(expTotal)}</strong>
              </div>
            </div>
          )}
        </section>

        <section className="rep-section rep-section--minimal" aria-labelledby="rep-ar-title">
          <h3 id="rep-ar-title" className="rep-st">
            Receivables
          </h3>
          <p className="rep-muted">Open invoices (all time), oldest due first.</p>
          <div className="rep-kpi-grid rep-kpi-grid--minimal rep-kpi-grid--2">
            <div className="rep-kpi">
              <span className="rep-kpi-l">Outstanding</span>
              <span className="rep-kpi-v">{money(arTotal)}</span>
            </div>
            <div className="rep-kpi">
              <span className="rep-kpi-l">Open count</span>
              <span className="rep-kpi-v">{receivables.length}</span>
            </div>
          </div>
          {receivables.length > 0 && (
            <div className="rep-table-wrap">
              <table className="rep-table rep-table--minimal rep-table--stack">
                <thead>
                  <tr>
                    <th>Invoice</th>
                    <th>Customer</th>
                    <th>Due</th>
                    <th className="rep-num">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {receivables.slice(0, 20).map((s) => {
                    const dd = s.dueDate || addDaysStr(s.date, defaultDueDays);
                    const st = saleStatus(s, defaultDueDays);
                    return (
                      <tr key={s.id}>
                        <td data-label="Invoice">{s.invoiceNo || "—"}</td>
                        <td className="rep-ellipsis" data-label="Customer">{s.customerName || "—"}</td>
                        <td data-label="Due">
                          <span className={`rep-due ${st.cls}`}>{dateSlash(dd)}</span>
                        </td>
                        <td className="rep-num" data-label="Amount">{moneyFull(s.outstanding)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rep-section rep-section--minimal" aria-labelledby="rep-inv-title">
          <h3 id="rep-inv-title" className="rep-st">
            Inventory
          </h3>
          <div className="rep-kpi-grid rep-kpi-grid--minimal">
            <div className="rep-kpi">
              <span className="rep-kpi-l">Stock value</span>
              <span className="rep-kpi-v">{money(invRows.reduce((a, r) => a + r.stockValue, 0))}</span>
            </div>
            <div className="rep-kpi">
              <span className="rep-kpi-l">SKUs</span>
              <span className="rep-kpi-v">{invRows.length}</span>
            </div>
            <div className="rep-kpi">
              <span className="rep-kpi-l">Out of stock</span>
              <span className="rep-kpi-v" style={{ color: stockLowCt > 0 ? "var(--danger)" : "inherit" }}>
                {stockLowCt}
              </span>
            </div>
            <div className="rep-kpi">
              <span className="rep-kpi-l">EMI financed</span>
              <span className="rep-kpi-v">{money(emiLoanSum)}</span>
            </div>
          </div>
        </section>

        <section className="rep-section rep-section--minimal rep-section-last" aria-labelledby="rep-pos-title">
          <h3 id="rep-pos-title" className="rep-st">
            Position (today)
          </h3>
          <div className="rep-lines rep-lines--tight">
            <div className="rep-line">
              <span>Cash &amp; bank</span>
              <strong>{moneyFull(bankTotal)}</strong>
            </div>
            <div className="rep-line">
              <span>Receivables</span>
              <strong>{moneyFull(balSum.outstanding)}</strong>
            </div>
            <div className="rep-line">
              <span>Inventory</span>
              <strong>{moneyFull(balSum.stockVal)}</strong>
            </div>
            <div className="rep-line rep-line-sub rep-line-sub--soft">
              <span>Total assets</span>
              <strong>{moneyFull(balSum.totalAssets)}</strong>
            </div>
            <div className="rep-line">
              <span>Total liabilities</span>
              <strong>{moneyFull(balSum.totalLiab)}</strong>
            </div>
            <div className="rep-line rep-line-total">
              <span>Owner&apos;s equity</span>
              <strong className={balSum.netCapital >= 0 ? "cg-pos" : "cg-neg"}>{moneyFull(balSum.netCapital)}</strong>
            </div>
          </div>
        </section>
      </div>
    </TabPageChrome>
  );
}
