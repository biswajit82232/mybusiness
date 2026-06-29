import { memo } from "react";
import { EXPENSE_CATEGORY_ALL } from "@/domain/index.js";
import { IcBell, IcBook, IcMenu, IcSearch } from "@/shared/ui/icons/AppIcons.jsx";
import { NotifPanel } from "@/features/home/index.js";

function resolveMobileTitle({
  screen,
  page,
  businessName,
  selCustomerName,
  selVendorName,
  selExpenseCategory,
  editingExpenseId,
  editingSaleId,
  editingVendorId,
  editingCustomerId,
  editingPurchaseId,
  bankAccountLabel,
  editingOtherIncomeId,
  inventoryItemDetailName,
  purchaseDetailSupplierName,
  emiDetailInvoiceNo,
}) {
  if (screen === "customerDetail") return selCustomerName || "Customer";
  if (screen === "vendorDetail") return selVendorName || "Vendor";
  if (screen === "newCustomer") return editingCustomerId ? "Edit customer" : "New customer";
  if (screen === "newVendor") return editingVendorId ? "Edit vendor" : "New vendor";
  if (screen === "expenseDetail") return "Expense";
  if (screen === "expenseCategory") {
    return selExpenseCategory === EXPENSE_CATEGORY_ALL ? "All transactions" : selExpenseCategory || "Category";
  }
  if (screen === "newExpense") return editingExpenseId ? "Edit expense" : "New expense";
  if (screen === "newSale") return editingSaleId ? "Edit Sale" : "New Sale";
  if (screen === "saleDetail") return "Invoice";
  if (screen === "bankAccountDetail") return bankAccountLabel || "Account";
  if (screen === "addStock") return "Stock";
  if (screen === "inventoryItemDetail") return inventoryItemDetailName || "Product";
  if (screen === "purchaseDetail") return purchaseDetailSupplierName || "Purchase";
  if (screen === "newPurchase") return editingPurchaseId ? "Edit purchase" : "New purchase";
  if (screen === "emiDetail") return emiDetailInvoiceNo?.trim() ? `EMI · ${emiDetailInvoiceNo.trim()}` : "EMI";
  if (screen === "search") return "Search";
  if (screen === "otherIncomeDetail") return "Other income";
  if (!screen && page === "dashboard") return businessName || "My Business";
  if (!screen && page === "invoices") return "Invoices";
  if (!screen && page === "customers") return "Customers";
  if (!screen && page === "vendors") return "Vendors";
  if (!screen && page === "receivables") return "Receivables";
  if (!screen && page === "purchases") return "Purchases";
  if (!screen && page === "payables") return "Payables";
  if (!screen && page === "emi") return "EMI";
  if (!screen && page === "servicing") return "Servicing";
  if (!screen && page === "inventory") return "Inventory";
  if (!screen && page === "branch") return "Branches";
  if (!screen && page === "products") return "Products";
  if (!screen && page === "accounts") return "Balance sheet";
  if (!screen && page === "banking") return "Banking";
  if (!screen && page === "payments") return "Payments";
  if (!screen && page === "fixedAssets") return "Fixed Assets";
  if (!screen && page === "cashFlow") return "Cash flow";
  if (!screen && page === "ledger") return "Ledger";
  if (!screen && page === "expenses") return "Expenses";
  if (screen === "newOtherIncome") return editingOtherIncomeId ? "Edit other income" : "Other income";
  if (!screen && page === "otherIncome") return "Other income";
  if (!screen && page === "reports") return "Reports";
  if (!screen && page === "capitalGrowth") return "Growth";
  if (!screen && page === "netWorth") return "Net Worth";
  if (!screen && page === "settings") return "Settings";
  return "My Business";
}

/** Short context line under the title on narrow viewports (main tabs only). */
function resolveMobileSubtitle({ screen, page }) {
  if (screen) return "";
  const TAB_SUB = {
    dashboard: "Overview",
    invoices: "Sales register",
    customers: "Directory & balances",
    receivables: "Outstanding invoices",
    payables: "Supplier credit",
    emi: "Finance & installments",
    servicing: "3 free visits per sale",
    inventory: "Stock by branch",
    branch: "Locations",
    products: "Catalog & pricing",
    accounts: "Assets & liabilities",
    banking: "Accounts & transfers",
    payments: "Receipts & disbursements",
    fixedAssets: "Depreciation",
    cashFlow: "Money in & out",
    ledger: "Journal lines",
    expenses: "Operating spend",
    otherIncome: "Non-sales income",
    reports: "P&L · activity",
    capitalGrowth: "Equity over time",
    netWorth: "Snapshot & goals",
    purchases: "Supplier buys & stock-in",
    vendors: "Saved suppliers",
    settings: "Preferences · backup",
  };
  return TAB_SUB[page] || "";
}

