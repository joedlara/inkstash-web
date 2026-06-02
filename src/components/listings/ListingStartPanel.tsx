// src/components/listings/ListingStartPanel.tsx
//
// Step 1 of /list-item, post-M4 rebuild. Three sections, all on one screen:
//
//   1. HOW IT WORKS strip — three short bullets so the seller knows what they're
//      signing up for before they touch the input. Plain markup; no animation
//      needed beyond a hover lift on the cards.
//
//   2. SEARCH + EXAMPLE CHIPS — the ComicVine autocomplete (kept for the
//      sellers who can find their book) plus a row of clickable example queries
//      so the empty input is never just "type something here and hope."
//
//   3. ENTER IT YOURSELF — always-visible free-text form. The primary path now,
//      since ComicVine coverage is patchy for modern issues.
//
//   4. TRENDING ON INKSTASH — 6 most-recent active listings as clickable tiles.
//      Clicking a tile pre-fills the comic_* fields with that listing's data,
//      letting sellers reuse a known good record instead of re-searching.
//
// All four sections submit through the same onPicked(ComicSelection) callback,
// keeping the parent (ListItem.tsx) unchanged.

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Button,
  Stack,
  Chip,
  Skeleton,
} from '@mui/material';
import { Search, AutoAwesome, ListAlt, MonetizationOn } from '@mui/icons-material';
import ComicSearchInput from './ComicSearchInput';
import type { ComicSelection } from './ComicSearchInput';
import { marketplaceAPI, type MarketplaceFeedCard } from '../../api/marketplace';
import { inkstashColors, inkstashFonts, inkstashRadii, inkstashShadows } from '../../theme/inkstashTokens';

const SEARCH_EXAMPLES = [
  'Absolute Batman 1',
  'Saga 1',
  'Watchmen 1',
  'Daredevil 181',
  'Amazing Spider-Man 300',
];

interface Props {
  onPicked: (sel: ComicSelection) => void;
}

