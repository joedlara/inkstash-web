// src/components/creatorHub/composer/StepSettings.tsx
//
// Step 3 of the Go Live composer. Four blocks in a 2-column grid:
//   - Shipping (mode segmented control + flat cost + combine toggle)
//   - Content & moderation (toggles + muted words)
//   - Moderators (add @user, chip list)
//   - Coupons (CODE + $ off, chip list)
//
// All state lives on the composer. This step is a controlled view.

import { useState } from 'react';
import { Box, Switch, TextField, Typography, ButtonBase } from '@mui/material';
import { X } from 'lucide-react';
import type { ComposerSettings, ShipMode } from './types';
import HBtn from '../HBtn';
import { inkstashColors, inkstashFonts, inkstashRadii } from '../../../theme/inkstashTokens';

interface Props {
  settings: ComposerSettings;
  setSettings: (next: ComposerSettings | ((prev: ComposerSettings) => ComposerSettings)) => void;
}

const SHIP_MODES: { value: ShipMode; label: string }[] = [
  { value: 'flat', label: 'Flat per item' },
  { value: 'free', label: 'Free shipping' },
  { value: 'calculated', label: 'Calculated' },
];

export default function StepSettings({ settings, setSettings }: Props) {
  const set = <K extends keyof ComposerSettings>(key: K, value: ComposerSettings[K]) =>
    setSettings({ ...settings, [key]: value });

  // Local drafts for the add-coupon and add-mod inputs so we don't
  // bloat composer state with form-only fields.
  const [couponCode, setCouponCode] = useState('');
  const [couponAmt, setCouponAmt] = useState('');
  const [modDraft, setModDraft] = useState('');

  function addCoupon() {
    const code = couponCode.trim().toUpperCase();
    if (!code) return;
    const amount = Math.max(0, Number(couponAmt) || 0);
    setSettings((s) => ({
      ...s,
      coupons: [...s.coupons, { id: `c-${Date.now()}`, code, amountUsd: amount }],
    }));
    setCouponCode('');
    setCouponAmt('');
  }
  function removeCoupon(id: string) {
    setSettings((s) => ({ ...s, coupons: s.coupons.filter((c) => c.id !== id) }));
  }

  function addMod() {
    const handle = modDraft.replace(/^@/, '').trim();
    if (!handle) return;
    if (settings.moderators.includes(handle)) { setModDraft(''); return; }
    setSettings((s) => ({ ...s, moderators: [...s.moderators, handle] }));
    setModDraft('');
  }
  function removeMod(handle: string) {
    setSettings((s) => ({ ...s, moderators: s.moderators.filter((m) => m !== handle) }));
  }

  return (
    <Box sx={{
      display: 'grid',
      gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
      gap: 2.25,
    }}>
      {/* Shipping */}
      <Block title="Shipping">
        <Box sx={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0,
          bgcolor: inkstashColors.bgSunken,
          border: `1px solid ${inkstashColors.border}`,
          borderRadius: 999,
          p: 0.5,
        }}>
          {SHIP_MODES.map((m) => {
            const active = settings.shipMode === m.value;
            return (
              <ButtonBase
                key={m.value}
                onClick={() => set('shipMode', m.value)}
                sx={{
                  py: 0.85,
                  borderRadius: 999,
                  bgcolor: active ? inkstashColors.ink : 'transparent',
                  color: active ? '#fff' : inkstashColors.ink2,
                  fontFamily: inkstashFonts.ui,
                  fontWeight: 600,
                  fontSize: 12.5,
                  letterSpacing: '-0.005em',
                  transition: 'background-color 120ms ease, color 120ms ease',
                  '&:hover': active ? {} : { color: inkstashColors.ink },
                }}
              >
                {m.label}
              </ButtonBase>
            );
          })}
        </Box>

        {settings.shipMode === 'flat' && (
          <Field label="Shipping cost applied to every auction" mt={1.75}>
            <PrefixInput
              prefix="$"
              value={String(settings.shipCostUsd)}
              onChange={(v) => set('shipCostUsd', Math.max(0, Number(v) || 0))}
              type="number"
              placeholder="6.00"
            />
          </Field>
        )}

        <SettingRow
          title="Combine items into one shipment"
          sub="Buyers who win multiple lots pay shipping once."
          checked={settings.combineShipments}
          onChange={(v) => set('combineShipments', v)}
          mt={1.5}
        />
      </Block>

      {/* Content & moderation */}
      <Block title="Content & moderation">
        <SettingRow
          title="Explicit content"
          sub="Flag the show as 18+ / mature."
          checked={settings.explicit18plus}
          onChange={(v) => set('explicit18plus', v)}
        />
        <SettingRow
          title="Create polls"
          sub="Run live polls — let chat vote on a card's grade, price, or what to rip next."
          checked={settings.allowPolls}
          onChange={(v) => set('allowPolls', v)}
        />
        <SettingRow
          title="Allow cloning items"
          sub="Quickly duplicate a lot during the show."
          checked={settings.allowCloning}
          onChange={(v) => set('allowCloning', v)}
        />
        <Field label="Muted words (comma separated)" mt={1.75}>
          <TextField
            fullWidth
            size="small"
            value={settings.mutedWords}
            onChange={(e) => set('mutedWords', e.target.value)}
            placeholder="scam, refund, fake…"
            sx={inputSx}
          />
        </Field>
      </Block>

      {/* Moderators */}
      <Block title="Moderators">
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <PrefixInput
            prefix="@"
            value={modDraft}
            onChange={setModDraft}
            placeholder="username"
            onEnter={addMod}
          />
          <HBtn variant="ghost" size="md" onClick={addMod} disabled={!modDraft.trim()}>
            Add
          </HBtn>
        </Box>
        <ChipList
          empty="No moderators added."
          chips={settings.moderators.map((m) => ({ key: m, label: `@${m}`, onRemove: () => removeMod(m) }))}
        />
      </Block>

      {/* Coupons */}
      <Block title="Coupons">
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, flexWrap: 'wrap' }}>
          <Box sx={{ flex: '1 1 140px' }}>
            <TextField
              fullWidth
              size="small"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              placeholder="CODE"
              inputProps={{ maxLength: 24, style: { fontFamily: inkstashFonts.mono, letterSpacing: '0.04em' } }}
              sx={inputSx}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCoupon(); } }}
            />
          </Box>
          <Box sx={{ width: 110 }}>
            <PrefixInput
              prefix="$"
              value={couponAmt}
              onChange={setCouponAmt}
              type="number"
              placeholder="5"
              onEnter={addCoupon}
            />
          </Box>
          <HBtn variant="ghost" size="md" onClick={addCoupon} disabled={!couponCode.trim()}>
            Add
          </HBtn>
        </Box>
        <ChipList
          empty="No coupons."
          chips={settings.coupons.map((c) => ({
            key: c.id,
            label: `${c.code} · $${c.amountUsd.toFixed(0)} off`,
            onRemove: () => removeCoupon(c.id),
          }))}
        />
      </Block>
    </Box>
  );
}

