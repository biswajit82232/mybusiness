import { useEffect, useState } from "react";
import {
  computeInvRowsAggregated,
  computeInvRowsForBranch,
  dateHuman,
  effectiveEntryBranchId,
  money,
  moneyFull,
  num,
  normBranchesList,
  stockInCashAmount,
} from "@/domain/index.js";
import { IcEdit, IcPlus } from "@/shared/ui/icons/AppIcons.jsx";
import { OverlayScreen, PageHeader } from "@/shared/ui/layout/AppChrome.jsx";

function typeLabel(t) {
  if (t === "out") return "Stock out";
  if (t === "opening") return "Opening";
  return "Stock in";
}

export function InventoryItemDetailScreen({
  itemKey,
  displayName,
  branchId = "",
  inventoryEntries = [],
  branches = [],
  stockCategorySuggestions = [],
  onSaveProductCategory,
  onRenameProduct,
  onClose,
  onEditEntry,
  openAddStock,
}) {
  const brList = normBranchesList(branches);
  const branchName = branchId ? brList.find((b) => b && b.id === branchId)?.name || "Branch" : null;

  let summaryRow = null;
  if (branchId) {
    const rows = computeInvRowsForBranch(inventoryEntries, branchId, branches);
    summaryRow = rows.find((r) => r.item.toLowerCase() === itemKey) ?? null;
  } else {
    const rows = computeInvRowsAggregated(inventoryEntries);
    summaryRow = rows.find((r) => r.item.toLowerCase() === itemKey) ?? null;
  }

  const k = String(itemKey || "").toLowerCase();
  const movements = (inventoryEntries || [])
    .filter((e) => {
      if (!e || (e.item || "").toLowerCase() !== k) return false;
      if (!branchId) return true;
      return effectiveEntryBranchId(e, branches) === branchId;
    })
    .sort((a, b) => {
      const dc = String(b.date || "").localeCompare(String(a.date || ""));
      if (dc !== 0) return dc;
      return String(b.id || "").localeCompare(String(a.id || ""));
    });

  const branchOpt = branchId || null;

  const fromAgg = (summaryRow?.category || "").trim();
  let resolvedCategory = fromAgg;
  if (!resolvedCategory) {
    for (const e of inventoryEntries || []) {
      if ((e.item || "").toLowerCase() !== k) continue;
      const c = String(e.category || "").trim();
      if (c) {
        resolvedCategory = c;
        break;
      }
    }
  }
  if (!resolvedCategory) resolvedCategory = "";

  const [catDraft, setCatDraft] = useState(resolvedCategory);
  const [editingCat, setEditingCat] = useState(false);
  const [nameDraft, setNameDraft] = useState(displayName || "");
  const [editingName, setEditingName] = useState(false);

  useEffect(() => {
    setCatDraft(resolvedCategory);
    setEditingCat(false);
  }, [resolvedCategory, itemKey]);

  useEffect(() => {
    setNameDraft(displayName || "");
    setEditingName(false);
  }, [displayName, itemKey]);

  const saveCategory = () => {
    const next = catDraft.trim();
    setEditingCat(false);
    if (typeof onSaveProductCategory !== "function") return;
    if (next === resolvedCategory) return;
    onSaveProductCategory(itemKey, next);
  };

  const openAdd = () => openAddStock("in", displayName, branchOpt);

  const saveName = async () => {
    const next = nameDraft.trim().replace(/\s+/g, " ");
    setEditingName(false);
    if (!next || next === (displayName || "").trim()) return;
    if (typeof onRenameProduct !== "function") return;
    const ok = await onRenameProduct(itemKey, next);
    if (!ok) setNameDraft(displayName || "");
  };

  return (
    <OverlayScreen>
      <PageHeader
        title={displayName || "Product"}
        onBack={onClose}
        right={
          <div className="detail-hdr-actions">
            {typeof onRenameProduct === "function" && !editingName && (
              <button
                type="button"
                className="icon-btn icon-btn-sm"
                onClick={() => setEditingName(true)}
                aria-label="Rename product"
              >
                <IcEdit />
              </button>
            )}
            <button type="button" className="icon-btn icon-btn-sm" onClick={openAdd} aria-label="Add stock">
              <IcPlus />
            </button>
          </div>
        }
      />
      <div className="overlay-scroll">
        <div className="form-sections">
          <div className="form-card inv-item-detail-summary">
            {typeof onRenameProduct === "function" && (
              <div className="inv-item-name-block">
                <span className="inv-item-name-lbl">Product name</span>
                {editingName ? (
                  <input
                    type="text"
                    className="inv-item-name-input"
                    value={nameDraft}
                    onChange={(e) => setNameDraft(e.target.value)}
                    onBlur={() => void saveName()}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void saveName();
                      }
                      if (e.key === "Escape") {
                        setNameDraft(displayName || "");
                        setEditingName(false);
                      }
                    }}
                    placeholder="Product name"
                    autoComplete="off"
                    autoFocus
                    aria-label="Product name"
                  />
                ) : (
                  <div className="inv-item-name-display">
                    <strong className="inv-item-name-val">{displayName || "—"}</strong>
                    <button
                      type="button"
                      className="icon-btn icon-btn-sm inv-item-cat-edit-btn"
                      onClick={() => setEditingName(true)}
                      aria-label="Rename product"
                    >
                      <IcEdit />
                    </button>
                  </div>
                )}
              </div>
            )}
            {branchName && (
              <p className="inv-item-detail-branch">
                <span className="inv-item-detail-branch-lbl">Branch</span> {branchName}
              </p>
            )}
            {summaryRow ? (
              <div className="detail-kpi-grid inv-item-detail-kpis">
                <div className="detail-kpi">
                  <span className="detail-kpi-lbl">On hand</span>
                  <strong className="detail-kpi-val">
                    {summaryRow.currentQty % 1 === 0 ? summaryRow.currentQty : summaryRow.currentQty.toFixed(2)} Nos
                  </strong>
                </div>
                <div className="detail-kpi">
                  <span className="detail-kpi-lbl">Avg cost</span>
                  <strong className="detail-kpi-val fin-amount">{moneyFull(summaryRow.avgCost)}</strong>
                </div>
                <div className="detail-kpi">
                  <span className="detail-kpi-lbl">Stock value</span>
                  <strong className="detail-kpi-val fin-amount">{moneyFull(summaryRow.stockValue)}</strong>
                </div>
                {typeof onSaveProductCategory === "function" ? (
                  <div className="detail-kpi inv-item-detail-cat-kpi">
                    <span className="detail-kpi-lbl">Category</span>
                    {editingCat ? (
                      <div className="inv-item-cat-edit">
                        <input
                          type="text"
                          className="inv-item-cat-input"
                          value={catDraft}
                          onChange={(e) => setCatDraft(e.target.value)}
                          onBlur={saveCategory}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              saveCategory();
                            }
                            if (e.key === "Escape") {
                              setCatDraft(resolvedCategory);
                              setEditingCat(false);
                            }
                          }}
                          placeholder="e.g. Lithium battery"
                          autoComplete="off"
                          autoFocus
                          aria-label="Product category"
                        />
                      </div>
                    ) : (
                      <div className="inv-item-cat-display">
                        <strong className="detail-kpi-val">{resolvedCategory || "—"}</strong>
                        <button
                          type="button"
                          className="icon-btn icon-btn-sm inv-item-cat-edit-btn"
                          onClick={() => setEditingCat(true)}
                          aria-label="Edit category"
                        >
                          <IcEdit />
                        </button>
                      </div>
                    )}
                  </div>
                ) : resolvedCategory ? (
                  <div className="detail-kpi">
                    <span className="detail-kpi-lbl">Category</span>
                    <strong className="detail-kpi-val">{resolvedCategory}</strong>
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="inv-item-detail-empty-sum">No quantity on hand for this filter.</p>
            )}
            {editingCat && stockCategorySuggestions.length > 0 && (
              <p className="inv-item-cat-hint">
                Suggestions: {stockCategorySuggestions.slice(0, 6).join(", ")}
                {stockCategorySuggestions.length > 6 ? "…" : ""}
              </p>
            )}
          </div>

          <div className="inv-item-detail-actions">
            <button type="button" className="inv-detail-act inv-detail-act-in inv-detail-act--solo" onClick={openAdd}>
              <IcPlus />
              Add stock
            </button>
          </div>

          <div className="form-card">
            <span className="form-card-title">Movements</span>
            {movements.length === 0 ? (
              <p className="muted" style={{ margin: "10px 0 0", fontSize: "0.88rem" }}>
                No entries yet. Use Add stock above, then choose Stock In, Opening, or Stock Out.
              </p>
            ) : (
              <ul className="inv-move-list">
                {movements.map((inv) => {
                  const cash = stockInCashAmount(inv);
                  const unitCost = inv.type !== "out" ? num(inv.costPerUnit) : 0;
                  const br = brList.find((b) => b && b.id === effectiveEntryBranchId(inv, branches));
                  return (
                    <li key={inv.id}>
                      <button type="button" className="inv-move-row" onClick={() => onEditEntry(inv.id)}>
                        <div className="inv-move-left">
                          <span className="inv-move-date">{dateHuman(inv.date)}</span>
                          <span className={`inv-move-type inv-move-type--${inv.type === "out" ? "out" : inv.type === "opening" ? "op" : "in"}`}>
                            {typeLabel(inv.type)}
                          </span>
                          {unitCost > 0 && (
                            <span className="inv-move-rate">{moneyFull(unitCost)} / unit</span>
                          )}
                          {!branchId && br && <span className="inv-move-branch">{br.name}</span>}
                        </div>
                        <div className="inv-move-right">
                          <span className="inv-move-qty">
                            {inv.type === "out" ? "−" : "+"}
                            {Number(inv.qty) % 1 === 0 ? inv.qty : Number(inv.qty).toFixed(2)}
                          </span>
                          {cash > 0 && <span className="inv-move-cash">{money(cash)} paid</span>}
                          <span className="inv-move-edit-ic" aria-hidden>
                            <IcEdit />
                          </span>
                        </div>
                      </button>
                      {(inv.note || "").trim() ? (
                        <p className="inv-move-note">{(inv.note || "").trim()}</p>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </OverlayScreen>
  );
}
