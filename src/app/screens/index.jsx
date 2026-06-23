/**
 * Legacy aggregate export list (documentation / rare tooling only).
 * Do not import from this file in app runtime code — it pulls in many screens at once and defeats code-splitting.
 * Use `@/features/<feature>` or `main-stage/lazyMainStageScreens.jsx` for lazy routes.
 */
import { MonthFilterCompact } from "@/shared/ui/shell/MonthFilterCompact.jsx";
import { PaginatedInvRows, InventoryTab, AddStockScreen, InventoryItemDetailScreen } from "@/features/inventory/index.js";
import { PaginatedCustomerList, NewCustomerScreen, CustomersScreen, CustomerDetailScreen } from "@/features/customers/index.js";
import { PaginatedReceivableRows, ReceivablesScreen } from "@/features/receivables/index.js";
import { PaginatedProductRows, ProductCatalogScreen } from "@/features/products/index.js";
import { CashFlowDayPicker, CashFlowScreen } from "@/features/cashflow/index.js";
import { PaginatedLedgerRows, LedgerScreen } from "@/features/ledger/index.js";
import { SearchScreen } from "@/features/search/index.js";
import { BankAccountDetailScreen, BankingTab } from "@/features/banking/index.js";
import { FixedAssetsTab } from "@/features/fixed-assets/index.js";
import {
  CapitalNetBarsSvg,
  CapitalCumulativeSvg,
  NetWorthCompareBars,
  NetWorthTwinBarsSvg,
  NetWorthInvestForm,
  NetWorthScreen,
  CapitalGrowthScreen,
} from "@/features/capital-net-worth/index.js";
import { ReportsScreen } from "@/features/reports/index.js";
import { SettingsHubRow, SettingsScreen } from "@/features/settings/index.js";
import { AppSidebar } from "@/features/app-sidebar/index.js";
import { HomeTab, NotifPanel } from "@/features/home/index.js";
import { BranchScreen } from "@/features/branch/index.js";
import { AccountsOverviewTab } from "@/features/balance-sheet/index.js";

export { MonthFilterCompact };
export { PaginatedSaleList, SalesTab, NewSaleScreen, SaleDetailScreen } from "@/features/invoices/index.js";
export { PurchaseDetailScreen } from "@/features/purchases/PurchaseDetailScreen.jsx";
export { ExpenseDetailScreen, ExpenseCategoryScreen, ExpensesScreen, NewExpenseScreen } from "@/features/expenses/index.js";
export { EmiDetailScreen, EmiListScreen } from "@/features/emi/index.js";
export { OtherIncomeScreen, NewOtherIncomeScreen, OtherIncomeDetailScreen } from "@/features/other-income/index.js";
export { PaginatedInvRows, InventoryTab, AddStockScreen, InventoryItemDetailScreen };
export { PaginatedCustomerList, NewCustomerScreen, CustomersScreen, CustomerDetailScreen };
export { PaginatedReceivableRows, ReceivablesScreen };
export { PaginatedProductRows, ProductCatalogScreen };
export { CashFlowDayPicker, CashFlowScreen };
export { PaginatedLedgerRows, LedgerScreen };
export { SearchScreen };
export { BankAccountDetailScreen, BankingTab };
export { FixedAssetsTab };
export {
  CapitalNetBarsSvg,
  CapitalCumulativeSvg,
  NetWorthCompareBars,
  NetWorthTwinBarsSvg,
  NetWorthInvestForm,
  NetWorthScreen,
  CapitalGrowthScreen,
};
export { ReportsScreen };
export { SettingsHubRow, SettingsScreen };
export { AppSidebar };
export { HomeTab, NotifPanel, BranchScreen, AccountsOverviewTab };
