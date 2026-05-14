import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Container, Typography, Button, Stack, Avatar, Skeleton, Chip, TextField, InputAdornment, IconButton, Alert, Divider } from '@mui/material';
import {
  Radio,
  TrendingUp,
  Package,
  Clock,
  Eye,
  EyeOff,
  Gavel,
  ChevronRight,
  Zap,
  AlertCircle,
  Lock,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../api/supabase/supabaseClient';
import { authManager } from '../api/auth/authManager';
import DashboardHeader from '../components/home/DashboardHeader';
import OnboardingModal from '../components/onboarding/OnboardingModal';
import {
  getLiveAndUpcomingStreams,
  getTrendingAuctions,
  getFeaturedAuctions,
} from '../api/home';
import type { LiveStream, TrendingAuction, FeaturedAuction } from '../api/home';
import { dropsAPI } from '../api/dropsRaffles';
import type { Drop } from '../api/dropsRaffles';

// ── Design tokens ─────────────────────────────────────────────────────────────
const T = {
  bg:        '#08080e',
  surface:   '#0f0f18',
  surfaceB:  '#141420',
  border:    'rgba(255,255,255,0.07)',
  borderLit: 'rgba(255,255,255,0.13)',
  blue:      '#0078FF',
  blueGlow:  'rgba(0,120,255,0.25)',
  live:      '#ef4444',
  gold:      '#d97706',
  green:     '#10b981',
  white:     '#f1f5f9',
  muted:     'rgba(241,245,249,0.5)',
  dimmed:    'rgba(241,245,249,0.22)',
  mono:      "'DM Mono', 'Courier New', monospace",
};

const BADGE_META: Record<string, { bg: string; fg: string }> = {
  COLLAB:     { bg: T.gold,                   fg: '#000' },
  HOT:        { bg: T.live,                   fg: '#fff' },
  NEW:        { bg: T.blue,                   fg: '#fff' },
  FEATURED:   { bg: T.blue,                   fg: '#fff' },
  'SOLD OUT': { bg: 'rgba(55,65,81,0.9)',     fg: '#6b7280' },
};

const RARITY_STYLE: Record<string, { border: string; glow: string; chip: string; fg: string }> = {
  LEGENDARY: { border: T.gold,    glow: 'rgba(217,119,6,0.4)',   chip: T.gold,    fg: '#000' },
  RARE:      { border: T.blue,    glow: T.blueGlow,              chip: T.blue,    fg: '#fff' },
  COMMON:    { border: T.border,  glow: 'transparent',           chip: '#374151', fg: '#6b7280' },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function timeLeft(endTime: string): string {
  const diff = new Date(endTime).getTime() - Date.now();
  if (diff <= 0) return 'ended';
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h > 23) return `${Math.floor(h / 24)}d left`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m left`;
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: 0,
  }).format(n);
}

function picsum(seed: string, w = 480, h = 300): string {
  const num = seed.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 1000;
  return `https://picsum.photos/seed/${num}/${w}/${h}`;
}

// ── Next drop hook ────────────────────────────────────────────────────────────
function useNextDrop() {
  const [drop, setDrop] = useState<Drop | null>(null);
  useEffect(() => {
    dropsAPI.getNextUpcoming().then(setDrop).catch(() => setDrop(null));
  }, []);
  return drop;
}

// ── Hero pack preview cards ───────────────────────────────────────────────────
const PREVIEW_CARDS = [
  { label: 'ASM #300 CGC 9.8',  rarity: 'LEGENDARY', revealed: true  },
  { label: 'Spawn #1 Raw NM',   rarity: 'RARE',      revealed: true  },
  { label: 'X-Men #1 VF',       rarity: 'COMMON',    revealed: true  },
  { label: null,                 rarity: null,        revealed: false },
  { label: null,                 rarity: null,        revealed: false },
  { label: null,                 rarity: null,        revealed: false },
];

// ── Skeleton loaders ──────────────────────────────────────────────────────────
function CardSkeleton() {
  return (
    <Box sx={{ bgcolor: T.surface, border: `1px solid ${T.border}`, borderRadius: 2.5, overflow: 'hidden' }}>
      <Skeleton variant="rectangular" height={160} sx={{ bgcolor: T.surfaceB }} />
      <Box sx={{ p: 1.75 }}>
        <Skeleton variant="text" width="75%" sx={{ bgcolor: T.surfaceB, mb: 0.75 }} />
        <Skeleton variant="text" width="45%" sx={{ bgcolor: T.surfaceB }} />
      </Box>
    </Box>
  );
}

function TrendingSkeleton() {
  return (
    <>
      {[1,2,3,4,5].map(i => (
        <Box key={i} sx={{ display: 'grid', gridTemplateColumns: '28px 1fr 72px', gap: 2, px: 2.5, py: 1.75, borderBottom: `1px solid ${T.border}` }}>
          <Skeleton variant="text" width={20} sx={{ bgcolor: T.surfaceB }} />
          <Skeleton variant="text" sx={{ bgcolor: T.surfaceB }} />
          <Skeleton variant="text" sx={{ bgcolor: T.surfaceB }} />
        </Box>
      ))}
    </>
  );
}

function EmptyState({ icon: Icon, message }: { icon: React.ElementType; message: string }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 6, gap: 1.5 }}>
      <Icon size={28} strokeWidth={1.25} color={T.dimmed} />
      <Typography sx={{ fontSize: '0.8rem', color: T.dimmed, fontFamily: T.mono }}>{message}</Typography>
    </Box>
  );
}

