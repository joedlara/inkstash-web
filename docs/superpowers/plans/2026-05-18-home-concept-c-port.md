# Home → Concept C (Editorial Cream) Port Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the Concept C editorial-cream Courtyard-inspired design from `home-concepts.html` into the live React app at `src/pages/Home.tsx`, with full-width top navbar containing the logo + search + user actions, and a collapsible sidebar mounted *below* the navbar.

**Architecture:** Replace the current dark `DashboardHeader` + Concept-A Home with a new `<DashboardLayout>` shell wrapping the full app: full-width `TopNavBar` at top, sticky `SideNav` underneath on the left (with collapsed/expanded state persisted to `localStorage`), and the main content area (the Home page itself) on the right. Home keeps its existing Supabase data fetching (`getLiveAndUpcomingStreams`, `getTrendingAuctions`, `getFeaturedAuctions`, `dropsAPI.getNextUpcoming`) but renders into Concept C sections: Hero Carousel, Just Pulled, Live Breaks, Trending This Week, Discover, Footer.

**Tech Stack:** React 18, TypeScript, MUI v5 (`Box` + `sx`), `react-router-dom`, `lucide-react` icons, existing Supabase client. No new dependencies. Reference HTML lives at `home-concepts.html` (Concept C, lines tagged `concept-c` / `.cd-*`).

---

## File Structure

**New files:**
- `src/components/layout/DashboardLayout.tsx` — the shell wrapper (TopNavBar + SideNav slot + main content slot)
- `src/components/layout/TopNavBar.tsx` — full-width sticky navbar with logo, search, user actions
- `src/components/layout/SideNav.tsx` — collapsible left sidebar (nav items, Events section, "Submit my comics" CTA)
- `src/components/layout/sideNavConfig.ts` — nav items definition (single source of truth: label, icon, route)
- `src/components/home/HeroCarousel.tsx` — 3-slide hero with auto-advance, dot pagination, slabbed comic art
- `src/components/home/JustPulledGrid.tsx` — 4-up Just Pulled pulls grid (uses `featured` data)
- `src/components/home/LiveBreaksRow.tsx` — 4-up live streams (uses `streams` data)
- `src/components/home/TrendingList.tsx` — vertical Trending This Week list (uses `trending` data)
- `src/components/home/DiscoverRow.tsx` — 3-up editorial promo cards
- `src/components/home/HomeFooter.tsx` — link columns + meta
- `src/theme/conceptCTokens.ts` — Concept C design tokens (cream/ink/red/cobalt + custom easings)

**Modified files:**
- `src/pages/Home.tsx` — gut the existing render, keep the data hooks, render the new section components inside `<DashboardLayout>`
- `src/components/layout/AppLayout.tsx` — no change (mobile bottom nav still wraps everything)
- `src/main.tsx` — no change (route still mounts `<Home />`)

**Deleted/unused (post-port, do NOT delete in plan — leave for follow-up):**
- `src/components/home/DashboardHeader.tsx` — old dark navbar, becomes unused after Home migrates
- `src/components/home/DashboardSidebar.tsx` — old sidebar with `position: fixed` bug

---

## Constraints

- **Keep all data flows intact.** Home's `useEffect` + `loadData` callback that fetches streams/trending/featured/nextDrop must remain functional. The new components consume the same state via props.
- **Auth gating stays.** The `if (!authLoading && !isAuthenticated) return <SplashPage />` early return must remain in `Home.tsx` so the splash page still renders for unauthenticated visitors.
- **Mobile bottom nav stays.** `AppLayout` still wraps things at a higher level. Sidebar collapses on `md` and below.
- **Sidebar state persists.** Collapsed/expanded toggled by the `«` button at the top-right of the sidebar; state lives in `localStorage` key `sidenav.collapsed` so it survives reloads.

---

### Task 1: Create Concept C design tokens module

**Files:**
- Create: `src/theme/conceptCTokens.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/theme/__tests__/conceptCTokens.test.ts
import { C, easing } from '../conceptCTokens';

test('Concept C palette matches Concept C from home-concepts.html', () => {
  expect(C.bg).toBe('#f5f0e8');
  expect(C.ink).toBe('#14110d');
  expect(C.accent).toBe('#e82c2c');
  expect(C.cobalt).toBe('#1a4fc4');
  expect(C.amber).toBe('#f59e0b');
});

test('Custom easing curves are exported', () => {
  expect(easing.out).toBe('cubic-bezier(0.23, 1, 0.32, 1)');
  expect(easing.outSoft).toBe('cubic-bezier(0.16, 1, 0.3, 1)');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/theme/__tests__/conceptCTokens.test.ts`
Expected: FAIL with "Cannot find module '../conceptCTokens'"

- [ ] **Step 3: Write minimal implementation**

```ts
// src/theme/conceptCTokens.ts
export const C = {
  bg:         '#f5f0e8',
  bgElev:     '#ffffff',
  bgSub:      '#ede6d8',
  ink:        '#14110d',
  inkSoft:    'rgba(20,17,13,0.62)',
  inkMute:    'rgba(20,17,13,0.42)',
  line:       'rgba(20,17,13,0.10)',
  lineStrong: 'rgba(20,17,13,0.18)',
  accent:     '#e82c2c',
  accentDeep: '#b81818',
  cobalt:     '#1a4fc4',
  amber:      '#f59e0b',
  sideBg:     '#14110d',
  sideInk:    '#f5f0e8',
  sideInkSoft:'rgba(245,240,232,0.55)',
  sideLine:   'rgba(245,240,232,0.08)',
  sideHover:  'rgba(245,240,232,0.06)',
  sideActiveBg:  'rgba(232,44,44,0.14)',
  sideActiveInk: '#ffd9d9',
  topbarBg:   'rgba(245,240,232,0.85)',
} as const;

export const easing = {
  out:     'cubic-bezier(0.23, 1, 0.32, 1)',
  outSoft: 'cubic-bezier(0.16, 1, 0.3, 1)',
  inOut:   'cubic-bezier(0.77, 0, 0.175, 1)',
} as const;

export const fonts = {
  display: "'Outfit', system-ui, sans-serif",
  mono:    "'DM Mono', 'Courier New', monospace",
} as const;

export const layout = {
  navHeight:        56,
  sideWidthOpen:    220,
  sideWidthCollapsed: 64,
  contentMaxWidth:  1180,
} as const;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/theme/__tests__/conceptCTokens.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/theme/conceptCTokens.ts src/theme/__tests__/conceptCTokens.test.ts
git commit -m "feat(theme): add Concept C design tokens for editorial cream palette"
```

---

### Task 2: Create sidebar nav config

**Files:**
- Create: `src/components/layout/sideNavConfig.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/components/layout/__tests__/sideNavConfig.test.ts
import { sideNavPrimary, sideNavEvents } from '../sideNavConfig';

test('Primary nav has 5 entries with required shape', () => {
  expect(sideNavPrimary).toHaveLength(5);
  for (const item of sideNavPrimary) {
    expect(item.label).toBeTruthy();
    expect(item.route).toMatch(/^\//);
    expect(item.icon).toBeTruthy();
  }
});

test('Events section has at least 2 entries', () => {
  expect(sideNavEvents.length).toBeGreaterThanOrEqual(2);
});

test('Routes match the app router paths', () => {
  const routes = sideNavPrimary.map(i => i.route);
  expect(routes).toEqual(['/', '/packs', '/live', '/marketplace', '/leaderboard']);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/layout/__tests__/sideNavConfig.test.ts`
Expected: FAIL with module not found

- [ ] **Step 3: Write minimal implementation**

```ts
// src/components/layout/sideNavConfig.ts
import { Home, Package, Radio, Store, Trophy, Sparkles, Archive } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface SideNavItem {
  label: string;
  route: string;
  icon: LucideIcon;
}

export const sideNavPrimary: SideNavItem[] = [
  { label: 'Home',         route: '/',            icon: Home },
  { label: 'Packs',        route: '/packs',       icon: Package },
  { label: 'Live Breaks',  route: '/live',        icon: Radio },
  { label: 'Marketplace',  route: '/marketplace', icon: Store },
  { label: 'Leaderboard',  route: '/leaderboard', icon: Trophy },
];

export const sideNavEvents: SideNavItem[] = [
  { label: 'Spider-Verse Raffle', route: '/raffles', icon: Sparkles },
  { label: 'Golden Age Vault',    route: '/drops',   icon: Archive },
];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/layout/__tests__/sideNavConfig.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/sideNavConfig.ts src/components/layout/__tests__/sideNavConfig.test.ts
git commit -m "feat(layout): add SideNav config for primary + events nav"
```

---

### Task 3: Build TopNavBar component (full-width)

