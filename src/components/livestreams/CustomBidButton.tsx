// src/components/livestreams/CustomBidButton.tsx
//
// Frosted "Custom" pill that opens a 3-option popover ($5 / $10 / $25
// above the current price, displayed as the resulting total). Picking
// one fires onPick(amountCents) — the parent's existing handleBid
// machinery (no-card retry, toast, busy state) handles the rest.
//
// Visual spec: docs/design-system/claude-design/live_stream/live_stream/stream.css
// (.btn-custom + .custom-pop + .custom-opt).

import { useEffect, useRef, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { inkstashFonts } from '../../theme/inkstashTokens';

interface Props {
  /** Current price in cents — the +$5/+$10/+$25 jumps stack on top. */
  currentPriceCents: number;
  /** Suppress the button entirely (auction not bidding, viewer is the
   *  current high bidder, etc.). The parent owns visibility logic. */
  disabled?: boolean;
  /** Fires with the chosen TOTAL amount in cents (current + jump). */
  onPick: (amountCents: number) => void;
}

const JUMPS_CENTS = [500, 1000, 2500] as const;

function formatMoney(cents: number): string {
  const dollars = cents / 100;
  return `$${dollars.toFixed(2).replace(/\.00$/, '')}`;
}

export default function CustomBidButton({ currentPriceCents, disabled = false, onPick }: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  // Close on outside click + Esc. Captures both pointer events anywhere
  // in the document and a global keydown so the popover can't get
  // stranded if the parent re-renders.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      const el = wrapRef.current;
      if (el && e.target instanceof Node && !el.contains(e.target)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <Box ref={wrapRef} sx={{ position: 'relative', flexShrink: 0 }}>
      <Box
        component="button"
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        disabled={disabled}
        sx={{
          height: 52,
          padding: '0 22px',
          borderRadius: 999,
          cursor: disabled ? 'not-allowed' : 'pointer',
          background: 'rgba(255,255,255,0.04)',
          color: '#fff',
          border: '2px solid rgba(255,255,255,0.28)',
          backdropFilter: 'blur(18px) saturate(160%)',
          WebkitBackdropFilter: 'blur(18px) saturate(160%)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.22)',
          fontFamily: inkstashFonts.ui,
          fontWeight: 700,
          fontSize: 15,
          transition: 'background 120ms ease, border-color 120ms ease, opacity 120ms ease',
          opacity: disabled ? 0.5 : 1,
          '&:hover': disabled
            ? undefined
            : { background: 'rgba(255,255,255,0.12)', borderColor: 'rgba(255,255,255,0.45)' },
        }}
      >
        Custom
      </Box>

      {open && (
        <Box
          role="menu"
          sx={{
            position: 'absolute',
            bottom: 'calc(100% + 8px)',
            left: 0,
            zIndex: 8,
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            padding: '6px',
            borderRadius: '14px',
            minWidth: 132,
            background: 'rgba(20,14,12,0.82)',
            backdropFilter: 'blur(18px) saturate(160%)',
            WebkitBackdropFilter: 'blur(18px) saturate(160%)',
            border: '1px solid rgba(255,255,255,0.16)',
            boxShadow: '0 16px 40px -12px rgba(0,0,0,0.7)',
          }}
        >
          {JUMPS_CENTS.map((jump) => {
            const total = currentPriceCents + jump;
            return (
              <Box
                key={jump}
                component="button"
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  onPick(total);
                }}
                sx={{
                  padding: '10px 14px',
                  borderRadius: '9px',
                  border: 0,
                  cursor: 'pointer',
                  background: 'transparent',
                  color: '#fff',
                  textAlign: 'left',
                  transition: 'background 100ms ease',
                  '&:hover': { background: 'rgba(255,255,255,0.14)' },
                }}
              >
                <Typography
                  component="span"
                  sx={{
                    fontFamily: inkstashFonts.display,
                    fontWeight: 800,
                    fontSize: 17,
                    letterSpacing: '0.01em',
                    fontVariantNumeric: 'tabular-nums',
                    color: '#fff',
                  }}
                >
                  {formatMoney(total)}
                </Typography>
              </Box>
            );
          })}
        </Box>
      )}
    </Box>
  );
}