function ErrorRetry({ onRetry }: { onRetry: () => void }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 3 }}>
      <AlertCircle size={15} strokeWidth={1.5} color={T.dimmed} />
      <Typography sx={{ fontSize: '0.78rem', color: T.dimmed }}>Failed to load.</Typography>
      <Box onClick={onRetry} sx={{ fontSize: '0.78rem', color: T.blue, cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}>Retry</Box>
    </Box>
  );
}

// ── Section header ────────────────────────────────────────────────────────────
function SectionHeader({ title, cta, onCta }: { title: string; cta: string; onCta: () => void }) {
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2.5}>
      <Typography sx={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: '1rem', color: T.white, letterSpacing: '-0.01em' }}>
        {title}
      </Typography>
      <Box
        onClick={onCta}
        sx={{ display: 'flex', alignItems: 'center', gap: 0.4, color: T.dimmed, fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', transition: 'color 0.15s', '&:hover': { color: T.white } }}
      >
        {cta} <ChevronRight size={13} strokeWidth={2.5} />
      </Box>
    </Stack>
  );
}

// ── Auction card ──────────────────────────────────────────────────────────────
function AuctionCard({ item }: { item: FeaturedAuction }) {
  const navigate = useNavigate();
  const badge = item.is_featured ? 'FEATURED' : null;
  const bm = badge ? BADGE_META[badge] : null;

  return (
    <Box
      onClick={() => navigate(`/auction/${item.id}`)}
      sx={{
        bgcolor: T.surface, border: `1px solid ${T.border}`, borderRadius: 2.5,
        overflow: 'hidden', cursor: 'pointer',
        transition: 'border-color 0.18s, transform 0.18s',
        '&:hover': { borderColor: T.borderLit, transform: 'translateY(-4px)' },
        '&:active': { transform: 'scale(0.985)' },
      }}
    >
      <Box sx={{ position: 'relative', height: { xs: 140, md: 165 }, overflow: 'hidden', bgcolor: T.surfaceB }}>
        <Box
          component="img"
          src={item.image_url || picsum(item.id)}
          alt={item.title}
          sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          onError={(e: React.SyntheticEvent<HTMLImageElement>) => { e.currentTarget.src = picsum(item.id + 'fb'); }}
        />
        <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(8,8,14,0.85) 0%, transparent 55%)' }} />
        {bm && (
          <Box sx={{ position: 'absolute', top: 8, left: 8, display: 'flex', alignItems: 'center', gap: 0.5, bgcolor: bm.bg, color: bm.fg, fontSize: '0.57rem', fontWeight: 800, letterSpacing: '0.07em', px: 0.9, py: 0.3, borderRadius: 0.75 }}>
            <Zap size={9} strokeWidth={2.5} />
            {badge}
          </Box>
        )}
        <Box sx={{ position: 'absolute', bottom: 8, right: 8, display: 'flex', alignItems: 'center', gap: 0.5, bgcolor: 'rgba(8,8,14,0.75)', color: T.muted, fontSize: '0.6rem', fontWeight: 600, px: 0.85, py: 0.3, borderRadius: 0.75, fontFamily: T.mono }}>
          <Clock size={10} strokeWidth={2} />
          {timeLeft(item.end_time)}
        </Box>
      </Box>

      <Box sx={{ p: { xs: 1.5, md: 1.75 } }}>
        <Typography sx={{ fontWeight: 700, fontSize: '0.83rem', color: T.white, mb: 0.35, lineHeight: 1.3 }} noWrap>{item.title}</Typography>
        <Typography sx={{ fontSize: '0.67rem', color: T.dimmed, mb: 1.25, fontFamily: T.mono }}>{item.category} · {item.condition}</Typography>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography sx={{ fontSize: '0.58rem', color: T.dimmed, fontFamily: T.mono, letterSpacing: '0.05em', mb: 0.1 }}>CURRENT BID</Typography>
            <Typography sx={{ fontWeight: 800, fontSize: '0.93rem', color: T.blue, fontFamily: T.mono }}>{formatCurrency(item.current_bid)}</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: T.dimmed }}>
            <Gavel size={11} strokeWidth={2} />
            <Typography sx={{ fontSize: '0.65rem', fontFamily: T.mono }}>{item.bid_count}</Typography>
          </Box>
        </Stack>
      </Box>
    </Box>
  );
}

