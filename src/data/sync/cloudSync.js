/**
 * Supabase cloud sync: ensure business, restore when local is empty, push outbox when online.
 * Reliability: serialized passes, keyset pagination for large pulls, exponential backoff on push/transient errors.
 */
import { normServicingCompletions } from "../../domain/appModel.js";
import { mergeServicingCompletions } from "../../domain/servicing.js";
import { readSupabaseSessionSafely } from "../auth/supabaseSession.js";
import { supabase } from "../supabase/client.js";
import {
  entityRowsToLocalPayload,
  isPayloadEffectivelyEmpty,
  isTransientSyncError,
  normalizeEntityPayloadWithRecordId,
} from "./syncPayloadUtils.js";

export { entityRowsToLocalPayload, isPayloadEffectivelyEmpty, isTransientSyncError } from "./syncPayloadUtils.js";
import {
  applyMergedStateToIndexedDbWithoutOutbox,
  clearOutboxForUser,
  getLocalEntityRecord,
  hasPendingOutboxForRecord,
  getPendingOutboxEntries,
  getRemotePullCursor,
  loadUserLocalState,
  putLocalEntityRowWithoutOutbox,
  removeOutboxEntryById,
  removePendingOutboxForRecord,
  setRemotePullCursor,
} from "../local/indexedDbStore.js";

export const ENTITY_TYPES = [
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
  "vendorDirectory",
  "dismissedAlertIds",
  "auditEvents",
  "syncConflictQueue",
];

const SYNC_SESSION_TIMEOUT_MS = 3500;

function prepareOutboxRowForCloud(row) {
  const entityType = String(row?.entityType ?? "");
  if (!ENTITY_TYPES.includes(entityType)) {
    return { drop: true, reason: `Dropped invalid outbox entity type: ${entityType || "unknown"}` };
  }
  const opDelete = row?.op === "delete";
  const rid = String(row?.recordId ?? "").trim();
  if (!opDelete && !rid && entityType !== "settings" && entityType !== "balance") {
    return { drop: true, reason: `Dropped outbox row without record id (${entityType})` };
  }
  const normalized = normalizeEntityPayloadWithRecordId(entityType, rid, row?.payload ?? null);
  if (!opDelete && normalized == null) {
    return { drop: true, reason: `Dropped malformed outbox payload (${entityType}:${rid || "n/a"})` };
  }
  if (entityType === "dismissedAlertIds" && !opDelete) {
    const normRid = String(normalized?.id ?? rid).trim();
    if (!normRid) return { drop: true, reason: "Dropped malformed dismissed alert outbox row" };
    return {
      drop: false,
      row: { ...row, entityType, recordId: normRid, payload: normalized },
    };
  }
  return {
    drop: false,
    row: {
      ...row,
      entityType,
      recordId: rid,
      payload: opDelete ? null : normalized,
    },
  };
}

function recordIdForDb(entityType, outboxRecordId) {
  if (entityType === "balance") return "__settings__";
  return String(outboxRecordId ?? "");
}

function parseUpdatedAtMs(iso) {
  if (!iso) return 0;
  const t = Date.parse(String(iso));
  return Number.isFinite(t) ? t : 0;
}

/**
 * Conflict rule:
 * - If local has pending outbox for the same record, keep strict LWW (protect unsynced local edits).
 * - If local is clean (no pending row), prefer remote so devices converge even under clock skew.
 */
function remoteWinsLocalRow(localRow, remoteIso, hasPendingLocalChange) {
  if (!localRow) return true;
  if (!hasPendingLocalChange) return true;
  const lt = parseUpdatedAtMs(localRow.updatedAt);
  const rt = parseUpdatedAtMs(remoteIso);
  return rt > lt;
}

function localRecordIdForGet(entityType, serverRecordId) {
  if (entityType === "settings") return "settings";
  if (entityType === "balance") return "settings";
  return String(serverRecordId ?? "");
}

function outboxRecordIdParam(entityType, serverRecordId) {
  if (entityType === "settings") return "__settings__";
  if (entityType === "balance") return "__settings__";
  return String(serverRecordId ?? "");
}

