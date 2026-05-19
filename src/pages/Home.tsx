import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Button, Stack, Alert, Divider, TextField, InputAdornment, IconButton } from '@mui/material';
import {
  Package,
  Lock,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../api/supabase/supabaseClient';
import { authManager } from '../api/auth/authManager';
import OnboardingModal from '../components/onboarding/OnboardingModal';
import { dropsAPI } from '../api/dropsRaffles';
import type { Drop } from '../api/dropsRaffles';
import { PACKS } from '../data/handoffSeed';
import AppShell from '../components/layout/AppShell';
import HomeHero from '../components/home/HomeHero';
import PickAPackSection from '../components/home/PickAPackSection';
import LiveBreaksRow from '../components/home/LiveBreaksRow';
import PublisherScroller from '../components/home/PublisherScroller';
import TrendingList from '../components/home/TrendingList';
import Discover3Up from '../components/home/Discover3Up';
import HomeFooter from '../components/home/HomeFooter';

// ── Design tokens ─────────────────────────────────────────────────────────────
const T = {
  bg:        '#09090f',
  surface:   '#0f0f18',
  surfaceB:  '#141420',
  border:    'rgba(255,255,255,0.06)',
  borderLit: 'rgba(255,255,255,0.13)',
  blue:      '#0078FF',
  blueGlow:  'rgba(0,120,255,0.25)',
  live:      '#ef4444',
  gold:      '#d97706',
  green:     '#10b981',
  white:     '#f0f0f5',
  muted:     'rgba(240,240,245,0.52)',
  dimmed:    'rgba(240,240,245,0.22)',
  mono:      "'DM Mono', 'Courier New', monospace",
};

const H = {
  bg:           '#f5f0e8',
  panel:        '#fffdf9',
  panelStrong:  '#ffffff',
  rail:         '#f2ebdf',
  railDark:     '#e9dfd0',
  border:       'rgba(20,17,13,0.14)',
  borderSoft:   'rgba(20,17,13,0.08)',
  ink:          '#14110d',
  inkMuted:     'rgba(20,17,13,0.62)',
  inkDim:       'rgba(20,17,13,0.4)',
  red:          '#e82c2c',
  redDark:      '#c92020',
  blue:         '#1a4fc4',
  blueSoft:     'rgba(26,79,196,0.14)',
  live:         '#d62828',
};

const RARITY_STYLE: Record<string, { border: string; glow: string; chip: string; fg: string }> = {
  LEGENDARY: { border: T.gold,    glow: 'rgba(217,119,6,0.4)',   chip: T.gold,    fg: '#000' },
  RARE:      { border: T.blue,    glow: T.blueGlow,              chip: T.blue,    fg: '#fff' },
  COMMON:    { border: T.border,  glow: 'transparent',           chip: '#374151', fg: '#6b7280' },
};

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
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (!authLoading && user && !user.onboarding_completed) setShowOnboarding(true);
    else setShowOnboarding(false);
  }, [user, authLoading]);

  if (!authLoading && !isAuthenticated) return <SplashPage />;

  // 3 hero packs for the carousel: Variant Vault, Holographic Heroes, Grail Hunter Pro
  const heroPacks = [PACKS[0], PACKS[6], PACKS[7]];

  return (
    <AppShell>
      <HomeHero packs={heroPacks} />
      <PickAPackSection packs={PACKS} />
      <LiveBreaksRow />
      <PublisherScroller />
      <TrendingList />
      <Discover3Up />
      <HomeFooter />
      <OnboardingModal isOpen={showOnboarding} onClose={() => setShowOnboarding(false)} />
    </AppShell>
  );
}
