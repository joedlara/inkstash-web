import { Tooltip, Chip, Box } from '@mui/material';
import { Verified } from '@mui/icons-material';

interface VerifiedBadgeProps {
  variant?: 'icon' | 'chip' | 'inline';
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
}

export default function VerifiedBadge({
  variant = 'icon',
  size = 'medium',
  showLabel = false
}: VerifiedBadgeProps) {
  const iconSize = size === 'small' ? 16 : size === 'large' ? 24 : 20;

  const tooltipText = 'Verified Seller - This seller has been verified by InkStash';

  if (variant === 'chip') {
    return (
      <Tooltip title={tooltipText} arrow>
        <Chip
          icon={<Verified sx={{ fontSize: iconSize }} />}
          label={showLabel ? 'Verified Seller' : 'Verified'}
          color="success"
          size={size === 'small' ? 'small' : 'medium'}
          sx={{
            fontWeight: 600,
            '& .MuiChip-icon': {
              color: 'white',
            },
          }}
        />
      </Tooltip>
    );
  }

  if (variant === 'inline') {
    return (
      <Tooltip title={tooltipText} arrow>
        <Box
          component="span"
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.5,
            color: 'success.main',
            fontSize: size === 'small' ? '0.875rem' : size === 'large' ? '1.125rem' : '1rem',
            fontWeight: 600,
            ml: 0.5,
          }}
        >
          <Verified sx={{ fontSize: iconSize }} />
          {showLabel && <span>Verified</span>}
        </Box>
      </Tooltip>
    );
  }

  // Default icon variant
  return (
    <Tooltip title={tooltipText} arrow>
      <Verified
        sx={{
          fontSize: iconSize,
          color: 'success.main',
          verticalAlign: 'middle',
        }}
      />
    </Tooltip>
  );
}
