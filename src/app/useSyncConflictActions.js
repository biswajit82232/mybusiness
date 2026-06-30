import { useCallback } from "react";
import { applySyncConflictPreview } from "@/domain/index.js";

/**
 * Sync conflict queue: resolve, restore local preview, clear resolved rows.
 */
export function useSyncConflictActions({
  state,
  showToast,
  setState,
  persistWholeStateImmediate,
  appendAuditEvent,
}) {
  const resolveSyncConflict = useCallback(
    async (conflictId) => {
      const cid = String(conflictId || "").trim();
      if (!cid) return;
      const nextQueue = (state.syncConflictQueue || []).filter((x) => !x || x.id !== cid);
      let next = { ...state, syncConflictQueue: nextQueue };
      next = appendAuditEvent(next, {
        entityType: "syncConflictQueue",
        recordId: cid,
        action: "resolve",
        note: "Sync conflict dismissed",
      });
      const __p = await persistWholeStateImmediate(next);
      if (__p) setState(__p);
    },
    [appendAuditEvent, persistWholeStateImmediate, setState, state],
  );

  const restoreSyncConflict = useCallback(
    async (conflictId) => {
      const cid = String(conflictId || "").trim();
      if (!cid) return;
      const row = (state.syncConflictQueue || []).find((x) => x && x.id === cid);
      if (!row) return;
      const applied = applySyncConflictPreview(state, row);
      if (!applied) {
        showToast("Cannot restore — preview missing or invalid");
        return;
      }
      const nextQueue = (applied.syncConflictQueue || state.syncConflictQueue || []).filter(
        (x) => !x || x.id !== cid,
      );
      let next = { ...applied, syncConflictQueue: nextQueue };
      next = appendAuditEvent(next, {
        entityType: "syncConflictQueue",
        recordId: cid,
        action: "restore",
        note: `Restored local preview for ${row.entityType}/${row.recordId}`,
      });
      const __p = await persistWholeStateImmediate(next);
      if (__p) setState(__p);
      showToast("Local version restored");
    },
    [appendAuditEvent, persistWholeStateImmediate, setState, showToast, state],
  );

  const clearResolvedConflicts = useCallback(async () => {
    const keep = (state.syncConflictQueue || []).filter((x) => x && x.status !== "resolved");
    let next = { ...state, syncConflictQueue: keep };
    next = appendAuditEvent(next, {
      entityType: "syncConflictQueue",
      recordId: "bulk",
      action: "cleanup",
      note: "Resolved sync conflicts cleared",
    });
    const __p = await persistWholeStateImmediate(next);
    if (__p) setState(__p);
  }, [appendAuditEvent, persistWholeStateImmediate, setState, state]);

  return { resolveSyncConflict, restoreSyncConflict, clearResolvedConflicts };
}
