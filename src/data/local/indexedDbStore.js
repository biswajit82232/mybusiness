import { openDB } from "idb";

const DB_NAME = "mybusiness_offline_v1";
const DB_VERSION = 11;

/**
 * IndexedDB local-first storage:
 * - Legacy: `cache/app_state` (migration + crash-safe fallback snapshot)
 * - Normalized per-entity stores (settings, sales, expenses, …)
 * - Outbox: one coalesced row per (user, entity, record) for future remote sync; written in the
 *   same transaction as the entity row so both succeed or both roll back.
 * - `sync_state`: reserved for cursors / last sync token (future).
 */

const ENTITIES = [
  "settings",
  "balance",
  "sales",
  "expenses",
  "otherIncomes",
  "recurringExpenses",
  "inventoryEntries",
  "purchases",
  "emiEntries",
  "loansGiven",
  "customerDirectory",
  "customerAdvancePayments",
  "vendorDirectory",
  "dismissedAlertIds",
  "auditEvents",
  "syncConflictQueue",
];

const STORE_LEGACY_CACHE = "cache";
const STORE_OUTBOX = "outbox";
const STORE_SYNC_STATE = "sync_state";

const legacyEntityStores = {
  settings: "user_settings",
  balance: "user_settings",
  sales: "sales",
  expenses: "expenses",
  otherIncomes: "other_incomes",
  recurringExpenses: "recurring_expenses",
  inventoryEntries: "inventory_entries",
  purchases: "purchases",
  emiEntries: "emi_entries",
  loansGiven: "loans_given",
  customerDirectory: "customer_directory",
  customerAdvancePayments: "customer_advance_payments",
  vendorDirectory: "vendor_directory",
  dismissedAlertIds: "dismissed_alerts",
  auditEvents: "audit_events",
  syncConflictQueue: "sync_conflicts",
};

// Singleton DB connection — shared across all calls so we never open
// multiple concurrent connections (which causes version-change conflicts
// especially after a hard refresh or service-worker update).
let _db = null;
let _dbPromise = null;
const DB_OPEN_TIMEOUT_MS = 8000;

/** Warm the IndexedDB connection during boot (no-op if already open). */
export function prefetchIndexedDb() {
  return getDb();
}

