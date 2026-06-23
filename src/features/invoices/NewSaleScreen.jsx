import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  buildExistingCustomerPickerRows,
  defSalePaymentLine,
  filterCustomerSuggestRows,
  genInvoiceNo,
  getDefaultBankAccountId,
  hydrateSalePaymentLines,
  makeId,
  money,
  normalizeItemKey,
  num,
  roundMoney2,
  saleDocPrefix,
} from "@/domain/index.js";
import { MenuSelect } from "@/shared/ui/inputs/MenuSelect.jsx";
import { Field, OverlayScreen, PageHeader } from "@/shared/ui/layout/AppChrome.jsx";
import { InventoryItemPickField } from "@/features/inventory/index.js";

/** Build a fresh blank line — `id` keeps React keys stable across re-renders. */
function blankLine() {
  return {
    id: makeId(),
    item: "",
    qty: "1",
    salePrice: "",
    costPrice: "",
    itemProductPick: "__custom__",
  };
}

/**
 * Hydrate a line-items array from either an explicit `entry.lineItems` or from
 * the legacy single-line top-level fields. The form *always* operates on an
 * array of at least one line so the renderer doesn't have to special-case
 * empty state.
 */
function hydrateLineItems(entry) {
  const arr = Array.isArray(entry.lineItems) ? entry.lineItems : [];
  if (arr.length > 0) {
    return arr.map((li) => ({
      id: String(li?.id || makeId()),
      item: String(li?.item ?? ""),
      qty: li?.qty != null ? String(li.qty) : "",
      salePrice: li?.salePrice != null ? String(li.salePrice) : "",
      costPrice: li?.costPrice != null ? String(li.costPrice) : "",
      itemProductPick: String(li?.itemProductPick || "__custom__"),
    }));
  }
  return [
    {
      id: makeId(),
      item: String(entry.item || ""),
      qty: entry.qty != null ? String(entry.qty) : "1",
      salePrice: entry.salePrice != null ? String(entry.salePrice) : "",
      costPrice: entry.costPrice != null ? String(entry.costPrice) : "",
      itemProductPick: String(entry.itemProductPick || "__custom__"),
    },
  ];
}

