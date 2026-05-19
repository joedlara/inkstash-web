import { Link } from 'react-router-dom';
import { Box } from '@mui/material';
import { inkstashColors, inkstashFonts } from '../../theme/inkstashTokens';

const col1 = [
  { label: 'Home', to: '/' },
  { label: 'About', to: '/about' },
  { label: 'Blog', to: '/blog' },
  { label: 'Help Center', to: '/help' },
];
const col2 = [
  { label: 'Contact', to: '/contact' },
  { label: 'Terms', to: '/terms' },
  { label: 'Privacy', to: '/privacy' },
];

export default function HomeFooter() {
  return (
    <Box component="footer" sx={{
      mt: 7, pt: 3.5,
      borderTop: `1px solid ${inkstashColors.border}`,
      display: 'flex', justifyContent: 'space-between',
      flexWrap: 'wrap', gap: 2.75,
    }}>
      <Box sx={{ display: 'flex', gap: { xs: 4, md: 7.5 } }}>
        {[col1, col2].map((col, ci) => (
          <Box key={ci} sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {col.map(link => (
              <Box
                key={link.to}
                component={Link}
                to={link.to}
                sx={{
                  color: inkstashColors.ink2, textDecoration: 'none',
                  fontSize: '0.84rem', fontWeight: 500,
                  transition: 'color 160ms ease',
                  '&:hover': { color: inkstashColors.ink },
                }}
              >{link.label}</Box>
            ))}
          </Box>
        ))}
      </Box>
      <Box sx={{
        color: inkstashColors.muted, fontFamily: inkstashFonts.mono, fontSize: '0.72rem',
        display: 'flex', alignItems: 'center', gap: 1,
        alignSelf: 'flex-end',
      }}>
        <span>© 2026 InkStash</span>
        <Box sx={{ opacity: 0.5 }}>·</Box>
        <span>Made for collectors</span>
      </Box>
    </Box>
  );
}
