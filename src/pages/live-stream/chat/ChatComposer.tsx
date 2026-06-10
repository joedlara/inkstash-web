// ChatComposer — input + Send + @-mention autocomplete. Ported 1:1 from
// docs/design-system/live_stream/stream-view.jsx. On send, every valid @name
// token in the input resolves to its user_id and is passed alongside the body
// to onSend — the hook stores them as `mentioned_user_ids`. Both variants
// ("immersive" overlay above the video, "panel" right-column card) share the
// same logic; the wrapper class flips the look.
import { useRef, useState, type KeyboardEvent, type ChangeEvent } from 'react';
import { MentionAutocomplete } from './MentionAutocomplete';
import type { Participant } from './useLivestreamChat';

/** Walk the input for `@name` tokens; for each one that resolves against the
 *  participants Map, push its user_id. Case-insensitive on the username. */
function extractMentions(text: string, participants: Map<string, Participant>): string[] {
  const ids: string[] = [];
  const re = /@([a-zA-Z0-9_.]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const needle = m[1].toLowerCase();
    for (const [id, p] of participants.entries()) {
      if (p.username.toLowerCase() === needle) {
        ids.push(id);
        break;
      }
    }
  }
  return ids;
}

type Suggestion = {
  items: Participant[];
  active: number;
  start: number;
  len: number;
};

type Props = {
  participants: Map<string, Participant>;
  onSend: (body: string, mentionedUserIds: string[]) => void;
  variant: 'immersive' | 'panel';
};

export function ChatComposer({ participants, onSend, variant }: Props) {
  const [val, setVal] = useState('');
  const [sug, setSug] = useState<Suggestion | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const matchable = (q: string): Participant[] =>
    Array.from(participants.values())
      .filter((p) => p.username !== 'you' && p.username.toLowerCase().startsWith(q))
      .slice(0, 6);

  function suggestAt(text: string, caret: number): Suggestion | null {
    const upto = text.slice(0, caret);
    const m = upto.match(/@([\w.]*)$/);
    if (!m) return null;
    const items = matchable(m[1].toLowerCase());
    if (!items.length) return null;
    return { items, active: 0, start: caret - m[0].length, len: m[0].length };
  }

  function onChange(e: ChangeEvent<HTMLInputElement>) {
    const text = e.target.value;
    setVal(text);
    const caret = e.target.selectionStart != null ? e.target.selectionStart : text.length;
    setSug(suggestAt(text, caret));
  }

  function pick(p: Participant) {
    setSug((current) => {
      if (!current) return null;
      const next = val.slice(0, current.start) + '@' + p.username + ' ' + val.slice(current.start + current.len);
      setVal(next);
      return null;
    });
    requestAnimationFrame(() => {
      if (inputRef.current) inputRef.current.focus();
    });
  }

  function send() {
    const text = val.trim();
    if (!text) return;
    onSend(text, extractMentions(text, participants));
    setVal('');
    setSug(null);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (sug) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSug((s) => (s ? { ...s, active: (s.active + 1) % s.items.length } : s));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSug((s) => (s ? { ...s, active: (s.active - 1 + s.items.length) % s.items.length } : s));
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        pick(sug.items[sug.active]);
        return;
      }
      if (e.key === 'Escape') {
        setSug(null);
        return;
      }
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className={'ls-chat-composer ' + (variant === 'immersive' ? 'ls-cc-immersive' : 'ls-cc-panel')}>
      {sug && <MentionAutocomplete items={sug.items} active={sug.active} onPick={pick} />}
      <div className="ls-cc-row">
        <input
          ref={inputRef}
          className="ls-cc-input"
          value={val}
          placeholder="Say something…"
          onChange={onChange}
          onKeyDown={onKeyDown}
        />
        <button
          type="button"
          className="ls-cc-send"
          onClick={send}
          aria-label="Send"
          disabled={!val.trim()}
        >
          Send
        </button>
      </div>
    </div>
  );
}
