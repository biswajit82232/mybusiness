import { useEffect } from "react";
import { buildSaleDraftEnvelope, saleEntryHasDraftContent } from "@/domain/index.js";

/**
 * Debounced autosave of in-progress new-sale form into settings.saleDraft.
 * Skips while editing an existing sale.
 */
export function useSaleDraftAutosave({ screen, editingSaleId, saleEntry, setState }) {
  useEffect(() => {
    if (screen !== "newSale" || editingSaleId) return undefined;
    if (!saleEntryHasDraftContent(saleEntry)) return undefined;

    const timer = setTimeout(() => {
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
  }, [screen, editingSaleId, saleEntry, setState]);
}
