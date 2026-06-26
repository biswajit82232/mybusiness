import { useMemo } from "react";
import {
  addDaysStr,
  bankAccountLabel,
  dateHuman,
  dateSlash,
  moneyFull,
  normBranchesList,
  normalizePurchasePaymentEntries,
  num,
  roundMoney2,
  todayStr,
} from "@/domain/index.js";
import { IcEdit, IcPrint, IcTrash } from "@/shared/ui/icons/AppIcons.jsx";
import { OverlayScreen, PageHeader } from "@/shared/ui/layout/AppChrome.jsx";

const DEFAULT_CREDIT_DAYS = 30;

/**
 * @param {object} [printCompany] — from settings: businessName, businessPhone, businessWhatsapp
 */
export function PurchaseDetailScreen({
  purchase,
  auditEvents = [],
  branches = [],
  bankAccounts = [],
  printCompany = {},
  onClose,
  onEdit,
  onDelete,
  onRecordPayment,
  onRemovePayment,
}) {
  const payRows = useMemo(() => (purchase ? normalizePurchasePaymentEntries(purchase) : []), [purchase]);

  const stPrint = useMemo(() => {
    if (!purchase) return { text: "UNPAID", cls: "s-unpaid" };
    const dueEst = String(purchase.dueDate || "").slice(0, 10) || addDaysStr(purchase.date, DEFAULT_CREDIT_DAYS);
    const today = todayStr();
    const out = num(purchase.outstanding);
    const recv = num(purchase.received);
    const paidFull = out <= 0.01;
    const isOd = !paidFull && dueEst < today;
    if (paidFull) return { text: "PAID", cls: "s-paid" };
    if (isOd) return { text: "OVERDUE", cls: "s-overdue" };
    if (recv > 0.01) return { text: "PARTIAL", cls: "s-partial" };
    return { text: "UNPAID", cls: "s-unpaid" };
  }, [purchase]);

  if (!purchase) return null;

  const dueEst = String(purchase.dueDate || "").slice(0, 10) || addDaysStr(purchase.date, DEFAULT_CREDIT_DAYS);
  const today = todayStr();
  const out = num(purchase.outstanding);
  const recv = num(purchase.received);
  const total = roundMoney2(num(purchase.totalAmount));
  const paidFull = out <= 0.01;
  const isOd = !paidFull && dueEst < today;
  const badgeCls = paidFull ? "s-paid" : isOd ? "s-overdue" : recv > 0.01 ? "s-partial" : "s-unpaid";
  const badgeText = paidFull ? "Paid" : isOd ? "Overdue" : recv > 0.01 ? "Partial" : "Open";

  const brList = normBranchesList(branches);
  const brName = (brList.find((b) => b && b.id === purchase.branchId)?.name || "").trim() || "—";
  const acctName = (id) => bankAccountLabel(bankAccounts, id);
  const lines = Array.isArray(purchase.lines) ? purchase.lines : [];

  const coName = String(printCompany.businessName || "").trim() || "Purchase";
  const coPhone = String(printCompany.businessPhone || "").trim();
  const coWa = String(printCompany.businessWhatsapp || "").trim();

  return (
    <OverlayScreen className="purchase-detail-print">
      <PageHeader
        title="Purchase"
        onBack={onClose}
        right={
          <div className="detail-hdr-actions">
            <button
              type="button"
              className="icon-btn icon-btn-sm hdr-print-hide"
              onClick={() => window.print()}
              aria-label="Print purchase"
            >
              <IcPrint />
            </button>
            {typeof onEdit === "function" ? (
              <button type="button" className="icon-btn icon-btn-sm hdr-print-hide" onClick={onEdit} aria-label="Edit purchase">
                <IcEdit />
              </button>
            ) : null}
            <button type="button" className="icon-btn icon-btn-sm detail-hdr-del-ic hdr-print-hide" onClick={onDelete} aria-label="Delete purchase">
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
              <h2>PURCHASE BILL</h2>
              <span className={`ips-status ips-status--${stPrint.cls}`}>{stPrint.text}</span>
            </div>
          </header>

          <div className="ips-meta-grid">
            <div className="ips-meta-box">
              <div className="ips-meta-row">
                <span>Supplier ref. / bill no.</span>
                <strong>{(purchase.invoiceRef || "").trim() || "—"}</strong>
              </div>
              <div className="ips-meta-row">
                <span>Purchase date</span>
                <strong>{dateSlash(purchase.date)}</strong>
              </div>
              <div className="ips-meta-row">
                <span>Due (est.)</span>
                <strong>{dateSlash(dueEst)}</strong>
              </div>
              <div className="ips-meta-row">
                <span>Branch</span>
                <strong>{brName}</strong>
              </div>
            </div>
            <div className="ips-bill-to">
              <h3>Vendor</h3>
              <p className="ips-bill-name">{(purchase.supplierName || "").trim() || "—"}</p>
            </div>
          </div>

          <table className="ips-table ips-table--purchase">
            <thead>
              <tr>
                <th className="ips-col-desc">Description</th>
                <th className="ips-col-qty">Qty</th>
                <th className="ips-col-rate">Rate (₹)</th>
                <th className="ips-col-amt">Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line, i) => {
                const q = num(line.qty);
                const rate = num(line.costPerUnit);
                const lineAmt = roundMoney2(q * rate);
                return (
                  <tr key={`${line.item}-${i}`}>
                    <td className="ips-col-desc">
                      <span className="ips-item-name">{line.item || "—"}</span>
                    </td>
                    <td className="ips-col-qty">{q % 1 === 0 ? String(q) : q.toFixed(2)}</td>
                    <td className="ips-col-rate">{moneyFull(rate)}</td>
                    <td className="ips-col-amt">{moneyFull(lineAmt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="ips-summary">
            <div className="ips-summary-rows">
              <div className="ips-sum-row ips-sum-row--purchase-total">
                <span>Total</span>
                <span>{moneyFull(total)}</span>
              </div>
              <div className="ips-sum-row">
                <span>Amount paid</span>
                <span>{moneyFull(recv)}</span>
              </div>
              <div className="ips-sum-row ips-sum-row--due">
                <span>Balance due</span>
                <span>{moneyFull(out)}</span>
              </div>
            </div>
          </div>

          {payRows.length > 0 && (
            <div className="ips-payments">
              <h4 className="ips-subhd">Payments made</h4>
              <table className="ips-pay-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Account</th>
                    <th className="ips-num">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {payRows.map((pe) => (
                    <tr key={pe.id}>
                      <td>{dateSlash(pe.date)}</td>
                      <td>{acctName(pe.bankAccountId)}</td>
                      <td className="ips-num">{moneyFull(pe.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {(purchase.notes || "").trim() ? (
            <div className="ips-purchase-notes">
              <h4 className="ips-subhd">Notes</h4>
              <p className="ips-purchase-notes-body">{(purchase.notes || "").trim()}</p>
            </div>
          ) : null}

          <footer className="ips-footer">
            <p>Internal purchase record — retain for accounts.</p>
            {coPhone ? <p className="ips-footer-small">For queries, call {coPhone}</p> : null}
          </footer>
        </div>
      </div>

      <div className="overlay-scroll detail-scroll invoice-screen-only">
        <section className="detail-hero detail-hero-v2">
          <div className="dh-topline">
            <span className="dh-inv">{(purchase.invoiceRef || "").trim() || "—"}</span>
            <span className={`status-badge ${badgeCls}`}>{badgeText}</span>
          </div>
          <h2 className="dh-name">{(purchase.supplierName || "").trim() || "Supplier"}</h2>
          <div className="detail-kpi-grid detail-kpi-grid--3">
            <div className="detail-kpi">
              <span className="detail-kpi-lbl">Balance due</span>
              <strong className={`detail-kpi-val${out > 0.01 ? " is-due" : ""}`}>{moneyFull(out)}</strong>
            </div>
            <div className="detail-kpi">
              <span className="detail-kpi-lbl">Paid</span>
              <strong className="detail-kpi-val is-paid">{moneyFull(recv)}</strong>
            </div>
            <div className="detail-kpi">
              <span className="detail-kpi-lbl">Total</span>
              <strong className="detail-kpi-val">{moneyFull(total)}</strong>
            </div>
          </div>
        </section>

        {out > 0.01 && typeof onRecordPayment === "function" ? (
          <section className="detail-actions detail-actions-v2 hdr-print-hide">
            <button type="button" className="action-btn" onClick={onRecordPayment}>
              Record payment
            </button>
          </section>
        ) : null}

        <section className="detail-card detail-card-v2">
          <div className="dc-title">Dates & branch</div>
          <dl className="dc-dl">
            <div>
              <dt>Purchased</dt>
              <dd>{dateHuman(purchase.date)}</dd>
            </div>
            <div>
              <dt>Due (est.)</dt>
              <dd>{dateHuman(dueEst)}</dd>
            </div>
            <div>
              <dt>Branch</dt>
              <dd>{brName}</dd>
            </div>
          </dl>
        </section>

        {payRows.length > 0 && (
          <section className="detail-card detail-card-v2">
            <div className="dc-title">Payments made</div>
            <ul className="sale-pay-list" role="list">
              {payRows.map((pe) => (
                <li key={pe.id} className="sale-pay-row">
                  <span className="sale-pay-date">{dateHuman(pe.date)}</span>
                  <span className="sale-pay-acct">{acctName(pe.bankAccountId)}</span>
                  <strong className="sale-pay-amt">{moneyFull(pe.amount)}</strong>
                  {typeof onRemovePayment === "function" ? (
                    <button
                      type="button"
                      className="text-btn sale-pay-remove hdr-print-hide"
                      onClick={() => onRemovePayment(pe.id)}
                      aria-label="Remove supplier payment"
                    >
                      Remove
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
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
                    <span className="sale-pay-date">{dateHuman(String(ev.at || "").slice(0, 10))}</span>
                    <span className="sale-pay-acct">{ev.note || ev.action}</span>
                    <strong className="sale-pay-amt">{ev.action}</strong>
                  </li>
                ))}
            </ul>
          </section>
        )}

        <section className="detail-card detail-card-v2">
          <div className="dc-title">Line items</div>
          <div className="dc-items-head">
            <span>Item</span>
            <span>Amount</span>
          </div>
          {lines.map((line, i) => {
            const lineAmt = num(line.qty) * num(line.costPerUnit);
            return (
              <div key={`${line.item}-${i}`} className="dc-item-row">
                <div>
                  <strong>{line.item}</strong>
                  <p className="dc-item-sub">
                    {num(line.qty) % 1 === 0 ? line.qty : num(line.qty).toFixed(2)} × {moneyFull(line.costPerUnit)}
                  </p>
                </div>
                <strong>{moneyFull(lineAmt)}</strong>
              </div>
            );
          })}
        </section>

        {(purchase.notes || "").trim() ? (
          <section className="detail-card detail-card-v2">
            <div className="dc-title">Notes</div>
            <p className="dc-note-block" style={{ whiteSpace: "pre-wrap" }}>
              {(purchase.notes || "").trim()}
            </p>
          </section>
        ) : null}
      </div>
    </OverlayScreen>
  );
}
