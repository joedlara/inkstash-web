// src/theme/inkstashTokens.ts
export const inkstashColors = {
  bg:           '#FAF7F2',
  bgElev:       '#FFFFFF',
  bgSunken:     '#F2EDE5',
  ink:          '#16110E',
  ink2:         '#3A302A',
  muted:        '#8A7F73',
  muted2:       '#C5BBAE',
  border:       '#E8DFD2',
  borderStrong: '#D6CABA',
  brand:        '#A1232C',
  brandDeep:    '#7A1A21',
  brandSoft:    '#FCEAEB',
  gold:         '#B8893A',
  goldSoft:     '#F7EFDC',
  live:         '#DC2626',
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
  display: "'Big Shoulders Display', system-ui, sans-serif",
  ui:      "'Geist', system-ui, sans-serif",
  mono:    "'Geist Mono', ui-monospace, monospace",
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
