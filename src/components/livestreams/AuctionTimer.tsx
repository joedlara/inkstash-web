// src/components/livestreams/AuctionTimer.tsx
//
// MM:SS-style countdown with a glowing leading dot, per .ac-timer in
// docs/design-system/live_stream/stream.css.
//
//   Normal:  amber #FFC53D w/ glow dot
//   Urgent:  red #FF5B5B, blinks every 1s (final ≤3s)
//   Sold:    green #5BD08A, no dot, label "SOLD"
//
// Parent supplies `secondsRemaining` (computed against bidding_ends_at
// every render) and the lot status. This component only handles
// presentation + the blink animation.

import { Box, GlobalStyles } from '@mui/material';
import { inkstashFonts } from '../../theme/inkstashTokens';

interface Props {
  secondsRemaining: number | null;
  status: 'live' | 'sold' | 'passed';
  bidActive: boolean;
}

const blinkKeyframes = (
  <GlobalStyles
    styles={{
      '@keyframes inkstashAcBlink': {
        '50%': { opacity: 0.35 },
      },
    }}
  />
);

export default function AuctionTimer({ secondsRemaining, status, bidActive }: Props) {
  const sold = status === 'sold';
  const urgent = bidActive && (secondsRemaining ?? 0) <= 3 && (secondsRemaining ?? 0) > 0;

  const color = sold ? '#5BD08A' : urgent ? '#FF5B5B' : '#FFC53D';
  const label = sold
    ? 'SOLD'
    : bidActive && secondsRemaining != null
      ? `00:${String(secondsRemaining).padStart(2, '0')}`
      : status === 'passed' ? 'PASSED' : '--:--';

  return (
    <>
      {blinkKeyframes}
      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.65,
          fontFamily: inkstashFonts.mono,
          fontSize: 14,
          fontWeight: 700,
          fontVariantNumeric: 'tabular-nums',
          color,
          letterSpacing: '0.02em',
          animation: urgent ? 'inkstashAcBlink 1s steps(2, jump-none) infinite' : 'none',
        }}
      >
        {!sold && (
          <Box
            component="span"
            sx={{
              width: 7,
              height: 7,
              borderRadius: 999,
              bgcolor: 'currentColor',
              boxShadow: '0 0 6px currentColor',
            }}
          />
        )}
        {label}
      </Box>
    </>
  );
}
