import {
  buildEmiWhatsAppReminderMessage,
  dateSlash,
  isEmiDuePaid,
  isOverdue,
  money,
  moneyFull,
  todayStr,
  waMessageHref,
} from "@/domain/index.js";
import { IcSales, IcWhatsApp } from "@/shared/ui/icons/AppIcons.jsx";
import { OverlayScreen, PageHeader } from "@/shared/ui/layout/AppChrome.jsx";

export function EmiDetailScreen({
  emi,
  customerPhone = "",
  customerPhone2 = "",
  businessName = "",
  onClose,
  onOpenInvoice,
  onToggleDuePaid,
}) {
  const today = todayStr();
  const sub = [emi.invoiceNo, emi.financeCompany].filter(Boolean).join(" · ");
  const doSuffix = emi.doNo?.trim() ? ` · DO: ${emi.doNo.trim()}` : "";
  const dueDates = Array.isArray(emi.dueDates) ? emi.dueDates.filter(Boolean) : [];
  const unpaidDates = dueDates.filter((d) => !isEmiDuePaid(emi, d));
  const nextDue = unpaidDates.length ? [...unpaidDates].sort()[0] : "";
  const waText = buildEmiWhatsAppReminderMessage(emi, nextDue || today, { businessName });
  const waPhone = String(emi.customerNo1 || emi.customerNo2 || customerPhone || customerPhone2 || "").trim();
  const waLink = waMessageHref(waPhone, waText);
  return (
    <OverlayScreen>
      <PageHeader
        title="EMI"
        onBack={onClose}
        right={
          <div className="detail-hdr-actions">
            {waLink ? (
              <a
                className="icon-btn icon-btn-sm"
                href={waLink}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Send EMI reminder on WhatsApp"
                title="WhatsApp reminder"
              >
                <IcWhatsApp />
              </a>
            ) : (
              <button
                type="button"
                className="icon-btn icon-btn-sm"
                disabled
                aria-label="WhatsApp reminder unavailable"
                title="Add customer phone number to enable WhatsApp reminder"
              >
                <IcWhatsApp />
              </button>
            )}
            <button
              type="button"
              className="icon-btn icon-btn-sm"
              onClick={() => onOpenInvoice(emi.invoiceNo)}
              aria-label="View invoice"
            >
              <IcSales />
            </button>
          </div>
        }
      />
      <div className="overlay-scroll detail-scroll">
        <section className="detail-hero detail-hero-v2 emi-detail-hero">
          <h2 className="emi-detail-hero-name">{emi.customerName?.trim() || "—"}</h2>
          <p className="emi-detail-hero-loan">{moneyFull(emi.loanAmount)}</p>
          <p className="emi-detail-hero-sub">
            {sub}
            {doSuffix}
          </p>
          <div className="emi-detail-hero-split">
            <span>
              EMI: <strong>{money(emi.emiAmount)}</strong>
            </span>
            <span>
              Down: <strong>{money(emi.downPayment)}</strong>
            </span>
            <span>
              Installments: <strong>{emi.totalInstallments ?? (emi.dueDates || []).length}</strong>
              {emi.isClosed ? " · closed" : ""}
            </span>
          </div>
        </section>
        {(emi.dueDates || []).length > 0 && (
          <section className="detail-card detail-card-v2">
            <div className="dc-title">EMI installments</div>
            <ul className="emi-due-rows">
              {(emi.dueDates || []).map((d, i) => {
                const paid = isEmiDuePaid(emi, d);
                const overdue = !paid && isOverdue(d);
                return (
                  <li key={`${emi.id}-${d || i}`} className="emi-due-row">
                    <div className="emi-due-row-main">
                      <span
                        className={`emi-date-chip${paid ? " emi-date-paid" : ""}${overdue ? " emi-overdue" : ""}${!paid && d === today ? " emi-due-today" : ""}`}
                      >
                        {dateSlash(d)}
                      </span>
                      <span className="emi-due-row-amt">{money(emi.emiAmount)}</span>
                    </div>
                    <button
                      type="button"
                      className={`emi-mark-paid-btn${paid ? " emi-mark-paid-btn--paid" : ""}`}
                      onClick={() => onToggleDuePaid(emi.id, d, !paid)}
                    >
                      {paid ? "Paid" : "Mark paid"}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </div>
    </OverlayScreen>
  );
}
