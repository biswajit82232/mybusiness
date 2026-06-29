import { useMemo, useRef, useState, useEffect } from "react";
import {
  buildBillWisePlReport,
  buildCompanyLedgerReport,
  buildCompanyOutstandingReport,
  buildDailyExpensesReport,
  buildDaybookReport,
  buildInwardPaymentReport,
  buildInwardPaymentPartyReport,
  buildOtherDocumentProductReport,
  buildOtherDocumentReport,
  buildOtherDocumentPartyReport,
  buildOtherIncomeReport,
  buildOutwardPaymentReport,
  buildOutwardPaymentPartyReport,
  buildProductReport,
  buildPurchaseOutstandingReport,
  buildPurchaseOutstandingPartyReport,
  buildPurchasePartyReport,
  buildPurchaseProductReport,
  buildPurchaseReport,
  buildSalesOutstandingReport,
  buildSalesOutstandingPartyReport,
  buildSalesPartyReport,
  buildSalesProductReport,
  buildSalesReport,
  buildStockReport,
  computePlSnapshot,
  downloadGstr1Export,
  downloadGstr2bExport,
  downloadGstr3bExport,
  downloadReportCsv,
  downloadTallyExport,
  buildGstr1Summary,
  buildGstr2bSummary,
  buildGstr3bSummary,
  moneyFull,
  reportPeriodLabel,
  toLegacyPeriodOpts,
  tallyExportSummary,
} from "@/domain/index.js";
import { findReportCategory, findReportDef } from "./reportRegistry.js";
import { partyConfigForReport, reportSupportsPartyView } from "./reportViewConfig.js";
import { ReportDateRangeBar } from "./ReportDateRangeBar.jsx";
import { ReportExportBar, ReportKpiStrip, ReportLines, ReportNote, ReportTable } from "./ReportViewParts.jsx";
import { ReportPartyBody } from "./ReportPartyBody.jsx";
import { ReportViewToggle } from "./ReportViewToggle.jsx";
import { ReportPrintSheet } from "./ReportPrintSheet.jsx";
import { downloadReportPdf } from "./downloadReportPdf.js";
import { IcBack } from "@/shared/ui/icons/AppIcons.jsx";

