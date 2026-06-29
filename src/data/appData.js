// src/data/appData.js
// Load/save helpers with schema migration (IndexedDB + legacy localStorage).

import { migrateData, checkImportSafety, CURRENT_SCHEMA_VERSION } from '../utils/schema.js';

const LS_KEY = 'mybusiness-data';

export function loadAppData() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const migrated = migrateData(parsed);
    localStorage.setItem(LS_KEY, JSON.stringify(migrated));
    return migrated;
  } catch (err) {
    console.error('[data] Failed to load or migrate data:', err);
    return null;
  }
}

export function saveAppData(data) {
  try {
    const payload = {
      ...data,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      lastMigrated: data?.lastMigrated || new Date().toISOString(),
    };
    localStorage.setItem(LS_KEY, JSON.stringify(payload));
  } catch (err) {
    console.error('[data] Failed to save data:', err);
    throw new Error('Could not save data. Storage may be full.');
  }
}

/**
 * Apply schema migration to a payload before merge (IndexedDB / backup import).
 * @param {object|null} raw
 * @returns {object|null}
 */
export function migratePayloadIfNeeded(raw) {
  if (!raw || typeof raw !== 'object') return raw;
  return migrateData({ ...raw, schemaVersion: raw.schemaVersion || 1 });
}

export function importBackup(importedJson, currentData, onConfirm) {
  const { safe, reason, needsMigration } = checkImportSafety(importedJson, currentData);

  if (!safe) {
    alert(reason);
    return false;
  }

  if (reason) {
    const confirmed = window.confirm(`${reason}\n\nDo you want to continue?`);
    if (!confirmed) return false;
  }

  const safeData = needsMigration ? migrateData(importedJson) : importedJson;
  onConfirm(safeData);
  return true;
}

export { checkImportSafety, migrateData, CURRENT_SCHEMA_VERSION };
