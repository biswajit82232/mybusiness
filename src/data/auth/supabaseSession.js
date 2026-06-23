/**
 * Time-boxed Supabase session read — shared by boot (auth) and cloud sync.
 * Prevents indefinite hangs when offline (token refresh / Web Locks).
 */

const SESSION_TIMED_OUT = Symbol("supabase-session-timeout");

/**
 * @param {import("@supabase/supabase-js").SupabaseClient | null} client
 * @param {{ timeoutMs?: number }} [opts]
 * @returns {Promise<{ timedOut: boolean, session: object|null }>}
 */
export async function readSupabaseSessionSafely(client, { timeoutMs = 3000 } = {}) {
  if (!client) return { timedOut: false, session: null };
  let timer = null;
  try {
    const result = await Promise.race([
      client.auth.getSession(),
      new Promise((resolve) => {
        timer = setTimeout(() => resolve(SESSION_TIMED_OUT), timeoutMs);
      }),
    ]);
    if (result === SESSION_TIMED_OUT) return { timedOut: true, session: null };
    return { timedOut: false, session: result?.data?.session ?? null };
  } catch {
    return { timedOut: true, session: null };
  } finally {
    if (timer != null) clearTimeout(timer);
  }
}
