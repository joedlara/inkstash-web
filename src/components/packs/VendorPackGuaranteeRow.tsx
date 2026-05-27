// src/components/packs/VendorPackGuaranteeRow.tsx
import { Box } from '@mui/material';
import type { Pack, PackItem } from '../../api/packs';
import { inkstashColors, inkstashFonts } from '../../theme/inkstashTokens';

interface Props {
  pack: Pack;
  items: PackItem[];
}

export default function VendorPackGuaranteeRow({ pack, items }: Props) {
  const chaseItems = items.filter((it) => it.is_chase);
  const totalWeight = items.reduce(
    (sum, it) => sum + (it.is_chase ? it.remaining / 10 : it.remaining),
    0,
  );
  const chaseChancePct = totalWeight > 0
    ? (chaseItems.reduce((s, it) => s + it.remaining / 10, 0) / totalWeight) * 100
    : 0;

  return (
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 1.5,
        my: 2,
        py: 1.5,
        px: 2,
        borderRadius: 2,
        bgcolor: inkstashColors.bgSunken,
        border: `1px solid ${inkstashColors.border}`,
        fontFamily: inkstashFonts.ui,
        fontSize: 13,
        color: inkstashColors.ink,
      }}
    >
      <Box sx={{ fontWeight: 700 }}>
        Guaranteed: {pack.item_count} {pack.item_count === 1 ? 'book' : 'books'}, ${pack.price.toFixed(2)} in value.
      </Box>
      {chaseItems.length > 0 && (
        <Box sx={{ color: inkstashColors.muted }}>
          Chase chance: {chaseChancePct.toFixed(1)}% ({chaseItems.length} possible {chaseItems.length === 1 ? 'variant' : 'variants'}).
        </Box>
      )}
    </Box>
  );
}
