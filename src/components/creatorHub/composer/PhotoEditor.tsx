// src/components/creatorHub/composer/PhotoEditor.tsx
//
// Instagram-style photo editor for composer thumbnails (Step 1 hero
// thumb + Step 2 per-lot photos). Upload an image, pick a CSS filter
// preset, optionally overlay editable text (color + top/center/bottom
// position). Photo is held as a data URL in component state; uploading
// to Supabase Storage happens at publish time (see // TODO(upload)).
//
// Per the design's PhotoEditor in hub-golive.jsx.

import { useRef } from 'react';
import { Box, ButtonBase, TextField, Typography } from '@mui/material';
import { Image as ImageIcon } from 'lucide-react';
import { inkstashColors, inkstashFonts, inkstashRadii } from '../../../theme/inkstashTokens';

export interface Photo {
  /** Data URL after upload — empty string when no photo set. */
  src: string;
  /** CSS `filter` string ('none' = unfiltered). */
  filter: string;
  /** Optional caption rendered over the photo. */
  text: string;
  /** Caption color hex. */
  color: string;
  /** Caption anchor. */
  pos: 'top' | 'center' | 'bottom';
}

export const BLANK_PHOTO: Photo = {
  src: '', filter: 'none', text: '', color: '#FFFFFF', pos: 'bottom',
};

const FILTERS: { id: string; name: string }[] = [
  { id: 'none',                                                          name: 'Normal' },
  { id: 'grayscale(1)',                                                  name: 'Mono' },
  { id: 'sepia(.45) saturate(1.5) contrast(1.05)',                       name: 'Warm' },
  { id: 'hue-rotate(-12deg) saturate(1.3) brightness(1.04)',             name: 'Cool' },
  { id: 'saturate(1.9) contrast(1.12)',                                  name: 'Vivid' },
  { id: 'contrast(.9) brightness(1.12) saturate(.8)',                    name: 'Fade' },
  { id: 'grayscale(1) contrast(1.35) brightness(.95)',                   name: 'Noir' },
];

const TEXT_COLORS = ['#FFFFFF', '#16110E', '#A1232C', '#B8893A', '#2A85FF', '#FFD24A'];

interface Props {
  photo: Photo;
  onChange: (next: Photo) => void;
  /** CSS aspect-ratio for the stage. '4 / 5' for thumbs, '1 / 1' for lots. */
  ratio?: string;
  /** Compact = smaller filter swatches + no text-row labels. Used in the
   *  Run-of-Show add form where the slot is only 92px wide. */
  compact?: boolean;
}

