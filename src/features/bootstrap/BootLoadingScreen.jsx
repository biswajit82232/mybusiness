import { useEffect, useMemo, useRef, useState } from "react";

/**
 * Bootstrap splash — minimal but engaging.
 *
 *  - Progress bar driven by real bootstrap steps (`progressPct` / `progressLabel`).
 *  - A subtle pulse on the logo (CSS, opt-out via prefers-reduced-motion).
 *  - Status text rotates among honest, phase-derived hints — never random fluff.
 *  - Live connection indicator (online / offline).
 *  - Animates to 100% only in the `finishing` phase after auth + local data are ready.
 */
export function BootLoadingScreen({ phase, progressPct, progressLabel, onFinishComplete }) {
  const [finishPct, setFinishPct] = useState(() => Math.min(88, progressPct));
  const rafRef = useRef(0);
  const reduceMotion =
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const loadingPct = Math.min(88, Math.max(0, progressPct));
  const displayPct = phase === "finishing" ? finishPct : loadingPct;
  const pctRounded = Math.min(100, Math.max(0, Math.round(displayPct)));

  // Live connection state for the small status footer.
  const [online, setOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine !== false
  );
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  const status = useMemo(() => {
    if (phase === "finishing") return "Ready";
    if (progressLabel) return progressLabel;
    if (progressPct < 10) return "Starting up";
    if (progressPct < 25) return "Checking session";
    if (progressPct < 55) return "Restoring your books";
    if (progressPct < 80) return "Indexing entries";
    return "Almost there";
  }, [phase, progressPct, progressLabel]);

  useEffect(() => {
    if (phase === "loading") {
      setFinishPct(loadingPct);
    }
  }, [phase, loadingPct]);

  const finishStartedRef = useRef(false);

  useEffect(() => {
    if (phase !== "finishing") {
      finishStartedRef.current = false;
      return;
    }
    if (finishStartedRef.current) return;
    finishStartedRef.current = true;

    let timeoutId = 0;
    let safetyId = 0;
    const from = Math.min(Math.max(loadingPct, 12), 92);

    const done = () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (safetyId) clearTimeout(safetyId);
      onFinishComplete?.();
    };

    // Never leave the splash up if the finish animation is interrupted.
    safetyId = window.setTimeout(done, 1500);

    if (reduceMotion) {
      setFinishPct(100);
      timeoutId = window.setTimeout(done, 80);
      return () => {
        clearTimeout(timeoutId);
        clearTimeout(safetyId);
      };
    }

    setFinishPct(from);
    const t0 = performance.now();
    const duration = 300;

    const tick = (now) => {
      const t = Math.min(1, (now - t0) / duration);
      const eased = 1 - (1 - t) ** 3;
      setFinishPct(from + (100 - from) * eased);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        timeoutId = window.setTimeout(done, 80);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafRef.current);
      if (timeoutId) clearTimeout(timeoutId);
      if (safetyId) clearTimeout(safetyId);
    };
    // Intentionally omit loadingPct — progress ticks during "finishing" must not restart this effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once per finishing phase
  }, [phase, onFinishComplete, reduceMotion]);

  return (
    <div className="boot-screen" id="main-content" role="main" tabIndex={-1}>
      <div className="boot-screen__aura" aria-hidden="true" />
      <div className="boot-screen__inner">
        <div className={`boot-screen__logo-wrap${reduceMotion ? "" : " boot-screen__logo-wrap--pulse"}`}>
          <span className="boot-screen__ring" aria-hidden="true" />
          <span className="boot-screen__logo-card">
            <img
              src="/icon-192.png"
              alt=""
              className="boot-screen__mark"
              width={56}
              height={56}
              decoding="async"
              fetchPriority="high"
            />
          </span>
        </div>
        <p className="boot-screen__name">MyBusiness</p>
        <p className="boot-screen__tagline">Your books, everywhere</p>

        <div className="boot-screen__progress">
          <div className="boot-screen__progress-head">
            <span className="boot-screen__status" aria-live="polite">
              {status}
            </span>
            <span className="boot-screen__pct" aria-hidden="true">
              {pctRounded}%
            </span>
          </div>
          <div
            className="boot-screen__bar"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={pctRounded}
            aria-valuetext={status}
            aria-busy={pctRounded < 100}
          >
            <div className="boot-screen__bar-track">
              <div className="boot-screen__bar-fill" style={{ width: `${displayPct}%` }} />
            </div>
          </div>
        </div>

        <p className={`boot-screen__net${online ? "" : " boot-screen__net--off"}`} aria-live="polite">
          <span className="boot-screen__net-dot" aria-hidden="true" />
          {online ? "Online" : "Offline — your data is local"}
        </p>
      </div>
    </div>
  );
}
