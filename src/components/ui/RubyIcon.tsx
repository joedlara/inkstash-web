import { Box } from '@mui/material';
import { inkstashColors } from '../../theme/inkstashTokens';

/** Faceted ruby gem icon in crimson. Sized via the `size` prop (px). */
export default function RubyIcon({
  size = 14,
  color = inkstashColors.brand,
  glow = false,
}: {
  size?: number;
  color?: string;
  glow?: boolean;
}) {
  return (
    <Box
      component="svg"
      viewBox="0 0 24 24"
      sx={{
        width: size,
        height: size,
        flexShrink: 0,
        filter: glow ? `drop-shadow(0 0 6px ${color}80)` : 'none',
      }}
      aria-hidden
    >
      {/* Top crown facets */}
      <path
        d="M6 9 L12 3 L18 9"
        fill="none"
        stroke={color}
        strokeWidth={1.2}
        strokeLinejoin="round"
        opacity={0.55}
      />
      {/* Outline */}
      <path
        d="M3 9 L12 3 L21 9 L12 22 Z"
        fill={color}
        stroke={color}
        strokeWidth={1}
        strokeLinejoin="round"
      />
      {/* Inner highlight facets */}
      <path
        d="M3 9 L9 9 L12 22 Z"
        fill="rgba(255,255,255,0.18)"
      />
      <path
        d="M21 9 L15 9 L12 22 Z"
        fill="rgba(0,0,0,0.18)"
      />
      <path
        d="M9 9 L12 3 L15 9 Z"
        fill="rgba(255,255,255,0.25)"
      />
    </Box>
  );
}
