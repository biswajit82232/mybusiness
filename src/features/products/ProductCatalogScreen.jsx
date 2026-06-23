import { useMemo, useState } from "react";
import { money, num } from "@/domain/index.js";
import { IcCatalog } from "@/shared/ui/icons/AppIcons.jsx";
import { EmptyState, TabPageChrome } from "@/shared/ui/layout/AppChrome.jsx";
import { PaginatedProductRows } from "./PaginatedProductRows.jsx";

export function ProductCatalogScreen({ invRows = [], onOpenSidebar, onOpenProduct }) {
  const [search, setSearch] = useState("");
  /** `flat` = A–Z list; `stock` = by on-hand qty; `category` = user-defined product category */
  const [groupMode, setGroupMode] = useState("category");
  const filtered = useMemo(() => {
    if (!search.trim()) return invRows;
    const q = search.toLowerCase();
    return invRows.filter((r) => (r.item || "").toLowerCase().includes(q));
  }, [invRows, search]);

  const totalValue = useMemo(() => invRows.reduce((s, r) => s + r.stockValue, 0), [invRows]);
  const totalItems = invRows.length;
  const totalQty = useMemo(() => invRows.reduce((s, r) => s + num(r.currentQty), 0), [invRows]);
  const lowStock = invRows.filter((r) => r.currentQty <= 0).length;

  return (
    <TabPageChrome title="Products" onOpenSidebar={onOpenSidebar} right={<span className="page-hdr-meta">{totalItems} products</span>}>
      <div className="overlay-kpi-strip">
        <div className="recv-kpi">
          <div className="recv-kpi-lbl">Total Qty</div>
          <div className="recv-kpi-val">{totalQty}</div>
        </div>
        <div className="recv-kpi">
          <div className="recv-kpi-lbl">Stock Value</div>
          <div className="recv-kpi-val primary">{money(totalValue)}</div>
        </div>
        <div className="recv-kpi">
          <div className="recv-kpi-lbl">Out of Stock</div>
          <div className={`recv-kpi-val ${lowStock > 0 ? "danger" : ""}`}>{lowStock}</div>
        </div>
      </div>
      <div className="overlay-search-strip">
        <input className="search-box overlay-search-strip-input" placeholder="Search products…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <div className="sort-bar sort-bar--compact product-catalog-group-bar" role="group" aria-label="Product list grouping">
        <span className="sort-bar-lbl">Group</span>
        <button
          type="button"
          className={`sort-chip${groupMode === "category" ? " active" : ""}`}
          onClick={() => setGroupMode("category")}
        >
          By category
        </button>
        <button
          type="button"
          className={`sort-chip${groupMode === "stock" ? " active" : ""}`}
          onClick={() => setGroupMode("stock")}
        >
          By stock
        </button>
        <button
          type="button"
          className={`sort-chip${groupMode === "flat" ? " active" : ""}`}
          onClick={() => setGroupMode("flat")}
        >
          A–Z list
        </button>
      </div>
      <div className="list-area">
        <PaginatedProductRows
          key={`${search}|${groupMode}`}
          filtered={filtered}
          groupMode={groupMode}
          onOpenProduct={onOpenProduct}
          emptyState={<EmptyState icon={<IcCatalog />} title="No products found" />}
        />
      </div>
    </TabPageChrome>
  );
}
