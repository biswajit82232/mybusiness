/**
 * Balance sheet totals, GST liability, and accounting equation checks.
 */
import { buildInvoiceGstModel, isGstEnabled, splitInclusiveGst } from "./invoiceGst.js";
import {
  advanceUnappliedAmount,
  num,
  roundMoney2,
  sumBankAccountBalancesAsOf,
  bankAccountCountsInBalanceSheet,
  sumPurchaseCreditOutstanding,
  computeInvRowsForBranch,
  computeInvRowsAggregated,
  normBranchesList,
  normBankTransfers,
  normCustomerAdvancePayments,
  normalizeReceivablePaymentEntries,
  normalizePurchasePaymentEntries,
  todayStr,
  compareYmdAsc,
} from "./appModel.js";

function saleLineItemsForGst(s) {
  if (!s || typeof s !== "object") return [];
  if (Array.isArray(s.lineItems) && s.lineItems.length) return s.lineItems;
  return [
    {
      item: s.item,
      qty: s.qty,
      salePrice: s.salePrice,
      gstRate: s.gstRate,
      hsn: s.hsn,
    },
  ];
}

/** Total output GST collected on tax invoices (all time, accrual on invoice date). */
export function computeOutputGstCollected(sales, settings = {}) {
  if (!isGstEnabled(settings)) return 0;
  let total = 0;
  for (const s of Array.isArray(sales) ? sales : []) {
    if (!s || s.docType === "billOfSupply") continue;
    const model = buildInvoiceGstModel({
      lineItems: saleLineItemsForGst(s),
      discount: num(s.discount),
      additionalCharges: num(s.additionalCharges),
      businessState: settings.businessState,
      customerState: s.customerState,
      settings,
    });
    total += num(model.totalTax);
  }
  return roundMoney2(total);
}

/**
 * Estimated input tax credit from purchases (GST-inclusive cost × default rate).
 * Purchase lines lack explicit GST % — uses settings.defaultProductGstRate.
 */
export function estimateInputGstCredit(purchases, settings = {}) {
  if (!isGstEnabled(settings)) return 0;
  const defaultRate = Math.max(0, num(settings.defaultProductGstRate));
  if (defaultRate <= 0) return 0;
  let total = 0;
  for (const p of Array.isArray(purchases) ? purchases : []) {
    if (!p || typeof p !== "object") continue;
    for (const line of Array.isArray(p.lines) ? p.lines : []) {
      const inclusive = roundMoney2(num(line?.qty) * num(line?.costPerUnit));
      if (inclusive <= 0) continue;
      total += splitInclusiveGst(inclusive, defaultRate).tax;
    }
  }
  return roundMoney2(total);
}

/** Net GST payable to government (output − ITC estimate), floored at zero. */
export function computeNetGstLiability(sales, purchases, settings = {}) {
  const output = computeOutputGstCollected(sales, settings);
  const input = estimateInputGstCredit(purchases, settings);
  return roundMoney2(Math.max(0, output - input));
}

/** Fractional years between two YYYY-MM-DD dates (minimum 0). */
export function yearsBetweenDates(fromYmd, toYmd) {
  const from = String(fromYmd || "").slice(0, 10);
  const to = String(toYmd || "").slice(0, 10);
  if (from.length < 10 || to.length < 10) return 0;
  const d0 = new Date(`${from}T00:00:00`);
  const d1 = new Date(`${to}T00:00:00`);
  if (Number.isNaN(d0.getTime()) || Number.isNaN(d1.getTime())) return 0;
  const ms = d1.getTime() - d0.getTime();
  if (ms <= 0) return 0;
  return ms / (365.25 * 24 * 60 * 60 * 1000);
}

/**
 * Straight-line depreciation to as-of date.
 * `amount` = gross cost; uses manual accumulatedDepreciation when set, else auto from rate % p.a.
 */
export function computeFixedAssetDepreciation(asset, asOfDate = todayStr()) {
  const gross = roundMoney2(num(asset?.amount));
  if (gross <= 0) return { gross: 0, accumulated: 0, netBook: 0 };
  const manual = roundMoney2(Math.min(gross, num(asset?.accumulatedDepreciation)));
  const rate = num(asset?.depreciationRatePct);
  const purchase = String(asset?.purchaseDate || "").slice(0, 10);
  const asOf = String(asOfDate || todayStr()).slice(0, 10);
  let accumulated = manual;
  if (rate > 0 && purchase.length >= 10 && compareYmdAsc(purchase, asOf) <= 0) {
    const years = yearsBetweenDates(purchase, asOf);
    const computed = roundMoney2(Math.min(gross, gross * (rate / 100) * years));
    accumulated = manual > 0 ? manual : computed;
  }
  accumulated = roundMoney2(Math.min(gross, accumulated));
  return { gross, accumulated, netBook: roundMoney2(gross - accumulated) };
}

