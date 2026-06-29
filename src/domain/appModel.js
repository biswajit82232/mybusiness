/**
 * Pure domain: defaults, normalization, merge, helpers (no React).
 * Split from App.jsx — keep in sync when editing persisted state shape.
 */
import { normSaleDraft } from "./saleDraft.js";
import { normalizeInvoiceTemplate } from "./invoiceTemplates.js";

export const MAX_DISMISSED_ALERTS = 500;
/** Chunk size for long scrolling lists (sales, ledger, etc.). */
export const LIST_PAGE_SIZE = 75;
export const LS_WELCOME_DONE = "mb_welcome_v1_done";

/** Drill-down key: list every one-off expense in the period (not a real user category name). */
export const EXPENSE_CATEGORY_ALL = "__mb_exp_all__";

export const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
export const DEFAULT_EXPENSE_CATEGORIES = ["Rent","Utilities","Salary","Transport","Office","Marketing","Maintenance","Repairs","Food","Other"];
export const DEFAULT_OTHER_INCOME_CATEGORIES = ["Interest","Rent received","Commission","Cashback","Refund","Other"];

const AUDIT_EVENT_MAX = 5000;
const CONFLICT_QUEUE_MAX = 500;

/** Operating expense treated as income tax for P&amp;L breakdown (PBT vs PAT). */
export function isIncomeTaxExpense(e) {
  if (!e || typeof e !== "object") return false;
  const c = String(e.category ?? "").trim().toLowerCase();
  return c === "income tax" || c === "tax" || c.includes("income tax") || c === "tds";
}

/**
 * Cash paid for stock-in (Add Stock), for ledger / cash flow — qty × cost per unit.
 * Opening stock has no cash effect.
 * Rows linked to {@link purchaseId} are excluded: supplier cash is counted only via purchase `paymentEntries`.
 */
export function stockInCashAmount(entry) {
  if (!entry || typeof entry !== "object") return 0;
  if (entry.type === "out" || entry.type === "opening") return 0;
  if (String(entry.purchaseId || "").trim()) return 0;
  return num(entry.qty) * num(entry.costPerUnit);
}

/** Per calendar day in `YYYY-MM` with cash in/out (payment dates for sales; bank-linked expenses, stock, supplier payments — matches `bankingActivityForMonth`). */
export function aggregateCashflowDaysInMonth(
  sales,
  expenses,
  inventoryEntries,
  otherIncomes,
  monthKey,
  purchases = [],
  loansGiven = [],
  bankTransfers = [],
  customerAdvancePayments = [],
) {
  const mk = String(monthKey || "").slice(0, 7);
  if (mk.length < 7) return [];
  const map = new Map();
  const bumpIn = (day, v) => {
    if (!day || day.length < 10 || !day.startsWith(mk)) return;
    const o = map.get(day) || { cashIn: 0, cashOut: 0 };
    o.cashIn += v;
    map.set(day, o);
  };
  const bumpOut = (day, v) => {
    if (!day || day.length < 10 || !day.startsWith(mk)) return;
    const o = map.get(day) || { cashIn: 0, cashOut: 0 };
    o.cashOut += v;
    map.set(day, o);
  };
  for (const s of sales || []) {
    if (!s || typeof s !== "object") continue;
    const pes = normalizePaymentEntries(s);
    if (pes.length > 0) {
      for (const pe of pes) {
        if (String(pe.sourceAdvanceId || "").trim()) continue;
        bumpIn(String(pe.date || "").slice(0, 10), num(pe.amount));
      }
    } else if (num(s.received) > 0) {
      bumpIn(String(s.date || "").slice(0, 10), num(s.received));
    }
  }
  for (const adv of normCustomerAdvancePayments(customerAdvancePayments)) {
    bumpIn(String(adv.date || "").slice(0, 10), num(adv.amount));
  }
  for (const oi of otherIncomes || []) {
    if (!oi || typeof oi !== "object") continue;
    if (!String(oi.bankAccountId || "").trim()) continue;
    bumpIn(String(oi.date || "").slice(0, 10), num(oi.amount));
  }
  for (const e of expenses || []) {
    if (!e || typeof e !== "object") continue;
    if (!String(e.bankAccountId || "").trim()) continue;
    bumpOut(String(e.date || "").slice(0, 10), num(e.amount));
  }
  for (const inv of inventoryEntries || []) {
    if (!inv || typeof inv !== "object" || inv.type === "out") continue;
    if (!String(inv.bankAccountId || "").trim()) continue;
    bumpOut(String(inv.date || "").slice(0, 10), stockInCashAmount(inv));
  }
  for (const p of purchases || []) {
    if (!p || typeof p !== "object") continue;
    for (const pe of normalizePurchasePaymentEntries(p)) {
      bumpOut(String(pe.date || "").slice(0, 10), num(pe.amount));
    }
  }
  for (const lg of loansGiven || []) {
    if (!lg || typeof lg !== "object") continue;
    const dbid = String(lg.disbursementBankAccountId || "").trim();
    if (dbid) {
      const damt = num(lg.disbursementAmount) > 0 ? num(lg.disbursementAmount) : num(lg.principal);
      if (damt > 0) bumpOut(String(lg.disbursementDate || lg.dateGiven || "").slice(0, 10), damt);
    }
    for (const rep of lg.repaymentEntries || []) {
      if (!rep || !String(rep.bankAccountId || "").trim()) continue;
      bumpIn(String(rep.date || "").slice(0, 10), num(rep.amount));
    }
  }
  for (const t of bankTransfers || []) {
    if (!t || typeof t !== "object") continue;
    const day = String(t.date || "").slice(0, 10);
    const from = String(t.fromAccountId || "");
    const to = String(t.toAccountId || "");
    if (from === BANK_EXTERNAL_SOURCE_ID && to && to !== BANK_EXTERNAL_SINK_ID) {
      bumpIn(day, num(t.amount));
    } else if (to === BANK_EXTERNAL_SINK_ID && from && from !== BANK_EXTERNAL_SOURCE_ID) {
      bumpOut(day, num(t.amount));
    }
  }
  return [...map.entries()]
    .filter(([, o]) => o.cashIn > 0 || o.cashOut > 0)
    .sort(([a], [b]) => a.localeCompare(b));
}

/** Bank-linked loan disbursement cash out in a calendar month (YYYY-MM). */
export function sumLoanDisbursementCashOutInMonth(loansGiven, monthKey) {
  const mk = String(monthKey || "").slice(0, 7);
  if (mk.length < 7) return 0;
  let out = 0;
  for (const lg of loansGiven || []) {
    if (!lg || !String(lg.disbursementBankAccountId || "").trim()) continue;
    const d = String(lg.disbursementDate || lg.dateGiven || "").slice(0, 10);
    if (d.slice(0, 7) !== mk) continue;
    const damt = num(lg.disbursementAmount) > 0 ? num(lg.disbursementAmount) : num(lg.principal);
    if (damt > 0) out += damt;
  }
  return out;
}

/** Bank-linked loan repayment cash in in a calendar month (YYYY-MM). */
export function sumLoanRepaymentCashInInMonth(loansGiven, monthKey) {
  const mk = String(monthKey || "").slice(0, 7);
  if (mk.length < 7) return 0;
  let inn = 0;
  for (const lg of loansGiven || []) {
    if (!lg || typeof lg !== "object") continue;
    for (const rep of lg.repaymentEntries || []) {
      if (!rep || !String(rep.bankAccountId || "").trim()) continue;
      const d = String(rep.date || "").slice(0, 10);
      if (d.slice(0, 7) !== mk) continue;
      inn += num(rep.amount);
    }
  }
  return inn;
}

export function sumLoanDisbursementCashOutOnDay(loansGiven, dayStr) {
  const d = String(dayStr || "").slice(0, 10);
  if (d.length < 10) return 0;
  let out = 0;
  for (const lg of loansGiven || []) {
    if (!lg || !String(lg.disbursementBankAccountId || "").trim()) continue;
    const dd = String(lg.disbursementDate || lg.dateGiven || "").slice(0, 10);
    if (dd !== d) continue;
    const damt = num(lg.disbursementAmount) > 0 ? num(lg.disbursementAmount) : num(lg.principal);
    if (damt > 0) out += damt;
  }
  return out;
}

export function sumLoanRepaymentCashInOnDay(loansGiven, dayStr) {
  const d = String(dayStr || "").slice(0, 10);
  if (d.length < 10) return 0;
  let inn = 0;
  for (const lg of loansGiven || []) {
    if (!lg || typeof lg !== "object") continue;
    for (const rep of lg.repaymentEntries || []) {
      if (!rep || !String(rep.bankAccountId || "").trim()) continue;
      if (String(rep.date || "").slice(0, 10) !== d) continue;
      inn += num(rep.amount);
    }
  }
  return inn;
}

/** Narrow sales / expenses / inventory / other income rows for Ledger (and similar) by FY, calendar month, or day. */
export function filterSalesExpensesInvByPeriod(sales, expenses, inv, otherIncomes, granularity, fsm, fyYear, monthKey, dayStr) {
  if (granularity === "fy") {
    return {
      sales: (sales || []).filter((s) => s && isDateInFy(s.date, fsm, fyYear)),
      expenses: (expenses || []).filter((e) => e && isDateInFy(e.date, fsm, fyYear)),
      inventoryEntries: (inv || []).filter((x) => x && isDateInFy(x.date, fsm, fyYear)),
      otherIncomes: (otherIncomes || []).filter((x) => x && isDateInFy(x.date, fsm, fyYear)),
    };
  }
  if (granularity === "month") {
    const mk = monthKey && String(monthKey).length >= 7 ? String(monthKey).slice(0, 7) : currentMonthStr();
    const ok = (d) => String(d || "").startsWith(mk);
    return {
      sales: (sales || []).filter((s) => s && ok(s.date)),
      expenses: (expenses || []).filter((e) => e && ok(e.date)),
      inventoryEntries: (inv || []).filter((x) => x && ok(x.date)),
      otherIncomes: (otherIncomes || []).filter((x) => x && ok(x.date)),
    };
  }
  const d = dayStr && String(dayStr).length >= 10 ? String(dayStr).slice(0, 10) : todayStr();
  const okd = (dt) => String(dt || "").slice(0, 10) === d;
  return {
    sales: (sales || []).filter((s) => s && okd(s.date)),
    expenses: (expenses || []).filter((e) => e && okd(e.date)),
    inventoryEntries: (inv || []).filter((x) => x && okd(x.date)),
    otherIncomes: (otherIncomes || []).filter((x) => x && okd(x.date)),
  };
}

/** Normalize persisted or form input into a non-empty category list; always includes "Other". */
export function normalizeExpenseCategoriesFromPersist(raw) {
  if (raw == null) return [...DEFAULT_EXPENSE_CATEGORIES];
  const lines = Array.isArray(raw)
    ? raw
    : typeof raw === "string"
      ? raw.split("\n")
      : [];
  const list = [
    ...new Set(
      lines
        .map((x) => String(x).trim())
        .filter(Boolean)
        .map((c) => (c.toLowerCase() === "purchase (cogs)" ? "Office" : c)),
    ),
  ];
  if (!list.length) return [...DEFAULT_EXPENSE_CATEGORIES];
  if (!list.includes("Other")) list.push("Other");
  return list;
}

export function getExpenseCategoriesList(settings) {
  return normalizeExpenseCategoriesFromPersist(settings?.expenseCategories);
}

export function normalizeOtherIncomeCategoriesFromPersist(raw) {
  if (raw == null) return [...DEFAULT_OTHER_INCOME_CATEGORIES];
  const lines = Array.isArray(raw)
    ? raw
    : typeof raw === "string"
      ? raw.split("\n")
      : [];
  const list = [...new Set(lines.map((x) => String(x).trim()).filter(Boolean))];
  if (!list.length) return [...DEFAULT_OTHER_INCOME_CATEGORIES];
  if (!list.includes("Other")) list.push("Other");
  return list;
}

export function getOtherIncomeCategoriesList(settings) {
  return normalizeOtherIncomeCategoriesFromPersist(settings?.otherIncomeCategories);
}

export function resolveOtherIncomeCategory(cat, settings) {
  const list = getOtherIncomeCategoriesList(settings);
  const c = String(cat ?? "").trim();
  if (list.includes(c)) return c;
  return list.includes("Other") ? "Other" : (list[0] || "Other");
}

export function resolveExpenseCategory(cat, settings) {
  const list = getExpenseCategoriesList(settings);
  let c = String(cat ?? "").trim();
  if (c.toLowerCase() === "purchase (cogs)") c = "Office";
  if (list.includes(c)) return c;
  return list.includes("Other") ? "Other" : (list[0] || "Other");
}
export const RECURRING_FREQUENCIES = [
  { id: "weekly", label: "Weekly" },
  { id: "monthly", label: "Monthly" },
  { id: "quarterly", label: "Quarterly" },
  { id: "yearly", label: "Yearly" },
];
export const DEFAULT_FINANCE_COS = ["Bajaj Finance","Akasa Finance"];

/** Stable id for the default branch when none is stored (legacy data uses empty branchId = main). */
export const BRANCH_MAIN_ID = "branch-main";

/** Main routes (sidebar) — each opens as its own page, not the old 5-tab hub. */
export const NAV_PAGE_IDS = new Set([
  "dashboard",
  "invoices",
  "customers",
  "receivables",
  "payables",
  "emi",
  "servicing",
  "inventory",
  "branch",
  "products",
  "accounts",
  "banking",
  "fixedAssets",
  "cashFlow",
  "ledger",
  "expenses",
  "otherIncome",
  "reports",
  "capitalGrowth",
  "netWorth",
  "purchases",
  "vendors",
  "payments",
  "settings",
]);
export const LEGACY_TAB_TO_PAGE = {
  home: "dashboard",
  sales: "invoices",
  inventory: "inventory",
  finance: "accounts",
  more: "dashboard",
};
/** Old full-screen routes that are now main pages (session migration). */
export const LEGACY_SCREEN_TO_PAGE = {
  customers: "customers",
  receivables: "receivables",
  emiList: "emi",
  productCatalog: "products",
  cashFlow: "cashFlow",
  ledger: "ledger",
  expenses: "expenses",
  otherIncome: "otherIncome",
  reports: "reports",
  capitalGrowth: "capitalGrowth",
  settings: "settings",
};

/** Retired routes — session restore maps these to dashboard (data preserved in merge). */
export const RETIRED_NAV_PAGE_IDS = new Set(["loansGiven", "bundles"]);

export function normalizeStoredPage(v) {
  if (RETIRED_NAV_PAGE_IDS.has(v)) return "dashboard";
  if (NAV_PAGE_IDS.has(v)) return v;
  if (typeof v === "string" && LEGACY_TAB_TO_PAGE[v]) return LEGACY_TAB_TO_PAGE[v];
  return "dashboard";
}

/* ─── helpers ─────────────────────────────────────────────── */

export function num(v)   { const n = Number(v); return Number.isFinite(n) ? n : 0; }

export const moneyFormatter = new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:0});
export const moneyFullFormatter = new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",minimumFractionDigits:2,maximumFractionDigits:2});
export function money(v) {
  return moneyFormatter.format(num(v));
}
export function moneyFull(v) {
  return moneyFullFormatter.format(num(v));
}

// Used for offline-first diffing so we enqueue/upload only changed records.
/** When set, memoizes string results per object identity (helps shared refs in one graph). */
let _stableStringifyMemo = null;

/**
 * Run a block (e.g. one persist pass) with per-object memoization for {@link stableStringify}.
 * Does not change equality semantics for acyclic JSON-like trees.
 */
export function runWithStableStringifyMemo(fn) {
  const prev = _stableStringifyMemo;
  _stableStringifyMemo = new WeakMap();
  try {
    return fn();
  } finally {
    _stableStringifyMemo = prev;
  }
}

/** Same as {@link runWithStableStringifyMemo} for async persist passes. */
export async function runWithStableStringifyMemoAsync(fn) {
  const prev = _stableStringifyMemo;
  _stableStringifyMemo = new WeakMap();
  try {
    return await fn();
  } finally {
    _stableStringifyMemo = prev;
  }
}

function stableStringifyInner(v) {
  if (v === null || v === undefined) return JSON.stringify(v);
  if (typeof v !== "object") return JSON.stringify(v);
  if (_stableStringifyMemo) {
    const hit = _stableStringifyMemo.get(v);
    if (hit !== undefined) return hit;
  }
  let out;
  if (Array.isArray(v)) {
    out = `[${v.map((x) => stableStringifyInner(x)).join(",")}]`;
  } else {
    const keys = Object.keys(v).sort();
    out = `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringifyInner(v[k])}`).join(",")}}`;
  }
  if (_stableStringifyMemo && typeof v === "object") {
    _stableStringifyMemo.set(v, out);
  }
  return out;
}

export function stableStringify(v) {
  return stableStringifyInner(v);
}

export function dateHuman(d) {
  if (!d) return "—";
  const dt = new Date(d + "T00:00:00");
  return isNaN(dt) ? d : dt.toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"});
}
export function dateSlash(d) {
  if (!d) return "—";
  const dt = new Date(d + "T00:00:00");
  if (isNaN(dt)) return d;
  return `${String(dt.getDate()).padStart(2,"0")}/${String(dt.getMonth()+1).padStart(2,"0")}/${dt.getFullYear()}`;
}

/** Today's date YYYY-MM-DD in the user's local calendar (not UTC — avoids wrong "As of" day). */
export function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** YYYY-MM for `<input type="month">`, local calendar month */
export function currentMonthStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** YYYY-MM-DD from a Date in the local calendar (not UTC — matches `todayStr` / date inputs). */
export function toYmdLocal(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function addDaysStr(dateStr, days) {
  const d = new Date((dateStr || todayStr()) + "T00:00:00");
  d.setDate(d.getDate() + days);
  return toYmdLocal(d);
}
export function addMonthsStr(dateStr, m) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  d.setMonth(d.getMonth() + m);
  return toYmdLocal(d);
}

/** Ascending compare for YYYY-MM-DD strings (safe vs Date subtraction / NaN). */
export function compareYmdAsc(a, b) {
  const da = String(a ?? "").slice(0, 10);
  const db = String(b ?? "").slice(0, 10);
  if (da === db) return 0;
  return da < db ? -1 : 1;
}

/** Descending compare for YYYY-MM-DD strings. */
export function compareYmdDesc(a, b) {
  return compareYmdAsc(b, a);
}

/** Newest-first by calendar date, then {@link makeId} timestamp when dates tie. */
export function compareRecordsByRecency(a, b) {
  const byDate = compareYmdDesc(a?.date, b?.date);
  if (byDate !== 0) return byDate;
  return (entityTimeMsFromId(b?.id) || 0) - (entityTimeMsFromId(a?.id) || 0);
}

/** YYYY-MM from a record date string */
export function monthKeyFromRecord(dateStr) {
  const t = String(dateStr || "").slice(0, 10);
  return t.length >= 7 ? t.slice(0, 7) : "";
}

/** Short month names — avoids `toLocaleDateString` / OS differences (e.g. "April, 2026" vs "Apr 2026"). */
export const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Display label e.g. "Apr, 2026" (always this shape app-wide). */
export function formatMonthLabel(monthKey) {
  const [y, m] = String(monthKey).split("-").map(Number);
  if (!y || !m || m < 1 || m > 12) return String(monthKey);
  return `${MONTH_SHORT[m - 1]}, ${y}`;
}

/** Compact e.g. `Apr '26` for dense tables on small screens. */
export function formatMonthLabelCompact(monthKey) {
  const [y, m] = String(monthKey).split("-").map(Number);
  if (!y || !m || m < 1 || m > 12) return String(monthKey);
  const yy = y % 100;
  return `${MONTH_SHORT[m - 1]} '${String(yy).padStart(2, "0")}`;
}

/** Table cell: em dash for exact zero to save width; else full rupees. */
export function moneyCgTableCell(v) {
  const n = num(v);
  if (Math.abs(n) < 0.005) return "—";
  return moneyFull(n);
}

