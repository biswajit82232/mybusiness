import { useCallback, useEffect } from "react";
import { loadUserLocalState, writeAppCache } from "@/data/local/indexedDbStore.js";
import { withPersistLock } from "@/data/local/persistMutex.js";
import { persistEntityStateDiff } from "./localEntityPersistPass.js";

const DEBOUNCE_MS = 350;

/**
 * Debounced IndexedDB persistence for app state when `authState === "ready"`.
 * Exposes `flushPendingLocalPersist` via ref so cloud sync can drain outbox before pull.
 */
export function useDebouncedLocalPersist({
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
}) {
  const runPersistNow = useCallback(
    async (prevState, nextState) => {
      const userId = currentUserIdRef.current;
      if (!userId || !prevState || !nextState) return;
      pendingWritesRef.current += 1;
      try {
        await withPersistLock(async () => {
          const updatedAt = new Date().toISOString();
          const normalized = await persistEntityStateDiff({
            userId,
            prevState,
            nextState,
            updatedAt,
          });
          if (normalized) {
            lastPersistedStateRef.current = normalized;
            await writeAppCache(normalized).catch(() => {});
            persistWarnedRef.current = false;
          }
        });
      } finally {
        pendingWritesRef.current = Math.max(0, pendingWritesRef.current - 1);
      }
    },
    [currentUserIdRef, lastPersistedStateRef, pendingWritesRef, persistWarnedRef],
  );

  useEffect(() => {
    flushPendingLocalPersistRef.current = async () => {
      if (persistTimerRef.current) {
        clearTimeout(persistTimerRef.current);
        persistTimerRef.current = null;
      }
      const prevState = lastPersistedStateRef.current;
      const nextState = latestStateRef?.current ?? state;
      if (!prevState || !nextState || prevState === nextState) return;
      if (suppressPersistRef.current) {
        lastPersistedStateRef.current = nextState;
        return;
      }
      await runPersistNow(prevState, nextState);
    };
    return () => {
      flushPendingLocalPersistRef.current = null;
    };
  }, [
    flushPendingLocalPersistRef,
    latestStateRef,
    persistTimerRef,
    runPersistNow,
    state,
    suppressPersistRef,
    lastPersistedStateRef,
  ]);

  useEffect(() => {
    if (authState !== "ready") return;
    const userId = currentUserIdRef.current;
    if (!userId) return;

    const prevState = lastPersistedStateRef.current;
    const nextState = state;

    if (prevState === nextState) return;

    if (persistTimerRef.current) clearTimeout(persistTimerRef.current);

    if (!prevState) {
      lastPersistedStateRef.current = nextState;
      return;
    }
    if (suppressPersistRef.current) {
      lastPersistedStateRef.current = nextState;
      return;
    }

    const runId = ++persistRunIdRef.current;
    persistTimerRef.current = setTimeout(async () => {
      try {
        if (runId !== persistRunIdRef.current) return;
        if (suppressPersistRef.current) {
          lastPersistedStateRef.current = nextState;
          return;
        }
        await runPersistNow(prevState, nextState);
      } catch (persistErr) {
        console.error("[persist] local save failed:", persistErr);
        if (!persistWarnedRef.current) {
          persistWarnedRef.current = true;
          setTimeout(async () => {
            try {
              const userId2 = currentUserIdRef.current;
              if (userId2) await loadUserLocalState(userId2);
            } catch {
              setToast("Storage error — your data may not have saved. Please reload.");
            }
          }, 2000);
        }
      }
    }, DEBOUNCE_MS);

    return () => {
      if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    };
  }, [
    state,
    authState,
    currentUserIdRef,
    persistTimerRef,
    persistRunIdRef,
    persistWarnedRef,
    suppressPersistRef,
    lastPersistedStateRef,
    runPersistNow,
    setToast,
  ]);
}