export function sumFixedAssetsNetBook(accounts, asOfDate = todayStr()) {
  return roundMoney2(
    (Array.isArray(accounts) ? accounts : []).reduce(
      (s, a) => s + computeFixedAssetDepreciation(a, asOfDate).netBook,
      0,
    ),
  );
}

export function sumFixedAssetsGross(accounts) {
  return roundMoney2(
    (Array.isArray(accounts) ? accounts : []).reduce((s, a) => s + num(a?.amount), 0),
  );
}

export function saleOutstandingAsOf(sale, asOfDate) {
  if (!sale || typeof sale !== "object") return 0;
  const invoiceDate = String(sale.date || "").slice(0, 10);
  const asOf = String(asOfDate || todayStr()).slice(0, 10);
  if (invoiceDate.length >= 10 && asOf.length >= 10 && compareYmdAsc(invoiceDate, asOf) > 0) {
    return 0;
  }
  const total = num(sale.totalSale);
  if (total <= 0) return 0;
  const pes = normalizeReceivablePaymentEntries(sale);
  let received = 0;
  for (const pe of pes) {
    const pd = String(pe.date || invoiceDate).slice(0, 10);
    if (pd.length >= 10 && compareYmdAsc(pd, asOf) <= 0) received += num(pe.amount);
  }
  if (!pes.length && num(sale.received) > 0 && compareYmdAsc(invoiceDate, asOf) <= 0) {
    received = num(sale.received);
  }
  return roundMoney2(Math.max(0, total - received));
}

export function sumReceivablesAsOf(sales, asOfDate) {
  return roundMoney2(
    (Array.isArray(sales) ? sales : []).reduce((s, sale) => s + saleOutstandingAsOf(sale, asOfDate), 0),
  );
}

export function purchaseOutstandingAsOf(purchase, asOfDate) {
  if (!purchase || typeof purchase !== "object") return 0;
  const purchaseDate = String(purchase.date || "").slice(0, 10);
  const asOf = String(asOfDate || todayStr()).slice(0, 10);
  if (purchaseDate.length >= 10 && compareYmdAsc(purchaseDate, asOf) > 0) return 0;
  const total = num(purchase.totalAmount);
  if (total <= 0) return 0;
  let paid = 0;
  for (const pe of normalizePurchasePaymentEntries(purchase)) {
    const pd = String(pe.date || purchaseDate).slice(0, 10);
    if (pd.length >= 10 && compareYmdAsc(pd, asOf) <= 0) paid += num(pe.amount);
  }
  return roundMoney2(Math.max(0, total - paid));
}

export function sumPurchaseCreditAsOf(purchases, asOfDate) {
  return roundMoney2(
    (Array.isArray(purchases) ? purchases : []).reduce(
      (s, p) => s + purchaseOutstandingAsOf(p, asOfDate),
      0,
    ),
  );
}

function filterEntriesOnOrBefore(entries, asOfDate) {
  const asOf = String(asOfDate || todayStr()).slice(0, 10);
  return (Array.isArray(entries) ? entries : []).filter((e) => {
    if (!e || typeof e !== "object") return false;
    const d = String(e.date || "").slice(0, 10);
    return d.length < 10 || compareYmdAsc(d, asOf) <= 0;
  });
}

function filterSalesOnOrBefore(sales, asOfDate) {
  const asOf = String(asOfDate || todayStr()).slice(0, 10);
  return (Array.isArray(sales) ? sales : []).filter((s) => {
    if (!s || typeof s !== "object") return false;
    const d = String(s.date || "").slice(0, 10);
    return d.length < 10 || compareYmdAsc(d, asOf) <= 0;
  });
}

function filterPurchasesOnOrBefore(purchases, asOfDate) {
  const asOf = String(asOfDate || todayStr()).slice(0, 10);
  return (Array.isArray(purchases) ? purchases : []).filter((p) => {
    if (!p || typeof p !== "object") return false;
    const d = String(p.date || "").slice(0, 10);
    return d.length < 10 || compareYmdAsc(d, asOf) <= 0;
  });
}

function filterTransfersOnOrBefore(transfers, asOfDate) {
  const asOf = String(asOfDate || todayStr()).slice(0, 10);
  return normBankTransfers(transfers).filter((t) => {
    if (!t || typeof t !== "object") return false;
    const d = String(t.date || "").slice(0, 10);
    return d.length < 10 || compareYmdAsc(d, asOf) <= 0;
  });
}

