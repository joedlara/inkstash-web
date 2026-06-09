// src/components/livestreams/AuctionStatusLine.tsx
//
// One-line status above the auction card, per the live-stream
// redesign (.ac-status in docs/design-system/live_stream/stream.css):
//
//   [avatar] @username is winning!
//   [avatar] @username won!
//   [•]      On the block · no bids yet
//
// The username always renders in the chatter's deterministic color
// (USERNAME_COLORS) so the eye can track the same person between
// chat and auction. Avatar is a 20px circle: real avatar_url if we
// have one, otherwise a colored initial bubble.

import { Box } from '@mui/material';
import { colorForUsername } from './usernameColor';
import { inkstashColors, inkstashFonts } from '../../theme/inkstashTokens';

interface Props {
  /** Winner's username from useWinnerUsername. Null while loading or
   *  when there's no current winner yet. */
  username: string | null;
  /** Optional avatar to render instead of the initial bubble. */
  avatarUrl?: string | null;
  /** Sold = "won!" (green), bidding = "is winning!" (amber), live but
   *  no bids = "no bids yet" (muted). */
  state: 'sold' | 'winning' | 'no_bids';
}

export default function AuctionStatusLine({ username, avatarUrl, state }: Props) {
  const showWinner = !!username && state !== 'no_bids';
  const color = colorForUsername(username);
  const initial = (username ?? '•')[0]?.toUpperCase() ?? '•';

  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.9,
        fontSize: 13,
        lineHeight: 1,
        color: '#fff',
      }}
    >
      <Box
        sx={{
          width: 20,
          height: 20,
          borderRadius: 999,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: inkstashFonts.display,
          fontWeight: 900,
          fontSize: 10,
          color: '#fff',
          boxShadow: '0 1px 4px rgba(0,0,0,0.5)',
          ...(avatarUrl
            ? {
                backgroundImage: `url(${avatarUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }
            : {
                background: showWinner ? color : inkstashColors.brand,
              }),
        }}
      >
        {avatarUrl ? '' : initial}
      </Box>
      {showWinner ? (
        <>
          <Box
            component="span"
            sx={{ fontWeight: 700, color, textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}
          >
            {username}
          </Box>
          <Box
            component="span"
            sx={{
              fontFamily: inkstashFonts.mono,
              fontSize: 11,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: state === 'sold' ? '#5BD08A' : '#FFC53D',
            }}
          >
            {state === 'sold' ? 'won!' : 'is winning!'}
          </Box>
        </>
      ) : (
        <>
          <Box component="span" sx={{ fontWeight: 700 }}>On the block</Box>
          <Box
            component="span"
            sx={{
              fontFamily: inkstashFonts.mono,
              fontSize: 11,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: '#FFC53D',
            }}
          >
            no bids yet
          </Box>
        </>
      )}
    </Box>
  );
}
