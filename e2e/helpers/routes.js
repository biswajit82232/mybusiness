/**
 * Main sidebar: label on the button → expected desktop `h1.tab-title` (or home).
 * Keep in sync with `AppSidebar.jsx` + each screen’s `TabPageChrome` / SalesTab / HomeTab.
 */
export const MAIN_NAV_ROUTES = [
  { sidebar: "Dashboard", assert: { kind: "home" } },
  { sidebar: "Invoices", assert: { kind: "title", text: "Invoices" } },
  { sidebar: "Customers", assert: { kind: "title", text: "Customers" } },
  { sidebar: "Receivables", assert: { kind: "title", text: "Receivables" } },
  { sidebar: "EMI", assert: { kind: "title", text: "EMI" } },
  { sidebar: "Payables", assert: { kind: "title", text: "Payables" } },
  { sidebar: "Purchases", assert: { kind: "title", text: "Purchases" } },
  { sidebar: "Vendors", assert: { kind: "title", text: "Vendors" } },
  { sidebar: "Inventory", assert: { kind: "title", text: "Inventory" } },
  { sidebar: "Branches", assert: { kind: "title", text: "Branches" } },
  { sidebar: "Products", assert: { kind: "title", text: "Products" } },
  { sidebar: "Bundles", assert: { kind: "title", text: "Bundles" } },
  { sidebar: "Balance sheet", assert: { kind: "title", text: "Balance sheet" } },
  { sidebar: "Banking", assert: { kind: "title", text: "Banking" } },
  { sidebar: "Fixed Assets", assert: { kind: "title", text: "Fixed Assets" } },
  { sidebar: "Cash flow", assert: { kind: "title", text: "Cash flow" } },
  { sidebar: "Ledger", assert: { kind: "title", text: "Ledger" } },
  { sidebar: "Expenses", assert: { kind: "title", text: "Expenses" } },
  { sidebar: "Other income", assert: { kind: "title", text: "Other income" } },
  { sidebar: "Reports", assert: { kind: "title", text: "Reports" } },
  { sidebar: "Growth", assert: { kind: "title", text: "Growth" } },
  { sidebar: "Net Worth", assert: { kind: "title", text: "Net Worth" } },
  { sidebar: "Loans given", assert: { kind: "title", text: "Loans given" } },
  { sidebar: "Settings", assert: { kind: "title", text: "Settings" } },
];