export function ReportDetailScreen({
  reportId,
  period,
  onPeriodChange,
  onBack,
  sales,
  purchases,
  expenses,
  otherIncomes,
  inventoryEntries,
  invRows,
  balSum,
  settings,
  accountingBasis,
  fsm,
  fyYear,
  fyStr,
  businessName,
}) {
  const def = findReportDef(reportId);
  const category = findReportCategory(reportId);
  const periodLabel = reportPeriodLabel(period, fyStr);
  const legacyPeriod = useMemo(() => toLegacyPeriodOpts(period, fsm, fyYear), [period, fsm, fyYear]);
  const supportsParty = reportSupportsPartyView(reportId);
  const partyCfg = partyConfigForReport(reportId);
  const [viewMode, setViewMode] = useState("bill");

  useEffect(() => {
    setViewMode("bill");
  }, [reportId]);

  const data = useMemo(() => {
    if (viewMode === "party" && supportsParty) {
      switch (reportId) {
        case "sales":
          return buildSalesPartyReport(sales, period, fsm, fyYear);
        case "salesOutstanding":
          return buildSalesOutstandingPartyReport(sales, period, fsm, fyYear);
        case "inwardPayment":
          return buildInwardPaymentPartyReport(sales, period, fsm, fyYear);
        case "otherDocument":
          return buildOtherDocumentPartyReport(sales, period, fsm, fyYear);
        case "purchase":
          return buildPurchasePartyReport(purchases, period, fsm, fyYear);
        case "purchaseOutstanding":
          return buildPurchaseOutstandingPartyReport(purchases, period, fsm, fyYear);
        case "outwardPayment":
          return buildOutwardPaymentPartyReport(purchases, period, fsm, fyYear);
        default:
          break;
      }
    }
    const args = { sales, purchases, expenses, otherIncomes, inventoryEntries, period, fsm, fyYear };
    switch (reportId) {
      case "sales":
        return buildSalesReport(sales, period, fsm, fyYear);
      case "salesOutstanding":
        return buildSalesOutstandingReport(sales, period, fsm, fyYear);
      case "salesProduct":
        return buildSalesProductReport(sales, period, fsm, fyYear);
      case "inwardPayment":
        return buildInwardPaymentReport(sales, period, fsm, fyYear);
      case "purchase":
        return buildPurchaseReport(purchases, period, fsm, fyYear);
      case "purchaseOutstanding":
        return buildPurchaseOutstandingReport(purchases, period, fsm, fyYear);
      case "purchaseProduct":
        return buildPurchaseProductReport(purchases, period, fsm, fyYear);
      case "outwardPayment":
        return buildOutwardPaymentReport(purchases, period, fsm, fyYear);
      case "otherDocument":
        return buildOtherDocumentReport(sales, period, fsm, fyYear);
      case "otherDocumentProduct":
        return buildOtherDocumentProductReport(sales, period, fsm, fyYear);
      case "companyLedger":
        return buildCompanyLedgerReport(args);
      case "companyOutstanding":
        return buildCompanyOutstandingReport(sales, purchases, balSum);
      case "profitLoss":
        return computePlSnapshot({ sales, expenses, otherIncomes, accountingBasis, period, fsm, fyYear });
      case "billWisePl":
        return buildBillWisePlReport(sales, period, fsm, fyYear);
      case "stock":
        return buildStockReport(invRows);
      case "product":
        return buildProductReport(invRows, sales, purchases, period, fsm, fyYear);
      case "dailyExpenses":
        return buildDailyExpensesReport(expenses, period, fsm, fyYear);
      case "otherIncome":
        return buildOtherIncomeReport(otherIncomes, period, fsm, fyYear);
      case "daybook":
        return buildDaybookReport(args);
      case "gstr1":
        return buildGstr1Summary(sales, settings, legacyPeriod);
      case "gstr2b":
        return buildGstr2bSummary(purchases, settings, period);
      case "gstr3b":
        return buildGstr3bSummary({ sales, purchases }, settings, period);
      default:
        return null;
    }
  }, [
    reportId,
    sales,
    purchases,
    expenses,
    otherIncomes,
    inventoryEntries,
    invRows,
    balSum,
    settings,
    accountingBasis,
    period,
    fsm,
    fyYear,
    legacyPeriod,
    viewMode,
    supportsParty,
  ]);

  const tallySummary = useMemo(
    () => (reportId === "gstr1" ? null : tallyExportSummary({ sales, purchases, expenses }, legacyPeriod)),
    [reportId, sales, purchases, expenses, legacyPeriod],
  );

  const title = def?.title || "Report";
  const displayTitle = viewMode === "party" && supportsParty ? `${title} (${partyCfg?.partyLabel ?? "Party"} wise)` : title;
  const slug = reportId.replace(/[^\w]+/g, "-");
  const [pdfBusy, setPdfBusy] = useState(false);
  const printRef = useRef(null);

  const exportPdf = async () => {
    const el = printRef.current?.querySelector(".invoice-print-sheet");
    if (!el) return;
    setPdfBusy(true);
    try {
      await downloadReportPdf(el, { reportId, reportTitle: displayTitle });
    } finally {
      setPdfBusy(false);
    }
  };

  const exportCsv = () => {
    if (reportId === "gstr1") return downloadGstr1Export(data, "csv");
    if (reportId === "gstr2b") return downloadGstr2bExport(data);
    if (reportId === "gstr3b") return downloadGstr3bExport(data);
    const partySuffix = data?.view === "party" ? "-party-wise" : "";
    if (data?.view === "party" && data?.rows?.length) {
      const keys = Object.keys(data.rows[0]);
      return downloadReportCsv(`${slug}${partySuffix}.csv`, keys, (r) => keys.map((k) => r[k]), data.rows);
    }
    if (reportId === "sales") {
      return downloadReportCsv(
        `${slug}.csv`,
        ["Date", "Invoice", "Customer", "Amount", "Received", "Outstanding"],
        (r) => [r.date, r.invoiceNo, r.customerName, r.amount, r.received, r.outstanding],
        data.rows,
      );
    }
    if (reportId === "daybook" || reportId === "companyLedger") {
      return downloadReportCsv(
        `${slug}.csv`,
        ["Date", "Type", "Party", "Reference", "Debit", "Credit", "Balance"],
        (r) => [r.date, r.type, r.party, r.reference, r.debit, r.credit, r.balance ?? ""],
        data.rows,
      );
    }
    if (data?.rows) {
      const keys = Object.keys(data.rows[0] || {});
      return downloadReportCsv(`${slug}.csv`, keys, (r) => keys.map((k) => r[k]), data.rows);
    }
  };

  return (
    <>
      <div className="invoice-print-only" aria-hidden="true" ref={printRef}>
        <ReportPrintSheet
          businessName={businessName}
          categoryTitle={category?.title}
          reportTitle={displayTitle}
          periodLabel={periodLabel}
          accountingBasis={accountingBasis}
        >
          <ReportBody reportId={reportId} data={data} accountingBasis={accountingBasis} tallySummary={tallySummary} printMode />
        </ReportPrintSheet>
      </div>
      <header className="rep-detail-hdr">
        <button type="button" className="rep-back-btn" onClick={onBack} aria-label="Back to reports">
          <IcBack />
        </button>
        <div className="rep-detail-hdr-text">
          <p className="rep-detail-cat">{category?.title}</p>
          <h1 className="rep-detail-title">{displayTitle}</h1>
          <p className="rep-detail-meta">
            {businessName || "My Business"} · {periodLabel}
          </p>
        </div>
      </header>

      <ReportDateRangeBar period={period} onChange={onPeriodChange} fyStr={fyStr} />

      <div className="rep-detail-toolbar">
        {supportsParty ? (
          <ReportViewToggle viewMode={viewMode} onChange={setViewMode} partyLabel={partyCfg?.partyLabel ?? "Party"} />
        ) : (
          <span className="rep-detail-toolbar-spacer" />
        )}
        <ReportExportBar
          className="rep-export-actions--toolbar"
          onPdf={exportPdf}
          pdfBusy={pdfBusy}
          onCsv={reportId !== "companyOutstanding" && reportId !== "stock" ? exportCsv : undefined}
          onJson={reportId === "gstr1" ? () => downloadGstr1Export(data, "json") : undefined}
          extra={
            reportId === "gstr1" ? (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => downloadTallyExport({ sales, purchases, expenses, settings }, legacyPeriod)}
              >
                Tally XML
              </button>
            ) : null
          }
        />
      </div>

      <div className="tab-page-scroll rep-page rep-page--detail">
        <ReportBody reportId={reportId} data={data} accountingBasis={accountingBasis} tallySummary={tallySummary} />
      </div>
    </>
  );
}

