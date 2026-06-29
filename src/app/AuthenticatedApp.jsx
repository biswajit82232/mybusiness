import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, startTransition } from "react";
import { AuthStep } from "@/features/auth/AuthStep.jsx";
import { MainStage } from "@/features/main-stage/index.js";
import { mergeAuthenticatedMainStageProps } from "./authenticatedAppMainStagePropBundles.js";
import { MobileAppBar } from "@/features/mobile-appbar/index.js";
import { AuthenticatedShell, AppSidebarColumn, AuthenticatedMainColumn } from "@/features/app-shell/index.js";
import { authSignOut, clearBootAuthSnapshot, getResolvedUserId, resolveBootAuth } from "@/data/auth/auth.js";
import { APP_VERSION } from "@/appVersion.js";
import {
  loadUserLocalState,
  readAppCache,
  getPendingOutboxCount,
} from "@/data/local/indexedDbStore.js";
import { withTimeout } from "@/app/withTimeout.js";
import { useAppModalFocusTraps } from "@/features/app-modals/index.js";
import {
  useSessionHistoryNav,
  useGlobalBackNavigation,
  useGlobalShortcuts,
  useDarkModeDocument,
  usePersistBusinessMonth,
  usePwaLaunchActions,
  useRecurringExpensesOnTimer,
  useServiceWorkerUpdateReady,
  useBeforeUnloadWhenPendingWrites,
  useDebouncedLocalPersist,
  useAuthSessionBootstrap,
  useCloudSyncWhenReady,
  useWelcomeOnFirstVisit,
  useSocialPreviewImageMeta,
  useResetScreenWhenStaleRecords,
  useOsNotificationsForBellAlerts,
  useBootVisibleWhenAuthChecking,
  useImmediatePersistence,
  useAuthenticatedDerivedMetrics,
  useBackupActions,
  useCloudSyncExecutor,
  useSalesActions,
  useSaleDraftAutosave,
  usePaymentActions,
  useDeleteActions,
  usePurchaseActions,
  useDirectoryActions,
  useStockActions,
  useExpenseActions,
  useOtherIncomeActions,
  useServicingActions,
  useBankingActions,
  useSettingsActions,
  useEmiActions,
  useBalanceSheetActions,
  useSyncConflictActions,
  useInventoryActions,
  useAppNavigation,
  useConfirmDialog,
} from "./hooks.js";

import {
  MAX_DISMISSED_ALERTS,
  LIST_PAGE_SIZE,
  LS_WELCOME_DONE,
  MONTHS,
  DEFAULT_EXPENSE_CATEGORIES,
  DEFAULT_OTHER_INCOME_CATEGORIES,
  RECURRING_FREQUENCIES,
  DEFAULT_STOCK_PRODUCT_CATEGORIES,
  BRANCH_MAIN_ID,
  NAV_PAGE_IDS,
  LEGACY_TAB_TO_PAGE,
  LEGACY_SCREEN_TO_PAGE,
  normalizeStoredPage,
  num,
  money,
  dateSlash,
  todayStr,
  addMonthsStr,
  MONTH_SHORT,
  LS_BUSINESS_MONTH,
  readStoredBusinessMonth,
  SS_NAV,
  VALID_SESSION_SCREENS,
  readStoredSessionNav,
  clearStoredSessionNav,
  compareSalesByInvoiceNo,
  makeId,
  fyLabel,
  isOverdue,
  daysDiffFromToday,
  buildEmiAlertsForEntry,
  buildServicingAlerts,
  deriveServicingSlots,
  saleMatchesSearch,
  resolveSaleDueDate,
  defSale,
  defCustomer,
  defStock,
  defExpense,
  defOtherIncome,
  BANK_ACCOUNT_KINDS,
  normBranchesList,
  getDefaultBranchId,
  computeInvRowsForBranch,
  computeInvRowsAggregated,
  computeBalanceSheetSummary,
  defPurchase,
  defVendor,
  defaultState,
  mergePersistedPayload,
  saleDraftSummary,
} from "@/domain/index.js";

