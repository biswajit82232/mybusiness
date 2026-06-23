import { useCallback, useEffect, useRef, useState } from "react";
import { APP_VERSION } from "@/appVersion.js";
import { getThemeMode, setThemeMode } from "@/app/useDarkModeDocument.js";
import { getResolvedUserId, getSupabaseSessionUser } from "@/data/auth/auth.js";
import { getPendingOutboxCount, getPendingOutboxEntries } from "@/data/local/indexedDbStore.js";
import {
  MONTHS,
  detectFyYear,
  fyLabel,
  getExpenseCategoriesList,
  getFyYears,
  getOtherIncomeCategoriesList,
  num,
  waHref,
} from "@/domain/index.js";
import {
  IcBanking,
  IcBell,
  IcBox,
  IcCalDay,
  IcCloud,
  IcDownload,
  IcIncome,
  IcMoon,
  IcSales,
  IcSearch,
  IcSettings,
  IcSpend,
  IcTrash,
  IcUpload,
  IcWhatsApp,
} from "@/shared/ui/icons/AppIcons.jsx";
import { Field, TabPageChrome } from "@/shared/ui/layout/AppChrome.jsx";
import { MenuSelect } from "@/shared/ui/inputs/MenuSelect.jsx";
import { SettingsHubRow } from "./SettingsHubRow.jsx";

/** Support WhatsApp for bug reports (India mobile, no leading 0). */
const REPORT_BUGS_WHATSAPP = "9635505436";

