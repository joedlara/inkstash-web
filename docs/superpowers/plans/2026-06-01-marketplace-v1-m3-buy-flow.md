# Marketplace v1 — M3: Buy Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the end-to-end buy flow for marketplace listings. After M3, a buyer can discover a listing on `/marketplace`, click it, pay via Stripe Payment Element (Apple Pay / card), and the seller receives funds via Stripe Connect destination charges. For vault listings, ownership transfers to the buyer atomically post-payment. Both buyer and seller get confirmation emails. This is the PR where money actually moves.

**Architecture:** `Marketplace.tsx` gains a unified feed (listings + auctions) via a new `query_marketplace_feed` Postgres RPC. `ItemDetail.tsx` for listings opens a new `<CheckoutListingModal>` (mirrors `<CheckoutVendorPackModal>` from Phase 5 — Dialog wrapping `<StripePaymentElement>`). `create-payment-intent` extends with a `'listing'` branch that loads the seller's `stripe_connect_account_id` from M1 and creates a destination charge with the 10% application fee deducted from the item price (not shipping). `stripe-webhook` adds a branch on `metadata.payment_type === 'listing'` that invokes a new `open-listing-order` edge function. That function does the order INSERT, vault-aware inventory ownership transfer (for vault listings), `seller_payouts` row, and fires both confirmation emails. The existing pre-pivot `create_order` SQL RPC is left alone (legacy auction flow still uses it) — M3 takes a different path through edge functions to avoid coupling.

**Tech Stack:** Same as prior phases. Supabase Postgres + Edge Functions (Deno), Stripe Connect Express, React 19 + TypeScript + MUI v7, Resend (for emails), `@stripe/react-stripe-js` Payment Element (reusing `<StripePaymentElement>` wrapper from Phase 5 A2).

**Spec:** `docs/superpowers/specs/2026-05-29-marketplace-v1-design.md` (sections 4, 5, 6)

**Builds on:**
- **M1** (commit on main): `users.stripe_connect_account_id`, `users.seller_status`, `seller_payouts` table.
- **M2** (commit on main once merged): `listings.source_inventory_id` (vault link), `listings.comic_*` metadata, `application_fee_pct` snapshot, `user_inventory.sell_back_forfeited`.

**Out of scope for M3:** Refund flow (M4), dispute logging (M4), advanced filters (writer/artist slideout — flagged in spec), ship label generation (Phase 7).

---

## Testing convention for this plan

Same as M1/M2: no automated test framework. Verification uses:

1. **Typecheck after every TS change:** `npx tsc --noEmit` — must produce no output.
2. **Edge function deploys** as the smoke test that the function syntax-checks under Deno.
3. **Inline node REST queries** for DB verification.
4. **End-to-end manual verification** of the full buyer-pays-seller flow via Stripe test mode in dev (Task 10).

---

## File Map

### Migration (new)

| File | Purpose |
|---|---|
| `supabase/migrations/20260602000000_marketplace_feed_rpc.sql` | `query_marketplace_feed(p_filters jsonb, p_sort text, p_page int, p_page_size int)` SECURITY DEFINER function returning a unified listings+auctions feed. |

### Edge functions

| File | Action | Purpose |
|---|---|---|
| `supabase/functions/create-payment-intent/index.ts` | Modify | Add `payment_type: 'listing'` branch. Loads listing + seller from DB; validates seller has `stripe_connect_account_id` + `seller_status='active'`; computes amount = item + shipping (cents); computes fee = listing.application_fee_pct * item cents (NOT shipping); creates PaymentIntent with `transfer_data.destination` + `application_fee_amount`; metadata includes `payment_type='listing'`, `listing_id`, `seller_id`, `buyer_id`, `shipping_address_id`, `shipping_rate_id`. |
| `supabase/functions/stripe-webhook/index.ts` | Modify | Add branch in `handlePaymentIntentSucceeded`: when `metadata.payment_type === 'listing'`, invoke `open-listing-order` edge function (same delegation pattern as `openVendorPack`). |
| `supabase/functions/open-listing-order/index.ts` | Create | Idempotent. Inserts order row. For vault listings: UPDATE source inventory `status='sold'`, INSERT new inventory row for buyer with `status='vaulted'`, UPDATE listing `status='sold'`. For outside listings: just UPDATE listing `status='sold'`. INSERT `seller_payouts` row. Fire `send-listing-sold-buyer` and `send-listing-sold-seller` emails. |
| `supabase/functions/send-listing-sold-buyer/index.ts` | Create | Resend confirmation to buyer. Itemized order summary with comic cover + price + seller handle + "View in My Stash" CTA. |
| `supabase/functions/send-listing-sold-seller/index.ts` | Create | Resend "you sold X" to seller. Shows item, gross/fee/payout breakdown, buyer shipping address (or "InkStash will handle shipping" for vault items). |

### Frontend pages (modified)

| File | Action | Purpose |
|---|---|---|
| `src/pages/Marketplace.tsx` | Modify (substantial) | Rewrite to use `marketplaceAPI.listFeed()`. Source filter pills (All / Buy Now / Auctions). Publisher filter pills (dynamic from `comic_publisher` aggregation). Search input (title + issue ILIKE). Sort dropdown (Recent / Price ↑ / Price ↓ / Ending soon). "Load more" pagination. Strip non-comic categories. |
| `src/pages/ItemDetail.tsx` | Modify (light) | Add comic metadata rows under title (publisher chip, writer, artist, issue number). Add "Vault item — ships fast from InkStash" badge when `source_inventory_id != null`. Replace existing Buy Now → cart with Buy Now → opens `<CheckoutListingModal>`. Remove auction countdown for listings. |

### Frontend components (new)

| File | Purpose |
|---|---|
| `src/components/listings/ListingFeedCard.tsx` | Card for the unified marketplace grid. Cover art (3:4), title + issue, publisher chip, price + source label ("Buy now" or "Current bid"), seller avatar/handle, optional vault badge. Click navigates to `/item/:id`. |
| `src/components/listings/PublisherFilterPills.tsx` | Pill row rendering top-6 publishers by listing count (with "More publishers..." modal for the long tail). Cached server-side. |
| `src/components/checkout/CheckoutListingModal.tsx` | Dialog over ItemDetail. Item summary + price breakdown (item, shipping, total) + shipping address selector (reuses `<ShipAddressModal>` from Phase 4) + `<StripePaymentElement>`. On Stripe success, the user gets redirected to `?listing_purchase=success`; the webhook does the real work. |

### API layer (new)

| File | Purpose |
|---|---|
| `src/api/marketplace.ts` | `listFeed({ filters, sort, page, pageSize })` — calls the `query_marketplace_feed` RPC. `getById(id)` — fetches a single listing with seller embed. Publisher aggregation helper. |

### Files explicitly NOT modified in M3

