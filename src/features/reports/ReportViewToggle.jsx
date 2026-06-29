/** Bill wise vs party wise toggle for reports. */
export function ReportViewToggle({ viewMode, onChange, partyLabel = "Party" }) {
  return (
    <div className="seg-bar rep-view-toggle" role="group" aria-label="Report grouping">
      <button
        type="button"
        className={`seg-btn${viewMode === "bill" ? " active" : ""}`}
        aria-pressed={viewMode === "bill"}
        onClick={() => onChange("bill")}
      >
        Bill wise
      </button>
      <button
        type="button"
        className={`seg-btn${viewMode === "party" ? " active" : ""}`}
        aria-pressed={viewMode === "party"}
        onClick={() => onChange("party")}
      >
        {partyLabel} wise
      </button>
    </div>
  );
}