export const MobileAppBar = memo(function MobileAppBar({
  onOpenMenu,
  onOpenSearch,
  screen,
  page,
  businessName,
  selCustomerName,
  selVendorName,
  selExpenseCategory,
  editingExpenseId,
  editingSaleId,
  editingVendorId,
  editingCustomerId,
  editingPurchaseId,
  bankAccountLabel,
  editingOtherIncomeId,
  inventoryItemDetailName,
  purchaseDetailSupplierName,
  emiDetailInvoiceNo,
  payModal,
  delConfirm,
  effectiveNotifOpen,
  setNotifOpen,
  notifications,
  notifPerm,
  onRequestNotifPerm,
  onDismissAlert,
  onDismissAllAlerts,
  onNotificationClick,
  accountingBasis = "cash",
  onToggleAccountingBasis,
}) {
  const title = resolveMobileTitle({
    screen,
    page,
    businessName,
    selCustomerName,
    selVendorName,
    selExpenseCategory,
    editingExpenseId,
    editingSaleId,
    editingVendorId,
    editingCustomerId,
    editingPurchaseId,
    bankAccountLabel,
    editingOtherIncomeId,
    inventoryItemDetailName,
    purchaseDetailSupplierName,
    emiDetailInvoiceNo,
  });
  const subtitle = resolveMobileSubtitle({ screen, page });

  const notifAnchorHidden = !!(screen || payModal || delConfirm);
  const showDashboardNotif = !screen && page === "dashboard";

  return (
    <header className="mobile-appbar">
      <button type="button" className="hamburger-btn" onClick={onOpenMenu} aria-label="Open menu">
        <IcMenu />
      </button>
      <span className="mobile-appbar-title-wrap">
        <span className="mobile-appbar-title">{title}</span>
        {subtitle ? <span className="mobile-appbar-sub">{subtitle}</span> : null}
      </span>
      <div className="mobile-appbar-actions">
        {!screen && page === "dashboard" && typeof onToggleAccountingBasis === "function" && (
          <button
            type="button"
            className={`icon-btn mobile-appbar-basis${accountingBasis === "accrual" ? " mobile-appbar-basis--on" : ""}`}
            onClick={onToggleAccountingBasis}
            title={accountingBasis === "accrual" ? "Accrual basis (invoiced) — click for cash basis" : "Cash basis — click for accrual (invoiced)"}
            aria-label={accountingBasis === "accrual" ? "Accrual basis, click for cash basis" : "Cash basis, click for accrual basis"}
          >
            <IcBook />
          </button>
        )}
        <button type="button" className="icon-btn" onClick={onOpenSearch} aria-label="Search">
          <IcSearch />
        </button>
        {showDashboardNotif && (
          <div className={`notif-anchor-home${notifAnchorHidden ? " notif-anchor-hidden" : ""}`}>
            <button
              type="button"
              className={`notif-bell-btn${effectiveNotifOpen ? " active" : ""}`}
              onClick={() => setNotifOpen((v) => !v)}
              aria-label="Alerts"
            >
              <IcBell />
              {notifications.length > 0 && (
                <span className="notif-badge">{notifications.length > 9 ? "9+" : notifications.length}</span>
              )}
            </button>
            {effectiveNotifOpen && (
              <div className="notif-backdrop" onClick={() => setNotifOpen(false)} aria-hidden="true" />
            )}
            {effectiveNotifOpen && (
              <NotifPanel
                items={notifications}
                notifPerm={notifPerm}
                onRequestPerm={onRequestNotifPerm}
                onDismiss={onDismissAlert}
                onDismissAll={onDismissAllAlerts}
                onClick={onNotificationClick}
              />
            )}
          </div>
        )}
      </div>
    </header>
  );
});
