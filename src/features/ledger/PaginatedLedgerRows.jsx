import { useState } from "react";
import { LIST_PAGE_SIZE, dateHuman, money } from "@/domain/index.js";

/**
 * Flat, chronological timeline of ledger entries (no section grouping).
 *
 * @param {object} props
 * @param {Array<object>} props.timelineRows Entries already sorted newest-first.
 */
export function PaginatedLedgerRows({
  timelineRows,
  onOpenSale,
  onOpenOtherIncome,
  onOpenExpense,
  onOpenInventoryEntry,
  onOpenPurchase,
  onOpenLoanGiven,
  emptyState,
}) {
  const [listCap, setListCap] = useState(LIST_PAGE_SIZE);
  const rows = Array.isArray(timelineRows) ? timelineRows : [];
  const visible = rows.slice(0, listCap);
  const remaining = rows.length - visible.length;
  if (rows.length === 0) return emptyState;
  return (
    <div className="ledger-timeline" role="presentation">
      {visible.map((entry) => {
        const onActivate =
          entry.saleId && onOpenSale
            ? () => onOpenSale(entry.saleId)
            : entry.expenseId && onOpenExpense
              ? () => onOpenExpense(entry.expenseId)
              : entry.otherIncomeId && onOpenOtherIncome
                ? () => onOpenOtherIncome(entry.otherIncomeId)
                : entry.inventoryId && onOpenInventoryEntry
                  ? () => onOpenInventoryEntry(entry.inventoryId)
                  : entry.purchaseId && onOpenPurchase
                    ? () => onOpenPurchase(entry.purchaseId)
                    : entry.loanGivenId && onOpenLoanGiven
                      ? () => onOpenLoanGiven(entry.loanGivenId)
                      : undefined;
        return (
          <div
            key={entry.id}
            className={`ledger-row${onActivate ? " ledger-row-clickable" : ""}`}
            onClick={onActivate}
            role={onActivate ? "button" : undefined}
            tabIndex={onActivate ? 0 : undefined}
            onKeyDown={
              onActivate
                ? (ev) => {
                    if (ev.key === "Enter" || ev.key === " ") {
                      ev.preventDefault();
                      onActivate();
                    }
                  }
                : undefined
            }
          >
            <div
              className={`ledger-dot ${entry.type === "in" ? "ledger-dot-in" : entry.type === "out" ? "ledger-dot-out" : "ledger-dot-partial"}`}
              aria-hidden="true"
            />
            <div className="ledger-info">
              <div className="ledger-title-row">
                <span className="ledger-title">{entry.title}</span>
                {entry.journalKindLabel ? (
                  <span className={`ledger-kind-chip ledger-kind-chip--${entry.type}`}>
                    {entry.journalKindLabel}
                  </span>
                ) : null}
              </div>
              <div className="ledger-sub">{entry.sub}</div>
            </div>
            <div className="ledger-amount">
              <div className={`ledger-amt-val ${entry.type === "in" ? "ledger-amt-in" : entry.type === "out" ? "ledger-amt-out" : ""}`}>
                {entry.type === "in" ? "+" : entry.type === "out" ? "-" : ""}
                {money(entry.amount)}
              </div>
              <div className="ledger-date">{dateHuman(entry.date)}</div>
            </div>
          </div>
        );
      })}
      {remaining > 0 && (
        <div className="list-load-more-wrap ledger-load-more">
          <button type="button" className="list-load-more-btn" onClick={() => setListCap((c) => c + LIST_PAGE_SIZE)}>
            Load more ({remaining} remaining)
          </button>
        </div>
      )}
    </div>
  );
}