// ── Stream card ───────────────────────────────────────────────────────────────
function StreamCard({ stream }: { stream: LiveStream }) {
  const navigate = useNavigate();
  return (
    <Box
      onClick={() => navigate('/live')}
      sx={{
        bgcolor: T.surface, border: `1px solid ${T.border}`, borderRadius: 2.5,
        overflow: 'hidden', cursor: 'pointer',
        transition: 'border-color 0.18s, transform 0.18s',
        '&:hover': { borderColor: 'rgba(239,68,68,0.3)', transform: 'translateY(-3px)' },
        '&:active': { transform: 'scale(0.985)' },
      }}
    >
      <Box sx={{ position: 'relative', height: 130, overflow: 'hidden', bgcolor: T.surfaceB }}>
        <Box
          component="img"
          src={stream.thumbnail_url || picsum(stream.id, 600, 280)}
          alt={stream.title}
          sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          onError={(e: React.SyntheticEvent<HTMLImageElement>) => { e.currentTarget.src = picsum(stream.id + 'fb'); }}
        />
        <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(8,8,14,0.8) 0%, transparent 55%)' }} />

        <Box sx={{ position: 'absolute', top: 10, left: 10, display: 'flex', alignItems: 'center', gap: 0.6, bgcolor: stream.is_live ? T.live : 'rgba(8,8,14,0.7)', border: stream.is_live ? 'none' : `1px solid ${T.borderLit}`, color: '#fff', fontSize: '0.58rem', fontWeight: 800, letterSpacing: '0.08em', px: 0.9, py: 0.35, borderRadius: 0.75 }}>
          <Radio size={8} strokeWidth={2.5} style={stream.is_live ? { animation: 'livePulse 1.6s ease-in-out infinite' } : {}} />
          {stream.is_live ? 'LIVE' : 'SOON'}
        </Box>

        {stream.is_live && (
          <Box sx={{ position: 'absolute', bottom: 8, right: 8, display: 'flex', alignItems: 'center', gap: 0.5, bgcolor: 'rgba(8,8,14,0.75)', color: T.muted, fontSize: '0.6rem', fontWeight: 600, fontFamily: T.mono, px: 0.85, py: 0.3, borderRadius: 0.75 }}>
            <Eye size={10} strokeWidth={2} />
            {stream.current_viewers.toLocaleString()}
          </Box>
        )}
      </Box>

      <Box sx={{ p: 1.75, display: 'flex', gap: 1.25, alignItems: 'flex-start' }}>
        <Avatar src={stream.seller_avatar || undefined} sx={{ width: 28, height: 28, flexShrink: 0, fontSize: '0.7rem', bgcolor: T.blue }}>
          {stream.seller_username?.[0]?.toUpperCase()}
        </Avatar>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontWeight: 700, fontSize: '0.82rem', color: T.white, lineHeight: 1.3 }} noWrap>{stream.title}</Typography>
          <Typography sx={{ fontSize: '0.67rem', color: T.dimmed, fontFamily: T.mono, mt: 0.25 }}>@{stream.seller_username || 'inkstash'}</Typography>
        </Box>
      </Box>
    </Box>
  );
}

