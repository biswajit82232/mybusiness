/**
 * Pure cloud-sync payload helpers (no Supabase / IndexedDB) — safe for Node sanity scripts.
 */

const ENTITY_TYPES_WITH_OBJECT_ID = new Set([
  "sales",
  "expenses",
  "otherIncomes",
  "recurringExpenses",
  "inventoryEntries",
  "purchases",
  "emiEntries",
  "loansGiven",
  "customerDirectory",
  "vendorDirectory",
  "auditEvents",
  "syncConflictQueue",
]);

/** Same emptiness test as App bootstrap (local-first restore from legacy cache). */
export function isPayloadEffectivelyEmpty(p) {
  if (!p || typeof p !== "object") return true;
  return (
    !p.settings &&
    !p.balance &&
    !(Array.isArray(p.sales) && p.sales.length) &&
    !(Array.isArray(p.expenses) && p.expenses.length) &&
    !(Array.isArray(p.otherIncomes) && p.otherIncomes.length) &&
    !(Array.isArray(p.recurringExpenses) && p.recurringExpenses.length) &&
    !(Array.isArray(p.inventoryEntries) && p.inventoryEntries.length) &&
    !(Array.isArray(p.emiEntries) && p.emiEntries.length) &&
    !(Array.isArray(p.loansGiven) && p.loansGiven.length) &&
    !(Array.isArray(p.purchases) && p.purchases.length) &&
    !(Array.isArray(p.customerDirectory) && p.customerDirectory.length) &&
    !(Array.isArray(p.vendorDirectory) && p.vendorDirectory.length) &&
    !(Array.isArray(p.dismissedAlertIds) && p.dismissedAlertIds.length) &&
    !(Array.isArray(p.auditEvents) && p.auditEvents.length) &&
    !(Array.isArray(p.syncConflictQueue) && p.syncConflictQueue.length)
  );
}

export function normalizeEntityPayloadWithRecordId(entityType, recordId, payload) {
  const rid = String(recordId ?? "").trim();
  if (entityType === "settings") {
    if (payload == null) return { settings: null, balance: null, servicingCompletions: [], servicingWaSent: [] };
    if (typeof payload !== "object") return null;
    return {
      settings: payload.settings ?? null,
      balance: payload.balance ?? null,
      servicingCompletions: Array.isArray(payload.servicingCompletions) ? payload.servicingCompletions : [],
      servicingWaSent: Array.isArray(payload.servicingWaSent) ? payload.servicingWaSent : [],
    };
  }
  if (entityType === "balance") {
    if (payload == null) return { balance: null };
    if (typeof payload !== "object") return null;
    return { balance: payload.balance ?? payload ?? null };
  }
  if (entityType === "dismissedAlertIds") {
    const id = String(payload?.id ?? rid).trim();
    if (!id) return null;
    return { id };
  }
  if (!ENTITY_TYPES_WITH_OBJECT_ID.has(entityType)) return null;
  if (payload == null || typeof payload !== "object") return null;
  const next = { ...payload };
  if (!rid) return null;
  next.id = rid;
  return next;
}

export function parseUpdatedAtMs(iso) {
  if (!iso) return 0;
  const t = Date.parse(String(iso));
  return Number.isFinite(t) ? t : 0;
}

/**
 * Conflict rule: last-write-wins by `updatedAt` timestamp.
 * Pending outbox is tracked separately; when local is newer, keep local even if outbox was cleared after push.
 */
export function remoteWinsLocalRow(localRow, remoteIso, _hasPendingLocalChange) {
  if (!localRow) return true;
  const lt = parseUpdatedAtMs(localRow.updatedAt);
  const rt = parseUpdatedAtMs(remoteIso);
  return rt > lt;
}

