import { useMemo } from "react";
import {
  addDaysStr,
  buildServicingWhatsAppMessage,
  dateHuman,
  dateSlash,
  deriveServicingSlotsForSale,
  hasSaleAddress,
  isEmiDuePaid,
  moneyFull,
  normalizePaymentEntries,
  num,
  saleAddressLines,
  saleStatus,
  servicingVisitStatusLabel,
  waMessageHref,
} from "@/domain/index.js";
import { IcEdit, IcPrint, IcServicing, IcTrash, IcWhatsApp } from "@/shared/ui/icons/AppIcons.jsx";
import { ContactIcons, OverlayScreen, PageHeader } from "@/shared/ui/layout/AppChrome.jsx";

/**
 * @param {object} [invoiceCompany] — from settings: businessName, businessPhone, businessWhatsapp
 */
export function SaleDetailScreen({
  sale,
  emi,
  defaultDueDays = 30,
  auditEvents = [],
  bankAccounts = [],
  invoiceCompany = {},
  servicingCompletions = [],
  businessName = "",
  onClose,
  onEdit,
  onPayment,
  onDelete,
  onOpenServicing,
  onMarkServicingComplete,
  onUndoServicingComplete,
}) {
  const isBos = sale?.docType === "billOfSupply";
  const docLabel = isBos ? "Bill of Supply" : "Invoice";
  const docLabelUpper = isBos ? "BILL OF SUPPLY" : "INVOICE";
  const st = saleStatus(sale, defaultDueDays);
  const dueDate = sale.dueDate || addDaysStr(sale.date, defaultDueDays);
  const payRows = useMemo(() => normalizePaymentEntries(sale), [sale]);
  const invoiceLines = useMemo(() => {
    const arr = Array.isArray(sale?.lineItems) ? sale.lineItems : [];
    if (arr.length > 0) return arr;
    return [
      {
        id: "legacy-1",
        item: sale.item || "",
        qty: num(sale.qty),
        salePrice: num(sale.salePrice),
        costPrice: num(sale.costPrice),
      },
    ];
  }, [sale]);
  const lineSubtotal = useMemo(
    () => invoiceLines.reduce((s, li) => s + num(li.qty) * num(li.salePrice), 0),
    [invoiceLines],
  );
  const servicingSlots = useMemo(
    () => deriveServicingSlotsForSale(sale, servicingCompletions),
    [sale, servicingCompletions],
  );
  const servicingDone = servicingSlots.filter((s) => s.completed).length;

  const acctName = (id) => {
    const a = bankAccounts.find((b) => b && String(b.id) === String(id));
    return (a?.name || "").trim() || "Account";
  };
  const waLink = waMessageHref(
    sale.customerNo1,
    `${docLabel} ${sale.invoiceNo || "—"} · ${sale.customerName || "Customer"} · Due ${moneyFull(sale.outstanding)}`,
  );

  const coName = String(invoiceCompany.businessName || "").trim() || "Invoice";
  const coPhone = String(invoiceCompany.businessPhone || "").trim();
  const coWa = String(invoiceCompany.businessWhatsapp || "").trim();

  return (
    <OverlayScreen className="sale-detail-print">
      <PageHeader
        title={docLabel}
        onBack={onClose}
        right={
          <div className="detail-hdr-actions">
            <button
              type="button"
              className="icon-btn icon-btn-sm hdr-print-hide"
              onClick={() => window.print()}
              aria-label={`Print ${docLabel.toLowerCase()}`}
            >
              <IcPrint />
            </button>
            {waLink ? (
              <a
                className="icon-btn icon-btn-sm hdr-print-hide"
                href={waLink}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Share ${docLabel.toLowerCase()} on WhatsApp`}
                title="Share on WhatsApp"
              >
                <IcWhatsApp />
              </a>
            ) : null}
            <button type="button" className="icon-btn icon-btn-sm hdr-print-hide" onClick={onEdit} aria-label={`Edit ${docLabel.toLowerCase()}`}>
              <IcEdit />
            </button>
            <button type="button" className="icon-btn icon-btn-sm detail-hdr-del-ic hdr-print-hide" onClick={onDelete} aria-label={`Delete ${docLabel.toLowerCase()}`}>
              <IcTrash />
            </button>
          </div>
        }
      />

      <div className="invoice-print-only" aria-hidden="true">
        <div className="invoice-print-sheet">
          <header className="ips-head">
            <div className="ips-brand">
              <h1 className="ips-co-name">{coName}</h1>
              {(coPhone || coWa) && (
                <p className="ips-co-line">
                  {[coPhone ? `Tel: ${coPhone}` : null, coWa ? `WhatsApp: ${coWa}` : null].filter(Boolean).join(" · ")}
                </p>
              )}
            </div>
            <div className="ips-doc-title">
              <h2>{docLabelUpper}</h2>
            </div>
          </header>

          <div className="ips-meta-grid">
            <div className="ips-meta-box">
              <div className="ips-meta-row">
                <span>{docLabel} no.</span>
                <strong>{sale.invoiceNo || "—"}</strong>
              </div>
              <div className="ips-meta-row">
                <span>{docLabel} date</span>
                <strong>{dateSlash(sale.date)}</strong>
              </div>
            </div>
            <div className="ips-bill-to">
              <h3>{docLabel} to</h3>
              <p className="ips-bill-name">{sale.customerName || "—"}</p>
              {sale.customerNo1 ? <p className="ips-bill-line">{sale.customerNo1}</p> : null}
              {sale.customerNo2?.trim() ? <p className="ips-bill-line">{sale.customerNo2}</p> : null}
              {hasSaleAddress(sale) && (
                <p className="ips-bill-addr">{saleAddressLines(sale).join(", ")}</p>
              )}
            </div>
          </div>

          <table className="ips-table">
            <thead>
              <tr>
                <th className="ips-col-desc">Description</th>
                <th className="ips-col-qty">Qty</th>
                <th className="ips-col-rate">Rate (₹)</th>
                <th className="ips-col-amt">Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              {invoiceLines.map((li, idx) => (
                <tr key={li.id || idx}>
                  <td className="ips-col-desc">
                    <span className="ips-item-name">{li.item || "—"}</span>
                    {idx === 0 && sale.description?.trim() ? (
                      <span className="ips-item-sub">{sale.description.trim()}</span>
                    ) : null}
                  </td>
                  <td className="ips-col-qty">{num(li.qty)}</td>
                  <td className="ips-col-rate">{moneyFull(li.salePrice)}</td>
                  <td className="ips-col-amt">{moneyFull(num(li.qty) * num(li.salePrice))}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="ips-summary">
            <div className="ips-summary-rows">
              {num(sale.discount) > 0 ? (
                <>
                  <div className="ips-sum-row">
                    <span>Subtotal</span>
                    <span>{moneyFull(lineSubtotal)}</span>
                  </div>
                  <div className="ips-sum-row">
                    <span>Discount</span>
                    <span>−{moneyFull(sale.discount)}</span>
                  </div>
                </>
              ) : null}
              <div className="ips-sum-row ips-sum-row--grand">
                <span>Total</span>
                <span>{moneyFull(sale.totalSale)}</span>
              </div>
              <div className="ips-sum-row">
                <span>Amount received</span>
                <span>{moneyFull(sale.received)}</span>
              </div>
              <div className="ips-sum-row ips-sum-row--due">
                <span>Balance due</span>
                <span>{moneyFull(sale.outstanding)}</span>
              </div>
            </div>
          </div>

          <footer className="ips-footer">
            <p>Thank you for your business.</p>
            {coPhone ? <p className="ips-footer-small">For queries, call {coPhone}</p> : null}
          </footer>
        </div>
      </div>

      <div className="overlay-scroll detail-scroll invoice-screen-only">
        <section className="detail-hero detail-hero-v2">
          <div className="dh-topline">
            <div className="dh-topline-left">
              <span className="dh-inv">{sale.invoiceNo || "—"}</span>
              <span className="dh-doc-type">{docLabel}</span>
            </div>
            <span className={`status-badge ${st.cls}`}>{st.text}</span>
          </div>
          <h2 className="dh-name">{sale.customerName || "Customer"}</h2>
          <div className="detail-kpi-grid detail-kpi-grid--3">
            <div className="detail-kpi">
              <span className="detail-kpi-lbl">Balance due</span>
              <strong className={`detail-kpi-val${sale.outstanding > 0 ? " is-due" : ""}`}>{moneyFull(sale.outstanding)}</strong>
            </div>
            <div className="detail-kpi">
              <span className="detail-kpi-lbl">Received</span>
              <strong className="detail-kpi-val is-paid">{moneyFull(sale.received)}</strong>
            </div>
            <div className="detail-kpi">
              <span className="detail-kpi-lbl">Total</span>
              <strong className="detail-kpi-val">{moneyFull(sale.totalSale)}</strong>
            </div>
          </div>
        </section>

        <section className={`detail-actions detail-actions-v2 hdr-print-hide${sale.outstanding > 0 ? " detail-actions-v2--split" : ""}`}>
          {sale.outstanding > 0 ? (
            <button type="button" className="action-btn" onClick={onPayment}>
              Record payment
            </button>
          ) : null}
          {typeof onOpenServicing === "function" ? (
            <button type="button" className="edit-entry-btn" onClick={onOpenServicing}>
              <IcServicing />
              Servicing ({servicingDone}/3)
            </button>
          ) : null}
        </section>

        <section className="detail-card detail-card-v2">
          <div className="dc-title">Invoice details</div>
          <dl className="dc-dl dc-dl-grid">
            <div>
              <dt>Date</dt>
              <dd>{dateHuman(sale.date)}</dd>
            </div>
            <div>
              <dt>Due date</dt>
              <dd>{dateHuman(dueDate)}</dd>
            </div>
            <div>
              <dt>Phone</dt>
              <dd className="dc-phone-dd">
                <span>{sale.customerNo1 || "—"}</span>
                <ContactIcons phone={sale.customerNo1} />
              </dd>
            </div>
            {sale.customerNo2?.trim() ? (
              <div>
                <dt>Phone 2</dt>
                <dd className="dc-phone-dd">
                  <span>{sale.customerNo2}</span>
                  <ContactIcons phone={sale.customerNo2} />
                </dd>
              </div>
            ) : null}
            {hasSaleAddress(sale) ? (
              <div className="dc-dl-span">
                <dt>Address</dt>
                <dd className="dc-address-dd">{saleAddressLines(sale).join("\n")}</dd>
              </div>
            ) : null}
          </dl>
        </section>

        <section className="detail-card detail-card-v2">
          <div className="dc-title">
            Line items
            {invoiceLines.length > 1 ? (
              <span className="dc-title-meta">{invoiceLines.length} items</span>
            ) : null}
          </div>
          <div className="dc-items-head">
            <span>Item</span>
            <span>Amount</span>
          </div>
          {invoiceLines.map((li, idx) => (
            <div className="dc-item-row" key={li.id || idx}>
              <div className="dc-item-main">
                <strong>{li.item || "—"}</strong>
                <p className="dc-item-sub">
                  {num(li.qty)} × {moneyFull(li.salePrice)}
                </p>
              </div>
              <strong className="dc-item-amt">{moneyFull(num(li.qty) * num(li.salePrice))}</strong>
            </div>
          ))}
          <div className="dc-totals">
            {num(sale.discount) > 0 ? (
              <>
                <div>
                  <span>Subtotal</span>
                  <span>{moneyFull(lineSubtotal)}</span>
                </div>
                <div>
                  <span>Discount</span>
                  <span>−{moneyFull(sale.discount)}</span>
                </div>
              </>
            ) : null}
            <div className="dc-total-line">
              <span>Invoice total</span>
              <span>{moneyFull(sale.totalSale)}</span>
            </div>
            <div className="hdr-print-hide">
              <span>Cost</span>
              <span>{moneyFull(sale.totalCost)}</span>
            </div>
            <div className="dc-profit hdr-print-hide">
              <span>Gross profit</span>
              <span>{moneyFull(sale.grossProfit)}</span>
            </div>
          </div>
        </section>

        {servicingSlots.length > 0 && (
          <section className="detail-card detail-card-v2 sale-detail-servicing">
            <div className="dc-title-row">
              <div className="dc-title">Free servicing</div>
              {typeof onOpenServicing === "function" ? (
                <button type="button" className="text-btn dc-title-link" onClick={onOpenServicing}>
                  Open servicing
                </button>
              ) : null}
            </div>
            <p className="sale-detail-svc-hint">3 complimentary visits — months 1, 2, and 3 after purchase</p>
            <ul className="sale-detail-svc-list" role="list">
              {servicingSlots.map((slot) => {
                const vst = servicingVisitStatusLabel(slot.status, slot.completed);
                const wa = slot.phone
                  ? waMessageHref(slot.phone, buildServicingWhatsAppMessage(slot, { businessName }))
                  : null;
                return (
                  <li key={slot.id} className="sale-detail-svc-row">
                    <span className="sale-detail-svc-num">{slot.serviceNum}</span>
                    <div className="sale-detail-svc-body">
                      <div className="sale-detail-svc-line1">
                        <span>Visit {slot.serviceNum}/3</span>
                        <span className={`status-badge status-badge--sm ${vst.cls}`}>{vst.text}</span>
                      </div>
                      <span className="sale-detail-svc-due">
                        Due {dateHuman(slot.dueDate)}
                        {slot.completed && slot.completedDate ? ` · Done ${dateHuman(slot.completedDate)}` : ""}
                      </span>
                    </div>
                    <div className="sale-detail-svc-actions">
                      {slot.completed ? (
                        <button
                          type="button"
                          className="svc-action svc-action--ghost"
                          onClick={() => onUndoServicingComplete?.(slot.saleId, slot.serviceNum)}
                        >
                          Undo
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="svc-action svc-action--primary"
                          onClick={() => onMarkServicingComplete?.(slot.saleId, slot.serviceNum)}
                        >
                          Done
                        </button>
                      )}
                      {wa ? (
                        <a href={wa} target="_blank" rel="noopener noreferrer" className="svc-icon-btn" aria-label="WhatsApp">
                          <IcWhatsApp />
                        </a>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {payRows.length > 0 && (
          <section className="detail-card detail-card-v2">
            <div className="dc-title">Payments received</div>
            <ul className="sale-pay-list" role="list">
              {payRows.map((pe) => (
                <li key={pe.id} className="sale-pay-row">
                  <span className="sale-pay-date">{dateSlash(pe.date)}</span>
                  <span className="sale-pay-acct">{acctName(pe.bankAccountId)}</span>
                  <strong className="sale-pay-amt">{moneyFull(pe.amount)}</strong>
                </li>
              ))}
            </ul>
          </section>
        )}

        {(sale.description || sale.note) && (
          <section className="detail-card detail-card-v2">
            <div className="dc-title">Notes</div>
            {sale.description ? (
              <p className="dc-note-block">
                <span className="dc-note-lbl">Description</span>
                {sale.description}
              </p>
            ) : null}
            {sale.note ? (
              <p className="dc-note-block hdr-print-hide">
                <span className="dc-note-lbl">Internal note</span>
                {sale.note}
              </p>
            ) : null}
          </section>
        )}

        {auditEvents.length > 0 && (
          <section className="detail-card detail-card-v2">
            <div className="dc-title">History</div>
            <ul className="sale-pay-list" role="list">
              {[...auditEvents]
                .sort((a, b) => String(b.at || "").localeCompare(String(a.at || "")))
                .slice(0, 20)
                .map((ev) => (
                  <li key={ev.id} className="sale-pay-row">
                    <span className="sale-pay-date">{dateSlash(String(ev.at || "").slice(0, 10))}</span>
                    <span className="sale-pay-acct">{ev.note || ev.action}</span>
                  </li>
                ))}
            </ul>
          </section>
        )}

        {emi && (
          <section className="detail-card detail-card-v2">
            <div className="dc-title">Finance</div>
            <dl className="dc-dl dc-dl-grid">
              <div>
                <dt>Company</dt>
                <dd>{emi.financeCompany || "—"}</dd>
              </div>
              <div>
                <dt>DO no.</dt>
                <dd>{emi.doNo || "—"}</dd>
              </div>
              <div>
                <dt>Loan amount</dt>
                <dd>{moneyFull(emi.loanAmount)}</dd>
              </div>
              <div>
                <dt>Down payment</dt>
                <dd>{moneyFull(emi.downPayment)}</dd>
              </div>
              <div>
                <dt>EMI amount</dt>
                <dd>{moneyFull(emi.emiAmount)}</dd>
              </div>
              <div className="dc-dl-span">
                <dt>EMI dates</dt>
                <dd>
                  {(emi.dueDates || []).length
                    ? (emi.dueDates || [])
                        .map((dt) => `${dateSlash(dt)}${isEmiDuePaid(emi, dt) ? " (paid)" : ""}`)
                        .join(" · ")
                    : "—"}
                </dd>
              </div>
            </dl>
          </section>
        )}
      </div>
    </OverlayScreen>
  );
}
