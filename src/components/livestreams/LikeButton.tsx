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
  const storageKey = `inkstash.stream.likes.${livestreamId}`;
  const btnRef = useRef<HTMLButtonElement | null>(null);
  // Mirror the count that useStreamTaps writes so the button stays
  // in sync without a parent-passed prop. localStorage + a custom
  // event = cheap shared state.
  const [likes, setLikes] = useState<number>(() => {
    if (typeof window === 'undefined') return 0;
    return Number(localStorage.getItem(storageKey)) || 0;
  });

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== storageKey) return;
      setLikes(Number(e.newValue) || 0);
    };
    const onLikeChange = (e: Event) => {
      const detail = (e as CustomEvent<{ livestreamId: string; likes: number }>).detail;
      if (detail?.livestreamId === livestreamId) setLikes(detail.likes);
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('inkstash:likes-changed', onLikeChange);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('inkstash:likes-changed', onLikeChange);
    };
  }, [livestreamId, storageKey]);

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
