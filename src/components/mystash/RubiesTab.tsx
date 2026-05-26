import { useEffect, useMemo, useState } from 'react';
import { Box, Stack, Skeleton } from '@mui/material';
import { ArrowUpRight, ArrowDownRight, Sparkles, ShoppingBag, ArrowLeftRight, Wrench } from 'lucide-react';
import { rubiesAPI } from '../../api/rubies';
import type { RubyTransaction, RubyTxnKind } from '../../api/rubies';
import { useRubyBalance } from '../../hooks/useRubyBalance';
import RubyIcon from '../ui/RubyIcon';
import { inkstashColors, inkstashFonts, inkstashRadii } from '../../theme/inkstashTokens';

type FilterKey = 'all' | RubyTxnKind;

const FILTERS: Array<{ key: FilterKey; label: string }> = [
  { key: 'all',              label: 'All' },
  { key: 'bundle_purchase',  label: 'Bundles' },
  { key: 'pack_open',        label: 'Pack opens' },
  { key: 'sellback',         label: 'Sell-backs' },
];

const KIND_CONFIG: Record<RubyTxnKind, { label: string; icon: React.ComponentType<{ size?: number; color?: string }>; tone: 'in' | 'out' }> = {
  bundle_purchase:    { label: 'Bought Ruby bundle',     icon: ShoppingBag,      tone: 'in'  },
  pack_open:          { label: 'Opened a pack',          icon: Sparkles,         tone: 'out' },
  sellback:           { label: 'Sold comic to Inkstash', icon: ArrowLeftRight,   tone: 'in'  },
  admin_adjustment:   { label: 'Admin adjustment',       icon: Wrench,           tone: 'in'  },
};

function fmtRubies(n: number): string {
  return n.toLocaleString('en-US');
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function RubiesTab() {
  const { balance } = useRubyBalance();
  const [txns, setTxns] = useState<RubyTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterKey>('all');

  useEffect(() => {
    setLoading(true);
    rubiesAPI.listTransactions(100)
      .then(setTxns)
      .finally(() => setLoading(false));
  }, []);

  const visible = useMemo(() => {
    if (filter === 'all') return txns;
    return txns.filter((t) => t.kind === filter);
  }, [txns, filter]);

  const totals = useMemo(() => {
    const earned = txns.filter((t) => t.delta > 0).reduce((s, t) => s + t.delta, 0);
    const spent = txns.filter((t) => t.delta < 0).reduce((s, t) => s + Math.abs(t.delta), 0);
    return { earned, spent };
  }, [txns]);

  return (
    <Box>
      {/* Big-number summary */}
      <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5} mb={3}>
        <SummaryCard
          label="Current balance"
          value={balance}
          accent={inkstashColors.brand}
          primary
        />
        <SummaryCard
          label="Earned (recent)"
          value={totals.earned}
          accent={inkstashColors.gold}
          deltaSign="+"
        />
        <SummaryCard
          label="Spent (recent)"
          value={totals.spent}
          accent={inkstashColors.ink}
          deltaSign="-"
        />
      </Stack>

      {/* Filters */}
      <Stack direction="row" gap={0.5} sx={{ bgcolor: inkstashColors.bgSunken, borderRadius: 999, padding: 0.5, mb: 2.5, width: 'fit-content', overflowX: 'auto', maxWidth: '100%' }}>
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <Box
              key={f.key}
              component="button"
              type="button"
              onClick={() => setFilter(f.key)}
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
              {f.label}
            </Box>
          );
        })}
      </Stack>

      {loading ? (
        <Stack gap={0.75}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} variant="rectangular" height={56} sx={{ bgcolor: inkstashColors.bgSunken, borderRadius: inkstashRadii.md }} />
          ))}
        </Stack>
      ) : visible.length === 0 ? (
        <Box
          sx={{
            bgcolor: inkstashColors.bgElev,
            border: `1px dashed ${inkstashColors.border}`,
            borderRadius: inkstashRadii.lg,
            padding: '48px 24px',
            textAlign: 'center',
            fontFamily: inkstashFonts.mono,
            fontSize: 12,
            color: inkstashColors.muted,
            letterSpacing: '0.04em',
          }}
        >
          {txns.length === 0 ? 'No Ruby transactions yet — buy a bundle or open a pack to get started.' : 'No transactions match this filter.'}
        </Box>
      ) : (
        <Stack gap={0.5}>
          {visible.map((t) => (
            <TxnRow key={t.id} txn={t} />
          ))}
        </Stack>
      )}
    </Box>
  );
}

