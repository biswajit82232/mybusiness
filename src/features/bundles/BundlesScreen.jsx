import { useRef, useState } from "react";
import { makeId, normBundlesList, num } from "@/domain/index.js";
import { InventoryItemPickField } from "@/features/inventory/index.js";
import { IcBundle, IcPlus, IcTrash } from "@/shared/ui/icons/AppIcons.jsx";
import { EmptyState, Field, TabPageChrome } from "@/shared/ui/layout/AppChrome.jsx";

function linesDraftFromBundle(b) {
  return (b?.lines || []).map((l) => ({ item: l.item, qty: String(l.qty ?? 1) }));
}

function BundleFormCard({
  editingId,
  name,
  setName,
  lines,
  invRows,
  setLine,
  addLine,
  removeLine,
  onCancelEdit,
}) {
  return (
    <div className="bundles-form-card">
      <span className="bundles-form-title">{editingId ? "Edit bundle" : "New bundle"}</span>
      <Field label="Bundle name (invoice line)">
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Combo A" required autoComplete="off" />
      </Field>
      <p className="bundles-form-hint">
        Pick products from inventory or type a name. Each row is how many units of that product ship per bundle.
      </p>

      <div className="bundles-lines-hd" aria-hidden="true">
        <span>Product</span>
        <span>Per bundle</span>
        <span className="bundles-lines-hd-spacer" />
      </div>

      <div className="bundles-lines">
        {lines.map((line, i) => (
          <div key={i} className="bundle-line-row bundle-line-row--product-pick">
            <div className="bundle-line-inp bundle-line-inp--product bundle-line-product-wrap">
              <InventoryItemPickField invRows={invRows} value={line.item} required onItemChange={(v) => setLine(i, "item", v)} />
            </div>
            <input
              type="number"
              className="bundle-line-inp bundle-line-inp--qty"
              min="0.01"
              step="any"
              value={line.qty}
              onChange={(e) => setLine(i, "qty", e.target.value)}
              required
              aria-label={`Units per bundle ${i + 1}`}
            />
            {lines.length > 2 ? (
              <button
                type="button"
                className="icon-btn icon-btn-sm bundle-line-remove"
                onClick={() => removeLine(i)}
                aria-label={`Remove product line ${i + 1}`}
              >
                <IcTrash />
              </button>
            ) : (
              <span className="bundle-line-spacer" aria-hidden="true" />
            )}
          </div>
        ))}
      </div>

      <button type="button" className="bundles-add-line-btn" onClick={addLine}>
        <IcPlus />
        Add product line
      </button>

      <div className="bundles-form-actions">
        <button type="submit" className="primary-btn">
          {editingId ? "Save changes" : "Save bundle"}
        </button>
        {editingId ? (
          <button type="button" className="ghost-btn" onClick={onCancelEdit}>
            Cancel edit
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function BundlesScreen({ bundles = [], invRows = [], onSaveBundles, onOpenSidebar, requestConfirm }) {
  const list = normBundlesList(bundles);
  const newBundleDetailsRef = useRef(null);
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState("");
  const [lines, setLines] = useState([{ item: "", qty: "1" }, { item: "", qty: "1" }]);

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setLines([{ item: "", qty: "1" }, { item: "", qty: "1" }]);
  };

  const closeNewBundleDetails = () => {
    const el = newBundleDetailsRef.current;
    if (el) el.open = false;
  };

  const startEdit = (b) => {
    setEditingId(b.id);
    setName(b.name || "");
    const ld = linesDraftFromBundle(b);
    setLines(ld.length >= 2 ? ld : [{ item: "", qty: "1" }, { item: "", qty: "1" }]);
  };

  const setLine = (i, k, v) => {
    const next = [...lines];
    next[i] = { ...next[i], [k]: v };
    setLines(next);
  };

  const addLine = () => setLines([...lines, { item: "", qty: "1" }]);

  const removeLine = (i) => {
    if (lines.length <= 2) return;
    setLines(lines.filter((_, j) => j !== i));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    const normLines = lines
      .map((l) => ({ item: String(l.item || "").trim(), qty: num(l.qty) }))
      .filter((l) => l.item && l.qty > 0);
    if (normLines.length < 2) {
      window.alert("Add at least two products with quantity (each).");
      return;
    }
    const row = {
      id: editingId || makeId(),
      name: trimmed,
      lines: normLines.map((l) => ({ item: l.item, qty: l.qty })),
    };
    const others = normBundlesList(bundles).filter((b) => b.id !== row.id);
    const nextList = normBundlesList([...others, row]);
    onSaveBundles(nextList);
    resetForm();
    if (nextList.length > 0) closeNewBundleDetails();
  };

  const handleDelete = (id) => {
    requestConfirm?.({
      title: "Delete this bundle?",
      message: "This bundle will be removed from your catalog.",
      confirmLabel: "Delete bundle",
      danger: true,
      onConfirm: () => {
        const remaining = normBundlesList(bundles).filter((b) => b.id !== id);
        onSaveBundles(remaining);
        if (editingId === id) {
          resetForm();
          if (remaining.length > 0) closeNewBundleDetails();
        }
      },
    });
  };

  const onCancelEdit = () => {
    resetForm();
    if (list.length > 0) closeNewBundleDetails();
  };

  const formInner = (
    <BundleFormCard
      editingId={editingId}
      name={name}
      setName={setName}
      lines={lines}
      invRows={invRows}
      setLine={setLine}
      addLine={addLine}
      removeLine={removeLine}
      onCancelEdit={onCancelEdit}
    />
  );

  /* Saved bundles + not editing: native <details> so show/hide always works. Otherwise single full-width form. */
  const useCollapsibleNewBundle = list.length > 0 && editingId == null;

  return (
    <TabPageChrome
      title="Bundles"
      onOpenSidebar={onOpenSidebar}
      className="tab-page--split-scroll tab-page--bundles"
      right={<span className="page-hdr-meta">{list.length} bundle{list.length === 1 ? "" : "s"}</span>}
    >
      <div className="tab-page-scroll bundles-page-scroll">
        <div className="overlay-kpi-strip bundles-kpi">
          <div className="recv-kpi">
            <div className="recv-kpi-lbl">Defined bundles</div>
            <div className="recv-kpi-val primary">{list.length}</div>
          </div>
        </div>

        {useCollapsibleNewBundle ? (
          <details ref={newBundleDetailsRef} className="bundles-form-details">
            <summary className="bundles-form-summary">
              <span className="bundles-form-summary-text">
                <span className="bundles-form-summary-title">New bundle</span>
                <span className="bundles-form-summary-sub">Tap to show or hide the form</span>
              </span>
            </summary>
            <form id="bundles-create-form" className="bundles-form bundles-form--in-details" onSubmit={handleSubmit} aria-label="New bundle">
              {formInner}
            </form>
          </details>
        ) : (
          <form id="bundles-create-form" className="bundles-form" onSubmit={handleSubmit} aria-label={editingId ? "Edit bundle" : "New bundle"}>
            {formInner}
          </form>
        )}

        <div className="daily-section-hd bundles-saved-hd">Saved bundles</div>
        <div className="list-area bundles-list-area">
          {list.length === 0 ? (
            <EmptyState icon={<IcBundle />} title="No bundles yet" sub="Create a bundle to sell two or more products as one invoice line." />
          ) : (
            <ul className="bundles-saved-list">
              {list.map((b) => (
                <li key={b.id} className="bundles-saved-row">
                  <div className="bundles-saved-main">
                    <span className="bundles-saved-name">{b.name}</span>
                    <span className="bundles-saved-meta">{b.lines.map((l) => `${l.item} × ${l.qty}`).join(" · ")}</span>
                  </div>
                  <div className="bundles-saved-actions">
                    <button type="button" className="ghost-btn bundles-saved-edit" onClick={() => startEdit(b)}>
                      Edit
                    </button>
                    <button type="button" className="icon-btn icon-btn-sm bundles-saved-del" aria-label={`Delete ${b.name}`} onClick={() => handleDelete(b.id)}>
                      <IcTrash />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </TabPageChrome>
  );
}
