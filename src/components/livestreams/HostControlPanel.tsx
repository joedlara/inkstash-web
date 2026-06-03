// src/components/livestreams/HostControlPanel.tsx
//
// Right rail (desktop) / bottom drawer (mobile) for the host during a live
// stream. Shows the live chat + an "End stream" button. Auctions panel
// will slot in here in L2.

import { Box, Button, Typography } from '@mui/material';
import LiveStreamChat from './LiveStreamChat';
import type { ChatMessage } from '../../api/livestreams';
import { inkstashColors, inkstashFonts } from '../../theme/inkstashTokens';

interface Props {
  livestreamId: string;
  initialChat: ChatMessage[];
  onEnd: () => void;
  onBanUser: (userId: string) => void;
}

export default function HostControlPanel({ livestreamId, initialChat, onEnd, onBanUser }: Props) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: inkstashColors.bgElev }}>
      <Box sx={{ p: 2, borderBottom: `1px solid ${inkstashColors.border}` }}>
        <Typography sx={{ fontFamily: inkstashFonts.mono, fontSize: 10, color: inkstashColors.muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Stream chat
        </Typography>
      </Box>
      <Box sx={{ flex: 1, minHeight: 0 }}>
        <LiveStreamChat
          livestreamId={livestreamId}
          initialMessages={initialChat}
          isBanned={false}
          hostMode
          onBanUser={onBanUser}
        />
      </Box>
      <Box sx={{ p: 2, borderTop: `1px solid ${inkstashColors.border}` }}>
        <Button
          fullWidth
          variant="contained"
          onClick={onEnd}
          sx={{
            bgcolor: inkstashColors.live, color: '#fff', fontWeight: 800,
            textTransform: 'uppercase', letterSpacing: '0.06em',
            '&:hover': { bgcolor: '#B91C1C' },
          }}
        >
          End stream
        </Button>
      </Box>
    </Box>
  );
}
