import { useEffect } from "react";
import { buildSaleDraftEnvelope, saleEntryHasDraftContent, normSalesList, saleToEntry } from "@/domain/index.js";

/**
 * Debounced autosave of in-progress sale form.
 * When editing a draft sale (status draft), updates the sales record directly.
 * Otherwise falls back to settings.saleDraft for legacy form-only drafts.
 */
export function useSaleDraftAutosave({ screen, editingSaleId, saleEntry, setState, state }) {
  useEffect(() => {
    if (screen !== "newSale" || !saleEntryHasDraftContent(saleEntry)) return undefined;

    const timer = setTimeout(() => {
      if (editingSaleId) {
        const existing = (state?.sales || []).find((s) => s && s.id === editingSaleId);
        if (existing?.status === "draft") {
          setState((prev) => {
            const draftPatch = saleToEntry(saleEntry, null);
            const merged = normSalesList(
              [
                {
                  ...existing,
                  ...draftPatch,
                  id: editingSaleId,
                  status: "draft",
                  invoiceNo: "",
                },
              ],
              prev.balance?.bankAccounts || [],
            )[0];
            return {
              ...prev,
              sales: (prev.sales || []).map((s) => (s?.id === editingSaleId ? merged : s)),
            };
          });
          return;
        }
      }

      if (editingSaleId) return;

      const envelope = buildSaleDraftEnvelope(saleEntry);
      if (!envelope) return;
      setState((prev) => {
        const prevDraft = prev.settings?.saleDraft;
        if (
          prevDraft &&
          prevDraft.savedAt === envelope.savedAt &&
          JSON.stringify(prevDraft.entry) === JSON.stringify(envelope.entry)
        ) {
          return prev;
        }
        return {
          ...prev,
          settings: { ...prev.settings, saleDraft: envelope },
        };
      });
    }, 600);

    return () => clearTimeout(timer);
  }, [screen, editingSaleId, saleEntry, setState, state?.sales]);
}
