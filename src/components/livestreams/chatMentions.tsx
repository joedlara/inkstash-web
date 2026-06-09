// src/components/livestreams/chatMentions.tsx
//
// Two pieces of mention infrastructure shared by both chat surfaces:
//
//   - renderMessageBody(text) — splits a chat message body on
//     `@username` patterns and wraps each match in a pill so it
//     stands out. No backend change needed — mentions live in the
//     plain `body` column and the renderer surfaces them.
//
//   - useMentionAutocomplete(value, setValue) — hook that watches a
//     text input, opens a dropdown of unique chat participants when
//     the caret follows `@`, and inserts `@name ` on pick.
//
// Mention-aware notifications would need a `mentioned_user_id`
// column on livestream_chat — that lands in a later round.

import { useCallback, useMemo, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { colorForUsername } from './usernameColor';
import { inkstashFonts } from '../../theme/inkstashTokens';

const MENTION_REGEX = /(@[a-zA-Z0-9_.]+)/g;

/**
 * Splits `text` into spans, wrapping any @mention in a colored pill.
 * Used inside the message-body Typography on both chat surfaces.
 */
export function renderMessageBody(text: string): React.ReactNode {
  if (!text.includes('@')) return text;
  const parts = text.split(MENTION_REGEX);
  return parts.map((part, i) => {
    if (i % 2 === 1) {
      // Odd indexes are the captured @mention groups.
      const name = part.slice(1);
      return (
        <Box
          key={i}
          component="span"
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            px: 0.6,
            py: '1px',
            mx: '1px',
            borderRadius: '6px',
            fontWeight: 800,
            color: colorForUsername(name),
            bgcolor: 'rgba(255,255,255,0.08)',
            fontFamily: inkstashFonts.ui,
          }}
        >
          {part}
        </Box>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

interface AutocompleteState {
  /** Whether the suggestion popover should render. */
  open: boolean;
  /** Filtered usernames in display order. */
  items: string[];
  /** Index of the highlighted suggestion. */
  active: number;
}

interface UseMentionAutocompleteResult {
  state: AutocompleteState;
  /** Wire to the input's onChange. */
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  /** Wire to the input's onKeyDown. */
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => boolean;
  /** Call from a suggestion item's click handler. Returns the new
   *  value the parent should setValue() on. */
  pick: (username: string) => string;
  /** Closes the popover without picking. */
  close: () => void;
}

/**
 * Tracks the caret + value, opens when the caret follows `@<query>`,
 * filters `participants` by prefix, and returns helpers for the
 * input's event handlers. The parent owns `value` + `setValue`; we
 * just compute next-values from text edits.
 */
export function useMentionAutocomplete(
  value: string,
  setValue: (v: string) => void,
  participants: string[],
): UseMentionAutocompleteResult {
  const [state, setState] = useState<AutocompleteState>({
    open: false, items: [], active: 0,
  });
  // Track the most recent caret position so pick() can splice the
  // mention into the correct place.
  const [caret, setCaret] = useState(0);

  const uniqueParticipants = useMemo(
    () => Array.from(new Set(participants.filter(Boolean))),
    [participants],
  );

  const compute = useCallback((text: string, caretIndex: number) => {
    const upto = text.slice(0, caretIndex);
    const m = upto.match(/@([\w.]*)$/);
    if (!m) return { open: false, items: [], active: 0 };
    const q = m[1].toLowerCase();
    const items = uniqueParticipants
      .filter((p) => p.toLowerCase().startsWith(q))
      .slice(0, 6);
    if (items.length === 0) return { open: false, items: [], active: 0 };
    return { open: true, items, active: 0 };
  }, [uniqueParticipants]);

  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const text = e.target.value;
      const c = e.target.selectionStart ?? text.length;
      setCaret(c);
      setValue(text);
      setState(compute(text, c));
    },
    [compute, setValue],
  );

  const pick = useCallback((username: string): string => {
    // Replace the @<partial> right before the caret with @<username><space>.
    const upto = value.slice(0, caret);
    const m = upto.match(/@([\w.]*)$/);
    if (!m) return value;
    const start = caret - m[0].length;
    const next = value.slice(0, start) + '@' + username + ' ' + value.slice(caret);
    setState({ open: false, items: [], active: 0 });
    return next;
  }, [value, caret]);

  const close = useCallback(() => {
    setState({ open: false, items: [], active: 0 });
  }, []);

  /** Returns true if the event was handled (parent should not
   *  fall through to other behavior like form-submit on Enter). */
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>): boolean => {
      if (!state.open) return false;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setState((s) => ({ ...s, active: (s.active + 1) % s.items.length }));
        return true;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setState((s) => ({
          ...s,
          active: (s.active - 1 + s.items.length) % s.items.length,
        }));
        return true;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        const next = pick(state.items[state.active]);
        setValue(next);
        return true;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
        return true;
      }
      return false;
    },
    [state, pick, setValue, close],
  );

  return { state, onChange, onKeyDown, pick, close };
}

/**
 * The popover that lists the suggestions. Position is owned by the
 * caller (parent decides whether to anchor above or below the
 * input); we just render the list.
 */
export function MentionSuggestions({
  items, active, onPick,
}: {
  items: string[];
  active: number;
  onPick: (username: string) => void;
}) {
  if (items.length === 0) return null;
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 0.4,
        p: 0.75,
        borderRadius: '14px',
        minWidth: 132,
        bgcolor: 'rgba(20,14,12,0.92)',
        backdropFilter: 'blur(18px) saturate(160%)',
        WebkitBackdropFilter: 'blur(18px) saturate(160%)',
        border: '1px solid rgba(255,255,255,0.16)',
        boxShadow: '0 16px 40px -12px rgba(0,0,0,0.7)',
      }}
    >
      {items.map((name, i) => (
        <Box
          key={name}
          component="button"
          type="button"
          // onMouseDown so the input doesn't blur first and close
          // the popover before our click registers.
          onMouseDown={(e) => { e.preventDefault(); onPick(name); }}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            px: 1.25,
            py: 1,
            border: 0,
            borderRadius: '9px',
            cursor: 'pointer',
            textAlign: 'left',
            bgcolor: i === active ? 'rgba(255,255,255,0.14)' : 'transparent',
            color: '#fff',
            transition: 'background-color 100ms ease',
            '&:hover': { bgcolor: 'rgba(255,255,255,0.14)' },
          }}
        >
          <Box
            sx={{
              width: 22,
              height: 22,
              borderRadius: 999,
              bgcolor: colorForUsername(name),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: inkstashFonts.display,
              fontWeight: 900,
              fontSize: 11,
            }}
          >
            {name[0]?.toUpperCase() ?? '?'}
          </Box>
          <Typography
            component="span"
            sx={{
              fontFamily: inkstashFonts.ui,
              fontWeight: 700,
              fontSize: 13,
              color: colorForUsername(name),
            }}
          >
            {name}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}
