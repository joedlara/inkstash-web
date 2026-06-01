// src/components/listings/ComicSearchInput.tsx
//
// Autocomplete input wrapping comicCatalogAPI.search(). Renders a dropdown
// with cover thumbnail + title + publisher chip.
//
// As of M4-Task9 the manual-entry fallback lives one level up in
// ListingStartPanel as a "Don't see your comic? Enter it manually" link
// that drops the seller on the listing form with no prefill. We do NOT
// render a manual-entry affordance inside this component anymore.

import { useEffect, useRef, useState } from 'react';
import {
  Box,
  TextField,
  Paper,
  CircularProgress,
  Typography,
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
  /** Seed the input on first render. Useful for "Try this" chips that prefill the search. */
  initialQuery?: string;
  /** Fires every keystroke. Parent uses this to render a "Continue with X" affordance. */
  onQueryChange?: (query: string) => void;
}

export default function ComicSearchInput({ onSelect, initialQuery = '', onQueryChange }: Props) {
  const [query, setQuery] = useState(initialQuery);

  useEffect(() => {
    onQueryChange?.(query);
  }, [query, onQueryChange]);
  const [results, setResults] = useState<ComicCatalogResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
              <Typography sx={{ fontSize: 13, color: inkstashColors.muted }}>
                No matches found for &ldquo;{query}&rdquo;. Use &ldquo;Enter it manually&rdquo; below.
              </Typography>
            </Box>
          )}
        </Paper>
      )}
    </Box>
  );
}
