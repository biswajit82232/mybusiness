/**
 * Invoice print / preview visual templates.
 * GST field layout is shared across templates (Rule 46 CGST); templates change presentation only.
 */

export const INVOICE_TEMPLATE_PREMIUM = "premium";
export const INVOICE_TEMPLATE_CLASSIC = "classic";
export const INVOICE_TEMPLATE_MODERN = "modern";
export const INVOICE_TEMPLATE_MINIMAL = "minimal";
export const INVOICE_TEMPLATE_COMPACT = "compact";
export const INVOICE_TEMPLATE_CENTERED = "centered";
export const INVOICE_TEMPLATE_FRAMED = "framed";
export const INVOICE_TEMPLATE_STACKED = "stacked";
export const INVOICE_TEMPLATE_OCEAN = "ocean";
export const INVOICE_TEMPLATE_FOREST = "forest";
export const INVOICE_TEMPLATE_BURGUNDY = "burgundy";
export const INVOICE_TEMPLATE_ROYAL = "royal";
export const INVOICE_TEMPLATE_SUNSET = "sunset";

export const INVOICE_TEMPLATES = [
  INVOICE_TEMPLATE_PREMIUM,
  INVOICE_TEMPLATE_CLASSIC,
  INVOICE_TEMPLATE_MODERN,
  INVOICE_TEMPLATE_MINIMAL,
  INVOICE_TEMPLATE_COMPACT,
  INVOICE_TEMPLATE_CENTERED,
  INVOICE_TEMPLATE_FRAMED,
  INVOICE_TEMPLATE_STACKED,
  INVOICE_TEMPLATE_OCEAN,
  INVOICE_TEMPLATE_FOREST,
  INVOICE_TEMPLATE_BURGUNDY,
  INVOICE_TEMPLATE_ROYAL,
  INVOICE_TEMPLATE_SUNSET,
];

export const DEFAULT_INVOICE_TEMPLATE = INVOICE_TEMPLATE_PREMIUM;

/** @type {ReadonlyArray<{ id: string, label: string, group: string, tagline: string, hint: string, preview?: string }>} */
export const INVOICE_TEMPLATE_OPTIONS = [
  {
    id: INVOICE_TEMPLATE_PREMIUM,
    group: "standard",
    label: "Premium",
    tagline: "Tally / Zoho Books",
    hint: "Bold borders, dark headers, boxed title",
    preview: "premium",
  },
  {
    id: INVOICE_TEMPLATE_CLASSIC,
    group: "standard",
    label: "Classic",
    tagline: "Traditional",
    hint: "Blue letterhead, serif type, shaded rows",
    preview: "classic",
  },
  {
    id: INVOICE_TEMPLATE_MODERN,
    group: "standard",
    label: "Modern",
    tagline: "Clean SaaS",
    hint: "Accent bar, soft borders, airy spacing",
    preview: "modern",
  },
  {
    id: INVOICE_TEMPLATE_MINIMAL,
    group: "standard",
    label: "Minimal",
    tagline: "Essential",
    hint: "Hairline borders, compact type",
    preview: "minimal",
  },
  {
    id: INVOICE_TEMPLATE_COMPACT,
    group: "layout",
    label: "Compact",
    tagline: "Dense fit",
    hint: "Tighter rows and padding — more lines per page",
    preview: "compact",
  },
  {
    id: INVOICE_TEMPLATE_CENTERED,
    group: "layout",
    label: "Centered",
    tagline: "Formal letterhead",
    hint: "Logo and company name centred; title banner centred",
    preview: "centered",
  },
  {
    id: INVOICE_TEMPLATE_FRAMED,
    group: "layout",
    label: "Framed",
    tagline: "Certificate style",
    hint: "Double border frame around the full document",
    preview: "framed",
  },
  {
    id: INVOICE_TEMPLATE_STACKED,
    group: "layout",
    label: "Stacked",
    tagline: "Vertical blocks",
    hint: "Bill-to full width, then invoice details below",
    preview: "stacked",
  },
  {
    id: INVOICE_TEMPLATE_OCEAN,
    group: "color",
    label: "Ocean",
    tagline: "Teal",
    hint: "Teal headers and accent bar — professional services",
    preview: "ocean",
  },
  {
    id: INVOICE_TEMPLATE_FOREST,
    group: "color",
    label: "Forest",
    tagline: "Green",
    hint: "Green theme — retail, agriculture, wellness",
    preview: "forest",
  },
  {
    id: INVOICE_TEMPLATE_BURGUNDY,
    group: "color",
    label: "Burgundy",
    tagline: "Wine red",
    hint: "Deep maroon accents — premium retail & hospitality",
    preview: "burgundy",
  },
  {
    id: INVOICE_TEMPLATE_ROYAL,
    group: "color",
    label: "Royal",
    tagline: "Purple",
    hint: "Indigo-purple headers — creative & professional",
    preview: "royal",
  },
  {
    id: INVOICE_TEMPLATE_SUNSET,
    group: "color",
    label: "Sunset",
    tagline: "Orange",
    hint: "Warm amber accents — energetic consumer brands",
    preview: "sunset",
  },
];

export const INVOICE_TEMPLATE_GROUPS = [
  { id: "standard", label: "Standard" },
  { id: "layout", label: "Layout & placement" },
  { id: "color", label: "Colour themes" },
];

/**
 * @param {unknown} value
 * @returns {(typeof INVOICE_TEMPLATES)[number]}
 */
export function normalizeInvoiceTemplate(value) {
  const v = String(value ?? "").trim().toLowerCase();
  return /** @type {(typeof INVOICE_TEMPLATES)[number]} */ (
    INVOICE_TEMPLATES.includes(v) ? v : DEFAULT_INVOICE_TEMPLATE
  );
}

/**
 * @param {object} [settings]
 * @returns {string} CSS modifier class suffix, e.g. "premium"
 */
export function invoiceTemplateClass(settings) {
  return normalizeInvoiceTemplate(settings?.invoiceTemplate);
}
