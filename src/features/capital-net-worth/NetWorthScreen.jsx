import { dateHuman, moneyFull, num, todayStr } from "@/domain/index.js";
import { TabPageChrome } from "@/shared/ui/layout/AppChrome.jsx";
import { NetWorthCompareBars } from "./NetWorthCompareBars.jsx";
import { NetWorthInvestForm } from "./NetWorthInvestForm.jsx";
import { NetWorthTwinBarsSvg } from "./NetWorthTwinBarsSvg.jsx";

export function NetWorthScreen({ balSum, balance, onSaveInvested, onOpenSidebar }) {
  const b = balance || {};
  const otherA = num(b.otherAssets);
  const net = balSum.netCapital;
  const investedSaved = num(b.ownerCapitalInvested);
  const gain = net - investedSaved;
  const roiPct = investedSaved > 0 ? (gain / investedSaved) * 100 : null;
  const asOf = dateHuman(todayStr());

  let verdict = null;
  if (investedSaved > 0) {
    if (gain > 0.005) {
      verdict = { tone: "ok", text: `Ahead of what you put in by ${moneyFull(gain)} (book equity vs your number).` };
    } else if (gain < -0.005) {
      verdict = { tone: "bad", text: `Book equity is below your investment by ${moneyFull(Math.abs(gain))}.` };
    } else {
      verdict = { tone: "mid", text: "Book equity is about equal to what you entered as invested." };
    }
  }

  return (
    <TabPageChrome title="Net Worth" onOpenSidebar={onOpenSidebar} className="tab-page--split-scroll tab-page--net-worth">
      <div className="nw-live-strip">
        <span className="nw-live-dot" aria-hidden="true" />
        <span className="nw-live-text">Live from your books</span>
        <span className="nw-live-date">{asOf}</span>
      </div>

      <div className="banking-summary nw-snapshot" aria-label="Book snapshot">
        <div className="banking-sum-cell">
          <span className="banking-sum-lbl">Net worth</span>
          <span className={`banking-sum-val${net >= 0 ? "" : " banking-sum-val--neg"}`}>{moneyFull(net)}</span>
          <span className="banking-sum-meta">Owner&apos;s equity</span>
        </div>
        <div className="banking-sum-cell">
          <span className="banking-sum-lbl">Total assets</span>
          <span className="banking-sum-val">{moneyFull(balSum.totalAssets)}</span>
        </div>
        <div className="banking-sum-cell banking-sum-cell--out">
          <span className="banking-sum-lbl">Liabilities</span>
          <span className="banking-sum-val">{moneyFull(balSum.totalLiab)}</span>
        </div>
      </div>

      {investedSaved > 0 ? (
        <div className="banking-summary nw-invest-strip" aria-label="Versus your investment">
          <div className="banking-sum-cell">
            <span className="banking-sum-lbl">You invested</span>
            <span className="banking-sum-val">{moneyFull(investedSaved)}</span>
          </div>
          <div className={`banking-sum-cell${gain >= 0 ? " banking-sum-cell--in" : " banking-sum-cell--out"}`}>
            <span className="banking-sum-lbl">Ahead / behind</span>
            <span className="banking-sum-val">
              {gain >= 0 ? "+" : "−"}
              {moneyFull(Math.abs(gain))}
            </span>
          </div>
          <div className="banking-sum-cell">
            <span className="banking-sum-lbl">Return on money in</span>
            <span className={`banking-sum-val${roiPct != null && roiPct >= 0 ? " banking-sum-val--pos" : " banking-sum-val--neg"}`}>
              {roiPct != null ? `${roiPct >= 0 ? "+" : ""}${roiPct.toFixed(1)}%` : "—"}
            </span>
          </div>
        </div>
      ) : null}

      <div className="tab-page-scroll">
        <div className="banking-screen nw-screen-inner">
          <section className="fin-section" aria-labelledby="nw-detail-hd">
            <h2 id="nw-detail-hd" className="home-section-hd">
              Book detail
            </h2>
            <ul className="banking-acct-list nw-detail-list" role="list">
              <li className="nw-detail-row">
                <span className="nw-detail-k">Cash &amp; bank</span>
                <span className="nw-detail-v">{moneyFull(balSum.bankTotal)}</span>
              </li>
              <li className="nw-detail-row">
                <span className="nw-detail-k">Receivables</span>
                <span className="nw-detail-v">{moneyFull(balSum.outstanding)}</span>
              </li>
              <li className="nw-detail-row">
                <span className="nw-detail-k">Inventory (at cost)</span>
                <span className="nw-detail-v">{moneyFull(balSum.stockVal)}</span>
              </li>
              <li className="nw-detail-row">
                <span className="nw-detail-k">Other assets</span>
                <span className="nw-detail-v">{moneyFull(otherA)}</span>
              </li>
              <li className="nw-detail-row">
                <span className="nw-detail-k">Fixed assets</span>
                <span className="nw-detail-v">{moneyFull(balSum.fixedAssets)}</span>
              </li>
              <li className="nw-detail-row nw-detail-row--subtotal">
                <span className="nw-detail-k">Total assets</span>
                <span className="nw-detail-v">{moneyFull(balSum.totalAssets)}</span>
              </li>
              <li className="nw-detail-row nw-detail-row--liab">
                <span className="nw-detail-k">Total liabilities</span>
                <span className="nw-detail-v cg-neg">{moneyFull(balSum.totalLiab)}</span>
              </li>
              <li className="nw-detail-row nw-detail-row--grand">
                <span className="nw-detail-k">Net worth (equity)</span>
                <span className={`nw-detail-v${net >= 0 ? " cg-pos" : " cg-neg"}`}>{moneyFull(net)}</span>
              </li>
            </ul>
          </section>

          {investedSaved > 0 ? (
            <section className="fin-section nw-section--chart" aria-labelledby="nw-chart-hd">
              <h2 id="nw-chart-hd" className="home-section-hd">
                Invested vs book equity
              </h2>
              {verdict ? <p className={`nw-verdict nw-verdict--${verdict.tone}`}>{verdict.text}</p> : null}
              <div className="form-card nw-chart-card">
                <span className="form-card-title">Chart</span>
                <div className="nw-twin-wrap">
                  <NetWorthTwinBarsSvg invested={investedSaved} netWorth={net} />
                </div>
                <span className="form-card-title nw-chart-subhd">Same scale (horizontal)</span>
                <NetWorthCompareBars invested={investedSaved} netWorth={net} />
              </div>
            </section>
          ) : null}

          <section className="fin-section nw-section--invest-form" aria-labelledby="nw-cap-hd">
            <h2 id="nw-cap-hd" className="home-section-hd">
              Your capital invested
            </h2>
            <NetWorthInvestForm key={String(investedSaved)} investedSaved={investedSaved} onSaveInvested={onSaveInvested} />
          </section>
        </div>
      </div>
    </TabPageChrome>
  );
}
