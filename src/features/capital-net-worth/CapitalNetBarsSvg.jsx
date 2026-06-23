import { money, moneyFull } from "@/domain/index.js";
import { capitalChartWidth, cgShortMonth } from "./capitalChartUtils.js";

export function CapitalNetBarsSvg({ series = [] }) {
  const n = series.length;
  const pl = 46;
  const pr = 12;
  const tiltX = n > 7;
  const pb = tiltX ? 52 : 42;
  const pt = 18;
  const plotCore = 200;
  const H = pt + plotCore + pb;
  const W = capitalChartWidth(n, { pl, pr, minPerSlot: tiltX ? 30 : 36 });
  const plotW = W - pl - pr;
  const plotH = H - pt - pb;
  const maxAbs = Math.max(1, ...series.map((s) => Math.abs(s.netProfit)));
  const midY = pt + plotH / 2;
  const half = Math.max(plotH / 2 - 14, 24);
  const bw = n ? Math.min(26, (plotW / Math.max(n, 1)) * 0.52) : 0;
  const xAt = (i) => (n <= 1 ? pl + plotW / 2 : pl + (i / Math.max(n - 1, 1)) * plotW);
  const plotBottom = pt + plotH;
  const labelY = H - (tiltX ? 10 : 16);

  return (
    <svg
      className="cg-svg cg-svg-bars"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="Monthly net profit bar chart"
    >
      <line x1={pl} y1={midY} x2={W - pr} y2={midY} className="cg-axis-zero" />
      <text x={6} y={pt + 8} className="cg-y-lbl cg-y-lbl-cap">
        +{money(maxAbs)}
      </text>
      <text x={6} y={plotBottom + 12} className="cg-y-lbl cg-y-lbl-cap">
        −{money(maxAbs)}
      </text>
      {series.map((s, i) => {
        const cx = xAt(i);
        const x = cx - bw / 2;
        const h = s.netProfit === 0 ? 0 : (Math.abs(s.netProfit) / maxAbs) * half;
        const y = s.netProfit >= 0 ? midY - h : midY;
        const hh = Math.max(h, s.netProfit === 0 ? 0 : 1.5);
        return (
          <rect
            key={s.month}
            x={x}
            y={y}
            width={bw}
            height={hh}
            className={s.netProfit > 0 ? "cg-bar-pos" : s.netProfit < 0 ? "cg-bar-neg" : "cg-bar-zero"}
            rx={3}
          >
            <title>{`${s.monthLabel}: net ${moneyFull(s.netProfit)}`}</title>
          </rect>
        );
      })}
      {series.map((s, i) => {
        const x = xAt(i);
        const lbl = cgShortMonth(s.monthLabel);
        if (tiltX) {
          return (
            <text
              key={`${s.month}-x`}
              x={x}
              y={labelY}
              textAnchor="end"
              className="cg-x-lbl"
              transform={`rotate(-48 ${x} ${labelY})`}
            >
              {lbl}
            </text>
          );
        }
        return (
          <text key={`${s.month}-x`} x={x} y={labelY} textAnchor="middle" className="cg-x-lbl">
            {lbl}
          </text>
        );
      })}
    </svg>
  );
}
