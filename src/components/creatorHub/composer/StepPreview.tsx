// src/components/creatorHub/composer/StepPreview.tsx
//
// Step 4 of the Go Live composer. Full summary before publish + (later)
// a camera preview card. The publish action is in the composer footer;
// this is read-only confirmation.

import { Box, Typography } from '@mui/material';
import type { ComposerDetails, ComposerItem, ComposerSettings } from './types';
import { TYPE_LABEL } from './types';
import { inkstashColors, inkstashFonts, inkstashRadii } from '../../../theme/inkstashTokens';

interface Props {
  mode: 'live' | 'schedule';
  details: ComposerDetails;
  items: ComposerItem[];
  settings: ComposerSettings;
}

export default function StepPreview({ mode, details, items, settings }: Props) {
  const counts = items.reduce(
    (acc, it) => { acc[it.type] = (acc[it.type] || 0) + 1; return acc; },
    {} as Record<string, number>,
  );

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
      {/* Left — camera preview placeholder */}
      <Box>
        <SectionLabel>{details.thumb.src ? 'Thumbnail' : 'Camera preview'}</SectionLabel>
        <Box
          sx={{
            position: 'relative',
            aspectRatio: '4 / 5',
            borderRadius: inkstashRadii.lg,
            bgcolor: inkstashColors.stage,
            color: 'rgba(255,255,255,0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: inkstashFonts.ui,
            fontSize: 13,
            textAlign: 'center',
            px: 3,
            border: `1px solid ${inkstashColors.border}`,
            overflow: 'hidden',
          }}
        >
          {details.thumb.src ? (
            <Box component="img" src={details.thumb.src} alt=""
              sx={{
                position: 'absolute', inset: 0,
                width: '100%', height: '100%',
                objectFit: 'cover',
              }}
            />
          ) : (
            mode === 'live'
              ? 'Camera preview ships with the dual-device pairing flow.'
              : 'Schedule mode — the camera connects when you go live.'
          )}
        </Box>
      </Box>

      {/* Right — summary */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        <Box>
          <SectionLabel>Show</SectionLabel>
          <SummaryRow label="Title" value={details.title || 'Untitled show'} />
          <SummaryRow label="Category" value={details.category} />
          <SummaryRow label="Language" value={details.language} />
          {mode === 'schedule' && (
            <SummaryRow
              label="When"
              value={details.scheduledAt
                ? new Date(details.scheduledAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
                : 'Not set'}
            />
          )}
          {details.description && (
            <Box sx={{ mt: 1.5 }}>
              <SectionLabel>Description</SectionLabel>
              <Typography sx={{
                fontFamily: inkstashFonts.ui, fontSize: 13.5,
                color: inkstashColors.ink2, lineHeight: 1.55,
              }}>
                {details.description}
              </Typography>
            </Box>
          )}
        </Box>

        <Box>
          <SectionLabel>Run of show</SectionLabel>
          <SummaryRow label="Total lots" value={`${items.length}`} />
          {(Object.keys(TYPE_LABEL) as (keyof typeof TYPE_LABEL)[]).map((t) => (
            counts[t] ? <SummaryRow key={t} label={TYPE_LABEL[t]} value={`${counts[t]}`} /> : null
          ))}
          {items.length === 0 && (
            <Typography sx={{
              fontFamily: inkstashFonts.ui, fontSize: 12.5,
              color: inkstashColors.muted, fontStyle: 'italic',
            }}>
              No lots queued. Add some in Run of Show before going live.
            </Typography>
          )}
        </Box>

        <Box>
          <SectionLabel>Settings</SectionLabel>
          <SummaryRow
            label="Shipping"
            value={settings.shipMode === 'free'
              ? 'Free'
              : settings.shipMode === 'calculated'
                ? 'Calculated at checkout'
                : `Flat $${settings.shipCostUsd.toFixed(2)} / item`}
          />
          {settings.combineShipments && <SummaryRow label="Combine shipments" value="On" />}
          {settings.explicit18plus && <SummaryRow label="18+ content" value="On" />}
          {settings.coupons.length > 0 && (
            <SummaryRow label="Coupons" value={`${settings.coupons.length}`} />
          )}
          {settings.moderators.length > 0 && (
            <SummaryRow label="Moderators" value={`${settings.moderators.length}`} />
          )}
        </Box>
      </Box>
    </Box>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Typography sx={{
      fontFamily: inkstashFonts.mono,
      fontSize: 11,
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
      color: inkstashColors.muted,
      mb: 1,
    }}>
      {children}
    </Typography>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      gap: 1.5,
      py: 0.75,
      borderBottom: `1px solid ${inkstashColors.border}`,
    }}>
      <Typography sx={{
        fontFamily: inkstashFonts.ui,
        fontSize: 13,
        color: inkstashColors.muted,
      }}>
        {label}
      </Typography>
      <Typography sx={{
        fontFamily: inkstashFonts.ui,
        fontSize: 13,
        fontWeight: 600,
        color: inkstashColors.ink,
        textAlign: 'right',
      }}>
        {value}
      </Typography>
    </Box>
  );
}
