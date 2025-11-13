import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Container,
  Grid,
  Card,
  CardContent,
  AppBar,
  Toolbar,
  Stack,
  Avatar,
  Rating,
} from '@mui/material';
import AuthModal from '../components/auth/AuthModal';

export default function Seller() {
  const navigate = useNavigate();
  const [showAuthModal, setShowAuthModal] = useState(false);

  const handleGetStarted = () => {
    setShowAuthModal(true);
  };

  const benefits = [
    {
      icon: (
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
          <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="#0078FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M2 17L12 22L22 17" stroke="#0078FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M2 12L12 17L22 12" stroke="#0078FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      title: 'Live Engagement',
      description: 'Connect with buyers in real-time through live streaming auctions. Build relationships and create excitement around your items.',
    },
    {
      icon: (
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" stroke="#0078FF" strokeWidth="2"/>
          <path d="M12 6v6l4 2" stroke="#0078FF" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      ),
      title: 'Quick Payouts',
      description: 'Get paid fast with our streamlined payment system. Funds are transferred to your account within 2-3 business days.',
    },
    {
      icon: (
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="#0078FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx="9" cy="7" r="4" stroke="#0078FF" strokeWidth="2"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" stroke="#0078FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="#0078FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      title: 'Built-in Audience',
      description: 'Access thousands of active collectors and enthusiasts looking for unique items. No need to build an audience from scratch.',
    },
    {
      icon: (
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="11" width="18" height="11" rx="2" stroke="#0078FF" strokeWidth="2"/>
          <path d="M7 11V7a5 5 0 0110 0v4" stroke="#0078FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      title: 'Safe & Secure',
      description: 'Protected payments and verified buyers. We handle the transactions so you can focus on selling.',
    },
    {
      icon: (
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" stroke="#0078FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <polyline points="3.27 6.96 12 12.01 20.73 6.96" stroke="#0078FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <line x1="12" y1="22.08" x2="12" y2="12" stroke="#0078FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      title: 'Easy Shipping',
      description: 'Integrated shipping solutions and prepaid labels make fulfillment simple. Ship directly from our dashboard.',
    },
    {
      icon: (
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
          <path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76z" stroke="#0078FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M12 8v4l2 2" stroke="#0078FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      title: 'Flexible Schedule',
      description: 'Go live whenever works for you. Sell on your own schedule and build your business at your own pace.',
    },
  ];

  const steps = [
    {
      number: 1,
      title: 'Sign Up & Set Up',
      description: 'Create your seller account in minutes. Complete verification and set up your payment information.',
    },
    {
      number: 2,
      title: 'List Your Items',
      description: 'Upload photos and descriptions of items you want to sell. Set starting bids and reserve prices.',
    },
    {
      number: 3,
      title: 'Go Live',
      description: 'Start your live auction stream. Showcase items, engage with bidders, and watch the excitement build.',
    },
    {
      number: 4,
      title: 'Ship & Get Paid',
      description: 'Pack and ship sold items using our integrated shipping tools. Receive payment within 2-3 days.',
    },
  ];

  const testimonials = [
    {
      rating: 5,
      text: '"I\'ve been selling collectibles for years, but InkStash completely changed my business. The live format creates so much excitement, and I\'m making 3x what I did on other platforms!"',
      name: 'Sarah M.',
      role: 'Trading Card Seller',
    },
    {
      rating: 5,
      text: '"The community on InkStash is incredible. I\'ve built a loyal following who tune in every week. It\'s not just about selling—it\'s about connecting with fellow enthusiasts."',
      name: 'Marcus R.',
      role: 'Vintage Toy Collector',
    },
    {
      rating: 5,
      text: '"From setup to first sale took less than a day. The platform is so easy to use, and the support team is always there when I need help. Highly recommend!"',
      name: 'Jennifer L.',
      role: 'Comic Book Seller',
    },
  ];

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>
      {/* Navigation */}
      <AppBar position="sticky" elevation={0} sx={{ bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider' }}>
        <Toolbar sx={{ maxWidth: 1600, mx: 'auto', width: '100%', px: { xs: 2, md: 4 } }}>
          <Box
            onClick={() => navigate('/')}
            sx={{ display: 'flex', alignItems: 'center', gap: 1.5, cursor: 'pointer', flexGrow: 1 }}
          >
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
              <circle cx="20" cy="20" r="18" fill="#000000"/>
              <path d="M20 10L25 15L20 20L15 15L20 10Z" fill="#0078FF"/>
              <path d="M20 20L25 25L20 30L15 25L20 20Z" fill="#0078FF"/>
            </svg>
            <Typography variant="h6" fontWeight={700} color="text.primary">
              inkstash
            </Typography>
          </Box>
          <Button
            variant="contained"
            onClick={handleGetStarted}
            sx={{ textTransform: 'none', fontWeight: 600, px: 3 }}
          >
            Get Started
          </Button>
        </Toolbar>
      </AppBar>

      {/* Hero Section */}
      <Box
        component="section"
        sx={{
          py: { xs: 8, md: 12 },
          px: { xs: 2, md: 4 },
          textAlign: 'center',
          bgcolor: 'background.paper',
        }}
      >
        <Container maxWidth="lg">
          <Typography
            variant="h2"
            fontWeight={700}
            gutterBottom
            sx={{ fontSize: { xs: '2.5rem', md: '3.5rem' }, mb: 3 }}
          >
            Turn Your Passion Into Profit
          </Typography>
          <Typography
            variant="h6"
            color="text.secondary"
            sx={{ mb: 4, maxWidth: 800, mx: 'auto', lineHeight: 1.6 }}
          >
            Join thousands of sellers who are building their business through live auctions.
            Share your collection, connect with enthusiasts, and grow your income.
          </Typography>
          <Button
            variant="contained"
            size="large"
            onClick={handleGetStarted}
            sx={{
              px: 6,
              py: 2,
              fontSize: '1.125rem',
              fontWeight: 700,
              textTransform: 'none',
              borderRadius: 999,
              mb: 8,
            }}
          >
            Start Selling Today
          </Button>

          <Grid container spacing={4} justifyContent="center">
            <Grid size={{ xs: 12, sm: 4 }}>
              <Typography variant="h3" fontWeight={700} color="primary">
                $50M+
              </Typography>
              <Typography variant="body1" color="text.secondary" fontWeight={600}>
                Paid to Sellers
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <Typography variant="h3" fontWeight={700} color="primary">
                10K+
              </Typography>
              <Typography variant="body1" color="text.secondary" fontWeight={600}>
                Active Sellers
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <Typography variant="h3" fontWeight={700} color="primary">
                1M+
              </Typography>
              <Typography variant="body1" color="text.secondary" fontWeight={600}>
                Items Sold
              </Typography>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Benefits Section */}
      <Box component="section" sx={{ py: { xs: 8, md: 12 }, px: { xs: 2, md: 4 } }}>
        <Container maxWidth="lg">
          <Typography variant="h3" fontWeight={700} textAlign="center" gutterBottom sx={{ mb: 6 }}>
            Why Sell on InkStash?
          </Typography>
          <Grid container spacing={4}>
            {benefits.map((benefit, index) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={index}>
                <Card sx={{ height: '100%', textAlign: 'center', p: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                    {benefit.icon}
                  </Box>
                  <Typography variant="h6" fontWeight={700} gutterBottom>
                    {benefit.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" lineHeight={1.7}>
                    {benefit.description}
                  </Typography>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* How It Works Section */}
      <Box component="section" sx={{ py: { xs: 8, md: 12 }, px: { xs: 2, md: 4 }, bgcolor: 'background.paper' }}>
        <Container maxWidth="lg">
          <Typography variant="h3" fontWeight={700} textAlign="center" gutterBottom sx={{ mb: 6 }}>
            How It Works
          </Typography>
          <Grid container spacing={4}>
            {steps.map((step) => (
              <Grid size={{ xs: 12, sm: 6, md: 3 }} key={step.number}>
                <Box sx={{ textAlign: 'center' }}>
                  <Box
                    sx={{
                      width: 64,
                      height: 64,
                      borderRadius: '50%',
                      bgcolor: 'primary.main',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '2rem',
                      fontWeight: 700,
                      mx: 'auto',
                      mb: 2,
                    }}
                  >
                    {step.number}
                  </Box>
                  <Typography variant="h6" fontWeight={700} gutterBottom>
                    {step.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" lineHeight={1.7}>
                    {step.description}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Success Stories */}
      <Box component="section" sx={{ py: { xs: 8, md: 12 }, px: { xs: 2, md: 4 } }}>
        <Container maxWidth="lg">
          <Typography variant="h3" fontWeight={700} textAlign="center" gutterBottom sx={{ mb: 6 }}>
            Success Stories
          </Typography>
          <Grid container spacing={4}>
            {testimonials.map((testimonial, index) => (
              <Grid size={{ xs: 12, md: 4 }} key={index}>
                <Card sx={{ height: '100%', p: 3 }}>
                  <CardContent>
                    <Rating value={testimonial.rating} readOnly sx={{ mb: 2 }} />
                    <Typography variant="body1" sx={{ mb: 3, fontStyle: 'italic', lineHeight: 1.7 }}>
                      {testimonial.text}
                    </Typography>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Avatar sx={{ width: 48, height: 48, bgcolor: 'primary.main' }}>
                        {testimonial.name[0]}
                      </Avatar>
                      <Box>
                        <Typography variant="subtitle1" fontWeight={600}>
                          {testimonial.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {testimonial.role}
                        </Typography>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Final CTA */}
      <Box
        component="section"
        sx={{
          py: { xs: 8, md: 12 },
          px: { xs: 2, md: 4 },
          textAlign: 'center',
          bgcolor: 'primary.main',
          color: 'white',
        }}
      >
        <Container maxWidth="md">
          <Typography variant="h3" fontWeight={700} gutterBottom sx={{ color: 'white' }}>
            Ready to Start Selling?
          </Typography>
          <Typography variant="h6" sx={{ mb: 4, color: 'rgba(255, 255, 255, 0.9)' }}>
            Join thousands of successful sellers and turn your passion into profit today.
          </Typography>
          <Button
            variant="contained"
            size="large"
            onClick={handleGetStarted}
            sx={{
              px: 6,
              py: 2,
              fontSize: '1.125rem',
              fontWeight: 700,
              textTransform: 'none',
              borderRadius: 999,
              bgcolor: 'white',
              color: 'primary.main',
              '&:hover': {
                bgcolor: 'grey.100',
              },
            }}
          >
            Get Started Now
          </Button>
        </Container>
      </Box>

      {/* Footer */}
      <Box component="footer" sx={{ py: 4, px: { xs: 2, md: 4 }, bgcolor: 'background.paper', borderTop: 1, borderColor: 'divider' }}>
        <Container maxWidth="lg">
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            justifyContent="space-between"
            alignItems="center"
          >
            <Stack direction="row" spacing={3}>
              <Button onClick={() => navigate('/')} sx={{ textTransform: 'none', color: 'text.secondary' }}>
                Home
              </Button>
              <Button onClick={() => navigate('/about')} sx={{ textTransform: 'none', color: 'text.secondary' }}>
                About
              </Button>
              <Button onClick={() => navigate('/help')} sx={{ textTransform: 'none', color: 'text.secondary' }}>
                Help Center
              </Button>
              <Button onClick={() => navigate('/terms')} sx={{ textTransform: 'none', color: 'text.secondary' }}>
                Terms
              </Button>
              <Button onClick={() => navigate('/privacy')} sx={{ textTransform: 'none', color: 'text.secondary' }}>
                Privacy
              </Button>
            </Stack>
            <Typography variant="body2" color="text.secondary">
              © 2025 InkStash. All rights reserved.
            </Typography>
          </Stack>
        </Container>
      </Box>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        defaultTab="signup"
      />
    </Box>
  );
}
