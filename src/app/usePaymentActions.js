import { useCallback } from "react";
import {
  advanceUnappliedAmount,
  genPaymentReceiptNo,
  getDefaultBankAccountId,
  makeId,
  normCustomerAdvancePayments,
  normSalesList,
  normalizePaymentEntries,
  normPurchasesList,
  num,
  paymentReceiptPrefix,
  roundMoney2,
  todayStr,
} from "@/domain/index.js";

/**
 * Record payment (customer sale) + record purchase payment + customer advances.
 */
export function usePaymentActions({
  state,
  payModal,
  payPurchaseModal,
  payAmt,
  payDate,
  payBankAccountId,
  payMethod = "cash",
  payReference = "",
  showToast,
  setState,
  setPayModal,
  setPayPurchaseModal,
  setPayAmt,
  setPayDate,
  setPayBankAccountId,
  setPayMethod,
  setPayReference,
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
        method: String(payMethod || "bank_transfer").trim() || "bank_transfer",
        reference: String(payReference || "").trim(),
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
      setPayMethod?.("cash");
      setPayReference?.("");
      showToast("Payment recorded");
    },
    [
      appendAuditEvent,
      payAmt,
      payBankAccountId,
      payMethod,
      payReference,
      payDate,
      payModal,
      persistWholeStateImmediate,
      setPayAmt,
      setPayBankAccountId,
      setPayMethod,
      setPayReference,
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

  const onRecordAdvancePayment = useCallback(
    async ({ customerName, amount, date, bankAccountId, note }) => {
      const amt = roundMoney2(num(amount));
      const acct = String(bankAccountId || "").trim();
      const name = String(customerName || "").trim();
      if (!name) {
        showToast("Choose a customer");
        return false;
      }
      if (!acct) {
        showToast("Choose bank / cash account");
        return false;
      }
      if (amt <= 0) {
        showToast("Enter a valid amount");
        return false;
      }
      const prefix = paymentReceiptPrefix(state.settings);
      const advances = state.customerAdvancePayments || [];
      const receiptNo = genPaymentReceiptNo(advances, prefix, state.settings?.paymentReceiptNextNumber);
      const seq = parseInt(String(receiptNo).split("-").pop(), 10) || 1;
      const entry = {
        id: makeId(),
        date: String(date || todayStr()).slice(0, 10),
        amount: amt,
        bankAccountId: acct,
        customerName: name,
        receiptNo,
        note: String(note || "").trim(),
        applications: [],
      };
      let next = {
        ...state,
        settings: {
          ...state.settings,
          paymentReceiptNextNumber: seq + 1,
        },
        customerAdvancePayments: normCustomerAdvancePayments([...advances, entry]),
      };
      next = appendAuditEvent(next, {
        entityType: "customerAdvancePayments",
        recordId: entry.id,
        action: "advance_add",
        note: "Customer advance payment recorded",
        details: { amount: amt, customerName: name, receiptNo },
      });
      const __p = await persistWholeStateImmediate(next);
      if (__p) setState(__p);
      showToast(`Advance recorded · ${receiptNo}`);
      return true;
    },
    [appendAuditEvent, persistWholeStateImmediate, setState, showToast, state],
  );

  const onApplyAdvanceToSale = useCallback(
    async ({ advanceKey, saleId }) => {
      const advanceId = String(advanceKey || "").replace(/^advance-/, "");
      const advance = (state.customerAdvancePayments || []).find((a) => a && a.id === advanceId);
      const sale = (state.sales || []).find((s) => s && s.id === saleId);
      if (!advance || !sale) return;
      const unapplied = advanceUnappliedAmount(advance);
      const due = num(sale.outstanding);
      const applyAmt = roundMoney2(Math.min(unapplied, due));
      if (applyAmt <= 0) {
        showToast("Nothing to apply");
        return;
      }
      const appDate = todayStr();
      const application = {
        id: makeId(),
        saleId: String(saleId),
        amount: applyAmt,
        date: appDate,
        advanceId: advance.id,
      };
      const payEntry = {
        id: makeId(),
        date: appDate,
        amount: applyAmt,
        bankAccountId: advance.bankAccountId,
        sourceAdvanceId: advance.id,
      };
      const updatedAdvance = {
        ...advance,
        applications: [...(advance.applications || []), application],
      };
      const updatedSale = {
        ...sale,
        paymentEntries: [...(sale.paymentEntries || []), payEntry],
      };
      const banks = state.balance?.bankAccounts || [];
      const normSales = normSalesList(
        (state.sales || []).map((s) => (s.id === saleId ? updatedSale : s)),
        banks,
      );
      let next = {
        ...state,
        customerAdvancePayments: normCustomerAdvancePayments(
          (state.customerAdvancePayments || []).map((a) => (a.id === advance.id ? updatedAdvance : a)),
        ),
        sales: normSales,
      };
      next = appendAuditEvent(next, {
        entityType: "customerAdvancePayments",
        recordId: advance.id,
        action: "advance_apply",
        note: "Advance applied to invoice",
        details: { saleId, amount: applyAmt },
      });
      const __p = await persistWholeStateImmediate(next);
      if (__p) setState(__p);
      showToast("Advance applied to invoice");
    },
    [appendAuditEvent, persistWholeStateImmediate, setState, showToast, state],
  );

  return {
    onRecordPayment,
    onRecordPurchasePayment,
    onRecordAdvancePayment,
    onApplyAdvanceToSale,
    openPayModal,
    openPayPurchaseModal,
  };
}
