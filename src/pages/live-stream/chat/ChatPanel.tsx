// ChatPanel — right-column chat card on desktop, immersive overlay on mobile.
// Wraps MessageList + ChatComposer. Mode comes in via the `variant` prop. The
// panel variant additionally renders the Chat / Watching tabs from the prototype.
import { useState } from 'react';
import { MessageList } from './MessageList';
import { ChatComposer } from './ChatComposer';
import type { ChatMessage, Participant } from './useLivestreamChat';

type Props = {
  messages: ChatMessage[];
  participants: Map<string, Participant>;
  variant: 'immersive' | 'panel';
  onSend: (body: string, mentionedUserIds: string[]) => void;
  onUsernameClick: (username: string) => void;
};

export function ChatPanel({ messages, participants, variant, onSend, onUsernameClick }: Props) {
  const [tab, setTab] = useState<'chat' | 'watching'>('chat');

  if (variant === 'immersive') {
    return (
      <>
        <MessageList
          messages={messages}
          participants={participants}
          variant="immersive"
          onUsernameClick={onUsernameClick}
        />
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

      <MessageList
        messages={messages}
        participants={participants}
        variant="panel"
        onUsernameClick={onUsernameClick}
      />

      <ChatComposer variant="panel" participants={participants} onSend={onSend} />
    </section>
  );
}
