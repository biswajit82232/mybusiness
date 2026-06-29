/**
 * Business report data builders — sales, purchase, stock, daybook, etc.
 */
import {
  compareYmdAsc,
  compareYmdDesc,
  entityTimeMsFromId,
  normSaleLineItems,
  normalizePaymentEntries,
  normalizePurchasePaymentEntries,
  num,
  roundMoney2,
  stockInCashAmount,
} from "./appModel.js";
import {
  isOutwardGstSupply,
  normalizeDocType,
  saleDocShortLabel,
  signedOutstanding,
  signedReceived,
  signedSaleAmount,
} from "./saleDocuments.js";
import { isDateInReportPeriod, normalizeReportPeriod } from "./reportPeriod.js";

function inPeriod(dateStr, period, fsm, fyYear) {
  return isDateInReportPeriod(dateStr, period, fsm, fyYear);
}

function filterSales(sales, period, fsm, fyYear) {
  return (sales || []).filter((s) => s && inPeriod(s.date, period, fsm, fyYear));
}

function filterPurchases(purchases, period, fsm, fyYear) {
  return (purchases || []).filter((p) => p && inPeriod(p.date, period, fsm, fyYear));
}

function filterExpenses(expenses, period, fsm, fyYear) {
  return (expenses || []).filter((e) => e && inPeriod(e.date, period, fsm, fyYear));
}

function filterOtherIncomes(otherIncomes, period, fsm, fyYear) {
  return (otherIncomes || []).filter((x) => x && inPeriod(x.date, period, fsm, fyYear));
}

/** Tax invoices + CN/DN (standard sales). */
function isStandardSaleDoc(sale) {
  const d = normalizeDocType(sale?.docType);
  return d === "invoice" || d === "creditNote" || d === "debitNote";
}

/** Bill of supply and non-GST outward docs. */
function isOtherSaleDoc(sale) {
  return normalizeDocType(sale?.docType) === "billOfSupply";
}

export function buildSalesReport(sales, period, fsm, fyYear) {
  const rows = filterSales(sales, period, fsm, fyYear)
    .filter(isStandardSaleDoc)
    .map((s) => ({
      date: String(s.date || "").slice(0, 10),
      invoiceNo: s.invoiceNo || "—",
      docType: normalizeDocType(s.docType),
      customerName: s.customerName || "—",
      amount: signedSaleAmount(s),
      received: signedReceived(s),
      outstanding: signedOutstanding(s),
    }))
    .sort((a, b) => compareYmdDesc(a.date, b.date));

  const totals = rows.reduce(
    (acc, r) => ({
      amount: acc.amount + r.amount,
      received: acc.received + r.received,
      outstanding: acc.outstanding + r.outstanding,
    }),
    { amount: 0, received: 0, outstanding: 0 },
  );
  return { rows, totals, count: rows.length };
}

export function buildSalesOutstandingReport(sales, period, fsm, fyYear) {
  const p = normalizeReportPeriod(period, fsm, fyYear);
  const asOf = p.toDate || p.fromDate || "";
  const rows = (sales || [])
    .filter((s) => s && signedOutstanding(s) > 0.01)
    .filter((s) => {
      const d = String(s.date || "").slice(0, 10);
      if (p.mode === "all") return true;
      if (asOf && d > asOf) return false;
      return inPeriod(s.date, period, fsm, fyYear) || (asOf && d <= asOf);
    })
    .map((s) => ({
      date: String(s.date || "").slice(0, 10),
      invoiceNo: s.invoiceNo || "—",
      customerName: s.customerName || "—",
      docType: normalizeDocType(s.docType),
      amount: signedSaleAmount(s),
      outstanding: signedOutstanding(s),
      dueDate: String(s.dueDate || "").slice(0, 10),
    }))
    .sort((a, b) => compareYmdAsc(a.dueDate || a.date, b.dueDate || b.date));

  const totalOutstanding = roundMoney2(rows.reduce((s, r) => s + r.outstanding, 0));
  return { rows, totalOutstanding, count: rows.length };
}

