import { Virtuoso } from "react-virtuoso";
import { saleStatus, money, dateHuman } from "@/domain/index.js";
import { COLORS, FONT_SIZE, SPACING } from "@/tokens.js";
import { avatarColor, avatarInitials } from "@/features/customers/avatarUtils.js";
import { useMainStageScrollParent } from "@/features/main-stage/MainStageScrollContext.jsx";

const PAYMENT_BADGE = {
  unpaid: { text: "UNPAID", bg: COLORS.dangerBg, color: COLORS.danger },
  partial: { text: "PARTIAL", bg: COLORS.warningBg, color: COLORS.warning },
  paid: { text: "PAID", bg: COLORS.successBg, color: COLORS.success },
  overpaid: { text: "OVERPAID", bg: COLORS.infoBg, color: COLORS.info },
};

/** Resets visible count when `key` on parent changes (filter / period / search). */
export function PaginatedSaleList({ filteredSales = [], openSaleDetail, emptyState, defaultDueDays = 30 }) {
  const scrollParent = useMainStageScrollParent();
  if (filteredSales.length === 0) return emptyState;
  if (!scrollParent) {
    return <div className="sale-list-virtuoso-ph" aria-hidden style={{ minHeight: 1 }} />;
  }
  return (
    <Virtuoso
      customScrollParent={scrollParent}
      data={filteredSales}
      computeItemKey={(_, sale) => sale.id}
      overscan={400}
      itemContent={(_, sale) => {
        const isDraft = sale.status === "draft";
        const isCancelled = sale.status === "cancelled";
        const st = isDraft ? null : saleStatus(sale, defaultDueDays);
        const payBadge = !isDraft && sale.paymentStatus ? PAYMENT_BADGE[sale.paymentStatus] : null;
        const lineCount = Array.isArray(sale.lineItems) ? sale.lineItems.length : 0;
        const extraLines = lineCount > 1 ? lineCount - 1 : 0;
        return (
          <button key={sale.id} type="button" className={`sale-row sale-row--${st?.cls || "draft"}`} onClick={() => openSaleDetail(sale.id)}>
            <div className={`avatar ${avatarColor(sale.customerName)}`}>
              {avatarInitials(sale.customerName)}
            </div>
            <div className="sr-left">
              <span className="sr-name">{sale.customerName || (isDraft ? "Draft invoice" : "Customer")}</span>
              {sale.item ? (
                <span className="sr-item">
                  {sale.item}
                  {extraLines > 0 ? (
                    <span className="sr-item-more"> · +{extraLines} more</span>
                  ) : null}
                </span>
              ) : null}
              <span className="sr-sub">
                {dateHuman(sale.date)} · {isDraft ? "No number yet" : sale.invoiceNo}
              </span>
            </div>
            <div className="sr-right">
              <span className="sr-amount">{money(sale.totalSale)}</span>
              {isDraft ? (
                <span
                  className="status-badge"
                  style={{
                    backgroundColor: COLORS.warningBg,
                    color: COLORS.warning,
                    fontSize: FONT_SIZE.caption,
                    fontWeight: 600,
                  }}
                >
                  DRAFT
                </span>
              ) : isCancelled ? (
                <span className="status-badge" style={{ backgroundColor: COLORS.dangerBg, color: COLORS.danger }}>
                  CANCELLED
                </span>
              ) : (
                <>
                  {payBadge ? (
                    <span
                      className="status-badge"
                      style={{ backgroundColor: payBadge.bg, color: payBadge.color, fontSize: FONT_SIZE.caption }}
                    >
                      {payBadge.text}
                    </span>
                  ) : (
                    <span className={`status-badge ${st.cls}`}>{st.text}</span>
                  )}
                </>
              )}
              {!isDraft && sale.outstanding > 0 && (
                <span className="sr-due">Due {money(sale.outstanding)}</span>
              )}
            </div>
          </button>
        );
      }}
    />
  );
}
