/**
 * Sale document types: tax invoice, bill of supply, credit/debit notes.
 */
import { num, roundMoney2 } from "./appModel.js";

export const SALE_DOC_TYPES = ["invoice", "billOfSupply", "creditNote", "debitNote"];

/** @returns {"invoice"|"billOfSupply"|"creditNote"|"debitNote"} */
export function normalizeDocType(value) {
  const d = String(value || "").trim();
  if (d === "billOfSupply" || d === "bill_of_supply") return "billOfSupply";
  if (d === "creditNote" || d === "credit_note") return "creditNote";
  if (d === "debitNote" || d === "debit_note") return "debitNote";
  return "invoice";
}

export function saleDocLabel(docType) {
  switch (normalizeDocType(docType)) {
    case "billOfSupply":
      return "Bill of Supply";
    case "creditNote":
      return "Credit Note";
    case "debitNote":
      return "Debit Note";
    default:
      return "Tax Invoice";
  }
}

export function saleDocShortLabel(docType) {
  switch (normalizeDocType(docType)) {
    case "billOfSupply":
      return "BOS";
    case "creditNote":
      return "CN";
    case "debitNote":
      return "DN";
    default:
      return "INV";
  }
}

/** GST tax columns apply to invoice, credit note, and debit note — not BOS. */
export function isGstTaxDocument(docType) {
  const d = normalizeDocType(docType);
  return d === "invoice" || d === "creditNote" || d === "debitNote";
}

/** Credit notes reduce revenue and receivables; others add. */
export function saleRevenueSign(docType) {
  return normalizeDocType(docType) === "creditNote" ? -1 : 1;
}

/** Only sale documents should consume inventory via the auto stock-out setting. */
export function saleDocUsesAutoStockOut(docType) {
  const d = normalizeDocType(docType);
  return d === "invoice" || d === "billOfSupply";
}

export function signedSaleAmount(sale) {
  if (!sale || typeof sale !== "object") return 0;
  return roundMoney2(num(sale.totalSale) * saleRevenueSign(sale.docType));
}

export function signedOutstanding(sale) {
  if (!sale || typeof sale !== "object") return 0;
  return roundMoney2(num(sale.outstanding) * saleRevenueSign(sale.docType));
}

export function signedReceived(sale) {
  if (!sale || typeof sale !== "object") return 0;
  return roundMoney2(num(sale.received) * saleRevenueSign(sale.docType));
}

/** Prefix for document numbering — use saleDocPrefix from appModel via domain index. */
export function saleDocNextNumberSettingKey(docType) {
  const d = normalizeDocType(docType);
  if (d === "billOfSupply") return "billOfSupplyNextNumber";
  if (d === "creditNote") return "creditNoteNextNumber";
  if (d === "debitNote") return "debitNoteNextNumber";
  return "invoiceNextNumber";
}

/** Sales included in GST outward supply (excludes BOS). */
export function isOutwardGstSupply(sale) {
  if (!sale || typeof sale !== "object") return false;
  return isGstTaxDocument(sale.docType);
}
