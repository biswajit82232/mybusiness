import { useEffect, useMemo, useState } from "react";
import {
  bankingActivityForMonth,
  bankingActivityForAccountInMonth,
  computeBankAccountBookBalance,
  getDefaultBankAccountId,
  BANK_EXTERNAL_SOURCE_ID,
  BANK_EXTERNAL_SINK_ID,
  BANK_TRANSFER_KIND,
  bankAccountCountsInLiquidTotal,
  formatMonthLabel,
  currentMonthStr,
  todayStr,
  money,
  num,
  roundMoney2,
} from "@/domain/index.js";
import { IcX } from "@/shared/ui/icons/AppIcons.jsx";
import { Field, TabPageChrome } from "@/shared/ui/layout/AppChrome.jsx";
import { MenuSelect } from "@/shared/ui/inputs/MenuSelect.jsx";
import { MonthFilterCompact } from "@/shared/ui/shell/MonthFilterCompact.jsx";
import { bankKindLabel } from "./bankKindLabel.js";

const KIND_DOT_CLASS = {
  cash: "banking-kind-dot--cash",
  card: "banking-kind-dot--card",
  bank: "banking-kind-dot--bank",
};

function accountKindDotClass(kind) {
  return KIND_DOT_CLASS[kind] || KIND_DOT_CLASS.bank;
}

