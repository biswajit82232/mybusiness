import { useEffect, useMemo, useState } from "react";
import {
  BANK_ACCOUNT_KINDS,
  bankAccountLabel,
  buildBankAccountTransactions,
  bankTxRowsWithRunningAfter,
  bankingActivityForAccountInMonth,
  computeBankAccountBookBalance,
  formatMonthLabel,
  num,
  money,
  dateSlash,
  currentMonthStr,
  roundMoney2,
} from "@/domain/index.js";
import { IcTrash, IcX } from "@/shared/ui/icons/AppIcons.jsx";
import { Field, PageHeader, OverlayScreen } from "@/shared/ui/layout/AppChrome.jsx";
import { MenuSelect } from "@/shared/ui/inputs/MenuSelect.jsx";
import { MonthFilterCompact } from "@/shared/ui/shell/MonthFilterCompact.jsx";
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
  customerAdvancePayments = [],
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
  onRequestDeleteActivity,
  onDeleteTransfer,
  requestConfirm,
}) {
  const [transferPeek, setTransferPeek] = useState(null);
  const [activityLimit, setActivityLimit] = useState(200);
  const [viewMonthKey, setViewMonthKey] = useState(() =>
    activityMonthKey && String(activityMonthKey).length >= 7
      ? String(activityMonthKey).slice(0, 7)
      : currentMonthStr(),
  );
  const [activityShowAll, setActivityShowAll] = useState(false);

  useEffect(() => {
    if (activityMonthKey && String(activityMonthKey).length >= 7) {
      setViewMonthKey(String(activityMonthKey).slice(0, 7));
      setActivityShowAll(false);
    }
  }, [activityMonthKey]);

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
        customerAdvancePayments,
      ),
    [account?.id, expenses, sales, bankTransfers, inventoryEntries, otherIncomes, allBankAccounts, purchases, loansGiven, customerAdvancePayments],
  );
  const book = useMemo(() => {
    if (!account?.id) return 0;
    const bal = computeBankAccountBookBalance(
      account,
      expenses,
      sales,
      bankTransfers,
      inventoryEntries,
      otherIncomes,
      purchases,
      loansGiven,
      null,
      customerAdvancePayments,
    );
    return bal;
  }, [account, expenses, sales, bankTransfers, inventoryEntries, otherIncomes, purchases, loansGiven, customerAdvancePayments]);

  const filteredTxs = useMemo(() => {
    if (activityShowAll) return txs;
    const mk = String(viewMonthKey || "").slice(0, 7);
    if (mk.length < 7) return txs;
    return txs.filter((t) => String(t.date || "").slice(0, 7) === mk);
  }, [txs, activityShowAll, viewMonthKey]);

  // When viewing a specific month, seed the running balance from the book balance at the end of
  // that month (= current book balance minus net activity of all transactions after that month).
  const bookForPeriod = useMemo(() => {
    if (activityShowAll) return book;
    const mk = String(viewMonthKey || "").slice(0, 7);
    if (mk.length < 7) return book;
    const laterDelta = txs
      .filter((t) => String(t.date || "").slice(0, 7) > mk)
      .reduce((s, t) => s + (t.dir === "in" ? num(t.amount) : -num(t.amount)), 0);
    return roundMoney2(book - laterDelta);
  }, [txs, activityShowAll, viewMonthKey, book]);

  const txRows = useMemo(() => bankTxRowsWithRunningAfter(filteredTxs, bookForPeriod), [filteredTxs, bookForPeriod]);
  const visibleTxRows = useMemo(
    () => (txRows.length > activityLimit ? txRows.slice(0, activityLimit) : txRows),
    [txRows, activityLimit],
  );

  const kindVal = BANK_ACCOUNT_KINDS.has(account?.kind) ? account.kind : "bank";
  const monthLabel = formatMonthLabel(viewMonthKey);
  const mtd = useMemo(
    () =>
      bankingActivityForAccountInMonth(
        expenses,
        sales,
        bankTransfers,
        inventoryEntries,
        otherIncomes,
        account?.id,
        viewMonthKey,
        purchases,
        loansGiven,
        customerAdvancePayments,
      ),
    [expenses, sales, bankTransfers, inventoryEntries, otherIncomes, account?.id, viewMonthKey, purchases, loansGiven, customerAdvancePayments],
  );
  const monthNet = roundMoney2(num(mtd.inn) - num(mtd.out));

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
          <div className="banking-top banking-top--overlay">
            <section className="banking-hero banking-hero--compact" aria-label="Account balance">
              <div className="banking-hero-top">
                <span className="banking-hero-eyebrow">Balance</span>
                <span className="banking-hero-total">{money(book)}</span>
                <span className="banking-hero-accounts">
                  <span className="bank-kind-pill">{bankKindLabel(kindVal)}</span>
                  <span className="banking-sum-meta-txt">Auto from activity</span>
                </span>
              </div>
            </section>

            <div className="banking-period-bar" role="group" aria-label="Month for account movement">
              <span className="banking-period-lbl">Movement</span>
              <MonthFilterCompact
                value={viewMonthKey}
                onChange={(v) => {
                  setViewMonthKey(v && String(v).length >= 7 ? String(v).slice(0, 7) : currentMonthStr());
                  setActivityShowAll(false);
                  setActivityLimit(200);
                }}
                instanceId="bank-acct"
                allowClear={false}
              />
            </div>

            <div className="banking-kpi-grid banking-kpi-grid--overlay" aria-label={`${monthLabel} movement`}>
              <div className="banking-kpi banking-kpi--in">
                <span className="banking-kpi-lbl">In · {monthLabel}</span>
                <span className="banking-kpi-val">{money(mtd.inn)}</span>
              </div>
              <div className="banking-kpi banking-kpi--out">
                <span className="banking-kpi-lbl">Out · {monthLabel}</span>
                <span className="banking-kpi-val">{money(mtd.out)}</span>
              </div>
              <div
                className={`banking-kpi banking-kpi--net${monthNet >= 0 ? " banking-kpi--pos" : " banking-kpi--neg"}`}
              >
                <span className="banking-kpi-lbl">Net · {monthLabel}</span>
                <span className="banking-kpi-val">{money(monthNet)}</span>
              </div>
            </div>
          </div>

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
                <div className="bank-acct-exclude-block">
                  <div className="toggle-row bank-acct-exclude-row">
                    <div>
                      <div className="toggle-label">Exclude from balance sheet</div>
                      <div className="toggle-sub">
                        Profit, personal, or tracking accounts — not counted in assets or net worth
                      </div>
                    </div>
                    <label className="toggle-switch" aria-label="Exclude from balance sheet">
                      <input
                        type="checkbox"
                        checked={!!account.excludeFromBalanceSheet}
                        onChange={(e) => onPatch({ excludeFromBalanceSheet: e.target.checked })}
                      />
                      <span className="toggle-track" />
                    </label>
                  </div>
                  <div className="toggle-row bank-acct-exclude-row">
                    <div>
                      <div className="toggle-label">Exclude from liquid total</div>
                      <div className="toggle-sub">
                        Hidden from Banking “Total liquid” — use for non-operating cash you still track here
                      </div>
                    </div>
                    <label className="toggle-switch" aria-label="Exclude from liquid total">
                      <input
                        type="checkbox"
                        checked={!!account.excludeFromLiquid}
                        onChange={(e) => onPatch({ excludeFromLiquid: e.target.checked })}
                      />
                      <span className="toggle-track" />
                    </label>
                  </div>
                </div>
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
                  <p className="bank-acct-activity-sub">
                    {activityShowAll
                      ? "All time · newest first · tap a row to open"
                      : `${monthLabel} · tap a row to open`}
                  </p>
                </div>
                <div className="bank-acct-activity-actions">
                  <button
                    type="button"
                    className={`bank-acct-filter-chip${activityShowAll ? " bank-acct-filter-chip--on" : ""}`}
                    onClick={() => {
                      setActivityShowAll((v) => !v);
                      setActivityLimit(200);
                    }}
                    aria-pressed={activityShowAll}
                  >
                    {activityShowAll ? "This month" : "All time"}
                  </button>
                  <span className="bank-acct-activity-badge" title="Movements in current view">
                    {txRows.length} {txRows.length === 1 ? "entry" : "entries"}
                  </span>
                </div>
              </div>
              {txRows.length === 0 ? (
                <p className="bank-acct-activity-empty">
                  {activityShowAll
                    ? "Link expenses, other income, invoice payments, supplier payments (Purchases), stock-in, and loans given / repayments to this account to see movements here."
                    : `No movements in ${monthLabel}. Try All time or pick another month.`}
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
                      (t.linkKind === "purchasePayment" && onOpenPurchase);
                    const canDelete =
                      !!onRequestDeleteActivity &&
                      (t.linkKind === "expense" ||
                        t.linkKind === "stockIn" ||
                        t.linkKind === "otherIncome" ||
                        (t.linkKind === "transfer" && t.transferId) ||
                        (t.linkKind === "payment" && t.saleId && t.paymentEntryId) ||
                        (t.linkKind === "purchasePayment" && t.purchaseId && t.paymentEntryId) ||
                        (t.linkKind === "advancePayment" && t.advancePaymentId));
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
