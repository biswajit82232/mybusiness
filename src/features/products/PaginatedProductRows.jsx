import { useMemo, useState } from "react";
import { LIST_PAGE_SIZE, money } from "@/domain/index.js";
import { IcBox } from "@/shared/ui/icons/AppIcons.jsx";

function sortByName(rows) {
  return [...rows].sort((a, b) => String(a.item || "").localeCompare(String(b.item || ""), undefined, { sensitivity: "base" }));
}

/** Group products by on-hand quantity for catalog scanning. */
function groupProductsByStock(rows) {
  const sorted = sortByName(rows);
  const inStock = sorted.filter((r) => r.currentQty > 0);
  const outOfStock = sorted.filter((r) => r.currentQty === 0);
  const negative = sorted.filter((r) => r.currentQty < 0);
  return [
    { key: "in", title: "In stock", rows: inStock },
    { key: "out", title: "Out of stock", rows: outOfStock },
    { key: "neg", title: "Negative on hand", rows: negative },
  ].filter((s) => s.rows.length > 0);
}

function groupProductsByCategory(rows) {
  const sorted = sortByName(rows);
  const byLabel = new Map();
  for (const r of sorted) {
    const label = (r.category || "").trim() || "Uncategorized";
    if (!byLabel.has(label)) byLabel.set(label, []);
    byLabel.get(label).push(r);
  }
  const keys = [...byLabel.keys()].sort((a, b) => {
    if (a === "Uncategorized") return 1;
    if (b === "Uncategorized") return -1;
    return a.localeCompare(b, undefined, { sensitivity: "base" });
  });
  return keys.map((title) => ({
    key: `cat-${encodeURIComponent(title)}`,
    title,
    rows: byLabel.get(title),
  }));
}

function sliceGroupedSections(sections, maxRows) {
  const out = [];
  let used = 0;
  for (const sec of sections) {
    if (used >= maxRows) break;
    const take = Math.min(sec.rows.length, maxRows - used);
    if (take <= 0) continue;
    out.push({
      key: sec.key,
      title: sec.title,
      rows: sec.rows.slice(0, take),
    });
    used += take;
  }
  return { sections: out, shownRows: used };
}

function ProductRowInner({ r }) {
  return (
    <>
      <div className="product-icon">
        <IcBox />
      </div>
      <div className="product-info">
        <div className="product-name">{r.item}</div>
        {r.category ? <div className="product-cat-line">{r.category}</div> : null}
        <div className="product-sub">
          Avg Cost {money(r.avgCost)} · Sales Price {money(r.salesPrice)}
        </div>
      </div>
      <div className="product-right">
        <div className={`product-qty ${r.currentQty < 0 ? "neg" : r.currentQty === 0 ? "zero" : ""}`}>{r.currentQty} pcs</div>
        <div className="product-val">{money(r.stockValue)}</div>
      </div>
    </>
  );
}

/**
 * @param {'flat' | 'stock' | 'category'} groupMode
 */
export function PaginatedProductRows({ filtered, groupMode = "flat", emptyState, onOpenProduct }) {
  const [listCap, setListCap] = useState(LIST_PAGE_SIZE);

  const groupedSections = useMemo(() => {
    if (groupMode === "stock") return groupProductsByStock(filtered);
    if (groupMode === "category") return groupProductsByCategory(filtered);
    return [];
  }, [filtered, groupMode]);

  const { flatVisible, groupedVisible, remaining } = useMemo(() => {
    const n = filtered.length;
    if (groupMode !== "stock" && groupMode !== "category") {
      const vis = sortByName(filtered).slice(0, listCap);
      return {
        flatVisible: vis,
        groupedVisible: null,
        remaining: n - vis.length,
      };
    }
    const { sections, shownRows } = sliceGroupedSections(groupedSections, listCap);
    return {
      flatVisible: null,
      groupedVisible: sections,
      remaining: n - shownRows,
    };
  }, [filtered, groupMode, groupedSections, listCap]);

  if (filtered.length === 0) return emptyState;

  const renderRow = (r) => {
    const inner = <ProductRowInner r={r} />;
    if (typeof onOpenProduct === "function") {
      return (
        <button key={r.item} type="button" className="product-row product-row--interactive" onClick={() => onOpenProduct(r)}>
          {inner}
        </button>
      );
    }
    return (
      <div key={r.item} className="product-row">
        {inner}
      </div>
    );
  };

  return (
    <>
      {(groupMode === "stock" || groupMode === "category") && groupedVisible
        ? groupedVisible.map((sec) => (
            <section key={sec.key} className="product-group" aria-labelledby={`product-grp-${sec.key}`}>
              <h2 id={`product-grp-${sec.key}`} className="product-group-hd">
                <span className="product-group-hd-title">{sec.title}</span>
                <span className="product-group-hd-meta">{sec.rows.length}</span>
              </h2>
              {sec.rows.map((r) => renderRow(r))}
            </section>
          ))
        : flatVisible.map((r) => renderRow(r))}
      {remaining > 0 && (
        <div className="list-load-more-wrap">
          <button type="button" className="list-load-more-btn" onClick={() => setListCap((c) => c + LIST_PAGE_SIZE)}>
            Load more ({remaining} remaining)
          </button>
        </div>
      )}
    </>
  );
}
