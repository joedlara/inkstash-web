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
import {
  Box,
  Container,
  Typography,
  TextField,
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
  const [manual, setManual] = useState({
    title: '',
    issueNumber: '',
    publisher: '',
    writer: '',
    artist: '',
  });
  const [trending, setTrending] = useState<MarketplaceFeedCard[] | null>(null);
  const [searchSeed, setSearchSeed] = useState('');

  useEffect(() => {
    let cancelled = false;
    marketplaceAPI
      .listFeed({ sort: 'recent', pageSize: 6, filters: { source: 'listing' } })
      .then((r) => { if (!cancelled) setTrending(r.rows); })
      .catch(() => { if (!cancelled) setTrending([]); });
    return () => { cancelled = true; };
  }, []);

  function submitManual() {
    if (!manual.title.trim()) return;
    onPicked({
      comic_vine_id: null,
      title: manual.title.trim(),
      issue_number: manual.issueNumber.trim() || null,
      cover_url: null,
      publisher: manual.publisher.trim() || null,
      writer: manual.writer.trim() || null,
      artist: manual.artist.trim() || null,
    });
  }

  function pickFromTrending(card: MarketplaceFeedCard) {
    onPicked({
      comic_vine_id: null,
      title: card.title,
      issue_number: card.comic_issue_number,
      cover_url: card.cover_url,
      publisher: card.comic_publisher,
      writer: card.comic_writer,
      artist: card.comic_artist,
    });
  }

  return (
    <Container maxWidth="md" sx={{ py: { xs: 3, md: 5 } }}>
      <Box sx={{ mb: 4 }}>
        <Typography
          sx={{
            fontFamily: inkstashFonts.mono,
            fontSize: 11,
            color: inkstashColors.gold,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            mb: 0.75,
          }}
        >
          List a comic · ~2 minutes
        </Typography>
        <Typography
          sx={{
            fontFamily: inkstashFonts.display,
            fontWeight: 800,
            fontSize: { xs: 30, md: 36 },
            color: inkstashColors.ink,
            lineHeight: 1.05,
            textTransform: 'uppercase',
            letterSpacing: '0.005em',
          }}
        >
          What comic are you<br />putting up for sale?
        </Typography>
      </Box>

      {/* How it works */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 1.5, mb: 5 }}>
        <HowItWorksCard step="1" title="Pick your comic" body="Search, pick from trending, or type the details yourself." icon={<Search fontSize="small" />} />
        <HowItWorksCard step="2" title="Add details" body="Condition, grade, photos. Takes about a minute." icon={<ListAlt fontSize="small" />} />
        <HowItWorksCard step="3" title="Set price + ship" body="We handle the payment, you handle the box." icon={<MonetizationOn fontSize="small" />} />
      </Box>

      {/* Search */}
      <SectionHeader>Search by title and issue</SectionHeader>
      <Box sx={{ mb: 1.5 }}>
        <ComicSearchInput key={searchSeed || '__empty__'} initialQuery={searchSeed} onSelect={onPicked} />
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

      {/* Manual form */}
      <Divider label="or enter it yourself" />
      <Box
        sx={{
          mt: 2,
          mb: 5,
          p: { xs: 2, md: 3 },
          bgcolor: inkstashColors.bgElev,
          border: `1px solid ${inkstashColors.border}`,
          borderRadius: inkstashRadii.lg,
        }}
      >
        <Stack spacing={1.75}>
          <TextField
            fullWidth
            label="Title"
            required
            placeholder="e.g. Absolute Batman"
            value={manual.title}
            onChange={(e) => setManual({ ...manual, title: e.target.value })}
          />
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 2fr' }, gap: 1.75 }}>
            <TextField
              label="Issue #"
              placeholder="1"
              value={manual.issueNumber}
              onChange={(e) => setManual({ ...manual, issueNumber: e.target.value })}
            />
            <TextField
              label="Publisher"
              placeholder="DC, Marvel, Image…"
              value={manual.publisher}
              onChange={(e) => setManual({ ...manual, publisher: e.target.value })}
            />
          </Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.75 }}>
            <TextField
              label="Writer"
              value={manual.writer}
              onChange={(e) => setManual({ ...manual, writer: e.target.value })}
            />
            <TextField
              label="Artist"
              value={manual.artist}
              onChange={(e) => setManual({ ...manual, artist: e.target.value })}
            />
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
            <Button
              variant="contained"
              disabled={!manual.title.trim()}
              onClick={submitManual}
              sx={{
                bgcolor: inkstashColors.brand,
                color: '#fff',
                fontWeight: 700,
                px: 3.5,
                py: 1.1,
                fontFamily: inkstashFonts.ui,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                '&:hover': { bgcolor: inkstashColors.brandDeep },
              }}
            >
              Continue →
            </Button>
          </Box>
        </Stack>
      </Box>

      {/* Trending */}
      {trending !== null && trending.length > 0 && (
        <>
          <SectionHeader subtitle="Click a recent listing to copy its comic info">
            <AutoAwesome sx={{ fontSize: 14, mr: 0.75, color: inkstashColors.gold, verticalAlign: 'middle' }} />
            Recent on InkStash
          </SectionHeader>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(6, 1fr)' }, gap: 1.25 }}>
            {trending.map((card) => (
              <TrendingTile key={card.id} card={card} onClick={() => pickFromTrending(card)} />
            ))}
          </Box>
        </>
      )}
      {trending === null && (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(6, 1fr)' }, gap: 1.25 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} variant="rectangular" height={160} sx={{ borderRadius: inkstashRadii.md }} />
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
        p: 1.75,
        bgcolor: inkstashColors.bgElev,
        border: `1px solid ${inkstashColors.border}`,
        borderRadius: inkstashRadii.md,
        transition: 'transform 140ms ease, border-color 140ms ease, box-shadow 140ms ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          borderColor: inkstashColors.borderStrong,
          boxShadow: inkstashShadows.md,
        },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
        <Box
          sx={{
            width: 22,
            height: 22,
            borderRadius: '50%',
            bgcolor: inkstashColors.brand,
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 11,
            fontWeight: 800,
            fontFamily: inkstashFonts.mono,
          }}
        >
          {step}
        </Box>
        <Box sx={{ color: inkstashColors.gold, display: 'flex', alignItems: 'center' }}>{icon}</Box>
        <Typography sx={{ fontWeight: 700, fontSize: 13, color: inkstashColors.ink, fontFamily: inkstashFonts.ui }}>
          {title}
        </Typography>
      </Box>
      <Typography sx={{ fontSize: 12, color: inkstashColors.muted, lineHeight: 1.45 }}>
        {body}
      </Typography>
    </Box>
  );
}

