// src/theme/inkstashTokens.ts
// ────────────────────────────────────────────────────────────
// SINGLE SOURCE OF TRUTH for the Inkstash visual system.
// theme.ts (MUI) and index.css both derive from these values.
// Light theme. Warm paper + crimson + gold.
// ────────────────────────────────────────────────────────────
export const inkstashColors = {
  // Neutrals — warm paper & ink
  bg:           '#FAF7F2', // page background
  bgElev:       '#FFFFFF', // cards / raised surfaces
  bgSunken:     '#F2EDE5', // inputs / wells / chips
  ink:          '#16110E', // primary text
  ink2:         '#3A302A', // secondary text / body
  muted:        '#8A7F73', // tertiary text / captions
  muted2:       '#C5BBAE', // disabled / faint
  border:       '#E8DFD2', // hairline borders
  borderStrong: '#D6CABA', // emphasized borders

  // Primary — Crimson
  brand:        '#A1232C',
  brandLight:   '#C9434C',
  brandDeep:    '#7A1A21',
  brandSoft:    '#FCEAEB',

  // Secondary — Gold
  gold:         '#B8893A',
  goldLight:    '#CDA45A',
  goldDeep:     '#8A6526',
  goldSoft:     '#F7EFDC',

  // Status
  success:      '#2E6F4F',
  info:         '#2A4D8A',
  live:         '#DC2626', // pulsing LIVE badge / danger

  // Dark surfaces — video stage / immersive overlays
  stage:        '#08070A',
  stage2:       '#120C0A',
} as const;

export const rarityColors = {
  common:   '#8A7F73',
  uncommon: '#2E6F4F',
  rare:     '#2A4D8A',
  epic:     '#6B3A8A',
  mythic:   '#A1232C',
  grail:    '#B8893A',
} as const;

export const inkstashRadii = {
  sm: '6px',
  md: '10px',
  lg: '16px',
  xl: '22px',
} as const;

export const inkstashShadows = {
  xs: '0 1px 0 rgba(22,17,14,0.04)',
  sm: '0 1px 2px rgba(22,17,14,0.06), 0 1px 0 rgba(22,17,14,0.03)',
  md: '0 8px 24px -8px rgba(22,17,14,0.10), 0 2px 4px rgba(22,17,14,0.04)',
  lg: '0 24px 48px -16px rgba(22,17,14,0.18), 0 8px 16px -8px rgba(22,17,14,0.08)',
} as const;

export const inkstashFonts = {
  display: "'Big Shoulders Display', system-ui, sans-serif", // headings, titles, prices, ALL-CAPS
  ui:      "'Geist', system-ui, sans-serif",                 // body + UI
  mono:    "'Geist Mono', ui-monospace, monospace",          // counts, timers, labels
} as const;

export const inkstashLayout = {
  sidebarWidth:          240,
  sidebarWidthCollapsed: 68,
  topnavHeight:          64,
  mainPaddingX:          28,
  mainPaddingTop:        24,
  mainPaddingBottom:     56,
  mainPaddingXMobile:    14,
  contentMaxWidth:       1280,
} as const;
