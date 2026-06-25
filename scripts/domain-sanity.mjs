/**
 * Pure domain invariants — run: npm run test:domain
 * No browser APIs required (do not call readStoredBusinessMonth etc.).
 */
import assert from "node:assert/strict";

import {
  BRANCH_MAIN_ID,
  advanceRecurringDate,
  addDaysStr,
  addMonthsStr,
  aggregateCashflowDaysInMonth,
  aggregateSalesExpensesByMonth,
  bankAccountLabel,
  bankingActivityForAccountInMonth,
  bankTxRowsWithRunningAfter,
  bankingActivityForMonth,
  bundleCostPerUnit,
  bundleStockSufficient,
  buildBankAccountTransactions,
  buildEmiAlertsForEntry,
  buildEmiWhatsAppReminderMessage,
  buildSaleShareWhatsAppMessage,
  CUSTOMER_REVIEWS_URL,
  classifyEmiReminderDiff,
  EMI_REMINDER_DAYS_BEFORE,
  computeAccountActivityNet,
  computeInvRowsAggregated,
  computeInvRowsForBranch,
  compareSalesByInvoiceNo,
  dateSlash,
  digitsOnly,
  effectiveEntryBranchId,
  entityTimeMsFromId,
  buildExistingCustomerPickerRows,
  filterCustomerSuggestRows,
  filterSalesExpensesInvByPeriod,
  findBundleById,
  findInvRowByItemName,
  formatMonthLabel,
  formatMonthLabelCompact,
  fyLabel,
  genInvoiceNo,
  getDefaultBankAccountId,
  getDefaultBranchId,
  inferBankAccountKindFromName,
  isDateInFy,
  isEmiDuePaid,
  isIncomeTaxExpense,
  allocateLoanGivenPaymentInterestFirst,
  applyLoanGivenTypedPayment,
  reconcileLoanGivenRepayments,
  loanGivenInterestOutstandingReconciled,
  deleteLoanGivenRepaymentEntry,
  buildLoanPartnersDirectory,
  buildLoanPartyPickerRows,
  buildLoanPartysDirectory,
  buildLoanPartnerPickerRows,
  resetLoanGivenTimer,
  loanGivenBookValue,
  loanGivenEconomicOutstanding,
  loanGivenInterestCollected,
  fyMonthSequence,
  getExpenseCategoriesList,
  getOtherIncomeCategoriesList,
  hasSaleAddress,
  mergePersistedPayload,
  normAuditEvents,
  normSyncConflictQueue,
  money,
  moneyCgTableCell,
  moneyFull,
  monthKeyFromRecord,
  normBankTransfers,
  normBranchesList,
  normBundlesList,
  normExpensesList,
  normBalance,
  normCustomerDirectory,
  normEmiList,
  normLoansGivenList,
  sumLoansGivenInterestCollected,
  sumLoansGivenPrincipalActive,
  sumLoansGivenPrincipalOutstandingOpen,
  daysBetweenDateStrings,
  loanGivenDaysOnBook,
  loanGivenEstimatedSimpleInterest,
  sumLoansGivenEstimatedInterestToDate,
  loanGivenDueDaysRemaining,
  loanGivenMonthMilestoneNumber,
  loanGivenMonthlyRatePct,
  loanGivenPartnerAccruedInterestOnPrincipal,
  loanGivenPartnerCapitalPercent,
  loanGivenPartnerInterestAllocations,
  loanGivenPartnerMonthlyInterestOnPrincipal,
  loanGivenPartnerShareOfInterestPool,
  loanGivenUsesLegacyPartnerInterestPool,
  inferLoanGivenPartnersInterestBasis,
  normLoanGivenPartners,
  sumLoanGivenPartnersInterestSharePct,
  sumLoanGivenPartnersPrincipal,
  normEmiPaidDates,
  normInventoryList,
  normOtherIncomesList,
  normRecurringList,
  normalizeBankAccountKind,
  normalizePaymentEntries,
  normalizePurchasePaymentEntries,
  normalizeExpenseCategoriesFromPersist,
  normalizeHistoryNav,
  normalizeItemKey,
  normalizeStoredPage,
  normPurchasesList,
  normSaleLineItems,
  normSalesList,
  normServicingCompletions,
  normServicingWaSent,
  num,
  renameInventoryProductInState,
  recognizedCogsForPaymentsAll,
  recognizedCogsForPaymentsInFy,
  recognizedCogsForPaymentsInMonth,
  recognizedCogsForSales,
  resolveExpenseCategory,
  resolveOtherIncomeCategory,
  roundMoney2,
  runWithStableStringifyMemo,
  runWithStableStringifyMemoAsync,
  saleAddressLines,
  saleMatchesSearch,
  saleStatus,
  sanitizePrefix,
  shiftMonthKey,
  stableStringify,
  stockInCashAmount,
  sumAccounts,
  computeTotalLiquid,
  sumBankAccountBalances,
  bankAccountCountsInBalanceSheet,
  bankAccountCountsInLiquidTotal,
  sumExpenseCashOutInMonth,
  sumExpenseCashOutOnDay,
  sumPurchaseCreditOutstanding,
  sumPurchasePaymentsInMonth,
  sumPurchasePaymentsOnDay,
  sumSaleLineItems,
  todayStr,
  sumSalePaymentsAll,
  sumSalePaymentsInFy,
  sumSalePaymentsInMonth,
  sumSalePaymentsOnDay,
  sumStockInCashOutInMonth,
  sumStockInCashOutOnDay,
  sumLoansGivenBookValue,
  waHref,
  waMessageHref,
} from "../src/domain/appModel.js";
import {
  buildServicingAlerts,
  classifyServicingReminderDiff,
  deriveServicingSlots,
  getServicingWaSentAt,
  mergeServicingWaSent,
  partitionUpcomingServicingSlots,
  SERVICING_REMINDER_DAYS_BEFORE,
  SERVICING_REMINDER_DAYS_TWO_BEFORE,
  SERVICING_UPCOMING_DAYS,
} from "../src/domain/servicing.js";
import {
  BACKUP_SCHEMA_VERSION,
  wrapStateForBackup,
  unwrapBackupFilePayload,
} from "../src/domain/backup.js";

function ok(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
  } catch (e) {
    console.error(`  ✗ ${name}`);
    throw e;
  }
}

console.log("domain-sanity:");

ok("stockInCashAmount: purchase-linked row has no cash effect", () => {
  assert.equal(
    stockInCashAmount({ type: "in", qty: 10, costPerUnit: 99, purchaseId: "p1", bankAccountId: "b1" }),
    0,
  );
});

ok("stockInCashAmount: standalone stock-in uses qty × cost", () => {
  assert.equal(stockInCashAmount({ type: "in", qty: 2, costPerUnit: 50 }), 100);
});

ok("stockInCashAmount: opening / out is zero", () => {
  assert.equal(stockInCashAmount({ type: "opening", qty: 5, costPerUnit: 10 }), 0);
  assert.equal(stockInCashAmount({ type: "out", qty: 5, costPerUnit: 10 }), 0);
});

ok("sumPurchaseCreditOutstanding", () => {
  const purchases = [
    { id: "a", outstanding: 100 },
    { id: "b", outstanding: 0.004 },
    { id: "c", outstanding: "12.5" },
  ];
  assert.equal(sumPurchaseCreditOutstanding(purchases), roundMoney2(112.5));
});

ok("normalizePaymentEntries filters invalid rows", () => {
  const sale = {
    date: "2026-04-01",
    paymentEntries: [
      { id: "1", date: "2026-04-02", amount: 10, bankAccountId: "bank1" },
      { id: "2", amount: 0, bankAccountId: "bank1" },
      { id: "3", amount: 5, bankAccountId: "" },
    ],
  };
  const pe = normalizePaymentEntries(sale);
  assert.equal(pe.length, 1);
  assert.equal(pe[0].amount, 10);
});

ok("sumSaleLineItems sums per-line qty × price across rows", () => {
  const t = sumSaleLineItems([
    { qty: 2, salePrice: 100, costPrice: 60 },
    { qty: "3", salePrice: "50", costPrice: "30" },
  ]);
  assert.equal(t.totalSale, 350);
  assert.equal(t.totalCost, 210);
  assert.equal(t.grossProfit, 140);
});

ok("normSaleLineItems: passes through explicit lineItems unchanged in shape", () => {
  const out = normSaleLineItems([{ id: "L1", item: "Widget", qty: "2", salePrice: "10", costPrice: "5" }]);
  assert.equal(out.length, 1);
  assert.equal(out[0].id, "L1");
  assert.equal(out[0].item, "Widget");
  assert.equal(out[0].qty, 2);
  assert.equal(out[0].salePrice, 10);
  assert.equal(out[0].costPrice, 5);
});

ok("normSaleLineItems: synthesizes one line from legacy single fields", () => {
  const out = normSaleLineItems(null, { item: "Legacy", qty: 4, salePrice: 25, costPrice: 12 });
  assert.equal(out.length, 1);
  assert.equal(out[0].item, "Legacy");
  assert.equal(out[0].qty, 4);
  assert.equal(out[0].salePrice, 25);
  assert.equal(out[0].costPrice, 12);
});

