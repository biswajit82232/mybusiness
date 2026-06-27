import { useCallback, useEffect } from "react";
import { LS_WELCOME_DONE } from "@/domain/index.js";

/**
 * Edge-swipe (mobile) and Escape key: dismiss overlays and walk back through screen stack.
 * Swipe also jumps to the dashboard tab when already on dashboard with no overlay screen.
 */
export function useGlobalBackNavigation({
  welcomeOpen,
  setWelcomeOpen,
  actionConfirm,
  setActionConfirm,
  simpleConfirm,
  cancelSimpleConfirm,
  delConfirm,
  setDelConfirm,
  payModal,
  payPurchaseModal,
  setPayModal,
  setPayPurchaseModal,
  setPayBankAccountId,
  notifOpen,
  setNotifOpen,
  screen,
  setScreen,
  page,
  setPage,
  editingSaleId,
  setEditingSaleId,
  editingCustomerId,
  setEditingCustomerId,
  editingVendorId,
  setEditingVendorId,
  editingExpenseId,
  setEditingExpenseId,
  editingOtherIncomeId,
  setEditingOtherIncomeId,
  setEditingPurchaseId,
  setSelExpenseCategory,
  showSearch,
  setShowSearch,
  setSearchTerm,
  otherIncomeOpenedFromRef,
  closeOtherIncomeDetail,
  /** Map of screen id → close handler (ref updated each render in AuthenticatedApp). */
  detailScreenClosersRef,
}) {
  const tryCloseDetailScreen = useCallback(
    (scr) => {
      const m = detailScreenClosersRef?.current;
      if (!m || !scr) return false;
      const fn = m[scr];
      if (typeof fn === "function") {
        fn();
        return true;
      }
      return false;
    },
    [detailScreenClosersRef],
  );
  const tryDismissOverlaysAndScreens = useCallback(
    (mode) => {
      if (welcomeOpen) {
        try {
          localStorage.setItem(LS_WELCOME_DONE, "1");
        } catch {
          /* ignore */
        }
        setWelcomeOpen(false);
        return true;
      }
      if (actionConfirm) {
        setActionConfirm(null);
        return true;
      }
      if (simpleConfirm) {
        cancelSimpleConfirm?.();
        return true;
      }
      if (delConfirm) {
        setDelConfirm(null);
        return true;
      }
      if (payModal || payPurchaseModal) {
        setPayModal(null);
        setPayPurchaseModal(null);
        setPayBankAccountId("");
        return true;
      }
      if (notifOpen) {
        setNotifOpen(false);
        return true;
      }
      if (screen === "newSale" && editingSaleId) {
        setEditingSaleId(null);
        setScreen("saleDetail");
        return true;
      }
      if (screen === "newCustomer" && editingCustomerId) {
        setEditingCustomerId(null);
        setScreen("customerDetail");
        return true;
      }
      if (screen === "newVendor" && editingVendorId) {
        setEditingVendorId(null);
        setScreen("vendorDetail");
        return true;
      }
      if (screen === "newExpense" && editingExpenseId) {
        setEditingExpenseId(null);
        setScreen("expenseDetail");
        return true;
      }
      if (screen === "newOtherIncome" && editingOtherIncomeId) {
        setEditingOtherIncomeId(null);
        const from = otherIncomeOpenedFromRef.current.from;
        if (from === "detail") {
          setScreen("otherIncomeDetail");
          return true;
        }
        if (from === "banking") setScreen("bankAccountDetail");
        else if (from === "ledger") {
          setScreen(null);
          setPage("ledger");
        } else {
          setScreen(null);
          setPage("otherIncome");
        }
        return true;
      }
      if (screen === "expenseCategory") {
        setScreen(null);
        setSelExpenseCategory(null);
        setPage("expenses");
        return true;
      }
      if (mode === "escape") {
        if (screen === "otherIncomeDetail") {
          closeOtherIncomeDetail();
          return true;
        }
        if (tryCloseDetailScreen(screen)) return true;
        if (screen) {
          if (screen === "newPurchase") setEditingPurchaseId(null);
          setScreen(null);
          return true;
        }
        if (showSearch) {
          setShowSearch(false);
          setSearchTerm("");
          return true;
        }
        return false;
      }
      if (screen === "otherIncomeDetail") {
        closeOtherIncomeDetail();
        return true;
      }
      if (tryCloseDetailScreen(screen)) return true;
      if (screen) {
        if (screen === "newPurchase") setEditingPurchaseId(null);
        setScreen(null);
        return true;
      }
      if (page !== "dashboard") {
        setPage("dashboard");
        return true;
      }
      return false;
    },
    [
      welcomeOpen,
      setWelcomeOpen,
      actionConfirm,
      setActionConfirm,
      simpleConfirm,
      cancelSimpleConfirm,
      delConfirm,
      setDelConfirm,
      payModal,
      payPurchaseModal,
      setPayModal,
      setPayPurchaseModal,
      setPayBankAccountId,
      notifOpen,
      setNotifOpen,
      screen,
      setScreen,
      page,
      setPage,
      editingSaleId,
      setEditingSaleId,
      editingCustomerId,
      setEditingCustomerId,
      editingVendorId,
      setEditingVendorId,
      editingExpenseId,
      setEditingExpenseId,
      editingOtherIncomeId,
      setEditingOtherIncomeId,
      setEditingPurchaseId,
      setSelExpenseCategory,
      showSearch,
      setShowSearch,
      setSearchTerm,
      otherIncomeOpenedFromRef,
      closeOtherIncomeDetail,
      tryCloseDetailScreen,
    ],
  );

  useEffect(() => {
    let sx = 0;
    let sy = 0;
    let tracking = false;
    const onStart = (e) => {
      const t = e.touches?.[0];
      if (!t) return;
      if (t.clientX > 26) return;
      sx = t.clientX;
      sy = t.clientY;
      tracking = true;
    };
    const onEnd = (e) => {
      if (!tracking) return;
      const t = e.changedTouches?.[0];
      tracking = false;
      if (!t) return;
      const dx = t.clientX - sx;
      const dy = Math.abs(t.clientY - sy);
      if (dx < 80 || dy > 42) return;
      tryDismissOverlaysAndScreens("swipe");
    };
    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchend", onEnd);
    };
  }, [tryDismissOverlaysAndScreens]);

  useEffect(() => {
    const fn = (e) => {
      if (e.key !== "Escape") return;
      tryDismissOverlaysAndScreens("escape");
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [tryDismissOverlaysAndScreens]);
}
