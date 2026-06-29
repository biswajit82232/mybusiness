/**
 * Customer / vendor account statement rows for print and export.
 */
import {
  compareYmdAsc,
  dateSlash,
  isDateInFy,
  moneyFull,
  normalizePaymentEntries,
  normalizePurchasePaymentEntries,
  num,
  roundMoney2,
} from "./appModel.js";
import { signedOutstanding, signedReceived, signedSaleAmount } from "./saleDocuments.js";

/**
 * @param {object[]} sales
 * @param {string} partyName
 * @param {{ fromDate?: string, toDate?: string, fsm?: number, fyYear?: number, range?: string, reportMonth?: string }} [opts]
 */
export function buildCustomerStatement(sales, partyName, opts = {}) {
  const key = String(partyName || "").trim().toLowerCase();
  const rows = [];
  let running = 0;

  const inPeriod = (dateStr) => {
    const d = String(dateStr || "").slice(0, 10);
    if (opts.fromDate && d < opts.fromDate) return false;
    if (opts.toDate && d > opts.toDate) return false;
    if (opts.range === "month") {
      const mk = String(opts.reportMonth || "").slice(0, 7);
      return mk.length >= 7 && d.startsWith(mk);
    }
    if (opts.range === "fy" && opts.fsm != null && opts.fyYear != null) {
      return isDateInFy(d, opts.fsm, opts.fyYear);
    }
    return true;
  };

  const partySales = (sales || [])
    .filter((s) => (s?.customerName || "").trim().toLowerCase() === key)
    .sort((a, b) => compareYmdAsc(a?.date, b?.date));

  for (const sale of partySales) {
    const invDate = String(sale.date || "").slice(0, 10);
    if (!inPeriod(invDate)) continue;
    const debit = Math.max(0, signedSaleAmount(sale));
    const creditFromInv = Math.max(0, -signedSaleAmount(sale));
    if (debit > 0) {
      running = roundMoney2(running + debit);
      rows.push({
        date: invDate,
        type: "invoice",
        reference: sale.invoiceNo || "—",
        detail: saleDocDetail(sale),
        debit,
        credit: 0,
        balance: running,
      });
    } else if (creditFromInv > 0) {
      running = roundMoney2(running - creditFromInv);
      rows.push({
        date: invDate,
        type: "credit_note",
        reference: sale.invoiceNo || "—",
        detail: `Credit note${sale.linkedInvoiceNo ? ` · ref ${sale.linkedInvoiceNo}` : ""}`,
        debit: 0,
        credit: creditFromInv,
        balance: running,
      });
    }

    for (const pe of normalizePaymentEntries(sale)) {
      const pDate = String(pe.date || invDate).slice(0, 10);
      if (!inPeriod(pDate)) continue;
      const amt = roundMoney2(num(pe.amount) * (signedSaleAmount(sale) < 0 ? -1 : 1));
      if (amt <= 0) continue;
      running = roundMoney2(running - amt);
      rows.push({
        date: pDate,
        type: "receipt",
        reference: sale.invoiceNo || "—",
        detail: "Payment received",
        debit: 0,
        credit: amt,
        balance: running,
      });
    }
  }

  const opening = roundMoney2(running - rows.reduce((s, r) => s + r.debit - r.credit, 0));

  return {
    partyName: String(partyName || "").trim(),
    partyKind: "customer",
    openingBalance: opening,
    closingBalance: running,
    rows,
    totalDebit: roundMoney2(rows.reduce((s, r) => s + r.debit, 0)),
    totalCredit: roundMoney2(rows.reduce((s, r) => s + r.credit, 0)),
  };
}

function saleDocDetail(sale) {
  const linked = String(sale.linkedInvoiceNo || "").trim();
  if (linked) return `Against ${linked}`;
  return "Sale invoice";
}

/**
 * @param {object[]} purchases
 * @param {string} partyName
 */