/** Step `YYYY-MM` by delta months (empty `ym` uses current month as base). */
export function shiftMonthKey(ym, delta) {
  const base = ym && String(ym).length >= 7 ? ym : currentMonthStr();
  const [y, m] = base.split("-").map(Number);
  if (!y || !m) return currentMonthStr();
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** localStorage key — session month picker (not restored on load; always opens on current month). */
export const LS_BUSINESS_MONTH = "biz_period_month";

/** Always open on the current calendar month (ignore persisted FY / prior month). */
export function readStoredBusinessMonth() {
  return currentMonthStr();
}

export function persistBusinessMonth(v) {
  try {
    localStorage.setItem(LS_BUSINESS_MONTH, v && String(v).length >= 7 ? v : "FY");
  } catch {
    // ignore quota / private mode
  }
}

/** sessionStorage — restore tab / overlay after refresh (same tab only). */
export const SS_NAV = "mb_nav_v1";
export const VALID_SESSION_SCREENS = new Set([
  "newSale",
  "saleDetail",
  "addStock",
  "newExpense",
  "expenseDetail",
  "expenseCategory",
  "customerDetail",
  "newCustomer",
  "vendorDetail",
  "newVendor",
  "emiDetail",
  "bankAccountDetail",
  "search",
  "newPurchase",
  "purchaseDetail",
  "inventoryItemDetail",
  "newOtherIncome",
  "otherIncomeDetail",
]);

const RETIRED_SESSION_SCREENS = new Set([
  "newLoanGiven",
  "loanGivenDetail",
  "loanGivenPartners",
  "loanGivenPartnerDetail",
  "loanGivenPartys",
  "loanGivenPartyDetail",
]);

/** History `popstate` may carry old `tab` or full-screen `screen` ids from before flat nav. */
export function normalizeHistoryNav(s) {
  let page = normalizeStoredPage(s?.page ?? s?.tab);
  let scr = typeof s?.screen === "string" ? s.screen : null;
  if (scr && LEGACY_SCREEN_TO_PAGE[scr]) {
    page = LEGACY_SCREEN_TO_PAGE[scr];
    scr = null;
  }
  if (scr && RETIRED_SESSION_SCREENS.has(scr)) scr = null;
  if (!scr || !VALID_SESSION_SCREENS.has(scr)) scr = null;
  return { page, screen: scr };
}

export function readStoredSessionNav() {
  try {
    const raw = sessionStorage.getItem(SS_NAV);
    if (!raw) {
      return {
        page: "dashboard",
        screen: null,
        selSaleId: null,
        selExpenseId: null,
        selExpenseCategory: null,
        selCustomerName: "",
        selVendorName: "",
        selEmiId: null,
        selBankAccountId: null,
        selPurchaseId: null,
        selOtherIncomeId: null,
        selLoanGivenId: null,
      };
    }
    const o = JSON.parse(raw);
    const { page: p, screen: scr } = normalizeHistoryNav(o);
    let page = p;
    let screen = scr;
    if (!NAV_PAGE_IDS.has(page)) page = "dashboard";
    return {
      page,
      screen,
      selSaleId: o.selSaleId != null ? String(o.selSaleId) : null,
      selExpenseId: o.selExpenseId != null ? String(o.selExpenseId) : null,
      selExpenseCategory: typeof o.selExpenseCategory === "string" && o.selExpenseCategory.trim() ? String(o.selExpenseCategory).trim() : null,
      selCustomerName: typeof o.selCustomerName === "string" ? o.selCustomerName : "",
      selVendorName: typeof o.selVendorName === "string" ? o.selVendorName : "",
      selEmiId: o.selEmiId != null ? String(o.selEmiId) : null,
      selBankAccountId: o.selBankAccountId != null ? String(o.selBankAccountId) : null,
      selPurchaseId: o.selPurchaseId != null ? String(o.selPurchaseId) : null,
      selOtherIncomeId: o.selOtherIncomeId != null ? String(o.selOtherIncomeId) : null,
      selLoanGivenId: o.selLoanGivenId != null ? String(o.selLoanGivenId) : null,
    };
  } catch (err) {
    try {
      const msg = err && typeof err === "object" && "message" in err ? String(err.message) : String(err);
      console.warn("[readStoredSessionNav] parse failed; resetting to dashboard:", msg);
      if (typeof window !== "undefined" && typeof CustomEvent === "function") {
        window.dispatchEvent(
          new CustomEvent("mybusiness:session-nav-reset", {
            detail: { message: msg.slice(0, 200) },
          }),
        );
      }
    } catch {
      /* logging must never throw */
    }
    return {
      page: "dashboard",
      screen: null,
      selSaleId: null,
      selExpenseId: null,
      selExpenseCategory: null,
      selCustomerName: "",
      selVendorName: "",
      selEmiId: null,
      selBankAccountId: null,
      selPurchaseId: null,
      selOtherIncomeId: null,
      selLoanGivenId: null,
    };
  }
}

export function writeStoredSessionNav(payload) {
  try {
    sessionStorage.setItem(SS_NAV, JSON.stringify(payload));
  } catch {
    // ignore
  }
}

export function clearStoredSessionNav() {
  try {
    sessionStorage.removeItem(SS_NAV);
  } catch {
    // ignore
  }
}

/** 12 month keys for financial year starting month `fsm` and year `fyYear` */
export function fyMonthSequence(fsm, fyYear) {
  const keys = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(fyYear, fsm - 1 + i, 1);
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return keys;
}

export function aggregateSalesExpensesByMonth(sales, expenses, otherIncomes) {
  const map = new Map();
  for (const s of (Array.isArray(sales) ? sales : [])) {
    if (!s || typeof s !== "object") continue;
    const mk = monthKeyFromRecord(s.date);
    if (!mk) continue;
    const o = map.get(mk) || { revenue: 0, cogs: 0, expenses: 0, otherIncome: 0 };
    o.revenue += num(s.totalSale);
    o.cogs += num(s.totalCost);
    map.set(mk, o);
  }
  for (const e of (Array.isArray(expenses) ? expenses : [])) {
    if (!e || typeof e !== "object") continue;
    const mk = monthKeyFromRecord(e.date);
    if (!mk) continue;
    const o = map.get(mk) || { revenue: 0, cogs: 0, expenses: 0, otherIncome: 0 };
    o.expenses += num(e.amount);
    map.set(mk, o);
  }
  for (const oi of Array.isArray(otherIncomes) ? otherIncomes : []) {
    if (!oi || typeof oi !== "object") continue;
    const mk = monthKeyFromRecord(oi.date);
    if (!mk) continue;
    const o = map.get(mk) || { revenue: 0, cogs: 0, expenses: 0, otherIncome: 0 };
    o.otherIncome += num(oi.amount);
    map.set(mk, o);
  }
  return map;
}

/** Monthly net profit = revenue − COGS − expenses + other income; cumulative running sum within the selected range */
export function buildMonthlyCapitalSeries(sales, expenses, otherIncomes, mode, fsm, fyYear, monthKey) {
  const map = aggregateSalesExpensesByMonth(sales, expenses, otherIncomes);
  let months;
  if (mode === "fy") {
    months = fyMonthSequence(fsm, fyYear);
  } else if (mode === "month") {
    const mk = String(monthKey || "").slice(0, 7);
    months = mk.length >= 7 ? [mk] : [];
  } else {
    months = [...map.keys()].sort();
    if (months.length === 0) return [];
  }
  let cum = 0;
  return months.map((month) => {
    const o = map.get(month) || { revenue: 0, cogs: 0, expenses: 0, otherIncome: 0 };
    const netProfit = o.revenue - o.cogs - o.expenses + o.otherIncome;
    cum += netProfit;
    return {
      month,
      monthLabel: formatMonthLabel(month),
      revenue: o.revenue,
      cogs: o.cogs,
      expenses: o.expenses,
      otherIncome: o.otherIncome,
      netProfit,
      cumulative: cum,
    };
  });
}

/** Whether YYYY-MM-DD falls in FY defined by start month and FY label year */
export function isDateInFy(dateStr, fsm, fyYear) {
  const t = String(dateStr || "").slice(0, 10);
  if (t.length < 10) return false;
  const d = new Date(`${t}T00:00:00`);
  if (isNaN(d.getTime())) return false;
  const sy = d.getFullYear();
  const sm2 = d.getMonth() + 1;
  return sm2 >= fsm ? sy === fyYear : sy === fyYear + 1;
}

/** Next occurrence after `iso` for recurring expense rules. */
export function advanceRecurringDate(iso, frequency) {
  if (!iso) return todayStr();
  if (frequency === "weekly") return addDaysStr(iso, 7);
  if (frequency === "quarterly") return addMonthsStr(iso, 3);
  if (frequency === "yearly") return addMonthsStr(iso, 12);
  return addMonthsStr(iso, 1);
}

export function normRecurringList(raw) {
  if (!Array.isArray(raw)) return [];
  const freqs = new Set(["weekly", "monthly", "quarterly", "yearly"]);
  return raw.map((r) => ({
    id: String(r?.id || makeId()),
    amount: num(r?.amount),
    category: String(r?.category || "Other"),
    description: String(r?.description || ""),
    note: String(r?.note || ""),
    frequency: freqs.has(r?.frequency) ? r.frequency : "monthly",
    nextDueDate: String(r?.nextDueDate || "").slice(0, 10) || todayStr(),
    active: r?.active !== false,
    bankAccountId: String(r?.bankAccountId || "").trim(),
  }));
}

/** Append posted expenses for any recurring rule whose next due date is on or before today. Idempotent per (rule id, date). */
export function processRecurringExpenses(state) {
  const today = todayStr();
  const rec = state.recurringExpenses || [];
  let expenses = Array.isArray(state.expenses) ? state.expenses : [];
  let changed = false;
  const newRec = rec.map((r) => {
    if (r.active === false) return r;
    let next = r.nextDueDate;
    const startNext = next;
    const toAdd = [];
    let guard = 0;
    const existsOn = (date, pool) =>
      pool.some((e) => e.recurringFromId === r.id && e.date === date) ||
      expenses.some((e) => e.recurringFromId === r.id && e.date === date);
    while (next && next <= today && guard < 120) {
      guard++;
      if (existsOn(next, toAdd)) {
        next = advanceRecurringDate(next, r.frequency);
        continue;
      }
      toAdd.push({
        id: makeId(),
        date: next,
        amount: r.amount,
        category: r.category,
        description: r.description,
        note: r.note ? `${r.note} · recurring` : "Recurring expense",
        recurringFromId: r.id,
        bankAccountId: String(r.bankAccountId || "").trim() || getDefaultBankAccountId(state.balance?.bankAccounts),
      });
      next = advanceRecurringDate(next, r.frequency);
    }
    if (toAdd.length) {
      expenses = [...toAdd, ...expenses];
      changed = true;
    } else if (next !== startNext) {
      changed = true;
    }
    return { ...r, nextDueDate: next };
  });
  if (!changed) return state;
  return { ...state, expenses, recurringExpenses: newRec };
}

export function makeId() {
  const t = Date.now();
  let suf = "";
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    suf = crypto.randomUUID();
  } else {
    suf = `${Math.random().toString(36).slice(2, 12)}${Math.random().toString(36).slice(2, 12)}`;
  }
  return `${t}_${suf}`;
}

/** `Date.now()` prefix from ids from {@link makeId} — for stable newest-first order when calendar dates tie. */
export function entityTimeMsFromId(id) {
  const s = String(id ?? "");
  const i = s.indexOf("_");
  if (i <= 0) return 0;
  const n = Number(s.slice(0, i));
  return Number.isFinite(n) ? n : 0;
}

export function sumAccounts(arr) {
  if (!Array.isArray(arr)) return 0;
  return arr.reduce((s,a) => s + num(a?.amount), 0);
}

/** When true, account balance counts toward balance sheet / net worth bank total. */
export function bankAccountCountsInBalanceSheet(acc) {
  return !!(acc && acc.id) && acc.excludeFromBalanceSheet !== true;
}

/** When true, account balance counts toward Banking tab "Total liquid". */
export function bankAccountCountsInLiquidTotal(acc) {
  return !!(acc && acc.id) && acc.excludeFromLiquid !== true;
}

/** Sum stored book balances (`amount`) for accounts matching predicate. */
export function sumBankAccountBalances(accounts, predicate = () => true) {
  const arr = Array.isArray(accounts) ? accounts : [];
  return roundMoney2(arr.filter((a) => a && a.id && predicate(a)).reduce((s, a) => s + num(a.amount), 0));
}

/** Banking tab / dashboard “Total liquid” — sum of book balances for non-excluded accounts. */
export function computeTotalLiquid({
  bankAccounts = [],
  transfers = [],
  expenses = [],
  sales = [],
  inventoryEntries = [],
  otherIncomes = [],
  purchases = [],
  loansGiven = [],
  customerAdvancePayments = [],
} = {}) {
  const accounts = Array.isArray(bankAccounts) ? bankAccounts : [];
  return roundMoney2(
    accounts
      .filter(bankAccountCountsInLiquidTotal)
      .reduce(
        (sum, acc) =>
          sum +
          computeBankAccountBookBalance(
            acc,
            expenses,
            sales,
            transfers,
            inventoryEntries,
            otherIncomes,
            purchases,
            loansGiven,
            null,
            customerAdvancePayments,
          ),
        0,
      ),
  );
}

export function detectFyYear(sm=4) {
  const n = new Date(); const m = n.getMonth()+1;
  return m >= sm ? n.getFullYear() : n.getFullYear()-1;
}
export function getFyYears() {
  const base = detectFyYear(4);
  return Array.from({length:6},(_,i) => base-2+i);
}
export function fyLabel(year) { return `${year}-${String(year+1).slice(-2)}`; }

export function sanitizePrefix(p) {
  return String(p??"").trim().toUpperCase().replace(/[^A-Z0-9_-]/g,"").slice(0,20)||"MB";
}

/** Extract numeric sequence from invoice no for a given prefix (supports legacy formats). */
export function invoiceSequenceForPrefix(invoiceNo, prefixRaw) {
  const prefix = sanitizePrefix(prefixRaw);
  const escaped = prefix.replace(/[-_]/g,"\\$&");
  const reNew = new RegExp(`^${escaped}-(\\d+)$`);
  const reOldYm = new RegExp(`^${escaped}-(\\d{6})-(\\d+)$`);
  const reOldMid = new RegExp(`^${escaped}-\\d{4}-\\d{6}-(\\d+)$`);
  const inv = String(invoiceNo || "");
  let m = inv.match(reNew);
  if (m) return parseInt(m[1], 10) || 0;
  m = inv.match(reOldYm);
  if (m) return parseInt(m[2], 10) || 0;
  m = inv.match(reOldMid);
  if (m) return parseInt(m[1], 10) || 0;
  return 0;
}

/** Next invoice: PREFIX-0001, PREFIX-0002, … Also scans legacy formats so sequence does not repeat. */
export function genInvoiceNo(sales, prefixRaw, nextSeqRaw) {
  const prefix = sanitizePrefix(prefixRaw);
  let maxSeq = 0;
  for (const s of (Array.isArray(sales) ? sales : [])) {
    if (!s || typeof s !== "object") continue;
    maxSeq = Math.max(maxSeq, invoiceSequenceForPrefix(s.invoiceNo, prefix));
  }
  const configuredNext = Math.max(1, num(nextSeqRaw) || 1);
  const nextSeq = Math.max(maxSeq + 1, configuredNext);
  return `${prefix}-${String(nextSeq).padStart(4, "0")}`;
}

/** Prefix for invoice vs bill-of-supply / credit / debit document types. */
export function saleDocPrefix(settings, docType) {
  const s = settings || {};
  const d = String(docType || "invoice");
  if (d === "billOfSupply") return sanitizePrefix(s.billOfSupplyPrefix ?? "BOS");
  if (d === "creditNote") return sanitizePrefix(s.creditNotePrefix ?? "CN");
  if (d === "debitNote") return sanitizePrefix(s.debitNotePrefix ?? "DN");
  return sanitizePrefix(s.invoicePrefix ?? "MB");
}

function normalizeSaleDocType(raw) {
  const d = String(raw || "").trim();
  if (d === "billOfSupply") return "billOfSupply";
  if (d === "creditNote") return "creditNote";
  if (d === "debitNote") return "debitNote";
  return "invoice";
}

/** Newest invoice number first (sequence desc, then date/id). */
export function compareSalesByInvoiceNo(a, b, settings) {
  const docA = normalizeSaleDocType(a?.docType);
  const docB = normalizeSaleDocType(b?.docType);
  const seqA = invoiceSequenceForPrefix(a?.invoiceNo, saleDocPrefix(settings, docA));
  const seqB = invoiceSequenceForPrefix(b?.invoiceNo, saleDocPrefix(settings, docB));
  if (seqA !== seqB) return seqB - seqA;
  return compareRecordsByRecency(a, b);
}

export function isOverdue(dueDateStr) {
  if (!dueDateStr) return false;
  return Date.now() > new Date(dueDateStr + "T23:59:59").getTime();
}

/** Days from today: negative = past, 0 = today, positive = future. */
export function daysDiffFromToday(dateStr) {
  if (!dateStr) return null;
  const d0 = String(dateStr).slice(0, 10);
  const t0 = new Date(todayStr() + "T00:00:00");
  const t1 = new Date(d0 + "T00:00:00");
  if (isNaN(t1.getTime())) return null;
  return Math.round((t1 - t0) / 86400000);
}

/** Days before due date when the app sends the one EMI reminder (bell + optional OS push). */
export const EMI_REMINDER_DAYS_BEFORE = 3;

/**
 * EMI reminder bucket from day-diff.
 * Product rule: exactly one pre-due reminder at {@link EMI_REMINDER_DAYS_BEFORE} days.
 */
export function classifyEmiReminderDiff(diff) {
  if (diff == null || !Number.isFinite(diff)) return null;
  if (diff === EMI_REMINDER_DAYS_BEFORE) return "three-days";
  return null;
}

/** WhatsApp body for an EMI installment (3-day reminder, overdue follow-up, or manual share). */
export function buildEmiWhatsAppReminderMessage(emi, dueDateStr, { businessName } = {}) {
  const due = String(dueDateStr || "").slice(0, 10);
  const name = String(emi?.customerName || "").trim() || "Customer";
  const biz = String(businessName || "").trim();
  const dueLabel = due ? dateSlash(due) : "—";
  const diff = daysDiffFromToday(due);
  const head = biz ? `Friendly reminder from ${biz}:` : "Friendly payment reminder:";
  const lines = [
    `Hi ${name},`,
    head,
    "",
    `Invoice: ${emi?.invoiceNo || "—"}`,
    `Finance company: ${emi?.financeCompany || "—"}`,
    ...(emi?.doNo?.trim() ? [`DO No.: ${emi.doNo.trim()}`] : []),
    `EMI amount: ${money(emi?.emiAmount)}`,
    `Due date: ${dueLabel}`,
  ];
  if (diff != null && diff < 0) {
    lines.splice(3, 0, "", `Your EMI installment was due on ${dueLabel} and is now overdue.`, "");
  } else if (diff === EMI_REMINDER_DAYS_BEFORE) {
    lines.splice(
      3,
      0,
      "",
      `Your EMI installment is due in ${EMI_REMINDER_DAYS_BEFORE} days (${dueLabel}).`,
      "Please keep funds ready.",
      "",
    );
  } else {
    lines.splice(3, 0, "", `Upcoming EMI installment due on ${dueLabel}.`, "");
  }
  lines.push("", "Please share your payment update when done. Thank you.");
  return lines.join("\n");
}

/** WhatsApp body when sharing an invoice or bill of supply from sale detail. */
export function buildSaleShareWhatsAppMessage(sale, { businessName } = {}) {
  const isBos = sale?.docType === "billOfSupply";
  const docLabel = isBos ? "Bill of Supply" : "Invoice";
  const name = String(sale?.customerName || "").trim() || "Customer";
  const biz = String(businessName || "").trim();
  const lines = [
    `Hi ${name},`,
    biz ? `Thank you for your purchase from ${biz}!` : "Thank you for your purchase!",
    "",
    `${docLabel}: ${sale?.invoiceNo || "—"}`,
    `Amount due: ${moneyFull(sale?.outstanding)}`,
  ];
  return appendWhatsAppReviewRequest(lines.join("\n"));
}

/**
 * Bell/OS alerts for one EMI entry — one notification per unpaid due date, only at T-3 days.
 * @returns {Array<object>}
 */
export function buildEmiAlertsForEntry(emi, { businessName, customerPhone, customerPhone2 } = {}) {
  if (!emi || typeof emi !== "object") return [];
  const dates = Array.isArray(emi.dueDates) ? emi.dueDates : [];
  const phone = String(
    emi.customerNo1 || emi.customerNo2 || customerPhone || customerPhone2 || "",
  ).trim();
  const seen = new Set();
  const out = [];
  for (const dt of dates) {
    if (!dt) continue;
    const dStr = String(dt).slice(0, 10);
    if (isEmiDuePaid(emi, dStr)) continue;
    const ukey = `${emi.id}-${dStr}`;
    if (seen.has(ukey)) continue;
    seen.add(ukey);
    const diff = daysDiffFromToday(dStr);
    if (classifyEmiReminderDiff(diff) !== "three-days") continue;
    const waText = buildEmiWhatsAppReminderMessage(emi, dStr, { businessName });
    out.push({
      id: `emi-3d-${emi.id}-${dStr}`,
      kind: "emi-due-3d",
      pri: -280000,
      title: `EMI due in ${EMI_REMINDER_DAYS_BEFORE} days`,
      sub: `${emi.customerName || "Customer"} · ${emi.invoiceNo || "—"}`,
      meta: `${emi.financeCompany || "Finance"} · ${dateSlash(dStr)} · ${money(emi.emiAmount)}`,
      invoiceNo: emi.invoiceNo,
      emiId: emi.id,
      dueDate: dStr,
      waPhone: phone,
      waHref: waMessageHref(phone, waText),
    });
  }
  return out;
}

export function saleStatus(sale, defaultDueDays = 30) {
  if (sale.outstanding <= 0) return {text:"PAID",cls:"s-paid"};
  const dd = resolveSaleDueDate(sale, defaultDueDays);
  if (isOverdue(dd)) {
    const days = Math.floor((Date.now() - new Date(dd+"T00:00:00").getTime())/86400000);
    return {text:`OVERDUE ${days}d`,cls:"s-overdue"};
  }
  if (sale.received > 0) return {text:"PARTIAL",cls:"s-partial"};
  return {text:"UNPAID",cls:"s-unpaid"};
}

/** Resolve due date with settings fallback (used by receivables/aging views). */
export function resolveSaleDueDate(sale, defaultDueDays = 30) {
  const explicit = String(sale?.dueDate || "").slice(0, 10);
  if (explicit) return explicit;
  const base = String(sale?.date || "").slice(0, 10) || todayStr();
  return addDaysStr(base, Math.max(1, num(defaultDueDays) || 30));
}

/** Resolve purchase due date with settings fallback (used by payables/aging views). */
export function resolvePurchaseDueDate(purchase, defaultDueDays = 30) {
  const explicit = String(purchase?.dueDate || "").slice(0, 10);
  if (explicit) return explicit;
  const base = String(purchase?.date || "").slice(0, 10) || todayStr();
  return addDaysStr(base, Math.max(1, num(defaultDueDays) || 30));
}

export const CUSTOMER_REVIEWS_URL = "https://www.biswajitpowerhub.in/reviews";

/** Append a review request footer to customer-facing WhatsApp messages. */
export function appendWhatsAppReviewRequest(message) {
  const base = String(message ?? "").trimEnd();
  const footer = [
    "",
    "We'd love your feedback! Please leave us a review:",
    CUSTOMER_REVIEWS_URL,
  ].join("\n");
  return base ? `${base}${footer}` : footer.trimStart();
}

export function digitsOnly(s)  { return String(s||"").replace(/\D/g,""); }
export function waHref(phone)  { let d=digitsOnly(phone); if(d.length===10) d=`91${d}`; return d?`https://wa.me/${d}`:null; }

/** WhatsApp link with optional pre-filled message (encoded once). */
export function waMessageHref(phone, message) {
  const base = waHref(phone);
  if (!base) return null;
  const t = message != null ? String(message) : "";
  if (!t.trim()) return base;
  return `${base}?text=${encodeURIComponent(t)}`;
}

function pickerDedupKeyFromSale(s) {
  const displayName = (s?.customerName || "").trim();
  return `np:${displayName.toLowerCase()}|${digitsOnly(s?.customerNo1)}|${digitsOnly(s?.customerNo2)}`;
}

function pickerDedupKeyFromDir(d) {
  const displayName = (d?.name || "").trim();
  return `np:${displayName.toLowerCase()}|${digitsOnly(d?.customerNo1)}|${digitsOnly(d?.customerNo2)}`;
}

/** One row per distinct customer (name + phones) from invoices, newest sale wins; then directory-only. Sorted by name. */
export function buildExistingCustomerPickerRows(sales, directoryRecords) {
  const list = Array.isArray(sales) ? sales : [];
  const seen = new Set();
  const rows = [];
  const byDate = [...list]
    .filter((s) => s && (s.customerName || "").trim())
    .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
  for (const s of byDate) {
    const displayName = (s.customerName || "").trim();
    const key = pickerDedupKeyFromSale(s);
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push({
      id: key,
      displayName,
      customerNo1: s.customerNo1 || "",
      customerNo2: s.customerNo2 || "",
      email: "",
      customerAddress: String(s.customerAddress || "").trim(),
      customerCity: String(s.customerCity || "").trim(),
      customerState: String(s.customerState || "").trim(),
      customerPincode: String(s.customerPincode || "").trim(),
    });
  }
  const dir = Array.isArray(directoryRecords) ? directoryRecords : [];
  for (const d of dir) {
    const displayName = (d.name || "").trim();
    if (!displayName) continue;
    const key = pickerDedupKeyFromDir(d);
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push({
      id: key,
      displayName,
      customerNo1: d.customerNo1 || "",
      customerNo2: d.customerNo2 || "",
      email: String(d.email || "").trim(),
      customerAddress: String(d.customerAddress || "").trim(),
      customerCity: String(d.customerCity || "").trim(),
      customerState: String(d.customerState || "").trim(),
      customerPincode: String(d.customerPincode || "").trim(),
    });
  }
  rows.sort((a, b) => a.displayName.localeCompare(b.displayName, undefined, { sensitivity: "base" }));
  return rows;
}

/** Filter past customers for name autocomplete (starts-with first, then contains). */
export function filterCustomerSuggestRows(rows, queryRaw) {
  const q = String(queryRaw || "").trim().toLowerCase();
  if (!q || !rows.length) return [];
  const starts = [];
  const rest = [];
  for (const r of rows) {
    const n = (r.displayName || "").toLowerCase();
    if (!n.includes(q)) continue;
    if (n.startsWith(q)) starts.push(r);
    else rest.push(r);
  }
  starts.sort((a, b) => a.displayName.localeCompare(b.displayName, undefined, { sensitivity: "base" }));
  rest.sort((a, b) => a.displayName.localeCompare(b.displayName, undefined, { sensitivity: "base" }));
  return [...starts, ...rest].slice(0, 10);
}

/** Match sale against global / sales-tab search: name, invoice #, phones, item, notes, finance ref, DO, etc. */
export function saleMatchesSearch(s, queryRaw) {
  const q = String(queryRaw || "").trim().toLowerCase();
  if (!q) return false;
  const textFields = [
    s.customerName,
    s.invoiceNo,
    s.item,
    s.description,
    s.note,
    s.customerNo1,
    s.customerNo2,
    s.customerAddress,
    s.customerCity,
    s.customerState,
    s.customerPincode,
    s.financeCompany,
    s.doNo,
  ];
  for (const f of textFields) {
    if (String(f ?? "").toLowerCase().includes(q)) return true;
  }
  const qDigits = digitsOnly(queryRaw);
  if (qDigits.length >= 2) {
    const d1 = digitsOnly(s.customerNo1);
    const d2 = digitsOnly(s.customerNo2);
    if ((d1 && d1.includes(qDigits)) || (d2 && d2.includes(qDigits))) return true;
  }
  return false;
}

/** Match purchase against global search: supplier, bill ref, notes, line items. */
export function purchaseMatchesSearch(p, queryRaw) {
  const q = String(queryRaw || "").trim().toLowerCase();
  if (!q) return false;
  const textFields = [p.supplierName, p.invoiceRef, p.notes];
  for (const f of textFields) {
    if (String(f ?? "").toLowerCase().includes(q)) return true;
  }
  const lines = Array.isArray(p.lines) ? p.lines : [];
  for (const l of lines) {
    if (String(l?.item ?? "").toLowerCase().includes(q)) return true;
  }
  return false;
}

/** Match other-income row against global search. */
export function otherIncomeMatchesSearch(oi, queryRaw) {
  const q = String(queryRaw || "").trim().toLowerCase();
  if (!q) return false;
  const textFields = [oi.description, oi.category, oi.note];
  for (const f of textFields) {
    if (String(f ?? "").toLowerCase().includes(q)) return true;
  }
  return false;
}

