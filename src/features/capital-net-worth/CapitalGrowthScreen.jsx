import { useMemo, useState } from "react";
import {
  buildMonthlyCapitalSeries,
  currentMonthStr,
  formatMonthLabelCompact,
  moneyCgTableCell,
  moneyFull,
} from "@/domain/index.js";
import { IcChart } from "@/shared/ui/icons/AppIcons.jsx";
import { TabPageChrome } from "@/shared/ui/layout/AppChrome.jsx";
import { CapitalCumulativeSvg } from "./CapitalCumulativeSvg.jsx";
import { CapitalNetBarsSvg } from "./CapitalNetBarsSvg.jsx";

export function CapitalGrowthScreen({ sales = [], expenses = [], otherIncomes = [], fsm, fyYear, fyStr, onOpenSidebar }) {
  const [mode, setMode] = useState("fy");
  const [reportMonth, setReportMonth] = useState(() => currentMonthStr());
  const series = useMemo(
    () => buildMonthlyCapitalSeries(sales, expenses, otherIncomes, mode, fsm, fyYear, reportMonth),
    [sales, expenses, otherIncomes, mode, fsm, fyYear, reportMonth],
  );
  const lastCum = series.length ? series[series.length - 1].cumulative : 0;
  const totalNet = series.reduce((s, r) => s + r.netProfit, 0);

  return (
    <TabPageChrome title="Growth" onOpenSidebar={onOpenSidebar} className="tab-page--split-scroll tab-page--growth">
      <div className="cg-period-bar">
        <div className="cg-toggle-row cg-toggle-row-3">
          <button type="button" className={`cg-toggle${mode === "fy" ? " active" : ""}`} onClick={() => setMode("fy")}>
            FY {fyStr}
          </button>
          <button type="button" className={`cg-toggle${mode === "all" ? " active" : ""}`} onClick={() => setMode("all")}>
            All time
          </button>
          <button type="button" className={`cg-toggle${mode === "month" ? " active" : ""}`} onClick={() => setMode("month")}>
            Monthly
          </button>
        </div>
        {mode === "month" && (
          <div className="cg-month-row">
            <span className="cg-month-lbl">Month</span>
            <input type="month" className="month-input" value={reportMonth} onChange={(e) => setReportMonth(e.target.value)} aria-label="Report month" />
          </div>
        )}
      </div>

      <div className="cg-kpi-band">
        <div className="cg-kpi">
          <span className="cg-kpi-lbl">
            <span className="cg-kpi-lbl-long">Period net profit</span>
            <span className="cg-kpi-lbl-short">Net profit</span>
          </span>
          <strong className={totalNet >= 0 ? "cg-pos" : "cg-neg"}>{moneyFull(totalNet)}</strong>
        </div>
        <div className="cg-kpi">
          <span className="cg-kpi-lbl">
            <span className="cg-kpi-lbl-long">Cumulative surplus (running)</span>
            <span className="cg-kpi-lbl-short">Cumulative</span>
          </span>
          <strong className={lastCum >= 0 ? "cg-pos" : "cg-neg"}>{moneyFull(lastCum)}</strong>
        </div>
      </div>

      <div className="tab-page-scroll cg-page cg-page--full">
        {series.length === 0 ? (
          <div className="cg-empty">
            <div className="cg-empty-icon">
              <IcChart />
            </div>
            <p>No data for this range yet.</p>
          </div>
        ) : (
          <>
            <div className="cg-section">
              <div className="cg-section-hd">
                <span className="cg-section-title">Monthly net profit</span>
              </div>
              <div className="cg-chart-wrap">
                <CapitalNetBarsSvg series={series} />
              </div>
            </div>
            <div className="cg-section">
              <div className="cg-section-hd">
                <span className="cg-section-title">Cumulative surplus (trend)</span>
              </div>
              <div className="cg-chart-wrap">
                <CapitalCumulativeSvg series={series} />
              </div>
            </div>
            <div className="cg-section">
              <div className="cg-section-hd">
                <span className="cg-section-title">Month by month</span>
              </div>
              <div className="cg-month-cards" role="list" aria-label="Monthly breakdown">
                {series.map((r) => (
                  <article key={`card-${r.month}`} className="cg-month-card" role="listitem">
                    <header className="cg-month-card-hd">
                      <span className="cg-month-card-mo">{r.monthLabel}</span>
                      <span
                        className={`cg-month-card-net${
                          Math.abs(r.netProfit) < 0.005 ? "" : r.netProfit >= 0 ? " cg-pos" : " cg-neg"
                        }`}
                      >
                        {moneyFull(r.netProfit)}
                      </span>
                    </header>
                    <dl className="cg-month-card-grid">
                      <div>
                        <dt>Revenue</dt>
                        <dd>{moneyCgTableCell(r.revenue)}</dd>
                      </div>
                      <div>
                        <dt>COGS</dt>
                        <dd>{moneyCgTableCell(r.cogs)}</dd>
                      </div>
                      <div>
                        <dt>Op. expenses</dt>
                        <dd>{moneyCgTableCell(r.expenses)}</dd>
                      </div>
                      <div>
                        <dt>Other income</dt>
                        <dd>{moneyCgTableCell(r.otherIncome)}</dd>
                      </div>
                    </dl>
                    <footer className="cg-month-card-foot">
                      <span className="cg-month-card-foot-lbl">Cumulative</span>
                      <span
                        className={`cg-month-card-foot-val${
                          Math.abs(r.cumulative) < 0.005 ? "" : r.cumulative >= 0 ? " cg-pos" : " cg-neg"
                        }`}
                      >
                        {moneyFull(r.cumulative)}
                      </span>
                    </footer>
                  </article>
                ))}
              </div>
              <div className="cg-table-wrap cg-table-wrap--compact cg-table-wrap--desktop">
                <table className="cg-table cg-table--compact">
                  <thead>
                    <tr>
                      <th scope="col">
                        <span className="cg-th-long">Month</span>
                        <span className="cg-th-short">Mo</span>
                      </th>
                      <th scope="col" className="cg-num">
                        <span className="cg-th-long">Revenue</span>
                        <span className="cg-th-short">Rev</span>
                      </th>
                      <th scope="col" className="cg-num">
                        <span className="cg-th-long">COGS</span>
                        <span className="cg-th-short">COGS</span>
                      </th>
                      <th scope="col" className="cg-num">
                        <span className="cg-th-long">Op. expenses</span>
                        <span className="cg-th-short">OpEx</span>
                      </th>
                      <th scope="col" className="cg-num">
                        <span className="cg-th-long">Other income</span>
                        <span className="cg-th-short">OI</span>
                      </th>
                      <th scope="col" className="cg-num">
                        <span className="cg-th-long">Net profit</span>
                        <span className="cg-th-short">Net</span>
                      </th>
                      <th scope="col" className="cg-num">
                        <span className="cg-th-long">Cumulative</span>
                        <span className="cg-th-short">Cum</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {series.map((r) => (
                      <tr key={r.month}>
                        <td>
                          <span className="cg-mo-long">{r.monthLabel}</span>
                          <span className="cg-mo-short">{formatMonthLabelCompact(r.month)}</span>
                        </td>
                        <td className="cg-num">{moneyCgTableCell(r.revenue)}</td>
                        <td className="cg-num">{moneyCgTableCell(r.cogs)}</td>
                        <td className="cg-num">{moneyCgTableCell(r.expenses)}</td>
                        <td className="cg-num">{moneyCgTableCell(r.otherIncome)}</td>
                        <td
                          className={`cg-num${
                            Math.abs(r.netProfit) < 0.005 ? "" : r.netProfit >= 0 ? " cg-pos" : " cg-neg"
                          }`}
                        >
                          {moneyCgTableCell(r.netProfit)}
                        </td>
                        <td
                          className={`cg-num${
                            Math.abs(r.cumulative) < 0.005 ? "" : r.cumulative >= 0 ? " cg-pos" : " cg-neg"
                          }`}
                        >
                          {moneyCgTableCell(r.cumulative)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </TabPageChrome>
  );
}
