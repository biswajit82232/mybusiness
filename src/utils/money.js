// src/utils/money.js
// ALL money in this app is stored and calculated in integer PAISE.
// ₹1.00 = 100 paise. ₹0.50 = 50 paise. Never use floats for money.

/**
 * Convert rupees (float or string) to integer paise.
 * toPaise(100.5) => 10050
 * toPaise("100.50") => 10050
 */
export function toPaise(rupees) {
  if (rupees === null || rupees === undefined || rupees === '') return 0;
  const r = parseFloat(String(rupees).replace(/,/g, ''));
  if (isNaN(r)) return 0;
  return Math.round(r * 100);
}

/**
 * Convert integer paise to rupees number (for display only).
 * toRupees(10050) => 100.5
 */
export function toRupees(paise) {
  if (!paise) return 0;
  return paise / 100;
}

/**
 * Format paise as Indian rupee string for display.
 * formatINR(10050) => "₹100.50"
 * formatINR(100000) => "₹1,000.00"
 */
export function formatINR(paise) {
  if (paise === null || paise === undefined) return '₹0.00';
  const rupees = paise / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rupees);
}

/**
 * Add two paise values safely.
 * addMoney(10050, 9950) => 20000
 */
export function addMoney(a, b) {
  return (a || 0) + (b || 0);
}

/**
 * Subtract paise values safely.
 * subtractMoney(10000, 500) => 9500
 */
export function subtractMoney(a, b) {
  return (a || 0) - (b || 0);
}

/**
 * Multiply paise by a plain integer quantity.
 * multiplyMoney(500, 3) => 1500 (₹5.00 × 3 = ₹15.00)
 */
export function multiplyMoney(paise, quantity) {
  return Math.round(paise * quantity);
}

/**
 * Calculate GST on a taxable amount (exclusive).
 * calcGST(100000, 18) => 18000 (₹1000 × 18% = ₹180)
 * Uses integer arithmetic — no float errors.
 */
export function calcGST(taxableAmountPaise, ratePercent) {
  return Math.round(taxableAmountPaise * ratePercent / 100);
}

/**
 * Calculate taxable amount from GST-inclusive total.
 * Reverse GST: taxable = total / (1 + rate/100)
 * calcTaxableFromInclusive(118000, 18) => 100000
 */
export function calcTaxableFromInclusive(totalInclusivePaise, ratePercent) {
  return Math.round(totalInclusivePaise * 100 / (100 + ratePercent));
}

/**
 * Split total GST into CGST and SGST (intra-state).
 * splitGST(18000) => { cgst: 9000, sgst: 9000, igst: 0 }
 * For inter-state, pass isInterState = true.
 */
export function splitGST(totalGSTPaise, isInterState = false) {
  if (isInterState) {
    return { cgst: 0, sgst: 0, igst: totalGSTPaise };
  }
  const half = Math.floor(totalGSTPaise / 2);
  const remainder = totalGSTPaise - (half * 2);
  return {
    cgst: half + remainder, // remainder (if odd paise) goes to CGST
    sgst: half,
    igst: 0,
  };
}

/**
 * Calculate invoice line total.
 * lineTotal(500000, 2, 18) => { taxable: 1000000, gst: 180000, total: 1180000 }
 * (unit price ₹5000, qty 2, GST 18% → taxable ₹10000, GST ₹1800, total ₹11800)
 */
export function calcLineTotal(unitPricePaise, quantity, gstRatePercent) {
  const taxable = multiplyMoney(unitPricePaise, quantity);
  const gst = calcGST(taxable, gstRatePercent);
  return {
    taxablePaise: taxable,
    gstPaise: gst,
    totalPaise: taxable + gst,
  };
}

/**
 * Round off to nearest rupee (Indian rounding).
 * roundOff(118050) => { rounded: 118100, roundOffPaise: 50 }
 * roundOff(118040) => { rounded: 118000, roundOffPaise: -40 }
 */
export function roundOff(totalPaise) {
  const rupees = Math.floor(totalPaise / 100);
  const paise = totalPaise % 100;
  const rounded = paise >= 50
    ? (rupees + 1) * 100
    : rupees * 100;
  return {
    roundedPaise: rounded,
    roundOffPaise: rounded - totalPaise,
  };
}

/**
 * Sum an array of paise values.
 * sumMoney([10000, 5000, 2500]) => 17500
 */
export function sumMoney(paiseArray) {
  return paiseArray.reduce((acc, val) => acc + (val || 0), 0);
}

/**
 * Calculate percentage of a paise amount.
 * percentage(100000, 10) => 10000 (10% of ₹1000 = ₹100)
 */
export function percentage(paise, percent) {
  return Math.round(paise * percent / 100);
}
