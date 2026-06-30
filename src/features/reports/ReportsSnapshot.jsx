import { useMemo, useRef, useState } from "react";
import { computePlSnapshot } from "@/domain/profitLoss.js";
import { isDateInReportPeriod } from "@/domain/reportPeriod.js";
import { moneyFull, num } from "@/domain/index.js";
import { ReportPrintSheet } from "./ReportPrintSheet.jsx";
import { downloadReportPdf } from "./downloadReportPdf.js";

function pctOf(part, whole) {
  if (whole == null || whole <= 0) return null;
  return (num(part) / num(whole)) * 100;
}

function fmtPct(p) {
  if (p == null || Number.isNaN(p)) return "—";
  return `${p.toFixed(1)}%`;
}

function SnapshotContent({ pl, exec, purchasePeriodTotal, balSum, accountingBasis }) {
  return (
    <>
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
            <span className="rep-snap-v">{fmtPct(exec.collection)}</span>
          </li>
          <li>
            <span className="rep-snap-k">Op. expense ratio</span>
            <span className="rep-snap-v">{fmtPct(exec.expenseRatio)}</span>
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
      <p className="rep-muted rep-snap-basis">
        {accountingBasis === "accrual" ? "Accrual basis" : "Cash basis"}
        {accountingBasis !== "accrual" ? " · Collection rate on accrual only" : ""}
      </p>
    </>
  );
}

export function ReportsSnapshot({
  sales = [],
  expenses = [],
  otherIncomes = [],
  purchases = [],
  balSum = {},
  bankTransfers = [],
  period,
  fsm,
  fyYear,
  accountingBasis = "cash",
  businessName,
  periodLabel,
}) {
  const [pdfBusy, setPdfBusy] = useState(false);
  const printRef = useRef(null);

  const pl = useMemo(
    () =>
      computePlSnapshot({
        sales,
        expenses,
        otherIncomes,
        bankTransfers,
        accountingBasis,
        period,
        fsm,
        fyYear,
      }),
    [sales, expenses, otherIncomes, bankTransfers, accountingBasis, period, fsm, fyYear],
  );

  const filtSales = useMemo(
    () => (sales || []).filter((s) => s && isDateInReportPeriod(s.date, period, fsm, fyYear)),
    [sales, period, fsm, fyYear],
  );

  const filtPurchases = useMemo(
    () => (purchases || []).filter((p) => p && isDateInReportPeriod(p.date, period, fsm, fyYear)),
    [purchases, period, fsm, fyYear],
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
    };
  }, [pl, filtSales, accountingBasis]);

  const purchasePeriodTotal = useMemo(
    () => filtPurchases.reduce((a, p) => a + num(p.totalAmount), 0),
    [filtPurchases],
  );

  const exportPdf = async () => {
    const el = printRef.current?.querySelector(".invoice-print-sheet");
    if (!el) return;
    setPdfBusy(true);
    try {
      await downloadReportPdf(el, { reportId: "snapshot", reportTitle: "Executive Snapshot" });
    } finally {
      setPdfBusy(false);
    }
  };

  return (
    <section className="rep-section rep-section--minimal rep-section--flush rep-hub-snapshot" aria-labelledby="rep-snapshot-title">
      <div className="invoice-print-only" aria-hidden="true" ref={printRef}>
        <ReportPrintSheet
          businessName={businessName}
          categoryTitle="Reports"
          reportTitle="Executive Snapshot"
          periodLabel={periodLabel}
          accountingBasis={accountingBasis}
        >
          <SnapshotContent pl={pl} exec={exec} purchasePeriodTotal={purchasePeriodTotal} balSum={balSum} accountingBasis={accountingBasis} />
        </ReportPrintSheet>
      </div>
      <div className="rep-snapshot-hdr">
        <h2 id="rep-snapshot-title" className="rep-st">
          Snapshot
        </h2>
        <button type="button" className="btn btn-secondary btn-sm" disabled={pdfBusy} onClick={exportPdf}>
          {pdfBusy ? "Preparing…" : "PDF"}
        </button>
      </div>
      <SnapshotContent pl={pl} exec={exec} purchasePeriodTotal={purchasePeriodTotal} balSum={balSum} accountingBasis={accountingBasis} />
    </section>
  );
}
