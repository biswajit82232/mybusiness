import { useMemo, useState } from "react";
import {
  bankAccountLabel,
  currentMonthStr,
  dateHuman,
  entityTimeMsFromId,
  filterSalesExpensesInvByPeriod,
  formatMonthLabel,
  isDateInFy,
  money,
  normalizePaymentEntries,
  normalizePurchasePaymentEntries,
  num,
  stockInCashAmount,
  todayStr,
} from "@/domain/index.js";
import { CashFlowDayPicker } from "@/features/cashflow/index.js";
import { IcLedger } from "@/shared/ui/icons/AppIcons.jsx";
import { EmptyState, TabPageChrome } from "@/shared/ui/layout/AppChrome.jsx";
import { MonthFilterCompact } from "@/shared/ui/shell/MonthFilterCompact.jsx";
import { PaginatedLedgerRows } from "./PaginatedLedgerRows.jsx";

/** System source type for each journal line (UI + CSV). */
const JOURNAL_KIND = {
  sale: "sale",
  saleReceivable: "saleReceivable",
  expense: "expense",
  inventory: "inventory",
  purchase: "purchase",
  otherIncome: "otherIncome",
  loanGivenOut: "loanGivenOut",
  loanGivenIn: "loanGivenIn",
};

const JOURNAL_KIND_LABEL = {
  [JOURNAL_KIND.sale]: "Sales",
  [JOURNAL_KIND.saleReceivable]: "Sales (receivable)",
  [JOURNAL_KIND.expense]: "Expense",
  [JOURNAL_KIND.inventory]: "Inventory",
  [JOURNAL_KIND.purchase]: "Purchase",
  [JOURNAL_KIND.otherIncome]: "Other income",
  [JOURNAL_KIND.loanGivenOut]: "Loan given (cash)",
  [JOURNAL_KIND.loanGivenIn]: "Loan repayment",
};

/**
 * Single chronological order: most recent first, with a stable tiebreaker on
 * `sortMs` (entity creation time) so two events on the same calendar day keep
 * a deterministic order across reloads.
 */
function compareLedgerEntryDesc(a, b) {
  const dc = String(b.date || "").localeCompare(String(a.date || ""));
  if (dc !== 0) return dc;
  return (b.sortMs || 0) - (a.sortMs || 0);
}

