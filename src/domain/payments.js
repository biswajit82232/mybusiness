/**
 * Payments ledger: customer receipts, supplier payments, and customer advance payments.
 * @module domain/payments
 */
import {
  advanceUnappliedAmount,
  entityTimeMsFromId,
  isDateInFy,
  normCustomerAdvancePayments,
  normalizePaymentEntries,
  normalizePurchasePaymentEntries,
  num,
} from "./appModel.js";

export {
  advanceAppliedAmount,
  advanceUnappliedAmount,
  customerAdvanceBalance,
  genPaymentReceiptNo,
  normAdvanceApplications,
  normCustomerAdvancePayments,
  paymentReceiptPrefix,
} from "./appModel.js";

export const PAYMENT_DIR = { IN: "in", OUT: "out" };

export const PAYMENT_KIND = {
  SALE: "sale",
  PURCHASE: "purchase",
  ADVANCE: "advance",
};

export const PAYMENT_KIND_LABEL = {
  [PAYMENT_KIND.SALE]: "Customer receipt",
  [PAYMENT_KIND.PURCHASE]: "Supplier payment",
  [PAYMENT_KIND.ADVANCE]: "Advance payment",
};

function comparePaymentRowDesc(a, b) {
  const dc = String(b.date || "").localeCompare(String(a.date || ""));
  if (dc !== 0) return dc;
  return (b.sortMs || 0) - (a.sortMs || 0);
}

/** Unified payment rows from sales, purchases, and customer advances (newest first). */
export function buildPaymentsLedger({ sales = [], purchases = [], customerAdvancePayments = [] } = {}) {
  const rows = [];

  for (const s of sales || []) {
    if (!s || typeof s !== "object") continue;
    for (const pe of normalizePaymentEntries(s)) {
      if (!pe || num(pe.amount) <= 0) continue;
      const fromAdvance = String(pe.sourceAdvanceId || "").trim();
      rows.push({
        key: `sale-${s.id}-${pe.id}`,
        id: String(pe.id || ""),
        dir: PAYMENT_DIR.IN,
        kind: PAYMENT_KIND.SALE,
        date: pe.date,
        amount: num(pe.amount),
        bankAccountId: String(pe.bankAccountId || ""),
        partyName: String(s.customerName || "").trim() || "Customer",
        reference: String(s.invoiceNo || "").trim() || "—",
        parentId: String(s.id || ""),
        receiptNo: "",
        sourceAdvanceId: fromAdvance,
        note: fromAdvance ? "Applied from advance" : "",
        sortMs: Math.max(entityTimeMsFromId(pe.id), entityTimeMsFromId(s.id)),
      });
    }
  }

  for (const p of purchases || []) {
    if (!p || typeof p !== "object") continue;
    for (const pe of normalizePurchasePaymentEntries(p)) {
      if (!pe || num(pe.amount) <= 0) continue;
      const ref = String(p.invoiceRef || "").trim();
      rows.push({
        key: `purchase-${p.id}-${pe.id}`,
        id: String(pe.id || ""),
        dir: PAYMENT_DIR.OUT,
        kind: PAYMENT_KIND.PURCHASE,
        date: pe.date,
        amount: num(pe.amount),
        bankAccountId: String(pe.bankAccountId || ""),
        partyName: String(p.supplierName || "").trim() || "Supplier",
        reference: ref || "—",
        parentId: String(p.id || ""),
        receiptNo: "",
        sourceAdvanceId: "",
        note: "",
        sortMs: Math.max(entityTimeMsFromId(pe.id), entityTimeMsFromId(p.id)),
      });
    }
  }

  for (const a of normCustomerAdvancePayments(customerAdvancePayments)) {
    rows.push({
      key: `advance-${a.id}`,
      id: a.id,
      dir: PAYMENT_DIR.IN,
      kind: PAYMENT_KIND.ADVANCE,
      date: a.date,
      amount: num(a.amount),
      bankAccountId: a.bankAccountId,
      partyName: a.customerName,
      reference: a.receiptNo || "Advance",
      parentId: a.id,
      receiptNo: a.receiptNo,
      sourceAdvanceId: "",
      note: a.note,
      unapplied: advanceUnappliedAmount(a),
      applications: a.applications,
      sortMs: entityTimeMsFromId(a.id),
    });
  }

  rows.sort(comparePaymentRowDesc);
  return rows;
}

export function filterPaymentsLedgerByPeriod(rows, { businessMonth, fsm, fyYear } = {}) {
  const list = Array.isArray(rows) ? rows : [];
  if (businessMonth && String(businessMonth).length >= 7) {
    const mk = String(businessMonth).slice(0, 7);
    return list.filter((r) => String(r.date || "").slice(0, 7) === mk);
  }
  if (fsm != null && fyYear != null) {
    return list.filter((r) => isDateInFy(r.date, fsm, fyYear));
  }
  return list;
}

export function paymentsPeriodTotals(rows) {
  let cashIn = 0;
  let cashOut = 0;
  let count = 0;
  for (const r of Array.isArray(rows) ? rows : []) {
    if (!r || num(r.amount) <= 0) continue;
    if (r.dir === PAYMENT_DIR.OUT) {
      cashOut += num(r.amount);
      count += 1;
    } else if (!String(r.sourceAdvanceId || "").trim()) {
      cashIn += num(r.amount);
      count += 1;
    }
  }
  return { cashIn, cashOut, net: cashIn - cashOut, count };
}
