# Phase 1: Home Page & Navigation Restructure — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild InkStash's home page and navigation to reflect the comic-first, pack-opening-focused pivot — replacing generic collectibles content with a pack-first hero, drop countdown, live breaks section, and comic-niche nav tabs.

**Architecture:** Surgical swap on the existing React/MUI codebase. `Home.tsx` is rebuilt from scratch using Option A layout. `DashboardHeader.tsx` nav links are replaced with 5 comic-niche tabs. Three legacy pages are deleted, two legacy routes redirected, and five new stub pages added. `MyStash.tsx` tab label updated. No backend changes — all new sections use static placeholder data.

**Tech Stack:** React 18, MUI v5, React Router v6, TypeScript. Theme primary: `#0078FF`. Pack accent purple: `#7c3aed`. Live red: `#ef4444`. Drop gold: `#f59e0b`.

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Rebuild | `src/pages/Home.tsx` | Pack-first hero, drop banner, Open Now grid, Live Breaks, Trending |
| Modify | `src/components/home/DashboardHeader.tsx` | Replace Browse dropdown with 5 comic nav tabs |
| Modify | `src/components/home/MobileBottomNav.tsx` | Replace Categories with Packs tab |
| Modify | `src/pages/MyStash.tsx` | Rename "Purchase History" tab label to "My Stash" |
| Modify | `src/main.tsx` | Remove deleted routes, add new routes + redirects |
| Delete | `src/pages/BrowseFeatured.tsx` | Removed — replaced by Packs |
| Delete | `src/pages/FeaturedArtists.tsx` | Removed — not comic-niche relevant |
| Delete | `src/pages/PopularShows.tsx` | Removed — replaced by Live Breaks section |
| Delete | `src/components/home/FeaturedCollectibles.tsx` | Removed — replaced by new home sections |
| Delete | `src/components/home/PopularShows.tsx` | Removed — replaced by Live Breaks section |
| Create | `src/pages/Packs.tsx` | Pack browsing stub page |
| Create | `src/pages/Live.tsx` | Live streams stub page |
| Create | `src/pages/Drops.tsx` | Upcoming drops stub page |
| Create | `src/pages/Raffles.tsx` | Active raffles stub page |
| Create | `src/pages/Marketplace.tsx` | Marketplace stub page (redirects to existing listings) |

---

## Task 1: Delete legacy pages and components

**Files:**
- Delete: `src/pages/BrowseFeatured.tsx`
- Delete: `src/pages/FeaturedArtists.tsx`
- Delete: `src/pages/PopularShows.tsx`
- Delete: `src/components/home/FeaturedCollectibles.tsx`
- Delete: `src/components/home/PopularShows.tsx`

- [ ] **Step 1: Delete the files**

```bash
rm src/pages/BrowseFeatured.tsx
rm src/pages/FeaturedArtists.tsx
rm src/pages/PopularShows.tsx
rm src/components/home/FeaturedCollectibles.tsx
rm src/components/home/PopularShows.tsx
```

- [ ] **Step 2: Verify deleted**

```bash
ls src/pages/BrowseFeatured.tsx 2>&1
ls src/pages/FeaturedArtists.tsx 2>&1
ls src/pages/PopularShows.tsx 2>&1
```
Expected: `No such file or directory` for all three.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: delete legacy collectibles pages (BrowseFeatured, FeaturedArtists, PopularShows)"
```

---

## Task 2: Create stub pages for new nav destinations

**Files:**
- Create: `src/pages/Packs.tsx`
- Create: `src/pages/Live.tsx`
- Create: `src/pages/Drops.tsx`
- Create: `src/pages/Raffles.tsx`
- Create: `src/pages/Marketplace.tsx`

- [ ] **Step 1: Create `src/pages/Packs.tsx`**

```tsx
import { Box, Container, Typography } from '@mui/material';
import DashboardHeader from '../components/home/DashboardHeader';

export default function Packs() {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <DashboardHeader />
      <Container maxWidth="xl" sx={{ pt: 12, pb: 6 }}>
        <Typography variant="h4" fontWeight={800} gutterBottom>
          Packs
        </Typography>
        <Typography color="text.secondary">
          Browse and open blind bag comic packs — coming soon.
        </Typography>
      </Container>
    </Box>
  );
}
```

- [ ] **Step 2: Create `src/pages/Live.tsx`**

```tsx
import { Box, Container, Typography } from '@mui/material';
import DashboardHeader from '../components/home/DashboardHeader';