function ReportBody({ reportId, data, accountingBasis, tallySummary, printMode = false }) {
  if (!data) return <p className="rep-empty">Report not found.</p>;
  if (data.view === "party") {
    return <ReportPartyBody reportId={reportId} data={data} printMode={printMode} />;
  }

  switch (reportId) {
    case "sales":
      return (
        <>
          <ReportKpiStrip printMode={printMode}
            items={[
              { label: "Invoices", value: data.count },
              { label: "Total", value: moneyFull(data.totals.amount) },
              { label: "Received", value: moneyFull(data.totals.received) },
              { label: "Outstanding", value: moneyFull(data.totals.outstanding) },
            ]}
          />
          <ReportTable printMode={printMode}
            columns={[
              { key: "date", label: "Date", format: "date" },
              { key: "invoiceNo", label: "Invoice" },
              { key: "customerName", label: "Customer", ellipsis: true },
              { key: "amount", label: "Amount", format: "money", num: true },
              { key: "received", label: "Received", format: "money", num: true },
              { key: "outstanding", label: "Due", format: "money", num: true },
            ]}
            rows={data.rows}
          />
        </>
      );

    case "salesOutstanding":
      return (
        <>
          <ReportKpiStrip printMode={printMode} items={[{ label: "Open bills", value: data.count }, { label: "Outstanding", value: moneyFull(data.totalOutstanding), danger: data.totalOutstanding > 0 }]} />
          <ReportTable printMode={printMode}
            columns={[
              { key: "date", label: "Date", format: "date" },
              { key: "invoiceNo", label: "Invoice" },
              { key: "customerName", label: "Customer", ellipsis: true },
              { key: "amount", label: "Bill amt", format: "money", num: true },
              { key: "outstanding", label: "Due", format: "money", num: true },
              { key: "dueDate", label: "Due date", format: "date" },
            ]}
            rows={data.rows}
            emptyText="No outstanding sales in this period."
          />
        </>
      );

    case "salesProduct":
      return (
        <>
          <ReportKpiStrip printMode={printMode} items={[{ label: "Products", value: data.rows.length }, { label: "Qty sold", value: data.totals.qty }, { label: "Sales value", value: moneyFull(data.totals.amount) }]} />
          <ReportTable printMode={printMode}
            columns={[
              { key: "product", label: "Product", ellipsis: true },
              { key: "qty", label: "Qty", num: true },
              { key: "amount", label: "Amount", format: "money", num: true },
              { key: "bills", label: "Bills", num: true },
            ]}
            rows={data.rows}
          />
        </>
      );

    case "inwardPayment":
      return (
        <>
          <ReportKpiStrip printMode={printMode} items={[{ label: "Receipts", value: data.count }, { label: "Total", value: moneyFull(data.total), positive: true }]} />
          <ReportTable printMode={printMode}
            columns={[
              { key: "date", label: "Date", format: "date" },
              { key: "invoiceNo", label: "Invoice" },
              { key: "customerName", label: "Customer", ellipsis: true },
              { key: "amount", label: "Amount", format: "money", num: true },
              { key: "mode", label: "Mode" },
            ]}
            rows={data.rows}
          />
        </>
      );

    case "purchase":
      return (
        <>
          <ReportKpiStrip printMode={printMode}
            items={[
              { label: "Bills", value: data.count },
              { label: "Purchases", value: moneyFull(data.totals.amount) },
              { label: "Paid", value: moneyFull(data.totals.paid) },
              { label: "Outstanding", value: moneyFull(data.totals.outstanding) },
            ]}
          />
          <ReportTable printMode={printMode}
            columns={[
              { key: "date", label: "Date", format: "date" },
              { key: "invoiceRef", label: "Ref" },
              { key: "supplierName", label: "Supplier", ellipsis: true },
              { key: "amount", label: "Amount", format: "money", num: true },
              { key: "paid", label: "Paid", format: "money", num: true },
              { key: "outstanding", label: "Due", format: "money", num: true },
            ]}
            rows={data.rows}
          />
        </>
      );

    case "purchaseOutstanding":
      return (
        <>
          <ReportKpiStrip printMode={printMode} items={[{ label: "Open bills", value: data.count }, { label: "Payables", value: moneyFull(data.totalOutstanding), danger: data.totalOutstanding > 0 }]} />
          <ReportTable printMode={printMode}
            columns={[
              { key: "date", label: "Date", format: "date" },
              { key: "invoiceRef", label: "Ref" },
              { key: "supplierName", label: "Supplier", ellipsis: true },
              { key: "amount", label: "Bill amt", format: "money", num: true },
              { key: "outstanding", label: "Due", format: "money", num: true },
              { key: "dueDate", label: "Due date", format: "date" },
            ]}
            rows={data.rows}
          />
        </>
      );

    case "purchaseProduct":
      return (
        <>
          <ReportKpiStrip printMode={printMode} items={[{ label: "Products", value: data.rows.length }, { label: "Qty", value: data.totals.qty }, { label: "Purchase value", value: moneyFull(data.totals.amount) }]} />
          <ReportTable printMode={printMode}
            columns={[
              { key: "product", label: "Product", ellipsis: true },
              { key: "qty", label: "Qty", num: true },
              { key: "amount", label: "Amount", format: "money", num: true },
              { key: "bills", label: "Bills", num: true },
            ]}
            rows={data.rows}
          />
        </>
      );

    case "outwardPayment":
      return (
        <>
          <ReportKpiStrip printMode={printMode} items={[{ label: "Payments", value: data.count }, { label: "Total paid", value: moneyFull(data.total) }]} />
          <ReportTable printMode={printMode}
            columns={[
              { key: "date", label: "Date", format: "date" },
              { key: "invoiceRef", label: "Ref" },
              { key: "supplierName", label: "Supplier", ellipsis: true },
              { key: "amount", label: "Amount", format: "money", num: true },
            ]}
            rows={data.rows}
          />
        </>
      );

    case "otherDocument":
      return (
        <>
          <ReportKpiStrip printMode={printMode} items={[{ label: "Documents", value: data.count }, { label: "Amount", value: moneyFull(data.totals.amount) }]} />
          <ReportTable printMode={printMode}
            columns={[
              { key: "date", label: "Date", format: "date" },
              { key: "invoiceNo", label: "No" },
              { key: "customerName", label: "Customer", ellipsis: true },
              { key: "amount", label: "Amount", format: "money", num: true },
            ]}
            rows={data.rows}
            emptyText="No bills of supply in this period."
          />
        </>
      );

    case "otherDocumentProduct":
      return (
        <ReportTable printMode={printMode}
          columns={[
            { key: "product", label: "Product", ellipsis: true },
            { key: "qty", label: "Qty", num: true },
            { key: "amount", label: "Amount", format: "money", num: true },
          ]}
          rows={data.rows}
          emptyText="No products on other documents in this period."
        />
      );

    case "companyOutstanding":
      return (
        <>
          <ReportKpiStrip printMode={printMode}
            items={[
              { label: "Receivables", value: moneyFull(data.receivables) },
              { label: "Payables", value: moneyFull(data.payables), danger: data.payables > 0 },
              { label: "Net", value: moneyFull(data.net) },
            ]}
          />
          <ReportLines printMode={printMode}
            lines={[
              { label: "Customer receivables (all open invoices)", value: moneyFull(data.receivables) },
              { label: "Supplier payables (purchase bills)", value: moneyFull(data.payables) },
              { label: "Supplier credit (balance sheet)", value: moneyFull(data.purchaseCredit) },
              { label: "Customer advance liability", value: moneyFull(data.customerAdvance) },
              { label: "Net outstanding (AR − AP)", value: moneyFull(data.net), total: true },
            ]}
          />
        </>
      );

    case "profitLoss":
      return (
        <>
          <ReportKpiStrip printMode={printMode} items={[{ label: "Net profit", value: moneyFull(data.netProfit), positive: data.netProfit >= 0 }]} />
          <ReportLines printMode={printMode}
            lines={[
              {
                label: accountingBasis === "accrual" ? "Revenue (invoiced)" : "Revenue (cash collected)",
                value: moneyFull(data.revenue),
              },
              { label: "Cost of goods sold", value: `−${moneyFull(data.cogs)}`, neg: true },
              { label: "Gross profit", value: moneyFull(data.grossProfit), sub: true, pos: data.grossProfit >= 0 },
              ...(data.otherIncome > 0 ? [{ label: "Other income", value: `+${moneyFull(data.otherIncome)}`, pos: true }] : []),
              { label: "Operating expenses", value: `−${moneyFull(data.expenses)}`, neg: true },
              ...(data.taxExpense > 0
                ? [
                    { label: "Profit before tax", value: moneyFull(data.pbt), sub: true },
                    { label: "Income tax", value: `−${moneyFull(data.taxExpense)}`, neg: true },
                  ]
                : []),
              { label: "Net profit", value: moneyFull(data.pat), total: true, pos: data.pat >= 0 },
            ]}
          />
        </>
      );

    case "billWisePl":
      return (
        <>
          <ReportKpiStrip printMode={printMode}
            items={[
              { label: "Bills", value: data.rows.length },
              { label: "Revenue", value: moneyFull(data.totals.revenue) },
              { label: "Profit", value: moneyFull(data.totals.profit), positive: data.totals.profit >= 0 },
            ]}
          />
          <ReportTable printMode={printMode}
            columns={[
              { key: "date", label: "Date", format: "date" },
              { key: "invoiceNo", label: "Invoice" },
              { key: "customerName", label: "Customer", ellipsis: true },
              { key: "revenue", label: "Revenue", format: "money", num: true },
              { key: "cost", label: "Cost", format: "money", num: true },
              { key: "profit", label: "Profit", format: "money", num: true },
              { key: "marginPct", label: "Margin", format: "pct", num: true },
            ]}
            rows={data.rows}
          />
        </>
      );

    case "stock":
      return (
        <>
          <ReportKpiStrip printMode={printMode}
            items={[
              { label: "SKUs", value: data.skuCount },
              { label: "Stock value", value: moneyFull(data.totals.stockValue) },
              { label: "Out of stock", value: data.outOfStock, danger: data.outOfStock > 0 },
            ]}
          />
          <ReportTable printMode={printMode}
            columns={[
              { key: "product", label: "Product", ellipsis: true },
              { key: "qty", label: "Qty", num: true },
              { key: "avgCost", label: "Avg cost", format: "money", num: true },
              { key: "stockValue", label: "Value", format: "money", num: true },
            ]}
            rows={data.rows}
          />
        </>
      );

    case "product":
      return (
        <ReportTable printMode={printMode}
          columns={[
            { key: "product", label: "Product", ellipsis: true },
            { key: "stockQty", label: "Stock qty", num: true },
            { key: "stockValue", label: "Stock value", format: "money", num: true },
            { key: "soldQty", label: "Sold qty", num: true },
            { key: "soldAmount", label: "Sold amt", format: "money", num: true },
            { key: "purchasedQty", label: "Purch qty", num: true },
            { key: "purchasedAmount", label: "Purch amt", format: "money", num: true },
          ]}
          rows={data.rows}
        />
      );

    case "dailyExpenses":
      return (
        <>
          <ReportKpiStrip printMode={printMode} items={[{ label: "Days", value: data.rows.length }, { label: "Total", value: moneyFull(data.total) }]} />
          <ReportTable printMode={printMode}
            columns={[
              { key: "date", label: "Date", format: "date" },
              { key: "count", label: "Entries", num: true },
              { key: "categories", label: "Categories", ellipsis: true },
              { key: "amount", label: "Amount", format: "money", num: true },
            ]}
            rows={data.rows}
          />
        </>
      );

    case "otherIncome":
      return (
        <>
          <ReportKpiStrip printMode={printMode} items={[{ label: "Entries", value: data.count }, { label: "Total", value: moneyFull(data.total), positive: true }]} />
          <ReportTable printMode={printMode}
            columns={[
              { key: "date", label: "Date", format: "date" },
              { key: "category", label: "Category" },
              { key: "description", label: "Description", ellipsis: true },
              { key: "amount", label: "Amount", format: "money", num: true },
            ]}
            rows={data.rows}
          />
        </>
      );

    case "daybook":
    case "companyLedger":
      return (
        <>
          <ReportKpiStrip printMode={printMode}
            items={[
              { label: "Entries", value: data.count },
              { label: "Debit", value: moneyFull(data.totals.debit) },
              { label: "Credit", value: moneyFull(data.totals.credit) },
            ]}
          />
          <ReportTable printMode={printMode}
            columns={[
              { key: "date", label: "Date", format: "date" },
              { key: "type", label: "Type" },
              { key: "party", label: "Party", ellipsis: true },
              { key: "reference", label: "Reference", ellipsis: true },
              { key: "debit", label: "Debit", format: "money", num: true },
              { key: "credit", label: "Credit", format: "money", num: true },
              { key: "balance", label: "Balance", format: "money", num: true },
            ]}
            rows={data.rows}
          />
        </>
      );

    case "gstr1":
      return (
        <>
          <ReportNote printMode={printMode}>Outward supply from tax invoices, credit notes, and debit notes.</ReportNote>
          <ReportKpiStrip printMode={printMode}
            items={[
              { label: "Documents", value: data.rowCount },
              { label: "Taxable", value: moneyFull(data.totals.taxableValue) },
              { label: "B2B", value: data.b2b.length },
              { label: "Total tax", value: moneyFull(data.totals.taxTotal) },
            ]}
          />
          <h3 className="rep-st">B2B invoices</h3>
          <ReportTable printMode={printMode}
            columns={[
              { key: "date", label: "Date", format: "date" },
              { key: "invoiceNo", label: "Invoice" },
              { key: "customerName", label: "Customer", ellipsis: true },
              { key: "customerGstin", label: "GSTIN" },
              { key: "taxableValue", label: "Taxable", format: "money", num: true },
              { key: "invoiceValue", label: "Value", format: "money", num: true },
            ]}
            rows={data.b2b}
            emptyText="No B2B invoices in period."
          />
          <h3 className="rep-st">HSN summary</h3>
          <ReportTable printMode={printMode}
            columns={[
              { key: "hsn", label: "HSN" },
              { key: "gstRate", label: "Rate %", num: true },
              { key: "quantity", label: "Qty", num: true },
              { key: "taxableValue", label: "Taxable", format: "money", num: true },
              { key: "cgst", label: "CGST", format: "money", num: true },
              { key: "sgst", label: "SGST", format: "money", num: true },
              { key: "igst", label: "IGST", format: "money", num: true },
            ]}
            rows={data.hsnSummary}
          />
          {tallySummary ? (
            <ReportNote printMode={printMode}>
              Tally export: {tallySummary.sales} sales, {tallySummary.purchases} purchases in period.
            </ReportNote>
          ) : null}
        </>
      );

    case "gstr2b":
      return (
        <>
          <ReportNote printMode={printMode}>{data.note}</ReportNote>
          <ReportKpiStrip printMode={printMode}
            items={[
              { label: "Bills", value: data.rowCount },
              { label: "Taxable", value: moneyFull(data.totals.taxableValue) },
              { label: "ITC", value: moneyFull(data.totals.itcTotal) },
            ]}
          />
          <ReportTable printMode={printMode}
            columns={[
              { key: "date", label: "Date", format: "date" },
              { key: "supplierName", label: "Supplier", ellipsis: true },
              { key: "invoiceRef", label: "Ref" },
              { key: "taxableValue", label: "Taxable", format: "money", num: true },
              { key: "itcAvailable", label: "ITC", format: "money", num: true },
              { key: "invoiceValue", label: "Bill value", format: "money", num: true },
            ]}
            rows={data.rows}
          />
        </>
      );

    case "gstr3b":
      return (
        <>
          <ReportNote printMode={printMode}>{data.note}</ReportNote>
          <ReportKpiStrip printMode={printMode} items={[{ label: "Net tax payable", value: moneyFull(data.net.totalPayable), danger: data.net.totalPayable > 0 }]} />
          <ReportLines printMode={printMode}
            lines={[
              { label: "Outward taxable value", value: moneyFull(data.outward.taxableValue) },
              { label: "Outward CGST", value: moneyFull(data.outward.cgst) },
              { label: "Outward SGST", value: moneyFull(data.outward.sgst) },
              { label: "Outward IGST", value: moneyFull(data.outward.igst) },
              { label: "Total outward tax", value: moneyFull(data.outward.taxTotal), sub: true },
              { label: "ITC available", value: moneyFull(data.inward.itcTotal) },
              { label: "Net CGST payable", value: moneyFull(data.net.cgst) },
              { label: "Net SGST payable", value: moneyFull(data.net.sgst) },
              { label: "Net IGST payable", value: moneyFull(data.net.igst) },
              { label: "Total net payable", value: moneyFull(data.net.totalPayable), total: true },
            ]}
          />
        </>
      );

    default:
      return <p className="rep-empty">Report not available.</p>;
  }
}
