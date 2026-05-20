import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Container, Stack } from '@mui/material';
import { Gavel, CheckCircle2, XCircle, TrendingUp, Clock, AlertCircle, X } from 'lucide-react';
import AppShell from '../components/layout/AppShell';
import { getMyBids, type Bid } from '../api/auctions/bids';
import { useAuth } from '../hooks/useAuth';
import { inkstashColors, inkstashFonts, inkstashRadii, inkstashShadows } from '../theme/inkstashTokens';

type StatusKind = 'winning' | 'outbid' | 'won' | 'lost' | 'unknown';

interface StatusDescriptor {
  kind: StatusKind;
  label: string;
}

function getBidStatus(bid: Bid): StatusDescriptor {
  if (!bid.auctions) return { kind: 'unknown', label: 'Unknown' };
  const auction = bid.auctions;
  const isEnded = new Date(auction.end_time) < new Date();
  const isWinning = bid.amount === auction.current_bid;
  const isSold = auction.status === 'sold';

  if (isSold || isEnded) {
    return isWinning
      ? { kind: 'won', label: 'Won' }
      : { kind: isSold ? 'lost' : 'outbid', label: isSold ? 'Lost' : 'Outbid' };
  }
  return isWinning
    ? { kind: 'winning', label: 'Winning' }
    : { kind: 'outbid', label: 'Outbid' };
}

const STATUS_STYLES: Record<StatusKind, { bg: string; fg: string }> = {
  winning: { bg: `${inkstashColors.cobalt}1A`, fg: inkstashColors.cobalt },
  won:     { bg: inkstashColors.goldSoft,      fg: inkstashColors.gold },
  outbid:  { bg: inkstashColors.brandSoft,     fg: inkstashColors.brand },
  lost:    { bg: inkstashColors.bgSunken,      fg: inkstashColors.muted },
  unknown: { bg: inkstashColors.bgSunken,      fg: inkstashColors.muted },
};

function StatusIcon({ kind, size = 13 }: { kind: StatusKind; size?: number }) {
  switch (kind) {
    case 'winning': return <TrendingUp size={size} />;
    case 'won':     return <CheckCircle2 size={size} />;
    case 'outbid':  return <XCircle size={size} />;
    case 'lost':    return <XCircle size={size} />;
    default:        return <Clock size={size} />;
  }
}

function formatTimeRemaining(endTime: string): string {
  const diff = new Date(endTime).getTime() - Date.now();
  if (diff <= 0) return 'Ended';
  const days  = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins  = Math.floor((diff % 3600000) / 60000);
  if (days > 0)  return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

function BidCard({ bid, onView }: { bid: Bid; onView: (id: string) => void }) {
  const auction = bid.auctions;
  if (!auction) return null;
  const status = getBidStatus(bid);
  const styles = STATUS_STYLES[status.kind];
  const timeRemaining = formatTimeRemaining(auction.end_time);
  const isLive = timeRemaining !== 'Ended';
  const youHigh = bid.amount >= auction.current_bid;

  return (
    <Box
      onClick={() => onView(auction.id)}
      sx={{
        bgcolor: inkstashColors.bgElev,
        border: `1px solid ${status.kind === 'winning' ? `${inkstashColors.cobalt}33` : inkstashColors.border}`,
        borderRadius: inkstashRadii.lg,
        overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        cursor: 'pointer',
        transition: 'transform 140ms ease, box-shadow 140ms ease, border-color 140ms ease',
        '&:hover': {
          transform: 'translateY(-3px)',
          boxShadow: inkstashShadows.md,
          borderColor: status.kind === 'winning' ? `${inkstashColors.cobalt}66` : inkstashColors.borderStrong,
        },
      }}
    >
      <Box sx={{
        position: 'relative',
        aspectRatio: '4 / 3',
        bgcolor: inkstashColors.bgSunken,
        overflow: 'hidden',
      }}>
        {auction.image_url && (
          <Box
            component="img"
            src={auction.image_url}
            alt={auction.title}
            sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        )}
        <Box sx={{
          position: 'absolute', top: 12, left: 12,
          display: 'inline-flex', alignItems: 'center', gap: 0.6,
          bgcolor: styles.bg, color: styles.fg,
          fontFamily: inkstashFonts.mono,
          fontSize: 10.5, fontWeight: 700, letterSpacing: '0.08em',
          padding: '4px 10px', borderRadius: 999,
        }}>
          <StatusIcon kind={status.kind} />
          {status.label.toUpperCase()}
        </Box>
        {isLive && (
          <Box sx={{
            position: 'absolute', top: 12, right: 12,
            display: 'inline-flex', alignItems: 'center', gap: 0.6,
            bgcolor: 'rgba(22,17,14,0.7)', color: '#fff',
            fontFamily: inkstashFonts.mono,
            fontSize: 11, fontWeight: 600, letterSpacing: '0.04em',
            padding: '4px 10px', borderRadius: 999,
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            border: '1px solid rgba(255,255,255,0.12)',
          }}>
            <Clock size={11} />
            {timeRemaining}
          </Box>
        )}
      </Box>

      <Box sx={{
        padding: '16px 18px 18px',
        display: 'flex', flexDirection: 'column', gap: 1.25,
        flex: 1,
      }}>
        <Box sx={{
          fontFamily: inkstashFonts.display, fontWeight: 800,
          fontSize: 18, lineHeight: 1.2,
          textTransform: 'uppercase', letterSpacing: '0.005em',
          color: inkstashColors.ink,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {auction.title}
        </Box>

        <Box sx={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5,
          padding: '12px 14px',
          bgcolor: inkstashColors.bgSunken,
          borderRadius: inkstashRadii.md,
        }}>
          <Box>
            <Box sx={{
              fontFamily: inkstashFonts.mono, fontSize: 10,
              color: inkstashColors.muted, letterSpacing: '0.08em', textTransform: 'uppercase',
              mb: 0.4,
            }}>
              Your bid
            </Box>
            <Box sx={{
              fontFamily: inkstashFonts.display, fontWeight: 800, fontSize: 18,
              color: youHigh ? inkstashColors.brand : inkstashColors.ink,
              lineHeight: 1,
            }}>
              ${bid.amount.toFixed(2)}
            </Box>
          </Box>
          <Box>
            <Box sx={{
              fontFamily: inkstashFonts.mono, fontSize: 10,
              color: inkstashColors.muted, letterSpacing: '0.08em', textTransform: 'uppercase',
              mb: 0.4,
            }}>
              Current bid
            </Box>
            <Box sx={{
              fontFamily: inkstashFonts.display, fontWeight: 800, fontSize: 18,
              color: inkstashColors.ink, lineHeight: 1,
            }}>
              ${auction.current_bid.toFixed(2)}
            </Box>
          </Box>
        </Box>

        <Box sx={{
          fontFamily: inkstashFonts.mono, fontSize: 11,
          color: inkstashColors.muted,
          mt: 'auto',
        }}>
          Bid placed {new Date(bid.created_at).toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric',
          })}
        </Box>
      </Box>
    </Box>
  );
}

