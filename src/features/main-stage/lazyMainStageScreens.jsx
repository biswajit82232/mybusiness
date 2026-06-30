/**
 * Code-split main-stage screens so the initial bundle stays small; dashboard (HomeTab) stays eager in MainStage.
 * Tab routes share {@link MAIN_STAGE_TAB_IMPORTS} so {@link prefetchMainStagePage} warms the same chunks as React.lazy().
 */
/* eslint-disable react-refresh/only-export-components -- file exports React.lazy() screens + prefetch helper */
import { lazy } from "react";

const RELOAD_GUARD_KEY = "mb_chunk_reload_once";

/**
 * Wrap a dynamic import so a stale deploy (old chunk hash 404s → ChunkLoadError)
 * self-heals instead of leaving a broken page. Retries once, then — only when
 * online and not already retried this session — forces a single reload to fetch
 * the fresh manifest. Offline we rethrow so the ErrorBoundary shows a message
 * (no reload loop, app stays usable).
 */
function clearReloadGuard() {
  try {
    window.sessionStorage.removeItem(RELOAD_GUARD_KEY);
  } catch {
    /* ignore */
  }
}

function loadWithChunkRecovery(loader) {
  return loader().then(
    (mod) => {
      clearReloadGuard();
      return mod;
    },
    (err) => {
    const online = typeof navigator === "undefined" || navigator.onLine;
    if (!online) throw err;
    return loader().catch((err2) => {
      let reloadedOnce = false;
      try {
        reloadedOnce = window.sessionStorage.getItem(RELOAD_GUARD_KEY) === "1";
      } catch {
        /* ignore */
      }
      if (!reloadedOnce && typeof window !== "undefined") {
        try {
          window.sessionStorage.setItem(RELOAD_GUARD_KEY, "1");
        } catch {
          /* ignore */
        }
        window.location.reload();
        // Return a never-resolving promise so Suspense holds until reload.
        return new Promise(() => {});
      }
      throw err2;
    });
  });
}

const L = (loader) => lazy(() => loadWithChunkRecovery(loader));

/** Dynamic imports for main sidebar pages (keys match `page` / `NAV_PAGE_IDS`). */
export const MAIN_STAGE_TAB_IMPORTS = {
  invoices: () => import("@/features/invoices/SalesTab.jsx"),
  customers: () => import("@/features/customers/CustomersScreen.jsx"),
  vendors: () => import("@/features/vendors/VendorsScreen.jsx"),
  receivables: () => import("@/features/receivables/ReceivablesScreen.jsx"),
  payables: () => import("@/features/payables/PayablesScreen.jsx"),
  emi: () => import("@/features/emi/EmiListScreen.jsx"),
  servicing: () => import("@/features/servicing/ServicingScreen.jsx"),
  branch: () => import("@/features/branch/BranchScreen.jsx"),
  inventory: () => import("@/features/inventory/InventoryTab.jsx"),
  products: () => import("@/features/products/ProductCatalogScreen.jsx"),
  accounts: () => import("@/features/balance-sheet/AccountsOverviewTab.jsx"),
  banking: () => import("@/features/banking/BankingTab.jsx"),
  fixedAssets: () => import("@/features/fixed-assets/FixedAssetsTab.jsx"),
  cashFlow: () => import("@/features/cashflow/CashFlowScreen.jsx"),
  ledger: () => import("@/features/ledger/LedgerScreen.jsx"),
  payments: () => import("@/features/payments/PaymentsScreen.jsx"),
  expenses: () => import("@/features/expenses/ExpensesScreen.jsx"),
  otherIncome: () => import("@/features/other-income/OtherIncomeScreen.jsx"),
  reports: () => import("@/features/reports/ReportsScreen.jsx"),
  capitalGrowth: () => import("@/features/capital-net-worth/CapitalGrowthScreen.jsx"),
  netWorth: () => import("@/features/capital-net-worth/NetWorthScreen.jsx"),
  purchases: () => import("@/features/purchases/PurchasesScreen.jsx"),
  settings: () => import("@/features/settings/SettingsScreen.jsx"),
};

