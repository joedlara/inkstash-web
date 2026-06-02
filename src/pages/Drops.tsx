// src/pages/Drops.tsx
//
// Grid of all drops on the platform. Sort: live first, then upcoming
// (soonest first), then sold-out. Filter pills let users narrow by state.
//
// Replaces the legacy phase-4 Drops page (mock data, dark theme).

import { useEffect, useState } from 'react';
import { Box, Container, Typography, Skeleton } from '@mui/material';
import AppShell from '../components/layout/AppShell';
import { dropsAPI, type Drop, type DropState } from '../api/drops';
import DropCard from '../components/drops/DropCard';
import { inkstashColors, inkstashFonts } from '../theme/inkstashTokens';

type FilterValue = 'all' | DropState;

interface FilterPill {
  value: FilterValue;
  label: string;
}

const FILTERS: FilterPill[] = [
  { value: 'all', label: 'All' },
  { value: 'live', label: 'Live now' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'sold_out', label: 'Sold out' },
];

export default function Drops() {
  const [allDrops, setAllDrops] = useState<Drop[] | null>(null);
  const [filter, setFilter] = useState<FilterValue>('all');

  useEffect(() => {
    let cancelled = false;
    dropsAPI.getDrops().then((d) => { if (!cancelled) setAllDrops(d); });
    return () => { cancelled = true; };
  }, []);

  const filtered = allDrops?.filter((d) => filter === 'all' ? true : d.state === filter) ?? null;

  return (
    <AppShell>
      <Container maxWidth="lg" sx={{ py: { xs: 3, md: 5 } }}>
        <Box sx={{ mb: { xs: 3, md: 4 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.25 }}>
            <Box sx={{ width: 24, height: 2, bgcolor: inkstashColors.brand }} />
            <Typography
              sx={{
                fontFamily: inkstashFonts.mono,
                fontSize: 11,
                color: inkstashColors.brand,
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                fontWeight: 700,
              }}
            >
              Limited releases · First-come, first-served
            </Typography>
          </Box>
          <Typography
            sx={{
              fontFamily: inkstashFonts.display,
              fontWeight: 900,
              fontSize: { xs: 36, sm: 44, md: 52 },
              color: inkstashColors.ink,
              lineHeight: 1.02,
              textTransform: 'uppercase',
              letterSpacing: '-0.005em',
            }}
          >
            Drops
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: { xs: 3, md: 4 } }}>
          {FILTERS.map((f) => {
            const active = filter === f.value;
            const count = allDrops
              ? (f.value === 'all' ? allDrops.length : allDrops.filter((d) => d.state === f.value).length)
              : null;
            return (
              <Box
                key={f.value}
                component="button"
                type="button"
                onClick={() => setFilter(f.value)}
                sx={{
                  px: 1.5,
                  py: 0.75,
                  bgcolor: active ? inkstashColors.ink : inkstashColors.bgElev,
                  color: active ? '#fff' : inkstashColors.ink,
                  border: `1px solid ${active ? inkstashColors.ink : inkstashColors.border}`,
                  borderRadius: 999,
                  fontFamily: inkstashFonts.ui,
                  fontWeight: 700,
                  fontSize: 12.5,
                  cursor: 'pointer',
                  transition: 'border-color 140ms ease, background-color 140ms ease',
                  '&:hover': {
                    borderColor: inkstashColors.brand,
                    color: active ? '#fff' : inkstashColors.brand,
                  },
                }}
              >
                {f.label}
                {count !== null && count > 0 && (
                  <Box
                    component="span"
                    sx={{
                      ml: 0.75,
                      px: 0.6,
                      py: 0.1,
                      bgcolor: active ? 'rgba(255,255,255,0.18)' : inkstashColors.bgSunken,
                      color: active ? '#fff' : inkstashColors.muted,
                      borderRadius: 999,
                      fontFamily: inkstashFonts.mono,
                      fontSize: 10,
                      fontWeight: 800,
                    }}
                  >
                    {count}
                  </Box>
                )}
              </Box>
            );
          })}
        </Box>

        {allDrops === null ? (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(4, 1fr)' },
              gap: 2,
            }}
          >
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} variant="rectangular" height={280} sx={{ borderRadius: 2 }} />
            ))}
          </Box>
        ) : filtered && filtered.length > 0 ? (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(4, 1fr)' },
              gap: { xs: 1.5, md: 2 },
            }}
          >
            {filtered.map((d) => <DropCard key={d.id} drop={d} />)}
          </Box>
        ) : (
          <Box
            sx={{
              py: 8,
              textAlign: 'center',
              border: `1px dashed ${inkstashColors.border}`,
              borderRadius: 2,
              bgcolor: inkstashColors.bgElev,
            }}
          >
            <Typography
              sx={{
                fontFamily: inkstashFonts.display,
                fontWeight: 800,
                fontSize: 18,
                color: inkstashColors.ink,
                textTransform: 'uppercase',
                mb: 0.5,
              }}
            >
              No drops here yet
            </Typography>
            <Typography sx={{ fontSize: 13, color: inkstashColors.muted }}>
              {filter === 'all'
                ? 'Check back soon — drops post on a schedule.'
                : `Nothing matches the '${FILTERS.find((f) => f.value === filter)?.label}' filter right now.`}
            </Typography>
          </Box>
        )}
      </Container>
    </AppShell>
  );
}