ok("normSalesList: legacy single-item sale gets a synthesized lineItems row", () => {
  const [s] = normSalesList([
    {
      id: "leg1",
      date: "2026-04-01",
      item: "Old SKU",
      qty: 3,
      salePrice: 20,
      costPrice: 8,
      totalSale: 60,
      totalCost: 24,
      grossProfit: 36,
    },
  ]);
  assert.equal(Array.isArray(s.lineItems), true);
  assert.equal(s.lineItems.length, 1);
  assert.equal(s.lineItems[0].item, "Old SKU");
  assert.equal(s.lineItems[0].qty, 3);
  assert.equal(s.item, "Old SKU");
  assert.equal(s.totalSale, 60);
});

ok("normSalesList: multi-line sale preserves all rows and mirrors first to legacy fields", () => {
  const [s] = normSalesList([
    {
      id: "m1",
      date: "2026-04-01",
      lineItems: [
        { id: "L1", item: "Apple", qty: 2, salePrice: 50, costPrice: 30 },
        { id: "L2", item: "Banana", qty: 4, salePrice: 20, costPrice: 10 },
      ],
    },
  ]);
  assert.equal(s.lineItems.length, 2);
  assert.equal(s.item, "Apple");
  assert.equal(s.qty, 2);
  assert.equal(s.salePrice, 50);
  assert.equal(s.totalSale, 180);
  assert.equal(s.totalCost, 100);
  assert.equal(s.grossProfit, 80);
});

ok("normSalesList: legacy received + default bank synthesizes one payment line", () => {
  const banks = [{ id: "c1", name: "Cash", kind: "cash" }];
  const [s] = normSalesList(
    [
      {
        id: "s1",
        date: "2026-04-01",
        totalSale: 500,
        received: 200,
        paymentEntries: [],
      },
    ],
    banks,
  );
  assert.equal(s.received, 200);
  assert.equal(s.outstanding, 300);
  assert.equal(s.paymentEntries.length, 1);
  assert.equal(s.paymentEntries[0].amount, 200);
  assert.equal(s.paymentEntries[0].bankAccountId, "c1");
});

ok("sumAccounts sums amount fields", () => {
  assert.equal(roundMoney2(sumAccounts([{ amount: 1.1 }, { amount: 2.2 }])), 3.3);
});

ok("bank account exclude flags filter balance totals", () => {
  const accounts = [
    { id: "a", amount: 100, excludeFromBalanceSheet: false, excludeFromLiquid: false },
    { id: "b", amount: 50, excludeFromBalanceSheet: true, excludeFromLiquid: false },
    { id: "c", amount: 25, excludeFromBalanceSheet: false, excludeFromLiquid: true },
  ];
  assert.equal(sumBankAccountBalances(accounts, bankAccountCountsInBalanceSheet), 125);
  assert.equal(sumBankAccountBalances(accounts, bankAccountCountsInLiquidTotal), 150);
  assert.equal(sumBankAccountBalances(accounts, (a) => bankAccountCountsInBalanceSheet(a) && bankAccountCountsInLiquidTotal(a)), 100);
});

ok("computeTotalLiquid: sums liquid account book balances", () => {
  const accounts = [
    { id: "cash", openingBalance: 100000, amount: 100000, excludeFromLiquid: false },
    { id: "profit", openingBalance: 13897, amount: 13897, excludeFromLiquid: false },
    { id: "hidden", openingBalance: 999, amount: 999, excludeFromLiquid: true },
  ];
  assert.equal(
    computeTotalLiquid({
      bankAccounts: accounts,
      transfers: [],
      expenses: [],
      sales: [],
      inventoryEntries: [],
      otherIncomes: [],
      purchases: [],
      loansGiven: [],
    }),
    113897,
  );
});

ok("sumSalePaymentsInMonth: payment lines by date", () => {
  const sales = [
    {
      id: "x",
      date: "2026-04-01",
      paymentEntries: [{ id: "p", date: "2026-04-15", amount: 40, bankAccountId: "b" }],
    },
  ];
  assert.equal(sumSalePaymentsInMonth(sales, "2026-04"), 40);
});

ok("bankingActivityForMonth: legacy received in invoice month", () => {
  const sales = [{ id: "l", date: "2026-04-10", received: 25, paymentEntries: [] }];
  const { cashIn } = bankingActivityForMonth([], sales, [], [], "2026-04", []);
  assert.equal(cashIn, 25);
});

ok("normalizePurchasePaymentEntries shape", () => {
  const p = {
    date: "2026-04-01",
    paymentEntries: [{ id: "z", date: "2026-04-02", amount: 30, bankAccountId: "bk" }],
  };
  const pe = normalizePurchasePaymentEntries(p);
  assert.equal(pe.length, 1);
  assert.equal(pe[0].amount, 30);
});

ok("normPurchasesList: outstanding = total − paid", () => {
  const [p] = normPurchasesList([
    {
      id: "pur1",
      date: "2026-04-01",
      supplierName: "S",
      lines: [
        { item: "A", qty: 2, costPerUnit: 50 },
        { item: "B", qty: 1, costPerUnit: 100 },
      ],
      paymentEntries: [{ id: "pe1", date: "2026-04-01", amount: 100, bankAccountId: "bk" }],
    },
  ]);
  assert.equal(p.totalAmount, 200);
  assert.equal(p.received, 100);
  assert.equal(p.outstanding, 100);
});

ok("normPurchasesList: totalAmount always from line items", () => {
  const [p] = normPurchasesList([
    {
      id: "pur2",
      date: "2026-04-01",
      supplierName: "S",
      totalAmount: 999,
      lines: [{ item: "A", qty: 2, costPerUnit: 25 }],
      paymentEntries: [],
    },
  ]);
  assert.equal(p.totalAmount, 50);
});

ok("normSalesList: discount reduces totalSale", () => {
  const [s] = normSalesList([
    {
      id: "s-disc",
      date: "2026-04-01",
      customerName: "C",
      lineItems: [{ item: "X", qty: 1, salePrice: 1000, costPrice: 600 }],
      discount: 100,
      received: 0,
    },
  ]);
  assert.equal(s.totalSale, 900);
  assert.equal(s.grossProfit, 300);
});

ok("computeAccountActivityNet: in minus out on one bank", () => {
  const bid = "bank-main";
  const sales = [
    {
      id: "s1",
      paymentEntries: [{ id: "x", date: "2026-04-01", amount: 100, bankAccountId: bid }],
    },
  ];
  const expenses = [{ id: "e1", amount: 40, bankAccountId: bid, date: "2026-04-01", category: "X", description: "" }];
  const net = computeAccountActivityNet(bid, expenses, sales, [], [], [], []);
  assert.equal(net, 60);
});

ok("computeAccountActivityNet: purchase-linked stock does not reduce net (cash via purchase only)", () => {
  const bid = "b";
  const inv = [{ id: "i1", type: "in", date: "2026-04-01", qty: 10, costPerUnit: 5, bankAccountId: bid, purchaseId: "p1" }];
  const net = computeAccountActivityNet(bid, [], [], [], inv, [], []);
  assert.equal(net, 0);
});

ok("aggregateCashflowDaysInMonth: merges same-day in/out", () => {
  const sales = [
    {
      id: "s",
      paymentEntries: [{ id: "p", date: "2026-04-05", amount: 200, bankAccountId: "bk" }],
    },
  ];
  const expenses = [{ id: "e", date: "2026-04-05", amount: 50, bankAccountId: "bk", category: "R", description: "" }];
  const rows = aggregateCashflowDaysInMonth(sales, expenses, [], [], "2026-04", []);
  const apr5 = rows.find(([d]) => d === "2026-04-05");
  assert.ok(apr5);
  assert.equal(apr5[1].cashIn, 200);
  assert.equal(apr5[1].cashOut, 50);
});

ok("buildBankAccountTransactions: purchase payment row", () => {
  const purchases = [
    {
      id: "p1",
      date: "2026-04-01",
      supplierName: "Sup",
      invoiceRef: "INV-1",
      lines: [{ item: "x", qty: 1, costPerUnit: 1 }],
      paymentEntries: [{ id: "pp", date: "2026-04-03", amount: 15, bankAccountId: "bk" }],
    },
  ];
  const rows = buildBankAccountTransactions("bk", [], [], [], [], [], [{ id: "bk", name: "Bank" }], purchases);
  const pp = rows.filter((r) => r.linkKind === "purchasePayment");
  assert.equal(pp.length, 1);
  assert.equal(pp[0].amount, 15);
  assert.equal(pp[0].dir, "out");
});

ok("sumPurchasePaymentsOnDay", () => {
  const purchases = [
    {
      id: "p",
      lines: [{ item: "a", qty: 1, costPerUnit: 1 }],
      paymentEntries: [
        { id: "a", date: "2026-04-06", amount: 7, bankAccountId: "x" },
        { id: "b", date: "2026-04-07", amount: 3, bankAccountId: "x" },
      ],
    },
  ];
  assert.equal(sumPurchasePaymentsOnDay(purchases, "2026-04-06"), 7);
});

ok("roundMoney2 handles float noise", () => {
  assert.equal(roundMoney2(0.1 + 0.2), 0.3);
});

ok("num: non-finite becomes 0", () => {
  assert.equal(num(undefined), 0);
  assert.equal(num(NaN), 0);
  assert.equal(num("12.5"), 12.5);
});

