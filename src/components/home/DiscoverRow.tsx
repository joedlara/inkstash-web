import { Link } from 'react-router-dom';
import { Box } from '@mui/material';
import { colors, easing, fonts } from '../../theme/conceptCTokens';

type ArtKind = 'app' | 'vault' | 'feedback';

const cards: { title: string; body: string; to: string; art: ArtKind }[] = [
  {
    title: 'Get the app',
    body: 'Rip packs and watch breaks from anywhere. iOS & Android.',
    to: '/app',
    art: 'app',
  },
  {
    title: "Vault, don't ship",
    body: "Store slabs directly from CGC, CBCS, and eBay. Trade without touching them.",
    to: '/vault',
    art: 'vault',
  },
  {
    title: 'Got an idea?',
    body: 'We build what collectors actually want. Tell us what to ship next.',
    to: '/feedback',
    art: 'feedback',
  },
];

function DiscoverArt({ kind }: { kind: ArtKind }) {
  if (kind === 'app') {
    return (
      <Box sx={{
        aspectRatio: '16 / 9',
        background: 'radial-gradient(ellipse at center, #2a2a2a 0%, #0a0a0a 70%)',
        display: 'grid', placeItems: 'center',
      }}>
        <Box sx={{ width: 60, height: 110, bgcolor: '#1a1a1a', border: '2px solid #2a2a2a', borderRadius: '9px', padding: '5px', boxShadow: '0 10px 28px rgba(0,0,0,0.55)' }}>
          <Box sx={{ width: '100%', height: '100%', background: `linear-gradient(160deg, ${colors.accent}, ${colors.cobalt})`, borderRadius: '4px' }} />
        </Box>
      </Box>
    );
  }
  if (kind === 'vault') {
    const rows = [
      `linear-gradient(160deg, ${colors.cobalt}, #0a1e54)`,
      `linear-gradient(160deg, ${colors.accent}, #5a0606)`,
      `linear-gradient(160deg, ${colors.amber}, #9a4d04)`,
    ];
    return (
      <Box sx={{
        aspectRatio: '16 / 9',
        background: 'linear-gradient(180deg, #1a1612 0%, #0a0805 100%)',
        padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: '6px',
      }}>
        {rows.map((bg, ri) => (
          <Box key={ri} sx={{ display: 'flex', gap: '6px', flex: 1 }}>
            {Array.from({ length: 4 }).map((_, ci) => (
              <Box key={ci} sx={{ flex: 1, background: bg, borderRadius: '3px', borderTop: '2px solid rgba(255,255,255,0.12)', opacity: 0.85 }} />
            ))}
          </Box>
        ))}
      </Box>
    );
  }
  return (
    <Box sx={{
      aspectRatio: '16 / 9',
      background: 'radial-gradient(ellipse at center, #f5f0e8 0%, #d8d2c4 100%)',
      position: 'relative',
    }}>
      <Box sx={{ position: 'absolute', left: '32%', top: '32%', width: 44, height: 44, borderRadius: '50%', display: 'grid', placeItems: 'center', bgcolor: colors.accent, color: '#fff', fontFamily: fonts.display, fontWeight: 800, fontSize: '1.4rem', boxShadow: '0 8px 22px rgba(0,0,0,0.3)' }}>!</Box>
      <Box sx={{ position: 'absolute', right: '30%', top: '42%', width: 44, height: 44, borderRadius: '50%', display: 'grid', placeItems: 'center', bgcolor: colors.cobalt, color: '#fff', fontFamily: fonts.display, fontWeight: 800, fontSize: '1.4rem', boxShadow: '0 8px 22px rgba(0,0,0,0.3)' }}>?</Box>
    </Box>
  );
}

export default function DiscoverRow() {
  return (
    <Box component="section" sx={{ mt: 5 }}>
      <Box sx={{ display: 'flex', alignItems: 'baseline', mb: 2 }}>
        <Box component="h2" sx={{ fontFamily: fonts.display, fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em', color: colors.ink, m: 0 }}>Discover</Box>
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2 }}>
        {cards.map(card => (
          <Box
            key={card.title}
            component={Link}
            to={card.to}
            sx={{
              bgcolor: colors.bgElev, border: `1px solid ${colors.line}`,
              borderRadius: '14px', overflow: 'hidden',
              textDecoration: 'none', color: 'inherit',
              display: 'flex', flexDirection: 'column',
              transition: `transform 220ms ${easing.out}, border-color 220ms ${easing.out}, box-shadow 220ms ${easing.out}`,
              '&:hover': { transform: 'translateY(-3px)', borderColor: colors.lineStrong, boxShadow: '0 16px 40px rgba(20,17,13,0.08)' },
            }}
          >
            <DiscoverArt kind={card.art} />
            <Box sx={{ padding: '16px 18px 20px' }}>
              <Box component="h3" sx={{ fontFamily: fonts.display, fontWeight: 700, fontSize: '1.05rem', color: colors.ink, mb: 0.75, letterSpacing: '-0.015em', m: 0 }}>{card.title}</Box>
              <Box component="p" sx={{ color: colors.inkSoft, fontSize: '0.84rem', lineHeight: 1.5, m: 0 }}>{card.body}</Box>
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
