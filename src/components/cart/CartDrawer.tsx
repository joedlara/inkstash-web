// src/components/cart/CartDrawer.tsx
//
// Slide-over cart panel. Mounted globally from AppShell; opened by flipping
// CartContext.setDrawerOpen(true) from anywhere (top-nav cart icon today).
//
// Grouped by seller so a multi-seller cart visually maps to the multi-Transfer
// fan-out happening on the backend.

import { Box, Drawer, IconButton, Typography, Button, Divider } from '@mui/material';
import { Close } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../contexts/CartContext';
import CartItemRow from './CartItemRow';
import { inkstashColors, inkstashFonts, inkstashRadii } from '../../theme/inkstashTokens';

export default function CartDrawer() {
  const navigate = useNavigate();
  const {
    drawerOpen,
    setDrawerOpen,
    items,
    itemCount,
    totalPrice,
    totalShipping,
    grandTotal,
    groupedBySeller,
  } = useCart();

  const handleCheckout = () => {
    // Task 6 will replace this with the CartCheckoutModal mount. For now
    // close the drawer so the inevitable bug report tells me which surface
    // came next instead of "nothing happened."
    console.log('[CartDrawer] checkout clicked — modal lands in Task 6');
  };

  const handleBrowse = () => {
    setDrawerOpen(false);
    navigate('/marketplace');
  };

  return (
    <Drawer
      anchor="right"
      open={drawerOpen}
      onClose={() => setDrawerOpen(false)}
      PaperProps={{
        sx: {
          width: { xs: '100%', sm: 420 },
          bgcolor: inkstashColors.bg,
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2.5,
          py: 2,
          borderBottom: `1px solid ${inkstashColors.border}`,
          bgcolor: inkstashColors.bgElev,
        }}
      >
        <Typography
          sx={{
            fontFamily: inkstashFonts.display,
            fontSize: 22,
            fontWeight: 900,
            color: inkstashColors.ink,
            textTransform: 'uppercase',
            letterSpacing: '0.005em',
          }}
        >
          Cart {itemCount > 0 && (
            <Box component="span" sx={{ color: inkstashColors.brand }}>
              ({itemCount})
            </Box>
          )}
        </Typography>
        <IconButton onClick={() => setDrawerOpen(false)} aria-label="Close cart">
          <Close />
        </IconButton>
      </Box>

      {/* Body */}
      <Box sx={{ flex: 1, overflowY: 'auto', px: 2.5 }}>
        {items.length === 0 ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              py: 8,
              px: 2,
            }}
          >
            <Typography
              sx={{
                fontFamily: inkstashFonts.display,
                fontSize: 18,
                fontWeight: 800,
                textTransform: 'uppercase',
                color: inkstashColors.ink,
                mb: 1,
              }}
            >
              Your cart is empty
            </Typography>
            <Typography
              sx={{ fontSize: 14, color: inkstashColors.muted, mb: 3, maxWidth: 280 }}
            >
              Browse the marketplace and add comics to your cart to check out together.
            </Typography>
            <Button
              variant="contained"
              onClick={handleBrowse}
              sx={{
                bgcolor: inkstashColors.brand,
                color: '#fff',
                fontWeight: 700,
                px: 3,
                py: 1,
                textTransform: 'uppercase',
                fontFamily: inkstashFonts.ui,
                letterSpacing: '0.04em',
                '&:hover': { bgcolor: inkstashColors.brandDeep },
              }}
            >
              Browse marketplace
            </Button>
          </Box>
        ) : (
          groupedBySeller.map((group) => (
            <Box key={group.seller_id} sx={{ mt: 2 }}>
              <Box
                onClick={() => {
                  if (group.seller_username) {
                    setDrawerOpen(false);
                    navigate(`/@${group.seller_username}`);
                  }
                }}
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.5,
                  px: 1,
                  py: 0.4,
                  bgcolor: inkstashColors.bgSunken,
                  border: `1px solid ${inkstashColors.border}`,
                  borderRadius: 999,
                  cursor: group.seller_username ? 'pointer' : 'default',
                  mb: 0.5,
                  '&:hover': group.seller_username
                    ? { borderColor: inkstashColors.brand, color: inkstashColors.brand }
                    : undefined,
                }}
              >
                <Typography
                  sx={{
                    fontFamily: inkstashFonts.mono,
                    fontSize: 10.5,
                    fontWeight: 700,
                    color: inkstashColors.muted,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                  }}
                >
                  @{group.seller_username}
                </Typography>
              </Box>
              {group.items.map((it) => (
                <CartItemRow key={it.listing_id} item={it} />
              ))}
            </Box>
          ))
        )}
      </Box>

      {/* Footer with totals + CTA */}
      {items.length > 0 && (
        <Box
          sx={{
            borderTop: `1px solid ${inkstashColors.border}`,
            bgcolor: inkstashColors.bgElev,
            px: 2.5,
            py: 2,
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75 }}>
            <Typography sx={{ fontSize: 13, color: inkstashColors.muted, fontFamily: inkstashFonts.ui }}>
              Items
            </Typography>
            <Typography sx={{ fontSize: 13, color: inkstashColors.ink, fontFamily: inkstashFonts.mono }}>
              ${totalPrice.toFixed(2)}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
            <Typography sx={{ fontSize: 13, color: inkstashColors.muted, fontFamily: inkstashFonts.ui }}>
              Shipping
            </Typography>
            <Typography sx={{ fontSize: 13, color: inkstashColors.ink, fontFamily: inkstashFonts.mono }}>
              ${totalShipping.toFixed(2)}
            </Typography>
          </Box>
          <Divider sx={{ mb: 1.5, borderColor: inkstashColors.border }} />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 2 }}>
            <Typography
              sx={{
                fontFamily: inkstashFonts.display,
                fontSize: 16,
                fontWeight: 800,
                textTransform: 'uppercase',
                color: inkstashColors.ink,
              }}
            >
              Total
            </Typography>
            <Typography
              sx={{
                fontFamily: inkstashFonts.display,
                fontSize: 22,
                fontWeight: 900,
                color: inkstashColors.ink,
              }}
            >
              ${grandTotal.toFixed(2)}
            </Typography>
          </Box>
          <Button
            fullWidth
            variant="contained"
            onClick={handleCheckout}
            sx={{
              bgcolor: inkstashColors.brand,
              color: '#fff',
              fontWeight: 800,
              py: 1.3,
              textTransform: 'uppercase',
              fontFamily: inkstashFonts.ui,
              letterSpacing: '0.06em',
              borderRadius: inkstashRadii.sm,
              '&:hover': { bgcolor: inkstashColors.brandDeep },
            }}
          >
            Proceed to Checkout
          </Button>
        </Box>
      )}
    </Drawer>
  );
}
