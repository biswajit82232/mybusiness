import { useMemo, useState } from "react";
import {
  BANK_ACCOUNT_KINDS,
  bankAccountLabel,
  buildBankAccountTransactions,
  bankTxRowsWithRunningAfter,
  bankingActivityForAccountInMonth,
  computeBankAccountBookBalance,
  num,
  money,
  dateSlash,
  currentMonthStr,
} from "@/domain/index.js";
import { IcTrash, IcX } from "@/shared/ui/icons/AppIcons.jsx";
import { Field, PageHeader, OverlayScreen } from "@/shared/ui/layout/AppChrome.jsx";
import { MenuSelect } from "@/shared/ui/inputs/MenuSelect.jsx";
import { bankKindLabel } from "./bankKindLabel.js";

export function BankAccountDetailScreen({
  account,
  allBankAccounts,
  bankTransfers,
  expenses,
  sales,
  inventoryEntries = [],
  otherIncomes = [],
  purchases = [],
  loansGiven = [],
  activityMonthKey,
  onClose,
  onPatch,
  onSave,
  onRequestRemove,
  onOpenExpense,
  onOpenOtherIncome,
  onOpenSale,
  onOpenInventoryEntry,
  onOpenPurchase,
  onOpenLoanGiven,
  onRequestDeleteActivity,
  onDeleteTransfer,
  requestConfirm,
}) {
  const [transferPeek, setTransferPeek] = useState(null);
  const [activityLimit, setActivityLimit] = useState(200);
  const txs = useMemo(
    () =>
      buildBankAccountTransactions(
        account?.id,
        expenses,
        sales,
        bankTransfers,
        inventoryEntries,
        otherIncomes,
        allBankAccounts,
        purchases,
        loansGiven,
      ),
    [account?.id, expenses, sales, bankTransfers, inventoryEntries, otherIncomes, allBankAccounts, purchases, loansGiven],
  );
  const book = useMemo(() => {
    if (!account?.id) return 0;
    return computeBankAccountBookBalance(
      account,
      expenses,
      sales,
      bankTransfers,
      inventoryEntries,
      otherIncomes,
      purchases,
      loansGiven,
    );
  }, [account, expenses, sales, bankTransfers, inventoryEntries, otherIncomes, purchases, loansGiven]);
  const txRows = useMemo(() => bankTxRowsWithRunningAfter(txs, book), [txs, book]);
  /* Cap rendered rows to keep DOM cost bounded on accounts with thousands of movements. */
  const visibleTxRows = useMemo(
    () => (txRows.length > activityLimit ? txRows.slice(0, activityLimit) : txRows),
    [txRows, activityLimit],
  );
  const kindVal = BANK_ACCOUNT_KINDS.has(account?.kind) ? account.kind : "bank";
  const monthKey =
    activityMonthKey && String(activityMonthKey).length >= 7
      ? String(activityMonthKey).slice(0, 7)
      : currentMonthStr();
  const mtd = useMemo(
    () =>
      bankingActivityForAccountInMonth(
        expenses,
        sales,
        bankTransfers,
        inventoryEntries,
        otherIncomes,
        account?.id,
        monthKey,
        purchases,
        loansGiven,
      ),
    [expenses, sales, bankTransfers, inventoryEntries, otherIncomes, account?.id, monthKey, purchases, loansGiven],
  );

  const onTxActivate = (t) => {
    if (t.linkKind === "expense" && t.expenseId && onOpenExpense) {
      onOpenExpense(t.expenseId);
      return;
    }
    if (t.linkKind === "otherIncome" && t.otherIncomeId && onOpenOtherIncome) {
      onOpenOtherIncome(t.otherIncomeId);
      return;
    }
    if (t.linkKind === "payment" && t.saleId && onOpenSale) {
      onOpenSale(t.saleId);
      return;
    }
    if (t.linkKind === "transfer" && t.transferId) {
      const tr = (bankTransfers || []).find((x) => x && String(x.id) === String(t.transferId));
      if (tr) setTransferPeek({ transfer: tr, side: t.transferSide || "out" });
      return;
    }
    if (t.linkKind === "stockIn" && t.inventoryId && onOpenInventoryEntry) {
      onOpenInventoryEntry(t.inventoryId);
      return;
    }
    if (t.linkKind === "purchasePayment" && t.purchaseId && onOpenPurchase) {
      onOpenPurchase(t.purchaseId);
      return;
    }
    if ((t.linkKind === "loanDisbursement" || t.linkKind === "loanRepayment") && t.loanGivenId && onOpenLoanGiven) {
      onOpenLoanGiven(t.loanGivenId);
    }
  };

  return (
    <>
      <OverlayScreen className="overlay-screen--form-footer overlay-screen--bank-acct">
        <PageHeader
          title={account.name?.trim() || "Account"}
          onBack={onClose}
          right={<span className="page-hdr-meta bank-acct-hdr-bal">{money(book)}</span>}
        />
        <div className="overlay-scroll overlay-scroll--form-body bank-acct-body">
          <section className="banking-summary banking-summary--overlay" aria-label="Account summary">
            <div className="banking-sum-cell">
              <span className="banking-sum-lbl">Balance</span>
              <span className="banking-sum-val">{money(book)}</span>
              <span className="banking-sum-meta">
                <span className="bank-kind-pill">{bankKindLabel(kindVal)}</span>
                <span className="banking-sum-meta-txt">Auto from activity</span>
              </span>
            </div>
            <div className="banking-sum-cell banking-sum-cell--in">
              <span className="banking-sum-lbl">In · month</span>
              <span className="banking-sum-val">{money(mtd.inn)}</span>
            </div>
            <div className="banking-sum-cell banking-sum-cell--out">
              <span className="banking-sum-lbl">Out · month</span>
              <span className="banking-sum-val">{money(mtd.out)}</span>
            </div>
          </section>

          <form
            id="form-bank-account"
            className="form-sections bank-acct-form"
            onSubmit={async (e) => {
              e.preventDefault();
              await onSave();
            }}
          >
            <details className="form-card bank-acct-details">
              <summary className="bank-acct-details-sum">
                <span className="form-card-title bank-acct-details-title">Account settings</span>
                <span className="bank-acct-details-hint">Name, type, opening balance, adjustment</span>
              </summary>
              <div className="form-stack bank-acct-details-body">
                <Field label="Name">
                  <input
                    type="text"
                    value={account.name}
                    onChange={(e) => onPatch({ name: e.target.value })}
                    placeholder="e.g. Cash in hand"
                    autoComplete="off"
                  />
                </Field>
                <Field label="Account type">
                  <MenuSelect
                    value={kindVal}
                    onChange={(v) => onPatch({ kind: v })}
                    options={[
                      { value: "cash", label: "Cash" },
                      { value: "bank", label: "Bank" },
                      { value: "card", label: "Card" },
                    ]}
                  />
                </Field>
                <Field label="Opening balance (₹)">
                  <input
                    type="number"
                    step="0.01"
                    inputMode="decimal"
                    value={account.openingBalance}
                    onChange={(e) => onPatch({ openingBalance: num(e.target.value) })}
                  />
                </Field>
                <Field label="Balance adjustment (₹)">
                  <input
                    type="number"
                    step="0.01"
                    inputMode="decimal"
                    value={account.balanceAdjustment ?? 0}
                    onChange={(e) => onPatch({ balanceAdjustment: num(e.target.value) })}
                  />
                </Field>
                <p className="bank-adj-note">Use when the auto total doesn’t match your bank statement (rounding or missing links).</p>
              </div>
            </details>

            <section className="form-card bank-acct-activity-card" aria-labelledby="bank-acct-activity-title">
              <div className="bank-acct-activity-top">
                <div className="bank-acct-activity-head-text">
                  <h2 id="bank-acct-activity-title" className="bank-acct-activity-title">
                    Activity
                  </h2>
                  <p className="bank-acct-activity-sub">Newest first · tap a row to open the record</p>
                </div>
                <span className="bank-acct-activity-badge" title="Movements that use this account">
                  {txRows.length} {txRows.length === 1 ? "entry" : "entries"}
                </span>
              </div>
              {txRows.length === 0 ? (
                <p className="bank-acct-activity-empty">
                  Link expenses, other income, invoice payments, supplier payments (Purchases), stock-in, and loans given / repayments to this account to see movements here.
                </p>
              ) : (
                <ul className="bank-tx-list bank-tx-list--running bank-tx-list--interactive" role="list">
                  {visibleTxRows.map((t) => {
                    const openable =
                      t.linkKind === "expense" ||
                      t.linkKind === "otherIncome" ||
                      t.linkKind === "payment" ||
                      t.linkKind === "transfer" ||
                      t.linkKind === "stockIn" ||
                      (t.linkKind === "purchasePayment" && onOpenPurchase) ||
                      ((t.linkKind === "loanDisbursement" || t.linkKind === "loanRepayment") && onOpenLoanGiven);
                    const canDelete =
                      !!onRequestDeleteActivity &&
                      (t.linkKind === "expense" ||
                        t.linkKind === "stockIn" ||
                        t.linkKind === "otherIncome" ||
                        (t.linkKind === "transfer" && t.transferId) ||
                        (t.linkKind === "payment" && t.saleId && t.paymentEntryId) ||
                        (t.linkKind === "purchasePayment" && t.purchaseId && t.paymentEntryId));
                    return (
                      <li key={t.key} className={`bank-tx-li${canDelete ? " bank-tx-li--actions" : ""}`}>
                        <button
                          type="button"
                          className={`bank-tx-row bank-tx-row--running bank-tx-row-btn${openable ? "" : " bank-tx-row-btn--disabled"}${t.linkKind === "transfer" ? " bank-tx-row-btn--transfer" : ""}`}
                          onClick={() => openable && onTxActivate(t)}
                          disabled={!openable}
                          aria-label={
                            t.linkKind === "expense"
                              ? `Open expense: ${t.title}`
                              : t.linkKind === "otherIncome"
                                ? `Open other income: ${t.title}`
                                : t.linkKind === "payment"
                                  ? `Open invoice: ${t.sub}`
                                  : t.linkKind === "transfer"
                                    ? `Transfer details: ${t.title}`
                                    : t.linkKind === "stockIn"
                                      ? `Stock entry: ${t.title}`
                                        : t.linkKind === "purchasePayment"
                                        ? `Open purchase: ${t.title}`
                                        : t.linkKind === "loanDisbursement" || t.linkKind === "loanRepayment"
                                          ? `Loan: ${t.title}`
                                          : "Entry"
                          }
                        >
                          <span className="bank-tx-date">{dateSlash(t.date)}</span>
                          <span className="bank-tx-body">
                            <span className="bank-tx-title">{t.title}</span>
                            <span className="bank-tx-sub">
                              {t.sub}
                              {openable ? <span className="bank-tx-open-hint"> · Open</span> : null}
                            </span>
                          </span>
                          <span className="bank-tx-nums">
                            <span className="bank-tx-num-cell">
                              <span className="bank-tx-num-lbl">This entry</span>
                              <span className={`bank-tx-amt${t.dir === "in" ? " bank-tx-amt--in" : " bank-tx-amt--out"}`}>
                                {t.dir === "in" ? "+" : "−"}
                                {money(Math.abs(t.amount))}
                              </span>
                            </span>
                            <span className="bank-tx-num-cell bank-tx-num-cell--balance">
                              <span className="bank-tx-num-lbl">Balance after</span>
                              <span className="bank-tx-after">{money(t.afterBalance)}</span>
                            </span>
                          </span>
                        </button>
                        {canDelete ? (
                          <button
                            type="button"
                            className="bank-tx-del"
                            aria-label={
                              t.linkKind === "expense"
                                ? "Delete expense"
                                : t.linkKind === "stockIn"
                                  ? "Delete stock entry"
                                  : t.linkKind === "otherIncome"
                                    ? "Delete other income"
                                    : t.linkKind === "transfer"
                                      ? "Delete transfer"
                                      : t.linkKind === "payment"
                                        ? "Remove invoice payment"
                                        : t.linkKind === "purchasePayment"
                                          ? "Remove supplier payment"
                                          : "Delete"
                            }
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              onRequestDeleteActivity(t);
                            }}
                          >
                            <IcTrash />
                          </button>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              )}
              {txRows.length > visibleTxRows.length ? (
                <div className="bank-acct-activity-more">
                  <button
                    type="button"
                    className="ghost-btn"
                    onClick={() => setActivityLimit((n) => n + 200)}
                  >
                    Show more ({txRows.length - visibleTxRows.length} remaining)
                  </button>
                </div>
              ) : null}
            </section>

            <div className="form-card bank-account-danger-card">
              <button type="button" className="delete-btn-text" onClick={onRequestRemove}>
                Delete account
              </button>
            </div>
          </form>
        </div>
        <div className="overlay-form-footer bank-acct-footer">
          <button type="submit" form="form-bank-account" className="primary-btn submit-btn">
            Save settings
          </button>
        </div>
      </OverlayScreen>

      {transferPeek && transferPeek.transfer && (
        <div className="modal-overlay" role="presentation" onClick={() => setTransferPeek(null)}>
          <div
            className="modal banking-transfer-sheet"
            role="dialog"
            aria-modal="true"
            aria-label={`Movement ${dateSlash(transferPeek.transfer.date)}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-hdr">
              <span className="modal-title">{dateSlash(transferPeek.transfer.date)}</span>
              <button type="button" className="icon-btn-sm" onClick={() => setTransferPeek(null)} aria-label="Close">
                <IcX />
              </button>
            </div>
            <div className="banking-transfer-sheet-body">
              <p className="banking-transfer-sheet-amt">
                {transferPeek.side === "in" ? "+" : "−"}
                {money(num(transferPeek.transfer.amount))}
              </p>
              <dl className="banking-transfer-sheet-dl">
                <div>
                  <dt>From</dt>
                  <dd>{bankAccountLabel(allBankAccounts, transferPeek.transfer.fromAccountId)}</dd>
                </div>
                <div>
                  <dt>To</dt>
                  <dd>{bankAccountLabel(allBankAccounts, transferPeek.transfer.toAccountId)}</dd>
                </div>
                {String(transferPeek.transfer.note || "").trim() ? (
                  <div>
                    <dt>Note</dt>
                    <dd>{String(transferPeek.transfer.note).trim()}</dd>
                  </div>
                ) : null}
              </dl>
            </div>
            <div className="banking-transfer-sheet-footer">
              {onDeleteTransfer ? (
                <button
                  type="button"
                  className="delete-btn-text banking-transfer-del-btn"
                  onClick={() => {
                    requestConfirm?.({
                      title: "Remove this transfer?",
                      message: "Balances for both accounts will be recalculated.",
                      confirmLabel: "Delete transfer",
                      danger: true,
                      onConfirm: async () => {
                        const ok = await onDeleteTransfer(transferPeek.transfer.id);
                        if (ok) setTransferPeek(null);
                      },
                    });
                  }}
                >
                  Delete transfer
                </button>
              ) : null}
              <div className="modal-btns banking-transfer-sheet-done">
                <button type="button" className="primary-btn" onClick={() => setTransferPeek(null)}>
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
