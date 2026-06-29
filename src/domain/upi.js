/**
 * Build UPI deep link and pay string for invoice QR codes.
 */
import { num, roundMoney2 } from "./appModel.js";

/** @returns {string|null} Normalized UPI VPA (user@bank) */
export function normalizeUpiVpa(raw) {
  const v = String(raw || "").trim().toLowerCase();
  if (!v || !v.includes("@")) return null;
  return v;
}

/**
 * @param {{ vpa?: string, payeeName?: string, amount?: number, note?: string }} opts
 * @returns {string|null}
 */
export function buildUpiPayUri({ vpa, payeeName, amount, note } = {}) {
  const pa = normalizeUpiVpa(vpa);
  if (!pa) return null;
  const params = new URLSearchParams();
  params.set("pa", pa);
  const pn = String(payeeName || "").trim();
  if (pn) params.set("pn", pn.slice(0, 50));
  const amt = num(amount);
  if (amt > 0) params.set("am", String(roundMoney2(amt)));
  params.set("cu", "INR");
  const tn = String(note || "").trim();
  if (tn) params.set("tn", tn.slice(0, 80));
  return `upi://pay?${params.toString()}`;
}
