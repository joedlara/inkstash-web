// src/components/livestreams/host/HostQueuePanel.tsx
//
// Live queue management. Reads livestream_items joined with listings,
// subscribed to Realtime so position/status changes from the dual-device
// studio booth (Phase 3) reflect here too. "Start auction" is a stub
// until L2 wires the auction creation; for now it just sets the item
// status to 'live' so we can validate the database round-trip.

import { useEffect, useState, useCallback } from 'react';
import { Box, Typography, ButtonBase, IconButton } from '@mui/material';
import { Plus, Play, X } from 'lucide-react';
import { supabase } from '../../../api/supabase/supabaseClient';
import { PLACEHOLDER_IMAGE_URL } from '../../../utils/placeholders';
import { inkstashColors, inkstashRadii } from '../../../theme/inkstashTokens';

interface Props {
  livestreamId: string;
  onAddItem: () => void;
}

interface QueueRow {
  id: string;
  position: number;
  status: 'queued' | 'live' | 'sold' | 'passed' | 'removed';
  listing: {
    id: string;
    title: string;
    buy_now_price: number | null;
    photos: Array<{ url?: string }> | null;
  } | null;
}

export default function HostQueuePanel({ livestreamId, onAddItem }: Props) {
  const [rows, setRows] = useState<QueueRow[]>([]);

  const refresh = useCallback(async () => {
    // Two queries: livestream_items + the linked listings. Avoids the
    // PostgREST FK-embed ambiguity we've hit before in this codebase.
    const { data: items } = await supabase
      .from('livestream_items')
      .select('id, position, status, listing_id')
      .eq('livestream_id', livestreamId)
      .neq('status', 'removed')
      .order('position', { ascending: true });
    const listingIds = (items ?? []).map((i: { listing_id: string }) => i.listing_id);
    let byId = new Map<string, QueueRow['listing']>();
    if (listingIds.length > 0) {
      const { data: listings } = await supabase
        .from('listings')
        .select('id, title, buy_now_price, photos')
        .in('id', listingIds);
      byId = new Map(
        (listings ?? []).map((l: { id: string; title: string; buy_now_price: number | null; photos: Array<{ url?: string }> | null }) => [l.id, l]),
      );
    }
    setRows(
      (items ?? []).map((i: { id: string; position: number; status: QueueRow['status']; listing_id: string }) => ({
        id: i.id,
        position: i.position,
        status: i.status,
        listing: byId.get(i.listing_id) ?? null,
      })),
    );
  }, [livestreamId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Subscribe to queue changes so the dual-device studio booth syncs here.
  useEffect(() => {
    const channel = supabase
      .channel(`livestream_items:${livestreamId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'livestream_items', filter: `livestream_id=eq.${livestreamId}` },
        () => { refresh(); },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [livestreamId, refresh]);

  async function setStatus(itemId: string, status: QueueRow['status']) {
    await supabase
      .from('livestream_items')
      .update({ status })
      .eq('id', itemId);
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ flex: 1, overflowY: 'auto', px: 1.5, py: 1 }}>
        {rows.length === 0 && (
          <Typography
            sx={{
              fontFamily: inkstashFonts.ui,
              fontSize: 13,
              color: inkstashColors.muted,
              textAlign: 'center',
              py: 4,
            }}
          >
            No items queued. Add one to start.
          </Typography>
        )}
        {rows.map((r, idx) => {
          const cover = r.listing?.photos?.[0]?.url ?? PLACEHOLDER_IMAGE_URL;
          const isLive = r.status === 'live';
          return (
            <Box
              key={r.id}
              sx={{
                display: 'grid',
                gridTemplateColumns: '28px 48px 1fr auto',
                gap: 1.25,
                alignItems: 'center',
                py: 1,
                borderBottom: `1px solid ${inkstashColors.border}`,
              }}
            >
              <Typography
                sx={{
                  fontFamily: inkstashFonts.ui,
                  fontSize: 12,
                  fontWeight: 800,
                  color: isLive ? inkstashColors.brand : inkstashColors.muted,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {String(idx + 1).padStart(2, '0')}
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
                  {r.listing?.title ?? 'Untitled'}
                </Typography>
                <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, mt: 0.25 }}>
                  {r.listing?.buy_now_price != null && (
                    <Typography
                      sx={{
                        fontFamily: inkstashFonts.ui,
                        fontSize: 11.5,
                        color: inkstashColors.muted,
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      ${Number(r.listing.buy_now_price).toFixed(0)}
                    </Typography>
                  )}
                  {isLive && (
                    <Box
                      sx={{
                        px: 0.7,
                        py: 0.2,
                        borderRadius: 999,
                        bgcolor: inkstashColors.live,
                        color: '#fff',
                        fontFamily: inkstashFonts.ui,
                        fontSize: 9.5,
                        fontWeight: 800,
                        letterSpacing: '0.04em',
                        lineHeight: 1,
                        textTransform: 'uppercase',
                      }}
                    >
                      LIVE
                    </Box>
                  )}
                </Box>
              </Box>
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                {!isLive && (
                  <ButtonBase
                    onClick={() => setStatus(r.id, 'live')}
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 0.4,
                      px: 1.1,
                      py: 0.5,
                      borderRadius: 999,
                      bgcolor: inkstashColors.brand,
                      color: '#fff',
                      fontFamily: inkstashFonts.ui,
                      fontSize: 11.5,
                      fontWeight: 800,
                      letterSpacing: '-0.005em',
                      '&:hover': { bgcolor: inkstashColors.brandDeep },
                      '&:active': { transform: 'scale(0.97)' },
                    }}
                  >
                    <Play size={12} strokeWidth={2.5} />
                    Start
                  </ButtonBase>
                )}
                <IconButton
                  size="small"
                  onClick={() => setStatus(r.id, 'removed')}
                  sx={{ color: inkstashColors.muted, '&:hover': { color: inkstashColors.brand } }}
                  aria-label="Remove from queue"
                >
                  <X size={14} />
                </IconButton>
              </Box>
            </Box>
          );
        })}
      </Box>

      <Box
        sx={{
          p: 1.25,
          borderTop: `1px solid ${inkstashColors.border}`,
          bgcolor: inkstashColors.bgElev,
        }}
      >
        <ButtonBase
          onClick={onAddItem}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.75,
            width: '100%',
            py: 1.1,
            borderRadius: 999,
            bgcolor: inkstashColors.bgSunken,
            color: inkstashColors.ink,
            fontFamily: inkstashFonts.ui,
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: '-0.005em',
            border: `1px dashed ${inkstashColors.border}`,
            justifyContent: 'center',
            '&:hover': { bgcolor: inkstashColors.border },
          }}
        >
          <Plus size={16} strokeWidth={2.5} />
          Add item
        </ButtonBase>
      </Box>
    </Box>
  );
}