const prefetchedTabs = new Set();

/**
 * Start loading a main-stage tab chunk before navigation (e.g. sidebar hover).
 * Safe to call repeatedly; each tab is fetched at most once per session.
 */
export function prefetchMainStagePage(pageId) {
  const fn = MAIN_STAGE_TAB_IMPORTS[pageId];
  if (!fn || prefetchedTabs.has(pageId)) return;
  prefetchedTabs.add(pageId);
  void fn();
}

export const LazySalesTab = L(() => MAIN_STAGE_TAB_IMPORTS.invoices().then((m) => ({ default: m.SalesTab })));
export const LazyNewSaleScreen = L(() => import("@/features/invoices/NewSaleScreen.jsx").then((m) => ({ default: m.NewSaleScreen })));
export const LazySaleDetailScreen = L(() => import("@/features/invoices/SaleDetailScreen.jsx").then((m) => ({ default: m.SaleDetailScreen })));
export const LazyIssueCreditNoteScreen = L(() => import("@/features/invoices/IssueCreditNoteScreen.jsx").then((m) => ({ default: m.IssueCreditNoteScreen })));
export const LazyCreditNoteDetailScreen = L(() => import("@/features/invoices/CreditNoteDetailScreen.jsx").then((m) => ({ default: m.CreditNoteDetailScreen })));