/** Match saved customer directory record. */
export function customerDirectoryRecordMatchesSearch(d, queryRaw) {
  const q = String(queryRaw || "").trim().toLowerCase();
  if (!q) return false;
  const textFields = [
    d.name,
    d.customerNo1,
    d.customerNo2,
    d.email,
    d.customerAddress,
    d.customerCity,
    d.customerState,
    d.customerPincode,
    d.note,
    d.customerType,
  ];
  for (const f of textFields) {
    if (String(f ?? "").toLowerCase().includes(q)) return true;
  }
  const qDigits = digitsOnly(queryRaw);
  if (qDigits.length >= 2) {
    const d1 = digitsOnly(d.customerNo1);
    const d2 = digitsOnly(d.customerNo2);
    if ((d1 && d1.includes(qDigits)) || (d2 && d2.includes(qDigits))) return true;
  }
  return false;
}

/** Match saved vendor directory record. */
export function vendorDirectoryRecordMatchesSearch(d, queryRaw) {
  const q = String(queryRaw || "").trim().toLowerCase();
  if (!q) return false;
  const textFields = [d.name, d.phone1, d.phone2, d.email, d.address, d.city, d.state, d.pincode, d.note];
  for (const f of textFields) {
    if (String(f ?? "").toLowerCase().includes(q)) return true;
  }
  const qDigits = digitsOnly(queryRaw);
  if (qDigits.length >= 2) {
    const p1 = digitsOnly(d.phone1);
    const p2 = digitsOnly(d.phone2);
    if ((p1 && p1.includes(qDigits)) || (p2 && p2.includes(qDigits))) return true;
  }
  return false;
}

/** Match EMI entry (finance) against global search. */
export function emiEntryMatchesSearch(emi, queryRaw) {
  const q = String(queryRaw || "").trim().toLowerCase();
  if (!q) return false;
  const textFields = [emi.customerName, emi.invoiceNo, emi.financeCompany, emi.doNo];
  for (const f of textFields) {
    if (String(f ?? "").toLowerCase().includes(q)) return true;
  }
  return false;
}

/** Match bank / cash account by display name. */
export function bankAccountMatchesSearch(acct, queryRaw) {
  const q = String(queryRaw || "").trim().toLowerCase();
  if (!q) return false;
  return String(acct?.name ?? "").toLowerCase().includes(q);
}

/** Non-empty lines for displaying a sale’s customer address (billing / delivery). */
export function saleAddressLines(s) {
  if (!s || typeof s !== "object") return [];
  const lines = [];
  const a = String(s.customerAddress || "").trim();
  if (a) lines.push(a);
  const city = String(s.customerCity || "").trim();
  const st = String(s.customerState || "").trim();
  const cityState = [city, st].filter(Boolean).join(", ");
  if (cityState) lines.push(cityState);
  const pin = String(s.customerPincode || "").trim();
  if (pin) lines.push(`PIN ${pin}`);
  return lines;
}

export function hasSaleAddress(s) {
  return saleAddressLines(s).length > 0;
}

/* ─── default form values ─────────────────────────────────── */

/** Product bundles: several stock SKUs sold as one invoice line (qty = number of bundles). */
export function normBundlesList(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x) => x && typeof x === "object")
    .map((x) => ({
      id: String(x.id || makeId()),
      name: String(x.name || "").trim() || "Bundle",
      lines: Array.isArray(x.lines)
        ? x.lines
            .filter((l) => l && typeof l === "object")
            .map((l) => ({
              item: String(l.item || "").trim(),
              qty: Math.max(0, num(l.qty)),
            }))
            .filter((l) => l.item && l.qty > 0)
        : [],
    }))
    .filter((b) => b.lines.length >= 2);
}

export function findBundleById(bundles, id) {
  const bid = String(id || "").trim();
  if (!bid) return null;
  return normBundlesList(bundles).find((b) => b.id === bid) || null;
}

/** Cost per one bundle from branch average costs (0 if a line has no stock history). */
export function bundleCostPerUnit(bundle, invRows) {
  if (!bundle || !Array.isArray(bundle.lines)) return 0;
  const map = new Map((invRows || []).filter((r) => r && r.item).map((r) => [r.item.toLowerCase(), r]));
  let t = 0;
  for (const line of bundle.lines) {
    const row = map.get(String(line.item || "").toLowerCase());
    t += num(line.qty) * (row ? num(row.avgCost) : 0);
  }
  return roundMoney2(t);
}

/** Whether default-branch stock can cover saleQty bundles (uses currentQty). */
export function bundleStockSufficient(bundle, invRows, saleQty) {
  if (!bundle || !Array.isArray(bundle.lines)) return false;
  const sq = num(saleQty);
  if (sq <= 0) return false;
  const map = new Map((invRows || []).filter((r) => r && r.item).map((r) => [r.item.toLowerCase(), r]));
  for (const line of bundle.lines) {
    const row = map.get(String(line.item || "").toLowerCase());
    const need = sq * num(line.qty);
    if (!row || row.currentQty < need - 1e-9) return false;
  }
  return true;
}

/** A single editable line on the sale form. Strings for inputs; we coerce on save. */
export function defSaleLineItem() {
  return {
    id: makeId(),
    item: "",
    qty: "1",
    salePrice: "",
    costPrice: "",
    hsn: "",
    gstRate: "",
    chassisNo: "",
    motorNo: "",
    batterySerialNo: "",
    /** "__custom__" | lowercase item key — UI only for stock picker when auto stock-out is on */
    itemProductPick: "__custom__",
    /** Shared id → print as one invoice row; inventory still uses each line separately. */
    invoiceGroupId: "",
    /** Optional per-line text shown on invoice PDF under the item name. */
    itemDescription: "",
  };
}

export function defSale() {
  const d = todayStr();
  return {
    docType: "invoice",
    date: d,
    invoiceNo: "",
    dueDate: "",
    customerName: "",
    customerNo1: "",
    customerNo2: "",
    customerAddress: "",
    customerCity: "",
    customerState: "",
    customerPincode: "",
    customerGstin: "",
    reverseCharge: false,
    invoiceCopyType: "original",
    /** When credit/debit note — links to original sale. */
    linkedSaleId: "",
    linkedInvoiceNo: "",
    /** Legacy single-line mirror fields; the source of truth is `lineItems[0]`. */
    item: "",
    /** Set when selling a defined bundle; invoice line uses bundle name, stock-out uses component lines. */
    bundleId: "",
    itemProductPick: "__custom__",
    description: "",
    note: "",
    qty: "1",
    salePrice: "",
    costPrice: "",
    /** Multi-line invoice items. Always has at least one row in the form. */
    lineItems: [defSaleLineItem()],
    /** Flat discount (₹) subtracted from line subtotal to get totalSale. */
    discount: "",
    /** Flat extra charge (₹) added after discount; label from settings.additionalChargesLabel. */
    additionalCharges: "",
    receivedAmount: "",
    receivedBankAccountId: "",
    /** Split payment rows: `{ id, amount, bankAccountId }[]` (form-only; persisted as paymentEntries). */
    paymentLines: [],
    financeCompany: "",
    doNo: "",
    loanAmount: "",
    downPayment: "",
    emiAmount: "",
    dueDate1: "",
  };
}

export function defCustomer() {
  return {
    name: "",
    customerNo1: "",
    customerNo2: "",
    email: "",
    customerType: "",
    customerAddress: "",
    customerCity: "",
    customerState: "",
    customerPincode: "",
    note: "",
  };
}

export function directoryRecordToCustomerEntry(d) {
  if (!d || typeof d !== "object") return defCustomer();
  return {
    name: String(d.name || "").trim(),
    customerNo1: String(d.customerNo1 || ""),
    customerNo2: String(d.customerNo2 || ""),
    email: String(d.email || "").trim(),
    customerType: String(d.customerType || "").trim(),
    customerAddress: String(d.customerAddress || ""),
    customerCity: String(d.customerCity || ""),
    customerState: String(d.customerState || ""),
    customerPincode: String(d.customerPincode || ""),
    note: String(d.note || ""),
  };
}

/** Map saved sale (+ optional EMI row) back into the new-sale form */
export function saleToEntry(sale, emi) {
  /* Rehydrate line items. Saved sales from before multi-line support only have
   * the legacy single fields, so wrap them as a single line. */
  const persistedLines = Array.isArray(sale.lineItems) ? sale.lineItems : [];
  const lineSource =
    persistedLines.length > 0
      ? persistedLines
      : [
          {
            id: makeId(),
            item: sale.item || "",
            qty: sale.qty,
            salePrice: sale.salePrice,
            costPrice: sale.costPrice,
          },
        ];
  const lineItems = lineSource.map((li) => ({
    id: String(li?.id || makeId()),
    item: String(li?.item || ""),
    qty: String(li?.qty ?? "1"),
    salePrice: li?.salePrice != null && li.salePrice !== "" ? String(li.salePrice) : "",
    costPrice: li?.costPrice != null && li.costPrice !== "" ? String(li.costPrice) : "",
    hsn: li?.hsn != null ? String(li.hsn) : "",
    gstRate: li?.gstRate != null && li.gstRate !== "" ? String(li.gstRate) : "",
    chassisNo: String(li?.chassisNo || ""),
    motorNo: String(li?.motorNo || ""),
    batterySerialNo: String(li?.batterySerialNo || ""),
    itemProductPick: String(li?.itemProductPick || "__custom__"),
    invoiceGroupId: String(li?.invoiceGroupId || ""),
    itemDescription: String(li?.itemDescription || ""),
  }));
  const first = lineItems[0];
  return {
    docType: normalizeSaleDocType(sale.docType),
    date: sale.date,
    invoiceNo: sale.invoiceNo || "",
    dueDate: sale.dueDate || "",
    customerName: sale.customerName || "",
    customerNo1: sale.customerNo1 || "",
    customerNo2: sale.customerNo2 || "",
    customerAddress: sale.customerAddress || "",
    customerCity: sale.customerCity || "",
    customerState: sale.customerState || "",
    customerPincode: sale.customerPincode || "",
    customerGstin: sale.customerGstin || "",
    reverseCharge: sale.reverseCharge === true,
    invoiceCopyType: sale.invoiceCopyType || "original",
    /* Legacy mirror fields — kept in sync with first line for back-compat. */
    item: first.item,
    itemProductPick: first.itemProductPick,
    description: sale.description || "",
    note: sale.note || "",
    qty: first.qty,
    salePrice: first.salePrice,
    costPrice: first.costPrice,
    lineItems,
    discount: sale.discount != null && sale.discount !== "" ? String(sale.discount) : "",
    additionalCharges:
      sale.additionalCharges != null && sale.additionalCharges !== ""
        ? String(sale.additionalCharges)
        : "",
    receivedAmount: String(sale.received ?? 0),
    receivedBankAccountId: (() => {
      const pe = normalizePaymentEntries(sale);
      if (!pe.length) return "";
      return String(pe[pe.length - 1].bankAccountId || "");
    })(),
    paymentLines: normalizePaymentEntries(sale).map((p) => ({
      id: p.id,
      amount: String(p.amount),
      bankAccountId: p.bankAccountId,
    })),
    financeCompany: emi?.financeCompany || "",
    doNo: emi?.doNo || "",
    loanAmount: emi != null ? String(emi.loanAmount ?? "") : "",
    downPayment: emi != null ? String(emi.downPayment ?? "") : "",
    emiAmount: emi != null ? String(emi.emiAmount ?? "") : "",
    dueDate1: emi?.dueDates?.[0] || "",
    bundleId: String(sale.bundleId || "").trim(),
    linkedSaleId: String(sale.linkedSaleId || "").trim(),
    linkedInvoiceNo: String(sale.linkedInvoiceNo || "").trim(),
  };
}

export function defPurchase() {
  const d = todayStr();
  return {
    date: d,
    dueDate: addDaysStr(d, 30),
    supplierName: "",
    invoiceRef: "",
    branchId: "",
    notes: "",
    lines: [{ item: "", qty: "1", costPerUnit: "" }],
    paidAmount: "",
    bankAccountId: "",
  };
}

/** Suggested product categories for stock (user can type any label). */
export const DEFAULT_STOCK_PRODUCT_CATEGORIES = ["Scooty", "Lithium battery", "Graphene battery"];

export function defStock() {
  return {
    date: todayStr(),
    item: "",
    productPick: "__new__",
    type: "in",
    qty: "",
    costPerUnit: "",
    salesPrice: "",
    category: "",
    note: "",
    bankAccountId: "",
    branchId: "",
  };
}

/** Load a saved inventory row into the add-stock form (for edit). */
export function inventoryEntryToStockForm(inv) {
  if (!inv || typeof inv !== "object") return defStock();
  const item = String(inv.item || "").trim();
  const type = inv.type === "out" ? "out" : inv.type === "opening" ? "opening" : "in";
  const q = inv.qty;
  return {
    date: String(inv.date || todayStr()).slice(0, 10),
    item,
    productPick: item ? item.toLowerCase() : "__new__",
    type,
    qty: q != null && q !== "" ? String(q) : "",
    costPerUnit: inv.costPerUnit != null && inv.costPerUnit !== "" ? String(inv.costPerUnit) : "",
    salesPrice: inv.salesPrice != null && inv.salesPrice !== "" ? String(inv.salesPrice) : "",
    category: String(inv.category || "").trim(),
    note: String(inv.note || ""),
    bankAccountId: String(inv.bankAccountId || "").trim(),
    branchId: String(inv.branchId || "").trim(),
  };
}
export function defExpense() {
  return {
    date: todayStr(),
    amount: "",
    category: "Other",
    description: "",
    note: "",
    bankAccountId: "",
    recurring: false,
    frequency: "monthly",
  };
}

export function expenseToEntry(exp) {
  if (!exp || typeof exp !== "object") return defExpense();
  return {
    date: String(exp.date || todayStr()).slice(0, 10),
    amount: exp.amount != null && exp.amount !== "" ? String(exp.amount) : "",
    category: String(exp.category || "Other"),
    description: String(exp.description || ""),
    note: String(exp.note || ""),
    bankAccountId: String(exp.bankAccountId || "").trim(),
    recurring: false,
    frequency: "monthly",
  };
}

export function defOtherIncome() {
  return {
    date: todayStr(),
    amount: "",
    category: "Other",
    description: "",
    note: "",
    bankAccountId: "",
  };
}

export function otherIncomeToEntry(row) {
  if (!row || typeof row !== "object") return defOtherIncome();
  return {
    date: String(row.date || todayStr()).slice(0, 10),
    amount: row.amount != null && row.amount !== "" ? String(row.amount) : "",
    category: String(row.category || "Other"),
    description: String(row.description || ""),
    note: String(row.note || ""),
    bankAccountId: String(row.bankAccountId || "").trim(),
  };
}

/* ─── state ───────────────────────────────────────────────── */

/** Default bank/cash account for new expenses and payments (prefers name containing "cash"). */
export function getDefaultBankAccountId(bankAccounts) {
  const arr = Array.isArray(bankAccounts) ? bankAccounts.filter((a) => a && a.id) : [];
  if (!arr.length) return "";
  const cash = arr.find((a) => a.kind === "cash" || /cash/i.test(String(a.name || "")));
  return String((cash || arr[0]).id);
}

export const BANK_ACCOUNT_KINDS = new Set(["cash", "bank", "card"]);

export function inferBankAccountKindFromName(name) {
  const n = String(name || "").toLowerCase();
  if (/cash|hand|petty/.test(n)) return "cash";
  if (/card|credit|visa|master|amex|rupay/.test(n)) return "card";
  return "bank";
}

export function normalizeBankAccountKind(name, raw) {
  const k = String(raw || "").trim();
  if (BANK_ACCOUNT_KINDS.has(k)) return k;
  return inferBankAccountKindFromName(name);
}

export function bankAccountLabel(accounts, id) {
  const key = String(id || "").trim();
  if (key === BANK_EXTERNAL_SOURCE_ID) return "External cash";
  if (key === BANK_EXTERNAL_SINK_ID) return "External cash";
  const a = (accounts || []).find((x) => x && String(x.id) === String(id));
  return (a?.name || "").trim() || "Account";
}

/** Virtual transfer counterparties for direct deposit / withdrawal entries. */
export const BANK_EXTERNAL_SOURCE_ID = "__bank_external_source__";
export const BANK_EXTERNAL_SINK_ID = "__bank_external_sink__";

export function normBankTransfers(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x) => x && typeof x === "object")
    .map((x) => {
      const fromAccountId = String(x.fromAccountId || "").trim();
      const toAccountId = String(x.toAccountId || "").trim();
      const kindRaw = String(x.kind || "").trim();
      let kind = kindRaw;
      if (!kind) {
        if (fromAccountId === BANK_EXTERNAL_SOURCE_ID && toAccountId && toAccountId !== BANK_EXTERNAL_SINK_ID) {
          kind = "deposit";
        } else if (toAccountId === BANK_EXTERNAL_SINK_ID && fromAccountId && fromAccountId !== BANK_EXTERNAL_SOURCE_ID) {
          kind = "withdraw";
        } else {
          kind = "transfer";
        }
      }
      return {
        id: String(x.id || makeId()),
        date: String(x.date || todayStr()).slice(0, 10),
        fromAccountId,
        toAccountId,
        amount: num(x.amount),
        note: String(x.note ?? "").trim(),
        kind,
      };
    })
    .filter((x) => x.amount > 0 && x.fromAccountId && x.toAccountId && x.fromAccountId !== x.toAccountId);
}

export function normalizePaymentEntries(sale) {
  const raw = sale?.paymentEntries;
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((p) => p && typeof p === "object")
    .map((p) => ({
      id: String(p.id || makeId()),
      date: String(p.date || sale?.date || todayStr()).slice(0, 10),
      amount: num(p.amount),
      bankAccountId: String(p.bankAccountId || "").trim(),
      ...(String(p.sourceAdvanceId || "").trim() ? { sourceAdvanceId: String(p.sourceAdvanceId).trim() } : {}),
    }))
    .filter((p) => p.amount > 0 && p.bankAccountId);
}

/** All positive payment lines for receivable/outstanding (includes non-bank cash). */
export function normalizeReceivablePaymentEntries(sale) {
  const raw = sale?.paymentEntries;
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((p) => p && typeof p === "object")
    .map((p) => ({
      id: String(p.id || makeId()),
      date: String(p.date || sale?.date || todayStr()).slice(0, 10),
      amount: num(p.amount),
    }))
    .filter((p) => p.amount > 0);
}

/** One row in the new-sale payment split editor. */
export function defSalePaymentLine(defaultBankId = "") {
  return { id: makeId(), amount: "", bankAccountId: String(defaultBankId || "") };
}

/** Rehydrate payment split rows from form state or legacy single received fields. */
export function hydrateSalePaymentLines(entry, bankAccounts = []) {
  const banks = (Array.isArray(bankAccounts) ? bankAccounts : []).filter((b) => b && b.id);
  const defaultBid = getDefaultBankAccountId(banks) || "";
  const raw = Array.isArray(entry?.paymentLines) ? entry.paymentLines : [];
  if (raw.length > 0) {
    return raw.map((l) => ({
      id: String(l?.id || makeId()),
      amount: l?.amount != null && l.amount !== "" ? String(l.amount) : "",
      bankAccountId: banks.some((b) => String(b.id) === String(l?.bankAccountId || ""))
        ? String(l.bankAccountId)
        : defaultBid,
    }));
  }
  const recvRaw = entry?.receivedAmount;
  const recvStr = recvRaw != null && String(recvRaw).trim() !== "" ? String(recvRaw) : "";
  if (recvStr && num(recvStr) > 0) {
    const bid = banks.some((b) => String(b.id) === String(entry?.receivedBankAccountId || ""))
      ? String(entry.receivedBankAccountId)
      : defaultBid;
    return [{ id: makeId(), amount: recvStr, bankAccountId: bid }];
  }
  return [defSalePaymentLine(defaultBid)];
}

/**
 * Build normalized sale payment entries from the new-sale form.
 * Returns `{ entries, received }` or `{ error: "bank" | "exceeds" }`.
 */
export function buildSalePaymentEntriesFromForm(saleEntry, invoiceDate, bankAccounts = [], totalSale = Infinity) {
  const banks = (Array.isArray(bankAccounts) ? bankAccounts : []).filter((b) => b && b.id);
  const defaultBid = getDefaultBankAccountId(banks);
  const dated = String(invoiceDate || saleEntry?.date || todayStr()).slice(0, 10);
  const lines = hydrateSalePaymentLines(saleEntry, banks).filter((l) => num(l.amount) > 0.001);
  if (lines.length === 0) return { entries: [], received: 0 };

  const entries = normalizePaymentEntries({
    date: dated,
    paymentEntries: lines.map((l) => {
      const bid = banks.some((b) => String(b.id) === String(l.bankAccountId))
        ? String(l.bankAccountId)
        : defaultBid || "";
      return { id: String(l.id || makeId()), date: dated, amount: num(l.amount), bankAccountId: bid };
    }),
  });
  const received = roundMoney2(entries.reduce((s, p) => s + num(p.amount), 0));
  if (received > num(totalSale) + 0.02) return { error: "exceeds" };
  if (received > 0 && banks.length > 0 && entries.some((e) => !e.bankAccountId)) return { error: "bank" };
  return { entries, received: Math.min(received, num(totalSale)) };
}

export function normalizePurchasePaymentEntries(purchase) {
  const raw = purchase?.paymentEntries;
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((p) => p && typeof p === "object")
    .map((p) => ({
      id: String(p.id || makeId()),
      date: String(p.date || purchase?.date || todayStr()).slice(0, 10),
      amount: num(p.amount),
      bankAccountId: String(p.bankAccountId || "").trim(),
    }))
    .filter((p) => p.amount > 0 && p.bankAccountId);
}

/** Map a saved purchase into the new/edit purchase form. When editing, payments are kept; adjust via Record payment on the purchase. */
export function purchaseToEntry(p) {
  if (!p || typeof p !== "object") return defPurchase();
  const received = num(p.received);
  const pes = normalizePurchasePaymentEntries(p);
  let bankAccountId = "";
  if (pes.length > 0) {
    bankAccountId = String(pes[pes.length - 1].bankAccountId || "").trim();
  }
  const linesRaw = Array.isArray(p.lines) ? p.lines : [];
  const lines =
    linesRaw.length > 0
      ? linesRaw.map((l) => ({
          item: String(l.item || "").trim(),
          qty: l.qty != null && l.qty !== "" ? String(l.qty) : "1",
          costPerUnit: l.costPerUnit != null && l.costPerUnit !== "" ? String(l.costPerUnit) : "",
        }))
      : [{ item: "", qty: "1", costPerUnit: "" }];
  return {
    date: String(p.date || todayStr()).slice(0, 10),
    dueDate: String(p.dueDate || addDaysStr(String(p.date || todayStr()).slice(0, 10), 30)).slice(0, 10),
    supplierName: String(p.supplierName || ""),
    invoiceRef: String(p.invoiceRef || ""),
    branchId: String(p.branchId || "").trim(),
    lines,
    paidAmount: received > 0 ? String(received) : "",
    bankAccountId,
    notes: String(p.notes || ""),
  };
}

function normPurchaseLines(raw) {
  if (!Array.isArray(raw) || !raw.length) return [];
  return raw
    .filter((l) => l && typeof l === "object")
    .map((l) => ({
      item: String(l.item || "").trim(),
      qty: num(l.qty),
      costPerUnit: num(l.costPerUnit),
    }))
    .filter((l) => l.item && l.qty > 0);
}

/** Sum of credit still owed on normalized purchases (supplier payables from purchases). */
export function sumPurchaseCreditOutstanding(purchases) {
  let s = 0;
  for (const p of purchases || []) {
    if (!p || typeof p !== "object") continue;
    s += num(p.outstanding);
  }
  return roundMoney2(s);
}