export function buildVendorStatement(purchases, partyName, opts = {}) {
  const key = String(partyName || "").trim().toLowerCase();
  const rows = [];
  let running = 0;

  const inPeriod = (dateStr) => {
    const d = String(dateStr || "").slice(0, 10);
    if (opts.fromDate && d < opts.fromDate) return false;
    if (opts.toDate && d > opts.toDate) return false;
    if (opts.range === "month") {
      const mk = String(opts.reportMonth || "").slice(0, 7);
      return mk.length >= 7 && d.startsWith(mk);
    }
    if (opts.range === "fy" && opts.fsm != null && opts.fyYear != null) {
      return isDateInFy(d, opts.fsm, opts.fyYear);
    }
    return true;
  };

  const partyPurchases = (purchases || [])
    .filter((p) => (p?.supplierName || "").trim().toLowerCase() === key)
    .sort((a, b) => compareYmdAsc(a?.date, b?.date));

  for (const p of partyPurchases) {
    const pDate = String(p.date || "").slice(0, 10);
    if (!inPeriod(pDate)) continue;
    const total = roundMoney2(num(p.totalAmount ?? p.totalCost));
    running = roundMoney2(running + total);
    rows.push({
      date: pDate,
      type: "purchase",
      reference: p.invoiceRef || "—",
      detail: "Purchase bill",
      debit: 0,
      credit: total,
      balance: running,
    });
    for (const pe of normalizePurchasePaymentEntries(p)) {
      const payDate = String(pe.date || pDate).slice(0, 10);
      if (!inPeriod(payDate)) continue;
      const amt = roundMoney2(num(pe.amount));
      if (amt <= 0) continue;
      running = roundMoney2(running - amt);
      rows.push({
        date: payDate,
        type: "payment",
        reference: p.invoiceRef || "—",
        detail: "Payment to supplier",
        debit: amt,
        credit: 0,
        balance: running,
      });
    }
  }

  return {
    partyName: String(partyName || "").trim(),
    partyKind: "vendor",
    openingBalance: 0,
    closingBalance: running,
    rows,
    totalDebit: roundMoney2(rows.reduce((s, r) => s + r.debit, 0)),
    totalCredit: roundMoney2(rows.reduce((s, r) => s + r.credit, 0)),
  };
}

export function partyStatementToCsv(statement) {
  const lines = [
    `${statement.partyKind === "vendor" ? "Vendor" : "Customer"} Statement — ${statement.partyName}`,
    `Closing balance,${statement.closingBalance}`,
    "",
    "Date,Type,Reference,Detail,Debit,Credit,Balance",
  ];
  for (const r of statement.rows) {
    lines.push(
      [
        r.date,
        r.type,
        `"${String(r.reference || "").replace(/"/g, '""')}"`,
        `"${String(r.detail || "").replace(/"/g, '""')}"`,
        r.debit,
        r.credit,
        r.balance,
      ].join(","),
    );
  }
  return lines.join("\n");
}

export function downloadPartyStatementCsv(statement) {
  const blob = new Blob([partyStatementToCsv(statement)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const slug = String(statement.partyName || "party")
    .replace(/[^\w]+/g, "-")
    .slice(0, 40);
  a.href = url;
  a.download = `statement-${statement.partyKind}-${slug}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function formatStatementMoney(v) {
  return moneyFull(v);
}

export function formatStatementDate(d) {
  return dateSlash(d);
}

/** Live outstanding for customer (all sales). */
export function customerOutstandingTotal(sales, partyName) {
  const key = String(partyName || "").trim().toLowerCase();
  return roundMoney2(
    (sales || [])
      .filter((s) => (s?.customerName || "").trim().toLowerCase() === key)
      .reduce((sum, s) => sum + signedOutstanding(s), 0),
  );
}

/** Live revenue for customer using signed amounts. */
export function customerRevenueTotal(sales, partyName) {
  const key = String(partyName || "").trim().toLowerCase();
  return roundMoney2(
    (sales || [])
      .filter((s) => (s?.customerName || "").trim().toLowerCase() === key)
      .reduce((sum, s) => sum + signedSaleAmount(s), 0),
  );
}

export function customerReceivedTotal(sales, partyName) {
  const key = String(partyName || "").trim().toLowerCase();
  return roundMoney2(
    (sales || [])
      .filter((s) => (s?.customerName || "").trim().toLowerCase() === key)
      .reduce((sum, s) => sum + signedReceived(s), 0),
  );
}