export function LedgerScreen({
  sales,
  expenses,
  inventoryEntries = [],
  otherIncomes = [],
  purchases = [],
  loansGiven = [],
  bankAccounts = [],
  fsm,
  fyYear,
  fyStr,
  onOpenSale,
  onOpenOtherIncome,
  onOpenExpense,
  onOpenInventoryEntry,
  onOpenPurchase,
  onOpenSidebar,
}) {
  const [filter, setFilter] = useState("all");
  const [lgGranularity, setLgGranularity] = useState("fy");
  const [lgMonthKey, setLgMonthKey] = useState(() => currentMonthStr());
  const [lgDay, setLgDay] = useState(() => todayStr());

  const periodLabel = useMemo(() => {
    if (lgGranularity === "fy") return `FY ${fyStr}`;
    if (lgGranularity === "month") {
      const mk = lgMonthKey && String(lgMonthKey).length >= 7 ? String(lgMonthKey).slice(0, 7) : currentMonthStr();
      return formatMonthLabel(mk);
    }
    const d = lgDay && String(lgDay).length >= 10 ? String(lgDay).slice(0, 10) : todayStr();
    return dateHuman(d);
  }, [lgGranularity, lgMonthKey, lgDay, fyStr]);

  const { sales: sF, expenses: eF, inventoryEntries: iF, otherIncomes: oiF } = useMemo(
    () =>
      filterSalesExpensesInvByPeriod(sales, expenses, inventoryEntries, otherIncomes, lgGranularity, fsm, fyYear, lgMonthKey, lgDay),
    [sales, expenses, inventoryEntries, otherIncomes, lgGranularity, fsm, fyYear, lgMonthKey, lgDay],
  );

  /** Supplier payment lines in scope (by payment date, same as banking). */
  const purchasePayLines = useMemo(() => {
    const rows = [];
    const arr = Array.isArray(purchases) ? purchases : [];
    const mk = lgMonthKey && String(lgMonthKey).length >= 7 ? String(lgMonthKey).slice(0, 7) : currentMonthStr();
    const dayStr = lgDay && String(lgDay).length >= 10 ? String(lgDay).slice(0, 10) : todayStr();
    for (const pur of arr) {
      if (!pur || typeof pur !== "object") continue;
      for (const pe of normalizePurchasePaymentEntries(pur)) {
        const d = String(pe.date || "").slice(0, 10);
        if (d.length < 10) continue;
        if (lgGranularity === "fy") {
          if (!isDateInFy(d, fsm, fyYear)) continue;
        } else if (lgGranularity === "month") {
          if (!d.startsWith(mk)) continue;
        } else if (d !== dayStr) continue;
        rows.push({ pur, pe });
      }
    }
    return rows;
  }, [purchases, lgGranularity, fsm, fyYear, lgMonthKey, lgDay]);

  /** Customer receipt lines in scope (by payment date, same as banking/cashflow). */
  const salePayLines = useMemo(() => {
    const rows = [];
    const arr = Array.isArray(sales) ? sales : [];
    const mk = lgMonthKey && String(lgMonthKey).length >= 7 ? String(lgMonthKey).slice(0, 7) : currentMonthStr();
    const dayStr = lgDay && String(lgDay).length >= 10 ? String(lgDay).slice(0, 10) : todayStr();
    for (const sale of arr) {
      if (!sale || typeof sale !== "object") continue;
      const pes = normalizePaymentEntries(sale);
      if (pes.length > 0) {
        for (const pe of pes) {
          const d = String(pe.date || "").slice(0, 10);
          if (d.length < 10) continue;
          if (lgGranularity === "fy") {
            if (!isDateInFy(d, fsm, fyYear)) continue;
          } else if (lgGranularity === "month") {
            if (!d.startsWith(mk)) continue;
          } else if (d !== dayStr) continue;
          rows.push({ sale, pe, date: d, amount: num(pe.amount) });
        }
        continue;
      }
      // Legacy fallback: one receive line on invoice date.
      const amt = num(sale.received);
      if (amt <= 0) continue;
      const d = String(sale.date || "").slice(0, 10);
      if (lgGranularity === "fy") {
        if (!isDateInFy(d, fsm, fyYear)) continue;
      } else if (lgGranularity === "month") {
        if (!d.startsWith(mk)) continue;
      } else if (d !== dayStr) continue;
      rows.push({ sale, pe: null, date: d, amount: amt });
    }
    return rows;
  }, [sales, lgGranularity, fsm, fyYear, lgMonthKey, lgDay]);

  const entries = useMemo(() => {
    const list = [];
    const mk = lgMonthKey && String(lgMonthKey).length >= 7 ? String(lgMonthKey).slice(0, 7) : currentMonthStr();
    const dayStr = lgDay && String(lgDay).length >= 10 ? String(lgDay).slice(0, 10) : todayStr();
    const dateInScope = (dRaw) => {
      const d = String(dRaw || "").slice(0, 10);
      if (d.length < 10) return false;
      if (lgGranularity === "fy") return isDateInFy(d, fsm, fyYear);
      if (lgGranularity === "month") return d.startsWith(mk);
      return d === dayStr;
    };
    for (const lg of loansGiven || []) {
      if (!lg || typeof lg !== "object") continue;
      const borrower = (lg.borrowerName || "").trim() || "Borrower";
      const dbid = String(lg.disbursementBankAccountId || "").trim();
      if (dbid) {
        const ddate = String(lg.disbursementDate || lg.dateGiven || "").slice(0, 10);
        if (dateInScope(ddate)) {
          const damt = num(lg.disbursementAmount) > 0 ? num(lg.disbursementAmount) : num(lg.principal);
          if (damt > 0) {
            list.push({
              id: `lg-out-${lg.id}`,
              loanGivenId: lg.id,
              date: ddate,
              type: "out",
              journalKind: JOURNAL_KIND.loanGivenOut,
              journalKindLabel: JOURNAL_KIND_LABEL[JOURNAL_KIND.loanGivenOut],
              title: `Loan to ${borrower}`,
              sub: "Loan given · Cash out",
              amount: damt,
              sortMs: entityTimeMsFromId(lg.id),
            });
          }
        }
      }
      for (const rep of lg.repaymentEntries || []) {
        if (!rep) continue;
        const rdate = String(rep.date || "").slice(0, 10);
        if (!dateInScope(rdate)) continue;
        const ramt = num(rep.amount);
        if (ramt <= 0 || !String(rep.bankAccountId || "").trim()) continue;
        list.push({
          id: `lg-in-${lg.id}-${rep.id}`,
          loanGivenId: lg.id,
          repaymentEntryId: rep.id,
          date: rdate,
          type: "in",
          journalKind: JOURNAL_KIND.loanGivenIn,
          journalKindLabel: JOURNAL_KIND_LABEL[JOURNAL_KIND.loanGivenIn],
          title: `Repayment · ${borrower}`,
          sub: "Loan repayment · Received",
          amount: ramt,
          sortMs: entityTimeMsFromId(rep.id),
        });
      }
    }
    for (const r of salePayLines) {
      const x = r.sale;
      if (!x) continue;
      const sortMs = Math.max(entityTimeMsFromId(x.id), entityTimeMsFromId(r.pe?.id));
      list.push({
        id: r.pe ? `s-recv-${x.id}-${r.pe.id}` : `s-recv-legacy-${x.id}`,
        date: r.date,
        type: "in",
        journalKind: JOURNAL_KIND.sale,
        journalKindLabel: JOURNAL_KIND_LABEL[JOURNAL_KIND.sale],
        title: x.customerName,
        sub: `${x.invoiceNo} · Payment received`,
        amount: r.amount,
        saleId: x.id,
        sortMs,
      });
    }
    for (const x of sF) {
      if (num(x.outstanding) > 0) {
        const sortMs = entityTimeMsFromId(x.id);
        list.push({
          id: `s-due-${x.id}`,
          date: x.date,
          type: "pending",
          journalKind: JOURNAL_KIND.saleReceivable,
          journalKindLabel: JOURNAL_KIND_LABEL[JOURNAL_KIND.saleReceivable],
          title: x.customerName,
          sub: `${x.invoiceNo} · Receivable (unpaid)`,
          amount: num(x.outstanding),
          saleId: x.id,
          sortMs,
        });
      }
    }
    for (const e of eF) {
      const sub = `Expense · ${e.category}`;
      list.push({
        id: `e-${e.id}`,
        expenseId: e.id,
        date: e.date,
        type: "out",
        journalKind: JOURNAL_KIND.expense,
        journalKindLabel: JOURNAL_KIND_LABEL[JOURNAL_KIND.expense],
        title: e.description || e.category,
        sub,
        amount: num(e.amount),
        sortMs: entityTimeMsFromId(e.id),
      });
    }
    for (const inv of iF) {
      const amt = stockInCashAmount(inv);
      if (amt <= 0) continue;
      const acct = String(inv.bankAccountId || "").trim();
      const sub = acct ? `Stock purchase · ${bankAccountLabel(bankAccounts, acct)}` : "Stock purchase · Inventory";
      list.push({
        id: `inv-${inv.id}`,
        inventoryId: inv.id,
        date: inv.date,
        type: "out",
        journalKind: JOURNAL_KIND.inventory,
        journalKindLabel: JOURNAL_KIND_LABEL[JOURNAL_KIND.inventory],
        title: inv.item || "Stock",
        sub,
        amount: amt,
        saleId: null,
        sortMs: entityTimeMsFromId(inv.id),
      });
    }
    for (const { pur, pe } of purchasePayLines) {
      const amt = num(pe.amount);
      if (amt <= 0) continue;
      const ref = String(pur.invoiceRef || "").trim();
      list.push({
        id: `pur-${pur.id}-${pe.id}`,
        date: pe.date,
        type: "out",
        journalKind: JOURNAL_KIND.purchase,
        journalKindLabel: JOURNAL_KIND_LABEL[JOURNAL_KIND.purchase],
        title: (pur.supplierName || "").trim() || "Supplier",
        sub: ref ? `Supplier payment · ${ref}` : "Supplier payment · Purchase",
        amount: amt,
        purchaseId: pur.id,
        sortMs: Math.max(entityTimeMsFromId(pe.id), entityTimeMsFromId(pur.id)),
      });
    }
    for (const oi of oiF) {
      const amt = num(oi.amount);
      if (amt <= 0) continue;
      list.push({
        id: `oi-${oi.id}`,
        date: oi.date,
        type: "in",
        journalKind: JOURNAL_KIND.otherIncome,
        journalKindLabel: JOURNAL_KIND_LABEL[JOURNAL_KIND.otherIncome],
        title: (oi.description || "").trim() || oi.category || "Other income",
        sub: `Other income · ${oi.category || "Other"}`,
        amount: amt,
        otherIncomeId: oi.id,
        sortMs: entityTimeMsFromId(oi.id),
      });
    }
    return list;
  }, [sF, eF, iF, oiF, purchasePayLines, salePayLines, bankAccounts, loansGiven, lgGranularity, fsm, fyYear, lgMonthKey, lgDay]);

  const filtered =
    filter === "in" ? entries.filter((e) => e.type === "in") : filter === "out" ? entries.filter((e) => e.type === "out") : entries;

  /* Flat, chronologically-sorted timeline replaces the prior four-section grouping. */
  const timelineRows = useMemo(() => [...filtered].sort(compareLedgerEntryDesc), [filtered]);
  const timelineRowsExport = useMemo(() => [...entries].sort(compareLedgerEntryDesc), [entries]);
  const totalIn = useMemo(() => entries.filter((e) => e.type === "in").reduce((s, e) => s + e.amount, 0), [entries]);
  const totalOut = useMemo(() => entries.filter((e) => e.type === "out").reduce((s, e) => s + e.amount, 0), [entries]);

  const emptyTitle =
    lgGranularity === "day"
      ? "No ledger entries this day"
      : lgGranularity === "month"
        ? "No ledger entries this month"
        : "No transactions this financial year";

  const exportCsv = () => {
    const rows = [["date", "direction", "journal_kind", "journal_label", "title", "detail", "amount_inr"]];
    for (const e of timelineRowsExport) {
      rows.push([
        e.date,
        e.type,
        e.journalKind || "",
        e.journalKindLabel || "",
        e.title,
        e.sub,
        String(e.amount ?? ""),
      ]);
    }
    const body = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([body], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `ledger-${periodLabel.replace(/[^\w.-]+/g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <TabPageChrome
      title="Ledger"
      onOpenSidebar={onOpenSidebar}
      right={
        <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button type="button" className="text-btn" style={{ fontSize: "0.85rem" }} onClick={exportCsv}>
            Export CSV
          </button>
          <span className="page-hdr-meta">{periodLabel}</span>
        </span>
      }
    >
      <div className="cashflow-period-controls">
        <div className="sort-bar sort-bar--compact" role="group" aria-label="Ledger period">
          <span className="sort-bar-lbl">Period</span>
          <button type="button" className={`sort-chip${lgGranularity === "fy" ? " active" : ""}`} onClick={() => setLgGranularity("fy")}>
            FY
          </button>
          <button type="button" className={`sort-chip${lgGranularity === "month" ? " active" : ""}`} onClick={() => setLgGranularity("month")}>
            Month
          </button>
          <button type="button" className={`sort-chip${lgGranularity === "day" ? " active" : ""}`} onClick={() => setLgGranularity("day")}>
            Day
          </button>
        </div>
        {lgGranularity === "month" && (
          <div className="period-bar period-bar-compact">
            <MonthFilterCompact
              value={lgMonthKey}
              onChange={(v) => setLgMonthKey(v && String(v).length >= 7 ? v : currentMonthStr())}
              instanceId="ledger-month"
            />
          </div>
        )}
        {lgGranularity === "day" && (
          <div className="period-bar period-bar-compact">
            <CashFlowDayPicker
              value={lgDay}
              onChange={(v) => setLgDay(v && String(v).length >= 10 ? v.slice(0, 10) : todayStr())}
            />
          </div>
        )}
      </div>
      <div className="ledger-summary">
        <div className="ledger-sum-kpi">
          <div className="ledger-sum-lbl">Money In</div>
          <div className="ledger-sum-val ledger-sum-in">{money(totalIn)}</div>
        </div>
        <div className="ledger-sum-kpi">
          <div className="ledger-sum-lbl">Money Out</div>
          <div className="ledger-sum-val ledger-sum-out">{money(totalOut)}</div>
        </div>
        <div className="ledger-sum-kpi">
          <div className="ledger-sum-lbl">Net</div>
          <div className={`ledger-sum-val ${totalIn - totalOut >= 0 ? "ledger-sum-net-pos" : "ledger-sum-net-neg"}`}>{money(totalIn - totalOut)}</div>
        </div>
      </div>
      <p className="ledger-timeline-intro">All entries in chronological order · newest first</p>
      <div className="seg-bar">
        <button type="button" className={`seg-btn${filter === "all" ? " active" : ""}`} onClick={() => setFilter("all")}>
          All
        </button>
        <button type="button" className={`seg-btn${filter === "in" ? " active" : ""}`} onClick={() => setFilter("in")}>
          Money In
        </button>
        <button type="button" className={`seg-btn${filter === "out" ? " active" : ""}`} onClick={() => setFilter("out")}>
          Money Out
        </button>
      </div>
      <div className="list-area">
        <PaginatedLedgerRows
          key={`${filter}|${lgGranularity}|${lgMonthKey}|${lgDay}`}
          timelineRows={timelineRows}
          onOpenSale={onOpenSale}
          onOpenOtherIncome={onOpenOtherIncome}
          onOpenExpense={onOpenExpense}
          onOpenInventoryEntry={onOpenInventoryEntry}
          onOpenPurchase={onOpenPurchase}
          emptyState={<EmptyState icon={<IcLedger />} title={emptyTitle} />}
        />
      </div>
    </TabPageChrome>
  );
}
