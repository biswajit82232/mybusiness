import { useCallback, useState } from "react";
import { isCloudAuthEnabled } from "@/data/auth/auth.js";
import {
  applyCloudPullToAppState,
  runCloudSyncPass,
} from "@/data/sync/cloudSync.js";
import { withSupabaseSyncHint } from "@/data/sync/syncErrorHints.js";
import { waitForPersistIdle, isPersistLocked } from "@/data/local/persistMutex.js";
import {
  getPendingOutboxCount,
  loadUserLocalState,
  writeAppCache,
} from "@/data/local/indexedDbStore.js";
import { defaultState, makeId, mergePersistedPayload, stableStringify } from "@/domain/index.js";

/** Skip React hydration after pull when the user edited during the sync pass. */
export function shouldSkipSyncStateHydration({
  pendingWrites = 0,
  persistLocked = false,
  debouncePending = false,
  liveState,
  persistedState,
}) {
  if (pendingWrites > 0 || persistLocked || debouncePending) return true;
  if (!liveState || !persistedState) return false;
  return stableStringify(liveState) !== stableStringify(persistedState);
}

function conflictRowKey(row) {
  return `${String(row?.entityType || "")}::${String(row?.recordId || "")}`;
}

function appendConflictRowsLocal(draft, conflictRows) {
  const rows = Array.isArray(conflictRows) ? conflictRows : [];
  if (!rows.length) return draft;
  const base = Array.isArray(draft.syncConflictQueue) ? draft.syncConflictQueue : [];
  const incoming = rows.map((r) => ({
    id: makeId(),
    at: new Date().toISOString(),
    entityType: String(r.entityType || ""),
    recordId: String(r.recordId || ""),
    reason: String(r.reason || "version_conflict"),
    source: "sync",
    status: "open",
    ...(r.op === "delete" || r.op === "upsert" ? { op: r.op } : {}),
    ...(typeof r.localPayloadPreview === "string" && r.localPayloadPreview
      ? { localPayloadPreview: r.localPayloadPreview.slice(0, 4000) }
      : {}),
  }));
  const incomingKeys = new Set(incoming.map(conflictRowKey));
  const kept = base.filter((x) => x && !incomingKeys.has(conflictRowKey(x)));
  const next = [...kept, ...incoming];
  return { ...draft, syncConflictQueue: next.slice(-500) };
}

/**
 * Cloud sync pass + user-visible status (Settings → Cloud, background interval).
 */
