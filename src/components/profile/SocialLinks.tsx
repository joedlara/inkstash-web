import React from 'react';
import { Box, Typography, IconButton, Tooltip, Link as MuiLink, Stack } from '@mui/material';
import {
  Twitter as TwitterIcon,
  Instagram as InstagramIcon,
  YouTube as YouTubeIcon,
  Language as WebsiteIcon,
  Chat as DiscordIcon,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import type { SocialLinks as SocialLinksType } from '../../api/users/profile';

// Custom icons for TikTok and Twitch (MUI doesn't have these)
const TikTokIcon = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
  </svg>
);

const TwitchIcon = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
    <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z" />
  </svg>
);

interface SocialLinksProps {
  socialLinks?: SocialLinksType;
  websiteUrl?: string;
  variant?: 'icon' | 'button' | 'list';
  showLabels?: boolean;
}

const SocialIconButton = styled(IconButton)(({ theme }) => ({
  backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
  '&:hover': {
    backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
  },
  transition: 'all 0.2s ease-in-out',
}));

const SocialButton = styled(Box)<{ platform: string }>(({ theme, platform }) => {
  const platformColors: Record<string, string> = {
    twitter: '#1DA1F2',
    instagram: '#E4405F',
    tiktok: '#000000',
    youtube: '#FF0000',
    twitch: '#9146FF',
    discord: '#5865F2',
    website: theme.palette.primary.main,
  };

  return {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
    padding: theme.spacing(1, 2),
    borderRadius: theme.spacing(1),
    backgroundColor: platformColors[platform] || theme.palette.grey[300],
    color: '#fff',
    textDecoration: 'none',
    transition: 'all 0.2s ease-in-out',
    cursor: 'pointer',
    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: theme.shadows[4],
    },
  };
});

export const SocialLinks: React.FC<SocialLinksProps> = ({
  socialLinks,
  websiteUrl,
  variant = 'icon',
  showLabels = false,
}) => {
  const links = [
    {
      platform: 'twitter',
      url: socialLinks?.twitter,
      icon: <TwitterIcon />,
      label: 'Twitter',
      color: '#1DA1F2',
    },
    {
      platform: 'instagram',
      url: socialLinks?.instagram,
      icon: <InstagramIcon />,
      label: 'Instagram',
      color: '#E4405F',
    },
    {
      platform: 'tiktok',
      url: socialLinks?.tiktok,
      icon: <TikTokIcon />,
      label: 'TikTok',
      color: '#000000',
    },
    {
      platform: 'youtube',
      url: socialLinks?.youtube,
      icon: <YouTubeIcon />,
      label: 'YouTube',
      color: '#FF0000',
    },
    {
      platform: 'twitch',
      url: socialLinks?.twitch,
      icon: <TwitchIcon />,
      label: 'Twitch',
      color: '#9146FF',
    },
    {
      platform: 'discord',
      url: socialLinks?.discord,
      icon: <DiscordIcon />,
      label: 'Discord',
      color: '#5865F2',
    },
    {
      platform: 'website',
      url: websiteUrl || socialLinks?.website,
      icon: <WebsiteIcon />,
      label: 'Website',
      color: '#0078FF',
    },
  ];

  const activeLinks = links.filter((link) => link.url);

  if (activeLinks.length === 0) {
    return null;
  }

  // Icon variant (default)
  if (variant === 'icon') {
    return (
      <Stack direction="row" spacing={1} flexWrap="wrap">
        {activeLinks.map((link) => (
          <Tooltip key={link.platform} title={link.label} arrow>
            <SocialIconButton
              component="a"
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              size="small"
            >
              {link.icon}
            </SocialIconButton>
          </Tooltip>
        ))}
      </Stack>
    );
  }

  // Button variant
  if (variant === 'button') {
    return (
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        {activeLinks.map((link) => (
          <MuiLink
            key={link.platform}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            underline="none"
          >
            <SocialButton platform={link.platform}>
              {link.icon}
              {showLabels && (
                <Typography variant="body2" fontWeight={600}>
                  {link.label}
                </Typography>
              )}
            </SocialButton>
          </MuiLink>
        ))}
      </Stack>
    );
  }

  // List variant
  return (
    <Box>
      <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
        Social Links
      </Typography>
      <Stack spacing={1.5}>
        {activeLinks.map((link) => (
          <Box key={link.platform} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 40,
                height: 40,
                borderRadius: '50%',
                backgroundColor: link.color,
                color: '#fff',
              }}
            >
              {link.icon}
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="body2" fontWeight={600}>
                {link.label}
              </Typography>
              <MuiLink
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                variant="caption"
                color="text.secondary"
                sx={{
                  display: 'block',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: '100%',
                }}
              >
                {link.url}
              </MuiLink>
            </Box>
          </Box>
        ))}
      </Stack>
    </Box>
  );
};