export default function Live() {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <DashboardHeader />
      <Container maxWidth="xl" sx={{ pt: 12, pb: 6 }}>
        <Typography variant="h4" fontWeight={800} gutterBottom>
          Live Breaks
        </Typography>
        <Typography color="text.secondary">
          Watch live comic breaks and auctions — coming soon.
        </Typography>
      </Container>
    </Box>
  );
}
```

- [ ] **Step 3: Create `src/pages/Drops.tsx`**

```tsx
import { Box, Container, Typography } from '@mui/material';
import DashboardHeader from '../components/home/DashboardHeader';

export default function Drops() {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <DashboardHeader />
      <Container maxWidth="xl" sx={{ pt: 12, pb: 6 }}>
        <Typography variant="h4" fontWeight={800} gutterBottom>
          Drops
        </Typography>
        <Typography color="text.secondary">
          Upcoming publisher drops and limited releases — coming soon.
        </Typography>
      </Container>
    </Box>
  );
}
```

- [ ] **Step 4: Create `src/pages/Raffles.tsx`**

```tsx
import { Box, Container, Typography } from '@mui/material';
import DashboardHeader from '../components/home/DashboardHeader';

export default function Raffles() {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <DashboardHeader />
      <Container maxWidth="xl" sx={{ pt: 12, pb: 6 }}>
        <Typography variant="h4" fontWeight={800} gutterBottom>
          Raffles
        </Typography>
        <Typography color="text.secondary">
          Live stream raffles and ticket entries — coming soon.
        </Typography>
      </Container>
    </Box>
  );
}
```

- [ ] **Step 5: Create `src/pages/Marketplace.tsx`**

```tsx
import { Box, Container, Typography } from '@mui/material';
import DashboardHeader from '../components/home/DashboardHeader';