// ── Splash / Auth page (unauthenticated) ──────────────────────────────────────
function SplashPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<'login' | 'signup'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nextDrop = useNextDrop();
  const dropTarget = nextDrop?.drop_at ?? new Date(Date.now() + 9999 * 3600000).toISOString();
  const [dropSecs, setDropSecs] = useState(() => Math.max(0, Math.floor((new Date(dropTarget).getTime() - Date.now()) / 1000)));
  useEffect(() => {
    const id = setInterval(() => setDropSecs(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [dropTarget]);
  const h = String(Math.floor(dropSecs / 3600)).padStart(2, '0');
  const m = String(Math.floor((dropSecs % 3600) / 60)).padStart(2, '0');
  const s = String(dropSecs % 60).padStart(2, '0');

  const handleGoogle = async () => {
    try {
      setLoading(true); setError(null);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/onboarding` },
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message || 'Failed to sign in with Google');
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }
    try {
      setLoading(true); setError(null);
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      if (data.session) {
        const userId = data.user!.id;
        let attempts = 0;
        while (attempts < 20) {
          const { data: row } = await supabase.from('users').select('id').eq('id', userId).maybeSingle();
          if (row) break;
          await new Promise(r => setTimeout(r, 250));
          attempts++;
        }
        await authManager.refreshUser();
        navigate('/onboarding');
      } else {
        setError('Check your email to confirm your account before signing in.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to sign up');
    } finally { setLoading(false); }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true); setError(null);
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message || 'Failed to sign in');
    } finally { setLoading(false); }
  };

  const handleForgotPassword = async () => {
    if (!email) { setError('Enter your email above first'); return; }
    try {
      setLoading(true); setError(null);
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setError(null);
      alert('Password reset email sent — check your inbox.');
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email');
    } finally { setLoading(false); }
  };

  return (
    <>
      <style>{`
        @keyframes livePulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.25;transform:scale(0.6)} }
        @keyframes legendGlow { 0%,100%{box-shadow:0 0 10px 2px rgba(217,119,6,0.4)} 50%{box-shadow:0 0 22px 6px rgba(217,119,6,0.65)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        .fu1 { animation: fadeUp 0.5s cubic-bezier(0.16,1,0.3,1) both; animation-delay:0.04s }
        .fu2 { animation: fadeUp 0.5s cubic-bezier(0.16,1,0.3,1) both; animation-delay:0.12s }
        .fu3 { animation: fadeUp 0.5s cubic-bezier(0.16,1,0.3,1) both; animation-delay:0.20s }
        .fu4 { animation: fadeUp 0.5s cubic-bezier(0.16,1,0.3,1) both; animation-delay:0.30s }
      `}</style>

      <Box sx={{ minHeight: '100dvh', bgcolor: T.bg, display: 'flex', flexDirection: 'column' }}>

        {/* Nav bar */}
        <Box sx={{ px: { xs: 2.5, md: 5 }, py: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${T.border}` }}>
          <Typography sx={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: '1.35rem', color: T.white, letterSpacing: '-0.03em' }}>
            Ink<Box component="span" sx={{ color: T.blue }}>Stash</Box>
          </Typography>
          <Stack direction="row" spacing={1}>
            <Button onClick={() => setTab('login')} sx={{ color: T.muted, textTransform: 'none', fontSize: '0.85rem', fontWeight: 600, '&:hover': { color: T.white } }}>
              Log in
            </Button>
            <Button onClick={() => setTab('signup')} variant="contained" sx={{ bgcolor: T.blue, color: '#fff', textTransform: 'none', fontSize: '0.85rem', fontWeight: 700, px: 2.5, py: 0.85, borderRadius: 1.5, boxShadow: 'none', '&:hover': { bgcolor: '#0065d9', boxShadow: 'none' } }}>
              Sign up
            </Button>
          </Stack>
        </Box>

        {/* Hero split */}
        <Box sx={{ flex: 1, display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 460px' }, minHeight: 0 }}>

          {/* LEFT — marketing */}
          <Box sx={{
            px: { xs: 3, md: 7, lg: 8 }, py: { xs: 6, md: 8 },
            display: 'flex', flexDirection: 'column', justifyContent: 'center',
            background: `radial-gradient(ellipse 70% 60% at 20% 60%, rgba(0,120,255,0.08) 0%, transparent 70%), radial-gradient(ellipse 45% 50% at 80% 20%, rgba(239,68,68,0.05) 0%, transparent 65%), ${T.bg}`,
            borderRight: { lg: `1px solid ${T.border}` },
          }}>
            {/* Live badge */}
            <Box className="fu1" sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, bgcolor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.22)', color: T.live, fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.05em', px: 1.5, py: 0.6, borderRadius: 999, mb: 3.5, width: 'fit-content' }}>
              <Box sx={{ width: 7, height: 7, bgcolor: T.live, borderRadius: '50%', flexShrink: 0, animation: 'livePulse 1.6s ease-in-out infinite' }} />
              Marvel × InkStash — Limited Drop Live Now
            </Box>

            <Box className="fu2">
              <Typography sx={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: { xs: '3rem', md: '4.2rem', lg: '5rem' }, lineHeight: 0.95, letterSpacing: '-0.03em', color: T.white, mb: 0.5 }}>
                Rip packs.
              </Typography>
              <Typography sx={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: { xs: '3rem', md: '4.2rem', lg: '5rem' }, lineHeight: 0.95, letterSpacing: '-0.03em', color: T.blue, mb: 0.5 }}>
                Chase keys.
              </Typography>
              <Typography sx={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: { xs: '3rem', md: '4.2rem', lg: '5rem' }, lineHeight: 0.95, letterSpacing: '-0.03em', color: T.white }}>
                Go live.
              </Typography>
            </Box>

            <Typography className="fu3" sx={{ color: T.muted, fontSize: '0.97rem', lineHeight: 1.7, mt: 2.5, mb: 4, maxWidth: 460 }}>
              The only platform built for comic collectors. Blind bag pulls, live auction breaks, and a marketplace that speaks your language.
            </Typography>

            {/* Preview cards — desktop only */}
            <Box className="fu4" sx={{ display: { xs: 'none', md: 'grid' }, gridTemplateColumns: 'repeat(6, 1fr)', gap: 1, maxWidth: 480 }}>
              {PREVIEW_CARDS.map((card, i) => {
                const rs = card.rarity ? RARITY_STYLE[card.rarity] : null;
                return (
                  <Box key={i} sx={{ aspectRatio: '0.68', borderRadius: 1.5, border: `1px solid ${rs ? rs.border : T.border}`, background: card.rarity === 'LEGENDARY' ? 'linear-gradient(160deg, #1f1200, #2a1600)' : card.revealed ? 'linear-gradient(160deg, #0d1535, #0a1828)' : 'linear-gradient(160deg, #0e0e18, #0a0b14)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', animation: card.rarity === 'LEGENDARY' ? 'legendGlow 2.8s ease-in-out infinite' : 'none' }}>
                    {rs && <Box sx={{ position: 'absolute', top: 4, right: 4, px: 0.5, py: 0.15, borderRadius: 0.5, bgcolor: rs.chip, color: rs.fg, fontSize: '0.38rem', fontWeight: 800 }}>{card.rarity}</Box>}
                    {card.revealed ? <Package size={16} strokeWidth={1.25} color={rs?.chip || T.dimmed} /> : <Lock size={12} strokeWidth={1.5} color="rgba(255,255,255,0.2)" />}
                    {!card.revealed && <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, py: 0.4, textAlign: 'center', fontSize: '0.42rem', fontWeight: 800, color: T.green, bgcolor: 'rgba(0,0,0,0.65)', fontFamily: T.mono }}>$9.99</Box>}
                  </Box>
                );
              })}
            </Box>

            {/* Drop countdown */}
            <Box sx={{ mt: 4, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <Box sx={{ width: 6, height: 6, bgcolor: T.gold, borderRadius: '50%', animation: 'livePulse 1.6s ease-in-out infinite' }} />
                <Typography sx={{ color: T.gold, fontWeight: 700, fontSize: '0.72rem' }}>
                {nextDrop ? `Next Drop: ${nextDrop.name}` : 'Next Drop'}
              </Typography>
              </Box>
              <Stack direction="row" spacing={0.5} alignItems="center">
                {[h, m, s].map((unit, i) => (
                  <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Box sx={{ bgcolor: 'rgba(217,119,6,0.1)', border: '1px solid rgba(217,119,6,0.2)', borderRadius: 0.75, px: 1, py: 0.4, fontWeight: 800, fontSize: '0.78rem', color: '#fbbf24', fontFamily: T.mono, minWidth: 32, textAlign: 'center' }}>{unit}</Box>
                    {i < 2 && <Typography sx={{ color: 'rgba(217,119,6,0.4)', fontSize: '0.75rem' }}>:</Typography>}
                  </Box>
                ))}
              </Stack>
            </Box>
          </Box>

          {/* RIGHT — auth form */}
          <Box sx={{
            px: { xs: 3, md: 5 }, py: { xs: 5, md: 8 },
            display: 'flex', flexDirection: 'column', justifyContent: 'center',
            bgcolor: T.surface,
          }}>
            <Typography sx={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: '1.6rem', color: T.white, letterSpacing: '-0.02em', mb: 0.5 }}>
              {tab === 'signup' ? 'Create your account' : 'Welcome back'}
            </Typography>
            <Typography sx={{ fontFamily: T.mono, fontSize: '0.72rem', color: T.muted, mb: 3.5 }}>
              {tab === 'signup' ? 'Start pulling packs and chasing keys.' : 'Sign in to access your stash.'}
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 2.5, bgcolor: 'rgba(239,68,68,0.08)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.2)', '& .MuiAlert-icon': { color: '#fca5a5' } }}>
                {error}
              </Alert>
            )}

            {/* Google */}
            <Button fullWidth variant="outlined" onClick={handleGoogle} disabled={loading} startIcon={
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            } sx={{ py: 1.4, mb: 2.5, borderColor: T.border, color: T.white, fontWeight: 600, textTransform: 'none', fontSize: '0.9rem', '&:hover': { borderColor: T.borderLit, bgcolor: 'rgba(255,255,255,0.04)' } }}>
              Continue with Google
            </Button>

            <Divider sx={{ mb: 2.5, borderColor: T.border, '&::before,&::after': { borderColor: T.border }, color: T.dimmed, fontSize: '0.7rem', fontFamily: T.mono }}>or</Divider>

            {/* Tab toggle */}
            <Stack direction="row" spacing={0} sx={{ mb: 3, bgcolor: T.surfaceB, borderRadius: 1.5, p: 0.4 }}>
              {(['signup', 'login'] as const).map(t => (
                <Button key={t} onClick={() => { setTab(t); setError(null); }} sx={{ flex: 1, py: 0.9, textTransform: 'none', fontSize: '0.82rem', fontWeight: 700, borderRadius: 1.25, bgcolor: tab === t ? T.blue : 'transparent', color: tab === t ? '#fff' : T.muted, transition: 'all 0.15s', '&:hover': { bgcolor: tab === t ? T.blue : 'rgba(255,255,255,0.05)', color: tab === t ? '#fff' : T.white } }}>
                  {t === 'signup' ? 'Sign up' : 'Log in'}
                </Button>
              ))}
            </Stack>

            <Box component="form" onSubmit={tab === 'signup' ? handleSignUp : handleLogin} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField fullWidth type="email" label="Email" placeholder="name@example.com" value={email} onChange={e => setEmail(e.target.value)} required size="small" sx={inputSx} />

              <TextField fullWidth type={showPassword ? 'text' : 'password'} label="Password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required size="small" sx={inputSx}
                InputProps={{ endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPassword(v => !v)} edge="end" size="small" sx={{ color: T.dimmed }}>
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </IconButton>
                  </InputAdornment>
                )}}
              />

              {tab === 'signup' && (
                <TextField fullWidth type={showPassword ? 'text' : 'password'} label="Confirm password" placeholder="••••••••" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required size="small" sx={inputSx} />
              )}

              <Button type="submit" fullWidth variant="contained" disabled={loading} sx={{ py: 1.4, bgcolor: T.blue, color: '#fff', fontWeight: 700, textTransform: 'none', fontSize: '0.92rem', borderRadius: 1.5, boxShadow: 'none', '&:hover': { bgcolor: '#0065d9', boxShadow: 'none' }, '&:active': { transform: 'translateY(1px)' } }}>
                {loading ? (tab === 'signup' ? 'Creating account...' : 'Signing in...') : (tab === 'signup' ? 'Create account' : 'Sign in')}
              </Button>

              {tab === 'login' && (
                <Button onClick={handleForgotPassword} disabled={loading} sx={{ color: T.dimmed, textTransform: 'none', fontSize: '0.78rem', '&:hover': { color: T.muted } }}>
                  Forgot your password?
                </Button>
              )}

              {tab === 'signup' && (
                <Typography sx={{ fontSize: '0.67rem', color: T.dimmed, textAlign: 'center', lineHeight: 1.6 }}>
                  By signing up you agree to our Terms of Service and Privacy Policy.
                </Typography>
              )}
            </Box>
          </Box>
        </Box>
      </Box>
    </>
  );
}

