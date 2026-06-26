import { useEffect, useMemo, useState } from "react";
import {
  computeInvRowsAggregated,
  computeInvRowsForBranch,
  currentMonthStr,
  dateHuman,
  effectiveEntryBranchId,
  formatMonthLabel,
  money,
  moneyFull,
  num,
  normBranchesList,
  stockInCashAmount,
} from "@/domain/index.js";
import { IcEdit, IcMinus, IcPlus } from "@/shared/ui/icons/AppIcons.jsx";
import { OverlayScreen, PageHeader } from "@/shared/ui/layout/AppChrome.jsx";
import { MonthFilterCompact } from "@/shared/ui/shell/MonthFilterCompact.jsx";

function typeLabel(t) {
  if (t === "out") return "Stock out";
  if (t === "opening") return "Opening";
  return "Stock in";
}

function formatQty(q) {
  const n = Number(q);
  if (!Number.isFinite(n)) return "0";
  return n % 1 === 0 ? String(n) : n.toFixed(2);
}

function stockStatusLabel(qty) {
  if (qty < 0) return "Negative stock";
  if (qty === 0) return "Out of stock";
  if (qty <= 2) return "Low stock";
  return "In stock";
}

export function InventoryItemDetailScreen({
  itemKey,
  displayName,
  branchId = "",
  inventoryEntries = [],
  branches = [],
  stockCategorySuggestions = [],
  onSaveProductCategory,
  onSaveProductTaxMeta,
  onRenameProduct,
  gstEnabled = true,
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
  const allMovements = useMemo(
    () =>
      (inventoryEntries || [])
        .filter((e) => {
          if (!e || (e.item || "").toLowerCase() !== k) return false;
          if (!branchId) return true;
          return effectiveEntryBranchId(e, branches) === branchId;
        })
        .sort((a, b) => {
          const dc = String(b.date || "").localeCompare(String(a.date || ""));
          if (dc !== 0) return dc;
          return String(b.id || "").localeCompare(String(a.id || ""));
        }),
    [inventoryEntries, k, branchId, branches],
  );

  const [viewMonthKey, setViewMonthKey] = useState(() => currentMonthStr());
  const [movementsShowAll, setMovementsShowAll] = useState(true);

  const movements = useMemo(() => {
    if (movementsShowAll) return allMovements;
    const mk = String(viewMonthKey || "").slice(0, 7);
    if (mk.length < 7) return allMovements;
    return allMovements.filter((e) => String(e.date || "").slice(0, 7) === mk);
  }, [allMovements, movementsShowAll, viewMonthKey]);

  const monthLabel = formatMonthLabel(viewMonthKey);
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
  const [hsnDraft, setHsnDraft] = useState(summaryRow?.hsn || "8711");
  const [gstDraft, setGstDraft] = useState(summaryRow?.gstRate > 0 ? String(summaryRow.gstRate) : "5");

  useEffect(() => {
    setHsnDraft(summaryRow?.hsn || "8711");
    setGstDraft(summaryRow?.gstRate > 0 ? String(summaryRow.gstRate) : "5");
  }, [summaryRow?.gstRate, summaryRow?.hsn, itemKey]);

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

  const openAddIn = () => openAddStock("in", displayName, branchOpt);
  const openAddOut = () => openAddStock("out", displayName, branchOpt);

  const saveName = async () => {
    const next = nameDraft.trim().replace(/\s+/g, " ");
    setEditingName(false);
    if (!next || next === (displayName || "").trim()) return;
    if (typeof onRenameProduct !== "function") return;
    const ok = await onRenameProduct(itemKey, next);
    if (!ok) setNameDraft(displayName || "");
  };

  const qty = summaryRow?.currentQty ?? 0;
  const statusLabel = stockStatusLabel(qty);

  return (
    <OverlayScreen className="overlay-screen--inv-detail">
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
            <button type="button" className="icon-btn icon-btn-sm" onClick={openAddIn} aria-label="Add stock">
              <IcPlus />
            </button>
          </div>
        }
      />
      <div className="overlay-scroll overlay-scroll--form-body">
        <div className="inv-top inv-top--overlay">
          <section className="inv-hero inv-hero--compact" aria-label="Product stock">
            <div className="inv-hero-top">
              <span className="inv-hero-eyebrow">{statusLabel}</span>
              <span className="inv-hero-total">
                {summaryRow ? `${formatQty(summaryRow.currentQty)} Nos` : "—"}
              </span>
              <span className="inv-hero-meta">
                {summaryRow ? (
                  <>
                    Value {moneyFull(summaryRow.stockValue)}
                    {branchName ? ` · ${branchName}` : ""}
                  </>
                ) : (
                  branchName || "No quantity on hand"
                )}
              </span>
            </div>
          </section>

          {summaryRow ? (
            <div className="inv-kpi-grid inv-kpi-grid--overlay" aria-label="Product metrics">
              <div className="inv-kpi">
                <span className="inv-kpi-lbl">Avg cost</span>
                <span className="inv-kpi-val">{moneyFull(summaryRow.avgCost)}</span>
              </div>
              <div className="inv-kpi">
                <span className="inv-kpi-lbl">Stock value</span>
                <span className="inv-kpi-val">{moneyFull(summaryRow.stockValue)}</span>
              </div>
              {summaryRow.salesPrice > 0 ? (
                <div className="inv-kpi inv-kpi--good">
                  <span className="inv-kpi-lbl">Sale price</span>
                  <span className="inv-kpi-val">{moneyFull(summaryRow.salesPrice)}</span>
                </div>
              ) : (
                <div className="inv-kpi">
                  <span className="inv-kpi-lbl">Movements</span>
                  <span className="inv-kpi-val">{allMovements.length}</span>
                </div>
              )}
            </div>
          ) : null}
        </div>

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

            {typeof onSaveProductCategory === "function" ? (
              <div className="inv-item-cat-row">
                <span className="inv-item-cat-lbl">Category</span>
                {editingCat ? (
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
                ) : (
                  <div className="inv-item-cat-display">
                    <strong>{resolvedCategory || "—"}</strong>
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
              <p className="inv-item-detail-branch">
                <span className="inv-item-detail-branch-lbl">Category</span> {resolvedCategory}
              </p>
            ) : null}

            {editingCat && stockCategorySuggestions.length > 0 && (
              <p className="inv-item-cat-hint">
                Suggestions: {stockCategorySuggestions.slice(0, 6).join(", ")}
                {stockCategorySuggestions.length > 6 ? "…" : ""}
              </p>
            )}
          </div>

          {typeof onSaveProductTaxMeta === "function" && gstEnabled !== false ? (
            <div className="form-card">
              <span className="form-card-title">Invoice tax (product)</span>
              <div className="form-stack inv-tax-stack">
                <label className="field">
                  <span className="field-lbl">HSN / SAC</span>
                  <input type="text" value={hsnDraft} onChange={(e) => setHsnDraft(e.target.value)} placeholder="8711" />
                </label>
                <label className="field">
                  <span className="field-lbl">GST %</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={gstDraft}
                    onChange={(e) => setGstDraft(e.target.value)}
                  />
                </label>
                <button
                  type="button"
                  className="ghost-btn ghost-btn--full"
                  onClick={() => onSaveProductTaxMeta(itemKey, { hsn: hsnDraft, gstRate: gstDraft })}
                >
                  Save tax defaults
                </button>
              </div>
            </div>
          ) : null}

          <div className="inv-item-detail-actions">
            <button type="button" className="inv-detail-act inv-detail-act-in" onClick={openAddIn}>
              <IcPlus />
              Stock in
            </button>
            <button type="button" className="inv-detail-act inv-detail-act-out" onClick={openAddOut}>
              <IcMinus />
              Stock out
            </button>
          </div>

          <div className="form-card inv-move-card">
            <div className="inv-move-card-hd">
              <div>
                <span className="form-card-title">Movements</span>
                <p className="inv-move-card-sub">
                  {movementsShowAll
                    ? "All time · newest first"
                    : `${monthLabel} · ${movements.length} entr${movements.length === 1 ? "y" : "ies"}`}
                </p>
              </div>
              <div className="inv-move-card-actions">
                <button
                  type="button"
                  className={`inv-filter-chip inv-filter-chip--sm${movementsShowAll ? " inv-filter-chip--on" : ""}`}
                  onClick={() => setMovementsShowAll((v) => !v)}
                  aria-pressed={movementsShowAll}
                >
                  {movementsShowAll ? "This month" : "All time"}
                </button>
                {!movementsShowAll ? (
                  <MonthFilterCompact
                    value={viewMonthKey}
                    onChange={(v) =>
                      setViewMonthKey(v && String(v).length >= 7 ? String(v).slice(0, 7) : currentMonthStr())
                    }
                    instanceId="inv-move"
                    allowClear={false}
                  />
                ) : null}
              </div>
            </div>

            {movements.length === 0 ? (
              <p className="inv-move-empty">
                {movementsShowAll
                  ? "No entries yet. Use Stock in or Stock out above."
                  : `No movements in ${monthLabel}. Try All time or another month.`}
              </p>
            ) : (
              <ul className="inv-move-list inv-move-list--card">
                {movements.map((inv) => {
                  const cash = stockInCashAmount(inv);
                  const unitCost = inv.type !== "out" ? num(inv.costPerUnit) : 0;
                  const br = brList.find((b) => b && b.id === effectiveEntryBranchId(inv, branches));
                  return (
                    <li key={inv.id}>
                      <button type="button" className="inv-move-row" onClick={() => onEditEntry(inv.id)}>
                        <div className="inv-move-left">
                          <span className="inv-move-date">{dateHuman(inv.date)}</span>
                          <span
                            className={`inv-move-type inv-move-type--${inv.type === "out" ? "out" : inv.type === "opening" ? "op" : "in"}`}
                          >
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
                            {formatQty(inv.qty)}
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
