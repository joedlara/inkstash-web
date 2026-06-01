import { useEffect, useMemo, useState } from 'react';
import { Box, Stack, Skeleton } from '@mui/material';
import { Package } from 'lucide-react';
import { inventoryAPI } from '../../api/inventory';
import type { InventoryItem, InventoryItemWithDetails, InventoryStatus } from '../../api/inventory';
import CardDispositionRow from '../packs/CardDispositionRow';
import type { Disposition } from '../packs/CardDispositionRow';
import { useRubyBalance } from '../../hooks/useRubyBalance';
import { inkstashColors, inkstashFonts, inkstashRadii } from '../../theme/inkstashTokens';

type FilterKey = 'all' | 'vaulted' | 'shipping' | 'shipped' | 'sold';
type SortKey = 'recent' | 'value' | 'rarity';

const FILTERS: Array<{ key: FilterKey; label: string }> = [
  { key: 'all',      label: 'All' },
  { key: 'vaulted',  label: 'Vaulted' },
  { key: 'shipping', label: 'Shipping' },
  { key: 'shipped',  label: 'Shipped' },
  { key: 'sold',     label: 'Sold back' },
];

const SORTS: Array<{ key: SortKey; label: string }> = [
  { key: 'recent', label: 'Most recent' },
  { key: 'value',  label: 'Highest value' },
  { key: 'rarity', label: 'Rarest first' },
];

const RARITY_RANK: Record<string, number> = { legendary: 0, rare: 1, common: 2 };

function statusMatches(item: InventoryItem, filter: FilterKey): boolean {
  if (filter === 'all') return true;
  if (filter === 'vaulted') return item.status === 'vaulted';
  if (filter === 'shipping') return item.status === 'shipping_pending';
  if (filter === 'shipped') return item.status === 'shipped';
  if (filter === 'sold') return item.status === 'sold_back';
  return true;
}

function dispositionFor(item: InventoryItem): Disposition {
  if (item.status === 'sold_back') return 'sold';
  if (item.status === 'shipping_pending' || item.status === 'shipped') return 'shipped';
  return 'pending'; // vaulted = still actionable
}

