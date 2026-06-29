import { useEffect, useRef, useState } from "react";
import {
  bankAccountLabel,
  dateHuman,
  dateSlash,
  money,
  moneyFull,
  num,
  PAYMENT_KIND,
  PAYMENT_KIND_LABEL,
} from "@/domain/index.js";
import { IcEye, IcPrint, IcX } from "@/shared/ui/icons/AppIcons.jsx";
import { PaymentReceiptSheet } from "./PaymentReceiptSheet.jsx";

export function PaymentDetailPanel({
  row,
  bankAccounts = [],
  settings = {},
  sales = [],
  onOpenSale,
  onOpenPurchase,
  onApplyAdvance,
}) {
  const [receiptOpen, setReceiptOpen] = useState(false);
  const sheetRef = useRef(null);
  const bankLabel = bankAccountLabel(bankAccounts, row?.bankAccountId);

  useEffect(() => {
    setReceiptOpen(false);
  }, [row?.key]);

  if (!row) {
    return (
      <div className="payments-detail payments-detail--empty">
        <p>Select a payment from the list to view details and print a receipt.</p>
      </div>
    );
  }

  const isIn = row.dir === "in";
  const kindLabel = PAYMENT_KIND_LABEL[row.kind] || "Payment";
  const displayId = row.receiptNo || row.id || "—";
  const unapplied = num(row.unapplied);
  const customerSales = (sales || []).filter(
    (s) =>
      num(s.outstanding) > 0 &&
      String(s.customerName || "").trim().toLowerCase() === String(row.partyName || "").trim().toLowerCase(),
  );

  return (
    <div className="payments-detail">
      <div className="payments-detail-hdr">
        <div>
          <span className={`payments-dir-pill payments-dir-pill--${row.dir}`}>{isIn ? "Money in" : "Money out"}</span>
          <h2 className="payments-detail-title">{moneyFull(row.amount)}</h2>
          <p className="payments-detail-sub">{kindLabel}</p>
        </div>
        <div className="payments-detail-actions">
          <button type="button" className="edit-entry-btn" onClick={() => setReceiptOpen(true)}>
            <IcEye />
            Receipt
          </button>
          <button
            type="button"
            className="edit-entry-btn"
            onClick={() => {
              setReceiptOpen(true);
              setTimeout(() => window.print(), 200);
            }}
          >
            <IcPrint />
            Print
          </button>
        </div>
      </div>

      <dl className="payments-detail-dl">
        <div>
          <dt>Payment ID</dt>
          <dd className="payments-mono">{displayId}</dd>
        </div>
        <div>
          <dt>Entry ID</dt>
          <dd className="payments-mono">{row.id || "—"}</dd>
        </div>
        <div>
          <dt>Date</dt>
          <dd>{dateHuman(row.date)}</dd>
        </div>
        <div>
          <dt>{isIn ? "Received from" : "Paid to"}</dt>
          <dd>{row.partyName || "—"}</dd>
        </div>
        <div>
          <dt>Reference</dt>
          <dd>{row.reference || "—"}</dd>
        </div>
        <div>
          <dt>{isIn ? "Deposited to" : "Paid from"}</dt>
          <dd>{bankLabel || "—"}</dd>
        </div>
        {row.note?.trim() ? (
          <div>
            <dt>Note</dt>
            <dd>{row.note.trim()}</dd>
          </div>
        ) : null}
        {row.sourceAdvanceId ? (
          <div>
            <dt>Source</dt>
            <dd>Applied from customer advance</dd>
          </div>
        ) : null}
      </dl>

      {row.kind === PAYMENT_KIND.ADVANCE && unapplied > 0.01 ? (
        <section className="payments-advance-apply">
          <h3 className="payments-section-hd">Unapplied balance: {money(unapplied)}</h3>
          {customerSales.length === 0 ? (
            <p className="payments-hint">No outstanding invoices for this customer.</p>
          ) : (
            <ul className="payments-apply-list">
              {customerSales.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    className="payments-apply-row"
                    onClick={() => onApplyAdvance?.({ advanceKey: row.key, saleId: s.id })}
                  >
                    <span>
                      {s.invoiceNo || "Invoice"} · Due {money(s.outstanding)}
                    </span>
                    <span className="payments-apply-cta">Apply advance</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {row.kind === PAYMENT_KIND.ADVANCE && Array.isArray(row.applications) && row.applications.length > 0 ? (
        <section className="payments-applied-list">
          <h3 className="payments-section-hd">Applied to invoices</h3>
          <ul>
            {row.applications.map((app) => {
              const sale = (sales || []).find((s) => s.id === app.saleId);
              return (
                <li key={app.id} className="payments-applied-row">
                  <span>{sale?.invoiceNo || app.saleId}</span>
                  <span>{money(app.amount)}</span>
                  <span className="payments-applied-date">{dateSlash(app.date)}</span>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <div className="payments-detail-links">
        {row.kind === PAYMENT_KIND.SALE && row.parentId ? (
          <button type="button" className="ghost-btn" onClick={() => onOpenSale?.(row.parentId)}>
            Open invoice
          </button>
        ) : null}
        {row.kind === PAYMENT_KIND.PURCHASE && row.parentId ? (
          <button type="button" className="ghost-btn" onClick={() => onOpenPurchase?.(row.parentId)}>
            Open purchase
          </button>
        ) : null}
      </div>

      {receiptOpen ? (
        <div className="invoice-preview-overlay modal-overlay payments-receipt-overlay" onClick={() => setReceiptOpen(false)}>
          <div className="invoice-preview-panel payments-receipt-panel" onClick={(e) => e.stopPropagation()}>
            <div className="invoice-preview-toolbar hdr-print-hide">
              <span className="invoice-preview-title">Payment receipt</span>
              <div className="invoice-preview-actions">
                <button type="button" className="edit-entry-btn invoice-preview-print" onClick={() => window.print()}>
                  <IcPrint />
                  Print
                </button>
                <button type="button" className="icon-btn icon-btn-sm" onClick={() => setReceiptOpen(false)} aria-label="Close">
                  <IcX />
                </button>
              </div>
            </div>
            <div className="invoice-preview-scroll" ref={sheetRef}>
              <PaymentReceiptSheet row={row} settings={settings} bankLabel={bankLabel} />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