export function buildSalesProductReport(sales, period, fsm, fyYear) {
  const map = new Map();
  for (const sale of filterSales(sales, period, fsm, fyYear).filter(isStandardSaleDoc)) {
    const sign = signedSaleAmount(sale) >= 0 ? 1 : -1;
    for (const li of normSaleLineItems(sale.lineItems, sale)) {
      const key = String(li.item || "").trim() || "—";
      const qty = num(li.qty) * sign;
      const amount = roundMoney2(num(li.qty) * num(li.salePrice) * sign);
      const prev = map.get(key) || { product: key, qty: 0, amount: 0, bills: 0 };
      prev.qty = roundMoney2(prev.qty + qty);
      prev.amount = roundMoney2(prev.amount + amount);
      prev.bills += 1;
      map.set(key, prev);
    }
  }
  const rows = [...map.values()].sort((a, b) => b.amount - a.amount);
  const totals = rows.reduce((acc, r) => ({ qty: acc.qty + r.qty, amount: acc.amount + r.amount }), { qty: 0, amount: 0 });
  return { rows, totals };
}

export function buildInwardPaymentReport(sales, period, fsm, fyYear) {
  const rows = [];
  for (const sale of sales || []) {
    if (!sale) continue;
    for (const pe of normalizePaymentEntries(sale)) {
      const d = String(pe.date || sale.date || "").slice(0, 10);
      if (!inPeriod(d, period, fsm, fyYear)) continue;
      rows.push({
        date: d,
        invoiceNo: sale.invoiceNo || "—",
        customerName: sale.customerName || "—",
        amount: roundMoney2(num(pe.amount)),
        mode: pe.mode || "—",
      });
    }
  }
  rows.sort((a, b) => compareYmdDesc(a.date, b.date));
  const total = roundMoney2(rows.reduce((s, r) => s + r.amount, 0));
  return { rows, total, count: rows.length };
}

export function buildPurchaseReport(purchases, period, fsm, fyYear) {
  const rows = filterPurchases(purchases, period, fsm, fyYear).map((p) => ({
    date: String(p.date || "").slice(0, 10),
    invoiceRef: p.invoiceRef || "—",
    supplierName: p.supplierName || "—",
    amount: num(p.totalAmount),
    paid: num(p.received),
    outstanding: num(p.outstanding),
  }));
  rows.sort((a, b) => compareYmdDesc(a.date, b.date));
  const totals = rows.reduce(
    (acc, r) => ({ amount: acc.amount + r.amount, paid: acc.paid + r.paid, outstanding: acc.outstanding + r.outstanding }),
    { amount: 0, paid: 0, outstanding: 0 },
  );
  return { rows, totals, count: rows.length };
}

export function buildPurchaseOutstandingReport(purchases, period, fsm, fyYear) {
  const p = normalizeReportPeriod(period, fsm, fyYear);
  const asOf = p.toDate || "";
  const rows = (purchases || [])
    .filter((pur) => pur && num(pur.outstanding) > 0.01)
    .filter((pur) => {
      const d = String(pur.date || "").slice(0, 10);
      if (p.mode === "all") return true;
      if (asOf && d > asOf) return false;
      return inPeriod(pur.date, period, fsm, fyYear) || (asOf && d <= asOf);
    })
    .map((pur) => ({
      date: String(pur.date || "").slice(0, 10),
      invoiceRef: pur.invoiceRef || "—",
      supplierName: pur.supplierName || "—",
      amount: num(pur.totalAmount),
      outstanding: num(pur.outstanding),
      dueDate: String(pur.dueDate || "").slice(0, 10),
    }))
    .sort((a, b) => compareYmdAsc(a.dueDate || a.date, b.dueDate || b.date));
  const totalOutstanding = roundMoney2(rows.reduce((s, r) => s + r.outstanding, 0));
  return { rows, totalOutstanding, count: rows.length };
}

export function buildPurchaseProductReport(purchases, period, fsm, fyYear) {
  const map = new Map();
  for (const pur of filterPurchases(purchases, period, fsm, fyYear)) {
    for (const li of pur.lines || []) {
      const key = String(li.item || "").trim() || "—";
      const qty = num(li.qty);
      const amount = roundMoney2(qty * num(li.costPerUnit));
      const prev = map.get(key) || { product: key, qty: 0, amount: 0, bills: 0 };
      prev.qty = roundMoney2(prev.qty + qty);
      prev.amount = roundMoney2(prev.amount + amount);
      prev.bills += 1;
      map.set(key, prev);
    }
  }
  const rows = [...map.values()].sort((a, b) => b.amount - a.amount);
  const totals = rows.reduce((acc, r) => ({ qty: acc.qty + r.qty, amount: acc.amount + r.amount }), { qty: 0, amount: 0 });
  return { rows, totals };
}

