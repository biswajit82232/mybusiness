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

/**
 * Accepts a versioned backup file or legacy flat state JSON.
 * @param {unknown} parsed — `JSON.parse` result
 * @returns {object|null} payload for {@link mergePersistedPayload}
 */
export function unwrapBackupFilePayload(parsed) {
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
  const o = /** @type {Record<string, unknown>} */ (parsed);
  if (
    o.schemaVersion != null &&
    o.data != null &&
    typeof o.data === "object" &&
    !Array.isArray(o.data)
  ) {
    return /** @type {object} */ (o.data);
  }
  return o;
}
