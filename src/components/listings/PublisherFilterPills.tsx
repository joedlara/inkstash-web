// src/components/listings/PublisherFilterPills.tsx
import { useEffect, useState } from 'react';
import { Box, Skeleton } from '@mui/material';
import { marketplaceAPI } from '../../api/marketplace';
import { inkstashColors, inkstashFonts } from '../../theme/inkstashTokens';

interface Props {
  /** Currently selected publisher; null/undefined means "All". */
  selected: string | null;
  onSelect: (publisher: string | null) => void;
}

export default function PublisherFilterPills({ selected, onSelect }: Props) {
  const [publishers, setPublishers] = useState<Array<{ publisher: string; count: number }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    marketplaceAPI.listPublishers(6)
      .then(setPublishers)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mb: 2 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton
            key={i}
            variant="rounded"
            width={80 + (i * 8) % 32}
            height={28}
            sx={{ bgcolor: inkstashColors.bgSunken, borderRadius: 999 }}
          />
        ))}
      </Box>
    );
  }

  if (publishers.length === 0) {
    return null;
  }

  return (
    <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mb: 2 }}>
      <Pill
        label="All publishers"
        active={selected === null}
        onClick={() => onSelect(null)}
      />
      {publishers.map(({ publisher, count }) => (
        <Pill
          key={publisher}
          label={publisher}
          count={count}
          active={selected === publisher}
          onClick={() => onSelect(publisher)}
        />
      ))}
    </Box>
  );
}

function Pill({
  label, count, active, onClick,
}: { label: string; count?: number; active: boolean; onClick: () => void }) {
  return (
    <Box
      component="button"
      type="button"
      onClick={onClick}
      sx={{
        padding: '6px 12px',
        borderRadius: 999,
        border: `1px solid ${active ? inkstashColors.brand : inkstashColors.border}`,
        bgcolor: active ? inkstashColors.brand : 'transparent',
        color: active ? '#fff' : inkstashColors.ink2,
        fontFamily: inkstashFonts.ui,
        fontWeight: 600,
        fontSize: 12,
        cursor: 'pointer',
        transition: 'background 140ms ease, color 140ms ease, border-color 140ms ease',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.5,
        '&:hover': active
          ? { bgcolor: inkstashColors.brandDeep }
          : { borderColor: inkstashColors.borderStrong, color: inkstashColors.ink },
      }}
    >
      <span>{label}</span>
      {count !== undefined && (
        <span style={{
          fontFamily: 'inherit',
          fontSize: 10,
          opacity: 0.7,
        }}>
          {count}
        </span>
      )}
    </Box>
  );
}