export function NewSaleScreen({
  isEdit,
  editingSaleId = null,
  entry,
  upd,
  emi2,
  emi3,
  emi4,
  financeCompanies,
  sales,
  customerDirectory,
  bankAccounts = [],
  autoStockOutOnSale = false,
  stockPickRows = [],
  /** Aggregated inventory rows — item picker when not using branch stock-out list */
  invRows = [],
  invoicePrefix = "MB",
  billOfSupplyPrefix = "BOS",
  invoiceNextNumber = 1,
  billOfSupplyNextNumber = 1,
  onSubmit,
  onClose,
}) {
  const lineItems = useMemo(() => hydrateLineItems(entry), [entry]);
  const invoiceManualRef = useRef(false);

  /**
   * Persist the new line-items array AND mirror the first line into the
   * legacy single-line top-level form fields so existing back-compat readers
   * (printable invoice, list subtitle, recent-activity widget, stock-out
   * heuristics for bundle-mode) continue to work without changes.
   */
  const setLines = useCallback(
    (nextLines) => {
      const arr = nextLines.length > 0 ? nextLines : [blankLine()];
      upd("lineItems", arr);
      const first = arr[0];
      upd("item", first.item || "");
      upd("qty", first.qty || "1");
      upd("salePrice", first.salePrice || "");
      upd("costPrice", first.costPrice || "");
      upd("itemProductPick", first.itemProductPick || "__custom__");
    },
    [upd]
  );

  const updLine = useCallback(
    (idx, patch) => {
      const next = lineItems.map((li, i) => (i === idx ? { ...li, ...patch } : li));
      setLines(next);
    },
    [lineItems, setLines]
  );

  const addLine = useCallback(() => setLines([...lineItems, blankLine()]), [lineItems, setLines]);

  const removeLine = useCallback(
    (idx) => {
      if (lineItems.length <= 1) return;
      setLines(lineItems.filter((_, i) => i !== idx));
    },
    [lineItems, setLines]
  );

  // Totals — sum across all line items, then apply discount.
  const subtotal = useMemo(
    () => lineItems.reduce((s, li) => s + num(li.qty) * num(li.salePrice), 0),
    [lineItems]
  );
  const discountNum = num(entry.discount);
  const totalSale = Math.max(0, subtotal - discountNum);
  const totalCost = useMemo(
    () => lineItems.reduce((s, li) => s + num(li.qty) * num(li.costPrice), 0),
    [lineItems]
  );
  const profit = totalSale - totalCost;
  const banks = bankAccounts.filter((b) => b && b.id);
  const paymentLines = useMemo(() => hydrateSalePaymentLines(entry, banks), [entry, banks]);
  const setPaymentLines = useCallback(
    (nextLines) => {
      const arr = nextLines.length > 0 ? nextLines : [defSalePaymentLine(getDefaultBankAccountId(banks))];
      upd("paymentLines", arr);
      const sum = roundMoney2(arr.reduce((s, l) => s + num(l.amount), 0));
      upd("receivedAmount", sum > 0 ? String(sum) : "");
    },
    [upd, banks],
  );
  const updPaymentLine = useCallback(
    (idx, patch) => {
      setPaymentLines(paymentLines.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
    },
    [paymentLines, setPaymentLines],
  );
  const addPaymentLine = useCallback(() => {
    setPaymentLines([...paymentLines, defSalePaymentLine(getDefaultBankAccountId(banks))]);
  }, [paymentLines, setPaymentLines, banks]);
  const removePaymentLine = useCallback(
    (idx) => {
      if (paymentLines.length <= 1) {
        setPaymentLines([{ ...paymentLines[0], amount: "" }]);
        return;
      }
      setPaymentLines(paymentLines.filter((_, i) => i !== idx));
    },
    [paymentLines, setPaymentLines],
  );
  const recvNum = useMemo(
    () => roundMoney2(paymentLines.reduce((s, l) => s + num(l.amount), 0)),
    [paymentLines],
  );
  const outstanding = Math.max(0, totalSale - recvNum);
  const showPreview = subtotal > 0 || discountNum > 0 || lineItems.length > 1;

  const customerPickRows = useMemo(
    () => buildExistingCustomerPickerRows(sales, customerDirectory || []),
    [sales, customerDirectory]
  );
  const customerSuggestMatches = useMemo(
    () => filterCustomerSuggestRows(customerPickRows, entry.customerName),
    [customerPickRows, entry.customerName]
  );
  const [custSuggestOpen, setCustSuggestOpen] = useState(false);
  const custBlurTRef = useRef(null);
  useEffect(
    () => () => {
      if (custBlurTRef.current) clearTimeout(custBlurTRef.current);
    },
    []
  );

  const showStockItemPick = autoStockOutOnSale && stockPickRows.length > 0;
  const currentDocType = entry.docType === "billOfSupply" ? "billOfSupply" : "invoice";
  const docSettings = useMemo(
    () => ({
      invoicePrefix,
      billOfSupplyPrefix,
      invoiceNextNumber,
      billOfSupplyNextNumber,
    }),
    [invoicePrefix, billOfSupplyPrefix, invoiceNextNumber, billOfSupplyNextNumber],
  );
  const suggestedInvoiceNo = useMemo(() => {
    const prefix = saleDocPrefix(docSettings, currentDocType);
    const nextNo =
      currentDocType === "billOfSupply" ? billOfSupplyNextNumber : invoiceNextNumber;
    return genInvoiceNo(sales, prefix, nextNo);
  }, [billOfSupplyNextNumber, currentDocType, docSettings, invoiceNextNumber, sales]);

  const invoiceDuplicate = useMemo(() => {
    const no = String(entry.invoiceNo || "").trim();
    if (!no) return false;
    return sales.some((s) => s && s.invoiceNo === no && s.id !== editingSaleId);
  }, [entry.invoiceNo, sales, editingSaleId]);

  /** Auto-fill from Settings when opening new sale (incl. session restore / PWA shortcut). */
  useEffect(() => {
    if (isEdit) return;
    if (invoiceManualRef.current) return;
    if (String(entry.invoiceNo || "").trim()) return;
    upd("invoiceNo", suggestedInvoiceNo);
  }, [isEdit, entry.invoiceNo, suggestedInvoiceNo, upd]);

  return (
    <OverlayScreen className="overlay-screen--form-footer overlay-screen--new-sale">
      <PageHeader title={isEdit ? "Edit Sale" : "New Sale"} onBack={onClose} />
      <div className="overlay-scroll overlay-scroll--form-body">
        <form id="form-new-sale" className="form-sections" onSubmit={onSubmit}>
          <div className="form-card">
            <div className="form-card-title">Invoice</div>
            <div className="form-stack">
              <Field label="Date">
                <input
                  type="date"
                  required
                  value={entry.date}
                  onChange={(e) => upd("date", e.target.value)}
                />
              </Field>
              <Field label="Invoice No">
                <input
                  type="text"
                  value={entry.invoiceNo ?? ""}
                  onChange={(e) => {
                    invoiceManualRef.current = true;
                    upd("invoiceNo", e.target.value);
                  }}
                  autoComplete="off"
                />
                {invoiceDuplicate ? (
                  <p className="form-hint form-hint--warn" role="status">
                    This invoice number is already used on another sale.
                  </p>
                ) : null}
              </Field>
              <Field label="Document type">
                <MenuSelect
                  value={currentDocType}
                  onChange={(v) => {
                    const nextType = v === "billOfSupply" ? "billOfSupply" : "invoice";
                    upd("docType", nextType);
                    if (!isEdit && !invoiceManualRef.current) {
                      const prefix = saleDocPrefix(docSettings, nextType);
                      const nextNo =
                        nextType === "billOfSupply" ? billOfSupplyNextNumber : invoiceNextNumber;
                      upd("invoiceNo", genInvoiceNo(sales, prefix, nextNo));
                    }
                  }}
                  options={[
                    { value: "invoice", label: "Invoice" },
                    { value: "billOfSupply", label: "Bill of Supply" },
                  ]}
                />
              </Field>
              <Field label="Due Date">
                <input
                  type="date"
                  value={entry.dueDate}
                  onChange={(e) => upd("dueDate", e.target.value)}
                />
              </Field>
            </div>
          </div>

          <div className="form-card">
            <div className="form-card-title">Customer</div>
            <div className="form-stack">
              <Field label="Customer Name">
                <div className="customer-autocomplete">
                  <input
                    type="text"
                    required
                    value={entry.customerName}
                    autoComplete="off"
                    onChange={(e) => {
                      upd("customerName", e.target.value);
                      setCustSuggestOpen(true);
                    }}
                    onFocus={() => setCustSuggestOpen(true)}
                    onBlur={() => {
                      if (custBlurTRef.current) clearTimeout(custBlurTRef.current);
                      custBlurTRef.current = window.setTimeout(
                        () => setCustSuggestOpen(false),
                        180
                      );
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") setCustSuggestOpen(false);
                      if (
                        e.key === "Enter" &&
                        custSuggestOpen &&
                        customerSuggestMatches.length > 0
                      ) {
                        e.preventDefault();
                        const r = customerSuggestMatches[0];
                        upd("customerName", r.displayName);
                        upd("customerNo1", r.customerNo1);
                        upd("customerNo2", r.customerNo2);
                        upd("customerAddress", r.customerAddress || "");
                        upd("customerCity", r.customerCity || "");
                        upd("customerState", r.customerState || "");
                        upd("customerPincode", r.customerPincode || "");
                        setCustSuggestOpen(false);
                      }
                    }}
                    role="combobox"
                    aria-autocomplete="list"
                    aria-expanded={custSuggestOpen && customerSuggestMatches.length > 0}
                    aria-controls="customer-suggest-listbox"
                  />
                  {custSuggestOpen && customerSuggestMatches.length > 0 && (
                    <ul
                      id="customer-suggest-listbox"
                      className="customer-suggest-list"
                      role="listbox"
                    >
                      {customerSuggestMatches.map((r) => (
                        <li key={r.id} className="customer-suggest-li" role="presentation">
                          <button
                            type="button"
                            className="customer-suggest-item"
                            role="option"
                            aria-selected="false"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              if (custBlurTRef.current) clearTimeout(custBlurTRef.current);
                              upd("customerName", r.displayName);
                              upd("customerNo1", r.customerNo1);
                              upd("customerNo2", r.customerNo2);
                              upd("customerAddress", r.customerAddress || "");
                              upd("customerCity", r.customerCity || "");
                              upd("customerState", r.customerState || "");
                              upd("customerPincode", r.customerPincode || "");
                              setCustSuggestOpen(false);
                            }}
                          >
                            <span className="customer-suggest-name">{r.displayName}</span>
                            {r.customerNo1 ? (
                              <span className="customer-suggest-phone">{r.customerNo1}</span>
                            ) : null}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </Field>
              <Field label="Phone 1">
                <input
                  type="tel"
                  required
                  value={entry.customerNo1}
                  onChange={(e) => upd("customerNo1", e.target.value)}
                />
              </Field>
              <Field label="Phone 2 (optional)">
                <input
                  type="tel"
                  value={entry.customerNo2}
                  onChange={(e) => upd("customerNo2", e.target.value)}
                />
              </Field>
            </div>
          </div>

          <div className="form-card">
            <div className="form-card-title">Address</div>
            <div className="form-stack">
              <Field label="Street / area">
                <textarea
                  className="textarea-compact"
                  rows={2}
                  value={entry.customerAddress}
                  onChange={(e) => upd("customerAddress", e.target.value)}
                  placeholder="e.g. 12 MG Road, Near City Mall"
                />
              </Field>
              <div className="field-row">
                <Field label="City">
                  <input
                    type="text"
                    value={entry.customerCity}
                    onChange={(e) => upd("customerCity", e.target.value)}
                    placeholder="City"
                  />
                </Field>
                <Field label="State">
                  <input
                    type="text"
                    value={entry.customerState}
                    onChange={(e) => upd("customerState", e.target.value)}
                    placeholder="State"
                  />
                </Field>
              </div>
              <Field label="PIN code">
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="postal-code"
                  value={entry.customerPincode}
                  onChange={(e) => upd("customerPincode", e.target.value)}
                  placeholder="e.g. 560001"
                />
              </Field>
            </div>
          </div>

          <div className="form-card form-card--invoice-lines">
            <div className="form-card-title">
              Invoice lines
              {lineItems.length > 1 ? (
                <span className="form-card-meta">{lineItems.length} rows</span>
              ) : null}
            </div>
            <div className="form-stack form-stack--invoice-lines">
              {lineItems.map((li, idx) => (
                <LineItemRow
                  key={li.id}
                  idx={idx}
                  line={li}
                  total={lineItems.length}
                  showStockItemPick={showStockItemPick}
                  stockPickRows={stockPickRows}
                  invRows={invRows}
                  onUpdate={(patch) => updLine(idx, patch)}
                  onRemove={() => removeLine(idx)}
                />
              ))}

              <div className="line-items-actions">
                <button
                  type="button"
                  className="ghost-btn ghost-btn--full form-add-line-btn"
                  onClick={addLine}
                  aria-label="Add another item line"
                >
                  + Add line item
                </button>
              </div>

              <Field label="Description">
                <textarea
                  className="textarea-compact"
                  rows={2}
                  value={entry.description}
                  onChange={(e) => upd("description", e.target.value)}
                  placeholder="Notes that appear on the invoice"
                />
              </Field>
              <Field label="Internal note">
                <textarea
                  className="textarea-compact"
                  rows={2}
                  value={entry.note}
                  onChange={(e) => upd("note", e.target.value)}
                  placeholder="Private note (not printed)"
                />
              </Field>
              <Field label="Discount (₹)">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0"
                  value={entry.discount ?? ""}
                  onChange={(e) => upd("discount", e.target.value)}
                />
              </Field>
            </div>
          </div>

          <div className="form-card">
            <div className="form-card-title">Payment received</div>
            <div className="form-stack">
              {paymentLines.map((line, idx) => (
                <div key={line.id} className="payment-split-row">
                  <div className="field-row">
                    <Field label={idx === 0 ? "Amount (₹)" : "Amount (₹)"}>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0"
                        value={line.amount}
                        onChange={(e) => updPaymentLine(idx, { amount: e.target.value })}
                      />
                    </Field>
                    {banks.length > 0 ? (
                      <Field label="Deposit to">
                        <MenuSelect
                          value={
                            banks.some((b) => String(b.id) === String(line.bankAccountId))
                              ? line.bankAccountId
                              : getDefaultBankAccountId(banks)
                          }
                          onChange={(v) => updPaymentLine(idx, { bankAccountId: v })}
                          options={banks.map((b) => ({
                            value: b.id,
                            label: (b.name || "").trim() || "Account",
                          }))}
                        />
                      </Field>
                    ) : (
                      <span className="field-row-spacer" aria-hidden="true" />
                    )}
                  </div>
                  {paymentLines.length > 1 ? (
                    <button
                      type="button"
                      className="ghost-btn ghost-btn--compact payment-split-remove"
                      onClick={() => removePaymentLine(idx)}
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
              ))}
              {banks.length > 0 && totalSale > 0 ? (
                <button
                  type="button"
                  className="ghost-btn ghost-btn--full form-add-line-btn"
                  onClick={addPaymentLine}
                  aria-label="Split payment across accounts"
                >
                  + Split across accounts
                </button>
              ) : null}
              {recvNum > 0 && outstanding > 0.01 ? (
                <p className="form-hint payment-split-hint">
                  {money(recvNum)} received · {money(outstanding)} still due
                </p>
              ) : null}
            </div>
          </div>

          {showPreview && (
            <div className="entry-preview">
              {discountNum > 0 && (
                <>
                  <div className="ep-row">
                    <span>Subtotal</span>
                    <strong>{money(subtotal)}</strong>
                  </div>
                  <div className="ep-row">
                    <span>Discount</span>
                    <strong style={{ color: "var(--danger)" }}>−{money(discountNum)}</strong>
                  </div>
                </>
              )}
              <div className="ep-row">
                <span>Total Sale</span>
                <strong>{money(totalSale)}</strong>
              </div>
              <div className="ep-row">
                <span>Gross Profit</span>
                <strong style={{ color: profit >= 0 ? "var(--success)" : "var(--danger)" }}>
                  {money(profit)}
                </strong>
              </div>
              {recvNum > 0 && (
                <div className="ep-row">
                  <span>Received</span>
                  <strong className="ep-received">{money(recvNum)}</strong>
                </div>
              )}
              {outstanding > 0 && (
                <div className="ep-row">
                  <span>Outstanding</span>
                  <strong style={{ color: "var(--warning)" }}>{money(outstanding)}</strong>
                </div>
              )}
            </div>
          )}

          <div className="form-card">
            <div className="form-card-title">Finance (optional)</div>
            <div className="form-stack">
              <Field label="Finance Company">
                <MenuSelect
                  value={entry.financeCompany}
                  onChange={(v) => upd("financeCompany", v)}
                  options={[
                    { value: "", label: "Not Financed" },
                    ...(Array.isArray(financeCompanies) ? financeCompanies : []).map((fc) => ({
                      value: fc,
                      label: fc,
                    })),
                  ]}
                />
              </Field>
              <div className={`form-finance-reveal${entry.financeCompany ? " is-open" : ""}`}>
                <div className="form-finance-reveal-inner">
                  {entry.financeCompany ? (
                    <>
                      <Field label="DO No">
                        <input
                          type="text"
                          value={entry.doNo}
                          onChange={(e) => upd("doNo", e.target.value)}
                        />
                      </Field>
                      <div className="field-row">
                        <Field label="Loan Amount (₹)">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={entry.loanAmount}
                            onChange={(e) => upd("loanAmount", e.target.value)}
                          />
                        </Field>
                        <Field label="Down Payment (₹)">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={entry.downPayment}
                            onChange={(e) => upd("downPayment", e.target.value)}
                          />
                        </Field>
                      </div>
                      <Field label="EMI Amount (₹)">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={entry.emiAmount}
                          onChange={(e) => upd("emiAmount", e.target.value)}
                        />
                      </Field>
                      <Field label="EMI Due Date 1">
                        <input
                          type="date"
                          value={entry.dueDate1}
                          onChange={(e) => upd("dueDate1", e.target.value)}
                        />
                      </Field>
                      {emi2 && (
                        <Field label="EMI Due Date 2 (auto)">
                          <input type="date" readOnly className="input-readonly-auto" value={emi2} />
                        </Field>
                      )}
                      {emi3 && (
                        <Field label="EMI Due Date 3 (auto)">
                          <input type="date" readOnly className="input-readonly-auto" value={emi3} />
                        </Field>
                      )}
                      {emi4 && (
                        <Field label="EMI Due Date 4 (auto)">
                          <input type="date" readOnly className="input-readonly-auto" value={emi4} />
                        </Field>
                      )}
                    </>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
      <div className="overlay-form-footer">
        <button type="submit" form="form-new-sale" className="primary-btn submit-btn">
          {isEdit ? "Save changes" : "Save Sale"}
        </button>
      </div>
    </OverlayScreen>
  );
}

/* ------------------------------------------------------------------ */
/*  Single editable line within the New Sale form.                     */
/* ------------------------------------------------------------------ */

function LineItemRow({
  idx,
  line,
  total,
  showStockItemPick,
  stockPickRows,
  invRows,
  onUpdate,
  onRemove,
}) {
  const lineSubtotal = num(line.qty) * num(line.salePrice);
  const pickRows = showStockItemPick ? stockPickRows : invRows;

  return (
    <div className="line-item-row" data-line-index={idx}>
      <div className="line-item-head">
        <span className="line-item-tag">Item {idx + 1}</span>
        {total > 1 ? (
          <button
            type="button"
            className="line-item-remove"
            onClick={onRemove}
            aria-label={`Remove item ${idx + 1}`}
          >
            Remove
          </button>
        ) : null}
      </div>
      <div className="line-item-body">
        <div className="line-item-field-full">
          <Field label="Item">
            <InventoryItemPickField
              invRows={pickRows}
              value={line.item}
              catalogPick={line.itemProductPick}
              onCatalogPickChange={(v) => onUpdate({ itemProductPick: v })}
              stockQtyMode={showStockItemPick}
              searchable={false}
              required
              onItemChange={(v) => onUpdate({ item: v })}
              onPickRow={(row) => {
                onUpdate({
                  itemProductPick: normalizeItemKey(row.item),
                  item: row.item,
                  costPrice: row.avgCost != null ? String(row.avgCost) : "",
                  ...(num(row.salesPrice) > 0 ? { salePrice: String(row.salesPrice) } : {}),
                });
              }}
            />
          </Field>
        </div>
        <div className="line-item-metrics">
          <Field label="Qty">
            <input
              type="number"
              min="0"
              step="any"
              required
              value={line.qty}
              onChange={(e) => onUpdate({ qty: e.target.value })}
            />
          </Field>
          <Field label="Sale Price (₹)">
            <input
              type="number"
              min="0"
              step="0.01"
              required
              value={line.salePrice}
              onChange={(e) => onUpdate({ salePrice: e.target.value })}
            />
          </Field>
          <Field label="Cost (₹)">
            <input
              type="number"
              min="0"
              step="0.01"
              required
              value={line.costPrice}
              onChange={(e) => onUpdate({ costPrice: e.target.value })}
            />
          </Field>
          <Field label="Line total">
            <input
              type="text"
              readOnly
              tabIndex={-1}
              className="input-readonly-auto"
              value={money(lineSubtotal)}
              aria-readonly="true"
            />
          </Field>
        </div>
      </div>
    </div>
  );
}