function filterLoansGivenOnOrBefore(loansGiven, asOfDate) {
  const asOf = String(asOfDate || todayStr()).slice(0, 10);
  return (Array.isArray(loansGiven) ? loansGiven : []).filter((lg) => {
    if (!lg || typeof lg !== "object") return false;
    const d = String(lg.disbursementDate || lg.dateGiven || "").slice(0, 10);
    return d.length < 10 || compareYmdAsc(d, asOf) <= 0;
  });
}

/**
 * Full balance sheet summary including GST liability and equation verification.
 */
export function computeBalanceSheetSummary({
  sales = [],
  purchases = [],
  inventoryEntries = [],
  balance = {},
  settings = {},
  invRows: _invRows = [],
  expenses = [],
  otherIncomes = [],
  loansGiven = [],
  customerAdvancePayments = [],
  asOfDate,
}) {
  const asOf = String(asOfDate || todayStr()).slice(0, 10);
  const isLive = asOf === todayStr();

  const outstanding = isLive
    ? (Array.isArray(sales) ? sales : []).reduce((s, x) => s + (x ? num(x.outstanding) : 0), 0)
    : sumReceivablesAsOf(sales, asOf);

  const entriesForStock = isLive ? inventoryEntries : filterEntriesOnOrBefore(inventoryEntries, asOf);
  const advancesForBs = isLive
    ? normCustomerAdvancePayments(customerAdvancePayments)
    : normCustomerAdvancePayments(customerAdvancePayments).filter((a) => {
        const d = String(a.date || "").slice(0, 10);
        return d.length < 10 || compareYmdAsc(d, asOf) <= 0;
      });
  const customerAdvanceLiability = roundMoney2(
    advancesForBs.reduce((s, a) => s + advanceUnappliedAmount(a), 0),
  );
  const stockRows = computeInvRowsAggregated(entriesForStock);
  const stockVal = stockRows.reduce((s, r) => s + num(r.stockValue), 0);

  const branchesForInv = normBranchesList(settings?.branches);
  const inventoryByBranch = branchesForInv.map((b) => {
    const rows = computeInvRowsForBranch(entriesForStock, b.id, branchesForInv);
    const sv = rows.reduce((s, r) => s + num(r.stockValue), 0);
    return { id: b.id, name: b.name, stockValue: sv };
  });

  const bankAccounts = balance.bankAccounts || [];
  const bankTotal = sumBankAccountBalancesAsOf({
    bankAccounts,
    expenses: isLive ? expenses : filterEntriesOnOrBefore(expenses, asOf),
    sales: isLive ? sales : filterSalesOnOrBefore(sales, asOf),
    transfers: isLive ? balance.bankTransfers : filterTransfersOnOrBefore(balance.bankTransfers, asOf),
    inventoryEntries: entriesForStock,
    otherIncomes: isLive ? otherIncomes : filterEntriesOnOrBefore(otherIncomes, asOf),
    purchases: isLive ? purchases : filterPurchasesOnOrBefore(purchases, asOf),
    loansGiven: isLive ? loansGiven : filterLoansGivenOnOrBefore(loansGiven, asOf),
    customerAdvancePayments: advancesForBs,
    asOfDate: asOf,
    predicate: bankAccountCountsInBalanceSheet,
  });
  const fixedAssetAccounts = balance.fixedAssetAccounts || [];
  const fixedAssetsGross = sumFixedAssetsGross(fixedAssetAccounts);
  const fixedAssets = sumFixedAssetsNetBook(fixedAssetAccounts, asOf);
  const fixedAssetsAccumulated = roundMoney2(fixedAssetsGross - fixedAssets);
  const otherAssets = num(balance.otherAssets);
  const curAssets = roundMoney2(bankTotal + otherAssets + outstanding + stockVal);
  const totalAssets = roundMoney2(curAssets + fixedAssets);

  const purchaseCredit = isLive
    ? sumPurchaseCreditOutstanding(purchases)
    : sumPurchaseCreditAsOf(purchases, asOf);
  const schedule = Array.isArray(balance.loanSchedule) ? balance.loanSchedule : [];
  const loansLiab =
    schedule.length > 0
      ? schedule.reduce((s, ln) => s + (ln && typeof ln === "object" ? num(ln.balance) : 0), 0)
      : num(balance.loans);
  const salesForGst = filterSalesOnOrBefore(sales, asOf);
  const purchasesForGst = filterPurchasesOnOrBefore(purchases, asOf);
  const gstLiability = computeNetGstLiability(salesForGst, purchasesForGst, settings);
  const supplierPayables = num(balance.supplierPayables);
  const totalLiab = roundMoney2(supplierPayables + loansLiab + purchaseCredit + gstLiability + customerAdvanceLiability);
  const netCapital = roundMoney2(totalAssets - totalLiab);
  const ownerCapitalInvested = num(balance.ownerCapitalInvested);
  const retainedOps = roundMoney2(netCapital - ownerCapitalInvested);
  const equityTotal = roundMoney2(ownerCapitalInvested + retainedOps);
  const equationDelta = roundMoney2(totalAssets - (totalLiab + equityTotal));
  const equationBalanced = Math.abs(equationDelta) < 0.02;
  const currentRatio =
    totalLiab > 0.005 ? roundMoney2(curAssets / totalLiab) : curAssets > 0 ? null : 0;
  const netCurrentPosition = roundMoney2(curAssets - totalLiab);

  return {
    asOfDate: asOf,
    isLive,
    outstanding,
    stockVal,
    inventoryByBranch,
    bankTotal,
    curAssets,
    fixedAssets,
    fixedAssetsGross,
    fixedAssetsAccumulated,
    totalAssets,
    purchaseCredit,
    loansLiab,
    gstLiability,
    gstOutput: computeOutputGstCollected(salesForGst, settings),
    gstInputEstimate: estimateInputGstCredit(purchasesForGst, settings),
    supplierPayables,
    customerAdvanceLiability,
    totalLiab,
    netCapital,
    ownerCapitalInvested,
    retainedOps,
    equityTotal,
    equationDelta,
    equationBalanced,
    currentRatio,
    netCurrentPosition,
  };
}