export function buildOutwardPaymentReport(purchases, period, fsm, fyYear) {
  const rows = [];
  for (const pur of purchases || []) {
    if (!pur) continue;
    for (const pe of normalizePurchasePaymentEntries(pur)) {
      const d = String(pe.date || pur.date || "").slice(0, 10);
      if (!inPeriod(d, period, fsm, fyYear)) continue;
      rows.push({
        date: d,
        invoiceRef: pur.invoiceRef || "—",
        supplierName: pur.supplierName || "—",
        amount: roundMoney2(num(pe.amount)),
      });
    }
  }
  rows.sort((a, b) => compareYmdDesc(a.date, b.date));
  const total = roundMoney2(rows.reduce((s, r) => s + r.amount, 0));
  return { rows, total, count: rows.length };
}

export function buildOtherDocumentReport(sales, period, fsm, fyYear) {
  const rows = filterSales(sales, period, fsm, fyYear)
    .filter(isOtherSaleDoc)
    .map((s) => ({
      date: String(s.date || "").slice(0, 10),
      invoiceNo: s.invoiceNo || "—",
      customerName: s.customerName || "—",
      amount: signedSaleAmount(s),
      received: signedReceived(s),
      outstanding: signedOutstanding(s),
    }))
    .sort((a, b) => compareYmdDesc(a.date, b.date));
  const totals = rows.reduce(
    (acc, r) => ({ amount: acc.amount + r.amount, received: acc.received + r.received, outstanding: acc.outstanding + r.outstanding }),
    { amount: 0, received: 0, outstanding: 0 },
  );
  return { rows, totals, count: rows.length };
}

export function buildOtherDocumentProductReport(sales, period, fsm, fyYear) {
  const map = new Map();
  for (const sale of filterSales(sales, period, fsm, fyYear).filter(isOtherSaleDoc)) {
    for (const li of normSaleLineItems(sale.lineItems, sale)) {
      const key = String(li.item || "").trim() || "—";
      const qty = num(li.qty);
      const amount = roundMoney2(qty * num(li.salePrice));
      const prev = map.get(key) || { product: key, qty: 0, amount: 0, bills: 0 };
      prev.qty = roundMoney2(prev.qty + qty);
      prev.amount = roundMoney2(prev.amount + amount);
      prev.bills += 1;
      map.set(key, prev);
    }
  }
  const rows = [...map.values()].sort((a, b) => b.amount - a.amount);
  const totals = rows.reduce((acc, r) => ({ qty: acc.qty + r.qty, amount: acc.amount + r.amount }), { qty: 0, amount: 0 });
  return { rows, totals };
}

export function buildCompanyOutstandingReport(sales, purchases, balSum = {}) {
  const receivables = roundMoney2(
    (sales || []).reduce((s, x) => s + signedOutstanding(x), 0),
  );
  const payables = roundMoney2(
    (purchases || []).reduce((s, p) => s + num(p.outstanding), 0),
  );
  return {
    receivables,
    payables,
    net: roundMoney2(receivables - payables),
    purchaseCredit: num(balSum.purchaseCredit),
    customerAdvance: num(balSum.customerAdvanceLiability),
  };
}

export function buildStockReport(invRows = []) {
  const rows = (invRows || []).map((r) => ({
    product: r.item || "—",
    sku: r.sku || "—",
    qty: num(r.currentQty),
    avgCost: num(r.avgCost),
    stockValue: num(r.stockValue),
    branchId: r.branchId || "",
  }));
  rows.sort((a, b) => b.stockValue - a.stockValue);
  const totals = rows.reduce(
    (acc, r) => ({ qty: acc.qty + r.qty, stockValue: acc.stockValue + r.stockValue }),
    { qty: 0, stockValue: 0 },
  );
  const outOfStock = rows.filter((r) => r.qty <= 0).length;
  return { rows, totals, outOfStock, skuCount: rows.length };
}

