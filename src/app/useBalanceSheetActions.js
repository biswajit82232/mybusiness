import { useCallback } from "react";
import { makeId, num, roundMoney2 } from "@/domain/index.js";

/**
 * Fixed assets + balance-sheet fields (other assets, payables, capital).
 */
export function useBalanceSheetActions({
  latestStateRef,
  showToast,
  setState,
  persistWholeStateImmediate,
}) {
  const patchFixed = useCallback(
    (id, patch) => {
      setState((p) => ({
        ...p,
        balance: {
          ...p.balance,
          fixedAssetAccounts: (p.balance.fixedAssetAccounts || []).map((a) =>
            a.id === id ? { ...a, ...patch } : a,
          ),
        },
      }));
    },
    [setState],
  );

  const addFixed = useCallback(() => {
    setState((p) => ({
      ...p,
      balance: {
        ...p.balance,
        fixedAssetAccounts: [
          ...(p.balance.fixedAssetAccounts || []),
          { id: makeId(), name: "New Asset", amount: 0 },
        ],
      },
    }));
  }, [setState]);

  const removeFixed = useCallback(
    (id) => {
      setState((p) => ({
        ...p,
        balance: {
          ...p.balance,
          fixedAssetAccounts: (p.balance.fixedAssetAccounts || []).filter((a) => a.id !== id),
        },
      }));
    },
    [setState],
  );

  const saveFixed = useCallback(async () => {
    if (typeof document !== "undefined") {
      const ae = document.activeElement;
      if (ae && typeof ae.blur === "function") ae.blur();
    }
    await Promise.resolve();
    const base = latestStateRef.current;
    const next = {
      ...base,
      balance: {
        ...base.balance,
        fixedAssetAccounts: ((base.balance && base.balance.fixedAssetAccounts) || []).map((a) => ({
          ...a,
          name: (a.name || "").trim() || "Asset",
          amount: num(a.amount),
          purchaseDate: a.purchaseDate ? String(a.purchaseDate).slice(0, 10) : "",
          depreciationRatePct: num(a.depreciationRatePct),
          accumulatedDepreciation: num(a.accumulatedDepreciation),
        })),
      },
    };
    try {
      const __p = await persistWholeStateImmediate(next);
      if (__p) {
        setState(__p);
        showToast("Saved");
      } else {
        showToast("Could not save fixed assets");
      }
    } catch {
      showToast("Could not save fixed assets");
    }
  }, [latestStateRef, persistWholeStateImmediate, setState, showToast]);

  const saveOtherBalance = useCallback(
    async (e) => {
      e.preventDefault();
      try {
        const d = new FormData(e.currentTarget);
        const base = latestStateRef.current;
        const next = {
          ...base,
          balance: {
            ...base.balance,
            otherAssets: num(d.get("otherAssets")),
            supplierPayables: num(d.get("supplierPayables")),
            loans: num(d.get("loans")),
          },
        };
        const __p = await persistWholeStateImmediate(next);
        if (__p) {
          setState(__p);
          showToast("Balance updated");
        } else {
          showToast("Could not save balance — try again");
        }
      } catch {
        showToast("Could not save balance — try again");
      }
    },
    [latestStateRef, persistWholeStateImmediate, setState, showToast],
  );

  const saveOwnerCapitalInvested = useCallback(
    async (amount) => {
      try {
        const base = latestStateRef.current;
        const next = {
          ...base,
          balance: { ...base.balance, ownerCapitalInvested: roundMoney2(num(amount)) },
        };
        const __p = await persistWholeStateImmediate(next);
        if (__p) {
          setState(__p);
          showToast("Investment saved");
        } else {
          showToast("Could not save investment — try again");
        }
      } catch {
        showToast("Could not save investment — try again");
      }
    },
    [latestStateRef, persistWholeStateImmediate, setState, showToast],
  );

  return {
    patchFixed,
    addFixed,
    removeFixed,
    saveFixed,
    saveOtherBalance,
    saveOwnerCapitalInvested,
  };
}
