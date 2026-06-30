import { useCallback } from "react";
import { buildCreditNoteFromSale, applyCreditNote } from "@/utils/creditNote.js";
import { isGstEnabled } from "@/domain/invoiceGst.js";
import { num } from "@/domain/index.js";

/**
 * Issue credit note against a confirmed sale (Phase 2 CN flow).
 */
export function useCreditNoteActions({
  state,
  showToast,
  setState,
  setScreen,
  setSelSaleId,
  setSelCreditNoteId,
  persistWholeStateImmediate,
  appendAuditEvent,
}) {
  const openIssueCreditNote = useCallback(
    (sale) => {
      if (!sale || sale.status !== "confirmed") {
        showToast("Only confirmed invoices can receive credit notes");
        return;
      }
      setSelSaleId(sale.id);
      setScreen("issueCreditNote");
    },
    [setScreen, setSelSaleId, showToast],
  );

  const openCreditNoteDetail = useCallback(
    (cnId) => {
      setSelCreditNoteId(cnId);
      setScreen("creditNoteDetail");
    },
    [setScreen, setSelCreditNoteId],
  );

  const closeCreditNoteFlow = useCallback(() => {
    setScreen("saleDetail");
  }, [setScreen]);

  const issueCreditNote = useCallback(
    async ({ saleId, itemsToReturn, reason, reasonNote }) => {
      const sale = (state.sales || []).find((s) => s && s.id === saleId);
      if (!sale) {
        showToast("Invoice not found");
        return false;
      }
      if (sale.status !== "confirmed") {
        showToast("Only confirmed invoices can be cancelled via credit note");
        return false;
      }

      const bizState = String(state.settings?.businessState || "").trim();
      const custState = String(sale.customerState || "").trim();
      const isInterState =
        isGstEnabled(state.settings) &&
        bizState &&
        custState &&
        bizState.toLowerCase() !== custState.toLowerCase();

      let creditNote;
      try {
        creditNote = buildCreditNoteFromSale({
          sale,
          itemsToReturn,
          reason,
          reasonNote,
          existingCreditNotes: state.creditNotes || [],
          isInterState,
        });
      } catch (err) {
        showToast(err?.message || "Could not build credit note");
        return false;
      }

      let next = applyCreditNote(state, creditNote);
      next = appendAuditEvent(next, {
        entityType: "sales",
        recordId: String(sale.id),
        action: "credit_note",
        note: `Credit note ${creditNote.creditNoteNumber} issued against ${sale.invoiceNo}`,
        details: { creditNoteId: creditNote.id, grandTotalPaise: creditNote.grandTotalPaise },
      });

      const __p = await persistWholeStateImmediate(next);
      if (__p) setState(__p);
      setSelCreditNoteId(creditNote.id);
      setScreen("creditNoteDetail");
      showToast("Credit note issued");
      return true;
    },
    [
      appendAuditEvent,
      persistWholeStateImmediate,
      setScreen,
      setSelCreditNoteId,
      setState,
      showToast,
      state,
    ],
  );

  return {
    openIssueCreditNote,
    openCreditNoteDetail,
    closeCreditNoteFlow,
    issueCreditNote,
  };
}

/** Default return qty map from sale line items (full return). */
export function defaultReturnQuantities(sale) {
  return (sale?.lineItems || []).map((li) => ({
    itemId: li.id,
    quantity: num(li.qty),
    maxQty: num(li.qty),
    description: li.item,
  }));
}