export default function Marketplace() {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <DashboardHeader />
      <Container maxWidth="xl" sx={{ pt: 12, pb: 6 }}>
        <Typography variant="h4" fontWeight={800} gutterBottom>
          Marketplace
        </Typography>
        <Typography color="text.secondary">
          Buy and sell comics at fixed prices or via auction — coming soon.
        </Typography>
      </Container>
    </Box>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add src/pages/Packs.tsx src/pages/Live.tsx src/pages/Drops.tsx src/pages/Raffles.tsx src/pages/Marketplace.tsx
git commit -m "feat: add stub pages for Packs, Live, Drops, Raffles, Marketplace"
```

---

## Task 3: Update `main.tsx` — routes, redirects, and imports

**Files:**
- Modify: `src/main.tsx`

- [ ] **Step 1: Replace `main.tsx` with updated routing**

Remove imports for deleted pages, add imports for new pages, add redirect routes for `/browse-featured` → `/packs`, `/featured-artists` → `/packs`, `/popular-shows` → `/packs`.

```tsx
// src/main.tsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { theme } from './theme/theme';
import RouteGuard from './auth/RouteGuard';
import Home from './pages/Home';
import Seller from './pages/Seller';
import ItemDetail from './pages/ItemDetail';
import Packs from './pages/Packs';
import Live from './pages/Live';
import Drops from './pages/Drops';
import Raffles from './pages/Raffles';
import Marketplace from './pages/Marketplace';
import Checkout from './pages/CheckoutNew';
import OrderSuccess from './pages/OrderSuccess';
import OrderManagement from './pages/OrderManagement';
import Cart from './pages/Cart';
import MyBids from './pages/MyBids';
import MyStash from './pages/MyStash';
import AccountSettings from './pages/AccountSettings';
import Onboarding from './pages/Onboarding';
import SellerOnboarding from './pages/SellerOnboarding';
import SellerDashboard from './pages/SellerDashboard';
import ListItem from './pages/ListItem';
import UserProfile from './pages/UserProfile';
import { CartProvider } from './contexts/CartContext';
import AppLayout from './components/layout/AppLayout';
import './styles/index.css';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <CartProvider>
        <BrowserRouter>
          <RouteGuard>
            <AppLayout>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/onboarding" element={<Onboarding />} />
                <Route path="/seller-onboarding" element={<SellerOnboarding />} />
                <Route path="/seller-dashboard" element={<SellerDashboard />} />
                <Route path="/list-item" element={<ListItem />} />
                <Route path="/sell" element={<Seller />} />
                <Route path="/item/:id" element={<ItemDetail />} />
                <Route path="/auction/:id" element={<ItemDetail />} />
                <Route path="/packs" element={<Packs />} />
                <Route path="/live" element={<Live />} />
                <Route path="/drops" element={<Drops />} />
                <Route path="/raffles" element={<Raffles />} />
                <Route path="/marketplace" element={<Marketplace />} />
                {/* Redirects for removed routes */}
                <Route path="/browse-featured" element={<Navigate to="/packs" replace />} />
                <Route path="/featured-artists" element={<Navigate to="/packs" replace />} />
                <Route path="/popular-shows" element={<Navigate to="/packs" replace />} />
                <Route path="/browse" element={<Navigate to="/packs" replace />} />
                <Route path="/featured" element={<Navigate to="/packs" replace />} />
                <Route path="/checkout" element={<Checkout />} />
                <Route path="/order-success" element={<OrderSuccess />} />
                <Route path="/order/:orderId" element={<OrderManagement />} />
                <Route path="/cart" element={<Cart />} />
                <Route path="/my-bids" element={<MyBids />} />
                <Route path="/my-stash" element={<MyStash />} />
                <Route path="/settings" element={<AccountSettings />} />
                <Route path="/profile/:userId" element={<UserProfile />} />
                <Route path="/*" element={<UserProfile />} />
              </Routes>
            </AppLayout>
          </RouteGuard>
        </BrowserRouter>
      </CartProvider>
    </ThemeProvider>
  </React.StrictMode>
);
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -30
```
Expected: No errors related to missing imports. Fix any that appear.

- [ ] **Step 3: Commit**

```bash
git add src/main.tsx
git commit -m "feat: update routes — add comic nav pages, remove legacy routes, add redirects"
```

---

## Task 4: Update `DashboardHeader.tsx` — replace Browse dropdown with 5 comic nav tabs

**Files:**
- Modify: `src/components/home/DashboardHeader.tsx`

- [ ] **Step 1: Replace nav links section in `DashboardHeader.tsx`**

Find and replace the `Navigation Links` Stack (the section with `Home` button and `Browse` dropdown). The Browse `Menu` component and its `MenuItem`s can also be removed entirely. Replace with:

```tsx
{/* Navigation Links — comic-first tabs */}
<Stack
  direction="row"
  spacing={0.5}
  sx={{
    flexShrink: 0,
    display: { xs: 'none', md: 'flex' },
  }}
>
  {[
    { label: 'Packs', path: '/packs' },
    { label: 'Live', path: '/live' },
    { label: 'Marketplace', path: '/marketplace' },
    { label: 'Drops', path: '/drops' },
    { label: 'Raffles', path: '/raffles' },
  ].map(({ label, path }) => (
    <Button
      key={path}
      onClick={() => navigate(path)}
      sx={{
        px: 2.5,
        py: 1,
        borderRadius: 999,
        fontWeight: 600,
        color: location.pathname === path ? 'white' : 'text.secondary',
        bgcolor: location.pathname === path ? 'primary.main' : 'transparent',
        '&:hover': {
          bgcolor: location.pathname === path ? 'primary.dark' : 'action.hover',
          color: location.pathname === path ? 'white' : 'text.primary',
        },
      }}
    >
      {label}
    </Button>
  ))}
</Stack>
```

- [ ] **Step 2: Add `useLocation` import at top of file**

The file already imports `useNavigate`. Add `useLocation` to the same import:

```tsx
import { useNavigate, useLocation } from 'react-router-dom';
```

And add inside the component body (after `useNavigate`):

```tsx
const location = useLocation();
```

- [ ] **Step 3: Remove unused Browse-related imports and state**

Remove from MUI imports: `Menu`, `MenuItem`, `ListItemIcon`, `ListItemText`, `KeyboardArrowDown`, `AutoAwesome`, `Palette`, `TrendingUp`.

Remove state: `const [browseAnchorEl, setBrowseAnchorEl] = useState<null | HTMLElement>(null);`

Remove functions: `handleBrowseClick`, `handleBrowseClose`, `handleBrowseNavigation`.

Remove the entire `{/* Browse Dropdown Menu */}` JSX block at the bottom.

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```
Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/home/DashboardHeader.tsx
git commit -m "feat: replace Browse dropdown with comic-niche nav tabs (Packs/Live/Marketplace/Drops/Raffles)"
```

---

## Task 5: Update `MobileBottomNav.tsx` — replace Categories with Packs

**Files:**
- Modify: `src/components/home/MobileBottomNav.tsx`

- [ ] **Step 1: Replace the Categories nav button with a Packs button**

Find the `{/* Categories */}` button block and replace it:

```tsx
{/* Packs */}
<button
  className={`nav-item ${isActive('/packs') ? 'active' : ''}`}
  onClick={() => navigate('/packs')}