ok("bankTxRowsWithRunningAfter: newest-first register + running after", () => {
  const rows = [
    { id: "a", dir: "in", amount: 50, sortMs: 2 },
    { id: "b", dir: "out", amount: 30, sortMs: 1 },
  ];
  const withRun = bankTxRowsWithRunningAfter(rows, 1000);
  assert.equal(withRun[0].afterBalance, 1000);
  assert.equal(withRun[1].afterBalance, 950);
});

ok("mergePersistedPayload: empty snapshot yields structured state", () => {
  const m = mergePersistedPayload({});
  assert.ok(m && typeof m === "object");
  assert.ok(Array.isArray(m.sales));
  assert.ok(Array.isArray(m.balance?.bankAccounts));
});

ok("saleStatus: fully paid", () => {
  const st = saleStatus({ outstanding: 0, received: 100, date: "2026-04-01" });
  assert.equal(st.text, "PAID");
  assert.equal(st.cls, "s-paid");
});

ok("shiftMonthKey: steps calendar months", () => {
  assert.equal(shiftMonthKey("2026-01", 1), "2026-02");
  assert.equal(shiftMonthKey("2026-12", 1), "2027-01");
  assert.equal(shiftMonthKey("2026-03", -1), "2026-02");
});

ok("getDefaultBankAccountId: prefers cash / petty naming", () => {
  const id = getDefaultBankAccountId([
    { id: "bank1", name: "HDFC Current", kind: "bank" },
    { id: "cash1", name: "Petty", kind: "cash" },
  ]);
  assert.equal(id, "cash1");
});

ok("sumPurchasePaymentsInMonth: by payment line date", () => {
  const purchases = [
    {
      id: "p",
      lines: [{ item: "a", qty: 1, costPerUnit: 1 }],
      paymentEntries: [{ id: "x", date: "2026-05-10", amount: 22, bankAccountId: "bk" }],
    },
  ];
  assert.equal(sumPurchasePaymentsInMonth(purchases, "2026-05"), 22);
  assert.equal(sumPurchasePaymentsInMonth(purchases, "2026-04"), 0);
});

ok("sumStockInCashOutInMonth: standalone vs purchase-linked", () => {
  const standalone = [
    { id: "i1", type: "in", date: "2026-06-01", qty: 1, costPerUnit: 40, bankAccountId: "bk" },
  ];
  const linked = [
    {
      id: "i2",
      type: "in",
      date: "2026-06-02",
      qty: 1,
      costPerUnit: 99,
      bankAccountId: "bk",
      purchaseId: "pur",
    },
  ];
  assert.equal(sumStockInCashOutInMonth(standalone, "2026-06"), 40);
  assert.equal(sumStockInCashOutInMonth(linked, "2026-06"), 0);
});

ok("sanitizePrefix: strips unsafe chars and default MB", () => {
  assert.equal(sanitizePrefix("  ab-cd_12  "), "AB-CD_12");
  assert.equal(sanitizePrefix("@@@"), "MB");
});

ok("moneyCgTableCell: near-zero shows em dash", () => {
  assert.equal(moneyCgTableCell(0), "—");
  assert.equal(moneyCgTableCell(0.001), "—");
});

ok("normBankTransfers: drops invalid rows", () => {
  const rows = normBankTransfers([
    { id: "1", date: "2026-04-01", fromAccountId: "a", toAccountId: "b", amount: 100 },
    { id: "2", date: "2026-04-01", fromAccountId: "a", toAccountId: "a", amount: 50 },
    { id: "3", date: "2026-04-01", fromAccountId: "", toAccountId: "b", amount: 10 },
  ]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].amount, 100);
});

ok("genInvoiceNo: first sequence with sanitized prefix", () => {
  assert.equal(genInvoiceNo([], "inv"), "INV-0001");
  assert.equal(genInvoiceNo([{ invoiceNo: "INV-0003" }], "inv"), "INV-0004");
});

ok("stableStringify: key order is deterministic", () => {
  assert.equal(stableStringify({ b: 1, a: 2 }), '{"a":2,"b":1}');
});

ok("fyLabel", () => {
  assert.equal(fyLabel(2025), "2025-26");
});

ok("bankAccountLabel: known id vs fallback", () => {
  assert.equal(bankAccountLabel([{ id: "z", name: "  Z  " }], "z"), "Z");
  assert.equal(bankAccountLabel([], "x"), "Account");
});

ok("normBranchesList: empty → default main branch", () => {
  const list = normBranchesList([]);
  assert.equal(list.length, 1);
  assert.equal(list[0].id, BRANCH_MAIN_ID);
  assert.equal(list[0].name, "Main");
});

ok("effectiveEntryBranchId / getDefaultBranchId", () => {
  const branches = normBranchesList([]);
  const def = getDefaultBranchId(branches);
  assert.equal(effectiveEntryBranchId({ branchId: "" }, branches), def);
  assert.equal(effectiveEntryBranchId({ branchId: "  b2  " }, branches), "b2");
});

ok("normExpensesList: coerces amount and category", () => {
  const [e] = normExpensesList([{ amount: "12.5", category: "", id: "e1" }]);
  assert.equal(e.amount, 12.5);
  assert.equal(e.category, "Other");
});

ok("normBundlesList: needs ≥2 lines; findBundleById + cost + stock", () => {
  const raw = [
    { id: "bad", name: "X", lines: [{ item: "a", qty: 1 }] },
    {
      id: "good",
      name: "Combo",
      lines: [
        { item: "Bolt", qty: 2 },
        { item: "Nut", qty: 1 },
      ],
    },
  ];
  const bundles = normBundlesList(raw);
  assert.equal(bundles.length, 1);
  assert.equal(bundles[0].id, "good");
  assert.equal(findBundleById(bundles, "good")?.name, "Combo");
  assert.equal(findBundleById(bundles, "missing"), null);

  const inv = [
    { item: "Bolt", avgCost: 10, currentQty: 100 },
    { item: "Nut", avgCost: 4, currentQty: 50 },
  ];
  assert.equal(bundleCostPerUnit(bundles[0], inv), 24);
  assert.equal(bundleStockSufficient(bundles[0], inv, 20), true);
  assert.equal(bundleStockSufficient(bundles[0], inv, 51), false);
});

ok("monthKeyFromRecord + formatMonthLabel (+ compact)", () => {
  assert.equal(monthKeyFromRecord("2026-03-15"), "2026-03");
  assert.equal(formatMonthLabel("2026-04"), "Apr, 2026");
  assert.equal(formatMonthLabelCompact("2026-04"), "Apr '26");
});

ok("inferBankAccountKindFromName + normalizeBankAccountKind", () => {
  assert.equal(inferBankAccountKindFromName("Petty cash"), "cash");
  assert.equal(inferBankAccountKindFromName("HDFC Visa"), "card");
  assert.equal(normalizeBankAccountKind("Any", "bank"), "bank");
  assert.equal(normalizeBankAccountKind("Weird", "not-a-kind"), inferBankAccountKindFromName("Weird"));
});

ok("digitsOnly + waHref (10-digit India)", () => {
  assert.equal(digitsOnly("91-98765 43210"), "919876543210");
  assert.equal(waHref("9876543210"), "https://wa.me/919876543210");
});

ok("normOtherIncomesList: coerces amount", () => {
  const [o] = normOtherIncomesList([{ amount: "9", id: "o1" }]);
  assert.equal(o.amount, 9);
});

ok("recognizedCogsForSales: accrual vs proportional cash", () => {
  const sale = { id: "s", totalSale: 200, totalCost: 100, received: 50 };
  assert.equal(recognizedCogsForSales([sale], true), 100);
  assert.equal(recognizedCogsForSales([sale], false), 25);
});

ok("sumSalePaymentsAll: payment lines + legacy received", () => {
  const sales = [
    { paymentEntries: [{ amount: 10, bankAccountId: "b", date: "2026-01-01" }] },
    { received: 5, paymentEntries: [] },
  ];
  assert.equal(sumSalePaymentsAll(sales), 15);
});

ok("recognizedCogsForPaymentsInMonth: allocates by payment in month", () => {
  const sale = {
    id: "s",
    totalSale: 100,
    totalCost: 40,
    paymentEntries: [{ date: "2026-08-10", amount: 50, bankAccountId: "b" }],
  };
  assert.equal(recognizedCogsForPaymentsInMonth([sale], "2026-08"), 20);
  assert.equal(recognizedCogsForPaymentsInMonth([sale], "2026-07"), 0);
});

ok("computeInvRowsAggregated: qty and avg cost", () => {
  const rows = computeInvRowsAggregated([
    { item: "Widget", type: "in", qty: 10, costPerUnit: 5 },
    { item: "Widget", type: "out", qty: 4 },
  ]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].currentQty, 6);
  assert.equal(roundMoney2(rows[0].avgCost), 5);
});

ok("mergePersistedPayload: invalid input returns null", () => {
  assert.equal(mergePersistedPayload(null), null);
  assert.equal(mergePersistedPayload([]), null);
});

ok("mergePersistedPayload: auditEvents survive round-trip", () => {
  const sample = {
    auditEvents: [
      {
        id: "ae-1",
        at: "2026-04-10T10:00:00.000Z",
        actorId: "user-1",
        entityType: "sales",
        recordId: "s-1",
        action: "create",
        source: "app",
        note: "test",
      },
    ],
  };
  const m = mergePersistedPayload(sample);
  assert.ok(m && Array.isArray(m.auditEvents));
  assert.equal(m.auditEvents.length, 1);
  assert.equal(m.auditEvents[0].entityType, "sales");
  assert.equal(m.auditEvents[0].action, "create");
});