export function normPurchasesList(raw, bankAccountsForDefault = null) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x) => x && typeof x === "object")
    .map((x) => {
      const lines = normPurchaseLines(x.lines);
      const lineTotal = lines.reduce((a, l) => a + l.qty * l.costPerUnit, 0);
      const totalAmount = roundMoney2(lineTotal);
      const dated = String(x.date || todayStr()).slice(0, 10);
      let paymentEntries = normalizePurchasePaymentEntries({ ...x, date: dated });
      if (paymentEntries.length === 0) {
        const legacyReceived = roundMoney2(num(x.received));
        if (legacyReceived > 0) {
          const bid =
            String(x.receivedBankAccountId || x.bankAccountId || "").trim() ||
            getDefaultBankAccountId(bankAccountsForDefault || []);
          if (bid) {
            paymentEntries = normalizePurchasePaymentEntries({
              date: dated,
              paymentEntries: [
                {
                  id: makeId(),
                  date: dated,
                  amount: legacyReceived,
                  bankAccountId: bid,
                },
              ],
            });
          }
        }
      }
      const paidFromBank = roundMoney2(paymentEntries.reduce((a, p) => a + num(p.amount), 0));
      const received = roundMoney2(Math.min(totalAmount, paidFromBank));
      const outstanding = roundMoney2(Math.max(0, totalAmount - paidFromBank));
      return {
        ...x,
        id: String(x.id || makeId()),
        date: dated,
        dueDate: String(x.dueDate || addDaysStr(dated, 30)).slice(0, 10),
        branchId: String(x.branchId || "").trim(),
        supplierName: String(x.supplierName || "").trim(),
        invoiceRef: String(x.invoiceRef || "").trim(),
        lines,
        totalAmount: roundMoney2(totalAmount),
        paymentEntries,
        received,
        outstanding,
        notes: String(x.notes || "").trim(),
      };
    })
    .filter((x) => x.lines.length > 0);
}

function receiptSequenceForPrefix(receiptNo, prefix) {
  const p = sanitizePrefix(prefix);
  const s = String(receiptNo || "").trim();
  const m = s.match(new RegExp(`^${p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}-(\\d+)$`, "i"));
  if (m) return parseInt(m[1], 10) || 0;
  return 0;
}

/** Next payment receipt number: PREFIX-0001, PREFIX-0002, … */
export function genPaymentReceiptNo(advances, prefixRaw, nextSeqRaw) {
  const prefix = sanitizePrefix(prefixRaw || "RCPT");
  let maxSeq = 0;
  for (const a of Array.isArray(advances) ? advances : []) {
    if (!a || typeof a !== "object") continue;
    maxSeq = Math.max(maxSeq, receiptSequenceForPrefix(a.receiptNo, prefix));
  }
  const configuredNext = Math.max(1, num(nextSeqRaw) || 1);
  const nextSeq = Math.max(maxSeq + 1, configuredNext);
  return `${prefix}-${String(nextSeq).padStart(4, "0")}`;
}

export function paymentReceiptPrefix(settings) {
  return sanitizePrefix(settings?.paymentReceiptPrefix ?? "RCPT");
}

export function normAdvanceApplications(raw, advanceId) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x) => x && typeof x === "object")
    .map((x) => ({
      id: String(x.id || makeId()),
      saleId: String(x.saleId || "").trim(),
      amount: roundMoney2(num(x.amount)),
      date: String(x.date || todayStr()).slice(0, 10),
      advanceId: String(advanceId || x.advanceId || "").trim(),
    }))
    .filter((x) => x.saleId && x.amount > 0);
}

export function normCustomerAdvancePayments(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x) => x && typeof x === "object")
    .map((x) => {
      const id = String(x.id || makeId());
      const amount = roundMoney2(num(x.amount));
      const applications = normAdvanceApplications(x.applications, id);
      return {
        id,
        date: String(x.date || todayStr()).slice(0, 10),
        amount,
        bankAccountId: String(x.bankAccountId || "").trim(),
        customerName: String(x.customerName || "").trim(),
        receiptNo: String(x.receiptNo || "").trim(),
        note: String(x.note || "").trim(),
        applications,
      };
    })
    .filter((x) => x.amount > 0 && x.bankAccountId && x.customerName);
}

export function advanceAppliedAmount(advance) {
  const apps = Array.isArray(advance?.applications) ? advance.applications : [];
  return roundMoney2(apps.reduce((s, a) => s + num(a.amount), 0));
}

export function advanceUnappliedAmount(advance) {
  return roundMoney2(Math.max(0, num(advance?.amount) - advanceAppliedAmount(advance)));
}

/** Total unapplied advance balance for one customer (case-insensitive name match). */
export function customerAdvanceBalance(customerName, advances) {
  const key = String(customerName || "").trim().toLowerCase();
  if (!key) return 0;
  let s = 0;
  for (const a of Array.isArray(advances) ? advances : []) {
    if (!a || typeof a !== "object") continue;
    if (String(a.customerName || "").trim().toLowerCase() !== key) continue;
    s += advanceUnappliedAmount(a);
  }
  return roundMoney2(s);
}

/** Linked expenses, other income, invoice payments, supplier payments (Purchases module), internal transfers, stock-in, and loans given / repayments for one account, newest first. */
export function buildBankAccountTransactions(accountId, expenses, sales, transfers, inventoryEntries, otherIncomes, allAccounts, purchases = [], loansGiven = [], customerAdvancePayments = []) {
  const id = String(accountId || "");
  const banks = allAccounts || [];
  const rows = [];
  for (const e of expenses || []) {
    if (!e || String(e.bankAccountId || "") !== id) continue;
    rows.push({
      key: `e-${e.id}`,
      linkKind: "expense",
      expenseId: e.id,
      date: e.date,
      dir: "out",
      amount: num(e.amount),
      title: (e.description || "").trim() || e.category || "Expense",
      sub: `Expense · ${e.category || "Other"}`,
      sortMs: entityTimeMsFromId(e.id),
    });
  }
  for (const oi of otherIncomes || []) {
    if (!oi || String(oi.bankAccountId || "").trim() !== id) continue;
    const amt = num(oi.amount);
    if (amt <= 0) continue;
    rows.push({
      key: `oi-${oi.id}`,
      linkKind: "otherIncome",
      otherIncomeId: oi.id,
      date: oi.date,
      dir: "in",
      amount: amt,
      title: (oi.description || "").trim() || oi.category || "Other income",
      sub: `Other income · ${oi.category || "Other"}`,
      sortMs: entityTimeMsFromId(oi.id),
    });
  }
  for (const s of sales || []) {
    if (!s || typeof s !== "object") continue;
    for (const pe of normalizePaymentEntries(s)) {
      if (!pe || String(pe.bankAccountId || "") !== id) continue;
      if (String(pe.sourceAdvanceId || "").trim()) continue;
      rows.push({
        key: `p-${s.id}-${pe.id}`,
        linkKind: "payment",
        saleId: s.id,
        paymentEntryId: String(pe.id || ""),
        date: pe.date,
        dir: "in",
        amount: num(pe.amount),
        title: (s.customerName || "").trim() || "Customer",
        sub: `Invoice ${s.invoiceNo || "—"}`,
        sortMs: Math.max(entityTimeMsFromId(pe.id), entityTimeMsFromId(s.id)),
      });
    }
  }
  for (const p of purchases || []) {
    if (!p || typeof p !== "object") continue;
    for (const pe of normalizePurchasePaymentEntries(p)) {
      if (!pe || String(pe.bankAccountId || "") !== id) continue;
      const amt = num(pe.amount);
      if (amt <= 0) continue;
      const ref = String(p.invoiceRef || "").trim();
      rows.push({
        key: `pp-${p.id}-${pe.id}`,
        linkKind: "purchasePayment",
        purchaseId: p.id,
        paymentEntryId: String(pe.id || ""),
        date: pe.date,
        dir: "out",
        amount: amt,
        title: (p.supplierName || "").trim() || "Supplier",
        sub: ref ? `Supplier payment · ${ref}` : "Supplier payment",
        sortMs: Math.max(entityTimeMsFromId(pe.id), entityTimeMsFromId(p.id)),
      });
    }
  }
  for (const adv of normCustomerAdvancePayments(customerAdvancePayments)) {
    if (String(adv.bankAccountId || "") !== id) continue;
    rows.push({
      key: `adv-${adv.id}`,
      linkKind: "advancePayment",
      advancePaymentId: adv.id,
      date: adv.date,
      dir: "in",
      amount: num(adv.amount),
      title: adv.customerName || "Customer",
      sub: adv.receiptNo ? `Advance · ${adv.receiptNo}` : "Advance payment",
      sortMs: entityTimeMsFromId(adv.id),
    });
  }
  for (const inv of inventoryEntries || []) {
    if (!inv || inv.type === "out") continue;
    if (String(inv.bankAccountId || "").trim() !== id) continue;
    const amt = stockInCashAmount(inv);
    if (amt <= 0) continue;
    rows.push({
      key: `inv-${inv.id}`,
      linkKind: "stockIn",
      inventoryId: inv.id,
      date: inv.date,
      dir: "out",
      amount: amt,
      title: (inv.item || "").trim() || "Stock",
      sub: `Stock purchase · ${bankAccountLabel(banks, id)}`,
      sortMs: entityTimeMsFromId(inv.id),
    });
  }
  for (const t of transfers || []) {
    if (!t) continue;
    const kind = String(t.kind || "").trim();
    const fromExt = String(t.fromAccountId) === BANK_EXTERNAL_SOURCE_ID;
    const toExt = String(t.toAccountId) === BANK_EXTERNAL_SINK_ID;
    const note = String(t.note || "").trim();
    const kindLabel =
      kind === "ownerDrawing"
        ? "Owner drawing"
        : kind === "ownerCapital"
          ? "Owner capital in"
          : fromExt
            ? "Cash deposit"
            : toExt
              ? "Cash withdrawal"
              : "Between accounts";
    if (String(t.fromAccountId) === id) {
      rows.push({
        key: `x-${t.id}-out`,
        linkKind: "transfer",
        transferId: t.id,
        transferSide: "out",
        date: t.date,
        dir: "out",
        amount: num(t.amount),
        title: toExt ? "Cash withdrawal" : `To ${bankAccountLabel(banks, t.toAccountId)}`,
        sub: note ? `${kindLabel} · ${note}` : kindLabel,
        sortMs: entityTimeMsFromId(t.id),
      });
    }
    if (String(t.toAccountId) === id) {
      rows.push({
        key: `x-${t.id}-in`,
        linkKind: "transfer",
        transferId: t.id,
        transferSide: "in",
        date: t.date,
        dir: "in",
        amount: num(t.amount),
        title: fromExt ? "Cash deposit" : `From ${bankAccountLabel(banks, t.fromAccountId)}`,
        sub: note ? `${kindLabel} · ${note}` : kindLabel,
        sortMs: entityTimeMsFromId(t.id),
      });
    }
  }
  for (const lg of loansGiven || []) {
    if (!lg || typeof lg !== "object") continue;
    const dbid = String(lg.disbursementBankAccountId || "").trim();
    if (dbid === id) {
      const damt = num(lg.disbursementAmount) > 0 ? num(lg.disbursementAmount) : num(lg.principal);
      if (damt <= 0) continue;
      const ddate = String(lg.disbursementDate || lg.dateGiven || "").slice(0, 10);
      rows.push({
        key: `lg-out-${lg.id}`,
        linkKind: "loanDisbursement",
        loanGivenId: lg.id,
        date: ddate,
        dir: "out",
        amount: damt,
        title: `Loan to ${(lg.borrowerName || "").trim() || "Borrower"}`,
        sub: "Loan given · Cash out",
        sortMs: entityTimeMsFromId(lg.id),
      });
    }
    for (const rep of lg.repaymentEntries || []) {
      if (!rep || String(rep.bankAccountId || "").trim() !== id) continue;
      const ramt = num(rep.amount);
      if (ramt <= 0) continue;
      rows.push({
        key: `lg-in-${lg.id}-${rep.id}`,
        linkKind: "loanRepayment",
        loanGivenId: lg.id,
        repaymentEntryId: rep.id,
        date: String(rep.date || "").slice(0, 10),
        dir: "in",
        amount: ramt,
        title: `Repayment · ${(lg.borrowerName || "").trim() || "Borrower"}`,
        sub: "Loan repayment · Received",
        sortMs: entityTimeMsFromId(rep.id),
      });
    }
  }
  rows.sort((a, b) => {
    const dc = String(b.date).localeCompare(String(a.date));
    if (dc !== 0) return dc;
    return (b.sortMs || 0) - (a.sortMs || 0);
  });
  return rows;
}

/** Newest-first rows with running balance after each line (MyMoney-style register), based on current book balance. */
export function bankTxRowsWithRunningAfter(rowsNewestFirst, bookAmount) {
  let run = num(bookAmount);
  return rowsNewestFirst.map((t) => {
    const row = { ...t, afterBalance: run };
    const delta = t.dir === "in" ? num(t.amount) : -num(t.amount);
    run -= delta;
    return row;
  });
}

/** Sum of linked money in/out in a calendar month (YYYY-MM) across all accounts. */
export function bankingActivityForMonth(expenses, sales, inventoryEntries, otherIncomes, monthKey, purchases = [], transfers = [], loansGiven = [], customerAdvancePayments = []) {
  const mk = String(monthKey || "").slice(0, 7);
  if (mk.length < 7) return { cashIn: 0, cashOut: 0 };
  let cashIn = 0;
  let cashOut = 0;
  for (const e of expenses || []) {
    if (!e || String(e.date || "").slice(0, 7) !== mk || !String(e.bankAccountId || "").trim()) continue;
    cashOut += num(e.amount);
  }
  for (const oi of otherIncomes || []) {
    if (!oi || String(oi.date || "").slice(0, 7) !== mk || !String(oi.bankAccountId || "").trim()) continue;
    cashIn += num(oi.amount);
  }
  for (const s of sales || []) {
    if (!s || typeof s !== "object") continue;
    const pes = normalizePaymentEntries(s);
    if (pes.length > 0) {
      for (const pe of pes) {
        if (String(pe.sourceAdvanceId || "").trim()) continue;
        if (!pe || String(pe.date || "").slice(0, 7) !== mk) continue;
        cashIn += num(pe.amount);
      }
    } else if (num(s.received) > 0 && String(s.date || "").slice(0, 7) === mk) {
      cashIn += num(s.received);
    }
  }
  for (const inv of inventoryEntries || []) {
    if (!inv || inv.type === "out") continue;
    if (String(inv.date || "").slice(0, 7) !== mk) continue;
    if (!String(inv.bankAccountId || "").trim()) continue;
    cashOut += stockInCashAmount(inv);
  }
  for (const p of purchases || []) {
    if (!p || typeof p !== "object") continue;
    for (const pe of normalizePurchasePaymentEntries(p)) {
      if (!pe || String(pe.date || "").slice(0, 7) !== mk || !String(pe.bankAccountId || "").trim()) continue;
      cashOut += num(pe.amount);
    }
  }
  for (const t of transfers || []) {
    if (!t || String(t.date || "").slice(0, 7) !== mk) continue;
    if (String(t.fromAccountId || "").trim()) cashOut += num(t.amount);
    if (String(t.toAccountId || "").trim()) cashIn += num(t.amount);
  }
  for (const lg of loansGiven || []) {
    if (!lg || typeof lg !== "object") continue;
    const dbid = String(lg.disbursementBankAccountId || "").trim();
    if (dbid) {
      const d = String(lg.disbursementDate || lg.dateGiven || "").slice(0, 10);
      if (d.length >= 10 && d.slice(0, 7) === mk) {
        const damt = num(lg.disbursementAmount) > 0 ? num(lg.disbursementAmount) : num(lg.principal);
        if (damt > 0) cashOut += damt;
      }
    }
    for (const rep of lg.repaymentEntries || []) {
      if (!rep) continue;
      const d = String(rep.date || "").slice(0, 10);
      if (d.length < 10 || d.slice(0, 7) !== mk || !String(rep.bankAccountId || "").trim()) continue;
      cashIn += num(rep.amount);
    }
  }
  for (const adv of normCustomerAdvancePayments(customerAdvancePayments)) {
    if (String(adv.date || "").slice(0, 7) !== mk) continue;
    cashIn += num(adv.amount);
  }
  return { cashIn: roundMoney2(cashIn), cashOut: roundMoney2(cashOut) };
}

/** Cash collected from sales in a calendar month (by payment date); legacy fallback attributes `received` to invoice month. */
export function sumSalePaymentsInMonth(sales, monthKey) {
  const mk = String(monthKey || "").slice(0, 7);
  if (mk.length < 7) return 0;
  let t = 0;
  for (const s of sales || []) {
    if (!s || typeof s !== "object") continue;
    const pes = normalizePaymentEntries(s);
    if (pes.length > 0) {
      for (const pe of pes) {
        if (String(pe.sourceAdvanceId || "").trim()) continue;
        if (String(pe.date || "").slice(0, 7) !== mk) continue;
        t += num(pe.amount);
      }
    } else if (num(s.received) > 0 && String(s.date || "").slice(0, 7) === mk) {
      t += num(s.received);
    }
  }
  return roundMoney2(t);
}

/** Customer advance receipts in a calendar month (by advance date — matches banking). */
export function sumCustomerAdvanceReceiptsInMonth(customerAdvancePayments, monthKey) {
  const mk = String(monthKey || "").slice(0, 7);
  if (mk.length < 7) return 0;
  let t = 0;
  for (const adv of normCustomerAdvancePayments(customerAdvancePayments)) {
    if (String(adv.date || "").slice(0, 7) !== mk) continue;
    t += num(adv.amount);
  }
  return roundMoney2(t);
}

/** Customer advance receipts on a specific calendar day. */
export function sumCustomerAdvanceReceiptsOnDay(customerAdvancePayments, dayStr) {
  const d = String(dayStr || "").slice(0, 10);
  if (d.length < 10) return 0;
  let t = 0;
  for (const adv of normCustomerAdvancePayments(customerAdvancePayments)) {
    if (String(adv.date || "").slice(0, 10) !== d) continue;
    t += num(adv.amount);
  }
  return roundMoney2(t);
}

/** Cash collected from sales on a specific calendar day (payment dates). */
export function sumSalePaymentsOnDay(sales, dayStr) {
  const d = String(dayStr || "").slice(0, 10);
  if (d.length < 10) return 0;
  let t = 0;
  for (const s of sales || []) {
    if (!s || typeof s !== "object") continue;
    const pes = normalizePaymentEntries(s);
    if (pes.length > 0) {
      for (const pe of pes) {
        if (String(pe.sourceAdvanceId || "").trim()) continue;
        if (String(pe.date || "").slice(0, 10) !== d) continue;
        t += num(pe.amount);
      }
    } else if (num(s.received) > 0 && String(s.date || "").slice(0, 10) === d) {
      t += num(s.received);
    }
  }
  return roundMoney2(t);
}

export function sumExpenseCashOutInMonth(expenses, monthKey) {
  const mk = String(monthKey || "").slice(0, 7);
  if (mk.length < 7) return 0;
  let t = 0;
  for (const e of expenses || []) {
    if (!e || String(e.date || "").slice(0, 7) !== mk) continue;
    if (!String(e.bankAccountId || "").trim()) continue;
    t += num(e.amount);
  }
  return roundMoney2(t);
}

export function sumExpenseCashOutInFy(expenses, fsm, fyYear) {
  let t = 0;
  for (const e of expenses || []) {
    if (!e || !isDateInFy(e.date, fsm, fyYear)) continue;
    if (!String(e.bankAccountId || "").trim()) continue;
    t += num(e.amount);
  }
  return roundMoney2(t);
}

export function sumExpenseCashOutAll(expenses) {
  let t = 0;
  for (const e of expenses || []) {
    if (!e || !String(e.bankAccountId || "").trim()) continue;
    t += num(e.amount);
  }
  return roundMoney2(t);
}

export function sumExpenseCashOutOnDay(expenses, dayStr) {
  const d = String(dayStr || "").slice(0, 10);
  if (d.length < 10) return 0;
  let t = 0;
  for (const e of expenses || []) {
    if (!e || String(e.date || "").slice(0, 10) !== d) continue;
    if (!String(e.bankAccountId || "").trim()) continue;
    t += num(e.amount);
  }
  return roundMoney2(t);
}

export function sumStockInCashOutInMonth(inventoryEntries, monthKey) {
  const mk = String(monthKey || "").slice(0, 7);
  if (mk.length < 7) return 0;
  let t = 0;
  for (const inv of inventoryEntries || []) {
    if (!inv || inv.type === "out") continue;
    if (String(inv.date || "").slice(0, 7) !== mk) continue;
    if (!String(inv.bankAccountId || "").trim()) continue;
    t += stockInCashAmount(inv);
  }
  return roundMoney2(t);
}

export function sumStockInCashOutOnDay(inventoryEntries, dayStr) {
  const d = String(dayStr || "").slice(0, 10);
  if (d.length < 10) return 0;
  let t = 0;
  for (const inv of inventoryEntries || []) {
    if (!inv || inv.type === "out") continue;
    if (String(inv.date || "").slice(0, 10) !== d) continue;
    if (!String(inv.bankAccountId || "").trim()) continue;
    t += stockInCashAmount(inv);
  }
  return roundMoney2(t);
}

/** Supplier payments (Purchases module) in a calendar month, by payment date. */
export function sumPurchasePaymentsInMonth(purchases, monthKey) {
  const mk = String(monthKey || "").slice(0, 7);
  if (mk.length < 7) return 0;
  let t = 0;
  for (const p of purchases || []) {
    if (!p || typeof p !== "object") continue;
    for (const pe of normalizePurchasePaymentEntries(p)) {
      if (String(pe.date || "").slice(0, 7) !== mk) continue;
      t += num(pe.amount);
    }
  }
  return roundMoney2(t);
}

/** Supplier payments on one calendar day. */
export function sumPurchasePaymentsOnDay(purchases, dayStr) {
  const d = String(dayStr || "").slice(0, 10);
  if (d.length < 10) return 0;
  let t = 0;
  for (const p of purchases || []) {
    if (!p || typeof p !== "object") continue;
    for (const pe of normalizePurchasePaymentEntries(p)) {
      if (String(pe.date || "").slice(0, 10) !== d) continue;
      t += num(pe.amount);
    }
  }
  return roundMoney2(t);
}

export function sumOtherIncomeCashInInMonth(otherIncomes, monthKey) {
  const mk = String(monthKey || "").slice(0, 7);
  if (mk.length < 7) return 0;
  let t = 0;
  for (const oi of otherIncomes || []) {
    if (!oi || String(oi.date || "").slice(0, 7) !== mk) continue;
    if (!String(oi.bankAccountId || "").trim()) continue;
    t += num(oi.amount);
  }
  return roundMoney2(t);
}

export function sumOtherIncomeCashInInFy(otherIncomes, fsm, fyYear) {
  let t = 0;
  for (const oi of otherIncomes || []) {
    if (!oi || !isDateInFy(oi.date, fsm, fyYear)) continue;
    if (!String(oi.bankAccountId || "").trim()) continue;
    t += num(oi.amount);
  }
  return roundMoney2(t);
}

export function sumOtherIncomeCashInAll(otherIncomes) {
  let t = 0;
  for (const oi of otherIncomes || []) {
    if (!oi || !String(oi.bankAccountId || "").trim()) continue;
    t += num(oi.amount);
  }
  return roundMoney2(t);
}

/**
 * COGS for P&amp;L: accrual = full invoice line cost; cash = cost × (collected ÷ invoiced) per invoice.
 */
export function recognizedCogsForSales(sales, accrual) {
  let c = 0;
  for (const s of sales || []) {
    if (!s || typeof s !== "object") continue;
    const tc = num(s.totalCost);
    if (accrual) {
      c += tc;
      continue;
    }
    const ts = num(s.totalSale);
    const rec = num(s.received);
    if (ts <= 0) {
      if (rec > 0) c += tc;
      continue;
    }
    c += roundMoney2(tc * (rec / ts));
  }
  return roundMoney2(c);
}

/**
 * COGS for cash P&amp;L when revenue is keyed by **payment date** (matches {@link sumSalePaymentsInMonth} / banking).
 * Allocates line cost per payment line; legacy sales without `paymentEntries` use invoice date like the payment helpers.
 */
export function recognizedCogsForPaymentsInMonth(sales, monthKey) {
  const mk = String(monthKey || "").slice(0, 7);
  if (mk.length < 7) return 0;
  let c = 0;
  /** At most one full `tc` per sale when `totalSale <= 0` (matches {@link recognizedCogsForSales}). */
  const zeroInvoiceCogsDone = new Set();
  for (const s of sales || []) {
    if (!s || typeof s !== "object") continue;
    const tc = num(s.totalCost);
    const ts = num(s.totalSale);
    const pes = normalizePaymentEntries(s);
    if (pes.length > 0) {
      for (const pe of pes) {
        if (String(pe.date || "").slice(0, 7) !== mk) continue;
        const amt = num(pe.amount);
        if (amt <= 0) continue;
        if (ts <= 0) {
          if (!zeroInvoiceCogsDone.has(s.id)) {
            c += tc;
            zeroInvoiceCogsDone.add(s.id);
          }
        } else {
          c += roundMoney2(tc * (amt / ts));
        }
      }
    } else {
      const leg = num(s.received);
      if (leg <= 0) continue;
      if (String(s.date || "").slice(0, 7) !== mk) continue;
      if (ts <= 0) {
        if (!zeroInvoiceCogsDone.has(s.id)) {
          c += tc;
          zeroInvoiceCogsDone.add(s.id);
        }
      } else {
        c += roundMoney2(tc * (leg / ts));
      }
    }
  }
  return roundMoney2(c);
}

