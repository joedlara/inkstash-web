// src/components/livestreams/host/PreStreamQueue.tsx
//
// Pre-stream item queue. Opens a modal showing the host's active marketplace
// listings; the host multi-selects which ones to queue. Selected items
// render as an ordered vertical strip below the "Add items" button, with
// a remove (×) button on each tile. Order is the same order the items were
// added — drag-reorder ships in Phase 2.
//
// The queue itself isn't persisted here; the parent passes it to
// livestreamsAPI.start({ queue: [...] }), which writes the rows.

import { useEffect, useState } from 'react';
import {
  Box, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  Checkbox, Typography, IconButton,
} from '@mui/material';
import { Add, Close, RemoveCircleOutline } from '@mui/icons-material';
import { supabase } from '../../../api/supabase/supabaseClient';
import { useAuth } from '../../../hooks/useAuth';
import { PLACEHOLDER_IMAGE_URL } from '../../../utils/placeholders';
import { inkstashColors, inkstashRadii , inkstashFonts} from '../../../theme/inkstashTokens';

interface ListingOption {
  id: string;
  title: string;
  buy_now_price: number | null;
  photos: Array<{ url?: string }> | null;
}

interface Props {
  /** Listing IDs in queue order. */
  value: string[];
  onChange: (next: string[]) => void;
}

