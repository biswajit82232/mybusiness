import { findLoanPartnerInDirectory, findLoanPartyInDirectory, todayStr } from "@/domain/index.js";

/**
 * When auth is ready, clear detail screens whose selected id/name no longer exists in state
 * (e.g. after a record was deleted or sync removed it).
 */
export function resetScreenWhenStaleRecords({
  authState,
  screen,
  sales,
  expenses,
  emiEntries,
  customerDirectory,
  vendorDirectory,
  bankAccounts,
  selSaleId,
  selCustomerName,
  selVendorName,
  selExpenseId,
  selExpenseCategory,
  selEmiId,
  selBankAccountId,
  selPurchaseId,
  selOtherIncomeId,
  selLoanGivenId,
  selLoanPartnerKey,
  selLoanPartyKey,
  editingLoanGivenId,
  purchases,
  otherIncomes,
  loansGiven,
  setScreen,
  setSelSaleId,
  setSelCustomerName,
  setSelVendorName,
  setSelExpenseId,
  setSelExpenseCategory,
  setPage,
  setSelEmiId,
  setSelBankAccountId,
  setSelPurchaseId,
  setSelOtherIncomeId,
  setSelLoanGivenId,
  setSelLoanPartnerKey,
  setSelLoanPartyKey,
  setEditingLoanGivenId,
  closeNewLoanGiven,
  /** Clears global-search return marker when bank / customer / vendor detail is forced closed. */
  onClearGlobalSearchReturn,
  /** Resets purchase back-stack when purchase row disappeared (sync). */
  onResetPurchaseNavFromStale,
  /** Resets EMI back-stack when EMI row disappeared (sync). */
  onResetEmiNavFromStale,
  /** Resets sale back-stack when sale row disappeared (sync). */
  onResetSaleNavFromStale,
  /** Resets other-income detail return ref when row disappeared (sync). */
  onResetOtherIncomeDetailFromStale,
  /** Resets expense nav ref when expense row disappeared (sync). */
  onResetExpenseNavFromStale,
}) {
  if (authState !== "ready") return;
  if (screen === "saleDetail" && selSaleId && !(sales || []).some((s) => s && s.id === selSaleId)) {
    onResetSaleNavFromStale?.();
    setScreen(null);
    setSelSaleId(null);
    return;
  }
  if (screen === "customerDetail" && (selCustomerName || "").trim()) {
    const name = (selCustomerName || "").trim();
    const nk = name.toLowerCase();
    const hasSale = (sales || []).some((s) => s && (s.customerName || "").trim().toLowerCase() === nk);
    const hasDir = (customerDirectory || []).some((d) => d && (d.name || "").trim().toLowerCase() === nk);
    if (!hasSale && !hasDir) {
      onClearGlobalSearchReturn?.();
      setScreen(null);
      setSelCustomerName("");
    }
  }
  if (screen === "vendorDetail" && (selVendorName || "").trim()) {
    const name = (selVendorName || "").trim();
    const nk = name.toLowerCase();
    const hasPur = (purchases || []).some((p) => p && (p.supplierName || "").trim().toLowerCase() === nk);
    const hasDir = (vendorDirectory || []).some((d) => d && (d.name || "").trim().toLowerCase() === nk);
    if (!hasPur && !hasDir) {
      onClearGlobalSearchReturn?.();
      setScreen(null);
      setSelVendorName("");
    }
  }
  if (screen === "expenseDetail" && selExpenseId && !(expenses || []).some((e) => e && e.id === selExpenseId)) {
    onResetExpenseNavFromStale?.();
    setScreen(null);
    setPage("expenses");
    setSelExpenseId(null);
    setSelExpenseCategory(null);
  }
  if (screen === "expenseCategory" && !selExpenseCategory) {
    setScreen(null);
    setPage("expenses");
  }
  if (screen === "emiDetail" && (!selEmiId || !(emiEntries || []).some((e) => e && e.id === selEmiId))) {
    onResetEmiNavFromStale?.();
    setScreen(null);
    setSelEmiId(null);
  }
  if (screen === "bankAccountDetail" && selBankAccountId && !(bankAccounts || []).some((a) => a && a.id === selBankAccountId)) {
    onClearGlobalSearchReturn?.();
    setScreen(null);
    setSelBankAccountId(null);
  }
  if (screen === "purchaseDetail" && selPurchaseId && !(purchases || []).some((p) => p && p.id === selPurchaseId)) {
    onResetPurchaseNavFromStale?.();
    setScreen(null);
    setSelPurchaseId(null);
  }
  if (screen === "otherIncomeDetail" && selOtherIncomeId && !(otherIncomes || []).some((x) => x && x.id === selOtherIncomeId)) {
    onResetOtherIncomeDetailFromStale?.();
    setScreen(null);
    setSelOtherIncomeId(null);
  }
  if (screen === "loanGivenDetail" && selLoanGivenId && !(loansGiven || []).some((l) => l && l.id === selLoanGivenId)) {
    setScreen(null);
    setSelLoanGivenId?.(null);
  }
  if (screen === "newLoanGiven" && editingLoanGivenId && !(loansGiven || []).some((l) => l && l.id === editingLoanGivenId)) {
    closeNewLoanGiven?.();
    setEditingLoanGivenId?.(null);
  }
  const asOf = todayStr();
  if (screen === "loanGivenPartnerDetail" && selLoanPartnerKey) {
    if (!findLoanPartnerInDirectory(loansGiven, selLoanPartnerKey, asOf)) {
      setSelLoanPartnerKey?.(null);
      setScreen("loanGivenPartners");
    }
  }
  if (screen === "loanGivenPartyDetail" && selLoanPartyKey) {
    if (!findLoanPartyInDirectory(loansGiven, selLoanPartyKey, asOf)) {
      setSelLoanPartyKey?.(null);
      setScreen("loanGivenPartys");
    }
  }
}