/** Same as {@link recognizedCogsForPaymentsInMonth} for a financial year (payment dates in FY). */
export function recognizedCogsForPaymentsInFy(sales, fsm, fyYear) {
  let c = 0;
  const zeroInvoiceCogsDone = new Set();
  for (const s of sales || []) {
    if (!s || typeof s !== "object") continue;
    const tc = num(s.totalCost);
    const ts = num(s.totalSale);
    const pes = normalizePaymentEntries(s);
    if (pes.length > 0) {
      for (const pe of pes) {
        if (!isDateInFy(pe.date, fsm, fyYear)) continue;
        const amt = num(pe.amount);
        if (amt <= 0) continue;
        if (ts <= 0) {
          if (!zeroInvoiceCogsDone.has(s.id)) {
            c += tc;
            zeroInvoiceCogsDone.add(s.id);
          }
        } else {
          c += roundMoney2(tc * (amt / ts));
        }
      }
    } else {
      const leg = num(s.received);
      if (leg <= 0) continue;
      if (!isDateInFy(s.date, fsm, fyYear)) continue;
      if (ts <= 0) {
        if (!zeroInvoiceCogsDone.has(s.id)) {
          c += tc;
          zeroInvoiceCogsDone.add(s.id);
        }
      } else {
        c += roundMoney2(tc * (leg / ts));
      }
    }
  }
  return roundMoney2(c);
}

/** Cash collected in FY by payment date (legacy: `received` on invoice date when no payment lines). */
export function sumSalePaymentsInFy(sales, fsm, fyYear) {
  let t = 0;
  for (const s of sales || []) {
    if (!s || typeof s !== "object") continue;
    const pes = normalizePaymentEntries(s);
    if (pes.length > 0) {
      for (const pe of pes) {
        if (isDateInFy(pe.date, fsm, fyYear)) t += num(pe.amount);
      }
    } else if (num(s.received) > 0 && isDateInFy(s.date, fsm, fyYear)) {
      t += num(s.received);
    }
  }
  return roundMoney2(t);
}

/** All-time cash in from sales (every payment line + legacy received). */
export function sumSalePaymentsAll(sales) {
  let t = 0;
  for (const s of sales || []) {
    if (!s || typeof s !== "object") continue;
    const pes = normalizePaymentEntries(s);
    if (pes.length > 0) {
      for (const pe of pes) {
        t += num(pe.amount);
      }
    } else {
      t += num(s.received);
    }
  }
  return roundMoney2(t);
}

/** COGS aligned with {@link sumSalePaymentsAll} (cash, all-time). */
export function recognizedCogsForPaymentsAll(sales) {
  let c = 0;
  const zeroInvoiceCogsDone = new Set();
  for (const s of sales || []) {
    if (!s || typeof s !== "object") continue;
    const tc = num(s.totalCost);
    const ts = num(s.totalSale);
    const pes = normalizePaymentEntries(s);
    if (pes.length > 0) {
      for (const pe of pes) {
        const amt = num(pe.amount);
        if (amt <= 0) continue;
        if (ts <= 0) {
          if (!zeroInvoiceCogsDone.has(s.id)) {
            c += tc;
            zeroInvoiceCogsDone.add(s.id);
          }
        } else {
          c += roundMoney2(tc * (amt / ts));
        }
      }
    } else {
      const leg = num(s.received);
      if (leg <= 0) continue;
      if (ts <= 0) {
        if (!zeroInvoiceCogsDone.has(s.id)) {
          c += tc;
          zeroInvoiceCogsDone.add(s.id);
        }
      } else {
        c += roundMoney2(tc * (leg / ts));
      }
    }
  }
  return roundMoney2(c);
}

/** Per-account money in/out in a calendar month (expenses, payments, transfers, stock-in, supplier payments, other income). */
export function bankingActivityForAccountInMonth(expenses, sales, transfers, inventoryEntries, otherIncomes, accountId, monthKey, purchases = [], loansGiven = [], customerAdvancePayments = []) {
  const mk = String(monthKey || "").slice(0, 7);
  const id = String(accountId || "");
  if (mk.length < 7 || !id) return { inn: 0, out: 0 };
  let inn = 0;
  let out = 0;
  for (const e of expenses || []) {
    if (!e || String(e.bankAccountId || "").trim() !== id) continue;
    if (String(e.date || "").slice(0, 7) !== mk) continue;
    out += num(e.amount);
  }
  for (const oi of otherIncomes || []) {
    if (!oi || String(oi.bankAccountId || "").trim() !== id) continue;
    if (String(oi.date || "").slice(0, 7) !== mk) continue;
    inn += num(oi.amount);
  }
  for (const s of sales || []) {
    for (const pe of normalizePaymentEntries(s)) {
      if (String(pe.sourceAdvanceId || "").trim()) continue;
      if (String(pe.bankAccountId || "").trim() !== id) continue;
      if (String(pe.date || "").slice(0, 7) !== mk) continue;
      inn += num(pe.amount);
    }
  }
  for (const t of transfers || []) {
    if (!t || String(t.date || "").slice(0, 7) !== mk) continue;
    if (String(t.fromAccountId) === id) out += num(t.amount);
    if (String(t.toAccountId) === id) inn += num(t.amount);
  }
  for (const inv of inventoryEntries || []) {
    if (!inv || inv.type === "out") continue;
    if (String(inv.bankAccountId || "").trim() !== id) continue;
    if (String(inv.date || "").slice(0, 7) !== mk) continue;
    out += stockInCashAmount(inv);
  }
  for (const p of purchases || []) {
    if (!p || typeof p !== "object") continue;
    for (const pe of normalizePurchasePaymentEntries(p)) {
      if (String(pe.bankAccountId || "").trim() !== id) continue;
      if (String(pe.date || "").slice(0, 7) !== mk) continue;
      out += num(pe.amount);
    }
  }
  for (const lg of loansGiven || []) {
    if (!lg || typeof lg !== "object") continue;
    if (String(lg.disbursementBankAccountId || "").trim() === id) {
      const d = String(lg.disbursementDate || lg.dateGiven || "").slice(0, 10);
      if (d.length >= 10 && d.slice(0, 7) === mk) {
        const damt = num(lg.disbursementAmount) > 0 ? num(lg.disbursementAmount) : num(lg.principal);
        if (damt > 0) out += damt;
      }
    }
    for (const rep of lg.repaymentEntries || []) {
      if (!rep || String(rep.bankAccountId || "").trim() !== id) continue;
      const d = String(rep.date || "").slice(0, 10);
      if (d.length < 10 || d.slice(0, 7) !== mk) continue;
      inn += num(rep.amount);
    }
  }
  for (const adv of normCustomerAdvancePayments(customerAdvancePayments)) {
    if (String(adv.bankAccountId || "").trim() !== id) continue;
    if (String(adv.date || "").slice(0, 7) !== mk) continue;
    inn += num(adv.amount);
  }
  return { inn: roundMoney2(inn), out: roundMoney2(out) };
}

export function normBalance(raw) {
  const o = raw&&typeof raw==="object" ? raw : {};
  let ba = Array.isArray(o.bankAccounts)
    ? o.bankAccounts.map((x) => {
        const amount = num(x?.amount);
        const openingBalance = x?.openingBalance != null && x?.openingBalance !== "" ? num(x.openingBalance) : amount;
        const name = String(x?.name ?? "").trim() || "Account";
        const balanceAdjustment =
          x?.balanceAdjustment != null && x?.balanceAdjustment !== "" ? num(x.balanceAdjustment) : null;
        return {
          id: String(x?.id || makeId()),
          name,
          amount,
          openingBalance,
          balanceAdjustment,
          kind: normalizeBankAccountKind(name, x?.kind),
          excludeFromBalanceSheet: x?.excludeFromBalanceSheet === true,
          excludeFromLiquid: x?.excludeFromLiquid === true,
        };
      })
    : [];
  if (!ba.length) {
    const c = num(o.cashInHand);
    const b = num(o.bankBalance);
    ba = [
      { id: makeId(), name: "Cash in hand", amount: c, openingBalance: c, balanceAdjustment: 0, kind: "cash" },
      { id: makeId(), name: "Bank balance", amount: b, openingBalance: b, balanceAdjustment: 0, kind: "bank" },
    ];
  }
  let fa = Array.isArray(o.fixedAssetAccounts)
    ? o.fixedAssetAccounts.map((x) => ({
        id: String(x?.id || makeId()),
        name: String(x?.name ?? "").trim() || "Asset",
        amount: num(x?.amount),
        purchaseDate: x?.purchaseDate ? String(x.purchaseDate).slice(0, 10) : "",
        depreciationRatePct: num(x?.depreciationRatePct),
        accumulatedDepreciation: num(x?.accumulatedDepreciation),
      }))
    : [];
  if (!fa.length && num(o.fixedAssets) > 0)
    fa = [{ id: makeId(), name: "Fixed assets", amount: num(o.fixedAssets), purchaseDate: "", depreciationRatePct: 0, accumulatedDepreciation: 0 }];
  const loanSchedule = Array.isArray(o.loanSchedule)
    ? o.loanSchedule
        .filter((r) => r && typeof r === "object")
        .map((r) => ({
          id: String(r.id || makeId()),
          label: String(r.label || "").trim() || "Loan",
          balance: num(r.balance),
          note: String(r.note || "").trim(),
        }))
    : [];
  const bankTransfers = normBankTransfers(o.bankTransfers);
  return {
    bankAccounts: ba,
    bankTransfers,
    fixedAssetAccounts: fa,
    loanSchedule,
    otherAssets: num(o.otherAssets),
    supplierPayables: num(o.supplierPayables),
    loans: num(o.loans),
    /** Total cash/capital the owner says they put into the business (for Net Worth vs investment). */
    ownerCapitalInvested: num(o.ownerCapitalInvested),
  };
}

export function roundMoney2(n) {
  return Math.round((num(n) + Number.EPSILON) * 100) / 100;
}

/** Clean string for money `<input type="number">` fields — avoids float noise like 10.666666666666666. */
export function moneyInputStr(v) {
  if (v === "" || v == null) return "";
  const n = roundMoney2(v);
  return Number.isFinite(n) ? String(n) : "";
}

function activityDateOnOrBefore(recordDate, fallbackDate, asOf) {
  if (!asOf) return true;
  const d = String(recordDate || fallbackDate || "").slice(0, 10);
  if (d.length < 10) return false;
  return compareYmdAsc(d, asOf) <= 0;
}

/** Net effect on one account from linked expenses (out), invoice payments (in), supplier payments (out), transfers, stock-in (cash out), and other income (in). */
export function computeAccountActivityNet(
  accountId,
  expenses,
  sales,
  transfers,
  inventoryEntries,
  otherIncomes,
  purchases = [],
  loansGiven = [],
  customerAdvancePayments = [],
  asOfDate = null,
) {
  const id = String(accountId || "");
  const asOf = asOfDate ? String(asOfDate).slice(0, 10) : null;
  let net = 0;
  for (const e of expenses || []) {
    if (!e || String(e.bankAccountId || "").trim() !== id) continue;
    if (!activityDateOnOrBefore(e.date, null, asOf)) continue;
    net -= num(e.amount);
  }
  for (const oi of otherIncomes || []) {
    if (!oi || String(oi.bankAccountId || "").trim() !== id) continue;
    if (!activityDateOnOrBefore(oi.date, null, asOf)) continue;
    net += num(oi.amount);
  }
  for (const s of sales || []) {
    const pes = normalizePaymentEntries(s);
    if (pes.length) {
      for (const pe of pes) {
        if (String(pe.sourceAdvanceId || "").trim()) continue;
        if (String(pe.bankAccountId || "").trim() !== id) continue;
        if (!activityDateOnOrBefore(pe.date, s.date, asOf)) continue;
        net += num(pe.amount);
      }
    } else if (num(s.received) > 0 && String(s.bankAccountId || "").trim() === id) {
      if (activityDateOnOrBefore(s.date, null, asOf)) net += num(s.received);
    }
  }
  for (const t of transfers || []) {
    if (!t) continue;
    if (!activityDateOnOrBefore(t.date, null, asOf)) continue;
    if (String(t.fromAccountId) === id) net -= num(t.amount);
    if (String(t.toAccountId) === id) net += num(t.amount);
  }
  for (const inv of inventoryEntries || []) {
    if (!inv || inv.type === "out") continue;
    if (String(inv.bankAccountId || "").trim() !== id) continue;
    if (!activityDateOnOrBefore(inv.date, null, asOf)) continue;
    net -= stockInCashAmount(inv);
  }
  for (const p of purchases || []) {
    if (!p || typeof p !== "object") continue;
    for (const pe of normalizePurchasePaymentEntries(p)) {
      if (String(pe.bankAccountId || "").trim() !== id) continue;
      if (!activityDateOnOrBefore(pe.date, p.date, asOf)) continue;
      net -= num(pe.amount);
    }
  }
  for (const adv of normCustomerAdvancePayments(customerAdvancePayments)) {
    if (String(adv.bankAccountId || "").trim() !== id) continue;
    if (!activityDateOnOrBefore(adv.date, null, asOf)) continue;
    net += num(adv.amount);
  }
  for (const lg of loansGiven || []) {
    if (!lg || typeof lg !== "object") continue;
    if (String(lg.disbursementBankAccountId || "").trim() === id) {
      const disbDate = lg.disbursementDate || lg.dateGiven;
      if (activityDateOnOrBefore(disbDate, null, asOf)) {
        const damt = num(lg.disbursementAmount) > 0 ? num(lg.disbursementAmount) : num(lg.principal);
        if (damt > 0) net -= damt;
      }
    }
    for (const rep of lg.repaymentEntries || []) {
      if (!rep || String(rep.bankAccountId || "").trim() !== id) continue;
      if (!activityDateOnOrBefore(rep.date, null, asOf)) continue;
      net += num(rep.amount);
    }
  }
  return net;
}

/** Book balance for one account from linked transactions (matches account detail screen). */
export function computeBankAccountBookBalance(
  account,
  expenses,
  sales,
  transfers,
  inventoryEntries,
  otherIncomes,
  purchases = [],
  loansGiven = [],
  asOfDate = null,
  customerAdvancePayments = [],
) {
  if (!account?.id) return 0;
  const opening = roundMoney2(account.openingBalance);
  const activity = roundMoney2(
    computeAccountActivityNet(
      account.id,
      expenses,
      sales,
      transfers,
      inventoryEntries,
      otherIncomes,
      purchases,
      loansGiven,
      customerAdvancePayments,
      asOfDate,
    ),
  );
  const adjRaw = account.balanceAdjustment;
  let adj;
  if (adjRaw !== null && adjRaw !== undefined && adjRaw !== "") {
    adj = roundMoney2(adjRaw);
  } else if (asOfDate) {
    adj = 0;
  } else {
    const stored = roundMoney2(account.amount);
    adj = roundMoney2(stored - opening - activity);
  }
  return roundMoney2(opening + activity + adj);
}

/** Sum bank book balances as-of a date (historical balance sheet). */
export function sumBankAccountBalancesAsOf({
  bankAccounts = [],
  expenses = [],
  sales = [],
  transfers = [],
  inventoryEntries = [],
  otherIncomes = [],
  purchases = [],
  loansGiven = [],
  customerAdvancePayments = [],
  asOfDate,
  predicate = () => true,
} = {}) {
  const asOf = String(asOfDate || todayStr()).slice(0, 10);
  const xfers = normBankTransfers(transfers);
  return roundMoney2(
    (Array.isArray(bankAccounts) ? bankAccounts : [])
      .filter((a) => a && a.id && predicate(a))
      .reduce(
        (sum, acc) =>
          sum +
          computeBankAccountBookBalance(
            acc,
            expenses,
            sales,
            xfers,
            inventoryEntries,
            otherIncomes,
            purchases,
            loansGiven,
            asOf,
            customerAdvancePayments,
          ),
        0,
      ),
  );
}

/**
 * Current balance = openingBalance + activity + balanceAdjustment.
 * If balanceAdjustment is unset, it is inferred once from stored amount so existing data does not jump.
 */
export function applyComputedBankBalances(state) {
  if (!state || typeof state !== "object" || !state.balance) return state;
  const expenses = state.expenses || [];
  const otherIncomes = state.otherIncomes || [];
  const sales = state.sales || [];
  const inventoryEntries = state.inventoryEntries || [];
  const purchases = state.purchases || [];
  const loansGiven = state.loansGiven || [];
  const customerAdvancePayments = state.customerAdvancePayments || [];
  const transfers = normBankTransfers(state.balance.bankTransfers);
  const bankAccounts = (state.balance.bankAccounts || []).map((a) => {
    if (!a || !a.id) return a;
    const opening = roundMoney2(a.openingBalance);
    const amount = computeBankAccountBookBalance(
      a,
      expenses,
      sales,
      transfers,
      inventoryEntries,
      otherIncomes,
      purchases,
      loansGiven,
      null,
      customerAdvancePayments,
    );
    const activity = roundMoney2(
      computeAccountActivityNet(
        a.id,
        expenses,
        sales,
        transfers,
        inventoryEntries,
        otherIncomes,
        purchases,
        loansGiven,
        customerAdvancePayments,
      ),
    );
    const adjRaw = a.balanceAdjustment;
    let adj;
    if (adjRaw !== null && adjRaw !== undefined && adjRaw !== "") {
      adj = roundMoney2(adjRaw);
    } else {
      adj = roundMoney2(amount - opening - activity);
    }
    return {
      ...a,
      openingBalance: opening,
      balanceAdjustment: adj,
      amount,
    };
  });
  return {
    ...state,
    balance: {
      ...state.balance,
      bankAccounts,
      bankTransfers: transfers,
    },
  };
}

/** Recency for picking the latest sale price per product (invoice date, then id time). */
function saleRecencyMs(sale) {
  if (!sale || typeof sale !== "object") return 0;
  const date = String(sale.date || "").slice(0, 10);
  const dateMs = date.length >= 10 ? Date.parse(`${date}T12:00:00`) || 0 : 0;
  const idMs = entityTimeMsFromId(sale.id);
  return Math.max(dateMs, idMs);
}

/**
 * Map normalized item key → last sale price from invoice history (most recent line wins).
 * @param {object[]} sales
 * @param {string} [excludeSaleId] — skip when editing an existing invoice
 */
export function buildLastSalePriceByItemKey(sales, excludeSaleId = "") {
  const skipId = String(excludeSaleId || "").trim();
  const meta = {};
  const prices = {};
  for (const sale of sales || []) {
    if (!sale || typeof sale !== "object") continue;
    if (skipId && String(sale.id || "") === skipId) continue;
    const sortMs = saleRecencyMs(sale);
    const lines = normSaleLineItems(sale.lineItems, sale);
    for (const line of lines) {
      const item = String(line.item || "").trim();
      const price = roundMoney2(num(line.salePrice));
      if (!item || price <= 0) continue;
      const key = normalizeItemKey(item);
      if (!key) continue;
      const prev = meta[key];
      if (!prev || sortMs > prev.sortMs) {
        meta[key] = { sortMs };
        prices[key] = price;
      }
    }
  }
  return prices;
}

/** Default unit sale price when picking a product: last invoice price, else inventory list price. */
export function defaultSalePriceForProductPick(lastSalePriceByKey, invRow) {
  if (!invRow || typeof invRow !== "object") return 0;
  const key = normalizeItemKey(invRow.item);
  const last = key && lastSalePriceByKey && typeof lastSalePriceByKey === "object" ? num(lastSalePriceByKey[key]) : 0;
  if (last > 0) return roundMoney2(last);
  return roundMoney2(num(invRow.salesPrice));
}

/**
 * Normalize line items on a sale. Each line: { id, item, qty, salePrice, costPrice }.
 *
 * For backward compatibility:
 *  - If `lineItems` is missing/empty on a saved sale, we synthesize a single line from
 *    legacy `item` / `qty` / `salePrice` / `costPrice` fields so single-item sales
 *    captured before this version keep working.
 *  - If `lineItems` is present, it wins and the legacy single-line fields are
 *    derived from the FIRST line (preserved as `item` / `qty` / `salePrice` /
 *    `costPrice` on the persisted sale for back-compat readers like the printable
 *    invoice and recent-activity widgets).
 */
export function normSaleLineItems(raw, legacyFallback) {
  const arr = Array.isArray(raw) ? raw : [];
  const clean = arr
    .filter((x) => x && typeof x === "object")
    .map((x) => ({
      id: String(x.id || makeId()),
      item: String(x.item || ""),
      qty: num(x.qty),
      salePrice: num(x.salePrice),
      costPrice: num(x.costPrice),
      hsn: String(x.hsn || "").trim(),
      gstRate: num(x.gstRate),
      chassisNo: String(x.chassisNo || "").trim(),
      motorNo: String(x.motorNo || "").trim(),
      batterySerialNo: String(x.batterySerialNo || "").trim(),
      invoiceGroupId: String(x.invoiceGroupId || "").trim(),
      itemDescription: String(x.itemDescription || "").trim(),
    }));
  if (clean.length > 0) return clean;
  const fb = legacyFallback || {};
  const fbItem = String(fb.item || "").trim();
  const fbQty = num(fb.qty);
  const fbSp = num(fb.salePrice);
  const fbCp = num(fb.costPrice);
  if (!fbItem && fbQty <= 0 && fbSp <= 0 && fbCp <= 0) return [];
  return [
    {
      id: makeId(),
      item: fbItem,
      qty: fbQty || (fbSp > 0 ? 1 : 0),
      salePrice: fbSp,
      costPrice: fbCp,
    },
  ];
}

/** Sum line items into totals (used by save handler + normalizer fallback). */
export function sumSaleLineItems(lineItems) {
  const items = Array.isArray(lineItems) ? lineItems : [];
  let totalSale = 0;
  let totalCost = 0;
  for (const li of items) {
    const q = num(li?.qty);
    totalSale += q * num(li?.salePrice);
    totalCost += q * num(li?.costPrice);
  }
  totalSale = roundMoney2(totalSale);
  totalCost = roundMoney2(totalCost);
  return {
    totalSale,
    totalCost,
    grossProfit: roundMoney2(totalSale - totalCost),
  };
}

