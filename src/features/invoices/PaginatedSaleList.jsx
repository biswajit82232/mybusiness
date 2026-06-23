import { Virtuoso } from "react-virtuoso";
import { saleStatus, money, dateHuman } from "@/domain/index.js";
import { useMainStageScrollParent } from "@/features/main-stage/MainStageScrollContext.jsx";

const AV_COLORS = ["av-blue", "av-green", "av-purple", "av-orange", "av-teal", "av-indigo", "av-amber", "av-red"];

function getInitials(name) {
  return (name || "?").trim().split(/\s+/).slice(0, 2).map((w) => w[0] || "").join("").toUpperCase() || "?";
}

function avatarColor(name) {
  let h = 0;
  for (let i = 0; i < (name || "").length; i++) h = ((h << 5) - h + (name || "").charCodeAt(i)) | 0;
  return AV_COLORS[Math.abs(h) % AV_COLORS.length];
}

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
        const st = saleStatus(sale, defaultDueDays);
        const lineCount = Array.isArray(sale.lineItems) ? sale.lineItems.length : 0;
        const extraLines = lineCount > 1 ? lineCount - 1 : 0;
        return (
          <button key={sale.id} type="button" className={`sale-row sale-row--${st.cls}`} onClick={() => openSaleDetail(sale.id)}>
            <div className={`sr-av ${avatarColor(sale.customerName)}`}>
              {getInitials(sale.customerName)}
            </div>
            <div className="sr-left">
              <span className="sr-name">{sale.customerName}</span>
              {sale.item ? (
                <span className="sr-item">
                  {sale.item}
                  {extraLines > 0 ? (
                    <span className="sr-item-more"> · +{extraLines} more</span>
                  ) : null}
                </span>
              ) : null}
              <span className="sr-sub">
                {dateHuman(sale.date)} · {sale.invoiceNo}
              </span>
            </div>
            <div className="sr-right">
              <span className="sr-amount">{money(sale.totalSale)}</span>
              <span className={`status-badge ${st.cls}`}>{st.text}</span>
              {sale.outstanding > 0 && <span className="sr-due">Due {money(sale.outstanding)}</span>}
            </div>
          </button>
        );
      }}
    />
  );
}
