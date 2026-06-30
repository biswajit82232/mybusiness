import { useMemo, useState } from "react";
import {
  addDaysStr,
  additionalChargesLabel,
  buildSaleShareWhatsAppMessage,
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
import { normalizeDocType, saleDocLabel } from "@/domain/saleDocuments.js";
import { IcEdit, IcEye, IcPrint, IcServicing, IcTrash, IcWhatsApp } from "@/shared/ui/icons/AppIcons.jsx";
import { ContactIcons, OverlayScreen, PageHeader } from "@/shared/ui/layout/AppChrome.jsx";
import { InvoicePreviewModal } from "./InvoicePreviewModal.jsx";
import { InvoicePrintSheet } from "./InvoicePrintSheet.jsx";
import { COLORS, FONT_SIZE, SPACING } from "@/tokens.js";

const METHOD_LABELS = {
  cash: "💵 Cash",
  upi: "📱 UPI",
  bank_transfer: "🏦 Bank",
  cheque: "📝 Cheque",
  other: "Other",
};

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
  onDuplicate,
  onCreditNote,
  onDebitNote,
  onPayment,
  onDelete,
  onOpenServicing,
  onMarkServicingComplete,
  onUndoServicingComplete,
}) {
  const docType = normalizeDocType(sale?.docType);
  const isBos = docType === "billOfSupply";
  const isDraft = sale?.status === "draft";
  const isCancelled = sale?.status === "cancelled";
  const docLabel = saleDocLabel(docType);
  const linkedRef = String(sale?.linkedInvoiceNo || "").trim();
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
  const waLink = waMessageHref(sale.customerNo1, buildSaleShareWhatsAppMessage(sale, { businessName }));
  const [previewOpen, setPreviewOpen] = useState(false);

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
              onClick={() => setPreviewOpen(true)}
              aria-label={`Preview ${docLabel.toLowerCase()}`}
              title="Preview invoice"
            >
              <IcEye />
            </button>
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
        <InvoicePrintSheet sale={sale} settings={invoiceCompany} />
      </div>

      <div className="overlay-scroll detail-scroll invoice-screen-only">
        <section className="detail-hero detail-hero-v2">
          <div className="dh-topline">
            <div className="dh-topline-left">
              {isDraft ? (
                <span
                  style={{
                    backgroundColor: COLORS.warningBg,
                    color: COLORS.warning,
                    fontSize: FONT_SIZE.section,
                    fontWeight: 600,
                    padding: `${SPACING.xs}px ${SPACING.md}px`,
                    borderRadius: 4,
                  }}
                >
                  DRAFT
                </span>
              ) : (
                <span className="dh-inv">{sale.invoiceNo || "—"}</span>
              )}
              <span className="dh-doc-type">{docLabel}</span>
            </div>
            {isCancelled ? (
              <span className="status-badge" style={{ backgroundColor: COLORS.dangerBg, color: COLORS.danger }}>
                Cancelled
              </span>
            ) : (
              <span className={`status-badge ${st.cls}`}>{isDraft ? "Draft" : st.text}</span>
            )}
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

        <section className={`detail-actions detail-actions-v2 hdr-print-hide${sale.outstanding > 0 || typeof onOpenServicing === "function" ? " detail-actions-v2--split" : ""}`}>
          {sale.outstanding > 0 ? (
            <button type="button" className="action-btn" onClick={onPayment}>
              Record payment
            </button>
          ) : null}
          <button type="button" className="edit-entry-btn" onClick={() => setPreviewOpen(true)}>
            <IcEye />
            Preview {isBos ? "bill" : "invoice"}
          </button>
          {typeof onOpenServicing === "function" ? (
            <button type="button" className="edit-entry-btn" onClick={onOpenServicing}>
              <IcServicing />
              Servicing ({servicingDone}/3)
            </button>
          ) : null}
        </section>

        <section className="detail-actions detail-actions-v2 hdr-print-hide">
          {typeof onDuplicate === "function" ? (
            <button type="button" className="edit-entry-btn" onClick={onDuplicate}>
              Duplicate
            </button>
          ) : null}
          {typeof onCreditNote === "function" && docType === "invoice" ? (
            <button type="button" className="edit-entry-btn" onClick={onCreditNote}>
              Credit note
            </button>
          ) : null}
          {typeof onDebitNote === "function" && docType === "invoice" ? (
            <button type="button" className="edit-entry-btn" onClick={onDebitNote}>
              Debit note
            </button>
          ) : null}
        </section>

        <section className="detail-card detail-card-v2">
          <div className="dc-title">Invoice details</div>
          <dl className="dc-dl dc-dl-grid">
            {linkedRef ? (
              <div>
                <dt>Against invoice</dt>
                <dd>{linkedRef}</dd>
              </div>
            ) : null}
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
                {String(li.itemDescription || "").trim() ? (
                  <p className="dc-item-desc">{li.itemDescription}</p>
                ) : null}
                <p className="dc-item-sub">
                  {num(li.qty)} × {moneyFull(li.salePrice)}
                </p>
              </div>
              <strong className="dc-item-amt">{moneyFull(num(li.qty) * num(li.salePrice))}</strong>
            </div>
          ))}
          <div className="dc-totals">
            {num(sale.discount) > 0 || num(sale.additionalCharges) > 0 ? (
              <>
                <div>
                  <span>Subtotal</span>
                  <span>{moneyFull(lineSubtotal)}</span>
                </div>
                {num(sale.discount) > 0 ? (
                  <div>
                    <span>Discount</span>
                    <span>−{moneyFull(sale.discount)}</span>
                  </div>
                ) : null}
                {num(sale.additionalCharges) > 0 ? (
                  <div>
                    <span>{additionalChargesLabel(invoiceCompany)}</span>
                    <span>+{moneyFull(sale.additionalCharges)}</span>
                  </div>
                ) : null}
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

        {sale.status !== "draft" && (
          <section className="detail-card detail-card-v2">
            <div className="dc-title">Payments</div>
            <div className="dc-totals">
              <div>
                <span>Invoice total</span>
                <span>{moneyFull(sale.totalSale)}</span>
              </div>
              <div>
                <span>Amount paid</span>
                <span style={{ color: COLORS.amountPositive }}>{moneyFull(sale.totalPaidPaise ?? sale.received)}</span>
              </div>
              <div>
                <span>Balance due</span>
                <span style={{ color: (sale.balanceDuePaise ?? sale.outstanding) > 0 ? COLORS.amountNegative : COLORS.amountPositive }}>
                  {moneyFull(sale.balanceDuePaise ?? sale.outstanding)}
                </span>
              </div>
            </div>
            {sale.paymentStatus ? (
              <span
                className="status-badge"
                style={{
                  marginTop: SPACING.sm,
                  backgroundColor:
                    sale.paymentStatus === "paid"
                      ? COLORS.successBg
                      : sale.paymentStatus === "partial"
                        ? COLORS.warningBg
                        : COLORS.dangerBg,
                  color:
                    sale.paymentStatus === "paid"
                      ? COLORS.success
                      : sale.paymentStatus === "partial"
                        ? COLORS.warning
                        : COLORS.danger,
                }}
              >
                {(sale.paymentStatus || "unpaid").toUpperCase()}
              </span>
            ) : null}
            {payRows.length > 0 ? (
              <ul className="sale-pay-list" role="list" style={{ marginTop: SPACING.md }}>
                {payRows.map((pe) => (
                  <li key={pe.id} className="sale-pay-row">
                    <span className="sale-pay-date">{dateSlash(pe.date)}</span>
                    <span className="sale-pay-acct">
                      {METHOD_LABELS[pe.method] || pe.method || acctName(pe.bankAccountId)}
                      {pe.reference ? ` · ${pe.reference}` : ""}
                    </span>
                    <strong className="sale-pay-amt" style={{ color: COLORS.amountPositive }}>
                      {moneyFull(pe.amount)}
                    </strong>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        )}

        {payRows.length > 0 && sale.status === "draft" && (
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

      {previewOpen ? (
        <InvoicePreviewModal
          sale={sale}
          settings={invoiceCompany}
          docLabel={docLabel}
          onClose={() => setPreviewOpen(false)}
        />
      ) : null}
    </OverlayScreen>
  );
}
