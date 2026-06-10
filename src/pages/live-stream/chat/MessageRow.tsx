// MessageRow — colored username + body row. Two visual variants ("panel" for
// the right-column chat card and "immersive" for the overlay above the video).
// Both variants share the same mention-rendering logic. Extracted from the
// chat blocks in docs/design-system/live_stream/stream-view.jsx.
//
// Mention rendering: the message carries `mentioned_user_ids` (UUIDs). We walk
// the body for `@name` tokens, resolve each token's username against the
// participants Map, and render a pill IFF the resolved user_id is in the
// mentioned list. Tokens that don't resolve, or resolve to a non-mentioned id,
// render as plain text. This keeps the wire shape (UUIDs only) honest while
// the visual still keys off the literal `@name` the author typed.
import { Fragment, useMemo } from 'react';
import { avatarGrad, gradStyle, usernameColor } from './usernameColor';
import type { ChatMessage, Participant } from './useLivestreamChat';

export type MessageVariant = 'panel' | 'immersive';

type Props = {
  message: ChatMessage;
  variant: MessageVariant;
  participants: Map<string, Participant>;
  /** Called with the author's user_id when the username button is clicked.
   *  ProfileCard takes user_id (not username) because the follow API needs
   *  the UUID. */
  onUsernameClick: (userId: string) => void;
};

function renderBody(message: ChatMessage, participants: Map<string, Participant>) {
  if (!message.mentioned_user_ids.length) return message.body;
  // Build a username → user_id lookup once per render (Map is small).
  const nameToId = new Map<string, string>();
  for (const [id, p] of participants.entries()) {
    nameToId.set(p.username.toLowerCase(), id);
  }
  const mentioned = new Set(message.mentioned_user_ids);
  // Split body on @-tokens, preserving the tokens themselves.
  const parts = message.body.split(/(@[\w.]+)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('@')) {
          const resolvedId = nameToId.get(part.slice(1).toLowerCase());
          if (resolvedId && mentioned.has(resolvedId)) {
            return (
              <span key={i} className="ls-mention">
                {part}
              </span>
            );
          }
        }
        return <Fragment key={i}>{part}</Fragment>;
      })}
    </>
  );
}

export function MessageRow({ message, variant, participants, onUsernameClick }: Props) {
  const initial = message.username[0].toUpperCase();
  const isImmersive = variant === 'immersive';
  const avClass = isImmersive ? 'ls-vf-chat-av' : 'ls-chat-av';
  const bodyClass = isImmersive ? 'ls-vf-chat-body' : 'ls-chat-body';
  const userClass = isImmersive ? 'ls-vf-chat-user' : 'ls-chat-user';
  const textClass = isImmersive ? 'ls-vf-chat-text' : 'ls-chat-text';
  const rowClass = isImmersive ? 'ls-vf-chat-msg' : 'ls-chat-msg';

  const rendered = useMemo(() => renderBody(message, participants), [message, participants]);

  return (
    <div className={rowClass}>
      <span className={avClass} style={{ background: gradStyle(avatarGrad(message.username)) }}>
        {initial}
      </span>
      <div className={bodyClass}>
        <button
          type="button"
          className={'ls-chat-username ' + userClass}
          style={{ color: usernameColor(message.username) }}
          onClick={(e) => {
            e.stopPropagation();
            onUsernameClick(message.user_id);
          }}
        >
          {message.username}
        </button>
        {isImmersive ? ' ' : null}
        {isImmersive ? (
          <span className={textClass + (message.q ? ' ls-q' : '')}>{rendered}</span>
        ) : (
          <div className={textClass + (message.q ? ' ls-q' : '')}>{rendered}</div>
        )}
      </div>
    </div>
  );
}
