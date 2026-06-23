export function formatLoanCount(n) {
  const c = Number(n) || 0;
  return `${c} loan${c === 1 ? "" : "s"}`;
}
