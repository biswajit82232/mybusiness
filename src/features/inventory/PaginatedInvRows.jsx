import { Virtuoso } from "react-virtuoso";
import { money } from "@/domain/index.js";
import { IcBox, IcEdit, IcPlus, IcTrash } from "@/shared/ui/icons/AppIcons.jsx";
import { EmptyState } from "@/shared/ui/layout/AppChrome.jsx";
import { useMainStageScrollParent } from "@/features/main-stage/MainStageScrollContext.jsx";

const EMBEDDED_LAST_ROW_PAD = { paddingBottom: "calc(80px + env(safe-area-inset-bottom, 0px))" };

function formatQty(q) {
  const n = Number(q);
  if (!Number.isFinite(n)) return "0";
  return n % 1 === 0 ? String(n) : n.toFixed(2);
}

function stockStatusPill(qty) {
  if (qty < 0) return { label: "Negative", cls: "inv-status--neg" };
  if (qty === 0) return { label: "Out", cls: "inv-status--out" };
  if (qty <= 2) return { label: "Low", cls: "inv-status--low" };
  return { label: "In stock", cls: "inv-status--ok" };
}

function InvRowBody({ row }) {
  const status = stockStatusPill(row.currentQty);
  return (
    <>
      <div className="inv-row-left">
        <span className="inv-item-name">{row.item}</span>
        <span className="inv-item-sub">
          Avg {money(row.avgCost)}
          {row.salesPrice > 0 ? ` · Sale ${money(row.salesPrice)}` : ""}
        </span>
      </div>
      <div className="inv-row-right">
        <div className="inv-row-right-info">
          <span className={`inv-status-pill ${status.cls}`}>{status.label}</span>
          <span
            className={`inv-qty${row.currentQty < 0 ? " qty-neg" : row.currentQty === 0 ? " qty-zero" : ""}`}
          >
            {formatQty(row.currentQty)} Nos
          </span>
          <span className="inv-val">{money(row.stockValue)}</span>
        </div>
      </div>
    </>
  );
}

function InvRowActions({ row, onOpenItem, onAddStockForItem, onDeleteItem }) {
  return (
    <div className="inv-row-actions">
      {typeof onAddStockForItem === "function" && (
        <button
          type="button"
          className="inv-row-act inv-row-act--add"
          onClick={(e) => {
            e.stopPropagation();
            onAddStockForItem(row.item);
          }}
          aria-label={`Add stock for ${row.item}`}
        >
          <IcPlus />
        </button>
      )}
      {typeof onOpenItem === "function" && (
        <button
          type="button"
          className="inv-row-act inv-row-act--edit"
          onClick={(e) => {
            e.stopPropagation();
            onOpenItem(row);
          }}
          aria-label={`Open ${row.item}`}
        >
          <IcEdit />
        </button>
      )}
      <button
        type="button"
        className="inv-row-del"
        onClick={(e) => {
          e.stopPropagation();
          onDeleteItem(row.item.toLowerCase());
        }}
        aria-label={`Delete ${row.item}`}
      >
        <IcTrash />
      </button>
    </div>
  );
}

export function PaginatedInvRows({ invRows, onDeleteItem, onOpenItem, onAddStockForItem, virtuosoLayout = "fill" }) {
  const scrollParent = useMainStageScrollParent();

  if (invRows.length === 0) {
    return (
      <div className="inv-list-card inv-list-card--empty">
        <EmptyState icon={<IcBox />} title="No products match" sub="Try another branch or filter." />
      </div>
    );
  }

  const rowClass = (row) =>
    `inv-row${row.currentQty < 0 ? " inv-row--neg" : row.currentQty === 0 ? " inv-row--empty" : " inv-row--ok"}${onOpenItem ? " inv-row--clickable" : ""}`;

  if (!scrollParent) {
    return (
      <div className="inv-list-card">
        <ul className="inv-rows-fallback" role="list">
          {invRows.map((row, index) => (
            <li key={`${index}-${String(row?.item ?? "")}`}>
              <div className={rowClass(row)}>
                <button
                  type="button"
                  className="inv-row-main"
                  onClick={() => onOpenItem?.(row)}
                  aria-label={`Open ${row.item}`}
                >
                  <InvRowBody row={row} />
                </button>
                <InvRowActions
                  row={row}
                  onOpenItem={onOpenItem}
                  onAddStockForItem={onAddStockForItem}
                  onDeleteItem={onDeleteItem}
                />
              </div>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  const n = invRows.length;
  const embedded = virtuosoLayout === "embedded";

  return (
    <div
      className={`inv-list-card inv-rows-virtuoso-wrap inv-rows-virtuoso${embedded ? " inv-rows-virtuoso--embedded" : ""}`}
    >
      <Virtuoso
        customScrollParent={scrollParent}
        data={invRows}
        computeItemKey={(index, row) => `${index}-${String(row?.item ?? "")}`}
        overscan={400}
        itemContent={(index, row) => {
          const last = embedded && n > 0 && index === n - 1;
          return (
            <div className={rowClass(row)} style={last ? EMBEDDED_LAST_ROW_PAD : undefined}>
              {onOpenItem ? (
                <button
                  type="button"
                  className="inv-row-main"
                  onClick={() => onOpenItem(row)}
                  aria-label={`Open ${row.item}`}
                >
                  <InvRowBody row={row} />
                </button>
              ) : (
                <div className="inv-row-main">
                  <InvRowBody row={row} />
                </div>
              )}
              <InvRowActions
                row={row}
                onOpenItem={onOpenItem}
                onAddStockForItem={onAddStockForItem}
                onDeleteItem={onDeleteItem}
              />
            </div>
          );
        }}
      />
    </div>
  );
}