- `supabase/functions/open-pack-usd/index.ts` — vendor pack flow untouched.
- `src/pages/MyStash.tsx`, `src/pages/SellerDashboard.tsx`, `src/pages/Purchases.tsx` — buyer-side success display lives in those pages today; the M3 redirect lands there but the pages don't need code changes for v1.
- `supabase/functions/create-shipping-label/index.ts` — shipping wiring is Phase 7 (`C10-followup`).
- `supabase/functions/sell-back-item/index.ts` — M2 already extended the underlying SQL function; the edge function doesn't need re-deploy unless this changes.

---

## Task 1: query_marketplace_feed RPC migration

The unified server-side query that returns listings + auctions in one paginated, sorted, filterable result set. Returns a `setof` row that has the union shape both sources can fit into.

**Files:**
- Create: `supabase/migrations/20260602000000_marketplace_feed_rpc.sql`

- [ ] **Step 1: Write the migration**

```sql
-- query_marketplace_feed: unified server-side query for /marketplace.
--
-- Returns listings (status='active' AND is_buy_now=true) UNIONed with
-- auctions (status IN ('active','live')), projected into a common row shape.
-- The function applies filters (publisher, query, source), sorts, and
-- paginates server-side so the client just consumes a page.
--
-- Filters JSON shape (all optional):
--   { "publisher": text, "query": text, "source": "all" | "listing" | "auction" }
--
-- Sort values: "recent" (default) | "price_asc" | "price_desc" | "ending_soon"
--
-- The function is SECURITY DEFINER so it can read across listings + auctions
-- without RLS friction. The query is constrained by status filters so
-- delisted / sold / archived rows never appear in the feed.

CREATE OR REPLACE FUNCTION public.query_marketplace_feed(
  p_filters    jsonb DEFAULT '{}'::jsonb,
  p_sort       text  DEFAULT 'recent',
  p_page       int   DEFAULT 1,
  p_page_size  int   DEFAULT 24
)
RETURNS TABLE (
  id                    uuid,
  source                text,
  title                 text,
  cover_url             text,
  price                 numeric,
  display_price_label   text,
  seller_id             uuid,
  comic_publisher       text,
  comic_writer          text,
  comic_artist          text,
  comic_issue_number    text,
  is_vault_item         boolean,
  ends_at               timestamptz,
  created_at            timestamptz,
  total_count           bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_publisher text := p_filters->>'publisher';
  v_query     text := p_filters->>'query';
  v_source    text := coalesce(p_filters->>'source', 'all');
  v_offset    int  := greatest(0, (p_page - 1) * p_page_size);
BEGIN
  RETURN QUERY
  WITH unified AS (
    -- Listings
    -- NOTE: explicit ::text casts on varchar columns. listings.title and
    -- listings.comic_* are declared as `character varying` in the schema,
    -- but RETURNS TABLE above declares them as `text`. Without casts,
    -- PostgreSQL raises 42804 "structure of query does not match function
    -- result type" at first call.
    SELECT
      l.id,
      'listing'::text AS source,
      l.title::text,
      (l.photos->0->>'url')::text AS cover_url,
      l.buy_now_price AS price,
      'Buy now'::text AS display_price_label,
      l.user_id AS seller_id,
      l.comic_publisher::text,
      l.comic_writer::text,
      l.comic_artist::text,
      l.comic_issue_number::text,
      (l.source_inventory_id IS NOT NULL) AS is_vault_item,
      NULL::timestamptz AS ends_at,
      l.created_at
    FROM public.listings l
    WHERE l.status = 'active'
      AND coalesce(l.is_buy_now, false) = true
      AND (v_source = 'all' OR v_source = 'listing')
      AND (v_publisher IS NULL OR l.comic_publisher = v_publisher)
      AND (
        v_query IS NULL
        OR l.title ILIKE '%' || v_query || '%'
        OR coalesce(l.comic_issue_number, '') ILIKE '%' || v_query || '%'
      )

    UNION ALL

    -- Auctions (read-only in v1 — buy flow lives in Phase 6)
    SELECT
      a.id,
      'auction'::text AS source,
      a.title,
      a.image_url AS cover_url,
      coalesce(a.current_bid, a.starting_bid) AS price,
      'Current bid'::text AS display_price_label,
      a.seller_id,
      NULL::text AS comic_publisher,
      NULL::text AS comic_writer,
      NULL::text AS comic_artist,
      NULL::text AS comic_issue_number,
      false AS is_vault_item,
      a.end_time AS ends_at,
      a.created_at
    FROM public.auctions a
    WHERE a.status IN ('active', 'live')
      AND (v_source = 'all' OR v_source = 'auction')
      AND (
        v_query IS NULL
        OR a.title ILIKE '%' || v_query || '%'
      )
  ),
  counted AS (
    SELECT u.*, count(*) OVER () AS total_count
    FROM unified u
  )
  SELECT
    c.id,
    c.source,
    c.title,
    c.cover_url,
    c.price,
    c.display_price_label,
    c.seller_id,
    c.comic_publisher,
    c.comic_writer,
    c.comic_artist,
    c.comic_issue_number,
    c.is_vault_item,
    c.ends_at,
    c.created_at,
    c.total_count
  FROM counted c
  ORDER BY
    CASE WHEN p_sort = 'price_asc'   THEN c.price END ASC NULLS LAST,
    CASE WHEN p_sort = 'price_desc'  THEN c.price END DESC NULLS LAST,
    CASE WHEN p_sort = 'ending_soon' THEN c.ends_at END ASC NULLS LAST,
    CASE WHEN p_sort NOT IN ('price_asc', 'price_desc', 'ending_soon')
         THEN c.created_at END DESC
  LIMIT p_page_size
  OFFSET v_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION public.query_marketplace_feed(jsonb, text, int, int)
  TO anon, authenticated, service_role;
```

- [ ] **Step 2: Apply**

Run: `npx supabase db push`

Expected: `Applying migration 20260602000000_marketplace_feed_rpc.sql... Finished supabase db push.`

- [ ] **Step 3: Verify**

```bash
node --input-type=module -e "
import 'dotenv/config';
const url = process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
const h = { apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' };

const res = await fetch(url + '/rest/v1/rpc/query_marketplace_feed', {
  method: 'POST',
  headers: h,
  body: JSON.stringify({
    p_filters: {},
    p_sort: 'recent',
    p_page: 1,
    p_page_size: 5,
  }),
});
console.log('status:', res.status);
const body = await res.json();
console.log('row count:', Array.isArray(body) ? body.length : 'not an array');
console.log('first row sample:', body[0] ?? '(empty)');
" 2>&1
```

Expected: status 200; array of up to 5 rows. The Captain America listing from M2 should appear (status='active', is_buy_now=true). If `total_count` is populated on every row, the count-over-window worked.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260602000000_marketplace_feed_rpc.sql
git commit -m "feat(db): query_marketplace_feed RPC for unified listings + auctions feed"
```

---

## Task 2: marketplace API client

Frontend wrapper around the RPC. Single method.

**Files:**
- Create: `src/api/marketplace.ts`

- [ ] **Step 1: Write the client**

```typescript
// src/api/marketplace.ts
import { supabase } from './supabase/supabaseClient';

