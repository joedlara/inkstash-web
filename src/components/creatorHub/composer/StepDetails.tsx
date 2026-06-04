// src/components/creatorHub/composer/StepDetails.tsx
//
// Step 1 of the Go Live composer. Title, description, category,
// primary language, and (later) a thumbnail editor.
//
// The thumbnail editor is a future commit — for now we render a
// placeholder slot so the layout matches the spec.

import { Box, MenuItem, Select, TextField, Typography } from '@mui/material';
import type { ComposerDetails } from './types';
import { CATEGORIES, LANGUAGES } from './types';
import { inkstashColors, inkstashFonts, inkstashRadii } from '../../../theme/inkstashTokens';

interface Props {
  details: ComposerDetails;
  setDetails: (next: ComposerDetails) => void;
  mode: 'live' | 'schedule';
}

export default function StepDetails({ details, setDetails, mode }: Props) {
  const update = <K extends keyof ComposerDetails>(key: K, value: ComposerDetails[K]) =>
    setDetails({ ...details, [key]: value });

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.4fr 1fr' }, gap: 3 }}>
      {/* Main column — text fields */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.25 }}>
        <Field label="Show title" required>
          <TextField
            fullWidth
            value={details.title}
            onChange={(e) => update('title', e.target.value)}
            placeholder="Midnight Mythic Madness — 50 pack rip"
            inputProps={{ maxLength: 120 }}
            sx={inputSx}
          />
        </Field>

        <Field label="Description">
          <TextField
            fullWidth
            multiline
            minRows={3}
            maxRows={6}
            value={details.description}
            onChange={(e) => update('description', e.target.value)}
            placeholder="Tell viewers what you're opening tonight."
            inputProps={{ maxLength: 800 }}
            sx={inputSx}
          />
        </Field>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
          <Field label="Category">
            <Select
              fullWidth
              value={details.category}
              onChange={(e) => update('category', String(e.target.value))}
              sx={inputSx}
            >
              {CATEGORIES.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </Select>
          </Field>
          <Field label="Primary language">
            <Select
              fullWidth
              value={details.language}
              onChange={(e) => update('language', String(e.target.value))}
              sx={inputSx}
            >
              {LANGUAGES.map((l) => <MenuItem key={l} value={l}>{l}</MenuItem>)}
            </Select>
          </Field>
        </Box>

        {mode === 'schedule' && (
          <Field label="When">
            <TextField
              fullWidth
              type="datetime-local"
              value={details.scheduledAt ? details.scheduledAt.slice(0, 16) : ''}
              onChange={(e) => update(
                'scheduledAt',
                e.target.value ? new Date(e.target.value).toISOString() : null,
              )}
              sx={inputSx}
            />
          </Field>
        )}
      </Box>

      {/* Side column — thumbnail editor placeholder */}
      <Box>
        <Typography
          sx={{
            fontFamily: inkstashFonts.ui,
            fontSize: 12.5,
            fontWeight: 700,
            color: inkstashColors.ink,
            letterSpacing: '-0.005em',
            textTransform: 'uppercase',
            mb: 1,
          }}
        >
          Thumbnail
        </Typography>
        <Box
          sx={{
            aspectRatio: '4 / 5',
            borderRadius: inkstashRadii.lg,
            border: `1px dashed ${inkstashColors.border}`,
            bgcolor: inkstashColors.bgSunken,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: inkstashColors.muted,
            fontFamily: inkstashFonts.ui,
            fontSize: 12.5,
            textAlign: 'center',
            px: 3,
          }}
        >
          Photo editor lands in a follow-up commit
        </Box>
      </Box>
    </Box>
  );
}

function Field({
  label, required = false, children,
}: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <Box>
      <Typography
        sx={{
          fontFamily: inkstashFonts.ui,
          fontSize: 12.5,
          fontWeight: 700,
          color: inkstashColors.ink,
          letterSpacing: '-0.005em',
          textTransform: 'uppercase',
          mb: 0.75,
        }}
      >
        {label}
        {required && (
          <Box component="span" sx={{ ml: 0.5, color: inkstashColors.brand }}>*</Box>
        )}
      </Typography>
      {children}
    </Box>
  );
}

const inputSx = {
  '& .MuiInputBase-root': {
    fontFamily: inkstashFonts.ui,
    fontSize: 14,
    bgcolor: inkstashColors.bgSunken,
    borderRadius: 1.5,
  },
  '& fieldset': { borderColor: inkstashColors.border },
  '& .MuiInputBase-input': { letterSpacing: '-0.005em' },
  '& .MuiSelect-select': { fontFamily: 'inherit', fontSize: 14 },
} as const;
