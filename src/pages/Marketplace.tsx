import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Container,
  Typography,
  TextField,
  MenuItem,
  Select,
  type SelectChangeEvent,
  CircularProgress,
  Button,
  InputAdornment,
} from '@mui/material';
import { Search } from 'lucide-react';
import AppShell from '../components/layout/AppShell';
import ListingFeedCard from '../components/listings/ListingFeedCard';
import PublisherFilterPills from '../components/listings/PublisherFilterPills';
import {
  marketplaceAPI,
  type MarketplaceFeedCard,
  type MarketplaceFeedSource,
  type MarketplaceFeedSort,
} from '../api/marketplace';
import { inkstashColors, inkstashFonts } from '../theme/inkstashTokens';

const PAGE_SIZE = 24;

export default function Marketplace() {
  const [cards, setCards] = useState<MarketplaceFeedCard[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [source, setSource] = useState<MarketplaceFeedSource>('all');
  const [sort, setSort] = useState<MarketplaceFeedSort>('recent');
  const [publisher, setPublisher] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  // Fetch on filter/sort change (resets page to 1)
  useEffect(() => {
    setLoading(true);
    setPage(1);
    marketplaceAPI
      .listFeed({
        filters: {
          source,
          publisher: publisher ?? undefined,
          query: debouncedQuery || undefined,
        },
        sort,
        page: 1,
        pageSize: PAGE_SIZE,
      })
      .then((result) => {
        setCards(result.rows);
        setTotalCount(result.totalCount);
      })
      .finally(() => setLoading(false));
  }, [source, sort, publisher, debouncedQuery]);

  const canLoadMore = useMemo(() => cards.length < totalCount, [cards.length, totalCount]);

  async function handleLoadMore() {
    const nextPage = page + 1;
    setLoadingMore(true);
    try {
      const result = await marketplaceAPI.listFeed({
        filters: {
          source,
          publisher: publisher ?? undefined,
          query: debouncedQuery || undefined,
        },
        sort,
        page: nextPage,
        pageSize: PAGE_SIZE,
      });
      setCards((prev) => [...prev, ...result.rows]);
      setPage(nextPage);
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <AppShell>
      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* Page header */}
        <Box sx={{ mb: 3 }}>
          <Typography
            sx={{
              fontFamily: inkstashFonts.display,
              fontWeight: 900,
              fontSize: 28,
              color: inkstashColors.ink,
              textTransform: 'uppercase',
              letterSpacing: '0.005em',
              mb: 0.5,
            }}
          >
            Marketplace
          </Typography>
          <Typography sx={{ color: inkstashColors.muted, fontSize: 14 }}>
            Buy comics directly from collectors and vendors.
          </Typography>
        </Box>

        {/* Source pills */}
        <Box sx={{ display: 'flex', gap: 0.5, padding: 0.5, bgcolor: inkstashColors.bgSunken, borderRadius: 999, mb: 2, width: 'fit-content' }}>
          {(['all', 'listing', 'auction'] as const).map((s) => {
            const active = s === source;
            const label = s === 'all' ? 'All' : s === 'listing' ? 'Buy Now' : 'Auctions';
            return (
              <Box
                key={s}
                component="button"
                type="button"
                onClick={() => setSource(s)}
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
                {label}
              </Box>
            );
          })}
        </Box>

        {/* Publisher pills */}
        <PublisherFilterPills selected={publisher} onSelect={setPublisher} />

        {/* Search + sort */}
        <Box sx={{ display: 'flex', gap: 1.5, mb: 3, flexDirection: { xs: 'column', sm: 'row' } }}>
          <TextField
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title or issue number"
            size="small"
            sx={{ flex: 1 }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Search size={16} color={inkstashColors.muted} />
                  </InputAdornment>
                ),
              },
            }}
          />
          <Select
            value={sort}
            onChange={(e: SelectChangeEvent<MarketplaceFeedSort>) =>
              setSort(e.target.value as MarketplaceFeedSort)
            }
            size="small"
            sx={{ minWidth: 180 }}
          >
            <MenuItem value="recent">Recently listed</MenuItem>
            <MenuItem value="price_asc">Price: low to high</MenuItem>
            <MenuItem value="price_desc">Price: high to low</MenuItem>
            <MenuItem value="ending_soon">Ending soon</MenuItem>
          </Select>
        </Box>

        {/* Grid */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : cards.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography sx={{ color: inkstashColors.muted, mb: 2 }}>
              {publisher || debouncedQuery || source !== 'all'
                ? 'No matches. Try removing some filters.'
                : 'No comics for sale yet — be the first to list!'}
            </Typography>
            {(publisher || debouncedQuery || source !== 'all') && (
              <Button
                variant="text"
                onClick={() => {
                  setSource('all');
                  setPublisher(null);
                  setQuery('');
                }}
              >
                Clear filters
              </Button>
            )}
          </Box>
        ) : (
          <>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: 'repeat(2, 1fr)',
                  sm: 'repeat(3, 1fr)',
                  md: 'repeat(4, 1fr)',
                  lg: 'repeat(5, 1fr)',
                },
                gap: { xs: 1.5, md: 2 },
              }}
            >
              {cards.map((card) => (
                <ListingFeedCard key={`${card.source}-${card.id}`} card={card} />
              ))}
            </Box>

            {canLoadMore && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                <Button
                  variant="outlined"
                  size="large"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  sx={{ fontWeight: 700, px: 4 }}
                >
                  {loadingMore ? <CircularProgress size={20} /> : 'Load more'}
                </Button>
              </Box>
            )}
          </>
        )}
      </Container>
    </AppShell>
  );
}