function SectionHeader({ children, subtitle }: { children: React.ReactNode; subtitle?: string }) {
  return (
    <Box sx={{ mb: 1.5 }}>
      <Typography
        sx={{
          fontFamily: inkstashFonts.mono,
          fontSize: 11,
          color: inkstashColors.ink2,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          fontWeight: 700,
        }}
      >
        {children}
      </Typography>
      {subtitle && (
        <Typography sx={{ fontSize: 12, color: inkstashColors.muted, mt: 0.25 }}>
          {subtitle}
        </Typography>
      )}
    </Box>
  );
}

function Divider({ label }: { label: string }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, my: 3 }}>
      <Box sx={{ flex: 1, height: 1, bgcolor: inkstashColors.border }} />
      <Typography
        sx={{
          fontFamily: inkstashFonts.mono,
          fontSize: 11,
          color: inkstashColors.muted,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
        }}
      >
        {label}
      </Typography>
      <Box sx={{ flex: 1, height: 1, bgcolor: inkstashColors.border }} />
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
        border: `1px solid ${inkstashColors.border}`,
        borderRadius: inkstashRadii.md,
        bgcolor: inkstashColors.bgElev,
        overflow: 'hidden',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'transform 140ms ease, border-color 140ms ease, box-shadow 140ms ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          borderColor: inkstashColors.brand,
          boxShadow: inkstashShadows.md,
        },
        '&:active': { transform: 'scale(0.98)' },
      }}
    >
      <Box
        sx={{
          width: '100%',
          aspectRatio: '2 / 3',
          bgcolor: inkstashColors.bgSunken,
          backgroundImage: card.cover_url ? `url(${card.cover_url})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      <Box sx={{ p: 1 }}>
        <Typography
          sx={{
            fontSize: 11.5,
            fontWeight: 700,
            color: inkstashColors.ink,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            minHeight: 28,
            lineHeight: 1.25,
          }}
        >
          {card.title}
        </Typography>
        {card.comic_publisher && (
          <Typography sx={{ fontSize: 9.5, color: inkstashColors.muted, fontFamily: inkstashFonts.mono, textTransform: 'uppercase', letterSpacing: '0.06em', mt: 0.25 }}>
            {card.comic_publisher}
          </Typography>
        )}
      </Box>
    </Box>
  );
}