/** True when supplier + invoice ref already exists (duplicate bill entry). */
export function findDuplicatePurchase(purchases, supplierName, invoiceRef, excludeId = null) {
  const sup = String(supplierName || "").trim().toLowerCase();
  const inv = String(invoiceRef || "").trim().toLowerCase();
  if (!sup || !inv) return null;
  const skip = excludeId != null ? String(excludeId) : "";
  for (const p of Array.isArray(purchases) ? purchases : []) {
    if (!p || typeof p !== "object") continue;
    if (skip && String(p.id) === skip) continue;
    if (
      String(p.supplierName || "").trim().toLowerCase() === sup &&
      String(p.invoiceRef || "").trim().toLowerCase() === inv
    ) {
      return p;
    }
  }
  return null;
}

export function stripBankAccountReferences(state, bankAccountId) {
  const id = String(bankAccountId || "").trim();
  if (!id || !state || typeof state !== "object") return state;

  const clearId = (rowId) => (String(rowId || "").trim() === id ? "" : rowId);

  const sales = (state.sales || []).map((s) => {
    if (!s) return s;
    const pes = (s.paymentEntries || []).map((pe) =>
      pe && String(pe.bankAccountId || "").trim() === id ? { ...pe, bankAccountId: "" } : pe,
    );
    return { ...s, paymentEntries: pes, bankAccountId: clearId(s.bankAccountId) };
  });

  const expenses = (state.expenses || []).map((e) =>
    e && String(e.bankAccountId || "").trim() === id ? { ...e, bankAccountId: "" } : e,
  );

  const otherIncomes = (state.otherIncomes || []).map((oi) =>
    oi && String(oi.bankAccountId || "").trim() === id ? { ...oi, bankAccountId: "" } : oi,
  );

  const inventoryEntries = (state.inventoryEntries || []).map((e) =>
    e && String(e.bankAccountId || "").trim() === id ? { ...e, bankAccountId: "" } : e,
  );

  const purchases = (state.purchases || []).map((p) => {
    if (!p) return p;
    const pes = (p.paymentEntries || []).map((pe) =>
      pe && String(pe.bankAccountId || "").trim() === id ? { ...pe, bankAccountId: "" } : pe,
    );
    return { ...p, paymentEntries: pes };
  });

  const loansGiven = (state.loansGiven || []).map((lg) => {
    if (!lg) return lg;
    let next = lg;
    if (String(lg.disbursementBankAccountId || "").trim() === id) {
      next = { ...next, disbursementBankAccountId: "" };
    }
    const reps = (lg.repaymentEntries || []).map((rep) =>
      rep && String(rep.bankAccountId || "").trim() === id ? { ...rep, bankAccountId: "" } : rep,
    );
    return { ...next, repaymentEntries: reps };
  });

  const bankTransfers = (state.balance?.bankTransfers || []).filter(
    (t) => t && String(t.fromAccountId) !== id && String(t.toAccountId) !== id,
  );

  const customerAdvancePayments = normCustomerAdvancePayments(state.customerAdvancePayments).map((a) =>
    a && String(a.bankAccountId || "").trim() === id ? { ...a, bankAccountId: "" } : a,
  );

  return {
    ...state,
    sales,
    expenses,
    otherIncomes,
    inventoryEntries,
    purchases,
    loansGiven,
    customerAdvancePayments,
    balance: {
      ...state.balance,
      bankAccounts: (state.balance?.bankAccounts || []).filter((a) => a && a.id !== id),
      bankTransfers,
    },
  };
}
