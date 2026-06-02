import { useNavigate } from 'react-router-dom';
import { Box, Container, Stack } from '@mui/material';
import { Trash2, ShoppingBag, ArrowLeft, Lock } from 'lucide-react';
import AppShell from '../components/layout/AppShell';
import { useCart } from '../contexts/CartContext';
import { inkstashColors, inkstashFonts, inkstashRadii, inkstashShadows } from '../theme/inkstashTokens';
import { PLACEHOLDER_IMAGE_URL } from '../utils/placeholders';

export default function Cart() {
  const navigate = useNavigate();
  const { items, removeItem, clearCart, getTotalPrice } = useCart();

  const subtotal = items.reduce((sum, item) => sum + item.price, 0);
  const shippingTotal = items.reduce((sum, item) => sum + item.shippingCost, 0);
  const tax = subtotal * 0.08;
  const total = getTotalPrice() + tax;

  const handleCheckout = () => {
    if (items.length === 0) return;

    // TODO: Implement batch checkout for multiple items
    const firstItem = items[0];
    navigate('/checkout', {
      state: {
        auctionId: firstItem.auctionId,
        itemTitle: firstItem.title,
        price: firstItem.price,
        imageUrl: firstItem.imageUrl,
        type: firstItem.type,
        sellerId: firstItem.sellerId,
        shippingCost: firstItem.shippingCost,
      },
    });
  };

  const handleContinueShopping = () => {
    navigate('/packs');
  };

  if (items.length === 0) {
    return (
      <AppShell>
        <Container maxWidth="md" sx={{ pb: 8 }}>
          <Box sx={{
            bgcolor: inkstashColors.bgElev,
            border: `1px solid ${inkstashColors.border}`,
            borderRadius: inkstashRadii.lg,
            padding: { xs: '48px 24px', md: '80px 32px' },
            textAlign: 'center',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
          }}>
            <Box sx={{
              width: 96, height: 96, borderRadius: '50%',
              bgcolor: inkstashColors.bgSunken,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: inkstashColors.muted,
              mb: 1,
            }}>
              <ShoppingBag size={44} strokeWidth={1.5} />
            </Box>
            <Box component="h1" sx={{
              fontFamily: inkstashFonts.display, fontWeight: 800,
              fontSize: 'clamp(28px, 4vw, 40px)',
              letterSpacing: '0.005em', m: 0, textTransform: 'uppercase', lineHeight: 1,
              color: inkstashColors.ink,
            }}>
              Your Cart is Empty
            </Box>
            <Box sx={{
              color: inkstashColors.ink2, fontSize: 14.5, maxWidth: 460,
              lineHeight: 1.55, mb: 1.5,
            }}>
              Start adding items to your cart by browsing our featured collectibles or placing bids on auctions.
            </Box>
            <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5}>
              <Box
                component="button"
                type="button"
                onClick={() => navigate('/packs')}
                sx={{
                  bgcolor: inkstashColors.brand, color: '#fff', border: 'none',
                  padding: '12px 24px', borderRadius: 1.25,
                  fontFamily: inkstashFonts.ui, fontWeight: 600, fontSize: 14.5,
                  cursor: 'pointer',
                  transition: 'background 140ms ease, transform 100ms ease',
                  '&:hover': { bgcolor: inkstashColors.brandDeep },
                  '&:active': { transform: 'scale(0.97)' },
                }}
              >
                Browse Packs
              </Box>
              <Box
                component="button"
                type="button"
                onClick={() => navigate('/')}
                sx={{
                  bgcolor: 'transparent', color: inkstashColors.ink,
                  border: `1px solid ${inkstashColors.borderStrong}`,
                  padding: '12px 24px', borderRadius: 1.25,
                  fontFamily: inkstashFonts.ui, fontWeight: 500, fontSize: 14.5,
                  cursor: 'pointer',
                  transition: 'background 140ms ease',
                  '&:hover': { bgcolor: inkstashColors.bgSunken },
                  '&:active': { transform: 'scale(0.97)' },
                }}
              >
                Go to Home
              </Box>
            </Stack>
          </Box>
        </Container>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <Container maxWidth="lg" sx={{ pb: 8 }}>
        <Stack direction="row" alignItems="center" gap={1.5} sx={{ mb: 3.5 }}>
          <Box
            component="button"
            type="button"
            aria-label="Back"
            onClick={() => navigate(-1)}
            sx={{
              display: 'grid', placeItems: 'center',
              width: 36, height: 36, borderRadius: '50%',
              bgcolor: 'transparent', border: 'none', cursor: 'pointer',
              color: inkstashColors.ink,
              transition: 'background 140ms ease',
              '&:hover': { bgcolor: inkstashColors.bgSunken },
            }}
          >
            <ArrowLeft size={18} />
          </Box>
          <Box component="h1" sx={{
            fontFamily: inkstashFonts.display, fontWeight: 800,
            fontSize: 'clamp(24px, 3vw, 36px)',
            letterSpacing: '0.005em', m: 0, textTransform: 'uppercase', lineHeight: 1,
            color: inkstashColors.ink,
          }}>
            Cart
          </Box>
          <Box sx={{
            fontFamily: inkstashFonts.mono, fontSize: 12,
            color: inkstashColors.muted, letterSpacing: '0.06em', textTransform: 'uppercase',
            ml: 0.5, mt: 0.5,
          }}>
            {items.length} {items.length === 1 ? 'item' : 'items'}
          </Box>
        </Stack>

        <Box sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 360px' },
          gap: { xs: 2, md: 3 },
          alignItems: 'flex-start',
        }}>
          <Stack gap={1.5}>
            {items.map(item => (
              <Box
                key={item.auctionId}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '88px 1fr', sm: '120px 1fr auto' },
                  gap: { xs: 1.5, sm: 2 },
                  alignItems: 'center',
                  padding: 1.75,
                  bgcolor: inkstashColors.bgElev,
                  border: `1px solid ${inkstashColors.border}`,
                  borderRadius: inkstashRadii.lg,
                  transition: 'border-color 140ms ease, box-shadow 140ms ease',
                  '&:hover': {
                    borderColor: inkstashColors.borderStrong,
                    boxShadow: inkstashShadows.sm,
                  },
                }}
              >
                <Box
                  component="img"
                  src={item.imageUrl || PLACEHOLDER_IMAGE_URL}
                  alt={item.title}
                  onClick={() => navigate(`/item/${item.auctionId}`)}
                  sx={{
                    width: '100%',
                    height: { xs: 88, sm: 110 },
                    objectFit: 'cover',
                    borderRadius: inkstashRadii.md,
                    cursor: 'pointer',
                    bgcolor: inkstashColors.bgSunken,
                  }}
                />
                <Box sx={{ minWidth: 0 }}>
                  <Box
                    onClick={() => navigate(`/item/${item.auctionId}`)}
                    sx={{
                      fontFamily: inkstashFonts.display, fontWeight: 800,
                      fontSize: { xs: 15, sm: 17 },
                      lineHeight: 1.2, color: inkstashColors.ink,
                      textTransform: 'uppercase', letterSpacing: '0.005em',
                      cursor: 'pointer',
                      mb: 0.5,
                      overflow: 'hidden', textOverflow: 'ellipsis',
                      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                      '&:hover': { color: inkstashColors.brand },
                    }}
                  >
                    {item.title}
                  </Box>
                  <Box sx={{
                    fontFamily: inkstashFonts.mono, fontSize: 11,
                    color: inkstashColors.muted, letterSpacing: '0.06em', textTransform: 'uppercase',
                  }}>
                    {item.type === 'buy_now' ? 'Buy Now' : 'Winning Bid'}
                  </Box>
                  <Box sx={{
                    fontFamily: inkstashFonts.mono, fontSize: 11,
                    color: inkstashColors.muted, mt: 0.5,
                  }}>
                    Shipping ${item.shippingCost.toFixed(2)}
                  </Box>
                  <Box sx={{
                    display: { xs: 'flex', sm: 'none' },
                    justifyContent: 'space-between', alignItems: 'center', mt: 1,
                  }}>
                    <Box sx={{
                      fontFamily: inkstashFonts.display, fontWeight: 800, fontSize: 18,
                      color: inkstashColors.ink,
                    }}>
                      ${item.price.toFixed(2)}
                    </Box>
                    <Box
                      component="button"
                      type="button"
                      aria-label="Remove item"
                      onClick={() => removeItem(item.auctionId)}
                      sx={{
                        display: 'grid', placeItems: 'center',
                        width: 32, height: 32, borderRadius: '50%',
                        bgcolor: 'transparent', border: 'none', cursor: 'pointer',
                        color: inkstashColors.muted,
                        transition: 'background 140ms ease, color 140ms ease',
                        '&:hover': { bgcolor: inkstashColors.brandSoft, color: inkstashColors.brand },
                      }}
                    >
                      <Trash2 size={16} />
                    </Box>
                  </Box>
                </Box>
                <Stack alignItems="flex-end" gap={1.5} sx={{ display: { xs: 'none', sm: 'flex' } }}>
                  <Box sx={{
                    fontFamily: inkstashFonts.display, fontWeight: 800, fontSize: 20,
                    color: inkstashColors.ink, lineHeight: 1,
                  }}>
                    ${item.price.toFixed(2)}
                  </Box>
                  <Box
                    component="button"
                    type="button"
                    aria-label="Remove item"
                    onClick={() => removeItem(item.auctionId)}
                    sx={{
                      display: 'grid', placeItems: 'center',
                      width: 32, height: 32, borderRadius: '50%',
                      bgcolor: 'transparent', border: 'none', cursor: 'pointer',
                      color: inkstashColors.muted,
                      transition: 'background 140ms ease, color 140ms ease',
                      '&:hover': { bgcolor: inkstashColors.brandSoft, color: inkstashColors.brand },
                    }}
                  >
                    <Trash2 size={16} />
                  </Box>
                </Stack>
              </Box>
            ))}

            <Box
              component="button"
              type="button"
              onClick={clearCart}
              sx={{
                display: 'inline-flex', alignItems: 'center', gap: 0.75,
                alignSelf: 'flex-start',
                bgcolor: 'transparent',
                border: `1px solid ${inkstashColors.border}`,
                color: inkstashColors.ink2,
                padding: '8px 14px', borderRadius: 1.25,
                fontFamily: inkstashFonts.ui, fontSize: 12.5, fontWeight: 500,
                cursor: 'pointer',
                transition: 'background 140ms ease, border-color 140ms ease, color 140ms ease',
                '&:hover': {
                  bgcolor: inkstashColors.brandSoft,
                  borderColor: `${inkstashColors.brand}55`,
                  color: inkstashColors.brand,
                },
              }}
            >
              <Trash2 size={14} />
              Clear Cart
            </Box>
          </Stack>

          <Box sx={{
            position: { md: 'sticky' },
            top: { md: 88 },
            bgcolor: inkstashColors.bgElev,
            border: `1px solid ${inkstashColors.border}`,
            borderRadius: inkstashRadii.lg,
            padding: { xs: 2.25, md: 2.75 },
          }}>
            <Box component="h2" sx={{
              fontFamily: inkstashFonts.display, fontWeight: 800,
              fontSize: 20, letterSpacing: '0.005em',
              m: 0, textTransform: 'uppercase', lineHeight: 1,
              color: inkstashColors.ink, mb: 2,
            }}>
              Order Summary
            </Box>

            <Stack gap={1.25} sx={{
              borderTop: `1px solid ${inkstashColors.border}`,
              paddingTop: 2,
            }}>
              {[
                { label: `Subtotal · ${items.length} item${items.length !== 1 ? 's' : ''}`, value: subtotal },
                { label: 'Shipping', value: shippingTotal },
                { label: 'Estimated tax', value: tax },
              ].map(row => (
                <Stack key={row.label} direction="row" justifyContent="space-between" alignItems="baseline">
                  <Box sx={{
                    fontFamily: inkstashFonts.mono, fontSize: 12,
                    color: inkstashColors.muted, letterSpacing: '0.04em',
                  }}>
                    {row.label}
                  </Box>
                  <Box sx={{
                    fontFamily: inkstashFonts.ui, fontSize: 14, fontWeight: 600,
                    color: inkstashColors.ink,
                  }}>
                    ${row.value.toFixed(2)}
                  </Box>
                </Stack>
              ))}

              <Box sx={{ borderTop: `1px solid ${inkstashColors.border}`, mt: 1, pt: 1.5 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="baseline">
                  <Box sx={{
                    fontFamily: inkstashFonts.mono, fontSize: 11,
                    color: inkstashColors.muted, letterSpacing: '0.08em', textTransform: 'uppercase',
                  }}>
                    Total
                  </Box>
                  <Box sx={{
                    fontFamily: inkstashFonts.display, fontWeight: 800, fontSize: 28,
                    color: inkstashColors.brand, lineHeight: 1,
                  }}>
                    ${total.toFixed(2)}
                  </Box>
                </Stack>
              </Box>
            </Stack>

            <Box
              component="button"
              type="button"
              onClick={handleCheckout}
              sx={{
                width: '100%', mt: 2.5,
                bgcolor: inkstashColors.brand, color: '#fff', border: 'none',
                padding: '14px 18px', borderRadius: 1.25,
                fontFamily: inkstashFonts.ui, fontWeight: 600, fontSize: 14.5,
                cursor: 'pointer',
                transition: 'background 140ms ease, transform 100ms ease',
                '&:hover': { bgcolor: inkstashColors.brandDeep },
                '&:active': { transform: 'scale(0.98)' },
              }}
            >
              Proceed to Checkout
            </Box>

            <Box
              component="button"
              type="button"
              onClick={handleContinueShopping}
              sx={{
                width: '100%', mt: 1.25,
                bgcolor: 'transparent', color: inkstashColors.ink,
                border: `1px solid ${inkstashColors.borderStrong}`,
                padding: '12px 18px', borderRadius: 1.25,
                fontFamily: inkstashFonts.ui, fontWeight: 500, fontSize: 14.5,
                cursor: 'pointer',
                transition: 'background 140ms ease',
                '&:hover': { bgcolor: inkstashColors.bgSunken },
                '&:active': { transform: 'scale(0.98)' },
              }}
            >
              Continue Shopping
            </Box>

            <Stack direction="row" alignItems="center" gap={1} sx={{
              mt: 2.5, padding: '10px 12px',
              bgcolor: inkstashColors.bgSunken,
              borderRadius: inkstashRadii.md,
            }}>
              <Lock size={13} color={inkstashColors.muted} />
              <Box sx={{
                fontFamily: inkstashFonts.mono, fontSize: 11,
                color: inkstashColors.muted, letterSpacing: '0.02em',
              }}>
                Secure Stripe checkout — encrypted end to end
              </Box>
            </Stack>
          </Box>
        </Box>
      </Container>
    </AppShell>
  );
}