**Files:**
- Create: `src/components/layout/TopNavBar.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/layout/__tests__/TopNavBar.test.tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import TopNavBar from '../TopNavBar';

const renderNav = () => render(<MemoryRouter><TopNavBar onToggleSidebar={() => {}} /></MemoryRouter>);

test('renders InkStash logo wordmark', () => {
  renderNav();
  expect(screen.getByText(/InkStash/i)).toBeInTheDocument();
});

test('renders search input with placeholder', () => {
  renderNav();
  expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
});

test('renders Sign up button', () => {
  renderNav();
  expect(screen.getByRole('button', { name: /sign up/i })).toBeInTheDocument();
});

test('clicking hamburger calls onToggleSidebar', async () => {
  const onToggle = vi.fn();
  render(<MemoryRouter><TopNavBar onToggleSidebar={onToggle} /></MemoryRouter>);
  const btn = screen.getByRole('button', { name: /toggle sidebar/i });
  btn.click();
  expect(onToggle).toHaveBeenCalledTimes(1);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/layout/__tests__/TopNavBar.test.tsx`
Expected: FAIL with module not found

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/components/layout/TopNavBar.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, IconButton, Avatar, Badge, Stack } from '@mui/material';
import { Menu, Search, Bell, MessageSquare } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useCart } from '../../contexts/CartContext';
import ProfileDropdown from '../home/ProfileDropdown';
import { C, easing, fonts, layout } from '../../theme/conceptCTokens';

interface TopNavBarProps {
  onToggleSidebar: () => void;
}

export default function TopNavBar({ onToggleSidebar }: TopNavBarProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { getItemCount } = useCart();
  const [showProfile, setShowProfile] = useState(false);
  const [query, setQuery] = useState('');
  const cartCount = getItemCount();

  return (
    <>
      <Box
        component="header"
        sx={{
          position: 'fixed',
          top: 0, left: 0, right: 0,
          height: layout.navHeight,
          bgcolor: C.topbarBg,
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          borderBottom: `1px solid ${C.line}`,
          zIndex: 1100,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          px: { xs: 2, md: 3 },
          fontFamily: fonts.display,
        }}
      >
        {/* Hamburger toggle */}
        <IconButton
          aria-label="Toggle sidebar"
          onClick={onToggleSidebar}
          sx={{ color: C.ink, '&:active': { transform: 'scale(0.94)' } }}
        >
          <Menu size={20} />
        </IconButton>

        {/* Logo */}
        <Box
          onClick={() => navigate('/')}
          sx={{ display: 'flex', alignItems: 'center', gap: 1.2, cursor: 'pointer', flexShrink: 0 }}
        >
          <Box sx={{
            width: 26, height: 26, borderRadius: '7px',
            bgcolor: C.accent, color: '#fff',
            display: 'grid', placeItems: 'center',
            fontSize: '0.78rem',
            boxShadow: '0 4px 12px rgba(232,44,44,0.32)',
          }}>◆</Box>
          <Box component="span" sx={{
            fontWeight: 800, fontSize: '1.05rem',
            letterSpacing: '-0.01em', color: C.ink,
            display: { xs: 'none', sm: 'block' },
          }}>InkStash</Box>
        </Box>

        {/* Search */}
        <Box
          component="form"
          onSubmit={(e: React.FormEvent) => e.preventDefault()}
          sx={{
            flex: 1, maxWidth: 460,
            display: { xs: 'none', md: 'flex' },
            alignItems: 'center', gap: 1.25,
            bgcolor: C.bgSub,
            border: `1px solid ${C.line}`,
            px: 1.5, py: 0.9,
            borderRadius: '9px',
            transition: `border-color 180ms ${easing.out}, background 180ms ${easing.out}`,
            '&:focus-within': { borderColor: C.lineStrong, bgcolor: C.bgElev },
          }}
        >
          <Search size={16} color={C.inkMute} />
          <Box
            component="input"
            placeholder="Search keys, slabs, creators…"
            value={query}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
            sx={{
              flex: 1, bgcolor: 'transparent', border: 'none', outline: 'none',
              color: C.ink, fontFamily: fonts.display, fontSize: '0.86rem',
              '&::placeholder': { color: C.inkMute },
            }}
          />
          <Box component="kbd" sx={{
            bgcolor: C.bgElev, border: `1px solid ${C.lineStrong}`,
            px: 0.9, py: 0.25, borderRadius: '5px',
            fontFamily: fonts.mono, fontSize: '0.66rem', color: C.inkSoft,
          }}>⌘K</Box>
        </Box>

        <Box sx={{ flex: 1 }} />

        {/* Right actions */}
        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ flexShrink: 0 }}>
          <IconButton aria-label="Messages" sx={{ color: C.inkSoft }}>
            <Badge badgeContent={2} color="error" sx={{ '& .MuiBadge-badge': { fontSize: '0.55rem', minWidth: 14, height: 14 } }}>
              <MessageSquare size={18} />
            </Badge>
          </IconButton>
          <IconButton aria-label="Notifications" sx={{ color: C.inkSoft }}>
            <Bell size={18} />
          </IconButton>

          <Badge
            badgeContent={cartCount > 0 ? cartCount : null}
            color="primary"
            sx={{ ml: 0.5, '& .MuiBadge-badge': { top: 4, right: 4, fontSize: '0.6rem', minWidth: 16, height: 16 } }}
          >
            <IconButton
              onClick={() => setShowProfile(v => !v)}
              aria-label="Profile menu"
              sx={{ p: 0.25, border: `1px solid ${C.line}`, borderRadius: '50%' }}
            >
              {user?.avatar_url ? (
                <Avatar src={user.avatar_url} alt={user.username} sx={{ width: 32, height: 32 }} />
              ) : (
                <Avatar sx={{ width: 32, height: 32, bgcolor: C.accent, fontWeight: 700, fontSize: '0.8rem' }}>
                  {user?.username?.charAt(0).toUpperCase() || 'U'}
                </Avatar>
              )}
            </IconButton>
          </Badge>
        </Stack>
      </Box>

      <ProfileDropdown isOpen={showProfile} onClose={() => setShowProfile(false)} />
    </>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/layout/__tests__/TopNavBar.test.tsx`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/TopNavBar.tsx src/components/layout/__tests__/TopNavBar.test.tsx
git commit -m "feat(layout): add full-width TopNavBar with logo, search, user actions"
```

---

### Task 4: Build collapsible SideNav

**Files:**
- Create: `src/components/layout/SideNav.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/layout/__tests__/SideNav.test.tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SideNav from '../SideNav';

test('renders all primary nav items when expanded', () => {
  render(<MemoryRouter><SideNav collapsed={false} /></MemoryRouter>);
  expect(screen.getByText('Home')).toBeInTheDocument();
  expect(screen.getByText('Packs')).toBeInTheDocument();
  expect(screen.getByText('Live Breaks')).toBeInTheDocument();
  expect(screen.getByText('Marketplace')).toBeInTheDocument();
  expect(screen.getByText('Leaderboard')).toBeInTheDocument();
});

test('hides labels when collapsed', () => {
  render(<MemoryRouter><SideNav collapsed={true} /></MemoryRouter>);
  // Labels exist but are visually hidden via sr-only — assert via aria-label on the link instead
  const links = screen.getAllByRole('link');
  expect(links.some(a => a.getAttribute('aria-label') === 'Home')).toBe(true);
});

test('renders Submit my comics CTA when expanded', () => {
  render(<MemoryRouter><SideNav collapsed={false} /></MemoryRouter>);
  expect(screen.getByRole('button', { name: /submit my comics/i })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/layout/__tests__/SideNav.test.tsx`
Expected: FAIL with module not found

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/components/layout/SideNav.tsx
import { NavLink, useNavigate } from 'react-router-dom';
import { Box } from '@mui/material';
import { sideNavPrimary, sideNavEvents } from './sideNavConfig';
import { C, easing, fonts, layout } from '../../theme/conceptCTokens';

interface SideNavProps {
  collapsed: boolean;
}

