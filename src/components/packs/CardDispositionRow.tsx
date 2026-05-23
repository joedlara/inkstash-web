import { useState } from 'react';
import { Box, Stack } from '@mui/material';
import { Vault, Truck, Check } from 'lucide-react';
import RubyIcon from '../ui/RubyIcon';
import { inventoryAPI } from '../../api/inventory';
import type { PackItem } from '../../api/packs';
import { useRubyBalance } from '../../hooks/useRubyBalance';
import { inkstashColors, inkstashFonts, inkstashRadii } from '../../theme/inkstashTokens';

const RARITY_DOT: Record<string, string> = {
  legendary: inkstashColors.gold,
  rare: inkstashColors.brand,
  common: inkstashColors.muted2,
};

const RARITY_LABEL: Record<string, string> = {
  legendary: 'Legendary',
  rare: 'Rare',
  common: 'Common',
};

const RARITY_BORDER: Record<string, string> = {
  legendary: inkstashColors.gold,
  rare: inkstashColors.brand,
  common: inkstashColors.border,
};

export type Disposition = 'pending' | 'kept' | 'sold' | 'shipped';

interface CardDispositionRowProps {
  item: PackItem;
  inventoryId: string | null;
  disposition: Disposition;
  /** Rubies already paid out for this card if it's been sold. */
  payoutRubies?: number | null;
  /** True when a sibling row or bulk action is currently mutating server-side.
   *  All buttons disable while busy is true so we can't double-pay. */
  globalBusy?: boolean;
  onChange?: (next: Disposition, payoutRubies?: number) => void;
}

function rubyPayoutFor(estimated: number | null): number {
  if (!estimated || estimated <= 0) return 0;
  return Math.floor(estimated * 90); // 90 cents on the dollar * 100 Rubies/USD
}

export default function CardDispositionRow({
  item,
  inventoryId,
  disposition,
  payoutRubies,
  globalBusy,
  onChange,
}: CardDispositionRowProps) {
  const { refresh: refreshRubies } = useRubyBalance();
  const [busy, setBusy] = useState<'sell' | 'ship' | null>(null);
  const [error, setError] = useState<string>('');

  const labelColor = RARITY_DOT[item.rarity] ?? inkstashColors.muted2;
  const borderColor = item.rarity === 'common' ? inkstashColors.border : RARITY_BORDER[item.rarity];
  const sellbackRubies = rubyPayoutFor(item.estimated_value);
  const sellable = !!inventoryId && sellbackRubies > 0;
  const shippable = !!inventoryId;
  const settled = disposition !== 'pending';

  const isBusy = busy != null || globalBusy === true;

  const handleKeep = () => {
    if (isBusy || settled) return;
    onChange?.('kept');
  };

  const handleSell = async () => {
    if (!inventoryId || isBusy || settled) return;
    setBusy('sell');
    setError('');
    try {
      const result = await inventoryAPI.sellBack(inventoryId);
      refreshRubies();
      onChange?.('sold', result.payout_rubies);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sell back');
    } finally {
      setBusy(null);
    }
  };

  const handleShip = async () => {
    if (!inventoryId || isBusy || settled) return;
    setBusy('ship');
    setError('');
    try {
      await inventoryAPI.requestShip(inventoryId);
      onChange?.('shipped');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not request shipping');
    } finally {
      setBusy(null);
    }
  };

  const ratioLabel = item.quantity > 0 && item.quantity <= 50 ? `1:${item.quantity * 50}` : null;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        padding: '14px 18px',
        bgcolor: inkstashColors.bgElev,
        border: `1px solid ${borderColor}`,
        borderRadius: inkstashRadii.md,
        opacity: settled ? 0.92 : 1,
        transition: 'opacity 200ms ease',
      }}
    >
      {/* Larger thumb of the variant art */}
      <Box
        sx={{
          width: 64,
          height: 84,
          borderRadius: inkstashRadii.sm,
          bgcolor: inkstashColors.bgSunken,
          flexShrink: 0,
          backgroundImage: item.image_url ? `url(${item.image_url})` : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          border: `1px solid ${inkstashColors.border}`,
        }}
      />

      <Box sx={{ flex: 1, minWidth: 0 }}>
        {/* Title row */}
        <Box
          sx={{
            fontFamily: inkstashFonts.ui,
            fontWeight: 700,
            fontSize: 14.5,
            color: inkstashColors.ink,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            mb: 0.5,
          }}
        >
          {item.comic_title}
          {item.issue_number && (
            <Box component="span" sx={{ color: inkstashColors.muted, fontWeight: 400 }}>
              {' '}
              {item.issue_number}
            </Box>
          )}
        </Box>

        {/* Metadata chips row: rarity / ratio / grade+condition */}
        <Stack direction="row" gap={0.75} alignItems="center" flexWrap="wrap" mb={0.5}>
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.5,
              padding: '2px 8px',
              borderRadius: 999,
              bgcolor: `${labelColor}1a`,
              color: labelColor,
              fontFamily: inkstashFonts.mono,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: labelColor }} />
            {RARITY_LABEL[item.rarity] ?? item.rarity}
          </Box>
          {ratioLabel && (
            <Box
              sx={{
                padding: '2px 8px',
                borderRadius: 999,
                bgcolor: inkstashColors.bgSunken,
                color: inkstashColors.ink2,
                fontFamily: inkstashFonts.mono,
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.06em',
              }}
            >
              {ratioLabel}
            </Box>
          )}
          {item.grade && (
            <Box
              sx={{
                padding: '2px 8px',
                borderRadius: 999,
                bgcolor: inkstashColors.bgSunken,
                color: inkstashColors.ink2,
                fontFamily: inkstashFonts.mono,
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.06em',
              }}
            >
              {item.grade}
            </Box>
          )}
          {item.condition && !item.grade && (
            <Box
              sx={{
                padding: '2px 8px',
                borderRadius: 999,
                bgcolor: inkstashColors.bgSunken,
                color: inkstashColors.ink2,
                fontFamily: inkstashFonts.mono,
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.06em',
              }}
            >
              {item.condition}
            </Box>
          )}
        </Stack>

        {/* Estimated value */}
        <Stack direction="row" gap={1} alignItems="baseline">
          {item.estimated_value != null && (
            <Box
              sx={{
                fontFamily: inkstashFonts.display,
                fontWeight: 800,
                fontSize: 15,
                color: inkstashColors.ink,
                lineHeight: 1,
              }}
            >
              ${item.estimated_value.toFixed(2)}
            </Box>
          )}
          <Box
            sx={{
              fontFamily: inkstashFonts.mono,
              fontSize: 9.5,
              color: inkstashColors.muted,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            est. value
          </Box>
          {error && (
            <Box sx={{ fontFamily: inkstashFonts.mono, fontSize: 10.5, color: '#ef4444', ml: 'auto' }}>
              {error}
            </Box>
          )}
        </Stack>
      </Box>

      {settled ? (
        <SettledChip disposition={disposition} payout={payoutRubies ?? null} />
      ) : (
        <Stack direction="row" gap={0.75} alignItems="center" flexShrink={0}>
          <DispositionButton
            label="Keep"
            icon={<Vault size={13} />}
            onClick={handleKeep}
            tone="neutral"
            disabled={isBusy}
          />
          <DispositionButton
            label={
              sellable ? (
                <>
                  <RubyIcon size={11} color="#fff" />
                  {sellbackRubies.toLocaleString('en-US')}
                </>
              ) : 'Sell back'
            }
            onClick={handleSell}
            tone="primary"
            disabled={!sellable || isBusy}
            busy={busy === 'sell' || (globalBusy === true && sellable)}
          />
          <DispositionButton
            label="Ship"
            icon={<Truck size={13} />}
            onClick={handleShip}
            tone="neutral"
            disabled={!shippable || isBusy}
            busy={busy === 'ship'}
          />
        </Stack>
      )}
    </Box>
  );
}

