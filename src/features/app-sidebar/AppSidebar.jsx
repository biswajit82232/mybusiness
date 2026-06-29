import {
  IcBanking,
  IcBox,
  IcBranch,
  IcCashFlow,
  IcCatalog,
  IcChart,
  IcEmi,
  IcFinance,
  IcHome,
  IcIncome,
  IcLandmark,
  IcLedger,
  IcLogout,
  IcNetWorth,
  IcPayment,
  IcReceivable,
  IcServicing,
  IcPayable,
  IcReport,
  IcSales,
  IcSettings,
  IcSpend,
  IcUpload,
  IcUsers,
  IcX,
} from "@/shared/ui/icons/AppIcons.jsx";
import { memo, useCallback } from "react";
import { prefetchMainStagePage } from "@/features/main-stage/lazyMainStageScreens.jsx";

/** Warm route chunks on hover/focus so taps feel instant after browsing the menu. */
function tabPrefetchProps(pageId) {
  const run = () => prefetchMainStagePage(pageId);
  return { onPointerEnter: run, onFocus: run };
}

const NAV_GROUPS = [
  {
    label: "Sales",
    items: [
      { page: "invoices", label: "Invoices", Icon: IcSales },
      { page: "customers", label: "Customers", Icon: IcUsers, screens: ["customerDetail"] },
      { page: "receivables", label: "Receivables", Icon: IcReceivable },
      { page: "emi", label: "EMI", Icon: IcEmi },
      { page: "servicing", label: "Servicing", Icon: IcServicing },
    ],
  },
  {
    label: "Purchasing",
    items: [
      { page: "payables", label: "Payables", Icon: IcPayable },
      { page: "purchases", label: "Purchases", Icon: IcUpload },
      { page: "vendors", label: "Vendors", Icon: IcUsers, screens: ["vendorDetail"] },
    ],
  },
  {
    label: "Stock",
    items: [
      { page: "inventory", label: "Inventory", Icon: IcBox },
      { page: "branch", label: "Branches", Icon: IcBranch },
      { page: "products", label: "Products", Icon: IcCatalog },
    ],
  },
  {
    label: "Finance",
    items: [
      { page: "accounts", label: "Balance sheet", Icon: IcFinance },
      { page: "banking", label: "Banking", Icon: IcBanking, screens: ["bankAccountDetail"] },
      { page: "fixedAssets", label: "Fixed Assets", Icon: IcLandmark },
      { page: "cashFlow", label: "Cash flow", Icon: IcCashFlow },
      { page: "ledger", label: "Ledger", Icon: IcLedger },
      { page: "payments", label: "Payments In/Out", Icon: IcPayment },
    ],
  },
  {
    label: "Costs & income",
    items: [
      { page: "expenses", label: "Expenses", Icon: IcSpend, screens: ["expenseCategory"] },
      { page: "otherIncome", label: "Other income", Icon: IcIncome, screens: ["newOtherIncome"] },
    ],
  },
  {
    label: "Reports",
    items: [
      { page: "reports", label: "Reports", Icon: IcReport },
      { page: "capitalGrowth", label: "Growth", Icon: IcChart },
      { page: "netWorth", label: "Net Worth", Icon: IcNetWorth },
    ],
  },
];

function isItemActive(page, screen, item) {
  if (item.screens?.includes(screen)) return true;
  return !screen && page === item.page;
}

function SidebarNavItem({ item, active, onNav }) {
  const { Icon } = item;
  return (
    <button
      type="button"
      className={`sidebar-item${active ? " active" : ""}`}
      {...tabPrefetchProps(item.page)}
      onClick={() => onNav(item.page)}
    >
      <span className="sidebar-item-icon">
        <Icon />
      </span>
      <span className="sidebar-item-label">{item.label}</span>
    </button>
  );
}

export const AppSidebar = memo(function AppSidebar({ open, onClose, page, screen, alertCount, goPage, pendingOutbox = 0, onLogout }) {
  const nav = useCallback(
    (pageId) => {
      goPage(pageId);
    },
    [goPage],
  );

  return (
    <nav className={`sidebar${open ? " open" : ""}`} aria-label="Main navigation">
      <div className="sidebar-brand">
        <img src="/icon-192.png" alt="" className="sidebar-brand-logo" />
        <span className="sidebar-brand-name">MyBusiness</span>
        <button type="button" className="sidebar-close-btn" onClick={onClose} aria-label="Close menu">
          <IcX />
        </button>
      </div>

      <div className="sidebar-nav sidebar-nav-compact sidebar-nav-flat sidebar-nav-grouped">
        <p className="sidebar-section-label">Overview</p>
        <button
          type="button"
          className={`sidebar-item${!screen && page === "dashboard" ? " active" : ""}`}
          {...tabPrefetchProps("dashboard")}
          onClick={() => nav("dashboard")}
        >
          <span className="sidebar-item-icon">
            <IcHome />
          </span>
          <span className="sidebar-item-label">Dashboard</span>
          {alertCount > 0 && <span className="sidebar-item-badge">{alertCount > 99 ? "99+" : alertCount}</span>}
        </button>

        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="sidebar-section">
            <p className="sidebar-section-label">{group.label}</p>
            {group.items.map((item) => (
              <SidebarNavItem
                key={item.page}
                item={item}
                active={isItemActive(page, screen, item)}
                onNav={nav}
              />
            ))}
          </div>
        ))}
      </div>

      <div className="sidebar-footer sidebar-footer-compact">
        <button
          type="button"
          className={`sidebar-item${!screen && page === "settings" ? " active" : ""}`}
          {...tabPrefetchProps("settings")}
          onClick={() => nav("settings")}
        >
          <span className="sidebar-item-icon">
            <IcSettings />
          </span>
          <span className="sidebar-item-label">Settings</span>
          {pendingOutbox > 0 && (
            <span className="sidebar-item-badge" title="Pending cloud sync">
              {pendingOutbox > 99 ? "99+" : pendingOutbox}
            </span>
          )}
        </button>
        <button
          type="button"
          className="sidebar-item"
          onClick={() => {
            onClose();
            onLogout();
          }}
          aria-label="Sign out"
        >
          <span className="sidebar-item-icon">
            <IcLogout />
          </span>
          <span className="sidebar-item-label">Sign out</span>
        </button>
      </div>
    </nav>
  );
});
