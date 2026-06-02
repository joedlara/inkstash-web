// src/pages/OrderGroupSummary.tsx
//
// /order-group/:id — the buyer's unified post-checkout summary. Loads the
// order_group + all child orders + their listings + sellers, renders a
// status banner + per-seller item groups + totals. Each item links to its
// individual /order/:id page for shipping detail.

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box, Container, Typography, Paper, Stack, Divider, Button, CircularProgress, Alert, Chip,
} from '@mui/material';
import { ArrowBack, CheckCircle, Schedule, Warning } from '@mui/icons-material';
import AppShell from '../components/layout/AppShell';
import { supabase } from '../api/supabase/supabaseClient';
import { PLACEHOLDER_IMAGE_URL } from '../utils/placeholders';
import { inkstashColors, inkstashFonts, inkstashRadii } from '../theme/inkstashTokens';

interface OrderGroup {
  id: string;
  buyer_id: string;
  total_amount: number;
  status: 'pending' | 'paid' | 'partial_payout_failed' | 'fully_paid_out';
  created_at: string;
  paid_at: string | null;
}

interface Order {
  id: string;
  order_number: string;
  listing_id: string;
  seller_id: string;
  item_price: number;
  shipping_cost: number;
  total: number;
  status: string;
  tracking_number: string | null;
  carrier: string | null;
  transfer_status: string | null;
}

interface ListingLite {
  id: string;
  title: string;
  photos: Array<{ url?: string }> | null;
}

interface SellerLite {
  id: string;
  username: string | null;
}

interface SellerGroup {
  seller_id: string;
  username: string;
  orders: Array<Order & { listing: ListingLite | null }>;
  subtotal: number;
}

