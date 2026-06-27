import { useMemo } from "react";
import {
  EXPENSE_CATEGORY_ALL,
  num,
  recognizedCogsForSales,
  recognizedCogsForPaymentsInMonth,
  recognizedCogsForPaymentsInFy,
  computeTotalLiquid,
  sumSalePaymentsInMonth,
  sumSalePaymentsInFy,
  sumExpenseCashOutInMonth,
  sumExpenseCashOutInFy,
  sumOtherIncomeCashInInMonth,
  sumOtherIncomeCashInInFy,
  buildDailyRevenueMap,
  buildDailyNetProfitMap,
  buildDailyCashRevenueMap,
  buildDailyCashNetProfitMap,
  buildPeriodDailySparklineSeries,
} from "@/domain/index.js";

/**
 * Derive the FY/period-scoped slices and KPI summary the authenticated app
 * uses across many screens. Pure (no side effects, no setters), so it can
 * sit outside the AuthenticatedApp component and improve review-ability.
 */
export function useAuthenticatedDerivedMetrics({
  state,
  businessMonth,
  selExpenseCategory,
  fsm,
  fyYear,
}) {
  const safeSales = useMemo(
    () => (Array.isArray(state.sales) ? state.sales.filter((s) => s && typeof s === "object") : []),
    [state.sales],
  );
  const safeExpenses = useMemo(
    () => (Array.isArray(state.expenses) ? state.expenses.filter((e) => e && typeof e === "object") : []),
    [state.expenses],
  );
  const safeOtherIncomes = useMemo(
    () => (Array.isArray(state.otherIncomes) ? state.otherIncomes.filter((x) => x && typeof x === "object") : []),
    [state.otherIncomes],
  );
  const safePurchases = useMemo(
    () => (Array.isArray(state.purchases) ? state.purchases.filter((p) => p && typeof p === "object") : []),
    [state.purchases],
  );
  const safeInventory = useMemo(
    () =>
      Array.isArray(state.inventoryEntries)
        ? state.inventoryEntries.filter((e) => e && typeof e === "object")
        : [],
    [state.inventoryEntries],
  );

  const fyFilterSales = useMemo(
    () =>
      safeSales.filter((s) => {
        if (!s?.date) return false;
        const d = new Date(String(s.date).slice(0, 10) + "T00:00:00");
        if (Number.isNaN(d.getTime())) return false;
        const sy = d.getFullYear();
        const sm2 = d.getMonth() + 1;
        return sm2 >= fsm ? sy === fyYear : sy === fyYear + 1;
      }),
    [safeSales, fsm, fyYear],
  );

  const fyFilterExp = useMemo(
    () =>
      safeExpenses.filter((e) => {
        if (!e?.date) return false;
        const d = new Date(String(e.date).slice(0, 10) + "T00:00:00");
        if (Number.isNaN(d.getTime())) return false;
        const sy = d.getFullYear();
        const sm2 = d.getMonth() + 1;
        return sm2 >= fsm ? sy === fyYear : sy === fyYear + 1;
      }),
    [safeExpenses, fsm, fyYear],
  );

  const fyFilterOi = useMemo(
    () =>
      safeOtherIncomes.filter((x) => {
        if (!x?.date) return false;
        const d = new Date(String(x.date).slice(0, 10) + "T00:00:00");
        if (Number.isNaN(d.getTime())) return false;
        const sy = d.getFullYear();
        const sm2 = d.getMonth() + 1;
        return sm2 >= fsm ? sy === fyYear : sy === fyYear + 1;
      }),
    [safeOtherIncomes, fsm, fyYear],
  );

  const dashSales = useMemo(
    () =>
      businessMonth
        ? safeSales.filter((s) => String(s.date || "").startsWith(businessMonth))
        : fyFilterSales,
    [businessMonth, safeSales, fyFilterSales],
  );

  const fyFilterPurchases = useMemo(
    () =>
      safePurchases.filter((p) => {
        if (!p?.date) return false;
        const d = new Date(String(p.date).slice(0, 10) + "T00:00:00");
        if (Number.isNaN(d.getTime())) return false;
        const sy = d.getFullYear();
        const sm2 = d.getMonth() + 1;
        return sm2 >= fsm ? sy === fyYear : sy === fyYear + 1;
      }),
    [safePurchases, fsm, fyYear],
  );

  const dashPurchases = useMemo(
    () =>
      businessMonth
        ? safePurchases.filter((p) => String(p.date || "").startsWith(businessMonth))
        : fyFilterPurchases,
    [businessMonth, safePurchases, fyFilterPurchases],
  );

  const dashExp = useMemo(
    () =>
      businessMonth
        ? safeExpenses.filter((e) => String(e.date || "").startsWith(businessMonth))
        : fyFilterExp,
    [businessMonth, safeExpenses, fyFilterExp],
  );

  const dashOtherIncome = useMemo(
    () =>
      businessMonth
        ? safeOtherIncomes.filter((x) => String(x.date || "").startsWith(businessMonth))
        : fyFilterOi,
    [businessMonth, safeOtherIncomes, fyFilterOi],
  );

  const expensesInSelCategory = useMemo(() => {
    if (!selExpenseCategory) return [];
    if (selExpenseCategory === EXPENSE_CATEGORY_ALL) return [...dashExp];
    return dashExp.filter((e) => e && String(e.category || "Other") === selExpenseCategory);
  }, [dashExp, selExpenseCategory]);

  const accountingBasisSetting = state.settings?.accountingBasis;

  const kpis = useMemo(() => {
    const accountingBasis = accountingBasisSetting === "accrual" ? "accrual" : "cash";
    const revenueInvoiced = dashSales.reduce((s, x) => s + num(x.totalSale), 0);
    /* Cash collected on invoice-dated sales in the period (informational; differs from payment-date cash below). */
    const revenueCashOnInvoicesInPeriod = dashSales.reduce((s, x) => s + num(x.received), 0);
    const accrual = accountingBasis === "accrual";
    const cogsFromSales = dashSales.reduce((s, x) => s + num(x.totalCost), 0);
    let revenueCash;
    let cogs;
    let expenses;
    let otherIncome;
    if (accrual) {
      revenueCash = revenueCashOnInvoicesInPeriod;
      cogs = recognizedCogsForSales(dashSales, true);
      expenses = dashExp.reduce((s, x) => s + num(x.amount), 0);
      otherIncome = dashOtherIncome.reduce((s, x) => s + num(x.amount), 0);
    } else {
      /* True cash basis: payment dates in the selected month or FY (aligned with Cash flow / bank activity). */
      revenueCash = businessMonth
        ? sumSalePaymentsInMonth(safeSales, businessMonth)
        : sumSalePaymentsInFy(safeSales, fsm, fyYear);
      cogs = businessMonth
        ? recognizedCogsForPaymentsInMonth(safeSales, businessMonth)
        : recognizedCogsForPaymentsInFy(safeSales, fsm, fyYear);
      expenses = businessMonth
        ? sumExpenseCashOutInMonth(safeExpenses, businessMonth)
        : sumExpenseCashOutInFy(safeExpenses, fsm, fyYear);
      otherIncome = businessMonth
        ? sumOtherIncomeCashInInMonth(safeOtherIncomes, businessMonth)
        : sumOtherIncomeCashInInFy(safeOtherIncomes, fsm, fyYear);
    }
    const revenue = accrual ? revenueInvoiced : revenueCash;
    const outstanding = safeSales.reduce((s, x) => s + num(x.outstanding), 0);
    const totalLiquid = computeTotalLiquid({
      bankAccounts: state.balance?.bankAccounts,
      transfers: state.balance?.bankTransfers,
      expenses: safeExpenses,
      sales: safeSales,
      inventoryEntries: state.inventoryEntries,
      otherIncomes: safeOtherIncomes,
      purchases: state.purchases,
      loansGiven: state.loansGiven,
    });
    return {
      accountingBasis,
      revenue,
      revenueInvoiced,
      revenueCash,
      revenueCashOnInvoicesInPeriod,
      cogs,
      cogsFromSales,
      expenses,
      otherIncome,
      grossProfit: revenue - cogs,
      netProfit: revenue - cogs - expenses + otherIncome,
      outstanding,
      totalLiquid,
      invoices: dashSales.length,
    };
  }, [
    dashSales,
    dashExp,
    dashOtherIncome,
    safeSales,
    safeExpenses,
    safeOtherIncomes,
    state.balance?.bankAccounts,
    state.balance?.bankTransfers,
    state.inventoryEntries,
    state.purchases,
    state.loansGiven,
    accountingBasisSetting,
    businessMonth,
    fsm,
    fyYear,
  ]);

  const kpiSparklines = useMemo(() => {
    const accrual = accountingBasisSetting === "accrual";
    const revenueMap = accrual
      ? buildDailyRevenueMap(dashSales)
      : buildDailyCashRevenueMap(safeSales);
    const netMap = accrual
      ? buildDailyNetProfitMap(dashSales, dashExp, dashOtherIncome)
      : buildDailyCashNetProfitMap(safeSales, safeExpenses, safeOtherIncomes);
    const periodOpts = { businessMonth, fsm, fyYear };
    return {
      revenue: buildPeriodDailySparklineSeries(revenueMap, periodOpts),
      netProfit: buildPeriodDailySparklineSeries(netMap, periodOpts),
    };
  }, [
    accountingBasisSetting,
    businessMonth,
    fsm,
    fyYear,
    dashSales,
    dashExp,
    dashOtherIncome,
    safeSales,
    safeExpenses,
    safeOtherIncomes,
  ]);

  return {
    safeSales,
    safeExpenses,
    safeOtherIncomes,
    safePurchases,
    safeInventory,
    fyFilterSales,
    fyFilterExp,
    fyFilterOi,
    fyFilterPurchases,
    dashSales,
    dashPurchases,
    dashExp,
    dashOtherIncome,
    expensesInSelCategory,
    kpis,
    kpiSparklines,
  };
}
