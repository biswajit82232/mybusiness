function num(v) {
  if (v == null || v === "") return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function roundMoney2(v) {
  return Math.round(num(v) * 100) / 100;
}

/** GST state codes (name → 2-digit code). Keys are lowercase trimmed names. */
export const GST_STATE_CODES = {
  "andaman and nicobar islands": "35",
  "andhra pradesh": "37",
  "arunachal pradesh": "12",
  assam: "18",
  bihar: "10",
  chandigarh: "04",
  chhattisgarh: "22",
  "dadra and nagar haveli and daman and diu": "26",
  delhi: "07",
  goa: "30",
  gujarat: "24",
  haryana: "06",
  "himachal pradesh": "02",
  "jammu and kashmir": "01",
  jharkhand: "20",
  karnataka: "29",
  kerala: "32",
  ladakh: "38",
  lakshadweep: "31",
  "madhya pradesh": "23",
  maharashtra: "27",
  manipur: "14",
  meghalaya: "17",
  mizoram: "15",
  nagaland: "13",
  odisha: "21",
  puducherry: "34",
  punjab: "03",
  rajasthan: "08",
  sikkim: "11",
  "tamil nadu": "33",
  telangana: "36",
  tripura: "16",
  "uttar pradesh": "09",
  uttarakhand: "05",
  "west bengal": "19",
};

export const INVOICE_COPY_LABELS = {
  original: "ORIGINAL FOR RECIPIENT",
  duplicate: "DUPLICATE FOR SUPPLIER",
  triplicate: "TRIPLICATE FOR SUPPLIER",
};

export const DEFAULT_INVOICE_TERMS = `1. Goods once sold will not be taken back or exchanged.
2. Warranty, if applicable, will be provided as per the manufacturer's terms and conditions.
3. The seller is not responsible for damages caused by misuse, improper installation, or unauthorized repairs.`;

export const DEFAULT_INVOICE_NOTES = "Thanks For your business";

export const DEFAULT_PRODUCT_HSN = "8711";
export const DEFAULT_PRODUCT_GST_RATE = 5;

export function normalizeGstStateKey(stateName) {
  return String(stateName || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/** Resolve GST state code from state name or explicit code in settings. */
export function gstStateCode(stateName, explicitCode = "") {
  const code = String(explicitCode || "").trim();
  if (/^\d{1,2}$/.test(code)) return code.padStart(2, "0").slice(-2);
  const key = normalizeGstStateKey(stateName);
  return GST_STATE_CODES[key] || "";
}

export function placeOfSupplyLabel(stateName, stateCode = "") {
  const name = String(stateName || "").trim();
  const code = gstStateCode(stateName, stateCode);
  if (name && code) return `${name} ( ${code} )`;
  if (name) return name;
  if (code) return `State code ${code}`;
  return "";
}

export function isInterStateSale(businessState, customerState) {
  const b = normalizeGstStateKey(businessState);
  const c = normalizeGstStateKey(customerState);
  if (!b || !c) return false;
  return b !== c;
}

/** Split GST-inclusive line total into taxable value + tax (single combined rate %). */
export function splitInclusiveGst(inclusiveAmount, gstRatePercent) {
  const inc = roundMoney2(Math.max(0, num(inclusiveAmount)));
  const rate = Math.max(0, num(gstRatePercent));
  if (inc <= 0 || rate <= 0) {
    return { taxable: inc, tax: 0, total: inc, gstRate: rate };
  }
  const taxable = roundMoney2(inc / (1 + rate / 100));
  const tax = roundMoney2(inc - taxable);
  return { taxable, tax, total: inc, gstRate: rate };
}

/**
 * Compute per-line GST breakdown from GST-inclusive sale price × qty.
 * @returns {{ lines, subtotalInclusive, discount, taxableTotal, cgst, sgst, igst, totalTax, grandTotal, hasGst, isInterState, hsnSummary }}
 */
export function buildInvoiceGstModel({
  lineItems = [],
  discount = 0,
  businessState = "",
  customerState = "",
  settings = {},
}) {
  const disc = roundMoney2(Math.max(0, num(discount)));
  const defaultHsn = String(settings.defaultProductHsn || DEFAULT_PRODUCT_HSN).trim() || DEFAULT_PRODUCT_HSN;
  const defaultRate = Math.max(0, num(settings.defaultProductGstRate ?? DEFAULT_PRODUCT_GST_RATE));

  let subtotalInclusive = 0;
  const rawLines = (Array.isArray(lineItems) ? lineItems : []).map((li, idx) => {
    const qty = num(li?.qty);
    const inclusiveUnit = num(li?.salePrice);
    const lineInclusive = roundMoney2(qty * inclusiveUnit);
    subtotalInclusive = roundMoney2(subtotalInclusive + lineInclusive);
    const hsn = String(li?.hsn || "").trim() || defaultHsn;
    const gstRate = num(li?.gstRate) > 0 ? num(li?.gstRate) : defaultRate;
    const split = splitInclusiveGst(lineInclusive, gstRate);
    return {
      index: idx + 1,
      id: li?.id,
      item: String(li?.item || ""),
      qty,
      inclusiveUnit,
      lineInclusive,
      hsn,
      gstRate,
      chassisNo: String(li?.chassisNo || "").trim(),
      motorNo: String(li?.motorNo || "").trim(),
      batterySerialNo: String(li?.batterySerialNo || "").trim(),
      taxable: split.taxable,
      tax: split.tax,
      cgst: 0,
      sgst: 0,
      igst: 0,
      cgstRate: 0,
      sgstRate: 0,
      igstRate: 0,
    };
  });

  const ratio = subtotalInclusive > 0 ? Math.max(0, subtotalInclusive - disc) / subtotalInclusive : 1;
  const interstate = isInterStateSale(businessState, customerState);

  let taxableTotal = 0;
  let cgstTotal = 0;
  let sgstTotal = 0;
  let igstTotal = 0;

  const lines = rawLines.map((row) => {
    const adjTaxable = roundMoney2(row.taxable * ratio);
    const adjTax = roundMoney2(row.tax * ratio);
    taxableTotal = roundMoney2(taxableTotal + adjTaxable);
    let cgst = 0;
    let sgst = 0;
    let igst = 0;
    let cgstRate = 0;
    let sgstRate = 0;
    let igstRate = 0;
    if (row.gstRate > 0 && adjTax > 0) {
      if (interstate) {
        igst = adjTax;
        igstRate = row.gstRate;
        igstTotal = roundMoney2(igstTotal + igst);
      } else {
        cgst = roundMoney2(adjTax / 2);
        sgst = roundMoney2(adjTax - cgst);
        cgstRate = roundMoney2(row.gstRate / 2);
        sgstRate = roundMoney2(row.gstRate - cgstRate);
        cgstTotal = roundMoney2(cgstTotal + cgst);
        sgstTotal = roundMoney2(sgstTotal + sgst);
      }
    }
    return {
      ...row,
      taxable: adjTaxable,
      tax: adjTax,
      cgst,
      sgst,
      igst,
      cgstRate,
      sgstRate,
      igstRate,
      lineTotal: roundMoney2(adjTaxable + adjTax),
    };
  });

  const totalTax = roundMoney2(cgstTotal + sgstTotal + igstTotal);
  const grandTotal = roundMoney2(taxableTotal + totalTax);
  const hasGst = lines.some((l) => l.gstRate > 0 && l.tax > 0);

  const hsnMap = new Map();
  for (const l of lines) {
    if (!l.hsn || l.gstRate <= 0) continue;
    const key = `${l.hsn}|${l.gstRate}|${interstate ? "I" : "CS"}`;
    const prev = hsnMap.get(key) || {
      hsn: l.hsn,
      gstRate: l.gstRate,
      taxable: 0,
      cgst: 0,
      sgst: 0,
      igst: 0,
      cgstRate: l.cgstRate,
      sgstRate: l.sgstRate,
      igstRate: l.igstRate,
    };
    prev.taxable = roundMoney2(prev.taxable + l.taxable);
    prev.cgst = roundMoney2(prev.cgst + l.cgst);
    prev.sgst = roundMoney2(prev.sgst + l.sgst);
    prev.igst = roundMoney2(prev.igst + l.igst);
    hsnMap.set(key, prev);
  }
  const hsnSummary = [...hsnMap.values()].sort((a, b) => String(a.hsn).localeCompare(String(b.hsn)));

  return {
    lines,
    subtotalInclusive: roundMoney2(subtotalInclusive),
    discount: disc,
    taxableTotal,
    cgst: cgstTotal,
    sgst: sgstTotal,
    igst: igstTotal,
    totalTax,
    grandTotal,
    hasGst,
    isInterState: interstate,
    hsnSummary,
  };
}

const BELOW_20 = [
  "",
  "ONE",
  "TWO",
  "THREE",
  "FOUR",
  "FIVE",
  "SIX",
  "SEVEN",
  "EIGHT",
  "NINE",
  "TEN",
  "ELEVEN",
  "TWELVE",
  "THIRTEEN",
  "FOURTEEN",
  "FIFTEEN",
  "SIXTEEN",
  "SEVENTEEN",
  "EIGHTEEN",
  "NINETEEN",
];
const TENS = ["", "", "TWENTY", "THIRTY", "FORTY", "FIFTY", "SIXTY", "SEVENTY", "EIGHTY", "NINETY"];

function twoDigits(n) {
  if (n < 20) return BELOW_20[n];
  const t = Math.floor(n / 10);
  const u = n % 10;
  return `${TENS[t]}${u ? ` ${BELOW_20[u]}` : ""}`.trim();
}

function threeDigits(n) {
  if (n < 100) return twoDigits(n);
  const h = Math.floor(n / 100);
  const rest = n % 100;
  return `${BELOW_20[h]} HUNDRED${rest ? ` ${twoDigits(rest)}` : ""}`.trim();
}

/** Indian numbering: amount in words (rupees, paise ignored after round). */
export function amountInWordsInr(amount) {
  let n = Math.floor(Math.max(0, num(amount)));
  if (n === 0) return "ZERO RUPEES ONLY";
  const parts = [];
  const crore = Math.floor(n / 10000000);
  n %= 10000000;
  const lakh = Math.floor(n / 100000);
  n %= 100000;
  const thousand = Math.floor(n / 1000);
  n %= 1000;
  if (crore) parts.push(`${threeDigits(crore)} CRORE`);
  if (lakh) parts.push(`${twoDigits(lakh)} LAKH`);
  if (thousand) parts.push(`${twoDigits(thousand)} THOUSAND`);
  if (n) parts.push(threeDigits(n));
  return `${parts.join(" ")} RUPEES ONLY`;
}

export function invoiceCopyLabel(copyType) {
  const k = String(copyType || "original").toLowerCase();
  return INVOICE_COPY_LABELS[k] || INVOICE_COPY_LABELS.original;
}

export function saleHasGstData(sale, settings = {}) {
  const lines = Array.isArray(sale?.lineItems) ? sale.lineItems : [];
  const defaultRate = num(settings.defaultProductGstRate ?? DEFAULT_PRODUCT_GST_RATE);
  return lines.some((li) => {
    const rate = num(li?.gstRate) > 0 ? num(li?.gstRate) : defaultRate;
    const hsn = String(li?.hsn || settings.defaultProductHsn || DEFAULT_PRODUCT_HSN).trim();
    return rate > 0 && !!hsn;
  });
}

export function businessAddressLines(settings = {}) {
  const lines = [];
  const street = String(settings.businessAddress || "").trim();
  if (street) lines.push(street);
  const city = String(settings.businessCity || "").trim();
  const state = String(settings.businessState || "").trim();
  const pin = String(settings.businessPincode || "").trim();
  const cityLine = [city, state].filter(Boolean).join(", ");
  const tail = [cityLine, pin ? `- ${pin}` : ""].filter(Boolean).join(" ");
  if (tail) lines.push(tail);
  return lines;
}