async function getDb() {
  if (_db) return _db;
  if (_dbPromise) return _dbPromise;

  const openPromise = openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, _newVersion, tx) {
      // v1/v2 → create outbox if not yet present
      if (!db.objectStoreNames.contains(STORE_OUTBOX)) {
        const outboxStore = db.createObjectStore(STORE_OUTBOX, { keyPath: "id" });
        outboxStore.createIndex("by_userId_status", ["userId", "status"], { unique: false });
        outboxStore.createIndex("by_userId", "userId", { unique: false });
      } else if (oldVersion < 3) {
        // v2 → v3: add missing indexes to pre-existing outbox
        const outboxStore = tx.objectStore(STORE_OUTBOX);
        if (!outboxStore.indexNames.contains("by_userId_status")) {
          outboxStore.createIndex("by_userId_status", ["userId", "status"], { unique: false });
        }
        if (!outboxStore.indexNames.contains("by_userId")) {
          outboxStore.createIndex("by_userId", "userId", { unique: false });
        }
      }

      // v4: outbox was unused before — clear stale rows.
      if (oldVersion < 4 && db.objectStoreNames.contains(STORE_OUTBOX)) {
        tx.objectStore(STORE_OUTBOX).clear();
      }
      if (!db.objectStoreNames.contains("meta")) {
        db.createObjectStore("meta");
      }
      if (oldVersion < 4) {
        tx.objectStore("meta").put(4, "idb_schema_version");
      }
      if (oldVersion < 5) {
        tx.objectStore("meta").put(5, "idb_schema_version");
      }
      if (oldVersion < 6) {
        tx.objectStore("meta").put(6, "idb_schema_version");
      }
      if (oldVersion < 7) {
        tx.objectStore("meta").put(7, "idb_schema_version");
      }
      if (oldVersion < 8) {
        tx.objectStore("meta").put(8, "idb_schema_version");
      }
      if (oldVersion < 9) {
        tx.objectStore("meta").put(9, "idb_schema_version");
      }
      if (oldVersion < 10) {
        tx.objectStore("meta").put(10, "idb_schema_version");
      }
      if (oldVersion < 11) {
        tx.objectStore("meta").put(11, "idb_schema_version");
      }
      if (!db.objectStoreNames.contains(STORE_LEGACY_CACHE)) {
        db.createObjectStore(STORE_LEGACY_CACHE);
      }

      // New: sync state cursor (per user)
      if (!db.objectStoreNames.contains(STORE_SYNC_STATE)) {
        db.createObjectStore(STORE_SYNC_STATE, { keyPath: "key" });
      }

      // Entity stores (normalized records; tombstones supported via `deleted`)
      for (const entity of ENTITIES) {
        const storeName = legacyEntityStores[entity];
        if (db.objectStoreNames.contains(storeName)) continue;

        if (entity === "settings") {
          const s = db.createObjectStore(storeName, { keyPath: "key" });
          s.createIndex("userId", "userId", { unique: false });
          continue;
        }

        if (entity === "dismissedAlertIds") {
          const s = db.createObjectStore(storeName, { keyPath: "key" });
          s.createIndex("userId", "userId", { unique: false });
          continue;
        }

        const s = db.createObjectStore(storeName, { keyPath: "key" });
        s.createIndex("userId", "userId", { unique: false });
      }
    },

    // Another tab has an older version open — log but don't crash.
    blocked() {
      console.warn("[IDB] version upgrade blocked by another tab");
    },

    // A newer version wants to open — release our connection so it can upgrade.
    blocking() {
      console.warn("[IDB] closing connection to unblock upgrade in another tab");
      _db = null;
      _dbPromise = null;
    },

    // Connection closed unexpectedly (e.g. browser killed it).
    terminated() {
      console.warn("[IDB] connection terminated unexpectedly");
      _db = null;
      _dbPromise = null;
    },
  }).then((db) => {
    _db = db;
    _dbPromise = null;
    return db;
  }).catch((err) => {
    _dbPromise = null;
    throw err;
  });

  let openTimer = null;
  _dbPromise = Promise.race([
    openPromise,
    new Promise((_, reject) => {
      openTimer = setTimeout(() => reject(new Error("idb-open-timeout")), DB_OPEN_TIMEOUT_MS);
    }),
  ]).finally(() => {
    if (openTimer != null) clearTimeout(openTimer);
  });

  return _dbPromise;
}

/** PWA-safe persistent cache — survives PWA close/reopen unlike sessionStorage */
export async function writeAppCache(data) {
  const db = await getDb();
  await db.put("cache", { data, savedAt: Date.now() }, "app_state");
}

export async function readAppCache() {
  const db = await getDb();
  const entry = await db.get("cache", "app_state");
  return entry?.data ?? null;
}

export async function readAppCacheWithSavedAt() {
  const db = await getDb();
  const entry = await db.get("cache", "app_state");
  if (!entry) return null;
  return { data: entry.data ?? null, savedAt: entry.savedAt ?? null };
}

export async function clearAppCache() {
  const db = await getDb();
  await db.delete("cache", "app_state");
}

function makeEntityStore(entityType) {
  const storeName = legacyEntityStores[entityType];
  if (!storeName) throw new Error(`Unknown entityType: ${entityType}`);
  return storeName;
}

function makeEntityKey(userId, recordId) {
  // Use a stable composite key; helps avoid cross-user collisions.
  return `${userId}::${recordId}`;
}

/** Stable key segment for outbox coalescing (settings/balance map to one logical record id). */
function recordIdForOutbox(entityType, recordId) {
  return entityType === "settings" || entityType === "balance" ? "__settings__" : String(recordId);
}

/** One pending outbox row per (user, entity, record); overwrites on each local change. */
export function makeOutboxCoalesceId(userId, entityType, recordId) {
  const entity = normalizeEntityType(entityType);
  const rk = recordIdForOutbox(entity, recordId);
  return `p|${userId}|${entity}|${encodeURIComponent(rk)}`;
}

function normalizeEntityType(entityType) {
  if (!ENTITIES.includes(entityType)) throw new Error(`Unknown entityType: ${entityType}`);
  return entityType;
}

