// src/components/packs/PackContentsGrid.tsx
import { Box, Chip } from '@mui/material';
import type { PackItem, CoverTreatment } from '../../api/packs';
import { inkstashColors, inkstashFonts } from '../../theme/inkstashTokens';

interface Props {
  items: PackItem[];
}

const TREATMENT_LABEL: Record<CoverTreatment, string> = {
  cardstock: 'Cardstock',
  foil: 'Foil',
  signed: 'Signed',
  remarked: 'Remarked',
};

const TREATMENT_COLOR: Record<CoverTreatment, string> = {
  cardstock: 'rgba(255,255,255,0.6)',
  foil: '#8ab4f8',
  signed: '#f5c842',
  remarked: '#ef6c8a',
};

export default function PackContentsGrid({ items }: Props) {
  // Total remaining inventory across the pack determines the per-item draw weight.
  // Chase items are weighted at 1/10 to reflect the open-pack-usd draw logic.
  const totalWeight = items.reduce((sum, it) => {
    const w = it.is_chase ? (it.remaining / 10) : it.remaining;
    return sum + w;
  }, 0);

  return (
    <Box>
      <Box
        sx={{
          fontFamily: inkstashFonts.mono,
          fontSize: 10,
          color: inkstashColors.muted,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          mb: 1.5,
        }}
      >
        What's in the pack
      </Box>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(4, 1fr)' },
          gap: 1.5,
        }}
      >
        {items.map((item) => {
          const weight = item.is_chase ? (item.remaining / 10) : item.remaining;
          const pct = totalWeight > 0 ? (weight / totalWeight) * 100 : 0;
          const treatment = item.cover_treatment ?? 'cardstock';
          return (
            <Box
              key={item.id}
              sx={{
                bgcolor: inkstashColors.bgElev,
                border: `1px solid ${inkstashColors.border}`,
                borderRadius: 2,
                overflow: 'hidden',
              }}
            >
              <Box
                sx={{
                  aspectRatio: '2/3',
                  bgcolor: inkstashColors.bgSunken,
                  backgroundImage: item.image_url ? `url(${item.image_url})` : undefined,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              />
              <Box sx={{ p: 1.25 }}>
                <Box
                  sx={{
                    fontFamily: inkstashFonts.ui,
                    fontSize: 12,
                    fontWeight: 600,
                    color: inkstashColors.ink,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    mb: 0.75,
                  }}
                >
                  {item.comic_title}
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Chip
                    label={TREATMENT_LABEL[treatment]}
                    size="small"
                    sx={{
                      height: 18,
                      bgcolor: 'transparent',
                      border: `1px solid ${TREATMENT_COLOR[treatment]}`,
                      color: TREATMENT_COLOR[treatment],
                      fontFamily: inkstashFonts.mono,
                      fontSize: 9,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                    }}
                  />
                  <Box
                    sx={{
                      fontFamily: inkstashFonts.mono,
                      fontSize: 10,
                      color: inkstashColors.muted,
                    }}
                  >
                    {pct.toFixed(1)}%
                  </Box>
                </Box>
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
