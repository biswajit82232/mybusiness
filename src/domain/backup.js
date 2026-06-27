/**
 * Backup export envelope — versioned JSON for long-term import compatibility.
 * @module domain/backup
 */

/** Bump when the envelope or required import steps change (not for additive app state fields). */
export const BACKUP_SCHEMA_VERSION = 1;

/**
 * @param {object} state — merged app state snapshot
 * @param {string} [appVersion]
 */
export function wrapStateForBackup(state, appVersion) {
  return {
    schemaVersion: BACKUP_SCHEMA_VERSION,
    appVersion: String(appVersion ?? ""),
    exportedAt: new Date().toISOString(),
    data: state,
  };
}

function isFlatLegacyState(o) {
  return (
    o &&
    typeof o === "object" &&
    !Array.isArray(o) &&
    o.schemaVersion == null &&
    (Array.isArray(o.sales) || o.settings != null || o.balance != null)
  );
}

/**
 * Validate a parsed backup before import.
 * @param {unknown} parsed
 * @param {string} [currentAppVersion]
 * @returns {{ ok: true, data: object, legacy?: boolean, schemaVersion?: number, appVersion?: string, warning?: string } | { ok: false, error: string, schemaVersion?: number }}
 */
export function validateBackupImport(parsed, currentAppVersion = "") {
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { ok: false, error: "invalid_file" };
  }
  const o = /** @type {Record<string, unknown>} */ (parsed);

  if (isFlatLegacyState(o)) {
    return {
      ok: true,
      legacy: true,
      data: o,
      warning:
        "Legacy backup (no version stamp). Data will be merged with current app defaults — review totals after import.",
    };
  }

  if (o.schemaVersion == null) {
    return { ok: false, error: "unrecognized_format" };
  }

  const schemaVersion = Number(o.schemaVersion);
  if (!Number.isFinite(schemaVersion) || schemaVersion < 1) {
    return { ok: false, error: "bad_schema_version" };
  }
  if (schemaVersion > BACKUP_SCHEMA_VERSION) {
    return { ok: false, error: "newer_than_app", schemaVersion };
  }

  const data = o.data;
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return { ok: false, error: "missing_data" };
  }

  const appVersion = String(o.appVersion || "");
  const warnings = [];
  if (appVersion && currentAppVersion && appVersion !== currentAppVersion) {
    warnings.push(`Backup from app ${appVersion}; you are on ${currentAppVersion}.`);
  }
  if (schemaVersion < BACKUP_SCHEMA_VERSION) {
    warnings.push("Older backup schema — missing fields will use defaults.");
  }

  return {
    ok: true,
    data: /** @type {object} */ (data),
    schemaVersion,
    appVersion,
    warning: warnings.join(" "),
  };
}

/**
 * Accepts a versioned backup file or legacy flat state JSON.
 * @param {unknown} parsed — `JSON.parse` result
 * @returns {object|null} payload for {@link mergePersistedPayload}
 */
export function unwrapBackupFilePayload(parsed) {
  const v = validateBackupImport(parsed);
  return v.ok ? v.data : null;
}

/** User-facing hint for failed backup validation. */
export function backupImportErrorMessage(error, schemaVersion) {
  switch (error) {
    case "newer_than_app":
      return `Backup needs a newer app (schema v${schemaVersion ?? "?"}). Update MyBusiness first.`;
    case "missing_data":
      return "Backup file is missing its data section.";
    case "bad_schema_version":
      return "Backup has an invalid schema version.";
    case "unrecognized_format":
      return "Not a MyBusiness backup file.";
    default:
      return "Invalid backup file";
  }
}
