import { getDefaultBankAccountId, getDefaultBranchId, normBranchesList } from "@/domain/index.js";
import { IcBox, IcMinus, IcPlus, IcTrash } from "@/shared/ui/icons/AppIcons.jsx";
import { MenuSelect } from "@/shared/ui/inputs/MenuSelect.jsx";
import { Field, OverlayScreen, PageHeader } from "@/shared/ui/layout/AppChrome.jsx";

export function AddStockScreen({
  entry,
  upd,
  invRows,
  branchInvRows,
  branches = [],
  bankAccounts = [],
  stockCategorySuggestions = [],
  onProductPick,
  onTypeChange,
  onSubmit,
  onClose,
  isEdit = false,
  onRequestDelete,
}) {
  const branchRows = branchInvRows ?? invRows;
  const outRows = branchRows.filter((r) => r.currentQty > 0);
  const selRow = entry.item ? branchRows.find((r) => r.item.toLowerCase() === entry.item.toLowerCase()) : null;
  const isOpening = entry.type === "opening";
  const isInMode = entry.type === "in" || isOpening;
  const pickValue = entry.type === "out" ? entry.productPick || "" : entry.productPick || "__new__";
  const banks = bankAccounts.filter((b) => b && b.id);
  const rawBankId = String(entry.bankAccountId || "").trim();
  const bankSelectValue = banks.some((b) => String(b.id) === rawBankId) ? rawBankId : getDefaultBankAccountId(banks);
  const brList = normBranchesList(branches);
  const rawBr = String(entry.branchId || "").trim();
  const branchSelectValue = brList.some((b) => String(b.id) === rawBr) ? rawBr : getDefaultBranchId(brList);
  const title = isEdit ? "Edit stock entry" : "Add stock";

  return (
    <OverlayScreen>
      <PageHeader
        title={title}
        onBack={onClose}
        right={
          isEdit && onRequestDelete ? (
            <button type="button" className="icon-btn icon-btn-sm detail-hdr-del-ic" onClick={onRequestDelete} aria-label="Delete entry">
              <IcTrash />
            </button>
          ) : undefined
        }
      />
      <div className="overlay-scroll">
        <form className="form-sections" onSubmit={onSubmit}>
          <div className="form-card">
            {!isEdit && (
              <div className="stock-toggle stock-toggle--three" role="group" aria-label="Movement type">
                <button type="button" className={`stt-btn${entry.type === "in" ? " active" : ""}`} onClick={() => onTypeChange("in")}>
                  <span className="stt-btn-inner">
                    <IcPlus />
                    Stock In
                  </span>
                </button>
                <button type="button" className={`stt-btn${isOpening ? " active" : ""}`} onClick={() => onTypeChange("opening")}>
                  <span className="stt-btn-inner">
                    <IcBox />
                    Opening
                  </span>
                </button>
                <button type="button" className={`stt-btn${entry.type === "out" ? " active" : ""}`} onClick={() => onTypeChange("out")}>
                  <span className="stt-btn-inner">
                    <IcMinus />
                    Stock Out
                  </span>
                </button>
              </div>
            )}
            {!isEdit && isOpening && (
              <p className="stock-opening-hint">Brings in quantity and valuation without paying from a bank or cash account (e.g. stock on hand at FY start).</p>
            )}
            <div className="form-stack">
              <Field label="Date">
                <input type="date" value={entry.date} onChange={(e) => upd("date", e.target.value)} />
              </Field>

              {brList.length > 1 && (
                <Field label="Branch">
                  <MenuSelect
                    value={branchSelectValue}
                    onChange={(v) => upd("branchId", v)}
                    options={brList.map((b) => ({
                      value: b.id,
                      label: b.name || "Branch",
                    }))}
                  />
                </Field>
              )}

              {entry.type === "out" && outRows.length > 0 && (
                <Field label="Product">
                  <MenuSelect
                    className="stock-product-select"
                    value={pickValue}
                    onChange={(v) => onProductPick(v)}
                    options={[
                      { value: "", label: "Select product" },
                      ...outRows.map((r) => ({
                        value: r.item.toLowerCase(),
                        label: r.item,
                        sub: `${r.currentQty % 1 === 0 ? r.currentQty : r.currentQty.toFixed(2)} Nos on hand`,
                      })),
                    ]}
                  />
                </Field>
              )}

              {isInMode && (
                <Field label="Product">
                  <MenuSelect
                    className="stock-product-select"
                    value={pickValue}
                    onChange={(v) => onProductPick(v)}
                    options={[
                      { value: "__new__", label: "New product..." },
                      ...invRows.map((r) => ({
                        value: r.item.toLowerCase(),
                        label: r.item,
                        sub: `on hand: ${r.currentQty % 1 === 0 ? r.currentQty : r.currentQty.toFixed(2)}`,
                      })),
                    ]}
                  />
                </Field>
              )}

              {isInMode && entry.productPick === "__new__" && (
                <Field label="New product name">
                  <input
                    type="text"
                    required
                    value={entry.item}
                    onChange={(e) => upd("item", e.target.value)}
                    placeholder="e.g. Neo"
                    autoComplete="off"
                  />
                </Field>
              )}

              {isInMode && entry.productPick && entry.productPick !== "__new__" && entry.item && (
                <p className="stock-picked-banner">
                  {isOpening ? "Opening stock for " : "Adding stock for "}
                  <strong>{entry.item}</strong>
                </p>
              )}

              {entry.type === "out" && selRow && (
                <p className="stock-onhand">
                  On hand: <strong>{selRow.currentQty % 1 === 0 ? selRow.currentQty : selRow.currentQty.toFixed(2)} Nos</strong>
                </p>
              )}

              <Field label="Quantity (Nos)">
                <input
                  type="number"
                  min="0.01"
                  step="any"
                  required
                  value={entry.qty}
                  onChange={(e) => upd("qty", e.target.value)}
                  max={entry.type === "out" && selRow ? selRow.currentQty : undefined}
                />
              </Field>

              {isInMode && (
                <>
                  <Field label={isOpening ? "Cost / unit (₹)" : "Purchase price / unit (₹)"}>
                    <input type="number" min="0" step="0.01" required value={entry.costPerUnit} onChange={(e) => upd("costPerUnit", e.target.value)} />
                  </Field>
                  <Field label="Selling price / unit (₹, optional)">
                    <input type="number" min="0" step="0.01" value={entry.salesPrice} onChange={(e) => upd("salesPrice", e.target.value)} />
                  </Field>
                  {!isOpening && banks.length > 0 && (
                    <Field label="Paid from">
                      <MenuSelect
                        value={bankSelectValue}
                        onChange={(v) => upd("bankAccountId", v)}
                        options={banks.map((b) => ({
                          value: b.id,
                          label: (b.name || "").trim() || "Account",
                        }))}
                      />
                    </Field>
                  )}
                </>
              )}

              <Field label="Note (optional)">
                <input
                  type="text"
                  value={entry.note}
                  onChange={(e) => upd("note", e.target.value)}
                  placeholder={isOpening ? "e.g. FY opening balance" : "e.g. Supplier return, damaged"}
                />
              </Field>
              <Field label="Category (optional)">
                <input
                  type="text"
                  value={entry.category ?? ""}
                  onChange={(e) => upd("category", e.target.value)}
                  placeholder="e.g. Scooty, Lithium battery, Graphene battery"
                  autoComplete="off"
                  aria-label="Product category"
                />
              </Field>
              {stockCategorySuggestions.length > 0 && (
                <p className="settings-inline-hint" style={{ marginTop: -2 }}>
                  Suggestions: {stockCategorySuggestions.slice(0, 6).join(", ")}
                  {stockCategorySuggestions.length > 6 ? "..." : ""}
                </p>
              )}
            </div>
          </div>
          <button
            type="submit"
            disabled={entry.type === "out" && outRows.length === 0}
            className={`primary-btn submit-btn${entry.type === "out" ? " btn-danger" : ""}`}
          >
            {isEdit ? "Save changes" : isOpening ? "Save opening stock" : entry.type === "in" ? "Add Stock" : "Deduct Stock"}
          </button>
        </form>
      </div>
    </OverlayScreen>
  );
}