export default function OrderGroupSummary() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [group, setGroup] = useState<OrderGroup | null>(null);
  const [groups, setGroups] = useState<SellerGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    (async () => {
      try {
        // Load the order_group. RLS scopes this to the buyer.
        const { data: groupRow, error: groupErr } = await supabase
          .from('order_groups')
          .select('*')
          .eq('id', id)
          .maybeSingle();
        if (groupErr) throw groupErr;
        if (!groupRow) {
          if (!cancelled) {
            setError('Order group not found.');
            setLoading(false);
          }
          return;
        }

        const { data: orders, error: ordersErr } = await supabase
          .from('orders')
          .select('id, order_number, listing_id, seller_id, item_price, shipping_cost, total, status, tracking_number, carrier, transfer_status')
          .eq('order_group_id', id);
        if (ordersErr) throw ordersErr;

        const orderRows = (orders ?? []) as Order[];
        const listingIds = Array.from(new Set(orderRows.map((o) => o.listing_id)));
        const sellerIds = Array.from(new Set(orderRows.map((o) => o.seller_id)));

        const [listingRes, sellerRes] = await Promise.all([
          supabase.from('listings').select('id, title, photos').in('id', listingIds),
          supabase.from('users').select('id, username').in('id', sellerIds),
        ]);

        const listingsById = new Map<string, ListingLite>(
          ((listingRes.data ?? []) as ListingLite[]).map((l) => [l.id, l]),
        );
        const sellersById = new Map<string, SellerLite>(
          ((sellerRes.data ?? []) as SellerLite[]).map((s) => [s.id, s]),
        );

        // Group orders by seller.
        const groupMap = new Map<string, SellerGroup>();
        for (const o of orderRows) {
          const listing = listingsById.get(o.listing_id) ?? null;
          const sellerUsername = sellersById.get(o.seller_id)?.username ?? 'seller';
          const existing = groupMap.get(o.seller_id);
          if (existing) {
            existing.orders.push({ ...o, listing });
            existing.subtotal += Number(o.total);
          } else {
            groupMap.set(o.seller_id, {
              seller_id: o.seller_id,
              username: sellerUsername,
              orders: [{ ...o, listing }],
              subtotal: Number(o.total),
            });
          }
        }

        if (!cancelled) {
          setGroup(groupRow as OrderGroup);
          setGroups(Array.from(groupMap.values()));
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load order');
          setLoading(false);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [id]);

  if (loading) {
    return (
      <AppShell>
        <Container maxWidth="md" sx={{ py: 8, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress size={48} sx={{ color: inkstashColors.brand }} />
        </Container>
      </AppShell>
    );
  }

  if (error || !group) {
    return (
      <AppShell>
        <Container maxWidth="md" sx={{ py: 6 }}>
          <Alert severity="error" sx={{ mb: 3 }}>{error ?? 'Order not found.'}</Alert>
          <Button startIcon={<ArrowBack />} onClick={() => navigate('/my-stash?tab=history')}>
            View all purchases
          </Button>
        </Container>
      </AppShell>
    );
  }

  // Status banner content.
  const isPaid = group.status === 'paid' || group.status === 'fully_paid_out';
  const isPartial = group.status === 'partial_payout_failed';
  const isPending = group.status === 'pending';

  return (
    <AppShell>
      <Container maxWidth="md" sx={{ py: { xs: 3, md: 5 } }}>
        <Box sx={{ mb: 2 }}>
          <Button
            startIcon={<ArrowBack />}
            onClick={() => navigate('/my-stash?tab=history')}
            sx={{
              textTransform: 'none',
              color: inkstashColors.muted,
              fontFamily: inkstashFonts.ui,
              fontWeight: 600,
              fontSize: 13,
              '&:hover': { bgcolor: 'transparent', color: inkstashColors.brand },
            }}
          >
            All purchases
          </Button>
        </Box>

        {/* Header */}
        <Box sx={{ mb: 3 }}>
          <Typography
            sx={{
              fontFamily: inkstashFonts.mono,
              fontSize: 11,
              color: inkstashColors.muted,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              mb: 1,
            }}
          >
            Order #{group.id.substring(0, 8).toUpperCase()}
          </Typography>
          <Typography
            sx={{
              fontFamily: inkstashFonts.display,
              fontWeight: 900,
              fontSize: { xs: 30, md: 38 },
              textTransform: 'uppercase',
              letterSpacing: '0.005em',
              lineHeight: 1.05,
              color: inkstashColors.ink,
            }}
          >
            {groups.length} seller{groups.length === 1 ? '' : 's'} · {groups.reduce((acc, g) => acc + g.orders.length, 0)} item{groups.reduce((acc, g) => acc + g.orders.length, 0) === 1 ? '' : 's'}
          </Typography>
        </Box>

        {/* Status banner */}
        <Paper
          elevation={0}
          sx={{
            p: 2,
            mb: 3,
            border: `1.5px solid ${isPartial ? inkstashColors.gold : inkstashColors.border}`,
            bgcolor: isPartial ? '#FFFBEF' : (isPaid ? inkstashColors.brandSoft : inkstashColors.bgSunken),
            borderRadius: inkstashRadii.md,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
          }}
        >
          {isPaid && <CheckCircle sx={{ color: inkstashColors.brand }} />}
          {isPartial && <Warning sx={{ color: inkstashColors.gold }} />}
          {isPending && <Schedule sx={{ color: inkstashColors.muted }} />}
          <Box>
            <Typography sx={{ fontFamily: inkstashFonts.ui, fontWeight: 700, fontSize: 14, color: inkstashColors.ink }}>
              {isPaid && 'Payment confirmed'}
              {isPartial && 'Payment confirmed · payout reconciling'}
              {isPending && 'Payment processing'}
            </Typography>
            <Typography sx={{ fontSize: 12.5, color: inkstashColors.muted, mt: 0.25 }}>
              {isPaid && 'Each seller has been notified. You\'ll get a shipping update per item.'}
              {isPartial && 'Your card was charged and your order is processing. One or more seller payouts are being retried — this doesn\'t affect you.'}
              {isPending && 'Hang tight — the webhook is finalizing this order.'}
            </Typography>
          </Box>
        </Paper>

        {/* Seller groups */}
        {groups.map((g) => (
          <Paper
            key={g.seller_id}
            elevation={0}
            sx={{
              p: { xs: 2, md: 2.5 },
              mb: 2,
              border: `1px solid ${inkstashColors.border}`,
              borderRadius: inkstashRadii.lg,
              bgcolor: inkstashColors.bgElev,
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Chip
                label={`@${g.username}`}
                onClick={() => g.username && navigate(`/@${g.username}`)}
                sx={{
                  bgcolor: inkstashColors.brandSoft,
                  color: inkstashColors.brand,
                  fontFamily: inkstashFonts.mono,
                  fontWeight: 700,
                  fontSize: 11,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  cursor: 'pointer',
                  '&:hover': { bgcolor: inkstashColors.brand, color: '#fff' },
                }}
              />
              <Typography
                sx={{
                  fontFamily: inkstashFonts.display,
                  fontWeight: 800,
                  fontSize: 16,
                  color: inkstashColors.ink,
                }}
              >
                ${g.subtotal.toFixed(2)}
              </Typography>
            </Box>

            <Stack spacing={1.5}>
              {g.orders.map((o) => (
                <Box
                  key={o.id}
                  sx={{
                    display: 'flex',
                    gap: 1.5,
                    p: 1.5,
                    border: `1px solid ${inkstashColors.border}`,
                    borderRadius: inkstashRadii.md,
                    cursor: 'pointer',
                    transition: 'border-color 140ms ease, background-color 140ms ease',
                    '&:hover': { borderColor: inkstashColors.brand, bgcolor: inkstashColors.bgSunken },
                  }}
                  onClick={() => navigate(`/order/${o.id}`)}
                >
                  <Box
                    sx={{
                      width: 56,
                      height: 80,
                      flexShrink: 0,
                      borderRadius: inkstashRadii.sm,
                      bgcolor: inkstashColors.bgSunken,
                      backgroundImage: `url(${o.listing?.photos?.[0]?.url ?? PLACEHOLDER_IMAGE_URL})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }}
                  />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      sx={{
                        fontFamily: inkstashFonts.ui,
                        fontSize: 14,
                        fontWeight: 700,
                        color: inkstashColors.ink,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                      }}
                    >
                      {o.listing?.title ?? 'Order item'}
                    </Typography>
                    <Typography sx={{ fontFamily: inkstashFonts.mono, fontSize: 11, color: inkstashColors.muted, mt: 0.5 }}>
                      Order #{o.order_number}
                    </Typography>
                    {o.tracking_number && (
                      <Typography sx={{ fontFamily: inkstashFonts.mono, fontSize: 11.5, color: inkstashColors.brand, mt: 0.5 }}>
                        {o.carrier} · {o.tracking_number}
                      </Typography>
                    )}
                  </Box>
                  <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                    <Typography
                      sx={{
                        fontFamily: inkstashFonts.display,
                        fontWeight: 800,
                        fontSize: 15,
                        color: inkstashColors.ink,
                      }}
                    >
                      ${Number(o.total).toFixed(2)}
                    </Typography>
                    <Chip
                      label={o.status}
                      size="small"
                      sx={{
                        mt: 0.5,
                        height: 20,
                        fontFamily: inkstashFonts.mono,
                        fontSize: 9.5,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        bgcolor: inkstashColors.bgSunken,
                        color: inkstashColors.muted,
                      }}
                    />
                  </Box>
                </Box>
              ))}
            </Stack>
          </Paper>
        ))}

        {/* Total */}
        <Paper
          elevation={0}
          sx={{
            p: 2.5,
            mt: 2,
            border: `2px solid ${inkstashColors.ink}`,
            borderRadius: inkstashRadii.md,
            bgcolor: inkstashColors.bgElev,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Typography sx={{ fontFamily: inkstashFonts.display, fontWeight: 800, fontSize: 16, textTransform: 'uppercase', color: inkstashColors.ink }}>
            Total charged
          </Typography>
          <Typography sx={{ fontFamily: inkstashFonts.display, fontWeight: 900, fontSize: 26, color: inkstashColors.ink }}>
            ${Number(group.total_amount).toFixed(2)}
          </Typography>
        </Paper>

        <Divider sx={{ my: 4 }} />

        <Box sx={{ textAlign: 'center' }}>
          <Button
            variant="text"
            onClick={() => navigate('/marketplace')}
            sx={{
              fontFamily: inkstashFonts.ui,
              color: inkstashColors.muted,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              fontSize: 12,
              fontWeight: 700,
              '&:hover': { color: inkstashColors.brand, bgcolor: 'transparent' },
            }}
          >
            Keep browsing →
          </Button>
        </Box>
      </Container>
    </AppShell>
  );
}
