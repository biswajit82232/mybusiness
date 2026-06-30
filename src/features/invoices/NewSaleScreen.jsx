import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  buildExistingCustomerPickerRows,
  buildLastSalePriceByItemKey,
  canBundleInvoiceLines,
  defSalePaymentLine,
  defaultSalePriceForProductPick,
  filterCustomerSuggestRows,
  genInvoiceNo,
  getDefaultBankAccountId,
  hydrateSalePaymentLines,
  makeId,
  money,
  moneyInputStr,
  normalizeItemKey,
  num,
  roundMoney2,
  toPaise,
  addMoney,
  subtractMoney,
  multiplyMoney,
  sumMoney,
  saleDocPrefix,
} from "@/domain/index.js";
import {
  normalizeDocType,
  saleDocNextNumberSettingKey,
  saleDocUsesAutoStockOut,
} from "@/domain/saleDocuments.js";
import { MenuSelect } from "@/shared/ui/inputs/MenuSelect.jsx";
import { Field, OverlayScreen, PageHeader } from "@/shared/ui/layout/AppChrome.jsx";
import { IcPlus } from "@/shared/ui/icons/AppIcons.jsx";
import { InventoryItemPickField } from "@/features/inventory/index.js";
import { SaleDraftBanner } from "./SaleDraftBanner.jsx";
import { saleDraftSummary } from "@/domain/index.js";
import { COLORS, FONT_SIZE, SPACING } from "@/tokens.js";