export function buildProductReport(invRows = [], sales = [], purchases = [], period, fsm, fyYear) {
  const stock = buildStockReport(invRows);
  const salesProd = buildSalesProductReport(sales, period, fsm, fyYear);
  const purchaseProd = buildPurchaseProductReport(purchases, period, fsm, fyYear);
  const map = new Map();
  for (const r of stock.rows) {
    map.set(r.product, { product: r.product, stockQty: r.qty, stockValue: r.stockValue, soldQty: 0, soldAmount: 0, purchasedQty: 0, purchasedAmount: 0 });
  }
  for (const r of salesProd.rows) {
    const prev = map.get(r.product) || { product: r.product, stockQty: 0, stockValue: 0, soldQty: 0, soldAmount: 0, purchasedQty: 0, purchasedAmount: 0 };
    prev.soldQty = r.qty;
    prev.soldAmount = r.amount;
    map.set(r.product, prev);
  }
  for (const r of purchaseProd.rows) {
    const prev = map.get(r.product) || { product: r.product, stockQty: 0, stockValue: 0, soldQty: 0, soldAmount: 0, purchasedQty: 0, purchasedAmount: 0 };
    prev.purchasedQty = r.qty;
    prev.purchasedAmount = r.amount;
    map.set(r.product, prev);
  }
  const rows = [...map.values()].sort((a, b) => b.soldAmount - a.soldAmount);
  return { rows };
}

export function buildDailyExpensesReport(expenses, period, fsm, fyYear) {
  const map = new Map();
  for (const e of filterExpenses(expenses, period, fsm, fyYear)) {
    const d = String(e.date || "").slice(0, 10);
    const prev = map.get(d) || { date: d, amount: 0, count: 0, categories: new Set() };
    prev.amount = roundMoney2(prev.amount + num(e.amount));
    prev.count += 1;
    prev.categories.add(e.category || "Other");
    map.set(d, prev);
  }
  const rows = [...map.values()]
    .map((r) => ({ date: r.date, amount: r.amount, count: r.count, categories: [...r.categories].join(", ") }))
    .sort((a, b) => compareYmdDesc(a.date, b.date));
  const total = roundMoney2(rows.reduce((s, r) => s + r.amount, 0));
  return { rows, total };
}

export function buildOtherIncomeReport(otherIncomes, period, fsm, fyYear) {
  const rows = filterOtherIncomes(otherIncomes, period, fsm, fyYear)
    .map((x) => ({
      date: String(x.date || "").slice(0, 10),
      category: x.category || "Other",
      description: x.description || "—",
      amount: num(x.amount),
    }))
    .sort((a, b) => compareYmdDesc(a.date, b.date));
  const total = roundMoney2(rows.reduce((s, r) => s + r.amount, 0));
  return { rows, total, count: rows.length };
}

export function buildDaybookReport({
  sales,
  purchases,
  expenses,
  otherIncomes,
  inventoryEntries = [],
  period,
  fsm,
  fyYear,
}) {
  const rows = [];

  for (const s of filterSales(sales, period, fsm, fyYear)) {
    rows.push({
      date: String(s.date || "").slice(0, 10),
      type: "Sale",
      party: s.customerName || "—",
      reference: `${saleDocShortLabel(s.docType)} ${s.invoiceNo || ""}`.trim(),
      debit: signedSaleAmount(s) > 0 ? signedSaleAmount(s) : 0,
      credit: signedSaleAmount(s) < 0 ? Math.abs(signedSaleAmount(s)) : 0,
      sortMs: entityTimeMsFromId(s.id),
    });
  }
  for (const pur of filterPurchases(purchases, period, fsm, fyYear)) {
    rows.push({
      date: String(pur.date || "").slice(0, 10),
      type: "Purchase",
      party: pur.supplierName || "—",
      reference: pur.invoiceRef || "—",
      debit: 0,
      credit: num(pur.totalAmount),
      sortMs: entityTimeMsFromId(pur.id),
    });
  }
  for (const e of filterExpenses(expenses, period, fsm, fyYear)) {
    rows.push({
      date: String(e.date || "").slice(0, 10),
      type: "Expense",
      party: e.category || "—",
      reference: e.description || "—",
      debit: 0,
      credit: num(e.amount),
      sortMs: entityTimeMsFromId(e.id),
    });
  }
  for (const oi of filterOtherIncomes(otherIncomes, period, fsm, fyYear)) {
    rows.push({
      date: String(oi.date || "").slice(0, 10),
      type: "Other income",
      party: oi.category || "—",
      reference: oi.description || "—",
      debit: num(oi.amount),
      credit: 0,
      sortMs: entityTimeMsFromId(oi.id),
    });
  }
  for (const inv of inventoryEntries || []) {
    if (!inPeriod(inv.date, period, fsm, fyYear)) continue;
    const amt = stockInCashAmount(inv);
    if (amt <= 0) continue;
    rows.push({
      date: String(inv.date || "").slice(0, 10),
      type: "Stock",
      party: inv.item || "—",
      reference: "Stock in",
      debit: 0,
      credit: amt,
      sortMs: entityTimeMsFromId(inv.id),
    });
  }
  for (const sale of sales || []) {
    for (const pe of normalizePaymentEntries(sale)) {
      const d = String(pe.date || sale.date || "").slice(0, 10);
      if (!inPeriod(d, period, fsm, fyYear)) continue;
      rows.push({
        date: d,
        type: "Receipt",
        party: sale.customerName || "—",
        reference: sale.invoiceNo || "—",
        debit: num(pe.amount),
        credit: 0,
        sortMs: Math.max(entityTimeMsFromId(sale.id), entityTimeMsFromId(pe.id)),
      });
    }
  }
  for (const pur of purchases || []) {
    for (const pe of normalizePurchasePaymentEntries(pur)) {
      const d = String(pe.date || pur.date || "").slice(0, 10);
      if (!inPeriod(d, period, fsm, fyYear)) continue;
      rows.push({
        date: d,
        type: "Payment",
        party: pur.supplierName || "—",
        reference: pur.invoiceRef || "—",
        debit: 0,
        credit: num(pe.amount),
        sortMs: Math.max(entityTimeMsFromId(pur.id), entityTimeMsFromId(pe.id)),
      });
    }
  }

  rows.sort((a, b) => {
    const dc = compareYmdDesc(a.date, b.date);
    if (dc !== 0) return dc;
    return (b.sortMs || 0) - (a.sortMs || 0);
  });

  let running = 0;
  for (const r of [...rows].reverse()) {
    running = roundMoney2(running + r.debit - r.credit);
    r.balance = running;
  }

  const totals = rows.reduce(
    (acc, r) => ({ debit: acc.debit + r.debit, credit: acc.credit + r.credit }),
    { debit: 0, credit: 0 },
  );
  return { rows, totals, count: rows.length };
}

