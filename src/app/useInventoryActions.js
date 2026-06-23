import { useCallback } from "react";

/**
 * Inventory catalog helpers (product category on stock rows).
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

  return { patchInventoryProductCategory };
}
