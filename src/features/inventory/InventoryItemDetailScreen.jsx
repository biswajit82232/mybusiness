import { useState } from "react";
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
import { IcChevR, IcPlus } from "@/shared/ui/icons/AppIcons.jsx";
import { Field, OverlayScreen, PageHeader } from "@/shared/ui/layout/AppChrome.jsx";

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

  return (
    <OverlayScreen>
      <PageHeader title={displayName || "Product"} onBack={onClose} />
      <div className="overlay-scroll">
        <div className="form-sections">
          <div className="form-card inv-item-detail-summary">
            {branchName && (
              <p className="inv-item-detail-branch">
                <span className="inv-item-detail-branch-lbl">Branch</span> {branchName}
              </p>
            )}
            {summaryRow ? (
              <dl className="inv-item-detail-dl">
                <div>
                  <dt>On hand</dt>
                  <dd>
                    {summaryRow.currentQty % 1 === 0 ? summaryRow.currentQty : summaryRow.currentQty.toFixed(2)} Nos
                  </dd>
                </div>
                <div>
                  <dt>Avg cost</dt>
                  <dd className="fin-amount">{moneyFull(summaryRow.avgCost)}</dd>
                </div>
                <div>
                  <dt>Stock value</dt>
                  <dd className="fin-amount">{moneyFull(summaryRow.stockValue)}</dd>
                </div>
              </dl>
            ) : (
              <p className="inv-item-detail-empty-sum">No quantity on hand for this filter.</p>
            )}
          </div>

          {typeof onSaveProductCategory === "function" && (
            <div className="form-card">
              <Field label="Category">
                <input
                  type="text"
                  value={catDraft}
                  onChange={(e) => setCatDraft(e.target.value)}
                  onBlur={() => {
                    const next = catDraft.trim();
                    if (next === resolvedCategory) return;
                    onSaveProductCategory(itemKey, next);
                  }}
                  placeholder="e.g. Scooty, Lithium battery"
                  autoComplete="off"
                  aria-label="Product category"
                />
              </Field>
              {stockCategorySuggestions.length > 0 && (
                <p className="settings-inline-hint" style={{ marginTop: 8 }}>
                  Suggestions: {stockCategorySuggestions.slice(0, 6).join(", ")}
                  {stockCategorySuggestions.length > 6 ? "..." : ""}
                </p>
              )}
              <p className="settings-inline-hint" style={{ marginTop: 8 }}>
                Applies to this product everywhere. Used for grouping on the Products page.
              </p>
            </div>
          )}

          <div className="inv-item-detail-actions">
            <button
              type="button"
              className="inv-detail-act inv-detail-act-in inv-detail-act--solo"
              onClick={() => openAddStock("in", displayName, branchOpt)}
            >
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
                          <span className="inv-move-chev" aria-hidden>
                            <IcChevR />
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