export default function ListingStartPanel({ onPicked }: Props) {
  const navigate = useNavigate();
  const [trending, setTrending] = useState<MarketplaceFeedCard[] | null>(null);
  const [searchSeed, setSearchSeed] = useState('');
  const [liveQuery, setLiveQuery] = useState('');

  useEffect(() => {
    let cancelled = false;
    marketplaceAPI
      .listFeed({ sort: 'recent', pageSize: 6, filters: { source: 'listing' } })
      .then((r) => { if (!cancelled) setTrending(r.rows); })
      .catch(() => { if (!cancelled) setTrending([]); });
    return () => { cancelled = true; };
  }, []);

  // Jumps to the listing form. If the seller has typed something in the
  // search box but didn't see a match, we carry that text over as the
  // listing title so they don't have to retype it.
  function startBlank(seedTitle: string = '') {
    onPicked({
      comic_vine_id: null,
      title: seedTitle.trim(),
      issue_number: null,
      cover_url: null,
      publisher: null,
      writer: null,
      artist: null,
    });
  }


  return (
    <Container maxWidth="lg" sx={{ py: { xs: 3, md: 6 } }}>
      <Box sx={{ mb: { xs: 4, md: 6 } }}>
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
            New listing · about 2 minutes
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
            maxWidth: 720,
          }}
        >
          What comic are you putting up for sale?
        </Typography>
      </Box>

      {/* How it works — bolder, more presence */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 1.5, mb: { xs: 5, md: 7 } }}>
        <HowItWorksCard step="1" title="Pick your comic" body="Search the catalog, clone a recent listing, or type the details yourself." icon={<Search />} />
        <HowItWorksCard step="2" title="Add details" body="Condition, grade, photos. AI can write the description from your photos." icon={<ListAlt />} />
        <HowItWorksCard step="3" title="Price &amp; ship" body="Set your price. We handle Stripe payouts, you ship the book." icon={<MonetizationOn />} />
      </Box>

      {/* Search */}
      <SectionHeader>Search by title and issue</SectionHeader>
      <Box sx={{ display: 'flex', gap: 1.25, alignItems: 'flex-start', mb: 1.5 }}>
        <Box sx={{ flex: 1 }}>
          <ComicSearchInput
            key={searchSeed || '__empty__'}
            initialQuery={searchSeed}
            onSelect={onPicked}
            onQueryChange={setLiveQuery}
          />
        </Box>
        {liveQuery.trim().length >= 2 && (
          <Button
            variant="contained"
            onClick={() => startBlank(liveQuery)}
            sx={{
              bgcolor: inkstashColors.brand,
              color: '#fff',
              fontWeight: 700,
              fontFamily: inkstashFonts.ui,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              fontSize: 12,
              whiteSpace: 'nowrap',
              px: 2,
              py: 1.85,
              flexShrink: 0,
              '&:hover': { bgcolor: inkstashColors.brandDeep },
            }}
          >
            Use this title →
          </Button>
        )}
      </Box>
      <Stack direction="row" flexWrap="wrap" gap={0.75} sx={{ mb: 5 }}>
        <Typography sx={{ fontSize: 11.5, color: inkstashColors.muted, fontFamily: inkstashFonts.mono, alignSelf: 'center', mr: 0.5 }}>
          Try:
        </Typography>
        {SEARCH_EXAMPLES.map((ex) => (
          <Chip
            key={ex}
            label={ex}
            size="small"
            onClick={() => {
              // Bump key to remount the input so it picks up our example as
              // initial query - ComicSearchInput owns its own query state.
              setSearchSeed(ex);
            }}
            sx={{
              fontSize: 11.5,
              fontFamily: inkstashFonts.mono,
              bgcolor: inkstashColors.bgSunken,
              border: `1px solid ${inkstashColors.border}`,
              cursor: 'pointer',
              '&:hover': { bgcolor: inkstashColors.brandSoft, borderColor: inkstashColors.brand },
            }}
          />
        ))}
      </Stack>

      {/* Manual escape hatch — also carries the typed query over if any. */}
      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 5, mt: 1 }}>
        <Button
          variant="text"
          onClick={() => startBlank(liveQuery)}
          sx={{
            color: inkstashColors.muted,
            fontFamily: inkstashFonts.mono,
            fontSize: 12,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            '&:hover': { color: inkstashColors.brand, bgcolor: 'transparent' },
          }}
        >
          Don&apos;t see your comic? Enter it manually →
        </Button>
      </Box>

      {/* Trending */}
      {trending !== null && trending.length > 0 && (
        <Box sx={{ mt: { xs: 4, md: 5 } }}>
          <SectionHeader subtitle="What other sellers are listing right now — for inspiration. Click to view.">
            <AutoAwesome sx={{ fontSize: 14, mr: 0.75, color: inkstashColors.gold, verticalAlign: 'middle' }} />
            Recent on InkStash
          </SectionHeader>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(4, 1fr)' },
              gap: { xs: 1.5, md: 2 },
            }}
          >
            {trending.slice(0, 4).map((card) => (
              <TrendingTile key={card.id} card={card} onClick={() => navigate(`/item/${card.id}`)} />
            ))}
          </Box>
        </Box>
      )}
      {trending === null && (
        <Box sx={{ mt: { xs: 4, md: 5 }, display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(4, 1fr)' }, gap: 2 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} variant="rectangular" height={280} sx={{ borderRadius: inkstashRadii.md }} />
          ))}
        </Box>
      )}
    </Container>
  );
}

function HowItWorksCard({ step, title, body, icon }: { step: string; title: string; body: string; icon: React.ReactNode }) {
  return (
    <Box
      sx={{
        position: 'relative',
        p: { xs: 2.25, md: 2.75 },
        bgcolor: inkstashColors.bgElev,
        border: `1.5px solid ${inkstashColors.border}`,
        borderRadius: inkstashRadii.lg,
        transition: 'transform 160ms ease, border-color 160ms ease, box-shadow 160ms ease',
        '&:hover': {
          transform: 'translateY(-3px)',
          borderColor: inkstashColors.brand,
          boxShadow: inkstashShadows.md,
        },
      }}
    >
      {/* Big numbered badge — anchored top-right so the row of three reads
          as ① ② ③ at a glance even from across the page. */}
      <Box
        sx={{
          position: 'absolute',
          top: 14,
          right: 14,
          width: 36,
          height: 36,
          borderRadius: '50%',
          bgcolor: inkstashColors.brandSoft,
          color: inkstashColors.brand,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: inkstashFonts.display,
          fontSize: 18,
          fontWeight: 900,
        }}
      >
        {step}
      </Box>

      <Box
        sx={{
          width: 36,
          height: 36,
          borderRadius: inkstashRadii.sm,
          bgcolor: inkstashColors.bgSunken,
          color: inkstashColors.brand,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mb: 1.5,
          '& svg': { fontSize: 20 },
        }}
      >
        {icon}
      </Box>

      <Typography
        sx={{
          fontFamily: inkstashFonts.display,
          fontWeight: 800,
          fontSize: 16,
          color: inkstashColors.ink,
          textTransform: 'uppercase',
          letterSpacing: '0.005em',
          mb: 0.5,
        }}
      >
        {title}
      </Typography>
      <Typography sx={{ fontSize: 13, color: inkstashColors.muted, lineHeight: 1.5, fontFamily: inkstashFonts.ui }}>
        {body}
      </Typography>
    </Box>
  );
}

