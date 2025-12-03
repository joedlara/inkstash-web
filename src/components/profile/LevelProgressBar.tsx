import React from 'react';
import { Box, LinearProgress, Typography, Tooltip } from '@mui/material';
import { styled } from '@mui/material/styles';

interface LevelProgressBarProps {
  level: number;
  currentXP: number;
  xpToNext: number;
  variant?: 'compact' | 'detailed';
  showLabel?: boolean;
}

const StyledLinearProgress = styled(LinearProgress)(({ theme }) => ({
  height: 8,
  borderRadius: 4,
  backgroundColor: theme.palette.mode === 'dark'
    ? 'rgba(255, 255, 255, 0.1)'
    : 'rgba(0, 0, 0, 0.1)',
  '& .MuiLinearProgress-bar': {
    borderRadius: 4,
    background: 'linear-gradient(90deg, #0078FF 0%, #00C6FF 100%)',
  },
}));

const LevelBadge = styled(Box)(({ theme }) => ({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: 40,
  height: 40,
  borderRadius: '50%',
  background: 'linear-gradient(135deg, #0078FF 0%, #00C6FF 100%)',
  color: '#fff',
  fontWeight: 700,
  fontSize: '1rem',
  marginRight: theme.spacing(1.5),
  boxShadow: '0 2px 8px rgba(0, 120, 255, 0.3)',
}));

export const LevelProgressBar: React.FC<LevelProgressBarProps> = ({
  level,
  currentXP,
  xpToNext,
  variant = 'detailed',
  showLabel = true,
}) => {
  const progress = (currentXP / xpToNext) * 100;
  const xpRemaining = xpToNext - currentXP;

  if (variant === 'compact') {
    return (
      <Tooltip title={`${currentXP.toLocaleString()} / ${xpToNext.toLocaleString()} XP`}>
        <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
          <LevelBadge sx={{ minWidth: 32, height: 32, fontSize: '0.875rem', mr: 1 }}>
            {level}
          </LevelBadge>
          <Box sx={{ flex: 1 }}>
            <StyledLinearProgress variant="determinate" value={progress} />
          </Box>
        </Box>
      </Tooltip>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      {showLabel && (
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <LevelBadge>
            {level}
          </LevelBadge>
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle2" fontWeight={600}>
              Level {level}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {currentXP.toLocaleString()} / {xpToNext.toLocaleString()} XP
            </Typography>
          </Box>
          <Typography variant="caption" color="text.secondary">
            {xpRemaining.toLocaleString()} XP to level {level + 1}
          </Typography>
        </Box>
      )}
      <StyledLinearProgress variant="determinate" value={progress} />
    </Box>
  );
};
