import { useEffect, useRef, useState } from 'react';
import { Box, Stack } from '@mui/material';
import { Plus } from 'lucide-react';
import { useRubyBalance } from '../../hooks/useRubyBalance';
import RubyIcon from './RubyIcon';
import { inkstashColors, inkstashFonts } from '../../theme/inkstashTokens';

interface RubyBalancePillProps {
  onClickTopUp?: () => void;
  compact?: boolean;
}

function formatRubies(n: number): string {
  return n.toLocaleString('en-US');
}

/**
 * Animate a number from `from` to `to` with an ease-out curve.
 * Upward changes (gains) take longer and feel celebratory.
 * Downward changes (spends) are quicker and matter-of-fact.
 */
function useCountUp(target: number) {
  const [display, setDisplay] = useState(target);
  const fromRef = useRef(target);
  const hydratedRef = useRef(false);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const from = fromRef.current;
    if (from === target) return;

    // First time target settles, jump to it without animating. This prevents
    // a 0 -> N spin on every mount/login.
    if (!hydratedRef.current) {
      hydratedRef.current = true;
      fromRef.current = target;
      setDisplay(target);
      return;
    }

    const delta = target - from;
    const isGain = delta > 0;
    const absDelta = Math.abs(delta);

    const baseMs = isGain ? 1100 : 380;
    const perRubyMs = isGain ? 0.18 : 0.06;
    const duration = Math.min(2400, baseMs + absDelta * perRubyMs);

    const start = performance.now();
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

    const tick = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / duration);
      const eased = easeOutCubic(t);
      const value = Math.round(from + delta * eased);
      setDisplay(value);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = target;
      }
    };

    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [target]);

  return { display, isGaining: display < target };
}

export default function RubyBalancePill({ onClickTopUp, compact }: RubyBalancePillProps) {
  const { balance } = useRubyBalance();
  const { display, isGaining } = useCountUp(balance);

  // Detect upward transitions to trigger a one-shot "pop" effect on the pill.
  // Skip the very first transition (initial hydration) so we don't flash a pop
  // on every page mount.
  const prevBalanceRef = useRef(balance);
  const popHydratedRef = useRef(false);
  const [popping, setPopping] = useState(false);
  useEffect(() => {
    if (!popHydratedRef.current) {
      popHydratedRef.current = true;
      prevBalanceRef.current = balance;
      return;
    }
    if (balance > prevBalanceRef.current) {
      setPopping(true);
      const t = setTimeout(() => setPopping(false), 1400);
      prevBalanceRef.current = balance;
      return () => clearTimeout(t);
    }
    prevBalanceRef.current = balance;
  }, [balance]);

  return (
    <Stack
      direction="row"
      alignItems="center"
      gap={0.75}
      sx={{
        position: 'relative',
        bgcolor: inkstashColors.bgSunken,
        border: `1px solid ${popping ? inkstashColors.brand : inkstashColors.border}`,
        borderRadius: 999,
        padding: compact ? '4px 4px 4px 10px' : '5px 5px 5px 12px',
        transition: 'border-color 280ms ease, box-shadow 280ms ease, transform 280ms ease',
        boxShadow: popping ? `0 0 18px ${inkstashColors.brand}66` : 'none',
        transform: popping ? 'scale(1.04)' : 'scale(1)',
        '&:hover': onClickTopUp ? { borderColor: inkstashColors.borderStrong } : {},
      }}
    >
      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          animation: popping ? 'inkstashRubyWiggle 600ms ease' : 'none',
          '@keyframes inkstashRubyWiggle': {
            '0%, 100%': { transform: 'rotate(0deg) scale(1)' },
            '25%': { transform: 'rotate(-8deg) scale(1.18)' },
            '50%': { transform: 'rotate(0deg) scale(1.22)' },
            '75%': { transform: 'rotate(8deg) scale(1.18)' },
          },
        }}
      >
        <RubyIcon size={compact ? 12 : 14} glow={popping} />
      </Box>
      <Box
        sx={{
          fontFamily: inkstashFonts.mono,
          fontWeight: 700,
          fontSize: compact ? 11 : 12.5,
          color: isGaining || popping ? inkstashColors.brandDeep : inkstashColors.ink,
          letterSpacing: '0.02em',
          minWidth: compact ? 28 : 36,
          textAlign: 'left',
          fontVariantNumeric: 'tabular-nums',
          transition: 'color 280ms ease',
        }}
      >
        {formatRubies(display)}
      </Box>
      {onClickTopUp && (
        <Box
          component="button"
          type="button"
          onClick={(e) => { e.stopPropagation(); onClickTopUp(); }}
          aria-label="Buy Rubies"
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: compact ? 22 : 26,
            height: compact ? 22 : 26,
            borderRadius: '50%',
            bgcolor: inkstashColors.brand,
            color: '#fff',
            border: 'none',
            cursor: 'pointer',
            transition: 'background 140ms ease, transform 100ms ease',
            '&:hover': { bgcolor: inkstashColors.brandDeep },
            '&:active': { transform: 'scale(0.92)' },
          }}
        >
          <Plus size={compact ? 13 : 14} strokeWidth={2.5} />
        </Box>
      )}
    </Stack>
  );
}

export { formatRubies };