export function BankingTab({
  state,
  expenses,
  sales,
  businessMonth,
  onOpenAccount,
  onAddAccount,
  onTransfer,
  onOpenSidebar,
}) {
  const bankAccounts = useMemo(() => state.balance?.bankAccounts ?? [], [state.balance?.bankAccounts]);
  const transfers = useMemo(() => state.balance?.bankTransfers ?? [], [state.balance?.bankTransfers]);
  const inventoryEntries = useMemo(() => state.inventoryEntries ?? [], [state.inventoryEntries]);
  const purchases = useMemo(() => state.purchases ?? [], [state.purchases]);
  const otherIncomes = useMemo(() => state.otherIncomes ?? [], [state.otherIncomes]);
  const loansGiven = useMemo(() => state.loansGiven ?? [], [state.loansGiven]);
  const expenseList = useMemo(() => expenses ?? [], [expenses]);
  const salesList = useMemo(() => sales ?? [], [sales]);

  const defaultMonthKey =
    businessMonth && String(businessMonth).length >= 7
      ? String(businessMonth).slice(0, 7)
      : currentMonthStr();
  const [bankingMonthKey, setBankingMonthKey] = useState(defaultMonthKey);

  useEffect(() => {
    if (businessMonth && String(businessMonth).length >= 7) {
      setBankingMonthKey(String(businessMonth).slice(0, 7));
    }
  }, [businessMonth]);

  const accountsWithBook = useMemo(
    () =>
      bankAccounts.map((acc) => ({
        acc,
        book: computeBankAccountBookBalance(
          acc,
          expenseList,
          salesList,
          transfers,
          inventoryEntries,
          otherIncomes,
          purchases,
          loansGiven,
        ),
      })),
    [bankAccounts, expenseList, salesList, transfers, inventoryEntries, otherIncomes, purchases, loansGiven],
  );

  const totalLiquid = useMemo(
    () =>
      roundMoney2(
        accountsWithBook
          .filter(({ acc }) => bankAccountCountsInLiquidTotal(acc))
          .reduce((s, row) => s + num(row.book), 0),
      ),
    [accountsWithBook],
  );

  const act = bankingActivityForMonth(
    expenseList,
    salesList,
    inventoryEntries,
    otherIncomes,
    bankingMonthKey,
    purchases,
    transfers,
    loansGiven,
  );
  const monthNet = roundMoney2(num(act.cashIn) - num(act.cashOut));
  const monthLabel = formatMonthLabel(bankingMonthKey);

  const [xferOpen, setXferOpen] = useState(false);
  const [xferFrom, setXferFrom] = useState("");
  const [xferTo, setXferTo] = useState("");
  const [xferAmt, setXferAmt] = useState("");
  const [xferDate, setXferDate] = useState(() => todayStr());
  const [xferNote, setXferNote] = useState("");
  const [cashMoveOpen, setCashMoveOpen] = useState(false);
  const [cashMoveType, setCashMoveType] = useState("deposit");
  const [cashMoveAccountId, setCashMoveAccountId] = useState("");
  const [cashMoveAmt, setCashMoveAmt] = useState("");
  const [cashMoveDate, setCashMoveDate] = useState(() => todayStr());
  const [cashMoveNote, setCashMoveNote] = useState("");
  const [cashMoveOwnerDrawing, setCashMoveOwnerDrawing] = useState(false);
  const [cashMoveOwnerCapital, setCashMoveOwnerCapital] = useState(false);

  const openXferModal = () => {
    const ids = bankAccounts.map((a) => a.id).filter(Boolean);
    let from = getDefaultBankAccountId(bankAccounts) || ids[0] || "";
    let to = ids.find((id) => id !== from) || "";
    setXferFrom(from);
    setXferTo(to);
    setXferAmt("");
    setXferDate(todayStr());
    setXferNote("");
    setXferOpen(true);
  };

  const submitXfer = async (e) => {
    e.preventDefault();
    if (!onTransfer) return;
    const ok = await onTransfer({
      fromAccountId: xferFrom,
      toAccountId: xferTo,
      amount: xferAmt,
      date: xferDate,
      note: xferNote,
    });
    if (ok) setXferOpen(false);
  };

  const openCashMoveModal = (type) => {
    const ids = bankAccounts.map((a) => a.id).filter(Boolean);
    const preferred = getDefaultBankAccountId(bankAccounts) || ids[0] || "";
    setCashMoveType(type === "withdraw" ? "withdraw" : "deposit");
    setCashMoveAccountId(preferred);
    setCashMoveAmt("");
    setCashMoveDate(todayStr());
    setCashMoveNote("");
    setCashMoveOwnerDrawing(false);
    setCashMoveOwnerCapital(false);
    setCashMoveOpen(true);
  };

  const submitCashMove = async (e) => {
    e.preventDefault();
    if (!onTransfer) return;
    const isDeposit = cashMoveType === "deposit";
    const kind = isDeposit
      ? cashMoveOwnerCapital
        ? BANK_TRANSFER_KIND.OWNER_CAPITAL
        : BANK_TRANSFER_KIND.DEPOSIT
      : cashMoveOwnerDrawing
        ? BANK_TRANSFER_KIND.OWNER_DRAWING
        : BANK_TRANSFER_KIND.WITHDRAW;
    const ok = await onTransfer({
      fromAccountId: isDeposit ? BANK_EXTERNAL_SOURCE_ID : cashMoveAccountId,
      toAccountId: isDeposit ? cashMoveAccountId : BANK_EXTERNAL_SINK_ID,
      amount: cashMoveAmt,
      date: cashMoveDate,
      note: cashMoveNote,
      kind,
    });
    if (ok) setCashMoveOpen(false);
  };

  const bookById = useMemo(() => {
    const m = new Map();
    for (const row of accountsWithBook) {
      if (row.acc?.id) m.set(String(row.acc.id), row.book);
    }
    return m;
  }, [accountsWithBook]);

  const liquidAccountCount = bankAccounts.filter((a) => bankAccountCountsInLiquidTotal(a)).length;

  return (
    <TabPageChrome
      title="Banking"
      onOpenSidebar={onOpenSidebar}
      className="tab-page--split-scroll tab-page--banking"
    >
      <div className="banking-top">
        <section className="banking-hero" aria-label="Liquid balances">
          <div className="banking-hero-top">
            <span className="banking-hero-eyebrow">Total liquid</span>
            <span className="banking-hero-total">{money(totalLiquid)}</span>
            <span className="banking-hero-accounts">
              {liquidAccountCount} of {bankAccounts.length} account
              {bankAccounts.length === 1 ? "" : "s"} in total · live balance
            </span>
          </div>
        </section>

        <div className="banking-period-bar" role="group" aria-label="Month for cash movement">
          <span className="banking-period-lbl">Cash movement</span>
          <MonthFilterCompact
            value={bankingMonthKey}
            onChange={(v) =>
              setBankingMonthKey(v && String(v).length >= 7 ? String(v).slice(0, 7) : currentMonthStr())
            }
            instanceId="banking"
            allowClear={false}
          />
        </div>

        <div className="banking-kpi-grid" aria-label={`${monthLabel} cash movement`}>
          <div className="banking-kpi banking-kpi--in">
            <span className="banking-kpi-lbl">In · {monthLabel}</span>
            <span className="banking-kpi-val">{money(act.cashIn)}</span>
          </div>
          <div className="banking-kpi banking-kpi--out">
            <span className="banking-kpi-lbl">Out · {monthLabel}</span>
            <span className="banking-kpi-val">{money(act.cashOut)}</span>
          </div>
          <div
            className={`banking-kpi banking-kpi--net${monthNet >= 0 ? " banking-kpi--pos" : " banking-kpi--neg"}`}
          >
            <span className="banking-kpi-lbl">Net · {monthLabel}</span>
            <span className="banking-kpi-val">{money(monthNet)}</span>
          </div>
        </div>
      </div>

      <div className="tab-page-scroll">
        <div className="banking-screen">
          <section className="fin-section banking-accounts-section" aria-labelledby="banking-accounts-hd">
            <div className="banking-section-hd">
              <h2 id="banking-accounts-hd" className="home-section-hd">Accounts</h2>
              {bankAccounts.length > 0 ? (
                <span className="banking-section-count">{bankAccounts.length}</span>
              ) : null}
            </div>
            <div
              className={`quick-actions banking-quick-actions${bankAccounts.length < 2 ? " banking-quick-actions--single" : ""}`}
            >
              <button type="button" className="qa-btn qa-primary" onClick={onAddAccount}>
                + Add account
              </button>
              {bankAccounts.length > 0 ? (
                <>
                  <button type="button" className="qa-btn qa-secondary" onClick={() => openCashMoveModal("deposit")}>
                    Deposit
                  </button>
                  <button type="button" className="qa-btn qa-secondary" onClick={() => openCashMoveModal("withdraw")}>
                    Withdraw
                  </button>
                </>
              ) : null}
              {bankAccounts.length >= 2 ? (
                <button type="button" className="qa-btn qa-secondary" onClick={openXferModal}>
                  Transfer
                </button>
              ) : null}
            </div>

            {bankAccounts.length === 0 ? (
              <p className="banking-empty-hint">No accounts yet. Tap Add account to create a wallet.</p>
            ) : (
              <ul className="banking-acct-list" role="list">
                {accountsWithBook.map(({ acc, book }) => {
                  const mtd = bankingActivityForAccountInMonth(
                    expenseList,
                    salesList,
                    transfers,
                    inventoryEntries,
                    otherIncomes,
                    acc.id,
                    bankingMonthKey,
                    purchases,
                    loansGiven,
                  );
                  const inLiquid = bankAccountCountsInLiquidTotal(acc);
                  const flags = [];
                  if (acc.excludeFromLiquid) flags.push("Not in liquid");
                  if (acc.excludeFromBalanceSheet) flags.push("Not on B/S");

                  return (
                    <li key={acc.id}>
                      <button type="button" className="banking-acct-row" onClick={() => onOpenAccount(acc.id)}>
                        <span
                          className={`banking-kind-dot ${accountKindDotClass(acc.kind)}`}
                          aria-hidden="true"
                        />
                        <div className="banking-acct-row-left">
                          <span className="banking-acct-row-name">{(acc.name || "").trim() || "Account"}</span>
                          <span className="banking-acct-row-meta">
                            <span className="bank-kind-pill">{bankKindLabel(acc.kind)}</span>
                            {flags.map((f) => (
                              <span key={f} className="banking-acct-flag">{f}</span>
                            ))}
                          </span>
                          <span
                            className="banking-acct-row-flow"
                            title={`${monthLabel} · In / Out for selected month`}
                          >
                            <span className="banking-acct-flow-in">
                              In <em>{money(mtd.inn)}</em>
                            </span>
                            <span className="banking-acct-flow-sep" aria-hidden="true">·</span>
                            <span className="banking-acct-flow-out">
                              Out <em>{money(mtd.out)}</em>
                            </span>
                          </span>
                        </div>
                        <div className="banking-acct-row-right">
                          <span className="banking-acct-row-bal">{money(book)}</span>
                          {!inLiquid ? (
                            <span className="banking-acct-row-bal-note">excl. liquid</span>
                          ) : null}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </div>

      {xferOpen && (
        <div className="modal-overlay" onClick={() => setXferOpen(false)}>
          <div
            className="modal banking-xfer-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Transfer between accounts"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-hdr">
              <span className="modal-title">Transfer between accounts</span>
              <button type="button" className="icon-btn-sm" onClick={() => setXferOpen(false)} aria-label="Close">
                <IcX />
              </button>
            </div>
            <p className="modal-sub">
              Move money from one wallet to another. Both balances update automatically.
            </p>
            <form onSubmit={submitXfer}>
              <Field label="From">
                <MenuSelect
                  value={xferFrom}
                  onChange={(v) => setXferFrom(v)}
                  options={[
                    { value: "", label: "Select" },
                    ...bankAccounts.map((b) => ({
                      value: b.id,
                      label: (b.name || "").trim() || "Account",
                      sub: money(bookById.get(String(b.id)) ?? b.amount),
                    })),
                  ]}
                />
              </Field>
              <Field label="To">
                <MenuSelect
                  value={xferTo}
                  onChange={(v) => setXferTo(v)}
                  options={[
                    { value: "", label: "Select" },
                    ...bankAccounts.map((b) => ({
                      value: b.id,
                      label: (b.name || "").trim() || "Account",
                    })),
                  ]}
                />
              </Field>
              <Field label="Date">
                <input type="date" value={xferDate} onChange={(e) => setXferDate(e.target.value)} required />
              </Field>
              <Field label="Amount (₹)">
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={xferAmt}
                  onChange={(e) => setXferAmt(e.target.value)}
                  required
                />
              </Field>
              <Field label="Note (optional)">
                <input type="text" value={xferNote} onChange={(e) => setXferNote(e.target.value)} placeholder="e.g. Cash deposit" />
              </Field>
              <div className="modal-btns">
                <button type="button" className="ghost-btn" onClick={() => setXferOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="primary-btn">
                  Save transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {cashMoveOpen && (
        <div className="modal-overlay" onClick={() => setCashMoveOpen(false)}>
          <div
            className="modal banking-xfer-modal"
            role="dialog"
            aria-modal="true"
            aria-label={cashMoveType === "deposit" ? "Deposit to account" : "Withdraw from account"}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-hdr">
              <span className="modal-title">{cashMoveType === "deposit" ? "Deposit to account" : "Withdraw from account"}</span>
              <button type="button" className="icon-btn-sm" onClick={() => setCashMoveOpen(false)} aria-label="Close">
                <IcX />
              </button>
            </div>
            <p className="modal-sub">
              {cashMoveType === "deposit"
                ? "Add money into one account."
                : "Take money out from one account."}
            </p>
            <form onSubmit={submitCashMove}>
              <Field label="Account">
                <MenuSelect
                  value={cashMoveAccountId}
                  onChange={(v) => setCashMoveAccountId(v)}
                  options={[
                    { value: "", label: "Select" },
                    ...bankAccounts.map((b) => ({
                      value: b.id,
                      label: (b.name || "").trim() || "Account",
                      sub: money(bookById.get(String(b.id)) ?? b.amount),
                    })),
                  ]}
                />
              </Field>
              <Field label="Date">
                <input type="date" value={cashMoveDate} onChange={(e) => setCashMoveDate(e.target.value)} required />
              </Field>
              <Field label="Amount (₹)">
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={cashMoveAmt}
                  onChange={(e) => setCashMoveAmt(e.target.value)}
                  required
                />
              </Field>
              {cashMoveType === "withdraw" ? (
                <label className="field-check">
                  <input
                    type="checkbox"
                    checked={cashMoveOwnerDrawing}
                    onChange={(e) => setCashMoveOwnerDrawing(e.target.checked)}
                  />
                  <span>Owner drawing (personal withdrawal)</span>
                </label>
              ) : (
                <label className="field-check">
                  <input
                    type="checkbox"
                    checked={cashMoveOwnerCapital}
                    onChange={(e) => setCashMoveOwnerCapital(e.target.checked)}
                  />
                  <span>Owner capital introduced</span>
                </label>
              )}
              <Field label="Note (optional)">
                <input
                  type="text"
                  value={cashMoveNote}
                  onChange={(e) => setCashMoveNote(e.target.value)}
                  placeholder={cashMoveType === "deposit" ? "e.g. Cash received" : "e.g. Cash withdrawn"}
                />
              </Field>
              <div className="modal-btns">
                <button type="button" className="ghost-btn" onClick={() => setCashMoveOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="primary-btn">
                  Save {cashMoveType === "deposit" ? "deposit" : "withdrawal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </TabPageChrome>
  );
}
