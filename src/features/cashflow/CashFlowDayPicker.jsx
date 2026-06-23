import { addDaysStr, dateHuman, todayStr } from "@/domain/index.js";
import { IcCalDay, IcChevL, IcChevR } from "@/shared/ui/icons/AppIcons.jsx";

export function CashFlowDayPicker({ value, onChange }) {
  const d = value && String(value).length >= 10 ? String(value).slice(0, 10) : todayStr();
  return (
    <div className="month-filter-compact cashflow-day-filter" role="group" aria-label="Filter by day">
      <button type="button" className="month-nav-btn" onClick={() => onChange(addDaysStr(d, -1))} aria-label="Previous day">
        <IcChevL />
      </button>
      <div className="month-filter-chip">
        <span className="month-filter-chip-ic" aria-hidden="true">
          <IcCalDay />
        </span>
        <span className="month-filter-chip-txt">{dateHuman(d)}</span>
        <input
          type="date"
          className="month-input-overlay"
          value={d}
          onChange={(e) => onChange(e.target.value || todayStr())}
          aria-label="Choose day"
        />
      </div>
      <button type="button" className="month-nav-btn" onClick={() => onChange(addDaysStr(d, 1))} aria-label="Next day">
        <IcChevR />
      </button>
    </div>
  );
}
