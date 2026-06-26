import { formatMonthLabel, currentMonthStr, shiftMonthKey } from "@/domain/index.js";
import { IcCalDay, IcChevL, IcChevR, IcX } from "@/shared/ui/icons/AppIcons.jsx";

/** Compact icon month picker: prev/next arrows, calendar chip + native month input, optional FY clear. */
export function MonthFilterCompact({ value, onChange, instanceId, allowClear = true }) {
  const hasMonth = !!(value && String(value).length >= 7);
  const display = hasMonth ? formatMonthLabel(value) : "FY";
  const pickerValue = hasMonth ? value : currentMonthStr();
  const inputId = `month-pick-${instanceId}`;
  const monthKey = hasMonth ? String(value).slice(0, 7) : currentMonthStr();

  return (
    <div className="month-filter-compact" role="group" aria-label="Filter by month">
      <button
        type="button"
        className="month-nav-btn"
        onClick={() => onChange(shiftMonthKey(monthKey, -1))}
        aria-label="Previous month"
      >
        <IcChevL />
      </button>
      <div className="month-filter-chip">
        <span className="month-filter-chip-ic" aria-hidden="true">
          <IcCalDay />
        </span>
        <span className="month-filter-chip-txt">{display}</span>
        <input
          id={inputId}
          type="month"
          className="month-input-overlay"
          value={pickerValue}
          onChange={(e) => onChange(e.target.value)}
          aria-label={hasMonth ? `Month: ${display}` : "Pick month"}
        />
      </div>
      <button
        type="button"
        className="month-nav-btn"
        onClick={() => onChange(shiftMonthKey(monthKey, 1))}
        aria-label="Next month"
      >
        <IcChevR />
      </button>
      {allowClear && hasMonth && (
        <button
          type="button"
          className="month-clear-ic"
          onClick={() => onChange("")}
          aria-label="Full financial year"
          title="Full year"
        >
          <IcX />
        </button>
      )}
    </div>
  );
}
