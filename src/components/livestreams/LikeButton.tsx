// src/components/livestreams/LikeButton.tsx
//
// Bottom of the right action rail. Tap → fires a like and renders
// a count below the icon. Per the redesign spec the count is
// formatted with k/m suffixes for big numbers (e.g. 1.2k, 12k).
//
// Both the tap detection AND the heart animation are owned by
// useStreamTaps in the page. This button is intentionally dumb —
// it dispatches a global `inkstash:like-from-button` event and the
// page's tap-layer handles the rest, so the like count + heart
// stays consistent across surfaces.

import { useEffect, useRef, useState } from 'react';
import { ButtonBase, Typography } from '@mui/material';
import { Heart } from 'lucide-react';
import { supabase } from '../../api/supabase/supabaseClient';
import { inkstashColors, inkstashFonts } from '../../theme/inkstashTokens';

interface Props {
  livestreamId: string;
}

function formatLikes(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'm';
  if (n >= 1000) return (n / 1000).toFixed(n >= 10_000 ? 0 : 1).replace(/\.0$/, '') + 'k';
  return String(n);
}

export default function LikeButton({ livestreamId }: Props) {
  const btnRef = useRef<HTMLButtonElement | null>(null);
  // Mirror the shared count tracked by useStreamTaps. The hook
  // hydrates from count_livestream_likes RPC + subscribes to
  // realtime INSERTs and broadcasts via inkstash:likes-changed —
  // we just listen.
  const [likes, setLikes] = useState<number>(0);

  // Hydrate independently so the button isn't blank for the brief
  // window before the hook's broadcast fires.
  useEffect(() => {
    let cancelled = false;
    supabase.rpc('count_livestream_likes', { p_livestream_id: livestreamId })
      .then(({ data, error }) => {
        if (cancelled || error || data == null) return;
        setLikes(Number(data));
      });
    return () => { cancelled = true; };
  }, [livestreamId]);

  useEffect(() => {
    const onLikeChange = (e: Event) => {
      const detail = (e as CustomEvent<{ livestreamId: string; likes: number }>).detail;
      if (detail?.livestreamId === livestreamId) setLikes(detail.likes);
    };
    window.addEventListener('inkstash:likes-changed', onLikeChange);
    return () => window.removeEventListener('inkstash:likes-changed', onLikeChange);
  }, [livestreamId]);

  function handleClick() {
    const rect = btnRef.current?.getBoundingClientRect();
    window.dispatchEvent(new CustomEvent('inkstash:like-from-button', {
      detail: { livestreamId, anchorRect: rect ?? null },
    }));
  }

  return (
    <ButtonBase
      ref={btnRef}
      onClick={handleClick}
      aria-label="Like this stream"
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 0.6,
        pl: 1.1,
        pr: 1.4,
        py: 0.85,
        borderRadius: 999,
        bgcolor: likes > 0 ? 'rgba(201,67,76,0.22)' : 'rgba(10,10,10,0.38)',
        border: `1px solid ${likes > 0 ? 'rgba(201,67,76,0.55)' : 'rgba(255,255,255,0.18)'}`,
        backdropFilter: 'blur(5px) saturate(160%)',
        WebkitBackdropFilter: 'blur(5px) saturate(160%)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.22), 0 4px 14px -4px rgba(0,0,0,0.45)',
        color: likes > 0 ? inkstashColors.brand : '#fff',
        textShadow: '0 1px 2px rgba(0,0,0,0.5)',
        transition: 'transform 120ms cubic-bezier(0.23, 1, 0.32, 1), background-color 160ms ease',
        '&:hover': {
          bgcolor: likes > 0 ? 'rgba(201,67,76,0.3)' : 'rgba(10,10,10,0.55)',
        },
        '&:active': { transform: 'scale(0.96)' },
      }}
    >
      <Heart size={17} strokeWidth={2.4} fill={likes > 0 ? 'currentColor' : 'none'} />
      <Typography
        sx={{
          fontFamily: inkstashFonts.mono,
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.02em',
          lineHeight: 1,
        }}
      >
        {formatLikes(likes)}
      </Typography>
    </ButtonBase>
  );
}
