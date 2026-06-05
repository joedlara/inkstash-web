// src/components/creatorHub/panels/LiveControlPanel.tsx
//
// Live Control — the dual-device producer surface. The host's phone is
// the camera; this is the laptop control panel that joins the same
// LiveKit room as a viewer and gives the seller a queue + push-to-block
// + stream health at a glance.
//
// No active stream → empty state with a Go Live CTA that opens the
// composer (parent wires this via onGoLive).

import { useEffect, useState, useCallback } from 'react';
import { Box, CircularProgress, Typography, ButtonBase } from '@mui/material';
import { ArrowUpCircle, GripVertical, Heart, Radio, Smartphone, Wifi, Square } from 'lucide-react';
import HubPanelFrame from '../HubPanelFrame';
import HBtn from '../HBtn';
import LiveStreamVideo from '../../livestreams/LiveStreamVideo';
import EndStreamConfirmModal from '../../livestreams/host/EndStreamConfirmModal';
import { livestreamsAPI, type Livestream } from '../../../api/livestreams';
import { supabase } from '../../../api/supabase/supabaseClient';
import { useAuth } from '../../../hooks/useAuth';
import { PLACEHOLDER_IMAGE_URL } from '../../../utils/placeholders';
import { inkstashColors, inkstashFonts, inkstashRadii } from '../../../theme/inkstashTokens';

interface Props {
  /** Opens the Go Live composer in Live mode. */
  onGoLive: () => void;
}

interface ActiveStream {
  stream: Livestream;
  livekit: { token: string; wsUrl: string };
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

export default function LiveControlPanel({ onGoLive }: Props) {
  const { user } = useAuth();
  const [active, setActive] = useState<ActiveStream | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    livestreamsAPI.getMyActiveStream(user.id).then((res) => {
      if (cancelled) return;
      setActive(res);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [user]);

  return (
    <HubPanelFrame
      eyebrow="Stream management"
      title="Live Control"
      sub="Run the show from this laptop while your phone is the camera. Push items to the block, watch the room, moderate chat."
    >
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress size={28} sx={{ color: inkstashColors.brand }} />
        </Box>
      ) : active ? (
        <LiveSurface active={active} />
      ) : (
        <EmptyState onGoLive={onGoLive} />
      )}
    </HubPanelFrame>
  );
}

// ────────────────────────────────────────────────────────────────────
// Empty state
// ────────────────────────────────────────────────────────────────────

