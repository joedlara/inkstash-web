// ChatPanel — right-column chat card on desktop, immersive overlay on mobile.
// Wraps MessageList + ChatComposer. Mode comes in via the `variant` prop. The
// panel variant additionally renders the Chat / Watching tabs from the prototype.
import { useState } from 'react';
import { MessageList } from './MessageList';
import { ChatComposer } from './ChatComposer';
import type { Participant } from './useLivestreamChat';
import type { MockChatMessage } from '../_mock/streamData.mock';

type Props = {
  messages: MockChatMessage[];
  participants: Participant[];
  variant: 'immersive' | 'panel';
  onSend: (msg: Pick<MockChatMessage, 'text' | 'mention'>) => void;
  onUsernameClick: (username: string) => void;
};

export function ChatPanel({ messages, participants, variant, onSend, onUsernameClick }: Props) {
  const [tab, setTab] = useState<'chat' | 'watching'>('chat');

  if (variant === 'immersive') {
    return (
      <>
        <MessageList messages={messages} variant="immersive" onUsernameClick={onUsernameClick} />
        <ChatComposer variant="immersive" participants={participants} onSend={onSend} />
      </>
    );
  }

  return (
    <section className="ls-chat-card ls-stream-card">
      <div className="ls-chat-tabs">
        <button
          type="button"
          className={'ls-chat-tab' + (tab === 'chat' ? ' ls-active' : '')}
          onClick={() => setTab('chat')}
        >
          Chat
        </button>
        <button
          type="button"
          className={'ls-chat-tab' + (tab === 'watching' ? ' ls-active' : '')}
          onClick={() => setTab('watching')}
        >
          Watching
        </button>
      </div>

      <MessageList messages={messages} variant="panel" onUsernameClick={onUsernameClick} />

      <ChatComposer variant="panel" participants={participants} onSend={onSend} />
    </section>
  );
}
