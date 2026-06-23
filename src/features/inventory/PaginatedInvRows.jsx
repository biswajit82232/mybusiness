import { Virtuoso } from "react-virtuoso";
import { money } from "@/domain/index.js";
import { IcBox, IcEdit, IcPlus, IcTrash } from "@/shared/ui/icons/AppIcons.jsx";
import { EmptyState } from "@/shared/ui/layout/AppChrome.jsx";
import { useMainStageScrollParent } from "@/features/main-stage/MainStageScrollContext.jsx";

/** Bottom inset for embedded lists (Branches) so last rows clear the fixed FAB — applied on last row. */
const EMBEDDED_LAST_ROW_PAD = { paddingBottom: "calc(80px + env(safe-area-inset-bottom, 0px))" };

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
          aria-label={`Edit ${row.item}`}
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
    return <EmptyState icon={<IcBox />} title="No stock entries" />;
  }
  if (!scrollParent) {
    return (
      <ul className="inv-rows-fallback" role="list">
        {invRows.map((row, index) => (
          <li key={`${index}-${String(row?.item ?? "")}`}>
            <div className={`inv-row inv-row--clickable${row.currentQty < 0 ? " inv-row--neg" : row.currentQty === 0 ? " inv-row--empty" : " inv-row--ok"}`}>
              <button type="button" className="inv-row-main" onClick={() => onOpenItem?.(row)} aria-label={`Open ${row.item}`}>
                <div className="inv-row-left">
                  <span className="inv-item-name">{row.item}</span>
                  <span className="inv-item-sub">
                    Avg cost {money(row.avgCost)}
                    {row.salesPrice > 0 ? ` · Sale ${money(row.salesPrice)}` : ""}
                  </span>
                </div>
                <div className="inv-row-right">
                  <div className="inv-row-right-info">
                    <span className={`inv-qty${row.currentQty < 0 ? " qty-neg" : row.currentQty === 0 ? " qty-zero" : ""}`}>
                      {row.currentQty % 1 === 0 ? row.currentQty : row.currentQty.toFixed(2)} Nos
                    </span>
                    {row.stockValue > 0 && <span className="inv-val">{money(row.stockValue)}</span>}
                  </div>
                </div>
              </button>
              <InvRowActions row={row} onOpenItem={onOpenItem} onAddStockForItem={onAddStockForItem} onDeleteItem={onDeleteItem} />
            </div>
          </li>
        ))}
      </ul>
    );
  }
  const n = invRows.length;
  const embedded = virtuosoLayout === "embedded";
  return (
    <div className={`inv-rows-virtuoso${embedded ? " inv-rows-virtuoso--embedded" : ""}`}>
      <Virtuoso
        customScrollParent={scrollParent}
        data={invRows}
        computeItemKey={(index, row) => `${index}-${String(row?.item ?? "")}`}
        overscan={400}
        itemContent={(index, row) => {
        const last = embedded && n > 0 && index === n - 1;
        const main = (
          <>
            <div className="inv-row-left">
              <span className="inv-item-name">{row.item}</span>
              <span className="inv-item-sub">
                Avg cost {money(row.avgCost)}
                {row.salesPrice > 0 ? ` · Sale ${money(row.salesPrice)}` : ""}
              </span>
            </div>
            <div className="inv-row-right">
              <div className="inv-row-right-info">
                <span className={`inv-qty${row.currentQty < 0 ? " qty-neg" : row.currentQty === 0 ? " qty-zero" : ""}`}>
                  {row.currentQty % 1 === 0 ? row.currentQty : row.currentQty.toFixed(2)} Nos
                </span>
                {row.stockValue > 0 && <span className="inv-val">{money(row.stockValue)}</span>}
              </div>
            </div>
          </>
        );
        return (
          <div
            className={`inv-row${row.currentQty < 0 ? " inv-row--neg" : row.currentQty === 0 ? " inv-row--empty" : " inv-row--ok"}${onOpenItem ? " inv-row--clickable" : ""}`}
            style={last ? EMBEDDED_LAST_ROW_PAD : undefined}
          >
          {onOpenItem ? (
            <button type="button" className="inv-row-main" onClick={() => onOpenItem(row)} aria-label={`Open ${row.item}`}>
              {main}
            </button>
          ) : (
            <div className="inv-row-main">{main}</div>
          )}
          <InvRowActions row={row} onOpenItem={onOpenItem} onAddStockForItem={onAddStockForItem} onDeleteItem={onDeleteItem} />
          </div>
        );
      }}
      />
    </div>
  );
}