export function normSalesList(raw, bankAccountsForDefault = null) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x) => x && typeof x === "object")
    .map((x) => {
      let paymentEntries = normalizePaymentEntries(x);
      let received = roundMoney2(paymentEntries.reduce((s, p) => s + num(p.amount), 0));
      if (paymentEntries.length === 0) {
        const legacy = num(x.received);
        if (legacy > 0) received = roundMoney2(legacy);
      }
      if (paymentEntries.length === 0 && received > 0) {
        const bid = String(x.receivedBankAccountId || "").trim() || getDefaultBankAccountId(bankAccountsForDefault || []);
        if (bid) {
          paymentEntries = [
            {
              id: makeId(),
              date: String(x.date || todayStr()).slice(0, 10),
              amount: received,
              bankAccountId: bid,
            },
          ];
        }
      } else if (paymentEntries.length > 0) {
        received = roundMoney2(paymentEntries.reduce((s, p) => s + num(p.amount), 0));
      }
      const lineItems = normSaleLineItems(x.lineItems, x);
      /* Keep the legacy single-line fields populated from the FIRST line so older
       * readers (printable invoice, list subtitle, recent-activity widget) keep
       * working without changes. New multi-line UIs should consume `lineItems`. */
      const firstLine = lineItems[0] || null;
      const legacyItem = firstLine ? String(firstLine.item || "") : String(x.item || "");
      const legacyQty = firstLine ? num(firstLine.qty) : num(x.qty);
      const legacySalePrice = firstLine ? num(firstLine.salePrice) : num(x.salePrice);
      const legacyCostPrice = firstLine ? num(firstLine.costPrice) : num(x.costPrice);
      /* Prefer stored totals when present; otherwise derive from line items so old
       * imports without explicit totals still net-out correctly. */
      const totalsFromLines = sumSaleLineItems(lineItems);
      const discount = roundMoney2(Math.max(0, num(x.discount)));
      const additionalCharges = roundMoney2(Math.max(0, num(x.additionalCharges)));
      const fromLines = roundMoney2(
        Math.max(0, totalsFromLines.totalSale - discount + additionalCharges),
      );
      const fromStored = roundMoney2(Math.max(0, num(x.totalSale) - discount + additionalCharges));
      const totalSale = totalsFromLines.totalSale > 0 ? fromLines : fromStored > 0 ? fromStored : fromLines;
      const totalCost = totalsFromLines.totalCost > 0 ? totalsFromLines.totalCost : num(x.totalCost);
      const grossProfit = roundMoney2(totalSale - totalCost);
      const outstanding = roundMoney2(Math.max(0, totalSale - received));
      return {
        ...x,
        docType: normalizeSaleDocType(x.docType),
        id: String(x.id || makeId()),
        date: String(x.date || todayStr()).slice(0, 10),
        dueDate: x.dueDate ? String(x.dueDate).slice(0, 10) : "",
        invoiceNo: String(x.invoiceNo || ""),
        linkedSaleId: String(x.linkedSaleId || "").trim(),
        linkedInvoiceNo: String(x.linkedInvoiceNo || "").trim(),
        customerName: String(x.customerName || ""),
        customerAddress: String(x.customerAddress || ""),
        customerCity: String(x.customerCity || ""),
        customerState: String(x.customerState || ""),
        customerPincode: String(x.customerPincode || ""),
        customerGstin: String(x.customerGstin || "").trim().toUpperCase(),
        reverseCharge: x.reverseCharge === true,
        invoiceCopyType: ["duplicate", "triplicate"].includes(String(x.invoiceCopyType || "").toLowerCase())
          ? String(x.invoiceCopyType).toLowerCase()
          : "original",
        item: legacyItem,
        qty: legacyQty,
        salePrice: legacySalePrice,
        costPrice: legacyCostPrice,
        lineItems,
        discount,
        additionalCharges,
        totalSale,
        totalCost,
        grossProfit,
        received,
        outstanding,
        paymentEntries,
        bundleId: String(x.bundleId || "").trim(),
      };
    });
}

export function normExpensesList(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x) => x && typeof x === "object")
    .map((x) => ({
      ...x,
      id: String(x.id || makeId()),
      date: String(x.date || todayStr()).slice(0, 10),
      amount: num(x.amount),
      category: String(x.category || "Other"),
      description: String(x.description || ""),
      note: String(x.note || ""),
      bankAccountId: String(x.bankAccountId || "").trim(),
    }));
}

export function normOtherIncomesList(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x) => x && typeof x === "object")
    .map((x) => ({
      ...x,
      id: String(x.id || makeId()),
      date: String(x.date || todayStr()).slice(0, 10),
      amount: num(x.amount),
      category: String(x.category || "Other"),
      description: String(x.description || ""),
      note: String(x.note || ""),
      bankAccountId: String(x.bankAccountId || "").trim(),
    }));
}

export function normBranchesList(raw) {
  const arr = Array.isArray(raw) ? raw : [];
  const list = arr
    .filter((b) => b && typeof b === "object")
    .map((b) => ({
      id: String(b.id || makeId()),
      name: String(b.name || "").trim() || "Branch",
    }));
  if (!list.length) return [{ id: BRANCH_MAIN_ID, name: "Main" }];
  return list;
}

/** Branch for an inventory line: stored id, or legacy empty → first branch in settings. */
export function effectiveEntryBranchId(entry, branches) {
  const bid = String(entry?.branchId || "").trim();
  if (bid) return bid;
  const list = normBranchesList(branches);
  return list[0]?.id || BRANCH_MAIN_ID;
}

export function getDefaultBranchId(branches) {
  const list = normBranchesList(branches);
  return list[0]?.id || BRANCH_MAIN_ID;
}

/** Normalize item names for matching (trim, collapse spaces, lowercase). */
export function normalizeItemKey(name) {
  return String(name ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/** Find inventory row by display name or pick key (case/space insensitive). */
export function findInvRowByItemName(rows, name) {
  const key = normalizeItemKey(name);
  if (!key) return null;
  for (const r of Array.isArray(rows) ? rows : []) {
    if (!r || typeof r !== "object") continue;
    if (normalizeItemKey(r.item) === key) return r;
  }
  return null;
}

function inventoryItemMatchesKey(item, oldKey) {
  return normalizeItemKey(item) === oldKey;
}

/** Rename a stock product everywhere it appears (entries, sales lines, bundles, purchase lines). */
export function renameInventoryProductInState(state, oldItemKey, newNameRaw) {
  if (!state || typeof state !== "object") return state;
  const oldKey = normalizeItemKey(oldItemKey);
  const newName = String(newNameRaw || "")
    .trim()
    .replace(/\s+/g, " ");
  if (!oldKey || !newName) return state;
  if (normalizeItemKey(newName) === oldKey) return state;

  const match = (item) => inventoryItemMatchesKey(item, oldKey);

  const inventoryEntries = (state.inventoryEntries || []).map((e) =>
    e && match(e.item) ? { ...e, item: newName } : e,
  );

  const sales = (state.sales || []).map((s) => {
    if (!s || typeof s !== "object") return s;
    const lineItems = Array.isArray(s.lineItems)
      ? s.lineItems.map((li) => (li && match(li.item) ? { ...li, item: newName } : li))
      : s.lineItems;
    let item = match(s.item) ? newName : s.item;
    if (Array.isArray(lineItems) && lineItems.length > 0) {
      item = lineItems[0].item ?? item;
    }
    return { ...s, lineItems, item };
  });

  const bundles = (state.bundles || []).map((b) => {
    if (!b || typeof b !== "object") return b;
    const lines = (b.lines || []).map((l) => (l && match(l.item) ? { ...l, item: newName } : l));
    return { ...b, lines };
  });

  const purchases = (state.purchases || []).map((p) => {
    if (!p || typeof p !== "object") return p;
    const lines = (p.lines || []).map((l) => (l && match(l.item) ? { ...l, item: newName } : l));
    return { ...p, lines };
  });

  return { ...state, inventoryEntries, sales, bundles, purchases };
}

/** Stock rows for one branch only (for Branch page). */
export function computeInvRowsForBranch(entries, branchId, branches) {
  const bid = String(branchId || "").trim() || getDefaultBranchId(branches);
  const map = {};
  for (const e of entries || []) {
    if (!e || typeof e !== "object") continue;
    if (effectiveEntryBranchId(e, branches) !== bid) continue;
    const key = (e.item || "").toLowerCase();
    if (!key) continue;
    if (!map[key]) map[key] = { item: e.item, qtyIn: 0, qtyOut: 0, totalCost: 0, salesPrice: 0, category: "", hsn: "", gstRate: 0 };
    const cat = String(e.category || "").trim();
    if (cat && !map[key].category) map[key].category = cat;
    const hsn = String(e.hsn || "").trim();
    if (hsn && !map[key].hsn) map[key].hsn = hsn;
    if (num(e.gstRate) > 0 && !map[key].gstRate) map[key].gstRate = num(e.gstRate);
    const isIn = !e.type || e.type === "in" || e.type === "opening";
    const qty = num(e.qty ?? e.qtyIn);
    if (isIn) {
      map[key].qtyIn += qty;
      map[key].totalCost += qty * num(e.costPerUnit);
      if (e.salesPrice) map[key].salesPrice = num(e.salesPrice);
    } else {
      map[key].qtyOut += qty;
    }
  }
  return Object.values(map)
    .map((r) => {
      const avgCost = r.qtyIn ? roundMoney2(r.totalCost / r.qtyIn) : 0;
      const currentQty = r.qtyIn - r.qtyOut;
      const stockValue = roundMoney2(Math.max(0, currentQty) * avgCost);
      return { ...r, salesPrice: roundMoney2(r.salesPrice), avgCost, currentQty, stockValue };
    })
    .sort((a, b) => a.item.localeCompare(b.item));
}

/** All branches combined — same aggregation as per-branch, without filtering by branch. */
export function computeInvRowsAggregated(entries) {
  const map = {};
  for (const e of entries || []) {
    if (!e || typeof e !== "object") continue;
    const key = (e.item || "").toLowerCase();
    if (!key) continue;
    if (!map[key]) map[key] = { item: e.item, qtyIn: 0, qtyOut: 0, totalCost: 0, salesPrice: 0, category: "", hsn: "", gstRate: 0 };
    const cat = String(e.category || "").trim();
    if (cat && !map[key].category) map[key].category = cat;
    const hsn = String(e.hsn || "").trim();
    if (hsn && !map[key].hsn) map[key].hsn = hsn;
    if (num(e.gstRate) > 0 && !map[key].gstRate) map[key].gstRate = num(e.gstRate);
    const isIn = !e.type || e.type === "in" || e.type === "opening";
    const qty = num(e.qty ?? e.qtyIn);
    if (isIn) {
      map[key].qtyIn += qty;
      map[key].totalCost += qty * num(e.costPerUnit);
      if (e.salesPrice) map[key].salesPrice = num(e.salesPrice);
    } else {
      map[key].qtyOut += qty;
    }
  }
  return Object.values(map)
    .map((r) => {
      const avgCost = r.qtyIn ? roundMoney2(r.totalCost / r.qtyIn) : 0;
      const currentQty = r.qtyIn - r.qtyOut;
      const stockValue = roundMoney2(Math.max(0, currentQty) * avgCost);
      return { ...r, salesPrice: roundMoney2(r.salesPrice), avgCost, currentQty, stockValue };
    })
    .sort((a, b) => a.item.localeCompare(b.item));
}

export function normInventoryList(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x) => x && typeof x === "object")
    .map((x) => {
      const purchaseId = String(x.purchaseId || "").trim();
      return {
        ...x,
        id: String(x.id || makeId()),
        date: String(x.date || todayStr()).slice(0, 10),
        item: String(x.item || "").trim(),
        type: x.type === "out" ? "out" : x.type === "opening" ? "opening" : "in",
        qty: num(x.qty),
        qtyIn: num(x.qtyIn),
        costPerUnit: num(x.costPerUnit),
        salesPrice: num(x.salesPrice),
        note: String(x.note || ""),
        category: String(x.category || "").trim(),
        hsn: String(x.hsn || "").trim(),
        gstRate: num(x.gstRate),
        bankAccountId: purchaseId ? "" : String(x.bankAccountId || "").trim(),
        branchId: String(x.branchId || "").trim(),
        purchaseId,
        saleId: String(x.saleId || "").trim(),
      };
    })
    .filter((x) => x.item);
}

export function normEmiPaidDates(raw) {
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.filter(Boolean).map((d) => String(d).slice(0, 10)))].sort();
}

/** Whether this scheduled EMI due date is marked paid (installment tracking). */
export function isEmiDuePaid(emi, dateStr) {
  const d = String(dateStr || "").slice(0, 10);
  if (!d) return false;
  return normEmiPaidDates(emi.paidDueDates).includes(d);
}

export function normEmiList(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x) => x && typeof x === "object")
    .map((x) => {
      const dueDates = Array.isArray(x.dueDates) ? x.dueDates.filter(Boolean).map((d) => String(d).slice(0, 10)) : [];
      const paidDueDates = normEmiPaidDates(x.paidDueDates);
      const paidSet = new Set(paidDueDates);
      const totalInstallments = dueDates.length;
      const isClosed = totalInstallments > 0 && dueDates.every((d) => paidSet.has(d));
      return {
        ...x,
        id: String(x.id || makeId()),
        invoiceNo: String(x.invoiceNo || ""),
        customerName: String(x.customerName || ""),
        financeCompany: String(x.financeCompany || ""),
        doNo: String(x.doNo || ""),
        loanAmount: num(x.loanAmount),
        downPayment: num(x.downPayment),
        emiAmount: num(x.emiAmount),
        dueDates,
        paidDueDates,
        totalInstallments,
        isClosed,
      };
    })
    .filter((x) => x.invoiceNo);
}

/** Form defaults for money you lent to others (tracked as a receivable on the balance sheet). */
export function emptyLoanGivenForm() {
  return {
    borrowerName: "",
    phone: "",
    principal: "",
    principalRepaid: "",
    interestRateMonthlyPct: "",
    interestOutstanding: "",
    description: "",
    dateGiven: todayStr(),
    dueDate: "",
    closed: false,
    trackOnBalanceSheet: false,
    disbursementBankAccountId: "",
    disbursementDate: "",
    disbursementAmount: "",
    repaymentEntries: [],
    partners: [],
  };
}

/** Partner contribution amount (₹ given toward the loan). */
export function loanGivenPartnerAmountGiven(partner) {
  if (!partner || typeof partner !== "object") return 0;
  return Math.max(0, num(partner.amountGiven ?? partner.amount ?? partner.shareValue ?? partner.shareAmount));
}

/** % of loan principal from amount given (reference only — not interest share). */
export function loanGivenPartnerCapitalPercent(amountGiven, loanPrincipal) {
  const principal = Math.max(0, num(loanPrincipal));
  const given = Math.max(0, num(amountGiven));
  if (!(principal > 0) || !(given > 0)) return 0;
  return roundMoney2((given / principal) * 100);
}

/** % of loan principal per month this partner earns as interest (independent of amount they put in). */
export function loanGivenPartnerInterestSharePct(partner) {
  if (!partner || typeof partner !== "object") return 0;
  return Math.min(100, Math.max(0, num(partner.interestSharePct)));
}

/**
 * How partner interest % is interpreted.
 * - `principalMonthly` (default): % of loan principal per month (new behaviour).
 * - `legacyPool`: % of borrower interest pool (pre-v4.4 partner split) — auto-detected on load.
 */
export function inferLoanGivenPartnersInterestBasis(partners, explicit) {
  if (explicit === "principalMonthly" || explicit === "legacyPool") return explicit;
  const list = Array.isArray(partners) ? partners : [];
  if (!list.length) return "principalMonthly";
  const sum = sumLoanGivenPartnersInterestSharePct(list);
  if (sum > 25) return "legacyPool";
  if (list.length > 1 && sum >= 99) return "legacyPool";
  return "principalMonthly";
}

export function loanGivenUsesLegacyPartnerInterestPool(loan) {
  return loan?.partnersInterestBasis === "legacyPool";
}

export function loanGivenPartnerPrincipalBase(loan) {
  if (!loan || typeof loan !== "object") return 0;
  const out = num(loan.principalOutstanding);
  if (out > 0) return out;
  return Math.max(0, num(loan.principal));
}

/** Monthly interest for this partner (or legacy pool share of one month of borrower interest). */
export function loanGivenPartnerMonthlyInterestOnPrincipal(partner, loan, asOfStr) {
  const pct = loanGivenPartnerInterestSharePct(partner);
  if (!(pct > 0)) return 0;
  if (loanGivenUsesLegacyPartnerInterestPool(loan)) {
    const est = loanGivenEstimatedSimpleInterest(loan, asOfStr || todayStr());
    if (!(est > 0)) return 0;
    const days = loanGivenDaysOnBook(loan, asOfStr || todayStr());
    const oneMonth = days > 0 ? roundMoney2(est * (30 / days)) : est;
    return loanGivenPartnerInterestShareAmount(partner, oneMonth);
  }
  const principal = loanGivenPartnerPrincipalBase(loan);
  if (!(principal > 0)) return 0;
  return roundMoney2(principal * (pct / 100));
}

/** Accrued to date: monthly amount × (days on book ÷ 30), or legacy % of accrued borrower interest. */
export function loanGivenPartnerAccruedInterestOnPrincipal(partner, loan, asOfStr) {
  const pct = loanGivenPartnerInterestSharePct(partner);
  if (!(pct > 0)) return 0;
  if (loanGivenUsesLegacyPartnerInterestPool(loan)) {
    const est = loanGivenEstimatedSimpleInterest(loan, asOfStr);
    return loanGivenPartnerInterestShareAmount(partner, est);
  }
  const monthly = loanGivenPartnerMonthlyInterestOnPrincipal(partner, loan, asOfStr);
  if (!(monthly > 0)) return 0;
  const days = loanGivenDaysOnBook(loan, asOfStr);
  return roundMoney2(monthly * (days / 30));
}

/** Split collected/books interest by partner share (proportional monthly or legacy % of pool). */
export function loanGivenPartnerShareOfInterestPool(partner, partners, loan, poolAmount) {
  const pool = Math.max(0, num(poolAmount));
  if (!(pool > 0)) return 0;
  if (loanGivenUsesLegacyPartnerInterestPool(loan)) {
    return loanGivenPartnerInterestShareAmount(partner, pool);
  }
  const list = Array.isArray(partners) ? partners : [];
  let sumMonthly = 0;
  for (const p of list) sumMonthly += loanGivenPartnerMonthlyInterestOnPrincipal(p, loan);
  const mine = loanGivenPartnerMonthlyInterestOnPrincipal(partner, loan);
  if (!(mine > 0) || !(sumMonthly > 0)) return 0;
  return roundMoney2(pool * (mine / sumMonthly));
}

/** @deprecated Use loanGivenPartnerShareOfInterestPool — kept for callers passing a single pool. */
export function loanGivenPartnerInterestShareAmount(partner, totalInterest) {
  const pct = loanGivenPartnerInterestSharePct(partner);
  if (!(pct > 0)) return 0;
  return roundMoney2(Math.max(0, num(totalInterest)) * (pct / 100));
}

/** Normalize partners: amount given + interest share % (each independent). */
export function normLoanGivenPartners(raw, loanPrincipal) {
  if (!Array.isArray(raw)) return [];
  const principal = Math.max(0, num(loanPrincipal));
  return raw
    .filter((x) => x && typeof x === "object")
    .map((x) => {
      let amountGiven;
      if (x.shareKind === "percent" && principal > 0 && x.interestSharePct == null && x.sharePercent != null) {
        const pct = Math.min(100, Math.max(0, num(x.shareValue ?? x.sharePercent ?? x.percent)));
        amountGiven = roundMoney2(principal * (pct / 100));
      } else {
        const rawAmt = num(x.amountGiven ?? x.amount ?? x.shareValue ?? x.shareAmount);
        amountGiven =
          principal > 0 ? roundMoney2(Math.min(principal, Math.max(0, rawAmt))) : roundMoney2(Math.max(0, rawAmt));
      }
      const id = String(x.id || makeId());
      const name = String(x.name || "").trim();
      const interestSharePct = Math.min(100, Math.max(0, num(x.interestSharePct)));
      const capitalPercent = loanGivenPartnerCapitalPercent(amountGiven, principal);
      return {
        id,
        name,
        amountGiven,
        amount: amountGiven,
        interestSharePct,
        capitalPercent,
        principalShare: amountGiven,
      };
    })
    .filter((x) => x.name && (x.amountGiven > 0 || x.interestSharePct > 0));
}

export function sumLoanGivenPartnersPrincipal(partners) {
  return roundMoney2(
    (Array.isArray(partners) ? partners : []).reduce((s, p) => s + loanGivenPartnerAmountGiven(p), 0),
  );
}

export function sumLoanGivenPartnersInterestSharePct(partners) {
  return roundMoney2(
    (Array.isArray(partners) ? partners : []).reduce((s, p) => s + loanGivenPartnerInterestSharePct(p), 0),
  );
}

/** Interest pools to split by partner % (collected cash, books, simple estimate). */
export function loanGivenPartnerInterestBases(loan, asOfStr) {
  if (!loan || typeof loan !== "object") return { collected: 0, books: 0, estimate: 0 };
  const collected = Math.max(0, loanGivenInterestCollected(loan));
  const books = loan.closed === true ? 0 : Math.max(0, num(loan.interestOutstanding));
  const estimate = loan.closed === true ? 0 : Math.max(0, loanGivenEstimatedSimpleInterest(loan, asOfStr));
  return { collected, books, estimate };
}

/** Split interest collected across partners by each partner's interestSharePct. */
export function loanGivenPartnerInterestAllocations(loan) {
  if (!loan || typeof loan !== "object") return [];
  const partners = Array.isArray(loan.partners) ? loan.partners : [];
  const totalInterest = loanGivenInterestCollected(loan);
  if (!(totalInterest > 0) || partners.length === 0) return [];
  return partners.map((p) => ({
    partner: p,
    interestSharePct: loanGivenPartnerInterestSharePct(p),
    amount: loanGivenPartnerShareOfInterestPool(p, partners, loan, totalInterest),
  }));
}

/**
 * Normalize repayment lines. Rows with positive amount are kept (even without a bank) so totals and
 * interest-first allocation stay in sync; Banking / cash flow only include lines with `bankAccountId`.
 */
export function normLoanRepaymentEntries(raw, loanId) {
  if (!Array.isArray(raw)) return [];
  const lid = String(loanId || "");
  return raw
    .filter((x) => x && typeof x === "object")
    .map((x) => ({
      id: String(x.id || makeId()),
      loanId: lid,
      date: String(x.date || todayStr()).slice(0, 10),
      amount: Math.max(0, num(x.amount)),
      bankAccountId: String(x.bankAccountId || "").trim(),
      paymentKind: x.paymentKind === "principal" ? "principal" : x.paymentKind === "interest" ? "interest" : "",
    }))
    .filter((x) => x.amount > 0);
}

/** True when the repayment log uses typed interest / principal lines. */
export function loanGivenHasTypedRepaymentEntries(loan) {
  const entries = Array.isArray(loan?.repaymentEntries) ? loan.repaymentEntries : [];
  return entries.some(
    (r) => r && typeof r === "object" && (r.paymentKind === "interest" || r.paymentKind === "principal"),
  );
}

/**
 * Gross interest booked before typed interest payments (stored outstanding + interest paid).
 * When nothing is in books yet, seeds from simple estimated accrued when the loan has a rate.
 */
export function loanGivenInterestBookedBaseline(loan, asOfStr) {
  if (!loan || typeof loan !== "object") return 0;
  const interestPaid = sumLoanRepaymentEntriesAmountByKind(loan, "interest");
  const fromStored = roundMoney2(Math.max(0, num(loan.interestOutstanding)) + interestPaid);
  if (fromStored > 0) return fromStored;
  if (loan.closed === true) return 0;
  const rate = loanGivenMonthlyRatePct(loan);
  if (!(rate > 0)) return 0;
  const cap = Math.max(0, num(loan.principal));
  const pr = Math.min(cap, Math.max(0, num(loan.principalRepaid)));
  const principalOutstanding = Math.max(0, cap - pr);
  const loanForEst =
    principalOutstanding !== num(loan.principalOutstanding) ? { ...loan, principalOutstanding } : loan;
  return Math.max(0, loanGivenEstimatedSimpleInterest(loanForEst, asOfStr || todayStr()));
}

/** Interest due in books after typed interest payments (baseline − interest paid). */
export function loanGivenInterestOutstandingReconciled(loan, asOfStr) {
  if (!loan || typeof loan !== "object" || loan.closed === true) return 0;
  if (!loanGivenHasTypedRepaymentEntries(loan)) {
    const stored = Math.max(0, num(loan.interestOutstanding));
    if (stored > 0) return stored;
    if (loanGivenMonthlyRatePct(loan) > 0) {
      return loanGivenInterestBookedBaseline(loan, asOfStr);
    }
    return 0;
  }
  const baseline = loanGivenInterestBookedBaseline(loan, asOfStr);
  const paid = sumLoanRepaymentEntriesAmountByKind(loan, "interest");
  return roundMoney2(Math.max(0, baseline - paid));
}

/**
 * Sync principal repaid, interest due in books, and settled flag from typed repayment entries.
 * `interestOutstandingForm` = value from the loan form field (current books due after payments).
 */
export function reconcileLoanGivenRepayments(loan, opts = {}) {
  if (!loan || typeof loan !== "object") return loan;
  const cap = Math.max(0, num(loan.principal));
  const id = String(loan.id || "");
  const repaymentEntries = normLoanRepaymentEntries(loan.repaymentEntries, id);
  const draft = { ...loan, repaymentEntries };

  if (!loanGivenHasTypedRepaymentEntries(draft)) {
    const principalRepaid = Math.min(cap, Math.max(0, num(loan.principalRepaid)));
    const interestOutstanding = loan.closed === true ? 0 : Math.max(0, num(loan.interestOutstanding));
    return { ...loan, repaymentEntries, principalRepaid, interestOutstanding, closed: loan.closed === true };
  }

  const asOf = String(opts.asOfStr || todayStr()).slice(0, 10);
  const interestPaid = sumLoanRepaymentEntriesAmountByKind(draft, "interest");
  const principalRepaid = roundMoney2(
    Math.min(cap, sumLoanRepaymentEntriesAmountByKind(draft, "principal")),
  );

  let baseline;
  if (opts.interestOutstandingForm != null && String(opts.interestOutstandingForm).trim() !== "") {
    baseline = roundMoney2(Math.max(0, num(opts.interestOutstandingForm)) + interestPaid);
  } else {
    baseline = loanGivenInterestBookedBaseline(draft, asOf);
  }

  let interestOutstanding = roundMoney2(Math.max(0, baseline - interestPaid));
  let closed = loan.closed === true;
  if (!closed) {
    closed = cap > 0 && principalRepaid >= cap && interestOutstanding <= 0;
  }
  if (closed) interestOutstanding = 0;

  return {
    ...loan,
    repaymentEntries,
    principalRepaid,
    interestOutstanding,
    closed,
  };
}

