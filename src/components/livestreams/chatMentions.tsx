// src/components/livestreams/chatMentions.tsx
//
// Two helpers shared between StreamChatRail (desktop) and LiveStreamChat
// (overlay). Kept together because they're tiny and always used as a pair.
//
// 1. MentionAutocomplete: small popover above a composer input listing
//    chat participants that match the in-progress @-token. Arrow-key
//    navigable; Enter / Tab pick; Esc dismiss. The composer owns
//    suggestion state and just renders this when sug is non-null.
//
// 2. renderChatBody: walks a body string and emits @name tokens as
//    highlighted pills when the name appears in a known-participants
//    set. Unknown @-tokens render as plain text — no fake highlighting.
//
// Persisting mentions server-side is out of scope; this is display only.

import { useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import { userColor } from '../../utils/chatColors';
import { inkstashColors, inkstashFonts } from '../../theme/inkstashTokens';

export interface SuggestionState {
  /** The candidate usernames matching the current token. */
  items: string[];
  /** Index of the currently-focused candidate. */
  active: number;
  /** Caret offset where the @-token starts (inclusive). */
  start: number;
  /** Length of the @-token (including the @ sign). */
  len: number;
}

/**
 * Read the composer text + caret and decide whether to show a
 * suggestion popup. Returns null when the caret isn't on an @-token,
 * or when the token has no matches.
 */
export function computeSuggestion(
  text: string,
  caret: number,
  participants: string[],
): SuggestionState | null {
  const upto = text.slice(0, caret);
  // Match @name where name = word chars + dot. Trailing match catches
  // "@" alone (empty filter) so the popup opens on first keystroke.
  const m = upto.match(/@([\w.]*)$/);
  if (!m) return null;
  const q = m[1].toLowerCase();
  // Filter participants by prefix; cap at 6 so we never overflow the
  // composer.
  const items = participants
    .filter((p) => p.toLowerCase().startsWith(q))
    .slice(0, 6);
  if (items.length === 0) return null;
  return { items, active: 0, start: caret - m[0].length, len: m[0].length };
}

/**
 * Replace the current @-token with the picked username + a trailing
 * space. Returns the new text + the new caret position so the caller
 * can re-sync its input.
 */
export function applySuggestion(
  text: string,
  sug: SuggestionState,
  pick: string,
): { text: string; caret: number } {
  const next = text.slice(0, sug.start) + '@' + pick + ' ' + text.slice(sug.start + sug.len);
  return { text: next, caret: sug.start + pick.length + 2 };
}

interface MentionAutocompleteProps {
  sug: SuggestionState;
  onPick: (name: string) => void;
  /** Render style. The desktop rail is on a light card; the overlay
   *  sits over the video and needs the dark glass. */
  variant: 'panel' | 'immersive';
}

export function MentionAutocomplete({ sug, onPick, variant }: MentionAutocompleteProps) {
  const dark = variant === 'immersive';
  return (
    <Box
      role="listbox"
      sx={{
        position: 'absolute',
        bottom: '100%',
        left: 0,
        right: 0,
        mb: 0.75,
        zIndex: 10,
        borderRadius: 2,
        overflow: 'hidden',
        backdropFilter: dark ? 'blur(12px) saturate(160%)' : undefined,
        WebkitBackdropFilter: dark ? 'blur(12px) saturate(160%)' : undefined,
        bgcolor: dark ? 'rgba(20,14,12,0.86)' : inkstashColors.bgElev,
        border: `1px solid ${dark ? 'rgba(255,255,255,0.16)' : inkstashColors.border}`,
        boxShadow: '0 16px 40px -12px rgba(0,0,0,0.5)',
      }}
    >
      {sug.items.map((name, i) => (
        <Box
          key={name}
          role="option"
          aria-selected={i === sug.active}
          // Use onMouseDown to commit before the input's blur fires —
          // otherwise the click registers after onBlur tears down the
          // popup.
          onMouseDown={(e) => { e.preventDefault(); onPick(name); }}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            px: 1.25,
            py: 0.85,
            cursor: 'pointer',
            color: dark ? '#fff' : inkstashColors.ink,
            bgcolor:
              i === sug.active
                ? dark ? 'rgba(255,255,255,0.12)' : inkstashColors.bgSunken
                : 'transparent',
            '&:hover': {
              bgcolor: dark ? 'rgba(255,255,255,0.14)' : inkstashColors.bgSunken,
            },
          }}
        >
          <Box
            sx={{
              width: 22,
              height: 22,
              borderRadius: 999,
              bgcolor: userColor(name),
              color: '#fff',
              fontFamily: inkstashFonts.display,
              fontWeight: 900,
              fontSize: 11,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {name.charAt(0).toUpperCase()}
          </Box>
          <Typography
            component="span"
            sx={{
              fontFamily: inkstashFonts.ui,
              fontSize: 13,
              fontWeight: 700,
              color: userColor(name),
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {name}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

interface ChatBodyProps {
  body: string;
  /** Set of usernames known to be valid participants. Mention pills
   *  only render for these — unknown @-tokens stay plain text so we
   *  don't fake-highlight made-up names. */
  knownParticipants: Set<string>;
  /** Style. 'immersive' (dark glass chat) vs 'panel' (light rail). */
  variant: 'panel' | 'immersive';
}

interface BodySegment {
  type: 'text' | 'mention';
  value: string;
}

function tokenize(body: string, known: Set<string>): BodySegment[] {
  // Walk the string with matchAll to find @name tokens. Anything
  // between matches (and trailing) becomes plain-text segments.
  const segments: BodySegment[] = [];
  let lastIndex = 0;
  for (const match of body.matchAll(/@([\w.]+)/g)) {
    const idx = match.index ?? 0;
    if (idx > lastIndex) {
      segments.push({ type: 'text', value: body.slice(lastIndex, idx) });
    }
    const name = match[1];
    if (known.has(name)) {
      segments.push({ type: 'mention', value: '@' + name });
    } else {
      // Unknown name — leave the raw text intact.
      segments.push({ type: 'text', value: match[0] });
    }
    lastIndex = idx + match[0].length;
  }
  if (lastIndex < body.length) {
    segments.push({ type: 'text', value: body.slice(lastIndex) });
  }
  return segments;
}

/**
 * Renders the message body, swapping known @-tokens for highlighted
 * mention pills. Use as the body content inside an existing wrapper
 * (the chat surfaces have their own outer styling).
 */
export function ChatBody({ body, knownParticipants, variant }: ChatBodyProps) {
  const segments = useMemo(() => tokenize(body, knownParticipants), [body, knownParticipants]);
  const dark = variant === 'immersive';
  return (
    <>
      {segments.map((seg, i) =>
        seg.type === 'mention' ? (
          <Box
            key={i}
            component="span"
            sx={{
              display: 'inline',
              fontWeight: 600,
              padding: '0 5px',
              borderRadius: '5px',
              // Subtle bg per spec — dark chat gets a translucent white
              // wash, light panel gets the warm sunken-paper.
              bgcolor: dark ? 'rgba(255,255,255,0.18)' : inkstashColors.bgSunken,
              color: dark ? '#fff' : inkstashColors.ink,
            }}
          >
            {seg.value}
          </Box>
        ) : (
          <span key={i}>{seg.value}</span>
        ),
      )}
    </>
  );
}