function EmptyState({ onBrowse }: { onBrowse: () => void }) {
  return (
    <Box sx={{
      bgcolor: inkstashColors.bgElev,
      border: `1px solid ${inkstashColors.border}`,
      borderRadius: inkstashRadii.lg,
      padding: { xs: '48px 24px', md: '72px 32px' },
      textAlign: 'center',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
    }}>
      <Box sx={{
        width: 88, height: 88, borderRadius: '50%',
        bgcolor: inkstashColors.bgSunken,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: inkstashColors.muted,
        mb: 0.5,
      }}>
        <Gavel size={40} strokeWidth={1.5} />
      </Box>
      <Box component="h2" sx={{
        fontFamily: inkstashFonts.display, fontWeight: 800,
        fontSize: 'clamp(22px, 3vw, 30px)',
        letterSpacing: '0.005em', m: 0, textTransform: 'uppercase', lineHeight: 1,
        color: inkstashColors.ink,
      }}>
        No bids yet
      </Box>
      <Box sx={{
        color: inkstashColors.ink2, fontSize: 14, maxWidth: 400, lineHeight: 1.55,
      }}>
        You haven't placed any bids yet. Browse the marketplace to start bidding on graded slabs and key issues.
      </Box>
      <Box
        component="button"
        type="button"
        onClick={onBrowse}
        sx={{
          mt: 1,
          bgcolor: inkstashColors.brand, color: '#fff', border: 'none',
          padding: '12px 22px', borderRadius: 1.25,
          fontFamily: inkstashFonts.ui, fontWeight: 600, fontSize: 14,
          cursor: 'pointer',
          transition: 'background 140ms ease, transform 100ms ease',
          '&:hover': { bgcolor: inkstashColors.brandDeep },
          '&:active': { transform: 'scale(0.97)' },
        }}
      >
        Browse Marketplace
      </Box>
    </Box>
  );
}

function LoadingGrid() {
  return (
    <Box sx={{
      display: 'grid',
      gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
      gap: { xs: 2, md: 2.5 },
    }}>
      {[1, 2, 3].map(i => (
        <Box key={i} sx={{
          bgcolor: inkstashColors.bgElev,
          border: `1px solid ${inkstashColors.border}`,
          borderRadius: inkstashRadii.lg,
          height: 380,
        }} />
      ))}
    </Box>
  );
}

type Filter = 'all' | 'winning' | 'outbid' | 'won' | 'lost';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all',     label: 'All' },
  { key: 'winning', label: 'Winning' },
  { key: 'outbid',  label: 'Outbid' },
  { key: 'won',     label: 'Won' },
  { key: 'lost',    label: 'Lost' },
];