ok("mergePersistedPayload: syncConflictQueue with localPayload preserves preview", () => {
  const sample = {
    syncConflictQueue: [
      {
        id: "cq-1",
        at: "2026-04-10T10:00:00.000Z",
        entityType: "sales",
        recordId: "s-1",
        reason: "version_conflict",
        op: "upsert",
        localPayload: { date: "2026-04-10", total: 123.45 },
      },
    ],
  };
  const m = mergePersistedPayload(sample);
  assert.ok(m && Array.isArray(m.syncConflictQueue));
  assert.equal(m.syncConflictQueue.length, 1);
  const row = m.syncConflictQueue[0];
  assert.equal(row.entityType, "sales");
  assert.equal(row.op, "upsert");
  assert.ok(typeof row.localPayloadPreview === "string");
  assert.ok(row.localPayloadPreview.includes("123.45"));
});

ok("normSyncConflictQueue: caps localPayloadPreview at 4000 chars", () => {
  const big = "x".repeat(10000);
  const out = normSyncConflictQueue([
    { entityType: "sales", recordId: "s-1", localPayloadPreview: big },
  ]);
  assert.equal(out.length, 1);
  assert.equal(out[0].localPayloadPreview.length, 4000);
});

ok("normAuditEvents: drops entries missing required fields", () => {
  const out = normAuditEvents([
    { entityType: "sales", recordId: "s-1", action: "create" },
    { entityType: "", recordId: "s-2", action: "create" },
    { entityType: "sales", recordId: "", action: "create" },
    { entityType: "sales", recordId: "s-3", action: "" },
    null,
    "not-an-object",
  ]);
  assert.equal(out.length, 1);
  assert.equal(out[0].recordId, "s-1");
});

ok("isDateInFy: April FY (fsm=4)", () => {
  assert.equal(isDateInFy("2026-03-20", 4, 2025), true);
  assert.equal(isDateInFy("2026-04-01", 4, 2025), false);
});

ok("advanceRecurringDate: weekly steps 7 days", () => {
  assert.equal(advanceRecurringDate("2026-01-01", "weekly"), "2026-01-08");
  assert.equal(advanceRecurringDate("2026-01-15", "monthly"), "2026-02-15");
});

ok("normRecurringList: invalid frequency → monthly", () => {
  const [r] = normRecurringList([{ id: "r1", frequency: "daily", amount: 10 }]);
  assert.equal(r.frequency, "monthly");
});

ok("sumExpenseCashOutInMonth", () => {
  const ex = [
    { date: "2026-10-05", amount: 12, bankAccountId: "b1", category: "X", description: "" },
    { date: "2026-09-30", amount: 99, bankAccountId: "b1", category: "X", description: "" },
  ];
  assert.equal(sumExpenseCashOutInMonth(ex, "2026-10"), 12);
});

ok("bankingActivityForAccountInMonth: expense out + sale payment in", () => {
  const bid = "bk";
  const { inn, out } = bankingActivityForAccountInMonth(
    [{ date: "2026-11-10", amount: 25, bankAccountId: bid, category: "R", description: "" }],
    [
      {
        paymentEntries: [{ date: "2026-11-12", amount: 80, bankAccountId: bid }],
      },
    ],
    [],
    [],
    [],
    bid,
    "2026-11",
    [],
  );
  assert.equal(out, 25);
  assert.equal(inn, 80);
});

ok("recognizedCogsForPaymentsAll: sums payment-weighted cost", () => {
  const sale = {
    id: "s",
    totalSale: 100,
    totalCost: 30,
    paymentEntries: [{ amount: 50, bankAccountId: "b", date: "2026-01-01" }],
  };
  assert.equal(recognizedCogsForPaymentsAll([sale]), 15);
});

ok("normalizeStoredPage: legacy tab + unknown", () => {
  assert.equal(normalizeStoredPage("sales"), "invoices");
  assert.equal(normalizeStoredPage("dashboard"), "dashboard");
  assert.equal(normalizeStoredPage("not-a-page"), "dashboard");
});

ok("waMessageHref: encodes text query", () => {
  const u = waMessageHref("9876543210", "Hi & test");
  assert.ok(u?.includes("?text="));
  assert.ok(u?.includes(encodeURIComponent("Hi & test")));
  assert.equal(waMessageHref("9876543210", "   "), waHref("9876543210"));
});

ok("addDaysStr / addMonthsStr / dateSlash", () => {
  assert.equal(addDaysStr("2026-01-10", 5), "2026-01-15");
  assert.equal(addMonthsStr("2026-01-15", 1), "2026-02-15");
  assert.equal(dateSlash("2026-03-07"), "07/03/2026");
});

ok("entityTimeMsFromId", () => {
  assert.equal(entityTimeMsFromId("1704067200000_uuid"), 1704067200000);
  assert.equal(entityTimeMsFromId("bad"), 0);
});

ok("computeInvRowsForBranch: filters by branch", () => {
  const branches = normBranchesList([
    { id: BRANCH_MAIN_ID, name: "Main" },
    { id: "east", name: "East" },
  ]);
  const entries = [
    { item: "Bolt", type: "in", qty: 100, costPerUnit: 2, branchId: BRANCH_MAIN_ID },
    { item: "Bolt", type: "in", qty: 5, costPerUnit: 3, branchId: "east" },
  ];
  const mainRows = computeInvRowsForBranch(entries, BRANCH_MAIN_ID, branches);
  const eastRows = computeInvRowsForBranch(entries, "east", branches);
  assert.equal(mainRows.length, 1);
  assert.equal(mainRows[0].currentQty, 100);
  assert.equal(eastRows.length, 1);
  assert.equal(eastRows[0].currentQty, 5);
});

ok("normInventoryList: drops empty item rows", () => {
  assert.equal(normInventoryList([{ item: "  ", id: "x" }]).length, 0);
  assert.equal(normInventoryList([{ item: "SKU", qty: 2 }]).length, 1);
});

ok("sumSalePaymentsInFy: April FY window", () => {
  const inFy = [
    { paymentEntries: [{ date: "2025-07-01", amount: 40, bankAccountId: "b" }] },
  ];
  const outFy = [
    { paymentEntries: [{ date: "2026-04-01", amount: 1, bankAccountId: "b" }] },
  ];
  assert.equal(sumSalePaymentsInFy(inFy, 4, 2025), 40);
  assert.equal(sumSalePaymentsInFy(outFy, 4, 2025), 0);
});

ok("saleMatchesSearch + saleAddressLines", () => {
  assert.equal(saleMatchesSearch({ customerName: "Acme Corp" }, "acme"), true);
  assert.equal(saleMatchesSearch({ customerName: "Other" }, "acme"), false);
  const lines = saleAddressLines({
    customerAddress: "1 Road",
    customerCity: "Kolkata",
    customerState: "WB",
  });
  assert.ok(lines.some((l) => l.includes("Kolkata")));
});

ok("runWithStableStringifyMemo: stable on same object", () => {
  const o = { z: 1, a: 2 };
  runWithStableStringifyMemo(() => {
    assert.equal(stableStringify(o), stableStringify(o));
  });
});

ok("fyMonthSequence: 12 keys from FY start", () => {
  const seq = fyMonthSequence(4, 2025);
  assert.equal(seq.length, 12);
  assert.equal(seq[0], "2025-04");
  assert.equal(seq[11], "2026-03");
});

ok("normalizeHistoryNav: legacy tab + screen remap", () => {
  assert.deepEqual(normalizeHistoryNav({ tab: "sales" }), { page: "invoices", screen: null });
  assert.deepEqual(normalizeHistoryNav({ screen: "ledger" }), { page: "ledger", screen: null });
  assert.deepEqual(normalizeHistoryNav({ page: "invoices", screen: "saleDetail" }), { page: "invoices", screen: "saleDetail" });
  assert.deepEqual(normalizeHistoryNav({ screen: "nope" }), { page: "dashboard", screen: null });
});

ok("expense / other-income category helpers", () => {
  const list = normalizeExpenseCategoriesFromPersist(["Purchase (COGS)", "Rent"]);
  assert.ok(list.includes("Office"));
  assert.ok(list.includes("Other"));
  assert.equal(resolveExpenseCategory("zzz", { expenseCategories: ["Rent", "Other"] }), "Other");
  assert.equal(resolveOtherIncomeCategory("x", { otherIncomeCategories: ["Interest", "Other"] }), "Other");
  assert.ok(getExpenseCategoriesList({ expenseCategories: ["Fuel"] }).includes("Fuel"));
});

ok("isIncomeTaxExpense", () => {
  assert.equal(isIncomeTaxExpense({ category: "Income Tax" }), true);
  assert.equal(isIncomeTaxExpense({ category: "Rent" }), false);
});

ok("money: INR formatting", () => {
  assert.match(money(1000), /1[,.]?000|₹/);
});

