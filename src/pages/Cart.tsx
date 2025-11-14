import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Card,
  CardMedia,
  CardContent,
  Button,
  IconButton,
  Stack,
  Divider,
  Paper,
  Grid,
} from '@mui/material';
import { Delete, ShoppingBag, ArrowBack } from '@mui/icons-material';
import DashboardHeader from '../components/home/DashboardHeader';
import { useCart } from '../contexts/CartContext';

export default function Cart() {
  const navigate = useNavigate();
  const { items, removeItem, clearCart, getTotalPrice } = useCart();

  const subtotal = items.reduce((sum, item) => sum + item.price, 0);
  const shippingTotal = items.reduce((sum, item) => sum + item.shippingCost, 0);
  const tax = subtotal * 0.08; // 8% tax
  const total = getTotalPrice() + tax;

  const handleCheckout = () => {
    if (items.length === 0) return;

    // For now, navigate to checkout with the first item
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
    navigate('/browse-featured');
  };

  if (items.length === 0) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
        <DashboardHeader />
        <Container maxWidth="lg" sx={{ mt: 12, py: 8 }}>
          <Box sx={{ textAlign: 'center', py: 12 }}>
            <ShoppingBag
              sx={{
                fontSize: 120,
                color: 'text.disabled',
                mb: 3,
              }}
            />
            <Typography variant="h4" fontWeight={700} gutterBottom>
              Your Cart is Empty
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 500, mx: 'auto' }}>
              Start adding items to your cart by browsing our featured collectibles or placing bids on auctions.
            </Typography>
            <Stack direction="row" spacing={2} justifyContent="center">
              <Button
                variant="contained"
                size="large"
                onClick={() => navigate('/browse-featured')}
              >
                Browse Collectibles
              </Button>
              <Button
                variant="outlined"
                size="large"
                onClick={() => navigate('/')}
              >
                Go to Home
              </Button>
            </Stack>
          </Box>
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <DashboardHeader />
      <Container maxWidth="lg" sx={{ mt: 12, py: 8 }}>
        {/* Header */}
        <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={() => navigate(-1)} sx={{ color: 'text.primary' }}>
            <ArrowBack />
          </IconButton>
          <Typography variant="h4" component="h1" fontWeight="bold">
            Shopping Cart ({items.length} {items.length === 1 ? 'item' : 'items'})
          </Typography>
        </Box>

        <Grid container spacing={3}>
          {/* Cart Items */}
          <Grid item xs={12} md={8}>
            <Stack spacing={2}>
              {items.map((item) => (
                <Card key={item.auctionId} elevation={2}>
                  <CardContent>
                    <Grid container spacing={2}>
                      {/* Item Image */}
                      <Grid item xs={3}>
                        <CardMedia
                          component="img"
                          image={item.imageUrl || 'https://via.placeholder.com/150'}
                          alt={item.title}
                          sx={{
                            width: '100%',
                            height: 120,
                            objectFit: 'cover',
                            borderRadius: 1,
                            cursor: 'pointer',
                          }}
                          onClick={() => navigate(`/item/${item.auctionId}`)}
                        />
                      </Grid>

                      {/* Item Details */}
                      <Grid item xs={6}>
                        <Typography
                          variant="h6"
                          fontWeight={600}
                          gutterBottom
                          sx={{
                            cursor: 'pointer',
                            '&:hover': { color: 'primary.main' },
                          }}
                          onClick={() => navigate(`/item/${item.auctionId}`)}
                        >
                          {item.title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          {item.type === 'buy_now' ? 'Buy Now Purchase' : 'Winning Bid'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Shipping: ${item.shippingCost.toFixed(2)}
                        </Typography>
                      </Grid>

                      {/* Price and Actions */}
                      <Grid item xs={3}>
                        <Stack spacing={1} alignItems="flex-end" height="100%">
                          <Typography variant="h6" fontWeight={700} color="primary">
                            ${item.price.toFixed(2)}
                          </Typography>
                          <Box sx={{ flex: 1 }} />
                          <IconButton
                            color="error"
                            onClick={() => removeItem(item.auctionId)}
                            size="small"
                          >
                            <Delete />
                          </IconButton>
                        </Stack>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              ))}

              {/* Clear Cart Button */}
              <Button
                variant="outlined"
                color="error"
                onClick={clearCart}
                startIcon={<Delete />}
                sx={{ alignSelf: 'flex-start' }}
              >
                Clear Cart
              </Button>
            </Stack>
          </Grid>

          {/* Order Summary */}
          <Grid item xs={12} md={4}>
            <Paper elevation={2} sx={{ p: 3, position: 'sticky', top: 100 }}>
              <Typography variant="h6" fontWeight={700} gutterBottom>
                Order Summary
              </Typography>

              <Divider sx={{ my: 2 }} />

              <Stack spacing={1.5}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2">Subtotal ({items.length} items)</Typography>
                  <Typography variant="body2" fontWeight={600}>
                    ${subtotal.toFixed(2)}
                  </Typography>
                </Stack>

                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2">Shipping</Typography>
                  <Typography variant="body2" fontWeight={600}>
                    ${shippingTotal.toFixed(2)}
                  </Typography>
                </Stack>

                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2">Estimated Tax</Typography>
                  <Typography variant="body2" fontWeight={600}>
                    ${tax.toFixed(2)}
                  </Typography>
                </Stack>

                <Divider />

                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="h6" fontWeight={700}>
                    Total
                  </Typography>
                  <Typography variant="h6" fontWeight={700} color="primary">
                    ${total.toFixed(2)}
                  </Typography>
                </Stack>
              </Stack>

              <Button
                variant="contained"
                size="large"
                fullWidth
                sx={{ mt: 3 }}
                onClick={handleCheckout}
              >
                Proceed to Checkout
              </Button>

              <Button
                variant="outlined"
                size="large"
                fullWidth
                sx={{ mt: 2 }}
                onClick={handleContinueShopping}
              >
                Continue Shopping
              </Button>

              <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  💳 Secure checkout with Stripe
                </Typography>
                <br />
                <Typography variant="caption" color="text.secondary">
                  🔒 Your payment information is encrypted
                </Typography>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
