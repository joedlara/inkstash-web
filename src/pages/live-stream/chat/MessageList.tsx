// MessageList — scrolling chat list. Both modes auto-scroll to the latest on
// new send (the prototype tracks `chat.length` in a ref to detect growth).
// Immersive mode's top-fade mask + height cap come from CSS (.ls-vf-chat).
import { useEffect, useRef } from 'react';
import { MessageRow, type MessageVariant } from './MessageRow';
import type { ChatMessage, Participant } from './useLivestreamChat';

type Props = {
  messages: ChatMessage[];
  participants: Map<string, Participant>;
  variant: MessageVariant;
  onUsernameClick: (userId: string) => void;
};

export function MessageList({ messages, participants, variant, onUsernameClick }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const lenRef = useRef(messages.length);

  useEffect(() => {
    if (messages.length > lenRef.current) {
      const el = ref.current;
      if (el) el.scrollTop = el.scrollHeight;
    }
    lenRef.current = messages.length;
  }, [messages.length]);

  const cls = variant === 'immersive' ? 'ls-vf-chat' : 'ls-chat-list';
  return (
    <div className={cls} ref={ref}>
      {messages.map((m) => (
        <MessageRow
          key={m.id}
          message={m}
          variant={variant}
          participants={participants}
          onUsernameClick={onUsernameClick}
        />
      ))}
    </div>
  );
}