ok("sumExpenseCashOutOnDay / sumStockInCashOutOnDay / sumSalePaymentsOnDay", () => {
  const ex = [
    { date: "2026-12-01", amount: 3, bankAccountId: "b", category: "X", description: "" },
    { date: "2026-12-02", amount: 9, bankAccountId: "b", category: "X", description: "" },
  ];
  assert.equal(sumExpenseCashOutOnDay(ex, "2026-12-01"), 3);
  const inv = [{ type: "in", date: "2026-12-03", qty: 2, costPerUnit: 5, bankAccountId: "b" }];
  assert.equal(sumStockInCashOutOnDay(inv, "2026-12-03"), 10);
  const sales = [
    { paymentEntries: [{ date: "2026-12-04", amount: 7, bankAccountId: "b" }] },
  ];
  assert.equal(sumSalePaymentsOnDay(sales, "2026-12-04"), 7);
});

ok("recognizedCogsForPaymentsInFy", () => {
  const sale = {
    id: "s",
    totalSale: 200,
    totalCost: 50,
    paymentEntries: [{ date: "2025-08-01", amount: 100, bankAccountId: "b" }],
  };
  assert.equal(recognizedCogsForPaymentsInFy([sale], 4, 2025), 25);
});

ok("normEmiPaidDates + isEmiDuePaid", () => {
  assert.deepEqual(normEmiPaidDates(["2026-02-01", "2026-01-01", "2026-02-01"]), ["2026-01-01", "2026-02-01"]);
  const emi = { paidDueDates: ["2026-05-10"] };
  assert.equal(isEmiDuePaid(emi, "2026-05-10"), true);
  assert.equal(isEmiDuePaid(emi, "2026-05-11"), false);
});

ok("classifyEmiReminderDiff: EMI reminder boundaries", () => {
  assert.equal(EMI_REMINDER_DAYS_BEFORE, 3);
  assert.equal(classifyEmiReminderDiff(2), null);
  assert.equal(classifyEmiReminderDiff(3), "three-days");
  assert.equal(classifyEmiReminderDiff(4), null);
  assert.equal(classifyEmiReminderDiff(-1), null);
  assert.equal(classifyEmiReminderDiff(null), null);
});

ok("buildEmiAlertsForEntry: one alert at T-3 with WhatsApp link", () => {
  const due = addDaysStr(todayStr(), EMI_REMINDER_DAYS_BEFORE);
  const emi = {
    id: "e1",
    invoiceNo: "MB-0001",
    customerName: "Ravi",
    financeCompany: "HDFC",
    emiAmount: 5000,
    dueDates: [due, addDaysStr(due, 30)],
    paidDueDates: [],
    customerNo1: "9876543210",
  };
  const alerts = buildEmiAlertsForEntry(emi, { businessName: "Acme Traders" });
  assert.equal(alerts.length, 1);
  assert.equal(alerts[0].kind, "emi-due-3d");
  assert.ok(alerts[0].waHref?.includes("wa.me"));
  assert.match(alerts[0].waHref, /wa\.me\/91/);
  assert.match(alerts[0].waHref, /text=/);
  const none = buildEmiAlertsForEntry(
    { ...emi, dueDates: [addDaysStr(due, 1)] },
    { businessName: "Acme" },
  );
  assert.equal(none.length, 0);
});

ok("buildEmiWhatsAppReminderMessage: includes business and due date", () => {
  const due = addDaysStr(todayStr(), EMI_REMINDER_DAYS_BEFORE);
  const msg = buildEmiWhatsAppReminderMessage(
    { customerName: "Ravi", invoiceNo: "MB-1", financeCompany: "HDFC", emiAmount: 1000 },
    due,
    { businessName: "Acme" },
  );
  assert.match(msg, /Acme/);
  assert.match(msg, /3 days/);
  assert.match(msg, /MB-1/);
});

