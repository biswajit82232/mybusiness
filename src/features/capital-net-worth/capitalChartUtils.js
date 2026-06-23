export function cgShortMonth(monthLabel) {
  const i = monthLabel.indexOf(" ");
  return i > 0 ? monthLabel.slice(0, i) : monthLabel;
}

/** Logical chart width (viewBox units). Scales with CSS to 100% container — no max cap so wide layouts use full width. */
export function capitalChartWidth(n, { pl, pr, minPerSlot = 32 } = {}) {
  const nn = Math.max(n, 1);
  return Math.max(280, pl + pr + nn * minPerSlot);
}
