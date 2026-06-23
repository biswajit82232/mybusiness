import { money, num } from "@/domain/index.js";

/** Vertical twin bars — same scale as horizontal compare. */
export function NetWorthTwinBarsSvg({ invested, netWorth }) {
  const inv = Math.max(0, num(invested));
  const nw = num(netWorth);
  const maxV = Math.max(inv, Math.abs(nw), 1);
  const W = 320;
  const H = 200;
  const padL = 24;
  const padR = 24;
  const padB = 40;
  const padT = 16;
  const plotH = H - padB - padT;
  const bw = 56;
  const gap = 48;
  const cx1 = W / 2 - gap / 2;
  const cx2 = W / 2 + gap / 2;
  const baseY = H - padB;
  const hInv = (inv / maxV) * plotH;
  const hNw = (Math.abs(nw) / maxV) * plotH;
  const yInv = baseY - hInv;
  const yNw = baseY - hNw;
  const nwNeg = nw < 0;
  return (
    <svg className="nw-twin-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Invested versus book net worth bars">
      <line x1={padL - 6} y1={baseY} x2={W - padR + 6} y2={baseY} className="nw-twin-axis" />
      <text x={16} y={padT + 4} className="nw-twin-scale">
        {money(maxV)}
      </text>
      <rect x={cx1 - bw / 2} y={yInv} width={bw} height={Math.max(hInv, inv > 0 ? 2 : 0)} rx={4} className="nw-twin-bar nw-twin-bar--inv" />
      <rect
        x={cx2 - bw / 2}
        y={yNw}
        width={bw}
        height={Math.max(hNw, nw !== 0 ? 2 : 0)}
        rx={4}
        className={`nw-twin-bar${nwNeg ? " nw-twin-bar--neg" : " nw-twin-bar--nw"}`}
      />
      <text x={cx1} y={H - 12} textAnchor="middle" className="nw-twin-lbl">
        Invested
      </text>
      <text x={cx2} y={H - 12} textAnchor="middle" className="nw-twin-lbl">
        Book NW
      </text>
    </svg>
  );
}
