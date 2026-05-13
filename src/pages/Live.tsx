import { Box, Container, Typography } from '@mui/material';
import DashboardHeader from '../components/home/DashboardHeader';

export default function Live() {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <DashboardHeader />
      <Container maxWidth="xl" sx={{ pt: 12, pb: 6 }}>
        <Typography variant="h4" fontWeight={800} gutterBottom>
          Live Breaks
        </Typography>
        <Typography color="text.secondary">
          Watch live comic breaks and auctions — coming soon.
        </Typography>
      </Container>
    </Box>
  );
}