function SummaryCard({
  label,
  value,
  accent,
  deltaSign,
  primary,
}: {
  label: string;
  value: number;
  accent: string;
  deltaSign?: '+' | '-';
  primary?: boolean;
}) {
  return (
    <Box
      sx={{
        flex: 1,
        bgcolor: primary ? inkstashColors.brand : inkstashColors.bgElev,
        border: primary ? 'none' : `1px solid ${inkstashColors.border}`,
        borderLeft: primary ? 'none' : `3px solid ${accent}`,
        borderRadius: inkstashRadii.md,
        padding: '16px 20px',
        color: primary ? '#fff' : inkstashColors.ink,
      }}
    >
      <Box
        sx={{
          fontFamily: inkstashFonts.mono,
          fontSize: 10.5,
          color: primary ? 'rgba(255,255,255,0.7)' : inkstashColors.muted,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          mb: 0.75,
        }}
      >
        {label}
      </Box>
      <Stack direction="row" alignItems="center" gap={0.75}>
        <RubyIcon size={primary ? 22 : 18} color={primary ? '#fff' : accent} glow={primary} />
        <Box
          sx={{
            fontFamily: inkstashFonts.display,
            fontWeight: 800,
            fontSize: primary ? 32 : 24,
            lineHeight: 1,
            color: primary ? '#fff' : inkstashColors.ink,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {deltaSign === '-' ? '−' : deltaSign === '+' ? '+' : ''}{fmtRubies(value)}
        </Box>
      </Stack>
    </Box>
  );
}

function TxnRow({ txn }: { txn: RubyTransaction }) {
  const cfg = KIND_CONFIG[txn.kind] ?? KIND_CONFIG.admin_adjustment;
  const Icon = cfg.icon;
  const isIn = txn.delta > 0;
  const deltaColor = isIn ? inkstashColors.brand : inkstashColors.muted;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        bgcolor: inkstashColors.bgElev,
        border: `1px solid ${inkstashColors.border}`,
        borderRadius: inkstashRadii.md,
        padding: '12px 16px',
      }}
    >
      <Box
        sx={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          bgcolor: inkstashColors.bgSunken,
          display: 'grid',
          placeItems: 'center',
          flexShrink: 0,
          color: deltaColor,
        }}
      >
        <Icon size={16} color={deltaColor} />
      </Box>

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box
          sx={{
            fontFamily: inkstashFonts.ui,
            fontWeight: 600,
            fontSize: 13.5,
            color: inkstashColors.ink,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {cfg.label}
        </Box>
        <Box
          sx={{
            fontFamily: inkstashFonts.mono,
            fontSize: 10.5,
            color: inkstashColors.muted,
            letterSpacing: '0.04em',
          }}
        >
          {fmtDate(txn.created_at)}
        </Box>
      </Box>

      <Stack direction="row" alignItems="center" gap={0.5} flexShrink={0}>
        {isIn ? <ArrowUpRight size={14} color={inkstashColors.brand} /> : <ArrowDownRight size={14} color={inkstashColors.muted} />}
        <RubyIcon size={12} color={isIn ? inkstashColors.brand : inkstashColors.muted} />
        <Box
          sx={{
            fontFamily: inkstashFonts.mono,
            fontWeight: 700,
            fontSize: 14,
            color: isIn ? inkstashColors.brandDeep : inkstashColors.ink,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {isIn ? '+' : '−'}{fmtRubies(Math.abs(txn.delta))}
        </Box>
      </Stack>
    </Box>
  );
}
