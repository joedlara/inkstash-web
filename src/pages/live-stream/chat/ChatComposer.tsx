// ChatComposer — input + Send + @-mention autocomplete. Ported 1:1 from
// docs/design-system/live_stream/stream-view.jsx. On send, the first valid
// @name token becomes a highlighted mention (matches the prototype). Both
// variants ("immersive" overlay above the video, "panel" right-column card)
// share the same logic; the wrapper class flips the look.
import { useRef, useState, type KeyboardEvent, type ChangeEvent } from 'react';
import { MentionAutocomplete } from './MentionAutocomplete';
import type { Participant } from './useLivestreamChat';
import type { MockChatMessage } from '../_mock/streamData.mock';

type Suggestion = {
  items: Participant[];
  active: number;
  start: number;
  len: number;
};

type Props = {
  participants: Participant[];
  onSend: (msg: Pick<MockChatMessage, 'text' | 'mention'>) => void;
  variant: 'immersive' | 'panel';
};

export function ChatComposer({ participants, onSend, variant }: Props) {
  const [val, setVal] = useState('');
  const [sug, setSug] = useState<Suggestion | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const matchable = (q: string): Participant[] =>
    participants.filter((p) => p !== 'you' && p.toLowerCase().startsWith(q)).slice(0, 6);

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

  function pick(name: Participant) {
    setSug((current) => {
      if (!current) return null;
      const next = val.slice(0, current.start) + '@' + name + ' ' + val.slice(current.start + current.len);
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
    const mm = text.match(/@([\w.]+)/);
    const mention = mm && participants.includes(mm[1]) ? '@' + mm[1] : undefined;
    onSend({ text, mention });
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
