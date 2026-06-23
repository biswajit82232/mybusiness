import { createClient } from "@supabase/supabase-js";
import { viteEnv } from "@/config/env.js";

const url = viteEnv.supabaseUrl;
const anonKey = viteEnv.supabaseAnonKey;

/** True when env has a project URL and anon key (client is usable). */
export const isSupabaseConfigured =
  typeof url === "string" &&
  typeof anonKey === "string" &&
  url.length > 0 &&
  anonKey.length > 0 &&
  /^https?:\/\//i.test(url.trim());

/**
 * Singleton Supabase browser client. `null` if env vars are missing (use local auth only).
 * Auth: persistSession + autoRefreshToken + detect OAuth/code in URL.
 */
export const supabase = isSupabaseConfigured
  ? createClient(url.trim(), anonKey.trim(), {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: "pkce",
      },
    })
  : null;
