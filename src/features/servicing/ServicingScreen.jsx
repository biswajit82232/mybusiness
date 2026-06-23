import { useMemo, useState } from "react";
import {
  buildServicingWhatsAppMessage,
  dateHuman,
  deriveServicingSlots,
  servicingVisitStatusLabel,
  waMessageHref,
} from "@/domain/index.js";
import { IcServicing, IcPhone, IcWhatsApp } from "@/shared/ui/icons/AppIcons.jsx";
import { EmptyState, TabPageChrome } from "@/shared/ui/layout/AppChrome.jsx";

const FILTERS = [
  { id: "pending", label: "Pending" },
  { id: "overdue", label: "Overdue" },
  { id: "done", label: "Done" },
  { id: "all", label: "All" },
];

export function ServicingScreen({
  sales,
  servicingCompletions,
  businessName,
  onMarkComplete,
  onUndoComplete,
  onOpenSale,
  onOpenSidebar,
}) {
  const [filter, setFilter] = useState("pending");
  const slots = useMemo(
    () => deriveServicingSlots(sales, servicingCompletions),
    [sales, servicingCompletions],
  );

  const counts = useMemo(() => {
    let pending = 0;
    let overdue = 0;
    let done = 0;
    for (const s of slots) {
      if (s.completed) done += 1;
      else if (s.status === "overdue") overdue += 1;
      else pending += 1;
    }
    return { pending, overdue, done };
  }, [slots]);

  const filtered = useMemo(() => {
    if (filter === "all") return slots;
    if (filter === "done") return slots.filter((s) => s.completed);
    if (filter === "overdue") return slots.filter((s) => !s.completed && s.status === "overdue");
    return slots.filter((s) => !s.completed);
  }, [slots, filter]);

  const filterCount = (id) => {
    if (id === "all") return slots.length;
    if (id === "done") return counts.done;
    if (id === "overdue") return counts.overdue;
    return counts.pending;
  };

  return (
    <TabPageChrome title="Servicing" onOpenSidebar={onOpenSidebar} className="tab-page--servicing">
      <div className="seg-bar servicing-seg">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            className={`seg-btn${filter === f.id ? " active" : ""}`}
            aria-pressed={filter === f.id}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
            {filterCount(f.id) > 0 ? ` (${filterCount(f.id)})` : ""}
          </button>
        ))}
        <span className="seg-sort-hint">3 free visits · mo 1–3</span>
      </div>

      <div className="tab-page-scroll">
        <div className="list-area servicing-list-area">
          {filtered.length === 0 ? (
            <EmptyState
              icon={<IcServicing />}
              title={filter === "done" ? "No completed visits yet" : "Nothing here"}
              sub="Visits are created from your sales invoices."
            />
          ) : (
            <ul className="svc-list" role="list">
              {filtered.map((slot) => {
                const st = servicingVisitStatusLabel(slot.completed ? "done" : slot.status, slot.completed);
                const wa = slot.phone
                  ? waMessageHref(slot.phone, buildServicingWhatsAppMessage(slot, { businessName }))
                  : null;
                return (
                  <li key={slot.id} className="svc-row">
                    <div className="svc-row-main">
                      <span className="svc-visit-num" aria-label={`Visit ${slot.serviceNum} of 3`}>
                        {slot.serviceNum}
                      </span>
                      <div className="svc-row-text">
                        <div className="svc-row-line1">
                          <span className="svc-name">{slot.customerName}</span>
                          <span className={`status-badge status-badge--sm ${st.cls}`}>{st.text}</span>
                        </div>
                        <span className="svc-row-line2">
                          Due {dateHuman(slot.dueDate)}
                          {slot.invoiceNo ? ` · ${slot.invoiceNo}` : ""}
                        </span>
                      </div>
                    </div>
                    <div className="svc-row-foot">
                      {slot.completed ? (
                        <button
                          type="button"
                          className="svc-action svc-action--ghost"
                          onClick={() => onUndoComplete?.(slot.saleId, slot.serviceNum)}
                        >
                          Undo
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="svc-action svc-action--primary"
                          onClick={() => onMarkComplete?.(slot.saleId, slot.serviceNum)}
                        >
                          Done
                        </button>
                      )}
                      {slot.invoiceNo ? (
                        <button
                          type="button"
                          className="svc-action svc-action--ghost"
                          onClick={() => onOpenSale?.(slot.saleId)}
                        >
                          Invoice
                        </button>
                      ) : null}
                      {wa ? (
                        <a
                          href={wa}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="svc-icon-btn"
                          aria-label="WhatsApp"
                        >
                          <IcWhatsApp />
                        </a>
                      ) : slot.phone ? (
                        <a href={`tel:${slot.phone}`} className="svc-icon-btn" aria-label="Call">
                          <IcPhone />
                        </a>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </TabPageChrome>
  );
}
