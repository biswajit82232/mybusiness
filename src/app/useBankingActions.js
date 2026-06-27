import { useCallback } from "react";
import {
  BANK_EXTERNAL_SINK_ID,
  BANK_EXTERNAL_SOURCE_ID,
  makeId,
  mergePersistedPayload,
  normBankTransfers,
  normalizeBankAccountKind,
  num,
  todayStr,
} from "@/domain/index.js";

/**
 * Banking save/remove actions for account + transfer records.
 */
export function useBankingActions({
  state,
  setState,
  showToast,
  persistWholeStateImmediate,
  bankSaveInFlightRef,
}) {
  const saveBank = useCallback(() => {
    if (typeof document !== "undefined") {
      const ae = document.activeElement;
      if (ae && typeof ae.blur === "function") ae.blur();
    }
    // Read latest state inside setState (functional updater). latestStateRef can lag
    // behind blur/onChange because it is updated in useEffect — saving would miss edits.
    setState((base) => {
      if (bankSaveInFlightRef.current) return base;
      bankSaveInFlightRef.current = true;
      void (async () => {
        try {
          const next = {
            ...base,
            balance: {
              ...base.balance,
              bankAccounts: (base.balance?.bankAccounts || []).map((a) => ({
                ...a,
                name: (a.name || "").trim() || "Account",
                openingBalance: num(a.openingBalance),
                balanceAdjustment:
                  a.balanceAdjustment != null && a.balanceAdjustment !== ""
                    ? num(a.balanceAdjustment)
                    : null,
                kind: normalizeBankAccountKind((a.name || "").trim() || "Account", a.kind),
              })),
              bankTransfers: normBankTransfers(base.balance?.bankTransfers),
            },
          };
          const __p = await persistWholeStateImmediate(next);
          if (__p) {
            setState(__p);
            showToast("Saved");
          } else {
            showToast("Could not save account — try again");
          }
        } catch {
          showToast("Could not save account — try again");
        } finally {
          bankSaveInFlightRef.current = false;
        }
      })();
      return base;
    });
  }, [bankSaveInFlightRef, persistWholeStateImmediate, setState, showToast]);

  const removeBankTransfer = useCallback(
    async (transferId) => {
      const id = String(transferId || "").trim();
      if (!id) return false;
      const next = {
        ...state,
        balance: {
          ...state.balance,
          bankTransfers: normBankTransfers(
            (state.balance.bankTransfers || []).filter((t) => t && String(t.id) !== id),
          ),
        },
      };
      const __p = await persistWholeStateImmediate(next);
      if (__p) {
        setState(__p);
        showToast("Transfer removed");
        return true;
      }
      showToast("Could not remove transfer");
      return false;
    },
    [persistWholeStateImmediate, setState, showToast, state],
  );

  const addBankTransfer = useCallback(
    async ({ fromAccountId, toAccountId, amount, date, note, kind }) => {
      const fromId = String(fromAccountId || "").trim();
      const toId = String(toAccountId || "").trim();
      if (!fromId || !toId || fromId === toId) {
        showToast("Choose two different accounts");
        return false;
      }
      const amt = num(amount);
      if (!(amt > 0)) {
        showToast("Enter a valid amount");
        return false;
      }
      const banks = state.balance?.bankAccounts || [];
      const isExternalFrom = fromId === BANK_EXTERNAL_SOURCE_ID || fromId === BANK_EXTERNAL_SINK_ID;
      const isExternalTo = toId === BANK_EXTERNAL_SOURCE_ID || toId === BANK_EXTERNAL_SINK_ID;
      const fromAcc = banks.find((a) => a && a.id === fromId);
      const toAcc = banks.find((a) => a && a.id === toId);
      if ((!fromAcc && !isExternalFrom) || (!toAcc && !isExternalTo)) {
        showToast("Accounts not found");
        return false;
      }
      const entry = {
        id: makeId(),
        date: String(date || todayStr()).slice(0, 10),
        fromAccountId: fromId,
        toAccountId: toId,
        amount: amt,
        note: String(note || "").trim(),
        kind: String(kind || "").trim() || undefined,
      };
      const next = {
        ...state,
        balance: {
          ...state.balance,
          bankTransfers: normBankTransfers([...(state.balance.bankTransfers || []), entry]),
        },
      };
      const preview = mergePersistedPayload(next);
      if (!preview) {
        showToast("Could not apply transfer");
        return false;
      }
      if (!isExternalFrom) {
        const fromBal = preview.balance.bankAccounts.find((a) => a && a.id === fromId);
        if (num(fromBal?.amount) < -1e-6) {
          showToast("Not enough balance in the source account");
          return false;
        }
      }
      const __p = await persistWholeStateImmediate(next);
      if (__p) setState(__p);
      showToast("Transfer saved");
      return true;
    },
    [persistWholeStateImmediate, setState, showToast, state],
  );

  return { saveBank, removeBankTransfer, addBankTransfer };
}

