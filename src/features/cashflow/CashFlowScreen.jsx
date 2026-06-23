import { useMemo, useState } from "react";
import {
  aggregateCashflowDaysInMonth,
  fyMonthSequence,
  monthKeyFromRecord,
  num,
  sumExpenseCashOutInMonth,
  sumExpenseCashOutOnDay,
  sumSalePaymentsInMonth,
  sumSalePaymentsOnDay,
  sumStockInCashOutInMonth,
  sumStockInCashOutOnDay,
  sumPurchasePaymentsInMonth,
  sumPurchasePaymentsOnDay,
  sumLoanDisbursementCashOutInMonth,
  sumLoanRepaymentCashInInMonth,
  sumLoanDisbursementCashOutOnDay,
  sumLoanRepaymentCashInOnDay,
  formatMonthLabel,
  currentMonthStr,
  todayStr,
  dateHuman,
  money,
} from "@/domain/index.js";
import { IcCashFlow } from "@/shared/ui/icons/AppIcons.jsx";
import { TabPageChrome, EmptyState } from "@/shared/ui/layout/AppChrome.jsx";
import { MonthFilterCompact } from "@/shared/ui/shell/MonthFilterCompact.jsx";
import { CashFlowDayPicker } from "./CashFlowDayPicker.jsx";

