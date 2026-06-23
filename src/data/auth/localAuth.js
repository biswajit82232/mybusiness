/**
 * Local-only email + password gate (no server).
 * Credentials stored in localStorage; password hashed with PBKDF2-SHA256.
 *
 * `crypto.subtle` exists only in secure contexts (https, localhost, 127.0.0.1).
 * Opening the dev server as http://192.168.x.x leaves `subtle` undefined — we fall
 * back to @noble/hashes (same PBKDF2-HMAC-SHA256 parameters) so LAN sign-up works.
 */

import { pbkdf2Async } from "@noble/hashes/pbkdf2.js";
import { sha256 } from "@noble/hashes/sha2.js";

const LS_CRED = "biz_local_credentials_v1";
const LS_SESS = "biz_auth_session_v1";

function normalizeEmail(email) {
  return String(email || "")
    .trim()
    .toLowerCase();
}

function bytesToB64(buf) {
  const u8 = buf instanceof ArrayBuffer ? new Uint8Array(buf) : buf;
  let s = "";
  for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]);
  return btoa(s);
}

function b64ToBytes(b64) {
  const bin = atob(b64);
  const u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return u8;
}

const PBKDF2_ITERATIONS = 120_000;
const PBKDF2_BITS = 256;

function hasWebCryptoSubtle() {
  return typeof globalThis.crypto !== "undefined" && globalThis.crypto.subtle != null;
}

async function pbkdf2Hash(password, saltBytes) {
  const enc = new TextEncoder();
  const passBytes = enc.encode(password);
  const salt = saltBytes instanceof Uint8Array ? saltBytes : new Uint8Array(saltBytes);

  if (hasWebCryptoSubtle()) {
    const keyMaterial = await crypto.subtle.importKey("raw", passBytes, "PBKDF2", false, ["deriveBits"]);
    return crypto.subtle.deriveBits(
      { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
      keyMaterial,
      PBKDF2_BITS
    );
  }

  const dk = await pbkdf2Async(sha256, passBytes, salt, { c: PBKDF2_ITERATIONS, dkLen: PBKDF2_BITS / 8 });
  return dk.buffer.slice(dk.byteOffset, dk.byteOffset + dk.byteLength);
}

export function readCredentials() {
  try {
    const raw = localStorage.getItem(LS_CRED);
    if (!raw) return null;
    const o = JSON.parse(raw);
    if (!o?.email || !o?.saltB64 || !o?.hashB64) return null;
    return o;
  } catch {
    return null;
  }
}

export function hasAccount() {
  return !!readCredentials()?.email;
}

export function hasSession() {
  try {
    const raw = localStorage.getItem(LS_SESS);
    if (!raw) return false;
    const s = JSON.parse(raw);
    const cred = readCredentials();
    if (!cred?.email || typeof s?.email !== "string") return false;
    return normalizeEmail(s.email) === normalizeEmail(cred.email);
  } catch {
    return false;
  }
}

export function clearSession() {
  localStorage.removeItem(LS_SESS);
}

export function logout() {
  clearSession();
}

/** Remove stored email + password hash (e.g. full data reset). */
export function clearLocalAuthCredentials() {
  try {
    localStorage.removeItem(LS_CRED);
    localStorage.removeItem(LS_SESS);
  } catch {
    /* ignore */
  }
}

function setSession(email) {
  localStorage.setItem(LS_SESS, JSON.stringify({ email: normalizeEmail(email), at: Date.now() }));
}

/**
 * @returns {Promise<{ ok: true } | { ok: false, error: string }>}
 */
export async function registerAccount(email, password, passwordConfirm) {
  const norm = normalizeEmail(email);
  if (!norm || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(norm)) {
    return { ok: false, error: "Enter a valid email address." };
  }
  if (password.length < 8) {
    return { ok: false, error: "Password must be at least 8 characters." };
  }
  if (password !== passwordConfirm) {
    return { ok: false, error: "Passwords do not match." };
  }
  if (hasAccount()) {
    return { ok: false, error: "An account already exists on this device." };
  }
  try {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const hashBuf = await pbkdf2Hash(password, salt);
    const cred = {
      email: norm,
      saltB64: bytesToB64(salt.buffer),
      hashB64: bytesToB64(hashBuf),
    };
    localStorage.setItem(LS_CRED, JSON.stringify(cred));
    setSession(norm);
    return { ok: true };
  } catch (e) {
    console.error("[localAuth] register", e);
    return { ok: false, error: "Could not save account. Try again." };
  }
}

/**
 * @returns {Promise<{ ok: true } | { ok: false, error: string }>}
 */
export async function loginWithPassword(email, password) {
  const norm = normalizeEmail(email);
  const cred = readCredentials();
  if (!cred) {
    return { ok: false, error: "No account found. Create one first." };
  }
  if (norm !== cred.email) {
    return { ok: false, error: "Email does not match this device’s account." };
  }
  try {
    const salt = b64ToBytes(cred.saltB64);
    const hashBuf = await pbkdf2Hash(password, salt);
    const expected = b64ToBytes(cred.hashB64);
    const got = new Uint8Array(hashBuf);
    if (got.length !== expected.length) {
      return { ok: false, error: "Wrong password." };
    }
    for (let i = 0; i < got.length; i++) {
      if (got[i] !== expected[i]) return { ok: false, error: "Wrong password." };
    }
    setSession(norm);
    return { ok: true };
  } catch (e) {
    console.error("[localAuth] login", e);
    return { ok: false, error: "Sign-in failed. Try again." };
  }
}
