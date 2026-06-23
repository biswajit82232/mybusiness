/**
 * Unified auth: Supabase when configured (see `isSupabaseConfigured` in ../supabase/client.js, env via viteEnv) or local email/password.
 */
import {
  hasAccount as hasLocalAccount,
  hasSession as hasLocalSession,
  loginWithPassword as localLogin,
  logout as localLogout,
  registerAccount as localRegister,
} from "./localAuth.js";
import { isSupabaseConfigured, supabase } from "../supabase/client.js";
import { readSupabaseSessionSafely } from "./supabaseSession.js";

export { isSupabaseConfigured };

const LS_PREFER_LOCAL = "mb_auth_local";
/** Last known signed-in Supabase user id, so the app can boot offline from local data. */
const LS_CLOUD_UID = "mb_cloud_uid";
const BOOT_SESSION_TIMEOUT_MS = 3000;

/** Cached result from a single boot-time session read (cleared on sign-out). */
let bootAuthSnapshot = null;

function rememberCloudUid(uid) {
  try {
    if (uid) window.localStorage.setItem(LS_CLOUD_UID, String(uid));
    else window.localStorage.removeItem(LS_CLOUD_UID);
  } catch {
    /* ignore */
  }
}

function rememberedCloudUid() {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(LS_CLOUD_UID) || null;
  } catch {
    return null;
  }
}

/** Last known cloud user id — used to open IndexedDB in parallel with session refresh. */
export function getRememberedCloudUid() {
  return rememberedCloudUid();
}

export function clearBootAuthSnapshot() {
  bootAuthSnapshot = null;
}

/** User chose “this device only” on the login screen (even if Supabase env exists). */
export function preferLocalAuth() {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(LS_PREFER_LOCAL) === "1";
  } catch {
    return false;
  }
}

export function setPreferLocalAuth(on) {
  try {
    if (on) window.localStorage.setItem(LS_PREFER_LOCAL, "1");
    else window.localStorage.removeItem(LS_PREFER_LOCAL);
  } catch {
    /* ignore */
  }
}

function routeAuthToSupabase() {
  return isSupabaseConfigured && supabase != null && !preferLocalAuth();
}

/** True when Supabase env is set and user did not pick “this device only” on login. */
export function isCloudAuthEnabled() {
  return isSupabaseConfigured && supabase != null && !preferLocalAuth();
}

/**
 * Single session read for app boot — avoids duplicate Supabase getSession calls.
 * @returns {Promise<{ ready: boolean, userId: string|null }>}
 */
export async function resolveBootAuth() {
  if (bootAuthSnapshot) return bootAuthSnapshot;

  if (preferLocalAuth()) {
    const ready = hasLocalSession();
    bootAuthSnapshot = { ready, userId: ready ? "local-user" : null };
    return bootAuthSnapshot;
  }

  if (isSupabaseConfigured && supabase) {
    const { timedOut, session } = await readSupabaseSessionSafely(supabase, {
      timeoutMs: BOOT_SESSION_TIMEOUT_MS,
    });
    if (timedOut) {
      const uid = rememberedCloudUid();
      bootAuthSnapshot = { ready: !!uid, userId: uid };
      return bootAuthSnapshot;
    }
    const uid = session?.user?.id ?? null;
    rememberCloudUid(uid);
    bootAuthSnapshot = { ready: !!session, userId: uid };
    return bootAuthSnapshot;
  }

  const ready = hasLocalSession();
  bootAuthSnapshot = { ready, userId: ready ? "local-user" : null };
  return bootAuthSnapshot;
}

/** Whether the user may enter the app (session present). */
export async function getAuthSessionReady() {
  if (bootAuthSnapshot) return bootAuthSnapshot.ready;
  return (await resolveBootAuth()).ready;
}

/** User id for IndexedDB: Supabase UUID or fixed local id. */
export async function getResolvedUserId() {
  if (bootAuthSnapshot) return bootAuthSnapshot.userId;
  if (preferLocalAuth()) {
    return hasLocalSession() ? "local-user" : null;
  }
  if (isSupabaseConfigured && supabase) {
    const { timedOut, session } = await readSupabaseSessionSafely(supabase, {
      timeoutMs: BOOT_SESSION_TIMEOUT_MS,
    });
    // Offline / locked: use the remembered uid so IndexedDB opens the right workspace.
    if (timedOut) return rememberedCloudUid();
    if (session?.user?.id) {
      rememberCloudUid(session.user.id);
      return session.user.id;
    }
    rememberCloudUid(null);
    return null;
  }
  return hasLocalSession() ? "local-user" : null;
}

/** Signed-in user id + email when using cloud auth (Settings → Cloud). */
export async function getSupabaseSessionUser() {
  if (!isSupabaseConfigured || !supabase || preferLocalAuth()) return null;
  const { session } = await readSupabaseSessionSafely(supabase, {
    timeoutMs: BOOT_SESSION_TIMEOUT_MS,
  });
  if (!session?.user?.id) return null;
  return {
    id: session.user.id,
    email: String(session.user.email ?? "").trim() || "—",
  };
}

/**
 * @returns {Promise<{ ok: true } | { ok: false, error: string }>}
 */
export async function authSignIn(email, password) {
  if (routeAuthToSupabase()) {
    const { error } = await supabase.auth.signInWithPassword({
      email: String(email).trim(),
      password: String(password),
    });
    if (error) return { ok: false, error: error.message || "Sign-in failed." };
    setPreferLocalAuth(false);
    return { ok: true };
  }
  return localLogin(email, password);
}

/**
 * @returns {Promise<{ ok: true } | { ok: false, error: string }>}
 */
export async function authSignUp(email, password, passwordConfirm) {
  if (routeAuthToSupabase()) {
    if (password !== passwordConfirm) return { ok: false, error: "Passwords do not match." };
    if (String(password).length < 8) return { ok: false, error: "Password must be at least 8 characters." };
    const { data, error } = await supabase.auth.signUp({
      email: String(email).trim(),
      password: String(password),
      options: { emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined },
    });
    if (error) return { ok: false, error: error.message || "Sign-up failed." };
    if (!data.session) {
      return {
        ok: false,
        error:
          "Check your email to confirm your account (if confirmation is enabled in Supabase), then sign in.",
      };
    }
    setPreferLocalAuth(false);
    return { ok: true };
  }
  return localRegister(email, password, passwordConfirm);
}

export async function authSignOut() {
  clearBootAuthSnapshot();
  rememberCloudUid(null);
  if (isSupabaseConfigured && supabase) {
    await supabase.auth.signOut();
  }
  localLogout();
}

/** Whether local-only flow should show “create account” first. */
export function shouldRegisterFirst() {
  if (isSupabaseConfigured && supabase && !preferLocalAuth()) {
    return false;
  }
  return !hasLocalAccount();
}

/** Clear the other auth path when switching login mode (login screen only). */
export async function prepareLoginModeLocal() {
  setPreferLocalAuth(true);
  if (isSupabaseConfigured && supabase) {
    await supabase.auth.signOut();
  }
}

export async function prepareLoginModeCloud() {
  setPreferLocalAuth(false);
  localLogout();
}
