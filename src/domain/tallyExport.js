/**
 * Tally-compatible XML export (vouchers for sales, receipts, purchases, expenses).
 */
import { buildInvoiceGstModel, isGstEnabled } from "./invoiceGst.js";
import {
  dateSlash,
  isDateInFy,
  normalizePaymentEntries,
  normalizePurchasePaymentEntries,
  num,
  roundMoney2,
} from "./appModel.js";
import { normalizeDocType, saleDocLabel, signedSaleAmount } from "./saleDocuments.js";

function xmlEscape(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function tallyDate(ymd) {
  const d = String(ymd || "").slice(0, 10);
  if (d.length < 10) return d;
  const [y, m, day] = d.split("-");
  return `${day}-${m}-${y}`;
}

function periodFilterByDate(items, dateField, period) {
  const { range, reportMonth, fsm, fyYear, fromDate, toDate } = period;
  return (items || []).filter((row) => {
    const d = String(row?.[dateField] || "").slice(0, 10);
    if (d.length < 10) return false;
    if (range === "month") {
      const mk = String(reportMonth || "").slice(0, 7);
      return mk.length >= 7 && d.startsWith(mk);
    }
    if (range === "all") return true;
    if (range === "custom" || fromDate || toDate) {
      if (fromDate && d < fromDate) return false;
      if (toDate && d > toDate) return false;
      return true;
    }
    return isDateInFy(d, fsm, fyYear);
  });
}

/**
 * @param {object} state — full app state slice
 * @param {{ range?: string, reportMonth?: string, fsm?: number, fyYear?: number }} period
 */
export function buildTallyExportXml(state, period = {}) {
  const settings = state?.settings || {};
  const company = xmlEscape(settings.businessName || "MyBusiness");
  const gstOn = isGstEnabled(settings);
  const vouchers = [];

  const sales = periodFilterByDate(state?.sales, "date", period);
  for (const sale of sales) {
    const docType = normalizeDocType(sale.docType);
    const amt = signedSaleAmount(sale);
    if (Math.abs(amt) < 0.01) continue;
    const isCredit = docType === "creditNote";
    const vchType = isCredit ? "Credit Note" : docType === "debitNote" ? "Debit Note" : "Sales";
    const party = xmlEscape(sale.customerName || "Customer");
    const ref = xmlEscape(sale.invoiceNo || "");
    const linked = sale.linkedInvoiceNo ? xmlEscape(sale.linkedInvoiceNo) : "";
    const narration = linked ? `Ref: ${linked}` : saleDocLabel(docType);

    let gstLedgers = "";
    if (gstOn && docType !== "billOfSupply") {
      const model = buildInvoiceGstModel(sale, settings);
      const sign = isCredit ? -1 : 1;
      if (num(model.cgst) > 0) {
        gstLedgers += `<ALLLEDGERENTRIES.LIST><LEDGERNAME>Output CGST</LEDGERNAME><ISDEEMEDPOSITIVE>${isCredit ? "Yes" : "No"}</ISDEEMEDPOSITIVE><AMOUNT>${roundMoney2(num(model.cgst) * sign)}</AMOUNT></ALLLEDGERENTRIES.LIST>`;
      }
      if (num(model.sgst) > 0) {
        gstLedgers += `<ALLLEDGERENTRIES.LIST><LEDGERNAME>Output SGST</LEDGERNAME><ISDEEMEDPOSITIVE>${isCredit ? "Yes" : "No"}</ISDEEMEDPOSITIVE><AMOUNT>${roundMoney2(num(model.sgst) * sign)}</AMOUNT></ALLLEDGERENTRIES.LIST>`;
      }
      if (num(model.igst) > 0) {
        gstLedgers += `<ALLLEDGERENTRIES.LIST><LEDGERNAME>Output IGST</LEDGERNAME><ISDEEMEDPOSITIVE>${isCredit ? "Yes" : "No"}</ISDEEMEDPOSITIVE><AMOUNT>${roundMoney2(num(model.igst) * sign)}</AMOUNT></ALLLEDGERENTRIES.LIST>`;
      }
    }

    vouchers.push(`<TALLYMESSAGE xmlns:UDF="TallyUDF">
  <VOUCHER VCHTYPE="${vchType}" ACTION="Create">
    <DATE>${tallyDate(sale.date)}</DATE>
    <VOUCHERTYPENAME>${vchType}</VOUCHERTYPENAME>
    <VOUCHERNUMBER>${ref}</VOUCHERNUMBER>
    <PARTYLEDGERNAME>${party}</PARTYLEDGERNAME>
    <NARRATION>${xmlEscape(narration)}</NARRATION>
    <ALLLEDGERENTRIES.LIST>
      <LEDGERNAME>${party}</LEDGERNAME>
      <ISDEEMEDPOSITIVE>${isCredit ? "Yes" : "No"}</ISDEEMEDPOSITIVE>
      <AMOUNT>${Math.abs(amt)}</AMOUNT>
    </ALLLEDGERENTRIES.LIST>
    <ALLLEDGERENTRIES.LIST>
      <LEDGERNAME>Sales</LEDGERNAME>
      <ISDEEMEDPOSITIVE>${isCredit ? "No" : "Yes"}</ISDEEMEDPOSITIVE>
      <AMOUNT>${Math.abs(amt)}</AMOUNT>
    </ALLLEDGERENTRIES.LIST>
    ${gstLedgers}
  </VOUCHER>
</TALLYMESSAGE>`);

    for (const pe of normalizePaymentEntries(sale)) {
      const pAmt = roundMoney2(num(pe.amount));
      if (pAmt <= 0) continue;
      vouchers.push(`<TALLYMESSAGE xmlns:UDF="TallyUDF">
  <VOUCHER VCHTYPE="Receipt" ACTION="Create">
    <DATE>${tallyDate(pe.date || sale.date)}</DATE>
    <VOUCHERTYPENAME>Receipt</VOUCHERTYPENAME>
    <PARTYLEDGERNAME>${party}</PARTYLEDGERNAME>
    <NARRATION>Receipt against ${ref}</NARRATION>
    <ALLLEDGERENTRIES.LIST>
      <LEDGERNAME>Cash</LEDGERNAME>
      <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
      <AMOUNT>${pAmt}</AMOUNT>
    </ALLLEDGERENTRIES.LIST>
    <ALLLEDGERENTRIES.LIST>
      <LEDGERNAME>${party}</LEDGERNAME>
      <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
      <AMOUNT>${pAmt}</AMOUNT>
    </ALLLEDGERENTRIES.LIST>
  </VOUCHER>
</TALLYMESSAGE>`);
    }
  }

  const purchases = periodFilterByDate(state?.purchases, "date", period);
  for (const p of purchases) {
    const party = xmlEscape(p.supplierName || "Supplier");
    const amt = roundMoney2(num(p.totalCost));
    if (amt <= 0) continue;
    vouchers.push(`<TALLYMESSAGE xmlns:UDF="TallyUDF">
  <VOUCHER VCHTYPE="Purchase" ACTION="Create">
    <DATE>${tallyDate(p.date)}</DATE>
    <VOUCHERTYPENAME>Purchase</VOUCHERTENAME>
    <VOUCHERNUMBER>${xmlEscape(p.invoiceRef || "")}</VOUCHERNUMBER>
    <PARTYLEDGERNAME>${party}</PARTYLEDGERNAME>
    <ALLLEDGERENTRIES.LIST>
      <LEDGERNAME>Purchase</LEDGERNAME>
      <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
      <AMOUNT>${amt}</AMOUNT>
    </ALLLEDGERENTRIES.LIST>
    <ALLLEDGERENTRIES.LIST>
      <LEDGERNAME>${party}</LEDGERNAME>
      <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
      <AMOUNT>${amt}</AMOUNT>
    </ALLLEDGERENTRIES.LIST>
  </VOUCHER>
</TALLYMESSAGE>`);
    for (const pe of normalizePurchasePaymentEntries(p)) {
      const pAmt = roundMoney2(num(pe.amount));
      if (pAmt <= 0) continue;
      vouchers.push(`<TALLYMESSAGE xmlns:UDF="TallyUDF">
  <VOUCHER VCHTYPE="Payment" ACTION="Create">
    <DATE>${tallyDate(pe.date || p.date)}</DATE>
    <VOUCHERTYPENAME>Payment</VOUCHERTYPENAME>
    <PARTYLEDGERNAME>${party}</PARTYLEDGERNAME>
    <NARRATION>Payment for ${xmlEscape(p.invoiceRef || "")}</NARRATION>
    <ALLLEDGERENTRIES.LIST>
      <LEDGERNAME>${party}</LEDGERNAME>
      <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
      <AMOUNT>${pAmt}</AMOUNT>
    </ALLLEDGERENTRIES.LIST>
    <ALLLEDGERENTRIES.LIST>
      <LEDGERNAME>Cash</LEDGERNAME>
      <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
      <AMOUNT>${pAmt}</AMOUNT>
    </ALLLEDGERENTRIES.LIST>
  </VOUCHER>
</TALLYMESSAGE>`);
    }
  }

  const expenses = periodFilterByDate(state?.expenses, "date", period);
  for (const e of expenses) {
    const amt = roundMoney2(num(e.amount));
    if (amt <= 0) continue;
    vouchers.push(`<TALLYMESSAGE xmlns:UDF="TallyUDF">
  <VOUCHER VCHTYPE="Payment" ACTION="Create">
    <DATE>${tallyDate(e.date)}</DATE>
    <VOUCHERTYPENAME>Payment</VOUCHERTYPENAME>
    <NARRATION>${xmlEscape(e.category || "Expense")} — ${xmlEscape(e.description || "")}</NARRATION>
    <ALLLEDGERENTRIES.LIST>
      <LEDGERNAME>${xmlEscape(e.category || "Expenses")}</LEDGERNAME>
      <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
      <AMOUNT>${amt}</AMOUNT>
    </ALLLEDGERENTRIES.LIST>
    <ALLLEDGERENTRIES.LIST>
      <LEDGERNAME>Cash</LEDGERNAME>
      <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
      <AMOUNT>${amt}</AMOUNT>
    </ALLLEDGERENTRIES.LIST>
  </VOUCHER>
</TALLYMESSAGE>`);
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Vouchers</REPORTNAME>
        <STATICVARIABLES>
          <SVCURRENTCOMPANY>${company}</SVCURRENTCOMPANY>
        </STATICVARIABLES>
      </REQUESTDESC>
      <REQUESTDATA>
        ${vouchers.join("\n        ")}
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;
}

export function downloadTallyExport(state, period = {}) {
  const xml = buildTallyExportXml(state, period);
  const blob = new Blob([xml], { type: "application/xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const label =
    period.range === "month" ? String(period.reportMonth || "month").slice(0, 7) : "fy";
  a.href = url;
  a.download = `tally-export-${label}.xml`;
  a.click();
  URL.revokeObjectURL(url);
}

export function tallyExportSummary(state, period = {}) {
  const sales = periodFilterByDate(state?.sales, "date", period).length;
  const purchases = periodFilterByDate(state?.purchases, "date", period).length;
  const expenses = periodFilterByDate(state?.expenses, "date", period).length;
  return { sales, purchases, expenses, exportedAt: dateSlash(new Date().toISOString().slice(0, 10)) };
}
