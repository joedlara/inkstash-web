import { Box, Container, Typography } from '@mui/material';
import DashboardHeader from '../components/home/DashboardHeader';

export default function Drops() {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <DashboardHeader />
      <Container maxWidth="xl" sx={{ pt: 12, pb: 6 }}>
        <Typography variant="h4" fontWeight={800} gutterBottom>
          Drops
        </Typography>
        <Typography color="text.secondary">
          Upcoming publisher drops and limited releases — coming soon.
        </Typography>
      </Container>
    </Box>
  );
}
