// src/components/home/Discover3Up.tsx
import { Box } from '@mui/material';
import { DISCOVER } from '../../data/handoffSeed';
import { inkstashColors, inkstashFonts, inkstashRadii, inkstashShadows } from '../../theme/inkstashTokens';

function ArtPhone() {
  return (
    <svg viewBox="0 0 200 130" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
      <defs>
        <radialGradient id="dp-glow" cx="50%" cy="55%" r="50%">
          <stop offset="0%" stopColor={inkstashColors.brand} stopOpacity={0.35} />
          <stop offset="100%" stopColor={inkstashColors.brand} stopOpacity={0} />
        </radialGradient>
        <linearGradient id="dp-screen" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={inkstashColors.brand} />
          <stop offset="100%" stopColor="#1F3A6E" />
        </linearGradient>
      </defs>
      <rect width="200" height="130" fill="#0F0B09" />
      <rect width="200" height="130" fill="url(#dp-glow)" />
      <g transform="translate(85, 28)">
        <rect width="30" height="62" rx="6" fill="#1A1410" stroke="#3A302A" strokeWidth="1.2" />
        <rect x="2.5" y="4" width="25" height="54" rx="3" fill="url(#dp-screen)" />
      </g>
    </svg>
  );
}

function ArtVault() {
  const rows: [string, string][] = [
    ['#1F3A6E', '#0E1D3E'],
    ['#C2362F', '#5C1116'],
    ['#B8893A', '#5C3F0F'],
  ];
  return (
    <svg viewBox="0 0 200 130" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
      <rect width="200" height="130" fill="#0F0B09" />
      <g transform="translate(18, 12)">
        {rows.map((g, ri) =>
          [0, 1, 2, 3].map(ci => (
            <g key={`${ri}-${ci}`} transform={`translate(${ci * 42}, ${ri * 35})`}>
              <defs>
                <linearGradient id={`vlt-${ri}-${ci}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={g[0]} />
                  <stop offset="100%" stopColor={g[1]} />
                </linearGradient>
              </defs>
              <rect width="36" height="29" rx="3" fill={`url(#vlt-${ri}-${ci})`} stroke="rgba(0,0,0,0.3)" strokeWidth="0.8" />
            </g>
          ))
        )}
      </g>
    </svg>
  );
}

function ArtIdea() {
  return (
    <svg viewBox="0 0 200 130" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
      <rect width="200" height="130" fill={inkstashColors.bgSunken} />
      <circle cx="76" cy="65" r="22" fill={inkstashColors.brand} />
      <text x="76" y="74" textAnchor="middle" fontFamily="Big Shoulders Display, sans-serif" fontWeight="900" fontSize="30" fill="white">!</text>
      <circle cx="124" cy="72" r="18" fill="#1F3A6E" />
      <text x="124" y="80" textAnchor="middle" fontFamily="Big Shoulders Display, sans-serif" fontWeight="900" fontSize="24" fill="white">?</text>
    </svg>
  );
}

const artMap = {
  phone: ArtPhone,
  vault: ArtVault,
  idea:  ArtIdea,
};

export default function Discover3Up() {
  return (
    <Box component="section" sx={{ mb: 5.5 }}>
      <Box sx={{ mb: 2 }}>
        <Box component="h2" sx={{
          fontFamily: inkstashFonts.display, fontWeight: 800,
          fontSize: 'clamp(22px, 3vw, 30px)',
          letterSpacing: '0.005em', m: 0, textTransform: 'uppercase', lineHeight: 1,
          color: inkstashColors.ink,
        }}>Discover</Box>
        <Box sx={{ color: inkstashColors.muted, fontSize: 13, mt: 0.5 }}>
          Get the most out of Inkstash
        </Box>
      </Box>
      <Box sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
        gap: 2,
      }}>
        {DISCOVER.map(card => {
          const Art = artMap[card.art];
          return (
            <Box key={card.id} sx={{
              bgcolor: inkstashColors.bgElev,
              border: `1px solid ${inkstashColors.border}`,
              borderRadius: inkstashRadii.lg,
              overflow: 'hidden',
              display: 'flex', flexDirection: 'column',
              cursor: 'pointer',
              transition: 'transform 140ms ease, box-shadow 140ms ease, border-color 140ms ease',
              '&:hover': {
                transform: 'translateY(-3px)',
                boxShadow: inkstashShadows.md,
                borderColor: inkstashColors.borderStrong,
              },
            }}>
              <Box sx={{ aspectRatio: '16 / 10', position: 'relative', overflow: 'hidden' }}>
                <Art />
              </Box>
              <Box sx={{ padding: '18px 20px 20px' }}>
                <Box sx={{ fontWeight: 700, fontSize: 17, color: inkstashColors.ink, mb: 0.75, letterSpacing: '-0.005em' }}>{card.title}</Box>
                <Box sx={{ fontSize: 13.5, color: inkstashColors.muted, lineHeight: 1.5 }}>{card.sub}</Box>
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
