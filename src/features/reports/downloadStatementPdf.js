/** Download party statement print sheet as PDF. */
export async function downloadStatementPdf(sheetEl, { partyName, partyKind = "customer" } = {}) {
  if (!sheetEl) throw new Error("Statement sheet not found");
  const slug = String(partyName || "party")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w.-]+/g, "")
    .slice(0, 40);
  const filename = `statement-${partyKind}-${slug || "party"}.pdf`;
  const mod = await import("html2pdf.js");
  const html2pdf = mod.default ?? mod;
  const opt = {
    margin: [8, 8, 8, 8],
    filename,
    image: { type: "jpeg", quality: 0.96 },
    html2canvas: { scale: 2, useCORS: true, allowTaint: true, logging: false, backgroundColor: "#ffffff" },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    pagebreak: { mode: ["css", "legacy"] },
  };
  await html2pdf().set(opt).from(sheetEl).save();
}
