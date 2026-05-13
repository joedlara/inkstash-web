import { Box, Container, Typography } from '@mui/material';
import DashboardHeader from '../components/home/DashboardHeader';

export default function Marketplace() {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <DashboardHeader />
      <Container maxWidth="xl" sx={{ pt: 12, pb: 6 }}>
        <Typography variant="h4" fontWeight={800} gutterBottom>
          Marketplace
        </Typography>
        <Typography color="text.secondary">
          Buy and sell comics at fixed prices or via auction — coming soon.
        </Typography>
      </Container>
    </Box>
  );
}