ok("buildSaleShareWhatsAppMessage: includes review link", () => {
  const msg = buildSaleShareWhatsAppMessage(
    { customerName: "Ravi", invoiceNo: "MB-1", outstanding: 25000 },
    { businessName: "Acme" },
  );
  assert.match(msg, /Hi Ravi/);
  assert.match(msg, /Acme/);
  assert.match(msg, /MB-1/);
  assert.match(msg, new RegExp(CUSTOMER_REVIEWS_URL.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});

ok("normCustomerDirectory + hasSaleAddress", () => {
  const [row] = normCustomerDirectory([{ name: "  Zed  ", customerNo1: "1" }]);
  assert.equal(row.name, "Zed");
  assert.equal(normCustomerDirectory([{ name: "" }]).length, 0);
  assert.equal(hasSaleAddress({ customerPincode: "700001" }), true);
  assert.equal(hasSaleAddress({}), false);
});

ok("filterSalesExpensesInvByPeriod: FY + calendar month", () => {
  const sales = [{ date: "2025-08-01", id: "s1" }];
  const fy = filterSalesExpensesInvByPeriod(sales, [], [], [], "fy", 4, 2025, null, null);
  assert.equal(fy.sales.length, 1);
  const sales2 = [{ date: "2026-06-20" }];
  const mo = filterSalesExpensesInvByPeriod(sales2, [], [], [], "month", 4, 2025, "2026-06", null);
  assert.equal(mo.sales.length, 1);
  const moEmpty = filterSalesExpensesInvByPeriod(sales2, [], [], [], "month", 4, 2025, "2026-07", null);
  assert.equal(moEmpty.sales.length, 0);
});

ok("aggregateSalesExpensesByMonth", () => {
  const map = aggregateSalesExpensesByMonth(
    [{ date: "2026-01-10", totalSale: 400, totalCost: 100 }],
    [{ date: "2026-01-12", amount: 50 }],
    [{ date: "2026-01-15", amount: 10 }],
  );
  const jan = map.get("2026-01");
  assert.equal(jan.revenue, 400);
  assert.equal(jan.cogs, 100);
  assert.equal(jan.expenses, 50);
  assert.equal(jan.otherIncome, 10);
});

ok("normBalance: empty snapshot yields default bank accounts", () => {
  const b = normBalance({});
  assert.equal(b.bankAccounts.length, 2);
  assert.ok(b.bankAccounts.every((a) => a.id && a.name));
});

ok("moneyFull: two decimal places", () => {
  assert.match(moneyFull(12.5), /\.(50|5)/);
});

ok("getOtherIncomeCategoriesList", () => {
  assert.ok(getOtherIncomeCategoriesList({ otherIncomeCategories: ["Royalty"] }).includes("Royalty"));
});

ok("buildExistingCustomerPickerRows + filterCustomerSuggestRows", () => {
  const rows = buildExistingCustomerPickerRows(
    [
      { customerName: "Alpha Ltd", date: "2026-02-01" },
      { customerName: "Beta Co", date: "2026-01-01" },
    ],
    [],
  );
  assert.ok(rows.length >= 2);
  const sug = filterCustomerSuggestRows(rows, "al");
  assert.equal(sug[0].displayName, "Alpha Ltd");
});

ok("saleMatchesSearch: matches phone digits", () => {
  assert.equal(
    saleMatchesSearch({ customerName: "X", customerNo1: "+91 98765 43210" }, "98765"),
    true,
  );
});

ok("normEmiList: closed when all dues paid", () => {
  const [emi] = normEmiList([
    {
      invoiceNo: "E1",
      dueDates: ["2026-01-01", "2026-02-01"],
      paidDueDates: ["2026-02-01", "2026-01-01"],
    },
  ]);
  assert.equal(emi.isClosed, true);
  assert.equal(emi.totalInstallments, 2);
});

ok("mergePersistedPayload: legacy loans without partners stay intact", () => {
  const m = mergePersistedPayload({
    settings: { businessName: "Legacy Co" },
    loansGiven: [
      {
        id: "lg-old-1",
        borrowerName: "Ravi",
        principal: 50000,
        principalRepaid: 5000,
        interestOutstanding: 200,
        dateGiven: "2024-01-15",
        interestRateAnnualPct: 2,
        repaymentEntries: [{ id: "r1", date: "2024-06-01", amount: 1000, bankAccountId: "b1" }],
      },
      {
        id: "lg-old-2",
        borrowerName: "Maya",
        principal: 10000,
        closed: true,
      },
    ],
    sales: [],
    expenses: [],
  });
  assert.ok(m);
  assert.equal(m.loansGiven.length, 2);
  const open = m.loansGiven.find((l) => l.id === "lg-old-1");
  assert.equal(open.borrowerName, "Ravi");
  assert.equal(open.principal, 50000);
  assert.equal(open.principalOutstanding, 45000);
  assert.equal(open.interestRateMonthlyPct, 2);
  assert.deepEqual(open.partners, []);
  assert.equal(open.partnersInterestBasis, "principalMonthly");
  assert.equal(open.repaymentEntries.length, 1);
  assert.equal(open.repaymentEntries[0].amount, 1000);
  const closed = m.loansGiven.find((l) => l.id === "lg-old-2");
  assert.equal(closed.closed, true);
  assert.equal(closed.principalOutstanding, 0);
  assert.equal(m.settings.notifyLoanMonthMilestone, true);
});

ok("normLoanGivenPartners: legacy shareKind percent → amount given", () => {
  const partners = normLoanGivenPartners(
    [{ id: "p1", name: "A", shareKind: "percent", sharePercent: 50 }],
    100000,
  );
  assert.equal(partners.length, 1);
  assert.equal(partners[0].amountGiven, 50000);
});

ok("inferLoanGivenPartnersInterestBasis: legacy pool split vs monthly rates", () => {
  const pool = normLoanGivenPartners(
    [
      { id: "a", name: "A", amountGiven: 40000, interestSharePct: 60 },
      { id: "b", name: "B", amountGiven: 25000, interestSharePct: 40 },
    ],
    100000,
  );
  assert.equal(inferLoanGivenPartnersInterestBasis(pool), "legacyPool");
  const monthly = normLoanGivenPartners(
    [
      { id: "a", name: "Sumon", amountGiven: 100000, interestSharePct: 2 },
      { id: "b", name: "Baba", amountGiven: 0, interestSharePct: 6 },
    ],
    100000,
  );
  assert.equal(inferLoanGivenPartnersInterestBasis(monthly), "principalMonthly");
});

ok("normLoansGivenList + balance sheet book value", () => {
  const [a, b] = normLoansGivenList([
    { id: "1", borrowerName: "Ada", principal: 10000, principalRepaid: 2500, interestOutstanding: 100 },
    { id: "2", borrowerName: "Bob", principal: 5000, closed: true },
  ]);
  assert.equal(a.principalOutstanding, 7500);
  assert.equal(a.trackOnBalanceSheet, true);
  assert.equal(loanGivenBookValue(a), 7500);
  assert.equal(loanGivenBookValue(b), 0);
  assert.equal(sumLoansGivenBookValue([a, b]), 7500);
});

ok("loanGiven detail helpers: days, interest estimate, due offset", () => {
  assert.equal(daysBetweenDateStrings("2026-01-01", "2026-01-10"), 9);
  assert.equal(daysBetweenDateStrings("2026-01-01", "2026-01-01"), 0);
  const rowMonthly = {
    dateGiven: "2026-01-01",
    principal: 10000,
    principalRepaid: 0,
    principalOutstanding: 10000,
    interestRateMonthlyPct: 1,
    closed: false,
  };
  assert.equal(loanGivenDaysOnBook(rowMonthly, "2026-01-11"), 10);
  const est = loanGivenEstimatedSimpleInterest(rowMonthly, "2026-01-11");
  assert.ok(est > 33 && est < 33.34);
  assert.equal(loanGivenMonthlyRatePct({ interestRateMonthlyPct: 7 }), 7);
  assert.equal(loanGivenMonthlyRatePct({ interestRateAnnualPct: 12 }), 12);
  assert.equal(loanGivenDueDaysRemaining({ dueDate: "2026-01-15" }, "2026-01-10"), 5);
  assert.equal(loanGivenDueDaysRemaining({ dueDate: "2026-01-05" }, "2026-01-10"), -5);
  const openLoan = { dateGiven: "2026-01-01", closed: false };
  assert.equal(loanGivenMonthMilestoneNumber(openLoan, "2026-01-29"), 0);
  assert.equal(loanGivenMonthMilestoneNumber(openLoan, "2026-01-31"), 1);
  assert.equal(loanGivenMonthMilestoneNumber(openLoan, "2026-03-02"), 2);
  assert.equal(loanGivenMonthMilestoneNumber({ ...openLoan, closed: true }, "2026-01-31"), 0);
});

ok("applyLoanGivenTypedPayment: interest vs principal", () => {
  const loan = {
    id: "lg1",
    principal: 10000,
    principalRepaid: 0,
    interestOutstanding: 500,
    repaymentEntries: [],
  };
  const afterInt = applyLoanGivenTypedPayment(loan, { amount: 200, date: "2026-05-27", kind: "interest" });
  assert.equal(afterInt.interestOutstanding, 300);
  assert.equal(afterInt.principalRepaid, 0);
  const afterPrin = applyLoanGivenTypedPayment(afterInt, { amount: 100, date: "2026-05-28", kind: "principal" });
  assert.equal(afterPrin.principalRepaid, 100);
  assert.equal(afterPrin.closed, false);
});

ok("applyLoanGivenTypedPayment: interest with zero IO auto-derives from estimated accrued", () => {
  // Loan with no interest in books — payment should still reduce interestOutstanding
  // using estimated accrued interest as the base.
  const loan = {
    id: "lg3",
    principal: 10000,
    principalRepaid: 0,
    interestOutstanding: 0,     // nothing in books yet
    interestRateMonthlyPct: 2,
    dateGiven: "2026-01-01",    // ~4 months back from May; est ≈ 10000*0.02*(≥120/30) ≥ 240
    repaymentEntries: [],
  };
  // Record interest of 500 on a date well into the loan; effectiveIO > 500 → IO > 0 after payment.
  const after1 = applyLoanGivenTypedPayment(loan, { amount: 500, date: "2026-05-28", kind: "interest" });
  // est ≈ 10000*0.02*(147/30) ≈ 980. effective = 980 - 0 (no prior payments) = 980. IO = 980-500 = 480.
  assert.ok(after1.interestOutstanding > 0, "IO should be positive after partial interest payment");
  assert.equal(after1.repaymentEntries.length, 1);

  // Second payment clears the remainder
  const after2 = applyLoanGivenTypedPayment(after1, { amount: after1.interestOutstanding, date: "2026-05-28", kind: "interest" });
  assert.equal(after2.interestOutstanding, 0);
  assert.equal(after2.closed, false); // principal not paid yet
});

ok("applyLoanGivenTypedPayment: interest with zero IO and no rate stays zero", () => {
  // No rate means no estimated interest → payment is logged but IO stays 0
  const loan = { id: "lg4", principal: 5000, principalRepaid: 0, interestOutstanding: 0, interestRateMonthlyPct: 0, dateGiven: "2026-01-01", repaymentEntries: [] };
  const after = applyLoanGivenTypedPayment(loan, { amount: 200, date: "2026-05-28", kind: "interest" });
  assert.equal(after.interestOutstanding, 0);  // no rate → no auto-book
  assert.equal(after.repaymentEntries.length, 1);
});

ok("applyLoanGivenTypedPayment: marks settled when principal and interest cleared", () => {
  const loan = {
    id: "lg2",
    principal: 5000,
    principalRepaid: 4900,
    interestOutstanding: 100,
    repaymentEntries: [],
  };
  const afterInt = applyLoanGivenTypedPayment(loan, { amount: 100, date: "2026-05-27", kind: "interest" });
  assert.equal(afterInt.interestOutstanding, 0);
  assert.equal(afterInt.closed, false);
  const afterPrin = applyLoanGivenTypedPayment(afterInt, { amount: 100, date: "2026-05-28", kind: "principal" });
  assert.equal(afterPrin.principalRepaid, 5000);
  assert.equal(afterPrin.closed, true);
});

ok("reconcileLoanGivenRepayments: interest books sync with typed payments", () => {
  const loan = {
    id: "lg-sync",
    borrowerName: "Test",
    principal: 7000,
    principalRepaid: 0,
    interestOutstanding: 500,
    interestRateMonthlyPct: 0,
    dateGiven: "2026-01-01",
    repaymentEntries: [],
  };
  const afterInt = applyLoanGivenTypedPayment(loan, { amount: 200, date: "2026-05-28", kind: "interest" });
  assert.equal(afterInt.interestOutstanding, 300);
  assert.equal(afterInt.principalRepaid, 0);
  assert.equal(loanGivenInterestCollected(afterInt), 200);

  const afterPrin = applyLoanGivenTypedPayment(afterInt, { amount: 1000, date: "2026-05-28", kind: "principal" });
  assert.equal(afterPrin.interestOutstanding, 300);
  assert.equal(afterPrin.principalRepaid, 1000);
  assert.equal(loanGivenEconomicOutstanding(afterPrin), 6300);

  const afterDel = deleteLoanGivenRepaymentEntry(afterPrin, afterPrin.repaymentEntries[0].id);
  assert.equal(afterDel.interestOutstanding, 500);
  assert.equal(afterDel.principalRepaid, 1000);
});

ok("normLoansGivenList: re-syncs principal and interest books from typed payments on load", () => {
  const rows = normLoansGivenList([
    {
      id: "lg-norm",
      borrowerName: "A",
      principal: 10000,
      principalRepaid: 8000,
      interestOutstanding: 300,
      repaymentEntries: [
        { id: "p1", amount: 2000, date: "2026-05-01", paymentKind: "principal" },
        { id: "i1", amount: 200, date: "2026-05-02", paymentKind: "interest" },
      ],
    },
  ]);
  assert.equal(rows[0].principalRepaid, 2000);
  assert.equal(rows[0].principalOutstanding, 8000);
  assert.equal(rows[0].interestOutstanding, 300);
});

ok("sumLoansGivenPrincipalOutstandingOpen: open loans only", () => {
  const rows = normLoansGivenList([
    { id: "a", borrowerName: "A", principal: 10000, principalRepaid: 2000, closed: false },
    { id: "b", borrowerName: "B", principal: 5000, closed: true },
  ]);
  assert.equal(sumLoansGivenPrincipalActive(rows), 10000);
  assert.equal(sumLoansGivenPrincipalOutstandingOpen(rows), 8000);
});

ok("buildLoanPartyPickerRows: one row per name; newest loan phone wins", () => {
  const rows = buildLoanPartyPickerRows([
    { borrowerName: "Amit", phone: "111", dateGiven: "2026-01-01" },
    { borrowerName: "Amit", phone: "999", dateGiven: "2026-05-01" },
    { borrowerName: "Priya", phone: "", dateGiven: "2026-03-01" },
  ]);
  assert.equal(rows.length, 2);
  const amit = rows.find((r) => r.displayName === "Amit");
  assert.equal(amit.phone, "999");
  assert.equal(amit.id, "lp:amit");
});

ok("buildLoanPartysDirectory: same name merges into one party", () => {
  const dir = buildLoanPartysDirectory(
    [
      { id: "l1", borrowerName: "Amit", phone: "111", principal: 10000, dateGiven: "2026-01-01" },
      { id: "l2", borrowerName: "amit", phone: "999", principal: 20000, dateGiven: "2026-06-01" },
    ],
    "2026-06-15",
  );
  assert.equal(dir.length, 1);
  assert.equal(dir[0].loans.length, 2);
  assert.equal(dir[0].totalPrincipal, 30000);
  assert.equal(dir[0].phone, "999");
});

ok("buildLoanPartnerPickerRows: dedupes partner names with last amount/rate", () => {
  const rows = buildLoanPartnerPickerRows([
    {
      dateGiven: "2026-01-01",
      partners: [{ name: "Raj", amountGiven: 10000, interestSharePct: 1 }],
    },
    {
      dateGiven: "2026-06-01",
      partners: [{ name: "Raj", amountGiven: 20000, interestSharePct: 2 }],
    },
  ]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].displayName, "Raj");
  assert.equal(rows[0].amountGiven, "20000");
  assert.equal(rows[0].interestSharePct, "2");
  const hits = filterCustomerSuggestRows(rows, "ra");
  assert.equal(hits.length, 1);
});

ok("buildLoanPartnersDirectory: aggregates by partner name", () => {
  const dir = buildLoanPartnersDirectory(
    [
      {
        id: "l1",
        borrowerName: "A",
        principal: 100000,
        partners: [{ id: "p1", name: "Raj", amountGiven: 50000, interestSharePct: 2 }],
      },
      {
        id: "l2",
        borrowerName: "B",
        principal: 50000,
        partners: [{ id: "p2", name: "Raj", amountGiven: 25000, interestSharePct: 1 }],
      },
    ],
    "2026-05-27",
  );
  assert.equal(dir.length, 1);
  assert.equal(dir[0].name, "Raj");
  assert.equal(dir[0].totalAmountGiven, 75000);
  assert.equal(dir[0].loans.length, 2);
});

ok("resetLoanGivenTimer: moves dateGiven to as-of", () => {
  const row = resetLoanGivenTimer({ dateGiven: "2024-01-01", closed: true }, "2026-05-27");
  assert.equal(row.dateGiven, "2026-05-27");
  assert.equal(row.closed, false);
});

ok("allocateLoanGivenPaymentInterestFirst", () => {
  const a = allocateLoanGivenPaymentInterestFirst({
    principal: 10000,
    prevPrincipalRepaid: 0,
    prevRepaymentLineSum: 0,
    newRepaymentLineSum: 300,
    interestOutstandingForm: 200,
    principalRepaidForm: 0,
  });
  assert.equal(a.interestOutstanding, 0);
  assert.equal(a.principalRepaid, 100);

  const b = allocateLoanGivenPaymentInterestFirst({
    principal: 10000,
    prevPrincipalRepaid: 0,
    prevRepaymentLineSum: 0,
    newRepaymentLineSum: 500,
    interestOutstandingForm: 200,
    principalRepaidForm: 0,
  });
  assert.equal(b.interestOutstanding, 0);
  assert.equal(b.principalRepaid, 300);

  const c = allocateLoanGivenPaymentInterestFirst({
    principal: 10000,
    prevPrincipalRepaid: 1000,
    prevRepaymentLineSum: 500,
    newRepaymentLineSum: 500,
    interestOutstandingForm: 400,
    principalRepaidForm: 1000,
  });
  assert.equal(c.interestOutstanding, 400);
  assert.equal(c.principalRepaid, 1000);

  const d = allocateLoanGivenPaymentInterestFirst({
    principal: 10000,
    prevPrincipalRepaid: 0,
    prevRepaymentLineSum: 0,
    newRepaymentLineSum: 0,
    interestOutstandingForm: 250,
    principalRepaidForm: 0,
  });
  assert.equal(d.interestOutstanding, 250);
  assert.equal(d.principalRepaid, 0);

  const e = allocateLoanGivenPaymentInterestFirst({
    principal: 10000,
    prevPrincipalRepaid: 0,
    prevRepaymentLineSum: 0,
    newRepaymentLineSum: 0,
    interestOutstandingForm: 100,
    principalRepaidForm: 400,
  });
  assert.equal(e.interestOutstanding, 0);
  assert.equal(e.principalRepaid, 300);
});

ok("normLoanGivenPartners: amount given and %/month on loan principal", () => {
  const partners = normLoanGivenPartners(
    [
      { id: "p1", name: "Sumon", amountGiven: 100000, interestSharePct: 2 },
      { id: "p2", name: "Baba", amountGiven: 0, interestSharePct: 6 },
    ],
    100000,
  );
  assert.equal(partners.length, 2);
  const loan = {
    principal: 100000,
    principalOutstanding: 100000,
    dateGiven: "2026-01-01",
    closed: false,
    partnersInterestBasis: "principalMonthly",
    repaymentEntries: [{ id: "r1", date: "2026-02-01", amount: 800, bankAccountId: "b1" }],
    principalRepaid: 500,
    partners,
  };
  assert.equal(loanGivenPartnerMonthlyInterestOnPrincipal(partners[0], loan), 2000);
  assert.equal(loanGivenPartnerMonthlyInterestOnPrincipal(partners[1], loan), 6000);
  assert.equal(loanGivenPartnerAccruedInterestOnPrincipal(partners[0], loan, "2026-01-16"), 1000);
  assert.equal(loanGivenInterestCollected(loan), 300);
  assert.equal(loanGivenPartnerShareOfInterestPool(partners[0], partners, loan, 300), 75);
  assert.equal(loanGivenPartnerShareOfInterestPool(partners[1], partners, loan, 300), 225);
  const alloc = loanGivenPartnerInterestAllocations(loan);
  assert.equal(alloc[0].amount, 75);
});

ok("legacy pool partners: preserved basis and pool split on collected interest", () => {
  const partners = normLoanGivenPartners(
    [
      { id: "p1", name: "A", amountGiven: 40000, interestSharePct: 60 },
      { id: "p2", name: "B", amountGiven: 25000, interestSharePct: 40 },
    ],
    100000,
  );
  const [loan] = normLoansGivenList([
    {
      id: "lg-pool",
      borrowerName: "X",
      principal: 100000,
      dateGiven: "2026-01-01",
      interestRateMonthlyPct: 2,
      repaymentEntries: [{ id: "r1", date: "2026-02-01", amount: 500, bankAccountId: "b1" }],
      partners,
    },
  ]);
  assert.equal(loan.partnersInterestBasis, "legacyPool");
  assert.ok(loanGivenUsesLegacyPartnerInterestPool(loan));
  assert.equal(loanGivenPartnerShareOfInterestPool(partners[0], partners, loan, 300), 180);
  assert.equal(loanGivenPartnerShareOfInterestPool(partners[1], partners, loan, 300), 120);
});

ok("loanGiven balance sheet toggle + interest collected", () => {
  const [off] = normLoansGivenList([
    {
      id: "z",
      borrowerName: "Zed",
      principal: 5000,
      principalRepaid: 0,
      interestOutstanding: 200,
      trackOnBalanceSheet: false,
    },
  ]);
  assert.equal(off.trackOnBalanceSheet, false);
  assert.equal(loanGivenBookValue(off), 0);
  assert.equal(loanGivenEconomicOutstanding(off), 5200);

  const paid = {
    repaymentEntries: [
      { id: "r1", date: "2026-02-01", amount: 800, bankAccountId: "b1" },
    ],
    principalRepaid: 500,
  };
  assert.equal(loanGivenInterestCollected(paid), 300);
  assert.equal(sumLoansGivenInterestCollected([paid, { repaymentEntries: [], principalRepaid: 0 }]), 300);

  const typed = {
    repaymentEntries: [
      { id: "p1", date: "2026-02-01", amount: 600, bankAccountId: "b1", paymentKind: "principal" },
      { id: "i1", date: "2026-02-01", amount: 200, bankAccountId: "b1", paymentKind: "interest" },
    ],
    principalRepaid: 5000,
  };
  assert.equal(loanGivenInterestCollected(typed), 200);

  const mix = normLoansGivenList([
    { id: "1", borrowerName: "A", principal: 1000, closed: false },
    { id: "2", borrowerName: "B", principal: 500, closed: true },
  ]);
  assert.equal(sumLoansGivenPrincipalActive(mix), 1000);

  const estRows = normLoansGivenList([
    {
      id: "e1",
      borrowerName: "E1",
      principal: 10000,
      principalRepaid: 0,
      interestRateMonthlyPct: 3,
      dateGiven: "2026-01-01",
    },
  ]);
  const sumEst = sumLoansGivenEstimatedInterestToDate(estRows, "2026-01-11");
  assert.ok(sumEst > 99 && sumEst < 101);
});

ok("normalizeItemKey + findInvRowByItemName: case and space insensitive", () => {
  assert.equal(normalizeItemKey("  Widget  Pro  "), "widget pro");
  const rows = [
    { item: "Widget Pro", currentQty: 5, avgCost: 100 },
    { item: "Cable", currentQty: 2, avgCost: 50 },
  ];
  const hit = findInvRowByItemName(rows, "widget   pro");
  assert.ok(hit);
  assert.equal(hit.item, "Widget Pro");
  assert.equal(findInvRowByItemName(rows, "missing"), null);
});

ok("renameInventoryProductInState: updates inventory, sales, bundles", () => {
  const state = {
    inventoryEntries: [{ id: "1", item: "Old Bat", qty: 2, type: "in" }],
    sales: [{ id: "s1", item: "Old Bat", lineItems: [{ id: "l1", item: "Old Bat", qty: 1 }] }],
    bundles: [{ id: "b1", name: "Pack", lines: [{ item: "Old Bat", qty: 1 }] }],
    purchases: [{ id: "p1", lines: [{ item: "Old Bat", qty: 1, costPerUnit: 10 }] }],
  };
  const next = renameInventoryProductInState(state, "old bat", "30AH lithium battery");
  assert.equal(next.inventoryEntries[0].item, "30AH lithium battery");
  assert.equal(next.sales[0].item, "30AH lithium battery");
  assert.equal(next.sales[0].lineItems[0].item, "30AH lithium battery");
  assert.equal(next.bundles[0].lines[0].item, "30AH lithium battery");
  assert.equal(next.purchases[0].lines[0].item, "30AH lithium battery");
});

ok("compareSalesByInvoiceNo: higher sequence sorts first", () => {
  const settings = { invoicePrefix: "MB", billOfSupplyPrefix: "BOS" };
  const sales = [
    { id: "a", invoiceNo: "MB-0001", date: "2026-03-01", docType: "invoice" },
    { id: "b", invoiceNo: "MB-0010", date: "2026-01-01", docType: "invoice" },
    { id: "c", invoiceNo: "BOS-0003", date: "2026-02-01", docType: "billOfSupply" },
  ];
  const sorted = [...sales].sort((a, b) => compareSalesByInvoiceNo(a, b, settings));
  assert.equal(sorted[0].id, "b");
  assert.equal(sorted[1].id, "c");
  assert.equal(sorted[2].id, "a");
});

ok("mergePersistedPayload: legacy bundles + servicingCompletions preserved", () => {
  const m = mergePersistedPayload({
    settings: {
      businessName: "Upgrade Co",
      bundles: [
        {
          id: "b1",
          name: "Kit A",
          lines: [
            { item: "Widget", qty: 2 },
            { item: "Cable", qty: 1 },
          ],
        },
      ],
    },
    sales: [
      {
        id: "s1",
        invoiceNo: "MB-0001",
        date: "2026-01-01",
        bundleId: "b1",
        customerName: "A",
        item: "Kit A",
        qty: 1,
        salePrice: 1000,
        costPrice: 500,
        receivedAmount: 1000,
      },
    ],
    servicingCompletions: [{ saleId: "s1", serviceNum: 1, completedDate: "2026-02-01" }],
    loansGiven: [{ id: "lg1", borrowerName: "Old", principal: 1000 }],
  });
  assert.ok(m);
  assert.equal(m.settings.bundles.length, 1);
  assert.equal(m.settings.bundles[0].name, "Kit A");
  assert.equal(m.sales[0].bundleId, "b1");
  assert.equal(m.servicingCompletions.length, 1);
  assert.equal(m.servicingCompletions[0].serviceNum, 1);
  assert.equal(m.loansGiven.length, 1);
  const slots = deriveServicingSlots(m.sales, m.servicingCompletions, "2026-06-01");
  assert.ok(slots.some((s) => s.saleId === "s1" && s.serviceNum === 1 && s.completed));
  const alerts = buildServicingAlerts(slots, { businessName: "Upgrade Co" });
  assert.ok(Array.isArray(alerts));
});

ok("normServicingCompletions: drops invalid rows", () => {
  const out = normServicingCompletions([
    { saleId: "s1", serviceNum: 2, completedDate: "2026-03-01" },
    { saleId: "", serviceNum: 1 },
    { saleId: "s2", serviceNum: 99 },
  ]);
  assert.equal(out.length, 2);
  assert.equal(out[0].serviceNum, 2);
  assert.equal(out[1].serviceNum, 3);
});

ok("classifyServicingReminderDiff: T-3, T-2, today, overdue only", () => {
  assert.equal(classifyServicingReminderDiff(SERVICING_REMINDER_DAYS_BEFORE), "three-days");
  assert.equal(classifyServicingReminderDiff(SERVICING_REMINDER_DAYS_TWO_BEFORE), "two-days");
  assert.equal(classifyServicingReminderDiff(0), "today");
  assert.equal(classifyServicingReminderDiff(-1), "overdue");
  assert.equal(classifyServicingReminderDiff(1), null);
  assert.equal(classifyServicingReminderDiff(4), null);
  assert.equal(classifyServicingReminderDiff(null), null);
});

ok("buildServicingAlerts: one alert at T-2 with WhatsApp link", () => {
  const due = addDaysStr(todayStr(), SERVICING_REMINDER_DAYS_TWO_BEFORE);
  const slots = [
    {
      id: "svc-s1-1",
      saleId: "s1",
      invoiceNo: "MB-0001",
      customerName: "Ravi",
      customerNo1: "9876543210",
      phone: "9876543210",
      item: "Widget",
      serviceNum: 1,
      dueDate: due,
      completed: false,
    },
  ];
  const alerts = buildServicingAlerts(slots, { businessName: "Acme Traders" });
  assert.equal(alerts.length, 1);
  assert.equal(alerts[0].kind, "servicing-due-2d");
  assert.match(alerts[0].title, /2 days/);
  assert.ok(alerts[0].waHref?.includes("wa.me"));
});

ok("mergePersistedPayload: notifyServicingDueTwoDays defaults on", () => {
  const m = mergePersistedPayload({ settings: { businessName: "Co" } });
  assert.equal(m.settings.notifyServicingDue, true);
  assert.equal(m.settings.notifyServicingDueTwoDays, true);
  const off = mergePersistedPayload({
    settings: { notifyServicingDueTwoDays: false },
  });
  assert.equal(off.settings.notifyServicingDueTwoDays, false);
});

ok("partitionUpcomingServicingSlots: today through 7 days, not overdue", () => {
  const today = todayStr();
  const in3 = addDaysStr(today, 3);
  const in7 = addDaysStr(today, SERVICING_UPCOMING_DAYS);
  const in8 = addDaysStr(today, SERVICING_UPCOMING_DAYS + 1);
  const overdue = addDaysStr(today, -2);
  const slots = [
    { id: "a", dueDate: in3, completed: false },
    { id: "b", dueDate: in7, completed: false },
    { id: "c", dueDate: in8, completed: false },
    { id: "d", dueDate: overdue, completed: false },
    { id: "e", dueDate: in3, completed: true },
  ];
  const up = partitionUpcomingServicingSlots(slots);
  assert.equal(up.length, 2);
  assert.equal(up[0].id, "a");
  assert.equal(up[1].id, "b");
});

ok("getServicingWaSentAt + mergeServicingWaSent", () => {
  const sent = normServicingWaSent([{ saleId: "s1", serviceNum: 2, sentAt: "2026-06-01" }]);
  assert.equal(getServicingWaSentAt(sent, "s1", 2), "2026-06-01");
  assert.equal(getServicingWaSentAt(sent, "s1", 1), "");
  const merged = mergeServicingWaSent(sent, [{ saleId: "s1", serviceNum: 2, sentAt: "2026-06-10" }]);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].sentAt, "2026-06-10");
});

