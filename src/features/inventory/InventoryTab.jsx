import { useMemo, useState } from "react";
import {
  computeInvRowsForBranch,
  getDefaultBranchId,
  money,
  normBranchesList,
  roundMoney2,
} from "@/domain/index.js";
import { IcBox, IcMinus, IcPlus } from "@/shared/ui/icons/AppIcons.jsx";
import { TabPageChrome } from "@/shared/ui/layout/AppChrome.jsx";
import { PaginatedInvRows } from "./PaginatedInvRows.jsx";

function formatQty(q) {
  const n = Number(q);
  if (!Number.isFinite(n)) return "0";
  return n % 1 === 0 ? String(n) : n.toFixed(2);
}

export function InventoryTab({
  invRows,
  inventoryEntries = [],
  branches,
  openAddStock,
  onDeleteItem,
  openInventoryItemDetail,
  onOpenSidebar,
}) {
  const brList = normBranchesList(branches);
  const [branchChip, setBranchChip] = useState("");
  const [stockFilter, setStockFilter] = useState("all");

  const branchLabel = useMemo(() => {
    if (!branchChip) return "All branches";
    const hit = brList.find((b) => String(b.id) === String(branchChip));
    return (hit?.name || "").trim() || "Branch";
  }, [branchChip, brList]);

  const displayRows = useMemo(() => {
    if (!branchChip) return invRows;
    return computeInvRowsForBranch(inventoryEntries, branchChip, brList);
  }, [branchChip, invRows, inventoryEntries, brList]);

  const sortedRows = useMemo(() => {
    const rank = (q) => {
      if (q === 0) return 2;
      if (q < 0) return 1;
      return 0;
    };
    return [...displayRows].sort((a, b) => {
      const byRank = rank(a.currentQty) - rank(b.currentQty);
      if (byRank !== 0) return byRank;
      return String(a.item || "").localeCompare(String(b.item || ""), undefined, { sensitivity: "base" });
    });
  }, [displayRows]);

  const filteredRows = useMemo(() => {
    if (stockFilter === "low") return sortedRows.filter((r) => r.currentQty <= 0);
    if (stockFilter === "ok") return sortedRows.filter((r) => r.currentQty > 0);
    return sortedRows;
  }, [sortedRows, stockFilter]);

  const totalVal = roundMoney2(sortedRows.reduce((s, r) => s + r.stockValue, 0));
  const totalQty = roundMoney2(sortedRows.reduce((s, r) => s + r.currentQty, 0));
  const lowStock = sortedRows.filter((r) => r.currentQty <= 0).length;
  const inStock = sortedRows.length - lowStock;

  return (
    <TabPageChrome
      title="Inventory"
      onOpenSidebar={onOpenSidebar}
      className="tab-page--split-scroll tab-page--inventory"
      right={
        filteredRows.length > 0 ? (
          <span className="page-hdr-meta">
            {filteredRows.length} {filteredRows.length === 1 ? "item" : "items"}
          </span>
        ) : null
      }
    >
      <div className="inv-top">
        <section className="inv-hero" aria-label="Stock overview">
          <div className="inv-hero-top">
            <span className="inv-hero-eyebrow">Stock value · {branchLabel}</span>
            <span className="inv-hero-total">{money(totalVal)}</span>
            <span className="inv-hero-meta">
              {formatQty(totalQty)} Nos on hand · {sortedRows.length} product
              {sortedRows.length === 1 ? "" : "s"}
            </span>
          </div>
        </section>

        {brList.length > 1 ? (
          <div className="inv-branch-bar" role="group" aria-label="Branch filter">
            <span className="inv-branch-bar-lbl">Branch</span>
            <div className="inv-branch-chips">
              <button
                type="button"
                className={`inv-branch-chip${!branchChip ? " inv-branch-chip--on" : ""}`}
                aria-pressed={!branchChip}
                onClick={() => setBranchChip("")}
              >
                All
              </button>
              {brList.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  className={`inv-branch-chip${branchChip === b.id ? " inv-branch-chip--on" : ""}`}
                  aria-pressed={branchChip === b.id}
                  onClick={() => setBranchChip(b.id || getDefaultBranchId(brList))}
                >
                  {b.name || "Branch"}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="inv-kpi-grid" aria-label="Stock summary">
          <div className="inv-kpi">
            <span className="inv-kpi-lbl">Products</span>
            <span className="inv-kpi-val">{sortedRows.length}</span>
          </div>
          <div className="inv-kpi inv-kpi--good">
            <span className="inv-kpi-lbl">In stock</span>
            <span className="inv-kpi-val">{inStock}</span>
          </div>
          <div className={`inv-kpi inv-kpi--warn${lowStock > 0 ? " inv-kpi--alert" : ""}`}>
            <span className="inv-kpi-lbl">Low / out</span>
            <span className="inv-kpi-val">{lowStock}</span>
          </div>
        </div>
      </div>

      <div className="tab-page-scroll">
        <div className="inv-screen">
          <div className="inv-section-hd">
            <h2 className="home-section-hd">Products</h2>
          </div>

          <div className="quick-actions inv-quick-actions">
            <button type="button" className="qa-btn qa-primary" onClick={() => openAddStock("in")}>
              <IcPlus />
              <span>Stock in</span>
            </button>
            <button type="button" className="qa-btn qa-secondary" onClick={() => openAddStock("opening")}>
              <IcBox />
              <span>Opening</span>
            </button>
            <button type="button" className="qa-btn qa-secondary" onClick={() => openAddStock("out")}>
              <IcMinus />
              <span>Stock out</span>
            </button>
          </div>

          <div className="inv-filter-bar" role="group" aria-label="Stock level filter">
            {[
              { id: "all", label: "All" },
              { id: "ok", label: "In stock" },
              { id: "low", label: "Low / out" },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                className={`inv-filter-chip${stockFilter === f.id ? " inv-filter-chip--on" : ""}`}
                aria-pressed={stockFilter === f.id}
                onClick={() => setStockFilter(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="list-area inv-list-area">
            <PaginatedInvRows
              key={`${branchChip}|${stockFilter}|${filteredRows.length}`}
              invRows={filteredRows}
              onDeleteItem={onDeleteItem}
              onOpenItem={(row) => openInventoryItemDetail(row, branchChip)}
              onAddStockForItem={(item) => openAddStock("in", item, branchChip || null)}
            />
          </div>
        </div>
      </div>

      <button type="button" className="fab" onClick={() => openAddStock("in")} aria-label="Add stock">
        <IcPlus />
      </button>
    </TabPageChrome>
  );
}