export default function SideNav({ collapsed }: SideNavProps) {
  const navigate = useNavigate();
  const width = collapsed ? layout.sideWidthCollapsed : layout.sideWidthOpen;

  const renderItem = (item: typeof sideNavPrimary[number]) => {
    const Icon = item.icon;
    return (
      <NavLink
        key={item.route}
        to={item.route}
        end={item.route === '/'}
        aria-label={item.label}
        style={({ isActive }) => ({
          textDecoration: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: 11,
          padding: '9px 10px',
          borderRadius: 8,
          color: isActive ? C.sideActiveInk : C.sideInkSoft,
          background: isActive ? C.sideActiveBg : 'transparent',
          fontSize: '0.86rem',
          fontWeight: isActive ? 600 : 500,
          fontFamily: fonts.display,
          transition: `background 180ms ${easing.out}, color 180ms ${easing.out}, transform 160ms ${easing.out}`,
          justifyContent: collapsed ? 'center' : 'flex-start',
        })}
      >
        <Icon size={18} />
        {!collapsed && <span>{item.label}</span>}
      </NavLink>
    );
  };

  return (
    <Box
      component="aside"
      sx={{
        position: 'fixed',
        top: layout.navHeight,
        left: 0, bottom: 0,
        width,
        bgcolor: C.sideBg,
        color: C.sideInk,
        borderRight: `1px solid ${C.sideLine}`,
        padding: '20px 14px 16px',
        display: 'flex',
        flexDirection: 'column',
        transition: `width 220ms ${easing.out}`,
        zIndex: 1050,
        fontFamily: fonts.display,
        overflow: 'hidden',
        '& a:hover': { background: C.sideHover, color: C.sideInk },
        '& a:active': { transform: 'scale(0.985)' },
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, flex: 1 }}>
        {sideNavPrimary.map(renderItem)}

        {!collapsed && (
          <Box sx={{
            mt: 2.25, mb: 0.75, mx: 1,
            color: C.sideInkSoft,
            fontSize: '0.66rem', fontWeight: 700,
            letterSpacing: '0.12em', textTransform: 'uppercase',
            opacity: 0.7,
          }}>
            Events
          </Box>
        )}
        {sideNavEvents.map(renderItem)}
      </Box>

      {!collapsed && (
        <Box sx={{ mt: 'auto', pt: 1.75 }}>
          <Box
            component="button"
            onClick={() => navigate('/sell/list-item')}
            sx={{
              width: '100%',
              background: C.accent,
              color: '#fff',
              border: 'none',
              padding: '11px 14px',
              borderRadius: '9px',
              fontFamily: fonts.display,
              fontWeight: 700, fontSize: '0.84rem',
              cursor: 'pointer',
              boxShadow: '0 6px 18px rgba(232,44,44,0.28)',
              transition: `background 180ms ${easing.out}, transform 160ms ${easing.out}, box-shadow 180ms ${easing.out}`,
              '&:hover': { background: C.accentDeep, boxShadow: '0 8px 22px rgba(232,44,44,0.36)' },
              '&:active': { transform: 'scale(0.97)' },
            }}
          >
            Submit my comics
          </Box>
        </Box>
      )}
    </Box>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/layout/__tests__/SideNav.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/SideNav.tsx src/components/layout/__tests__/SideNav.test.tsx
git commit -m "feat(layout): add collapsible SideNav with sticky CTA"
```

---

### Task 5: Build DashboardLayout shell with persisted collapse state

**Files:**
- Create: `src/components/layout/DashboardLayout.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/layout/__tests__/DashboardLayout.test.tsx
import { render, screen, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DashboardLayout from '../DashboardLayout';

beforeEach(() => localStorage.clear());

test('renders TopNavBar + SideNav + children', () => {
  render(
    <MemoryRouter>
      <DashboardLayout>
        <div data-testid="child">Content</div>
      </DashboardLayout>
    </MemoryRouter>
  );
  expect(screen.getByText(/InkStash/i)).toBeInTheDocument();
  expect(screen.getByText('Home')).toBeInTheDocument();
  expect(screen.getByTestId('child')).toBeInTheDocument();
});

test('toggle button persists collapse state to localStorage', () => {
  render(
    <MemoryRouter>
      <DashboardLayout><div /></DashboardLayout>
    </MemoryRouter>
  );
  const btn = screen.getByRole('button', { name: /toggle sidebar/i });
  act(() => btn.click());
  expect(localStorage.getItem('sidenav.collapsed')).toBe('true');
  act(() => btn.click());
  expect(localStorage.getItem('sidenav.collapsed')).toBe('false');
});

test('initial collapsed state read from localStorage', () => {
  localStorage.setItem('sidenav.collapsed', 'true');
  render(
    <MemoryRouter>
      <DashboardLayout><div /></DashboardLayout>
    </MemoryRouter>
  );
  // When collapsed, the Submit CTA is not rendered
  expect(screen.queryByRole('button', { name: /submit my comics/i })).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/layout/__tests__/DashboardLayout.test.tsx`
Expected: FAIL with module not found

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/components/layout/DashboardLayout.tsx
import { ReactNode, useState, useEffect, useCallback } from 'react';
import { Box } from '@mui/material';
import TopNavBar from './TopNavBar';
import SideNav from './SideNav';
import { C, easing, layout, fonts } from '../../theme/conceptCTokens';

const LS_KEY = 'sidenav.collapsed';

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(LS_KEY) === 'true';
  });

  useEffect(() => {
    localStorage.setItem(LS_KEY, String(collapsed));
  }, [collapsed]);

  const toggle = useCallback(() => setCollapsed(c => !c), []);

  const sideWidth = collapsed ? layout.sideWidthCollapsed : layout.sideWidthOpen;

  return (
    <Box sx={{ minHeight: '100dvh', bgcolor: C.bg, color: C.ink, fontFamily: fonts.display }}>
      <TopNavBar onToggleSidebar={toggle} />
      <SideNav collapsed={collapsed} />
      <Box
        component="main"
        sx={{
          pt: `${layout.navHeight}px`,
          pl: { xs: 0, md: `${sideWidth}px` },
          transition: `padding-left 220ms ${easing.out}`,
          minHeight: '100dvh',
        }}
      >
        <Box sx={{ maxWidth: layout.contentMaxWidth, mx: 'auto', px: { xs: 2, md: 4 }, py: { xs: 2.5, md: 3 } }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/layout/__tests__/DashboardLayout.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/DashboardLayout.tsx src/components/layout/__tests__/DashboardLayout.test.tsx
git commit -m "feat(layout): add DashboardLayout shell with persisted sidebar collapse"
```

---

### Task 6: Build HeroCarousel component

**Files:**
- Create: `src/components/home/HeroCarousel.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/home/__tests__/HeroCarousel.test.tsx
import { render, screen, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import HeroCarousel from '../HeroCarousel';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

test('renders first slide title by default', () => {
  render(<MemoryRouter><HeroCarousel countdown={{ h: '02', m: '34', s: '11' }} /></MemoryRouter>);
  expect(screen.getByText(/Modern/)).toBeInTheDocument();
  expect(screen.getByText(/Keys/)).toBeInTheDocument();
});

test('renders 3 navigation dots', () => {
  render(<MemoryRouter><HeroCarousel countdown={{ h: '02', m: '34', s: '11' }} /></MemoryRouter>);
  const dots = screen.getAllByRole('button', { name: /slide/i });
  expect(dots).toHaveLength(3);
});

test('clicking dot 2 switches active slide', () => {
  render(<MemoryRouter><HeroCarousel countdown={{ h: '02', m: '34', s: '11' }} /></MemoryRouter>);
  act(() => screen.getByRole('button', { name: 'Slide 2' }).click());
  expect(screen.getByText(/Golden Age/i)).toBeInTheDocument();
});

test('auto-advances every 5.2 seconds', () => {
  render(<MemoryRouter><HeroCarousel countdown={{ h: '02', m: '34', s: '11' }} /></MemoryRouter>);
  expect(screen.getByText(/Modern/)).toBeInTheDocument();
  act(() => { vi.advanceTimersByTime(5200); });
  expect(screen.getByText(/Golden Age/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/home/__tests__/HeroCarousel.test.tsx`
Expected: FAIL with module not found

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/components/home/HeroCarousel.tsx
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button } from '@mui/material';
import { C, easing, fonts } from '../../theme/conceptCTokens';

interface Countdown { h: string; m: string; s: string; }
interface HeroCarouselProps { countdown: Countdown; }

type Slide = {
  eyebrow: string;
  eyebrowColor: 'red' | 'amber' | 'cobalt';
  title: string;
  titleEm: string;
  sub: string;
  primaryCta: string;
  primaryRoute: string;
  ghostCta: string;
  ghostRoute: string;
  slabs: { grade: string; cover: string; issue: string; gradient: string; gold?: boolean }[];
};

const buildSlides = (cd: Countdown): Slide[] => [
  {
    eyebrow: `Monday Drop · Live in ${cd.h}:${cd.m}:${cd.s}`,
    eyebrowColor: 'red',
    title: 'Modern', titleEm: 'Keys',
    sub: 'Slabbed first appearances from the 2010s — every pack guarantees a CGC 9.6+ key. $69 a rip.',
    primaryCta: 'Rip a pack', primaryRoute: '/packs',
    ghostCta: 'See odds', ghostRoute: '/packs',
    slabs: [
      { grade: '9.8', cover: 'VENOM',     issue: '#1',   gradient: 'linear-gradient(160deg,#1a4fc4 0%,#0a1e54 65%,#000 100%)' },
      { grade: '9.9', cover: 'DAREDEVIL', issue: '#181', gradient: 'linear-gradient(155deg,#e82c2c 0%,#7a0f0f 60%,#1a0606 100%)', gold: true },
      { grade: '9.6', cover: 'X-MEN',     issue: '#266', gradient: 'linear-gradient(165deg,#f59e0b 0%,#9a4d04 55%,#1a0d02 100%)' },
    ],
  },
  {
    eyebrow: 'Live now · 412 watching',
    eyebrowColor: 'amber',
    title: 'Golden Age', titleEm: 'Break',
    sub: 'Pre-code horror, Atlas weirds, Timely capes. One box, twelve buyers, no reserves.',
    primaryCta: 'Watch live', primaryRoute: '/live',
    ghostCta: 'Open slot', ghostRoute: '/live',
    slabs: [
      { grade: '7.0', cover: 'TALES',     issue: '#27', gradient: 'linear-gradient(160deg,#c46f1b,#5a2d05)' },
      { grade: '8.5', cover: 'DETECTIVE', issue: '#38', gradient: 'linear-gradient(155deg,#1a4fc4,#0a1e54)', gold: true },
      { grade: '6.5', cover: 'CAPTAIN',   issue: '#1',  gradient: 'linear-gradient(165deg,#e82c2c,#5a0606)' },
    ],
  },
  {
    eyebrow: 'Friday raffle · 248 entries',
    eyebrowColor: 'cobalt',
    title: 'Spider-Verse', titleEm: 'Vault',
    sub: 'Win an ASM #300 CGC 9.8 plus a slab of every 1st Spider villain. Tickets $5.',
    primaryCta: 'Enter raffle', primaryRoute: '/raffles',
    ghostCta: 'View prizes', ghostRoute: '/raffles',
    slabs: [
      { grade: '9.4', cover: 'ASM',   issue: '#252', gradient: 'linear-gradient(160deg,#1a4fc4,#0a1e54)' },
      { grade: '9.8', cover: 'ASM',   issue: '#300', gradient: 'linear-gradient(155deg,#e82c2c,#5a0606)', gold: true },
      { grade: '9.6', cover: 'VENOM', issue: '#1',   gradient: 'linear-gradient(165deg,#0a0a0a,#3a3a3a)' },
    ],
  },
];

const eyebrowColors = {
  red:    { bg: 'rgba(232,44,44,0.10)', border: 'rgba(232,44,44,0.22)', ink: C.accent },
  amber:  { bg: 'rgba(245,158,11,0.10)', border: 'rgba(245,158,11,0.25)', ink: C.amber  },
  cobalt: { bg: 'rgba(26,79,196,0.10)',  border: 'rgba(26,79,196,0.25)',  ink: C.cobalt },
} as const;

export default function HeroCarousel({ countdown }: HeroCarouselProps) {
  const navigate = useNavigate();
  const [idx, setIdx] = useState(0);
  const pausedRef = useRef(false);

  const slides = buildSlides(countdown);

  useEffect(() => {
    const id = setInterval(() => {
      if (!pausedRef.current) setIdx(i => (i + 1) % slides.length);
    }, 5200);
    return () => clearInterval(id);
  }, [slides.length]);

  return (
    <Box
      onMouseEnter={() => { pausedRef.current = true; }}
      onMouseLeave={() => { pausedRef.current = false; }}
      sx={{
        position: 'relative',
        borderRadius: '16px',
        overflow: 'hidden',
        border: `1px solid ${C.line}`,
        background: `
          radial-gradient(ellipse 70% 60% at 85% 50%, rgba(26,79,196,0.12) 0%, transparent 60%),
          linear-gradient(135deg, ${C.bgElev} 0%, ${C.bgSub} 100%)
        `,
        aspectRatio: '2.6 / 1',
        minHeight: 280,
      }}
    >
      {slides.map((slide, i) => {
        const active = i === idx;
        const eb = eyebrowColors[slide.eyebrowColor];
        return (
          <Box
            key={i}
            sx={{
              position: 'absolute', inset: 0,
              display: { xs: 'flex', md: 'grid' },
              flexDirection: { xs: 'column', md: 'unset' },
              gridTemplateColumns: { md: 'minmax(0, 1fr) minmax(0, 1.05fr)' },
              alignItems: 'center',
              padding: { xs: '22px', md: '36px 44px' },
              opacity: active ? 1 : 0,
              transform: active ? 'scale(1)' : 'scale(0.985)',
              filter: active ? 'blur(0)' : 'blur(4px)',
              pointerEvents: active ? 'auto' : 'none',
              transition: `opacity 420ms ${easing.outSoft}, transform 520ms ${easing.outSoft}, filter 420ms ${easing.outSoft}`,
            }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', maxWidth: 380 }}>
              <Box sx={{
                display: 'inline-flex', alignItems: 'center', gap: 0.9,
                alignSelf: 'flex-start',
                bgcolor: eb.bg, border: `1px solid ${eb.border}`, color: eb.ink,
                px: 1.4, py: 0.6, borderRadius: '999px',
                fontFamily: fonts.mono, fontSize: '0.66rem', fontWeight: 600,
                letterSpacing: '0.04em', mb: 2.25,
              }}>
                <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: eb.ink, animation: 'cd-pulse 1.6s ease-in-out infinite' }} />
                {slide.eyebrow}
              </Box>

              <Box sx={{
                fontFamily: fonts.display, fontWeight: 800,
                fontSize: 'clamp(2.4rem, 4.4vw, 3.6rem)',
                lineHeight: 0.96, letterSpacing: '-0.035em',
                color: C.ink, mb: 1.75,
              }}>
                {slide.title}{' '}
                <Box component="em" sx={{ fontStyle: 'italic', color: C.accent, fontWeight: 800 }}>{slide.titleEm}</Box>
              </Box>

              <Box sx={{ color: C.inkSoft, fontSize: '0.94rem', lineHeight: 1.55, mb: 2.75, maxWidth: 340 }}>
                {slide.sub}
              </Box>

              <Box sx={{ display: 'flex', gap: 1.25, flexWrap: 'wrap' }}>
                <Button
                  onClick={() => navigate(slide.primaryRoute)}
                  sx={{
                    bgcolor: C.ink, color: C.bg, textTransform: 'none',
                    px: 2.75, py: 1.5, borderRadius: '10px',
                    fontFamily: fonts.display, fontWeight: 700, fontSize: '0.88rem',
                    transition: `transform 160ms ${easing.out}`,
                    '&:hover': { bgcolor: C.ink, boxShadow: '0 8px 22px rgba(20,17,13,0.18)' },
                    '&:active': { transform: 'scale(0.97)' },
                  }}
                >{slide.primaryCta}</Button>
                <Button
                  onClick={() => navigate(slide.ghostRoute)}
                  sx={{
                    bgcolor: 'transparent', color: C.ink,
                    border: `1px solid ${C.lineStrong}`,
                    textTransform: 'none',
                    px: 2.75, py: 1.5, borderRadius: '10px',
                    fontFamily: fonts.display, fontWeight: 600, fontSize: '0.88rem',
                    '&:hover': { bgcolor: C.bgSub, borderColor: C.inkMute },
                    '&:active': { transform: 'scale(0.97)' },
                  }}
                >{slide.ghostCta}</Button>
              </Box>
            </Box>

            <Box sx={{ position: 'relative', height: '100%', display: { xs: 'none', md: 'flex' }, alignItems: 'center', justifyContent: 'center' }}>
              {slide.slabs.map((slab, si) => {
                const isBack   = si === 0;
                const isCenter = si === 1;
                const transform =
                  isBack   ? 'translateX(-110px) translateY(8px) rotate(-9deg)' :
                  isCenter ? 'translateY(-4px) rotate(-1.5deg)' :
                             'translateX(110px) translateY(8px) rotate(9deg)';
                return (
                  <Box key={si} sx={{
                    position: 'absolute',
                    width: 130, aspectRatio: '0.72',
                    borderRadius: '8px',
                    bgcolor: C.bgElev,
                    border: `1px solid ${C.lineStrong}`,
                    padding: '8px 8px 6px',
                    boxShadow: isCenter
                      ? '0 28px 60px rgba(0,0,0,0.28), 0 6px 18px rgba(232,44,44,0.18)'
                      : '0 20px 50px rgba(0,0,0,0.22), 0 4px 12px rgba(0,0,0,0.12)',
                    display: 'flex', flexDirection: 'column', gap: 0.6,
                    zIndex: isCenter ? 3 : 1,
                    opacity: isBack ? 0.85 : isCenter ? 1 : 0.95,
                    transform,
                    transition: `transform 480ms ${easing.outSoft}`,
                  }}>
                    <Box sx={{
                      fontFamily: fonts.mono, fontSize: '0.6rem',
                      color: slab.gold ? C.amber : C.inkSoft,
                      textAlign: 'center', letterSpacing: '0.06em', padding: '2px 0',
                      background: slab.gold ? 'linear-gradient(90deg, transparent, rgba(245,158,11,0.15), transparent)' : 'transparent',
                      borderRadius: '4px',
                    }}>
                      CGC <Box component="b" sx={{ color: slab.gold ? C.amber : C.ink, fontWeight: 700 }}>{slab.grade}</Box>
                    </Box>
                    <Box sx={{
                      flex: 1, borderRadius: '4px',
                      padding: '12px 10px',
                      display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                      color: '#fff', position: 'relative', overflow: 'hidden',
                      background: slab.gradient,
                      '&::after': {
                        content: '""', position: 'absolute', inset: 0,
                        background: 'radial-gradient(ellipse at 30% 0%, rgba(255,255,255,0.18), transparent 55%)',
                      },
                    }}>
                      <Box sx={{
                        fontFamily: fonts.display, fontWeight: 900,
                        fontSize: '0.88rem', letterSpacing: '-0.02em', lineHeight: 1,
                        textShadow: '0 2px 4px rgba(0,0,0,0.4)',
                      }}>{slab.cover}</Box>
                      <Box sx={{
                        fontFamily: fonts.mono, fontSize: '1.4rem', fontWeight: 800,
                        letterSpacing: '-0.02em', alignSelf: 'flex-end',
                        textShadow: '0 2px 6px rgba(0,0,0,0.5)',
                      }}>{slab.issue}</Box>
                    </Box>
                  </Box>
                );
              })}
            </Box>
          </Box>
        );
      })}

      <Box sx={{
        position: 'absolute', bottom: 20, left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex', gap: 0.9,
        zIndex: 5,
      }}>
        {slides.map((_, i) => (
          <Box
            key={i}
            component="button"
            role="button"
            aria-label={`Slide ${i + 1}`}
            onClick={() => setIdx(i)}
            sx={{
              width: i === idx ? 22 : 7, height: 7,
              borderRadius: i === idx ? '4px' : '50%',
              bgcolor: i === idx ? C.accent : C.inkMute,
              border: 'none', cursor: 'pointer', padding: 0,
              transition: `width 240ms ${easing.out}, background 200ms ${easing.out}`,
              '&:hover': { bgcolor: i === idx ? C.accent : C.inkSoft },
            }}
          />
        ))}
      </Box>

      <style>{`@keyframes cd-pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.25;transform:scale(0.6)} }`}</style>
    </Box>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/home/__tests__/HeroCarousel.test.tsx`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/home/HeroCarousel.tsx src/components/home/__tests__/HeroCarousel.test.tsx
git commit -m "feat(home): add 3-slide HeroCarousel with auto-advance and slabbed comic art"
```

---

### Task 7: Build JustPulledGrid component

**Files:**
- Create: `src/components/home/JustPulledGrid.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/home/__tests__/JustPulledGrid.test.tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import JustPulledGrid from '../JustPulledGrid';
import type { FeaturedAuction } from '../../../api/home';

const mock: FeaturedAuction[] = [
  { id: '1', title: 'Amazing Spider-Man #300', description: null, current_bid: 1200, buy_now_price: null, image_url: null, end_time: '', status: 'live', bid_count: 8, is_featured: true, category: 'comics', condition: 'CGC 9.8', seller_username: null, seller_avatar: null },
];

test('renders section header with link', () => {
  render(<MemoryRouter><JustPulledGrid items={mock} loading={false} error={false} /></MemoryRouter>);
  expect(screen.getByText('Just Pulled')).toBeInTheDocument();
  expect(screen.getByText(/Grab a pack/)).toBeInTheDocument();
});

test('renders each item title', () => {
  render(<MemoryRouter><JustPulledGrid items={mock} loading={false} error={false} /></MemoryRouter>);
  expect(screen.getByText('Amazing Spider-Man #300')).toBeInTheDocument();
});

test('shows skeleton when loading', () => {
  const { container } = render(<MemoryRouter><JustPulledGrid items={[]} loading={true} error={false} /></MemoryRouter>);
  expect(container.querySelectorAll('[data-testid="pull-skeleton"]')).toHaveLength(4);
});

test('shows empty state when no items and not loading', () => {
  render(<MemoryRouter><JustPulledGrid items={[]} loading={false} error={false} /></MemoryRouter>);
  expect(screen.getByText(/no recent pulls/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/home/__tests__/JustPulledGrid.test.tsx`
Expected: FAIL with module not found

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/components/home/JustPulledGrid.tsx
import { Link } from 'react-router-dom';
import { Box } from '@mui/material';
import type { FeaturedAuction } from '../../api/home';
import { C, easing, fonts } from '../../theme/conceptCTokens';

interface JustPulledGridProps {
  items: FeaturedAuction[];
  loading: boolean;
  error: boolean;
}

const GRADIENTS = [
  'linear-gradient(160deg,#e82c2c,#5a0606)',
  'linear-gradient(160deg,#1a4fc4,#0a1e54)',
  'linear-gradient(160deg,#f59e0b,#9a4d04)',
  'linear-gradient(160deg,#0a0a0a,#3a3a3a)',
];

export default function JustPulledGrid({ items, loading, error }: JustPulledGridProps) {
  return (
    <Box component="section" sx={{ mt: 5 }}>
      <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', mb: 2 }}>
        <Box component="h2" sx={{
          fontFamily: fonts.display, fontSize: '1.5rem', fontWeight: 800,
          letterSpacing: '-0.02em', color: C.ink, m: 0,
        }}>Just Pulled</Box>
        <Box component={Link} to="/packs" sx={{
          color: C.inkSoft, textDecoration: 'none',
          fontSize: '0.84rem', fontWeight: 600,
          transition: `color 180ms ${easing.out}`,
          '&:hover': { color: C.accent },
        }}>Grab a pack →</Box>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 1.75 }}>
        {loading && Array.from({ length: 4 }).map((_, i) => (
          <Box key={i} data-testid="pull-skeleton" sx={{
            bgcolor: C.bgElev, border: `1px solid ${C.line}`,
            borderRadius: '12px', padding: 1.75, height: 240,
          }} />
        ))}

        {!loading && !error && items.length === 0 && (
          <Box sx={{ gridColumn: '1 / -1', textAlign: 'center', color: C.inkMute, py: 4 }}>
            No recent pulls yet — open a pack to start your collection.
          </Box>
        )}

        {!loading && items.slice(0, 4).map((item, i) => (
          <Box key={item.id} sx={{
            bgcolor: C.bgElev, border: `1px solid ${C.line}`,
            borderRadius: '12px', padding: 1.75,
            display: 'flex', flexDirection: 'column', gap: 1.5,
            cursor: 'pointer',
            transition: `transform 220ms ${easing.out}, border-color 220ms ${easing.out}, box-shadow 220ms ${easing.out}`,
            '&:hover': { transform: 'translateY(-3px)', borderColor: C.lineStrong, boxShadow: '0 14px 36px rgba(20,17,13,0.08)' },
            '&:active': { transform: 'translateY(-1px) scale(0.99)' },
          }}>
            <Box sx={{
              aspectRatio: '0.78', borderRadius: '8px', padding: 1.5,
              display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
              color: '#fff', position: 'relative', overflow: 'hidden',
              background: GRADIENTS[i % GRADIENTS.length],
              '&::after': {
                content: '""', position: 'absolute', inset: 0,
                background: 'radial-gradient(ellipse at 30% 0%, rgba(255,255,255,0.18), transparent 55%)',
              },
            }}>
              <Box sx={{
                alignSelf: 'flex-end',
                fontFamily: fonts.mono, fontWeight: 800, fontSize: '0.84rem',
                bgcolor: 'rgba(0,0,0,0.45)', px: 1, py: 0.4, borderRadius: '4px',
              }}>{item.condition || '9.8'}</Box>
              <Box sx={{
                fontFamily: fonts.display, fontWeight: 900, fontSize: '1.4rem',
                letterSpacing: '-0.025em', textShadow: '0 2px 6px rgba(0,0,0,0.5)',
              }}>{item.title.split(' ').slice(0, 3).join(' ')}</Box>
            </Box>
            <Box>
              <Box sx={{ color: C.ink, fontWeight: 700, fontSize: '0.88rem', lineHeight: 1.3, mb: 0.5 }}>{item.title}</Box>
              <Box sx={{ color: C.inkMute, fontFamily: fonts.mono, fontSize: '0.7rem', letterSpacing: '0.02em' }}>
                {item.condition} · ${item.current_bid}
              </Box>
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/home/__tests__/JustPulledGrid.test.tsx`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/home/JustPulledGrid.tsx src/components/home/__tests__/JustPulledGrid.test.tsx
git commit -m "feat(home): add JustPulledGrid 4-up grid section with skeleton + empty states"
```

---

### Task 8: Build LiveBreaksRow component

**Files:**
- Create: `src/components/home/LiveBreaksRow.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/home/__tests__/LiveBreaksRow.test.tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LiveBreaksRow from '../LiveBreaksRow';
import type { LiveStream } from '../../../api/home';

const mock: LiveStream[] = [
  { id: '1', title: 'Silver Age Sunday Break', thumbnail_url: null, current_viewers: 312, is_live: true, status: 'live', seller_id: '', seller_username: 'silveragedan', seller_avatar: null, scheduled_start_time: null },
];

test('renders Live Breaks section title and CTA', () => {
  render(<MemoryRouter><LiveBreaksRow streams={mock} loading={false} error={false} /></MemoryRouter>);
  expect(screen.getByText('Live Breaks')).toBeInTheDocument();
  expect(screen.getByText(/See all streams/i)).toBeInTheDocument();
});

test('renders stream title', () => {
  render(<MemoryRouter><LiveBreaksRow streams={mock} loading={false} error={false} /></MemoryRouter>);
  expect(screen.getByText('Silver Age Sunday Break')).toBeInTheDocument();
});

test('shows viewer count for live streams', () => {
  render(<MemoryRouter><LiveBreaksRow streams={mock} loading={false} error={false} /></MemoryRouter>);
  expect(screen.getByText(/312/)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/home/__tests__/LiveBreaksRow.test.tsx`
Expected: FAIL with module not found

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/components/home/LiveBreaksRow.tsx
import { Link, useNavigate } from 'react-router-dom';
import { Box } from '@mui/material';
import type { LiveStream } from '../../api/home';
import { C, easing, fonts } from '../../theme/conceptCTokens';

interface LiveBreaksRowProps {
  streams: LiveStream[];
  loading: boolean;
  error: boolean;
}

const GRADIENTS = [
  'linear-gradient(165deg,#1a4fc4,#0a1e54)',
  'linear-gradient(165deg,#e82c2c,#5a0606)',
  'linear-gradient(165deg,#0a0a0a,#3a3a3a)',
  'linear-gradient(165deg,#f59e0b,#9a4d04)',
];

export default function LiveBreaksRow({ streams, loading, error }: LiveBreaksRowProps) {
  const navigate = useNavigate();

  return (
    <Box component="section" sx={{ mt: 5 }}>
      <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', mb: 2 }}>
        <Box component="h2" sx={{
          fontFamily: fonts.display, fontSize: '1.5rem', fontWeight: 800,
          letterSpacing: '-0.02em', color: C.ink, m: 0,
        }}>Live Breaks</Box>
        <Box component={Link} to="/live" sx={{
          color: C.inkSoft, textDecoration: 'none', fontSize: '0.84rem', fontWeight: 600,
          transition: `color 180ms ${easing.out}`,
          '&:hover': { color: C.accent },
        }}>See all streams →</Box>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 1.75 }}>
        {loading && Array.from({ length: 4 }).map((_, i) => (
          <Box key={i} sx={{ bgcolor: C.bgElev, border: `1px solid ${C.line}`, borderRadius: '12px', height: 220 }} />
        ))}

        {!loading && !error && streams.length === 0 && (
          <Box sx={{ gridColumn: '1 / -1', textAlign: 'center', color: C.inkMute, py: 4 }}>
            No live streams right now — check back soon.
          </Box>
        )}

        {!loading && streams.slice(0, 4).map((s, i) => (
          <Box
            key={s.id}
            onClick={() => navigate(`/live/${s.id}`)}
            sx={{
              bgcolor: C.bgElev, border: `1px solid ${C.line}`,
              borderRadius: '12px', overflow: 'hidden',
              cursor: 'pointer',
              transition: `transform 220ms ${easing.out}, border-color 220ms ${easing.out}, box-shadow 220ms ${easing.out}`,
              '&:hover': { transform: 'translateY(-3px)', borderColor: C.lineStrong, boxShadow: '0 14px 36px rgba(20,17,13,0.08)' },
            }}
          >
            <Box sx={{
              aspectRatio: '9 / 16', maxHeight: 200,
              background: GRADIENTS[i % GRADIENTS.length],
              position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
              padding: 1.25, color: '#fff',
            }}>
              {s.is_live && (
                <Box sx={{
                  alignSelf: 'flex-start',
                  display: 'inline-flex', alignItems: 'center', gap: 0.6,
                  bgcolor: C.accent, color: '#fff',
                  px: 1, py: 0.3, borderRadius: '999px',
                  fontFamily: fonts.mono, fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.06em',
                }}>
                  <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: '#fff', animation: 'cd-pulse 1.6s ease-in-out infinite' }} />
                  LIVE
                </Box>
              )}
              <Box sx={{
                alignSelf: 'flex-end',
                bgcolor: 'rgba(0,0,0,0.5)', fontFamily: fonts.mono,
                fontSize: '0.72rem', fontWeight: 700,
                px: 0.85, py: 0.3, borderRadius: '4px',
              }}>{s.current_viewers.toLocaleString()} watching</Box>
            </Box>
            <Box sx={{ padding: 1.5 }}>
              <Box sx={{ color: C.ink, fontWeight: 700, fontSize: '0.86rem', lineHeight: 1.3, mb: 0.5 }}>{s.title}</Box>
              <Box sx={{ color: C.inkMute, fontFamily: fonts.mono, fontSize: '0.7rem' }}>
                @{s.seller_username || 'unknown'}
              </Box>
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/home/__tests__/LiveBreaksRow.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/home/LiveBreaksRow.tsx src/components/home/__tests__/LiveBreaksRow.test.tsx
git commit -m "feat(home): add LiveBreaksRow 4-up portrait stream cards"
```

---

### Task 9: Build TrendingList component

**Files:**
- Create: `src/components/home/TrendingList.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/home/__tests__/TrendingList.test.tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import TrendingList from '../TrendingList';
import type { TrendingAuction } from '../../../api/home';

const mock: TrendingAuction[] = [
  { id: '1', title: 'ASM #300 CGC 9.8', current_bid: 1450, starting_bid: 800, image_url: null, end_time: '', status: 'live', bid_count: 12, category: 'comics', seller_username: 'keysguy' },
  { id: '2', title: 'X-Men #266 CGC 9.6', current_bid: 620, starting_bid: 300, image_url: null, end_time: '', status: 'live', bid_count: 7,  category: 'comics', seller_username: 'gambitfan' },
];

test('renders Trending This Week heading + link', () => {
  render(<MemoryRouter><TrendingList items={mock} loading={false} error={false} /></MemoryRouter>);
  expect(screen.getByText(/Trending This Week/i)).toBeInTheDocument();
  expect(screen.getByText(/See marketplace/i)).toBeInTheDocument();
});

test('renders each trending item title and bid', () => {
  render(<MemoryRouter><TrendingList items={mock} loading={false} error={false} /></MemoryRouter>);
  expect(screen.getByText('ASM #300 CGC 9.8')).toBeInTheDocument();
  expect(screen.getByText(/\$1,?450/)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/home/__tests__/TrendingList.test.tsx`
Expected: FAIL with module not found

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/components/home/TrendingList.tsx
import { Link, useNavigate } from 'react-router-dom';
import { Box } from '@mui/material';
import type { TrendingAuction } from '../../api/home';
import { C, easing, fonts } from '../../theme/conceptCTokens';

interface TrendingListProps {
  items: TrendingAuction[];
  loading: boolean;
  error: boolean;
}

export default function TrendingList({ items, loading, error }: TrendingListProps) {
  const navigate = useNavigate();

  return (
    <Box component="section" sx={{ mt: 5 }}>
      <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', mb: 2 }}>
        <Box component="h2" sx={{
          fontFamily: fonts.display, fontSize: '1.5rem', fontWeight: 800,
          letterSpacing: '-0.02em', color: C.ink, m: 0,
        }}>Trending This Week</Box>
        <Box component={Link} to="/marketplace" sx={{
          color: C.inkSoft, textDecoration: 'none', fontSize: '0.84rem', fontWeight: 600,
          transition: `color 180ms ${easing.out}`,
          '&:hover': { color: C.accent },
        }}>See marketplace →</Box>
      </Box>

      <Box sx={{
        bgcolor: C.bgElev, border: `1px solid ${C.line}`,
        borderRadius: '12px', overflow: 'hidden',
      }}>
        {loading && Array.from({ length: 5 }).map((_, i) => (
          <Box key={i} sx={{ height: 56, borderBottom: i < 4 ? `1px solid ${C.line}` : 'none' }} />
        ))}

        {!loading && !error && items.length === 0 && (
          <Box sx={{ textAlign: 'center', color: C.inkMute, py: 4 }}>
            No trending data yet.
          </Box>
        )}

        {!loading && items.slice(0, 6).map((item, idx) => (
          <Box
            key={item.id}
            onClick={() => navigate(`/item/${item.id}`)}
            sx={{
              display: 'flex', alignItems: 'center', gap: 2,
              padding: '14px 18px',
              cursor: 'pointer',
              borderBottom: idx < items.slice(0, 6).length - 1 ? `1px solid ${C.line}` : 'none',
              transition: `background 180ms ${easing.out}`,
              '&:hover': { background: C.bgSub },
            }}
          >
            <Box sx={{
              fontFamily: fonts.mono, fontSize: '0.72rem', fontWeight: 700,
              color: C.inkMute, width: 24,
            }}>{String(idx + 1).padStart(2, '0')}</Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Box sx={{
                color: C.ink, fontWeight: 700, fontSize: '0.88rem', lineHeight: 1.3,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{item.title}</Box>
              <Box sx={{ color: C.inkMute, fontFamily: fonts.mono, fontSize: '0.7rem' }}>
                {item.bid_count} bids · @{item.seller_username || 'unknown'}
              </Box>
            </Box>
            <Box sx={{
              fontFamily: fonts.mono, fontWeight: 800, fontSize: '0.92rem',
              color: C.accent,
            }}>${item.current_bid.toLocaleString()}</Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/home/__tests__/TrendingList.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/home/TrendingList.tsx src/components/home/__tests__/TrendingList.test.tsx
git commit -m "feat(home): add TrendingList vertical list with rank, bid, and seller"
```

---

### Task 10: Build DiscoverRow component

**Files:**
- Create: `src/components/home/DiscoverRow.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/home/__tests__/DiscoverRow.test.tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DiscoverRow from '../DiscoverRow';

test('renders Discover heading and 3 cards', () => {
  render(<MemoryRouter><DiscoverRow /></MemoryRouter>);
  expect(screen.getByText('Discover')).toBeInTheDocument();
  expect(screen.getByText(/Get the app/i)).toBeInTheDocument();
  expect(screen.getByText(/Vault/i)).toBeInTheDocument();
  expect(screen.getByText(/Got an idea/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/home/__tests__/DiscoverRow.test.tsx`
Expected: FAIL with module not found

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/components/home/DiscoverRow.tsx
import { Link } from 'react-router-dom';
import { Box } from '@mui/material';
import { C, easing, fonts } from '../../theme/conceptCTokens';

const cards = [
  {
    title: 'Get the app',
    body: 'Rip packs and watch breaks from anywhere. iOS & Android.',
    to: '/app',
    art: 'app' as const,
  },
  {
    title: "Vault, don't ship",
    body: "Store slabs directly from CGC, CBCS, and eBay. Trade without touching them.",
    to: '/vault',
    art: 'vault' as const,
  },
  {
    title: 'Got an idea?',
    body: 'We build what collectors actually want. Tell us what to ship next.',
    to: '/feedback',
    art: 'feedback' as const,
  },
];

function DiscoverArt({ kind }: { kind: 'app' | 'vault' | 'feedback' }) {
  if (kind === 'app') {
    return (
      <Box sx={{
        aspectRatio: '16 / 9',
        background: 'radial-gradient(ellipse at center, #2a2a2a 0%, #0a0a0a 70%)',
        display: 'grid', placeItems: 'center',
      }}>
        <Box sx={{ width: 60, height: 110, bgcolor: '#1a1a1a', border: '2px solid #2a2a2a', borderRadius: '9px', padding: '5px', boxShadow: '0 10px 28px rgba(0,0,0,0.55)' }}>
          <Box sx={{ width: '100%', height: '100%', background: `linear-gradient(160deg, ${C.accent}, ${C.cobalt})`, borderRadius: '4px' }} />
        </Box>
      </Box>
    );
  }
  if (kind === 'vault') {
    return (
      <Box sx={{
        aspectRatio: '16 / 9',
        background: 'linear-gradient(180deg, #1a1612 0%, #0a0805 100%)',
        padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: '6px',
      }}>
        {[
          `linear-gradient(160deg, ${C.cobalt}, #0a1e54)`,
          `linear-gradient(160deg, ${C.accent}, #5a0606)`,
          `linear-gradient(160deg, ${C.amber}, #9a4d04)`,
        ].map((bg, ri) => (
          <Box key={ri} sx={{ display: 'flex', gap: '6px', flex: 1 }}>
            {Array.from({ length: 4 }).map((_, ci) => (
              <Box key={ci} sx={{ flex: 1, background: bg, borderRadius: '3px', borderTop: '2px solid rgba(255,255,255,0.12)', opacity: 0.85 }} />
            ))}
          </Box>
        ))}
      </Box>
    );
  }
  return (
    <Box sx={{
      aspectRatio: '16 / 9',
      background: 'radial-gradient(ellipse at center, #f5f0e8 0%, #d8d2c4 100%)',
      position: 'relative',
    }}>
      <Box sx={{ position: 'absolute', left: '32%', top: '32%', width: 44, height: 44, borderRadius: '50%', display: 'grid', placeItems: 'center', bgcolor: C.accent, color: '#fff', fontFamily: fonts.display, fontWeight: 800, fontSize: '1.4rem', boxShadow: '0 8px 22px rgba(0,0,0,0.3)' }}>!</Box>
      <Box sx={{ position: 'absolute', right: '30%', top: '42%', width: 44, height: 44, borderRadius: '50%', display: 'grid', placeItems: 'center', bgcolor: C.cobalt, color: '#fff', fontFamily: fonts.display, fontWeight: 800, fontSize: '1.4rem', boxShadow: '0 8px 22px rgba(0,0,0,0.3)' }}>?</Box>
    </Box>
  );
}

export default function DiscoverRow() {
  return (
    <Box component="section" sx={{ mt: 5 }}>
      <Box sx={{ display: 'flex', alignItems: 'baseline', mb: 2 }}>
        <Box component="h2" sx={{ fontFamily: fonts.display, fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em', color: C.ink, m: 0 }}>Discover</Box>
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2 }}>
        {cards.map(card => (
          <Box
            key={card.title}
            component={Link}
            to={card.to}
            sx={{
              bgcolor: C.bgElev, border: `1px solid ${C.line}`,
              borderRadius: '14px', overflow: 'hidden',
              textDecoration: 'none', color: 'inherit',
              display: 'flex', flexDirection: 'column',
              transition: `transform 220ms ${easing.out}, border-color 220ms ${easing.out}, box-shadow 220ms ${easing.out}`,
              '&:hover': { transform: 'translateY(-3px)', borderColor: C.lineStrong, boxShadow: '0 16px 40px rgba(20,17,13,0.08)' },
            }}
          >
            <DiscoverArt kind={card.art} />
            <Box sx={{ padding: '16px 18px 20px' }}>
              <Box component="h3" sx={{ fontFamily: fonts.display, fontWeight: 700, fontSize: '1.05rem', color: C.ink, mb: 0.75, letterSpacing: '-0.015em', m: 0 }}>{card.title}</Box>
              <Box component="p" sx={{ color: C.inkSoft, fontSize: '0.84rem', lineHeight: 1.5, m: 0 }}>{card.body}</Box>
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/home/__tests__/DiscoverRow.test.tsx`
Expected: PASS (1 test, 4 assertions)

- [ ] **Step 5: Commit**

```bash
git add src/components/home/DiscoverRow.tsx src/components/home/__tests__/DiscoverRow.test.tsx
git commit -m "feat(home): add DiscoverRow 3-up editorial promo cards"
```

---

### Task 11: Build HomeFooter component

**Files:**
- Create: `src/components/home/HomeFooter.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/home/__tests__/HomeFooter.test.tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import HomeFooter from '../HomeFooter';

test('renders link columns and copyright', () => {
  render(<MemoryRouter><HomeFooter /></MemoryRouter>);
  expect(screen.getByText('Home')).toBeInTheDocument();
  expect(screen.getByText('About')).toBeInTheDocument();
  expect(screen.getByText('Privacy')).toBeInTheDocument();
  expect(screen.getByText(/InkStash/)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/home/__tests__/HomeFooter.test.tsx`
Expected: FAIL with module not found

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/components/home/HomeFooter.tsx
import { Link } from 'react-router-dom';
import { Box } from '@mui/material';
import { C, easing, fonts } from '../../theme/conceptCTokens';

const col1 = [
  { label: 'Home', to: '/' },
  { label: 'About', to: '/about' },
  { label: 'Blog', to: '/blog' },
  { label: 'Help Center', to: '/help' },
];
const col2 = [
  { label: 'Contact', to: '/contact' },
  { label: 'Terms', to: '/terms' },
  { label: 'Privacy', to: '/privacy' },
];

export default function HomeFooter() {
  return (
    <Box component="footer" sx={{
      mt: 7, pt: 3.5,
      borderTop: `1px solid ${C.line}`,
      display: 'flex', justifyContent: 'space-between',
      flexWrap: 'wrap', gap: 2.75,
    }}>
      <Box sx={{ display: 'flex', gap: { xs: 4, md: 7.5 } }}>
        {[col1, col2].map((col, ci) => (
          <Box key={ci} sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {col.map(link => (
              <Box
                key={link.to}
                component={Link}
                to={link.to}
                sx={{
                  color: C.inkSoft, textDecoration: 'none',
                  fontSize: '0.84rem', fontWeight: 500,
                  transition: `color 160ms ${easing.out}`,
                  '&:hover': { color: C.ink },
                }}
              >{link.label}</Box>
            ))}
          </Box>
        ))}
      </Box>
      <Box sx={{
        color: C.inkMute, fontFamily: fonts.mono, fontSize: '0.72rem',
        display: 'flex', alignItems: 'center', gap: 1,
        alignSelf: 'flex-end',
      }}>
        <span>© 2026 InkStash</span>
        <Box sx={{ opacity: 0.5 }}>·</Box>
        <span>Made for collectors</span>
      </Box>
    </Box>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/home/__tests__/HomeFooter.test.tsx`
Expected: PASS (1 test, 4 assertions)

- [ ] **Step 5: Commit**

```bash
git add src/components/home/HomeFooter.tsx src/components/home/__tests__/HomeFooter.test.tsx
git commit -m "feat(home): add HomeFooter with link columns"
```

---

### Task 12: Rewrite Home.tsx to use new layout + sections

**Files:**
- Modify: `src/pages/Home.tsx` (full rewrite, keeping data hooks)

- [ ] **Step 1: Write the failing test**

```tsx
// src/pages/__tests__/Home.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Home from '../Home';

vi.mock('../../api/home', () => ({
  getLiveAndUpcomingStreams: vi.fn().mockResolvedValue([]),
  getTrendingAuctions:       vi.fn().mockResolvedValue([]),
  getFeaturedAuctions:       vi.fn().mockResolvedValue([]),
}));
vi.mock('../../api/dropsRaffles', () => ({
  dropsAPI: { getNextUpcoming: vi.fn().mockResolvedValue(null) },
}));
vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: { username: 'tester' }, isAuthenticated: true, loading: false }),
}));
vi.mock('../../contexts/CartContext', () => ({
  useCart: () => ({ getItemCount: () => 0 }),
}));

test('renders all home sections', async () => {
  render(<MemoryRouter><Home /></MemoryRouter>);
  await waitFor(() => {
    expect(screen.getByText('Just Pulled')).toBeInTheDocument();
    expect(screen.getByText('Live Breaks')).toBeInTheDocument();
    expect(screen.getByText(/Trending This Week/i)).toBeInTheDocument();
    expect(screen.getByText('Discover')).toBeInTheDocument();
  });
});

test('layout shell renders TopNavBar + SideNav', () => {
  render(<MemoryRouter><Home /></MemoryRouter>);
  expect(screen.getByText('InkStash')).toBeInTheDocument();
  expect(screen.getByText('Home')).toBeInTheDocument(); // sidebar
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/__tests__/Home.test.tsx`
Expected: FAIL because current Home renders `DashboardHeader` text, not "InkStash" wordmark inside `TopNavBar`, and is missing the new sections.

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/pages/Home.tsx
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import {
  getLiveAndUpcomingStreams,
  getTrendingAuctions,
  getFeaturedAuctions,
} from '../api/home';
import type { LiveStream, TrendingAuction, FeaturedAuction } from '../api/home';
import { dropsAPI } from '../api/dropsRaffles';
import type { Drop } from '../api/dropsRaffles';
import DashboardLayout from '../components/layout/DashboardLayout';
import HeroCarousel from '../components/home/HeroCarousel';
import JustPulledGrid from '../components/home/JustPulledGrid';
import LiveBreaksRow from '../components/home/LiveBreaksRow';
import TrendingList from '../components/home/TrendingList';
import DiscoverRow from '../components/home/DiscoverRow';
import HomeFooter from '../components/home/HomeFooter';
import OnboardingModal from '../components/onboarding/OnboardingModal';
import SplashPage from '../components/landing/SplashPage';

function useNextDrop(): Drop | null {
  const [drop, setDrop] = useState<Drop | null>(null);
  useEffect(() => {
    dropsAPI.getNextUpcoming().then(setDrop).catch(() => setDrop(null));
  }, []);
  return drop;
}

export default function Home() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);

  const [streams, setStreams] = useState<LiveStream[]>([]);
  const [trending, setTrending] = useState<TrendingAuction[]>([]);
  const [featured, setFeatured] = useState<FeaturedAuction[]>([]);
  const [loadingStreams, setLoadingStreams] = useState(true);
  const [loadingTrending, setLoadingTrending] = useState(true);
  const [loadingFeatured, setLoadingFeatured] = useState(true);
  const [errorStreams, setErrorStreams] = useState(false);
  const [errorTrending, setErrorTrending] = useState(false);
  const [errorFeatured, setErrorFeatured] = useState(false);

  const nextDrop = useNextDrop();
  const dropTarget = nextDrop?.drop_at ?? new Date(Date.now() + 9999 * 3600000).toISOString();
  const [dropSecs, setDropSecs] = useState(() => Math.max(0, Math.floor((new Date(dropTarget).getTime() - Date.now()) / 1000)));
  useEffect(() => {
    const id = setInterval(() => setDropSecs(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [dropTarget]);
  const countdown = {
    h: String(Math.floor(dropSecs / 3600)).padStart(2, '0'),
    m: String(Math.floor((dropSecs % 3600) / 60)).padStart(2, '0'),
    s: String(dropSecs % 60).padStart(2, '0'),
  };

  const loadData = useCallback(async () => {
    setLoadingStreams(true); setLoadingTrending(true); setLoadingFeatured(true);
    setErrorStreams(false);  setErrorTrending(false);  setErrorFeatured(false);
    const [sr, tr, fr] = await Promise.allSettled([
      getLiveAndUpcomingStreams(),
      getTrendingAuctions(),
      getFeaturedAuctions(),
    ]);
    if (sr.status === 'fulfilled') setStreams(sr.value); else setErrorStreams(true);
    setLoadingStreams(false);
    if (tr.status === 'fulfilled') setTrending(tr.value); else setErrorTrending(true);
    setLoadingTrending(false);
    if (fr.status === 'fulfilled') setFeatured(fr.value); else setErrorFeatured(true);
    setLoadingFeatured(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (!authLoading && user && !user.onboarding_completed) setShowOnboarding(true);
    else setShowOnboarding(false);
  }, [user, authLoading]);

  if (!authLoading && !isAuthenticated) return <SplashPage />;

  return (
    <DashboardLayout>
      <HeroCarousel countdown={countdown} />
      <JustPulledGrid items={featured} loading={loadingFeatured} error={errorFeatured} />
      <LiveBreaksRow streams={streams} loading={loadingStreams} error={errorStreams} />
      <TrendingList items={trending} loading={loadingTrending} error={errorTrending} />
      <DiscoverRow />
      <HomeFooter />
      <OnboardingModal open={showOnboarding} onClose={() => setShowOnboarding(false)} />
    </DashboardLayout>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/pages/__tests__/Home.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 5: Run typecheck and full test suite**

Run: `npx tsc --noEmit && npx vitest run`
Expected: TypeScript no errors, all tests pass

- [ ] **Step 6: Commit**

```bash
git add src/pages/Home.tsx src/pages/__tests__/Home.test.tsx
git commit -m "feat(home): port Home.tsx to Concept C editorial layout with all sections"
```

---

### Task 13: Visual QA in browser

**Files:** none (manual verification)

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```
Expected: Vite reports `Local: http://localhost:5173`

- [ ] **Step 2: Verify Home renders correctly**

Open `http://localhost:5173` in browser. Check:
- TopNavBar spans full width, has cream `#f5f0e8` background, contains hamburger + logo (red `◆` mark + InkStash wordmark) + search + bell/message/avatar
- SideNav sits below the navbar (top: 56px), is ink-black, shows 5 primary items + Events label + 2 sub-items + red "Submit my comics" CTA
- Hero carousel renders the "Modern Keys" slide with 3 slabbed comic cards floating right
- Carousel auto-advances every 5.2s; clicking a dot jumps; hovering pauses
- "Just Pulled" 4-up grid renders below hero (or empty state with the comic-niche message)
- "Live Breaks" 4-up portrait stream grid renders
- "Trending This Week" vertical list renders
- "Discover" 3-up cards render
- Footer renders at bottom

- [ ] **Step 3: Test sidebar collapse**

Click the hamburger button in the top navbar. Sidebar shrinks to 64px width, only icons visible, "Submit my comics" CTA disappears, main content area expands left to fill the gap.

Click it again — sidebar restores to 220px. Refresh the page — the collapsed/expanded state should persist (check `localStorage` key `sidenav.collapsed`).

- [ ] **Step 4: Test mobile**

In browser DevTools, switch to a 375px viewport. Sidebar should be hidden (main content has no left padding), hero collapses to single column, grids collapse to 2-up (Just Pulled) or 1-up (Discover).

- [ ] **Step 5: Check console for errors**

DevTools Console should be empty. Network tab should show successful calls to Supabase. No 404s for missing assets.

- [ ] **Step 6: Commit screenshot evidence (optional)**

```bash
# Take screenshots for the PR
# Save to /tmp/home-c-{desktop,mobile,collapsed}.png and reference in commit message if creating PR
```

---

### Task 14: Delete unused legacy files

**Files:**
- Delete: `src/components/home/DashboardHeader.tsx`
- Delete: `src/components/home/DashboardSidebar.tsx`

- [ ] **Step 1: Confirm no other files import the legacy components**

Run: `grep -r "DashboardHeader\|DashboardSidebar" src/ --include="*.tsx" --include="*.ts"`
Expected: No matches outside of the files being deleted themselves. If there are matches, update those files to use `DashboardLayout` instead before deleting.

- [ ] **Step 2: Delete legacy files**

Run: `git rm src/components/home/DashboardHeader.tsx src/components/home/DashboardSidebar.tsx`

- [ ] **Step 3: Run typecheck**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Run full test suite**

Run: `npx vitest run`
Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git commit -m "chore(home): remove unused DashboardHeader and DashboardSidebar"
```

---

## Self-Review Checklist

1. **Spec coverage:**
   - Logo in top navbar: ✓ Task 3 (TopNavBar)
   - Top navbar extends full screen width: ✓ Task 3 (`position: fixed; left: 0; right: 0`)
   - Sidebar under the navbar: ✓ Task 4 (`top: layout.navHeight`)
   - Sidebar is collapsible: ✓ Tasks 4 + 5 (state in DashboardLayout, toggle via TopNavBar hamburger, persist to localStorage)
   - Concept C design preserved: ✓ Tasks 6-11 (each section maps to Concept C markup)
   - Live Breaks section on homepage: ✓ Task 8
   - Trending This Week section on homepage: ✓ Task 9

2. **Placeholder scan:** No TBD, no "TODO", no "similar to Task N", no "add appropriate error handling" without code. All steps contain runnable code.

3. **Type consistency:**
   - `SideNav` props: `{ collapsed: boolean }` consistent across Tasks 4 + 5
   - `DashboardLayout` props: `{ children: ReactNode }` only
   - `TopNavBar` props: `{ onToggleSidebar: () => void }` consistent across Tasks 3 + 5
   - `HeroCarousel` props: `{ countdown: { h, m, s } }` consistent across Tasks 6 + 12
   - All section components: `{ items|streams, loading, error }` consistent across Tasks 7, 8, 9 and consumed correctly in Task 12

4. **Data flow:** Home.tsx Task 12 keeps the existing `loadData` callback and all three loading/error states; passes them to the three data-driven sections.
