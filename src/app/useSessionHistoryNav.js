import { useEffect, useRef } from "react";
import { normalizeHistoryNav, writeStoredSessionNav } from "@/domain/index.js";

/**
 * Persists nav slice to sessionStorage, mirrors page/screen into `history` for back-button,
 * and restores from `popstate` (in-app stack vs leaving the app).
 */
export function useSessionHistoryNav({
  page,
  screen,
  selSaleId,
  selExpenseId,
  selExpenseCategory,
  selCustomerName,
  selVendorName,
  selEmiId,
  selBankAccountId,
  selPurchaseId,
  selOtherIncomeId,
  selLoanGivenId,
  setPage,
  setScreen,
  setDelConfirm,
  setPayModal,
  setPayPurchaseModal,
  setPayBankAccountId,
  setActionConfirm,
  setNotifOpen,
  initialPage,
  initialScreen,
}) {
  const navSnapshotRef = useRef({ page: initialPage, screen: initialScreen });
  const handlingPopRef = useRef(false);

  useEffect(() => {
    const initial = navSnapshotRef.current;
    window.history.replaceState({ mb: true, page: initial.page, screen: initial.screen }, "");
  }, []);

  useEffect(() => {
    writeStoredSessionNav({
      page,
      screen,
      selSaleId,
      selExpenseId,
      selExpenseCategory,
      selCustomerName,
      selVendorName,
      selEmiId,
      selBankAccountId,
      selPurchaseId,
      selOtherIncomeId,
      selLoanGivenId,
    });
    if (handlingPopRef.current) {
      handlingPopRef.current = false;
      navSnapshotRef.current = { page, screen };
      return;
    }
    const prev = navSnapshotRef.current;
    if (prev.page === page && prev.screen === screen) return;
    window.history.pushState({ mb: true, page, screen }, "");
    navSnapshotRef.current = { page, screen };
  }, [page, screen, selSaleId, selExpenseId, selExpenseCategory, selCustomerName, selVendorName, selEmiId, selBankAccountId, selPurchaseId, selOtherIncomeId, selLoanGivenId]);

  useEffect(() => {
    const onPop = (e) => {
      const s = e.state;
      if (!s?.mb) {
        handlingPopRef.current = true;
        setDelConfirm(null);
        setPayModal(null);
        setPayPurchaseModal(null);
        setPayBankAccountId("");
        setActionConfirm(null);
        setNotifOpen(false);
        setScreen(null);
        setPage("dashboard");
        window.history.pushState({ mb: true, page: "dashboard", screen: null }, "");
        return;
      }
      handlingPopRef.current = true;
      setDelConfirm(null);
      setPayModal(null);
      setPayPurchaseModal(null);
      setPayBankAccountId("");
      setActionConfirm(null);
      setNotifOpen(false);
      const { page: p, screen: scr } = normalizeHistoryNav(s);
      setPage(p);
      setScreen(scr);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [setPage, setScreen, setDelConfirm, setPayModal, setPayPurchaseModal, setPayBankAccountId, setActionConfirm, setNotifOpen]);
}
