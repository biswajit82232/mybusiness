/**
 * Daily metric series for dashboard KPI sparklines.
 */
import { addDaysStr, num, todayStr } from "./appModel.js";

/**
 * Build a fixed-length daily series ending on endDate (default today).
 * @param {Map<string, number>} valuesByDate YYYY-MM-DD → value
 * @param {string} [endDate]
 * @param {number} [days]
 */
export function buildDailySparkline(valuesByDate, endDate, days = 60) {
  const end = String(endDate || todayStr()).slice(0, 10);
  const points = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = addDaysStr(end, -i);
    points.push(num(valuesByDate.get(d)));
  }
  return points;
}

function addToMap(map, dateStr, amount) {
  const d = String(dateStr || "").slice(0, 10);
  if (d.length < 10) return;
  map.set(d, (map.get(d) || 0) + num(amount));
}

/** Daily invoiced revenue (accrual). */
export function buildDailyRevenueMap(sales) {
  const map = new Map();
  for (const s of Array.isArray(sales) ? sales : []) {
    if (!s) continue;
    addToMap(map, s.date, s.totalSale);
  }
  return map;
}

/** Daily net profit proxy: revenue − COGS − expenses + other income by transaction date. */
export function buildDailyNetProfitMap(sales, expenses, otherIncomes) {
  const map = new Map();
  for (const s of Array.isArray(sales) ? sales : []) {
    if (!s) continue;
    addToMap(map, s.date, num(s.totalSale) - num(s.totalCost));
  }
  for (const e of Array.isArray(expenses) ? expenses : []) {
    if (!e) continue;
    addToMap(map, e.date, -num(e.amount));
  }
  for (const oi of Array.isArray(otherIncomes) ? otherIncomes : []) {
    if (!oi) continue;
    addToMap(map, oi.date, num(oi.amount));
  }
  return map;
}

/** Daily new receivables: outstanding on invoices dated that day. */
export function buildDailyReceivablesMap(sales) {
  const map = new Map();
  for (const s of Array.isArray(sales) ? sales : []) {
    if (!s) continue;
    const out = num(s.outstanding);
    if (out > 0.005) addToMap(map, s.date, out);
  }
  return map;
}

export function sparklineSvgPoints(values, width = 120, height = 28) {
  const vals = Array.isArray(values) ? values : [];
  if (vals.length < 2) return "";
  const mx = Math.max(1, ...vals.map((v) => Math.abs(num(v))));
  return vals
    .map((v, i) => {
      const x = (i / Math.max(1, vals.length - 1)) * (width - 2) + 1;
      const y = height - 2 - (Math.max(0, num(v)) / mx) * (height - 4);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}
