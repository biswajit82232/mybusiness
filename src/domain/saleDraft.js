/**
 * In-progress sale invoice drafts (form state, not live sales).
 */

/** @returns {boolean} */
export function saleEntryHasDraftContent(entry) {
  if (!entry || typeof entry !== "object") return false;
  const textFields = [
    entry.customerName,
    entry.customerNo1,
    entry.customerNo2,
    entry.customerAddress,
    entry.customerCity,
    entry.customerState,
    entry.customerPincode,
    entry.customerGstin,
    entry.invoiceNo,
    entry.description,
    entry.note,
    entry.financeCompany,
    entry.doNo,
    entry.docType,
    entry.invoiceCopyType,
  ];
  if (textFields.some((f) => String(f ?? "").trim())) return true;
  if (entry.reverseCharge === true) return true;
  if (String(entry.bundleId || "").trim()) return true;
  const lines = Array.isArray(entry.lineItems) ? entry.lineItems : [];
  for (const li of lines) {
    if (String(li?.item ?? "").trim()) return true;
    if (String(li?.itemDescription ?? "").trim()) return true;
    if (Number(li?.qty) > 0 && Number(li?.salePrice) > 0) return true;
  }
  if (Number(entry.discount) > 0) return true;
  if (Number(entry.additionalCharges) > 0) return true;
  const pays = Array.isArray(entry.paymentLines) ? entry.paymentLines : [];
  if (pays.some((p) => Number(p?.amount) > 0)) return true;
  if (Number(entry.receivedAmount) > 0) return true;
  return false;
}

/** Normalize persisted draft envelope from settings. */
export function normSaleDraft(raw) {
  if (!raw || typeof raw !== "object") return null;
  const entry = raw.entry;
  if (!entry || typeof entry !== "object") return null;
  if (!saleEntryHasDraftContent(entry)) return null;
  return {
    savedAt: String(raw.savedAt || new Date().toISOString()),
    entry: { ...entry },
  };
}

/** Build draft envelope for settings.saleDraft. */
export function buildSaleDraftEnvelope(entry) {
  if (!saleEntryHasDraftContent(entry)) return null;
  return {
    savedAt: new Date().toISOString(),
    entry: { ...entry },
  };
}

export function clearSaleDraftSettings(settings = {}) {
  return { ...settings, saleDraft: null };
}

/** Short label for resume-draft UI. */
export function saleDraftSummary(draft) {
  const d = normSaleDraft(draft);
  if (!d) return null;
  const entry = d.entry || {};
  const customer = String(entry.customerName || "").trim();
  const lines = Array.isArray(entry.lineItems) ? entry.lineItems : [];
  const firstItem = String(lines[0]?.item || entry.item || "").trim();
  return {
    savedAt: d.savedAt,
    label: customer || firstItem || "Draft invoice",
  };
}
