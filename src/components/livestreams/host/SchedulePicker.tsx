// src/components/livestreams/host/SchedulePicker.tsx
//
// "Schedule for later" toggle. When off, the stream goes live immediately
// (value = null). When on, exposes a datetime-local input that returns
// the ISO timestamp. Browser-native picker — no extra deps.

import { Box, Switch, TextField, Typography } from '@mui/material';
import { inkstashColors } from '../../../theme/inkstashTokens';

interface Props {
  value: string | null;
  onChange: (iso: string | null) => void;
}

function isoToLocalInput(iso: string): string {
  // datetime-local wants YYYY-MM-DDTHH:mm in the user's local tz, no Z.
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function localInputToIso(input: string): string | null {
  if (!input) return null;
  // The browser treats datetime-local as a local time. new Date() parses
  // it in the user's local tz, which is what we want.
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export default function SchedulePicker({ value, onChange }: Props) {
  const enabled = value !== null;

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Switch
          checked={enabled}
          onChange={(e) => {
            if (e.target.checked) {
              // Default to 1 hour from now
              const next = new Date(Date.now() + 60 * 60 * 1000);
              onChange(next.toISOString());
            } else {
              onChange(null);
            }
          }}
          sx={{
            '& .MuiSwitch-switchBase.Mui-checked': { color: inkstashColors.brand },
            '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
              bgcolor: inkstashColors.brand,
            },
          }}
        />
        <Typography
          sx={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: 13,
            color: inkstashColors.ink,
            letterSpacing: '-0.005em',
          }}
        >
          Schedule for later
        </Typography>
      </Box>
      {enabled && (
        <TextField
          type="datetime-local"
          value={value ? isoToLocalInput(value) : ''}
          onChange={(e) => onChange(localInputToIso(e.target.value))}
          size="small"
          sx={{
            mt: 1,
            '& .MuiInputBase-root': {
              fontFamily: "'Outfit', sans-serif",
              fontSize: 13,
              bgcolor: inkstashColors.bgSunken,
              borderRadius: 1.5,
            },
            '& fieldset': { borderColor: inkstashColors.border },
          }}
        />
      )}
    </Box>
  );
}
