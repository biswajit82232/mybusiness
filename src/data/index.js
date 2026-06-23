/**
 * Data / infrastructure: persistence, remote API, telemetry.
 * Prefer importing from concrete modules (e.g. `@/data/auth/auth.js`) for tree-shaking.
 */
export { supabase } from "./supabase/client.js";
export * from "./auth/auth.js";
export * from "./auth/localAuth.js";
export * from "./local/indexedDbStore.js";
export * from "./sync/cloudSync.js";
export { initTelemetry } from "./telemetry/telemetry.js";