// ──────────────────────────────────────────────────────────────────

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box sx={{
      bgcolor: inkstashColors.bgElev,
      border: `1px solid ${inkstashColors.border}`,
      borderRadius: inkstashRadii.lg,
      p: 2,
    }}>
      <Typography sx={{
        fontFamily: inkstashFonts.mono, fontSize: 11, fontWeight: 600,
        textTransform: 'uppercase', letterSpacing: '0.08em',
        color: inkstashColors.muted, mb: 1.5,
      }}>
        {title}
      </Typography>
      {children}
    </Box>
  );
}

function Field({
  label, mt = 0, children,
}: { label: string; mt?: number; children: React.ReactNode }) {
  return (
    <Box sx={{ mt }}>
      <Typography sx={{
        fontFamily: inkstashFonts.ui, fontSize: 11, fontWeight: 700,
        color: inkstashColors.muted, letterSpacing: '0.04em',
        textTransform: 'uppercase', mb: 0.5,
      }}>
        {label}
      </Typography>
      {children}
    </Box>
  );
}

function SettingRow({
  title, sub, checked, onChange, mt = 0,
}: {
  title: string;
  sub: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  mt?: number;
}) {
  return (
    <Box sx={{
      display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
      gap: 2, py: 1, mt,
      borderTop: mt ? `1px solid ${inkstashColors.border}` : undefined,
    }}>
      <Box>
        <Typography sx={{
          fontFamily: inkstashFonts.ui, fontSize: 13.5, fontWeight: 600,
          color: inkstashColors.ink, letterSpacing: '-0.005em',
        }}>
          {title}
        </Typography>
        <Typography sx={{
          fontFamily: inkstashFonts.ui, fontSize: 12, color: inkstashColors.muted,
          mt: 0.25, lineHeight: 1.5,
        }}>
          {sub}
        </Typography>
      </Box>
      <Switch
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        sx={{
          '& .MuiSwitch-switchBase.Mui-checked': { color: '#fff' },
          '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
            bgcolor: inkstashColors.brand, opacity: 1,
          },
        }}
      />
    </Box>
  );
}

