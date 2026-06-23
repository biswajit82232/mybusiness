import { moneyFull, num } from "@/domain/index.js";

/** Horizontal bars: invested vs book net worth (same scale). */
export function NetWorthCompareBars({ invested, netWorth }) {
  const inv = Math.max(0, num(invested));
  const nw = num(netWorth);
  const maxV = Math.max(inv, Math.abs(nw), 1);
  const invPct = Math.min(100, (inv / maxV) * 100);
  const nwPct = Math.min(100, (Math.abs(nw) / maxV) * 100);
  const nwNeg = nw < 0;
  return (
    <div className="nw-compare-bars" role="img" aria-label="Invested amount versus book net worth">
      <div className="nw-compare-bar-row">
        <span className="nw-compare-lbl">You invested</span>
        <div className="nw-compare-track">
          <div className="nw-compare-fill nw-compare-fill--inv" style={{ width: `${invPct}%` }} />
        </div>
        <span className="nw-compare-amt">{moneyFull(inv)}</span>
      </div>
      <div className="nw-compare-bar-row">
        <span className="nw-compare-lbl">Book net worth</span>
        <div className="nw-compare-track">
          <div
            className={`nw-compare-fill${nwNeg ? " nw-compare-fill--neg" : " nw-compare-fill--nw"}`}
            style={{ width: `${nwPct}%` }}
          />
        </div>
        <span className={`nw-compare-amt${nwNeg ? " cg-neg" : nw >= 0 ? " cg-pos" : ""}`}>{moneyFull(nw)}</span>
      </div>
    </div>
  );
}