/* ─── App ─────────────────────────────────────────────────── */
export default function AuthenticatedApp() {
  const [authState, setAuthState] = useState("checking");
  const [bootVisible, setBootVisible] = useState(true);
  const [bootProgress, setBootProgress] = useState({ pct: 4, label: "Starting…" });

  const [nav0] = useState(() => readStoredSessionNav());
  const [page, setPage] = useState(nav0.page ?? "dashboard");
  const [state, setState]       = useState(defaultState);
  const [screen, setScreen]     = useState(nav0.screen);
  const [selSaleId, setSelSaleId] = useState(nav0.selSaleId);
  const [selExpenseId, setSelExpenseId] = useState(nav0.selExpenseId);
  const [selExpenseCategory, setSelExpenseCategory] = useState(nav0.selExpenseCategory);
  const [saleView, setSaleView] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  /** Global reporting period: `YYYY-MM` or `""` = full FY (dashboard + sales list stay in sync). Opens on current month each load. */
  const [businessMonth, setBusinessMonth] = useState(() => readStoredBusinessMonth());
  const [saleEntry, setSaleEntry] = useState(defSale);
  const [customerEntry, setCustomerEntry] = useState(defCustomer);
  const [stockEntry, setStockEntry] = useState(defStock);
  const [purchaseEntry, setPurchaseEntry] = useState(() => defPurchase());
  const [editingPurchaseId, setEditingPurchaseId] = useState(null);
  const [expEntry, setExpEntry] = useState(defExpense);
  const [editingExpenseId, setEditingExpenseId] = useState(null);
  const [editingInventoryId, setEditingInventoryId] = useState(null);
  /** { itemKey, displayName, branchId } — branchId "" = all branches in movements list */
  const [invItemDetail, setInvItemDetail] = useState(null);
  const [oiEntry, setOiEntry] = useState(defOtherIncome);
  const [editingOtherIncomeId, setEditingOtherIncomeId] = useState(null);
  const [payModal, setPayModal] = useState(null);
  /** Supplier payment modal — purchase id (mutually exclusive with `payModal`). */
  const [payPurchaseModal, setPayPurchaseModal] = useState(null);
  const [payAmt, setPayAmt] = useState("");
  const [payDate, setPayDate] = useState(() => todayStr());
  const [payBankAccountId, setPayBankAccountId] = useState("");
  const [delConfirm, setDelConfirm] = useState(null); // {type:"sale"|"expense"|"stock"|"recurring"|"customerDirectory"|"vendorDirectory"|"bankAccount", id}
  /** In-app confirm: import backup or two-step reset (replaces window.confirm). */
  const [actionConfirm, setActionConfirm] = useState(null);
  const { simpleConfirm, requestConfirm, cancelSimpleConfirm, onSimpleConfirm } = useConfirmDialog();
  const [welcomeOpen, setWelcomeOpen] = useState(false);
  const [editingSaleId, setEditingSaleId] = useState(null);
  const [editingCustomerId, setEditingCustomerId] = useState(null);
  const [vendorEntry, setVendorEntry] = useState(defVendor);
  const [editingVendorId, setEditingVendorId] = useState(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const [toast, setToast]       = useState(null);
  const [swUpdateReady, setSwUpdateReady] = useState(false);
  /** "default" | "granted" | "denied" */
  const [notifPerm, setNotifPerm] = useState(() =>
    "Notification" in window ? Notification.permission : "denied"
  );
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("biz_dark") === "1");
  const [selCustomerName, setSelCustomerName] = useState(nav0.selCustomerName);
  const [selVendorName, setSelVendorName] = useState(typeof nav0.selVendorName === "string" ? nav0.selVendorName : "");
  const [selEmiId, setSelEmiId] = useState(nav0.selEmiId ?? null);
  const [selBankAccountId, setSelBankAccountId] = useState(nav0.selBankAccountId ?? null);
  const [selPurchaseId, setSelPurchaseId] = useState(() => nav0.selPurchaseId ?? null);
  const [selOtherIncomeId, setSelOtherIncomeId] = useState(nav0.selOtherIncomeId ?? null);
  /** IDs already delivered as OS notifications this session */
  const firedNotifIds = useRef(new Set());
  const persistTimerRef = useRef(null);
  const persistRunIdRef = useRef(0);
  const persistWarnedRef = useRef(false);
  const pendingWritesRef = useRef(0);
  const flushPendingLocalPersistRef = useRef(null);
  /** Where expense detail / new-expense should return: main list vs category drill-down */
  const expenseNavRef = useRef({ from: "expenses", category: null });
  const saleNavRef = useRef({ from: "default" });
  /** Where purchase detail returns on back (e.g. global search). */
  const purchaseNavRef = useRef({ from: "default" });
  /** Where EMI detail returns on back. */
  const emiDetailNavRef = useRef("default");
  /** Customer / vendor / bank opened from global search → back returns to search overlay. */
  const openedFromGlobalSearchRef = useRef(false);
  /** Populated each render before return — used by useGlobalBackNavigation for Escape / edge-swipe. */
  const detailScreenClosersRef = useRef(null);
  const stockNavRef = useRef({ from: "default" });
  const newExpenseOpenedFromRef = useRef({ screen: "expenses" });
  /** "list" | "banking" | "ledger" | "detail" — where edit overlay returns */
  const otherIncomeOpenedFromRef = useRef({ from: "list" });
  /** Where read-only other-income detail returns on back */
  const otherIncomeDetailFromRef = useRef("list");

  /** Clears global-search marker and resets all detail back-stack refs (tab change / logout). */
  const resetRootNavigationRefs = useCallback(() => {
    openedFromGlobalSearchRef.current = false;
    saleNavRef.current = { from: "default" };
    purchaseNavRef.current = { from: "default" };
    emiDetailNavRef.current = "default";
    expenseNavRef.current = { from: "expenses", category: null };
    stockNavRef.current = { from: "default" };
    otherIncomeDetailFromRef.current = "list";
    otherIncomeOpenedFromRef.current = { from: "list" };
    newExpenseOpenedFromRef.current = { screen: "expenses" };
  }, []);

  const closeOtherIncomeDetail = useCallback(() => {
    setSelOtherIncomeId(null);
    const from = otherIncomeDetailFromRef.current;
    if (from === "banking") {
      setScreen("bankAccountDetail");
      return;
    }
    if (from === "ledger") {
      setScreen(null);
      setPage("ledger");
      return;
    }
    if (from === "search") {
      setScreen("search");
      return;
    }
    setScreen(null);
    setPage("otherIncome");
  }, [setPage, setScreen]);

  const suppressPersistRef = useRef(false);
  const currentUserIdRef = useRef(null);
  const lastPersistedStateRef = useRef(null);
  const latestStateRef = useRef(state);
  /** Prevents duplicate persist if Save is tapped twice while banking save runs. */
  const bankSaveInFlightRef = useRef(false);
  const didStartupFullReconcileRef = useRef(false);

  useSessionHistoryNav({
    page,
    screen,
    selSaleId,
    selExpenseId,
    selExpenseCategory,
    selCustomerName,
    selVendorName,
    selEmiId,
    selBankAccountId,
    selPurchaseId,
    selOtherIncomeId,
    setPage,
    setScreen,
    setDelConfirm,
    setPayModal,
    setPayPurchaseModal,
    setPayBankAccountId,
    setActionConfirm,
    setNotifOpen,
    initialPage: nav0.page ?? "dashboard",
    initialScreen: nav0.screen,
  });

  useGlobalBackNavigation({
    welcomeOpen,
    setWelcomeOpen,
    actionConfirm,
    setActionConfirm,
    simpleConfirm,
    cancelSimpleConfirm,
    delConfirm,
    setDelConfirm,
    payModal,
    payPurchaseModal,
    setPayModal,
    setPayPurchaseModal,
    setPayBankAccountId,
    notifOpen,
    setNotifOpen,
    screen,
    setScreen,
    page,
    setPage,
    editingSaleId,
    setEditingSaleId,
    editingCustomerId,
    setEditingCustomerId,
    editingVendorId,
    setEditingVendorId,
    editingExpenseId,
    setEditingExpenseId,
    editingOtherIncomeId,
    setEditingOtherIncomeId,
    setEditingPurchaseId,
    setSelExpenseCategory,
    showSearch,
    setShowSearch,
    setSearchTerm,
    otherIncomeOpenedFromRef,
    closeOtherIncomeDetail,
    detailScreenClosersRef,
  });

  useDarkModeDocument(darkMode);
  useEffect(() => {
    latestStateRef.current = state;
  }, [state]);
  useEffect(() => {
    const d = state.settings?.darkMode;
    if (d === true || d === false) setDarkMode(d);
  }, [state.settings?.darkMode]);

  const [pendingOutbox, setPendingOutbox] = useState(0);
  const { cloudSyncMeta, executeCloudSync } = useCloudSyncExecutor({
    setState,
    setPendingOutbox,
    currentUserIdRef,
    didStartupFullReconcileRef,
    suppressPersistRef,
    lastPersistedStateRef,
    pendingWritesRef,
    flushPendingLocalPersistRef,
    persistTimerRef,
    latestStateRef,
  });
  useEffect(() => {
    if (authState !== "ready") return;
    const uid = currentUserIdRef.current;
    if (!uid || uid === "local-user") {
      setPendingOutbox(0);
      return;
    }
    getPendingOutboxCount(uid).then(setPendingOutbox).catch(() => setPendingOutbox(0));
  }, [authState, state]);
  usePersistBusinessMonth(businessMonth);
  useRecurringExpensesOnTimer(setState, authState === "ready");
  useServiceWorkerUpdateReady(setSwUpdateReady);
  useBeforeUnloadWhenPendingWrites(pendingWritesRef, persistTimerRef);
  useGlobalShortcuts({
    onOpenSearch: useCallback(() => {
      if (authState !== "ready") return;
      setSidebarOpen(false);
      setScreen("search");
    }, [authState]),
    suspended: authState !== "ready" || !!welcomeOpen,
  });

  const reportBootProgress = useCallback((pct, label) => {
    setBootProgress((prev) => ({
      pct: Math.min(92, Math.max(prev.pct, num(pct))),
      label: typeof label === "string" && label.trim() ? label.trim() : prev.label,
    }));
  }, []);

  const hydrateLocalApp = useCallback(async (onProgress, bootOpts = {}) => {
    const report = typeof onProgress === "function" ? onProgress : reportBootProgress;
    const bootUserId = bootOpts?.userId;
    const preloadedPayload = bootOpts?.preloadedPayload;
    report(20, "Resolving account");
    const resolved = bootUserId ?? (await getResolvedUserId());
    const localUserId = resolved ?? "local-user";
    currentUserIdRef.current = localUserId;
    try {
      report(38, "Reading local data");
      let localPayload = preloadedPayload ?? null;
      if (localPayload && bootUserId && resolved !== bootUserId) {
        localPayload = null;
      }
      if (!localPayload) {
        localPayload = await withTimeout(
          loadUserLocalState(localUserId),
          10_000,
          "idb-load",
        ).catch(() => null);
      }
      const looksEmpty =
        !localPayload?.settings &&
        !localPayload?.balance &&
        (!localPayload?.sales?.length) &&
        (!localPayload?.expenses?.length) &&
        (!localPayload?.otherIncomes?.length) &&
        (!localPayload?.recurringExpenses?.length) &&
        (!localPayload?.inventoryEntries?.length) &&
        (!localPayload?.purchases?.length) &&
        (!localPayload?.emiEntries?.length) &&
        (!localPayload?.loansGiven?.length) &&
        (!localPayload?.customerDirectory?.length) &&
        (!localPayload?.vendorDirectory?.length) &&
        (!localPayload?.dismissedAlertIds?.length);

      let seedPayload = localPayload;
      if (looksEmpty) {
        report(52, "Checking device backup");
        const legacy = await readAppCache().catch(() => null);
        if (legacy) seedPayload = legacy;
      }

      report(72, "Preparing books");
      const merged = mergePersistedPayload(seedPayload) || defaultState;
      suppressPersistRef.current = true;
      setState(merged);
      lastPersistedStateRef.current = merged;
      report(86, "Applying data");
      Promise.resolve().then(() => { suppressPersistRef.current = false; });
    } catch (err) {
      console.error("[bootstrap] local load failed, trying cache fallback:", err);
      report(58, "Recovering from backup");
      const legacy = await readAppCache().catch(() => null);
      if (legacy) {
        const merged = mergePersistedPayload(legacy) || defaultState;
        setState(merged);
        lastPersistedStateRef.current = merged;
      } else {
        setState(defaultState);
        lastPersistedStateRef.current = defaultState;
      }
      report(86, "Applying data");
    }
  }, [reportBootProgress]);

  useEffect(() => {
    if (authState === "checking") {
      setBootProgress({ pct: 4, label: "Starting…" });
    }
  }, [authState]);

  /* Local-only: require email/password session before loading UI (credentials in localStorage). */
  useAuthSessionBootstrap(hydrateLocalApp, setAuthState, reportBootProgress);

  /* Supabase: restore from server when IndexedDB is empty; push outbox on a timer / when back online. */
  useCloudSyncWhenReady({ authState, currentUserIdRef, executeCloudSync });

  useWelcomeOnFirstVisit(authState, setWelcomeOpen);
  useSocialPreviewImageMeta();

  const handleAuthenticated = useCallback(async () => {
    clearBootAuthSnapshot();
    setAuthState("checking");
    setBootProgress({ pct: 4, label: "Starting…" });
    const auth = await resolveBootAuth();
    await hydrateLocalApp(reportBootProgress, { userId: auth.userId });
    reportBootProgress(90, "Almost ready");
    clearBootAuthSnapshot();
    setAuthState("ready");
  }, [hydrateLocalApp, reportBootProgress]);

  const handleLogout = useCallback(async () => {
    await authSignOut();
    setAuthState("needsAuth");
    resetRootNavigationRefs();
    setScreen(null);
    setPage("dashboard");
    setSidebarOpen(false);
    clearStoredSessionNav();
  }, [resetRootNavigationRefs]);

  /* ── Persist local changes (debounced) ── */
  useDebouncedLocalPersist({
    authState,
    state,
    currentUserIdRef,
    latestStateRef,
    persistTimerRef,
    persistRunIdRef,
    persistWarnedRef,
    suppressPersistRef,
    lastPersistedStateRef,
    flushPendingLocalPersistRef,
    pendingWritesRef,
    setToast,
  });

  const clearGlobalSearchReturnFlag = useCallback(() => {
    openedFromGlobalSearchRef.current = false;
  }, []);
  const resetPurchaseNavFromStale = useCallback(() => {
    purchaseNavRef.current = { from: "default" };
  }, []);
  const resetEmiNavFromStale = useCallback(() => {
    emiDetailNavRef.current = "default";
  }, []);
  const resetSaleNavFromStale = useCallback(() => {
    saleNavRef.current = { from: "default" };
  }, []);
  const resetOtherIncomeDetailFromStale = useCallback(() => {
    otherIncomeDetailFromRef.current = "list";
  }, []);
  const resetExpenseNavFromStale = useCallback(() => {
    expenseNavRef.current = { from: "expenses", category: null };
  }, []);

  useResetScreenWhenStaleRecords({
    authState,
    screen,
    state,
    selSaleId,
    selCustomerName,
    selVendorName,
    selExpenseId,
    selExpenseCategory,
    selEmiId,
    selBankAccountId,
    selPurchaseId,
    selOtherIncomeId,
    setScreen,
    setSelSaleId,
    setSelCustomerName,
    setSelVendorName,
    setSelExpenseId,
    setSelExpenseCategory,
    setPage,
    setSelEmiId,
    setSelBankAccountId,
    setSelPurchaseId,
    setSelOtherIncomeId,
    onClearGlobalSearchReturn: clearGlobalSearchReturnFlag,
    onResetPurchaseNavFromStale: resetPurchaseNavFromStale,
    onResetEmiNavFromStale: resetEmiNavFromStale,
    onResetSaleNavFromStale: resetSaleNavFromStale,
    onResetOtherIncomeDetailFromStale: resetOtherIncomeDetailFromStale,
    onResetExpenseNavFromStale: resetExpenseNavFromStale,
  });

  const effectiveNotifOpen =
    notifOpen && page === "dashboard" && !screen && !payModal && !payPurchaseModal && !delConfirm && !actionConfirm && !welcomeOpen;

  /* Document scroll is disabled in index.css (html/body overflow-y: hidden) so inner regions
     scroll reliably on mobile. Avoid toggling body overflow here — that breaks touch scrolling
     inside position:fixed overlays on iOS and several Android WebViews. */

  const toastTimerRef = useRef(0);
  const showToast = useCallback(msg => {
    clearTimeout(toastTimerRef.current);
    setToast(msg);
    toastTimerRef.current = setTimeout(() => setToast(null), 2600);
  }, []);
  const appendAuditEvent = useCallback((draft, evt) => {
    const base = Array.isArray(draft.auditEvents) ? draft.auditEvents : [];
    return {
      ...draft,
      auditEvents: [
        ...base,
        {
          id: makeId(),
          at: new Date().toISOString(),
          actorId: String(currentUserIdRef.current || "local-user"),
          source: "app",
          ...evt,
        },
      ].slice(-5000),
    };
  }, []);
  useEffect(() => {
    const key = "mb_client_app_version";
    const prev = localStorage.getItem(key);
    if (prev === APP_VERSION) return;
    // Drop stale transient navigation UI state between releases.
    clearStoredSessionNav();
    localStorage.setItem(key, APP_VERSION);
    if (prev) showToast(`Updated to v${APP_VERSION}. Applying latest data/UI changes...`);
  }, [showToast]);

  const reloadWithNewVersion = useCallback(() => {
    navigator.serviceWorker?.getRegistration?.().then((reg) => {
      reg?.waiting?.postMessage({ type: "SKIP_WAITING" });
      setTimeout(() => window.location.reload(), 250);
    });
  }, []);

  /* ── derived ── */
  const fyStr = fyLabel(state.settings.fyYear);
  const { financialYearStartMonth: fsm, fyYear } = state.settings;

  const {
    safeSales,
    safeExpenses,
    safeOtherIncomes,
    safeInventory,
    dashSales,
    dashPurchases,
    dashExp,
    dashOtherIncome,
    expensesInSelCategory,
    kpis,
    kpiSparklines,
  } = useAuthenticatedDerivedMetrics({
    state,
    businessMonth,
    selExpenseCategory,
    fsm,
    fyYear,
  });

  const filteredSales = useMemo(() => {
    let list = [...safeSales].sort((a, b) => compareSalesByInvoiceNo(a, b, state.settings));
    if (businessMonth) {
      list = list.filter((s) => String(s.date || "").startsWith(businessMonth));
    }
    if (searchTerm.trim()) {
      list = list.filter((s) => saleMatchesSearch(s, searchTerm));
    }
    if (saleView==="unpaid")  return list.filter((s) => s.outstanding > 0 && !isOverdue(resolveSaleDueDate(s, state.settings?.defaultDueDays)));
    if (saleView==="overdue") return list.filter((s) => s.outstanding > 0 && isOverdue(resolveSaleDueDate(s, state.settings?.defaultDueDays)));
    if (saleView==="bos") return list.filter((s) => s?.docType === "billOfSupply");
    return list;
  }, [safeSales, saleView, searchTerm, businessMonth, state.settings?.defaultDueDays, state.settings]);

  const invRows = useMemo(() => computeInvRowsAggregated(state.inventoryEntries || []), [state.inventoryEntries]);

  const {
    updCustomer,
    openNewCustomer,
    closeNewCustomer,
    updVendor,
    openNewVendor,
    closeNewVendor,
    openSaleDetail,
    openEmiDetail,
    closeEmiDetailNav,
    openSaleDetailFromInvoice,
    closeSaleDetailNav,
    onStockProductPick,
    onStockTypeChange,
    openEditInventoryEntry,
    closeAddStock,
    openInventoryItemDetail,
    openInventoryItemDetailFromSearch,
    closeInventoryItemDetail,
    openAddStock,
    openNewExpense,
    openExpenseCategory,
    openExpenseDetail,
    openEditExpense,
    closeNewExpense,
    closeExpenseDetail,
    closeExpenseCategory,
    openOtherIncomeDetail,
    openNewOtherIncome,
    openEditOtherIncome,
    closeNewOtherIncome,
    patchBank,
    addBank,
    closeBankAccountDetail,
    openBankAccountFromSearch,
    openCustomerDetailFromSearch,
    closeCustomerDetailNav,
    openVendorDetailFromSearch,
    closeVendorDetailNav,
    requestDeleteBankActivity,
    openNewPurchase,
    openEditPurchase,
    closeNewPurchase,
    openPurchaseDetail,
    closePurchaseDetail,
  } = useAppNavigation({
    state,
    invRows,
    showToast,
    setState,
    setScreen,
    setPage,
    setEditingCustomerId,
    setEditingVendorId,
    setEditingExpenseId,
    setEditingInventoryId,
    setEditingOtherIncomeId,
    setEditingPurchaseId,
    setCustomerEntry,
    setVendorEntry,
    setExpEntry,
    setStockEntry,
    setOiEntry,
    setPurchaseEntry,
    setSelSaleId,
    setSelExpenseId,
    setSelExpenseCategory,
    setSelEmiId,
    setSelBankAccountId,
    setSelCustomerName,
    setSelVendorName,
    setSelPurchaseId,
    setSelOtherIncomeId,
    setInvItemDetail,
    setDelConfirm,
    editingCustomerId,
    editingVendorId,
    editingExpenseId,
    editingOtherIncomeId,
    saleNavRef,
    purchaseNavRef,
    emiDetailNavRef,
    expenseNavRef,
    stockNavRef,
    newExpenseOpenedFromRef,
    otherIncomeOpenedFromRef,
    otherIncomeDetailFromRef,
    openedFromGlobalSearchRef,
  });

  /** In-stock products on the default branch — same scope as auto stock-out on sale */
  const saleStockPickRows = useMemo(() => {
    if (!state.settings?.autoStockOutOnSale) return [];
    const br = normBranchesList(state.settings?.branches);
    const branchId = getDefaultBranchId(br);
    return computeInvRowsForBranch(state.inventoryEntries || [], branchId, br).filter((r) => r.currentQty > 0);
  }, [state.settings?.autoStockOutOnSale, state.settings?.branches, state.inventoryEntries]);

  /** Default branch — full rows (for bundle cost / stock checks). */
  const saleBranchInvRowsFull = useMemo(() => {
    const br = normBranchesList(state.settings?.branches);
    const branchId = getDefaultBranchId(br);
    return computeInvRowsForBranch(state.inventoryEntries || [], branchId, br);
  }, [state.settings?.branches, state.inventoryEntries]);

  const saleDefaultBranchLabel = useMemo(() => {
    const br = normBranchesList(state.settings?.branches);
    const bid = getDefaultBranchId(br);
    const name = (br.find((b) => b && b.id === bid)?.name || "").trim();
    return name || "Default branch";
  }, [state.settings?.branches]);

  const addStockBranchInvRows = useMemo(() => {
    const br = normBranchesList(state.settings?.branches);
    const bid = String(stockEntry.branchId || "").trim() || getDefaultBranchId(br);
    return computeInvRowsForBranch(state.inventoryEntries || [], bid, br);
  }, [state.inventoryEntries, state.settings?.branches, stockEntry.branchId]);

  /** Datalist options for stock product category (defaults + any label already used). */
  const stockCategorySuggestions = useMemo(() => {
    const s = new Set(DEFAULT_STOCK_PRODUCT_CATEGORIES);
    for (const e of state.inventoryEntries || []) {
      const c = String(e.category || "").trim();
      if (c) s.add(c);
    }
    return [...s].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
  }, [state.inventoryEntries]);

  const notifications = useMemo(() => {
    const list = [];
    const todayTs = new Date(`${todayStr()}T00:00:00`).getTime();
    for (const s of safeSales) {
      if (s.outstanding <= 0) continue;
      const dd = resolveSaleDueDate(s, state.settings?.defaultDueDays);
      if (!isOverdue(dd)) continue;
      const daysOver = Math.floor((todayTs - new Date(dd + "T00:00:00").getTime()) / 86400000);
      list.push({
        id: `ov-${s.id}`,
        kind: "overdue",
        pri: -200000 - Math.min(daysOver, 9999),
        title: "Overdue payment",
        sub: `${s.customerName} · ${s.invoiceNo}`,
        meta: `${money(s.outstanding)} due · was due ${dateSlash(dd)}`,
        saleId: s.id,
      });
    }
    const PAYMENT_SOON_MAX_DAYS = 14;
    for (const s of safeSales) {
      if (s.outstanding <= 0) continue;
      const dd = resolveSaleDueDate(s, state.settings?.defaultDueDays);
      if (isOverdue(dd)) continue;
      const diff = daysDiffFromToday(dd);
      if (diff !== 0) continue;
      list.push({
        id: `due-today-${s.id}`,
        kind: "payment-due-today",
        pri: -350000,
        title: "Payment due today",
        sub: `${s.customerName} · ${s.invoiceNo}`,
        meta: `${money(s.outstanding)} · due ${dateSlash(dd)}`,
        saleId: s.id,
      });
    }
    for (const s of safeSales) {
      if (s.outstanding <= 0) continue;
      const dd = resolveSaleDueDate(s, state.settings?.defaultDueDays);
      if (isOverdue(dd)) continue;
      const diff = daysDiffFromToday(dd);
      if (diff === null || diff < 1 || diff > PAYMENT_SOON_MAX_DAYS) continue;
      list.push({
        id: `due-soon-${s.id}`,
        kind: "due-soon",
        pri: -45000 + diff,
        title: `Payment due in ${diff} day${diff === 1 ? "" : "s"}`,
        sub: `${s.customerName} · ${s.invoiceNo}`,
        meta: `${money(s.outstanding)} · due ${dateSlash(dd)}`,
        saleId: s.id,
      });
    }
    const bizName = (state.settings?.businessName || "").trim();
    for (const emi of Array.isArray(state.emiEntries) ? state.emiEntries : []) {
      list.push(...buildEmiAlertsForEntry(emi, { businessName: bizName }));
    }
    list.push(
      ...buildServicingAlerts(
        deriveServicingSlots(safeSales, state.servicingCompletions || []),
        { businessName: bizName },
      ),
    );
    for (const r of Array.isArray(state.recurringExpenses) ? state.recurringExpenses : []) {
      if (!r || r.active === false) continue;
      const nd = r.nextDueDate;
      if (!nd) continue;
      const diff = daysDiffFromToday(String(nd).slice(0, 10));
      if (diff === null || diff > 14) continue;
      const dStr = String(nd).slice(0, 10);
      const isPast = diff < 0;
      if (isPast) {
        list.push({
          id: `rec-${r.id}-${dStr}`,
          kind: "recurring-overdue",
          pri: -150000 + diff,
          title: `Recurring invoice overdue (${Math.abs(diff)}d)`,
          sub: (r.description || r.category || "Recurring").trim() || "Recurring",
          meta: `${money(r.amount)} · next ${dateSlash(dStr)}`,
          recurringId: r.id,
        });
      } else if (diff === 0) {
        list.push({
          id: `rec-today-${r.id}-${dStr}`,
          kind: "recurring-today",
          pri: -330000,
          title: "Recurring invoice due today",
          sub: (r.description || r.category || "Recurring").trim() || "Recurring",
          meta: `${money(r.amount)} · next ${dateSlash(dStr)}`,
          recurringId: r.id,
        });
      } else {
        list.push({
          id: `rec-${r.id}-${dStr}`,
          kind: "recurring-soon",
          pri: 8000 + diff,
          title: `Recurring due in ${diff} day${diff === 1 ? "" : "s"}`,
          sub: (r.description || r.category || "Recurring").trim() || "Recurring",
          meta: `${money(r.amount)} · next ${dateSlash(dStr)}`,
          recurringId: r.id,
        });
      }
    }
    for (const row of invRows) {
      if (row.currentQty > 0) continue;
      list.push({
        id: `stk-${row.item.toLowerCase()}`,
        kind: "stock",
        pri: 50000,
        title: row.currentQty < 0 ? "Stock below zero" : "Out of stock",
        sub: row.item,
        meta: "Review stock in / out",
      });
    }
    list.sort((a, b) => a.pri - b.pri);
    const prefs = state.settings || {};
    if (prefs.notificationsEnabled === false) return [];
    const filtered = list.filter((n) => {
      if (prefs.notifyOverduePayments === false && n.kind === "overdue") return false;
      if (prefs.notifyPaymentDueToday === false && n.kind === "payment-due-today") return false;
      if (prefs.notifyPaymentDueSoon === false && n.kind === "due-soon") return false;
      if (prefs.notifyRecurringDueToday === false && n.kind === "recurring-today") return false;
      if (
        prefs.notifyRecurringDue === false &&
        (n.kind === "recurring-soon" || n.kind === "recurring-overdue")
      )
        return false;
      if (prefs.notifyEmiDueThreeDays === false && n.kind === "emi-due-3d") return false;
      if (prefs.notifyServicingDueTwoDays === false && n.kind === "servicing-due-2d") return false;
      if (
        prefs.notifyServicingDue === false &&
        (n.kind === "servicing-due-3d" ||
          n.kind === "servicing-due-today" ||
          n.kind === "servicing-overdue" ||
          n.kind === "servicing-due-soon")
      )
        return false;
      if (prefs.notifyLowStock === false && n.kind === "stock") return false;
      return true;
    });
    const dismissed = new Set(state.dismissedAlertIds || []);
    return filtered.filter((n) => !dismissed.has(n.id));
  }, [safeSales, state.emiEntries, state.recurringExpenses, state.servicingCompletions, state.dismissedAlertIds, invRows, state.settings]);

  /* ── PWA / OS notification permission ─────────────────── */
  const requestNotifPermission = useCallback(async () => {
    if (!("Notification" in window)) return;
    const perm = await Notification.requestPermission();
    setNotifPerm(perm);
    if (perm === "granted") showToast("Notifications enabled");
    else showToast("Notifications not allowed");
  }, [showToast]);

  useOsNotificationsForBellAlerts(notifications, notifPerm, firedNotifIds);

  const dismissAlert = useCallback((id) => {
    setState((p) => {
      const merged = [...new Set([...(p.dismissedAlertIds || []), id])];
      return { ...p, dismissedAlertIds: merged.slice(-MAX_DISMISSED_ALERTS) };
    });
  }, []);

  const dismissAllAlerts = useCallback(() => {
    setState((p) => ({
      ...p,
      dismissedAlertIds: [...new Set([...(p.dismissedAlertIds || []), ...notifications.map((n) => n.id)])].slice(-MAX_DISMISSED_ALERTS),
    }));
  }, [notifications]);

  const onNotificationClick = useCallback((n) => {
    setNotifOpen(false);
    if (n.recurringId) {
      setScreen(null);
      setPage("expenses");
      return;
    }
    if (n.servicingSlotId || n.serviceNum) {
      setScreen(null);
      setPage("servicing");
      return;
    }
    if (n.saleId) {
      setSelSaleId(n.saleId);
      setScreen("saleDetail");
      setPage("invoices");
      return;
    }
    if (n.emiId) {
      setSelEmiId(String(n.emiId));
      setScreen("emiDetail");
      setPage("emi");
      return;
    }
    if (n.invoiceNo) {
      const sale = state.sales.find((s) => s.invoiceNo === n.invoiceNo);
      if (sale) {
        setSelSaleId(sale.id);
        setScreen("saleDetail");
        setPage("invoices");
      } else {
        const emi = (state.emiEntries || []).find((e) => e && e.invoiceNo === n.invoiceNo);
        if (emi?.id) {
          setSelEmiId(emi.id);
          setScreen("emiDetail");
        } else {
          setScreen(null);
        }
        setPage("emi");
      }
      return;
    }
    if (n.kind === "stock") setPage("inventory");
  }, [state.sales, state.emiEntries]);

  const balSum = useMemo(
    () =>
      computeBalanceSheetSummary({
        sales: state.sales,
        purchases: state.purchases,
        inventoryEntries: state.inventoryEntries,
        balance: state.balance,
        settings: state.settings,
        expenses: state.expenses,
        otherIncomes: state.otherIncomes,
        loansGiven: state.loansGiven,
        customerAdvancePayments: state.customerAdvancePayments,
        invRows,
      }),
    [invRows, state.balance, state.sales, state.inventoryEntries, state.settings, state.purchases, state.expenses, state.otherIncomes, state.loansGiven, state.customerAdvancePayments],
  );

  const selSale = useMemo(()=>selSaleId?state.sales.find(s=>s.id===selSaleId):null,[selSaleId,state.sales]);
  const selEmi  = useMemo(()=>selSale?state.emiEntries.find(e=>e.invoiceNo===selSale.invoiceNo):null,[selSale,state.emiEntries]);
  const selEmiDetail = useMemo(
    () => (screen === "emiDetail" && selEmiId ? (state.emiEntries || []).find((e) => e && e.id === selEmiId) ?? null : null),
    [screen, selEmiId, state.emiEntries],
  );
  const selExpense = useMemo(
    () => (selExpenseId ? (state.expenses || []).find((e) => e && e.id === selExpenseId) : null),
    [selExpenseId, state.expenses]
  );
  const selBankAccount = useMemo(() => {
    if (!selBankAccountId || screen !== "bankAccountDetail") return null;
    return (state.balance?.bankAccounts || []).find((a) => a && a.id === selBankAccountId) ?? null;
  }, [selBankAccountId, screen, state.balance?.bankAccounts]);

  const selPurchase = useMemo(
    () => (selPurchaseId ? (state.purchases || []).find((p) => p && p.id === selPurchaseId) : null),
    [selPurchaseId, state.purchases],
  );
  const selOtherIncome = useMemo(
    () =>
      selOtherIncomeId ? (state.otherIncomes || []).find((x) => x && x.id === selOtherIncomeId) ?? null : null,
    [selOtherIncomeId, state.otherIncomes],
  );

  const emi2 = addMonthsStr(saleEntry.dueDate1,1);
  const emi3 = addMonthsStr(saleEntry.dueDate1,2);
  const emi4 = addMonthsStr(saleEntry.dueDate1,3);

  /* ── update helpers ── */
  const updSale = useCallback((k, v) => setSaleEntry((p) => ({ ...p, [k]: v })), []);
  const updStock = (k,v) => setStockEntry(p=>({...p,[k]:v}));
  const updPurchase = (k, v) => setPurchaseEntry((p) => ({ ...p, [k]: v }));
  const updExp   = (k,v) => setExpEntry(p=>({...p,[k]:v}));
  const updOi    = (k,v) => setOiEntry((p) => ({ ...p, [k]: v }));

  /* ── handlers ── */
  const { persistSaleImmediate, persistWholeStateImmediate } = useImmediatePersistence({
    currentUserIdRef,
    lastPersistedStateRef,
    pendingWritesRef,
  });

  const {
    exportBackup,
    importBackupFile,
    requestResetAllData,
    completeResetAllData,
    confirmImportBackup,
  } = useBackupActions({
    state,
    showToast,
    setActionConfirm,
    setState,
    setScreen,
    persistWholeStateImmediate,
  });

  const { onSaveSale, openNewSale, openEditSale, closeNewSale, discardSaleDraft, openDuplicateSale, openCreditNoteFromSale, openDebitNoteFromSale } = useSalesActions({
    state,
    saleEntry,
    editingSaleId,
    showToast,
    setState,
    setScreen,
    setPage,
    setSaleEntry,
    setEditingSaleId,
    persistSaleImmediate,
    persistWholeStateImmediate,
    appendAuditEvent,
    emi2,
    emi3,
    emi4,
  });

  useSaleDraftAutosave({ screen, editingSaleId, saleEntry, setState });

  const saleDraftResume = useMemo(
    () => saleDraftSummary(state.settings?.saleDraft),
    [state.settings?.saleDraft],
  );

  const onResumeSaleDraft = useCallback(() => {
    openNewSale();
  }, [openNewSale]);

  const onDiscardSaleDraft = useCallback(() => {
    discardSaleDraft();
    if (screen === "newSale" && !editingSaleId) {
      openNewSale({ fresh: true });
    }
  }, [discardSaleDraft, openNewSale, screen, editingSaleId]);

  usePwaLaunchActions(authState, setScreen, setPage, openNewSale);

  const { onRecordPayment, onRecordPurchasePayment, onRecordAdvancePayment, onApplyAdvanceToSale, openPayModal, openPayPurchaseModal } = usePaymentActions({
    state,
    payModal,
    payPurchaseModal,
    payAmt,
    payDate,
    payBankAccountId,
    showToast,
    setState,
    setPayModal,
    setPayPurchaseModal,
    setPayAmt,
    setPayDate,
    setPayBankAccountId,
    persistWholeStateImmediate,
    appendAuditEvent,
  });

  const { onDeleteConfirmed } = useDeleteActions({
    state,
    delConfirm,
    selExpenseId,
    selOtherIncomeId,
    editingOtherIncomeId,
    invItemDetail,
    showToast,
    setState,
    setScreen,
    setPage,
    setDelConfirm,
    setSelSaleId,
    setSelExpenseId,
    setSelExpenseCategory,
    setSelOtherIncomeId,
    setEditingOtherIncomeId,
    setEditingInventoryId,
    setInvItemDetail,
    setSelCustomerName,
    setSelVendorName,
    setSelBankAccountId,
    setSelPurchaseId,
    persistWholeStateImmediate,
    appendAuditEvent,
    purchaseNavRef,
    saleNavRef,
    expenseNavRef,
    otherIncomeDetailFromRef,
    otherIncomeOpenedFromRef,
    stockNavRef,
    openedFromGlobalSearchRef,
  });

  const { onSavePurchase } = usePurchaseActions({
    purchaseEntry,
    editingPurchaseId,
    latestStateRef,
    showToast,
    setState,
    setScreen,
    setEditingPurchaseId,
    persistWholeStateImmediate,
    appendAuditEvent,
  });

  const { onSaveCustomer, onSaveVendor } = useDirectoryActions({
    customerEntry,
    editingCustomerId,
    vendorEntry,
    editingVendorId,
    state,
    showToast,
    setState,
    setScreen,
    setSelCustomerName,
    setSelVendorName,
    setEditingCustomerId,
    setEditingVendorId,
    setCustomerEntry,
    setVendorEntry,
    persistWholeStateImmediate,
  });

  const { onSaveStock } = useStockActions({
    state,
    stockEntry,
    editingInventoryId,
    showToast,
    setState,
    setScreen,
    setPage,
    setEditingInventoryId,
    persistWholeStateImmediate,
    stockNavRef,
  });

  const { onSaveExpense } = useExpenseActions({
    state,
    expEntry,
    editingExpenseId,
    showToast,
    setState,
    setScreen,
    setPage,
    setEditingExpenseId,
    persistWholeStateImmediate,
    expenseNavRef,
    newExpenseOpenedFromRef,
  });

  const { onSaveOtherIncome } = useOtherIncomeActions({
    state,
    oiEntry,
    editingOtherIncomeId,
    showToast,
    setState,
    setScreen,
    setPage,
    setEditingOtherIncomeId,
    persistWholeStateImmediate,
    otherIncomeOpenedFromRef,
  });

  const { markServicingComplete, undoServicingComplete, markServicingWaSent } = useServicingActions({
    state,
    setState,
    showToast,
    persistWholeStateImmediate,
    lastPersistedStateRef,
  });

  const { saveBank, removeBankTransfer, addBankTransfer } = useBankingActions({
    state,
    setState,
    showToast,
    persistWholeStateImmediate,
    bankSaveInFlightRef,
  });

  const {
    saveSettingsPartial,
    setDarkModeAndPersist,
    saveBranchesList,
    removeBranchById,
  } = useSettingsActions({
    state,
    darkMode,
    setDarkMode,
    showToast,
    setState,
    persistWholeStateImmediate,
  });

  const { toggleEmiDuePaid } = useEmiActions({
    state,
    showToast,
    setState,
    persistWholeStateImmediate,
  });

  const {
    patchFixed,
    addFixed,
    removeFixed,
    saveFixed,
    saveOtherBalance,
    saveOwnerCapitalInvested,
  } = useBalanceSheetActions({
    showToast,
    setState,
    persistWholeStateImmediate,
  });

  const { patchInventoryProductCategory, patchInventoryProductTaxMeta, renameInventoryProduct } = useInventoryActions({
    state,
    showToast,
    setState,
    persistWholeStateImmediate,
  });

  const renameInventoryProductDetail = useCallback(
    (itemKey, newName) =>
      renameInventoryProduct(itemKey, newName, (updated) => {
        setInvItemDetail((prev) =>
          prev && String(prev.itemKey || "").toLowerCase() === String(itemKey || "").toLowerCase()
            ? { ...prev, itemKey: updated.itemKey, displayName: updated.displayName }
            : prev,
        );
      }),
    [renameInventoryProduct, setInvItemDetail],
  );

  const { resolveSyncConflict, restoreSyncConflict, clearResolvedConflicts } =
    useSyncConflictActions({
      state,
      showToast,
      setState,
      persistWholeStateImmediate,
      appendAuditEvent,
    });

  const dismissWelcome = useCallback(() => {
    try {
      localStorage.setItem(LS_WELCOME_DONE, "1");
    } catch {
      /* ignore */
    }
    setWelcomeOpen(false);
  }, []);

  const { payModalTrapRef, delModalTrapRef, actionConfirmTrapRef, simpleConfirmTrapRef } = useAppModalFocusTraps({
    payModal,
    payPurchaseModal,
    delConfirm,
    actionConfirm,
    simpleConfirm,
  });

  const goPage = useCallback((nextPage) => {
    const id = normalizeStoredPage(nextPage);
    if (!NAV_PAGE_IDS.has(id)) return;
    setSidebarOpen(false);
    /* Defer heavy tab tree swap so the menu can close and paint first (smoother on low-end devices). */
    startTransition(() => {
      resetRootNavigationRefs();
      setScreen(null);
      setSelExpenseCategory(null);
      setSelBankAccountId(null);
      setSelSaleId(null);
      setSelCustomerName(null);
      setSelVendorName(null);
      setSelPurchaseId(null);
      setSelExpenseId(null);
      setSelOtherIncomeId(null);
      setSelEmiId(null);
      setInvItemDetail(null);
      setEditingSaleId(null);
      setEditingPurchaseId(null);
      setEditingCustomerId(null);
      setEditingVendorId(null);
      setEditingExpenseId(null);
      setEditingOtherIncomeId(null);
      setEditingInventoryId(null);
      setPage(id);
    });
  }, [resetRootNavigationRefs]);

  const openSidebar = useCallback(() => setSidebarOpen(true), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  const openSearchScreen = useCallback(() => setScreen("search"), [setScreen]);
  const toggleAccountingBasis = useCallback(() => {
    saveSettingsPartial({
      accountingBasis: state.settings?.accountingBasis === "accrual" ? "cash" : "accrual",
    });
  }, [saveSettingsPartial, state.settings?.accountingBasis]);

  const dismissBootLoading = useCallback(() => setBootVisible(false), []);

  /* Safety: never keep splash over the app if finish animation does not fire. */
  useEffect(() => {
    if (authState !== "ready") return;
    const id = window.setTimeout(() => setBootVisible(false), 1600);
    return () => clearTimeout(id);
  }, [authState]);

  useBootVisibleWhenAuthChecking(authState, setBootVisible);

  /* Bundle maps values to MainStage props only; trap refs are passed separately below (react-hooks/refs). */
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const mergedMainStageProps = useMemo(() => mergeAuthenticatedMainStageProps({
    screen,
    page,
    goPage,
    setScreen,
    setSidebarOpen,
    setSelCustomerName,
    setSelEmiId,
    setSelBankAccountId,
    setEditingCustomerId,
    setCustomerEntry,
    setSelVendorName,
    setEditingVendorId,
    setVendorEntry,
    setDelConfirm,
    setPayModal,
    setPayPurchaseModal,
    setPayBankAccountId,
    setPayAmt,
    setActionConfirm,
    state,
    kpis,
    kpiSparklines,
    fyStr,
    fyYear,
    fsm,
    balSum,
    businessMonth,
    setBusinessMonth,
    dashSales,
    dashPurchases,
    dashExp,
    dashOtherIncome,
    filteredSales,
    saleView,
    setSaleView,
    searchTerm,
    setSearchTerm,
    showSearch,
    setShowSearch,
    safeSales,
    safeExpenses,
    safeInventory,
    safeOtherIncomes,
    invRows,
    saleStockPickRows,
    saleBranchInvRowsFull,
    saleDefaultBranchLabel,
    notifications,
    effectiveNotifOpen,
    setNotifOpen,
    payModal,
    payPurchaseModal,
    delConfirm,
    actionConfirm,
    welcomeOpen,
    payBankAccountId,
    payAmt,
    payDate,
    editingSaleId,
    editingCustomerId,
    editingVendorId,
    editingExpenseId,
    editingOtherIncomeId,
    saleEntry,
    updSale,
    emi2,
    emi3,
    emi4,
    customerEntry,
    updCustomer,
    vendorEntry,
    updVendor,
    stockEntry,
    updStock,
    purchaseEntry,
    updPurchase,
    expEntry,
    updExp,
    oiEntry,
    updOi,
    addStockBranchInvRows,
    stockCategorySuggestions,
    selCustomerName,
    selVendorName,
    selExpenseCategory,
    selEmiDetail,
    selSale,
    selEmi,
    selExpense,
    selOtherIncome,
    selBankAccount,
    expensesInSelCategory,
    darkMode,
    setDarkMode: setDarkModeAndPersist,
    cloudSyncMeta,
    swUpdateReady,
    toast,
    dismissAlert,
    dismissAllAlerts,
    onNotificationClick,
    notifPerm,
    requestNotifPermission,
    openNewSale,
    openSaleDetail,
    saleDraftResume,
    onResumeSaleDraft,
    onDiscardSaleDraft,
    discardSaleDraft,
    openNewExpense,
    openNewCustomer,
    openNewVendor,
    openAddStock,
    invItemDetail,
    openInventoryItemDetail,
    openInventoryItemDetailFromSearch,
    closeInventoryItemDetail,
    openNewOtherIncome,
    openNewPurchase,
    openEditPurchase,
    openPurchaseDetail,
    closePurchaseDetail,
    closeNewPurchase,
    selPurchase,
    editingPurchaseId,
    openEditOtherIncome,
    openOtherIncomeDetail,
    closeOtherIncomeDetail,
    openExpenseCategory,
    openSaleDetailFromInvoice,
    saveBranchesList,
    removeBranchById,
    addBank,
    addBankTransfer,
    patchFixed,
    addFixed,
    removeFixed,
    saveFixed,
    patchInventoryProductCategory,
    patchInventoryProductTaxMeta,
    renameInventoryProduct: renameInventoryProductDetail,
    saveOtherBalance,
    saveOwnerCapitalInvested,
    saveSettingsPartial,
    exportBackup,
    importBackupFile,
    requestResetAllData,
    executeCloudSync,
    resolveSyncConflict,
    restoreSyncConflict,
    clearResolvedConflicts,
    onSaveSale,
    closeNewSale,
    onSaveCustomer,
    closeNewCustomer,
    onSaveVendor,
    closeNewVendor,
    toggleEmiDuePaid,
    closeSaleDetailNav,
    openEmiDetail,
    closeEmiDetailNav,
    openEditSale,
    openDuplicateSale,
    openCreditNoteFromSale,
    openDebitNoteFromSale,
    openPayModal,
    openPayPurchaseModal,
    onStockProductPick,
    onStockTypeChange,
    onSaveStock,
    closeAddStock,
    editingInventoryId,
    openEditInventoryEntry,
    onSavePurchase,
    closeBankAccountDetail,
    openBankAccountFromSearch,
    openCustomerDetailFromSearch,
    closeCustomerDetailNav,
    openVendorDetailFromSearch,
    closeVendorDetailNav,
    requestDeleteBankActivity,
    patchBank,
    saveBank,
    openExpenseDetail,
    removeBankTransfer,
    onSaveOtherIncome,
    closeNewOtherIncome,
    markServicingComplete,
    undoServicingComplete,
    markServicingWaSent,
    closeExpenseCategory,
    closeExpenseDetail,
    openEditExpense,
    onSaveExpense,
    closeNewExpense,
    onRecordPayment,
    onRecordPurchasePayment,
    onRecordAdvancePayment,
    onApplyAdvanceToSale,
    setPayDate,
    onDeleteConfirmed,
    confirmImportBackup,
    completeResetAllData,
    dismissWelcome,
    reloadWithNewVersion,
    simpleConfirm,
    requestConfirm,
    cancelSimpleConfirm,
    onSimpleConfirm,
  }), [
    screen, page, goPage, setScreen, setSidebarOpen,
    setSelCustomerName, setSelEmiId, setSelBankAccountId,
    setEditingCustomerId, setCustomerEntry, setSelVendorName,
    setEditingVendorId, setVendorEntry, setDelConfirm, setPayModal,
    setPayPurchaseModal, setPayBankAccountId, setPayAmt, setActionConfirm,
    state, kpis, kpiSparklines, fyStr, fyYear, fsm, balSum,
    businessMonth, setBusinessMonth,
    dashSales, dashPurchases, dashExp, dashOtherIncome,
    filteredSales, saleView, setSaleView, searchTerm, setSearchTerm,
    showSearch, setShowSearch, safeSales, safeExpenses, safeInventory,
    safeOtherIncomes, invRows, saleStockPickRows, saleBranchInvRowsFull,
    saleDefaultBranchLabel, notifications, effectiveNotifOpen, setNotifOpen,
    payModal, payPurchaseModal, delConfirm, actionConfirm, simpleConfirm,
    welcomeOpen, payBankAccountId, payAmt, payDate,
    editingSaleId, editingCustomerId, editingVendorId,
    editingExpenseId, editingOtherIncomeId,
    saleEntry, updSale, emi2, emi3, emi4,
    customerEntry, updCustomer, vendorEntry, updVendor,
    stockEntry, updStock, expEntry, updExp, oiEntry, updOi,
    addStockBranchInvRows, stockCategorySuggestions,
    selCustomerName, selVendorName, selExpenseCategory, selEmiDetail,
    selSale, selEmi, selExpense, selOtherIncome, selBankAccount,
    expensesInSelCategory, darkMode, cloudSyncMeta, swUpdateReady, toast,
    purchaseEntry, updPurchase, editingPurchaseId,
    dismissAlert, dismissAllAlerts, onNotificationClick, notifPerm,
    requestNotifPermission, openNewSale, openSaleDetail, saleDraftResume,
    onResumeSaleDraft, onDiscardSaleDraft, discardSaleDraft, openNewExpense,
    openNewCustomer, openNewVendor, openAddStock, invItemDetail,
    openInventoryItemDetail, openInventoryItemDetailFromSearch,
    closeInventoryItemDetail, openNewOtherIncome, openNewPurchase,
    openEditPurchase, openPurchaseDetail, closePurchaseDetail,
    closeNewPurchase, selPurchase,
    openEditOtherIncome, openOtherIncomeDetail, closeOtherIncomeDetail,
    openExpenseCategory, openSaleDetailFromInvoice,
    saveBranchesList, removeBranchById, addBank, addBankTransfer,
    patchFixed, addFixed, removeFixed, saveFixed,
    patchInventoryProductCategory,
    patchInventoryProductTaxMeta, renameInventoryProductDetail,
    saveOtherBalance, saveOwnerCapitalInvested, saveSettingsPartial,
    exportBackup, importBackupFile, requestResetAllData,
    executeCloudSync, resolveSyncConflict, restoreSyncConflict,
    clearResolvedConflicts, onSaveSale, closeNewSale,
    onSaveCustomer, closeNewCustomer, onSaveVendor, closeNewVendor,
    toggleEmiDuePaid, closeSaleDetailNav, openEmiDetail, closeEmiDetailNav,
    openEditSale, openPayModal, openPayPurchaseModal,
    onStockProductPick, onStockTypeChange, onSaveStock, closeAddStock,
    editingInventoryId, openEditInventoryEntry, onSavePurchase,
    closeBankAccountDetail, openBankAccountFromSearch,
    openCustomerDetailFromSearch, closeCustomerDetailNav,
    openVendorDetailFromSearch, closeVendorDetailNav,
    requestDeleteBankActivity, patchBank, saveBank, openExpenseDetail,
    removeBankTransfer, onSaveOtherIncome, closeNewOtherIncome,
    markServicingComplete, undoServicingComplete, markServicingWaSent,
    closeExpenseCategory, closeExpenseDetail, openEditExpense,
    onSaveExpense, closeNewExpense, onRecordPayment, onRecordPurchasePayment,
    onRecordAdvancePayment, onApplyAdvanceToSale,
    setPayDate, onDeleteConfirmed, confirmImportBackup, completeResetAllData,
    dismissWelcome, reloadWithNewVersion, requestConfirm,
    cancelSimpleConfirm, onSimpleConfirm,
    setDarkModeAndPersist,
  ]); // eslint-disable-line react-hooks/exhaustive-deps

  useLayoutEffect(() => {
    detailScreenClosersRef.current = {
      bankAccountDetail: closeBankAccountDetail,
      customerDetail: closeCustomerDetailNav,
      vendorDetail: closeVendorDetailNav,
      inventoryItemDetail: closeInventoryItemDetail,
      emiDetail: closeEmiDetailNav,
      saleDetail: closeSaleDetailNav,
      purchaseDetail: closePurchaseDetail,
      expenseDetail: closeExpenseDetail,
      newExpense: closeNewExpense,
      addStock: closeAddStock,
    };
  }, [
    closeBankAccountDetail,
    closeCustomerDetailNav,
    closeVendorDetailNav,
    closeInventoryItemDetail,
    closeEmiDetailNav,
    closeSaleDetailNav,
    closePurchaseDetail,
    closeExpenseDetail,
    closeNewExpense,
    closeAddStock,
  ]);

  /* ─── render ─────────────────────────────────────────────── */
  return (
    <AuthStep
      authState={authState}
      bootVisible={bootVisible}
      bootProgressPct={bootProgress.pct}
      bootProgressLabel={bootProgress.label}
      onAuthenticated={handleAuthenticated}
      onBootFinish={dismissBootLoading}
    >
      <AuthenticatedShell
        sidebar={
          <AppSidebarColumn
            open={sidebarOpen}
            onClose={closeSidebar}
            page={page}
            screen={screen}
            alertCount={notifications.length}
            goPage={goPage}
            darkMode={darkMode}
            setDarkMode={setDarkModeAndPersist}
            pendingOutbox={pendingOutbox}
            onLogout={handleLogout}
          />
        }
      >
        <AuthenticatedMainColumn
          mobileBar={
            <MobileAppBar
              onOpenMenu={openSidebar}
              onOpenSearch={openSearchScreen}
              screen={screen}
              page={page}
              inventoryItemDetailName={invItemDetail?.displayName}
              purchaseDetailSupplierName={selPurchase?.supplierName}
              businessName={state.settings.businessName}
              selCustomerName={selCustomerName}
              selVendorName={selVendorName}
              selExpenseCategory={selExpenseCategory}
              editingExpenseId={editingExpenseId}
              editingSaleId={editingSaleId}
              editingVendorId={editingVendorId}
              editingCustomerId={editingCustomerId}
              editingPurchaseId={editingPurchaseId}
              bankAccountLabel={selBankAccount?.name?.trim() || "Account"}
              editingOtherIncomeId={editingOtherIncomeId}
              emiDetailInvoiceNo={selEmiDetail?.invoiceNo}
              payModal={!!(payModal || payPurchaseModal)}
              delConfirm={delConfirm}
              effectiveNotifOpen={effectiveNotifOpen}
              setNotifOpen={setNotifOpen}
              notifications={notifications}
              notifPerm={notifPerm}
              onRequestNotifPerm={requestNotifPermission}
              onDismissAlert={dismissAlert}
              onDismissAllAlerts={dismissAllAlerts}
              onNotificationClick={onNotificationClick}
              accountingBasis={state.settings?.accountingBasis === "accrual" ? "accrual" : "cash"}
              onToggleAccountingBasis={toggleAccountingBasis}
            />
          }
        >
          <MainStage
            {...mergedMainStageProps}
            payModalTrapRef={payModalTrapRef}
            delModalTrapRef={delModalTrapRef}
            actionConfirmTrapRef={actionConfirmTrapRef}
            simpleConfirmTrapRef={simpleConfirmTrapRef}
          />

        </AuthenticatedMainColumn>
      </AuthenticatedShell>
    </AuthStep>
  );
}

