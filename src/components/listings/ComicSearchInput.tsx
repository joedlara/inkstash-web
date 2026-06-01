// src/components/listings/ComicSearchInput.tsx
//
// Autocomplete input wrapping comicCatalogAPI.search(). Renders a dropdown
// with cover thumbnail + title + publisher chip. Includes a "Don't see your
// comic? Enter manually." fallback that surfaces a small free-text form.

import { useEffect, useRef, useState } from 'react';
import {
  Box,
  TextField,
  Paper,
  CircularProgress,
  Typography,
  Button,
  Chip,
} from '@mui/material';
import { comicCatalogAPI, type ComicCatalogResult } from '../../api/comicCatalog';
import { inkstashColors, inkstashFonts, inkstashRadii } from '../../theme/inkstashTokens';

export interface ComicSelection {
  /** ComicVine id if selected from autocomplete; null for free-text entries. */
  comic_vine_id: number | null;
  title: string;
  issue_number: string | null;
  cover_url: string | null;
  publisher: string | null;
  writer: string | null;
  artist: string | null;
}

interface Props {
  onSelect: (selection: ComicSelection) => void;
}

export default function ComicSearchInput({ onSelect }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ComicCatalogResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showManual, setShowManual] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Manual entry fields
  const [manualTitle, setManualTitle] = useState('');
  const [manualIssue, setManualIssue] = useState('');
  const [manualPublisher, setManualPublisher] = useState('');
  const [manualWriter, setManualWriter] = useState('');
  const [manualArtist, setManualArtist] = useState('');

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(() => {
      setLoading(true);
      setError(null);
      comicCatalogAPI.search(query)
        .then((rs) => setResults(rs))
        .catch((err) => setError(err.message ?? 'Search failed'))
        .finally(() => setLoading(false));
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  function handlePick(r: ComicCatalogResult) {
    onSelect({
      comic_vine_id: r.id,
      title: r.name,
      issue_number: r.issue_number,
      cover_url: r.cover_url,
      publisher: r.publisher,
      writer: r.writer,
      artist: r.artist,
    });
  }

  function handleManualSubmit() {
    if (!manualTitle.trim()) return;
    onSelect({
      comic_vine_id: null,
      title: manualTitle.trim(),
      issue_number: manualIssue.trim() || null,
      cover_url: null,
      publisher: manualPublisher.trim() || null,
      writer: manualWriter.trim() || null,
      artist: manualArtist.trim() || null,
    });
  }

  if (showManual) {
    return (
      <Box>
        <Typography sx={{ fontSize: 13, color: inkstashColors.muted, mb: 1.5, fontFamily: inkstashFonts.mono, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Manual entry
        </Typography>
        <TextField
          fullWidth
          autoFocus
          label="Title (required)"
          value={manualTitle}
          onChange={(e) => setManualTitle(e.target.value)}
          sx={{ mb: 1.5 }}
        />
        <TextField
          fullWidth
          label="Issue number"
          value={manualIssue}
          onChange={(e) => setManualIssue(e.target.value)}
          sx={{ mb: 1.5 }}
        />
        <TextField
          fullWidth
          label="Publisher"
          value={manualPublisher}
          onChange={(e) => setManualPublisher(e.target.value)}
          sx={{ mb: 1.5 }}
        />
        <TextField
          fullWidth
          label="Writer"
          value={manualWriter}
          onChange={(e) => setManualWriter(e.target.value)}
          sx={{ mb: 1.5 }}
        />
        <TextField
          fullWidth
          label="Artist"
          value={manualArtist}
          onChange={(e) => setManualArtist(e.target.value)}
          sx={{ mb: 2 }}
        />
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button variant="text" onClick={() => setShowManual(false)} sx={{ color: inkstashColors.muted }}>
            Back to search
          </Button>
          <Button variant="contained" onClick={handleManualSubmit} disabled={!manualTitle.trim()} sx={{ flex: 1, fontWeight: 700 }}>
            Continue
          </Button>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ position: 'relative' }}>
      <TextField
        fullWidth
        autoFocus
        label="Search by title, issue, or publisher"
        placeholder="e.g. Absolute Batman 1"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {(loading || results.length > 0 || (query.length >= 2 && !loading)) && (
        <Paper
          elevation={4}
          sx={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            mt: 0.5,
            borderRadius: inkstashRadii.md,
            maxHeight: 360,
            overflowY: 'auto',
            bgcolor: inkstashColors.bgElev,
            border: `1px solid ${inkstashColors.border}`,
            zIndex: 10,
          }}
        >
          {loading && (
            <Box sx={{ p: 2, display: 'flex', justifyContent: 'center' }}>
              <CircularProgress size={20} />
            </Box>
          )}

          {!loading && error && (
            <Typography sx={{ p: 2, color: '#ef4444', fontSize: 13 }}>{error}</Typography>
          )}

          {!loading && !error && results.map((r) => (
            <Box
              key={r.id}
              component="button"
              type="button"
              onClick={() => handlePick(r)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                width: '100%',
                p: 1.25,
                border: 'none',
                bgcolor: 'transparent',
                textAlign: 'left',
                cursor: 'pointer',
                borderBottom: `1px solid ${inkstashColors.border}`,
                '&:hover': { bgcolor: inkstashColors.bgSunken },
                '&:last-child': { borderBottom: 'none' },
              }}
            >
              <Box
                sx={{
                  width: 32, height: 48,
                  bgcolor: inkstashColors.bgSunken,
                  borderRadius: 0.5,
                  flexShrink: 0,
                  backgroundImage: r.cover_url ? `url(${r.cover_url})` : undefined,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontSize: 13, fontWeight: 600, color: inkstashColors.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {r.name}{r.issue_number ? ` #${r.issue_number}` : ''}
                </Typography>
                {r.publisher && (
                  <Typography sx={{ fontSize: 10.5, color: inkstashColors.muted, fontFamily: inkstashFonts.mono, mt: 0.25 }}>
                    {r.publisher}
                  </Typography>
                )}
              </Box>
              {r.writer && (
                <Chip
                  label={`by ${r.writer}`}
                  size="small"
                  sx={{ fontSize: 10, bgcolor: inkstashColors.bgSunken, color: inkstashColors.muted }}
                />
              )}
            </Box>
          ))}

          {!loading && !error && results.length === 0 && query.length >= 2 && (
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <Typography sx={{ fontSize: 13, color: inkstashColors.muted, mb: 1.5 }}>
                No matches found for "{query}".
              </Typography>
            </Box>
          )}

          <Box
            component="button"
            type="button"
            onClick={() => setShowManual(true)}
            sx={{
              display: 'block',
              width: '100%',
              p: 1.5,
              border: 'none',
              borderTop: `1px solid ${inkstashColors.border}`,
              bgcolor: 'transparent',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 600,
              color: inkstashColors.brand,
              textAlign: 'center',
              fontFamily: inkstashFonts.mono,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              '&:hover': { bgcolor: inkstashColors.bgSunken },
            }}
          >
            Don't see your comic? Enter manually
          </Box>
        </Paper>
      )}
    </Box>
  );
}
