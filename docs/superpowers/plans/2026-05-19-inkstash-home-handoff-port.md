# Inkstash Home — Handoff Port Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the Inkstash homepage design handoff (`/tmp/design_handoff_homepage/`) into our React/MUI codebase at high fidelity — sidebar-pinned-left app shell, Big Shoulders Display + Geist fonts, crimson `#A1232C` palette, CSS-drawn pack envelopes, six homepage sections matching the handoff spec exactly.

**Architecture:** A new app shell (`AppShell` + `AppSidebar` + `AppTopnav`) replaces our existing `DashboardLayout` for the home page only. The 20 other pages still using `DashboardHeader` are out of scope. New design tokens (`inkstashTokens.ts`) coexist with the existing `conceptCTokens.ts` until everything is migrated. Static seed data lives in `src/data/handoffSeed.ts` — no Supabase wiring yet. Visual sections are built component-per-section; existing `LiveBreaksRow` and `TrendingList` get a token swap + visual refinement rather than a rewrite.

**Tech Stack:** React 19, TypeScript, MUI v5 `Box` + `sx`, react-router-dom v7, lucide-react icons, vanilla CSS keyframes via inline `<style>` blocks. Fonts loaded via Google Fonts `<link>` in `index.html`. No new npm dependencies.

---

## File Structure

**New files**

- `src/theme/inkstashTokens.ts` — design tokens (palette, radii, shadows, fonts, layout)
- `src/components/layout/AppShell.tsx` — wrapper composing sidebar + topnav + main
- `src/components/layout/AppSidebar.tsx` — 240px-wide left sidebar with logo, nav, publishers, promo card, user footer, collapse
- `src/components/layout/AppTopnav.tsx` — 64px sticky top nav over main column with search, bell, cart, auth buttons
- `src/components/layout/appSidebarConfig.ts` — primary nav items definition
- `src/components/home/PackVisual.tsx` — CSS-drawn pack envelope (gradient + publisher + title + seal + foot)
- `src/components/home/PackCard.tsx` — modern pack card (PackVisual thumb + publisher row + rarity dots + title + price)
- `src/components/home/RarityDots.tsx` — 6-dot rarity indicator
- `src/components/home/HomeHero.tsx` — hero section (eyebrow + headline + lede + CTAs + stats + pack stage + carousel dots)
- `src/components/home/PickAPackSection.tsx` — section head with tabs + horizontal scroll-snap row of PackCards
- `src/components/home/PublisherScroller.tsx` — horizontal scroller of publisher cards
- `src/components/home/PublisherCard.tsx` — single publisher card (swatch + name + tag/count + chevron)
- `src/components/home/Discover3Up.tsx` — 3-up Discover grid with themed SVG illustrations
- `src/data/handoffSeed.ts` — TS port of `/tmp/design_handoff_homepage/data.js`

**Files to modify**

- `index.html` — add Google Fonts `<link>` for Big Shoulders Display, Geist, Geist Mono
- `src/components/home/LiveBreaksRow.tsx` — refactor to match the handoff spec (live-pill positioning, watcher count pill, pack-name overlay, gradient overlay, host avatar)
- `src/components/home/TrendingList.tsx` — token swap (`colors` → `inkstashColors`), price typography in Big Shoulders Display, hover row bg
- `src/pages/Home.tsx` — replace `<DashboardLayout>` + Concept C sections with `<AppShell>` + handoff sections

**Files NOT touched**

- `src/components/home/DashboardHeader.tsx` (still used by 20 pages)
- `src/components/home/HomeFooter.tsx` (already fine)
- `src/components/home/JustPulledGrid.tsx` (no longer rendered from Home but file stays, can delete in cleanup)
- `src/components/home/HeroCarousel.tsx`, `src/components/home/DiscoverRow.tsx` (replaced by new components — files stay for now, no callers after Task 13)
- `src/theme/conceptCTokens.ts` (still consumed by `JustPulledGrid` / `DiscoverRow` / `HeroCarousel` which we keep on disk)

---

### Task 1: Add Google Fonts

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Read current `<head>` content**

Run: `head -25 index.html`

Note the existing `<link>` tags so the new one doesn't conflict.

- [ ] **Step 2: Add the fonts link**

Insert this `<link>` tag inside `<head>`, after any existing `<link rel="preconnect">` tags (or after `<title>` if none exist):

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@600;700;800;900&family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500;600&display=swap" rel="stylesheet">
```

If the existing `<link>` already loads other Google Fonts (Outfit, DM Mono), keep that line — add the new families to the existing link by appending `&family=Big+Shoulders+Display:wght@600;700;800;900&family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500;600` to the existing href instead of adding a new `<link>`.

- [ ] **Step 3: Verify in browser**

Run: `npm run dev` in one terminal. In another:

```bash
B="$HOME/.claude/skills/gstack/browse/dist/browse"
$B goto http://localhost:5173
$B js "getComputedStyle(document.createElement('div').appendChild(Object.assign(document.body.appendChild(document.createElement('div')), {style: \"font-family: 'Big Shoulders Display'\"}))).fontFamily"
```

Expected: includes `"Big Shoulders Display"`. If the response is just the fallback `sans-serif`, the font didn't load.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat(fonts): load Big Shoulders Display + Geist + Geist Mono"
```

---

### Task 2: Inkstash design tokens module

**Files:**
- Create: `src/theme/inkstashTokens.ts`

- [ ] **Step 1: Create the tokens file**

```ts
// src/theme/inkstashTokens.ts
export const inkstashColors = {
  bg:           '#FAF7F2',
  bgElev:       '#FFFFFF',
  bgSunken:     '#F2EDE5',
  ink:          '#16110E',
  ink2:         '#3A302A',
  muted:        '#8A7F73',
  muted2:       '#C5BBAE',
  border:       '#E8DFD2',
  borderStrong: '#D6CABA',
  brand:        '#A1232C',
  brandDeep:    '#7A1A21',
  brandSoft:    '#FCEAEB',
  gold:         '#B8893A',
  goldSoft:     '#F7EFDC',
  live:         '#DC2626',
} as const;

export const rarityColors = {
  common:   '#8A7F73',
  uncommon: '#2E6F4F',
  rare:     '#2A4D8A',
  epic:     '#6B3A8A',
  mythic:   '#A1232C',
  grail:    '#B8893A',
} as const;

export const inkstashRadii = {
  sm: '6px',
  md: '10px',
  lg: '16px',
  xl: '22px',
} as const;

export const inkstashShadows = {
  xs: '0 1px 0 rgba(22,17,14,0.04)',
  sm: '0 1px 2px rgba(22,17,14,0.06), 0 1px 0 rgba(22,17,14,0.03)',
  md: '0 8px 24px -8px rgba(22,17,14,0.10), 0 2px 4px rgba(22,17,14,0.04)',
  lg: '0 24px 48px -16px rgba(22,17,14,0.18), 0 8px 16px -8px rgba(22,17,14,0.08)',
} as const;

export const inkstashFonts = {
  display: "'Big Shoulders Display', system-ui, sans-serif",
  ui:      "'Geist', system-ui, sans-serif",
  mono:    "'Geist Mono', ui-monospace, monospace",
} as const;

export const inkstashLayout = {
  sidebarWidth:          240,
  sidebarWidthCollapsed: 68,
  topnavHeight:          64,
  mainPaddingX:          28,
  mainPaddingTop:        24,
  mainPaddingBottom:     56,
  mainPaddingXMobile:    14,
  contentMaxWidth:       1280,
} as const;
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/theme/inkstashTokens.ts
git commit -m "feat(theme): add Inkstash design tokens (crimson palette, Big Shoulders, Geist)"
```

---

### Task 3: Handoff seed data

**Files:**
- Create: `src/data/handoffSeed.ts`

- [ ] **Step 1: Create the seed data file**

