/**
 * GSTR-1 summary from saved sales — portal-ready aggregates, no API filing.
 */
import { buildInvoiceGstModel, isGstEnabled, placeOfSupplyLabel } from "./invoiceGst.js";
import { isDateInFy, num, roundMoney2 } from "./appModel.js";
import { isDateInReportPeriod } from "./reportPeriod.js";
import { isOutwardGstSupply, normalizeDocType, saleRevenueSign, signedSaleAmount } from "./saleDocuments.js";

function gstinValid(gstin) {
  const g = String(gstin || "").trim().toUpperCase();
  return g.length === 15;
}

function periodFilterSales(sales, period) {
  if (!period || period.range === "all") return sales || [];
  if (period.range === "month") {
    const mk = String(period.reportMonth || "").slice(0, 7);
    return (sales || []).filter((s) => String(s?.date || "").startsWith(mk));
  }
  if (period.range === "custom" || period.fromDate || period.toDate) {
    return (sales || []).filter((s) => isDateInReportPeriod(s?.date, period, period.fsm, period.fyYear));
  }
  return (sales || []).filter((s) => isDateInFy(s.date, period.fsm, period.fyYear));
}

/**
 * @param {object[]} sales
 * @param {object} settings
 * @param {{ range?: string, reportMonth?: string, fsm?: number, fyYear?: number }} period
 */
export function buildGstr1Summary(sales, settings, period = {}) {
  const gstOn = isGstEnabled(settings);
  const filtered = periodFilterSales(sales, period).filter(
    (s) => s && isOutwardGstSupply(s) && gstOn,
  );

  const b2b = [];
  const b2cLarge = [];
  const b2cSmall = [];
  const hsnMap = new Map();
  const docSummary = { invoices: 0, creditNotes: 0, debitNotes: 0 };
  let totalTaxable = 0;
  let totalCgst = 0;
  let totalSgst = 0;
  let totalIgst = 0;

  for (const sale of filtered) {
    const docType = normalizeDocType(sale.docType);
    if (docType === "creditNote") docSummary.creditNotes += 1;
    else if (docType === "debitNote") docSummary.debitNotes += 1;
    else docSummary.invoices += 1;

    const sign = saleRevenueSign(docType);
    const model = buildInvoiceGstModel(sale, settings);
    const taxable = roundMoney2(num(model.taxableTotal) * sign);
    const cgst = roundMoney2(num(model.cgst) * sign);
    const sgst = roundMoney2(num(model.sgst) * sign);
    const igst = roundMoney2(num(model.igst) * sign);

    totalTaxable += taxable;
    totalCgst += cgst;
    totalSgst += sgst;
    totalIgst += igst;

    const row = {
      date: String(sale.date || "").slice(0, 10),
      invoiceNo: sale.invoiceNo || "",
      docType,
      customerName: sale.customerName || "",
      customerGstin: String(sale.customerGstin || "").trim().toUpperCase(),
      placeOfSupply: placeOfSupplyLabel(sale.customerState, sale.customerState) || "",
      taxableValue: taxable,
      cgst,
      sgst,
      igst,
      invoiceValue: signedSaleAmount(sale),
      reverseCharge: sale.reverseCharge === true,
    };

    if (gstinValid(row.customerGstin)) {
      b2b.push(row);
    } else if (Math.abs(row.invoiceValue) > 250000) {
      b2cLarge.push(row);
    } else {
      b2cSmall.push(row);
    }

    for (const h of model.hsnSummary || []) {
      const key = `${h.hsn || "—"}|${h.gstRate || 0}`;
      const prev = hsnMap.get(key) || {
        hsn: h.hsn || "—",
        gstRate: num(h.gstRate),
        quantity: 0,
        taxableValue: 0,
        cgst: 0,
        sgst: 0,
        igst: 0,
      };
      prev.quantity = roundMoney2(prev.quantity + 1 * sign);
      prev.taxableValue = roundMoney2(prev.taxableValue + num(h.taxable) * sign);
      prev.cgst = roundMoney2(prev.cgst + num(h.cgst) * sign);
      prev.sgst = roundMoney2(prev.sgst + num(h.sgst) * sign);
      prev.igst = roundMoney2(prev.igst + num(h.igst) * sign);
      hsnMap.set(key, prev);
    }
  }

  const hsnSummary = [...hsnMap.values()].sort((a, b) =>
    String(a.hsn).localeCompare(String(b.hsn)),
  );

  return {
    period,
    docSummary,
    totals: {
      taxableValue: roundMoney2(totalTaxable),
      cgst: roundMoney2(totalCgst),
      sgst: roundMoney2(totalSgst),
      igst: roundMoney2(totalIgst),
      taxTotal: roundMoney2(totalCgst + totalSgst + totalIgst),
    },
    b2b,
    b2cLarge,
    b2cSmall,
    hsnSummary,
    rowCount: filtered.length,
  };
}

function csvEscape(v) {
  const s = String(v ?? "");
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** @returns {string} CSV for GSTR-1 B2B + HSN tables */
export function gstr1SummaryToCsv(summary) {
  const lines = [];
  lines.push("GSTR-1 Summary Export");
  lines.push(`Period,${csvEscape(summary.period?.range || "fy")}`);
  lines.push("");
  lines.push("B2B Invoices");
  lines.push("Date,Invoice No,Type,Customer,GSTIN,Place of Supply,Taxable,CGST,SGST,IGST,Invoice Value");
  for (const r of summary.b2b) {
    lines.push(
      [
        r.date,
        csvEscape(r.invoiceNo),
        r.docType,
        csvEscape(r.customerName),
        r.customerGstin,
        csvEscape(r.placeOfSupply),
        r.taxableValue,
        r.cgst,
        r.sgst,
        r.igst,
        r.invoiceValue,
      ].join(","),
    );
  }
  lines.push("");
  lines.push("HSN Summary");
  lines.push("HSN,Rate %,Qty,Taxable,CGST,SGST,IGST");
  for (const h of summary.hsnSummary) {
    lines.push(
      [csvEscape(h.hsn), h.gstRate, h.quantity, h.taxableValue, h.cgst, h.sgst, h.igst].join(","),
    );
  }
  return lines.join("\n");
}

export function gstr1SummaryToJson(summary) {
  return JSON.stringify(summary, null, 2);
}

/** Trigger browser download of GSTR-1 export. */
export function downloadGstr1Export(summary, format = "csv") {
  const isJson = format === "json";
  const body = isJson ? gstr1SummaryToJson(summary) : gstr1SummaryToCsv(summary);
  const blob = new Blob([body], { type: isJson ? "application/json" : "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const label =
    summary.period?.range === "month"
      ? String(summary.period.reportMonth || "month").slice(0, 7)
      : "fy";
  a.href = url;
  a.download = `gstr1-summary-${label}.${isJson ? "json" : "csv"}`;
  a.click();
  URL.revokeObjectURL(url);
}
