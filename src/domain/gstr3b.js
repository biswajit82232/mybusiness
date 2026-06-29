/**
 * GSTR-3B monthly summary — outward tax minus estimated ITC.
 */
import { buildGstr1Summary } from "./gstr1.js";
import { buildGstr2bSummary } from "./gstr2b.js";
import { roundMoney2 } from "./appModel.js";
import { toLegacyPeriodOpts } from "./reportPeriod.js";

/**
 * @param {object} data
 * @param {object} period
 */
export function buildGstr3bSummary(data, settings, period = {}) {
  const { sales = [], purchases = [] } = data;
  const gstr1 = buildGstr1Summary(sales, settings, toLegacyPeriodOpts(period));
  const gstr2b = buildGstr2bSummary(purchases, settings, period);

  const outwardTax = gstr1.totals.taxTotal;
  const itc = gstr2b.totals.itcTotal;
  const netPayable = roundMoney2(Math.max(0, outwardTax - itc));

  return {
    period: toLegacyPeriodOpts(period),
    outward: {
      taxableValue: gstr1.totals.taxableValue,
      cgst: gstr1.totals.cgst,
      sgst: gstr1.totals.sgst,
      igst: gstr1.totals.igst,
      taxTotal: outwardTax,
      documentCount: gstr1.rowCount,
    },
    inward: {
      taxableValue: gstr2b.totals.taxableValue,
      cgst: gstr2b.totals.cgst,
      sgst: gstr2b.totals.sgst,
      igst: gstr2b.totals.igst,
      itcTotal: itc,
      billCount: gstr2b.rowCount,
    },
    net: {
      cgst: roundMoney2(Math.max(0, gstr1.totals.cgst - gstr2b.totals.cgst)),
      sgst: roundMoney2(Math.max(0, gstr1.totals.sgst - gstr2b.totals.sgst)),
      igst: roundMoney2(Math.max(0, gstr1.totals.igst - gstr2b.totals.igst)),
      totalPayable: netPayable,
    },
    note: "Summary from your saved sales and purchases. Verify against GST portal before filing.",
  };
}

export function gstr3bSummaryToCsv(summary) {
  const lines = [
    "GSTR-3B Summary",
    summary.note || "",
    "",
    "Section,CGST,SGST,IGST,Total",
    `Outward tax,${summary.outward.cgst},${summary.outward.sgst},${summary.outward.igst},${summary.outward.taxTotal}`,
    `ITC available,${summary.inward.cgst},${summary.inward.sgst},${summary.inward.igst},${summary.inward.itcTotal}`,
    `Net payable,${summary.net.cgst},${summary.net.sgst},${summary.net.igst},${summary.net.totalPayable}`,
  ];
  return lines.join("\n");
}

export function downloadGstr3bExport(summary) {
  const blob = new Blob([gstr3bSummaryToCsv(summary)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "gstr3b-summary.csv";
  a.click();
  URL.revokeObjectURL(url);
}