export default function PreStreamQueue({ value, onChange }: Props) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [listings, setListings] = useState<ListingOption[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('listings')
        .select('id, title, buy_now_price, photos')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(100);
      if (cancelled) return;
      setListings((data ?? []) as ListingOption[]);
      setLoaded(true);
    })();
    return () => { cancelled = true; };
  }, [user]);

  const byId = new Map(listings.map((l) => [l.id, l]));
  const selected = value.map((id) => byId.get(id)).filter(Boolean) as ListingOption[];

  function toggle(id: string) {
    if (value.includes(id)) onChange(value.filter((v) => v !== id));
    else onChange([...value, id]);
  }

  function remove(id: string) {
    onChange(value.filter((v) => v !== id));
  }

  return (
    <Box>
      <Button
        startIcon={<Add />}
        onClick={() => setOpen(true)}
        sx={{
          fontFamily: inkstashFonts.ui,
          fontSize: 13,
          fontWeight: 700,
          textTransform: 'none',
          letterSpacing: '-0.005em',
          color: inkstashColors.ink,
          bgcolor: inkstashColors.bgSunken,
          border: `1px dashed ${inkstashColors.border}`,
          borderRadius: inkstashRadii.md,
          px: 1.75,
          py: 1.25,
          width: '100%',
          justifyContent: 'flex-start',
          '&:hover': { bgcolor: inkstashColors.border, borderColor: inkstashColors.borderStrong },
        }}
      >
        Add items from inventory
      </Button>

      {selected.length > 0 && (
        <Box sx={{ mt: 1.5, display: 'flex', flexDirection: 'column', gap: 0.85 }}>
          {selected.map((l, i) => {
            const cover = l.photos?.[0]?.url ?? PLACEHOLDER_IMAGE_URL;
            return (
              <Box
                key={l.id}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: '28px 48px 1fr auto',
                  alignItems: 'center',
                  gap: 1.25,
                  bgcolor: inkstashColors.bgSunken,
                  borderRadius: inkstashRadii.md,
                  border: `1px solid ${inkstashColors.border}`,
                  px: 1.25,
                  py: 1,
                }}
              >
                <Typography
                  sx={{
                    fontFamily: inkstashFonts.ui,
                    fontWeight: 800,
                    fontSize: 13,
                    color: inkstashColors.muted,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {String(i + 1).padStart(2, '0')}
                </Typography>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: inkstashRadii.sm,
                    backgroundImage: `url(${cover})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    bgcolor: '#ddd',
                  }}
                />
                <Box sx={{ minWidth: 0 }}>
                  <Typography
                    sx={{
                      fontFamily: inkstashFonts.ui,
                      fontWeight: 700,
                      fontSize: 13,
                      color: inkstashColors.ink,
                      letterSpacing: '-0.005em',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {l.title}
                  </Typography>
                  {l.buy_now_price != null && (
                    <Typography
                      sx={{
                        fontFamily: inkstashFonts.ui,
                        fontSize: 11.5,
                        color: inkstashColors.muted,
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      ${Number(l.buy_now_price).toFixed(0)}
                    </Typography>
                  )}
                </Box>
                <IconButton
                  size="small"
                  onClick={() => remove(l.id)}
                  aria-label="Remove from queue"
                  sx={{ color: inkstashColors.muted, '&:hover': { color: inkstashColors.brand } }}
                >
                  <RemoveCircleOutline fontSize="small" />
                </IconButton>
              </Box>
            );
          })}
        </Box>
      )}

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        fullWidth
        maxWidth="sm"
        PaperProps={{ sx: { borderRadius: inkstashRadii.lg } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography
            sx={{
              fontFamily: inkstashFonts.ui,
              fontWeight: 900,
              fontSize: 20,
              letterSpacing: '-0.02em',
              color: inkstashColors.ink,
            }}
          >
            Add items
          </Typography>
          <IconButton onClick={() => setOpen(false)} size="small">
            <Close fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ maxHeight: 480 }}>
          {!loaded && (
            <Typography sx={{ color: inkstashColors.muted, fontSize: 13, p: 2, textAlign: 'center' }}>
              Loading your inventory…
            </Typography>
          )}
          {loaded && listings.length === 0 && (
            <Typography sx={{ color: inkstashColors.muted, fontSize: 13, p: 2, textAlign: 'center' }}>
              No active listings to add. List items from /list-item first.
            </Typography>
          )}
          {listings.map((l) => {
            const cover = l.photos?.[0]?.url ?? PLACEHOLDER_IMAGE_URL;
            const checked = value.includes(l.id);
            return (
              <Box
                key={l.id}
                onClick={() => toggle(l.id)}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: '42px 56px 1fr',
                  alignItems: 'center',
                  gap: 1.25,
                  py: 1,
                  cursor: 'pointer',
                  borderBottom: `1px solid ${inkstashColors.border}`,
                  '&:hover': { bgcolor: inkstashColors.bgSunken },
                }}
              >
                <Checkbox
                  checked={checked}
                  onChange={() => toggle(l.id)}
                  onClick={(e) => e.stopPropagation()}
                  sx={{
                    color: inkstashColors.muted,
                    '&.Mui-checked': { color: inkstashColors.brand },
                  }}
                />
                <Box
                  sx={{
                    width: 56,
                    height: 56,
                    borderRadius: inkstashRadii.sm,
                    backgroundImage: `url(${cover})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    bgcolor: '#ddd',
                  }}
                />
                <Box sx={{ minWidth: 0 }}>
                  <Typography
                    sx={{
                      fontFamily: inkstashFonts.ui,
                      fontWeight: 700,
                      fontSize: 13,
                      color: inkstashColors.ink,
                      letterSpacing: '-0.005em',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                    }}
                  >
                    {l.title}
                  </Typography>
                  {l.buy_now_price != null && (
                    <Typography
                      sx={{
                        fontFamily: inkstashFonts.ui,
                        fontSize: 12,
                        color: inkstashColors.muted,
                        mt: 0.25,
                      }}
                    >
                      ${Number(l.buy_now_price).toFixed(0)}
                    </Typography>
                  )}
                </Box>
              </Box>
            );
          })}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setOpen(false)}
            sx={{
              fontFamily: inkstashFonts.ui,
              fontWeight: 800,
              fontSize: 13,
              textTransform: 'none',
              letterSpacing: '-0.005em',
              color: '#fff',
              bgcolor: inkstashColors.brand,
              borderRadius: 999,
              px: 2.5,
              '&:hover': { bgcolor: inkstashColors.brandDeep },
            }}
          >
            Done ({value.length})
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