```ts
// src/data/handoffSeed.ts
// Static seed data ported from the Inkstash design handoff (data.js).
// Fictional packs and publishers — replace with Supabase queries when ready.

export interface Publisher {
  id: string;
  name: string;
  tag: string;
  count: number;
  gradient: [string, string];
}

export interface Pack {
  id: string;
  title: string;
  publisher: string;
  category: 'variant' | 'firstissues' | 'graded' | 'indie';
  price: number;
  cards: number;
  gradient: [string, string];
  seal: string;
  footLabel: string;
  cardCount: number;
  hot?: boolean;
  premium?: boolean;
}

export interface LiveBreak {
  id: string;
  host: string;
  title: string;
  viewers: number;
  gradient: [string, string];
  live: boolean;
  packLabel: string;
}

export interface TrendingItem {
  rank: number;
  title: string;
  bids: number;
  seller: string;
  price: number;
}

export interface DiscoverCard {
  id: 'app' | 'vault' | 'idea';
  title: string;
  sub: string;
  art: 'phone' | 'vault' | 'idea';
}

export const PUBLISHERS: Publisher[] = [
  { id: 'thunder',   name: 'Thunder Comics',  tag: 'Major', count: 84, gradient: ['#C2362F', '#5C1116'] },
  { id: 'meridian',  name: 'Meridian Press',  tag: 'Major', count: 67, gradient: ['#1F3A6E', '#0E1D3E'] },
  { id: 'pulpworks', name: 'Pulpworks',       tag: 'Indie', count: 41, gradient: ['#1A1A1A', '#000000'] },
  { id: 'longshot',  name: 'Longshot Studio', tag: 'Indie', count: 28, gradient: ['#3F6F4A', '#1B3024'] },
];

export const PACKS: Pack[] = [
  { id: 'p1', title: 'Variant Vault: Vol. 7',  publisher: 'thunder',   category: 'variant',     price: 29,  cards: 4, gradient: ['#C2362F', '#5C1116'], seal: 'TC', footLabel: 'Series VII · Sealed',     cardCount: 1240, hot: true },
  { id: 'p2', title: 'Crimson Wave #1s',       publisher: 'thunder',   category: 'firstissues', price: 89,  cards: 3, gradient: ['#7A1A21', '#2E0A0D'], seal: '#1', footLabel: 'Debut Issues · Vol. III', cardCount: 412 },
  { id: 'p3', title: 'Indigo Files',           publisher: 'meridian',  category: 'variant',     price: 45,  cards: 4, gradient: ['#1F3A6E', '#0E1D3E'], seal: 'M',  footLabel: 'Meridian Variants',       cardCount: 880 },
  { id: 'p4', title: 'Slab Heat: Modern',      publisher: 'thunder',   category: 'graded',      price: 249, cards: 2, gradient: ['#1A1A1A', '#000000'], seal: '10', footLabel: 'Graded · PSA / CGC',       cardCount: 96,  premium: true },
  { id: 'p5', title: 'Pulpworks Drop 03',      publisher: 'pulpworks', category: 'indie',       price: 18,  cards: 5, gradient: ['#1A1A1A', '#000000'], seal: 'P',  footLabel: 'Small Press · 2024',       cardCount: 540 },
  { id: 'p6', title: 'Longshot Sketch',        publisher: 'longshot',  category: 'indie',       price: 12,  cards: 6, gradient: ['#3F6F4A', '#1B3024'], seal: 'L',  footLabel: 'Sketch Edition',           cardCount: 320 },
  { id: 'p7', title: 'Holographic Heroes',     publisher: 'meridian',  category: 'variant',     price: 65,  cards: 4, gradient: ['#5B3DB8', '#2A1A5C'], seal: 'H',  footLabel: 'Foil Variant Box',         cardCount: 624 },
  { id: 'p8', title: 'Grail Hunter Pro',       publisher: 'thunder',   category: 'graded',      price: 499, cards: 1, gradient: ['#B8893A', '#5C3F0F'], seal: 'AU', footLabel: 'Premium Slab · 1 Card',    cardCount: 24,  premium: true },
];

export const LIVE_BREAKS: LiveBreak[] = [
  { id: 'lb1', host: 'collector.miko', title: 'Grail Hunter Pro — $499 pack attempt',  viewers: 521, gradient: ['#1F3A6E', '#0E1D3E'], live: true, packLabel: 'Grail Hunter Pro' },
  { id: 'lb2', host: 'panelfan',       title: 'Sunday Silver Age Showcase',            viewers: 312, gradient: ['#C2362F', '#5C1116'], live: true, packLabel: 'Crimson Wave #1s' },
  { id: 'lb3', host: 'slabhound',      title: 'Modern Slab Marathon — 30 pack rip',    viewers: 201, gradient: ['#1A1A1A', '#3A3A3A'], live: true, packLabel: 'Slab Heat: Modern' },
  { id: 'lb4', host: 'inkstain.tv',    title: 'Indie Press Hour ft. Longshot Studio',  viewers: 88,  gradient: ['#B8893A', '#5C3F0F'], live: true, packLabel: 'Pulpworks Drop 03' },
];

export const TRENDING_WEEK: TrendingItem[] = [
  { rank: 1, title: 'Static Knight #1 — First Print Edition (CGC 9.8)',   bids: 12, seller: '@collector.miko', price: 4800 },
  { rank: 2, title: 'Wraithline #11 — Inkwell Variant (CGC 9.6)',          bids: 11, seller: '@slabhound',       price: 4200 },
  { rank: 3, title: 'Calliope #1 — Original Cover signed (CBCS 9.4)',      bids: 11, seller: '@foiledagain',     price: 2400 },
  { rank: 4, title: 'Hollow Crown #4 — Foil Pulpworks Variant (CGC 9.8)',  bids: 9,  seller: '@panelfan',        price: 1240 },
  { rank: 5, title: 'Brass Lantern #2 — Sketch Edition (CGC 9.6)',         bids: 9,  seller: '@inkstain',        price: 620  },
  { rank: 6, title: 'Iron Tabula Vol. 3 #2 — Signed Print Run (CBCS 9.4)', bids: 7,  seller: '@thunderboy.04',   price: 330  },
];

export const DISCOVER: DiscoverCard[] = [
  { id: 'app',   title: 'Get the app',     sub: 'Rip packs and watch breaks from anywhere. iOS & Android.',                         art: 'phone' },
  { id: 'vault', title: "Vault, don't ship", sub: 'Store slabs directly from CGC, CBCS, and eBay. Trade without touching them.',     art: 'vault' },
  { id: 'idea',  title: 'Got an idea?',    sub: 'We build what collectors actually want. Tell us what to ship next.',               art: 'idea'  },
];
```

- [ ] **Step 2: Verify TypeScript**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/data/handoffSeed.ts
git commit -m "feat(data): add Inkstash handoff seed data (publishers, packs, breaks, trending)"
```

---

### Task 4: App sidebar nav config

**Files:**
- Create: `src/components/layout/appSidebarConfig.ts`

- [ ] **Step 1: Create the config**

```ts
// src/components/layout/appSidebarConfig.ts
import { Home, Package, Store, Repeat, Archive, Trophy } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface AppSidebarItem {
  label: string;
  route: string;
  icon: LucideIcon;
}

export const appSidebarPrimary: AppSidebarItem[] = [
  { label: 'Home',         route: '/',            icon: Home },
  { label: 'Packs',        route: '/packs',       icon: Package },
  { label: 'Marketplace',  route: '/marketplace', icon: Store },
  { label: 'Live Breaks',  route: '/live',        icon: Repeat },
  { label: 'My Vault',     route: '/my-stash',    icon: Archive },
  { label: 'Leaderboard',  route: '/leaderboard', icon: Trophy },
];
```

- [ ] **Step 2: Verify TypeScript**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/appSidebarConfig.ts
git commit -m "feat(layout): add Inkstash sidebar nav config"
```

---

### Task 5: AppSidebar — full-height left sidebar

**Files:**
- Create: `src/components/layout/AppSidebar.tsx`

- [ ] **Step 1: Create the file**

