/** @typedef {{ id: string, title: string, description?: string }} ReportDef */
/** @typedef {{ id: string, title: string, reports: ReportDef[] }} ReportCategory */

/** @type {ReportCategory[]} */
export const REPORT_CATEGORIES = [
  {
    id: "sales",
    title: "Sales Reports",
    reports: [
      { id: "sales", title: "Sales", description: "Tax invoices in period · bill or customer wise" },
      { id: "salesOutstanding", title: "Sales Outstanding", description: "Open receivables · bill or customer wise" },
      { id: "salesProduct", title: "Sales Product Report", description: "Qty & value by product sold" },
      { id: "inwardPayment", title: "Inward Payment", description: "Customer receipts · bill or customer wise" },
    ],
  },
  {
    id: "purchase",
    title: "Purchase Reports",
    reports: [
      { id: "purchase", title: "Purchase", description: "Purchase bills · bill or supplier wise" },
      { id: "purchaseOutstanding", title: "Purchase Outstanding", description: "Open payables · bill or supplier wise" },
      { id: "purchaseProduct", title: "Purchase Product Report", description: "Qty & value by product purchased" },
      { id: "outwardPayment", title: "Outward Payment", description: "Supplier payments · bill or supplier wise" },
    ],
  },
  {
    id: "other",
    title: "Other Reports",
    reports: [
      { id: "otherDocument", title: "Other Document", description: "Bills of supply & non-GST sales" },
      { id: "otherDocumentProduct", title: "Other Document Product Report", description: "Products on bills of supply" },
      { id: "companyLedger", title: "Company Ledger", description: "All transactions in period" },
      { id: "companyOutstanding", title: "Company Outstanding", description: "Receivables & payables summary" },
      { id: "profitLoss", title: "Profit & Loss Report", description: "Revenue, COGS, expenses & net profit" },
      { id: "billWisePl", title: "Bill Wise Profit & Loss", description: "Per-invoice gross profit" },
      { id: "stock", title: "Stock Report", description: "Current inventory valuation" },
      { id: "product", title: "Product Report", description: "Stock, sales & purchase by product" },
      { id: "dailyExpenses", title: "Daily Expenses", description: "Expense totals by day" },
      { id: "otherIncome", title: "Other Income", description: "Non-operating income in period" },
      { id: "daybook", title: "Daybook", description: "Chronological cash & book entries" },
    ],
  },
  {
    id: "gst",
    title: "GST Reports",
    reports: [
      { id: "gstr1", title: "GSTR-1", description: "Outward supplies — B2B & HSN summary" },
      { id: "gstr2b", title: "GSTR-2B", description: "Inward supplies & estimated ITC" },
      { id: "gstr3b", title: "GSTR-3B", description: "Net tax payable summary" },
    ],
  },
];

/** @returns {ReportDef|null} */
export function findReportDef(reportId) {
  for (const cat of REPORT_CATEGORIES) {
    const hit = cat.reports.find((r) => r.id === reportId);
    if (hit) return hit;
  }
  return null;
}

/** @returns {ReportCategory|null} */
export function findReportCategory(reportId) {
  for (const cat of REPORT_CATEGORIES) {
    if (cat.reports.some((r) => r.id === reportId)) return cat;
  }
  return null;
}

export const ALL_REPORT_IDS = REPORT_CATEGORIES.flatMap((c) => c.reports.map((r) => r.id));
