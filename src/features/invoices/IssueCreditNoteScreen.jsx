import { useMemo, useState } from "react";
import { COLORS, FONT_SIZE, SPACING } from "@/tokens.js";
import { formatINR } from "@/utils/money.js";
import { calcGST, splitGST, multiplyMoney, sumMoney } from "@/utils/money.js";
import { defaultReturnQuantities } from "@/app/useCreditNoteActions.js";
import { isGstEnabled } from "@/domain/invoiceGst.js";
import { dateHuman, moneyFull, num } from "@/domain/index.js";
import { Field, OverlayScreen, PageHeader } from "@/shared/ui/layout/AppChrome.jsx";
import { MenuSelect } from "@/shared/ui/inputs/MenuSelect.jsx";

const REASONS = [
  { value: "return", label: "Return" },
  { value: "cancellation", label: "Cancellation" },
  { value: "price_correction", label: "Price correction" },
  { value: "other", label: "Other" },
];

function previewCreditNote(sale, returnQtys, reason, isInterState) {
  const lines = (sale?.lineItems || []).map((li) => {
    const rq = returnQtys[li.id] ?? 0;
    if (rq <= 0) return null;
    const taxable = multiplyMoney(num(li.salePrice), rq);
    const gst = calcGST(taxable, num(li.gstRate) || 18);
    const { cgst, sgst, igst } = splitGST(gst, isInterState);
    return { taxable, gst, cgst, sgst, igst, total: taxable + gst };
  }).filter(Boolean);
  if (lines.length === 0) return null;
  return {
    subtotal: sumMoney(lines.map((l) => -l.taxable)),
    totalGST: sumMoney(lines.map((l) => -l.gst)),
    cgst: sumMoney(lines.map((l) => -l.cgst)),
    sgst: sumMoney(lines.map((l) => -l.sgst)),
    igst: sumMoney(lines.map((l) => -l.igst)),
    grandTotal: sumMoney(lines.map((l) => -l.total)),
    restoresInventory: reason === "return",
  };
}

export function IssueCreditNoteScreen({
  sale,
  settings,
  onClose,
  onIssue,
}) {
  const defaults = useMemo(() => defaultReturnQuantities(sale), [sale]);
  const [returnQtys, setReturnQtys] = useState(() => {
    const m = {};
    for (const d of defaults) m[d.itemId] = d.quantity;
    return m;
  });
  const [reason, setReason] = useState("cancellation");
  const [reasonNote, setReasonNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const bizState = String(settings?.businessState || "").trim();
  const custState = String(sale?.customerState || "").trim();
  const isInterState =
    isGstEnabled(settings) &&
    bizState &&
    custState &&
    bizState.toLowerCase() !== custState.toLowerCase();

  const preview = previewCreditNote(sale, returnQtys, reason, isInterState);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!preview) return;
    setSubmitting(true);
    const itemsToReturn = Object.entries(returnQtys)
      .filter(([, q]) => num(q) > 0)
      .map(([itemId, quantity]) => ({ itemId, quantity: num(quantity) }));
    await onIssue({
      saleId: sale.id,
      itemsToReturn,
      reason,
      reasonNote,
    });
    setSubmitting(false);
  };

  const badgeStyle = {
    backgroundColor: COLORS.warningBg,
    color: COLORS.warning,
    fontSize: FONT_SIZE.label,
    padding: `${SPACING.xxs}px ${SPACING.sm}px`,
    borderRadius: 4,
    fontWeight: 600,
  };

  const amountStyle = { color: COLORS.amountNegative, fontFamily: "inherit" };

  return (
    <OverlayScreen>
      <PageHeader title="Issue Credit Note" onBack={onClose} />
      <div className="overlay-scroll overlay-scroll--form-body">
        <section className="detail-card detail-card-v2" style={{ marginBottom: SPACING.lg }}>
          <div className="dc-title">Original invoice</div>
          <p><strong>{sale?.invoiceNo}</strong> · {sale?.customerName}</p>
          <p className="form-hint">{dateHuman(sale?.date)} · Total {moneyFull(sale?.totalSale)}</p>
        </section>

        <form id="form-issue-cn" className="form-sections" onSubmit={handleSubmit}>
          <div className="form-card">
            <div className="form-card-title">Items to return</div>
            {(sale?.lineItems || []).map((li) => (
              <div key={li.id} className="form-stack" style={{ marginBottom: SPACING.md }}>
                <strong>{li.item || "—"}</strong>
                <span className="form-hint">Sold: {num(li.qty)} × {moneyFull(li.salePrice)}</span>
                <Field label="Return quantity">
                  <input
                    type="number"
                    min={0}
                    max={num(li.qty)}
                    step={1}
                    value={returnQtys[li.id] ?? 0}
                    onChange={(e) =>
                      setReturnQtys((prev) => ({
                        ...prev,
                        [li.id]: Math.min(num(li.qty), Math.max(0, num(e.target.value))),
                      }))
                    }
                  />
                </Field>
              </div>
            ))}
          </div>

          <div className="form-card">
            <Field label="Reason">
              <MenuSelect value={reason} onChange={setReason} options={REASONS} />
            </Field>
            <Field label="Reason note (optional)">
              <input
                type="text"
                value={reasonNote}
                onChange={(e) => setReasonNote(e.target.value)}
                placeholder="Additional details"
              />
            </Field>
          </div>

          {preview ? (
            <div className="form-card" style={{ borderColor: COLORS.dangerBg }}>
              <div className="form-card-title" style={{ color: COLORS.amountNegative }}>
                Credit preview
              </div>
              <div className="dc-totals">
                <div><span>Subtotal</span><span style={amountStyle}>{formatINR(preview.subtotal)}</span></div>
                <div><span>GST</span><span style={amountStyle}>{formatINR(preview.totalGST)}</span></div>
                <div className="dc-total-line">
                  <span>Total credit</span>
                  <strong style={amountStyle}>{formatINR(preview.grandTotal)}</strong>
                </div>
              </div>
              {preview.restoresInventory ? (
                <p className="form-hint" style={{ color: COLORS.warning }}>Stock will be restored for returned items.</p>
              ) : null}
            </div>
          ) : (
            <p className="form-hint form-hint--warn">Select at least one item to return.</p>
          )}
        </form>
      </div>

      <div className="form-footer">
        <button
          type="submit"
          form="form-issue-cn"
          className="primary-btn"
          disabled={!preview || submitting}
        >
          Issue Credit Note
        </button>
      </div>
    </OverlayScreen>
  );
}