export function CashFlowScreen({
  sales,
  expenses,
  inventoryEntries = [],
  otherIncomes = [],
  purchases = [],
  loansGiven = [],
  fsm,
  fyYear,
  fyStr,
  onOpenSidebar,
}) {
  const [cfGranularity, setCfGranularity] = useState("fy");
  const [cfMonthKey, setCfMonthKey] = useState(() => currentMonthStr());
  const [cfDay, setCfDay] = useState(() => todayStr());

  const { rows, periodLabel, colLabel } = useMemo(() => {
    const oi = otherIncomes || [];
    if (cfGranularity === "fy") {
      const months = fyMonthSequence(fsm, fyYear);
      const cashInForMonth = (m) => {
        const fromSales = sumSalePaymentsInMonth(sales, m);
        const fromOi = oi
          .filter((x) => monthKeyFromRecord(x.date) === m && String(x.bankAccountId || "").trim())
          .reduce((s, x) => s + num(x.amount), 0);
        return fromSales + fromOi + sumLoanRepaymentCashInInMonth(loansGiven, m);
      };
      const maxIn = Math.max(1, ...months.map((m) => cashInForMonth(m)));
      const list = months
        .map((m) => {
          const cashIn = cashInForMonth(m);
          const cashOutExp = sumExpenseCashOutInMonth(expenses, m);
          const cashOutStock = sumStockInCashOutInMonth(inventoryEntries || [], m);
          const cashOutPurch = sumPurchasePaymentsInMonth(purchases || [], m);
          const cashOutLoan = sumLoanDisbursementCashOutInMonth(loansGiven, m);
          const cashOut = cashOutExp + cashOutStock + cashOutPurch + cashOutLoan;
          const net = cashIn - cashOut;
          return {
            key: m,
            label: formatMonthLabel(m),
            cashIn,
            cashOut,
            net,
            inPct: maxIn ? cashIn / maxIn : 0,
          };
        })
        .filter((r) => r.cashIn > 0 || r.cashOut > 0);
      return {
        rows: list,
        periodLabel: `FY ${fyStr}`,
        colLabel: "Month",
      };
    }

    if (cfGranularity === "month") {
      const mk = cfMonthKey && String(cfMonthKey).length >= 7 ? String(cfMonthKey).slice(0, 7) : currentMonthStr();
      const pairs = aggregateCashflowDaysInMonth(sales, expenses, inventoryEntries, oi, mk, purchases || [], loansGiven);
      const maxIn = Math.max(1, ...pairs.map(([, o]) => o.cashIn));
      const list = pairs.map(([day, o]) => ({
        key: day,
        label: dateHuman(day),
        cashIn: o.cashIn,
        cashOut: o.cashOut,
        net: o.cashIn - o.cashOut,
        inPct: maxIn ? o.cashIn / maxIn : 0,
      }));
      return {
        rows: list,
        periodLabel: formatMonthLabel(mk),
        colLabel: "Day",
      };
    }

    const d = cfDay && String(cfDay).length >= 10 ? String(cfDay).slice(0, 10) : todayStr();
    const cashInSales = sumSalePaymentsOnDay(sales, d);
    const cashInOi = oi
      .filter((x) => String(x.date || "").slice(0, 10) === d && String(x.bankAccountId || "").trim())
      .reduce((s, x) => s + num(x.amount), 0);
    const cashIn = cashInSales + cashInOi + sumLoanRepaymentCashInOnDay(loansGiven, d);
    const cashOutExp = sumExpenseCashOutOnDay(expenses, d);
    const cashOutStock = sumStockInCashOutOnDay(inventoryEntries || [], d);
    const cashOutPurch = sumPurchasePaymentsOnDay(purchases || [], d);
    const cashOut = cashOutExp + cashOutStock + cashOutPurch + sumLoanDisbursementCashOutOnDay(loansGiven, d);
    const net = cashIn - cashOut;
    const maxIn = Math.max(1, cashIn);
    return {
      rows: [
        {
          key: d,
          label: dateHuman(d),
          cashIn,
          cashOut,
          net,
          inPct: maxIn ? cashIn / maxIn : 0,
        },
      ],
      periodLabel: dateHuman(d),
      colLabel: "Day",
    };
  }, [cfGranularity, cfMonthKey, cfDay, sales, expenses, inventoryEntries, otherIncomes, purchases, loansGiven, fsm, fyYear, fyStr]);

  const totalIn = useMemo(() => rows.reduce((s, r) => s + r.cashIn, 0), [rows]);
  const totalOut = useMemo(() => rows.reduce((s, r) => s + r.cashOut, 0), [rows]);

  const showEmpty = cfGranularity === "day" ? totalIn === 0 && totalOut === 0 : rows.length === 0;

  return (
    <TabPageChrome title="Cash flow" onOpenSidebar={onOpenSidebar} right={<span className="page-hdr-meta">{periodLabel}</span>}>
      <div className="cashflow-period-controls">
        <div className="sort-bar sort-bar--compact" role="group" aria-label="Cash flow period">
          <span className="sort-bar-lbl">Period</span>
          <button
            type="button"
            className={`sort-chip${cfGranularity === "fy" ? " active" : ""}`}
            onClick={() => setCfGranularity("fy")}
          >
            FY
          </button>
          <button
            type="button"
            className={`sort-chip${cfGranularity === "month" ? " active" : ""}`}
            onClick={() => setCfGranularity("month")}
          >
            Month
          </button>
          <button
            type="button"
            className={`sort-chip${cfGranularity === "day" ? " active" : ""}`}
            onClick={() => setCfGranularity("day")}
          >
            Day
          </button>
        </div>
        {cfGranularity === "month" && (
          <div className="period-bar period-bar-compact">
            <MonthFilterCompact
              value={cfMonthKey}
              onChange={(v) => setCfMonthKey(v && String(v).length >= 7 ? v : currentMonthStr())}
              instanceId="cashflow-month"
            />
          </div>
        )}
        {cfGranularity === "day" && (
          <div className="period-bar period-bar-compact">
            <CashFlowDayPicker value={cfDay} onChange={(v) => setCfDay(v && String(v).length >= 10 ? v.slice(0, 10) : todayStr())} />
          </div>
        )}
      </div>
      <div className="overlay-kpi-strip">
        <div className="recv-kpi">
          <div className="recv-kpi-lbl">Total In</div>
          <div className="recv-kpi-val cashflow-kpi-in">{money(totalIn)}</div>
        </div>
        <div className="recv-kpi">
          <div className="recv-kpi-lbl">Total Out</div>
          <div className="recv-kpi-val cashflow-kpi-out">{money(totalOut)}</div>
        </div>
        <div className="recv-kpi">
          <div className="recv-kpi-lbl">Net Flow</div>
          <div className={`recv-kpi-val ${totalIn - totalOut >= 0 ? "primary" : "danger"}`}>{money(totalIn - totalOut)}</div>
        </div>
      </div>
      <div className="list-area">
        {showEmpty ? (
          <EmptyState
            icon={<IcCashFlow />}
            title={cfGranularity === "day" ? "No cash movement this day" : "No cash movement in this period"}
          />
        ) : (
          <>
            <div className="cashflow-list-hd">
              <span className="cashflow-list-hd-period">{colLabel}</span>
              <span className="cashflow-list-hd-in">In</span>
              <span className="cashflow-list-hd-out">Out</span>
              <span className="cashflow-list-hd-net">Net</span>
            </div>
            {rows.map((r) => (
              <div key={r.key} className="cashflow-row">
                <div className="cashflow-row-line">
                  <span className="cashflow-month">{r.label}</span>
                  <span className="cashflow-in">{money(r.cashIn)}</span>
                  <span className="cashflow-out">{money(r.cashOut)}</span>
                  <span className={`cashflow-net ${r.net >= 0 ? "cashflow-net-pos" : "cashflow-net-neg"}`}>{money(r.net)}</span>
                </div>
                <div className="cashflow-bar-row">
                  <div className="cashflow-bar-wrap">
                    <div className="cashflow-bar-in" style={{ width: `${Math.min(100, r.inPct * 100)}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </TabPageChrome>
  );
}
