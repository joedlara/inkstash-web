// src/components/listings/PublisherBadge.tsx
//
// Color-coded chip for the comic publisher. Keyed off the canonical
// listing.comic_publisher value (already populated by the comic catalog
// search step). Each major publisher gets its brand palette; everything
// else falls back to a neutral chip so unknown indies don't look broken.

import { Box, Typography } from '@mui/material';
import { inkstashFonts } from '../../theme/inkstashTokens';

type Palette = { bg: string; fg: string; border: string };

// Hand-picked palettes calibrated against the warm cream app background.
// Saturated enough to read at chip size, never garish.
const PUBLISHER_PALETTES: Record<string, Palette> = {
  marvel:     { bg: '#FCE7E7', fg: '#B11F26', border: '#F1B7B7' },
  dc:         { bg: '#E3ECFA', fg: '#0C4FAF', border: '#B9CFEC' },
  image:      { bg: '#EAEAEA', fg: '#16110E', border: '#C6C6C6' },
  idw:        { bg: '#FFF3D1', fg: '#7A5A00', border: '#EBD78A' },
  darkhorse:  { bg: '#E1ECE5', fg: '#1F5A38', border: '#B6D1C0' },
  boom:       { bg: '#DEF1F0', fg: '#0E6562', border: '#A6D7D4' },
  valiant:    { bg: '#E9E2F1', fg: '#4A2D7E', border: '#C8B8DD' },
  dynamite:   { bg: '#FDE7D9', fg: '#A14613', border: '#F5C19B' },
  fallback:   { bg: '#F2EDE5', fg: '#3A302A', border: '#D6CABA' },
};

/** Map free-form publisher strings to a palette key. Loose contains() match
 *  so "Marvel Comics", "MARVEL", "Marvel Worldwide" all hit the marvel palette. */
function paletteKey(raw: string): keyof typeof PUBLISHER_PALETTES {
  const lower = raw.toLowerCase();
  if (lower.includes('marvel')) return 'marvel';
  if (lower.includes('dc')) return 'dc';
  if (lower.includes('image')) return 'image';
  if (lower.includes('idw')) return 'idw';
  if (lower.includes('dark horse') || lower.includes('darkhorse')) return 'darkhorse';
  if (lower.includes('boom')) return 'boom';
  if (lower.includes('valiant')) return 'valiant';
  if (lower.includes('dynamite')) return 'dynamite';
  return 'fallback';
}

interface Props {
  publisher: string | null | undefined;
  size?: 'sm' | 'md';
}

export default function PublisherBadge({ publisher, size = 'sm' }: Props) {
  if (!publisher) return null;
  const palette = PUBLISHER_PALETTES[paletteKey(publisher)];
  const isMd = size === 'md';

  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        px: isMd ? 1.2 : 0.85,
        py: isMd ? 0.35 : 0.2,
        borderRadius: 999,
        bgcolor: palette.bg,
        border: `1px solid ${palette.border}`,
        maxWidth: '100%',
        minWidth: 0,
      }}
    >
      <Typography
        sx={{
          fontFamily: inkstashFonts.mono,
          fontSize: isMd ? 11 : 9.5,
          fontWeight: 800,
          color: palette.fg,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          lineHeight: 1,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {publisher}
      </Typography>
    </Box>
  );
}
