// MessageRow — colored username + body row. Two visual variants ("panel" for
// the right-column chat card and "immersive" for the overlay above the video).
// Both variants share the same mention-rendering logic. Extracted from the
// chat blocks in docs/design-system/live_stream/stream-view.jsx.
import { avatarGrad, gradStyle, usernameColor } from './usernameColor';
import type { MockChatMessage } from '../_mock/streamData.mock';

export type MessageVariant = 'panel' | 'immersive';

type Props = {
  message: MockChatMessage;
  variant: MessageVariant;
  onUsernameClick: (username: string) => void;
};

function renderText(m: MockChatMessage) {
  if (m.mention) {
    const parts = m.text.split(m.mention);
    return (
      <>
        {parts[0]}
        <span className="ls-mention">{m.mention}</span>
        {parts.slice(1).join(m.mention)}
      </>
    );
  }
  return m.text;
}

export function MessageRow({ message, variant, onUsernameClick }: Props) {
  const initial = message.user[0].toUpperCase();
  const isImmersive = variant === 'immersive';
  const avClass = isImmersive ? 'ls-vf-chat-av' : 'ls-chat-av';
  const bodyClass = isImmersive ? 'ls-vf-chat-body' : 'ls-chat-body';
  const userClass = isImmersive ? 'ls-vf-chat-user' : 'ls-chat-user';
  const textClass = isImmersive ? 'ls-vf-chat-text' : 'ls-chat-text';
  const rowClass = isImmersive ? 'ls-vf-chat-msg' : 'ls-chat-msg';

  return (
    <div className={rowClass}>
      <span className={avClass} style={{ background: gradStyle(avatarGrad(message.user)) }}>
        {initial}
      </span>
      <div className={bodyClass}>
        <button
          type="button"
          className={'ls-chat-username ' + userClass}
          style={{ color: usernameColor(message.user) }}
          onClick={(e) => {
            e.stopPropagation();
            onUsernameClick(message.user);
          }}
        >
          {message.user}
        </button>
        {isImmersive ? ' ' : null}
        {isImmersive ? (
          <span className={textClass + (message.q ? ' ls-q' : '')}>{renderText(message)}</span>
        ) : (
          <div className={textClass + (message.q ? ' ls-q' : '')}>{renderText(message)}</div>
        )}
      </div>
    </div>
  );
}
