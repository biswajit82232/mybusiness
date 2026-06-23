import { useCallback } from "react";
import {
  advanceRecurringDate,
  getDefaultBankAccountId,
  makeId,
  num,
  processRecurringExpenses,
  resolveExpenseCategory,
} from "@/domain/index.js";

/**
 * Save-expense handler (new + edit), including optional recurring schedule.
 */
export function useExpenseActions({
  state,
  expEntry,
  editingExpenseId,
  showToast,
  setState,
  setScreen,
  setPage,
  setEditingExpenseId,
  persistWholeStateImmediate,
  expenseNavRef,
  newExpenseOpenedFromRef,
}) {
  const onSaveExpense = useCallback(
    async (e) => {
      e.preventDefault();
      if (!num(expEntry.amount)) return;
      if (editingExpenseId) {
        const existing = (state.expenses || []).find((x) => x && x.id === editingExpenseId);
        if (!existing) {
          showToast("Expense not found");
          setEditingExpenseId(null);
          if (expenseNavRef.current.from === "expenseCategory") {
            setScreen("expenseCategory");
          } else {
            setScreen(null);
            setPage("expenses");
          }
          return;
        }
        const updated = {
          ...existing,
          date: expEntry.date,
          amount: num(expEntry.amount),
          category: resolveExpenseCategory(expEntry.category, state.settings),
          description: (expEntry.description || "").trim(),
          note: (expEntry.note || "").trim(),
          bankAccountId:
            String(expEntry.bankAccountId || "").trim() ||
            getDefaultBankAccountId(state.balance?.bankAccounts),
        };
        const next = {
          ...state,
          expenses: (state.expenses || []).map((x) => (x && x.id === editingExpenseId ? updated : x)),
        };
        const __p = await persistWholeStateImmediate(next);
        if (__p) setState(__p);
        setEditingExpenseId(null);
        setScreen("expenseDetail");
        showToast("Expense updated");
        return;
      }
      const base = {
        id: makeId(),
        date: expEntry.date,
        amount: num(expEntry.amount),
        category: resolveExpenseCategory(expEntry.category, state.settings),
        description: (expEntry.description || "").trim(),
        note: (expEntry.note || "").trim(),
        bankAccountId:
          String(expEntry.bankAccountId || "").trim() ||
          getDefaultBankAccountId(state.balance?.bankAccounts),
      };
      const expense = { ...base };
      if (expEntry.recurring) {
        const rid = makeId();
        const nextDue = advanceRecurringDate(expEntry.date, expEntry.frequency || "monthly");
        const next = processRecurringExpenses({
          ...state,
          expenses: [expense, ...(state.expenses || [])],
          recurringExpenses: [
            ...(state.recurringExpenses || []),
            {
              id: rid,
              amount: base.amount,
              category: base.category,
              description: base.description,
              note: base.note,
              bankAccountId: base.bankAccountId,
              frequency: expEntry.frequency || "monthly",
              nextDueDate: nextDue,
              active: true,
            },
          ],
        });
        const __p = await persistWholeStateImmediate(next);
        if (__p) setState(__p);
        if (newExpenseOpenedFromRef.current.screen === "expenseCategory") {
          setScreen("expenseCategory");
        } else {
          setScreen(null);
          setPage("expenses");
        }
        showToast("Expense saved · recurring schedule added");
        return;
      }
      const next = { ...state, expenses: [expense, ...(state.expenses || [])] };
      const __p = await persistWholeStateImmediate(next);
      if (__p) setState(__p);
      if (newExpenseOpenedFromRef.current.screen === "expenseCategory") {
        setScreen("expenseCategory");
      } else {
        setScreen(null);
        setPage("expenses");
      }
      showToast("Expense saved");
    },
    [
      editingExpenseId,
      expEntry,
      expenseNavRef,
      newExpenseOpenedFromRef,
      persistWholeStateImmediate,
      setEditingExpenseId,
      setPage,
      setScreen,
      setState,
      showToast,
      state,
    ],
  );

  return { onSaveExpense };
}

