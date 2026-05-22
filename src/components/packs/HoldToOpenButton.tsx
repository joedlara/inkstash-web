import { useEffect, useRef, useState } from 'react';
import { Box } from '@mui/material';
import { Sparkles } from 'lucide-react';
import { inkstashColors, inkstashFonts } from '../../theme/inkstashTokens';

const HOLD_DURATION_MS = 700;

interface HoldToOpenButtonProps {
  label: string;
  onComplete: () => void;
  disabled?: boolean;
  busy?: boolean;
}

export default function HoldToOpenButton({
  label,
  onComplete,
  disabled,
  busy,
}: HoldToOpenButtonProps) {
  const [holding, setHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const completedRef = useRef(false);

  useEffect(() => {
    if (!holding) {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      startRef.current = null;
      if (!completedRef.current) {
        // Spring back to zero on release
        const t = setTimeout(() => setProgress(0), 0);
        return () => clearTimeout(t);
      }
      return;
    }

    completedRef.current = false;
    startRef.current = performance.now();

    const tick = (now: number) => {
      if (startRef.current == null) return;
      const elapsed = now - startRef.current;
      const pct = Math.min(1, elapsed / HOLD_DURATION_MS);
      setProgress(pct);
      if (pct >= 1) {
        completedRef.current = true;
        setHolding(false);
        onComplete();
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [holding, onComplete]);

  const start = () => {
    if (disabled || busy) return;
    setHolding(true);
  };

  const stop = () => {
    if (!completedRef.current) setHolding(false);
  };

  const circumference = 2 * Math.PI * 28;
  const dashoffset = circumference * (1 - progress);

  return (
    <Box
      role="button"
      aria-label={label}
      tabIndex={disabled ? -1 : 0}
      onMouseDown={start}
      onMouseUp={stop}
      onMouseLeave={stop}
      onTouchStart={(e: React.TouchEvent) => { e.preventDefault(); start(); }}
      onTouchEnd={stop}
      onTouchCancel={stop}
      onKeyDown={(e: React.KeyboardEvent) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); start(); } }}
      onKeyUp={(e: React.KeyboardEvent) => { if (e.key === ' ' || e.key === 'Enter') stop(); }}
      sx={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 1.25,
        padding: '8px 22px 8px 10px',
        bgcolor: holding ? inkstashColors.brandDeep : inkstashColors.brand,
        color: '#fff',
        borderRadius: 999,
        cursor: disabled || busy ? 'not-allowed' : 'pointer',
        opacity: disabled || busy ? 0.55 : 1,
        userSelect: 'none',
        WebkitUserSelect: 'none',
        transition: 'background 140ms ease, transform 120ms ease',
        transform: holding ? 'scale(0.97)' : 'scale(1)',
        boxShadow: holding ? `0 0 24px ${inkstashColors.brand}66` : 'none',
        outline: 'none',
        '&:focus-visible': {
          boxShadow: `0 0 0 3px ${inkstashColors.brand}40`,
        },
      }}
    >
      <Box
        sx={{
          position: 'relative',
          width: 40,
          height: 40,
          flexShrink: 0,
          display: 'grid',
          placeItems: 'center',
        }}
      >
        <Box
          component="svg"
          viewBox="0 0 64 64"
          sx={{
            position: 'absolute',
            inset: 0,
            transform: 'rotate(-90deg)',
            pointerEvents: 'none',
          }}
        >
          <circle
            cx={32}
            cy={32}
            r={28}
            fill="none"
            stroke="rgba(255,255,255,0.22)"
            strokeWidth={4}
          />
          <circle
            cx={32}
            cy={32}
            r={28}
            fill="none"
            stroke="#fff"
            strokeWidth={4}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashoffset}
            style={{
              transition: holding ? 'none' : 'stroke-dashoffset 200ms ease-out',
            }}
          />
        </Box>
        <Sparkles size={16} color="#fff" />
      </Box>
      <Box
        sx={{
          fontFamily: inkstashFonts.ui,
          fontWeight: 700,
          fontSize: 14,
          letterSpacing: '0.02em',
          lineHeight: 1,
        }}
      >
        {label}
      </Box>
    </Box>
  );
}
