/**
 * Cash flow classification — operating vs financing movements.
 */
import {
  BANK_EXTERNAL_SINK_ID,
  BANK_EXTERNAL_SOURCE_ID,
  num,
  roundMoney2,
  sumExpenseCashOutInMonth,
  sumExpenseCashOutOnDay,
  sumLoanDisbursementCashOutInMonth,
  sumLoanDisbursementCashOutOnDay,
  sumLoanRepaymentCashInInMonth,
  sumLoanRepaymentCashInOnDay,
  sumPurchasePaymentsInMonth,
  sumPurchasePaymentsOnDay,
  sumSalePaymentsInMonth,
  sumSalePaymentsOnDay,
  sumStockInCashOutInMonth,
  sumStockInCashOutOnDay,
} from "./appModel.js";

export const BANK_TRANSFER_KIND = {
  TRANSFER: "transfer",
  DEPOSIT: "deposit",
  WITHDRAW: "withdraw",
  OWNER_DRAWING: "ownerDrawing",
  OWNER_CAPITAL: "ownerCapital",
};

const FINANCING_IN = new Set([BANK_TRANSFER_KIND.OWNER_CAPITAL, BANK_TRANSFER_KIND.DEPOSIT]);
const FINANCING_OUT = new Set([
  BANK_TRANSFER_KIND.OWNER_DRAWING,
  BANK_TRANSFER_KIND.WITHDRAW,
]);

export function normalizeBankTransferKind(kind, transfer) {
  const k = String(kind || transfer?.kind || "").trim();
  if (Object.values(BANK_TRANSFER_KIND).includes(k)) return k;
  const from = String(transfer?.fromAccountId || "");
  const to = String(transfer?.toAccountId || "");
  if (from === BANK_EXTERNAL_SOURCE_ID && to && to !== BANK_EXTERNAL_SINK_ID) {
    return BANK_TRANSFER_KIND.DEPOSIT;
  }
  if (to === BANK_EXTERNAL_SINK_ID && from && from !== BANK_EXTERNAL_SOURCE_ID) {
    return BANK_TRANSFER_KIND.WITHDRAW;
  }
  return BANK_TRANSFER_KIND.TRANSFER;
}

export function bankTransferKindLabel(kind) {
  switch (kind) {
    case BANK_TRANSFER_KIND.OWNER_DRAWING:
      return "Owner drawing";
    case BANK_TRANSFER_KIND.OWNER_CAPITAL:
      return "Owner capital in";
    case BANK_TRANSFER_KIND.DEPOSIT:
      return "Deposit";
    case BANK_TRANSFER_KIND.WITHDRAW:
      return "Withdrawal";
    default:
      return "Transfer";
  }
}

function sumTransfersInMonth(transfers, monthKey, predicate) {
  const mk = String(monthKey || "").slice(0, 7);
  if (mk.length < 7) return 0;
  let total = 0;
  for (const t of Array.isArray(transfers) ? transfers : []) {
    if (!t || typeof t !== "object") continue;
    if (String(t.date || "").slice(0, 7) !== mk) continue;
    const kind = normalizeBankTransferKind(null, t);
    if (!predicate(kind, t)) continue;
    total += num(t.amount);
  }
  return roundMoney2(total);
}

function sumTransfersOnDay(transfers, dayYmd, predicate) {
  const d = String(dayYmd || "").slice(0, 10);
  if (d.length < 10) return 0;
  let total = 0;
  for (const t of Array.isArray(transfers) ? transfers : []) {
    if (!t || typeof t !== "object") continue;
    if (String(t.date || "").slice(0, 10) !== d) continue;
    const kind = normalizeBankTransferKind(null, t);
    if (!predicate(kind, t)) continue;
    total += num(t.amount);
  }
  return roundMoney2(total);
}

export function sumOwnerDrawingsInMonth(transfers, monthKey) {
  return sumTransfersInMonth(
    transfers,
    monthKey,
    (kind) => kind === BANK_TRANSFER_KIND.OWNER_DRAWING,
  );
}

export function sumOwnerCapitalInMonth(transfers, monthKey) {
  return sumTransfersInMonth(
    transfers,
    monthKey,
    (kind) => kind === BANK_TRANSFER_KIND.OWNER_CAPITAL,
  );
}

export function sumFinancingCashInMonth(transfers, monthKey) {
  return sumTransfersInMonth(transfers, monthKey, (kind) => FINANCING_IN.has(kind));
}

export function sumFinancingCashOutMonth(transfers, monthKey) {
  return sumTransfersInMonth(transfers, monthKey, (kind) => FINANCING_OUT.has(kind));
}

export function sumOwnerDrawingsOnDay(transfers, dayYmd) {
  return sumTransfersOnDay(
    transfers,
    dayYmd,
    (kind) => kind === BANK_TRANSFER_KIND.OWNER_DRAWING,
  );
}

