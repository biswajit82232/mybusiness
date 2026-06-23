import LoginScreen from "./LoginScreen.jsx";
import { BootLoadingScreen } from "@/features/bootstrap/index.js";

/**
 * Login → boot splash → main app. Keeps `App.jsx` free of branching markup for these states.
 */
export function AuthStep({
  authState,
  bootVisible,
  bootProgressPct,
  bootProgressLabel,
  onAuthenticated,
  onBootFinish,
  children,
}) {
  if (authState === "needsAuth") {
    return (
      <>
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <LoginScreen onAuthenticated={onAuthenticated} />
      </>
    );
  }
  if (authState === "checking" || bootVisible) {
    const bootPhase = authState === "checking" ? "loading" : "finishing";
    return (
      <>
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <BootLoadingScreen
          phase={bootPhase}
          progressPct={bootProgressPct}
          progressLabel={bootProgressLabel}
          onFinishComplete={onBootFinish}
        />
      </>
    );
  }
  return children;
}
