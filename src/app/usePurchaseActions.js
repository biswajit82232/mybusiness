import { useCallback } from "react";
import {
  getDefaultBankAccountId,
  getDefaultBranchId,
  makeId,
  normBranchesList,
  normPurchasesList,
  findDuplicatePurchase,
  roundMoney2,
  num,
} from "@/domain/index.js";

/**
 * Save-purchase handler (new + edit), including auto-stock-in inventory rows.
 */
export function usePurchaseActions({
  purchaseEntry,
  editingPurchaseId,
  latestStateRef,
  showToast,
  setState,
  setScreen,
  setEditingPurchaseId,
  persistWholeStateImmediate,
  appendAuditEvent,
}) {
  const onSavePurchase = useCallback(
    async (e) => {
      e.preventDefault();
      await Promise.resolve();
      const base = latestStateRef.current;
      const branches = normBranchesList(base.settings?.branches);
      const branchId = String(purchaseEntry.branchId || "").trim() || getDefaultBranchId(branches);
      const lines = (purchaseEntry.lines || [])
        .map((l) => ({
          item: (l.item || "").trim(),
          qty: num(l.qty),
          costPerUnit: num(l.costPerUnit),
        }))
        .filter((l) => l.item && l.qty > 0);
      if (!lines.length) {
        showToast("Add at least one line item");
        return;
      }
      if (!(purchaseEntry.supplierName || "").trim()) {
        showToast("Enter supplier name");
        return;
      }
      const invoiceRef = (purchaseEntry.invoiceRef || "").trim();
      const dup = findDuplicatePurchase(
        base.purchases,
        purchaseEntry.supplierName,
        invoiceRef,
        editingPurchaseId,
      );
      if (dup) {
        showToast("This supplier invoice # was already entered");
        return;
      }
      const totalAmount = roundMoney2(lines.reduce((s, l) => s + l.qty * l.costPerUnit, 0));

      if (editingPurchaseId) {
        const oldPurchase = (base.purchases || []).find((p) => p && p.id === editingPurchaseId);
        if (!oldPurchase) {
          showToast("Purchase not found");
          return;
        }
        const rawPurchase = {
          ...oldPurchase,
          date: purchaseEntry.date,
          dueDate: String(purchaseEntry.dueDate || "").slice(0, 10),
          branchId,
          supplierName: purchaseEntry.supplierName.trim(),
          invoiceRef: (purchaseEntry.invoiceRef || "").trim(),
          lines,
          notes: (purchaseEntry.notes || "").trim(),
          paymentEntries: Array.isArray(oldPurchase.paymentEntries) ? oldPurchase.paymentEntries : [],
        };
        const normalizedPurchases = normPurchasesList([rawPurchase]);
        if (!normalizedPurchases.length) {
          showToast("Could not update purchase — check line items.");
          return;
        }
        const purchase = normalizedPurchases[0];
        const invLines = lines.map((line) => ({
          id: makeId(),
          date: purchaseEntry.date,
          item: line.item,
          type: "in",
          qty: line.qty,
          qtyIn: line.qty,
          costPerUnit: line.costPerUnit,
          salesPrice: 0,
          note: "",
          category: "",
          bankAccountId: "",
          branchId,
          purchaseId: editingPurchaseId,
        }));
        const invWithoutBase = (base.inventoryEntries || []).filter(
          (e) => !e || String(e.purchaseId || "") !== String(editingPurchaseId),
        );
        let nextEdit = {
          ...base,
          purchases: (base.purchases || []).map((p) =>
            p && p.id === editingPurchaseId ? purchase : p,
          ),
          inventoryEntries: [...invLines, ...invWithoutBase],
        };
        nextEdit = appendAuditEvent(nextEdit, {
          entityType: "purchases",
          recordId: String(editingPurchaseId),
          action: "update",
          note: `Purchase ${(purchase.invoiceRef || "").trim() || ""} updated`,
          details: { totalAmount: purchase.totalAmount, outstanding: purchase.outstanding },
        });
        try {
          const __pe = await persistWholeStateImmediate(nextEdit);
          if (__pe) {
            setState(__pe);
            setEditingPurchaseId(null);
            setScreen(null);
            showToast("Purchase updated");
          } else {
            showToast("Could not save purchase");
          }
        } catch {
          showToast("Could not save purchase");
        }
        return;
      }

      const paidRaw = roundMoney2(num(purchaseEntry.paidAmount));
      const payApply = Math.min(paidRaw, totalAmount);
      const banks = base.balance?.bankAccounts || [];
      const bid = String(purchaseEntry.bankAccountId || "").trim() || getDefaultBankAccountId(banks);
      if (payApply > 0.01 && !banks.length) {
        showToast("Add a bank or cash account under Accounts to record supplier payments.");
        return;
      }
      if (payApply > 0.01 && banks.length && !banks.some((b) => b && String(b.id) === bid)) {
        showToast("Choose a bank account");
        return;
      }
      const purchaseId = makeId();
      const paymentEntries =
        payApply > 0.01 && bid
          ? [
              {
                id: makeId(),
                date: purchaseEntry.date,
                amount: payApply,
                bankAccountId: bid,
              },
            ]
          : [];
      const rawPurchase = {
        id: purchaseId,
        date: purchaseEntry.date,
        dueDate: String(purchaseEntry.dueDate || "").slice(0, 10),
        branchId,
        supplierName: purchaseEntry.supplierName.trim(),
        invoiceRef: (purchaseEntry.invoiceRef || "").trim(),
        lines,
        paymentEntries,
        notes: (purchaseEntry.notes || "").trim(),
      };
      const normalizedPurchases = normPurchasesList([rawPurchase]);
      if (!normalizedPurchases.length) {
        showToast("Could not save purchase — check line items.");
        return;
      }
      const purchase = normalizedPurchases[0];
      const invLines = lines.map((line) => ({
        id: makeId(),
        date: purchaseEntry.date,
        item: line.item,
        type: "in",
        qty: line.qty,
        qtyIn: line.qty,
        costPerUnit: line.costPerUnit,
        salesPrice: 0,
        note: "",
        category: "",
        bankAccountId: "",
        branchId,
        purchaseId,
      }));
      let next = {
        ...base,
        purchases: [purchase, ...(base.purchases || [])],
        inventoryEntries: [...invLines, ...(base.inventoryEntries || [])],
      };
      next = appendAuditEvent(next, {
        entityType: "purchases",
        recordId: String(purchase.id),
        action: "create",
        note: `Purchase ${(purchase.invoiceRef || "").trim() || ""} created`,
        details: { totalAmount: purchase.totalAmount, outstanding: purchase.outstanding },
      });
      try {
        const __p = await persistWholeStateImmediate(next);
        if (__p) {
          setState(__p);
          setScreen(null);
          showToast("Purchase saved");
        } else {
          showToast("Could not save purchase");
        }
      } catch {
        showToast("Could not save purchase");
      }
    },
    [
      appendAuditEvent,
      editingPurchaseId,
      latestStateRef,
      persistWholeStateImmediate,
      purchaseEntry,
      setEditingPurchaseId,
      setScreen,
      setState,
      showToast,
    ],
  );

  return { onSavePurchase };
}
