export const colors = {
  bg:         '#f5f0e8',
  bgElev:     '#ffffff',
  bgSub:      '#ede6d8',
  ink:        '#14110d',
  inkSoft:    'rgba(20,17,13,0.62)',
  inkMute:    'rgba(20,17,13,0.42)',
  line:       'rgba(20,17,13,0.10)',
  lineStrong: 'rgba(20,17,13,0.18)',
  accent:     '#e82c2c',
  accentDeep: '#b81818',
  cobalt:     '#1a4fc4',
  amber:      '#f59e0b',
  sideBg:     '#14110d',
  sideInk:    '#f5f0e8',
  sideInkSoft:'rgba(245,240,232,0.55)',
  sideLine:   'rgba(245,240,232,0.08)',
  sideHover:  'rgba(245,240,232,0.06)',
  sideActiveBg:  'rgba(232,44,44,0.14)',
  sideActiveInk: '#ffd9d9',
  topbarBg:   'rgba(245,240,232,0.85)',
} as const;

export const easing = {
  out:     'cubic-bezier(0.23, 1, 0.32, 1)',
  outSoft: 'cubic-bezier(0.16, 1, 0.3, 1)',
  inOut:   'cubic-bezier(0.77, 0, 0.175, 1)',
} as const;

export const fonts = {
  display: "'Outfit', system-ui, sans-serif",
  mono:    "'DM Mono', 'Courier New', monospace",
} as const;

export const layout = {
  navHeight:          56,
  sideWidthOpen:      220,
  sideWidthCollapsed: 64,
  contentMaxWidth:    1180,
} as const;