export default function MyBids() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    loadBids();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, navigate]);

  const loadBids = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getMyBids();
      setBids(data);
    } catch (err) {
      console.error('Error loading bids:', err);
      setError('Failed to load your bids');
    } finally {
      setLoading(false);
    }
  };

  const handleView = (id: string) => navigate(`/item/${id}`);

  const filtered = filter === 'all'
    ? bids
    : bids.filter(b => {
        const s = getBidStatus(b).kind;
        return s === filter;
      });

  const filterCounts: Record<Filter, number> = {
    all:     bids.length,
    winning: bids.filter(b => getBidStatus(b).kind === 'winning').length,
    outbid:  bids.filter(b => getBidStatus(b).kind === 'outbid').length,
    won:     bids.filter(b => getBidStatus(b).kind === 'won').length,
    lost:    bids.filter(b => getBidStatus(b).kind === 'lost').length,
  };

  return (
    <AppShell>
      <Container maxWidth="lg" sx={{ pb: 8 }}>
        <Box sx={{ mb: 3.5 }}>
          <Box component="h1" sx={{
            fontFamily: inkstashFonts.display, fontWeight: 800,
            fontSize: 'clamp(28px, 4vw, 44px)',
            letterSpacing: '0.005em', m: 0, textTransform: 'uppercase', lineHeight: 1,
            color: inkstashColors.ink,
          }}>
            My Bids
          </Box>
          <Box sx={{
            color: inkstashColors.muted, fontSize: 13.5, mt: 0.75, lineHeight: 1.5,
          }}>
            Track every bid you've placed and see which auctions you're winning.
          </Box>
        </Box>

        {error && (
          <Box sx={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 16px', mb: 3,
            bgcolor: inkstashColors.brandSoft,
            border: `1px solid ${inkstashColors.brand}33`,
            borderRadius: inkstashRadii.md,
            gap: 1,
          }}>
            <Stack direction="row" alignItems="center" gap={1.25}>
              <AlertCircle size={14} color={inkstashColors.brand} />
              <Box sx={{
                fontFamily: inkstashFonts.mono, fontSize: 12,
                color: inkstashColors.brandDeep,
              }}>
                {error}
              </Box>
            </Stack>
            <Box
              component="button"
              type="button"
              onClick={() => setError(null)}
              aria-label="Dismiss"
              sx={{
                bgcolor: 'transparent', border: 'none', cursor: 'pointer',
                color: inkstashColors.brand, display: 'flex',
                '&:hover': { color: inkstashColors.brandDeep },
              }}
            >
              <X size={14} />
            </Box>
          </Box>
        )}

        <Box sx={{
          display: 'inline-flex', gap: 0.5, padding: 0.5,
          bgcolor: inkstashColors.bgSunken, borderRadius: 999,
          mb: 3.5,
          overflowX: 'auto',
          maxWidth: '100%',
          '&::-webkit-scrollbar': { display: 'none' },
        }}>
          {FILTERS.map(f => {
            const active = filter === f.key;
            return (
              <Box
                key={f.key}
                component="button"
                type="button"
                onClick={() => setFilter(f.key)}
                sx={{
                  display: 'inline-flex', alignItems: 'center', gap: 0.75,
                  padding: '8px 16px',
                  borderRadius: 999, border: 'none', cursor: 'pointer',
                  fontSize: 12.5, fontWeight: 500, fontFamily: inkstashFonts.ui,
                  bgcolor: active ? inkstashColors.bgElev : 'transparent',
                  color: active ? inkstashColors.ink : inkstashColors.ink2,
                  boxShadow: active ? inkstashShadows.sm : 'none',
                  transition: 'all 140ms ease',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                {f.label}
                <Box component="span" sx={{
                  fontFamily: inkstashFonts.mono, fontSize: 11,
                  color: active ? inkstashColors.muted : inkstashColors.muted2,
                }}>
                  {filterCounts[f.key]}
                </Box>
              </Box>
            );
          })}
        </Box>

        {loading ? (
          <LoadingGrid />
        ) : bids.length === 0 ? (
          <EmptyState onBrowse={() => navigate('/marketplace')} />
        ) : filtered.length === 0 ? (
          <Box sx={{
            bgcolor: inkstashColors.bgElev,
            border: `1px solid ${inkstashColors.border}`,
            borderRadius: inkstashRadii.lg,
            padding: '48px 24px',
            textAlign: 'center',
            color: inkstashColors.muted,
            fontFamily: inkstashFonts.mono, fontSize: 13,
          }}>
            No {filter} bids
          </Box>
        ) : (
          <Box sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
            gap: { xs: 2, md: 2.5 },
          }}>
            {filtered.map(bid => (
              <BidCard key={bid.id} bid={bid} onView={handleView} />
            ))}
          </Box>
        )}
      </Container>
    </AppShell>
  );
}
