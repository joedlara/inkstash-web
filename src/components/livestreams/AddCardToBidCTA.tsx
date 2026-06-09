// src/components/livestreams/AddCardToBidCTA.tsx
//
// Shown in place of SlideToBid when the viewer has no card on file.
// Tapping opens the WalletDrawer with autoOpenAddCard=true via the
// inkstash:open-wallet custom event — same path the bid-failure
// fallback uses, just surfaced up front so the viewer doesn't drag
// the slider only to hit a wallet prompt.

import { Box, Typography } from '@mui/material';
import { CreditCard, ChevronsRight } from 'lucide-react';
import { inkstashColors, inkstashFonts } from '../../theme/inkstashTokens';

interface Props {
  /** Friendly note about the next-bid amount, e.g. "Bid $3 once a
   *  card is saved". Optional — the CTA reads fine without it. */
  nextBidLabel?: string;
}

const HEIGHT = 52;

export default function AddCardToBidCTA({ nextBidLabel }: Props) {
  function handleOpen() {
    window.dispatchEvent(new CustomEvent('inkstash:open-wallet', {
      detail: { autoOpenAddCard: true },
    }));
  }

  return (
    <Box
      component="button"
      type="button"
      onClick={handleOpen}
      sx={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 1,
        width: '100%',
        height: HEIGHT,
        borderRadius: 999,
        border: 0,
        bgcolor: inkstashColors.brand,
        background: `linear-gradient(90deg, ${inkstashColors.brand}, ${inkstashColors.brandDeep})`,
        boxShadow: '0 6px 16px -4px rgba(161,35,44,0.55)',
        cursor: 'pointer',
        color: '#fff',
        fontFamily: inkstashFonts.ui,
        fontWeight: 800,
        fontSize: 14.5,
        letterSpacing: '0.005em',
        transition: 'transform 120ms cubic-bezier(0.23, 1, 0.32, 1), background-color 160ms ease',
        '&:hover': { background: inkstashColors.brandDeep },
        '&:active': { transform: 'scale(0.985)' },
      }}
    >
      <CreditCard size={17} strokeWidth={2.4} />
      <Typography component="span" sx={{ fontWeight: 800, fontSize: 14.5, color: '#fff' }}>
        Add a card to bid{nextBidLabel ? ` (next: ${nextBidLabel})` : ''}
      </Typography>
      <ChevronsRight size={17} strokeWidth={2.4} />
    </Box>
  );
}
