import { useMemo, useState } from "react";
import { findInvRowByItemName, money, normalizeItemKey, num } from "@/domain/index.js";
import { MenuSelect } from "@/shared/ui/inputs/MenuSelect.jsx";

const SEARCH_MIN = 8;

function dedupeInvRows(rows) {
  const seen = new Set();
  const out = [];
  for (const r of Array.isArray(rows) ? rows : []) {
    if (!r || typeof r !== "object") continue;
    const label = String(r.item || "").trim();
    if (!label) continue;
    const key = normalizeItemKey(label);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ ...r, item: label });
  }
  return out.sort((a, b) =>
    String(a.item).localeCompare(String(b.item), undefined, { sensitivity: "base" }),
  );
}

function rowSubLabel(row, stockQtyMode) {
  const qty = row.currentQty != null ? row.currentQty : 0;
  const q = qty % 1 === 0 ? qty : Number(qty).toFixed(2);
  const ac = num(row.avgCost);
  if (stockQtyMode) {
    return `${q} in stock${ac > 0 ? ` · avg ${money(ac)}` : ""}`;
  }
  return `${q} on hand${ac > 0 ? ` · avg ${money(ac)}` : ""}`;
}

/**
 * Dropdown of inventory items plus free-text custom name.
 * Matches names case-insensitively; preserves typed text when switching to custom.
 */
export function InventoryItemPickField({
  invRows = [],
  value,
  onItemChange,
  onPickRow,
  /** `"__custom__"` or normalized lowercase item key — tracks catalog vs typed item */
  catalogPick = "",
  onCatalogPickChange,
  disabled = false,
  required = false,
  selectClassName = "stock-product-select",
  hint = "",
  /** When false, hides the product search box (e.g. New Sale form). */
  searchable = true,
  /** When true, option subtitles emphasize branch stock qty (sales auto stock-out). */
  stockQtyMode = false,
}) {
  const [filterQuery, setFilterQuery] = useState("");

  const sorted = useMemo(() => dedupeInvRows(invRows), [invRows]);

  const filtered = useMemo(() => {
    if (!searchable) return sorted;
    const q = normalizeItemKey(filterQuery);
    if (!q) return sorted;
    return sorted.filter((r) => {
      const key = normalizeItemKey(r.item);
      return key.includes(q) || String(r.item).toLowerCase().includes(filterQuery.trim().toLowerCase());
    });
  }, [sorted, filterQuery, searchable]);

  const trimVal = String(value || "").trim();
  const matched = findInvRowByItemName(sorted, trimVal);
  const explicitPick = String(catalogPick || "").trim();
  const explicitRow =
    explicitPick && explicitPick !== "__custom__" ? findInvRowByItemName(sorted, explicitPick) : null;

  const optionKeys = useMemo(
    () => new Set(sorted.map((r) => normalizeItemKey(r.item))),
    [sorted],
  );

  let pickVal = "__custom__";
  if (explicitRow) pickVal = normalizeItemKey(explicitRow.item);
  else if (matched) pickVal = normalizeItemKey(matched.item);
  if (pickVal !== "__custom__" && !optionKeys.has(pickVal)) pickVal = "__custom__";

  const menuValue = optionKeys.has(pickVal) || pickVal === "__custom__" ? pickVal : "__custom__";
  const showCustomInput = menuValue === "__custom__";
  const showSearch = searchable && sorted.length >= SEARCH_MIN;

  const applyCatalogRow = (row) => {
    if (!row) return;
    const key = normalizeItemKey(row.item);
    onCatalogPickChange?.(key);
    onItemChange(row.item);
    onPickRow?.(row);
  };

  const handleMenuChange = (v) => {
    if (v === "__custom__") {
      onCatalogPickChange?.("__custom__");
      return;
    }
    applyCatalogRow(findInvRowByItemName(sorted, v));
  };

  const handleCustomChange = (text) => {
    onCatalogPickChange?.("__custom__");
    onItemChange(text);
  };

  const handleCustomBlur = () => {
    const row = findInvRowByItemName(sorted, trimVal);
    if (row) applyCatalogRow(row);
  };

  return (
    <div className="item-pick-field">
      {showSearch ? (
        <input
          type="search"
          className="item-pick-search"
          value={filterQuery}
          onChange={(e) => setFilterQuery(e.target.value)}
          placeholder="Search products…"
          autoComplete="off"
          disabled={disabled}
          aria-label="Search products"
        />
      ) : null}
      <MenuSelect
        className={selectClassName}
        value={menuValue}
        disabled={disabled}
        onChange={handleMenuChange}
        options={[
          { value: "__custom__", label: "Other item (type below)…" },
          ...filtered.map((r) => ({
            value: normalizeItemKey(r.item),
            label: r.item,
            sub: rowSubLabel(r, stockQtyMode),
          })),
        ]}
      />
      {showCustomInput ? (
        <input
          type="text"
          className="item-pick-custom"
          required={required}
          value={value || ""}
          disabled={disabled}
          onChange={(e) => handleCustomChange(e.target.value)}
          onBlur={handleCustomBlur}
          placeholder="Type item name…"
          autoComplete="off"
        />
      ) : (
        <input type="text" readOnly className="item-pick-readonly" value={trimVal} aria-readonly="true" />
      )}
      {hint ? <p className="form-hint form-hint--field">{hint}</p> : null}
      {showCustomInput && matched && explicitPick === "__custom__" ? (
        <p className="form-hint form-hint--field">
          Matches catalog item <strong>{matched.item}</strong> — pick it from the list to link stock &amp; prices.
        </p>
      ) : null}
    </div>
  );
}
