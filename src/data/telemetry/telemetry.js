import { viteEnv } from "@/config/env.js";

const MAX_MSG_LEN = 500;
const MAX_REASON_LEN = 1000;

/**
 * Reduce a full UA string to a coarse "browser-family/OS-family" summary
 * to avoid sending a fingerprintable identifier.
 */
export function coarseUserAgent(ua) {
  const s = String(ua || "");
  let browser = "Other";
  if (/Edg\//.test(s)) browser = "Edge";
  else if (/OPR\/|Opera/.test(s)) browser = "Opera";
  else if (/Chrome\//.test(s)) browser = "Chrome";
  else if (/Firefox\//.test(s)) browser = "Firefox";
  else if (/Safari\//.test(s)) browser = "Safari";

  let os = "Other";
  if (/Android/.test(s)) os = "Android";
  else if (/iPhone|iPad|iPod/.test(s)) os = "iOS";
  else if (/Macintosh|Mac OS X/.test(s)) os = "macOS";
  else if (/Windows/.test(s)) os = "Windows";
  else if (/Linux/.test(s)) os = "Linux";

  return `${browser}/${os}`;
}

/**
 * Strip query strings, hashes, and pathname segments from a URL-like string
 * so file references don't leak query params or deep paths.
 */
export function sanitizeFilename(file) {
  if (!file) return "";
  try {
    const u = new URL(String(file));
    const last = u.pathname.split("/").filter(Boolean).pop() || "/";
    return `${u.origin}/${last}`;
  } catch {
    const s = String(file);
    const noHash = s.split("#")[0];
    const noQuery = noHash.split("?")[0];
    return noQuery.length > 200 ? noQuery.slice(-200) : noQuery;
  }
}

function truncate(value, limit) {
  if (value == null) return value;
  const s = String(value);
  return s.length > limit ? s.slice(0, limit) : s;
}

function postTelemetry(type, payload) {
  if (!viteEnv.telemetryUrl) return;
  try {
    const body = new Blob(
      [
        JSON.stringify({
          type,
          payload,
          ts: new Date().toISOString(),
          ua: coarseUserAgent(typeof navigator !== "undefined" ? navigator.userAgent : ""),
        }),
      ],
      { type: "application/json" },
    );
    navigator.sendBeacon?.(viteEnv.telemetryUrl, body);
  } catch {
    // best effort only
  }
}

export function initTelemetry() {
  window.addEventListener("error", (e) => {
    postTelemetry("window_error", {
      message: truncate(e.message, MAX_MSG_LEN),
      filename: sanitizeFilename(e.filename),
      lineno: e.lineno,
      colno: e.colno,
    });
  });
  window.addEventListener("unhandledrejection", (e) => {
    postTelemetry("unhandled_rejection", {
      reason: truncate(String(e.reason || "unknown"), MAX_REASON_LEN),
    });
    if (viteEnv.DEV) {
      console.error("[unhandledrejection]", e.reason);
    }
  });
  // Bonus: surface persist-merge failures (silent data drops fixed in Phase 1).
  window.addEventListener("mybusiness:persist-merge-failed", (e) => {
    const detail = e?.detail || {};
    postTelemetry("persist_merge_failed", {
      message: truncate(detail.message || "unknown", MAX_MSG_LEN),
    });
  });
}