ok("mergePersistedPayload: servicingWaSent preserved", () => {
  const m = mergePersistedPayload({
    servicingWaSent: [{ saleId: "s1", serviceNum: 1, sentAt: "2026-06-20" }],
  });
  assert.equal(m.servicingWaSent.length, 1);
  assert.equal(m.servicingWaSent[0].sentAt, "2026-06-20");
});

ok("backup envelope: wrap and unwrap versioned export", () => {
  const state = { settings: { businessName: "Test Co" }, sales: [] };
  const wrapped = wrapStateForBackup(state, "5.0.0");
  assert.equal(wrapped.schemaVersion, BACKUP_SCHEMA_VERSION);
  assert.equal(wrapped.appVersion, "5.0.0");
  assert.ok(typeof wrapped.exportedAt === "string");
  assert.deepEqual(wrapped.data, state);
  const unwrapped = unwrapBackupFilePayload(wrapped);
  assert.deepEqual(unwrapped, state);
  const legacy = unwrapBackupFilePayload(state);
  assert.deepEqual(legacy, state);
});

ok("backup envelope: invalid payloads return null", () => {
  assert.equal(unwrapBackupFilePayload(null), null);
  assert.equal(unwrapBackupFilePayload([]), null);
  assert.equal(unwrapBackupFilePayload("x"), null);
});

await runWithStableStringifyMemoAsync(async () => {
  const o = { k: 1 };
  assert.equal(stableStringify(o), stableStringify(o));
});
console.log("  ✓ runWithStableStringifyMemoAsync");

console.log("domain-sanity: all checks passed — ok");
