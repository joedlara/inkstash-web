// src/components/home/PublisherCard.tsx
import { Box } from '@mui/material';
import { ChevronRight } from 'lucide-react';
import { type Publisher } from '../../data/handoffSeed';
import { inkstashColors, inkstashFonts, inkstashRadii } from '../../theme/inkstashTokens';

interface PublisherCardProps {
  publisher: Publisher;
  onClick?: () => void;
}

export default function PublisherCard({ publisher, onClick }: PublisherCardProps) {
  return (
    <Box
      onClick={onClick}
      sx={{
        position: 'relative',
        bgcolor: inkstashColors.bgElev,
        border: `1px solid ${inkstashColors.border}`,
        borderRadius: inkstashRadii.lg,
        padding: '20px 22px',
        cursor: 'pointer',
        transition: 'transform 140ms ease, border-color 140ms ease',
        '&:hover': {
          borderColor: inkstashColors.ink,
          transform: 'translateY(-2px)',
          '& .pub-arrow': { color: inkstashColors.brand, transform: 'translate(2px, -2px)' },
        },
      }}
    >
      <Box className="pub-arrow" sx={{
        position: 'absolute', top: 16, right: 16,
        color: inkstashColors.muted,
        transition: 'transform 140ms ease, color 140ms ease',
      }}>
        <ChevronRight size={16} />
      </Box>

      <Box sx={{
        width: 36, height: 36, borderRadius: '8px',
        background: `linear-gradient(135deg, ${publisher.gradient[0]}, ${publisher.gradient[1]})`,
        mb: 1.5,
      }} />

      <Box sx={{
        fontFamily: inkstashFonts.display, fontWeight: 900, fontSize: 26,
        textTransform: 'uppercase', lineHeight: 1, color: inkstashColors.ink,
        mb: 0.5,
      }}>{publisher.name}</Box>

      <Box sx={{
        fontFamily: inkstashFonts.mono, fontSize: 11,
        textTransform: 'uppercase', color: inkstashColors.muted,
        letterSpacing: '0.06em',
      }}>{publisher.tag} · {publisher.count} packs available</Box>
    </Box>
  );
}
