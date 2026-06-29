/** Safe PDF filename: `{docLabel}-{invoiceNo}-{YYYY-MM-DD}.pdf` */
export function buildInvoicePdfFilename(sale, docLabel = "Invoice") {
  const kind = String(docLabel || "Invoice")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w.-]+/g, "");
  const inv =
    String(sale?.invoiceNo || "draft")
      .trim()
      .replace(/[^\w.-]+/g, "-") || "draft";
  const dateRaw = String(sale?.date || "").trim();
  const datePart = /^\d{4}-\d{2}-\d{2}$/.test(dateRaw) ? dateRaw : "undated";
  return `${kind || "Invoice"}-${inv}-${datePart}.pdf`;
}

/**
 * Render the invoice print sheet to a PDF and trigger a browser download.
 * @param {HTMLElement} sheetEl — `.invoice-print-sheet` root
 */
export async function downloadInvoicePdf(sheetEl, { sale, docLabel = "Invoice" } = {}) {
  if (!sheetEl) throw new Error("Invoice sheet not found");

  const filename = buildInvoicePdfFilename(sale, docLabel);
  const mod = await import("html2pdf.js");
  const html2pdf = mod.default ?? mod;

  const opt = {
    margin: [8, 8, 8, 8],
    filename,
    image: { type: "jpeg", quality: 0.96 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: "#ffffff",
    },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    pagebreak: { mode: ["css", "legacy"] },
  };

  await html2pdf().set(opt).from(sheetEl).save();
}
