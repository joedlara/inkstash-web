import { Box, Container, Typography } from '@mui/material';
import DashboardHeader from '../components/home/DashboardHeader';

export default function Packs() {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <DashboardHeader />
      <Container maxWidth="xl" sx={{ pt: 12, pb: 6 }}>
        <Typography variant="h4" fontWeight={800} gutterBottom>
          Packs
        </Typography>
        <Typography color="text.secondary">
          Browse and open blind bag comic packs — coming soon.
        </Typography>
      </Container>
    </Box>
  );
}
