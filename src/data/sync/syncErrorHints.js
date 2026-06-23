const SUPABASE_SCHEMA_MISMATCH_HINT =
  "Supabase schema mismatch detected. Run latest migrations (npm run supabase:db:push) and reload.";

/**
 * Tag user-facing sync error text with a one-line hint when the underlying
 * failure looks like a Supabase schema mismatch (missing RPC, missing column,
 * CHECK constraint violation, unknown entityType).
 */
export function withSupabaseSyncHint(errText) {
  const msg = String(errText || "");
  const lower = msg.toLowerCase();
  const likelySchemaMismatch =
    lower.includes("sync_upsert_entity_record") ||
    lower.includes("column entity_records.version does not exist") ||
    lower.includes("unknown entitytype") ||
    lower.includes("entity_records_entity_type_check");
  if (!likelySchemaMismatch) return msg;
  return `${msg} · ${SUPABASE_SCHEMA_MISMATCH_HINT}`;
}
