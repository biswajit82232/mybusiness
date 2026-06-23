/**
 * Centralized Vite environment access.
 * Prefer importing `viteEnv` from here instead of scattering `import.meta.env` — easier to audit,
 * mock in tests, and keep naming consistent.
 *
 * @see https://vite.dev/guide/env-and-mode.html
 */
export const viteEnv = Object.freeze({
  MODE: import.meta.env.MODE,
  DEV: import.meta.env.DEV,
  PROD: import.meta.env.PROD,
  /** Public site origin without trailing slash (social / og:image). */
  publicSiteUrl: String(import.meta.env.VITE_PUBLIC_SITE_URL ?? "").replace(/\/$/, ""),
  /** Optional telemetry ingest URL (sendBeacon). */
  telemetryUrl: String(import.meta.env.VITE_TELEMETRY_URL ?? ""),
  supabaseUrl: String(import.meta.env.VITE_SUPABASE_URL ?? ""),
  supabaseAnonKey: String(import.meta.env.VITE_SUPABASE_ANON_KEY ?? ""),
});