export const LazyBranchScreen = L(() => MAIN_STAGE_TAB_IMPORTS.branch().then((m) => ({ default: m.BranchScreen })));
export const LazyInventoryTab = L(() => MAIN_STAGE_TAB_IMPORTS.inventory().then((m) => ({ default: m.InventoryTab })));
export const LazyAccountsOverviewTab = L(() => MAIN_STAGE_TAB_IMPORTS.accounts().then((m) => ({ default: m.AccountsOverviewTab })));
export const LazyBankAccountDetailScreen = L(() => import("@/features/banking/BankAccountDetailScreen.jsx").then((m) => ({ default: m.BankAccountDetailScreen })));
export const LazyBankingTab = L(() => MAIN_STAGE_TAB_IMPORTS.banking().then((m) => ({ default: m.BankingTab })));
export const LazyFixedAssetsTab = L(() => MAIN_STAGE_TAB_IMPORTS.fixedAssets().then((m) => ({ default: m.FixedAssetsTab })));
export const LazyServicingScreen = L(() => MAIN_STAGE_TAB_IMPORTS.servicing().then((m) => ({ default: m.ServicingScreen })));
export const LazyNetWorthScreen = L(() => MAIN_STAGE_TAB_IMPORTS.netWorth().then((m) => ({ default: m.NetWorthScreen })));
export const LazyCapitalGrowthScreen = L(() => MAIN_STAGE_TAB_IMPORTS.capitalGrowth().then((m) => ({ default: m.CapitalGrowthScreen })));
export const LazyReportsScreen = L(() => MAIN_STAGE_TAB_IMPORTS.reports().then((m) => ({ default: m.ReportsScreen })));
export const LazyExpenseDetailScreen = L(() => import("@/features/expenses/ExpenseDetailScreen.jsx").then((m) => ({ default: m.ExpenseDetailScreen })));
export const LazyAddStockScreen = L(() => import("@/features/inventory/AddStockScreen.jsx").then((m) => ({ default: m.AddStockScreen })));
export const LazyInventoryItemDetailScreen = L(() => import("@/features/inventory/InventoryItemDetailScreen.jsx").then((m) => ({ default: m.InventoryItemDetailScreen })));
export const LazyEmiDetailScreen = L(() => import("@/features/emi/EmiDetailScreen.jsx").then((m) => ({ default: m.EmiDetailScreen })));
export const LazyEmiListScreen = L(() => MAIN_STAGE_TAB_IMPORTS.emi().then((m) => ({ default: m.EmiListScreen })));
export const LazyOtherIncomeScreen = L(() => MAIN_STAGE_TAB_IMPORTS.otherIncome().then((m) => ({ default: m.OtherIncomeScreen })));
export const LazyNewOtherIncomeScreen = L(() => import("@/features/other-income/NewOtherIncomeScreen.jsx").then((m) => ({ default: m.NewOtherIncomeScreen })));
export const LazyOtherIncomeDetailScreen = L(() => import("@/features/other-income/OtherIncomeDetailScreen.jsx").then((m) => ({ default: m.OtherIncomeDetailScreen })));
export const LazyExpenseCategoryScreen = L(() => import("@/features/expenses/ExpenseCategoryScreen.jsx").then((m) => ({ default: m.ExpenseCategoryScreen })));
export const LazyExpensesScreen = L(() => MAIN_STAGE_TAB_IMPORTS.expenses().then((m) => ({ default: m.ExpensesScreen })));
export const LazyNewExpenseScreen = L(() => import("@/features/expenses/NewExpenseScreen.jsx").then((m) => ({ default: m.NewExpenseScreen })));
export const LazySettingsScreen = L(() => MAIN_STAGE_TAB_IMPORTS.settings().then((m) => ({ default: m.SettingsScreen })));
export const LazyNewCustomerScreen = L(() => import("@/features/customers/NewCustomerScreen.jsx").then((m) => ({ default: m.NewCustomerScreen })));
export const LazyCustomersScreen = L(() => MAIN_STAGE_TAB_IMPORTS.customers().then((m) => ({ default: m.CustomersScreen })));
export const LazyCustomerDetailScreen = L(() => import("@/features/customers/CustomerDetailScreen.jsx").then((m) => ({ default: m.CustomerDetailScreen })));
export const LazyReceivablesScreen = L(() => MAIN_STAGE_TAB_IMPORTS.receivables().then((m) => ({ default: m.ReceivablesScreen })));
export const LazyProductCatalogScreen = L(() => MAIN_STAGE_TAB_IMPORTS.products().then((m) => ({ default: m.ProductCatalogScreen })));
export const LazyLedgerScreen = L(() => MAIN_STAGE_TAB_IMPORTS.ledger().then((m) => ({ default: m.LedgerScreen })));
export const LazyCashFlowScreen = L(() => MAIN_STAGE_TAB_IMPORTS.cashFlow().then((m) => ({ default: m.CashFlowScreen })));
export const LazySearchScreen = L(() => import("@/features/search/SearchScreen.jsx").then((m) => ({ default: m.SearchScreen })));
export const LazyPurchaseDetailScreen = L(() => import("@/features/purchases/PurchaseDetailScreen.jsx").then((m) => ({ default: m.PurchaseDetailScreen })));

export const LazyPurchasesScreen = L(() => MAIN_STAGE_TAB_IMPORTS.purchases().then((m) => ({ default: m.PurchasesScreen })));
export const LazyNewPurchaseScreen = L(() => import("@/features/purchases/NewPurchaseScreen.jsx").then((m) => ({ default: m.NewPurchaseScreen })));

export const LazyNewVendorScreen = L(() => import("@/features/vendors/NewVendorScreen.jsx").then((m) => ({ default: m.NewVendorScreen })));
export const LazyVendorsScreen = L(() => MAIN_STAGE_TAB_IMPORTS.vendors().then((m) => ({ default: m.VendorsScreen })));
export const LazyVendorDetailScreen = L(() => import("@/features/vendors/VendorDetailScreen.jsx").then((m) => ({ default: m.VendorDetailScreen })));

export const LazyPayablesScreen = L(() => MAIN_STAGE_TAB_IMPORTS.payables().then((m) => ({ default: m.PayablesScreen })));
export const LazyPaymentsScreen = L(() => MAIN_STAGE_TAB_IMPORTS.payments().then((m) => ({ default: m.PaymentsScreen })));