/** Build a fresh blank line — `id` keeps React keys stable across re-renders. */
function blankLine() {
  return {
    id: makeId(),
    item: "",
    qty: "1",
    salePrice: "",
    costPrice: "",
    hsn: "",
    gstRate: "",
    chassisNo: "",
    motorNo: "",
    batterySerialNo: "",
    itemProductPick: "__custom__",
    invoiceGroupId: "",
    itemDescription: "",
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
      salePrice: li?.salePrice != null ? moneyInputStr(li.salePrice) : "",
      costPrice: li?.costPrice != null ? moneyInputStr(li.costPrice) : "",
      hsn: li?.hsn != null ? String(li.hsn) : "",
      gstRate: li?.gstRate != null && li.gstRate !== "" ? String(li.gstRate) : "",
      chassisNo: String(li?.chassisNo || ""),
      motorNo: String(li?.motorNo || ""),
      batterySerialNo: String(li?.batterySerialNo || ""),
      itemProductPick: String(li?.itemProductPick || "__custom__"),
      invoiceGroupId: String(li?.invoiceGroupId || ""),
      itemDescription: String(li?.itemDescription || ""),
    }));
  }
  return [
    {
      id: makeId(),
      item: String(entry.item || ""),
      qty: entry.qty != null ? String(entry.qty) : "1",
      salePrice: entry.salePrice != null ? moneyInputStr(entry.salePrice) : "",
      costPrice: entry.costPrice != null ? moneyInputStr(entry.costPrice) : "",
      hsn: entry.hsn != null ? String(entry.hsn) : "",
      gstRate: entry.gstRate != null && entry.gstRate !== "" ? String(entry.gstRate) : "",
      chassisNo: String(entry.chassisNo || ""),
      motorNo: String(entry.motorNo || ""),
      batterySerialNo: String(entry.batterySerialNo || ""),
      itemProductPick: String(entry.itemProductPick || "__custom__"),
      invoiceGroupId: "",
      itemDescription: "",
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
  creditNotePrefix = "CN",
  debitNotePrefix = "DN",
  creditNoteNextNumber = 1,
  debitNoteNextNumber = 1,
  defaultProductHsn = "8711",
  defaultProductGstRate = 5,
  gstEnabled = true,
  additionalChargesLabel = "Additional Charges",
  onSubmit,
  onClose,
  draftSavedAt = null,
  onDiscardDraft,
  chassisErrors = [],
}) {
  const isDraft = entry.status === "draft" || (!entry.invoiceNo && !isEdit);
  const lineItems = useMemo(() => hydrateLineItems(entry), [entry]);
  const lastSalePriceByKey = useMemo(
    () => buildLastSalePriceByItemKey(sales, isEdit ? editingSaleId : ""),
    [sales, isEdit, editingSaleId],
  );
  const invoiceManualRef = useRef(false);
  const gstOn = gstEnabled !== false;
  const [selectedLineIds, setSelectedLineIds] = useState(() => new Set());
  const [bundleHint, setBundleHint] = useState("");

  const gstSettings = useMemo(
    () => ({ defaultProductHsn, defaultProductGstRate }),
    [defaultProductHsn, defaultProductGstRate],
  );

  const groupCounts = useMemo(() => {
    const counts = new Map();
    for (const li of lineItems) {
      const gid = String(li.invoiceGroupId || "").trim();
      if (!gid) continue;
      counts.set(gid, (counts.get(gid) || 0) + 1);
    }
    return counts;
  }, [lineItems]);

  const pruneLoneInvoiceGroups = useCallback((lines) => {
    const counts = new Map();
    for (const li of lines) {
      const gid = String(li.invoiceGroupId || "").trim();
      if (!gid) continue;
      counts.set(gid, (counts.get(gid) || 0) + 1);
    }
    return lines.map((li) => {
      const gid = String(li.invoiceGroupId || "").trim();
      if (gid && (counts.get(gid) || 0) < 2) return { ...li, invoiceGroupId: "" };
      return li;
    });
  }, []);

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
      let next = lineItems.map((li, i) => (i === idx ? { ...li, ...patch } : li));
      const gid = String(lineItems[idx]?.invoiceGroupId || "").trim();
      if (gid && ("hsn" in patch || "gstRate" in patch)) {
        next = next.map((li) =>
          String(li.invoiceGroupId || "").trim() === gid ? { ...li, invoiceGroupId: "" } : li,
        );
      }
      setLines(next);
    },
    [lineItems, setLines],
  );

  const addLine = useCallback(() => setLines([...lineItems, blankLine()]), [lineItems, setLines]);

  const removeLine = useCallback(
    (idx) => {
      if (lineItems.length <= 1) return;
      const next = pruneLoneInvoiceGroups(lineItems.filter((_, i) => i !== idx));
      const removedId = lineItems[idx]?.id;
      setLines(next);
      if (removedId) {
        setSelectedLineIds((prev) => {
          if (!prev.has(removedId)) return prev;
          const copy = new Set(prev);
          copy.delete(removedId);
          return copy;
        });
      }
    },
    [lineItems, setLines, pruneLoneInvoiceGroups],
  );

  const toggleLineSelect = useCallback((lineId) => {
    setSelectedLineIds((prev) => {
      const next = new Set(prev);
      if (next.has(lineId)) next.delete(lineId);
      else next.add(lineId);
      return next;
    });
    setBundleHint("");
  }, []);

  const bundleSelectedLines = useCallback(() => {
    const selected = lineItems.filter((li) => selectedLineIds.has(li.id));
    const check = canBundleInvoiceLines(selected, gstSettings);
    if (!check.ok) {
      setBundleHint(check.reason);
      return;
    }
    const gid = makeId();
    const sel = new Set(selected.map((li) => li.id));
    setLines(
      lineItems.map((li) => (sel.has(li.id) ? { ...li, invoiceGroupId: gid } : li)),
    );
    setSelectedLineIds(new Set());
    setBundleHint("");
  }, [lineItems, selectedLineIds, gstSettings, setLines]);

  const unbundleSelectedLines = useCallback(() => {
    const sel = selectedLineIds;
    setLines(
      pruneLoneInvoiceGroups(
        lineItems.map((li) => (sel.has(li.id) ? { ...li, invoiceGroupId: "" } : li)),
      ),
    );
    setSelectedLineIds(new Set());
    setBundleHint("");
  }, [lineItems, selectedLineIds, setLines, pruneLoneInvoiceGroups]);

  const selectedHasBundle = useMemo(
    () => lineItems.some((li) => selectedLineIds.has(li.id) && String(li.invoiceGroupId || "").trim()),
    [lineItems, selectedLineIds],
  );

  // Totals — sum across all line items, then apply discount and additional charges.
  const subtotal = useMemo(
    () => sumMoney(lineItems.map((li) => multiplyMoney(toPaise(num(li.salePrice)), num(li.qty)))),
    [lineItems],
  );
  const discountNum = toPaise(entry.discount);
  const additionalChargesNum = toPaise(entry.additionalCharges);
  const totalSale = roundMoney2(Math.max(0, subtractMoney(subtotal, discountNum) + additionalChargesNum));
  const totalCost = useMemo(
    () => sumMoney(lineItems.map((li) => multiplyMoney(toPaise(num(li.costPrice)), num(li.qty)))),
    [lineItems],
  );
  const profit = roundMoney2(subtractMoney(totalSale, totalCost));
  const banks = bankAccounts.filter((b) => b && b.id);
  const paymentLines = useMemo(() => hydrateSalePaymentLines(entry, banks), [entry, banks]);
  const setPaymentLines = useCallback(
    (nextLines) => {
      const arr = nextLines.length > 0 ? nextLines : [defSalePaymentLine(getDefaultBankAccountId(banks))];
      upd("paymentLines", arr);
      const sum = roundMoney2(sumMoney(arr.map((l) => toPaise(num(l.amount)))));
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
    () => roundMoney2(sumMoney(paymentLines.map((l) => toPaise(num(l.amount))))),
    [paymentLines],
  );
  const outstanding = Math.max(0, totalSale - recvNum);
  const showPreview =
    subtotal > 0 || discountNum > 0 || additionalChargesNum > 0 || lineItems.length > 1;

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

  const currentDocType = normalizeDocType(entry.docType);
  const showStockItemPick =
    autoStockOutOnSale && saleDocUsesAutoStockOut(currentDocType) && stockPickRows.length > 0;
  const docSettings = useMemo(
    () => ({
      invoicePrefix,
      billOfSupplyPrefix,
      creditNotePrefix,
      debitNotePrefix,
      invoiceNextNumber,
      billOfSupplyNextNumber,
      creditNoteNextNumber,
      debitNoteNextNumber,
    }),
    [
      invoicePrefix,
      billOfSupplyPrefix,
      creditNotePrefix,
      debitNotePrefix,
      invoiceNextNumber,
      billOfSupplyNextNumber,
      creditNoteNextNumber,
      debitNoteNextNumber,
    ],
  );
  const suggestedInvoiceNo = useMemo(() => {
    const prefix = saleDocPrefix(docSettings, currentDocType);
    const nextNo = docSettings[saleDocNextNumberSettingKey(currentDocType)];
    return genInvoiceNo(sales, prefix, nextNo);
  }, [currentDocType, docSettings, sales]);

  const invoiceDuplicate = useMemo(() => {
    const no = String(entry.invoiceNo || "").trim();
    if (!no) return false;
    return sales.some((s) => s && s.invoiceNo === no && s.id !== editingSaleId);
  }, [entry.invoiceNo, sales, editingSaleId]);

  /** Auto-fill from Settings when opening new sale (skip for persisted drafts). */
  useEffect(() => {
    if (isEdit || isDraft) return;
    if (invoiceManualRef.current) return;
    if (String(entry.invoiceNo || "").trim()) return;
    upd("invoiceNo", suggestedInvoiceNo);
  }, [isEdit, isDraft, entry.invoiceNo, suggestedInvoiceNo, upd]);

  return (
    <OverlayScreen className="overlay-screen--form-footer overlay-screen--new-sale">
      <PageHeader title={isEdit ? "Edit Sale" : "New Sale"} onBack={onClose} />
      {!isEdit && draftSavedAt && onDiscardDraft ? (
        <SaleDraftBanner
          compact
          showResume={false}
          summary={saleDraftSummary({ savedAt: draftSavedAt, entry })}
          onDiscard={onDiscardDraft}
        />
      ) : null}
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
              <Field label={isDraft ? "Invoice status" : "Invoice No"}>
                {isDraft ? (
                  <span
                    style={{
                      display: "inline-block",
                      backgroundColor: COLORS.warningBg,
                      color: COLORS.warning,
                      fontSize: FONT_SIZE.label,
                      fontWeight: 600,
                      padding: `${SPACING.xs}px ${SPACING.md}px`,
                      borderRadius: 4,
                    }}
                  >
                    DRAFT — number assigned on confirm
                  </span>
                ) : (
                  <>
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
                  </>
                )}
              </Field>
              <Field label="Document type">
                <MenuSelect
                  value={currentDocType}
                  onChange={(v) => {
                    const nextType = normalizeDocType(v);
                    upd("docType", nextType);
                    if (!isEdit && !invoiceManualRef.current) {
                      const prefix = saleDocPrefix(docSettings, nextType);
                      const nextNo = docSettings[saleDocNextNumberSettingKey(nextType)];
                      upd("invoiceNo", genInvoiceNo(sales, prefix, nextNo));
                    }
                  }}
                  options={[
                    { value: "invoice", label: "Tax Invoice" },
                    { value: "billOfSupply", label: "Bill of Supply" },
                    { value: "creditNote", label: "Credit Note" },
                    { value: "debitNote", label: "Debit Note" },
                  ]}
                />
              </Field>
              {entry.linkedInvoiceNo ? (
                <p className="form-hint" role="status">
                  Linked to invoice {entry.linkedInvoiceNo}
                </p>
              ) : null}
              <Field label="Due Date">
                <input
                  type="date"
                  value={entry.dueDate}
                  onChange={(e) => upd("dueDate", e.target.value)}
                />
              </Field>
              {gstOn && currentDocType !== "billOfSupply" ? (
                <>
                  <Field label="Customer GSTIN (optional)">
                    <input
                      type="text"
                      value={entry.customerGstin ?? ""}
                      onChange={(e) => upd("customerGstin", e.target.value.toUpperCase())}
                      autoComplete="off"
                      placeholder="15-character GSTIN"
                    />
                  </Field>
                  <Field label="Reverse charge">
                    <MenuSelect
                      value={entry.reverseCharge ? "yes" : "no"}
                      onChange={(v) => upd("reverseCharge", v === "yes")}
                      options={[
                        { value: "no", label: "No" },
                        { value: "yes", label: "Yes" },
                      ]}
                    />
                  </Field>
                  <Field label="Print copy">
                    <MenuSelect
                      value={entry.invoiceCopyType || "original"}
                      onChange={(v) => upd("invoiceCopyType", v)}
                      options={[
                        { value: "original", label: "Original for recipient" },
                        { value: "duplicate", label: "Duplicate for supplier" },
                        { value: "triplicate", label: "Triplicate for supplier" },
                      ]}
                    />
                  </Field>
                </>
              ) : null}
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
            {lineItems.length > 1 ? (
              <p className="form-hint line-item-bundle-hint">
                Select rows and tap + to print them as one invoice line (same HSN &amp; GST %). Stock-out stays per item.
              </p>
            ) : null}
            <div className="form-stack form-stack--invoice-lines">
              {lineItems.map((li, idx) => {
                const gid = String(li.invoiceGroupId || "").trim();
                const groupSize = gid ? groupCounts.get(gid) || 0 : 0;
                return (
                  <LineItemRow
                    key={li.id}
                    idx={idx}
                    line={li}
                    total={lineItems.length}
                    showStockItemPick={showStockItemPick}
                    stockPickRows={stockPickRows}
                    invRows={invRows}
                    lastSalePriceByKey={lastSalePriceByKey}
                    showGstFields={gstOn && currentDocType === "invoice"}
                    defaultHsn={defaultProductHsn}
                    defaultGstRate={defaultProductGstRate}
                    selectable={lineItems.length > 1}
                    selected={selectedLineIds.has(li.id)}
                    onToggleSelect={() => toggleLineSelect(li.id)}
                    bundledOnInvoice={groupSize > 1}
                    bundleGroupSize={groupSize}
                    onUpdate={(patch) => updLine(idx, patch)}
                    onRemove={() => removeLine(idx)}
                    fieldErrors={chassisErrors.filter((e) => e.itemIndex === idx)}
                  />
                );
              })}

              <div className="line-items-actions">
                {lineItems.length > 1 && selectedLineIds.size >= 2 ? (
                  <button
                    type="button"
                    className="ghost-btn line-item-bundle-btn"
                    onClick={bundleSelectedLines}
                    aria-label="Bundle selected lines on invoice PDF"
                  >
                    <IcPlus />
                    <span>Bundle on invoice</span>
                  </button>
                ) : null}
                {selectedHasBundle ? (
                  <button
                    type="button"
                    className="ghost-btn ghost-btn--compact line-item-unbundle-btn"
                    onClick={unbundleSelectedLines}
                  >
                    Ungroup
                  </button>
                ) : null}
                <button
                  type="button"
                  className="ghost-btn ghost-btn--full form-add-line-btn"
                  onClick={addLine}
                  aria-label="Add another item line"
                >
                  + Add line item
                </button>
              </div>
              {bundleHint ? <p className="form-hint form-hint--warn">{bundleHint}</p> : null}

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
              <Field label={`${additionalChargesLabel} (₹)`}>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0"
                  value={entry.additionalCharges ?? ""}
                  onChange={(e) => upd("additionalCharges", e.target.value)}
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
              {additionalChargesNum > 0 && (
                <div className="ep-row">
                  <span>{additionalChargesLabel}</span>
                  <strong>+{money(additionalChargesNum)}</strong>
                </div>
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
          {isDraft ? "Confirm Invoice" : isEdit ? "Save changes" : "Save Sale"}
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
  lastSalePriceByKey = {},
  showGstFields = true,
  defaultHsn = "8711",
  defaultGstRate = 5,
  selectable = false,
  selected = false,
  onToggleSelect,
  bundledOnInvoice = false,
  bundleGroupSize = 0,
  onUpdate,
  onRemove,
  fieldErrors = [],
}) {
  const lineSubtotal = num(line.qty) * num(line.salePrice);
  const pickRows = showStockItemPick ? stockPickRows : invRows;

  return (
    <div
      className={`line-item-row${bundledOnInvoice ? " line-item-row--bundled" : ""}${selected ? " line-item-row--selected" : ""}`}
      data-line-index={idx}
    >
      <div className="line-item-head">
        <div className="line-item-head-left">
          {selectable ? (
            <label className="line-item-select">
              <input
                type="checkbox"
                checked={selected}
                onChange={onToggleSelect}
                aria-label={`Select item ${idx + 1} for invoice bundle`}
              />
            </label>
          ) : null}
          <span className="line-item-tag">Item {idx + 1}</span>
          {bundledOnInvoice ? (
            <span className="line-item-bundle-badge">
              1 PDF row · {bundleGroupSize} items
            </span>
          ) : null}
        </div>
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
                const pickPrice = defaultSalePriceForProductPick(lastSalePriceByKey, row);
                onUpdate({
                  itemProductPick: normalizeItemKey(row.item),
                  item: row.item,
                  costPrice: row.avgCost != null ? moneyInputStr(row.avgCost) : "",
                  ...(pickPrice > 0 ? { salePrice: moneyInputStr(pickPrice) } : {}),
                  ...(showGstFields
                    ? {
                        ...(row.hsn ? { hsn: String(row.hsn) } : { hsn: defaultHsn }),
                        ...(num(row.gstRate) > 0
                          ? { gstRate: String(row.gstRate) }
                          : { gstRate: String(defaultGstRate) }),
                      }
                    : {}),
                });
              }}
            />
          </Field>
        </div>
        <div className="line-item-field-full">
          <Field label="Item description">
            <textarea
              className="textarea-compact"
              rows={2}
              value={line.itemDescription || ""}
              onChange={(e) => onUpdate({ itemDescription: e.target.value })}
              placeholder="Optional — shown on invoice PDF"
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
        {showGstFields ? (
          <div className="line-item-metrics line-item-metrics--gst">
            <Field label="HSN / SAC">
              <input
                type="text"
                value={line.hsn || defaultHsn}
                onChange={(e) => onUpdate({ hsn: e.target.value })}
                placeholder={defaultHsn}
              />
            </Field>
            <Field label="GST %">
              <input
                type="number"
                min="0"
                step="0.01"
                value={line.gstRate !== "" ? line.gstRate : defaultGstRate}
                onChange={(e) => onUpdate({ gstRate: e.target.value })}
              />
            </Field>
          </div>
        ) : null}
        <div className="line-item-serials">
          <Field label="Chassis No">
            <input
              type="text"
              value={line.chassisNo || ""}
              onChange={(e) => onUpdate({ chassisNo: e.target.value })}
              placeholder="Optional"
            />
            {fieldErrors.filter((e) => e.field === "chassisNo").map((e) => (
              <p key={e.message} className="form-hint form-hint--warn" style={{ color: COLORS.danger }}>
                {e.message}
              </p>
            ))}
          </Field>
          <Field label="Motor No">
            <input
              type="text"
              value={line.motorNo || ""}
              onChange={(e) => onUpdate({ motorNo: e.target.value })}
              placeholder="Optional"
            />
            {fieldErrors.filter((e) => e.field === "motorNo").map((e) => (
              <p key={e.message} className="form-hint form-hint--warn" style={{ color: COLORS.danger }}>
                {e.message}
              </p>
            ))}
          </Field>
          <Field label="Battery serial no.">
            <textarea
              className="textarea-compact"
              rows={2}
              value={line.batterySerialNo || ""}
              onChange={(e) => onUpdate({ batterySerialNo: e.target.value })}
              placeholder="One per line if multiple"
            />
            {fieldErrors.filter((e) => e.field === "batterySerialNo").map((e) => (
              <p key={e.message} className="form-hint form-hint--warn" style={{ color: COLORS.danger }}>
                {e.message}
              </p>
            ))}
          </Field>
        </div>
      </div>
    </div>
  );
}
