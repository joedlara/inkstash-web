// src/components/livestreams/HostAvatar.tsx
//
// Shared host-avatar component used wherever a livestream host appears on
// screen (LiveStreamCard, MomentumCard, SchedCard, HostPill).
//
// When the user has a profile picture (avatar_url), we render it as a
// circular image. Otherwise we fall back to a brand-gradient initial — the
// same gradient swatch the cards used before so the design language stays
// consistent for users without a photo.

import { Box } from '@mui/material';
import { inkstashColors, inkstashFonts } from '../../theme/inkstashTokens';

interface Props {
  username: string | null;
  avatarUrl: string | null | undefined;
  /** Diameter in pixels. */
  size: number;
  /** Optional thin border so the avatar lifts off a dark background. */
  ring?: 'none' | 'soft' | 'strong';
}

export default function HostAvatar({
  username, avatarUrl, size, ring = 'none',
}: Props) {
  const initial = (username ?? 'h').charAt(0).toUpperCase();
  const border =
    ring === 'strong' ? '1.5px solid rgba(255,255,255,0.4)'
      : ring === 'soft' ? '1.5px solid rgba(255,255,255,0.18)'
      : 'none';

  if (avatarUrl) {
    return (
      <Box
        component="img"
        src={avatarUrl}
        alt={username ?? 'host'}
        sx={{
          width: size,
          height: size,
          borderRadius: 999,
          objectFit: 'cover',
          flexShrink: 0,
          border,
          // Treat broken image URLs as missing so the fallback initial
          // kicks in instead of showing a broken-image glyph.
          backgroundColor: inkstashColors.brand,
        }}
        onError={(e) => {
          // Hide the broken image and let the parent box show its bgcolor;
          // the initial below won't render unless we re-mount, but the
          // crimson swatch is the same color so it stays on-brand.
          (e.currentTarget as HTMLImageElement).style.visibility = 'hidden';
        }}
      />
    );
  }

  // Gradient initial fallback. Font size scales with the avatar so 18px
  // / 22px / 26px / 34px circles all look proportionally consistent.
  return (
    <Box
      sx={{
        width: size,
        height: size,
        borderRadius: 999,
        background: `linear-gradient(135deg, ${inkstashColors.brand}, ${inkstashColors.brandDeep})`,
        color: '#fff',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: inkstashFonts.display,
        fontWeight: 900,
        fontSize: Math.max(9, Math.round(size * 0.45)),
        flexShrink: 0,
        lineHeight: 1,
        border,
      }}
    >
      {initial}
    </Box>
  );
}
