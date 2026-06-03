// src/components/livestreams/LiveStreamGrid.tsx

import { Box } from '@mui/material';
import type { Livestream } from '../../api/livestreams';
import LiveStreamCard from './LiveStreamCard';

interface Props { streams: Livestream[]; }

export default function LiveStreamGrid({ streams }: Props) {
  if (streams.length === 0) return null;
  return (
    <Box
      sx={{
        display: 'grid',
        gap: { xs: 1.5, md: 2 },
        gridTemplateColumns: {
          xs: '1fr 1fr',
          sm: 'repeat(3, 1fr)',
          md: 'repeat(4, 1fr)',
          lg: 'repeat(5, 1fr)',
        },
      }}
    >
      {streams.map((s) => <LiveStreamCard key={s.id} stream={s} />)}
    </Box>
  );
}
