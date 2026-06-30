import { COLORS, FONT_SIZE, SPACING } from "@/tokens.js";
import { formatINR } from "@/utils/money.js";
import { dateHuman, moneyFull, num } from "@/domain/index.js";
import { OverlayScreen, PageHeader } from "@/shared/ui/layout/AppChrome.jsx";

const REASON_LABELS = {
  return: "Return",
  cancellation: "Cancellation",
  price_correction: "Price correction",
  other: "Other",
};

export function CreditNoteDetailScreen({
  creditNote,
  onClose,
  onOpenOriginalInvoice,
}) {
  if (!creditNote) return null;

  const amountStyle = { color: COLORS.amountNegative };

  return (
    <OverlayScreen>
      <PageHeader title="Credit Note" onBack={onClose} />
      <div className="overlay-scroll detail-scroll">
        <section className="detail-hero detail-hero-v2">
          <div className="dh-topline">
            <div className="dh-topline-left">
              <span className="dh-inv" style={{ color: COLORS.amountNegative }}>
                {creditNote.creditNoteNumber}
              </span>
              <span
                className="status-badge"
                style={{
                  backgroundColor: COLORS.dangerBg,
                  color: COLORS.danger,
                  fontSize: FONT_SIZE.label,
                }}
              >
                Issued
              </span>
            </div>
          </div>
          <h2 className="dh-name">{creditNote.partyName || "Customer"}</h2>
          <p className="form-hint">
            Date {dateHuman(creditNote.creditNoteDate)} ·{" "}
            {REASON_LABELS[creditNote.reason] || creditNote.reason}
          </p>
        </section>

        <section className="detail-card detail-card-v2">
          <div className="dc-title">Against invoice</div>
          <button
            type="button"
            className="text-btn"
            onClick={() => onOpenOriginalInvoice?.(creditNote.originalInvoiceId)}
          >
            {creditNote.originalInvoiceNumber}
          </button>
          {creditNote.reasonNote ? (
            <p className="form-hint" style={{ marginTop: SPACING.sm }}>{creditNote.reasonNote}</p>
          ) : null}
        </section>

        <section className="detail-card detail-card-v2">
          <div className="dc-title">Returned items</div>
          {(creditNote.items || []).map((li, idx) => (
            <div className="dc-item-row" key={li.originalItemId || idx}>
              <div className="dc-item-main">
                <strong>{li.description || "—"}</strong>
                <p className="dc-item-sub">
                  {num(li.quantity)} × {formatINR(Math.abs(li.unitPricePaise))}
                </p>
              </div>
              <strong className="dc-item-amt" style={amountStyle}>
                {formatINR(li.totalPaise)}
              </strong>
            </div>
          ))}
          <div className="dc-totals">
            <div><span>Subtotal</span><span style={amountStyle}>{formatINR(creditNote.subtotalPaise)}</span></div>
            <div><span>GST</span><span style={amountStyle}>{formatINR(creditNote.totalGSTPaise)}</span></div>
            <div className="dc-total-line">
              <span>Total credit</span>
              <strong style={amountStyle}>{formatINR(creditNote.grandTotalPaise)}</strong>
            </div>
          </div>
        </section>

        <section className="detail-card detail-card-v2">
          <button type="button" className="edit-entry-btn" disabled title="Available in Phase 3">
            Download PDF
          </button>
        </section>
      </div>
    </OverlayScreen>
  );
}
