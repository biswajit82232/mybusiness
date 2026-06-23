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
  IcMoon,
  IcNetWorth,
  IcReceivable,
  IcServicing,
  IcPayable,
  IcReport,
  IcSales,
  IcSettings,
  IcSearch,
  IcSpend,
  IcSun,
  IcUsers,
  IcUpload,
  IcX,
} from "@/shared/ui/icons/AppIcons.jsx";
import { prefetchMainStagePage } from "@/features/main-stage/lazyMainStageScreens.jsx";

/** Warm route chunks on hover/focus so taps feel instant after browsing the menu. */
function tabPrefetchProps(pageId) {
  const run = () => prefetchMainStagePage(pageId);
  return { onPointerEnter: run, onFocus: run };
}

export function AppSidebar({ open, onClose, page, screen, alertCount, goPage, darkMode, setDarkMode, pendingOutbox = 0, onLogout, onOpenSearch }) {
  const nav = (pageId) => {
    goPage(pageId);
  };
  const isActive = (pageId) => !screen && page === pageId;

  return (
    <nav className={`sidebar${open ? " open" : ""}`} aria-label="Main navigation">
      {/* Brand */}
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
          className={`sidebar-item${isActive("dashboard") ? " active" : ""}`}
          {...tabPrefetchProps("dashboard")}
          onClick={() => nav("dashboard")}
        >
          <span className="sidebar-item-icon">
            <IcHome />
          </span>
          <span className="sidebar-item-label">Dashboard</span>
          {alertCount > 0 && <span className="sidebar-item-badge">{alertCount > 99 ? "99+" : alertCount}</span>}
        </button>
        <button
          type="button"
          className={`sidebar-item${screen === "search" ? " active" : ""}`}
          onClick={() => {
            onOpenSearch?.();
            onClose?.();
          }}
        >
          <span className="sidebar-item-icon">
            <IcSearch />
          </span>
          <span className="sidebar-item-label">Search</span>
        </button>

        <p className="sidebar-section-label">Sales</p>
        <button
          type="button"
          className={`sidebar-item${isActive("invoices") ? " active" : ""}`}
          {...tabPrefetchProps("invoices")}
          onClick={() => nav("invoices")}
        >
          <span className="sidebar-item-icon">
            <IcSales />
          </span>
          <span className="sidebar-item-label">Invoices</span>
        </button>
        <button
          type="button"
          className={`sidebar-item${isActive("customers") || screen === "customerDetail" ? " active" : ""}`}
          {...tabPrefetchProps("customers")}
          onClick={() => nav("customers")}
        >
          <span className="sidebar-item-icon">
            <IcUsers />
          </span>
          <span className="sidebar-item-label">Customers</span>
        </button>
        <button
          type="button"
          className={`sidebar-item${isActive("receivables") ? " active" : ""}`}
          {...tabPrefetchProps("receivables")}
          onClick={() => nav("receivables")}
        >
          <span className="sidebar-item-icon">
            <IcReceivable />
          </span>
          <span className="sidebar-item-label">Receivables</span>
        </button>
        <button
          type="button"
          className={`sidebar-item${isActive("emi") ? " active" : ""}`}
          {...tabPrefetchProps("emi")}
          onClick={() => nav("emi")}
        >
          <span className="sidebar-item-icon">
            <IcEmi />
          </span>
          <span className="sidebar-item-label">EMI</span>
        </button>
        <button
          type="button"
          className={`sidebar-item${isActive("servicing") ? " active" : ""}`}
          {...tabPrefetchProps("servicing")}
          onClick={() => nav("servicing")}
        >
          <span className="sidebar-item-icon">
            <IcServicing />
          </span>
          <span className="sidebar-item-label">Servicing</span>
        </button>

        <p className="sidebar-section-label">Purchasing</p>
        <button
          type="button"
          className={`sidebar-item${isActive("payables") ? " active" : ""}`}
          {...tabPrefetchProps("payables")}
          onClick={() => nav("payables")}
        >
          <span className="sidebar-item-icon">
            <IcPayable />
          </span>
          <span className="sidebar-item-label">Payables</span>
        </button>
        <button
          type="button"
          className={`sidebar-item${isActive("purchases") ? " active" : ""}`}
          {...tabPrefetchProps("purchases")}
          onClick={() => nav("purchases")}
        >
          <span className="sidebar-item-icon">
            <IcUpload />
          </span>
          <span className="sidebar-item-label">Purchases</span>
        </button>
        <button
          type="button"
          className={`sidebar-item${isActive("vendors") || screen === "vendorDetail" ? " active" : ""}`}
          {...tabPrefetchProps("vendors")}
          onClick={() => nav("vendors")}
        >
          <span className="sidebar-item-icon">
            <IcUsers />
          </span>
          <span className="sidebar-item-label">Vendors</span>
        </button>

        <p className="sidebar-section-label">Stock</p>
        <button
          type="button"
          className={`sidebar-item${isActive("inventory") ? " active" : ""}`}
          {...tabPrefetchProps("inventory")}
          onClick={() => nav("inventory")}
        >
          <span className="sidebar-item-icon">
            <IcBox />
          </span>
          <span className="sidebar-item-label">Inventory</span>
        </button>
        <button
          type="button"
          className={`sidebar-item${isActive("branch") ? " active" : ""}`}
          {...tabPrefetchProps("branch")}
          onClick={() => nav("branch")}
        >
          <span className="sidebar-item-icon">
            <IcBranch />
          </span>
          <span className="sidebar-item-label">Branches</span>
        </button>
        <button
          type="button"
          className={`sidebar-item${isActive("products") ? " active" : ""}`}
          {...tabPrefetchProps("products")}
          onClick={() => nav("products")}
        >
          <span className="sidebar-item-icon">
            <IcCatalog />
          </span>
          <span className="sidebar-item-label">Products</span>
        </button>

        <p className="sidebar-section-label">Finance</p>
        <button
          type="button"
          className={`sidebar-item${isActive("accounts") ? " active" : ""}`}
          {...tabPrefetchProps("accounts")}
          onClick={() => nav("accounts")}
        >
          <span className="sidebar-item-icon">
            <IcFinance />
          </span>
          <span className="sidebar-item-label">Balance sheet</span>
        </button>
        <button
          type="button"
          className={`sidebar-item${isActive("banking") || screen === "bankAccountDetail" ? " active" : ""}`}
          {...tabPrefetchProps("banking")}
          onClick={() => nav("banking")}
        >
          <span className="sidebar-item-icon">
            <IcBanking />
          </span>
          <span className="sidebar-item-label">Banking</span>
        </button>
        <button
          type="button"
          className={`sidebar-item${isActive("fixedAssets") ? " active" : ""}`}
          {...tabPrefetchProps("fixedAssets")}
          onClick={() => nav("fixedAssets")}
        >
          <span className="sidebar-item-icon">
            <IcLandmark />
          </span>
          <span className="sidebar-item-label">Fixed Assets</span>
        </button>
        <button
          type="button"
          className={`sidebar-item${isActive("cashFlow") ? " active" : ""}`}
          {...tabPrefetchProps("cashFlow")}
          onClick={() => nav("cashFlow")}
        >
          <span className="sidebar-item-icon">
            <IcCashFlow />
          </span>
          <span className="sidebar-item-label">Cash flow</span>
        </button>
        <button
          type="button"
          className={`sidebar-item${isActive("ledger") ? " active" : ""}`}
          {...tabPrefetchProps("ledger")}
          onClick={() => nav("ledger")}
        >
          <span className="sidebar-item-icon">
            <IcLedger />
          </span>
          <span className="sidebar-item-label">Ledger</span>
        </button>

        <p className="sidebar-section-label">Costs & income</p>
        <button
          type="button"
          className={`sidebar-item${isActive("expenses") || screen === "expenseCategory" ? " active" : ""}`}
          {...tabPrefetchProps("expenses")}
          onClick={() => nav("expenses")}
        >
          <span className="sidebar-item-icon">
            <IcSpend />
          </span>
          <span className="sidebar-item-label">Expenses</span>
        </button>
        <button
          type="button"
          className={`sidebar-item${isActive("otherIncome") || screen === "newOtherIncome" ? " active" : ""}`}
          {...tabPrefetchProps("otherIncome")}
          onClick={() => nav("otherIncome")}
        >
          <span className="sidebar-item-icon">
            <IcIncome />
          </span>
          <span className="sidebar-item-label">Other income</span>
        </button>

        <p className="sidebar-section-label">Reports</p>
        <button
          type="button"
          className={`sidebar-item${isActive("reports") ? " active" : ""}`}
          {...tabPrefetchProps("reports")}
          onClick={() => nav("reports")}
        >
          <span className="sidebar-item-icon">
            <IcReport />
          </span>
          <span className="sidebar-item-label">Reports</span>
        </button>
        <button
          type="button"
          className={`sidebar-item${isActive("capitalGrowth") ? " active" : ""}`}
          {...tabPrefetchProps("capitalGrowth")}
          onClick={() => nav("capitalGrowth")}
        >
          <span className="sidebar-item-icon">
            <IcChart />
          </span>
          <span className="sidebar-item-label">Growth</span>
        </button>
        <button
          type="button"
          className={`sidebar-item${isActive("netWorth") ? " active" : ""}`}
          {...tabPrefetchProps("netWorth")}
          onClick={() => nav("netWorth")}
        >
          <span className="sidebar-item-icon">
            <IcNetWorth />
          </span>
          <span className="sidebar-item-label">Net Worth</span>
        </button>
      </div>

      <div className="sidebar-footer sidebar-footer-compact">
        <button
          type="button"
          className={`sidebar-item${isActive("settings") ? " active" : ""}`}
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
        <button type="button" className="sidebar-item" onClick={() => setDarkMode((d) => !d)} aria-label="Toggle theme">
          <span className="sidebar-item-icon">{darkMode ? <IcSun /> : <IcMoon />}</span>
          <span className="sidebar-item-label">{darkMode ? "Light" : "Dark"}</span>
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
}