>
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <rect x="3" y="3" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="2"/>
    <rect x="13" y="3" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="2"/>
    <rect x="3" y="13" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="2"/>
    <rect x="13" y="13" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="2"/>
  </svg>
  <span>Packs</span>
</button>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/home/MobileBottomNav.tsx
git commit -m "feat: replace Categories with Packs in mobile bottom nav"
```

---

## Task 6: Rename "Purchase History" tab to "My Stash" in `MyStash.tsx`

**Files:**
- Modify: `src/pages/MyStash.tsx`

- [ ] **Step 1: Find and update the tab label**

In `src/pages/MyStash.tsx` at line 52, change:

```tsx
{ id: 'history', label: 'Purchase History', icon: <History /> },
```

to:

```tsx
{ id: 'history', label: 'My Stash', icon: <History /> },
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/MyStash.tsx
git commit -m "feat: rename Purchase History tab to My Stash"
```

---

## Task 7: Rebuild `Home.tsx` — pack-first hero layout

**Files:**
- Modify: `src/pages/Home.tsx`

This is the main visual task. The home page shows a pack-first hero for logged-out users and keeps the same layout for logged-in users (replacing the dashboard content). The existing landing page (LandingNavbar + HeroSectionOne/Two/Three) is replaced for logged-out users too — the new home IS the landing page.

- [ ] **Step 1: Replace `Home.tsx` entirely**

```tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  Stack,
  Chip,
  Paper,
} from '@mui/material';
import { useAuth } from '../hooks/useAuth';
import DashboardHeader from '../components/home/DashboardHeader';
import OnboardingModal from '../components/onboarding/OnboardingModal';

// ── Static placeholder data ──────────────────────────────────────────────────

const FEATURED_PACKS = [
  {
    id: '1',
    name: 'DC Legends Pack',
    partner: 'DC x InkStash',
    itemCount: 5,
    price: 14.99,
    legendaryOdds: '2%',
    badge: 'COLLAB' as const,
    emoji: '🦇',
  },
  {
    id: '2',
    name: 'Spider-Verse Keys',
    partner: 'InkStash House',
    itemCount: 3,
    price: 24.99,
    legendaryOdds: '5%',
    badge: 'HOT' as const,
    emoji: '🕷️',
  },
  {
    id: '3',
    name: 'Image Horror Bundle',
    partner: 'Image x InkStash',
    itemCount: 4,
    price: 19.99,
    legendaryOdds: '1%',
    badge: 'NEW' as const,
    emoji: '👻',
  },
  {
    id: '4',
    name: 'Conan Keys Pack',
    partner: 'BOOM! x InkStash',
    itemCount: 5,
    price: 0,
    legendaryOdds: '3%',
    badge: 'SOLD OUT' as const,
    emoji: '⚔️',
  },
];

const LIVE_STREAMS = [
  {
    id: '1',
    title: 'Marvel Keys Break — $15 spots',
    host: '@comicvault',
    subtitle: 'Raffle open',
    viewers: '1.2k',
    emoji: '📦',
  },
  {
    id: '2',
    title: 'Golden Age Blind Bags',
    host: '@goldenagedan',
    subtitle: 'Drops at top of hour',
    viewers: '847',
    emoji: '🎲',
  },
  {
    id: '3',
    title: 'CGC Slab Auction — Starting $50',
    host: '@slabkingPDX',
    subtitle: '3 items left',
    viewers: '2.4k',
    emoji: '🏆',
  },
];

