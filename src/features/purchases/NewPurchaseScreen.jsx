import { useEffect, useMemo, useRef, useState } from "react";
import { buildVendorPickerRows, filterVendorSuggestRows, getDefaultBankAccountId, money, moneyInputStr, num } from "@/domain/index.js";
import { InventoryItemPickField } from "@/features/inventory/index.js";
import { MenuSelect } from "@/shared/ui/inputs/MenuSelect.jsx";
import { Field, OverlayScreen, PageHeader } from "@/shared/ui/layout/AppChrome.jsx";

export function NewPurchaseScreen({
  isEdit = false,
  entry,
  upd,
  branches,
  bankAccounts = [],
  purchases = [],
  vendorDirectory = [],
  invRows = [],
  onSubmit,
  onClose,
}) {
  const banks = bankAccounts.filter((b) => b && b.id);
  const rawBankId = String(entry.bankAccountId || "").trim();
  const bankInList = banks.some((b) => String(b.id) === rawBankId);
  const bankSelectValue = bankInList ? rawBankId : getDefaultBankAccountId(banks) || "";

  useEffect(() => {
    if (isEdit) return;
    if (!banks.length) return;
    const raw = String(entry.bankAccountId || "").trim();
    if (raw && banks.some((b) => String(b.id) === raw)) return;
    const d = getDefaultBankAccountId(banks);
    if (d && d !== raw) upd("bankAccountId", d);
  }, [isEdit, banks, entry.bankAccountId, upd]);

  const brList = Array.isArray(branches) && branches.length ? branches : [{ id: "", name: "Main" }];
  const bid = String(entry.branchId || "").trim();
  const branchVal = brList.some((b) => b && b.id === bid) ? bid : (brList[0]?.id || "");

  const setLine = (i, k, v) => {
    const lines = [...(entry.lines || [])];
    lines[i] = { ...lines[i], [k]: v };
    upd("lines", lines);
  };
  const addLine = () => {
    upd("lines", [...(entry.lines || []), { item: "", qty: "1", costPerUnit: "" }]);
  };
  const removeLine = (i) => {
    const lines = (entry.lines || []).filter((_, j) => j !== i);
    upd("lines", lines.length ? lines : [{ item: "", qty: "1", costPerUnit: "" }]);
  };

  const totalAmount = useMemo(
    () => (entry.lines || []).reduce((s, l) => s + num(l.qty) * num(l.costPerUnit), 0),
    [entry.lines],
  );
  const paidNow = num(entry.paidAmount);
  const creditAfter = Math.max(0, totalAmount - paidNow);
  const purchaseLineCount = (entry.lines || []).length;
  const showTotalPreview = totalAmount > 0 || purchaseLineCount > 1;

  const vendorPickRows = useMemo(() => buildVendorPickerRows(purchases, vendorDirectory), [purchases, vendorDirectory]);
  const vendorSuggestMatches = useMemo(
    () => filterVendorSuggestRows(vendorPickRows, entry.supplierName),
    [vendorPickRows, entry.supplierName],
  );
  const [vendSuggestOpen, setVendSuggestOpen] = useState(false);
  const vendBlurTRef = useRef(null);
  useEffect(
    () => () => {
      if (vendBlurTRef.current) clearTimeout(vendBlurTRef.current);
    },
    [],
  );

  return (
    <OverlayScreen className="overlay-screen--form-footer">
      <PageHeader title={isEdit ? "Edit purchase" : "New purchase"} onBack={onClose} />
      <div className="overlay-scroll overlay-scroll--form-body">
        <form id="form-new-purchase" className="form-sections" onSubmit={onSubmit}>
          <div className="form-card">
            <div className="form-stack">
              <div className="field-row">
                <Field label="Date">
                  <input type="date" value={entry.date} onChange={(e) => upd("date", e.target.value)} />
                </Field>
                <Field label="Due date">
                  <input type="date" value={entry.dueDate || ""} onChange={(e) => upd("dueDate", e.target.value)} />
                </Field>
                <Field label="Branch">
                  <MenuSelect
                    value={branchVal}
                    onChange={(v) => upd("branchId", v)}
                    options={brList.map((b) => ({
                      value: b.id,
                      label: b.name || "Branch",
                    }))}
                  />
                </Field>
              </div>
              <Field label="Supplier">
                <div className="customer-autocomplete">
                  <input
                    type="text"
                    value={entry.supplierName}
                    onChange={(e) => {
                      upd("supplierName", e.target.value);
                      setVendSuggestOpen(true);
                    }}
                    onFocus={() => setVendSuggestOpen(true)}
                    onBlur={() => {
                      if (vendBlurTRef.current) clearTimeout(vendBlurTRef.current);
                      vendBlurTRef.current = window.setTimeout(() => setVendSuggestOpen(false), 180);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") setVendSuggestOpen(false);
                      if (e.key === "Enter" && vendSuggestOpen && vendorSuggestMatches.length > 0) {
                        e.preventDefault();
                        const first = vendorSuggestMatches[0];
                        if (first) {
                          if (vendBlurTRef.current) clearTimeout(vendBlurTRef.current);
                          upd("supplierName", first.displayName);
                          setVendSuggestOpen(false);
                        }
                      }
                    }}
                    placeholder="Name"
                    required
                    autoComplete="off"
                    role="combobox"
                    aria-autocomplete="list"
                    aria-expanded={vendSuggestOpen && vendorSuggestMatches.length > 0}
                    aria-controls="vendor-suggest-listbox"
                  />
                  {vendSuggestOpen && vendorSuggestMatches.length > 0 && (
                    <ul id="vendor-suggest-listbox" className="customer-suggest-list" role="listbox">
                      {vendorSuggestMatches.map((r) => (
                        <li key={r.id} className="customer-suggest-li" role="presentation">
                          <button
                            type="button"
                            className="customer-suggest-item"
                            role="option"
                            aria-selected="false"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              if (vendBlurTRef.current) clearTimeout(vendBlurTRef.current);
                              upd("supplierName", r.displayName);
                              setVendSuggestOpen(false);
                            }}
                          >
                            <span className="customer-suggest-name">{r.displayName}</span>
                            <span className="customer-suggest-phone">
                              {[r.phone1, r.city].filter(Boolean).join(" · ")}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </Field>
              <Field label="Invoice / ref (optional)">
                <input type="text" value={entry.invoiceRef} onChange={(e) => upd("invoiceRef", e.target.value)} />
              </Field>
              <p className="form-hint" style={{ fontSize: "0.8rem", color: "var(--muted)", margin: 0 }}>
                Start typing a supplier name to reuse recent purchases or saved vendors. Press Enter to pick the first match.
              </p>
              {isEdit ? (
                <p className="form-hint" style={{ fontSize: "0.8rem", color: "var(--muted)", margin: 0 }}>
                  Payments are unchanged here — use <strong>Record payment</strong> on the purchase to add or adjust supplier payments.
                </p>
              ) : (
                <p className="form-hint" style={{ fontSize: "0.8rem", color: "var(--muted)", margin: 0 }}>
                  Enter amount paid now (can be partial); the rest stays as supplier credit. Use 0 for full credit. Payments need an account under Accounts.
                </p>
              )}
              {(entry.lines || []).map((line, i) => (
                <div key={i} className="form-card" style={{ padding: "10px 12px", marginTop: 8 }}>
                  <div className="field-row">
                    <Field label="Item">
                      <InventoryItemPickField
                        invRows={invRows}
                        value={line.item}
                        required
                        onItemChange={(v) => setLine(i, "item", v)}
                        onPickRow={(row) => {
                          const cur = (entry.lines || [])[i]?.costPerUnit;
                          setLine(i, "item", row.item);
                          if (!String(cur || "").trim() || num(cur) === 0) {
                            if (row.avgCost != null) setLine(i, "costPerUnit", moneyInputStr(row.avgCost));
                          }
                        }}
                      />
                    </Field>
                  </div>
                  <div className="field-row">
                    <Field label="Qty">
                      <input type="number" min="0.01" step="any" value={line.qty} onChange={(e) => setLine(i, "qty", e.target.value)} required />
                    </Field>
                    <Field label="Cost / unit (₹)">
                      <input type="number" min="0" step="0.01" value={line.costPerUnit} onChange={(e) => setLine(i, "costPerUnit", e.target.value)} required />
                    </Field>
                  </div>
                  {(entry.lines || []).length > 1 && (
                    <button type="button" className="text-btn" onClick={() => removeLine(i)}>
                      Remove line
                    </button>
                  )}
                </div>
              ))}
              <button type="button" className="text-btn" onClick={addLine}>
                + Add line
              </button>
              {showTotalPreview && (
                <div className="entry-preview">
                  <div className="ep-row">
                    <span>Total purchase</span>
                    <strong>{money(totalAmount)}</strong>
                  </div>
                </div>
              )}
              {!isEdit && (
                <div className="field-row">
                  <Field label="Paid now (₹)">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0 for full credit"
                      value={entry.paidAmount}
                      onChange={(e) => upd("paidAmount", e.target.value)}
                    />
                  </Field>
                  {banks.length > 0 && paidNow > 0.01 && (
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
                </div>
              )}
              {!isEdit && totalAmount > 0 && (
                <p className="form-hint" style={{ fontSize: "0.8rem", color: "var(--muted)", margin: 0 }}>
                  {paidNow > 0.01
                    ? `Supplier credit after save: ${money(creditAfter)} · Bank drops only by paid amount (${money(paidNow)}).`
                    : "Full credit — bank balance unchanged until you record supplier payment."}
                </p>
              )}
              <Field label="Notes">
                <textarea className="textarea-compact" rows={2} value={entry.notes} onChange={(e) => upd("notes", e.target.value)} />
              </Field>
            </div>
          </div>
        </form>
      </div>
      <div className="overlay-form-footer">
        <button type="submit" form="form-new-purchase" className="primary-btn submit-btn">
          {isEdit ? "Save changes" : "Save purchase"}
        </button>
      </div>
    </OverlayScreen>
  );
}
