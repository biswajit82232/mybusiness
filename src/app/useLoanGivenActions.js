import { useCallback } from "react";

import {

  allocateLoanGivenPaymentInterestFirst,

  applyLoanGivenTypedPayment,

  deleteLoanGivenRepaymentEntry,

  reconcileLoanGivenRepayments,

  emptyLoanGivenForm,

  inferLoanGivenPartnersInterestBasis,

  makeId,

  normLoansGivenList,

  normLoanGivenPartners,

  num,

  resetLoanGivenTimer,

  sumLoanRepaymentEntriesAmount,

  todayStr,

} from "@/domain/index.js";



/**

 * Save-loan-given handler (new + edit), typed payments, and timer reset.

 */

export function useLoanGivenActions({

  state,

  loanGivenEntry,

  editingLoanGivenId,

  showToast,

  setState,

  setEditingLoanGivenId,

  setLoanGivenEntry,

  setScreen,

  setPage,

  persistWholeStateImmediate,

}) {

  const persistLoan = useCallback(

    async (loanId, buildRaw) => {

      const existing = (state.loansGiven || []).find((x) => x && x.id === loanId);

      if (!existing) {

        showToast("Loan not found");

        return false;

      }

      const raw = buildRaw(existing);

      const mergedList = [...(state.loansGiven || []).filter((x) => x && x.id !== loanId), raw];

      const loansGiven = normLoansGivenList(mergedList);

      if (!loansGiven.some((x) => x.id === loanId)) {

        showToast("Could not update loan");

        return false;

      }

      const next = { ...state, loansGiven };

      const saved = await persistWholeStateImmediate(next);

      if (saved) setState(saved);

      return !!saved;

    },

    [persistWholeStateImmediate, setState, showToast, state],

  );



  const onSaveLoanGiven = useCallback(

    async (e) => {

      e.preventDefault();

      const wasEdit = !!editingLoanGivenId;

      const name = String(loanGivenEntry.borrowerName || "").trim();

      if (!name) return;

      if (!num(loanGivenEntry.principal)) {

        showToast("Enter a loan amount");

        return;

      }

      const id = editingLoanGivenId || makeId();

      const existing = editingLoanGivenId

        ? (state.loansGiven || []).find((x) => x && x.id === editingLoanGivenId)

        : null;

      const repaymentEntries = (loanGivenEntry.repaymentEntries || []).map((r) => ({

        id: String(r.id || makeId()),

        date: String(r.date || todayStr()).slice(0, 10),

        amount: num(r.amount),

        bankAccountId: "",

        paymentKind: r.paymentKind === "principal" ? "principal" : r.paymentKind === "interest" ? "interest" : "",

      }));

      const principalNum = num(loanGivenEntry.principal);

      const prevLineSum = sumLoanRepaymentEntriesAmount({

        repaymentEntries: existing?.repaymentEntries || [],

      });

      const newLineSum = sumLoanRepaymentEntriesAmount({

        repaymentEntries: loanGivenEntry.repaymentEntries || [],

      });

      const hasTypedRepayments = repaymentEntries.some(
        (r) => r.paymentKind === "interest" || r.paymentKind === "principal",
      );

      let interestAlloc;
      let principalRepaidAlloc;
      let closedFromSync = loanGivenEntry.closed === true;

      if (hasTypedRepayments) {
        const synced = reconcileLoanGivenRepayments(
          {
            id,
            principal: principalNum,
            principalRepaid: num(loanGivenEntry.principalRepaid),
            interestOutstanding: num(loanGivenEntry.interestOutstanding),
            interestRateMonthlyPct: num(loanGivenEntry.interestRateMonthlyPct),
            dateGiven: String(loanGivenEntry.dateGiven || todayStr()).slice(0, 10),
            closed: loanGivenEntry.closed === true,
            repaymentEntries,
          },
          { interestOutstandingForm: loanGivenEntry.interestOutstanding },
        );
        interestAlloc = synced.interestOutstanding;
        principalRepaidAlloc = synced.principalRepaid;
        closedFromSync = synced.closed === true;
      } else {
        const alloc = allocateLoanGivenPaymentInterestFirst({
          principal: principalNum,
          prevPrincipalRepaid: num(existing?.principalRepaid ?? 0),
          prevRepaymentLineSum: prevLineSum,
          newRepaymentLineSum: newLineSum,
          interestOutstandingForm: num(loanGivenEntry.interestOutstanding),
          principalRepaidForm: num(loanGivenEntry.principalRepaid),
        });
        interestAlloc = alloc.interestOutstanding;
        principalRepaidAlloc = alloc.principalRepaid;
      }

      const partners = normLoanGivenPartners(loanGivenEntry.partners || [], principalNum).map((p) => ({

        id: String(p.id || makeId()),

        name: String(p.name || "").trim(),

        amountGiven: num(p.amountGiven),

        interestSharePct: num(p.interestSharePct),

      })).filter((p) => p.name && (p.amountGiven > 0 || p.interestSharePct > 0));

      const partnersInterestBasis = existing?.partnersInterestBasis

        ? inferLoanGivenPartnersInterestBasis(partners, existing.partnersInterestBasis)

        : inferLoanGivenPartnersInterestBasis(partners, "principalMonthly");

      const raw = {

        id,

        borrowerName: name,

        phone: String(loanGivenEntry.phone || "").trim(),

        principal: principalNum,

        principalRepaid: principalRepaidAlloc,

        interestRateMonthlyPct: num(loanGivenEntry.interestRateMonthlyPct),

        interestOutstanding: interestAlloc,

        description: String(loanGivenEntry.description || "").trim(),

        dateGiven: String(loanGivenEntry.dateGiven || todayStr()).slice(0, 10),

        dueDate: String(loanGivenEntry.dueDate || "").trim().slice(0, 10),

        closed: closedFromSync,

        trackOnBalanceSheet: loanGivenEntry.trackOnBalanceSheet !== false,

        createdAt: existing?.createdAt || todayStr(),

        disbursementBankAccountId: "",

        disbursementDate: "",

        disbursementAmount: 0,

        repaymentEntries,

        partners,

        partnersInterestBasis,

      };

      const mergedList = [...(state.loansGiven || []).filter((x) => x && x.id !== id), raw];

      const loansGiven = normLoansGivenList(mergedList);

      if (!loansGiven.some((x) => x.id === id)) {

        showToast("Check borrower name and loan amount");

        return;

      }

      const next = { ...state, loansGiven };

      const __p = await persistWholeStateImmediate(next);

      if (__p) setState(__p);

      setEditingLoanGivenId(null);

      setLoanGivenEntry(emptyLoanGivenForm());

      setScreen(null);

      setPage("loansGiven");

      showToast(wasEdit ? "Loan updated" : "Loan saved");

    },

    [

      editingLoanGivenId,

      loanGivenEntry,

      persistWholeStateImmediate,

      setEditingLoanGivenId,

      setLoanGivenEntry,

      setPage,

      setScreen,

      setState,

      showToast,

      state,

    ],

  );



  const onRecordLoanGivenPayment = useCallback(

    async (loanId, { kind, amount, date }) => {

      const id = String(loanId || "").trim();

      if (!id) return;

      const payKind = kind === "principal" ? "principal" : "interest";

      const ok = await persistLoan(id, (existing) => {

        const patched = applyLoanGivenTypedPayment(existing, { amount, date, kind: payKind });

        return patched || existing;

      });

      if (ok) showToast(payKind === "principal" ? "Principal payment recorded" : "Interest payment recorded");

    },

    [persistLoan, showToast],

  );



  const onResetLoanGivenTimer = useCallback(

    async (loanId) => {

      const id = String(loanId || "").trim();

      if (!id) return;

      const ok = await persistLoan(id, (existing) => resetLoanGivenTimer(existing, todayStr()));

      if (ok) showToast("Loan timer reset — counting from today");

    },

    [persistLoan, showToast],

  );

  const onDeleteLoanGivenPayment = useCallback(
    async (loanId, repaymentId) => {
      const id = String(loanId || "").trim();
      const rid = String(repaymentId || "").trim();
      if (!id || !rid) return;
      const ok = await persistLoan(id, (existing) => {
        const patched = deleteLoanGivenRepaymentEntry(existing, rid);
        return patched || existing;
      });
      if (ok) showToast("Payment deleted");
    },
    [persistLoan, showToast],
  );



  return { onSaveLoanGiven, onRecordLoanGivenPayment, onDeleteLoanGivenPayment, onResetLoanGivenTimer };

}

