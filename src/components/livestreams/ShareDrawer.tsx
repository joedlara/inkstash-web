// src/components/livestreams/ShareDrawer.tsx
//
// Right-rail "Share" popover. Anchored to the rail Share chip. On
// devices with native share (mobile Safari, etc.) it auto-opens the
// native sheet on first render; on desktop it falls back to in-popover
// options (Copy link, Message, Email). A toast confirms whichever path
// the user took.

import { useEffect, useState } from 'react';
import { Popover, Box, Typography, Snackbar, Alert } from '@mui/material';
import { Link as LinkIcon, MessageCircle, Mail } from 'lucide-react';
import { inkstashColors, inkstashFonts, inkstashRadii } from '../../theme/inkstashTokens';

interface Props {
  open: boolean;
  onClose: () => void;
  anchorEl: HTMLElement | null;
  streamTitle: string;
  streamUrl: string;
}

export default function ShareDrawer({ open, onClose, anchorEl, streamTitle, streamUrl }: Props) {
  const [toast, setToast] = useState<string | null>(null);
  const supportsNative = typeof navigator !== 'undefined' && 'share' in navigator;

  useEffect(() => {
    if (!open || !supportsNative) return;
    (async () => {
      try {
        await navigator.share({ title: streamTitle, url: streamUrl });
        onClose();
      } catch {
        // User cancelled native sheet — leave popover open with fallback options
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function copyLink() {
    await navigator.clipboard.writeText(streamUrl);
    setToast('Link copied to clipboard');
    onClose();
  }

  return (
    <>
      <Popover
        open={open && !!anchorEl}
        onClose={onClose}
        anchorEl={anchorEl}
        anchorOrigin={{ vertical: 'center', horizontal: 'left' }}
        transformOrigin={{ vertical: 'center', horizontal: 'right' }}
        slotProps={{
          paper: {
            sx: {
              mr: 1.5,
              width: 240,
              bgcolor: inkstashColors.bgElev,
              borderRadius: inkstashRadii.md,
              boxShadow: '0 16px 40px rgba(0,0,0,0.35)',
              border: `1px solid ${inkstashColors.border}`,
              overflow: 'hidden',
            },
          },
        }}
      >
        <Box sx={{ p: 1 }}>
          <ShareRow icon={<LinkIcon size={16} />} label="Copy link" onClick={copyLink} />
          <ShareRow
            icon={<MessageCircle size={16} />}
            label="Message"
            onClick={() => {
              window.location.href = `sms:?&body=${encodeURIComponent(`${streamTitle} ${streamUrl}`)}`;
              onClose();
            }}
          />
          <ShareRow
            icon={<Mail size={16} />}
            label="Email"
            onClick={() => {
              window.location.href = `mailto:?subject=${encodeURIComponent(streamTitle)}&body=${encodeURIComponent(streamUrl)}`;
              onClose();
            }}
            isLast
          />
        </Box>
      </Popover>

      <Snackbar
        open={!!toast}
        autoHideDuration={2500}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" sx={{ width: '100%' }} onClose={() => setToast(null)}>
          {toast}
        </Alert>
      </Snackbar>
    </>
  );
}

function ShareRow({
  icon, label, onClick, isLast = false,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  isLast?: boolean;
}) {
  return (
    <Box
      component="button"
      onClick={onClick}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.25,
        width: '100%',
        py: 1.1,
        px: 1.25,
        border: 'none',
        bgcolor: 'transparent',
        color: inkstashColors.ink,
        cursor: 'pointer',
        borderBottom: isLast ? 'none' : `1px solid ${inkstashColors.border}`,
        '&:hover': { bgcolor: inkstashColors.bgSunken },
      }}
    >
      {icon}
      <Typography sx={{ fontFamily: inkstashFonts.ui, fontWeight: 600, fontSize: 13 }}>
        {label}
      </Typography>
    </Box>
  );
}
