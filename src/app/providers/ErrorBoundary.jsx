import { Component } from "react";
import { COLORS, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from "@/tokens.js";
import { viteEnv } from "@/config/env.js";
import { coarseUserAgent, sanitizeFilename } from "@/data/telemetry/telemetry.js";

function shortId() {
  try {
    if (typeof globalThis.crypto?.randomUUID === "function") {
      return globalThis.crypto.randomUUID().slice(0, 8).toUpperCase();
    }
  } catch {
    /* fall through */
  }
  return Math.random().toString(36).slice(2, 10).toUpperCase();
}

/**
 * Strip absolute URLs and query strings out of a stack trace so we don't ship
 * deep paths or query params to telemetry. Keeps function names + line/col.
 */
function sanitizeStack(stack) {
  if (!stack) return null;
  const s = String(stack);
  return s
    .replace(/https?:\/\/[^\s)]+/g, (m) => sanitizeFilename(m))
    .slice(0, 2000);
}

function reportError(error, errorInfo, errorRef) {
  const telemetryUrl = viteEnv.telemetryUrl;
  if (!telemetryUrl) return;
  try {
    const body = new Blob(
      [
        JSON.stringify({
          type: "react_error",
          ref: errorRef,
          payload: {
            message: (error?.message || String(error) || "").slice(0, 500),
            stack: sanitizeStack(error?.stack),
            componentStack: errorInfo?.componentStack
              ? errorInfo.componentStack.slice(0, 2000)
              : null,
          },
          ts: new Date().toISOString(),
          ua: coarseUserAgent(typeof navigator !== "undefined" ? navigator.userAgent : ""),
        }),
      ],
      { type: "application/json" },
    );
    navigator.sendBeacon?.(telemetryUrl, body);
  } catch {
    /* telemetry is best-effort only */
  }
}

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorRef: null, errorMessage: "" };
  }

  static getDerivedStateFromError(error) {
    const msg = error && typeof error === "object" && "message" in error ? String(error.message) : String(error);
    return { hasError: true, errorRef: shortId(), errorMessage: msg.slice(0, 500) };
  }

  componentDidCatch(error, errorInfo) {
    console.error("[ErrorBoundary]", error, errorInfo);
    reportError(error, errorInfo, this.state?.errorRef);
  }

  onReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    const { errorRef, errorMessage } = this.state;
    return (
      <div
        style={{
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          padding: 20,
          background: "var(--bg, #f5f7fa)",
          color: "var(--text, #111827)",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 420,
            background: "var(--card, #fff)",
            border: "1px solid var(--line, #e2e8f0)",
            borderRadius: 16,
            padding: 24,
            boxShadow: "var(--shadow-float, 0 8px 28px rgba(0,0,0,0.12))",
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: "var(--danger-bg, #fef2f2)",
              display: "grid",
              placeItems: "center",
              marginBottom: 16,
            }}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--danger, #ef4444)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: "var(--text, #111827)" }}>
            Something went wrong
          </h1>
          <p style={{ fontSize: 14, color: "var(--muted, #6b7280)", lineHeight: 1.5, marginBottom: 8 }}>
            Reload to continue.
          </p>
          {errorRef && (
            <p
              style={{
                fontSize: 12,
                color: "var(--muted2, #9ca3af)",
                background: "var(--line2, #f4f6f8)",
                border: "1px solid var(--line, #e2e8f0)",
                borderRadius: 6,
                padding: "4px 10px",
                fontFamily: "monospace",
                marginBottom: 12,
                display: "inline-block",
              }}
            >
              Error ref: {errorRef}
            </p>
          )}
          {errorMessage ? (
            <details style={{ marginBottom: 16, fontSize: 13, color: "var(--muted, #6b7280)" }}>
              <summary style={{ cursor: "pointer", fontWeight: 600, marginBottom: 6 }}>Technical details</summary>
              <pre
                style={{
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  fontSize: 12,
                  fontFamily: "ui-monospace, monospace",
                  margin: "8px 0 0",
                  padding: 10,
                  background: "var(--line2, #f4f6f8)",
                  borderRadius: 8,
                  border: "1px solid var(--line, #e2e8f0)",
                  maxHeight: 120,
                  overflow: "auto",
                }}
              >
                {errorMessage}
              </pre>
            </details>
          ) : null}
          <button
            type="button"
            onClick={this.onReload}
            style={{
              width: "100%",
              minHeight: 44,
              marginTop: 4,
              borderRadius: BORDER_RADIUS.md,
              border: "none",
              background: COLORS.primary,
              color: COLORS.surface,
              fontWeight: FONT_WEIGHT.bold,
              fontSize: FONT_SIZE.bodyLg,
              cursor: "pointer",
            }}
          >
            Reload
          </button>
        </div>
      </div>
    );
  }
}