export type MarketplaceFeedSource = 'all' | 'listing' | 'auction';
export type MarketplaceFeedSort = 'recent' | 'price_asc' | 'price_desc' | 'ending_soon';

export interface MarketplaceFeedFilters {
  publisher?: string;
  query?: string;
  source?: MarketplaceFeedSource;
}

export interface MarketplaceFeedCard {
  id: string;
  source: 'listing' | 'auction';
  title: string;
  cover_url: string | null;
  price: number;
  display_price_label: string;
  seller_id: string;
  comic_publisher: string | null;
  comic_writer: string | null;
  comic_artist: string | null;
  comic_issue_number: string | null;
  is_vault_item: boolean;
  ends_at: string | null;
  created_at: string;
  total_count: number;
}

export interface MarketplaceFeedResult {
  rows: MarketplaceFeedCard[];
  totalCount: number;
}

export const marketplaceAPI = {
  async listFeed(opts: {
    filters?: MarketplaceFeedFilters;
    sort?: MarketplaceFeedSort;
    page?: number;
    pageSize?: number;
  }): Promise<MarketplaceFeedResult> {
    const { data, error } = await supabase.rpc('query_marketplace_feed', {
      p_filters: opts.filters ?? {},
      p_sort: opts.sort ?? 'recent',
      p_page: opts.page ?? 1,
      p_page_size: opts.pageSize ?? 24,
    });

    if (error) throw new Error(error.message);
    const rows = (data ?? []) as MarketplaceFeedCard[];
    const totalCount = rows.length > 0 ? rows[0].total_count : 0;
    return { rows, totalCount };
  },

  /** Top-N publishers by active-listing count. Used by PublisherFilterPills. */
  async listPublishers(limit: number = 6): Promise<Array<{ publisher: string; count: number }>> {
    // PostgREST doesn't natively expose GROUP BY; use a tiny helper RPC OR
    // do it client-side after fetching the feed once. For v1 simplicity we
    // do it client-side: pull the first 200 active listings, dedupe by
    // publisher. Replace with a dedicated RPC if performance demands it.
    const { data, error } = await supabase
      .from('listings')
      .select('comic_publisher')
      .eq('status', 'active')
      .eq('is_buy_now', true)
      .not('comic_publisher', 'is', null)
      .limit(200);

    if (error || !data) return [];

    const counts = new Map<string, number>();
    for (const row of data) {
      const p = row.comic_publisher;
      if (!p) continue;
      counts.set(p, (counts.get(p) ?? 0) + 1);
    }

    return Array.from(counts.entries())
      .map(([publisher, count]) => ({ publisher, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  },
};
```

- [ ] **Step 2: Typecheck**

`npx tsc --noEmit`

Expected: zero output.

- [ ] **Step 3: Commit**

```bash
git add src/api/marketplace.ts
git commit -m "feat(api): marketplaceAPI client for unified feed + publisher aggregation"
```

---

## Task 3: ListingFeedCard component

The card for each row in the unified marketplace grid. Cover art, title, publisher, price, seller, optional vault badge.

**Files:**
- Create: `src/components/listings/ListingFeedCard.tsx`

- [ ] **Step 1: Write the component**

```tsx
// src/components/listings/ListingFeedCard.tsx
import { Box, Chip, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { Vault } from 'lucide-react';
import type { MarketplaceFeedCard } from '../../api/marketplace';
import { inkstashColors, inkstashFonts, inkstashRadii, inkstashShadows } from '../../theme/inkstashTokens';

interface Props {
  card: MarketplaceFeedCard;
}

export default function ListingFeedCard({ card }: Props) {
  const isAuction = card.source === 'auction';

  return (
    <Box
      component={RouterLink}
      to={`/item/${card.id}`}
      sx={{
        display: 'block',
        textDecoration: 'none',
        color: 'inherit',
        bgcolor: inkstashColors.bgElev,
        border: `1px solid ${inkstashColors.border}`,
        borderRadius: inkstashRadii.md,
        overflow: 'hidden',
        transition: 'transform 140ms ease, border-color 140ms ease, box-shadow 140ms ease',
        '&:hover': {
          borderColor: inkstashColors.borderStrong,
          transform: 'translateY(-2px)',
          boxShadow: inkstashShadows.md,
        },
      }}
    >
      {/* Cover */}
      <Box
        sx={{
          aspectRatio: '3 / 4',
          bgcolor: inkstashColors.bgSunken,
          backgroundImage: card.cover_url ? `url(${card.cover_url})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          position: 'relative',
        }}
      >
        {card.is_vault_item && (
          <Chip
            icon={<Vault size={11} style={{ marginLeft: 6 }} />}
            label="Vault item"
            size="small"
            sx={{
              position: 'absolute',
              top: 8,
              left: 8,
              bgcolor: inkstashColors.brand,
              color: '#fff',
              fontFamily: inkstashFonts.mono,
              fontSize: 9.5,
              fontWeight: 700,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              height: 20,
              '& .MuiChip-icon': { color: '#fff' },
            }}
          />
        )}
        {isAuction && (
          <Chip
            label="Auction"
            size="small"
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              bgcolor: inkstashColors.gold,
              color: '#fff',
              fontFamily: inkstashFonts.mono,
              fontSize: 9.5,
              fontWeight: 700,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              height: 20,
            }}
          />
        )}
      </Box>

      {/* Body */}
      <Box sx={{ p: 1.5 }}>
        {card.comic_publisher && (
          <Typography
            sx={{
              fontFamily: inkstashFonts.mono,
              fontSize: 10,
              color: inkstashColors.gold,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              mb: 0.5,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {card.comic_publisher}
          </Typography>
        )}

        <Typography
          sx={{
            fontFamily: inkstashFonts.ui,
            fontWeight: 700,
            fontSize: 14,
            color: inkstashColors.ink,
            lineHeight: 1.25,
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            mb: 1,
            minHeight: '2.5em',
          }}
        >
          {card.title}
          {card.comic_issue_number ? ` #${card.comic_issue_number}` : ''}
        </Typography>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <Typography
            sx={{
              fontFamily: inkstashFonts.mono,
              fontSize: 9.5,
              color: inkstashColors.muted,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            {card.display_price_label}
          </Typography>
          <Typography
            sx={{
              fontFamily: inkstashFonts.display,
              fontWeight: 800,
              fontSize: 16,
              color: inkstashColors.ink,
            }}
          >
            ${Number(card.price).toFixed(2)}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
```

- [ ] **Step 2: Typecheck**

`npx tsc --noEmit`

Expected: zero output. If `inkstashShadows.md` doesn't exist (varies across the codebase), substitute with `inkstashShadows.sm` or any existing shadow token.

- [ ] **Step 3: Commit**

```bash
git add src/components/listings/ListingFeedCard.tsx
git commit -m "feat(listings): ListingFeedCard component for marketplace grid"
```

---

## Task 4: PublisherFilterPills component

Renders a horizontal pill row of the top-N publishers (with counts), plus an "All publishers" pill. Clicking a publisher sets the filter on `Marketplace.tsx`.

**Files:**
- Create: `src/components/listings/PublisherFilterPills.tsx`

- [ ] **Step 1: Write the component**

```tsx
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
```

- [ ] **Step 2: Typecheck**

`npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add src/components/listings/PublisherFilterPills.tsx
git commit -m "feat(listings): PublisherFilterPills component for /marketplace"
```

---

## Task 5: Rewrite Marketplace.tsx for unified feed

The page exists today but only queries the auctions table. Rewrite to use `marketplaceAPI.listFeed()` + the new card + the new publisher filter.

**Files:**
- Modify: `src/pages/Marketplace.tsx`

- [ ] **Step 1: Read the current Marketplace.tsx**

`wc -l src/pages/Marketplace.tsx && grep -n "useState\|useEffect\|fetchAuctions\|categories\|filter\|CATEGORIES" src/pages/Marketplace.tsx | head -30`

Identify: current state shape, the auctions fetch, the existing category pill row.

- [ ] **Step 2: Replace the body of Marketplace.tsx**

Whole-file replace is the right move here because almost everything changes. Keep imports for `AppShell`, theme tokens, MUI, lucide-react — but swap the fetch and most of the JSX.

Use this as the new file body (adapt the AppShell wrapper structure to match the existing imports):

```tsx
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
```

If the existing `Marketplace.tsx` imports differ (e.g., a different AppShell path), adjust the imports to match what was there.

- [ ] **Step 3: Typecheck**

`npx tsc --noEmit`

Expected: zero output.

- [ ] **Step 4: Smoke test**

`npm run dev`, navigate to `/marketplace`:
- Should see the unified grid with at least 1 listing (the Captain America from M2).
- Source pills toggle between All / Buy Now / Auctions.
- Publisher pills appear if any listings have publishers (Captain America has `comic_publisher='Marvel'` from M2's RPC default).
- Search input filters on type.
- Sort dropdown changes ordering.
- Clicking a card navigates to `/item/:id`.

- [ ] **Step 5: Commit**

```bash
git add src/pages/Marketplace.tsx
git commit -m "feat(marketplace): unified listings + auctions feed with publisher + source filters"
```

---

## Task 6: ItemDetail.tsx light touch-up

Add comic metadata rows + vault badge. Replace Buy Now → cart with Buy Now → opens `<CheckoutListingModal>` (which we build in Task 7).

**Files:**
- Modify: `src/pages/ItemDetail.tsx`

- [ ] **Step 1: Locate the Buy Now button**

`grep -n "Buy Now\|handleBuyNow\|addToCart" src/pages/ItemDetail.tsx | head -10`

It's the button that adds the item to the cart for the legacy checkout flow.

- [ ] **Step 2: Add CheckoutListingModal state + import**

Near the top of the component:

```tsx
import CheckoutListingModal from '../components/checkout/CheckoutListingModal';
// ...
const [checkoutOpen, setCheckoutOpen] = useState(false);
```

- [ ] **Step 3: Replace Buy Now handler**

The existing handler likely does something like `addToCart(...); navigate('/checkout')`. Replace with:

```tsx
const handleBuyNow = () => setCheckoutOpen(true);
```

(Or rename `handleBuyNow` to keep callers working; doesn't matter as long as the button opens the modal.)

- [ ] **Step 4: Add comic metadata rows under the title**

Find where the title renders. After it, add:

```tsx
{listing && (
  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap', mb: 2 }}>
    {listing.comic_publisher && (
      <Chip
        label={listing.comic_publisher}
        size="small"
        sx={{
          bgcolor: inkstashColors.gold,
          color: '#fff',
          fontFamily: inkstashFonts.mono,
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
        }}
      />
    )}
    {listing.comic_writer && (
      <Typography sx={{ fontSize: 12, color: inkstashColors.muted }}>
        Writer: {listing.comic_writer}
      </Typography>
    )}
    {listing.comic_artist && (
      <Typography sx={{ fontSize: 12, color: inkstashColors.muted }}>
        Art: {listing.comic_artist}
      </Typography>
    )}
    {listing.source_inventory_id && (
      <Chip
        icon={<Vault size={11} style={{ marginLeft: 6 }} />}
        label="Vault item — ships fast"
        size="small"
        sx={{
          bgcolor: inkstashColors.brand,
          color: '#fff',
          fontFamily: inkstashFonts.mono,
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          '& .MuiChip-icon': { color: '#fff' },
        }}
      />
    )}
  </Box>
)}
```

(`listing` here is whatever variable holds the loaded listing data — adapt to the actual variable name.)

- [ ] **Step 5: Mount the modal**

At the bottom of the component's return:

```tsx
{listing && (
  <CheckoutListingModal
    open={checkoutOpen}
    onClose={() => setCheckoutOpen(false)}
    listing={listing}
  />
)}
```

- [ ] **Step 6: Remove auction countdown for listings**

`grep -n "countdown\|timeLeft\|end_time\|auction_end" src/pages/ItemDetail.tsx | head -10`

Wherever countdown UI renders, wrap it: `{!listing && (...)}` or `{auction && (...)}`. Listings don't have ends_at.

- [ ] **Step 7: Typecheck + commit**

`npx tsc --noEmit`

```bash
git add src/pages/ItemDetail.tsx
git commit -m "feat(item-detail): comic metadata rows + vault badge + open CheckoutListingModal on Buy Now"
```

---

## Task 7: CheckoutListingModal component

Dialog over ItemDetail wrapping `<StripePaymentElement>`. Loads shipping rate, shows price breakdown, mounts payment.

**Files:**
- Create: `src/components/checkout/CheckoutListingModal.tsx`

- [ ] **Step 1: Write the component**

```tsx
// src/components/checkout/CheckoutListingModal.tsx
//
// Buy a marketplace listing. Mirrors CheckoutVendorPackModal from Phase 5:
// Dialog wrapper + StripePaymentElement. Apple Pay / card auto-show per
// the buyer's device.
//
// The modal calls create-payment-intent with payment_type='listing'. The
// edge function loads the listing + seller, validates, and creates a
// destination-charge PaymentIntent. On Stripe success, the user is
// redirected to /item/:id?listing_purchase=success. The webhook fires
// open-listing-order asynchronously, which inserts the order, transfers
// vault inventory ownership (if applicable), inserts seller_payouts, and
// sends both confirmation emails.

import { useEffect, useState } from 'react';
import { Dialog, Box, IconButton, Typography, Alert, CircularProgress } from '@mui/material';
import { Close } from '@mui/icons-material';
import StripePaymentElement from './StripePaymentElement';
import { inkstashColors, inkstashFonts, inkstashRadii } from '../../theme/inkstashTokens';

// Minimum shape of a listing the modal needs. Pass whatever your ItemDetail
// has loaded — typically a Pick<Listing, ...> with the seller embedded.
export interface CheckoutListingModalListing {
  id: string;
  title: string;
  buy_now_price: number;
  source_inventory_id: string | null;
  comic_publisher: string | null;
  photos: Array<{ url?: string }> | null;
  // Either embed the seller (preferred) OR rely on the edge function to look it up.
  user_id: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  listing: CheckoutListingModalListing;
}

export default function CheckoutListingModal({ open, onClose, listing }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setError(null);
      setSubmitting(false);
    }
  }, [open]);

  // For v1 the shipping rate is chosen server-side (cheapest active rate
  // saved against the listing at creation time). Later we can surface a
  // picker here; for now we just show "Shipping: calculated at checkout".

  const itemPrice = Number(listing.buy_now_price);
  const coverUrl = listing.photos?.[0]?.url ?? null;

  return (
    <Dialog
      open={open}
      onClose={submitting ? undefined : onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: inkstashRadii.lg,
          bgcolor: inkstashColors.bgElev,
          fontFamily: inkstashFonts.ui,
        },
      }}
    >
      {!submitting && (
        <IconButton
          onClick={onClose}
          sx={{
            position: 'absolute',
            right: 12,
            top: 12,
            color: inkstashColors.muted,
            zIndex: 2,
            '&:hover': { bgcolor: inkstashColors.bgSunken, color: inkstashColors.ink },
          }}
        >
          <Close fontSize="small" />
        </IconButton>
      )}

      <Box sx={{ p: { xs: 3, sm: 3.5 } }}>
        <Typography
          sx={{
            fontFamily: inkstashFonts.display,
            fontWeight: 800,
            fontSize: 22,
            color: inkstashColors.ink,
            textTransform: 'uppercase',
            letterSpacing: '0.005em',
            mb: 2,
          }}
        >
          Confirm purchase
        </Typography>

        {/* Item summary */}
        <Box
          sx={{
            display: 'flex',
            gap: 1.5,
            alignItems: 'center',
            mb: 2.5,
            p: 1.25,
            bgcolor: inkstashColors.bgSunken,
            borderRadius: inkstashRadii.md,
          }}
        >
          {coverUrl && (
            <Box
              component="img"
              src={coverUrl}
              alt={listing.title}
              sx={{ width: 48, height: 72, objectFit: 'cover', borderRadius: 1, flexShrink: 0 }}
            />
          )}
          <Box sx={{ minWidth: 0 }}>
            {listing.comic_publisher && (
              <Typography sx={{ fontSize: 10.5, color: inkstashColors.gold, fontFamily: inkstashFonts.mono, textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.25 }}>
                {listing.comic_publisher}
              </Typography>
            )}
            <Typography sx={{
              fontSize: 14, fontWeight: 700, color: inkstashColors.ink,
              overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box',
              WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
            }}>
              {listing.title}
            </Typography>
          </Box>
        </Box>

        {/* Price summary */}
        <Box
          sx={{
            bgcolor: inkstashColors.bgSunken,
            border: `1px solid ${inkstashColors.border}`,
            borderRadius: inkstashRadii.md,
            p: 1.5,
            mb: 2.5,
            fontFamily: inkstashFonts.mono,
            fontSize: 13,
            color: inkstashColors.ink,
          }}
        >
          <Row label="Item" value={`$${itemPrice.toFixed(2)}`} />
          <Row label="Shipping" value="Calculated at checkout" color={inkstashColors.muted} />
          {listing.source_inventory_id && (
            <Row label="Ship-from" value="InkStash vault" color={inkstashColors.brand} />
          )}
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {/* Stripe Payment Element */}
        <StripePaymentElement
          paymentType="listing"
          targetId={listing.id}
          buttonLabel={`Pay $${itemPrice.toFixed(2)}`}
          returnUrl={(() => {
            const base = window.location.origin + window.location.pathname;
            const params = new URLSearchParams(window.location.search);
            params.set('listing_purchase', 'success');
            return `${base}?${params.toString()}`;
          })()}
          onError={(err) => {
            setError(err.message);
            setSubmitting(false);
          }}
        />

        <Typography sx={{ mt: 1.5, fontSize: 10.5, color: inkstashColors.muted, textAlign: 'center', fontFamily: inkstashFonts.mono, letterSpacing: '0.04em' }}>
          {listing.source_inventory_id
            ? 'Ships from the InkStash vault on payment.'
            : 'Seller ships from their address on payment.'}
        </Typography>
      </Box>
    </Dialog>
  );
}

function Row({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', py: 0.25 }}>
      <span style={{ color: color ?? 'inherit' }}>{label}</span>
      <span style={{ color: color ?? 'inherit' }}>{value}</span>
    </Box>
  );
}
```

Note: this assumes `<StripePaymentElement>` (the wrapper from Phase 5) accepts `paymentType: 'listing'`. That contract is what Task 8 establishes. Until then, TypeScript will flag the prop as not in the union. Add `'listing'` to the wrapper's `PaymentType` union as part of this commit OR defer until Task 8.

For cleanliness: do this commit first, accept the typecheck failure on the `paymentType="listing"` line, then Task 8 fixes it. OR extend the wrapper's PaymentType union here as a tiny prep change. The simpler path:

- [ ] **Step 2: Pre-extend StripePaymentElement's PaymentType union**

Find `src/components/checkout/StripePaymentElement.tsx`. Locate `export type PaymentType = 'ruby_bundle' | 'vendor_pack';`. Change to:

```ts
export type PaymentType = 'ruby_bundle' | 'vendor_pack' | 'listing';
```

That's the only change to the wrapper in this task. Task 8 wires the edge function to actually handle the new value.

- [ ] **Step 3: Typecheck**

`npx tsc --noEmit`

Expected: zero output (with `'listing'` now in the union, the prop assignment compiles).

- [ ] **Step 4: Commit**

```bash
git add src/components/checkout/CheckoutListingModal.tsx src/components/checkout/StripePaymentElement.tsx
git commit -m "feat(checkout): CheckoutListingModal + extend PaymentType union with 'listing'"
```

---

## Task 8: Extend create-payment-intent for listings

Add the `'listing'` branch to the edge function. Loads listing + seller, validates Connect setup, computes amount (item + shipping cents) and fee (item × application_fee_pct), creates destination-charge PaymentIntent.

**Files:**
- Modify: `supabase/functions/create-payment-intent/index.ts`

- [ ] **Step 1: Read the current function**

`wc -l supabase/functions/create-payment-intent/index.ts && grep -n "payment_type\|case '\|switch\|target_id" supabase/functions/create-payment-intent/index.ts | head -20`

It already has branches for `'ruby_bundle'` and `'vendor_pack'`. Add a third for `'listing'`.

- [ ] **Step 2: Add the listing branch**

Find the existing branch dispatch (it's a `switch (paymentType)` or a series of `if (paymentType === '...')`). Add the new branch:

```typescript
if (paymentType === 'listing') {
  // Load listing + seller via PostgREST-style embed
  const { data: listing, error: listingError } = await supabase
    .from('listings')
    .select('id, buy_now_price, status, is_buy_now, application_fee_pct, source_inventory_id, user_id, title')
    .eq('id', target_id)
    .maybeSingle()

  if (listingError || !listing) {
    return new Response(JSON.stringify({ error: 'listing_not_found' }), { status: 404, headers: corsHeaders })
  }
  if (listing.status !== 'active' || !listing.is_buy_now) {
    return new Response(JSON.stringify({ error: 'listing_unavailable' }), { status: 409, headers: corsHeaders })
  }

  // Load seller (must be Connect-active)
  const { data: seller, error: sellerError } = await supabase
    .from('users')
    .select('id, stripe_connect_account_id, seller_status, email, username')
    .eq('id', listing.user_id)
    .maybeSingle()

  if (sellerError || !seller) {
    return new Response(JSON.stringify({ error: 'seller_not_found' }), { status: 404, headers: corsHeaders })
  }
  if (seller.seller_status !== 'active' || !seller.stripe_connect_account_id) {
    return new Response(JSON.stringify({ error: 'seller_not_verified' }), { status: 409, headers: corsHeaders })
  }

  // Compute amounts
  // For v1: shipping cents from a fixed default (or from a shipping_rate_id if
  // the caller passes one). Skipping the rate-picker UI in M3 — listings
  // currently don't have rates wired through. Use $5 flat for outside items
  // and $0 for vault items (InkStash absorbs vault shipping into operational cost).
  const itemCents = Math.round(Number(listing.buy_now_price) * 100)
  const shippingCents = listing.source_inventory_id ? 0 : 500 // v1 simplification

  const feePct = Number(listing.application_fee_pct ?? 0.100)
  const feeCents = Math.round(itemCents * feePct) // Fee on item only, not shipping

  const amountCents = itemCents + shippingCents

  // Get the buyer's Stripe customer id (find-or-create — same pattern as
  // ruby_bundle / vendor_pack branches). Reuse helper if one exists; otherwise
  // inline the find-or-create here.

  // Create the PaymentIntent with destination routing.
  const intent = await stripe.paymentIntents.create({
    amount: amountCents,
    currency: 'usd',
    customer: stripeCustomerId, // from the find-or-create above
    automatic_payment_methods: { enabled: true },
    transfer_data: { destination: seller.stripe_connect_account_id },
    application_fee_amount: feeCents,
    metadata: {
      payment_type: 'listing',
      listing_id: listing.id,
      seller_id: listing.user_id,
      buyer_id: user.id,
      // No shipping_address_id yet — we surface it via Stripe's Address
      // Element in the Payment Element (automatic_payment_methods includes
      // address collection by default for shipped items).
    },
  })

  return new Response(JSON.stringify({
    clientSecret: intent.client_secret,
    paymentIntentId: intent.id,
    amount: amountCents,
  }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}
```

Adapt to the exact branch shape in the file (it may use `switch` or `if-else if`). The key invariants:

- `payment_type: 'listing'` in metadata so the webhook can route correctly.
- `transfer_data.destination` is the seller's Connect account.
- `application_fee_amount` is `floor(item × fee_pct)` — NOT `(item + shipping) × fee_pct`.
- Reject with 4xx if seller isn't `seller_status='active'` (don't take payment we can't route).

- [ ] **Step 3: Deploy**

`npx supabase functions deploy create-payment-intent --no-verify-jwt`

Expected: deploys successfully.

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/create-payment-intent/index.ts
git commit -m "feat(checkout): create-payment-intent handles payment_type='listing' with Connect destination charges"
```

---

## Task 9: open-listing-order edge function + webhook branch

The function that fires post-payment. Inserts order, transfers vault inventory ownership if applicable, inserts seller_payouts, fires emails.

**Files:**
- Create: `supabase/functions/open-listing-order/index.ts`
- Modify: `supabase/functions/stripe-webhook/index.ts`

- [ ] **Step 1: Write open-listing-order**

```typescript
// supabase/functions/open-listing-order/index.ts
//
// Service-role only. Invoked by stripe-webhook when a payment_type='listing'
// PaymentIntent succeeds. Idempotent — checks seller_payouts.stripe_payment_intent_id
// UNIQUE constraint to detect retries.
//
// Flow:
//   1. Idempotency: bail if seller_payouts already has this intent.
//   2. Load listing + seller.
//   3. INSERT order row (status='processing').
//   4. For vault listings (source_inventory_id != null):
//        - UPDATE source inventory status='sold'
//        - INSERT new user_inventory row for buyer (status='vaulted')
//   5. UPDATE listing status='sold'.
//   6. INSERT seller_payouts row.
//   7. Fire-and-forget: send-listing-sold-buyer + send-listing-sold-seller emails.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface Payload {
  listing_id: string
  seller_id: string
  buyer_id: string
  payment_intent_id: string
  amount_cents: number
  application_fee_cents: number
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    // @ts-expect-error Deno env
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    // @ts-expect-error Deno env
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const supabase = createClient(supabaseUrl, serviceRoleKey)
    const payload: Payload = await req.json()

    // Idempotency check
    const { data: existing } = await supabase
      .from('seller_payouts')
      .select('id')
      .eq('stripe_payment_intent_id', payload.payment_intent_id)
      .maybeSingle()
    if (existing) {
      return new Response(JSON.stringify({ status: 'already_processed' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Load listing
    const { data: listing, error: listingErr } = await supabase
      .from('listings')
      .select('id, buy_now_price, source_inventory_id, user_id, title, comic_publisher')
      .eq('id', payload.listing_id)
      .maybeSingle()
    if (listingErr || !listing) {
      console.error('[open-listing-order] listing not found', listingErr)
      return new Response(JSON.stringify({ error: 'listing_not_found' }), { status: 404, headers: corsHeaders })
    }

    // INSERT order
    const itemCents = Math.round(Number(listing.buy_now_price) * 100)
    const shippingCents = payload.amount_cents - itemCents
    const sellerNetCents = payload.amount_cents - payload.application_fee_cents

    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .insert({
        buyer_id: payload.buyer_id,
        seller_id: payload.seller_id,
        listing_id: payload.listing_id,
        status: 'processing',
        item_price: listing.buy_now_price,
        shipping_cost: shippingCents / 100,
        tax: 0,
        total: payload.amount_cents / 100,
        purchase_type: 'listing',
        order_number: 'L-' + Date.now().toString(36).toUpperCase(),
        stripe_payment_intent_id: payload.payment_intent_id,
      })
      .select('id')
      .single()
    if (orderErr || !order) {
      console.error('[open-listing-order] order INSERT failed', orderErr)
      return new Response(JSON.stringify({ error: 'order_insert_failed' }), { status: 500, headers: corsHeaders })
    }

    // Vault flow: transfer inventory ownership
    if (listing.source_inventory_id) {
      // Mark seller's vault row as sold
      await supabase
        .from('user_inventory')
        .update({ status: 'sold' })
        .eq('id', listing.source_inventory_id)

      // Load the original vault row to copy its pack_item_id + pack_purchase_id
      const { data: oldInv } = await supabase
        .from('user_inventory')
        .select('pack_item_id, pack_purchase_id')
        .eq('id', listing.source_inventory_id)
        .single()

      if (oldInv) {
        await supabase
          .from('user_inventory')
          .insert({
            user_id: payload.buyer_id,
            pack_item_id: oldInv.pack_item_id,
            pack_purchase_id: oldInv.pack_purchase_id, // shared lineage; helps trace provenance
            status: 'vaulted',
            // Critically: sell_back_forfeited defaults to false here.
            // The new owner gets a fresh sell-back option (NOT inherited from
            // the previous owner). v1 policy decision worth re-confirming later.
          })
      }
    }

    // Mark listing as sold
    await supabase
      .from('listings')
      .update({ status: 'sold' })
      .eq('id', payload.listing_id)

    // Insert seller_payouts row
    await supabase
      .from('seller_payouts')
      .insert({
        payee_user_id: payload.seller_id,
        pack_id: null, // marketplace listing, not a pack
        pack_purchase_id: null,
        gross_amount_cents: payload.amount_cents,
        vendor_amount_cents: sellerNetCents,
        inkstash_amount_cents: payload.application_fee_cents,
        stripe_payment_intent_id: payload.payment_intent_id,
      })

    // Fire-and-forget emails (don't block the webhook on email delivery)
    fireConfirmationEmails(supabase, supabaseUrl, serviceRoleKey, {
      orderId: order.id,
      listing,
      buyer_id: payload.buyer_id,
      seller_id: payload.seller_id,
      amount_cents: payload.amount_cents,
      payment_intent_id: payload.payment_intent_id,
    }).catch((err) => console.error('[open-listing-order] email fire failed:', err))

    return new Response(JSON.stringify({ status: 'ok', order_id: order.id }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[open-listing-order] uncaught', err)
    return new Response(JSON.stringify({ error: 'internal' }), { status: 500, headers: corsHeaders })
  }
})

async function fireConfirmationEmails(
  supabase: ReturnType<typeof createClient>,
  supabaseUrl: string,
  serviceRoleKey: string,
  ctx: {
    orderId: string
    listing: { id: string; title: string; comic_publisher: string | null; source_inventory_id: string | null }
    buyer_id: string
    seller_id: string
    amount_cents: number
    payment_intent_id: string
  },
) {
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${serviceRoleKey}`,
  }

  await Promise.allSettled([
    fetch(`${supabaseUrl}/functions/v1/send-listing-sold-buyer`, {
      method: 'POST',
      headers,
      body: JSON.stringify(ctx),
    }),
    fetch(`${supabaseUrl}/functions/v1/send-listing-sold-seller`, {
      method: 'POST',
      headers,
      body: JSON.stringify(ctx),
    }),
  ])
}
```

- [ ] **Step 2: Deploy open-listing-order**

`npx supabase functions deploy open-listing-order --no-verify-jwt`

- [ ] **Step 3: Add the webhook branch**

In `supabase/functions/stripe-webhook/index.ts`, find `handlePaymentIntentSucceeded`. Inside it, the existing dispatch handles `ruby_bundle` and `vendor_pack`. Add the `'listing'` case (same delegation pattern as `openVendorPack`):

```typescript
if (paymentType === 'listing') {
  return await openListingOrder(intent, supabaseUrl, serviceRoleKey)
}
```

Then define `openListingOrder` (mirrors `openVendorPack`):

```typescript
async function openListingOrder(
  intent: Stripe.PaymentIntent,
  supabaseUrl: string,
  serviceRoleKey: string,
): Promise<Response> {
  const listing_id = intent.metadata?.listing_id
  const seller_id = intent.metadata?.seller_id
  const buyer_id = intent.metadata?.buyer_id

  if (!listing_id || !seller_id || !buyer_id) {
    console.error('[stripe-webhook] listing intent missing metadata', intent.id, intent.metadata)
    return new Response('Missing listing metadata', { status: 400 })
  }

  const res = await fetch(`${supabaseUrl}/functions/v1/open-listing-order`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${serviceRoleKey}`,
    },
    body: JSON.stringify({
      listing_id,
      seller_id,
      buyer_id,
      payment_intent_id: intent.id,
      amount_cents: intent.amount,
      application_fee_cents: intent.application_fee_amount ?? 0,
    }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    console.error('[stripe-webhook] open-listing-order failed', res.status, body)
    return new Response('open-listing-order failed', { status: 502 })
  }
  return new Response('ok', { status: 200 })
}
```

- [ ] **Step 4: Deploy webhook**

`npx supabase functions deploy stripe-webhook --no-verify-jwt`

- [ ] **Step 5: Commit both**

```bash
git add supabase/functions/open-listing-order/index.ts supabase/functions/stripe-webhook/index.ts
git commit -m "feat(orders): open-listing-order edge function + webhook branch for marketplace orders"
```

---

## Task 10: Confirmation emails

Two new edge functions, mirroring the Resend pattern from Phase 5 (`send-ruby-bundle-confirmation` etc.).

**Files:**
- Create: `supabase/functions/send-listing-sold-buyer/index.ts`
- Create: `supabase/functions/send-listing-sold-seller/index.ts`

- [ ] **Step 1: send-listing-sold-buyer**

Copy `supabase/functions/send-vendor-pack-confirmation/index.ts` as the template (same Resend POST + corsHeaders + HTML body pattern). Rename to `supabase/functions/send-listing-sold-buyer/index.ts`.

Changes from the template:

1. **Payload shape** — receives `{ orderId, listing: { id, title, comic_publisher, source_inventory_id }, buyer_id, seller_id, amount_cents, payment_intent_id }` from `open-listing-order`. Fetch buyer email + seller handle from DB inside the function (service-role read on `users`).
2. **Subject** — `"You bought ${listing.title} on InkStash"`.
3. **HTML body** — cover thumbnail (use the existing send-vendor-pack-confirmation's image rendering), title, publisher chip, price (`amount_cents / 100`), seller handle (`@${seller.username}`), and a "View in My Stash" CTA linking to the production app's `/purchases` route.
4. **Vault item callout** — if `listing.source_inventory_id != null`, add a `<p>` saying "This book is shipping from the InkStash vault — expect it within 3-5 business days."
5. **Footer** — same support email + brand copy as the existing send-* functions.

- [ ] **Step 2: send-listing-sold-seller**

Same template. Different recipient + content.

Changes:

1. **Payload shape** — same as buyer email.
2. **Subject** — `"You sold ${listing.title} on InkStash"`.
3. **HTML body** — cover thumbnail, title, the three-line price breakdown (`Gross: $X.XX`, `InkStash fee: -$Y.YY`, `Your payout: $Z.ZZ`), and the shipping context.
4. **Shipping context** — for outside items: include the buyer's shipping address (fetch from `orders.shipping_*` columns via the order row). For vault items: say "InkStash will ship from the vault — no action required from you."
5. **Manage CTA** — "View in Seller Dashboard" linking to `/seller-dashboard`.

- [ ] **Step 3: Deploy both**

```bash
npx supabase functions deploy send-listing-sold-buyer
npx supabase functions deploy send-listing-sold-seller
```

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/send-listing-sold-buyer/index.ts supabase/functions/send-listing-sold-seller/index.ts
git commit -m "feat(email): listing sold confirmations for buyer + seller via Resend"
```

---

## Task 11: End-to-end smoke test (manual)

Test the full buy flow with a real Stripe test card. Requires you (the operator) in a browser.

- [ ] **Step 1: Prep**

You need:
- A buyer account with `seller_status` whatever, doesn't matter for buying.
- The existing Captain America listing from M2 ($65, dsauve98 selling).

Pick a buyer that's NOT dsauve98 (or your main account). Stripe Connect doesn't let you pay yourself.

- [ ] **Step 2: Buy**

Log in as the buyer. Navigate to `/marketplace`. Confirm the Captain America card appears. Click it. ItemDetail loads with the new metadata rows + vault badge. Click "Buy Now". Modal opens.

Use Stripe test card `4242 4242 4242 4242`, any future expiry, any CVC. Submit.

- [ ] **Step 3: Verify on Stripe side**

In Stripe Dashboard → Payments, the test charge should appear with:
- Amount: $65 (item) + $0 (vault shipping)
- `application_fee_amount`: $6.50 (10% of $65)
- `transfer_data.destination`: dsauve98's Connect account (`acct_1TcXRKQXDmwUNLE2`)
- Metadata: `payment_type=listing`, `listing_id=...`, `seller_id=...`, `buyer_id=...`

- [ ] **Step 4: Verify webhook fired + open-listing-order ran**

```bash
npx supabase functions logs open-listing-order --tail 2>&1 | head -20
npx supabase functions logs stripe-webhook --tail 2>&1 | head -20
```

You should see successful invocations of both.

- [ ] **Step 5: Verify DB state**

```bash
node --input-type=module -e "
import 'dotenv/config';
const url = process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
const h = { apikey: key, Authorization: 'Bearer ' + key };

const orders = await fetch(url + '/rest/v1/orders?order=created_at.desc&limit=1&select=id,buyer_id,seller_id,listing_id,status,total,purchase_type,stripe_payment_intent_id', { headers: h }).then(r => r.json());
console.log('Latest order:', JSON.stringify(orders, null, 2));

const payouts = await fetch(url + '/rest/v1/seller_payouts?order=created_at.desc&limit=1&select=*', { headers: h }).then(r => r.json());
console.log('Latest seller_payout:', JSON.stringify(payouts, null, 2));

// Confirm the Captain America listing is now 'sold'
const listing = await fetch(url + '/rest/v1/listings?title=eq.Captain%20America&select=id,status,source_inventory_id', { headers: h }).then(r => r.json());
console.log('Captain America listing:', JSON.stringify(listing, null, 2));

// Confirm the source inventory is 'sold' and a new vaulted row exists for the buyer
if (listing[0]?.source_inventory_id) {
  const inv = await fetch(url + '/rest/v1/user_inventory?id=eq.' + listing[0].source_inventory_id + '&select=id,status,user_id', { headers: h }).then(r => r.json());
  console.log('Source inventory (was dsauve98):', JSON.stringify(inv, null, 2));
}
"
```

Expected:
- `orders[0].status === 'processing'`, `purchase_type === 'listing'`, `total === 65`, `stripe_payment_intent_id` set.
- `seller_payouts[0].payee_user_id === dsauve98's id`, `gross_amount_cents === 6500`, `inkstash_amount_cents === 650`, `vendor_amount_cents === 5850`.
- Listing `status === 'sold'`.
- Original vault inventory row `status === 'sold'`.
- A new `user_inventory` row exists for the buyer with `pack_item_id` matching the original + `status='vaulted'`.

- [ ] **Step 6: Check both emails arrived**

Buyer's email: "You bought Captain America on InkStash."
Seller's email (dsauve98@gmail.com): "You sold Captain America on InkStash" with the $58.50 net payout figure.

- [ ] **Step 7: Final verification — buy a non-vault outside listing**

If you have any outside-item listings from M2's wizard test, repeat the flow with one. The order should land with no inventory transfer (because source_inventory_id is null), seller's outside-listing flips to 'sold', emails fire.

If you don't have an outside listing, create one via `/list-item` first (any comic, any price).

- [ ] **Step 8: Empty marker commit**

```bash
git commit --allow-empty -m "test(marketplace-m3): buy flow smoke test passed end-to-end"
```

---

# M3 Acceptance Verification

Phase M3 is complete when:

- [ ] Acceptance #1: `query_marketplace_feed` RPC applied; returns rows for the Captain America listing.
- [ ] Acceptance #2: `marketplaceAPI.listFeed()` typechecks; returns paginated unified feed.
- [ ] Acceptance #3: `ListingFeedCard` renders correctly with vault badge for vault items, auction badge for auctions.
- [ ] Acceptance #4: `PublisherFilterPills` loads from `marketplaceAPI.listPublishers()` and toggles the filter.
- [ ] Acceptance #5: `/marketplace` shows the unified grid; source pills, publisher pills, search input, and sort dropdown all work.
- [ ] Acceptance #6: `/item/:id` shows comic metadata rows + vault badge; Buy Now opens `<CheckoutListingModal>`.
- [ ] Acceptance #7: `<CheckoutListingModal>` mounts `<StripePaymentElement paymentType="listing">`.
- [ ] Acceptance #8: `create-payment-intent` handles `payment_type='listing'`; rejects unverified sellers; creates destination-charge PaymentIntent.
- [ ] Acceptance #9: `open-listing-order` edge function deploys; idempotent; inserts order + transfers vault inventory + inserts seller_payouts.
- [ ] Acceptance #10: `stripe-webhook` invokes `open-listing-order` on listing PaymentIntent success.
- [ ] Acceptance #11: Confirmation emails arrive for both buyer and seller.
- [ ] Acceptance #12: End-to-end smoke test passed — Stripe charge succeeded, money split correctly, vault ownership transferred, listing closed.

M3 is done when all twelve check.
