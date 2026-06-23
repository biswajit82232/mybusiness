import { useMemo, useState } from "react";

import {
  money,
  makeId,
  normBranchesList,
  getDefaultBranchId,
  computeInvRowsForBranch,
} from "@/domain/index.js";
import { IcChevD, IcPlus } from "@/shared/ui/icons/AppIcons.jsx";
import { Field, TabPageChrome } from "@/shared/ui/layout/AppChrome.jsx";
import { PaginatedInvRows } from "@/features/inventory/index.js";

export function BranchScreen({
  branches,
  inventoryEntries,
  onSaveBranches,
  onRemoveBranch,
  openAddStock,
  onDeleteBranchProduct,
  openInventoryItemDetail,
  onOpenSidebar,
  requestConfirm,
}) {
  const brList = normBranchesList(branches);
  const [selectedBranchId, setSelectedBranchId] = useState(() => getDefaultBranchId(branches));
  const [newBranchName, setNewBranchName] = useState("");
  const displayBranchId = brList.some((b) => b.id === selectedBranchId)
    ? selectedBranchId
    : getDefaultBranchId(branches);

  const branchInvRows = useMemo(
    () => computeInvRowsForBranch(inventoryEntries || [], displayBranchId, branches),
    [inventoryEntries, displayBranchId, branches],
  );
  const totalVal = branchInvRows.reduce((s, r) => s + r.stockValue, 0);
  const lowStock = branchInvRows.filter((r) => r.currentQty <= 0).length;

  const addBranch = async (e) => {
    e.preventDefault();
    const name = newBranchName.trim();
    if (!name) return;
    await onSaveBranches([...brList, { id: makeId(), name }]);
    setNewBranchName("");
  };

  const tryRemoveBranch = (b) => {
    if (brList.length <= 1) return;
    requestConfirm?.({
      title: `Remove "${b.name}"?`,
      message: "Stock for this branch will be reassigned to another branch.",
      confirmLabel: "Remove branch",
      danger: true,
      onConfirm: () => {
        const remaining = brList.filter((x) => x.id !== b.id);
        if (selectedBranchId === b.id) setSelectedBranchId(remaining[0]?.id || getDefaultBranchId(branches));
        onRemoveBranch(b.id);
      },
    });
  };

  return (
    <TabPageChrome title="Branches" onOpenSidebar={onOpenSidebar} className="tab-page--split-scroll tab-page--branch">
      <section className="fin-section branch-section-pad branch-top" aria-labelledby="branch-pick-hd">
        <h2 id="branch-pick-hd" className="home-section-hd">
          Select branch
        </h2>
        <div className="branch-chip-row" role="tablist" aria-label="Branches">
          {brList.map((b) => (
            <button
              key={b.id}
              type="button"
              role="tab"
              aria-selected={displayBranchId === b.id}
              className={`branch-chip${displayBranchId === b.id ? " branch-chip--active" : ""}`}
              onClick={() => setSelectedBranchId(b.id)}
            >
              {b.name}
            </button>
          ))}
        </div>
      </section>

      <section className="fin-section branch-section-pad branch-manage-section">
        <details className="form-card form-card-details branch-manage-details">
          <summary className="form-card-details-summary">
            <span className="form-card-title form-card-details-title">Manage branches</span>
            <span className="form-card-details-chev" aria-hidden>
              <IcChevD />
            </span>
          </summary>
          <div className="form-card-details-body branch-manage-details-body">
            <form className="form-card branch-add-form" onSubmit={addBranch}>
              <span className="form-card-title">Add a branch</span>
              <div className="form-stack branch-add-row">
                <Field label="Branch name">
                  <input
                    value={newBranchName}
                    onChange={(e) => setNewBranchName(e.target.value)}
                    placeholder="e.g. Warehouse B"
                    maxLength={80}
                  />
                </Field>
                <button type="submit" className="qa-btn qa-primary branch-add-btn">
                  Add
                </button>
              </div>
            </form>
            <ul className="branch-manage-list">
              {brList.map((b) => (
                <li key={b.id} className="branch-manage-item">
                  <span className="branch-manage-name">{b.name}</span>
                  {brList.length > 1 ? (
                    <button type="button" className="ghost-btn branch-manage-remove" onClick={() => tryRemoveBranch(b)}>
                      Remove
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        </details>
      </section>

      <div className="inv-summary branch-inv-summary" aria-label="Branch inventory totals">
        <div className="inv-sum-card">
          <span className="inv-sum-val">{branchInvRows.length}</span>
          <span className="inv-sum-lbl">Items</span>
        </div>
        <div className="inv-sum-card">
          <span className="inv-sum-val">{money(totalVal)}</span>
          <span className="inv-sum-lbl">Stock Value</span>
        </div>
        {lowStock > 0 ? (
          <div className="inv-sum-card inv-sum-warn">
            <span className="inv-sum-val">{lowStock}</span>
            <span className="inv-sum-lbl">Low / Out</span>
          </div>
        ) : null}
      </div>

      <div className="tab-page-scroll">
        <div className="banking-screen branch-screen-inner">
          <section className="fin-section branch-inv-section" aria-labelledby="branch-inv-hd">
            <h2 id="branch-inv-hd" className="home-section-hd">
              Inventory at this branch
            </h2>
            <div className="list-area">
              <PaginatedInvRows
                key={`${displayBranchId}|${branchInvRows.length}`}
                virtuosoLayout="embedded"
                invRows={branchInvRows}
                onDeleteItem={(key) => onDeleteBranchProduct(key, displayBranchId)}
                onOpenItem={(row) => openInventoryItemDetail(row, displayBranchId)}
              />
            </div>
          </section>
        </div>
      </div>
      <button type="button" className="fab" onClick={() => openAddStock("in", "", displayBranchId)} aria-label="Add stock">
        <IcPlus />
      </button>
    </TabPageChrome>
  );
}
