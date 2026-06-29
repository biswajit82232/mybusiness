import { currentMonthStr, todayStr } from "@/domain/index.js";
import { fyDateRangeYmd } from "@/domain/reportPeriod.js";

/**
 * Date range bar — FY / month / all / custom from–to (GoGSTBill-style presets + range).
 */
export function ReportDateRangeBar({ period, onChange, fyStr }) {
  const mode = period?.mode || "fy";

  const setMode = (nextMode) => {
    if (nextMode === "fy") {
      const { fromDate, toDate } = fyDateRangeYmd(period.fsm, period.fyYear);
      onChange({ ...period, mode: "fy", fromDate, toDate });
      return;
    }
    if (nextMode === "month") {
      const mk = String(period.reportMonth || currentMonthStr()).slice(0, 7);
      const [y, m] = mk.split("-").map(Number);
      const last = new Date(y, m, 0).getDate();
      onChange({
        ...period,
        mode: "month",
        reportMonth: mk,
        fromDate: `${mk}-01`,
        toDate: `${mk}-${String(last).padStart(2, "0")}`,
      });
      return;
    }
    if (nextMode === "all") {
      onChange({ ...period, mode: "all", fromDate: "", toDate: "" });
      return;
    }
    onChange({
      ...period,
      mode: "custom",
      fromDate: period.fromDate || todayStr(),
      toDate: period.toDate || todayStr(),
    });
  };

  return (
    <div className="rep-period-bar rep-period-bar--hub">
      <div className="cg-toggle-row rep-toggle cg-toggle-row-4">
        <button type="button" className={`cg-toggle${mode === "fy" ? " active" : ""}`} onClick={() => setMode("fy")}>
          FY {fyStr}
        </button>
        <button type="button" className={`cg-toggle${mode === "month" ? " active" : ""}`} onClick={() => setMode("month")}>
          Month
        </button>
        <button type="button" className={`cg-toggle${mode === "custom" ? " active" : ""}`} onClick={() => setMode("custom")}>
          Range
        </button>
        <button type="button" className={`cg-toggle${mode === "all" ? " active" : ""}`} onClick={() => setMode("all")}>
          All
        </button>
      </div>
      {mode === "month" && (
        <div className="rep-range-row">
          <label className="rep-month-lbl" htmlFor="rep-hub-month">
            Month
          </label>
          <input
            id="rep-hub-month"
            type="month"
            className="month-input"
            value={String(period.reportMonth || currentMonthStr()).slice(0, 7)}
            onChange={(e) => {
              const mk = e.target.value;
              const [y, m] = mk.split("-").map(Number);
              const last = new Date(y, m, 0).getDate();
              onChange({
                ...period,
                mode: "month",
                reportMonth: mk,
                fromDate: `${mk}-01`,
                toDate: `${mk}-${String(last).padStart(2, "0")}`,
              });
            }}
          />
        </div>
      )}
      {mode === "custom" && (
        <div className="rep-range-row rep-range-row--custom">
          <label className="rep-range-field">
            <span className="rep-month-lbl">From</span>
            <input
              type="date"
              className="month-input"
              value={period.fromDate || ""}
              max={period.toDate || undefined}
              onChange={(e) => onChange({ ...period, fromDate: e.target.value, mode: "custom" })}
            />
          </label>
          <label className="rep-range-field">
            <span className="rep-month-lbl">To</span>
            <input
              type="date"
              className="month-input"
              value={period.toDate || ""}
              min={period.fromDate || undefined}
              onChange={(e) => onChange({ ...period, toDate: e.target.value, mode: "custom" })}
            />
          </label>
        </div>
      )}
    </div>
  );
}