function maxUpdatedAtIso(rows) {
  let max = "";
  for (const r of rows || []) {
    const u = r?.updated_at;
    if (typeof u === "string" && (!max || u > max)) max = u;
  }
  return max || null;
}

const FETCH_PAGE_SIZE = 8000;
/** Max pages per pull (~1.6M rows) — safety against infinite loops. */
const MAX_PULL_PAGES = 200;
const UPSERT_CONFLICT = "business_id,entity_type,record_id";

/** PostgREST `or` for keyset pagination after `(updated_at, entity_type, record_id)` ascending. */
function buildKeysetOrFilter(lastRow) {
  const t = String(lastRow.updated_at ?? "");
  const et = String(lastRow.entity_type ?? "");
  const rid = String(lastRow.record_id ?? "");
  const q = (s) => `"${String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  return `updated_at.gt.${q(t)},and(updated_at.eq.${q(t)},entity_type.gt.${q(et)}),and(updated_at.eq.${q(t)},entity_type.eq.${q(et)},record_id.gt.${q(rid)})`;
}

function sleepMs(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function toLocalPayloadShape(raw) {
  const base =
    raw?.state && typeof raw.state === "object"
      ? raw.state
      : raw?.data && typeof raw.data === "object"
        ? raw.data
        : raw?.payload && typeof raw.payload === "object"
          ? raw.payload
          : raw && typeof raw === "object"
            ? raw
            : null;
  if (!base) return null;
  return {
    settings: base.settings ?? null,
    balance: base.balance ?? null,
    servicingCompletions: Array.isArray(base.servicingCompletions) ? base.servicingCompletions : [],
    sales: Array.isArray(base.sales) ? base.sales : [],
    expenses: Array.isArray(base.expenses) ? base.expenses : [],
    otherIncomes: Array.isArray(base.otherIncomes) ? base.otherIncomes : [],
    recurringExpenses: Array.isArray(base.recurringExpenses) ? base.recurringExpenses : [],
    inventoryEntries: Array.isArray(base.inventoryEntries) ? base.inventoryEntries : [],
    purchases: Array.isArray(base.purchases) ? base.purchases : [],
    emiEntries: Array.isArray(base.emiEntries) ? base.emiEntries : [],
    loansGiven: Array.isArray(base.loansGiven) ? base.loansGiven : [],
    customerDirectory: Array.isArray(base.customerDirectory) ? base.customerDirectory : [],
    vendorDirectory: Array.isArray(base.vendorDirectory) ? base.vendorDirectory : [],
    dismissedAlertIds: Array.isArray(base.dismissedAlertIds) ? base.dismissedAlertIds : [],
    auditEvents: Array.isArray(base.auditEvents) ? base.auditEvents : [],
    syncConflictQueue: Array.isArray(base.syncConflictQueue) ? base.syncConflictQueue : [],
  };
}

/** Legacy cloud fallback (workspace_* schema): fetch latest workspace snapshot for this user. */
async function fetchLegacyWorkspacePayload(client, userId) {
  try {
    const { data: member, error: mErr } = await client
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", userId)
      .maybeSingle();
    if (mErr || !member?.workspace_id) return null;

    const { data: snaps, error: sErr } = await client
      .from("workspace_snapshots")
      .select("*")
      .eq("workspace_id", member.workspace_id)
      .order("created_at", { ascending: false })
      .limit(1);
    if (sErr || !Array.isArray(snaps) || snaps.length < 1) return null;
    const row = snaps[0];
    const raw = row?.payload ?? row?.snapshot ?? row?.data ?? row?.state ?? null;
    const localPayload = toLocalPayloadShape(raw);
    if (!localPayload || isPayloadEffectivelyEmpty(localPayload)) return null;
    return localPayload;
  } catch {
    return null;
  }
}

/** One-time backfill: write a full payload into entity_records so new sync schema becomes canonical. */
async function seedEntityRecordsFromPayload(client, businessId, payload) {
  const ts = new Date().toISOString();
  const rows = [];
  rows.push({
    business_id: businessId,
    entity_type: "settings",
    record_id: "__settings__",
    payload: {
      settings: payload?.settings ?? null,
      balance: payload?.balance ?? null,
      servicingCompletions: Array.isArray(payload?.servicingCompletions) ? payload.servicingCompletions : [],
    },
    deleted: false,
    updated_at: ts,
  });
  rows.push({
    business_id: businessId,
    entity_type: "balance",
    record_id: "__settings__",
    payload: { balance: payload?.balance ?? null },
    deleted: false,
    updated_at: ts,
  });
  const pushList = (entityType, list) => {
    for (const item of Array.isArray(list) ? list : []) {
      if (!item || item.id == null) continue;
      rows.push({
        business_id: businessId,
        entity_type: entityType,
        record_id: String(item.id),
        payload: item,
        deleted: false,
        updated_at: ts,
      });
    }
  };
  pushList("sales", payload?.sales);
  pushList("expenses", payload?.expenses);
  pushList("otherIncomes", payload?.otherIncomes);
  pushList("recurringExpenses", payload?.recurringExpenses);
  pushList("inventoryEntries", payload?.inventoryEntries);
  pushList("purchases", payload?.purchases);
  pushList("emiEntries", payload?.emiEntries);
  pushList("loansGiven", payload?.loansGiven);
  pushList("customerDirectory", payload?.customerDirectory);
  pushList("vendorDirectory", payload?.vendorDirectory);
  pushList("auditEvents", payload?.auditEvents);
  pushList("syncConflictQueue", payload?.syncConflictQueue);
  for (const id of Array.isArray(payload?.dismissedAlertIds) ? payload.dismissedAlertIds : []) {
    const sid = String(id ?? "").trim();
    if (!sid) continue;
    rows.push({
      business_id: businessId,
      entity_type: "dismissedAlertIds",
      record_id: sid,
      payload: { id: sid },
      deleted: false,
      updated_at: ts,
    });
  }
  if (rows.length < 1) return false;
  const { error } = await client.from("entity_records").upsert(rows, { onConflict: UPSERT_CONFLICT });
  if (error) throw error;
  return true;
}

let syncQueue = Promise.resolve();

/**
 * Fetch all matching rows with keyset pagination (handles > FETCH_PAGE_SIZE rows and same-ms ties).
 */
async function fetchEntityRecordsPaged(client, businessId, cursorIso) {
  const all = [];
  let lastRow = null;
  for (let page = 0; page < MAX_PULL_PAGES; page++) {
    let q = client
      .from("entity_records")
      .select("entity_type,record_id,payload,deleted,updated_at,version")
      .eq("business_id", businessId);
    if (lastRow) {
      q = q.or(buildKeysetOrFilter(lastRow));
    } else if (cursorIso) {
      q = q.gt("updated_at", cursorIso);
    }
    const { data: batch, error } = await q
      .order("updated_at", { ascending: true })
      .order("entity_type", { ascending: true })
      .order("record_id", { ascending: true })
      .limit(FETCH_PAGE_SIZE);
    if (error) throw error;
    if (!batch?.length) break;
    all.push(...batch);
    if (batch.length < FETCH_PAGE_SIZE) break;
    lastRow = batch[batch.length - 1];
  }
  return all;
}

/**
 * Apply server rows into IndexedDB when remote `updated_at` is newer (LWW).
 * Removes matching outbox entries when remote wins so we do not re-upload stale data.
 * @returns {Promise<number>} number of rows applied
 */
function isSafeEntityPayload(t, row) {
  if (row.deleted) return true;
  if (t === "settings") {
    return row.payload == null || typeof row.payload === "object";
  }
  if (t === "balance") {
    return row.payload == null || typeof row.payload === "object";
  }
  if (t === "dismissedAlertIds") {
    return row.payload == null || typeof row.payload === "object";
  }
  return row.payload != null && typeof row.payload === "object";
}

async function mergeRemoteRowsIntoLocal(userId, rows) {
  let applied = 0;
  for (const row of rows || []) {
    const t = row?.entity_type;
    if (!t || !ENTITY_TYPES.includes(t)) continue;
    if (typeof row.updated_at !== "string" || !row.updated_at) continue;
    if (!isSafeEntityPayload(t, row)) continue;

    const localId = localRecordIdForGet(t, row.record_id);
    const local = await getLocalEntityRecord({ userId, entityType: t, recordId: localId });
    const recordKey = outboxRecordIdParam(t, row.record_id);
    const hasPendingLocalChange = await hasPendingOutboxForRecord({
      userId,
      entityType: t,
      recordId: recordKey,
    });
    if (!remoteWinsLocalRow(local, row.updated_at, hasPendingLocalChange)) continue;

    if (t === "settings" || t === "balance") {
      const currentSettingsRow = await getLocalEntityRecord({
        userId,
        entityType: "settings",
        recordId: "settings",
      });
      const currentSettingsPayload = currentSettingsRow?.payload ?? {};
      const remotePayload = row.deleted || t !== "settings" ? {} : row.payload ?? {};
      const nextSettings = row.deleted
        ? (t === "settings" ? null : currentSettingsPayload.settings ?? null)
        : (t === "settings" ? remotePayload.settings ?? null : currentSettingsPayload.settings ?? null);
      const nextBalance = row.deleted
        ? (t === "balance" ? null : currentSettingsPayload.balance ?? null)
        : (t === "balance" ? remotePayload.balance ?? row.payload?.balance ?? null : row.payload?.balance ?? null);
      const localCompletions = currentSettingsPayload.servicingCompletions ?? [];
      const remoteHasCompletions = Array.isArray(remotePayload.servicingCompletions);
      const nextCompletions = remoteHasCompletions
        ? mergeServicingCompletions(localCompletions, remotePayload.servicingCompletions)
        : normServicingCompletions(localCompletions);
      const payload = {
        settings: nextSettings,
        balance: nextBalance,
        servicingCompletions: nextCompletions,
      };
      await putLocalEntityRowWithoutOutbox({
        userId,
        entityType: "settings",
        recordId: "settings",
        payload,
        deleted: false,
        updatedAt: row.updated_at,
        revision: row.version ?? null,
      });
    } else if (t === "dismissedAlertIds") {
      const normalized = normalizeEntityPayloadWithRecordId(t, row.record_id, row.payload ?? null);
      const id = String(normalized?.id ?? "");
      if (!id) continue;
      await putLocalEntityRowWithoutOutbox({
        userId,
        entityType: "dismissedAlertIds",
        recordId: id,
        payload: normalized,
        deleted: !!row.deleted,
        updatedAt: row.updated_at,
        revision: row.version ?? null,
      });
    } else {
      const rid = String(row.record_id ?? "");
      if (!rid) continue;
      const normalized = normalizeEntityPayloadWithRecordId(t, rid, row.payload ?? null);
      if (!row.deleted && normalized == null) continue;
      await putLocalEntityRowWithoutOutbox({
        userId,
        entityType: t,
        recordId: rid,
        payload: row.deleted ? {} : normalized,
        deleted: !!row.deleted,
        updatedAt: row.updated_at,
        revision: row.version ?? null,
      });
    }

    await removePendingOutboxForRecord({
      userId,
      entityType: t,
      recordId: recordKey,
    });
    applied += 1;
  }
  return applied;
}

export async function ensureBusinessId(client) {
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: owned } = await client
    .from("businesses")
    .select("id")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (owned?.id) {
    const { data: hasMember } = await client
      .from("business_members")
      .select("id")
      .eq("business_id", owned.id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!hasMember) {
      const { error: fillErr } = await client.from("business_members").insert({
        business_id: owned.id,
        user_id: user.id,
        role: "owner",
      });
      if (fillErr) throw fillErr;
    }
    return owned.id;
  }

  const { data: member } = await client
    .from("business_members")
    .select("business_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (member?.business_id) return member.business_id;

  const { data: biz, error } = await client
    .from("businesses")
    .insert({ name: "My Business", owner_id: user.id })
    .select("id")
    .single();

  if (error) throw error;

  const { error: mErr } = await client.from("business_members").insert({
    business_id: biz.id,
    user_id: user.id,
    role: "owner",
  });

  if (mErr) throw mErr;
  return biz.id;
}

/**
 * 1) Local empty → full snapshot from server; pull cursor advances only after IDB apply (see applyCloudPullToAppState).
 * 2) Local non-empty → incremental rows, LWW merge; cursor advances only after merge completes.
 */
async function pullRemoteIntoLocal(client, userId, businessId, { forceFullReconcile = false } = {}) {
  const local = await loadUserLocalState(userId);
  const empty = isPayloadEffectivelyEmpty(local);

  if (forceFullReconcile) {
    const rows = await fetchEntityRecordsPaged(client, businessId, null);
    if (!rows.length) {
      const legacyPayload = await fetchLegacyWorkspacePayload(client, userId);
      if (!legacyPayload) {
        return { didPull: false, pullPayload: null, fullRestore: false, remoteRowsApplied: 0, pullCursorMaxIso: null };
      }
      await seedEntityRecordsFromPayload(client, businessId, legacyPayload);
      return {
        didPull: true,
        pullPayload: legacyPayload,
        fullRestore: true,
        remoteRowsApplied: 0,
        pullCursorMaxIso: null,
      };
    }
    const applied = await mergeRemoteRowsIntoLocal(userId, rows);
    const maxIso = maxUpdatedAtIso(rows);
    if (maxIso) await setRemotePullCursor(userId, maxIso);
    const pullPayload = await loadUserLocalState(userId);
    return {
      didPull: true,
      pullPayload,
      fullRestore: false,
      remoteRowsApplied: applied,
      pullCursorMaxIso: null,
    };
  }

  if (empty) {
    const rows = await fetchEntityRecordsPaged(client, businessId, null);
    if (!rows.length) {
      const legacyPayload = await fetchLegacyWorkspacePayload(client, userId);
      if (!legacyPayload) {
        return { didPull: false, pullPayload: null, fullRestore: false, remoteRowsApplied: 0, pullCursorMaxIso: null };
      }
      await seedEntityRecordsFromPayload(client, businessId, legacyPayload);
      return {
        didPull: true,
        pullPayload: legacyPayload,
        fullRestore: true,
        remoteRowsApplied: 0,
        pullCursorMaxIso: null,
      };
    }
    const localPayload = entityRowsToLocalPayload(rows);
    const maxIso = maxUpdatedAtIso(rows);
    /* Do not advance pull cursor here — wait until IndexedDB + outbox are applied (applyCloudPullToAppState). */
    return {
      didPull: true,
      pullPayload: localPayload,
      fullRestore: true,
      remoteRowsApplied: rows.length,
      pullCursorMaxIso: maxIso || null,
    };
  }

  const cursor = await getRemotePullCursor(userId);
  const rows = await fetchEntityRecordsPaged(client, businessId, cursor);
  if (!rows.length) {
    // Compatibility: projects still on legacy workspace_* tables may have no entity_records yet.
    // If we have no pull cursor either, attempt one-time legacy import/backfill even when local isn't empty.
    if (!cursor) {
      const legacyPayload = await fetchLegacyWorkspacePayload(client, userId);
      if (legacyPayload && !isPayloadEffectivelyEmpty(legacyPayload)) {
        await seedEntityRecordsFromPayload(client, businessId, legacyPayload);
        return {
          didPull: true,
          pullPayload: legacyPayload,
          fullRestore: true,
          remoteRowsApplied: 0,
          pullCursorMaxIso: null,
        };
      }
    }
    return { didPull: false, pullPayload: null, fullRestore: false, remoteRowsApplied: 0, pullCursorMaxIso: null };
  }

  const applied = await mergeRemoteRowsIntoLocal(userId, rows);
  const maxIso = maxUpdatedAtIso(rows);
  /* Cursor advances only after merge writes succeed — avoids skipping rows if merge throws mid-batch. */
  if (maxIso) await setRemotePullCursor(userId, maxIso);

  if (applied === 0) {
    return { didPull: false, pullPayload: null, fullRestore: false, remoteRowsApplied: 0, pullCursorMaxIso: null };
  }

  const pullPayload = await loadUserLocalState(userId);
  return {
    didPull: true,
    pullPayload,
    fullRestore: false,
    remoteRowsApplied: applied,
    pullCursorMaxIso: null,
  };
}

async function upsertEntityRow(client, businessId, row) {
  const updatedAt =
    typeof row.updatedAt === "string" && row.updatedAt.length > 0 ? row.updatedAt : new Date().toISOString();
  const baseVersion =
    row?.revision != null && Number.isFinite(Number(row.revision)) ? Number(row.revision) : null;
  const upsertViaRpc = async (entityType, recordId, payload) => {
    const { data, error } = await client.rpc("sync_upsert_entity_record", {
      p_business_id: businessId,
      p_entity_type: entityType,
      p_record_id: String(recordId),
      p_payload: payload ?? {},
      p_deleted: row.op === "delete",
      p_client_updated_at: updatedAt,
      p_base_version: baseVersion,
    });
    if (error) throw error;
    const info = Array.isArray(data) && data.length > 0 ? data[0] : null;
    return {
      applied: !!info?.applied,
      conflict: !!info?.conflict,
      reason: info?.conflict_reason ? String(info.conflict_reason) : "",
    };
  };
  if (row.entityType === "settings") {
    const recordId = recordIdForDb("settings", row.recordId);
    const a = await upsertViaRpc(
      "settings",
      recordId,
      row.op === "delete"
        ? {}
        : {
            settings: row.payload?.settings ?? null,
            balance: row.payload?.balance ?? null,
            servicingCompletions: Array.isArray(row.payload?.servicingCompletions)
              ? row.payload.servicingCompletions
              : [],
          },
    );
    const b = await upsertViaRpc(
      "balance",
      recordId,
      row.op === "delete" ? {} : { balance: row.payload?.balance ?? null },
    );
    return { conflict: a.conflict || b.conflict, reason: a.reason || b.reason || "" };
  }

  const recordId = recordIdForDb(row.entityType, row.recordId);
  const out = await upsertViaRpc(row.entityType, recordId, row.op === "delete" ? {} : row.payload ?? {});
  return { conflict: out.conflict, reason: out.reason || "" };
}

const OUTBOX_MAX_ATTEMPTS = 6;

/**
 * Push pending outbox entries to `entity_records`.
 * Transient errors (network, 5xx, 429) retry with exponential backoff + jitter.
 */
export async function pushOutboxToCloud(client, businessId, userId) {
  const pending = await getPendingOutboxEntries(userId, { limit: 500 });
  let pushed = 0;
  let conflicts = 0;
  const conflictRows = [];
  const errors = [];

  for (const row of pending) {
    const prepared = prepareOutboxRowForCloud(row);
    if (prepared.drop) {
      await removeOutboxEntryById(row.id);
      errors.push(prepared.reason);
      continue;
    }
    const syncRow = prepared.row;
    let attempt = 0;
    while (attempt < OUTBOX_MAX_ATTEMPTS) {
      try {
        const result = await upsertEntityRow(client, businessId, syncRow);
        if (result?.conflict) {
          // Drop stale local outbox row; fresh remote value will be pulled on next pass.
          // Preserve a preview of the rejected local payload so the user can recover
          // their edit from Settings → Sync conflicts instead of silently losing it.
          let localPayloadPreview;
          try {
            if (syncRow.op !== "delete" && syncRow.payload && typeof syncRow.payload === "object") {
              localPayloadPreview = JSON.stringify(syncRow.payload).slice(0, 4000);
            }
          } catch {
            /* unserializable payload — skip preview */
          }
          await removeOutboxEntryById(syncRow.id);
          conflicts += 1;
          conflictRows.push({
            entityType: String(syncRow.entityType || ""),
            recordId: String(syncRow.recordId || ""),
            reason: String(result.reason || "version_conflict"),
            op: syncRow.op === "delete" ? "delete" : "upsert",
            ...(localPayloadPreview ? { localPayloadPreview } : {}),
          });
          break;
        }
        await removeOutboxEntryById(syncRow.id);
        pushed += 1;
        break;
      } catch (e) {
        attempt += 1;
        const transient = isTransientSyncError(e);
        if (!transient || attempt >= OUTBOX_MAX_ATTEMPTS) {
          errors.push(String(e?.message || e));
          break;
        }
        await sleepMs(350 * 2 ** (attempt - 1) + Math.random() * 150);
      }
    }
  }

  return { pushed, conflicts, conflictRows, errors };
}

async function runCloudSyncPassOnce({ forceFullReconcile = false } = {}) {
  if (!supabase) {
    return { ok: true, skipped: true, reason: "no_supabase" };
  }

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return { ok: true, skipped: true, reason: "offline" };
  }

  const { timedOut, session } = await readSupabaseSessionSafely(supabase, {
    timeoutMs: SYNC_SESSION_TIMEOUT_MS,
  });
  if (timedOut) {
    return { ok: true, skipped: true, reason: "session_timeout" };
  }
  if (!session?.user?.id) {
    return { ok: true, skipped: true, reason: "no_session" };
  }

  const userId = session.user.id;

  const businessId = await ensureBusinessId(supabase);
    const pull = await pullRemoteIntoLocal(supabase, userId, businessId, { forceFullReconcile });

    const pushResult = await pushOutboxToCloud(supabase, businessId, userId);

    return {
      ok: true,
      skipped: false,
      didPull: !!pull.didPull,
      pullPayload: pull.pullPayload,
      fullRestore: !!pull.fullRestore,
      remoteRowsApplied: pull.remoteRowsApplied ?? 0,
      pullCursorMaxIso: pull.pullCursorMaxIso ?? null,
      ...pushResult,
    };
}

const PASS_RETRIES = 3;

/**
 * Full sync pass: pull (full restore if local empty, else incremental LWW), then push outbox.
 * Serialized so overlapping timers / online bursts cannot interleave pulls and corrupt merge state.
 * Retries the whole pass on transient failures (network blips).
 */
export async function runCloudSyncPass({ forceFullReconcile = false } = {}) {
  if (!supabase) {
    return { ok: true, skipped: true, reason: "no_supabase" };
  }

  const run = async () => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      return { ok: true, skipped: true, reason: "offline" };
    }

    const { timedOut, session } = await readSupabaseSessionSafely(supabase, {
    timeoutMs: SYNC_SESSION_TIMEOUT_MS,
  });
    if (timedOut) {
      return { ok: true, skipped: true, reason: "session_timeout" };
    }
    if (!session?.user?.id) {
      return { ok: true, skipped: true, reason: "no_session" };
    }

    let lastErr = null;
    for (let attempt = 0; attempt < PASS_RETRIES; attempt++) {
      try {
        return await runCloudSyncPassOnce({ forceFullReconcile });
      } catch (e) {
        lastErr = e;
        if (!isTransientSyncError(e) || attempt === PASS_RETRIES - 1) {
          return { ok: false, error: String(e?.message || e) };
        }
        await sleepMs(500 * 2 ** attempt + Math.random() * 200);
      }
    }
    return { ok: false, error: String(lastErr?.message || lastErr || "Sync failed") };
  };

  const p = syncQueue.catch(() => {}).then(run);
  syncQueue = p.catch(() => {});
  return p;
}

/**
 * After a successful full restore, persist rows to IndexedDB without outbox and clear outbox.
 * Optionally advances the remote pull cursor only after local persistence succeeds (avoids a gap if this step fails).
 */
export async function applyCloudPullToAppState(userId, mergedState, { advancePullCursorTo } = {}) {
  await applyMergedStateToIndexedDbWithoutOutbox(userId, mergedState);
  await clearOutboxForUser(userId);
  if (typeof advancePullCursorTo === "string" && advancePullCursorTo.length > 0) {
    await setRemotePullCursor(userId, advancePullCursorTo);
  }
}