export function sumOwnerCapitalOnDay(transfers, dayYmd) {
  return sumTransfersOnDay(
    transfers,
    dayYmd,
    (kind) => kind === BANK_TRANSFER_KIND.OWNER_CAPITAL,
  );
}

export function sumFinancingCashInOnDay(transfers, dayYmd) {
  return sumTransfersOnDay(transfers, dayYmd, (kind) => FINANCING_IN.has(kind));
}

export function sumFinancingCashOutOnDay(transfers, dayYmd) {
  return sumTransfersOnDay(transfers, dayYmd, (kind) => FINANCING_OUT.has(kind));
}

function sumOtherIncomeInMonth(otherIncomes, monthKey) {
  const mk = String(monthKey || "").slice(0, 7);
  if (mk.length < 7) return 0;
  return roundMoney2(
    (Array.isArray(otherIncomes) ? otherIncomes : [])
      .filter(
        (x) =>
          x &&
          String(x.date || "").slice(0, 7) === mk &&
          String(x.bankAccountId || "").trim(),
      )
      .reduce((s, x) => s + num(x.amount), 0),
  );
}

function sumOtherIncomeOnDay(otherIncomes, dayYmd) {
  const d = String(dayYmd || "").slice(0, 10);
  if (d.length < 10) return 0;
  return roundMoney2(
    (Array.isArray(otherIncomes) ? otherIncomes : [])
      .filter(
        (x) => x && String(x.date || "").slice(0, 10) === d && String(x.bankAccountId || "").trim(),
      )
      .reduce((s, x) => s + num(x.amount), 0),
  );
}

/** Operating + financing breakdown for a calendar month. */
export function computeCashflowBreakdownForMonth({
  sales,
  expenses,
  inventoryEntries,
  otherIncomes,
  purchases,
  loansGiven,
  bankTransfers,
  monthKey,
}) {
  const operatingIn = roundMoney2(
    sumSalePaymentsInMonth(sales, monthKey) + sumOtherIncomeInMonth(otherIncomes, monthKey),
  );
  const operatingOut = roundMoney2(
    sumExpenseCashOutInMonth(expenses, monthKey) +
      sumStockInCashOutInMonth(inventoryEntries, monthKey) +
      sumPurchasePaymentsInMonth(purchases, monthKey),
  );
  const financingIn = roundMoney2(
    sumFinancingCashInMonth(bankTransfers, monthKey) +
      sumLoanRepaymentCashInInMonth(loansGiven, monthKey),
  );
  const financingOut = roundMoney2(
    sumFinancingCashOutMonth(bankTransfers, monthKey) +
      sumLoanDisbursementCashOutInMonth(loansGiven, monthKey),
  );
  const ownerDrawings = sumOwnerDrawingsInMonth(bankTransfers, monthKey);
  const ownerCapital = sumOwnerCapitalInMonth(bankTransfers, monthKey);
  const totalIn = roundMoney2(operatingIn + financingIn);
  const totalOut = roundMoney2(operatingOut + financingOut);
  return {
    operatingIn,
    operatingOut,
    operatingNet: roundMoney2(operatingIn - operatingOut),
    financingIn,
    financingOut,
    financingNet: roundMoney2(financingIn - financingOut),
    ownerDrawings,
    ownerCapital,
    totalIn,
    totalOut,
    net: roundMoney2(totalIn - totalOut),
  };
}

export function computeCashflowBreakdownForDay({
  sales,
  expenses,
  inventoryEntries,
  otherIncomes,
  purchases,
  loansGiven,
  bankTransfers,
  dayYmd,
}) {
  const operatingIn = roundMoney2(
    sumSalePaymentsOnDay(sales, dayYmd) + sumOtherIncomeOnDay(otherIncomes, dayYmd),
  );
  const operatingOut = roundMoney2(
    sumExpenseCashOutOnDay(expenses, dayYmd) +
      sumStockInCashOutOnDay(inventoryEntries, dayYmd) +
      sumPurchasePaymentsOnDay(purchases, dayYmd),
  );
  const financingIn = roundMoney2(
    sumFinancingCashInOnDay(bankTransfers, dayYmd) +
      sumLoanRepaymentCashInOnDay(loansGiven, dayYmd),
  );
  const financingOut = roundMoney2(
    sumFinancingCashOutOnDay(bankTransfers, dayYmd) +
      sumLoanDisbursementCashOutOnDay(loansGiven, dayYmd),
  );
  return {
    operatingIn,
    operatingOut,
    operatingNet: roundMoney2(operatingIn - operatingOut),
    financingIn,
    financingOut,
    financingNet: roundMoney2(financingIn - financingOut),
    ownerDrawings: sumOwnerDrawingsOnDay(bankTransfers, dayYmd),
    ownerCapital: sumOwnerCapitalOnDay(bankTransfers, dayYmd),
    totalIn: roundMoney2(operatingIn + financingIn),
    totalOut: roundMoney2(operatingOut + financingOut),
    net: roundMoney2(operatingIn + financingIn - operatingOut - financingOut),
  };
}
