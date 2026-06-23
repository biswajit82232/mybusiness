import { addDaysStr, isEmiDuePaid } from "@/domain/index.js";

export function emiDueBucket(emi, today) {
  const dates = (emi.dueDates || []).filter(Boolean).filter((d) => !isEmiDuePaid(emi, d));
  if (dates.length === 0) return "later";
  if (dates.some((d) => d < today)) return "overdue";
  const weekEnd = addDaysStr(today, 7);
  if (dates.some((d) => d >= today && d <= weekEnd)) return "soon";
  return "later";
}

export function emiSortKey(emi) {
  const ds = (emi.dueDates || []).filter(Boolean).filter((d) => !isEmiDuePaid(emi, d)).sort();
  return ds[0] || "9999-12-31";
}
