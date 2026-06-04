// src/components/livestreams/host/ThumbnailUploader.tsx
//
// File picker → Supabase Storage upload → returns a public URL via onChange.
// Reuses the user-uploads bucket that ListItem uses for listing photos.
// Click-to-replace, hover-to-remove on the preview tile.

import { useRef, useState } from 'react';
import { Box, Button, IconButton, CircularProgress, Typography } from '@mui/material';
import { ImageOutlined, Close } from '@mui/icons-material';
import { supabase } from '../../../api/supabase/supabaseClient';
import { useAuth } from '../../../hooks/useAuth';
import { inkstashColors, inkstashRadii , inkstashFonts} from '../../../theme/inkstashTokens';

interface Props {
  value: string | null;
  onChange: (url: string | null) => void;
}

const BUCKET = 'user-uploads';
const MAX_BYTES = 5 * 1024 * 1024;

export default function ThumbnailUploader({ value, onChange }: Props) {
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    if (!user) return;
    if (file.size > MAX_BYTES) {
      setError('Image must be under 5MB.');
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const ext = file.name.split('.').pop() ?? 'jpg';
      const path = `livestream-thumbnails/${user.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) {
        setError(upErr.message);
        return;
      }
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
      onChange(data.publicUrl);
    } finally {
      setUploading(false);
    }
  }

  function openPicker() {
    inputRef.current?.click();
  }

  if (value) {
    return (
      <Box sx={{ position: 'relative', width: '100%', maxWidth: 240 }}>
        <Box
          onClick={openPicker}
          sx={{
            position: 'relative',
            width: '100%',
            aspectRatio: '16 / 10',
            backgroundImage: `url(${value})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            borderRadius: inkstashRadii.md,
            border: `1px solid ${inkstashColors.border}`,
            cursor: 'pointer',
            transition: 'border-color 160ms cubic-bezier(0.23, 1, 0.32, 1)',
            '&:hover': { borderColor: inkstashColors.brand },
          }}
        />
        <IconButton
          onClick={(e) => {
            e.stopPropagation();
            onChange(null);
          }}
          size="small"
          aria-label="Remove thumbnail"
          sx={{
            position: 'absolute',
            top: 6,
            right: 6,
            bgcolor: 'rgba(10,10,10,0.7)',
            color: '#fff',
            width: 24,
            height: 24,
            '&:hover': { bgcolor: 'rgba(10,10,10,0.9)' },
          }}
        >
          <Close sx={{ fontSize: 14 }} />
        </IconButton>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = '';
          }}
        />
      </Box>
    );
  }

  return (
    <Box>
      <Button
        onClick={openPicker}
        disabled={uploading}
        startIcon={uploading ? <CircularProgress size={14} /> : <ImageOutlined />}
        sx={{
          fontFamily: inkstashFonts.ui,
          fontSize: 13,
          fontWeight: 700,
          textTransform: 'none',
          letterSpacing: '-0.005em',
          color: inkstashColors.ink,
          bgcolor: inkstashColors.bgSunken,
          border: `1px solid ${inkstashColors.border}`,
          borderRadius: 999,
          px: 1.75,
          py: 0.85,
          '&:hover': { bgcolor: inkstashColors.border, borderColor: inkstashColors.borderStrong },
        }}
      >
        {uploading ? 'Uploading…' : 'Upload image'}
      </Button>
      {error && (
        <Typography sx={{ mt: 1, color: inkstashColors.brand, fontSize: 12 }}>
          {error}
        </Typography>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = '';
        }}
      />
    </Box>
  );
}
