import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Container, Stack } from '@mui/material';
import {
  ShoppingBag,
  Truck,
  CheckCircle2,
  XCircle,
  Eye,
  Settings,
  AlertCircle,
  X,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { ordersAPI, type Order } from '../api/orders';
import AppShell from '../components/layout/AppShell';
import { inkstashColors, inkstashFonts, inkstashRadii, inkstashShadows } from '../theme/inkstashTokens';

type StatusKey = Order['status'];

const STATUS_STYLES: Record<StatusKey, { label: string; bg: string; fg: string }> = {
  pending:    { label: 'PENDING',    bg: inkstashColors.bgSunken,  fg: inkstashColors.ink2 },
  processing: { label: 'PROCESSING', bg: `${inkstashColors.cobalt}1A`, fg: inkstashColors.cobalt },
  shipped:    { label: 'SHIPPED',    bg: inkstashColors.ink,       fg: '#fff' },
  delivered:  { label: 'DELIVERED',  bg: inkstashColors.goldSoft,  fg: inkstashColors.gold },
  cancelled:  { label: 'CANCELLED',  bg: inkstashColors.brandSoft, fg: inkstashColors.brand },
  refunded:   { label: 'REFUNDED',   bg: inkstashColors.brandSoft, fg: inkstashColors.brand },
};

function StatusIcon({ status, size = 13 }: { status: StatusKey; size?: number }) {
  switch (status) {
    case 'processing': return <ShoppingBag size={size} />;
    case 'shipped':    return <Truck size={size} />;
    case 'delivered':  return <CheckCircle2 size={size} />;
    case 'cancelled':
    case 'refunded':   return <XCircle size={size} />;
    default:           return <ShoppingBag size={size} />;
  }
}

type Tab = 'purchases' | 'sales';

function OrderCard({
  order,
  isSeller,
  onView,
}: {
  order: Order;
  isSeller: boolean;
  onView: (id: string) => void;
}) {
  const auction = Array.isArray(order.auctions) ? order.auctions[0] : order.auctions;
  const listing = Array.isArray(order.listings) ? order.listings[0] : order.listings;
  const itemTitle = auction?.title ?? listing?.title ?? 'Order item';
  const itemImage = auction?.image_url ?? listing?.photos?.[0]?.url ?? null;
  const status = STATUS_STYLES[order.status];

  return (
    <Box sx={{
      bgcolor: inkstashColors.bgElev,
      border: `1px solid ${inkstashColors.border}`,
      borderRadius: inkstashRadii.lg,
      overflow: 'hidden',
      display: 'flex',
      flexDirection: { xs: 'column', sm: 'row' },
      transition: 'transform 140ms ease, box-shadow 140ms ease, border-color 140ms ease',
      cursor: 'pointer',
      '&:hover': {
        transform: 'translateY(-2px)',
        boxShadow: inkstashShadows.md,
        borderColor: inkstashColors.borderStrong,
      },
    }} onClick={() => onView(order.id)}>
      <Box sx={{
        width: { xs: '100%', sm: 200 },
        height: { xs: 180, sm: 'auto' },
        minHeight: { sm: 170 },
        flexShrink: 0,
        bgcolor: inkstashColors.bgSunken,
        overflow: 'hidden',
      }}>
        {itemImage && (
          <Box
            component="img"
            src={itemImage}
            alt={itemTitle}
            sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        )}
      </Box>

      <Box sx={{
        flex: 1,
        padding: { xs: '16px 18px', md: '20px 22px' },
        display: 'flex', flexDirection: 'column', gap: 1.25,
        minWidth: 0,
      }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1} flexWrap="wrap">
          <Box sx={{
            fontFamily: inkstashFonts.mono, fontSize: 11,
            color: inkstashColors.muted, letterSpacing: '0.06em', textTransform: 'uppercase',
          }}>
            Order #{order.order_number}
          </Box>
          <Box sx={{
            display: 'inline-flex', alignItems: 'center', gap: 0.6,
            bgcolor: status.bg, color: status.fg,
            fontFamily: inkstashFonts.mono,
            fontSize: 10.5, fontWeight: 700, letterSpacing: '0.08em',
            padding: '4px 10px', borderRadius: 999,
          }}>
            <StatusIcon status={order.status} />
            {status.label}
          </Box>
        </Stack>

        <Box sx={{
          fontFamily: inkstashFonts.display, fontWeight: 800,
          fontSize: 18, lineHeight: 1.2,
          textTransform: 'uppercase', letterSpacing: '0.005em',
          color: inkstashColors.ink,
          overflow: 'hidden', textOverflow: 'ellipsis',
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        }}>
          {itemTitle}
        </Box>

        <Box sx={{
          fontFamily: inkstashFonts.mono, fontSize: 11.5,
          color: inkstashColors.muted,
        }}>
          Ordered {new Date(order.created_at).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })}
        </Box>

        {order.tracking_number && (
          <Stack direction="row" alignItems="center" gap={0.75}>
            <Truck size={12} color={inkstashColors.cobalt} />
            <Box sx={{
              fontFamily: inkstashFonts.mono, fontSize: 11,
              color: inkstashColors.cobalt,
            }}>
              {order.carrier ? `${order.carrier} ` : ''}{order.tracking_number}
            </Box>
          </Stack>
        )}

        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          flexWrap="wrap"
          gap={1.25}
          sx={{
            mt: 'auto',
            paddingTop: 1.5,
            borderTop: `1px solid ${inkstashColors.border}`,
          }}
        >
          <Box sx={{
            fontFamily: inkstashFonts.display, fontWeight: 800, fontSize: 22,
            color: inkstashColors.brand, lineHeight: 1,
          }}>
            ${order.total.toFixed(2)}
          </Box>
          <Box
            component="button"
            type="button"
            onClick={(e) => { e.stopPropagation(); onView(order.id); }}
            sx={{
              display: 'inline-flex', alignItems: 'center', gap: 0.75,
              bgcolor: isSeller ? inkstashColors.brand : 'transparent',
              color: isSeller ? '#fff' : inkstashColors.ink,
              border: isSeller ? 'none' : `1px solid ${inkstashColors.borderStrong}`,
              padding: '8px 14px', borderRadius: 1.25,
              fontFamily: inkstashFonts.ui,
              fontWeight: 600, fontSize: 13,
              cursor: 'pointer',
              transition: 'background 140ms ease, transform 100ms ease',
              '&:hover': isSeller
                ? { bgcolor: inkstashColors.brandDeep }
                : { bgcolor: inkstashColors.bgSunken },
              '&:active': { transform: 'scale(0.97)' },
            }}
          >
            {isSeller ? <Settings size={14} /> : <Eye size={14} />}
            {isSeller ? 'Manage Order' : 'View Details'}
          </Box>
        </Stack>
      </Box>
    </Box>
  );
}