const TRENDING = [
  { rank: 1, title: 'ASM #300 CGC 9.8', price: '$1,240' },
  { rank: 2, title: 'Spawn #1 Raw NM', price: '$89' },
  { rank: 3, title: 'X-Men #1 VF/NM', price: '$340' },
  { rank: 4, title: 'Batman #1 Facsimile', price: '$24' },
  { rank: 5, title: 'Wolverine #1 Raw VF', price: '$180' },
];

const BADGE_COLORS: Record<string, { bg: string; color: string }> = {
  COLLAB: { bg: '#f59e0b', color: '#000' },
  HOT: { bg: '#ef4444', color: '#fff' },
  NEW: { bg: '#7c3aed', color: '#fff' },
  'SOLD OUT': { bg: '#374151', color: '#9ca3af' },
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function Home() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (!loading && user && !user.onboarding_completed) {
      setShowOnboarding(true);
    } else {
      setShowOnboarding(false);
    }
  }, [user, loading]);

  return (
    <>
      <Box sx={{ minHeight: '100vh', bgcolor: '#0a0a0f' }}>
        <DashboardHeader />

        {/* ── Hero ── */}
        <Box
          sx={{
            background: 'linear-gradient(135deg, #1a0a2e 0%, #0d1b2e 50%, #0a1a0a 100%)',
            borderBottom: '1px solid rgba(168,85,247,0.15)',
            pt: { xs: 10, md: 10 },
          }}
        >
          <Container maxWidth="xl">
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                minHeight: 340,
                alignItems: 'center',
                py: 6,
                gap: 4,
              }}
            >
              {/* Left — copy */}
              <Box>
                {/* Live collab badge */}
                <Box
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 1,
                    bgcolor: 'rgba(239,68,68,0.12)',
                    border: '1px solid rgba(239,68,68,0.35)',
                    color: '#ef4444',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    px: 1.5,
                    py: 0.5,
                    borderRadius: 10,
                    mb: 2,
                  }}
                >
                  <Box
                    sx={{
                      width: 7,
                      height: 7,
                      bgcolor: '#ef4444',
                      borderRadius: '50%',
                      '@keyframes livePulse': {
                        '0%,100%': { opacity: 1 },
                        '50%': { opacity: 0.35 },
                      },
                      animation: 'livePulse 1.5s infinite',
                    }}
                  />
                  Marvel x InkStash — Limited Drop Live Now
                </Box>

                <Typography
                  variant="h2"
                  fontWeight={900}
                  sx={{
                    color: '#fff',
                    lineHeight: 1.05,
                    fontSize: { xs: '2rem', md: '2.8rem' },
                    mb: 1.5,
                  }}
                >
                  Rip packs.{' '}
                  <Box component="span" sx={{ color: '#a855f7' }}>
                    Chase keys.
                  </Box>
                  <br />
                  Go live.
                </Typography>

                <Typography
                  sx={{
                    color: 'rgba(255,255,255,0.55)',
                    fontSize: '0.95rem',
                    lineHeight: 1.65,
                    mb: 3,
                    maxWidth: 420,
                  }}
                >
                  The only platform built for comic collectors. Open blind bags,
                  watch live breaks, bid on slabs, and hunt grails — all in one place.
                </Typography>

                <Stack direction="row" spacing={1.5} flexWrap="wrap" gap={1.5}>
                  <Button
                    variant="contained"
                    onClick={() => navigate('/packs')}
                    sx={{
                      background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
                      color: '#fff',
                      fontWeight: 700,
                      px: 3,
                      py: 1.5,
                      borderRadius: 2,
                      textTransform: 'none',
                      fontSize: '0.95rem',
                      boxShadow: '0 4px 14px rgba(124,58,237,0.4)',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #6d28d9, #9333ea)',
                      },
                    }}
                  >
                    Open a Pack — $9.99
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => navigate('/live')}
                    sx={{
                      bgcolor: 'rgba(239,68,68,0.1)',
                      borderColor: 'rgba(239,68,68,0.45)',
                      color: '#ef4444',
                      fontWeight: 700,
                      px: 3,
                      py: 1.5,
                      borderRadius: 2,
                      textTransform: 'none',
                      fontSize: '0.95rem',
                      '&:hover': {
                        bgcolor: 'rgba(239,68,68,0.18)',
                        borderColor: '#ef4444',
                      },
                    }}
                  >
                    Watch Live Breaks
                  </Button>
                </Stack>
              </Box>

              {/* Right — pack reveal preview */}
              <Box
                sx={{
                  display: { xs: 'none', md: 'flex' },
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 1,
                    maxWidth: 300,
                    width: '100%',
                  }}
                >
                  {/* Revealed legendary */}
                  <Box sx={packCardSx({ revealed: true, legendary: true })}>
                    <Chip label="LEGENDARY" size="small" sx={{ position: 'absolute', top: 4, right: 4, fontSize: '0.5rem', height: 18, bgcolor: '#f59e0b', color: '#000', fontWeight: 800 }} />
                    <Typography fontSize="1.8rem" mb={0.5}>🏆</Typography>
                    <Typography fontSize="0.55rem" textAlign="center" px={0.5} color="#ccc" fontWeight={500}>ASM #300 CGC 9.8</Typography>
                  </Box>
                  {/* Revealed rare */}
                  <Box sx={packCardSx({ revealed: true })}>
                    <Chip label="RARE" size="small" sx={{ position: 'absolute', top: 4, right: 4, fontSize: '0.5rem', height: 18, bgcolor: '#7c3aed', color: '#fff', fontWeight: 800 }} />
                    <Typography fontSize="1.8rem" mb={0.5}>📖</Typography>
                    <Typography fontSize="0.55rem" textAlign="center" px={0.5} color="#ccc" fontWeight={500}>Spawn #1 Raw NM</Typography>
                  </Box>
                  {/* Revealed common */}
                  <Box sx={packCardSx({ revealed: true })}>
                    <Chip label="COMMON" size="small" sx={{ position: 'absolute', top: 4, right: 4, fontSize: '0.5rem', height: 18, bgcolor: '#374151', color: '#9ca3af', fontWeight: 800 }} />
                    <Typography fontSize="1.8rem" mb={0.5}>📚</Typography>
                    <Typography fontSize="0.55rem" textAlign="center" px={0.5} color="#ccc" fontWeight={500}>X-Men #1 VF</Typography>
                  </Box>
                  {/* Locked x3 */}
                  {[0, 1, 2].map((i) => (
                    <Box key={i} sx={packCardSx({ revealed: false })}>
                      <Typography fontSize="1.5rem" sx={{ opacity: 0.35 }}>🔒</Typography>
                      <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, bgcolor: 'rgba(0,0,0,0.65)', py: 0.5, fontSize: '0.6rem', fontWeight: 700, color: '#10b981', textAlign: 'center' }}>
                        $9.99
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Box>
            </Box>
          </Container>

          {/* Drop countdown banner */}
          <Box
            sx={{
              background: 'linear-gradient(90deg, rgba(245,158,11,0.08), rgba(239,68,68,0.08))',
              borderTop: '1px solid rgba(245,158,11,0.18)',
              px: { xs: 2, md: 4 },
              py: 1.25,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 1,
            }}
          >
            <Typography sx={{ color: '#f59e0b', fontWeight: 600, fontSize: '0.82rem' }}>
              ⚡ Next Drop: Image Comics x InkStash "Spawn Origins Pack" — Dropping in
            </Typography>
            <Stack direction="row" spacing={0.75} alignItems="center">
              {['02h', '34m', '11s'].map((t) => (
                <Box
                  key={t}
                  sx={{
                    bgcolor: 'rgba(245,158,11,0.12)',
                    border: '1px solid rgba(245,158,11,0.25)',
                    borderRadius: 1,
                    px: 1,
                    py: 0.4,
                    fontWeight: 800,
                    fontSize: '0.8rem',
                    color: '#fcd34d',
                  }}
                >
                  {t}
                </Box>
              ))}
              <Button
                size="small"
                onClick={() => navigate('/drops')}
                sx={{
                  bgcolor: '#10b981',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  px: 1.5,
                  py: 0.5,
                  borderRadius: 1,
                  textTransform: 'none',
                  '&:hover': { bgcolor: '#059669' },
                  ml: 0.5,
                }}
              >
                Notify Me
              </Button>
            </Stack>
          </Box>
        </Box>

        {/* ── Main content ── */}
        <Container maxWidth="xl" sx={{ py: 5 }}>

          {/* Open Now — pack grid */}
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6" fontWeight={800} color="#fff">🎲 Open Now</Typography>
            <Typography
              component="span"
              onClick={() => navigate('/packs')}
              sx={{ fontSize: '0.82rem', color: '#7c3aed', cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
            >
              See all packs →
            </Typography>
          </Stack>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' },
              gap: 2,
              mb: 5,
            }}
          >
            {FEATURED_PACKS.map((pack) => {
              const badgeStyle = BADGE_COLORS[pack.badge];
              return (
                <Card
                  key={pack.id}
                  onClick={() => navigate('/packs')}
                  sx={{
                    background: 'linear-gradient(135deg, #1a1030, #0d1525)',
                    border: '1px solid rgba(168,85,247,0.2)',
                    borderRadius: 3,
                    cursor: 'pointer',
                    transition: 'transform 0.15s',
                    '&:hover': { transform: 'translateY(-3px)', boxShadow: '0 8px 24px rgba(124,58,237,0.2)' },
                  }}
                >
                  <Box
                    sx={{
                      height: 140,
                      background: 'linear-gradient(135deg, #2d1060, #1a2845)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '2.5rem',
                      position: 'relative',
                    }}
                  >
                    {pack.emoji}
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 8,
                        left: 8,
                        px: 1,
                        py: 0.3,
                        borderRadius: 1,
                        fontSize: '0.62rem',
                        fontWeight: 800,
                        bgcolor: badgeStyle.bg,
                        color: badgeStyle.color,
                      }}
                    >
                      {pack.badge}
                    </Box>
                  </Box>
                  <CardContent sx={{ p: 1.5 }}>
                    <Typography fontWeight={700} fontSize="0.85rem" color="#fff" gutterBottom noWrap>
                      {pack.name}
                    </Typography>
                    <Typography fontSize="0.72rem" color="rgba(255,255,255,0.45)" mb={1}>
                      {pack.partner} • {pack.itemCount} comics
                    </Typography>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography fontWeight={800} fontSize="0.9rem" color="#10b981">
                        {pack.badge === 'SOLD OUT' ? '—' : `$${pack.price.toFixed(2)}`}
                      </Typography>
                      <Typography fontSize="0.65rem" color="rgba(255,255,255,0.3)">
                        Legendary {pack.legendaryOdds}
                      </Typography>
                    </Stack>
                  </CardContent>
                </Card>
              );
            })}
          </Box>

          {/* Live Breaks */}
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6" fontWeight={800} color="#fff">🔴 Live Breaks</Typography>
            <Typography
              component="span"
              onClick={() => navigate('/live')}
              sx={{ fontSize: '0.82rem', color: '#7c3aed', cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
            >
              See all streams →
            </Typography>
          </Stack>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
              gap: 2,
              mb: 5,
            }}
          >
            {LIVE_STREAMS.map((stream) => (
              <Card
                key={stream.id}
                onClick={() => navigate('/live')}
                sx={{
                  bgcolor: '#111',
                  border: '1px solid #1e1e1e',
                  borderRadius: 3,
                  cursor: 'pointer',
                  overflow: 'hidden',
                  '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 6px 20px rgba(0,0,0,0.4)' },
                  transition: 'transform 0.15s',
                }}
              >
                <Box
                  sx={{
                    height: 120,
                    background: 'linear-gradient(135deg, #1a0030, #002030)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '2rem',
                    position: 'relative',
                  }}
                >
                  {stream.emoji}
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 8,
                      left: 8,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                      bgcolor: '#ef4444',
                      color: '#fff',
                      fontSize: '0.62rem',
                      fontWeight: 800,
                      px: 1,
                      py: 0.3,
                      borderRadius: 1,
                    }}
                  >
                    <Box sx={{ width: 6, height: 6, bgcolor: '#fff', borderRadius: '50%', '@keyframes livePulse': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.35 } }, animation: 'livePulse 1.5s infinite' }} />
                    LIVE
                  </Box>
                  <Box sx={{ position: 'absolute', bottom: 8, right: 8, bgcolor: 'rgba(0,0,0,0.65)', color: '#fff', fontSize: '0.62rem', px: 0.75, py: 0.25, borderRadius: 0.75 }}>
                    {stream.viewers} watching
                  </Box>
                </Box>
                <CardContent sx={{ p: 1.5 }}>
                  <Typography fontWeight={700} fontSize="0.82rem" color="#fff" gutterBottom noWrap>
                    {stream.title}
                  </Typography>
                  <Typography fontSize="0.7rem" color="rgba(255,255,255,0.4)">
                    {stream.host} • {stream.subtitle}
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </Box>

          {/* Trending */}
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6" fontWeight={800} color="#fff">📈 Trending This Week</Typography>
            <Typography
              component="span"
              onClick={() => navigate('/marketplace')}
              sx={{ fontSize: '0.82rem', color: '#7c3aed', cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
            >
              View marketplace →
            </Typography>
          </Stack>

          <Paper
            sx={{
              bgcolor: '#111',
              border: '1px solid #1e1e1e',
              borderRadius: 3,
              overflow: 'hidden',
              mb: 5,
            }}
          >
            {TRENDING.map((item, idx) => (
              <Stack
                key={item.rank}
                direction="row"
                alignItems="center"
                spacing={2}
                sx={{
                  px: 2.5,
                  py: 1.5,
                  borderBottom: idx < TRENDING.length - 1 ? '1px solid #1a1a1a' : 'none',
                  cursor: 'pointer',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.03)' },
                }}
                onClick={() => navigate('/marketplace')}
              >
                <Typography fontWeight={800} fontSize="0.75rem" color="rgba(255,255,255,0.2)" sx={{ minWidth: 20 }}>
                  {item.rank}
                </Typography>
                <Typography fontWeight={600} fontSize="0.85rem" color="#fff" flex={1}>
                  {item.title}
                </Typography>
                <Typography fontWeight={700} fontSize="0.82rem" color="#10b981">
                  {item.price}
                </Typography>
              </Stack>
            ))}
          </Paper>

        </Container>
      </Box>

      {/* Onboarding Modal */}
      <OnboardingModal
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
      />
    </>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function packCardSx({ revealed, legendary }: { revealed: boolean; legendary?: boolean }) {
  return {
    background: legendary
      ? 'linear-gradient(135deg, #3d2000, #1a1200)'
      : revealed
      ? 'linear-gradient(135deg, #2d1060, #1a2845)'
      : 'linear-gradient(135deg, #1e1035, #0d1525)',
    border: `1px solid ${legendary ? '#f59e0b' : revealed ? 'rgba(168,85,247,0.7)' : 'rgba(168,85,247,0.25)'}`,
    borderRadius: 2,
    aspectRatio: '0.7',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    cursor: 'pointer',
  } as const;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -30
```
Expected: No errors.

- [ ] **Step 3: Start dev server and visually verify the home page**

```bash
npm run dev
```

Open `http://localhost:5173` and confirm:
- Dark background (`#0a0a0f`) renders
- Hero section shows tagline, two CTAs, and pack preview cards
- Drop countdown banner appears below hero
- "Open Now" 4-pack grid renders
- "Live Breaks" 3-stream grid renders
- "Trending" list renders
- All nav tabs are clickable (Packs/Live/Marketplace/Drops/Raffles in header)
- Mobile bottom nav shows Packs tab instead of Categories
- MyStash tab shows "My Stash" label

- [ ] **Step 4: Commit**

```bash
git add src/pages/Home.tsx
git commit -m "feat: rebuild Home.tsx with pack-first hero, drop banner, Open Now grid, Live Breaks, Trending"
```

---

## Task 8: Final smoke test and cleanup

- [ ] **Step 1: Verify old routes redirect correctly**

With dev server running, navigate to:
- `http://localhost:5173/browse-featured` → should redirect to `/packs`
- `http://localhost:5173/featured-artists` → should redirect to `/packs`
- `http://localhost:5173/popular-shows` → should redirect to `/packs`
- `http://localhost:5173/browse` → should redirect to `/packs`

- [ ] **Step 2: Verify new stub pages load without errors**

Navigate to:
- `http://localhost:5173/packs` → "Packs" heading, no crashes
- `http://localhost:5173/live` → "Live Breaks" heading
- `http://localhost:5173/drops` → "Drops" heading
- `http://localhost:5173/raffles` → "Raffles" heading
- `http://localhost:5173/marketplace` → "Marketplace" heading

- [ ] **Step 3: Verify TypeScript clean**

```bash
npx tsc --noEmit 2>&1
```
Expected: No output (zero errors).

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: phase 1 complete — comic-niche home page, nav restructure, stub pages"
```