export function useCloudSyncExecutor({
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
}) {
  const [cloudSyncMeta, setCloudSyncMeta] = useState(() => ({
    at: null,
    ok: null,
    detail: "",
    errors: [],
  }));

  const executeCloudSync = useCallback(
    async ({ forceFullReconcile = false } = {}) => {
      if (!isCloudAuthEnabled()) {
        setCloudSyncMeta({
          at: Date.now(),
          ok: true,
          detail: "Cloud sync not enabled for this account.",
          errors: [],
        });
        return { ok: true, skipped: true, reason: "no_cloud" };
      }
      const uid = currentUserIdRef.current;
      if (!uid || uid === "local-user") {
        setCloudSyncMeta({
          at: Date.now(),
          ok: true,
          detail: "Using this device only — no cloud sync.",
          errors: [],
        });
        return { ok: true, skipped: true, reason: "local" };
      }

      try {
        await flushPendingLocalPersistRef?.current?.().catch((e) => {
          console.warn("[sync] flush pending local persist failed:", e);
        });
        await waitForPersistIdle().catch((e) => {
          console.warn("[sync] persist still active after idle wait:", e?.message || e);
        });
        if (pendingWritesRef?.current > 0 || isPersistLocked()) {
          setCloudSyncMeta({
            at: Date.now(),
            ok: true,
            detail: "Local save in progress — sync deferred",
            errors: [],
          });
          return { ok: true, skipped: true, reason: "persist_busy" };
        }

        const shouldForceOnStartup = !forceFullReconcile && !didStartupFullReconcileRef.current;
        const r = await runCloudSyncPass({
          forceFullReconcile: forceFullReconcile || shouldForceOnStartup,
        });
        if (shouldForceOnStartup) didStartupFullReconcileRef.current = true;
        if (!r.ok) {
          const err = r.error ? `Sync: ${withSupabaseSyncHint(r.error)}` : "Sync failed";
          setCloudSyncMeta({ at: Date.now(), ok: false, detail: err, errors: [] });
          return r;
        }
        if (r.skipped) {
          if (r.reason === "offline") {
            setCloudSyncMeta({ at: Date.now(), ok: true, detail: "Offline — sync paused", errors: [] });
          } else if (r.reason === "session_timeout") {
            setCloudSyncMeta({ at: Date.now(), ok: true, detail: "Cloud session check timed out — will retry", errors: [] });
          } else if (r.reason === "no_session") {
            setCloudSyncMeta({ at: Date.now(), ok: true, detail: "Not signed in to cloud.", errors: [] });
          } else {
            setCloudSyncMeta({ at: Date.now(), ok: true, detail: "Skipped.", errors: [] });
          }
          return r;
        }
        const skipStateHydration = shouldSkipSyncStateHydration({
          pendingWrites: pendingWritesRef?.current ?? 0,
          persistLocked: isPersistLocked(),
          debouncePending: !!persistTimerRef?.current,
          liveState: latestStateRef?.current,
          persistedState: lastPersistedStateRef?.current,
        });

        const hydrateReactFromMerged = async (merged) => {
          if (skipStateHydration) {
            if ((r.conflictRows?.length ?? 0) > 0) {
              setState((prev) => appendConflictRowsLocal(prev, r.conflictRows));
            }
            return false;
          }
          suppressPersistRef.current = true;
          setState(merged);
          lastPersistedStateRef.current = merged;
          await writeAppCache(merged).catch(() => {});
          Promise.resolve().then(() => {
            suppressPersistRef.current = false;
          });
          return true;
        };

        if (r.fullRestore && r.pullPayload) {
          let merged = mergePersistedPayload(r.pullPayload) || defaultState;
          merged = appendConflictRowsLocal(merged, r.conflictRows);
          await applyCloudPullToAppState(uid, merged, {
            advancePullCursorTo:
              typeof r.pullCursorMaxIso === "string" ? r.pullCursorMaxIso : undefined,
          });
          await hydrateReactFromMerged(merged);
        } else if ((r.remoteRowsApplied ?? 0) > 0) {
          const freshPayload = await loadUserLocalState(uid);
          let merged = mergePersistedPayload(freshPayload) || defaultState;
          merged = appendConflictRowsLocal(merged, r.conflictRows);
          await hydrateReactFromMerged(merged);
        } else if ((r.conflictRows?.length ?? 0) > 0) {
          setState((prev) => appendConflictRowsLocal(prev, r.conflictRows));
        }
        const parts = [];
        if (r.fullRestore) parts.push("Restored from cloud");
        else if ((r.remoteRowsApplied ?? 0) > 0) {
          parts.push(`Updated ${r.remoteRowsApplied} from cloud`);
        }
        if (r.pushed > 0) parts.push(`Saved ${r.pushed} to cloud`);
        if ((r.conflicts ?? 0) > 0) {
          parts.push(`Resolved ${r.conflicts} stale change${r.conflicts === 1 ? "" : "s"}`);
        }
        if ((r.conflictRows?.length ?? 0) > 0) {
          parts.push(`${r.conflictRows.length} conflict${r.conflictRows.length === 1 ? "" : "s"} queued`);
        }
        if (r.errors?.length) parts.push(`${r.errors.length} not uploaded (retrying)`);
        const pushErrors = Array.isArray(r.errors) ? r.errors.map(String) : [];
        const hasPushErr = pushErrors.length > 0;
        if ((forceFullReconcile || shouldForceOnStartup) && !hasPushErr) {
          parts.unshift("Full reconcile complete");
        }
        const msg = parts.length
          ? parts.join(" · ")
          : hasPushErr
            ? "Finished with upload errors"
            : "Up to date";
        setCloudSyncMeta({
          at: Date.now(),
          ok: !hasPushErr,
          detail: msg,
          errors: pushErrors,
        });
        return r;
      } finally {
        const u = currentUserIdRef.current;
        if (u && u !== "local-user" && isCloudAuthEnabled()) {
          getPendingOutboxCount(u).then(setPendingOutbox).catch(() => {});
        }
      }
    },
    [
      currentUserIdRef,
      didStartupFullReconcileRef,
      lastPersistedStateRef,
      setPendingOutbox,
      setState,
      suppressPersistRef,
      pendingWritesRef,
      flushPendingLocalPersistRef,
      persistTimerRef,
      latestStateRef,
    ],
  );

  return { cloudSyncMeta, setCloudSyncMeta, executeCloudSync };
}