/**
 * Apply a borrower repayment as interest-only or principal-only (no banking link).
 * Returns patched loan fields before normLoansGivenList.
 */
export function applyLoanGivenTypedPayment(loan, { amount, date, kind }) {
  if (!loan || typeof loan !== "object") return null;
  const pay = roundMoney2(Math.max(0, num(amount)));
  if (!(pay > 0)) return null;
  const payKind = kind === "principal" ? "principal" : "interest";
  const payDate = String(date || todayStr()).slice(0, 10);
  const newEntry = {
    id: makeId(),
    loanId: String(loan.id || ""),
    date: payDate,
    amount: pay,
    bankAccountId: "",
    paymentKind: payKind,
  };
  const repaymentEntries = [...(Array.isArray(loan.repaymentEntries) ? loan.repaymentEntries : []), newEntry];
  const cap = Math.max(0, num(loan.principal));

  if (payKind === "interest") {
    const owed = loanGivenInterestOutstandingReconciled(loan, payDate);
    const interestOutstanding = roundMoney2(Math.max(0, owed - pay));
    const principalRepaid = roundMoney2(Math.min(cap, Math.max(0, num(loan.principalRepaid))));
    const closed =
      loan.closed === true || (cap > 0 && principalRepaid >= cap && interestOutstanding <= 0);
    return {
      ...loan,
      repaymentEntries,
      principalRepaid,
      interestOutstanding,
      closed,
    };
  }

  const prevPR = Math.min(cap, Math.max(0, num(loan.principalRepaid)));
  const principalRepaid = roundMoney2(Math.min(cap, prevPR + pay));
  const interestOutstanding = loanGivenInterestOutstandingReconciled(
    { ...loan, repaymentEntries },
    payDate,
  );
  const closed =
    loan.closed === true || (cap > 0 && principalRepaid >= cap && interestOutstanding <= 0);
  return {
    ...loan,
    repaymentEntries,
    principalRepaid,
    interestOutstanding,
    closed,
  };
}

/**
 * Delete one repayment entry and re-sync books / principal from typed payment lines.
 */
export function deleteLoanGivenRepaymentEntry(loan, repaymentId) {
  if (!loan || typeof loan !== "object") return null;
  const rid = String(repaymentId || "").trim();
  if (!rid) return null;
  const prev = Array.isArray(loan.repaymentEntries) ? loan.repaymentEntries : [];
  const target = prev.find((r) => r && String(r.id || "") === rid) || null;
  if (!target) return null;
  const repaymentEntries = prev.filter((r) => !(r && String(r.id || "") === rid));
  const amt = roundMoney2(Math.max(0, num(target.amount)));
  const cap = Math.max(0, num(loan.principal));
  const patch = { repaymentEntries };

  if (target.paymentKind === "interest") {
    patch.interestOutstanding = roundMoney2(Math.max(0, num(loan.interestOutstanding)) + amt);
  } else if (target.paymentKind === "principal") {
    patch.principalRepaid = roundMoney2(Math.max(0, num(loan.principalRepaid) - amt));
  }

  const synced = reconcileLoanGivenRepayments({ ...loan, ...patch });
  if (target.paymentKind === "principal") {
    synced.principalRepaid = roundMoney2(Math.min(cap, Math.max(0, num(loan.principalRepaid) - amt)));
  }
  return synced;
}

/** Reset days-on-book counter by moving the loan start date to today (or a chosen date). */
export function resetLoanGivenTimer(loan, asOfStr) {
  if (!loan || typeof loan !== "object") return null;
  const d = String(asOfStr || todayStr()).slice(0, 10);
  return { ...loan, dateGiven: d, closed: false };
}

/**
 * Aggregate all partners across loans for the Partners directory screen.
 * @returns {Array<{ key: string, name: string, totalAmountGiven: number, totalAccruedInterest: number, totalCollectedShare: number, totalBooksShare: number, loans: object[] }>}
 */
export function buildLoanPartnersDirectory(loansGiven, asOfStr) {
  const asOf = String(asOfStr || todayStr()).slice(0, 10);
  const map = new Map();
  for (const loan of Array.isArray(loansGiven) ? loansGiven : []) {
    if (!loan || typeof loan !== "object") continue;
    const partners = Array.isArray(loan.partners) ? loan.partners : [];
    if (!partners.length) continue;
    const bases = loanGivenPartnerInterestBases(loan, asOf);
    for (const p of partners) {
      const name = String(p.name || "").trim();
      if (!name) continue;
      const key = name.toLowerCase();
      let row = map.get(key);
      if (!row) {
        row = {
          key,
          name,
          totalAmountGiven: 0,
          totalAccruedInterest: 0,
          totalCollectedShare: 0,
          totalBooksShare: 0,
          loans: [],
        };
        map.set(key, row);
      }
      row.name = name;
      const given = loanGivenPartnerAmountGiven(p);
      const intPct = loanGivenPartnerInterestSharePct(p);
      const accrued = intPct > 0 ? loanGivenPartnerAccruedInterestOnPrincipal(p, loan, asOf) : 0;
      const collected = intPct > 0 ? loanGivenPartnerShareOfInterestPool(p, partners, loan, bases.collected) : 0;
      const books = intPct > 0 ? loanGivenPartnerShareOfInterestPool(p, partners, loan, bases.books) : 0;
      const monthly = intPct > 0 ? loanGivenPartnerMonthlyInterestOnPrincipal(p, loan, asOf) : 0;
      row.totalAmountGiven = roundMoney2(row.totalAmountGiven + given);
      row.totalAccruedInterest = roundMoney2(row.totalAccruedInterest + accrued);
      row.totalCollectedShare = roundMoney2(row.totalCollectedShare + collected);
      row.totalBooksShare = roundMoney2(row.totalBooksShare + books);
      row.loans.push({
        loanId: String(loan.id || ""),
        borrowerName: String(loan.borrowerName || "").trim(),
        closed: loan.closed === true,
        amountGiven: given,
        interestSharePct: intPct,
        monthlyInterest: monthly,
        accruedInterest: accrued,
        collectedShare: collected,
        booksShare: books,
        loanPrincipal: num(loan.principal),
        dateGiven: String(loan.dateGiven || "").slice(0, 10),
      });
    }
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
}

/** Look up one partner row from the directory by normalized name key. */
export function findLoanPartnerInDirectory(loansGiven, partnerKey, asOfStr) {
  const key = String(partnerKey || "").trim().toLowerCase();
  if (!key) return null;
  return buildLoanPartnersDirectory(loansGiven, asOfStr).find((p) => p.key === key) ?? null;
}

/** Stable key for a borrower (party) across loans — grouped by name (case-insensitive). */
export function loanGivenPartyKey(loan) {
  const name = String(loan?.borrowerName || "").trim();
  if (!name) return "";
  return `lp:${name.toLowerCase()}`;
}

/** Normalize party key from UI or legacy `name|phone` keys. */
export function normalizeLoanPartyKey(partyKey) {
  const k = String(partyKey || "").trim();
  if (!k) return "";
  if (k.startsWith("lp:")) return k.split("|")[0];
  return `lp:${k.toLowerCase()}`;
}

/**
 * Aggregate all borrowers across loans for the Partys directory screen.
 * @returns {Array<{ key: string, name: string, phone: string, totalPrincipal: number, totalPrincipalRepaid: number, totalPrincipalOpen: number, totalOutstanding: number, totalInterestBooks: number, totalEstInterest: number, totalInterestCollected: number, openCount: number, loans: object[] }>}
 */
export function buildLoanPartysDirectory(loansGiven, asOfStr) {
  const asOf = String(asOfStr || todayStr()).slice(0, 10);
  const map = new Map();
  const list = [...(Array.isArray(loansGiven) ? loansGiven : [])]
    .filter((l) => l && typeof l === "object" && String(l.borrowerName || "").trim())
    .sort((a, b) => String(b.dateGiven || "").localeCompare(String(a.dateGiven || "")));
  for (const loan of list) {
    const name = String(loan.borrowerName || "").trim();
    const key = loanGivenPartyKey(loan);
    if (!key) continue;
    let row = map.get(key);
    if (!row) {
      row = {
        key,
        name,
        phone: "",
        totalPrincipal: 0,
        totalPrincipalRepaid: 0,
        totalPrincipalOpen: 0,
        totalOutstanding: 0,
        totalInterestBooks: 0,
        totalEstInterest: 0,
        totalInterestCollected: 0,
        openCount: 0,
        loans: [],
      };
      map.set(key, row);
    }
    row.name = name;
    const phone = String(loan.phone || "").trim();
    if (phone && !row.phone) row.phone = phone;
    const principal = num(loan.principal);
    const principalRepaid = num(loan.principalRepaid);
    const principalOutstanding = num(loan.principalOutstanding);
    const closed = loan.closed === true;
    const interestBooks = closed ? 0 : loanGivenInterestOutstandingReconciled(loan, asOf);
    const outstanding = loanGivenEconomicOutstanding(loan, asOf);
    const estInterest = closed ? 0 : Math.max(0, loanGivenEstimatedSimpleInterest(loan, asOf));
    const monthlyInterest = closed ? 0 : loanGivenMonthlyInterestOnOutstanding(loan);
    const interestCollected = loanGivenInterestCollected(loan);
    row.totalPrincipal = roundMoney2(row.totalPrincipal + principal);
    row.totalPrincipalRepaid = roundMoney2(row.totalPrincipalRepaid + principalRepaid);
    row.totalInterestCollected = roundMoney2(row.totalInterestCollected + interestCollected);
    if (!closed) {
      row.totalPrincipalOpen = roundMoney2(row.totalPrincipalOpen + Math.max(0, principalOutstanding));
      row.totalOutstanding = roundMoney2(row.totalOutstanding + outstanding);
      row.totalInterestBooks = roundMoney2(row.totalInterestBooks + interestBooks);
      row.totalEstInterest = roundMoney2(row.totalEstInterest + estInterest);
      row.openCount += 1;
    }
    row.loans.push({
      loanId: String(loan.id || ""),
      closed,
      principal,
      principalRepaid,
      principalOutstanding,
      outstanding,
      interestBooks,
      estInterest,
      monthlyInterest,
      interestCollected,
      dateGiven: String(loan.dateGiven || "").slice(0, 10),
      interestRateMonthlyPct: loanGivenMonthlyRatePct(loan),
      description: String(loan.description || "").trim(),
    });
  }
  for (const row of map.values()) {
    row.loans.sort((a, b) => String(b.dateGiven || "").localeCompare(String(a.dateGiven || "")));
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
}

/** Look up one party row from the directory by key. */
export function findLoanPartyInDirectory(loansGiven, partyKey, asOfStr) {
  const key = normalizeLoanPartyKey(partyKey);
  if (!key) return null;
  return buildLoanPartysDirectory(loansGiven, asOfStr).find((p) => p.key === key) ?? null;
}

/** One row per borrower name from past loans; newest loan wins for phone. */
export function buildLoanPartyPickerRows(loansGiven) {
  const list = Array.isArray(loansGiven) ? loansGiven : [];
  const seen = new Set();
  const rows = [];
  const byDate = [...list]
    .filter((l) => l && String(l.borrowerName || "").trim())
    .sort((a, b) => String(b.dateGiven || "").localeCompare(String(a.dateGiven || "")));
  for (const l of byDate) {
    const displayName = String(l.borrowerName || "").trim();
    const key = loanGivenPartyKey(l);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    rows.push({
      id: key,
      displayName,
      phone: String(l.phone || "").trim(),
    });
  }
  rows.sort((a, b) => a.displayName.localeCompare(b.displayName, undefined, { sensitivity: "base" }));
  return rows;
}

/** One row per partner name from past loans; newest usage wins (includes last amount / rate). */
export function buildLoanPartnerPickerRows(loansGiven) {
  const list = Array.isArray(loansGiven) ? loansGiven : [];
  const seen = new Set();
  const rows = [];
  const byDate = [...list]
    .filter((l) => l && Array.isArray(l.partners) && l.partners.length)
    .sort((a, b) => String(b.dateGiven || "").localeCompare(String(a.dateGiven || "")));
  for (const l of byDate) {
    const partners = Array.isArray(l.partners) ? l.partners : [];
    for (const p of partners) {
      const displayName = String(p.name || "").trim();
      if (!displayName) continue;
      const key = displayName.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      const amountGiven = loanGivenPartnerAmountGiven(p);
      const interestSharePct = loanGivenPartnerInterestSharePct(p);
      rows.push({
        id: key,
        displayName,
        amountGiven: amountGiven > 0 ? String(amountGiven) : "",
        interestSharePct: interestSharePct > 0 ? String(interestSharePct) : "",
      });
    }
  }
  rows.sort((a, b) => a.displayName.localeCompare(b.displayName, undefined, { sensitivity: "base" }));
  return rows;
}

/** When false, loan is omitted from balance sheet / net worth loan line (default: on). */
export function loanGivenTrackOnBalanceSheet(row) {
  if (!row || typeof row !== "object") return true;
  return row.trackOnBalanceSheet !== false;
}

/** Principal still owed (typed principal payments reduce this). */
export function loanGivenPrincipalOutstandingCalc(row) {
  if (!row || typeof row !== "object" || row.closed === true) return 0;
  const cap = Math.max(0, num(row.principal));
  if (loanGivenHasTypedRepaymentEntries(row)) {
    const pr = Math.min(cap, sumLoanRepaymentEntriesAmountByKind(row, "principal"));
    return Math.max(0, cap - pr);
  }
  const stored = num(row.principalOutstanding);
  if (stored > 0) return stored;
  const pr = Math.min(cap, Math.max(0, num(row.principalRepaid)));
  return Math.max(0, cap - pr);
}

/** Book value for balance sheet: outstanding principal only (when not closed and tracked). */
export function loanGivenBookValue(row, _asOfStr) {
  if (!row || typeof row !== "object" || row.closed === true) return 0;
  if (!loanGivenTrackOnBalanceSheet(row)) return 0;
  return roundMoney2(Math.max(0, loanGivenPrincipalOutstandingCalc(row)));
}

/**
 * Outstanding principal + interest in books for display (e.g. loan list row).
 * Same arithmetic as balance-sheet book value but ignores `trackOnBalanceSheet`, so B/S-off loans still show what is owed.
 */
export function loanGivenEconomicOutstanding(row, asOfStr) {
  if (!row || typeof row !== "object" || row.closed === true) return 0;
  const p = loanGivenPrincipalOutstandingCalc(row);
  const i = loanGivenInterestOutstandingReconciled(row, asOfStr);
  return roundMoney2(Math.max(0, p) + Math.max(0, i));
}

export function sumLoansGivenBookValue(rows) {
  return (Array.isArray(rows) ? rows : []).reduce((s, r) => s + loanGivenBookValue(r), 0);
}

/** Sum of original principal for loans that are not settled. */
export function sumLoansGivenPrincipalActive(rows) {
  let s = 0;
  for (const r of rows || []) {
    if (!r || typeof r !== "object" || r.closed === true) continue;
    s += num(r.principal);
  }
  return roundMoney2(s);
}

/** Sum of principal still owed on open (non-settled) loans. */
export function sumLoansGivenPrincipalOutstandingOpen(rows) {
  let s = 0;
  for (const r of rows || []) {
    if (!r || typeof r !== "object" || r.closed === true) continue;
    s += Math.max(0, num(r.principalOutstanding));
  }
  return roundMoney2(s);
}

/** Sum of interest currently in books on open loans. */
export function sumLoansGivenInterestOutstandingOpen(rows, asOfStr) {
  const asOf = String(asOfStr || todayStr()).slice(0, 10);
  let s = 0;
  for (const r of rows || []) {
    if (!r || typeof r !== "object" || r.closed === true) continue;
    s += loanGivenInterestOutstandingReconciled(r, asOf);
  }
  return roundMoney2(s);
}

/** Total economic outstanding (principal outstanding + interest in books) across all open loans. */
export function sumLoansGivenEconomicOutstanding(rows) {
  let s = 0;
  for (const r of rows || []) {
    s += loanGivenEconomicOutstanding(r);
  }
  return roundMoney2(s);
}

/** Whole calendar days between two YYYY-MM-DD dates (end − start). Same day → 0. */
export function daysBetweenDateStrings(startStr, endStr) {
  const a = String(startStr || "").slice(0, 10);
  const b = String(endStr || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(a) || !/^\d{4}-\d{2}-\d{2}$/.test(b)) return 0;
  const t0 = Date.parse(`${a}T12:00:00`);
  const t1 = Date.parse(`${b}T12:00:00`);
  if (!Number.isFinite(t0) || !Number.isFinite(t1)) return 0;
  return Math.max(0, Math.round((t1 - t0) / (24 * 60 * 60 * 1000)));
}

/** Days from loan start (`dateGiven`) to as-of date. Closed loans → 0. */
export function loanGivenDaysOnBook(row, asOfStr) {
  if (!row || row.closed === true) return 0;
  const end = String(asOfStr || todayStr()).slice(0, 10);
  return daysBetweenDateStrings(String(row.dateGiven || "").slice(0, 10), end);
}

/** Completed 30-day months on book (0 if not a milestone day). Day 30 → 1, 60 → 2, … */
export function loanGivenMonthMilestoneNumber(row, asOfStr) {
  if (!row || row.closed === true) return 0;
  const days = loanGivenDaysOnBook(row, asOfStr);
  if (days < 30 || days % 30 !== 0) return 0;
  return Math.floor(days / 30);
}

/**
 * Effective monthly % for estimates and display.
 * Uses `interestRateMonthlyPct` when set; otherwise legacy `interestRateAnnualPct` (older UI often stored a monthly % in that field).
 */
export function loanGivenMonthlyRatePct(row) {
  if (!row || typeof row !== "object") return 0;
  const m = num(row.interestRateMonthlyPct);
  if (m > 0) return Math.min(100, Math.max(0, m));
  const a = num(row.interestRateAnnualPct);
  if (a > 0) return Math.min(100, Math.max(0, a));
  return 0;
}

/**
 * Simple interest on current outstanding principal: principal × (monthly%/100) × (days/30).
 * Informal estimate; `interestOutstanding` is your manual book figure on the balance sheet.
 */
/** Estimated monthly interest on current outstanding principal (one month at the loan rate). */
export function loanGivenMonthlyInterestOnOutstanding(row) {
  if (!row || row.closed === true) return 0;
  const rate = loanGivenMonthlyRatePct(row);
  const principalOut = num(row.principalOutstanding);
  if (!(rate > 0) || !(principalOut > 0)) return 0;
  return roundMoney2(principalOut * (rate / 100));
}

export function loanGivenEstimatedSimpleInterest(row, asOfStr) {
  if (!row || row.closed === true) return 0;
  const rate = loanGivenMonthlyRatePct(row);
  if (!(rate > 0)) return 0;
  const principalOut = num(row.principalOutstanding);
  if (!(principalOut > 0)) return 0;
  const days = loanGivenDaysOnBook(row, asOfStr);
  if (days <= 0) return 0;
  return roundMoney2(principalOut * (rate / 100) * (days / 30));
}

/** Sum of simple estimated interest to `asOfStr` across open loans (same formula as each loan detail). */
export function sumLoansGivenEstimatedInterestToDate(rows, asOfStr) {
  const d = String(asOfStr || todayStr()).slice(0, 10);
  let s = 0;
  for (const r of rows || []) {
    if (!r || typeof r !== "object") continue;
    s += loanGivenEstimatedSimpleInterest(r, d);
  }
  return roundMoney2(s);
}

/** Signed days until due: positive = future, 0 = today, negative = overdue. */
export function loanGivenDueDaysRemaining(row, asOfStr) {
  const due = String(row?.dueDate || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(due)) return null;
  const today = String(asOfStr || todayStr()).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(today)) return null;
  const t0 = Date.parse(`${today}T12:00:00`);
  const t1 = Date.parse(`${due}T12:00:00`);
  if (!Number.isFinite(t0) || !Number.isFinite(t1)) return null;
  return Math.round((t1 - t0) / (24 * 60 * 60 * 1000));
}

export function sumLoanRepaymentEntriesAmount(row) {
  if (!row || !Array.isArray(row.repaymentEntries)) return 0;
  let s = 0;
  for (const r of row.repaymentEntries) {
    if (r && typeof r === "object") s += num(r.amount);
  }
  return roundMoney2(s);
}

export function sumLoanRepaymentEntriesAmountByKind(row, kind) {
  const want = kind === "principal" ? "principal" : kind === "interest" ? "interest" : "";
  if (!want) return 0;
  if (!row || !Array.isArray(row.repaymentEntries)) return 0;
  let s = 0;
  for (const r of row.repaymentEntries) {
    if (!r || typeof r !== "object") continue;
    if (r.paymentKind !== want) continue;
    s += num(r.amount);
  }
  return roundMoney2(s);
}

/** Interest collected from repayments. Prefers typed `paymentKind: "interest"` lines; falls back to legacy approximation. */
export function loanGivenInterestCollected(row) {
  if (!row || typeof row !== "object") return 0;
  const entries = Array.isArray(row.repaymentEntries) ? row.repaymentEntries : [];
  const hasTypedKind = entries.some((r) => r && typeof r === "object" && (r.paymentKind === "interest" || r.paymentKind === "principal"));
  if (hasTypedKind) return sumLoanRepaymentEntriesAmountByKind(row, "interest");
  // Legacy fallback: interest ≈ total repayments − principal repaid.
  const cash = sumLoanRepaymentEntriesAmount(row);
  const pr = num(row.principalRepaid);
  return roundMoney2(Math.max(0, cash - pr));
}

export function sumLoansGivenInterestCollected(rows) {
  return roundMoney2((Array.isArray(rows) ? rows : []).reduce((s, r) => s + loanGivenInterestCollected(r), 0));
}

/**
 * When new money is recorded (repayment lines total increases, or “principal repaid” increases
 * without line changes), apply it to interest due first, then to principal repaid.
 * Manual edits with no payment movement return the form amounts unchanged.
 */
export function allocateLoanGivenPaymentInterestFirst({
  principal,
  prevPrincipalRepaid,
  prevRepaymentLineSum,
  newRepaymentLineSum,
  interestOutstandingForm,
  principalRepaidForm,
}) {
  const cap = Math.max(0, num(principal));
  const prevPR = Math.min(cap, Math.max(0, num(prevPrincipalRepaid)));
  const prevLS = roundMoney2(num(prevRepaymentLineSum));
  const newLS = roundMoney2(num(newRepaymentLineSum));
  const deltaLines = roundMoney2(newLS - prevLS);
  const deltaPrField = roundMoney2(num(principalRepaidForm) - prevPR);

  let paymentDelta = 0;
  if (Math.abs(deltaLines) > 0.005) {
    paymentDelta = deltaLines;
  } else if (Math.abs(deltaPrField) > 0.005) {
    paymentDelta = deltaPrField;
  }

  const interestOutstanding = Math.max(0, num(interestOutstandingForm));
  let principalRepaid = Math.max(0, num(principalRepaidForm));

  if (paymentDelta > 0.005) {
    const ioStart = Math.max(0, num(interestOutstandingForm));
    const toInterest = Math.min(paymentDelta, ioStart);
    const interestOut = roundMoney2(ioStart - toInterest);
    principalRepaid = roundMoney2(Math.min(prevPR + (paymentDelta - toInterest), cap));
    return { interestOutstanding: interestOut, principalRepaid };
  }

  return {
    interestOutstanding: roundMoney2(interestOutstanding),
    principalRepaid: roundMoney2(Math.min(principalRepaid, cap)),
  };
}

export function normLoansGivenList(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x) => x && typeof x === "object")
    .map((x) => {
      const id = String(x.id || makeId());
      const principal = num(x.principal);
      const repaidRaw = num(x.principalRepaid);
      const principalRepaid = Math.min(principal, Math.max(0, repaidRaw));
      const closed = x.closed === true;
      const principalOutstanding = closed ? 0 : Math.max(0, principal - principalRepaid);
      const explicitMonthly = Math.min(100, Math.max(0, num(x.interestRateMonthlyPct)));
      const legacyStored = Math.min(1200, Math.max(0, num(x.interestRateAnnualPct)));
      let interestRateMonthlyPct = explicitMonthly;
      if (interestRateMonthlyPct <= 0 && legacyStored > 0) {
        interestRateMonthlyPct = Math.min(100, legacyStored);
      }
      const interestRateAnnualPct = interestRateMonthlyPct * 12;
      const interestOutstanding = closed ? 0 : Math.max(0, num(x.interestOutstanding));
      const disbursementBankAccountId = String(x.disbursementBankAccountId || "").trim();
      const disbursementDate = disbursementBankAccountId
        ? String(x.disbursementDate || x.dateGiven || todayStr()).slice(0, 10)
        : "";
      const disbursementAmount = disbursementBankAccountId
        ? num(x.disbursementAmount) > 0
          ? num(x.disbursementAmount)
          : principal
        : 0;
      const repaymentEntries = normLoanRepaymentEntries(x.repaymentEntries, id);
      const partners = normLoanGivenPartners(x.partners, principal);
      const partnersInterestBasis = inferLoanGivenPartnersInterestBasis(partners, x.partnersInterestBasis);
      const trackOnBalanceSheet = x.trackOnBalanceSheet !== false;
      const draft = {
        ...x,
        id,
        borrowerName: String(x.borrowerName || "").trim(),
        phone: String(x.phone || "").trim(),
        principal,
        principalRepaid,
        principalOutstanding,
        interestRateMonthlyPct,
        interestRateAnnualPct,
        interestOutstanding,
        trackOnBalanceSheet,
        description: String(x.description || "").trim(),
        dateGiven: String(x.dateGiven || todayStr()).slice(0, 10),
        dueDate: x.dueDate ? String(x.dueDate).slice(0, 10) : "",
        closed,
        createdAt: String(x.createdAt || x.dateGiven || todayStr()).slice(0, 10),
        disbursementBankAccountId,
        disbursementDate,
        disbursementAmount,
        repaymentEntries,
        partners,
        partnersInterestBasis,
      };
      const synced = reconcileLoanGivenRepayments(draft);
      const pr = synced.principalRepaid;
      const isClosed = synced.closed === true;
      return {
        ...synced,
        principalOutstanding: isClosed ? 0 : Math.max(0, principal - pr),
      };
    })
    .filter((x) => x.borrowerName && x.principal > 0);
}

