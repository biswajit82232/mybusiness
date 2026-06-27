/**
 * Daily metric series for dashboard KPI sparklines.
 */
import {
  addDaysStr,
  fyMonthSequence,
  normalizePaymentEntries,
  num,
  roundMoney2,
  todayStr,
} from "./appModel.js";

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

function lastDayOfMonth(monthKey) {
  const mk = String(monthKey || "").slice(0, 7);
  const [y, m] = mk.split("-").map(Number);
  if (!y || !m || m < 1 || m > 12) return "";
  const last = new Date(y, m, 0).getDate();
  return `${y}-${String(m).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
}

/** One point per calendar day from start through end (inclusive). */
export function buildDailySparklineRange(valuesByDate, startDate, endDate) {
  const start = String(startDate || "").slice(0, 10);
  let end = String(endDate || "").slice(0, 10);
  if (start.length < 10 || end.length < 10 || end < start) return { dates: [], values: [] };
  const today = todayStr();
  if (end > today) end = today;
  const dates = [];
  const values = [];
  let d = start;
  while (d <= end) {
    dates.push(d);
    values.push(num(valuesByDate.get(d)));
    d = addDaysStr(d, 1);
  }
  return { dates, values };
}

/** Daily series for a calendar month (respects month filter). */
export function buildDailySparklineForMonth(valuesByDate, monthKey) {
  const mk = String(monthKey || "").slice(0, 7);
  if (mk.length < 7) return { dates: [], values: [] };
  return buildDailySparklineRange(valuesByDate, `${mk}-01`, lastDayOfMonth(mk));
}

/** Daily series for the active financial year (when month filter is cleared). */
export function buildDailySparklineForFy(valuesByDate, fsm, fyYear) {
  const months = fyMonthSequence(fsm, fyYear);
  if (!months.length) return { dates: [], values: [] };
  return buildDailySparklineRange(valuesByDate, `${months[0]}-01`, lastDayOfMonth(months[months.length - 1]));
}

/** Period-scoped sparkline: selected month or full FY — values only (legacy). */
export function buildPeriodDailySparkline(valuesByDate, { businessMonth, fsm, fyYear }) {
  return buildPeriodDailySparklineSeries(valuesByDate, { businessMonth, fsm, fyYear }).values;
}

/** Period-scoped sparkline with dates for interactive scrubber. */
export function buildPeriodDailySparklineSeries(valuesByDate, { businessMonth, fsm, fyYear }) {
  return businessMonth
    ? buildDailySparklineForMonth(valuesByDate, businessMonth)
    : buildDailySparklineForFy(valuesByDate, fsm, fyYear);
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

/** Daily cash collected from sales (payment dates). */
export function buildDailyCashRevenueMap(sales) {
  const map = new Map();
  for (const s of Array.isArray(sales) ? sales : []) {
    if (!s || typeof s !== "object") continue;
    const pes = normalizePaymentEntries(s);
    if (pes.length > 0) {
      for (const pe of pes) {
        if (num(pe.amount) <= 0) continue;
        addToMap(map, pe.date, pe.amount);
      }
    } else if (num(s.received) > 0) {
      addToMap(map, s.date, s.received);
    }
  }
  return map;
}

/** Daily COGS aligned to payment dates (cash basis). */
export function buildDailyCashCogsMap(sales) {
  const map = new Map();
  const zeroInvoiceCogsDone = new Set();
  for (const s of Array.isArray(sales) ? sales : []) {
    if (!s || typeof s !== "object") continue;
    const tc = num(s.totalCost);
    const ts = num(s.totalSale);
    const pes = normalizePaymentEntries(s);
    if (pes.length > 0) {
      for (const pe of pes) {
        const amt = num(pe.amount);
        if (amt <= 0) continue;
        let cogs = 0;
        if (ts <= 0) {
          if (!zeroInvoiceCogsDone.has(s.id)) {
            cogs = tc;
            zeroInvoiceCogsDone.add(s.id);
          }
        } else {
          cogs = roundMoney2(tc * (amt / ts));
        }
        if (cogs > 0) addToMap(map, pe.date, cogs);
      }
    } else {
      const leg = num(s.received);
      if (leg <= 0) continue;
      let cogs = 0;
      if (ts <= 0) {
        if (!zeroInvoiceCogsDone.has(s.id)) {
          cogs = tc;
          zeroInvoiceCogsDone.add(s.id);
        }
      } else {
        cogs = roundMoney2(tc * (leg / ts));
      }
      if (cogs > 0) addToMap(map, s.date, cogs);
    }
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

/** Daily net profit on cash basis (payment / bank-linked dates). */
export function buildDailyCashNetProfitMap(sales, expenses, otherIncomes) {
  const map = new Map();
  for (const [d, v] of buildDailyCashRevenueMap(sales)) addToMap(map, d, v);
  for (const [d, v] of buildDailyCashCogsMap(sales)) addToMap(map, d, -v);
  for (const e of Array.isArray(expenses) ? expenses : []) {
    if (!e || !String(e.bankAccountId || "").trim()) continue;
    addToMap(map, e.date, -num(e.amount));
  }
  for (const oi of Array.isArray(otherIncomes) ? otherIncomes : []) {
    if (!oi || !String(oi.bankAccountId || "").trim()) continue;
    addToMap(map, oi.date, num(oi.amount));
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
