import { useCallback } from "react";
import {
  effectiveEntryBranchId,
  normBankTransfers,
  normBranchesList,
  normCustomerDirectory,
  normPurchasesList,
  normSalesList,
  normVendorDirectory,
} from "@/domain/index.js";

/**
 * Handles all delete confirmation flows dispatched from `delConfirm` modal.
 */
export function useDeleteActions({
  state,
  delConfirm,
  selExpenseId,
  selOtherIncomeId,
  editingOtherIncomeId,
  editingLoanGivenId,
  selLoanGivenId,
  invItemDetail,
  showToast,
  setState,
  setScreen,
  setPage,
  setDelConfirm,
  setSelSaleId,
  setSelExpenseId,
  setSelExpenseCategory,
  setSelOtherIncomeId,
  setEditingOtherIncomeId,
  setSelLoanGivenId,
  setEditingLoanGivenId,
  setLoanGivenEntry,
  setEditingInventoryId,
  setInvItemDetail,
  setSelCustomerName,
  setSelVendorName,
  setSelBankAccountId,
  setSelPurchaseId,
  persistWholeStateImmediate,
  appendAuditEvent,
  purchaseNavRef,
  saleNavRef,
  expenseNavRef,
  otherIncomeDetailFromRef,
  otherIncomeOpenedFromRef,
  stockNavRef,
  openedFromGlobalSearchRef,
  emptyLoanGivenForm,
}) {
  const onDeleteConfirmed = useCallback(async () => {
    if (!delConfirm) return;
    const { type, id } = delConfirm;

    if (type === "sale") {
      const sale = state.sales.find((s) => s.id === id);
      let next = {
        ...state,
        sales: (state.sales || []).filter((s) => s.id !== id),
        emiEntries: sale
          ? (state.emiEntries || []).filter((e) => e.invoiceNo !== sale.invoiceNo)
          : state.emiEntries || [],
        inventoryEntries: (state.inventoryEntries || []).filter(
          (e) => String(e.saleId || "").trim() !== String(id),
        ),
      };
      next = appendAuditEvent(next, {
        entityType: "sales",
        recordId: String(id),
        action: "delete",
        note: sale?.invoiceNo ? `Invoice ${sale.invoiceNo} deleted` : "Invoice deleted",
      });
      const __p = await persistWholeStateImmediate(next);
      if (__p) setState(__p);
      setSelSaleId(null);
      if (saleNavRef.current.from === "search") {
        setScreen("search");
      } else {
        setScreen(null);
      }
      showToast("Entry deleted");

    } else if (type === "expense") {
      const next = { ...state, expenses: (state.expenses || []).filter((e) => e.id !== id) };
      const __p = await persistWholeStateImmediate(next);
      if (__p) setState(__p);
      if (selExpenseId === id) {
        setSelExpenseId(null);
        const { from, category } = expenseNavRef.current;
        if (from === "banking") {
          setScreen("bankAccountDetail");
        } else if (from === "search") {
          setScreen("search");
        } else if (from === "ledger") {
          setScreen(null);
          setPage("ledger");
        } else if (from === "expenseCategory" && category) {
          setSelExpenseCategory(category);
          setScreen("expenseCategory");
        } else {
          setSelExpenseCategory(null);
          setScreen(null);
          setPage("expenses");
        }
      }
      showToast("Deleted");

    } else if (type === "otherIncome") {
      const next = {
        ...state,
        otherIncomes: (state.otherIncomes || []).filter((x) => x && x.id !== id),
      };
      const __p = await persistWholeStateImmediate(next);
      if (__p) setState(__p);
      if (selOtherIncomeId === id) {
        setSelOtherIncomeId(null);
        const oiFrom = otherIncomeDetailFromRef.current;
        if (oiFrom === "banking") setScreen("bankAccountDetail");
        else if (oiFrom === "search") setScreen("search");
        else if (oiFrom === "ledger") { setScreen(null); setPage("ledger"); }
        else { setScreen(null); setPage("otherIncome"); }
      } else if (editingOtherIncomeId === id) {
        setEditingOtherIncomeId(null);
        const oiFrom = otherIncomeOpenedFromRef.current.from;
        if (oiFrom === "detail") setScreen("otherIncomeDetail");
        else if (oiFrom === "banking") setScreen("bankAccountDetail");
        else if (oiFrom === "ledger") { setScreen(null); setPage("ledger"); }
        else { setScreen(null); setPage("otherIncome"); }
      } else {
        const oiCtx = otherIncomeOpenedFromRef.current.from;
        if (oiCtx === "banking") setScreen("bankAccountDetail");
        else setPage("otherIncome");
      }
      showToast("Deleted");

    } else if (type === "loanGiven") {
      const next = {
        ...state,
        loansGiven: (state.loansGiven || []).filter((x) => x && x.id !== id),
      };
      const __p = await persistWholeStateImmediate(next);
      if (__p) setState(__p);
      if (selLoanGivenId === id) {
        setSelLoanGivenId(null);
        setScreen(null);
      }
      if (editingLoanGivenId === id) {
        setEditingLoanGivenId(null);
        setLoanGivenEntry(emptyLoanGivenForm());
        setScreen(null);
        setPage("loansGiven");
      }
      showToast("Loan removed");

    } else if (type === "recurring") {
      const next = {
        ...state,
        recurringExpenses: (state.recurringExpenses || []).filter((r) => r.id !== id),
      };
      const __p = await persistWholeStateImmediate(next);
      if (__p) setState(__p);
      showToast("Recurring rule removed");

    } else if (type === "stock") {
      const next = {
        ...state,
        inventoryEntries: (state.inventoryEntries || []).filter((e) => e.id !== id),
      };
      const __p = await persistWholeStateImmediate(next);
      if (__p) setState(__p);
      setEditingInventoryId(null);
      const from = stockNavRef.current.from;
      stockNavRef.current = { from: "default" };
      if (from === "banking") setScreen("bankAccountDetail");
      else if (from === "ledger") { setScreen(null); setPage("ledger"); }
      else if (from === "inventoryItem") setScreen("inventoryItemDetail");
      else setScreen(null);
      showToast("Deleted");

    } else if (type === "inventory-item") {
      if (invItemDetail?.itemKey === id) {
        openedFromGlobalSearchRef.current = false;
        setInvItemDetail(null);
        setScreen(null);
      }
      const next = {
        ...state,
        inventoryEntries: (state.inventoryEntries || []).filter(
          (e) => (e.item || "").toLowerCase() !== id,
        ),
      };
      const __p = await persistWholeStateImmediate(next);
      if (__p) setState(__p);
      showToast("Product deleted");

    } else if (type === "inventory-item-branch") {
      const branchId = delConfirm.branchId;
      const branches = normBranchesList(state.settings?.branches);
      const next = {
        ...state,
        inventoryEntries: (state.inventoryEntries || []).filter((e) => {
          if (!e) return false;
          if ((e.item || "").toLowerCase() !== id) return true;
          return effectiveEntryBranchId(e, branches) !== branchId;
        }),
      };
      const __p = await persistWholeStateImmediate(next);
      if (__p) setState(__p);
      showToast("Product removed from this branch");

    } else if (type === "customerDirectory") {
      const next = {
        ...state,
        customerDirectory: normCustomerDirectory(
          (state.customerDirectory || []).filter((d) => d && d.id !== id),
        ),
      };
      const __p = await persistWholeStateImmediate(next);
      if (__p) setState(__p);
      openedFromGlobalSearchRef.current = false;
      setScreen(null);
      setSelCustomerName("");
      showToast("Contact removed");

    } else if (type === "vendorDirectory") {
      const next = {
        ...state,
        vendorDirectory: normVendorDirectory(
          (state.vendorDirectory || []).filter((d) => d && d.id !== id),
        ),
      };
      const __p = await persistWholeStateImmediate(next);
      if (__p) setState(__p);
      openedFromGlobalSearchRef.current = false;
      setScreen(null);
      setSelVendorName("");
      showToast("Vendor removed");

    } else if (type === "purchase") {
      let next = {
        ...state,
        purchases: (state.purchases || []).filter((p) => p && p.id !== id),
        inventoryEntries: (state.inventoryEntries || []).filter(
          (e) => !e || String(e.purchaseId || "") !== String(id),
        ),
      };
      next = appendAuditEvent(next, {
        entityType: "purchases",
        recordId: String(id),
        action: "delete",
        note: "Purchase deleted",
      });
      const __p = await persistWholeStateImmediate(next);
      if (__p) setState(__p);
      setSelPurchaseId(null);
      if (purchaseNavRef.current.from === "search") {
        setScreen("search");
      } else {
        setScreen(null);
      }
      showToast("Purchase deleted");

    } else if (type === "bankTransfer") {
      const tid = String(id || "").trim();
      if (!tid) { setDelConfirm(null); return; }
      const next = {
        ...state,
        balance: {
          ...state.balance,
          bankTransfers: normBankTransfers(
            (state.balance.bankTransfers || []).filter((x) => x && String(x.id) !== tid),
          ),
        },
      };
      const __p = await persistWholeStateImmediate(next);
      if (__p) setState(__p);
      showToast("Transfer removed");

    } else if (type === "salePayment") {
      const saleId = delConfirm.saleId;
      const paymentEntryId = delConfirm.paymentEntryId;
      const sale = (state.sales || []).find((s) => s && s.id === saleId);
      if (!sale || !paymentEntryId) {
        showToast("Could not remove payment");
        setDelConfirm(null);
        return;
      }
      const pes = (sale.paymentEntries || []).filter(
        (p) => String(p.id) !== String(paymentEntryId),
      );
      const merged = { ...sale, paymentEntries: pes };
      const normalizedList = normSalesList([merged], state.balance?.bankAccounts || []);
      if (!normalizedList.length) {
        showToast("Could not update invoice");
        setDelConfirm(null);
        return;
      }
      const normalized = normalizedList[0];
      const next = {
        ...state,
        sales: (state.sales || []).map((s) => (s && s.id === saleId ? normalized : s)),
      };
      const __p = await persistWholeStateImmediate(next);
      if (__p) setState(__p);
      showToast("Payment removed from invoice");

    } else if (type === "purchasePayment") {
      const purchaseId = delConfirm.purchaseId;
      const paymentEntryId = delConfirm.paymentEntryId;
      const pur = (state.purchases || []).find((p) => p && p.id === purchaseId);
      if (!pur || !paymentEntryId) {
        showToast("Could not remove payment");
        setDelConfirm(null);
        return;
      }
      const pes = (pur.paymentEntries || []).filter(
        (p) => String(p.id) !== String(paymentEntryId),
      );
      const merged = { ...pur, paymentEntries: pes };
      const normalizedList = normPurchasesList([merged]);
      if (!normalizedList.length) {
        showToast("Could not update purchase");
        setDelConfirm(null);
        return;
      }
      const normalized = normalizedList[0];
      const next = {
        ...state,
        purchases: (state.purchases || []).map((p) =>
          p && p.id === purchaseId ? normalized : p,
        ),
      };
      const __p = await persistWholeStateImmediate(next);
      if (__p) setState(__p);
      showToast("Supplier payment removed");

    } else if (type === "bankAccount") {
      const xfers = state.balance.bankTransfers || [];
      if (xfers.some((t) => t && (t.fromAccountId === id || t.toAccountId === id))) {
        showToast(
          "This account has saved transfers. It can't be deleted until those transfers can be removed or adjusted.",
        );
        setDelConfirm(null);
        return;
      }
      const next = {
        ...state,
        balance: {
          ...state.balance,
          bankAccounts: (state.balance.bankAccounts || []).filter((a) => a && a.id !== id),
        },
      };
      try {
        const __p = await persistWholeStateImmediate(next);
        if (__p) {
          setState(__p);
          openedFromGlobalSearchRef.current = false;
          setSelBankAccountId(null);
          setScreen(null);
          showToast("Account removed");
        } else {
          showToast("Could not remove account — try again");
        }
      } catch {
        showToast("Could not remove account — try again");
      }
    }

    setDelConfirm(null);
  }, [
    appendAuditEvent,
    delConfirm,
    editingLoanGivenId,
    editingOtherIncomeId,
    emptyLoanGivenForm,
    expenseNavRef,
    invItemDetail,
    openedFromGlobalSearchRef,
    otherIncomeDetailFromRef,
    otherIncomeOpenedFromRef,
    persistWholeStateImmediate,
    purchaseNavRef,
    saleNavRef,
    selExpenseId,
    selLoanGivenId,
    selOtherIncomeId,
    setDelConfirm,
    setEditingInventoryId,
    setEditingLoanGivenId,
    setEditingOtherIncomeId,
    setInvItemDetail,
    setLoanGivenEntry,
    setPage,
    setScreen,
    setSelBankAccountId,
    setSelCustomerName,
    setSelExpenseCategory,
    setSelExpenseId,
    setSelLoanGivenId,
    setSelOtherIncomeId,
    setSelPurchaseId,
    setSelSaleId,
    setSelVendorName,
    setState,
    showToast,
    state,
    stockNavRef,
  ]);

  return { onDeleteConfirmed };
}