```tsx
// src/components/layout/AppSidebar.tsx
import { NavLink, useNavigate } from 'react-router-dom';
import { Box } from '@mui/material';
import { ChevronRight, PanelLeftClose } from 'lucide-react';
import { appSidebarPrimary } from './appSidebarConfig';
import { PUBLISHERS } from '../../data/handoffSeed';
import { inkstashColors, inkstashFonts, inkstashLayout, inkstashShadows } from '../../theme/inkstashTokens';

interface AppSidebarProps {
  collapsed: boolean;
  mobileOpen: boolean;
  onCollapseToggle: () => void;
  onMobileClose: () => void;
}

export default function AppSidebar({ collapsed, mobileOpen, onCollapseToggle, onMobileClose }: AppSidebarProps) {
  const navigate = useNavigate();
  const width = collapsed ? inkstashLayout.sidebarWidthCollapsed : inkstashLayout.sidebarWidth;

  return (
    <Box
      component="aside"
      sx={{
        position: 'fixed',
        top: 0, left: 0, bottom: 0,
        width,
        bgcolor: inkstashColors.bgElev,
        borderRight: `1px solid ${inkstashColors.border}`,
        display: 'flex',
        flexDirection: 'column',
        zIndex: 1100,
        fontFamily: inkstashFonts.ui,
        transition: 'width 200ms ease, transform 200ms ease',
        transform: {
          xs: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
          md: 'translateX(0)',
        },
        boxShadow: { xs: mobileOpen ? inkstashShadows.lg : 'none', md: 'none' },
      }}
    >
      {/* Logo cell */}
      <Box sx={{
        height: inkstashLayout.topnavHeight,
        display: 'flex', alignItems: 'center', gap: 1.2,
        padding: collapsed ? '0' : '0 18px',
        justifyContent: collapsed ? 'center' : 'flex-start',
        borderBottom: `1px solid ${inkstashColors.border}`,
        cursor: 'pointer',
      }} onClick={() => navigate('/')}>
        <svg width={30} height={30} viewBox="0 0 40 40" fill="none">
          <circle cx={20} cy={20} r={18} fill={inkstashColors.ink} />
          <path d="M20 10L25 15L20 20L15 15L20 10Z" fill={inkstashColors.brand} />
          <path d="M20 20L25 25L20 30L15 25L20 20Z" fill={inkstashColors.brand} opacity={0.65} />
        </svg>
        {!collapsed && (
          <Box component="span" sx={{
            fontFamily: inkstashFonts.display,
            fontWeight: 900, fontSize: '20px',
            color: inkstashColors.ink,
            textTransform: 'lowercase',
            letterSpacing: '-0.01em',
          }}>
            inkstash<Box component="span" sx={{ color: inkstashColors.brand }}>.</Box>
          </Box>
        )}
      </Box>

      {/* Nav */}
      <Box sx={{ flex: 1, overflowY: 'auto', padding: collapsed ? '12px 8px' : '14px 12px' }}>
        {appSidebarPrimary.map(item => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.route}
              to={item.route}
              end={item.route === '/'}
              onClick={onMobileClose}
              style={({ isActive }) => ({
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: collapsed ? '10px 0' : '10px 12px',
                justifyContent: collapsed ? 'center' : 'flex-start',
                borderRadius: 8,
                color: isActive ? inkstashColors.ink : inkstashColors.ink2,
                background: isActive ? inkstashColors.bgSunken : 'transparent',
                fontSize: 14,
                fontWeight: isActive ? 600 : 500,
                marginBottom: 2,
                transition: 'background 140ms ease, color 140ms ease',
              })}
            >
              <Icon size={18} />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          );
        })}

        {!collapsed && (
          <Box sx={{
            mt: 2.5, mb: 1, mx: 1.5,
            fontFamily: inkstashFonts.mono,
            fontSize: '10.5px',
            color: inkstashColors.muted,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            fontWeight: 600,
          }}>
            Publishers
          </Box>
        )}
        {PUBLISHERS.map(pub => (
          <Box
            key={pub.id}
            onClick={() => navigate('/marketplace')}
            sx={{
              display: 'flex', alignItems: 'center', gap: 1.5,
              padding: collapsed ? '8px 0' : '8px 12px',
              justifyContent: collapsed ? 'center' : 'flex-start',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 13,
              color: inkstashColors.ink2,
              transition: 'background 140ms ease',
              '&:hover': { background: inkstashColors.bgSunken },
            }}
          >
            <Box sx={{
              width: 18, height: 18, borderRadius: '4px',
              background: `linear-gradient(135deg, ${pub.gradient[0]}, ${pub.gradient[1]})`,
              flexShrink: 0,
            }} />
            {!collapsed && (
              <>
                <Box component="span" sx={{ flex: 1 }}>{pub.name}</Box>
                <Box component="span" sx={{
                  fontFamily: inkstashFonts.mono, fontSize: 11, color: inkstashColors.muted2,
                }}>{pub.count}</Box>
              </>
            )}
          </Box>
        ))}

        {!collapsed && (
          <Box sx={{
            mt: 3, padding: 2,
            background: `linear-gradient(135deg, ${inkstashColors.brandSoft}, ${inkstashColors.bgSunken})`,
            border: `1px solid ${inkstashColors.border}`,
            borderRadius: 2,
          }}>
            <Box sx={{
              fontFamily: inkstashFonts.display, fontWeight: 900, fontSize: 18,
              textTransform: 'uppercase', lineHeight: 1, mb: 0.75, color: inkstashColors.ink,
            }}>
              List your<br />collection
            </Box>
            <Box sx={{ fontSize: 12, color: inkstashColors.muted, mb: 1.5 }}>
              Vault &amp; sell graded slabs.
            </Box>
            <Box
              component="button"
              type="button"
              onClick={() => navigate('/list-item')}
              sx={{
                width: '100%',
                bgcolor: inkstashColors.ink, color: '#fff', border: 'none',
                padding: '8px 12px', borderRadius: 1.5,
                fontFamily: inkstashFonts.ui, fontWeight: 600, fontSize: 12,
                cursor: 'pointer',
                '&:hover': { bgcolor: inkstashColors.ink2 },
                '&:active': { transform: 'scale(0.97)' },
              }}
            >
              Get started
            </Box>
          </Box>
        )}
      </Box>

      {/* User footer */}
      <Box sx={{
        borderTop: `1px solid ${inkstashColors.border}`,
        padding: collapsed ? '12px 8px' : '12px 14px',
        display: 'flex', alignItems: 'center', gap: 1.25,
      }}>
        <Box sx={{
          width: 32, height: 32, borderRadius: '50%',
          background: `linear-gradient(135deg, ${inkstashColors.brand}, ${inkstashColors.brandDeep})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontFamily: inkstashFonts.display, fontWeight: 900, fontSize: 13,
          flexShrink: 0,
        }}>YO</Box>
        {!collapsed && (
          <>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Box sx={{ fontWeight: 600, fontSize: 13, color: inkstashColors.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>@you</Box>
              <Box sx={{ fontFamily: inkstashFonts.mono, fontSize: 10.5, color: inkstashColors.muted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Free tier</Box>
            </Box>
            <Box
              component="button"
              type="button"
              onClick={onCollapseToggle}
              aria-label="Collapse sidebar"
              sx={{
                bgcolor: 'transparent', border: 'none', cursor: 'pointer',
                color: inkstashColors.muted,
                padding: 0.5,
                display: 'grid', placeItems: 'center',
                '&:hover': { color: inkstashColors.ink },
              }}
            >
              <PanelLeftClose size={16} />
            </Box>
          </>
        )}
        {collapsed && (
          <Box
            component="button"
            type="button"
            onClick={onCollapseToggle}
            aria-label="Expand sidebar"
            sx={{
              position: 'absolute', bottom: 14, right: 8,
              bgcolor: 'transparent', border: 'none', cursor: 'pointer',
              color: inkstashColors.muted,
              padding: 0.5,
              display: 'grid', placeItems: 'center',
              '&:hover': { color: inkstashColors.ink },
            }}
          >
            <ChevronRight size={16} />
          </Box>
        )}
      </Box>
    </Box>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/AppSidebar.tsx
git commit -m "feat(layout): add Inkstash AppSidebar (full-height left rail with publishers + promo)"
```

---

### Task 6: AppTopnav — sticky top nav over main column

**Files:**
- Create: `src/components/layout/AppTopnav.tsx`

- [ ] **Step 1: Create the file**

```tsx
// src/components/layout/AppTopnav.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Badge } from '@mui/material';
import { Menu, Search, Bell, ShoppingCart } from 'lucide-react';
import { inkstashColors, inkstashFonts, inkstashLayout, inkstashShadows } from '../../theme/inkstashTokens';

interface AppTopnavProps {
  onOpenMobileNav: () => void;
}

export default function AppTopnav({ onOpenMobileNav }: AppTopnavProps) {
  const navigate = useNavigate();
  const [q, setQ] = useState('');

  return (
    <Box
      component="header"
      sx={{
        position: 'sticky',
        top: 0,
        height: inkstashLayout.topnavHeight,
        bgcolor: inkstashColors.bg,
        borderBottom: `1px solid ${inkstashColors.border}`,
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        padding: { xs: '0 14px', md: '0 28px' },
        zIndex: 50,
        boxShadow: inkstashShadows.xs,
        fontFamily: inkstashFonts.ui,
      }}
    >
      <Box
        component="button"
        type="button"
        aria-label="Open menu"
        onClick={onOpenMobileNav}
        sx={{
          display: { xs: 'grid', md: 'none' },
          placeItems: 'center',
          bgcolor: 'transparent', border: 'none', cursor: 'pointer',
          color: inkstashColors.ink, padding: 1,
        }}
      >
        <Menu size={20} />
      </Box>

      <Box
        component="form"
        onSubmit={(e: React.FormEvent) => e.preventDefault()}
        sx={{
          flex: 1, maxWidth: 480,
          display: 'flex', alignItems: 'center', gap: 1.25,
          bgcolor: inkstashColors.bgSunken,
          border: `1px solid ${inkstashColors.border}`,
          padding: '8px 12px',
          borderRadius: '9px',
          transition: 'border-color 140ms ease, background 140ms ease',
          '&:focus-within': { borderColor: inkstashColors.borderStrong, bgcolor: inkstashColors.bgElev },
        }}
      >
        <Search size={16} color={inkstashColors.muted} />
        <Box
          component="input"
          placeholder="Search packs, publishers…"
          value={q}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQ(e.target.value)}
          sx={{
            flex: 1, bgcolor: 'transparent', border: 'none', outline: 'none',
            color: inkstashColors.ink, fontFamily: inkstashFonts.ui, fontSize: 14,
            '&::placeholder': { color: inkstashColors.muted },
          }}
        />
        <Box component="kbd" sx={{
          display: { xs: 'none', sm: 'inline-block' },
          bgcolor: inkstashColors.bgElev, border: `1px solid ${inkstashColors.border}`,
          padding: '2px 6px', borderRadius: '5px',
          fontFamily: inkstashFonts.mono, fontSize: 10.5, color: inkstashColors.muted,
        }}>⌘K</Box>
      </Box>

      <Box sx={{ flex: 1 }} />

      <Box
        component="button"
        type="button"
        aria-label="Notifications"
        sx={{
          display: 'inline-flex', alignItems: 'center', gap: 0.75,
          bgcolor: inkstashColors.bgElev, border: `1px solid ${inkstashColors.border}`,
          padding: '7px 10px', borderRadius: 999,
          cursor: 'pointer', color: inkstashColors.ink,
          fontFamily: inkstashFonts.ui, fontSize: 13,
          '&:hover': { borderColor: inkstashColors.borderStrong },
          '&:active': { transform: 'scale(0.97)' },
        }}
      >
        <Bell size={16} />
        <Badge badgeContent={3} color="error" sx={{ '& .MuiBadge-badge': { fontSize: 10, minWidth: 16, height: 16, top: -2, right: -2 } }} />
      </Box>

      <Box
        component="button"
        type="button"
        onClick={() => navigate('/cart')}
        sx={{
          display: 'inline-flex', alignItems: 'center', gap: 0.75,
          bgcolor: inkstashColors.bgElev, border: `1px solid ${inkstashColors.border}`,
          padding: '7px 12px', borderRadius: 999,
          cursor: 'pointer', color: inkstashColors.ink,
          fontFamily: inkstashFonts.ui, fontSize: 13,
          '&:hover': { borderColor: inkstashColors.borderStrong },
          '&:active': { transform: 'scale(0.97)' },
        }}
      >
        <ShoppingCart size={16} />
        <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>Cart</Box>
      </Box>

      <Box
        component="button"
        type="button"
        sx={{
          display: { xs: 'none', md: 'inline-block' },
          bgcolor: 'transparent', border: 'none', cursor: 'pointer',
          color: inkstashColors.ink2, padding: '8px 14px',
          fontFamily: inkstashFonts.ui, fontSize: 14, fontWeight: 500,
          '&:hover': { color: inkstashColors.ink },
        }}
      >
        Log in
      </Box>

      <Box
        component="button"
        type="button"
        sx={{
          bgcolor: inkstashColors.brand, color: '#fff', border: 'none',
          padding: '8px 16px', borderRadius: 1,
          fontFamily: inkstashFonts.ui, fontSize: 14, fontWeight: 600,
          cursor: 'pointer',
          '&:hover': { bgcolor: inkstashColors.brandDeep },
          '&:active': { transform: 'scale(0.97)' },
        }}
      >
        Sign up
      </Box>
    </Box>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/AppTopnav.tsx
git commit -m "feat(layout): add Inkstash AppTopnav (sticky top nav with search, bell, cart)"
```

---

### Task 7: AppShell — compose sidebar + topnav + main

**Files:**
- Create: `src/components/layout/AppShell.tsx`

- [ ] **Step 1: Create the shell**

```tsx
// src/components/layout/AppShell.tsx
import { ReactNode, useState, useEffect, useCallback } from 'react';
import { Box } from '@mui/material';
import AppSidebar from './AppSidebar';
import AppTopnav from './AppTopnav';
import { inkstashColors, inkstashFonts, inkstashLayout } from '../../theme/inkstashTokens';

const LS_KEY = 'inkstash.sidebar.collapsed';

interface AppShellProps {
  children: ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(LS_KEY) === 'true';
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(LS_KEY, String(collapsed));
  }, [collapsed]);

  const toggleCollapse = useCallback(() => setCollapsed(c => !c), []);
  const openMobile = useCallback(() => setMobileOpen(true), []);
  const closeMobile = useCallback(() => setMobileOpen(false), []);

  const sideWidth = collapsed ? inkstashLayout.sidebarWidthCollapsed : inkstashLayout.sidebarWidth;

  return (
    <Box sx={{ minHeight: '100dvh', bgcolor: inkstashColors.bg, color: inkstashColors.ink, fontFamily: inkstashFonts.ui }}>
      <AppSidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onCollapseToggle={toggleCollapse}
        onMobileClose={closeMobile}
      />
      {mobileOpen && (
        <Box
          onClick={closeMobile}
          sx={{
            display: { xs: 'block', md: 'none' },
            position: 'fixed', inset: 0,
            bgcolor: 'rgba(22,17,14,0.4)',
            zIndex: 1099,
          }}
        />
      )}
      <Box
        sx={{
          pl: { xs: 0, md: `${sideWidth}px` },
          transition: 'padding-left 200ms ease',
          minHeight: '100dvh',
        }}
      >
        <AppTopnav onOpenMobileNav={openMobile} />
        <Box
          component="main"
          sx={{
            padding: {
              xs: `${inkstashLayout.mainPaddingTop}px ${inkstashLayout.mainPaddingXMobile}px ${inkstashLayout.mainPaddingBottom}px`,
              md: `${inkstashLayout.mainPaddingTop}px ${inkstashLayout.mainPaddingX}px ${inkstashLayout.mainPaddingBottom}px`,
            },
            maxWidth: inkstashLayout.contentMaxWidth,
            mx: 'auto',
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/AppShell.tsx
git commit -m "feat(layout): add AppShell composing sidebar + topnav + main"
```

---

### Task 8: PackVisual — CSS-drawn pack envelope

**Files:**
- Create: `src/components/home/PackVisual.tsx`

- [ ] **Step 1: Create the file**

```tsx
// src/components/home/PackVisual.tsx
import { Box } from '@mui/material';
import { inkstashColors, inkstashFonts } from '../../theme/inkstashTokens';
import { PUBLISHERS, type Pack } from '../../data/handoffSeed';

interface PackVisualProps {
  pack: Pack;
  big?: boolean;
}

export default function PackVisual({ pack, big = false }: PackVisualProps) {
  const titleParts = pack.title.split(':');
  const mainTitle = titleParts[titleParts.length - 1].trim();
  const publisher = PUBLISHERS.find(p => p.id === pack.publisher);
  const fontSize = big ? 36 : 24;

  return (
    <Box sx={{
      position: 'relative',
      width: '100%', height: '100%',
      borderRadius: '10px',
      overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
      background: `linear-gradient(180deg, ${pack.gradient[0]}, ${pack.gradient[1]})`,
      border: '1px solid rgba(0,0,0,0.2)',
      '&::before': {
        content: '""',
        position: 'absolute', inset: 0,
        background:
          'radial-gradient(120% 80% at 50% -10%, rgba(255,255,255,0.25), transparent 50%),' +
          'radial-gradient(60% 40% at 50% 110%, rgba(0,0,0,0.4), transparent 60%)',
        pointerEvents: 'none',
      },
      '&::after': {
        content: '""',
        position: 'absolute', top: '12%', left: 0, right: 0, height: '4px',
        background: 'repeating-linear-gradient(90deg, rgba(255,255,255,0.4) 0 6px, transparent 6px 10px)',
        opacity: 0.5,
      },
    }}>
      {/* Publisher */}
      <Box sx={{
        position: 'absolute', top: '10%', left: 0, right: 0,
        textAlign: 'center',
        fontFamily: inkstashFonts.display, fontWeight: 900, fontSize: 11,
        color: '#fff', letterSpacing: '0.15em', textTransform: 'uppercase',
        textShadow: '0 1px 2px rgba(0,0,0,0.4)',
        zIndex: 2,
      }}>
        {publisher?.name}
      </Box>

      {/* Title */}
      <Box sx={{
        position: 'absolute', top: '50%', left: 0, right: 0,
        transform: 'translateY(-50%)',
        textAlign: 'center',
        fontFamily: inkstashFonts.display, fontWeight: 900, fontSize,
        color: '#fff', letterSpacing: '0.01em', textTransform: 'uppercase',
        lineHeight: 0.9, textShadow: '0 2px 4px rgba(0,0,0,0.5)',
        padding: '0 12px',
        zIndex: 2,
      }}>
        {mainTitle}
      </Box>

      {/* Seal */}
      <Box sx={{
        position: 'absolute', bottom: '18%', left: '50%', transform: 'translateX(-50%)',
        width: 32, height: 32, borderRadius: '50%',
        bgcolor: inkstashColors.gold,
        border: '2px solid rgba(0,0,0,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontFamily: inkstashFonts.display, fontWeight: 900, fontSize: 12,
        zIndex: 2,
      }}>
        {pack.seal}
      </Box>

      {/* Foot label */}
      <Box sx={{
        position: 'absolute', bottom: '8%', left: 0, right: 0,
        textAlign: 'center',
        fontFamily: inkstashFonts.mono, fontSize: 9,
        color: 'rgba(255,255,255,0.8)',
        letterSpacing: '0.15em', textTransform: 'uppercase',
        zIndex: 2,
      }}>
        {pack.footLabel}
      </Box>
    </Box>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/components/home/PackVisual.tsx
git commit -m "feat(home): add PackVisual CSS-drawn pack envelope"
```

---

### Task 9: RarityDots + PackCard

**Files:**
- Create: `src/components/home/RarityDots.tsx`
- Create: `src/components/home/PackCard.tsx`

- [ ] **Step 1: Create RarityDots**

```tsx
// src/components/home/RarityDots.tsx
import { Box } from '@mui/material';
import { inkstashColors } from '../../theme/inkstashTokens';

interface RarityDotsProps {
  filled?: number;
}

export default function RarityDots({ filled = 4 }: RarityDotsProps) {
  return (
    <Box sx={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
      {Array.from({ length: 6 }, (_, i) => (
        <Box
          key={i}
          sx={{
            width: 6, height: 6, borderRadius: '50%',
            bgcolor: i < filled ? inkstashColors.brand : inkstashColors.muted2,
          }}
        />
      ))}
    </Box>
  );
}
```

- [ ] **Step 2: Create PackCard**

```tsx
// src/components/home/PackCard.tsx
import { Box } from '@mui/material';
import PackVisual from './PackVisual';
import RarityDots from './RarityDots';
import { PUBLISHERS, type Pack } from '../../data/handoffSeed';
import { inkstashColors, inkstashFonts, inkstashRadii, inkstashShadows } from '../../theme/inkstashTokens';

interface PackCardProps {
  pack: Pack;
  onClick?: () => void;
}

export default function PackCard({ pack, onClick }: PackCardProps) {
  const publisher = PUBLISHERS.find(p => p.id === pack.publisher);
  const filledDots = pack.premium ? 6 : pack.price >= 60 ? 5 : pack.price >= 30 ? 4 : 3;

  return (
    <Box
      onClick={onClick}
      sx={{
        bgcolor: inkstashColors.bgElev,
        border: `1px solid ${inkstashColors.border}`,
        borderRadius: inkstashRadii.lg,
        overflow: 'hidden',
        cursor: 'pointer',
        display: 'flex', flexDirection: 'column',
        position: 'relative',
        transition: 'transform 140ms ease, box-shadow 140ms ease, border-color 140ms ease',
        '&:hover': {
          transform: 'translateY(-3px)',
          boxShadow: inkstashShadows.md,
          borderColor: inkstashColors.borderStrong,
          '& .pv-thumb': { transform: 'rotate(-4deg) translateY(-6px) scale(1.04)' },
        },
      }}
    >
      <Box sx={{
        aspectRatio: '1 / 1',
        position: 'relative', overflow: 'hidden',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Box className="pv-thumb" sx={{
          width: '60%', height: '80%',
          transform: 'rotate(-4deg)',
          filter: 'drop-shadow(0 12px 24px rgba(22,17,14,0.25))',
          transition: 'transform 250ms ease',
        }}>
          <PackVisual pack={pack} />
        </Box>
      </Box>

      <Box sx={{ padding: '14px 14px 16px', display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 1 }}>
          <Box component="span" sx={{
            fontFamily: inkstashFonts.mono, fontSize: 10.5,
            color: inkstashColors.muted, letterSpacing: '0.08em', textTransform: 'uppercase',
          }}>{publisher?.name}</Box>
          <RarityDots filled={filledDots} />
        </Box>
        <Box sx={{
          fontFamily: inkstashFonts.display, fontWeight: 800,
          fontSize: 19, lineHeight: 1.05,
          textTransform: 'uppercase', letterSpacing: '0.005em',
          color: inkstashColors.ink,
        }}>{pack.title}</Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 0.5 }}>
          <Box sx={{
            fontFamily: inkstashFonts.display, fontWeight: 800, fontSize: 22,
            lineHeight: 1, color: inkstashColors.ink,
          }}>
            <Box component="span" sx={{
              fontFamily: inkstashFonts.ui, fontWeight: 500, fontSize: 10.5,
              color: inkstashColors.muted, textTransform: 'uppercase', marginRight: 0.5,
            }}>FROM</Box>
            ${pack.price}
          </Box>
          <Box component="span" sx={{
            fontFamily: inkstashFonts.mono, fontSize: 11,
            color: inkstashColors.muted, letterSpacing: '0.04em',
          }}>{pack.cards} cards · {pack.cardCount} left</Box>
        </Box>
      </Box>
    </Box>
  );
}
```

- [ ] **Step 3: Verify TypeScript**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/components/home/RarityDots.tsx src/components/home/PackCard.tsx
git commit -m "feat(home): add RarityDots + PackCard for Pick a Pack section"
```

---

### Task 10: HomeHero — hero section with carousel dots

**Files:**
- Create: `src/components/home/HomeHero.tsx`

- [ ] **Step 1: Create the file**

```tsx
// src/components/home/HomeHero.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box } from '@mui/material';
import PackVisual from './PackVisual';
import { PUBLISHERS, type Pack } from '../../data/handoffSeed';
import { inkstashColors, inkstashFonts, inkstashRadii, inkstashShadows } from '../../theme/inkstashTokens';

interface HomeHeroProps {
  packs: Pack[]; // expect 3 heroes (passed in order)
}

export default function HomeHero({ packs }: HomeHeroProps) {
  const navigate = useNavigate();
  const [idx, setIdx] = useState(0);
  const hero = packs[idx];
  const publisher = PUBLISHERS.find(p => p.id === hero.publisher);
  const titleSuffix = hero.title.split(':').slice(-1)[0].trim();

  return (
    <Box component="section" sx={{ mb: 4 }}>
      <Box sx={{
        position: 'relative',
        borderRadius: inkstashRadii.xl,
        overflow: 'hidden',
        background:
          `radial-gradient(900px 500px at 88% 50%, rgba(161,35,44,0.13), transparent 60%),` +
          `linear-gradient(180deg, #FFFCF6 0%, #FAF1E5 100%)`,
        border: `1px solid ${inkstashColors.border}`,
        padding: { xs: '32px 28px', md: '44px 48px' },
        minHeight: { xs: 0, md: 380 },
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: '1.1fr 1fr' },
        gap: 4,
        alignItems: 'center',
        '&::before': {
          content: '""',
          position: 'absolute', inset: 0,
          backgroundImage: 'radial-gradient(circle, rgba(22,17,14,0.06) 1px, transparent 1.3px)',
          backgroundSize: '8px 8px',
          maskImage: 'linear-gradient(135deg, transparent 50%, black 100%)',
          WebkitMaskImage: 'linear-gradient(135deg, transparent 50%, black 100%)',
          pointerEvents: 'none',
        },
      }}>
        {/* Left: copy */}
        <Box sx={{ position: 'relative', zIndex: 2 }}>
          <Box sx={{
            display: 'inline-flex', alignItems: 'center', gap: 1,
            fontFamily: inkstashFonts.mono, fontSize: 11,
            textTransform: 'uppercase', letterSpacing: '0.12em',
            color: inkstashColors.brand, fontWeight: 600, mb: 2.25,
          }}>
            <Box sx={{
              width: 8, height: 8, borderRadius: '50%', bgcolor: inkstashColors.brand,
              animation: 'inkstashPulse 2s infinite',
            }} />
            {publisher?.name} · This Week
          </Box>

          <Box component="h1" sx={{
            fontFamily: inkstashFonts.display, fontWeight: 900,
            fontSize: 'clamp(40px, 5.4vw, 72px)', lineHeight: 0.95,
            letterSpacing: '-0.005em', m: 0, mb: 2.75,
            textTransform: 'uppercase', color: inkstashColors.ink,
          }}>
            Rip the <Box component="span" sx={{ color: inkstashColors.brand }}>comic vault.</Box>
          </Box>

          <Box component="p" sx={{
            fontSize: 'clamp(14px, 1.6vw, 16px)',
            color: inkstashColors.ink2,
            maxWidth: 460, m: 0, mb: 3.5, lineHeight: 1.5,
          }}>
            Sealed mystery packs from indie presses and major publishers. Transparent odds. Real graded slabs. The rush of the rip — straight to your vault.
          </Box>

          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Box
              component="button"
              type="button"
              onClick={() => navigate('/packs')}
              sx={{
                bgcolor: inkstashColors.brand, color: '#fff', border: 'none',
                padding: '14px 22px', borderRadius: 1.25,
                fontFamily: inkstashFonts.ui, fontWeight: 600, fontSize: 14.5,
                cursor: 'pointer',
                boxShadow: inkstashShadows.sm,
                transition: 'background 140ms ease, transform 100ms ease',
                '&:hover': { bgcolor: inkstashColors.brandDeep },
                '&:active': { transform: 'scale(0.97)' },
              }}
            >
              Rip {titleSuffix} · ${hero.price}
            </Box>
            <Box
              component="button"
              type="button"
              onClick={() => navigate(`/packs#${hero.id}`)}
              sx={{
                bgcolor: 'transparent', color: inkstashColors.ink,
                border: `1px solid ${inkstashColors.borderStrong}`,
                padding: '14px 22px', borderRadius: 1.25,
                fontFamily: inkstashFonts.ui, fontWeight: 500, fontSize: 14.5,
                cursor: 'pointer',
                transition: 'background 140ms ease, border-color 140ms ease',
                '&:hover': { bgcolor: inkstashColors.bgSunken },
                '&:active': { transform: 'scale(0.97)' },
              }}
            >
              See odds
            </Box>
          </Box>

          <Box sx={{
            display: 'flex', gap: 3.5, mt: 3.5, pt: 2.75,
            borderTop: `1px solid ${inkstashColors.border}`,
          }}>
            {[
              { v: '128,402', l: 'Packs Ripped' },
              { v: '$4.2M',   l: 'In Vault' },
              { v: '24/7',    l: 'Live Ripping' },
            ].map(stat => (
              <Box key={stat.l} sx={{ display: 'flex', flexDirection: 'column' }}>
                <Box sx={{
                  fontFamily: inkstashFonts.display, fontWeight: 800, fontSize: 28,
                  lineHeight: 1, color: inkstashColors.ink,
                }}>{stat.v}</Box>
                <Box sx={{
                  fontFamily: inkstashFonts.mono, fontSize: 10.5,
                  textTransform: 'uppercase', color: inkstashColors.muted,
                  letterSpacing: '0.08em', mt: 0.5,
                }}>{stat.l}</Box>
              </Box>
            ))}
          </Box>
        </Box>

        {/* Right: pack stage */}
        <Box sx={{
          position: 'relative',
          height: { xs: 280, md: 380 },
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {/* Two card placeholders fanned behind */}
          <Box sx={{
            position: 'absolute',
            width: 200, height: 280, borderRadius: '12px',
            border: `1px solid ${inkstashColors.border}`,
            bgcolor: inkstashColors.bgElev,
            boxShadow: inkstashShadows.md,
            transform: 'translate(-115px, -10px) rotate(-12deg)',
          }} />
          <Box sx={{
            position: 'absolute',
            width: 200, height: 280, borderRadius: '12px',
            border: `1px solid ${inkstashColors.border}`,
            bgcolor: inkstashColors.bgElev,
            boxShadow: inkstashShadows.md,
            transform: 'translate(115px, -10px) rotate(12deg)',
          }} />
          {/* Main pack */}
          <Box sx={{
            position: 'relative', zIndex: 2,
            width: 230, height: 320,
            borderRadius: '14px',
            boxShadow: '0 30px 60px -20px rgba(22,17,14,0.4), 0 0 0 1px rgba(0,0,0,0.05)',
            transform: 'rotate(-4deg)',
            animation: 'inkstashFloaty 5s ease-in-out infinite',
            cursor: 'pointer',
          }}>
            <PackVisual pack={hero} big />
          </Box>
        </Box>

        {/* Carousel dots */}
        <Box sx={{
          position: 'absolute', bottom: 22, left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex', gap: 0.75,
          zIndex: 3,
        }}>
          {packs.map((_, i) => (
            <Box
              key={i}
              component="button"
              type="button"
              aria-label={`Slide ${i + 1}`}
              onClick={() => setIdx(i)}
              sx={{
                width: i === idx ? 22 : 6, height: 6,
                borderRadius: 999, border: 'none', padding: 0, cursor: 'pointer',
                bgcolor: i === idx ? inkstashColors.ink : inkstashColors.muted2,
                transition: 'all 200ms ease',
              }}
            />
          ))}
        </Box>
      </Box>

      <style>{`
        @keyframes inkstashPulse {
          0% { box-shadow: 0 0 0 0 rgba(161,35,44,0.5); }
          70% { box-shadow: 0 0 0 10px rgba(161,35,44,0); }
          100% { box-shadow: 0 0 0 0 rgba(161,35,44,0); }
        }
        @keyframes inkstashFloaty {
          0%, 100% { transform: rotate(-4deg) translateY(0); }
          50% { transform: rotate(-4deg) translateY(-8px); }
        }
      `}</style>
    </Box>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/components/home/HomeHero.tsx
git commit -m "feat(home): add HomeHero (hero card, stats, pack stage, carousel dots)"
```

---

### Task 11: PickAPackSection — tabs + horizontal scroll-snap

**Files:**
- Create: `src/components/home/PickAPackSection.tsx`

- [ ] **Step 1: Create the file**

```tsx
// src/components/home/PickAPackSection.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box } from '@mui/material';
import PackCard from './PackCard';
import { type Pack } from '../../data/handoffSeed';
import { inkstashColors, inkstashFonts, inkstashShadows } from '../../theme/inkstashTokens';

type Tab = 'trending' | 'new' | 'premium';

interface PickAPackSectionProps {
  packs: Pack[];
}

export default function PickAPackSection({ packs }: PickAPackSectionProps) {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('trending');

  const visible =
    tab === 'trending' ? packs.slice(0, 4) :
    tab === 'new'      ? packs.slice(4, 8) :
                         packs.filter(p => p.premium);

  return (
    <Box component="section" sx={{ mb: 5.5 }}>
      <Box sx={{
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        mb: 2, gap: 2,
        flexWrap: { xs: 'wrap', md: 'nowrap' },
      }}>
        <Box>
          <Box component="h2" sx={{
            fontFamily: inkstashFonts.display, fontWeight: 800,
            fontSize: 'clamp(22px, 3vw, 30px)',
            letterSpacing: '0.005em', m: 0, textTransform: 'uppercase', lineHeight: 1,
            color: inkstashColors.ink,
          }}>Pick a Pack</Box>
          <Box sx={{ color: inkstashColors.muted, fontSize: 13, mt: 0.5 }}>
            Odds are transparent. Every card is real, graded, and shippable.
          </Box>
        </Box>

        <Box sx={{
          display: 'flex', gap: 0.5, padding: 0.5,
          bgcolor: inkstashColors.bgSunken, borderRadius: 999,
        }}>
          {(['trending','new','premium'] as Tab[]).map(t => (
            <Box
              key={t}
              component="button"
              type="button"
              onClick={() => setTab(t)}
              sx={{
                padding: '6px 14px', borderRadius: 999, border: 'none', cursor: 'pointer',
                fontSize: 12.5, fontWeight: 500, fontFamily: inkstashFonts.ui,
                bgcolor: tab === t ? inkstashColors.bgElev : 'transparent',
                color: tab === t ? inkstashColors.ink : inkstashColors.ink2,
                boxShadow: tab === t ? inkstashShadows.sm : 'none',
                transition: 'all 140ms ease',
              }}
            >
              {t === 'trending' ? 'Trending' : t === 'new' ? 'New drops' : 'Premium'}
            </Box>
          ))}
        </Box>
      </Box>

      <Box sx={{
        display: 'grid',
        gridAutoFlow: 'column',
        gridAutoColumns: { xs: '220px', md: '280px' },
        gap: 2,
        overflowX: 'auto',
        scrollSnapType: 'x mandatory',
        paddingBottom: 1,
        '& > *': { scrollSnapAlign: 'start' },
        '&::-webkit-scrollbar': { height: 8 },
        '&::-webkit-scrollbar-thumb': {
          background: inkstashColors.borderStrong, borderRadius: 999,
        },
      }}>
        {visible.map(p => <PackCard key={p.id} pack={p} onClick={() => navigate(`/packs#${p.id}`)} />)}
      </Box>
    </Box>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/components/home/PickAPackSection.tsx
git commit -m "feat(home): add PickAPackSection with tabs and horizontal scroll-snap"
```

---

### Task 12: PublisherCard + PublisherScroller

**Files:**
- Create: `src/components/home/PublisherCard.tsx`
- Create: `src/components/home/PublisherScroller.tsx`

- [ ] **Step 1: Create PublisherCard**

```tsx
// src/components/home/PublisherCard.tsx
import { Box } from '@mui/material';
import { ChevronRight } from 'lucide-react';
import { type Publisher } from '../../data/handoffSeed';
import { inkstashColors, inkstashFonts, inkstashRadii } from '../../theme/inkstashTokens';

interface PublisherCardProps {
  publisher: Publisher;
  onClick?: () => void;
}

export default function PublisherCard({ publisher, onClick }: PublisherCardProps) {
  return (
    <Box
      onClick={onClick}
      sx={{
        position: 'relative',
        bgcolor: inkstashColors.bgElev,
        border: `1px solid ${inkstashColors.border}`,
        borderRadius: inkstashRadii.lg,
        padding: '20px 22px',
        cursor: 'pointer',
        transition: 'transform 140ms ease, border-color 140ms ease',
        '&:hover': {
          borderColor: inkstashColors.ink,
          transform: 'translateY(-2px)',
          '& .pub-arrow': { color: inkstashColors.brand, transform: 'translate(2px, -2px)' },
        },
      }}
    >
      <Box className="pub-arrow" sx={{
        position: 'absolute', top: 16, right: 16,
        color: inkstashColors.muted,
        transition: 'transform 140ms ease, color 140ms ease',
      }}>
        <ChevronRight size={16} />
      </Box>

      <Box sx={{
        width: 36, height: 36, borderRadius: '8px',
        background: `linear-gradient(135deg, ${publisher.gradient[0]}, ${publisher.gradient[1]})`,
        mb: 1.5,
      }} />

      <Box sx={{
        fontFamily: inkstashFonts.display, fontWeight: 900, fontSize: 26,
        textTransform: 'uppercase', lineHeight: 1, color: inkstashColors.ink,
        mb: 0.5,
      }}>{publisher.name}</Box>

      <Box sx={{
        fontFamily: inkstashFonts.mono, fontSize: 11,
        textTransform: 'uppercase', color: inkstashColors.muted,
        letterSpacing: '0.06em',
      }}>{publisher.tag} · {publisher.count} packs available</Box>
    </Box>
  );
}
```

- [ ] **Step 2: Create PublisherScroller**

```tsx
// src/components/home/PublisherScroller.tsx
import { useNavigate } from 'react-router-dom';
import { Box } from '@mui/material';
import PublisherCard from './PublisherCard';
import { PUBLISHERS } from '../../data/handoffSeed';
import { inkstashColors, inkstashFonts } from '../../theme/inkstashTokens';

export default function PublisherScroller() {
  const navigate = useNavigate();

  return (
    <Box component="section" sx={{ mb: 5.5 }}>
      <Box sx={{
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        mb: 2, gap: 2,
      }}>
        <Box>
          <Box component="h2" sx={{
            fontFamily: inkstashFonts.display, fontWeight: 800,
            fontSize: 'clamp(22px, 3vw, 30px)',
            letterSpacing: '0.005em', m: 0, textTransform: 'uppercase', lineHeight: 1,
            color: inkstashColors.ink,
          }}>Shop by Publisher</Box>
          <Box sx={{ color: inkstashColors.muted, fontSize: 13, mt: 0.5 }}>
            Major imprints to small press — all sealed and vaulted
          </Box>
        </Box>
        <Box
          component="button"
          type="button"
          onClick={() => navigate('/packs')}
          sx={{
            bgcolor: 'transparent', border: 'none', cursor: 'pointer',
            color: inkstashColors.muted, fontSize: 13, fontWeight: 500,
            fontFamily: inkstashFonts.ui, padding: '6px 0',
            transition: 'color 120ms ease',
            '&:hover': { color: inkstashColors.ink },
          }}
        >
          See all publishers →
        </Box>
      </Box>

      <Box sx={{
        display: 'grid',
        gridAutoFlow: 'column',
        gridAutoColumns: { xs: '220px', md: '260px' },
        gap: 2,
        overflowX: 'auto',
        scrollSnapType: 'x mandatory',
        paddingBottom: 1,
        '& > *': { scrollSnapAlign: 'start' },
        '&::-webkit-scrollbar': { height: 8 },
        '&::-webkit-scrollbar-thumb': {
          background: inkstashColors.borderStrong, borderRadius: 999,
        },
      }}>
        {PUBLISHERS.map(p => (
          <PublisherCard
            key={p.id}
            publisher={p}
            onClick={() => navigate('/packs')}
          />
        ))}
      </Box>
    </Box>
  );
}
```

- [ ] **Step 3: Verify TypeScript**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/components/home/PublisherCard.tsx src/components/home/PublisherScroller.tsx
git commit -m "feat(home): add PublisherCard + PublisherScroller"
```

---

### Task 13: Discover3Up — themed SVG illustrations

**Files:**
- Create: `src/components/home/Discover3Up.tsx`

- [ ] **Step 1: Create the file**

```tsx
// src/components/home/Discover3Up.tsx
import { Box } from '@mui/material';
import { DISCOVER } from '../../data/handoffSeed';
import { inkstashColors, inkstashFonts, inkstashRadii, inkstashShadows } from '../../theme/inkstashTokens';

function ArtPhone() {
  return (
    <svg viewBox="0 0 200 130" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
      <defs>
        <radialGradient id="dp-glow" cx="50%" cy="55%" r="50%">
          <stop offset="0%" stopColor={inkstashColors.brand} stopOpacity={0.35} />
          <stop offset="100%" stopColor={inkstashColors.brand} stopOpacity={0} />
        </radialGradient>
        <linearGradient id="dp-screen" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={inkstashColors.brand} />
          <stop offset="100%" stopColor="#1F3A6E" />
        </linearGradient>
      </defs>
      <rect width="200" height="130" fill="#0F0B09" />
      <rect width="200" height="130" fill="url(#dp-glow)" />
      <g transform="translate(85, 28)">
        <rect width="30" height="62" rx="6" fill="#1A1410" stroke="#3A302A" strokeWidth="1.2" />
        <rect x="2.5" y="4" width="25" height="54" rx="3" fill="url(#dp-screen)" />
      </g>
    </svg>
  );
}

function ArtVault() {
  const rows: [string, string][] = [
    ['#1F3A6E', '#0E1D3E'],
    ['#C2362F', '#5C1116'],
    ['#B8893A', '#5C3F0F'],
  ];
  return (
    <svg viewBox="0 0 200 130" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
      <rect width="200" height="130" fill="#0F0B09" />
      <g transform="translate(18, 12)">
        {rows.map((g, ri) =>
          [0, 1, 2, 3].map(ci => (
            <g key={`${ri}-${ci}`} transform={`translate(${ci * 42}, ${ri * 35})`}>
              <defs>
                <linearGradient id={`vlt-${ri}-${ci}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={g[0]} />
                  <stop offset="100%" stopColor={g[1]} />
                </linearGradient>
              </defs>
              <rect width="36" height="29" rx="3" fill={`url(#vlt-${ri}-${ci})`} stroke="rgba(0,0,0,0.3)" strokeWidth="0.8" />
            </g>
          ))
        )}
      </g>
    </svg>
  );
}

function ArtIdea() {
  return (
    <svg viewBox="0 0 200 130" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
      <rect width="200" height="130" fill={inkstashColors.bgSunken} />
      <circle cx="76" cy="65" r="22" fill={inkstashColors.brand} />
      <text x="76" y="74" textAnchor="middle" fontFamily="Big Shoulders Display, sans-serif" fontWeight="900" fontSize="30" fill="white">!</text>
      <circle cx="124" cy="72" r="18" fill="#1F3A6E" />
      <text x="124" y="80" textAnchor="middle" fontFamily="Big Shoulders Display, sans-serif" fontWeight="900" fontSize="24" fill="white">?</text>
    </svg>
  );
}

const artMap = {
  phone: ArtPhone,
  vault: ArtVault,
  idea:  ArtIdea,
};

export default function Discover3Up() {
  return (
    <Box component="section" sx={{ mb: 5.5 }}>
      <Box sx={{ mb: 2 }}>
        <Box component="h2" sx={{
          fontFamily: inkstashFonts.display, fontWeight: 800,
          fontSize: 'clamp(22px, 3vw, 30px)',
          letterSpacing: '0.005em', m: 0, textTransform: 'uppercase', lineHeight: 1,
          color: inkstashColors.ink,
        }}>Discover</Box>
        <Box sx={{ color: inkstashColors.muted, fontSize: 13, mt: 0.5 }}>
          Get the most out of Inkstash
        </Box>
      </Box>
      <Box sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
        gap: 2,
      }}>
        {DISCOVER.map(card => {
          const Art = artMap[card.art];
          return (
            <Box key={card.id} sx={{
              bgcolor: inkstashColors.bgElev,
              border: `1px solid ${inkstashColors.border}`,
              borderRadius: inkstashRadii.lg,
              overflow: 'hidden',
              display: 'flex', flexDirection: 'column',
              cursor: 'pointer',
              transition: 'transform 140ms ease, box-shadow 140ms ease, border-color 140ms ease',
              '&:hover': {
                transform: 'translateY(-3px)',
                boxShadow: inkstashShadows.md,
                borderColor: inkstashColors.borderStrong,
              },
            }}>
              <Box sx={{ aspectRatio: '16 / 10', position: 'relative', overflow: 'hidden' }}>
                <Art />
              </Box>
              <Box sx={{ padding: '18px 20px 20px' }}>
                <Box sx={{ fontWeight: 700, fontSize: 17, color: inkstashColors.ink, mb: 0.75, letterSpacing: '-0.005em' }}>{card.title}</Box>
                <Box sx={{ fontSize: 13.5, color: inkstashColors.muted, lineHeight: 1.5 }}>{card.sub}</Box>
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/components/home/Discover3Up.tsx
git commit -m "feat(home): add Discover3Up with themed SVG illustrations"
```

---

### Task 14: Refactor LiveBreaksRow to match handoff

**Files:**
- Modify: `src/components/home/LiveBreaksRow.tsx`

- [ ] **Step 1: Replace the file content**

The current `LiveBreaksRow` reads from a Supabase shape (`streams` array with `LiveStream` type). The new version reads from `LIVE_BREAKS` seed data with the handoff shape. Replace the entire file with:

```tsx
// src/components/home/LiveBreaksRow.tsx
import { useNavigate } from 'react-router-dom';
import { Box } from '@mui/material';
import { LIVE_BREAKS, type LiveBreak } from '../../data/handoffSeed';
import { inkstashColors, inkstashFonts, inkstashRadii, inkstashShadows } from '../../theme/inkstashTokens';

interface LiveBreaksRowProps {
  breaks?: LiveBreak[];
}

export default function LiveBreaksRow({ breaks = LIVE_BREAKS }: LiveBreaksRowProps) {
  const navigate = useNavigate();

  return (
    <Box component="section" sx={{ mb: 5.5 }}>
      <Box sx={{
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        mb: 2, gap: 2,
      }}>
        <Box>
          <Box component="h2" sx={{
            fontFamily: inkstashFonts.display, fontWeight: 800,
            fontSize: 'clamp(22px, 3vw, 30px)',
            letterSpacing: '0.005em', m: 0, textTransform: 'uppercase', lineHeight: 1,
            color: inkstashColors.ink,
          }}>Live Breaks</Box>
          <Box sx={{ color: inkstashColors.muted, fontSize: 13, mt: 0.5 }}>
            Watch collectors rip in real time and chat along
          </Box>
        </Box>
        <Box
          component="button"
          type="button"
          onClick={() => navigate('/live')}
          sx={{
            bgcolor: 'transparent', border: 'none', cursor: 'pointer',
            color: inkstashColors.muted, fontSize: 13, fontWeight: 500,
            fontFamily: inkstashFonts.ui, padding: '6px 0',
            transition: 'color 120ms ease',
            '&:hover': { color: inkstashColors.ink },
          }}
        >
          See all streams →
        </Box>
      </Box>

      <Box sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
        gap: { xs: '10px', md: 2 },
      }}>
        {breaks.map(b => (
          <Box
            key={b.id}
            onClick={() => navigate('/live')}
            sx={{
              borderRadius: inkstashRadii.lg,
              overflow: 'hidden',
              cursor: 'pointer',
              bgcolor: inkstashColors.ink,
              transition: 'transform 140ms ease, box-shadow 140ms ease',
              '&:hover': { transform: 'translateY(-3px)', boxShadow: inkstashShadows.lg },
            }}
          >
            <Box sx={{
              position: 'relative',
              aspectRatio: '9 / 16',
              overflow: 'hidden',
              color: '#fff',
              display: 'flex', alignItems: 'flex-end',
              background: `linear-gradient(160deg, ${b.gradient[0]} 0%, ${b.gradient[1]} 100%)`,
              '&::before': {
                content: '""',
                position: 'absolute', inset: 0,
                background:
                  'radial-gradient(circle at 50% 25%, rgba(255,255,255,0.14), transparent 50%),' +
                  'linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.4) 70%, rgba(0,0,0,0.85) 100%)',
                pointerEvents: 'none',
              },
              '&::after': {
                content: '""',
                position: 'absolute', inset: 0,
                backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1.2px)',
                backgroundSize: '10px 10px',
                pointerEvents: 'none',
                mixBlendMode: 'overlay',
              },
            }}>
              {/* LIVE pill */}
              <Box sx={{
                position: 'absolute', top: 12, left: 12, zIndex: 3,
                display: 'inline-flex', alignItems: 'center', gap: 0.65,
                bgcolor: inkstashColors.live, color: '#fff',
                fontFamily: inkstashFonts.mono, fontSize: 10.5, fontWeight: 700,
                letterSpacing: '0.08em',
                padding: '4px 10px 4px 8px', borderRadius: 999,
                boxShadow: '0 2px 8px rgba(220,38,38,0.4)',
              }}>
                <Box sx={{
                  width: 6, height: 6, borderRadius: '50%', bgcolor: '#fff',
                  animation: 'inkstashLivePulse 1.4s ease-in-out infinite',
                }} />
                LIVE
              </Box>

              {/* Watcher count */}
              <Box sx={{
                position: 'absolute', top: 12, right: 12, zIndex: 3,
                bgcolor: 'rgba(0,0,0,0.55)',
                borderRadius: 999,
                padding: '5px 10px',
                fontFamily: inkstashFonts.mono,
                display: 'inline-flex', alignItems: 'center', gap: 0.75,
                border: '1px solid rgba(255,255,255,0.12)',
                backdropFilter: 'blur(6px)',
                WebkitBackdropFilter: 'blur(6px)',
              }}>
                <Box component="span" sx={{ fontSize: 12, fontWeight: 600, color: '#fff', lineHeight: 1 }}>{b.viewers}</Box>
                <Box component="span" sx={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', letterSpacing: '0.04em' }}>watching</Box>
              </Box>

              {/* Pack name overlay */}
              <Box sx={{
                position: 'absolute', top: '38%', left: '50%',
                transform: 'translate(-50%, -50%) rotate(-3deg)',
                fontFamily: inkstashFonts.display, fontWeight: 900,
                fontSize: 'clamp(20px, 1.7vw, 26px)',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.95)',
                letterSpacing: '0.01em', textAlign: 'center',
                padding: '0 16px',
                lineHeight: 0.95,
                textShadow: '0 2px 12px rgba(0,0,0,0.55)',
                zIndex: 1,
                maxWidth: '92%',
              }}>{b.packLabel}</Box>

              {/* Info overlay */}
              <Box sx={{ position: 'relative', padding: '16px 16px 18px', zIndex: 2, width: '100%' }}>
                <Box sx={{
                  display: 'inline-flex', alignItems: 'center', gap: 0.85,
                  fontFamily: inkstashFonts.mono, fontSize: 11.5,
                  color: 'rgba(255,255,255,0.85)',
                  mb: 1, fontWeight: 500,
                }}>
                  <Box sx={{
                    width: 22, height: 22, borderRadius: '50%',
                    background: `linear-gradient(135deg, ${inkstashColors.brand}, ${inkstashColors.brandDeep})`,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontFamily: inkstashFonts.display,
                    fontWeight: 800, fontSize: 11,
                    border: '1.5px solid rgba(255,255,255,0.18)',
                    flexShrink: 0,
                  }}>{b.host[0].toUpperCase()}</Box>
                  @{b.host}
                </Box>
                <Box sx={{
                  fontSize: 14, fontWeight: 600, color: '#fff', lineHeight: 1.3,
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                  overflow: 'hidden', textShadow: '0 1px 2px rgba(0,0,0,0.4)',
                }}>{b.title}</Box>
              </Box>
            </Box>
          </Box>
        ))}
      </Box>

      <style>{`
        @keyframes inkstashLivePulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.35; }
        }
      `}</style>
    </Box>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

Run: `npx tsc --noEmit`
Expected: clean. The current Home.tsx that imports the old `LiveBreaksRow` may break on prop shape — that's OK, Task 18 fixes it.

- [ ] **Step 3: Commit**

```bash
git add src/components/home/LiveBreaksRow.tsx
git commit -m "refactor(home): rewrite LiveBreaksRow to match handoff spec (9:16, overlays, host avatar)"
```

---

### Task 15: Refactor TrendingList to handoff spec

**Files:**
- Modify: `src/components/home/TrendingList.tsx`

- [ ] **Step 1: Replace the file content**

The current `TrendingList` reads `TrendingAuction` from the Supabase API shape. Replace with handoff-aligned version that uses `TRENDING_WEEK` seed by default:

```tsx
// src/components/home/TrendingList.tsx
import { useNavigate } from 'react-router-dom';
import { Box } from '@mui/material';
import { TRENDING_WEEK, type TrendingItem } from '../../data/handoffSeed';
import { inkstashColors, inkstashFonts, inkstashRadii } from '../../theme/inkstashTokens';

interface TrendingListProps {
  items?: TrendingItem[];
}

export default function TrendingList({ items = TRENDING_WEEK }: TrendingListProps) {
  const navigate = useNavigate();

  return (
    <Box component="section" sx={{ mb: 5.5 }}>
      <Box sx={{
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        mb: 2, gap: 2,
      }}>
        <Box>
          <Box component="h2" sx={{
            fontFamily: inkstashFonts.display, fontWeight: 800,
            fontSize: 'clamp(22px, 3vw, 30px)',
            letterSpacing: '0.005em', m: 0, textTransform: 'uppercase', lineHeight: 1,
            color: inkstashColors.ink,
          }}>Trending This Week</Box>
          <Box sx={{ color: inkstashColors.muted, fontSize: 13, mt: 0.5 }}>
            Hot single-card auctions across the community
          </Box>
        </Box>
        <Box
          component="button"
          type="button"
          onClick={() => navigate('/marketplace')}
          sx={{
            bgcolor: 'transparent', border: 'none', cursor: 'pointer',
            color: inkstashColors.muted, fontSize: 13, fontWeight: 500,
            fontFamily: inkstashFonts.ui, padding: '6px 0',
            '&:hover': { color: inkstashColors.ink },
          }}
        >
          See marketplace →
        </Box>
      </Box>

      <Box sx={{
        bgcolor: inkstashColors.bgElev,
        border: `1px solid ${inkstashColors.border}`,
        borderRadius: inkstashRadii.lg,
        overflow: 'hidden',
      }}>
        {items.map((t, i) => (
          <Box
            key={t.rank}
            onClick={() => navigate('/marketplace')}
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '36px 1fr auto', md: '56px 1fr auto' },
              alignItems: 'center',
              gap: { xs: 1.5, md: 2.25 },
              padding: { xs: '14px 16px', md: '18px 24px' },
              borderBottom: i < items.length - 1 ? `1px solid ${inkstashColors.border}` : 'none',
              cursor: 'pointer',
              transition: 'background 120ms ease',
              '&:hover': { background: inkstashColors.bgSunken },
            }}
          >
            <Box sx={{
              fontFamily: inkstashFonts.mono,
              fontSize: { xs: 11, md: 12 },
              color: inkstashColors.muted2,
              letterSpacing: '0.06em', fontWeight: 500,
            }}>{String(t.rank).padStart(2, '0')}</Box>

            <Box sx={{ minWidth: 0 }}>
              <Box sx={{
                fontWeight: 600,
                fontSize: { xs: 13.5, md: 14.5 },
                color: inkstashColors.ink, lineHeight: 1.25, mb: 0.4,
                textWrap: 'balance' as unknown as 'normal',
              }}>{t.title}</Box>
              <Box sx={{
                fontFamily: inkstashFonts.mono, fontSize: 11.5,
                color: inkstashColors.muted,
                display: 'inline-flex', alignItems: 'center', gap: 0.75,
              }}>
                <Box component="span">{t.bids} bids</Box>
                <Box component="span" sx={{ color: inkstashColors.muted2 }}>·</Box>
                <Box component="span">{t.seller}</Box>
              </Box>
            </Box>

            <Box sx={{
              fontFamily: inkstashFonts.display, fontWeight: 800,
              fontSize: { xs: 17, md: 20 },
              color: inkstashColors.brand,
              letterSpacing: '0.005em', whiteSpace: 'nowrap',
            }}>${t.price.toLocaleString()}</Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

Run: `npx tsc --noEmit`
Expected: errors about Home.tsx still passing old props — that's OK, fixed in Task 18.

- [ ] **Step 3: Commit**

```bash
git add src/components/home/TrendingList.tsx
git commit -m "refactor(home): rewrite TrendingList to match handoff spec (price in display font, brand color)"
```

---

### Task 16: HomeFooter token swap

**Files:**
- Modify: `src/components/home/HomeFooter.tsx`

- [ ] **Step 1: Open the file**

Run: `cat src/components/home/HomeFooter.tsx | head -30`

The file imports from `conceptCTokens`. Swap to `inkstashTokens`. Change:

- `import { colors, easing, fonts } from '../../theme/conceptCTokens';`
- to: `import { inkstashColors, inkstashFonts } from '../../theme/inkstashTokens';`

Then replace every `colors.` reference with the matching `inkstashColors.` key:
- `colors.line` → `inkstashColors.border`
- `colors.inkSoft` → `inkstashColors.ink2`
- `colors.ink` → `inkstashColors.ink`
- `colors.inkMute` → `inkstashColors.muted`
- `colors.accent` → `inkstashColors.brand`

And `fonts.mono` → `inkstashFonts.mono`. Remove the `easing` import and any `easing.out` references — replace with `'140ms ease'` inline.

- [ ] **Step 2: Verify TypeScript**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/components/home/HomeFooter.tsx
git commit -m "refactor(home): swap HomeFooter to inkstashTokens"
```

---

### Task 17: Update Home.tsx to use new shell + sections

**Files:**
- Modify: `src/pages/Home.tsx`

- [ ] **Step 1: Read the current file**

Run: `grep -n "^import\|^export default\|<DashboardLayout\|<HeroCarousel\|<JustPulledGrid\|<LiveBreaksRow\|<TrendingList\|<DiscoverRow\|<HomeFooter" src/pages/Home.tsx`

Identify what's imported and the render structure. The current Home wraps everything in `<DashboardLayout>` and renders 6 Concept-C section components.

- [ ] **Step 2: Replace the render block**

Find the `return (...)` block of the `Home` default export (after the auth gate). Replace it with:

```tsx
  return (
    <AppShell>
      <HomeHero packs={[heroPacks[0], heroPacks[1], heroPacks[2]]} />
      <PickAPackSection packs={PACKS} />
      <LiveBreaksRow />
      <PublisherScroller />
      <TrendingList />
      <Discover3Up />
      <HomeFooter />
      <OnboardingModal isOpen={showOnboarding} onClose={() => setShowOnboarding(false)} />
    </AppShell>
  );
```

Where `heroPacks` is defined just before the return (after the existing state):

```tsx
  const heroPacks = [PACKS[0], PACKS[6], PACKS[7]]; // Variant Vault, Holographic Heroes, Grail Hunter Pro
```

And imports at the top of the file:

```tsx
import { PACKS } from '../data/handoffSeed';
import AppShell from '../components/layout/AppShell';
import HomeHero from '../components/home/HomeHero';
import PickAPackSection from '../components/home/PickAPackSection';
import LiveBreaksRow from '../components/home/LiveBreaksRow';
import PublisherScroller from '../components/home/PublisherScroller';
import TrendingList from '../components/home/TrendingList';
import Discover3Up from '../components/home/Discover3Up';
import HomeFooter from '../components/home/HomeFooter';
import OnboardingModal from '../components/onboarding/OnboardingModal';
```

Remove these imports (no longer used in the main Home render — but check that SplashPage doesn't use them first):
- `DashboardLayout`
- `HeroCarousel`
- `JustPulledGrid`
- `DiscoverRow`

Also remove the now-unused state: `streams`, `trending`, `featured`, `loading*`, `error*`, `loadData`, the `nextDrop`/`dropSecs` countdown, and the `useEffect`/`useCallback` for fetching. The new sections use static seed data; no fetching needed on Home.

**Critical:** SplashPage may still use `useNextDrop`, `T`, `H` tokens, etc. Do NOT remove anything SplashPage references. Use `grep -n "useNextDrop\|T\.\|H\." src/pages/Home.tsx` to verify before removing.

- [ ] **Step 3: Verify TypeScript**

Run: `npx tsc --noEmit`
Expected: clean. If any errors, fix them inline (likely unused imports — remove them).

- [ ] **Step 4: Commit**

```bash
git add src/pages/Home.tsx
git commit -m "feat(home): port Home.tsx to Inkstash AppShell + handoff sections"
```

---

### Task 18: Browser visual QA

**Files:** none (manual verification)

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

Wait for `Local: http://localhost:5173`.

- [ ] **Step 2: Bypass auth gate for QA**

Edit `src/pages/Home.tsx`, find the line:
```ts
if (!authLoading && !isAuthenticated) return <SplashPage />;
```
Comment it out with `// QA bypass — restore before commit`.

- [ ] **Step 3: Screenshot desktop**

```bash
B="$HOME/.claude/skills/gstack/browse/dist/browse"
$B viewport 1440x900
$B goto http://localhost:5173
$B console --errors
$B screenshot /tmp/inkstash-home-desktop.png
```

Read `/tmp/inkstash-home-desktop.png` and verify:
- Sidebar pinned top-left, full height, 240px wide
- Logo "inkstash." with red period in top cell
- 6 primary nav items (Home active with bg-sunken)
- Publishers list with gradient swatches
- "List your collection" red promo card
- User footer @you · Free tier · collapse button
- Top nav 64px tall over main column with search + bell + Cart + Log in + Sign up
- Hero: red eyebrow with pulsing dot, big "RIP THE COMIC VAULT." headline (vault in red), lede, 2 CTAs, 3-stat row, pack envelope rotated -4deg, 3 carousel dots
- Pick a Pack: section head with tabs (Trending active), 4 PackCards in horizontal scroll
- Live Breaks: 4-up 9:16 cards with LIVE pill, watcher count, pack name overlay, host avatar + title
- Publishers: 4 publisher cards with gradient swatches + Big Shoulders Display names
- Trending: 6 numbered rows inside a single card, prices in crimson
- Discover: 3 cards with themed SVG illustrations
- Footer at bottom

- [ ] **Step 4: Test sidebar collapse**

```bash
$B js "document.querySelector('[aria-label=\"Collapse sidebar\"]').click(); 'clicked'"
sleep 1
$B screenshot /tmp/inkstash-home-collapsed.png
```

Read screenshot. Sidebar should be 68px wide, only icons visible, no "List your collection" promo. Main content shifts left.

- [ ] **Step 5: Test mobile**

```bash
$B viewport 375x812
$B goto http://localhost:5173
sleep 1
$B screenshot /tmp/inkstash-home-mobile.png
```

Read. Sidebar hidden, hamburger visible in topnav, hero stacks single column, breaks 2-up, publishers 2-up, discover 1-up.

- [ ] **Step 6: Tap hamburger to open mobile drawer**

```bash
$B js "document.querySelector('[aria-label=\"Open menu\"]').click(); 'open menu'"
sleep 1
$B screenshot /tmp/inkstash-home-mobile-drawer.png
```

Read. Sidebar slides in from left, scrim overlays main content.

- [ ] **Step 7: Restore auth gate**

Edit `src/pages/Home.tsx`, uncomment the auth gate line. Verify:
```bash
grep -n "isAuthenticated.*SplashPage" src/pages/Home.tsx
```
Expected: one match showing the uncommented line.

- [ ] **Step 8: Kill dev server**

```bash
pkill -f vite
```

- [ ] **Step 9: No commit needed** — all QA changes have been reverted, file matches Task 17's commit.

---

## Self-Review Checklist

**1. Spec coverage:**

- Sidebar 240px pinned left, collapsible to 68px: ✓ Task 5 + Task 7
- Topnav sticky 64px over main column: ✓ Task 6
- Main padding 24px 28px 56px, 16px 14px 40px mobile: ✓ Task 7 (uses tokens)
- Hero — gradient bg, halftone mask bottom-right, eyebrow with pulse dot, big H1, lede, dual CTA, stats row, pack stage, carousel dots: ✓ Task 10
- Pick a Pack — section head with tabs (pill segmented), horizontal scroll-snap 280px columns: ✓ Task 11
- Live Breaks — 4-up 9:16 vertical cards with all overlays: ✓ Task 14
- Shop by Publisher — section + horizontal scroll-snap of pub cards: ✓ Task 12
- Trending This Week — section + single-card numbered list with crimson prices: ✓ Task 15
- Discover — 3-up with themed SVG art: ✓ Task 13
- Tokens: crimson palette, radii, shadows, fonts, rarity: ✓ Task 2
- Fonts loaded: ✓ Task 1
- Seed data ported: ✓ Task 3
- Animations: pulse, floaty, live-pulse: ✓ Tasks 10 + 14 (inline `<style>`)
- Responsive ≤1100, ≤900, ≤760, ≤560: ✓ Tasks 7, 10, 11, 14, 13 (all use MUI responsive sx)

**2. Placeholder scan:** No TBD, no "TODO", no "similar to Task N", no "add appropriate error handling" without code. Every code step has runnable code.

**3. Type consistency:**
- `Pack`, `Publisher`, `LiveBreak`, `TrendingItem`, `DiscoverCard` all defined in Task 3 and used consistently in Tasks 8-15
- `AppSidebar` props `{ collapsed, mobileOpen, onCollapseToggle, onMobileClose }` consistent across Tasks 5 + 7
- `AppTopnav` props `{ onOpenMobileNav }` consistent across Tasks 6 + 7
- `AppShell` props `{ children }` only
- Section component prop shapes consistent: `HomeHero({ packs })`, `PickAPackSection({ packs })`, `LiveBreaksRow({ breaks? })`, `TrendingList({ items? })`, `PublisherScroller()`, `Discover3Up()`

**4. Token consistency:**
- `inkstashColors`, `inkstashFonts`, `inkstashRadii`, `inkstashShadows`, `inkstashLayout` exported as `as const` from Task 2 — referenced exactly as such in Tasks 5-17
