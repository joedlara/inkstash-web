// src/components/creatorHub/HubPanelFrame.tsx
//
// Shared header chrome used by every Creator Hub panel. Mirrors
// .panel-head / .panel-actions in hub.css: eyebrow + display title +
// sub-line on the left, action buttons on the right.

import { Box, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import { inkstashColors, inkstashFonts } from '../../theme/inkstashTokens';

interface Props {
  /** Small mono uppercase line above the title (e.g. "Stream"). */
  eyebrow?: string;
  /** Big display title (e.g. "Live Control"). */
  title: string;
  /** Optional body sub-line under the title. */
  sub?: string;
  /** Buttons / pills rendered on the right side of the header row. */
  actions?: ReactNode;
  /** Panel body. */
  children: ReactNode;
}

export default function HubPanelFrame({
  eyebrow, title, sub, actions, children,
}: Props) {
  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: 2,
          flexWrap: 'wrap',
          mb: 3.5,
        }}
      >
        <Box>
          {eyebrow && (
            <Typography
              sx={{
                fontFamily: inkstashFonts.mono,
                fontSize: 11,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: inkstashColors.muted,
                mb: 1,
              }}
            >
              {eyebrow}
            </Typography>
          )}
          <Typography
            component="h1"
            sx={{
              fontFamily: inkstashFonts.display,
              fontWeight: 900,
              fontSize: { xs: 28, md: 36 },
              color: inkstashColors.ink,
              letterSpacing: '-0.005em',
              lineHeight: 1,
              textTransform: 'uppercase',
            }}
          >
            {title}
          </Typography>
          {sub && (
            <Typography
              sx={{
                fontFamily: inkstashFonts.ui,
                fontSize: 14,
                color: inkstashColors.muted,
                mt: 1,
                maxWidth: 560,
              }}
            >
              {sub}
            </Typography>
          )}
        </Box>
        {actions && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, flexWrap: 'wrap' }}>
            {actions}
          </Box>
        )}
      </Box>
      {children}
    </Box>
  );
}
