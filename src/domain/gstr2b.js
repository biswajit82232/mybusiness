/**
 * GSTR-2B style inward supply summary from purchase bills (estimated ITC).
 */
import { isGstEnabled, DEFAULT_PRODUCT_GST_RATE } from "./invoiceGst.js";
import { isDateInFy, num, roundMoney2 } from "./appModel.js";
import { isDateInReportPeriod, normalizeReportPeriod, toLegacyPeriodOpts } from "./reportPeriod.js";

function filterPurchases(purchases, period) {
  const p = normalizeReportPeriod(period);
  return (purchases || []).filter((pur) => {
    if (!pur) return false;
    const d = String(pur.date || "").slice(0, 10);
    if (p.mode === "all") return true;
    if (p.mode === "fy") return isDateInFy(d, p.fsm, p.fyYear);
    if (p.mode === "month") {
      const mk = String(p.reportMonth || "").slice(0, 7);
      return mk.length >= 7 && d.startsWith(mk);
    }
    return isDateInReportPeriod(d, p);
  });
}

function splitTaxFromInclusive(total, ratePct) {
  const r = Math.max(0, num(ratePct));
  if (r <= 0 || total <= 0) return { taxable: roundMoney2(total), cgst: 0, sgst: 0, igst: 0, tax: 0 };
  const taxable = roundMoney2(total / (1 + r / 100));
  const tax = roundMoney2(total - taxable);
  const half = roundMoney2(tax / 2);
  return { taxable, cgst: half, sgst: half, igst: 0, tax };
}

/**
 * @param {object[]} purchases
 * @param {object} settings
 * @param {object} period
 */
export function buildGstr2bSummary(purchases, settings, period = {}) {
  const gstOn = isGstEnabled(settings);
  const rate = Math.max(0, num(settings.defaultProductGstRate ?? DEFAULT_PRODUCT_GST_RATE));
  const filtered = filterPurchases(purchases, period);
  const rows = [];
  let totalTaxable = 0;
  let totalCgst = 0;
  let totalSgst = 0;
  let totalIgst = 0;

  for (const pur of filtered) {
    const total = roundMoney2(num(pur.totalAmount));
    const split = splitTaxFromInclusive(total, gstOn ? rate : 0);
    totalTaxable += split.taxable;
    totalCgst += split.cgst;
    totalSgst += split.sgst;
    totalIgst += split.igst;
    rows.push({
      date: String(pur.date || "").slice(0, 10),
      supplierName: pur.supplierName || "",
      invoiceRef: pur.invoiceRef || "",
      taxableValue: split.taxable,
      cgst: split.cgst,
      sgst: split.sgst,
      igst: split.igst,
      invoiceValue: total,
      itcAvailable: roundMoney2(split.cgst + split.sgst + split.igst),
    });
  }

  return {
    period: toLegacyPeriodOpts(period),
    gstEnabled: gstOn,
    estimatedRate: rate,
    note: gstOn
      ? `ITC estimated at ${rate}% on purchase totals. Enter GST breakup on bills when available.`
      : "GST is off in settings — showing purchase totals only.",
    rows,
    rowCount: rows.length,
    totals: {
      taxableValue: roundMoney2(totalTaxable),
      cgst: roundMoney2(totalCgst),
      sgst: roundMoney2(totalSgst),
      igst: roundMoney2(totalIgst),
      itcTotal: roundMoney2(totalCgst + totalSgst + totalIgst),
    },
  };
}

export function gstr2bSummaryToCsv(summary) {
  const lines = [
    "GSTR-2B Summary (Inward Supplies)",
    summary.note || "",
    "",
    "Date,Supplier,Invoice Ref,Taxable,CGST,SGST,IGST,ITC,Invoice Value",
  ];
  for (const r of summary.rows) {
    lines.push(
      [r.date, csvEsc(r.supplierName), csvEsc(r.invoiceRef), r.taxableValue, r.cgst, r.sgst, r.igst, r.itcAvailable, r.invoiceValue].join(","),
    );
  }
  return lines.join("\n");
}

export function downloadGstr2bExport(summary) {
  const blob = new Blob([gstr2bSummaryToCsv(summary)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "gstr2b-summary.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function csvEsc(v) {
  const s = String(v ?? "");
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