function DispositionButton({
  label,
  icon,
  onClick,
  tone,
  disabled,
  busy,
}: {
  label: React.ReactNode;
  icon?: React.ReactNode;
  onClick: () => void;
  tone: 'primary' | 'neutral';
  disabled?: boolean;
  busy?: boolean;
}) {
  const isPrimary = tone === 'primary';
  return (
    <Box
      component="button"
      type="button"
      onClick={onClick}
      disabled={disabled}
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.5,
        bgcolor: isPrimary ? inkstashColors.brand : 'transparent',
        color: isPrimary ? '#fff' : inkstashColors.ink2,
        border: isPrimary ? 'none' : `1px solid ${inkstashColors.border}`,
        padding: '7px 12px',
        borderRadius: 999,
        fontFamily: inkstashFonts.ui,
        fontWeight: 700,
        fontSize: 12,
        letterSpacing: '0.01em',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'background 140ms ease, color 140ms ease, transform 100ms ease',
        '&:hover': isPrimary
          ? { bgcolor: inkstashColors.brandDeep }
          : { bgcolor: inkstashColors.bgSunken, color: inkstashColors.ink },
        '&:active': { transform: disabled ? 'none' : 'scale(0.97)' },
      }}
    >
      {busy ? (
        <Box
          sx={{
            width: 11,
            height: 11,
            borderRadius: '50%',
            border: `2px solid ${isPrimary ? 'rgba(255,255,255,0.3)' : inkstashColors.border}`,
            borderTopColor: isPrimary ? '#fff' : inkstashColors.ink,
            animation: 'inkstashBtnSpin 0.7s linear infinite',
            '@keyframes inkstashBtnSpin': { to: { transform: 'rotate(360deg)' } },
          }}
        />
      ) : (
        icon
      )}
      {label}
    </Box>
  );
}

function SettledChip({
  disposition,
  payout,
}: {
  disposition: Disposition;
  payout: number | null;
}) {
  const config: Record<Exclude<Disposition, 'pending'>, { label: React.ReactNode; bg: string; fg: string; icon?: React.ReactNode }> = {
    kept: {
      label: 'Kept in vault',
      bg: inkstashColors.bgSunken,
      fg: inkstashColors.ink,
      icon: <Vault size={12} />,
    },
    sold: {
      label: (
        <>
          Sold for{' '}
          <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.4 }}>
            <RubyIcon size={11} />
            {(payout ?? 0).toLocaleString('en-US')}
          </Box>
        </>
      ),
      bg: inkstashColors.brandSoft,
      fg: inkstashColors.brandDeep,
      icon: <Check size={12} />,
    },
    shipped: {
      label: 'Ship requested',
      bg: inkstashColors.goldSoft,
      fg: '#7a5520',
      icon: <Truck size={12} />,
    },
  };

  const c = config[disposition as Exclude<Disposition, 'pending'>];

  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.5,
        bgcolor: c.bg,
        color: c.fg,
        padding: '7px 12px',
        borderRadius: 999,
        fontFamily: inkstashFonts.mono,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        animation: 'inkstashSettledIn 320ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        '@keyframes inkstashSettledIn': {
          '0%': { opacity: 0, transform: 'scale(0.85)' },
          '100%': { opacity: 1, transform: 'scale(1)' },
        },
      }}
    >
      {c.icon}
      {c.label}
    </Box>
  );
}