export default function PhotoEditor({
  photo, onChange, ratio = '4 / 5', compact = false,
}: Props) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const set = (patch: Partial<Photo>) => onChange({ ...photo, ...patch });

  function pickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      if (typeof r.result === 'string') set({ src: r.result });
    };
    r.readAsDataURL(f);
    // Reset value so the same file can be picked again after Remove
    e.target.value = '';
  }

  return (
    <Box>
      {/* Stage — the photo (or upload prompt) */}
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
                filter: photo.filter,
              }}
            />
            {photo.text && (
              <Box sx={{
                position: 'absolute',
                left: 0, right: 0,
                ...(photo.pos === 'top'
                  ? { top: 12 }
                  : photo.pos === 'center'
                    ? { top: '50%', transform: 'translateY(-50%)' }
                    : { bottom: 12 }),
                px: 1.5,
                textAlign: 'center',
                color: photo.color,
                fontFamily: inkstashFonts.display,
                fontWeight: 900,
                fontSize: compact ? 13 : 18,
                textTransform: 'uppercase',
                letterSpacing: '0.02em',
                lineHeight: 1.1,
                textShadow: photo.color === '#FFFFFF' || photo.color === '#FFD24A'
                  ? '0 2px 8px rgba(0,0,0,0.55)'
                  : '0 1px 2px rgba(255,255,255,0.55)',
                pointerEvents: 'none',
              }}>
                {photo.text}
              </Box>
            )}
            {/* Replace / Remove */}
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

      {/* Tools — only when a photo exists */}
      {photo.src && (
        <Box sx={{ mt: 1.5, display: 'flex', flexDirection: 'column', gap: 1.25 }}>
          {/* Filter strip */}
          <Box sx={{
            display: 'flex', gap: 0.75,
            overflowX: 'auto', pb: 0.5,
            scrollbarWidth: 'thin',
          }}>
            {FILTERS.map((f) => (
              <FilterChip
                key={f.id}
                active={photo.filter === f.id}
                onClick={() => set({ filter: f.id })}
                src={photo.src}
                filter={f.id}
                name={f.name}
                compact={compact}
              />
            ))}
          </Box>

          {/* Text + color row */}
          {!compact && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <TextField
                size="small"
                value={photo.text}
                onChange={(e) => set({ text: e.target.value })}
                placeholder="Add text on photo…"
                inputProps={{ maxLength: 40 }}
                sx={{
                  flex: '1 1 200px',
                  '& .MuiInputBase-root': {
                    fontFamily: inkstashFonts.ui, fontSize: 13,
                    bgcolor: inkstashColors.bgSunken, borderRadius: 1.25,
                  },
                  '& fieldset': { borderColor: inkstashColors.border },
                }}
              />
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                {TEXT_COLORS.map((c) => (
                  <ButtonBase
                    key={c}
                    onClick={() => set({ color: c })}
                    aria-label={`Color ${c}`}
                    sx={{
                      width: 24, height: 24, borderRadius: '50%',
                      bgcolor: c,
                      border: c === '#FFFFFF' ? `1px solid ${inkstashColors.border}` : '1px solid transparent',
                      outline: photo.color === c ? `2px solid ${inkstashColors.ink}` : 'none',
                      outlineOffset: 1,
                      transition: 'transform 120ms ease',
                      '&:hover': { transform: 'scale(1.08)' },
                    }}
                  />
                ))}
              </Box>
            </Box>
          )}

          {/* Position selector — only when text is set */}
          {!compact && photo.text && (
            <Box sx={{
              display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0,
              bgcolor: inkstashColors.bgSunken,
              border: `1px solid ${inkstashColors.border}`,
              borderRadius: 999,
              p: 0.4,
            }}>
              {(['top', 'center', 'bottom'] as const).map((pos) => {
                const active = photo.pos === pos;
                return (
                  <ButtonBase
                    key={pos}
                    onClick={() => set({ pos })}
                    sx={{
                      py: 0.65,
                      borderRadius: 999,
                      bgcolor: active ? inkstashColors.ink : 'transparent',
                      color: active ? '#fff' : inkstashColors.ink2,
                      fontFamily: inkstashFonts.ui,
                      fontWeight: 600,
                      fontSize: 12,
                      textTransform: 'capitalize',
                      transition: 'background-color 120ms ease, color 120ms ease',
                    }}
                  >
                    {pos}
                  </ButtonBase>
                );
              })}
            </Box>
          )}
        </Box>
      )}
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

function FilterChip({
  active, onClick, src, filter, name, compact,
}: {
  active: boolean;
  onClick: () => void;
  src: string;
  filter: string;
  name: string;
  compact: boolean;
}) {
  const size = compact ? 36 : 48;
  return (
    <ButtonBase
      onClick={onClick}
      sx={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.4,
        flexShrink: 0,
        p: 0.4,
        borderRadius: 1.5,
        bgcolor: active ? inkstashColors.bgSunken : 'transparent',
        border: `1px solid ${active ? inkstashColors.borderStrong : 'transparent'}`,
        '&:hover': { bgcolor: inkstashColors.bgSunken },
      }}
    >
      <Box sx={{
        width: size, height: size, borderRadius: 1,
        backgroundImage: `url(${src})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        filter,
        outline: active ? `2px solid ${inkstashColors.brand}` : 'none',
        outlineOffset: -2,
      }} />
      <Typography sx={{
        fontFamily: inkstashFonts.mono, fontSize: 9.5, fontWeight: 600,
        color: active ? inkstashColors.ink : inkstashColors.muted,
        textTransform: 'uppercase', letterSpacing: '0.04em',
        lineHeight: 1,
      }}>
        {name}
      </Typography>
    </ButtonBase>
  );
}
