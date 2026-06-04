// src/components/creatorHub/HBtn.tsx
//
// Shared hub button. Three variants matching the design's
// .hbtn-primary / .hbtn-ghost / .hbtn-dark. Small/regular size.
// Used by panel headers, table actions, and modal CTAs.

import { ButtonBase } from '@mui/material';
import type { ReactNode } from 'react';
import { inkstashColors, inkstashFonts } from '../../theme/inkstashTokens';

interface Props {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'ghost' | 'dark';
  size?: 'sm' | 'md' | 'lg';
  icon?: ReactNode;
  disabled?: boolean;
  type?: 'button' | 'submit';
}

const SIZES = {
  sm: { h: 34, px: 1.6,  fontSize: 13 },
  md: { h: 40, px: 2.25, fontSize: 14 },
  lg: { h: 48, px: 3,    fontSize: 15 },
} as const;

export default function HBtn({
  children, onClick, variant = 'ghost', size = 'md', icon, disabled = false, type = 'button',
}: Props) {
  const s = SIZES[size];
  const variantSx = variant === 'primary' ? {
    bgcolor: inkstashColors.brand,
    color: '#fff',
    border: '1px solid transparent',
    '&:hover': { bgcolor: inkstashColors.brandDeep },
  } : variant === 'dark' ? {
    bgcolor: inkstashColors.ink,
    color: '#fff',
    border: '1px solid transparent',
    '&:hover': { bgcolor: '#000' },
  } : {
    bgcolor: inkstashColors.bgElev,
    color: inkstashColors.ink,
    border: `1px solid ${inkstashColors.border}`,
    '&:hover': { bgcolor: inkstashColors.bgSunken, borderColor: inkstashColors.borderStrong },
  };

  return (
    <ButtonBase
      onClick={onClick}
      disabled={disabled}
      type={type}
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.85,
        height: s.h,
        px: s.px,
        borderRadius: 999,
        fontFamily: inkstashFonts.ui,
        fontWeight: 600,
        fontSize: s.fontSize,
        letterSpacing: '-0.005em',
        transition: 'background-color 120ms ease, border-color 120ms ease, transform 120ms ease',
        '&:active': { transform: 'translateY(1px)' },
        '&.Mui-disabled': { opacity: 0.5, cursor: 'not-allowed' },
        ...variantSx,
      }}
    >
      {icon}
      {children}
    </ButtonBase>
  );
}
