import { useMemo, useState } from "react";
import {
  buildServicingWhatsAppMessage,
  dateHuman,
  deriveServicingSlots,
  getServicingWaSentAt,
  partitionUpcomingServicingSlots,
  SERVICING_UPCOMING_DAYS,
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

function ServicingSlotRow({
  slot,
  businessName,
  waSentAt,
  onMarkComplete,
  onUndoComplete,
  onOpenSale,
  onMarkWaSent,
}) {
  const st = servicingVisitStatusLabel(slot.completed ? "done" : slot.status, slot.completed);
  const wa = slot.phone
    ? waMessageHref(slot.phone, buildServicingWhatsAppMessage(slot, { businessName }))
    : null;

  return (
    <li className="svc-row">
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
          <div className="svc-wa-wrap">
            {waSentAt ? (
              <span className="svc-sent-mark" title={`WhatsApp sent ${dateHuman(waSentAt)}`}>
                Sent
              </span>
            ) : null}
            <a
              href={wa}
              target="_blank"
              rel="noopener noreferrer"
              className={`svc-icon-btn${waSentAt ? " svc-icon-btn--sent" : ""}`}
              aria-label={waSentAt ? "WhatsApp reminder sent — open again" : "Send WhatsApp reminder"}
              onClick={() => onMarkWaSent?.(slot.saleId, slot.serviceNum)}
            >
              <IcWhatsApp />
            </a>
          </div>
        ) : slot.phone ? (
          <a href={`tel:${slot.phone}`} className="svc-icon-btn" aria-label="Call">
            <IcPhone />
          </a>
        ) : null}
      </div>
    </li>
  );
}

export function ServicingScreen({
  sales,
  servicingCompletions,
  servicingWaSent = [],
  businessName,
  onMarkComplete,
  onUndoComplete,
  onMarkWaSent,
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

  const upcoming = useMemo(() => {
    if (filter === "done") return [];
    return partitionUpcomingServicingSlots(slots, SERVICING_UPCOMING_DAYS);
  }, [slots, filter]);

  const upcomingIds = useMemo(() => new Set(upcoming.map((s) => s.id)), [upcoming]);

  const filteredRest = useMemo(
    () => filtered.filter((s) => !upcomingIds.has(s.id)),
    [filtered, upcomingIds],
  );

  const filterCount = (id) => {
    if (id === "all") return slots.length;
    if (id === "done") return counts.done;
    if (id === "overdue") return counts.overdue;
    return counts.pending;
  };

  const rowProps = {
    businessName,
    onMarkComplete,
    onUndoComplete,
    onOpenSale,
    onMarkWaSent,
  };

  const renderRows = (list) =>
    list.map((slot) => (
      <ServicingSlotRow
        key={slot.id}
        slot={slot}
        waSentAt={getServicingWaSentAt(servicingWaSent, slot.saleId, slot.serviceNum)}
        {...rowProps}
      />
    ));

  const hasList = upcoming.length > 0 || filteredRest.length > 0;

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
          {!hasList ? (
            <EmptyState
              icon={<IcServicing />}
              title={filter === "done" ? "No completed visits yet" : "Nothing here"}
              sub="Visits are created from your sales invoices."
            />
          ) : (
            <>
              {upcoming.length > 0 ? (
                <section className="svc-upcoming-group" aria-label={`Upcoming ${SERVICING_UPCOMING_DAYS} days`}>
                  <h2 className="svc-upcoming-hd">
                    Next {SERVICING_UPCOMING_DAYS} days
                    <span className="svc-upcoming-count">{upcoming.length}</span>
                  </h2>
                  <ul className="svc-list svc-list--upcoming" role="list">
                    {renderRows(upcoming)}
                  </ul>
                </section>
              ) : null}
              {filteredRest.length > 0 ? (
                <section className={upcoming.length > 0 ? "svc-rest-group" : undefined}>
                  {upcoming.length > 0 ? <h2 className="svc-rest-hd">Later</h2> : null}
                  <ul className="svc-list" role="list">
                    {renderRows(filteredRest)}
                  </ul>
                </section>
              ) : null}
            </>
          )}
        </div>
      </div>
    </TabPageChrome>
  );
}
