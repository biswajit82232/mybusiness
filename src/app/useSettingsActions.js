import { useCallback } from "react";
import {
  DEFAULT_FINANCE_COS,
  detectFyYear,
  effectiveEntryBranchId,
  normBranchesList,
  normBundlesList,
  normalizeExpenseCategoriesFromPersist,
  normalizeOtherIncomeCategoriesFromPersist,
  num,
  sanitizePrefix,
} from "@/domain/index.js";

/**
 * Settings persistence and branch/bundle management.
 */
export function useSettingsActions({
  state,
  darkMode,
  setDarkMode,
  showToast,
  setState,
  persistWholeStateImmediate,
}) {
  const saveSettingsPartial = useCallback(
    async (updates, opts) => {
      const s = { ...state.settings };
      if ("businessName" in updates)
        s.businessName = String(updates.businessName ?? "").trim() || s.businessName;
      if ("businessPhone" in updates) s.businessPhone = String(updates.businessPhone ?? "").trim();
      if ("businessWhatsapp" in updates)
        s.businessWhatsapp = String(updates.businessWhatsapp ?? "").trim();
      if ("businessAddress" in updates) s.businessAddress = String(updates.businessAddress ?? "").trim();
      if ("businessCity" in updates) s.businessCity = String(updates.businessCity ?? "").trim();
      if ("businessState" in updates) s.businessState = String(updates.businessState ?? "").trim();
      if ("businessStateCode" in updates)
        s.businessStateCode = String(updates.businessStateCode ?? "").trim();
      if ("businessPincode" in updates) s.businessPincode = String(updates.businessPincode ?? "").trim();
      if ("businessGstin" in updates)
        s.businessGstin = String(updates.businessGstin ?? "").trim().toUpperCase();
      if ("businessPan" in updates) s.businessPan = String(updates.businessPan ?? "").trim().toUpperCase();
      if ("businessLogo" in updates) s.businessLogo = String(updates.businessLogo ?? "").trim();
      if ("invoiceNotes" in updates) s.invoiceNotes = String(updates.invoiceNotes ?? "").trim();
      if ("invoiceTerms" in updates) s.invoiceTerms = String(updates.invoiceTerms ?? "").trim();
      if ("invoiceSignatory" in updates) s.invoiceSignatory = String(updates.invoiceSignatory ?? "").trim();
      if ("gstEnabled" in updates) s.gstEnabled = updates.gstEnabled !== false;
      if ("defaultProductHsn" in updates)
        s.defaultProductHsn = String(updates.defaultProductHsn ?? "8711").trim() || "8711";
      if ("defaultProductGstRate" in updates)
        s.defaultProductGstRate = Math.max(0, num(updates.defaultProductGstRate ?? 5));
      if ("invoicePrefix" in updates)
        s.invoicePrefix = sanitizePrefix(updates.invoicePrefix ?? s.invoicePrefix);
      if ("billOfSupplyPrefix" in updates)
        s.billOfSupplyPrefix = sanitizePrefix(
          updates.billOfSupplyPrefix ?? s.billOfSupplyPrefix ?? "BOS",
        );
      if ("invoiceNextNumber" in updates)
        s.invoiceNextNumber = Math.max(1, Math.floor(num(updates.invoiceNextNumber) || 1));
      if ("billOfSupplyNextNumber" in updates)
        s.billOfSupplyNextNumber = Math.max(
          1,
          Math.floor(num(updates.billOfSupplyNextNumber) || 1),
        );
      if ("defaultDueDays" in updates)
        s.defaultDueDays = Math.min(365, Math.max(1, num(updates.defaultDueDays) || 30));
      if ("monthlySalesTarget" in updates)
        s.monthlySalesTarget = Math.max(0, Math.floor(num(updates.monthlySalesTarget) || 0));
      if ("fyYear" in updates) s.fyYear = num(updates.fyYear) || detectFyYear(s.financialYearStartMonth);
      if ("financialYearStartMonth" in updates)
        s.financialYearStartMonth = num(updates.financialYearStartMonth) || 4;
      if ("financeCompanies" in updates) {
        const raw = updates.financeCompanies;
        const arr = Array.isArray(raw)
          ? raw
          : String(raw ?? "")
              .split("\n")
              .map((x) => x.trim())
              .filter(Boolean);
        s.financeCompanies = arr.length ? arr : DEFAULT_FINANCE_COS;
      }
      if ("expenseCategories" in updates) {
        s.expenseCategories = normalizeExpenseCategoriesFromPersist(updates.expenseCategories);
      }
      if ("otherIncomeCategories" in updates) {
        s.otherIncomeCategories = normalizeOtherIncomeCategoriesFromPersist(
          updates.otherIncomeCategories,
        );
      }
      if ("notificationsEnabled" in updates) s.notificationsEnabled = !!updates.notificationsEnabled;
      if ("notifyOverduePayments" in updates) s.notifyOverduePayments = !!updates.notifyOverduePayments;
      if ("notifyPaymentDueToday" in updates) s.notifyPaymentDueToday = !!updates.notifyPaymentDueToday;
      if ("notifyPaymentDueSoon" in updates) s.notifyPaymentDueSoon = !!updates.notifyPaymentDueSoon;
      if ("notifyRecurringDueToday" in updates) s.notifyRecurringDueToday = !!updates.notifyRecurringDueToday;
      if ("notifyRecurringDue" in updates) s.notifyRecurringDue = !!updates.notifyRecurringDue;
      if ("notifyEmiDueThreeDays" in updates) s.notifyEmiDueThreeDays = !!updates.notifyEmiDueThreeDays;
      if ("notifyServicingDue" in updates) s.notifyServicingDue = !!updates.notifyServicingDue;
      if ("notifyServicingDueTwoDays" in updates) s.notifyServicingDueTwoDays = !!updates.notifyServicingDueTwoDays;
      if ("notifyLowStock" in updates) s.notifyLowStock = !!updates.notifyLowStock;
      if ("notifyLoanMonthMilestone" in updates)
        s.notifyLoanMonthMilestone = !!updates.notifyLoanMonthMilestone;
      if ("branches" in updates) s.branches = normBranchesList(updates.branches);
      if ("accountingBasis" in updates)
        s.accountingBasis = updates.accountingBasis === "accrual" ? "accrual" : "cash";
      if ("autoStockOutOnSale" in updates) s.autoStockOutOnSale = !!updates.autoStockOutOnSale;
      if ("bundles" in updates) s.bundles = normBundlesList(updates.bundles);
      if ("darkMode" in updates) s.darkMode = !!updates.darkMode;
      const next = { ...state, settings: s };
      const __p = await persistWholeStateImmediate(next);
      if (__p) setState(__p);
      if (!opts?.silent) showToast("Saved");
    },
    [persistWholeStateImmediate, setState, showToast, state],
  );

  const setDarkModeAndPersist = useCallback(
    async (v) => {
      const next = typeof v === "function" ? v(darkMode) : v;
      setDarkMode(!!next);
      await saveSettingsPartial({ darkMode: !!next }, { silent: true });
    },
    [darkMode, saveSettingsPartial, setDarkMode],
  );

  const saveBranchesList = useCallback(
    async (list) => {
      await saveSettingsPartial({ branches: normBranchesList(list) }, { silent: true });
      showToast("Branch added");
    },
    [saveSettingsPartial, showToast],
  );

  const saveBundlesList = useCallback(
    async (list) => {
      await saveSettingsPartial({ bundles: normBundlesList(list) }, { silent: true });
      showToast("Bundles saved");
    },
    [saveSettingsPartial, showToast],
  );

  const removeBranchById = useCallback(
    async (branchIdToRemove) => {
      const branches = normBranchesList(state.settings?.branches);
      if (branches.length <= 1) {
        showToast("Keep at least one branch");
        return;
      }
      const remaining = branches.filter((b) => b.id !== branchIdToRemove);
      if (remaining.length === branches.length) return;
      const fallback = remaining[0].id;
      const nextEntries = (state.inventoryEntries || []).map((e) => {
        if (!e || typeof e !== "object") return e;
        if (effectiveEntryBranchId(e, branches) === branchIdToRemove) {
          return { ...e, branchId: fallback };
        }
        return e;
      });
      const next = {
        ...state,
        settings: { ...state.settings, branches: remaining },
        inventoryEntries: nextEntries,
      };
      const __p = await persistWholeStateImmediate(next);
      if (__p) setState(__p);
      showToast("Branch removed · stock reassigned");
    },
    [persistWholeStateImmediate, setState, showToast, state],
  );

  return {
    saveSettingsPartial,
    setDarkModeAndPersist,
    saveBranchesList,
    saveBundlesList,
    removeBranchById,
  };
}