function SectionHeader({ children, subtitle }: { children: React.ReactNode; subtitle?: string }) {
  return (
    <Box sx={{ mb: 2 }}>
      <Typography
        sx={{
          fontFamily: inkstashFonts.display,
          fontSize: { xs: 18, md: 20 },
          fontWeight: 800,
          color: inkstashColors.ink,
          textTransform: 'uppercase',
          letterSpacing: '0.005em',
          lineHeight: 1.15,
        }}
      >
        {children}
      </Typography>
      {subtitle && (
        <Typography
          sx={{
            fontSize: 13,
            color: inkstashColors.muted,
            mt: 0.5,
            fontFamily: inkstashFonts.ui,
          }}
        >
          {subtitle}
        </Typography>
      )}
    </Box>
  );
}

function TrendingTile({ card, onClick }: { card: MarketplaceFeedCard; onClick: () => void }) {
  return (
    <Box
      component="button"
      type="button"
      onClick={onClick}
      sx={{
        display: 'block',
        width: '100%',
        p: 0,
        border: `1.5px solid ${inkstashColors.border}`,
        borderRadius: inkstashRadii.lg,
        bgcolor: inkstashColors.bgElev,
        overflow: 'hidden',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'transform 160ms ease, border-color 160ms ease, box-shadow 160ms ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          borderColor: inkstashColors.brand,
          boxShadow: inkstashShadows.md,
        },
        '&:active': { transform: 'scale(0.98)' },
      }}
    >
      {/* Cover art — larger aspect than before, inset shadow on the bottom
          edge so the cover lifts off the title section visually. */}
      <Box
        sx={{
          width: '100%',
          aspectRatio: '2 / 3',
          bgcolor: inkstashColors.bgSunken,
          backgroundImage: card.cover_url ? `url(${card.cover_url})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          borderBottom: `1px solid ${inkstashColors.border}`,
        }}
      />
      <Box sx={{ p: { xs: 1.25, md: 1.5 } }}>
        <Typography
          sx={{
            fontFamily: inkstashFonts.ui,
            fontSize: 14,
            fontWeight: 700,
            color: inkstashColors.ink,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            minHeight: 38,
            lineHeight: 1.3,
            mb: 0.75,
          }}
        >
          {card.title}
        </Typography>

        {/* Price on the left in display font, source pill on the right.
            Cobalt blue for buy-now, gold for auction. */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: card.comic_publisher ? 0.75 : 0 }}>
          <Typography
            sx={{
              fontFamily: inkstashFonts.display,
              fontWeight: 800,
              fontSize: 17,
              color: inkstashColors.ink,
              lineHeight: 1,
            }}
          >
            ${Number(card.price).toFixed(2)}
          </Typography>
          <Box
            sx={{
              px: 1,
              py: 0.3,
              bgcolor: card.source === 'auction' ? inkstashColors.gold : '#2A4D8A',
              color: '#fff',
              borderRadius: 999,
              fontFamily: inkstashFonts.mono,
              fontSize: 9.5,
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              flexShrink: 0,
            }}
          >
            {card.source === 'auction' ? 'Auction' : 'Buy now'}
          </Box>
        </Box>

        {card.comic_publisher && (
          <Box
            sx={{
              display: 'inline-block',
              px: 1,
              py: 0.25,
              bgcolor: inkstashColors.brandSoft,
              color: inkstashColors.brand,
              borderRadius: 999,
              fontFamily: inkstashFonts.mono,
              fontSize: 10,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}
          >
            {card.comic_publisher}
          </Box>
        )}
      </Box>
    </Box>
  );
}
