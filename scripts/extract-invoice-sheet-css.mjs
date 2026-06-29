/**
 * Extract shared invoice sheet CSS from App.css @media print into invoice-sheet-base.css
 * so screen preview and print use identical rules (no duplicated scoped preview CSS).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const appCssPath = path.join(root, "src/app/App.css");
const appCss = fs.readFileSync(appCssPath, "utf8").replace(/\r\n/g, "\n");

const sheetStart = appCss.indexOf("  .invoice-print-sheet {\n    max-width: 190mm;");
const premiumMarker = "     PREMIUM GST INVOICE";
const premiumStart = appCss.lastIndexOf("/*", appCss.indexOf(premiumMarker));
const endMarker = "  .ips-sig-label { font-size: 7.5pt; color: #444; }";
const sheetEnd = appCss.indexOf(endMarker, premiumStart);
if (sheetStart < 0 || premiumStart < 0 || sheetEnd < 0) {
  console.error("markers missing", { sheetStart, premiumStart, sheetEnd });
  process.exit(1);
}

const baseRules = appCss.slice(sheetStart, appCss.indexOf("  .ips-head {", sheetStart));
const premiumRules = appCss.slice(premiumStart, sheetEnd + endMarker.length);

const unindent = (block) =>
  block
    .split("\n")
    .map((line) => (line.startsWith("  ") ? line.slice(2) : line))
    .join("\n");

const out = `/* Shared invoice print sheet — screen preview + @media print (single source of truth) */
${unindent(baseRules)}

${unindent(premiumRules)}
`;

const outPath = path.join(root, "src/features/invoices/invoice-sheet-base.css");
fs.writeFileSync(outPath, out, "utf8");

const removeStart = sheetStart;
const removeEnd = sheetEnd + endMarker.length;
const next = appCss.slice(0, removeStart) + appCss.slice(removeEnd);
fs.writeFileSync(appCssPath, next, "utf8");
console.log(`Wrote ${outPath} (${out.length} bytes), removed duplicate block from App.css`);