function EmptyState({
  icon: Icon,
  title,
  body,
  cta,
  onCta,
}: {
  icon: typeof ShoppingBag;
  title: string;
  body: string;
  cta: string;
  onCta: () => void;
}) {
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
        <Icon size={40} strokeWidth={1.5} />
      </Box>
      <Box component="h2" sx={{
        fontFamily: inkstashFonts.display, fontWeight: 800,
        fontSize: 'clamp(22px, 3vw, 30px)',
        letterSpacing: '0.005em', m: 0, textTransform: 'uppercase', lineHeight: 1,
        color: inkstashColors.ink,
      }}>
        {title}
      </Box>
      <Box sx={{
        color: inkstashColors.ink2, fontSize: 14, maxWidth: 400, lineHeight: 1.55,
      }}>
        {body}
      </Box>
      <Box
        component="button"
        type="button"
        onClick={onCta}
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
        {cta}
      </Box>
    </Box>
  );
}

function LoadingState() {
  return (
    <Stack gap={1.5}>
      {[1, 2, 3].map(i => (
        <Box key={i} sx={{
          bgcolor: inkstashColors.bgElev,
          border: `1px solid ${inkstashColors.border}`,
          borderRadius: inkstashRadii.lg,
          height: 170,
        }} />
      ))}
    </Stack>
  );
}

export default function Purchases() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [purchases, setPurchases] = useState<Order[]>([]);
  const [sales, setSales] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('purchases');

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, navigate]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const [purchasesData, salesData] = await Promise.all([
        ordersAPI.getMyPurchases(),
        ordersAPI.getMySales(),
      ]);
      setPurchases(purchasesData);
      setSales(salesData);
    } catch (err) {
      console.error('Error loading orders:', err);
      setError('Failed to load your orders. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleViewOrder = (id: string) => navigate(`/order/${id}`);

  const TABS: { key: Tab; label: string; count: number }[] = [
    { key: 'purchases', label: 'Purchases', count: purchases.length },
    { key: 'sales',     label: 'Sales',     count: sales.length },
  ];

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
            My Orders
          </Box>
          <Box sx={{
            color: inkstashColors.muted, fontSize: 13.5, mt: 0.75, lineHeight: 1.5,
          }}>
            View and manage your purchases and sales.
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
          mb: 3,
        }}>
          {TABS.map(t => {
            const active = tab === t.key;
            const Icon = t.key === 'purchases' ? ShoppingBag : Truck;
            return (
              <Box
                key={t.key}
                component="button"
                type="button"
                onClick={() => setTab(t.key)}
                sx={{
                  display: 'inline-flex', alignItems: 'center', gap: 0.85,
                  padding: '8px 16px',
                  borderRadius: 999, border: 'none', cursor: 'pointer',
                  fontSize: 12.5, fontWeight: 500, fontFamily: inkstashFonts.ui,
                  bgcolor: active ? inkstashColors.bgElev : 'transparent',
                  color: active ? inkstashColors.ink : inkstashColors.ink2,
                  boxShadow: active ? inkstashShadows.sm : 'none',
                  transition: 'all 140ms ease',
                  whiteSpace: 'nowrap',
                }}
              >
                <Icon size={14} />
                {t.label}
                <Box component="span" sx={{
                  fontFamily: inkstashFonts.mono, fontSize: 11,
                  color: active ? inkstashColors.muted : inkstashColors.muted2,
                  ml: 0.25,
                }}>
                  {t.count}
                </Box>
              </Box>
            );
          })}
        </Box>

        {loading ? (
          <LoadingState />
        ) : tab === 'purchases' ? (
          purchases.length === 0 ? (
            <EmptyState
              icon={ShoppingBag}
              title="No purchases yet"
              body="Start shopping to see your purchases here."
              cta="Browse Items"
              onCta={() => navigate('/')}
            />
          ) : (
            <Stack gap={1.5}>
              {purchases.map(order => (
                <OrderCard key={order.id} order={order} isSeller={false} onView={handleViewOrder} />
              ))}
            </Stack>
          )
        ) : (
          sales.length === 0 ? (
            <EmptyState
              icon={Truck}
              title="No sales yet"
              body="When someone purchases your items, they'll appear here."
              cta="Create Listing"
              onCta={() => navigate('/list-item')}
            />
          ) : (
            <Stack gap={1.5}>
              {sales.map(order => (
                <OrderCard key={order.id} order={order} isSeller={true} onView={handleViewOrder} />
              ))}
            </Stack>
          )
        )}
      </Container>
    </AppShell>
  );
}
