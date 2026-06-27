import { dateHuman } from "@/domain/index.js";

export function SaleDraftBanner({ summary, onResume, onDiscard, compact = false, showResume = true, className = "" }) {
  if (!summary) return null;
  const savedLabel = summary.savedAt ? dateHuman(String(summary.savedAt).slice(0, 10)) : "recently";
  return (
    <div
      className={["sale-draft-banner", compact ? "sale-draft-banner--compact" : "", className].filter(Boolean).join(" ")}
      role="status"
    >
      <div className="sale-draft-banner-text">
        <span className="sale-draft-banner-title">{showResume ? "Invoice draft" : "Draft auto-saved"}</span>
        <span className="sale-draft-banner-sub">
          {summary.label} · saved {savedLabel}
        </span>
      </div>
      <div className="sale-draft-banner-actions">
        {showResume && onResume ? (
          <button type="button" className="sale-draft-btn sale-draft-btn--primary" onClick={onResume}>
            Resume
          </button>
        ) : null}
        {onDiscard ? (
          <button type="button" className="sale-draft-btn" onClick={onDiscard}>
            Discard
          </button>
        ) : null}
      </div>
    </div>
  );
}
