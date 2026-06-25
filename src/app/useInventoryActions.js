import { useCallback } from "react";
import {
  computeInvRowsAggregated,
  normalizeItemKey,
  renameInventoryProductInState,
} from "@/domain/index.js";

/**
 * Inventory catalog helpers (product category on stock rows, rename product).
 */
export function useInventoryActions({ state, showToast, setState, persistWholeStateImmediate }) {
  const patchInventoryProductCategory = useCallback(
    async (itemKey, category) => {
      const k = String(itemKey || "").toLowerCase();
      if (!k) return;
      const cat = String(category || "").trim();
      const next = {
        ...state,
        inventoryEntries: (state.inventoryEntries || []).map((e) =>
          e && (e.item || "").toLowerCase() === k ? { ...e, category: cat } : e,
        ),
      };
      try {
        const __p = await persistWholeStateImmediate(next);
        if (__p) {
          setState(__p);
          showToast("Category saved");
        } else {
          showToast("Could not save category");
        }
      } catch {
        showToast("Could not save category");
      }
    },
    [persistWholeStateImmediate, setState, showToast, state],
  );

  const renameInventoryProduct = useCallback(
    async (itemKey, newName, onRenamed) => {
      const oldKey = normalizeItemKey(itemKey);
      const name = String(newName || "")
        .trim()
        .replace(/\s+/g, " ");
      if (!oldKey || !name) {
        showToast("Enter a product name");
        return false;
      }
      if (normalizeItemKey(name) === oldKey) return true;

      const rows = computeInvRowsAggregated(state.inventoryEntries || []);
      const clash = rows.find(
        (r) => r?.item && normalizeItemKey(r.item) === normalizeItemKey(name) && normalizeItemKey(r.item) !== oldKey,
      );
      if (clash) {
        showToast("A product with that name already exists");
        return false;
      }

      const next = renameInventoryProductInState(state, oldKey, name);
      try {
        const __p = await persistWholeStateImmediate(next);
        if (__p) {
          setState(__p);
          showToast("Product renamed");
          onRenamed?.({ itemKey: normalizeItemKey(name), displayName: name });
          return true;
        }
        showToast("Could not save name");
        return false;
      } catch {
        showToast("Could not save name");
        return false;
      }
    },
    [persistWholeStateImmediate, setState, showToast, state],
  );

  const patchInventoryProductTaxMeta = useCallback(
    async (itemKey, { hsn, gstRate }) => {
      const k = String(itemKey || "").toLowerCase();
      if (!k) return;
      const hsnVal = String(hsn ?? "").trim();
      const rateVal = Math.max(0, Number(gstRate) || 0);
      const next = {
        ...state,
        inventoryEntries: (state.inventoryEntries || []).map((e) =>
          e && (e.item || "").toLowerCase() === k
            ? { ...e, hsn: hsnVal, gstRate: rateVal }
            : e,
        ),
      };
      try {
        const __p = await persistWholeStateImmediate(next);
        if (__p) {
          setState(__p);
          showToast("Product tax info saved");
        } else {
          showToast("Could not save product tax info");
        }
      } catch {
        showToast("Could not save product tax info");
      }
    },
    [persistWholeStateImmediate, setState, showToast, state],
  );

  return { patchInventoryProductCategory, patchInventoryProductTaxMeta, renameInventoryProduct };
}
