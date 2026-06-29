import { useCallback } from "react";
import { getDefaultBankAccountId, makeId, num, toPaise, resolveOtherIncomeCategory } from "@/domain/index.js";

/**
 * Save-other-income handler (new + edit).
 */
export function useOtherIncomeActions({
  state,
  oiEntry,
  editingOtherIncomeId,
  showToast,
  setState,
  setScreen,
  setPage,
  setEditingOtherIncomeId,
  persistWholeStateImmediate,
  otherIncomeOpenedFromRef,
}) {
  const onSaveOtherIncome = useCallback(
    async (e) => {
      e.preventDefault();
      if (!num(oiEntry.amount)) return;
      const banks = state.balance?.bankAccounts || [];
      const bid = String(oiEntry.bankAccountId || "").trim() || getDefaultBankAccountId(banks);
      if (banks.length > 0 && !banks.some((b) => b && String(b.id) === bid)) {
        showToast("Choose an account for this receipt");
        return;
      }
      if (editingOtherIncomeId) {
        const existing = (state.otherIncomes || []).find((x) => x && x.id === editingOtherIncomeId);
        if (!existing) {
          showToast("Entry not found");
          setEditingOtherIncomeId(null);
          setScreen(null);
          setPage("otherIncome");
          return;
        }
        const updated = {
          ...existing,
          date: oiEntry.date,
          amount: toPaise(num(oiEntry.amount)),
          category: resolveOtherIncomeCategory(oiEntry.category, state.settings),
          description: (oiEntry.description || "").trim(),
          note: (oiEntry.note || "").trim(),
          bankAccountId: bid,
        };
        const next = {
          ...state,
          otherIncomes: (state.otherIncomes || []).map((x) =>
            x && x.id === editingOtherIncomeId ? updated : x,
          ),
        };
        const __p = await persistWholeStateImmediate(next);
        if (__p) setState(__p);
        setEditingOtherIncomeId(null);
        const oiFrom = otherIncomeOpenedFromRef.current.from;
        if (oiFrom === "detail") {
          setScreen("otherIncomeDetail");
        } else if (oiFrom === "banking") setScreen("bankAccountDetail");
        else if (oiFrom === "ledger") {
          setScreen(null);
          setPage("ledger");
        } else {
          setScreen(null);
          setPage("otherIncome");
        }
        showToast("Income updated");
        return;
      }
      const row = {
        id: makeId(),
        date: oiEntry.date,
        amount: toPaise(num(oiEntry.amount)),
        category: resolveOtherIncomeCategory(oiEntry.category, state.settings),
        description: (oiEntry.description || "").trim(),
        note: (oiEntry.note || "").trim(),
        bankAccountId: bid,
      };
      const next = { ...state, otherIncomes: [row, ...(state.otherIncomes || [])] };
      const __p = await persistWholeStateImmediate(next);
      if (__p) setState(__p);
      setScreen(null);
      setPage("otherIncome");
      showToast("Income saved");
    },
    [
      editingOtherIncomeId,
      oiEntry,
      otherIncomeOpenedFromRef,
      persistWholeStateImmediate,
      setEditingOtherIncomeId,
      setPage,
      setScreen,
      setState,
      showToast,
      state,
    ],
  );

  return { onSaveOtherIncome };
}