export function buildCompanyLedgerReport(args) {
  return buildDaybookReport(args);
}

function partyKey(name) {
  return String(name || "").trim() || "—";
}

function sortPartyRows(rows, amountKey = "amount") {
  return [...rows].sort((a, b) => num(b[amountKey]) - num(a[amountKey]));
}

export function buildSalesPartyReport(sales, period, fsm, fyYear) {
  const bill = buildSalesReport(sales, period, fsm, fyYear);
  const map = new Map();
  for (const r of bill.rows) {
    const key = partyKey(r.customerName);
    const prev = map.get(key) || { party: key, bills: 0, amount: 0, received: 0, outstanding: 0 };
    prev.bills += 1;
    prev.amount = roundMoney2(prev.amount + r.amount);
    prev.received = roundMoney2(prev.received + r.received);
    prev.outstanding = roundMoney2(prev.outstanding + r.outstanding);
    map.set(key, prev);
  }
  const rows = sortPartyRows([...map.values()]);
  const totals = rows.reduce(
    (acc, r) => ({
      amount: roundMoney2(acc.amount + r.amount),
      received: roundMoney2(acc.received + r.received),
      outstanding: roundMoney2(acc.outstanding + r.outstanding),
    }),
    { amount: 0, received: 0, outstanding: 0 },
  );
  return { view: "party", rows, totals, count: rows.length };
}

export function buildSalesOutstandingPartyReport(sales, period, fsm, fyYear) {
  const bill = buildSalesOutstandingReport(sales, period, fsm, fyYear);
  const map = new Map();
  for (const r of bill.rows) {
    const key = partyKey(r.customerName);
    const prev = map.get(key) || { party: key, bills: 0, amount: 0, outstanding: 0 };
    prev.bills += 1;
    prev.amount = roundMoney2(prev.amount + r.amount);
    prev.outstanding = roundMoney2(prev.outstanding + r.outstanding);
    map.set(key, prev);
  }
  const rows = sortPartyRows([...map.values()], "outstanding");
  const totalOutstanding = roundMoney2(rows.reduce((s, r) => s + r.outstanding, 0));
  return { view: "party", rows, totalOutstanding, count: rows.length };
}

