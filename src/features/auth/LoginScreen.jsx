import { useEffect, useState } from "react";
import {
  authSignIn,
  authSignUp,
  isSupabaseConfigured,
  preferLocalAuth,
  prepareLoginModeCloud,
  prepareLoginModeLocal,
  shouldRegisterFirst,
} from "@/data/auth/auth.js";

/**
 * Email + password: optional online sign-in when configured, else local-only gate.
 * User can pick cloud account vs this device only when online auth is available.
 */
export default function LoginScreen({ onAuthenticated }) {
  const hasSupabaseEnv = !!isSupabaseConfigured;
  const [storageChoice, setStorageChoice] = useState(() => {
    if (!hasSupabaseEnv) return "local";
    return preferLocalAuth() ? "local" : "cloud";
  });
  const cloud = hasSupabaseEnv && storageChoice === "cloud";

  const [mode, setMode] = useState(() => {
    if (cloud) return "login";
    return shouldRegisterFirst() ? "register" : "login";
  });

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      const dark = localStorage.getItem("biz_dark") === "1";
      document.documentElement.dataset.theme = dark ? "dark" : "light";
    } catch {
      /* ignore */
    }
  }, []);

  const pickCloud = async () => {
    setError("");
    setBusy(true);
    try {
      await prepareLoginModeCloud();
      setStorageChoice("cloud");
      setMode("login");
    } finally {
      setBusy(false);
    }
  };

  const pickLocal = async () => {
    setError("");
    setBusy(true);
    try {
      await prepareLoginModeLocal();
      setStorageChoice("local");
      setMode(shouldRegisterFirst() ? "register" : "login");
    } finally {
      setBusy(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "register") {
        const r = await authSignUp(email, password, confirm);
        if (!r.ok) {
          setError(r.error);
          return;
        }
      } else {
        const r = await authSignIn(email, password);
        if (!r.ok) {
          setError(r.error);
          return;
        }
      }
      onAuthenticated();
    } finally {
      setBusy(false);
    }
  };

  const isRegister = mode === "register";

  return (
    <div className="login-shell" id="main-content" role="main" tabIndex={-1}>
      <div className="login-card">
        {hasSupabaseEnv ? (
          <div className="login-storage-choice" role="group" aria-label="Where to sign in">
            <button
              type="button"
              className={`login-storage-btn${storageChoice === "cloud" ? " active" : ""}`}
              onClick={pickCloud}
              disabled={busy}
            >
              Cloud account
            </button>
            <button
              type="button"
              className={`login-storage-btn${storageChoice === "local" ? " active" : ""}`}
              onClick={pickLocal}
              disabled={busy}
            >
              This device only
            </button>
          </div>
        ) : null}

        <div className="login-brand">
          <img src="/icon-192.png" alt="" className="login-logo" width={52} height={52} decoding="async" />
          <h1 className="login-title">MyBusiness</h1>
          <p className="login-sub">
            {cloud
              ? isRegister
                ? "Create your account"
                : "Sign in with email"
              : isRegister
                ? "Create your local account"
                : "Sign in to continue"}
          </p>
        </div>

        {cloud ? (
          <div className="login-tabs" role="tablist" aria-label="Authentication mode">
            <button
              type="button"
              role="tab"
              aria-selected={!isRegister}
              className={`login-tab${!isRegister ? " active" : ""}`}
              onClick={() => {
                setMode("login");
                setError("");
              }}
              disabled={busy}
            >
              Sign in
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={isRegister}
              className={`login-tab${isRegister ? " active" : ""}`}
              onClick={() => {
                setMode("register");
                setError("");
              }}
              disabled={busy}
            >
              Create account
            </button>
          </div>
        ) : null}

        <form className="login-form" onSubmit={submit} noValidate>
          <label className="login-label">
            <span>Email</span>
            <input
              type="email"
              name="email"
              autoComplete="email"
              inputMode="email"
              className="login-input"
              placeholder="you@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={busy}
            />
          </label>
          <label className="login-label">
            <span>Password</span>
            <input
              type="password"
              name="password"
              autoComplete={isRegister ? "new-password" : "current-password"}
              className="login-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              disabled={busy}
            />
          </label>
          {isRegister && (
            <label className="login-label">
              <span>Confirm password</span>
              <input
                type="password"
                name="confirm"
                autoComplete="new-password"
                className="login-input"
                placeholder="••••••••"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={8}
                disabled={busy}
              />
            </label>
          )}

          {error ? (
            <p className="login-error" role="alert">
              {error}
            </p>
          ) : null}

          <button type="submit" className="primary-btn submit-btn login-submit" disabled={busy}>
            {busy ? "Please wait…" : isRegister ? "Create account" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
