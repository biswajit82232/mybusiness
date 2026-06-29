import { useCallback } from "react";
import { APP_VERSION } from "@/appVersion.js";
import { checkImportSafety, migratePayloadIfNeeded } from "@/data/appData.js";
import { clearLocalAuthCredentials } from "@/data/auth/localAuth.js";
import { clearAllLocalData } from "@/data/local/indexedDbStore.js";
import {
  clearStoredSessionNav,
  defaultState,
  mergePersistedPayload,
  todayStr,
  validateBackupImport,
  backupImportErrorMessage,
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
  const exportBackup = useCallback(
    (opts = {}) => {
      const envelope = wrapStateForBackup(state, APP_VERSION);
      const blob = new Blob([JSON.stringify(envelope, null, 2)], {
        type: "application/json;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const suffix = String(opts.filenameSuffix || "").trim();
      a.download = suffix
        ? `mybusiness-backup-${suffix}.json`
        : `mybusiness-backup-${todayStr()}.json`;
      a.rel = "noopener";
      a.click();
      URL.revokeObjectURL(url);
      showToast(suffix ? "Year-end backup downloaded" : "Backup downloaded");
    },
    [state, showToast],
  );

  const importBackupFile = useCallback(
    (file) => {
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const parsed = JSON.parse(String(reader.result));
          const check = validateBackupImport(parsed, APP_VERSION);
          if (!check.ok) {
            showToast(backupImportErrorMessage(check.error, check.schemaVersion));
            return;
          }
          const importSafety = checkImportSafety(
            { ...check.data, schemaVersion: check.data?.schemaVersion || 1 },
            { ...state, schemaVersion: state.schemaVersion || 2 },
          );
          if (!importSafety.safe) {
            showToast(importSafety.reason);
            return;
          }
          if (importSafety.reason) {
            const confirmed = window.confirm(`${importSafety.reason}\n\nDo you want to continue?`);
            if (!confirmed) return;
          }
          const payload = importSafety.needsMigration
            ? migratePayloadIfNeeded(check.data)
            : check.data;
          const next = mergePersistedPayload(payload);
          if (!next) {
            showToast("Invalid backup file");
            return;
          }
          setActionConfirm({
            kind: "importBackup",
            next,
            importMeta: {
              warning: check.warning || "",
              legacy: !!check.legacy,
              appVersion: check.appVersion || "",
            },
          });
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
    setActionConfirm({ kind: "reset", step: 1, backupDownloaded: false });
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
