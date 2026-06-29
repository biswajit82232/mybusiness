/**
 * Profit & loss snapshot for reports (accrual or cash basis).
 */
import {
  isIncomeTaxExpense,
  num,
  roundMoney2,
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
} from "./appModel.js";
import { signedSaleAmount } from "./saleDocuments.js";
import { isDateInReportPeriod, normalizeReportPeriod } from "./reportPeriod.js";

function filterByPeriod(rows, period, fsm, fyYear, dateKey = "date") {
  return (rows || []).filter((r) => r && isDateInReportPeriod(r[dateKey], period, fsm, fyYear));
}

/**
 * @param {object} opts
 * @returns {{ revenue: number, cogs: number, expenses: number, otherIncome: number, grossProfit: number, netProfit: number, taxExpense: number, pbt: number, pat: number }}
 */
export function computePlSnapshot({
  sales,
  expenses,
  otherIncomes,
  accountingBasis,
  period,
  fsm,
  fyYear,
}) {
  const p = normalizeReportPeriod(period, fsm, fyYear);
  const accrual = accountingBasis === "accrual";
  const filtSales = filterByPeriod(sales, p, fsm, fyYear);
  const filtExp = filterByPeriod(expenses, p, fsm, fyYear);
  const filtOi = filterByPeriod(otherIncomes, p, fsm, fyYear);

  let revenue;
  let cogs;
  let expenseTotal;
  let oiTotal;

  if (accrual) {
    revenue = filtSales.reduce((a, s) => a + signedSaleAmount(s), 0);
    cogs = recognizedCogsForSales(filtSales, true);
    expenseTotal = filtExp.reduce((a, e) => a + num(e.amount), 0);
    oiTotal = filtOi.reduce((a, x) => a + num(x.amount), 0);
  } else if (p.mode === "month") {
    const mk = String(p.reportMonth || "").slice(0, 7);
    revenue = mk.length >= 7 ? sumSalePaymentsInMonth(sales, mk) : 0;
    cogs = mk.length >= 7 ? recognizedCogsForPaymentsInMonth(sales, mk) : 0;
    expenseTotal = mk.length >= 7 ? sumExpenseCashOutInMonth(expenses, mk) : 0;
    oiTotal = mk.length >= 7 ? sumOtherIncomeCashInInMonth(otherIncomes, mk) : 0;
  } else if (p.mode === "fy") {
    revenue = sumSalePaymentsInFy(sales, fsm, fyYear);
    cogs = recognizedCogsForPaymentsInFy(sales, fsm, fyYear);
    expenseTotal = sumExpenseCashOutInFy(expenses, fsm, fyYear);
    oiTotal = sumOtherIncomeCashInInFy(otherIncomes, fsm, fyYear);
  } else if (p.mode === "all") {
    revenue = sumSalePaymentsAll(sales);
    cogs = recognizedCogsForPaymentsAll(sales);
    expenseTotal = sumExpenseCashOutAll(expenses);
    oiTotal = sumOtherIncomeCashInAll(otherIncomes);
  } else {
    revenue = 0;
    cogs = 0;
    expenseTotal = 0;
    oiTotal = 0;
    for (const s of sales || []) {
      if (!isDateInReportPeriod(s.date, p, fsm, fyYear)) continue;
      for (const pe of s.paymentEntries || []) {
        if (isDateInReportPeriod(pe.date || s.date, p, fsm, fyYear)) revenue += num(pe.amount);
      }
      if (!s.paymentEntries?.length && num(s.received) > 0 && isDateInReportPeriod(s.date, p, fsm, fyYear)) {
        revenue += num(s.received);
      }
    }
    revenue = roundMoney2(revenue);
    for (const e of expenses || []) {
      if (isDateInReportPeriod(e.date, p, fsm, fyYear)) expenseTotal += num(e.amount);
    }
    for (const oi of otherIncomes || []) {
      if (isDateInReportPeriod(oi.date, p, fsm, fyYear)) oiTotal += num(oi.amount);
    }
    cogs = recognizedCogsForSales(filtSales.filter((s) => isDateInReportPeriod(s.date, p, fsm, fyYear)), false);
  }

  const grossProfit = revenue - cogs;
  const netProfit = revenue - cogs - expenseTotal + oiTotal;
  const taxExpense = filtExp.filter((e) => isIncomeTaxExpense(e)).reduce((a, e) => a + num(e.amount), 0);
  const pbt = taxExpense > 0 ? netProfit + taxExpense : netProfit;
  return {
    revenue,
    cogs,
    expenses: expenseTotal,
    otherIncome: oiTotal,
    grossProfit,
    netProfit,
    taxExpense,
    pbt,
    pat: netProfit,
  };
}

/** Per-invoice profit for bill-wise P&L. */
export function buildBillWisePlReport(sales, period, fsm, fyYear) {
  const rows = (sales || [])
    .filter((s) => s && isDateInReportPeriod(s.date, period, fsm, fyYear))
    .map((s) => {
      const revenue = signedSaleAmount(s);
      const cost = num(s.totalCost);
      const profit = revenue - cost;
      return {
        date: String(s.date || "").slice(0, 10),
        invoiceNo: s.invoiceNo || "—",
        customerName: s.customerName || "—",
        docType: s.docType || "invoice",
        revenue,
        cost,
        profit,
        marginPct: revenue !== 0 ? (profit / Math.abs(revenue)) * 100 : null,
      };
    })
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));

  const totals = rows.reduce(
    (acc, r) => ({
      revenue: acc.revenue + r.revenue,
      cost: acc.cost + r.cost,
      profit: acc.profit + r.profit,
    }),
    { revenue: 0, cost: 0, profit: 0 },
  );
  return { rows, totals };
}
