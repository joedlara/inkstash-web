// src/components/livestreams/StreamDescriptionPill.tsx
//
// Sits under the HostPill on the viewer surface. Click to expand the
// host's description; tap again to collapse. Renders null when the
// host didn't set a description so it doesn't eat overlay space.
//
// Glass pill that matches HostPill's visual treatment (translucent dark
// with white text + subtle border) so the top-left cluster reads as
// one stack.

import { useEffect, useState } from 'react';
import { Box, ButtonBase, Typography } from '@mui/material';
import { ChevronDown } from 'lucide-react';
import { inkstashFonts } from '../../theme/inkstashTokens';

interface Props {
  description: string | null | undefined;
}

// Auto-dismiss after this many ms unless the user has interacted
// (tapped to expand). Per QA: "if someone enters a stream, it'll
// pop up, and then it'll fade out after five seconds."
const AUTO_DISMISS_MS = 5000;
// Fade-out duration; matches the CSS transition below.
const FADE_MS = 320;

export default function StreamDescriptionPill({ description }: Props) {
  const [open, setOpen] = useState(false);
  // Three-stage lifecycle: visible (full opacity) → fading (transition)
  // → hidden (unmounted). User interaction (expand) pins it visible.
  const [visible, setVisible] = useState(true);
  const [interacted, setInteracted] = useState(false);
  // After fade completes, unmount entirely so the pill doesn't keep
  // intercepting hit-tests near the top-left of the stage.
  const [mounted, setMounted] = useState(true);
  const text = (description ?? '').trim();

  useEffect(() => {
    if (!text || interacted) return;
    const fadeTimer = window.setTimeout(() => setVisible(false), AUTO_DISMISS_MS);
    return () => window.clearTimeout(fadeTimer);
  }, [text, interacted]);

  useEffect(() => {
    if (visible) return;
    const id = window.setTimeout(() => setMounted(false), FADE_MS);
    return () => window.clearTimeout(id);
  }, [visible]);

  if (!text || !mounted) return null;

  return (
    <ButtonBase
      onClick={() => {
        setInteracted(true);
        setVisible(true);
        setOpen((v) => !v);
      }}
      aria-expanded={open}
      sx={{
        display: 'block',
        textAlign: 'left',
        maxWidth: 320,
        opacity: visible ? 1 : 0,
        bgcolor: 'rgba(10,10,10,0.32)',
        border: '1px solid rgba(255,255,255,0.22)',
        backdropFilter: 'blur(6px) saturate(160%)',
        WebkitBackdropFilter: 'blur(6px) saturate(160%)',
        borderRadius: open ? 1.5 : 999,
        px: 1.25,
        py: 0.75,
        color: '#fff',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25), 0 6px 18px -6px rgba(0,0,0,0.4)',
        transition: `border-radius 200ms cubic-bezier(0.23, 1, 0.32, 1), opacity ${FADE_MS}ms ease-out`,
        '&:hover': { bgcolor: 'rgba(10,10,10,0.42)' },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
        <Typography
          sx={{
            fontFamily: inkstashFonts.ui,
            fontSize: 12,
            fontWeight: 600,
            color: '#fff',
            lineHeight: 1.4,
            textShadow: '0 1px 2px rgba(0,0,0,0.4)',
            overflow: open ? 'visible' : 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: open ? 'normal' : 'nowrap',
            maxWidth: open ? '100%' : 240,
          }}
        >
          {text}
        </Typography>
        <Box
          sx={{
            display: 'inline-flex',
            color: 'rgba(255,255,255,0.7)',
            transition: 'transform 200ms ease',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            flexShrink: 0,
          }}
        >
          <ChevronDown size={14} />
        </Box>
      </Box>
    </ButtonBase>
  );
}