export function buildInwardPaymentPartyReport(sales, period, fsm, fyYear) {
  const bill = buildInwardPaymentReport(sales, period, fsm, fyYear);
  const map = new Map();
  for (const r of bill.rows) {
    const key = partyKey(r.customerName);
    const prev = map.get(key) || { party: key, receipts: 0, amount: 0 };
    prev.receipts += 1;
    prev.amount = roundMoney2(prev.amount + r.amount);
    map.set(key, prev);
  }
  const rows = sortPartyRows([...map.values()]);
  const total = roundMoney2(rows.reduce((s, r) => s + r.amount, 0));
  return { view: "party", rows, total, count: rows.length };
}

export function buildPurchasePartyReport(purchases, period, fsm, fyYear) {
  const bill = buildPurchaseReport(purchases, period, fsm, fyYear);
  const map = new Map();
  for (const r of bill.rows) {
    const key = partyKey(r.supplierName);
    const prev = map.get(key) || { party: key, bills: 0, amount: 0, paid: 0, outstanding: 0 };
    prev.bills += 1;
    prev.amount = roundMoney2(prev.amount + r.amount);
    prev.paid = roundMoney2(prev.paid + r.paid);
    prev.outstanding = roundMoney2(prev.outstanding + r.outstanding);
    map.set(key, prev);
  }
  const rows = sortPartyRows([...map.values()]);
  const totals = rows.reduce(
    (acc, r) => ({
      amount: roundMoney2(acc.amount + r.amount),
      paid: roundMoney2(acc.paid + r.paid),
      outstanding: roundMoney2(acc.outstanding + r.outstanding),
    }),
    { amount: 0, paid: 0, outstanding: 0 },
  );
  return { view: "party", rows, totals, count: rows.length };
}

export function buildPurchaseOutstandingPartyReport(purchases, period, fsm, fyYear) {
  const bill = buildPurchaseOutstandingReport(purchases, period, fsm, fyYear);
  const map = new Map();
  for (const r of bill.rows) {
    const key = partyKey(r.supplierName);
    const prev = map.get(key) || { party: key, bills: 0, amount: 0, outstanding: 0 };
    prev.bills += 1;
    prev.amount = roundMoney2(prev.amount + r.amount);
    prev.outstanding = roundMoney2(prev.outstanding + r.outstanding);
    map.set(key, prev);
  }
  const rows = sortPartyRows([...map.values()], "outstanding");
  const totalOutstanding = roundMoney2(rows.reduce((s, r) => s + r.outstanding, 0));
  return { view: "party", rows, totalOutstanding, count: rows.length };
}

export function buildOutwardPaymentPartyReport(purchases, period, fsm, fyYear) {
  const bill = buildOutwardPaymentReport(purchases, period, fsm, fyYear);
  const map = new Map();
  for (const r of bill.rows) {
    const key = partyKey(r.supplierName);
    const prev = map.get(key) || { party: key, payments: 0, amount: 0 };
    prev.payments += 1;
    prev.amount = roundMoney2(prev.amount + r.amount);
    map.set(key, prev);
  }
  const rows = sortPartyRows([...map.values()]);
  const total = roundMoney2(rows.reduce((s, r) => s + r.amount, 0));
  return { view: "party", rows, total, count: rows.length };
}

export function buildOtherDocumentPartyReport(sales, period, fsm, fyYear) {
  const bill = buildOtherDocumentReport(sales, period, fsm, fyYear);
  const map = new Map();
  for (const r of bill.rows) {
    const key = partyKey(r.customerName);
    const prev = map.get(key) || { party: key, bills: 0, amount: 0, received: 0, outstanding: 0 };
    prev.bills += 1;
    prev.amount = roundMoney2(prev.amount + r.amount);
    prev.received = roundMoney2(prev.received + r.received);
    prev.outstanding = roundMoney2(prev.outstanding + r.outstanding);
    map.set(key, prev);
  }
  const rows = sortPartyRows([...map.values()]);
  const totals = rows.reduce(
    (acc, r) => ({
      amount: roundMoney2(acc.amount + r.amount),
      received: roundMoney2(acc.received + r.received),
      outstanding: roundMoney2(acc.outstanding + r.outstanding),
    }),
    { amount: 0, received: 0, outstanding: 0 },
  );
  return { view: "party", rows, totals, count: rows.length };
}

/** Generic CSV download for tabular report rows. */
export function downloadReportCsv(filename, headers, rowMapper, rows) {
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(rowMapper(row).map((c) => csvCell(c)).join(","));
  }
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function csvCell(v) {
  const s = String(v ?? "");
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export { isOutwardGstSupply, isOtherSaleDoc, isStandardSaleDoc };