const inputSx = {
  '& .MuiInputLabel-root': { color: 'rgba(241,245,249,0.4)', fontSize: '0.85rem' },
  '& .MuiInputLabel-root.Mui-focused': { color: '#0078FF' },
  '& .MuiOutlinedInput-root': {
    color: '#f1f5f9',
    '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
    '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
    '&.Mui-focused fieldset': { borderColor: '#0078FF' },
  },
};

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Home() {
  const navigate = useNavigate();
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
  const h = String(Math.floor(dropSecs / 3600)).padStart(2, '0');
  const m = String(Math.floor((dropSecs % 3600) / 60)).padStart(2, '0');
  const s = String(dropSecs % 60).padStart(2, '0');

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

  const liveCount = streams.filter(s => s.is_live).length;

  if (!authLoading && !isAuthenticated) return <SplashPage />;

  return (
    <>
      <style>{`
        @keyframes livePulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.25;transform:scale(0.6)} }
        @keyframes legendGlow { 0%,100%{box-shadow:0 0 10px 2px rgba(217,119,6,0.4)} 50%{box-shadow:0 0 22px 6px rgba(217,119,6,0.65)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        .fu1 { animation: fadeUp 0.5s cubic-bezier(0.16,1,0.3,1) both; animation-delay:0.04s }
        .fu2 { animation: fadeUp 0.5s cubic-bezier(0.16,1,0.3,1) both; animation-delay:0.12s }
        .fu3 { animation: fadeUp 0.5s cubic-bezier(0.16,1,0.3,1) both; animation-delay:0.20s }
        .fu4 { animation: fadeUp 0.5s cubic-bezier(0.16,1,0.3,1) both; animation-delay:0.30s }
        .sec  { animation: fadeUp 0.45s cubic-bezier(0.16,1,0.3,1) both; animation-delay:0.08s }
      `}</style>

      <Box sx={{ minHeight: '100dvh', bgcolor: T.bg, fontFamily: "'Outfit', system-ui, sans-serif" }}>
        <DashboardHeader />

        {/* ── HERO ─────────────────────────────────────────────────────────── */}
        <Box
          sx={{
            pt: { xs: 9, md: 9 },
            background: `
              radial-gradient(ellipse 65% 70% at 15% 55%, rgba(0,120,255,0.07) 0%, transparent 70%),
              radial-gradient(ellipse 45% 50% at 85% 25%, rgba(239,68,68,0.05) 0%, transparent 65%),
              ${T.bg}
            `,
            borderBottom: `1px solid ${T.border}`,
          }}
        >
          <Container maxWidth="xl">
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: '1fr 420px' },
                gap: { xs: 4, md: 7 },
                py: { xs: 5, md: 7 },
                alignItems: 'center',
              }}
            >
              {/* LEFT — copy */}
              <Box>
                {/* Live badge */}
                <Box
                  className="fu1"
                  onClick={() => navigate('/live')}
                  sx={{
                    display: 'inline-flex', alignItems: 'center', gap: 1,
                    bgcolor: 'rgba(239,68,68,0.08)', border: `1px solid rgba(239,68,68,0.22)`,
                    color: T.live, fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.05em',
                    px: 1.5, py: 0.6, borderRadius: 999, mb: 3.5,
                    cursor: 'pointer', transition: 'background 0.15s',
                    '&:hover': { bgcolor: 'rgba(239,68,68,0.14)' },
                  }}
                >
                  <Box sx={{ width: 7, height: 7, bgcolor: T.live, borderRadius: '50%', flexShrink: 0, animation: liveCount > 0 ? 'livePulse 1.6s ease-in-out infinite' : 'none' }} />
                  {liveCount > 0 ? `${liveCount} break${liveCount > 1 ? 's' : ''} live right now` : 'Marvel × InkStash — Limited Drop Live Now'}
                </Box>

                {/* Headline */}
                <Box className="fu2">
                  <Typography sx={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: { xs: '2.8rem', md: '4rem', lg: '4.8rem' }, lineHeight: 0.95, letterSpacing: '-0.03em', color: T.white, mb: 0.5 }}>
                    Rip packs.
                  </Typography>
                  <Typography sx={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: { xs: '2.8rem', md: '4rem', lg: '4.8rem' }, lineHeight: 0.95, letterSpacing: '-0.03em', color: T.blue, mb: 0.5 }}>
                    Chase keys.
                  </Typography>
                  <Typography sx={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: { xs: '2.8rem', md: '4rem', lg: '4.8rem' }, lineHeight: 0.95, letterSpacing: '-0.03em', color: T.white }}>
                    Go live.
                  </Typography>
                </Box>

                <Typography className="fu3" sx={{ color: T.muted, fontSize: '0.97rem', lineHeight: 1.7, mt: 2.5, mb: 3.5, maxWidth: 430 }}>
                  The only platform built for comic collectors. Blind bag pulls, live auction breaks, and a marketplace that speaks your language.
                </Typography>

                <Stack className="fu4" direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
                  <Button
                    variant="contained"
                    onClick={() => navigate('/packs')}
                    sx={{
                      bgcolor: T.blue, color: '#fff', fontWeight: 700, px: 3.5, py: 1.5,
                      borderRadius: 1.75, textTransform: 'none', fontSize: '0.95rem',
                      fontFamily: "'Outfit', sans-serif", boxShadow: 'none',
                      '&:hover': { bgcolor: '#0065d9', boxShadow: 'none' },
                      '&:active': { transform: 'translateY(1px)' },
                    }}
                  >
                    Open a Pack — $9.99
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => navigate('/live')}
                    sx={{
                      bgcolor: 'transparent', borderColor: T.borderLit, color: T.white,
                      fontWeight: 600, px: 3.5, py: 1.5, borderRadius: 1.75,
                      textTransform: 'none', fontSize: '0.95rem',
                      fontFamily: "'Outfit', sans-serif",
                      '&:hover': { bgcolor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.25)' },
                      '&:active': { transform: 'translateY(1px)' },
                    }}
                  >
                    Watch Live Breaks
                  </Button>
                </Stack>
              </Box>

              {/* RIGHT — pack reveal preview */}
              <Box sx={{ display: { xs: 'none', md: 'block' } }}>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1.5 }}>
                  {PREVIEW_CARDS.map((card, i) => {
                    const rs = card.rarity ? RARITY_STYLE[card.rarity] : null;
                    return (
                      <Box
                        key={i}
                        onClick={() => navigate('/packs')}
                        sx={{
                          aspectRatio: '0.68',
                          borderRadius: 2,
                          border: `1px solid ${rs ? rs.border : T.border}`,
                          background: card.rarity === 'LEGENDARY'
                            ? 'linear-gradient(160deg, #1f1200, #2a1600)'
                            : card.revealed
                            ? 'linear-gradient(160deg, #0d1535, #0a1828)'
                            : 'linear-gradient(160deg, #0e0e18, #0a0b14)',
                          display: 'flex', flexDirection: 'column',
                          alignItems: 'center', justifyContent: 'center',
                          position: 'relative', overflow: 'hidden', cursor: 'pointer',
                          animation: card.rarity === 'LEGENDARY' ? 'legendGlow 2.8s ease-in-out infinite' : 'none',
                          transition: 'transform 0.18s',
                          '&:hover': { transform: 'scale(1.04)' },
                        }}
                      >
                        {/* Rarity chip */}
                        {rs && (
                          <Box sx={{ position: 'absolute', top: 6, right: 6, px: 0.7, py: 0.2, borderRadius: 0.6, bgcolor: rs.chip, color: rs.fg, fontSize: '0.46rem', fontWeight: 800, letterSpacing: '0.05em' }}>
                            {card.rarity}
                          </Box>
                        )}

                        {/* Icon */}
                        {card.revealed ? (
                          <Package size={28} strokeWidth={1.25} color={rs?.chip || T.dimmed} />
                        ) : (
                          <Lock size={20} strokeWidth={1.5} color="rgba(255,255,255,0.2)" />
                        )}

                        {/* Label */}
                        {card.label && (
                          <Typography sx={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.65)', textAlign: 'center', px: 0.75, fontWeight: 600, lineHeight: 1.3, mt: 0.75 }}>
                            {card.label}
                          </Typography>
                        )}

                        {/* Locked price strip */}
                        {!card.revealed && (
                          <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, py: 0.6, textAlign: 'center', fontSize: '0.55rem', fontWeight: 800, color: T.green, bgcolor: 'rgba(0,0,0,0.65)', letterSpacing: '0.05em', fontFamily: T.mono }}>
                            $9.99
                          </Box>
                        )}

                        {/* Legendary shimmer */}
                        {card.rarity === 'LEGENDARY' && (
                          <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, transparent 25%, rgba(217,119,6,0.07) 50%, transparent 75%)', pointerEvents: 'none' }} />
                        )}
                      </Box>
                    );
                  })}
                </Box>
                <Typography sx={{ mt: 1.75, textAlign: 'center', fontSize: '0.68rem', color: T.dimmed, fontStyle: 'italic', fontFamily: T.mono }}>
                  6-card pack preview — tap to open
                </Typography>
              </Box>
            </Box>
          </Container>

          {/* ── Drop countdown banner ── */}
          <Box
            sx={{
              background: 'linear-gradient(90deg, rgba(217,119,6,0.06) 0%, rgba(239,68,68,0.04) 100%)',
              borderTop: `1px solid rgba(217,119,6,0.14)`,
              px: { xs: 2, md: 5 }, py: 1.4,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              flexWrap: 'wrap', gap: 1.5,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
              <Box sx={{ width: 7, height: 7, bgcolor: T.gold, borderRadius: '50%', animation: 'livePulse 1.6s ease-in-out infinite', flexShrink: 0 }} />
              <Typography sx={{ color: T.gold, fontWeight: 700, fontSize: '0.78rem', letterSpacing: '0.01em' }}>
                {nextDrop ? `Next Drop: ${nextDrop.partner} — "${nextDrop.name}"` : 'Next Drop: Loading...'}
              </Typography>
            </Box>
            <Stack direction="row" spacing={0.6} alignItems="center">
              {[h, m, s].map((unit, i) => (
                <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                  <Box sx={{ bgcolor: 'rgba(217,119,6,0.1)', border: `1px solid rgba(217,119,6,0.2)`, borderRadius: 1, px: 1.25, py: 0.5, fontWeight: 800, fontSize: '0.82rem', color: '#fbbf24', fontFamily: T.mono, minWidth: 36, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>
                    {unit}
                  </Box>
                  {i < 2 && <Typography sx={{ color: 'rgba(217,119,6,0.45)', fontWeight: 400, fontSize: '0.8rem' }}>:</Typography>}
                </Box>
              ))}
              <Button
                size="small"
                onClick={() => navigate('/drops')}
                sx={{ bgcolor: T.green, color: '#fff', fontWeight: 700, fontSize: '0.72rem', px: 1.75, py: 0.6, borderRadius: 1.25, textTransform: 'none', ml: 0.75, '&:hover': { bgcolor: '#059669' } }}
              >
                Notify Me
              </Button>
            </Stack>
          </Box>
        </Box>

        {/* ── MAIN CONTENT ─────────────────────────────────────────────────── */}
        <Container maxWidth="xl" sx={{ py: { xs: 4, md: 6 } }}>

          {/* ── Open Now — pack grid (uses auction data as proxy) ── */}
          <Box className="sec" sx={{ mb: { xs: 5, md: 7 } }}>
            <SectionHeader title="Open Now" cta="See all packs" onCta={() => navigate('/packs')} />
            {loadingFeatured ? (
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2,1fr)', md: 'repeat(4,1fr)' }, gap: 2 }}>
                {[1,2,3,4].map(i => <CardSkeleton key={i} />)}
              </Box>
            ) : errorFeatured ? (
              <ErrorRetry onRetry={loadData} />
            ) : featured.length === 0 ? (
              <EmptyState icon={Package} message="No active listings yet — check back soon" />
            ) : (
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2,1fr)', md: 'repeat(4,1fr)' }, gap: { xs: 1.5, md: 2 } }}>
                {featured.map(item => <AuctionCard key={item.id} item={item} />)}
              </Box>
            )}
          </Box>

          {/* ── Live Breaks — 3-col ── */}
          <Box className="sec" sx={{ mb: { xs: 5, md: 7 } }}>
            <SectionHeader title="Live Breaks" cta="See all streams" onCta={() => navigate('/live')} />
            {loadingStreams ? (
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3,1fr)' }, gap: 2 }}>
                {[1,2,3].map(i => <CardSkeleton key={i} />)}
              </Box>
            ) : errorStreams ? (
              <ErrorRetry onRetry={loadData} />
            ) : streams.length === 0 ? (
              <EmptyState icon={Radio} message="No live or upcoming breaks right now" />
            ) : (
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3,1fr)' }, gap: 2 }}>
                {streams.slice(0, 3).map(s => <StreamCard key={s.id} stream={s} />)}
              </Box>
            )}
          </Box>

          {/* ── Trending ── */}
          <Box className="sec">
            <SectionHeader title="Trending This Week" cta="View marketplace" onCta={() => navigate('/marketplace')} />
            <Box sx={{ bgcolor: T.surface, border: `1px solid ${T.border}`, borderRadius: 2.5, overflow: 'hidden' }}>
              {loadingTrending ? (
                <TrendingSkeleton />
              ) : errorTrending ? (
                <ErrorRetry onRetry={loadData} />
              ) : trending.length === 0 ? (
                <EmptyState icon={TrendingUp} message="No trending data yet" />
              ) : (
                trending.map((item, idx) => (
                  <Box
                    key={item.id}
                    onClick={() => navigate(`/auction/${item.id}`)}
                    sx={{
                      display: 'grid', gridTemplateColumns: '28px 1fr auto auto',
                      alignItems: 'center', gap: { xs: 1.5, md: 2 },
                      px: 2.5, py: 1.75,
                      borderBottom: idx < trending.length - 1 ? `1px solid ${T.border}` : 'none',
                      cursor: 'pointer', transition: 'background 0.13s',
                      '&:hover': { bgcolor: 'rgba(255,255,255,0.025)' },
                      '&:active': { bgcolor: 'rgba(255,255,255,0.04)' },
                    }}
                  >
                    <Typography sx={{ fontFamily: T.mono, fontSize: '0.7rem', color: T.dimmed, fontWeight: 500 }}>
                      {String(idx + 1).padStart(2, '0')}
                    </Typography>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 600, fontSize: '0.84rem', color: T.white, lineHeight: 1.3 }} noWrap>
                        {item.title}
                      </Typography>
                      <Typography sx={{ fontSize: '0.63rem', color: T.dimmed, fontFamily: T.mono }}>
                        {item.bid_count} bid{item.bid_count !== 1 ? 's' : ''} · {item.category}
                      </Typography>
                    </Box>
                    <Chip
                      label={`+${Math.floor(Math.random() * 20 + 3)}%`}
                      size="small"
                      sx={{ bgcolor: 'rgba(16,185,129,0.1)', color: T.green, fontSize: '0.62rem', fontWeight: 700, height: 20, '& .MuiChip-label': { px: 0.85 } }}
                    />
                    <Typography sx={{ fontFamily: T.mono, fontWeight: 800, fontSize: '0.85rem', color: T.blue, minWidth: 60, textAlign: 'right' }}>
                      {formatCurrency(item.current_bid)}
                    </Typography>
                  </Box>
                ))
              )}
            </Box>
          </Box>

        </Container>
      </Box>

      <OnboardingModal isOpen={showOnboarding} onClose={() => setShowOnboarding(false)} />
    </>
  );
}
