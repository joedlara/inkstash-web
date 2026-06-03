// src/components/livestreams/ShareDrawer.tsx
//
// Triggered from the right rail Share button. On mobile, prefers the native
// share sheet via navigator.share(); falls back to copying the URL on web
// where share isn't supported. A toast confirms either path.

import { useEffect, useState } from 'react';
import { Drawer, Box, Typography, Button, Snackbar, Alert } from '@mui/material';
import { Link as LinkIcon, MessageCircle, Mail } from 'lucide-react';
import { inkstashColors, inkstashFonts, inkstashRadii } from '../../theme/inkstashTokens';

interface Props {
  open: boolean;
  onClose: () => void;
  streamTitle: string;
  streamUrl: string;
}

export default function ShareDrawer({ open, onClose, streamTitle, streamUrl }: Props) {
  const [toast, setToast] = useState<string | null>(null);
  const supportsNative = typeof navigator !== 'undefined' && 'share' in navigator;

  // On open, immediately try native share if available — saves the user a tap.
  // If they cancel or it's not supported, fall back to the in-drawer options.
  useEffect(() => {
    if (!open || !supportsNative) return;
    (async () => {
      try {
        await navigator.share({ title: streamTitle, url: streamUrl });
        onClose();
      } catch {
        // User cancelled native sheet — leave drawer open with fallback options
      }
    })();
    // Intentionally only run on `open` transitioning true
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function copyLink() {
    await navigator.clipboard.writeText(streamUrl);
    setToast('Link copied to clipboard');
    onClose();
  }

  return (
    <>
      <Drawer
        anchor="bottom"
        open={open}
        onClose={onClose}
        PaperProps={{
          sx: {
            bgcolor: inkstashColors.bgElev,
            borderTopLeftRadius: inkstashRadii.lg,
            borderTopRightRadius: inkstashRadii.lg,
            pb: 'max(env(safe-area-inset-bottom), 16px)',
          },
        }}
      >
        <Box sx={{ p: 3 }}>
          <Typography
            sx={{
              fontFamily: inkstashFonts.display,
              fontWeight: 900,
              fontSize: 18,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              mb: 2,
            }}
          >
            Share stream
          </Typography>

          <ShareRow icon={<LinkIcon size={18} />} label="Copy link" onClick={copyLink} />
          <ShareRow
            icon={<MessageCircle size={18} />}
            label="Message"
            onClick={() => {
              window.location.href = `sms:?&body=${encodeURIComponent(`${streamTitle} ${streamUrl}`)}`;
              onClose();
            }}
          />
          <ShareRow
            icon={<Mail size={18} />}
            label="Email"
            onClick={() => {
              window.location.href = `mailto:?subject=${encodeURIComponent(streamTitle)}&body=${encodeURIComponent(streamUrl)}`;
              onClose();
            }}
          />

          <Button
            fullWidth
            onClick={onClose}
            sx={{
              mt: 1,
              py: 1.2,
              fontFamily: inkstashFonts.ui,
              fontWeight: 700,
              textTransform: 'uppercase',
              color: inkstashColors.muted,
            }}
          >
            Cancel
          </Button>
        </Box>
      </Drawer>

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

function ShareRow({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <Box
      component="button"
      onClick={onClick}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        width: '100%',
        py: 1.5,
        px: 1,
        border: 'none',
        bgcolor: 'transparent',
        color: inkstashColors.ink,
        cursor: 'pointer',
        borderBottom: `1px solid ${inkstashColors.border}`,
        '&:hover': { bgcolor: inkstashColors.bgSunken },
      }}
    >
      {icon}
      <Typography sx={{ fontFamily: inkstashFonts.ui, fontWeight: 600, fontSize: 14 }}>
        {label}
      </Typography>
    </Box>
  );
}