/**
 * Write/overwrite one local record (or tombstone) and mirror the change into the outbox in the
 * same IndexedDB transaction — either both commit or neither.
 * Outbox rows are coalesced per record so size stays bounded (~one row per touched entity).
 */
export async function upsertLocalEntityRecord({
  userId,
  entityType,
  recordId,
  payload,
  deleted = false,
  updatedAt,
  revision,
}) {
  const db = await getDb();
  const entity = normalizeEntityType(entityType);
  const storeName = makeEntityStore(entity);
  const key = entity === "settings" || entity === "balance" ? userId : makeEntityKey(userId, recordId);
  const existing = await db.get(storeName, key);
  const revisionToStore =
    revision != null && Number.isFinite(Number(revision))
      ? Number(revision)
      : existing?.revision != null && Number.isFinite(Number(existing.revision))
        ? Number(existing.revision)
        : null;

  // Store object is per-store:
  // - settings: { key:userId, userId, deleted:false, updatedAt, payload:{settings,balance...} }
  // - others:  { key:"user::record", userId, recordId, deleted, updatedAt, payload }
  const row =
    entity === "settings" || entity === "balance"
      ? { key, userId, deleted: false, updatedAt, revision: revisionToStore, payload }
      : {
          key,
          userId,
          recordId,
          deleted,
          updatedAt,
          revision: revisionToStore,
          payload,
        };

  const rk = recordIdForOutbox(entity, recordId);
  const outboxId = `p|${userId}|${entity}|${encodeURIComponent(rk)}`;
  const outboxRow = {
    id: outboxId,
    userId,
    entityType: entity,
    recordId: rk,
    op: deleted ? "delete" : "put",
    payload: deleted ? null : payload,
    updatedAt,
    revision: revisionToStore,
    status: "pending",
    lastTouchedAt: Date.now(),
  };

  const tx = db.transaction([storeName, STORE_OUTBOX], "readwrite");
  tx.objectStore(storeName).put(row);
  tx.objectStore(STORE_OUTBOX).put(outboxRow);
  await tx.done;
}

export async function tombstoneLocalEntityRecord({ userId, entityType, recordId, updatedAt, revision }) {
  return upsertLocalEntityRecord({
    userId,
    entityType,
    recordId,
    payload: {},
    deleted: true,
    updatedAt,
    revision,
  });
}

export async function getLocalEntityRecord({ userId, entityType, recordId }) {
  const db = await getDb();
  const entity = normalizeEntityType(entityType);
  const storeName = makeEntityStore(entity);
  const key = entity === "settings" || entity === "balance" ? userId : makeEntityKey(userId, recordId);
  return db.get(storeName, key);
}

async function getAllLocalEntityRowsForUser({ userId, entityType }) {
  const db = await getDb();
  const entity = normalizeEntityType(entityType);
  const storeName = makeEntityStore(entity);

  if (entity === "settings" || entity === "balance") {
    // Singleton row, so direct get is enough.
    return [await db.get(storeName, userId)].filter(Boolean);
  }

  const rows = [];
  // Use cursor by userId index when present.
  const tx = db.transaction(storeName, "readonly");
  const store = tx.objectStore(storeName);
  const idx = store.index("userId");
  for await (const cursor of idx.iterate(IDBKeyRange.only(userId))) {
    rows.push(cursor.value);
  }
  await tx.done;
  return rows;
}

/**
 * Load normalized local state for one user.
 * Returns a structure matching `defaultState` shape in `src/App.jsx`.
 */
