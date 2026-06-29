// src/tokens.js
// Single source of truth for all visual design decisions.
// Import from here. Never hardcode values in components.

export const COLORS = {
  // Brand
  primary:       '#0F3D91',   // Biswajit Power Hub navy blue
  primaryLight:  '#1A52B8',
  primaryDark:   '#0A2B6B',
  primaryBg:     '#E8EEF9',   // light tint of primary for backgrounds

  // Semantic
  success:       '#1A7F37',
  successBg:     '#D3F4DF',
  warning:       '#856404',
  warningBg:     '#FFF3CD',
  danger:        '#B91C1C',
  dangerBg:      '#FEE2E2',
  info:          '#1D4ED8',
  infoBg:        '#DBEAFE',

  // Neutrals
  text:          '#111827',
  textSecondary: '#6B7280',
  textMuted:     '#9CA3AF',
  textDisabled:  '#D1D5DB',

  // Surfaces
  bg:            '#F9FAFB',
  surface:       '#FFFFFF',
  surfaceAlt:    '#F3F4F6',
  border:        '#E5E7EB',
  borderStrong:  '#D1D5DB',

  // Money-specific (amounts look premium in these)
  amountPositive: '#065F46',  // deep green for income
  amountNegative: '#991B1B',  // deep red for expense/debit
  amountNeutral:  '#1F2937',  // near-black for neutral amounts
};

export const SPACING = {
  xxs:  2,
  xs:   4,
  sm:   8,
  md:   12,
  lg:   16,
  xl:   24,
  xxl:  32,
  xxxl: 48,
};

export const FONT_SIZE = {
  caption:  11,   // timestamps, helper text
  label:    12,   // form labels, table headers
  body:     14,   // standard body text, table cells
  bodyLg:   15,   // slightly larger body
  section:  16,   // section headers
  title:    18,   // screen sub-titles
  pageTitle: 22,  // main page heading
  display:  28,  // dashboard KPI numbers
};

export const FONT_WEIGHT = {
  regular: '400',
  medium:  '500',
  bold:    '600',
};

export const FONT_FAMILY = {
  sans:  '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  mono:  '"SF Mono", "Fira Code", "Consolas", monospace',  // for money amounts
};

export const BORDER_RADIUS = {
  xs:   2,
  sm:   4,
  md:   8,
  lg:   12,
  xl:   16,
  pill: 999,
};

export const SHADOWS = {
  sm:  '0 1px 2px rgba(0,0,0,0.05)',
  md:  '0 2px 8px rgba(0,0,0,0.08)',
  lg:  '0 4px 16px rgba(0,0,0,0.10)',
  card:'0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
};

// Typography presets — use these as style objects
export const TEXT = {
  pageTitle: {
    fontSize: FONT_SIZE.pageTitle,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.text,
    lineHeight: '1.3',
  },
  sectionTitle: {
    fontSize: FONT_SIZE.section,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.text,
    lineHeight: '1.4',
  },
  label: {
    fontSize: FONT_SIZE.label,
    fontWeight: FONT_WEIGHT.regular,
    color: COLORS.textSecondary,
    lineHeight: '1.4',
  },
  body: {
    fontSize: FONT_SIZE.body,
    fontWeight: FONT_WEIGHT.regular,
    color: COLORS.text,
    lineHeight: '1.6',
  },
  caption: {
    fontSize: FONT_SIZE.caption,
    fontWeight: FONT_WEIGHT.regular,
    color: COLORS.textMuted,
    lineHeight: '1.4',
  },
  amount: {
    fontSize: FONT_SIZE.body,
    fontWeight: FONT_WEIGHT.medium,
    fontFamily: FONT_FAMILY.mono,
    textAlign: 'right',
  },
  amountLg: {
    fontSize: FONT_SIZE.display,
    fontWeight: FONT_WEIGHT.bold,
    fontFamily: FONT_FAMILY.mono,
    textAlign: 'right',
  },
  kpiValue: {
    fontSize: FONT_SIZE.display,
    fontWeight: FONT_WEIGHT.bold,
    fontFamily: FONT_FAMILY.mono,
    color: COLORS.text,
    lineHeight: '1.2',
  },
  kpiLabel: {
    fontSize: FONT_SIZE.label,
    fontWeight: FONT_WEIGHT.regular,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
};

// Common layout patterns
export const LAYOUT = {
  screenPadding:  SPACING.lg,
  cardPadding:    `${SPACING.lg}px ${SPACING.xl}px`,
  sectionGap:     SPACING.xl,
  listItemHeight: 56,
  bottomNavHeight: 60,
  headerHeight:   56,
};

// CSS custom properties string — inject into :root for global access
export const CSS_VARIABLES = `
  :root {
    --color-primary: ${COLORS.primary};
    --color-primary-bg: ${COLORS.primaryBg};
    --color-success: ${COLORS.success};
    --color-success-bg: ${COLORS.successBg};
    --color-danger: ${COLORS.danger};
    --color-danger-bg: ${COLORS.dangerBg};
    --color-warning: ${COLORS.warning};
    --color-warning-bg: ${COLORS.warningBg};
    --color-text: ${COLORS.text};
    --color-text-secondary: ${COLORS.textSecondary};
    --color-text-muted: ${COLORS.textMuted};
    --color-bg: ${COLORS.bg};
    --color-surface: ${COLORS.surface};
    --color-surface-alt: ${COLORS.surfaceAlt};
    --color-border: ${COLORS.border};
    --color-border-strong: ${COLORS.borderStrong};
    --color-amount-positive: ${COLORS.amountPositive};
    --color-amount-negative: ${COLORS.amountNegative};
    --radius-sm: ${BORDER_RADIUS.sm}px;
    --radius-md: ${BORDER_RADIUS.md}px;
    --radius-lg: ${BORDER_RADIUS.lg}px;
    --shadow-card: ${SHADOWS.card};
    --spacing-sm: ${SPACING.sm}px;
    --spacing-md: ${SPACING.md}px;
    --spacing-lg: ${SPACING.lg}px;
    --spacing-xl: ${SPACING.xl}px;
    --font-mono: ${FONT_FAMILY.mono};
    --bottom-nav-height: ${LAYOUT.bottomNavHeight}px;
    --header-height: ${LAYOUT.headerHeight}px;
  }
`;
