// src/components/livestreams/GiveawayBanner.tsx
//
// Standalone rounded card that sits above the chat rail. Shows the current
// giveaway entry count with a chevron to expand into the giveaway details.
// Stubbed at 0 entries until L4 raffles ships; when expanded with no
// giveaway data we show a "No giveaway running right now" empty state.

import { useState } from 'react';
import { Box, ButtonBase, Collapse, Typography } from '@mui/material';
import { ChevronDown, Gift } from 'lucide-react';
import { inkstashColors, inkstashFonts, inkstashRadii } from '../../theme/inkstashTokens';

interface Props {
  entryCount?: number;
  /** When provided, the expanded panel shows the item up for grabs and an
   *  "Enter giveaway" CTA. Without it the panel is an empty-state hint. */
  giveawayItemName?: string;
}

export default function GiveawayBanner({ entryCount = 0, giveawayItemName }: Props) {
  const [open, setOpen] = useState(false);
  const hasGiveaway = !!giveawayItemName;

  return (
    <Box
      sx={{
        bgcolor: inkstashColors.bgElev,
        border: `1px solid ${inkstashColors.border}`,
        borderRadius: 'inherit',
        overflow: 'hidden',
        transition: 'border-color 160ms cubic-bezier(0.23, 1, 0.32, 1)',
        '&:hover': { borderColor: inkstashColors.borderStrong },
      }}
    >
      <ButtonBase
        onClick={() => setOpen((v) => !v)}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          gap: 1,
          px: 1.5,
          py: 1.25,
          textAlign: 'left',
        }}
        aria-expanded={open}
      >
        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.85, minWidth: 0 }}>
          <Box
            sx={{
              width: 26,
              height: 26,
              borderRadius: 1,
              bgcolor: inkstashColors.brandSoft,
              color: inkstashColors.brand,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Gift size={15} strokeWidth={2.2} />
          </Box>
          <Typography
            sx={{
              fontFamily: inkstashFonts.ui,
              fontSize: 13,
              fontWeight: 700,
              color: inkstashColors.ink,
              letterSpacing: '-0.005em',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            Giveaway with {entryCount} {entryCount === 1 ? 'entry' : 'entries'}
          </Typography>
        </Box>
        <Box
          sx={{
            display: 'inline-flex',
            color: inkstashColors.muted,
            transition: 'transform 200ms ease',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        >
          <ChevronDown size={18} />
        </Box>
      </ButtonBase>

      <Collapse in={open} timeout={220}>
        <Box sx={{ p: 1.5, pt: 0, borderTop: `1px solid ${inkstashColors.border}` }}>
          {hasGiveaway ? (
            <>
              <Typography
                sx={{
                  mt: 1.5,
                  fontFamily: inkstashFonts.display,
                  fontWeight: 900,
                  fontSize: 17,
                  textTransform: 'uppercase',
                  letterSpacing: '0.01em',
                  color: inkstashColors.ink,
                  lineHeight: 1.2,
                  mb: 1.5,
                }}
              >
                {giveawayItemName}
              </Typography>
              <ButtonBase
                sx={{
                  width: '100%',
                  py: 1.25,
                  borderRadius: inkstashRadii.md,
                  bgcolor: inkstashColors.ink,
                  color: '#fff',
                  fontFamily: inkstashFonts.ui,
                  fontSize: 13,
                  fontWeight: 700,
                  letterSpacing: '0.02em',
                  textTransform: 'uppercase',
                  transition: 'background-color 120ms ease',
                  '&:hover': { bgcolor: '#000' },
                }}
              >
                Enter giveaway
              </ButtonBase>
              <Typography
                sx={{
                  fontFamily: inkstashFonts.ui,
                  fontSize: 11.5,
                  color: inkstashColors.muted,
                  textAlign: 'center',
                  mt: 1,
                  textDecoration: 'underline',
                  cursor: 'pointer',
                }}
              >
                Terms & Conditions
              </Typography>
            </>
          ) : (
            <Typography
              sx={{
                mt: 1.5,
                fontFamily: inkstashFonts.ui,
                fontSize: 12.5,
                color: inkstashColors.muted,
                lineHeight: 1.5,
              }}
            >
              No giveaway running right now. The host can launch one any time during the stream.
            </Typography>
          )}
        </Box>
      </Collapse>
    </Box>
  );
}