/** Network / 5xx / rate-limit — worth retrying the whole sync or an outbox row. */
export function isTransientSyncError(e) {
  if (!e || typeof e !== "object") {
    const s = String(e || "").toLowerCase();
    return /network|fetch|timeout|econnreset|socket|aborted|failed to fetch|load failed/.test(s);
  }
  const code = e.code ?? e.status ?? e.statusCode;
  if (code === 503 || code === 502 || code === 504 || code === 429 || code === "503" || code === "502") return true;
  const msg = String(e.message || e || "").toLowerCase();
  return /network|fetch|timeout|econnreset|socket|aborted|failed to fetch|load failed|too many requests|gateway|unavailable/.test(msg);
}

/**
 * Convert server rows to the same shape as `loadUserLocalState` (before mergePersistedPayload).
 */
export function entityRowsToLocalPayload(rows) {
  const sales = new Map();
  const expenses = new Map();
  const otherIncomes = new Map();
  const recurringExpenses = new Map();
  const inventoryEntries = new Map();
  const purchases = new Map();
  const emiEntries = new Map();
  const loansGiven = new Map();
  const customerDirectory = new Map();
  const vendorDirectory = new Map();
  const dismissedAlertIds = [];
  const auditEvents = new Map();
  const syncConflictQueue = new Map();
  let settings = null;
  let balance = null;
  let servicingCompletions = null;
  let servicingWaSent = null;

  const putById = (map, entityType, row) => {
    const normalized = normalizeEntityPayloadWithRecordId(entityType, row.record_id, row.payload ?? null);
    if (!normalized || normalized.id == null) return;
    map.set(String(normalized.id), normalized);
  };

  for (const r of rows || []) {
    const t = r.entity_type;
    if (t === "settings" && !r.deleted && r.payload && typeof r.payload === "object") {
      settings = r.payload.settings ?? null;
      balance = r.payload.balance ?? null;
      servicingCompletions = Array.isArray(r.payload.servicingCompletions) ? r.payload.servicingCompletions : null;
      servicingWaSent = Array.isArray(r.payload.servicingWaSent) ? r.payload.servicingWaSent : null;
    }
    if (t === "balance" && !r.deleted && r.payload && typeof r.payload === "object") {
      balance = r.payload.balance ?? r.payload ?? null;
    }
    if (r.deleted) continue;
    if (t === "sales") putById(sales, t, r);
    else if (t === "expenses") putById(expenses, t, r);
    else if (t === "otherIncomes") putById(otherIncomes, t, r);
    else if (t === "recurringExpenses") putById(recurringExpenses, t, r);
    else if (t === "inventoryEntries") putById(inventoryEntries, t, r);
    else if (t === "purchases") putById(purchases, t, r);
    else if (t === "emiEntries") putById(emiEntries, t, r);
    else if (t === "loansGiven") putById(loansGiven, t, r);
    else if (t === "customerDirectory") putById(customerDirectory, t, r);
    else if (t === "vendorDirectory") putById(vendorDirectory, t, r);
    else if (t === "auditEvents") putById(auditEvents, t, r);
    else if (t === "syncConflictQueue") putById(syncConflictQueue, t, r);
    else if (t === "dismissedAlertIds") {
      const id = normalizeEntityPayloadWithRecordId(t, r.record_id, r.payload ?? null)?.id;
      if (id != null) dismissedAlertIds.push(String(id));
    }
  }

  return {
    settings,
    balance,
    servicingCompletions,
    servicingWaSent,
    sales: [...sales.values()],
    expenses: [...expenses.values()],
    otherIncomes: [...otherIncomes.values()],
    recurringExpenses: [...recurringExpenses.values()],
    inventoryEntries: [...inventoryEntries.values()],
    purchases: [...purchases.values()],
    emiEntries: [...emiEntries.values()],
    loansGiven: [...loansGiven.values()],
    customerDirectory: [...customerDirectory.values()],
    vendorDirectory: [...vendorDirectory.values()],
    dismissedAlertIds,
    auditEvents: [...auditEvents.values()],
    syncConflictQueue: [...syncConflictQueue.values()],
  };
}