export async function loadUserLocalState(userId) {
  // Build a "payload-like" object that `mergePersistedPayload` can understand.
  const [settingsRow, salesRows, expensesRows, otherIncomeRows, recurringRows, invRows, purchaseRows, emiRows, loansGivenRows, customerDirRows, customerAdvanceRows, vendorDirRows, dismissedRows, auditRows, conflictRows] =
    await Promise.all([
      getAllLocalEntityRowsForUser({ userId, entityType: "settings" }),
      getAllLocalEntityRowsForUser({ userId, entityType: "sales" }),
      getAllLocalEntityRowsForUser({ userId, entityType: "expenses" }),
      getAllLocalEntityRowsForUser({ userId, entityType: "otherIncomes" }),
      getAllLocalEntityRowsForUser({ userId, entityType: "recurringExpenses" }),
      getAllLocalEntityRowsForUser({ userId, entityType: "inventoryEntries" }),
      getAllLocalEntityRowsForUser({ userId, entityType: "purchases" }),
      getAllLocalEntityRowsForUser({ userId, entityType: "emiEntries" }),
      getAllLocalEntityRowsForUser({ userId, entityType: "loansGiven" }),
      getAllLocalEntityRowsForUser({ userId, entityType: "customerDirectory" }),
      getAllLocalEntityRowsForUser({ userId, entityType: "customerAdvancePayments" }),
      getAllLocalEntityRowsForUser({ userId, entityType: "vendorDirectory" }),
      getAllLocalEntityRowsForUser({ userId, entityType: "dismissedAlertIds" }),
      getAllLocalEntityRowsForUser({ userId, entityType: "auditEvents" }),
      getAllLocalEntityRowsForUser({ userId, entityType: "syncConflictQueue" }),
    ]);

  const settingsPayload = settingsRow?.[0]?.payload ?? null;

  return {
    settings: settingsPayload?.settings ?? null,
    balance: settingsPayload?.balance ?? null,
    servicingCompletions: settingsPayload?.servicingCompletions ?? null,
    servicingWaSent: settingsPayload?.servicingWaSent ?? null,
    sales: salesRows.filter((r) => !r.deleted).map((r) => r.payload),
    expenses: expensesRows.filter((r) => !r.deleted).map((r) => r.payload),
    otherIncomes: otherIncomeRows.filter((r) => !r.deleted).map((r) => r.payload),
    recurringExpenses: recurringRows.filter((r) => !r.deleted).map((r) => r.payload),
    inventoryEntries: invRows.filter((r) => !r.deleted).map((r) => r.payload),
    purchases: purchaseRows.filter((r) => !r.deleted).map((r) => r.payload),
    emiEntries: emiRows.filter((r) => !r.deleted).map((r) => r.payload),
    loansGiven: loansGivenRows.filter((r) => !r.deleted).map((r) => r.payload),
    customerDirectory: customerDirRows.filter((r) => !r.deleted).map((r) => r.payload),
    customerAdvancePayments: customerAdvanceRows.filter((r) => !r.deleted).map((r) => r.payload),
    vendorDirectory: vendorDirRows.filter((r) => !r.deleted).map((r) => r.payload),
    dismissedAlertIds: dismissedRows.filter((r) => !r.deleted).map((r) => String(r.payload?.id ?? r.recordId)),
    auditEvents: auditRows.filter((r) => !r.deleted).map((r) => r.payload),
    syncConflictQueue: conflictRows.filter((r) => !r.deleted).map((r) => r.payload),
  };
}

export async function clearAllLocalData() {
  const db = await getDb();
  // Best-effort: delete known stores. Ignore missing stores across versions.
  const stores = [
    STORE_LEGACY_CACHE,
    STORE_OUTBOX,
    STORE_SYNC_STATE,
    ...Object.values(legacyEntityStores),
  ];
  for (const storeName of stores) {
    if (!db.objectStoreNames.contains(storeName)) continue;
    const tx = db.transaction(storeName, "readwrite");
    await tx.objectStore(storeName).clear();
    await tx.done;
  }
}

/** @returns {Promise<number|null>} Numeric schema marker after v4 upgrade; null if never set. */
export async function getIndexedDbSchemaVersion() {
  const v = await getMeta("idb_schema_version");
  return typeof v === "number" ? v : null;
}

export async function getMeta(key) {
  const db = await getDb();
  const row = await db.get("meta", key);
  return row ?? null;
}

export async function setMeta(key, value) {
  const db = await getDb();
  await db.put("meta", value, key);
}

/**
 * Pending outbox rows for a user (for a future remote sync or diagnostics).
 * Sorted by `lastTouchedAt` ascending.
 */
