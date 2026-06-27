import {
  IcBanking,
  IcBox,
  IcBranch,
  IcCashFlow,
  IcCatalog,
  IcChart,
  IcChevD,
  IcEmi,
  IcFinance,
  IcHome,
  IcIncome,
  IcLandmark,
  IcLedger,
  IcLogout,
  IcNetWorth,
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
import { memo, useCallback, useEffect, useState } from "react";
import { prefetchMainStagePage } from "@/features/main-stage/lazyMainStageScreens.jsx";

/** Warm route chunks on hover/focus so taps feel instant after browsing the menu. */
function tabPrefetchProps(pageId) {
  const run = () => prefetchMainStagePage(pageId);
  return { onPointerEnter: run, onFocus: run };
}

const NAV_GROUPS = [
  {
    id: "sales",
    label: "Sales",
    defaultOpen: true,
    items: [
      { page: "invoices", label: "Invoices", Icon: IcSales },
      { page: "customers", label: "Customers", Icon: IcUsers, screens: ["customerDetail"] },
      { page: "receivables", label: "Receivables", Icon: IcReceivable },
      { page: "emi", label: "EMI", Icon: IcEmi },
      { page: "servicing", label: "Servicing", Icon: IcServicing },
    ],
  },
  {
    id: "buy",
    label: "Buy & pay",
    items: [
      { page: "payables", label: "Payables", Icon: IcPayable },
      { page: "purchases", label: "Purchases", Icon: IcUpload },
      { page: "vendors", label: "Vendors", Icon: IcUsers, screens: ["vendorDetail"] },
    ],
  },
  {
    id: "stock",
    label: "Stock",
    items: [
      { page: "inventory", label: "Inventory", Icon: IcBox },
      { page: "branch", label: "Branches", Icon: IcBranch },
      { page: "products", label: "Products", Icon: IcCatalog },
    ],
  },
  {
    id: "finance",
    label: "Finance",
    items: [
      { page: "accounts", label: "Balance sheet", Icon: IcFinance },
      { page: "banking", label: "Banking", Icon: IcBanking, screens: ["bankAccountDetail"] },
      { page: "fixedAssets", label: "Fixed Assets", Icon: IcLandmark },
      { page: "cashFlow", label: "Cash flow", Icon: IcCashFlow },
      { page: "ledger", label: "Ledger", Icon: IcLedger },
    ],
  },
  {
    id: "costs",
    label: "Costs & income",
    items: [
      { page: "expenses", label: "Expenses", Icon: IcSpend, screens: ["expenseCategory"] },
      { page: "otherIncome", label: "Other income", Icon: IcIncome, screens: ["newOtherIncome"] },
    ],
  },
  {
    id: "reports",
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

function groupHasActive(page, screen, group) {
  return group.items.some((item) => isItemActive(page, screen, item));
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

function SidebarNavGroup({ group, page, screen, open, onToggle, onNav }) {
  const active = groupHasActive(page, screen, group);
  return (
    <details
      className={`sidebar-group${active ? " sidebar-group--active" : ""}`}
      open={open}
      onToggle={(e) => onToggle(group.id, e.currentTarget.open)}
    >
      <summary className="sidebar-group-summary">
        <span className="sidebar-group-label">{group.label}</span>
        <span className="sidebar-group-chev" aria-hidden="true">
          <IcChevD />
        </span>
      </summary>
      <div className="sidebar-group-body">
        {group.items.map((item) => (
          <SidebarNavItem
            key={item.page}
            item={item}
            active={isItemActive(page, screen, item)}
            onNav={onNav}
          />
        ))}
      </div>
    </details>
  );
}

export const AppSidebar = memo(function AppSidebar({ open, onClose, page, screen, alertCount, goPage, pendingOutbox = 0, onLogout }) {
  const nav = useCallback(
    (pageId) => {
      goPage(pageId);
    },
    [goPage],
  );

  const [openGroups, setOpenGroups] = useState(() =>
    Object.fromEntries(NAV_GROUPS.map((g) => [g.id, g.defaultOpen ?? false])),
  );

  useEffect(() => {
    setOpenGroups((prev) => {
      let next = prev;
      for (const group of NAV_GROUPS) {
        if (groupHasActive(page, screen, group) && !prev[group.id]) {
          if (next === prev) next = { ...prev };
          next[group.id] = true;
        }
      }
      return next;
    });
  }, [page, screen]);

  const onGroupToggle = useCallback((id, isOpen) => {
    setOpenGroups((prev) => (prev[id] === isOpen ? prev : { ...prev, [id]: isOpen }));
  }, []);

  const dashboardActive = !screen && page === "dashboard";

  return (
    <nav className={`sidebar${open ? " open" : ""}`} aria-label="Main navigation">
      <div className="sidebar-brand">
        <img src="/icon-192.png" alt="" className="sidebar-brand-logo" />
        <span className="sidebar-brand-name">MyBusiness</span>
        <button type="button" className="sidebar-close-btn" onClick={onClose} aria-label="Close menu">
          <IcX />
        </button>
      </div>

      <div className="sidebar-nav sidebar-nav-compact sidebar-nav-flat">
        <button
          type="button"
          className={`sidebar-item sidebar-item--top${dashboardActive ? " active" : ""}`}
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
          <SidebarNavGroup
            key={group.id}
            group={group}
            page={page}
            screen={screen}
            open={openGroups[group.id]}
            onToggle={onGroupToggle}
            onNav={nav}
          />
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