function PrefixInput({
  prefix, value, onChange, placeholder, type = 'text', onEnter,
}: {
  prefix: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: 'text' | 'number';
  onEnter?: () => void;
}) {
  return (
    <Box sx={{
      display: 'inline-flex', alignItems: 'center', width: '100%',
      bgcolor: inkstashColors.bgSunken,
      border: `1px solid ${inkstashColors.border}`,
      borderRadius: 1.25,
      px: 1,
      height: 38,
    }}>
      <Box component="span" sx={{
        fontFamily: inkstashFonts.mono, fontSize: 13, color: inkstashColors.muted, mr: 0.75,
      }}>
        {prefix}
      </Box>
      <TextField
        fullWidth size="small" type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        inputProps={type === 'number' ? { min: 0 } : undefined}
        onKeyDown={(e) => { if (onEnter && e.key === 'Enter') { e.preventDefault(); onEnter(); } }}
        sx={{
          '& fieldset': { border: 'none' },
          '& .MuiInputBase-root': { p: 0, fontFamily: inkstashFonts.ui, fontSize: 13 },
        }}
      />
    </Box>
  );
}

function ChipList({
  empty, chips,
}: {
  empty: string;
  chips: { key: string; label: string; onRemove: () => void }[];
}) {
  if (chips.length === 0) {
    return (
      <Typography sx={{
        fontFamily: inkstashFonts.ui, fontSize: 12.5,
        color: inkstashColors.muted, fontStyle: 'italic',
      }}>
        {empty}
      </Typography>
    );
  }
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
      {chips.map((c) => (
        <Box key={c.key} sx={{
          display: 'inline-flex', alignItems: 'center', gap: 0.5,
          pl: 1.25, pr: 0.4, py: 0.4,
          borderRadius: 999,
          bgcolor: inkstashColors.bgSunken,
          border: `1px solid ${inkstashColors.border}`,
          fontFamily: inkstashFonts.ui, fontSize: 12.5, fontWeight: 600,
          color: inkstashColors.ink,
        }}>
          {c.label}
          <ButtonBase
            onClick={c.onRemove}
            sx={{
              ml: 0.25, width: 22, height: 22, borderRadius: '50%',
              color: inkstashColors.muted,
              '&:hover': { bgcolor: inkstashColors.brandSoft, color: inkstashColors.brand },
            }}
            aria-label="Remove"
          >
            <X size={12} strokeWidth={2.6} />
          </ButtonBase>
        </Box>
      ))}
    </Box>
  );
}

const inputSx = {
  '& .MuiInputBase-root': {
    fontFamily: inkstashFonts.ui, fontSize: 13,
    bgcolor: inkstashColors.bgSunken, borderRadius: 1.25,
  },
  '& fieldset': { borderColor: inkstashColors.border },
} as const;
