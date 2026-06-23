import { useMemo, useState } from "react";
import { computeInvRowsForBranch, getDefaultBranchId, money, normBranchesList } from "@/domain/index.js";
import { IcMenu, IcPlus } from "@/shared/ui/icons/AppIcons.jsx";
import { PaginatedInvRows } from "./PaginatedInvRows.jsx";

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
      if (q === 0) return 2; // push zero-stock to bottom
      if (q < 0) return 1;
      return 0;
    };
    return [...displayRows].sort((a, b) => {
      const byRank = rank(a.currentQty) - rank(b.currentQty);
      if (byRank !== 0) return byRank;
      return String(a.item || "").localeCompare(String(b.item || ""), undefined, { sensitivity: "base" });
    });
  }, [displayRows]);

  const totalVal = sortedRows.reduce((s, r) => s + r.stockValue, 0);
  const lowStock = sortedRows.filter((r) => r.currentQty <= 0).length;

  return (
    <div className="tab-page tab-page--inventory">
      <div className="tab-appbar">
        {onOpenSidebar && (
          <button type="button" className="hamburger-btn" onClick={onOpenSidebar} aria-label="Open menu">
            <IcMenu />
          </button>
        )}
        <h1 className="tab-title">Inventory</h1>
      </div>
      <div className="inv-branch-strip">
        <div className="inv-branch-meta">
          <span className="inv-branch-title">Stock by branch</span>
          <span className="inv-branch-current">{branchLabel}</span>
        </div>
        <div className="inv-branch-chips">
          <button
            type="button"
            className={`sort-chip${!branchChip ? " active" : ""}`}
            aria-pressed={!branchChip}
            onClick={() => setBranchChip("")}
          >
            All branches
          </button>
          {brList.map((b) => (
            <button
              key={b.id}
              type="button"
              className={`sort-chip${branchChip === b.id ? " active" : ""}`}
              aria-pressed={branchChip === b.id}
              onClick={() => setBranchChip(b.id || getDefaultBranchId(brList))}
            >
              {b.name || "Branch"}
            </button>
          ))}
        </div>
      </div>
      <div className="inv-summary">
        <div className="inv-sum-card">
          <span className="inv-sum-val">{sortedRows.length}</span>
          <span className="inv-sum-lbl">Items</span>
        </div>
        <div className="inv-sum-card">
          <span className="inv-sum-val">{money(totalVal)}</span>
          <span className="inv-sum-lbl">Stock Value</span>
        </div>
        {lowStock > 0 && (
          <div className="inv-sum-card inv-sum-warn">
            <span className="inv-sum-val">{lowStock}</span>
            <span className="inv-sum-lbl">Low / Out</span>
          </div>
        )}
      </div>
      <div className="list-area">
        <PaginatedInvRows
          key={`${branchChip}|${sortedRows.length}`}
          invRows={sortedRows}
          onDeleteItem={onDeleteItem}
          onOpenItem={(row) => openInventoryItemDetail(row, branchChip)}
        />
      </div>
      <button type="button" className="fab" onClick={() => openAddStock("in")} aria-label="Add stock">
        <IcPlus />
      </button>
    </div>
  );
}
