// src/components/packs/VendorPackHeader.tsx
import { Box, Avatar, Chip } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import type { Vendor } from '../../api/vendors';
import { inkstashColors, inkstashFonts } from '../../theme/inkstashTokens';

interface Props {
  vendor: Vendor;
}

export default function VendorPackHeader({ vendor }: Props) {
  return (
    <Box
      component={RouterLink}
      to={`/v/${vendor.handle}`}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        textDecoration: 'none',
        color: 'inherit',
        py: 1.5,
        px: 2,
        borderRadius: 2,
        bgcolor: inkstashColors.bgSunken,
        border: `1px solid ${inkstashColors.border}`,
        transition: 'background 140ms ease',
        '&:hover': { bgcolor: inkstashColors.bgElev },
      }}
    >
      <Avatar
        src={vendor.avatar_url ?? undefined}
        alt={vendor.display_name}
        sx={{ width: 40, height: 40 }}
      >
        {vendor.display_name[0]?.toUpperCase()}
      </Avatar>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box
          sx={{
            fontFamily: inkstashFonts.ui,
            fontWeight: 700,
            fontSize: 14,
            color: inkstashColors.ink,
          }}
        >
          {vendor.display_name}
        </Box>
        <Box
          sx={{
            fontFamily: inkstashFonts.mono,
            fontSize: 11,
            color: inkstashColors.muted,
          }}
        >
          @{vendor.handle}
        </Box>
      </Box>
      {vendor.is_publisher && (
        <Chip
          label="Publisher exclusive"
          size="small"
          sx={{
            bgcolor: inkstashColors.brand,
            color: '#fff',
            fontFamily: inkstashFonts.mono,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}
        />
      )}
    </Box>
  );
}