export async function getPendingOutboxEntries(userId, { limit = 500 } = {}) {
  const db = await getDb();
  if (!db.objectStoreNames.contains(STORE_OUTBOX)) return [];
  const tx = db.transaction(STORE_OUTBOX, "readonly");
  const store = tx.objectStore(STORE_OUTBOX);
  const idx = store.index("by_userId");
  const rows = [];
  for await (const cursor of idx.iterate(IDBKeyRange.only(userId))) {
    rows.push(cursor.value);
    if (rows.length >= limit) break;
  }
  await tx.done;
  rows.sort((a, b) => (a.lastTouchedAt ?? 0) - (b.lastTouchedAt ?? 0));
  return rows;
}

export async function getPendingOutboxCount(userId) {
  const db = await getDb();
  if (!db.objectStoreNames.contains(STORE_OUTBOX)) return 0;
  const tx = db.transaction(STORE_OUTBOX, "readonly");
  const idx = tx.objectStore(STORE_OUTBOX).index("by_userId");
  let n = 0;
  for await (const _cursor of idx.iterate(IDBKeyRange.only(userId))) {
    n += 1;
  }
  await tx.done;
  return n;
}

/** Call after a successful remote sync for this record (or pass explicit coalesce `id`). */
export async function removeOutboxEntryById(outboxId) {
  const db = await getDb();
  await db.delete(STORE_OUTBOX, outboxId);
}

export async function removePendingOutboxForRecord({ userId, entityType, recordId }) {
  const id = makeOutboxCoalesceId(userId, entityType, recordId);
  await removeOutboxEntryById(id);
}

/**
 * Whether this exact logical record currently has a pending local change in outbox.
 * Useful for sync conflict decisions (protect unsynced local edits).
 */
export async function hasPendingOutboxForRecord({ userId, entityType, recordId }) {
  const db = await getDb();
  if (!db.objectStoreNames.contains(STORE_OUTBOX)) return false;
  const id = makeOutboxCoalesceId(userId, entityType, recordId);
  const row = await db.get(STORE_OUTBOX, id);
  return !!row;
}

/**
 * Pending outbox for merge/LWW — settings and balance share one logical record.
 */
export async function hasPendingLocalChangeForMerge({ userId, entityType, serverRecordId }) {
  const t = String(entityType || "");
  const rid = outboxRecordIdParamForMerge(t, serverRecordId);
  if (t === "settings" || t === "balance") {
    return hasPendingOutboxForRecord({ userId, entityType: "settings", recordId: rid });
  }
  return hasPendingOutboxForRecord({ userId, entityType: t, recordId: rid });
}

function outboxRecordIdParamForMerge(entityType, serverRecordId) {
  if (entityType === "settings" || entityType === "balance") return "__settings__";
  return String(serverRecordId ?? "");
}

/**
 * After a successful cloud push, store server version/timestamp on the local row (no outbox).
 */
export async function updateLocalEntityAfterCloudPush({
  userId,
  entityType,
  recordId,
  revision,
  updatedAt,
  balanceRevision,
}) {
  const db = await getDb();
  const entity = normalizeEntityType(entityType);
  const storeName = makeEntityStore(entity);
  const key =
    entity === "settings" || entity === "balance" ? userId : makeEntityKey(userId, recordId);
  const row = await db.get(storeName, key);
  if (!row) return;
  if (revision != null && Number.isFinite(Number(revision))) {
    row.revision = Number(revision);
  }
  if (typeof updatedAt === "string" && updatedAt.length > 0) {
    row.updatedAt = updatedAt;
  }
  if (balanceRevision != null && Number.isFinite(Number(balanceRevision))) {
    row.balanceRevision = Number(balanceRevision);
  }
  await db.put(storeName, row);
}

/** Delete every normalized entity row for this user (not cache/outbox/sync_state). */
export async function deleteAllEntityRowsForUser(userId) {
  const db = await getDb();
  for (const entity of ENTITIES) {
    const storeName = legacyEntityStores[entity];
    if (entity === "settings" || entity === "balance") {
      await db.delete(storeName, userId);
      continue;
    }
    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    const idx = store.index("userId");
    let cur = await idx.openCursor(IDBKeyRange.only(userId));
    while (cur) {
      await cur.delete();
      cur = await cur.continue();
    }
    await tx.done;
  }
}

/**
 * Write one entity row without touching the outbox (used after a full cloud restore).
 */
