import { useCallback } from "react";
import { APP_VERSION } from "@/appVersion.js";
import { clearLocalAuthCredentials } from "@/data/auth/localAuth.js";
import { clearAllLocalData } from "@/data/local/indexedDbStore.js";
import {
  clearStoredSessionNav,
  defaultState,
  mergePersistedPayload,
  todayStr,
  unwrapBackupFilePayload,
  wrapStateForBackup,
} from "@/domain/index.js";

/**
 * Export / import / reset flows (Settings → Data backup).
 */
export function useBackupActions({
  state,
  showToast,
  setActionConfirm,
  setState,
  setScreen,
  persistWholeStateImmediate,
}) {
  const exportBackup = useCallback(() => {
    const envelope = wrapStateForBackup(state, APP_VERSION);
    const blob = new Blob([JSON.stringify(envelope, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mybusiness-backup-${todayStr()}.json`;
    a.rel = "noopener";
    a.click();
    URL.revokeObjectURL(url);
    showToast("Backup downloaded");
  }, [state, showToast]);

  const importBackupFile = useCallback(
    (file) => {
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const parsed = JSON.parse(String(reader.result));
          const raw = unwrapBackupFilePayload(parsed);
          const next = mergePersistedPayload(raw);
          if (!next) {
            showToast("Invalid backup file");
            return;
          }
          setActionConfirm({ kind: "importBackup", next });
        } catch {
          showToast("Could not read file");
        }
      };
      reader.onerror = () => showToast("Could not read file");
      reader.readAsText(file);
    },
    [setActionConfirm, showToast],
  );

  const requestResetAllData = useCallback(() => {
    setActionConfirm({ kind: "reset", step: 1 });
  }, [setActionConfirm]);

  const completeResetAllData = useCallback(async () => {
    try {
      await clearAllLocalData();
    } catch (e) {
      console.warn("clearAllLocalData failed", e);
    }
    clearLocalAuthCredentials();
    setState(defaultState);
    setScreen(null);
    clearStoredSessionNav();
    setActionConfirm(null);
    showToast("All data reset — page will reload");
    setTimeout(() => window.location.reload(), 1200);
  }, [setActionConfirm, setScreen, setState, showToast]);

  const confirmImportBackup = useCallback(
    async (next) => {
      setActionConfirm(null);
      try {
        const persisted = await persistWholeStateImmediate(next);
        if (persisted) setState(persisted);
        showToast("Data imported");
        setScreen(null);
      } catch {
        showToast("Import failed to save locally");
      }
    },
    [persistWholeStateImmediate, setActionConfirm, setScreen, setState, showToast],
  );

  return {
    exportBackup,
    importBackupFile,
    requestResetAllData,
    completeResetAllData,
    confirmImportBackup,
  };
}
