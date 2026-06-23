import { useId } from "react";
import { money, moneyFull } from "@/domain/index.js";
import { capitalChartWidth, cgShortMonth } from "./capitalChartUtils.js";

export function CapitalCumulativeSvg({ series = [] }) {
  const gradId = useId().replace(/:/g, "");
  const n = series.length;
  const pl = 50;
  const pr = 14;
  const tiltX = n > 7;
  const pb = tiltX ? 54 : 44;
  const pt = 28;
  const plotCore = 210;
  const H = pt + plotCore + pb;
  const W = capitalChartWidth(n, { pl, pr, minPerSlot: tiltX ? 30 : 36 });
  const plotW = W - pl - pr;
  const plotH = H - pt - pb;
  const vals = series.map((s) => s.cumulative);
  const maxC = Math.max(...vals, 0);
  const minC = Math.min(...vals, 0);
  const span = maxC - minC || 1;
  const py = (c) => pt + plotH - ((c - minC) / span) * plotH;
  const px = (i) => (n <= 1 ? pl + plotW / 2 : pl + (i / Math.max(n - 1, 1)) * plotW);
  const d = series.map((s, i) => `${i === 0 ? "M" : "L"} ${px(i)} ${py(s.cumulative)}`).join(" ");
  const lastX = px(Math.max(n - 1, 0));
  const baseY = pt + plotH;
  const fillPath = n >= 2 ? `${d} L ${lastX} ${baseY} L ${px(0)} ${baseY} Z` : "";
  const zeroCrosses = maxC > 0 && minC < 0;
  const zeroY = zeroCrosses ? py(0) : null;
  const midVal = minC + span / 2;
  const midY = py(midVal);
  const labelY = H - (tiltX ? 10 : 16);

  return (
    <svg
      className="cg-svg cg-svg-line"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="Cumulative capital growth chart"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2563eb" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Horizontal guides */}
      <line x1={pl} y1={pt} x2={W - pr} y2={pt} className="cg-chart-grid" />
      <line x1={pl} y1={midY} x2={W - pr} y2={midY} className="cg-chart-grid cg-chart-grid-mid" />
      <line x1={pl} y1={baseY} x2={W - pr} y2={baseY} className="cg-chart-grid" />
      {zeroCrosses && (
        <line x1={pl} y1={zeroY} x2={W - pr} y2={zeroY} className="cg-axis-zero cg-axis-zero-bold" />
      )}
      <text x={6} y={pt + 5} className="cg-y-lbl">
        {money(maxC)}
      </text>
      <text x={6} y={midY + 4} className="cg-y-lbl cg-y-lbl-mid">
        {money(midVal)}
      </text>
      <text x={6} y={baseY} className="cg-y-lbl">
        {money(minC)}
      </text>
      {n >= 2 && <path d={fillPath} fill={`url(#${gradId})`} />}
      <path d={d} fill="none" className="cg-line" strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round" />
      {series.map((s, i) => (
        <g key={s.month}>
          <title>{`${s.monthLabel}: cumulative ${moneyFull(s.cumulative)}`}</title>
          <circle cx={px(i)} cy={py(s.cumulative)} r={5} className="cg-dot" />
        </g>
      ))}
      {series.map((s, i) => {
        const x = px(i);
        const lbl = cgShortMonth(s.monthLabel);
        if (tiltX) {
          return (
            <text
              key={`${s.month}-cx`}
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
          <text key={`${s.month}-cx`} x={x} y={labelY} textAnchor="middle" className="cg-x-lbl">
            {lbl}
          </text>
        );
      })}
    </svg>
  );
}
