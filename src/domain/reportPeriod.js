/**
 * Unified report period — FY, month, all time, or custom from–to range.
 */
import { currentMonthStr, formatMonthLabel, isDateInFy, todayStr } from "./appModel.js";

/** @typedef {"fy"|"month"|"all"|"custom"} ReportPeriodMode */

/**
 * @param {number} fsm
 * @param {number} fyYear
 * @returns {{ fromDate: string, toDate: string }}
 */
export function fyDateRangeYmd(fsm, fyYear) {
  const fsmN = Math.min(12, Math.max(1, numMonth(fsm)));
  const startYear = fsmN === 1 ? fyYear : fyYear;
  const fromDate = `${startYear}-${String(fsmN).padStart(2, "0")}-01`;
  const endYear = fsmN === 1 ? fyYear : fyYear + 1;
  const endMonth = fsmN === 1 ? 12 : fsmN - 1;
  const lastDay = new Date(endYear, endMonth, 0).getDate();
  const toDate = `${endYear}-${String(endMonth).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { fromDate, toDate };
}

function numMonth(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 4;
}

/**
 * @param {number} fsm
 * @param {number} fyYear
 */
export function defaultReportPeriod(fsm, fyYear) {
  const { fromDate, toDate } = fyDateRangeYmd(fsm, fyYear);
  return {
    mode: "fy",
    fromDate,
    toDate,
    reportMonth: currentMonthStr(),
    fsm,
    fyYear,
  };
}

/** Normalize legacy `{ range, reportMonth }` or new `{ mode, fromDate, toDate }`. */
export function normalizeReportPeriod(period, fsm = 4, fyYear = new Date().getFullYear()) {
  if (!period || typeof period !== "object") return defaultReportPeriod(fsm, fyYear);
  if (period.mode) {
    return {
      mode: period.mode,
      fromDate: String(period.fromDate || "").slice(0, 10),
      toDate: String(period.toDate || "").slice(0, 10),
      reportMonth: String(period.reportMonth || currentMonthStr()).slice(0, 7),
      fsm: period.fsm ?? fsm,
      fyYear: period.fyYear ?? fyYear,
    };
  }
  const mode = period.range === "all" ? "all" : period.range === "month" ? "month" : period.range === "custom" ? "custom" : "fy";
  const base = defaultReportPeriod(period.fsm ?? fsm, period.fyYear ?? fyYear);
  if (mode === "month") {
    const mk = String(period.reportMonth || currentMonthStr()).slice(0, 7);
    const [y, m] = mk.split("-").map(Number);
    const last = new Date(y, m, 0).getDate();
    return {
      mode: "month",
      fromDate: `${mk}-01`,
      toDate: `${mk}-${String(last).padStart(2, "0")}`,
      reportMonth: mk,
      fsm: period.fsm ?? fsm,
      fyYear: period.fyYear ?? fyYear,
    };
  }
  if (mode === "custom") {
    return {
      mode: "custom",
      fromDate: String(period.fromDate || base.fromDate).slice(0, 10),
      toDate: String(period.toDate || period.fromDate || todayStr()).slice(0, 10),
      reportMonth: String(period.reportMonth || currentMonthStr()).slice(0, 7),
      fsm: period.fsm ?? fsm,
      fyYear: period.fyYear ?? fyYear,
    };
  }
  if (mode === "all") {
    return { mode: "all", fromDate: "", toDate: "", reportMonth: base.reportMonth, fsm: base.fsm, fyYear: base.fyYear };
  }
  return { ...base, mode: "fy" };
}

/** Whether a YYYY-MM-DD falls in the report period. */
export function isDateInReportPeriod(dateStr, period, fsm = 4, fyYear = new Date().getFullYear()) {
  const p = normalizeReportPeriod(period, fsm, fyYear);
  const d = String(dateStr || "").slice(0, 10);
  if (!d || d.length < 10) return false;
  if (p.mode === "all") return true;
  if (p.mode === "fy") return isDateInFy(d, p.fsm, p.fyYear);
  if (p.mode === "month") {
    const mk = String(p.reportMonth || "").slice(0, 7);
    return mk.length >= 7 && d.startsWith(mk);
  }
  if (p.fromDate && d < p.fromDate) return false;
  if (p.toDate && d > p.toDate) return false;
  return true;
}

/** Human label for period bar / print header. */
export function reportPeriodLabel(period, fyStr = "") {
  const p = normalizeReportPeriod(period);
  if (p.mode === "all") return "All time";
  if (p.mode === "month") return formatMonthLabel(String(p.reportMonth).slice(0, 7));
  if (p.mode === "fy") return `FY ${fyStr || p.fyYear}`;
  if (p.fromDate && p.toDate) {
    if (p.fromDate === p.toDate) return p.fromDate;
    return `${p.fromDate} → ${p.toDate}`;
  }
  return "Custom range";
}

/** Legacy shape for gstr1 / tally modules. */
export function toLegacyPeriodOpts(period, fsm, fyYear) {
  const p = normalizeReportPeriod(period, fsm, fyYear);
  return {
    range: p.mode === "custom" ? "custom" : p.mode,
    reportMonth: p.reportMonth,
    fsm: p.fsm,
    fyYear: p.fyYear,
    fromDate: p.fromDate,
    toDate: p.toDate,
  };
}