export async function putLocalEntityRowWithoutOutbox({
  userId,
  entityType,
  recordId,
  payload,
  deleted,
  updatedAt,
  revision = null,
  balanceRevision = undefined,
}) {
  const db = await getDb();
  const entity = normalizeEntityType(entityType);
  const storeName = makeEntityStore(entity);
  const key = entity === "settings" || entity === "balance" ? userId : makeEntityKey(userId, recordId);
  const existing = entity === "settings" || entity === "balance" ? await db.get(storeName, key) : null;
  const row =
    entity === "settings" || entity === "balance"
      ? {
          key,
          userId,
          deleted: false,
          updatedAt,
          revision,
          payload,
          ...(balanceRevision !== undefined
            ? { balanceRevision }
            : existing?.balanceRevision != null
              ? { balanceRevision: existing.balanceRevision }
              : {}),
        }
      : {
          key,
          userId,
          recordId,
          deleted: !!deleted,
          updatedAt,
          revision,
          payload: deleted ? {} : payload,
        };
  await db.put(storeName, row);
}

/**
 * Replace all entity rows for a user from a merged app state (no outbox writes).
 */
export async function applyMergedStateToIndexedDbWithoutOutbox(userId, merged) {
  const updatedAt = new Date().toISOString();
  await deleteAllEntityRowsForUser(userId);
  await putLocalEntityRowWithoutOutbox({
    userId,
    entityType: "settings",
    recordId: "settings",
    payload: {
      settings: merged.settings,
      balance: merged.balance,
      servicingCompletions: merged.servicingCompletions || [],
      servicingWaSent: merged.servicingWaSent || [],
    },
    deleted: false,
    updatedAt,
  });
  const listUpsert = async (entityType, list) => {
    for (const item of list || []) {
      if (!item || item.id == null) continue;
      await putLocalEntityRowWithoutOutbox({
        userId,
        entityType,
        recordId: String(item.id),
        payload: item,
        deleted: false,
        updatedAt,
      });
    }
  };
  await listUpsert("sales", merged.sales);
  await listUpsert("expenses", merged.expenses);
  await listUpsert("otherIncomes", merged.otherIncomes);
  await listUpsert("recurringExpenses", merged.recurringExpenses);
  await listUpsert("inventoryEntries", merged.inventoryEntries);
  await listUpsert("purchases", merged.purchases);
  await listUpsert("emiEntries", merged.emiEntries);
  await listUpsert("loansGiven", merged.loansGiven);
  await listUpsert("customerDirectory", merged.customerDirectory);
  await listUpsert("customerAdvancePayments", merged.customerAdvancePayments);
  await listUpsert("vendorDirectory", merged.vendorDirectory);
  await listUpsert("auditEvents", merged.auditEvents);
  await listUpsert("syncConflictQueue", merged.syncConflictQueue);
  for (const rawId of merged.dismissedAlertIds || []) {
    const id = String(rawId);
    if (!id) continue;
    await putLocalEntityRowWithoutOutbox({
      userId,
      entityType: "dismissedAlertIds",
      recordId: id,
      payload: { id },
      deleted: false,
      updatedAt,
    });
  }
}

/** Last-applied `entity_records.updated_at` (ISO) for incremental pull; per user. */
export async function getRemotePullCursor(userId) {
  const db = await getDb();
  if (!db.objectStoreNames.contains(STORE_SYNC_STATE)) return null;
  const row = await db.get(STORE_SYNC_STATE, `pull:${userId}`);
  return row?.cursorIso ?? null;
}

export async function setRemotePullCursor(userId, cursorIso) {
  const db = await getDb();
  await db.put(STORE_SYNC_STATE, { key: `pull:${userId}`, cursorIso });
}

/** Remove all pending outbox rows for a user (e.g. after a full pull). */
export async function clearOutboxForUser(userId) {
  const db = await getDb();
  if (!db.objectStoreNames.contains(STORE_OUTBOX)) return;
  const tx = db.transaction(STORE_OUTBOX, "readwrite");
  const store = tx.objectStore(STORE_OUTBOX);
  const idx = store.index("by_userId");
  let cur = await idx.openCursor(IDBKeyRange.only(userId));
  while (cur) {
    await cur.delete();
    cur = await cur.continue();
  }
  await tx.done;
}