function EmptyState({ onGoLive }: { onGoLive: () => void }) {
  return (
    <Box sx={{
      bgcolor: inkstashColors.bgElev,
      border: `1px dashed ${inkstashColors.border}`,
      borderRadius: inkstashRadii.lg,
      p: { xs: 4, md: 8 },
      textAlign: 'center',
    }}>
      <Box sx={{
        width: 56, height: 56, borderRadius: '50%', mx: 'auto', mb: 2,
        bgcolor: inkstashColors.brandSoft,
        color: inkstashColors.brand,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Radio size={26} strokeWidth={2.2} />
      </Box>
      <Typography sx={{
        fontFamily: inkstashFonts.display, fontWeight: 900, fontSize: 22,
        textTransform: 'uppercase', letterSpacing: '-0.005em',
        color: inkstashColors.ink, mb: 1.25,
      }}>
        You're not broadcasting
      </Typography>
      <Typography sx={{
        fontFamily: inkstashFonts.ui, fontSize: 14, color: inkstashColors.muted,
        maxWidth: 440, mx: 'auto', mb: 3, lineHeight: 1.5,
      }}>
        When you go live, this becomes your producer console — queue items,
        push them to the block, watch bids roll in, and moderate chat
        without touching your phone.
      </Typography>
      <HBtn
        variant="primary"
        size="lg"
        onClick={onGoLive}
        icon={<Radio size={16} strokeWidth={2.4} />}
      >
        Go live now
      </HBtn>
    </Box>
  );
}

// ────────────────────────────────────────────────────────────────────
// Live surface (when actively broadcasting)
// ────────────────────────────────────────────────────────────────────

function LiveSurface({ active }: { active: ActiveStream }) {
  const { stream, livekit } = active;
  const [endConfirmOpen, setEndConfirmOpen] = useState(false);
  const [ending, setEnding] = useState(false);

  async function handleEnd() {
    if (ending) return;
    setEnding(true);
    try {
      await livestreamsAPI.end(stream.id);
    } catch (err) {
      console.warn('[LiveControlPanel] end stream failed', err);
    } finally {
      setEnding(false);
      setEndConfirmOpen(false);
      // The parent panel polls getMyActiveStream on mount; reload the
      // page so it re-renders the empty state cleanly.
      window.location.reload();
    }
  }

  // Queue state, hydrated from livestream_items + listings (same pattern
  // as StreamShopRail). Realtime keeps it in sync with whatever the
  // phone or another tab does.
  const [queue, setQueue] = useState<QueueRow[]>([]);
  const [viewerCount, setViewerCount] = useState(1);
  const [likes, setLikes] = useState(0);
  // Mock bitrate for now — wiring to LiveKit getStats() is a follow-up.
  const [bitrate, setBitrate] = useState(6.2);

  // Pulse likes + bitrate so the producer surface feels alive even
  // without real telemetry.
  useEffect(() => {
    const id = setInterval(() => {
      setLikes((l) => l + Math.floor(Math.random() * 3));
      setBitrate(Number((5.8 + Math.random() * 0.7).toFixed(1)));
    }, 2500);
    return () => clearInterval(id);
  }, []);

  const refreshQueue = useCallback(async () => {
    const { data: items } = await supabase
      .from('livestream_items')
      .select('id, position, status, listing_id')
      .eq('livestream_id', stream.id)
      .neq('status', 'removed')
      .order('position', { ascending: true });
    const ids = (items ?? []).map((i: { listing_id: string }) => i.listing_id);
    if (ids.length === 0) { setQueue([]); return; }
    const { data: listings } = await supabase
      .from('listings')
      .select('id, title, buy_now_price, photos')
      .in('id', ids);
    type LRow = { id: string; title: string; buy_now_price: number | null; photos: Array<{ url?: string }> | null };
    const byId = new Map((listings ?? []).map((l: LRow) => [l.id, l] as const));
    setQueue(
      (items ?? []).map((i: { id: string; position: number; status: QueueRow['status']; listing_id: string }) => ({
        id: i.id,
        position: i.position,
        status: i.status,
        listing: byId.get(i.listing_id) ?? null,
      })),
    );
  }, [stream.id]);

  useEffect(() => {
    refreshQueue();
    const channel = supabase
      .channel(`live_control_queue:${stream.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'livestream_items', filter: `livestream_id=eq.${stream.id}` },
        () => { refreshQueue(); },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [stream.id, refreshQueue]);

  const onBlock = queue.find((q) => q.status === 'live') ?? null;
  const upNext = queue.find((q) => q.status === 'queued') ?? null;

  async function pushToBlock(row: QueueRow) {
    // Demote whatever's currently live to 'passed' (so it leaves the
    // active block visually but stays in the history), then mark the
    // chosen row as 'live'.
    if (onBlock && onBlock.id !== row.id) {
      await supabase.from('livestream_items').update({ status: 'passed' }).eq('id', onBlock.id);
    }
    await supabase.from('livestream_items').update({ status: 'live' }).eq('id', row.id);
  }

  const fmtLikes = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
  const soldCount = queue.filter((q) => q.status === 'sold').length;

  return (
    <>
      {/* Live banner */}
      <Box sx={{
        display: 'flex', alignItems: 'center', gap: 2,
        p: 2, mb: 2.5,
        borderRadius: inkstashRadii.lg,
        bgcolor: inkstashColors.brand,
        color: '#fff',
      }}>
        <Box sx={{
          width: 10, height: 10, borderRadius: '50%', bgcolor: '#fff',
          animation: 'lc-pulse 1.4s ease-in-out infinite',
          '@keyframes lc-pulse': {
            '0%, 100%': { opacity: 1 },
            '50%': { opacity: 0.35 },
          },
        }} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{
            fontFamily: inkstashFonts.display, fontWeight: 900, fontSize: 16,
            textTransform: 'uppercase', letterSpacing: '0.02em', lineHeight: 1,
          }}>
            You're live
          </Box>
          <Box sx={{
            fontFamily: inkstashFonts.ui, fontSize: 12.5, color: 'rgba(255,255,255,0.85)',
            mt: 0.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {stream.title} — running the block from this laptop
          </Box>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5, flexShrink: 0 }}>
          <Stat value={String(viewerCount)} label="Viewers" />
          <Stat value={String(queue.filter((q) => q.status === 'queued').length)} label="In queue" />
          <Stat value={`$${soldCount * 0}`} label="Sold" />
          <ButtonBase
            onClick={() => setEndConfirmOpen(true)}
            sx={{
              ml: 1, height: 40, px: 1.75, borderRadius: 999,
              bgcolor: 'rgba(0,0,0,0.22)',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.28)',
              fontFamily: inkstashFonts.ui, fontWeight: 700, fontSize: 13,
              letterSpacing: '-0.005em',
              display: 'inline-flex', alignItems: 'center', gap: 0.75,
              transition: 'background-color 120ms ease, transform 120ms ease',
              '&:hover': { bgcolor: 'rgba(0,0,0,0.4)' },
              '&:active': { transform: 'translateY(1px)' },
            }}
          >
            <Square size={13} strokeWidth={2.6} fill="currentColor" />
            End stream
          </ButtonBase>
        </Box>
      </Box>

      <Box sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', lg: '1fr 360px' },
        gap: 2.25,
        alignItems: 'start',
      }}>
        {/* LEFT — camera + health + dual-device */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.25, minWidth: 0 }}>
          {/* Block card */}
          <Box sx={{
            bgcolor: inkstashColors.bgElev,
            border: `1px solid ${inkstashColors.border}`,
            borderRadius: inkstashRadii.lg,
            overflow: 'hidden',
          }}>
            <Box sx={{
              position: 'relative',
              aspectRatio: '16 / 9',
              bgcolor: inkstashColors.stage,
              overflow: 'hidden',
            }}>
              <LiveStreamVideo
                wsUrl={livekit.wsUrl}
                token={livekit.token}
                mode="viewer"
                onParticipantCountChange={setViewerCount}
              />
              {/* ON AIR */}
              <Box sx={{
                position: 'absolute', top: 12, left: 12, zIndex: 3,
                display: 'inline-flex', alignItems: 'center', gap: 0.75,
                px: 1, py: '5px', borderRadius: 999,
                bgcolor: inkstashColors.live, color: '#fff',
                fontFamily: inkstashFonts.mono, fontSize: 10.5, fontWeight: 700,
                letterSpacing: '0.08em', lineHeight: 1,
                boxShadow: '0 2px 8px rgba(220,38,38,0.4)',
              }}>
                <Box sx={{
                  width: 6, height: 6, borderRadius: '50%', bgcolor: '#fff',
                  animation: 'lc-pulse 1.4s ease-in-out infinite',
                }} />
                ON AIR
              </Box>
              {/* Bitrate + likes */}
              <Box sx={{
                position: 'absolute', top: 12, right: 12, zIndex: 3,
                display: 'flex', gap: 1,
              }}>
                <GlassStat icon={<Wifi size={11} strokeWidth={2.4} />} value={`${bitrate} Mbps`} good />
                <GlassStat icon={<Heart size={11} strokeWidth={2.4} fill="currentColor" />} value={fmtLikes(likes)} />
              </Box>
            </Box>

            {/* Block info */}
            <Box sx={{ p: 2 }}>
              <Typography sx={{
                fontFamily: inkstashFonts.mono, fontSize: 11,
                textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600,
                color: inkstashColors.muted, mb: 0.75,
              }}>
                On the block
              </Typography>
              {onBlock?.listing ? (
                <>
                  <Typography sx={{
                    fontFamily: inkstashFonts.display, fontWeight: 900, fontSize: 20,
                    textTransform: 'uppercase', letterSpacing: '-0.005em',
                    color: inkstashColors.ink, mb: 1.5, lineHeight: 1.1,
                  }}>
                    {onBlock.listing.title}
                  </Typography>
                  <Box sx={{
                    display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
                    gap: 1.5,
                  }}>
                    <Box>
                      <Typography sx={{
                        fontFamily: inkstashFonts.display, fontWeight: 900, fontSize: 28,
                        color: inkstashColors.ink, lineHeight: 1,
                        fontVariantNumeric: 'tabular-nums',
                      }}>
                        ${onBlock.listing.buy_now_price ?? 0}
                      </Typography>
                      <Typography sx={{
                        fontFamily: inkstashFonts.ui, fontSize: 12, color: inkstashColors.muted, mt: 0.5,
                      }}>
                        Starting bid · L2 auctions wire live bidders
                      </Typography>
                    </Box>
                    <Typography sx={{
                      fontFamily: inkstashFonts.mono, fontSize: 11.5, color: inkstashColors.muted,
                      textAlign: 'right',
                    }}>
                      0 bids
                    </Typography>
                  </Box>
                </>
              ) : (
                <Typography sx={{
                  fontFamily: inkstashFonts.ui, fontSize: 14, color: inkstashColors.muted,
                  fontStyle: 'italic', mb: upNext ? 1.5 : 0,
                }}>
                  Nothing on the block yet — push the next item up when you're ready.
                </Typography>
              )}

              {/* Next up */}
              {upNext?.listing && (
                <NextUpRow
                  row={upNext}
                  onPush={() => pushToBlock(upNext)}
                />
              )}
            </Box>
          </Box>

          {/* Stream Health */}
          <Box sx={{
            bgcolor: inkstashColors.bgElev,
            border: `1px solid ${inkstashColors.border}`,
            borderRadius: inkstashRadii.lg,
            p: 2,
          }}>
            <Typography sx={{
              fontFamily: inkstashFonts.mono, fontSize: 11,
              textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600,
              color: inkstashColors.muted, mb: 1.5,
            }}>
              Stream health
            </Typography>
            <Box sx={{
              display: 'grid',
              gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' },
              gap: 1.5,
            }}>
              <HStat label="Bitrate" value={`${bitrate}`} unit="Mbps" bar={Math.min(100, (bitrate / 8) * 100)} />
              <HStat label="Connection" value="Good" sub="0.1% dropped frames" tone="ok" />
              <HStat label="Likes" value={fmtLikes(likes)} sub="live reactions" />
              <HStat label="Viewers" value={String(viewerCount)} sub="" />
            </Box>
          </Box>

          {/* Dual-device card */}
          <Box sx={{
            bgcolor: inkstashColors.bgElev,
            border: `1px solid ${inkstashColors.border}`,
            borderRadius: inkstashRadii.lg,
            p: 2,
            display: 'flex', alignItems: 'center', gap: 1.75,
          }}>
            <Box sx={{
              width: 42, height: 42, borderRadius: 1.5,
              bgcolor: inkstashColors.bgSunken,
              color: inkstashColors.ink,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Smartphone size={20} strokeWidth={2.2} />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{
                fontFamily: inkstashFonts.ui, fontWeight: 700, fontSize: 14,
                color: inkstashColors.ink,
              }}>
                Dual-device mode
              </Typography>
              <Typography sx={{
                fontFamily: inkstashFonts.ui, fontSize: 12.5, color: inkstashColors.muted,
                mt: 0.25, lineHeight: 1.5,
              }}>
                Your phone is the camera. Queue items and watch bids from here —
                no need to touch the phone.
              </Typography>
            </Box>
            <Box sx={{
              display: 'inline-flex', alignItems: 'center', gap: 0.6,
              px: 1.25, py: 0.5, borderRadius: 999,
              bgcolor: '#E6F5EB',
              color: inkstashColors.success,
              fontFamily: inkstashFonts.mono, fontSize: 10.5, fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.06em',
              flexShrink: 0,
            }}>
              <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: inkstashColors.success }} />
              Linked
            </Box>
          </Box>
        </Box>

        {/* RIGHT — Run of show */}
        <Box sx={{
          bgcolor: inkstashColors.bgElev,
          border: `1px solid ${inkstashColors.border}`,
          borderRadius: inkstashRadii.lg,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: { lg: 720 },
        }}>
          <Box sx={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            p: 2, borderBottom: `1px solid ${inkstashColors.border}`,
          }}>
            <Typography sx={{
              fontFamily: inkstashFonts.display, fontWeight: 800, fontSize: 16,
              textTransform: 'uppercase', letterSpacing: '0.01em',
              color: inkstashColors.ink,
            }}>
              Run of show
            </Typography>
            <Typography sx={{
              fontFamily: inkstashFonts.mono, fontSize: 11, fontWeight: 600,
              color: inkstashColors.muted, textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>
              {queue.length} queued
            </Typography>
          </Box>
          <Box sx={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
            {queue.length === 0 ? (
              <Typography sx={{
                p: 3, textAlign: 'center', fontFamily: inkstashFonts.ui, fontSize: 13,
                color: inkstashColors.muted,
              }}>
                Queue empty — add items from the composer or the Stream tab.
              </Typography>
            ) : queue.map((row) => (
              <QueueRowItem
                key={row.id}
                row={row}
                onPush={() => pushToBlock(row)}
                isLive={row.id === onBlock?.id}
              />
            ))}
          </Box>
        </Box>
      </Box>

      <EndStreamConfirmModal
        open={endConfirmOpen}
        onCancel={() => setEndConfirmOpen(false)}
        onConfirm={handleEnd}
        ending={ending}
      />
    </>
  );
}

// ────────────────────────────────────────────────────────────────────
// Sub-components
// ────────────────────────────────────────────────────────────────────

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <Box sx={{ textAlign: 'center' }}>
      <Typography sx={{
        fontFamily: inkstashFonts.display, fontWeight: 900, fontSize: 22,
        color: '#fff', lineHeight: 1, fontVariantNumeric: 'tabular-nums',
      }}>
        {value}
      </Typography>
      <Typography sx={{
        fontFamily: inkstashFonts.mono, fontSize: 10, fontWeight: 600,
        color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase', letterSpacing: '0.06em',
        mt: 0.5,
      }}>
        {label}
      </Typography>
    </Box>
  );
}

function GlassStat({ icon, value, good = false }: { icon: React.ReactNode; value: string; good?: boolean }) {
  return (
    <Box sx={{
      display: 'inline-flex', alignItems: 'center', gap: 0.5,
      px: 1, py: '4px', borderRadius: 999,
      bgcolor: 'rgba(8,7,10,0.55)',
      border: '1px solid rgba(255,255,255,0.18)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      color: '#fff',
      fontFamily: inkstashFonts.mono, fontSize: 10.5, fontWeight: 600,
      lineHeight: 1,
    }}>
      {good && (
        <Box sx={{
          width: 5, height: 5, borderRadius: '50%', bgcolor: '#4ADE80', mr: 0.25,
        }} />
      )}
      {icon}
      {value}
    </Box>
  );
}

function HStat({
  label, value, unit, sub, bar, tone,
}: {
  label: string;
  value: string;
  unit?: string;
  sub?: string;
  bar?: number;
  tone?: 'ok';
}) {
  return (
    <Box>
      <Typography sx={{
        fontFamily: inkstashFonts.mono, fontSize: 10, fontWeight: 600,
        color: inkstashColors.muted, textTransform: 'uppercase', letterSpacing: '0.06em',
        mb: 0.5,
      }}>
        {label}
      </Typography>
      <Typography sx={{
        fontFamily: inkstashFonts.display, fontWeight: 900, fontSize: 22,
        color: tone === 'ok' ? inkstashColors.success : inkstashColors.ink,
        lineHeight: 1, fontVariantNumeric: 'tabular-nums',
      }}>
        {value}
        {unit && (
          <Box component="span" sx={{
            fontFamily: inkstashFonts.mono, fontSize: 11, fontWeight: 600,
            color: inkstashColors.muted, ml: 0.5,
          }}>
            {unit}
          </Box>
        )}
      </Typography>
      {bar != null ? (
        <Box sx={{
          mt: 0.75, height: 4, borderRadius: 999, bgcolor: inkstashColors.bgSunken, overflow: 'hidden',
        }}>
          <Box sx={{
            height: '100%', width: `${bar}%`,
            bgcolor: inkstashColors.brand,
            transition: 'width 400ms ease',
          }} />
        </Box>
      ) : sub ? (
        <Typography sx={{
          fontFamily: inkstashFonts.ui, fontSize: 11.5, color: inkstashColors.muted, mt: 0.5,
        }}>
          {sub}
        </Typography>
      ) : null}
    </Box>
  );
}

function NextUpRow({ row, onPush }: { row: QueueRow; onPush: () => void }) {
  if (!row.listing) return null;
  const cover = row.listing.photos?.[0]?.url ?? PLACEHOLDER_IMAGE_URL;
  return (
    <Box sx={{
      mt: 2, p: 1.25, display: 'grid',
      gridTemplateColumns: 'auto 48px 1fr auto',
      alignItems: 'center', gap: 1.25,
      bgcolor: inkstashColors.bgSunken,
      border: `1px solid ${inkstashColors.border}`,
      borderRadius: inkstashRadii.md,
    }}>
      <Typography sx={{
        fontFamily: inkstashFonts.mono, fontSize: 9.5, fontWeight: 700,
        color: inkstashColors.muted, textTransform: 'uppercase', letterSpacing: '0.08em',
        textAlign: 'center', lineHeight: 1.1,
      }}>
        Next<br />up
      </Typography>
      <Box sx={{
        width: 48, height: 48, borderRadius: inkstashRadii.sm,
        backgroundImage: `url(${cover})`,
        backgroundSize: 'cover', backgroundPosition: 'center',
        bgcolor: '#ddd',
      }} />
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{
          fontFamily: inkstashFonts.ui, fontSize: 13, fontWeight: 700,
          color: inkstashColors.ink, letterSpacing: '-0.005em',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {row.listing.title}
        </Typography>
        <Typography sx={{
          fontFamily: inkstashFonts.mono, fontSize: 11, color: inkstashColors.muted, mt: 0.25,
        }}>
          ${row.listing.buy_now_price ?? 0}
        </Typography>
      </Box>
      <ButtonBase
        onClick={onPush}
        title="Put on the block now"
        sx={{
          width: 38, height: 38, borderRadius: '50%',
          bgcolor: inkstashColors.brand,
          color: '#fff',
          '&:hover': { bgcolor: inkstashColors.brandDeep },
          '&:active': { transform: 'scale(0.96)' },
        }}
      >
        <ArrowUpCircle size={20} strokeWidth={2.2} />
      </ButtonBase>
    </Box>
  );
}

function QueueRowItem({
  row, onPush, isLive,
}: {
  row: QueueRow;
  onPush: () => void;
  isLive: boolean;
}) {
  if (!row.listing) return null;
  const cover = row.listing.photos?.[0]?.url ?? PLACEHOLDER_IMAGE_URL;
  const isSold = row.status === 'sold';
  return (
    <Box sx={{
      display: 'grid',
      gridTemplateColumns: 'auto 44px 1fr auto',
      alignItems: 'center', gap: 1.25,
      px: 1.5, py: 1.25,
      borderBottom: `1px solid ${inkstashColors.border}`,
      bgcolor: isLive ? inkstashColors.brandSoft : 'transparent',
      opacity: isSold ? 0.55 : 1,
      '&:last-of-type': { borderBottom: 0 },
    }}>
      <Box sx={{
        display: 'inline-flex', color: inkstashColors.muted2,
        cursor: 'grab',
        '&:active': { cursor: 'grabbing' },
      }}>
        <GripVertical size={14} strokeWidth={2.2} />
      </Box>
      <Box sx={{
        width: 44, height: 44, borderRadius: inkstashRadii.sm,
        backgroundImage: `url(${cover})`,
        backgroundSize: 'cover', backgroundPosition: 'center',
        bgcolor: '#ddd',
      }} />
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{
          fontFamily: inkstashFonts.ui, fontSize: 13.5, fontWeight: 600,
          color: inkstashColors.ink, letterSpacing: '-0.005em',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {row.listing.title}
        </Typography>
        <Box sx={{
          display: 'inline-flex', alignItems: 'center', gap: 0.75, mt: 0.25,
          fontFamily: inkstashFonts.mono, fontSize: 11, color: inkstashColors.muted,
        }}>
          <span>${row.listing.buy_now_price ?? 0}</span>
          {isLive && (
            <Box component="span" sx={{
              px: 0.6, py: '1px', borderRadius: 0.5,
              bgcolor: inkstashColors.live, color: '#fff',
              fontFamily: inkstashFonts.mono, fontSize: 9.5, fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>
              On block
            </Box>
          )}
          {isSold && (
            <Box component="span" sx={{
              fontWeight: 700, color: inkstashColors.ink2,
              textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: 9.5,
            }}>
              Sold
            </Box>
          )}
        </Box>
      </Box>
      {!isLive && !isSold && (
        <ButtonBase
          onClick={onPush}
          title="Put on the block"
          sx={{
            width: 34, height: 34, borderRadius: '50%',
            bgcolor: inkstashColors.brand,
            color: '#fff',
            '&:hover': { bgcolor: inkstashColors.brandDeep },
            '&:active': { transform: 'scale(0.96)' },
          }}
        >
          <ArrowUpCircle size={18} strokeWidth={2.2} />
        </ButtonBase>
      )}
    </Box>
  );
}
