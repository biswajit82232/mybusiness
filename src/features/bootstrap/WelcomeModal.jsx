import { useRef } from "react";
import { useFocusTrap } from "@/shared/hooks/useFocusTrap.js";

export function WelcomeModal({ onDismiss }) {
  const rootRef = useRef(null);
  useFocusTrap(rootRef, true);
  return (
    <div ref={rootRef} className="welcome-overlay" role="dialog" aria-modal="true" aria-labelledby="welcome-title">
      <div className="welcome-card">
        <h2 id="welcome-title" className="welcome-title">Welcome to MyBusiness</h2>
        <p className="welcome-lead">
          Run invoicing, inventory, expenses, and banking from the menu. Your data stays on this device unless you turn on cloud sync in Settings.
        </p>
        <button type="button" className="primary-btn welcome-btn" onClick={onDismiss}>
          Continue
        </button>
      </div>
    </div>
  );
}
