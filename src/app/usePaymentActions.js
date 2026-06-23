import { useCallback } from "react";
import {
  getDefaultBankAccountId,
  makeId,
  normalizePaymentEntries,
  normPurchasesList,
  num,
  todayStr,
} from "@/domain/index.js";

/**
 * Record payment (customer sale) + record purchase payment.
 */
export function usePaymentActions({
  state,
  payModal,
  payPurchaseModal,
  payAmt,
  payDate,
  payBankAccountId,
  showToast,
  setState,
  setPayModal,
  setPayPurchaseModal,
  setPayAmt,
  setPayDate,
  setPayBankAccountId,
  persistWholeStateImmediate,
  appendAuditEvent,
}) {
  const onRecordPayment = useCallback(
    async (e) => {
      e.preventDefault();
      const sale = state.sales.find((s) => s.id === payModal);
      if (!sale) return;
      const add = Math.min(num(payAmt), sale.outstanding);
      if (!add) return;
      const acct = String(payBankAccountId || "").trim();
      if (!acct) {
        showToast("Choose bank / cash account for this receipt");
        return;
      }
      const entry = {
        id: makeId(),
        date: String(payDate || todayStr()).slice(0, 10),
        amount: add,
        bankAccountId: acct,
      };
      let next = {
        ...state,
        sales: (state.sales || []).map((s) => {
          if (s.id !== payModal) return s;
          const nr = num(s.received) + add;
          const prevPe = Array.isArray(s.paymentEntries) ? s.paymentEntries : [];
          return {
            ...s,
            received: nr,
            outstanding: Math.max(0, num(s.totalSale) - nr),
            paymentEntries: normalizePaymentEntries({ ...s, paymentEntries: [...prevPe, entry] }),
          };
        }),
      };
      next = appendAuditEvent(next, {
        entityType: "sales",
        recordId: String(payModal),
        action: "payment_add",
        note: "Customer payment recorded",
        details: { amount: add, bankAccountId: acct },
      });
      const __p = await persistWholeStateImmediate(next);
      if (__p) setState(__p);
      setPayModal(null);
      setPayAmt("");
      setPayDate(todayStr());
      setPayBankAccountId("");
      showToast("Payment recorded");
    },
    [
      appendAuditEvent,
      payAmt,
      payBankAccountId,
      payDate,
      payModal,
      persistWholeStateImmediate,
      setPayAmt,
      setPayBankAccountId,
      setPayDate,
      setPayModal,
      setState,
      showToast,
      state,
    ],
  );

  const openPayModal = useCallback(
    (saleId) => {
      const sale = (state.sales || []).find((s) => s && s.id === saleId);
      const entries = sale?.paymentEntries || [];
      const last = entries.length ? entries[entries.length - 1].bankAccountId : "";
      setPayBankAccountId(String(last || getDefaultBankAccountId(state.balance?.bankAccounts) || ""));
      setPayAmt("");
      setPayDate(todayStr());
      setPayPurchaseModal(null);
      setPayModal(saleId);
    },
    [setPayAmt, setPayBankAccountId, setPayDate, setPayModal, setPayPurchaseModal, state.balance?.bankAccounts, state.sales],
  );

  const openPayPurchaseModal = useCallback(
    (purchaseId) => {
      const p = (state.purchases || []).find((x) => x && x.id === purchaseId);
      const entries = p?.paymentEntries || [];
      const last = entries.length ? entries[entries.length - 1].bankAccountId : "";
      setPayBankAccountId(String(last || getDefaultBankAccountId(state.balance?.bankAccounts) || ""));
      setPayAmt("");
      setPayDate(todayStr());
      setPayModal(null);
      setPayPurchaseModal(purchaseId);
    },
    [setPayAmt, setPayBankAccountId, setPayDate, setPayModal, setPayPurchaseModal, state.balance?.bankAccounts, state.purchases],
  );

  const onRecordPurchasePayment = useCallback(
    async (e) => {
      e.preventDefault();
      const purchase = (state.purchases || []).find((p) => p && p.id === payPurchaseModal);
      if (!purchase) return;
      const add = Math.min(num(payAmt), num(purchase.outstanding));
      if (!add) return;
      const acct = String(payBankAccountId || "").trim();
      if (!acct) {
        showToast("Choose bank / cash account for this payment");
        return;
      }
      const entry = {
        id: makeId(),
        date: String(payDate || todayStr()).slice(0, 10),
        amount: add,
        bankAccountId: acct,
      };
      const prevPe = Array.isArray(purchase.paymentEntries) ? purchase.paymentEntries : [];
      const merged = { ...purchase, paymentEntries: [...prevPe, entry] };
      const normalizedList = normPurchasesList([merged]);
      if (!normalizedList.length) {
        showToast("Could not record payment");
        return;
      }
      const normalized = normalizedList[0];
      let next = {
        ...state,
        purchases: (state.purchases || []).map((p) => (p.id === payPurchaseModal ? normalized : p)),
      };
      next = appendAuditEvent(next, {
        entityType: "purchases",
        recordId: String(payPurchaseModal),
        action: "payment_add",
        note: "Supplier payment recorded",
        details: { amount: add, bankAccountId: acct },
      });
      const __p = await persistWholeStateImmediate(next);
      if (__p) setState(__p);
      setPayPurchaseModal(null);
      setPayAmt("");
      setPayDate(todayStr());
      setPayBankAccountId("");
      showToast("Payment recorded");
    },
    [
      appendAuditEvent,
      payAmt,
      payBankAccountId,
      payDate,
      payPurchaseModal,
      persistWholeStateImmediate,
      setPayAmt,
      setPayBankAccountId,
      setPayDate,
      setPayPurchaseModal,
      setState,
      showToast,
      state,
    ],
  );

  return { onRecordPayment, onRecordPurchasePayment, openPayModal, openPayPurchaseModal };
}