export function normCustomerDirectory(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x) => x && typeof x === "object")
    .map((x) => {
      const { customerGstin: _legacyCustomerGstin } = x;
      return {
        id: String(x.id || makeId()),
        name: String(x.name || x.customerName || "").trim(),
        customerNo1: String(x.customerNo1 || ""),
        customerNo2: String(x.customerNo2 || ""),
        email: String(x.email || "").trim(),
        customerType: String(x.customerType || "").trim(),
        customerAddress: String(x.customerAddress || ""),
        customerCity: String(x.customerCity || ""),
        customerState: String(x.customerState || ""),
        customerPincode: String(x.customerPincode || ""),
        note: String(x.note || ""),
        createdAt: String(x.createdAt || todayStr()).slice(0, 10),
      };
    })
    .filter((x) => x.name);
}

/** Saved suppliers / vendors (parallel to customer directory) for purchases and autocomplete. */
export function normVendorDirectory(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x) => x && typeof x === "object")
    .map((x) => {
      const { gstin: _legacyGstin } = x;
      return {
        id: String(x.id || makeId()),
        name: String(x.name || "").trim(),
        phone1: String(x.phone1 || ""),
        phone2: String(x.phone2 || ""),
        email: String(x.email || "").trim(),
        address: String(x.address || ""),
        city: String(x.city || ""),
        state: String(x.state || ""),
        pincode: String(x.pincode || ""),
        note: String(x.note || ""),
        createdAt: String(x.createdAt || todayStr()).slice(0, 10),
      };
    })
    .filter((x) => x.name);
}

export function normAuditEvents(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x) => x && typeof x === "object")
    .map((x) => ({
      id: String(x.id || makeId()),
      at: String(x.at || new Date().toISOString()),
      actorId: String(x.actorId || "unknown"),
      entityType: String(x.entityType || "").trim(),
      recordId: String(x.recordId || "").trim(),
      action: String(x.action || "").trim(),
      source: String(x.source || "app"),
      note: String(x.note || "").trim(),
      details: x.details && typeof x.details === "object" ? x.details : {},
    }))
    .filter((x) => x.entityType && x.recordId && x.action)
    .slice(-AUDIT_EVENT_MAX);
}

const SYNC_CONFLICT_LIST_KEYS = {
  sales: "sales",
  expenses: "expenses",
  otherIncomes: "otherIncomes",
  recurringExpenses: "recurringExpenses",
  inventoryEntries: "inventoryEntries",
  purchases: "purchases",
  emiEntries: "emiEntries",
  loansGiven: "loansGiven",
  customerDirectory: "customerDirectory",
  customerAdvancePayments: "customerAdvancePayments",
  vendorDirectory: "vendorDirectory",
};

/**
 * Apply a stored sync-conflict local payload preview back into app state.
 * Returns a new state object, or null if the conflict cannot be applied safely.
 * Does not mutate input; caller should persist and mark the conflict resolved.
 */
export function applySyncConflictPreview(state, conflict) {
  if (!state || !conflict || typeof conflict !== "object") return null;
  if (conflict.status === "resolved") return null;
  const preview = conflict.localPayloadPreview;
  if (!preview || typeof preview !== "string") return null;
  let payload;
  try {
    payload = JSON.parse(preview);
  } catch {
    return null;
  }
  const et = String(conflict.entityType || "").trim();
  const rid = String(conflict.recordId || "").trim();
  const op = conflict.op === "delete" ? "delete" : "upsert";
  if (!et || !rid) return null;

  if (et === "settings") {
    if (op === "delete" || !payload || typeof payload !== "object") return null;
    return { ...state, settings: { ...state.settings, ...payload } };
  }
  if (et === "balance") {
    if (op === "delete" || !payload || typeof payload !== "object") return null;
    return { ...state, balance: normBalance({ ...state.balance, ...payload }) };
  }

  const listKey = SYNC_CONFLICT_LIST_KEYS[et];
  if (!listKey) return null;
  const arr = Array.isArray(state[listKey]) ? [...state[listKey]] : [];
  const idx = arr.findIndex((x) => x && String(x.id) === rid);
  if (op === "delete") {
    if (idx < 0) return null;
    arr.splice(idx, 1);
  } else {
    const row = payload && typeof payload === "object" ? { ...payload, id: rid } : { id: rid };
    if (idx >= 0) arr[idx] = { ...arr[idx], ...row, id: rid };
    else arr.push(row);
  }

  const bankAccounts = state.balance?.bankAccounts;
  const normalized = {
    sales: () => normSalesList(arr, bankAccounts),
    expenses: () => normExpensesList(arr),
    otherIncomes: () => normOtherIncomesList(arr),
    recurringExpenses: () => normRecurringList(arr),
    inventoryEntries: () => normInventoryList(arr),
    purchases: () => normPurchasesList(arr, bankAccounts),
    emiEntries: () => normEmiList(arr),
    loansGiven: () => normLoansGivenList(arr),
    customerDirectory: () => normCustomerDirectory(arr),
    customerAdvancePayments: () => normCustomerAdvancePayments(arr),
    vendorDirectory: () => normVendorDirectory(arr),
  };
  const normFn = normalized[listKey];
  const next = { ...state, [listKey]: normFn ? normFn() : arr };
  return listKey === "sales" || listKey === "purchases" || listKey === "customerAdvancePayments"
    ? applyComputedBankBalances(next)
    : next;
}

export function normSyncConflictQueue(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x) => x && typeof x === "object")
    .map((x) => {
      const out = {
        id: String(x.id || makeId()),
        at: String(x.at || new Date().toISOString()),
        entityType: String(x.entityType || "").trim(),
        recordId: String(x.recordId || "").trim(),
        reason: String(x.reason || "conflict"),
        source: String(x.source || "sync"),
        status: x.status === "resolved" ? "resolved" : "open",
      };
      // Optional rejected-local-payload preview so users can recover overwritten edits.
      // Stored as a JSON string capped to avoid bloating the queue.
      if (typeof x.localPayloadPreview === "string" && x.localPayloadPreview) {
        out.localPayloadPreview = x.localPayloadPreview.slice(0, 4000);
      } else if (x.localPayload && typeof x.localPayload === "object") {
        try {
          out.localPayloadPreview = JSON.stringify(x.localPayload).slice(0, 4000);
        } catch {
          /* circular or unserializable — skip */
        }
      }
      if (x.op === "delete" || x.op === "upsert") out.op = x.op;
      return out;
    })
    .filter((x) => x.entityType && x.recordId)
    .slice(-CONFLICT_QUEUE_MAX);
}

export function defVendor() {
  return {
    name: "",
    phone1: "",
    phone2: "",
    email: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    note: "",
  };
}

export function directoryRecordToVendorEntry(d) {
  if (!d || typeof d !== "object") return defVendor();
  return {
    name: String(d.name || "").trim(),
    phone1: String(d.phone1 || ""),
    phone2: String(d.phone2 || ""),
    email: String(d.email || "").trim(),
    address: String(d.address || ""),
    city: String(d.city || ""),
    state: String(d.state || ""),
    pincode: String(d.pincode || ""),
    note: String(d.note || ""),
  };
}

/**
 * Saved vendors first (full contact), then suppliers seen only on purchase bills.
 * Row shape matches customer picker: id, displayName, plus contact fields for form fill.
 */
export function buildVendorPickerRows(purchases, directoryRecords) {
  const map = new Map();
  const dir = Array.isArray(directoryRecords) ? directoryRecords : [];
  for (const d of dir) {
    const displayName = (d.name || "").trim();
    if (!displayName) continue;
    const key = displayName.toLowerCase();
    map.set(key, {
      id: `dir:${d.id}`,
      displayName,
      phone1: String(d.phone1 || ""),
      phone2: String(d.phone2 || ""),
      email: String(d.email || "").trim(),
      address: String(d.address || ""),
      city: String(d.city || ""),
      state: String(d.state || ""),
      pincode: String(d.pincode || ""),
    });
  }
  const list = Array.isArray(purchases) ? purchases : [];
  const byDate = [...list]
    .filter((p) => p && (p.supplierName || "").trim())
    .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
  for (const p of byDate) {
    const displayName = (p.supplierName || "").trim();
    if (!displayName) continue;
    const key = displayName.toLowerCase();
    if (map.has(key)) continue;
    map.set(key, {
      id: `pur:${key}`,
      displayName,
      phone1: "",
      phone2: "",
      email: "",
      address: "",
      city: "",
      state: "",
      pincode: "",
    });
  }
  return [...map.values()].sort((a, b) => a.displayName.localeCompare(b.displayName, undefined, { sensitivity: "base" }));
}

/** Filter vendor rows for supplier autocomplete (starts-with first). */
export function filterVendorSuggestRows(rows, queryRaw) {
  const q = String(queryRaw || "").trim().toLowerCase();
  if (!q || !rows.length) return [];
  const starts = [];
  const rest = [];
  for (const r of rows) {
    const n = (r.displayName || "").toLowerCase();
    if (!n.includes(q)) continue;
    if (n.startsWith(q)) starts.push(r);
    else rest.push(r);
  }
  starts.sort((a, b) => a.displayName.localeCompare(b.displayName, undefined, { sensitivity: "base" }));
  rest.sort((a, b) => a.displayName.localeCompare(b.displayName, undefined, { sensitivity: "base" }));
  return [...starts, ...rest].slice(0, 10);
}

export function normServicingCompletions(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x) => x && typeof x === "object")
    .map((x) => ({
      id: String(x.id || makeId()),
      saleId: String(x.saleId || "").trim(),
      serviceNum: Math.min(3, Math.max(1, Math.round(num(x.serviceNum)) || 1)),
      completedDate: String(x.completedDate || todayStr()).slice(0, 10),
      note: String(x.note ?? "").trim(),
    }))
    .filter((x) => x.saleId && x.serviceNum >= 1 && x.serviceNum <= 3);
}

export function normServicingWaSent(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x) => x && typeof x === "object")
    .map((x) => ({
      id: String(x.id || makeId()),
      saleId: String(x.saleId || "").trim(),
      serviceNum: Math.min(3, Math.max(1, Math.round(num(x.serviceNum)) || 1)),
      sentAt: String(x.sentAt || todayStr()).slice(0, 10),
    }))
    .filter((x) => x.saleId && x.serviceNum >= 1 && x.serviceNum <= 3);
}

export function normFyCloseSnapshots(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x) => x && typeof x === "object" && x.id != null)
    .map((x) => ({
      id: String(x.id),
      fyLabel: String(x.fyLabel || ""),
      savedAt: String(x.savedAt || ""),
      asOfDate: String(x.asOfDate || "").slice(0, 10),
      note: String(x.note || "").trim(),
      totalAssets: num(x.totalAssets),
      totalLiab: num(x.totalLiab),
      netCapital: num(x.netCapital),
      outstanding: num(x.outstanding),
      stockVal: num(x.stockVal),
      gstLiability: num(x.gstLiability),
      revenue: num(x.revenue),
      netProfit: num(x.netProfit),
    }))
    .slice(0, 20);
}

export const defaultState = applyComputedBankBalances({
  settings:{
    financialYearStartMonth:4,
    fyYear:detectFyYear(4),
    businessName:"My Business",
    businessPhone:"",
    businessWhatsapp:"",
    businessAddress:"",
    businessCity:"",
    businessState:"",
    businessStateCode:"",
    businessPincode:"",
    businessGstin:"",
    businessPan:"",
    businessLogo:"",
    invoiceNotes: "",
    invoiceTerms: "",
    invoiceSignatory: "",
    invoiceSignature: "",
    /** Visual print/preview layout: premium | classic | modern | minimal */
    invoiceTemplate: "premium",
    /** When false, HSN/GST fields and tax-invoice print are hidden app-wide. */
    gstEnabled: true,
    defaultProductHsn: "8711",
    defaultProductGstRate: 5,
    defaultDueDays:30,
    /** Monthly sales count goal. 0 = not set; shown on dashboard. */
    monthlySalesTarget: 0,
    /** Label for the optional extra charge field on new invoices (e.g. Registration, Freight). */
    additionalChargesLabel: "Additional Charges",
    invoicePrefix:"MB",
    billOfSupplyPrefix:"BOS",
    creditNotePrefix:"CN",
    debitNotePrefix:"DN",
    /** UPI VPA for QR on printed invoices (e.g. name@bank). */
    businessUpiVpa: "",
    businessUpiPayeeName: "",
    paymentReceiptPrefix:"RCPT",
    paymentReceiptNextNumber: 1,
    invoiceNextNumber: 1,
    billOfSupplyNextNumber: 1,
    creditNoteNextNumber: 1,
    debitNoteNextNumber: 1,
    financeCompanies:DEFAULT_FINANCE_COS,
    expenseCategories:[...DEFAULT_EXPENSE_CATEGORIES],
    otherIncomeCategories:[...DEFAULT_OTHER_INCOME_CATEGORIES],
    notificationsEnabled:true,
    notifyOverduePayments:true,
    notifyPaymentDueToday:true,
    notifyPaymentDueSoon:true,
    notifyRecurringDueToday:true,
    notifyRecurringDue:true,
        notifyEmiDueThreeDays:true,
        notifyServicingDue: true,
        notifyServicingDueTwoDays: true,
        notifyLowStock:true,
    branches: normBranchesList([{ id: BRANCH_MAIN_ID, name: "Main" }]),
    bundles: [],
    /** Primary reporting basis — labels P&amp;L vs cash screens. */
    accountingBasis: "cash",
    fyCloseSnapshots: [],
    saleDraft: null,
    autoStockOutOnSale: false,
  },
  balance:normBalance({}),
  sales:[],
  expenses:[],
  otherIncomes:[],
  recurringExpenses:[],
  inventoryEntries:[],
  purchases:[],
  emiEntries:[],
  loansGiven: [],
  servicingCompletions: [],
  servicingWaSent: [],
  customerDirectory: [],
  customerAdvancePayments: [],
  vendorDirectory: [],
  dismissedAlertIds: [],
  auditEvents: [],
  syncConflictQueue: [],
});

/**
 * Merge raw JSON (cloud snapshot or imported backup file) into a full app state.
 * Returns null on invalid input or normalization failure. Failures are surfaced
 * via `console.warn` and a `mybusiness:persist-merge-failed` window event so
 * callers (and telemetry) can react instead of silently dropping user data.
 */
export function mergePersistedPayload(p) {
  if (!p || typeof p !== "object" || Array.isArray(p)) return null;
  try {
    const settingsIn = p.settings || {};
    const balanceMerged = normBalance({ ...defaultState.balance, ...(p.balance || {}) });
    const merged = {
      ...defaultState, ...p,
      settings:{
        ...defaultState.settings,...settingsIn,
        fyYear: settingsIn?.fyYear ?? detectFyYear(settingsIn?.financialYearStartMonth??4),
        defaultDueDays: Math.min(365,Math.max(1,num(settingsIn?.defaultDueDays)||30)),
        monthlySalesTarget: Math.max(0, Math.floor(num(settingsIn?.monthlySalesTarget) || 0)),
        invoicePrefix: sanitizePrefix(settingsIn?.invoicePrefix??"MB"),
        billOfSupplyPrefix: sanitizePrefix(settingsIn?.billOfSupplyPrefix ?? "BOS"),
        creditNotePrefix: sanitizePrefix(settingsIn?.creditNotePrefix ?? "CN"),
        debitNotePrefix: sanitizePrefix(settingsIn?.debitNotePrefix ?? "DN"),
        paymentReceiptPrefix: sanitizePrefix(settingsIn?.paymentReceiptPrefix ?? "RCPT"),
        paymentReceiptNextNumber: Math.max(1, num(settingsIn?.paymentReceiptNextNumber) || 1),
        invoiceNextNumber: Math.max(1, num(settingsIn?.invoiceNextNumber) || 1),
        billOfSupplyNextNumber: Math.max(1, num(settingsIn?.billOfSupplyNextNumber) || 1),
        creditNoteNextNumber: Math.max(1, num(settingsIn?.creditNoteNextNumber) || 1),
        debitNoteNextNumber: Math.max(1, num(settingsIn?.debitNoteNextNumber) || 1),
        financeCompanies: Array.isArray(settingsIn?.financeCompanies)&&settingsIn.financeCompanies.length ? settingsIn.financeCompanies : DEFAULT_FINANCE_COS,
        expenseCategories: normalizeExpenseCategoriesFromPersist(settingsIn?.expenseCategories),
        otherIncomeCategories: normalizeOtherIncomeCategoriesFromPersist(settingsIn?.otherIncomeCategories),
        notificationsEnabled: settingsIn?.notificationsEnabled !== false,
        notifyOverduePayments: settingsIn?.notifyOverduePayments !== false,
        notifyPaymentDueToday: settingsIn?.notifyPaymentDueToday !== false,
        notifyPaymentDueSoon: settingsIn?.notifyPaymentDueSoon !== false,
        notifyRecurringDueToday: settingsIn?.notifyRecurringDueToday !== false,
        notifyRecurringDue: settingsIn?.notifyRecurringDue !== false,
        notifyEmiDueThreeDays:
          settingsIn?.notifyEmiDueThreeDays !== undefined
            ? settingsIn?.notifyEmiDueThreeDays !== false
            : settingsIn?.notifyEmiDueSoon !== false &&
              settingsIn?.notifyEmiDueToday !== false &&
              (settingsIn?.notifyEmi !== false || settingsIn?.notifyEmi === undefined),
        notifyLowStock: settingsIn?.notifyLowStock !== false,
        notifyServicingDue:
          settingsIn?.notifyServicingDue !== undefined
            ? settingsIn?.notifyServicingDue !== false
            : true,
        notifyServicingDueTwoDays:
          settingsIn?.notifyServicingDueTwoDays !== undefined
            ? settingsIn?.notifyServicingDueTwoDays !== false
            : settingsIn?.notifyServicingDue !== false,
        notifyLoanMonthMilestone: settingsIn?.notifyLoanMonthMilestone !== false,
        branches: normBranchesList(settingsIn?.branches),
        bundles: normBundlesList(settingsIn?.bundles),
        accountingBasis: settingsIn?.accountingBasis === "accrual" ? "accrual" : "cash",
        autoStockOutOnSale: settingsIn?.autoStockOutOnSale === true,
        businessAddress: String(settingsIn?.businessAddress ?? "").trim(),
        businessCity: String(settingsIn?.businessCity ?? "").trim(),
        businessState: String(settingsIn?.businessState ?? "").trim(),
        businessStateCode: String(settingsIn?.businessStateCode ?? "").trim(),
        businessPincode: String(settingsIn?.businessPincode ?? "").trim(),
        businessGstin: String(settingsIn?.businessGstin ?? "").trim().toUpperCase(),
        businessPan: String(settingsIn?.businessPan ?? "").trim().toUpperCase(),
        businessUpiVpa: String(settingsIn?.businessUpiVpa ?? "").trim().toLowerCase(),
        businessUpiPayeeName: String(settingsIn?.businessUpiPayeeName ?? "").trim(),
        businessLogo: String(settingsIn?.businessLogo ?? "").trim(),
        invoiceNotes: String(settingsIn?.invoiceNotes ?? "").trim(),
        invoiceTerms: String(settingsIn?.invoiceTerms ?? "").trim(),
        invoiceSignatory: String(settingsIn?.invoiceSignatory ?? "").trim(),
        invoiceSignature: String(settingsIn?.invoiceSignature ?? "").trim(),
        invoiceTemplate: normalizeInvoiceTemplate(settingsIn?.invoiceTemplate),
        gstEnabled: settingsIn?.gstEnabled !== false,
        defaultProductHsn: String(settingsIn?.defaultProductHsn ?? "8711").trim() || "8711",
        defaultProductGstRate: Math.max(0, num(settingsIn?.defaultProductGstRate ?? 5)),
        additionalChargesLabel:
          String(settingsIn?.additionalChargesLabel ?? "Additional Charges").trim() ||
          "Additional Charges",
        darkMode: settingsIn?.darkMode === true ? true : settingsIn?.darkMode === false ? false : undefined,
        fyCloseSnapshots: normFyCloseSnapshots(settingsIn?.fyCloseSnapshots),
        saleDraft: normSaleDraft(settingsIn?.saleDraft),
      },
      balance: balanceMerged,
      sales: normSalesList(p.sales, balanceMerged.bankAccounts),
      expenses: normExpensesList(p.expenses),
      otherIncomes: normOtherIncomesList(p.otherIncomes),
      recurringExpenses: normRecurringList(p.recurringExpenses),
      inventoryEntries: normInventoryList(p.inventoryEntries),
      purchases: normPurchasesList(p.purchases, balanceMerged.bankAccounts),
      emiEntries: normEmiList(p.emiEntries),
      loansGiven: normLoansGivenList(p.loansGiven),
      servicingCompletions: normServicingCompletions(p.servicingCompletions),
      servicingWaSent: normServicingWaSent(p.servicingWaSent),
      customerDirectory: normCustomerDirectory(p.customerDirectory),
      customerAdvancePayments: normCustomerAdvancePayments(p.customerAdvancePayments),
      vendorDirectory: normVendorDirectory(p.vendorDirectory),
      dismissedAlertIds: Array.isArray(p.dismissedAlertIds) ? p.dismissedAlertIds.filter(Boolean).map(String) : [],
      auditEvents: normAuditEvents(p.auditEvents),
      syncConflictQueue: normSyncConflictQueue(p.syncConflictQueue),
    };
    return applyComputedBankBalances(merged);
  } catch (err) {
    try {
      const msg = err && typeof err === "object" && "message" in err ? String(err.message) : String(err);
      console.warn("[mergePersistedPayload] normalization failed; falling back to defaultState:", msg);
      if (typeof window !== "undefined" && typeof CustomEvent === "function") {
        window.dispatchEvent(
          new CustomEvent("mybusiness:persist-merge-failed", {
            detail: { message: msg.slice(0, 500) },
          }),
        );
      }
    } catch {
      /* logging must never throw */
    }
    return null;
  }
}