export function SettingsScreen({
  settings,
  fyStr,
  onSavePartial,
  onOpenSidebar,
  onExportBackup,
  onImportBackup,
  onResetAllData,
  darkMode,
  setDarkMode,
  cloudSyncEnabled,
  cloudSyncMeta,
  onManualCloudSync,
  syncConflictQueue = [],
  onResolveSyncConflict,
  onRestoreSyncConflict,
  onClearResolvedConflicts,
}) {
  const importRef = useRef(null);
  const [sub, setSub] = useState(null); // null = hub
  const [hubSearch, setHubSearch] = useState("");
  const [expandedConflictId, setExpandedConflictId] = useState(null);
  const [online, setOnline] = useState(() => typeof navigator !== "undefined" && navigator.onLine);
  const [outboxRows, setOutboxRows] = useState([]);
  const [outboxCount, setOutboxCount] = useState(0);
  const [syncBusy, setSyncBusy] = useState(false);
  const [accountId, setAccountId] = useState(null);
  const [sessionEmail, setSessionEmail] = useState(null);
  const [fyYearDraft, setFyYearDraft] = useState(settings.fyYear);
  const [fyStartMonthDraft, setFyStartMonthDraft] = useState(settings.financialYearStartMonth);

  useEffect(() => {
    if (sub !== "fy") return;
    setFyYearDraft(settings.fyYear);
    setFyStartMonthDraft(settings.financialYearStartMonth);
  }, [sub, settings.fyYear, settings.financialYearStartMonth]);

  const back = () => setSub(null);
  const titles = {
    appearance: "Appearance",
    backup: "Data backup",
    business: "Business info",
    invoice: "Invoice settings",
    accounting: "Accounting & inventory",
    fy: "Financial year",
    finance: "Finance companies",
    expenseCats: "Expense categories",
    otherIncomeCats: "Other income categories",
    notifications: "Notifications",
    cloud: "Cloud sync",
    danger: "Danger zone",
  };

  /** Grouped hub: keyword search matches title, subtitle, and these strings */
  const hubSections = [
    {
      id: "appearance",
      label: "Appearance",
      items: [
        {
          k: "appearance",
          icon: <IcMoon />,
          title: "Appearance",
          subtitle: "Theme (light / dark)",
          keywords: ["dark", "light", "mode", "theme", "night", "color"],
        },
      ],
    },
    {
      id: "data",
      label: "Data backup & sync",
      items: [
        {
          k: "backup",
          icon: <IcDownload />,
          title: "Data backup",
          subtitle: "Export & import JSON backup",
          keywords: ["backup", "export", "import", "download", "upload", "json", "restore", "file"],
        },
        ...(cloudSyncEnabled
          ? [
              {
                k: "cloud",
                icon: <IcCloud />,
                title: "Cloud sync",
                subtitle: "Supabase sync & outbox",
                keywords: ["cloud", "sync", "online", "supabase", "outbox", "pending", "upload"],
              },
            ]
          : []),
      ],
    },
    {
      id: "business",
      label: "Business",
      items: [
        {
          k: "business",
          icon: <IcSettings />,
          title: "Business info",
          subtitle: "Name, phone, WhatsApp",
          keywords: ["business", "name", "phone", "whatsapp", "company", "contact"],
        },
      ],
    },
    {
      id: "sales",
      label: "Invoices & inventory",
      items: [
        {
          k: "invoice",
          icon: <IcSales />,
          title: "Invoice settings",
          subtitle: "Prefix, payment due days",
          keywords: ["invoice", "prefix", "due", "payment", "sale", "bill"],
        },
        {
          k: "accounting",
          icon: <IcBox />,
          title: "Accounting & inventory",
          subtitle: "Cash / accrual, stock-out on sale",
          keywords: ["accounting", "cash", "accrual", "inventory", "stock", "cogs", "pl", "profit", "branch"],
        },
      ],
    },
    {
      id: "fy",
      label: "Financial year & lenders",
      items: [
        {
          k: "fy",
          icon: <IcCalDay />,
          title: "Financial year",
          subtitle: "FY year & start month",
          keywords: ["fy", "financial", "year", "month", "april", "tax", "period"],
        },
        {
          k: "finance",
          icon: <IcBanking />,
          title: "Finance companies",
          subtitle: "EMI / lender names",
          keywords: ["finance", "emi", "lender", "bajaj", "loan", "installment"],
        },
      ],
    },
    {
      id: "categories",
      label: "Categories",
      items: [
        {
          k: "expenseCats",
          icon: <IcSpend />,
          title: "Expense categories",
          subtitle: "Expense category labels",
          keywords: ["expense", "category", "categories", "spend", "cost", "cogs"],
        },
        {
          k: "otherIncomeCats",
          icon: <IcIncome />,
          title: "Other income categories",
          subtitle: "Non-invoice receipts",
          keywords: ["other", "income", "category", "interest", "rent"],
        },
      ],
    },
    {
      id: "notifications",
      label: "Notifications",
      items: [
        {
          k: "notifications",
          icon: <IcBell />,
          title: "Notifications",
          subtitle: "Bell alerts & browser reminders",
          keywords: ["notification", "bell", "alert", "reminder", "overdue", "emi", "stock", "due"],
        },
      ],
    },
    {
      id: "danger",
      label: "Danger zone",
      items: [
        {
          k: "danger",
          icon: <IcTrash />,
          title: "Danger zone",
          subtitle: "Reset all local data",
          keywords: ["danger", "reset", "delete", "erase", "clear", "wipe", "remove"],
          danger: true,
        },
      ],
    },
  ];

  function itemMatchesQuery(item, query) {
    if (!query) return true;
    const hay = [item.title, item.subtitle || "", ...(item.keywords || [])].join(" ").toLowerCase();
    return hay.includes(query);
  }

  const q = hubSearch.trim().toLowerCase();
  const filteredHubSections = hubSections
    .map((sec) => ({
      ...sec,
      items: sec.items.filter((it) => itemMatchesQuery(it, q)),
    }))
    .filter((sec) => sec.items.length > 0);

  useEffect(() => {
    const fn = () => setOnline(navigator.onLine);
    window.addEventListener("online", fn);
    window.addEventListener("offline", fn);
    return () => {
      window.removeEventListener("online", fn);
      window.removeEventListener("offline", fn);
    };
  }, []);

  const refreshOutbox = useCallback(async () => {
    const id = await getResolvedUserId();
    setAccountId(id);
    const su = await getSupabaseSessionUser();
    setSessionEmail(su?.email ?? null);
    if (!id || id === "local-user") {
      setOutboxRows([]);
      setOutboxCount(0);
      return;
    }
    const c = await getPendingOutboxCount(id);
    const rows = await getPendingOutboxEntries(id, { limit: 100 });
    setOutboxCount(c);
    setOutboxRows(rows);
  }, []);

  useEffect(() => {
    if (sub === "cloud") refreshOutbox();
  }, [sub, refreshOutbox]);

  const runManualSync = async () => {
    setSyncBusy(true);
    try {
      await onManualCloudSync();
      await refreshOutbox();
    } finally {
      setSyncBusy(false);
    }
  };

  const runFullReconcile = async () => {
    setSyncBusy(true);
    try {
      await onManualCloudSync({ forceFullReconcile: true });
      await refreshOutbox();
    } finally {
      setSyncBusy(false);
    }
  };

  const lastSyncAt = cloudSyncMeta?.at ? Number(cloudSyncMeta.at) : 0;
  const syncAgeMs = lastSyncAt > 0 ? Date.now() - lastSyncAt : Number.POSITIVE_INFINITY;
  const SYNC_STALE_MS = 2 * 60 * 1000;
  const syncStale = !!online && cloudSyncEnabled && accountId && accountId !== "local-user" && syncAgeMs > SYNC_STALE_MS;

  const hub = (
    <TabPageChrome className="settings-overlay" title="Settings" onOpenSidebar={onOpenSidebar}>
      <div className="tab-page-scroll settings-hub-scroll">
        <div className="settings-hub-search-wrap">
          <label className="settings-hub-search-label" htmlFor="settings-hub-search-input">
            <IcSearch aria-hidden="true" />
            <span>Search settings</span>
          </label>
          <input
            id="settings-hub-search-input"
            type="search"
            className="settings-hub-search"
            placeholder="Search by keyword — backup, appearance, categories…"
            value={hubSearch}
            onChange={(e) => setHubSearch(e.target.value)}
            autoComplete="off"
            aria-label="Search settings"
          />
        </div>
        {cloudSyncMeta?.at ? (
          <p className="settings-hub-sync-meta">
            Last sync attempt: {new Date(cloudSyncMeta.at).toLocaleString()}
            {cloudSyncMeta.detail ? ` · ${cloudSyncMeta.detail}` : ""}
          </p>
        ) : null}
        {filteredHubSections.length === 0 ? (
          <p className="settings-hub-empty">No settings match “{hubSearch.trim()}”. Try a different keyword.</p>
        ) : (
          <div className="settings-hub-sections">
            {filteredHubSections.map((sec) => (
              <section key={sec.id} className="settings-hub-section" aria-labelledby={`settings-sec-${sec.id}`}>
                <h2 id={`settings-sec-${sec.id}`} className="settings-hub-section-hd">
                  {sec.label}
                </h2>
                <div className="settings-hub-list">
                  {sec.items.map((r) => (
                    <SettingsHubRow
                      key={r.k}
                      icon={r.icon}
                      title={r.title}
                      subtitle={r.subtitle}
                      variant={r.danger === true ? "danger" : undefined}
                      onClick={() => setSub(r.k)}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
        <p className="settings-app-version" aria-label={`App version ${APP_VERSION}`}>
          Version {APP_VERSION}
        </p>
        {waHref(REPORT_BUGS_WHATSAPP) ? (
          <div className="settings-report-bugs">
            <a
              className="settings-report-bugs-btn"
              href={waHref(REPORT_BUGS_WHATSAPP)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Report bugs on WhatsApp ${REPORT_BUGS_WHATSAPP}`}
            >
              <span className="settings-report-bugs-ic" aria-hidden="true">
                <IcWhatsApp />
              </span>
              <span className="settings-report-bugs-text">
                <span className="settings-report-bugs-title">Report bugs</span>
                <span className="settings-report-bugs-sub">WhatsApp · {REPORT_BUGS_WHATSAPP}</span>
              </span>
            </a>
          </div>
        ) : null}
      </div>
    </TabPageChrome>
  );

  if (!sub) return hub;

  return (
    <TabPageChrome className="settings-overlay" title={titles[sub] || "Settings"} onBack={back} onOpenSidebar={onOpenSidebar}>
      <div className="tab-page-scroll">
        {sub === "appearance" && (
          <ThemeAppearanceSection darkMode={darkMode} setDarkMode={setDarkMode} />
        )}

        {sub === "accounting" && (
          <div className="form-sections settings-sub-pad">
            <p className="settings-inline-hint" style={{ marginTop: 0 }}>
              Reporting basis affects Home KPIs and reports. Stock-out runs on the default branch when enabled.
            </p>
            <div className="form-card">
              <Field label="Primary reporting basis">
                <MenuSelect
                  value={settings.accountingBasis === "accrual" ? "accrual" : "cash"}
                  onChange={(v) => onSavePartial({ accountingBasis: v })}
                  options={[
                    { value: "cash", label: "Cash", sub: "Matches Banking / Cash flow" },
                    { value: "accrual", label: "Accrual (invoiced)", sub: "Revenue by invoice date" },
                  ]}
                />
              </Field>
            </div>
            <div className="form-card">
              <div className="toggle-row">
                <div>
                  <div className="toggle-label">Auto stock-out on sale</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: 4 }}>
                    Deduct inventory when the sold item is in stock (default branch)
                  </div>
                </div>
                <label className="toggle-switch" aria-label="Auto stock-out on sale">
                  <input
                    type="checkbox"
                    checked={!!settings.autoStockOutOnSale}
                    onChange={(e) => onSavePartial({ autoStockOutOnSale: e.target.checked })}
                  />
                  <span className="toggle-track" />
                </label>
              </div>
            </div>
          </div>
        )}

        {sub === "backup" && (
          <div className="form-sections settings-sub-pad">
            <div className="form-card">
              <div className="settings-action-row">
                <button type="button" className="settings-action-btn" onClick={onExportBackup}>
                  <div className="settings-action-icon"><IcDownload /></div>
                  Download backup
                </button>
                <button type="button" className="settings-action-btn" onClick={() => importRef.current?.click()}>
                  <div className="settings-action-icon"><IcUpload /></div>
                  Import backup
                </button>
              </div>
              <input
                ref={importRef}
                type="file"
                accept=".json,application/json"
                className="settings-backup-file"
                aria-hidden="true"
                tabIndex={-1}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onImportBackup(f);
                  e.target.value = "";
                }}
              />
            </div>
          </div>
        )}

        {sub === "business" && (
          <form
            className="form-sections settings-sub-pad"
            onSubmit={(e) => {
              e.preventDefault();
              const d = new FormData(e.currentTarget);
              onSavePartial({
                businessName: d.get("businessName"),
                businessPhone: d.get("businessPhone"),
                businessWhatsapp: d.get("businessWhatsapp"),
              });
            }}
          >
            <div className="form-card">
              <div className="form-stack">
                <Field label="Business name"><input name="businessName" type="text" key={`bn-${settings.businessName}`} defaultValue={settings.businessName} required /></Field>
                <Field label="Phone (call)"><input name="businessPhone" type="tel" key={`bp-${settings.businessPhone}`} defaultValue={settings.businessPhone} placeholder="10-digit mobile" /></Field>
                <Field label="WhatsApp (optional)"><input name="businessWhatsapp" type="tel" key={`bw-${settings.businessWhatsapp}`} defaultValue={settings.businessWhatsapp} /></Field>
              </div>
            </div>
            <button type="submit" className="primary-btn submit-btn">Save</button>
          </form>
        )}

        {sub === "invoice" && (
          <div className="form-sections settings-sub-pad">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const d = new FormData(e.currentTarget);
                onSavePartial({
                  invoicePrefix: d.get("invoicePrefix"),
                  billOfSupplyPrefix: d.get("billOfSupplyPrefix"),
                  invoiceNextNumber: num(d.get("invoiceNextNumber")),
                  billOfSupplyNextNumber: num(d.get("billOfSupplyNextNumber")),
                  defaultDueDays: num(d.get("defaultDueDays")),
                });
              }}
            >
              <div className="form-card">
                <div className="form-stack">
                  <Field label="Invoice prefix">
                    <input name="invoicePrefix" type="text" key={`ip-${settings.invoicePrefix}`} defaultValue={settings.invoicePrefix} placeholder="e.g. MB" autoComplete="off" />
                  </Field>
                  <Field label="Bill of Supply prefix">
                    <input
                      name="billOfSupplyPrefix"
                      type="text"
                      key={`bsp-${settings.billOfSupplyPrefix || "BOS"}`}
                      defaultValue={settings.billOfSupplyPrefix || "BOS"}
                      placeholder="e.g. BOS"
                      autoComplete="off"
                    />
                  </Field>
                  <Field label="Invoice next number">
                    <input
                      name="invoiceNextNumber"
                      type="number"
                      min="1"
                      step="1"
                      key={`inn-${settings.invoiceNextNumber || 1}`}
                      defaultValue={settings.invoiceNextNumber || 1}
                    />
                  </Field>
                  <Field label="Bill of Supply next number">
                    <input
                      name="billOfSupplyNextNumber"
                      type="number"
                      min="1"
                      step="1"
                      key={`bsnn-${settings.billOfSupplyNextNumber || 1}`}
                      defaultValue={settings.billOfSupplyNextNumber || 1}
                    />
                  </Field>
                  <Field label="Default due days">
                    <input name="defaultDueDays" type="number" min="1" max="365" key={`dd-${settings.defaultDueDays}`} defaultValue={settings.defaultDueDays} />
                  </Field>
                </div>
              </div>
              <button type="submit" className="primary-btn submit-btn">
                Save
              </button>
            </form>
          </div>
        )}

        {sub === "fy" && (
          <form
            className="form-sections settings-sub-pad"
            onSubmit={(e) => {
              e.preventDefault();
              const sm = num(fyStartMonthDraft) || 4;
              onSavePartial({
                fyYear: num(fyYearDraft) || detectFyYear(sm),
                financialYearStartMonth: sm,
              });
            }}
          >
            <div className="form-card">
              <div className="form-stack">
                <div className="field-row">
                  <Field label="FY year">
                    <MenuSelect
                      value={fyYearDraft}
                      onChange={(v) => setFyYearDraft(v)}
                      options={getFyYears().map((y) => ({ value: y, label: fyLabel(y) }))}
                    />
                  </Field>
                  <Field label="Start month">
                    <MenuSelect
                      value={fyStartMonthDraft}
                      onChange={(v) => setFyStartMonthDraft(v)}
                      options={MONTHS.map((m, i) => ({ value: i + 1, label: m }))}
                    />
                  </Field>
                </div>
                <div className="fy-info-row">
                  <span className="fy-chip">FY {fyStr}</span>
                  <span className="settings-hint">
                    {MONTHS[settings.financialYearStartMonth - 1]} {settings.fyYear} – {MONTHS[(settings.financialYearStartMonth + 10) % 12]} {settings.fyYear + 1}
                  </span>
                </div>
              </div>
            </div>
            <button type="submit" className="primary-btn submit-btn">Save</button>
          </form>
        )}

        {sub === "finance" && (
          <form
            className="form-sections settings-sub-pad"
            onSubmit={(e) => {
              e.preventDefault();
              const d = new FormData(e.currentTarget);
              onSavePartial({ financeCompanies: String(d.get("financeCompanies") || "") });
            }}
          >
            <div className="form-card">
              <div className="form-stack">
                <Field label="One per line">
                  <textarea name="financeCompanies" className="textarea-compact" rows={6} key={(settings.financeCompanies || []).join(",")} defaultValue={(settings.financeCompanies || []).join("\n")} />
                </Field>
              </div>
            </div>
            <button type="submit" className="primary-btn submit-btn">Save</button>
          </form>
        )}

        {sub === "expenseCats" && (
          <form
            className="form-sections settings-sub-pad"
            onSubmit={(e) => {
              e.preventDefault();
              const d = new FormData(e.currentTarget);
              onSavePartial({ expenseCategories: String(d.get("expenseCategories") || "") });
            }}
          >
            <div className="form-card">
              <div className="form-stack">
                <Field label="One per line">
                  <textarea
                    name="expenseCategories"
                    className="textarea-compact"
                    rows={10}
                    key={getExpenseCategoriesList(settings).join("|")}
                    defaultValue={getExpenseCategoriesList(settings).join("\n")}
                  />
                </Field>
              </div>
            </div>
            <button type="submit" className="primary-btn submit-btn">Save</button>
          </form>
        )}

        {sub === "otherIncomeCats" && (
          <form
            className="form-sections settings-sub-pad"
            onSubmit={(e) => {
              e.preventDefault();
              const d = new FormData(e.currentTarget);
              onSavePartial({ otherIncomeCategories: String(d.get("otherIncomeCategories") || "") });
            }}
          >
            <div className="form-card">
              <div className="form-stack">
                <Field label="One per line">
                  <textarea
                    name="otherIncomeCategories"
                    className="textarea-compact"
                    rows={10}
                    key={getOtherIncomeCategoriesList(settings).join("|")}
                    defaultValue={getOtherIncomeCategoriesList(settings).join("\n")}
                  />
                </Field>
              </div>
            </div>
            <button type="submit" className="primary-btn submit-btn">Save</button>
          </form>
        )}

        {sub === "notifications" && (
          <div className="form-sections settings-sub-pad">
            <div className="form-card">
              <div className="toggle-row">
                <div>
                  <div className="toggle-label">Notifications</div>
                </div>
                <label className="toggle-switch" aria-label="Notifications on">
                  <input
                    type="checkbox"
                    checked={settings.notificationsEnabled !== false}
                    onChange={(e) => onSavePartial({ notificationsEnabled: e.target.checked }, { silent: true })}
                  />
                  <span className="toggle-track" />
                </label>
              </div>
            </div>
            <div className={`form-card settings-notif-sub${settings.notificationsEnabled === false ? " settings-notif-sub-muted" : ""}`}>
              <div className="form-card-title">Alert types</div>
              <p className="settings-notif-intro">
                Choose what appears in the bell list and as system notifications (if enabled in the browser).
              </p>
              <div className="toggle-row">
                <div>
                  <div className="toggle-label">Overdue invoice payments</div>
                  <p className="settings-notif-hint">Receivables past their due date</p>
                </div>
                <label className="toggle-switch" aria-label="Overdue payment alerts">
                  <input
                    type="checkbox"
                    checked={settings.notifyOverduePayments !== false}
                    onChange={(e) => onSavePartial({ notifyOverduePayments: e.target.checked }, { silent: true })}
                    disabled={settings.notificationsEnabled === false}
                  />
                  <span className="toggle-track" />
                </label>
              </div>
              <div className="toggle-row">
                <div>
                  <div className="toggle-label">Invoice payment due today</div>
                  <p className="settings-notif-hint">Unpaid invoices whose due date is today</p>
                </div>
                <label className="toggle-switch" aria-label="Invoice due today alerts">
                  <input
                    type="checkbox"
                    checked={settings.notifyPaymentDueToday !== false}
                    onChange={(e) => onSavePartial({ notifyPaymentDueToday: e.target.checked }, { silent: true })}
                    disabled={settings.notificationsEnabled === false}
                  />
                  <span className="toggle-track" />
                </label>
              </div>
              <div className="toggle-row">
                <div>
                  <div className="toggle-label">Upcoming invoice due dates</div>
                  <p className="settings-notif-hint">Unpaid invoices due in 1–14 days (not including today)</p>
                </div>
                <label className="toggle-switch" aria-label="Upcoming invoice due date alerts">
                  <input
                    type="checkbox"
                    checked={settings.notifyPaymentDueSoon !== false}
                    onChange={(e) => onSavePartial({ notifyPaymentDueSoon: e.target.checked }, { silent: true })}
                    disabled={settings.notificationsEnabled === false}
                  />
                  <span className="toggle-track" />
                </label>
              </div>
              <div className="toggle-row">
                <div>
                  <div className="toggle-label">Recurring expense due today</div>
                  <p className="settings-notif-hint">Scheduled expense with next due date today</p>
                </div>
                <label className="toggle-switch" aria-label="Recurring due today alerts">
                  <input
                    type="checkbox"
                    checked={settings.notifyRecurringDueToday !== false}
                    onChange={(e) => onSavePartial({ notifyRecurringDueToday: e.target.checked }, { silent: true })}
                    disabled={settings.notificationsEnabled === false}
                  />
                  <span className="toggle-track" />
                </label>
              </div>
              <div className="toggle-row">
                <div>
                  <div className="toggle-label">Recurring overdue &amp; upcoming</div>
                  <p className="settings-notif-hint">Overdue recurring bills, or next due in 1–14 days</p>
                </div>
                <label className="toggle-switch" aria-label="Recurring overdue and upcoming alerts">
                  <input
                    type="checkbox"
                    checked={settings.notifyRecurringDue !== false}
                    onChange={(e) => onSavePartial({ notifyRecurringDue: e.target.checked }, { silent: true })}
                    disabled={settings.notificationsEnabled === false}
                  />
                  <span className="toggle-track" />
                </label>
              </div>
              <div className="toggle-row">
                <div>
                  <div className="toggle-label">EMI reminder (3 days before)</div>
                  <p className="settings-notif-hint">
                    One alert per unpaid installment, exactly 3 days before the due date, with a ready-to-send WhatsApp message
                  </p>
                </div>
                <label className="toggle-switch" aria-label="EMI reminder 3 days before due">
                  <input
                    type="checkbox"
                    checked={settings.notifyEmiDueThreeDays !== false}
                    onChange={(e) => onSavePartial({ notifyEmiDueThreeDays: e.target.checked }, { silent: true })}
                    disabled={settings.notificationsEnabled === false}
                  />
                  <span className="toggle-track" />
                </label>
              </div>
              <div className="toggle-row">
                <div>
                  <div className="toggle-label">Low stock</div>
                  <p className="settings-notif-hint">Products at zero quantity or below</p>
                </div>
                <label className="toggle-switch" aria-label="Low stock alerts">
                  <input
                    type="checkbox"
                    checked={settings.notifyLowStock !== false}
                    onChange={(e) => onSavePartial({ notifyLowStock: e.target.checked }, { silent: true })}
                    disabled={settings.notificationsEnabled === false}
                  />
                  <span className="toggle-track" />
                </label>
              </div>
              <div className="toggle-row">
                <div>
                  <div className="toggle-label">Free servicing due</div>
                  <p className="settings-notif-hint">Visits 1–3 at months 1, 2, 3 after each sale</p>
                </div>
                <label className="toggle-switch" aria-label="Servicing due alerts">
                  <input
                    type="checkbox"
                    checked={settings.notifyServicingDue !== false}
                    onChange={(e) => onSavePartial({ notifyServicingDue: e.target.checked }, { silent: true })}
                    disabled={settings.notificationsEnabled === false}
                  />
                  <span className="toggle-track" />
                </label>
              </div>
            </div>
          </div>
        )}

        {sub === "cloud" && (
          <div className="form-sections settings-sub-pad">
            <div className="form-card">
              <div className="form-card-title">Status</div>
              {syncStale ? (
                <p
                  style={{
                    margin: "8px 0 12px",
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: "1px solid color-mix(in srgb, var(--danger) 35%, var(--line))",
                    background: "color-mix(in srgb, var(--danger-bg) 82%, var(--card))",
                    color: "var(--danger)",
                    fontSize: "0.82rem",
                    lineHeight: 1.4,
                    fontWeight: 600,
                  }}
                  role="alert"
                >
                  Sync watchdog: no successful sync in the last 2 minutes while online.
                </p>
              ) : null}
              <div className="settings-cloud-grid">
                <div className="settings-cloud-row">
                  <span className="settings-cloud-k">Network</span>
                  <span className={`settings-cloud-v${online ? " settings-cloud-ok" : ""}`}>{online ? "Online" : "Offline"}</span>
                </div>
                <div className="settings-cloud-row">
                  <span className="settings-cloud-k">Email</span>
                  <span className="settings-cloud-v">{sessionEmail || "—"}</span>
                </div>
                <div className="settings-cloud-row">
                  <span className="settings-cloud-k">User id</span>
                  <span className="settings-cloud-v settings-cloud-mono">
                    {accountId && accountId !== "local-user" ? `${accountId.slice(0, 8)}…` : "—"}
                  </span>
                </div>
                <div className="settings-cloud-row">
                  <span className="settings-cloud-k">Last sync</span>
                  <span className="settings-cloud-v">
                    {cloudSyncMeta?.at ? new Date(cloudSyncMeta.at).toLocaleString() : "—"}
                  </span>
                </div>
                <div className="settings-cloud-row">
                  <span className="settings-cloud-k">Result</span>
                  <span className={`settings-cloud-v${cloudSyncMeta?.ok === false ? " settings-cloud-err" : ""}`}>
                    {cloudSyncMeta?.detail || "—"}
                  </span>
                </div>
                {cloudSyncMeta?.errors && cloudSyncMeta.errors.length > 0 ? (
                  <div className="settings-cloud-errors" role="alert">
                    <div className="settings-cloud-errors-title">Errors</div>
                    <ul className="settings-cloud-errors-list">
                      {cloudSyncMeta.errors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
              <div className="settings-cloud-actions">
                <button type="button" className="primary-btn settings-cloud-sync-btn" onClick={runManualSync} disabled={syncBusy || !online}>
                  {syncBusy ? "Syncing…" : "Sync now"}
                </button>
                <button type="button" className="settings-cloud-secondary-btn" onClick={runFullReconcile} disabled={syncBusy || !online}>
                  Full reconcile
                </button>
                <button type="button" className="settings-cloud-secondary-btn" onClick={() => refreshOutbox()} disabled={syncBusy}>
                  Refresh outbox
                </button>
              </div>
            </div>

            <div className="form-card">
              <div className="form-card-title">Outbox ({outboxCount} pending)</div>
              {outboxRows.length === 0 ? (
                <p className="settings-outbox-empty">No pending rows.</p>
              ) : (
                <div className="settings-outbox-wrap">
                  <table className="settings-outbox-table" aria-label="Pending outbox entries">
                    <thead>
                      <tr>
                        <th>Entity</th>
                        <th>Record</th>
                        <th>Op</th>
                        <th>Status</th>
                        <th>Updated</th>
                      </tr>
                    </thead>
                    <tbody>
                      {outboxRows.map((row) => (
                        <tr key={row.id}>
                          <td>{row.entityType}</td>
                          <td className="settings-cloud-mono">{String(row.recordId ?? "").length > 28 ? `${String(row.recordId ?? "").slice(0, 28)}…` : String(row.recordId ?? "")}</td>
                          <td>{row.op}</td>
                          <td>{row.status ?? "—"}</td>
                          <td className="settings-outbox-time">{row.updatedAt ? String(row.updatedAt).slice(0, 19) : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="form-card">
              <div className="form-card-title">
                Sync conflicts ({(syncConflictQueue || []).filter((x) => x?.status !== "resolved").length} open)
              </div>
              {(syncConflictQueue || []).length === 0 ? (
                <p className="settings-outbox-empty">No conflicts queued.</p>
              ) : (
                <>
                  <div className="settings-outbox-wrap">
                    <table className="settings-outbox-table" aria-label="Sync conflict queue">
                      <thead>
                        <tr>
                          <th>Entity</th>
                          <th>Record</th>
                          <th>Reason</th>
                          <th>Status</th>
                          <th>Local preview</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {syncConflictQueue
                          .slice()
                          .reverse()
                          .slice(0, 100)
                          .map((row) => {
                            const hasPreview = !!(row.localPayloadPreview && String(row.localPayloadPreview).trim());
                            const expanded = expandedConflictId === row.id;
                            let previewText = "";
                            if (hasPreview && expanded) {
                              try {
                                previewText = JSON.stringify(JSON.parse(row.localPayloadPreview), null, 2);
                              } catch {
                                previewText = String(row.localPayloadPreview);
                              }
                            }
                            return (
                            <tr key={row.id}>
                              <td>{row.entityType}</td>
                              <td className="settings-cloud-mono">{String(row.recordId || "")}</td>
                              <td>{row.reason || "conflict"}</td>
                              <td>{row.status || "open"}</td>
                              <td>
                                {hasPreview ? (
                                  <button
                                    type="button"
                                    className="settings-cloud-secondary-btn settings-conflict-preview-btn"
                                    onClick={() => setExpandedConflictId(expanded ? null : row.id)}
                                  >
                                    {expanded ? "Hide" : "View"}
                                  </button>
                                ) : (
                                  "—"
                                )}
                                {expanded && previewText ? (
                                  <pre className="settings-conflict-preview">{previewText}</pre>
                                ) : null}
                              </td>
                              <td className="settings-conflict-actions">
                                {row.status === "resolved" ? (
                                  "—"
                                ) : (
                                  <>
                                    {hasPreview ? (
                                      <button
                                        type="button"
                                        className="settings-cloud-secondary-btn"
                                        onClick={() => onRestoreSyncConflict?.(row.id)}
                                      >
                                        Restore local
                                      </button>
                                    ) : null}
                                    <button
                                      type="button"
                                      className="settings-cloud-secondary-btn"
                                      onClick={() => onResolveSyncConflict?.(row.id)}
                                    >
                                      Mark resolved
                                    </button>
                                  </>
                                )}
                              </td>
                            </tr>
                          );
                          })}
                      </tbody>
                    </table>
                  </div>
                  <div className="settings-cloud-actions">
                    <button type="button" className="settings-cloud-secondary-btn" onClick={() => onClearResolvedConflicts?.()}>
                      Clear resolved
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {sub === "danger" && (
          <div className="form-sections settings-sub-pad">
            <div className="form-card danger-zone-intro-card">
              <div className="form-card-title">Before you reset</div>
              <p className="settings-inline-hint" style={{ marginTop: 0 }}>
                Export a backup under <strong>Data backup</strong> if you may need your books later. Reset removes sales,
                expenses, inventory, customers, and settings from this device (and from linked cloud data when you sync).
              </p>
            </div>
            <div className="form-card danger-zone-card">
              <p className="danger-zone-warning">This cannot be undone from the app.</p>
              <button type="button" className="btn-danger danger-zone-btn" onClick={onResetAllData}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                  <path d="M10 11v6M14 11v6" />
                  <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
                </svg>
                Reset all data
              </button>
            </div>
          </div>
        )}
        <p className="settings-app-version settings-app-version-sub" aria-label={`App version ${APP_VERSION}`}>
          Version {APP_VERSION}
        </p>
      </div>
    </TabPageChrome>
  );
}

function ThemeAppearanceSection({ darkMode, setDarkMode }) {
  const [mode, setMode] = useState(() => {
    const m = getThemeMode();
    if (m === "auto") return "auto";
    return darkMode ? "dark" : "light";
  });

  const pick = useCallback(
    (next) => {
      setMode(next);
      const isDark = setThemeMode(next);
      setDarkMode(isDark);
    },
    [setDarkMode]
  );

  return (
    <div className="form-sections settings-sub-pad">
      <p className="settings-inline-hint" style={{ marginTop: 0 }}>
        Choose how the app looks on this device. <strong>System</strong> follows your phone or computer theme.
      </p>
      <div className="form-card">
        <div className="form-card-title">Theme</div>
        <div className="theme-mode-group" role="radiogroup" aria-label="Theme">
          <button
            type="button"
            role="radio"
            aria-checked={mode === "light"}
            className={`theme-mode-btn${mode === "light" ? " active" : ""}`}
            onClick={() => pick("light")}
          >
            <span className="theme-mode-sw theme-mode-sw--light" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
              </svg>
            </span>
            <span className="theme-mode-lbl">Light</span>
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={mode === "auto"}
            className={`theme-mode-btn${mode === "auto" ? " active" : ""}`}
            onClick={() => pick("auto")}
          >
            <span className="theme-mode-sw theme-mode-sw--auto" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" />
              </svg>
            </span>
            <span className="theme-mode-lbl">System</span>
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={mode === "dark"}
            className={`theme-mode-btn${mode === "dark" ? " active" : ""}`}
            onClick={() => pick("dark")}
          >
            <span className="theme-mode-sw theme-mode-sw--dark" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z" />
              </svg>
            </span>
            <span className="theme-mode-lbl">Dark</span>
          </button>
        </div>
        <p className="settings-inline-hint" style={{ marginTop: 14, marginBottom: 0 }}>
          Tip: press <kbd>Cmd</kbd>/<kbd>Ctrl</kbd>+<kbd>K</kbd> or <kbd>/</kbd> anywhere to open search.
        </p>
      </div>
    </div>
  );
}