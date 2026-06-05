// src/components/creatorHub/composer/PhotoEditor.tsx
//
// Minimal photo picker for composer thumbnails (Step 1 hero thumb +
// Step 2 per-lot photos). Upload, replace, remove. No filters, no
// caption overlay — those were stripped 2026-06-05 to simplify the
// composer. Photo is held as a data URL in state; uploaded to Supabase
// Storage at publish time (see uploadPhoto.ts).

import { useRef } from 'react';
import { Box, ButtonBase, Typography } from '@mui/material';
import { Image as ImageIcon } from 'lucide-react';
import { inkstashColors, inkstashFonts, inkstashRadii } from '../../../theme/inkstashTokens';

export interface Photo {
  /** Data URL while editing; public URL after upload. Empty = no photo. */
  src: string;
}

export const BLANK_PHOTO: Photo = { src: '' };

interface Props {
  photo: Photo;
  onChange: (next: Photo) => void;
  /** CSS aspect-ratio for the stage. '4 / 5' for thumbs, '1 / 1' for lots. */
  ratio?: string;
  /** Compact = smaller upload prompt. Used in the Run-of-Show add form
   *  where the slot is only 92px wide. */
  compact?: boolean;
}

export default function PhotoEditor({
  photo, onChange, ratio = '4 / 5', compact = false,
}: Props) {
  const fileRef = useRef<HTMLInputElement | null>(null);

  function pickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      if (typeof r.result === 'string') onChange({ src: r.result });
    };
    r.readAsDataURL(f);
    e.target.value = '';
  }

  return (
    <Box>
      <Box
        onClick={() => !photo.src && fileRef.current?.click()}
        sx={{
          position: 'relative',
          aspectRatio: ratio,
          borderRadius: inkstashRadii.lg,
          overflow: 'hidden',
          bgcolor: inkstashColors.bgSunken,
          border: `1px dashed ${photo.src ? 'transparent' : inkstashColors.border}`,
          cursor: photo.src ? 'default' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        {photo.src ? (
          <>
            <Box component="img"
              src={photo.src}
              alt=""
              sx={{
                position: 'absolute', inset: 0,
                width: '100%', height: '100%',
                objectFit: 'cover',
              }}
            />
            <Box sx={{
              position: 'absolute', bottom: 8, right: 8,
              display: 'flex', gap: 0.5,
            }}>
              <StageBtn onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }}>
                Replace
              </StageBtn>
              <StageBtn onClick={(e) => { e.stopPropagation(); onChange(BLANK_PHOTO); }} tone="danger">
                Remove
              </StageBtn>
            </Box>
          </>
        ) : (
          <Box sx={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            color: inkstashColors.muted, textAlign: 'center', px: 2,
          }}>
            <ImageIcon size={compact ? 22 : 26} strokeWidth={1.7} />
            <Typography sx={{
              mt: 1, fontFamily: inkstashFonts.ui, fontSize: compact ? 11.5 : 13, fontWeight: 600,
              color: inkstashColors.ink,
            }}>
              Add a photo
            </Typography>
            {!compact && (
              <Typography sx={{
                fontFamily: inkstashFonts.mono, fontSize: 10, textTransform: 'uppercase',
                letterSpacing: '0.06em', color: inkstashColors.muted, mt: 0.25,
              }}>
                JPG or PNG
              </Typography>
            )}
          </Box>
        )}
      </Box>
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={pickFile} />
    </Box>
  );
}

function StageBtn({
  children, onClick, tone = 'neutral',
}: {
  children: React.ReactNode;
  onClick: (e: React.MouseEvent) => void;
  tone?: 'neutral' | 'danger';
}) {
  return (
    <ButtonBase
      onClick={onClick}
      sx={{
        px: 1.25, py: 0.5, borderRadius: 999,
        fontFamily: inkstashFonts.ui, fontSize: 11.5, fontWeight: 700,
        bgcolor: 'rgba(8,7,10,0.55)',
        border: '1px solid rgba(255,255,255,0.18)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        color: tone === 'danger' ? '#FF8585' : '#fff',
        '&:hover': { bgcolor: 'rgba(8,7,10,0.75)' },
      }}
    >
      {children}
    </ButtonBase>
  );
}
