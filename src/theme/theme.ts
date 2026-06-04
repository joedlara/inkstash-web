import { createTheme } from '@mui/material/styles';
import { inkstashColors, inkstashFonts, inkstashRadii } from './inkstashTokens';

// MUI theme is now a thin adapter over inkstashTokens. Components that style
// via `sx` should reference the tokens directly; everything that falls back to
// MUI defaults (Typography variants, default Button/Card/Chip/Paper) inherits
// the brand here.
export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: inkstashColors.brand,
      light: inkstashColors.brandLight,
      dark: inkstashColors.brandDeep,
      contrastText: '#ffffff',
    },
    secondary: {
      main: inkstashColors.ink,
      light: inkstashColors.ink2,
      dark: '#000000',
      contrastText: '#ffffff',
    },
    error: {
      main: inkstashColors.live,
      light: '#fca5a5',
      dark: inkstashColors.brandDeep,
    },
    warning: {
      main: inkstashColors.gold,
      light: inkstashColors.goldLight,
      dark: inkstashColors.goldDeep,
    },
    success: {
      main: inkstashColors.success,
      light: '#86efac',
      dark: '#1f5638',
    },
    info: {
      main: inkstashColors.info,
      light: '#7AA1D9',
      dark: '#1A335F',
    },
    background: {
      default: inkstashColors.bg,
      paper: inkstashColors.bgElev,
    },
    text: {
      primary: inkstashColors.ink,
      secondary: inkstashColors.ink2,
      disabled: inkstashColors.muted2,
    },
    divider: inkstashColors.border,
  },
  typography: {
    fontFamily: inkstashFonts.ui,
    h1: { fontFamily: inkstashFonts.display, fontSize: '2.5rem', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.01em' },
    h2: { fontFamily: inkstashFonts.display, fontSize: '2rem',   fontWeight: 800, lineHeight: 1.15, letterSpacing: '-0.01em' },
    h3: { fontFamily: inkstashFonts.display, fontSize: '1.75rem', fontWeight: 700, lineHeight: 1.2 },
    h4: { fontFamily: inkstashFonts.display, fontSize: '1.5rem',  fontWeight: 700, lineHeight: 1.25 },
    h5: { fontFamily: inkstashFonts.display, fontSize: '1.25rem', fontWeight: 700, lineHeight: 1.3 },
    h6: { fontFamily: inkstashFonts.display, fontSize: '1rem',    fontWeight: 700, lineHeight: 1.4 },
    body1: { fontSize: '1rem',    lineHeight: 1.5 },
    body2: { fontSize: '0.875rem', lineHeight: 1.5 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  shape: {
    borderRadius: parseInt(inkstashRadii.md, 10),
  },
  shadows: [
    'none',
    '0px 1px 2px rgba(22,17,14,0.05)',
    '0px 1px 3px rgba(22,17,14,0.10), 0px 1px 2px rgba(22,17,14,0.06)',
    '0px 4px 6px rgba(22,17,14,0.10), 0px 2px 4px rgba(22,17,14,0.06)',
    '0px 10px 15px rgba(22,17,14,0.10), 0px 4px 6px rgba(22,17,14,0.05)',
    '0px 20px 25px rgba(22,17,14,0.10), 0px 10px 10px rgba(22,17,14,0.04)',
    '0px 25px 50px rgba(22,17,14,0.25)',
    '0px 25px 50px rgba(22,17,14,0.25)',
    '0px 25px 50px rgba(22,17,14,0.25)',
    '0px 25px 50px rgba(22,17,14,0.25)',
    '0px 25px 50px rgba(22,17,14,0.25)',
    '0px 25px 50px rgba(22,17,14,0.25)',
    '0px 25px 50px rgba(22,17,14,0.25)',
    '0px 25px 50px rgba(22,17,14,0.25)',
    '0px 25px 50px rgba(22,17,14,0.25)',
    '0px 25px 50px rgba(22,17,14,0.25)',
    '0px 25px 50px rgba(22,17,14,0.25)',
    '0px 25px 50px rgba(22,17,14,0.25)',
    '0px 25px 50px rgba(22,17,14,0.25)',
    '0px 25px 50px rgba(22,17,14,0.25)',
    '0px 25px 50px rgba(22,17,14,0.25)',
    '0px 25px 50px rgba(22,17,14,0.25)',
    '0px 25px 50px rgba(22,17,14,0.25)',
    '0px 25px 50px rgba(22,17,14,0.25)',
    '0px 25px 50px rgba(22,17,14,0.25)',
  ],
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: parseInt(inkstashRadii.md, 10),
          padding: '10px 24px',
          fontSize: '1rem',
          fontWeight: 600,
        },
        contained: {
          boxShadow: 'none',
          '&:hover': { boxShadow: '0px 4px 6px rgba(22,17,14,0.10)' },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: parseInt(inkstashRadii.lg, 10),
          boxShadow: '0px 1px 3px rgba(22,17,14,0.10), 0px 1px 2px rgba(22,17,14,0.06)',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: parseInt(inkstashRadii.sm, 10) },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { borderRadius: parseInt(inkstashRadii.md, 10) },
        elevation1: { boxShadow: '0px 1px 2px rgba(22,17,14,0.05)' },
        elevation2: { boxShadow: '0px 1px 3px rgba(22,17,14,0.10), 0px 1px 2px rgba(22,17,14,0.06)' },
      },
    },
  },
});
