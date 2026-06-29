/** Download report print sheet as PDF (html2pdf.js). */
export async function downloadReportPdf(sheetEl, { reportId = "report", reportTitle = "Report" } = {}) {
  if (!sheetEl) throw new Error("Report sheet not found");
  const slug = String(reportTitle || reportId)
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w.-]+/g, "")
    .slice(0, 48);
  const filename = `report-${String(reportId).replace(/[^\w.-]+/g, "")}-${slug || "export"}.pdf`;
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
