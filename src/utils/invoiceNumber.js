// Invoice numbers assigned ONLY on confirm — gapless BPH/FY/sequence format.

/**
 * Get current financial year string (Indian FY: April–March).
 * April 2024 → March 2025 = "2425"
 */
export function getCurrentFY(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  const month = d.getMonth(); // 0=Jan, 3=Apr
  const year = d.getFullYear();
  const fyStart = month >= 3 ? year : year - 1;
  const fyEnd = fyStart + 1;
  return `${String(fyStart).slice(-2)}${String(fyEnd).slice(-2)}`;
}

/** Map app sale records to invoice-number records. */
export function salesAsInvoiceRecords(sales = []) {
  return (Array.isArray(sales) ? sales : [])
    .filter((s) => s && typeof s === "object")
    .map((s) => ({
      invoiceNumber: String(s.invoiceNo || s.invoiceNumber || "").trim(),
      status: s.status || (s.invoiceNo ? "confirmed" : "draft"),
    }));
}

/**
 * Next invoice number for a FY.
 * Format: BPH/2425/0001
 */
export function getNextInvoiceNumber(confirmedInvoices, date = new Date()) {
  const fy = getCurrentFY(date);
  const prefix = `BPH/${fy}/`;

  const fyInvoices = (confirmedInvoices || []).filter(
    (inv) => inv.invoiceNumber && String(inv.invoiceNumber).startsWith(prefix),
  );

  if (fyInvoices.length === 0) {
    return `${prefix}0001`;
  }

  const maxSeq = Math.max(
    ...fyInvoices.map((inv) => {
      const seq = parseInt(String(inv.invoiceNumber).split("/")[2], 10);
      return Number.isNaN(seq) ? 0 : seq;
    }),
  );

  return `${prefix}${String(maxSeq + 1).padStart(4, "0")}`;
}

export function isValidInvoiceNumber(num) {
  return /^BPH\/\d{4}\/\d{4}$/.test(String(num || ""));
}

export function findInvoiceGaps(confirmedInvoices, fy) {
  const prefix = `BPH/${fy}/`;
  const sequences = (confirmedInvoices || [])
    .filter((inv) => inv.invoiceNumber?.startsWith(prefix))
    .map((inv) => parseInt(String(inv.invoiceNumber).split("/")[2], 10))
    .filter((n) => !Number.isNaN(n))
    .sort((a, b) => a - b);

  if (sequences.length === 0) return [];

  const gaps = [];
  for (let i = sequences[0]; i <= sequences[sequences.length - 1]; i++) {
    if (!sequences.includes(i)) gaps.push(i);
  }
  return gaps;
}

/**
 * Next credit note number. Format: BPH/CN/2425/0001
 */
export function getNextCreditNoteNumber(existingCreditNotes, date = new Date()) {
  const fy = getCurrentFY(date);
  const prefix = `BPH/CN/${fy}/`;

  const fyCNs = (existingCreditNotes || []).filter(
    (cn) => cn.creditNoteNumber && String(cn.creditNoteNumber).startsWith(prefix),
  );

  if (fyCNs.length === 0) return `${prefix}0001`;

  const maxSeq = Math.max(
    ...fyCNs.map((cn) => {
      const parts = String(cn.creditNoteNumber).split("/");
      const seq = parseInt(parts[parts.length - 1], 10);
      return Number.isNaN(seq) ? 0 : seq;
    }),
  );
  return `${prefix}${String(maxSeq + 1).padStart(4, "0")}`;
}