export default function InventoryTab() {
  const [items, setItems] = useState<InventoryItemWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [sort, setSort] = useState<SortKey>('recent');
  const { refresh: refreshRubies } = useRubyBalance();

  const refresh = () => {
    setLoading(true);
    inventoryAPI.listMineWithDetails()
      .then((rows) => {
        // Listed + sold inventory rows are committed to the marketplace —
        // they no longer belong to the user's actionable stash. Listings show
        // up in /seller-dashboard; sold-out items are part of the user's
        // sales history, not their inventory feed.
        const visible = rows.filter((it) => it.status !== 'listed' && it.status !== 'sold');
        setItems(visible);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    refresh();
  }, []);

  const visible = useMemo(() => {
    const filtered = items.filter((it) => statusMatches(it, filter));
    const sorted = [...filtered];
    if (sort === 'recent') {
      sorted.sort((a, b) => (b.created_at > a.created_at ? 1 : -1));
    } else if (sort === 'value') {
      sorted.sort((a, b) => (b.pack_item.estimated_value ?? 0) - (a.pack_item.estimated_value ?? 0));
    } else if (sort === 'rarity') {
      sorted.sort((a, b) => (RARITY_RANK[a.pack_item.rarity] ?? 9) - (RARITY_RANK[b.pack_item.rarity] ?? 9));
    }
    return sorted;
  }, [items, filter, sort]);

  const countByStatus: Record<InventoryStatus | 'all', number> = useMemo(() => {
    const acc: Record<string, number> = { all: items.length };
    for (const it of items) acc[it.status] = (acc[it.status] ?? 0) + 1;
    return acc as Record<InventoryStatus | 'all', number>;
  }, [items]);

  const handleDispositionChange = (inventoryId: string) => {
    // Re-fetch on any mutation so status chips update immediately.
    refresh();
    refreshRubies();
    // Avoid unused-parameter lint
    void inventoryId;
  };

  return (
    <Box>
      {/* Stats strip */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        gap={1.5}
        sx={{ mb: 3 }}
      >
        <StatCard label="Vaulted" value={countByStatus.vaulted ?? 0} accent={inkstashColors.brand} />
        <StatCard label="Shipping" value={countByStatus.shipping_pending ?? 0} accent={inkstashColors.gold} />
        <StatCard label="Shipped" value={countByStatus.shipped ?? 0} accent={inkstashColors.ink} />
        <StatCard label="Sold back" value={countByStatus.sold_back ?? 0} accent={inkstashColors.muted} />
      </Stack>

      {/* Filter + sort row */}
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        alignItems={{ xs: 'stretch', md: 'center' }}
        gap={2}
        sx={{ mb: 2.5 }}
      >
        <Stack direction="row" gap={0.5} sx={{ bgcolor: inkstashColors.bgSunken, borderRadius: 999, padding: 0.5, overflowX: 'auto' }}>
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <Box
                key={f.key}
                component="button"
                type="button"
                onClick={() => setFilter(f.key)}
                sx={{
                  padding: '6px 14px',
                  borderRadius: 999,
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: inkstashFonts.ui,
                  fontSize: 12.5,
                  fontWeight: 600,
                  bgcolor: active ? inkstashColors.bgElev : 'transparent',
                  color: active ? inkstashColors.ink : inkstashColors.ink2,
                  whiteSpace: 'nowrap',
                  transition: 'background 140ms ease, color 140ms ease',
                }}
              >
                {f.label}
              </Box>
            );
          })}
        </Stack>

        <Box sx={{ flex: 1 }} />

        <Stack direction="row" alignItems="center" gap={1}>
          <Box
            sx={{
              fontFamily: inkstashFonts.mono,
              fontSize: 10.5,
              color: inkstashColors.muted,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            Sort
          </Box>
          <Box
            component="select"
            value={sort}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSort(e.target.value as SortKey)}
            sx={{
              bgcolor: inkstashColors.bgElev,
              border: `1px solid ${inkstashColors.border}`,
              borderRadius: 999,
              padding: '6px 14px',
              fontFamily: inkstashFonts.ui,
              fontSize: 12.5,
              fontWeight: 600,
              color: inkstashColors.ink,
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            {SORTS.map((s) => (
              <option key={s.key} value={s.key}>{s.label}</option>
            ))}
          </Box>
        </Stack>
      </Stack>

      {loading ? (
        <Stack gap={1}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} variant="rectangular" height={108} sx={{ bgcolor: inkstashColors.bgSunken, borderRadius: inkstashRadii.md }} />
          ))}
        </Stack>
      ) : visible.length === 0 ? (
        <EmptyState filter={filter} totalCount={items.length} />
      ) : (
        <Stack gap={1}>
          {visible.map((inv) => (
            <CardDispositionRow
              key={inv.id}
              inventoryId={inv.id}
              item={{
                ...inv.pack_item,
                pack_id: '',
                remaining: 0,
                inventory_id: inv.id,
              }}
              packOrigin={inv.pack_item.pack?.origin ?? 'house'}
              disposition={dispositionFor(inv)}
              payoutRubies={inv.sold_back_rubies}
              onChange={() => handleDispositionChange(inv.id)}
              onListed={() => handleDispositionChange(inv.id)}
            />
          ))}
        </Stack>
      )}
    </Box>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <Box
      sx={{
        flex: 1,
        bgcolor: inkstashColors.bgElev,
        border: `1px solid ${inkstashColors.border}`,
        borderLeft: `3px solid ${accent}`,
        borderRadius: inkstashRadii.md,
        padding: '14px 18px',
      }}
    >
      <Box
        sx={{
          fontFamily: inkstashFonts.mono,
          fontSize: 10.5,
          color: inkstashColors.muted,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          mb: 0.5,
        }}
      >
        {label}
      </Box>
      <Box
        sx={{
          fontFamily: inkstashFonts.display,
          fontWeight: 800,
          fontSize: 26,
          color: inkstashColors.ink,
          lineHeight: 1,
        }}
      >
        {value}
      </Box>
    </Box>
  );
}

function EmptyState({ filter, totalCount }: { filter: FilterKey; totalCount: number }) {
  return (
    <Box
      sx={{
        bgcolor: inkstashColors.bgElev,
        border: `1px dashed ${inkstashColors.border}`,
        borderRadius: inkstashRadii.lg,
        padding: '48px 24px',
        textAlign: 'center',
      }}
    >
      <Package size={32} color={inkstashColors.muted2} />
      <Box
        sx={{
          fontFamily: inkstashFonts.display,
          fontWeight: 800,
          fontSize: 18,
          color: inkstashColors.ink,
          mt: 1.5,
          textTransform: 'uppercase',
        }}
      >
        {totalCount === 0 ? 'No comics yet' : `Nothing in "${filter}"`}
      </Box>
      <Box
        sx={{
          fontFamily: inkstashFonts.mono,
          fontSize: 11.5,
          color: inkstashColors.muted,
          mt: 0.75,
          letterSpacing: '0.04em',
        }}
      >
        {totalCount === 0
          ? 'Open a pack to start your collection.'
          : 'Try a different filter to see your other comics.'}
      </Box>
    </Box>
  );
}
