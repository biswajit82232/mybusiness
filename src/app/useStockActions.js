import { useCallback } from "react";
import {
  computeInvRowsForBranch,
  getDefaultBankAccountId,
  getDefaultBranchId,
  makeId,
  normBranchesList,
  num,
} from "@/domain/index.js";

/**
 * Add/edit stock entries (inventory ledger).
 */
export function useStockActions({
  state,
  stockEntry,
  editingInventoryId,
  showToast,
  setState,
  setScreen,
  setPage,
  setEditingInventoryId,
  persistWholeStateImmediate,
  stockNavRef,
}) {
  const finishAddStockNavigation = useCallback(() => {
    setEditingInventoryId(null);
    const from = stockNavRef.current.from;
    stockNavRef.current = { from: "default" };
    if (from === "banking") {
      setScreen("bankAccountDetail");
    } else if (from === "ledger") {
      setScreen(null);
      setPage("ledger");
    } else if (from === "inventoryItem") {
      setScreen("inventoryItemDetail");
    } else {
      setScreen(null);
    }
  }, [setEditingInventoryId, setPage, setScreen, stockNavRef]);

  const onSaveStock = useCallback(
    async (e) => {
      e.preventDefault();
      const item = stockEntry.item.trim();
      const isOpening = stockEntry.type === "opening";
      const isIn = stockEntry.type === "in" || isOpening;
      const qtyNum = num(stockEntry.qty);
      if (!item) {
        showToast(isIn ? "Enter a product name or pick from list" : "Select a product");
        return;
      }
      if (!qtyNum || qtyNum <= 0) {
        showToast("Enter a valid quantity");
        return;
      }
      const branches = normBranchesList(state.settings?.branches);
      const stockBranchId = String(stockEntry.branchId || "").trim() || getDefaultBranchId(branches);
      if (!branches.some((b) => b && b.id === stockBranchId)) {
        showToast("Choose a branch");
        return;
      }
      const branchScopedRows = computeInvRowsForBranch(
        state.inventoryEntries || [],
        stockBranchId,
        branches,
      );
      if (!isIn) {
        const row = branchScopedRows.find((r) => r.item.toLowerCase() === item.toLowerCase());
        if (!row) {
          showToast("Select a product from the list");
          return;
        }
        if (qtyNum > row.currentQty + 1e-9) {
          showToast(
            `Only ${row.currentQty % 1 === 0 ? row.currentQty : row.currentQty.toFixed(2)} Nos on hand at this branch`,
          );
          return;
        }
      }

      const banks = state.balance?.bankAccounts || [];
      const stockBankId =
        isIn && !isOpening
          ? String(stockEntry.bankAccountId || "").trim() || getDefaultBankAccountId(banks)
          : "";
      if (
        isIn &&
        !isOpening &&
        banks.length > 0 &&
        !banks.some((b) => b && String(b.id) === stockBankId)
      ) {
        showToast("Choose an account for this purchase");
        return;
      }
      const entry = {
        id: editingInventoryId || makeId(),
        date: stockEntry.date,
        item,
        type: stockEntry.type,
        qty: qtyNum,
        qtyIn: isIn ? qtyNum : 0,
        costPerUnit: isIn ? num(stockEntry.costPerUnit) : 0,
        salesPrice: isIn ? num(stockEntry.salesPrice) : 0,
        category: String(stockEntry.category || "").trim(),
        note: (stockEntry.note || "").trim(),
        bankAccountId: isIn && !isOpening ? stockBankId : "",
        branchId: stockBranchId,
      };
      const next = editingInventoryId
        ? {
            ...state,
            inventoryEntries: (state.inventoryEntries || []).map((it) =>
              it && it.id === editingInventoryId ? entry : it,
            ),
          }
        : { ...state, inventoryEntries: [entry, ...(state.inventoryEntries || [])] };
      const __p = await persistWholeStateImmediate(next);
      if (__p) setState(__p);
      finishAddStockNavigation();
      showToast(
        editingInventoryId
          ? "Stock updated"
          : isOpening
            ? "Opening stock saved"
            : isIn
              ? "Stock added"
              : "Stock deducted",
      );
    },
    [
      editingInventoryId,
      finishAddStockNavigation,
      persistWholeStateImmediate,
      setState,
      showToast,
      state,
      stockEntry,
    ],
  );

  return { onSaveStock };
}

