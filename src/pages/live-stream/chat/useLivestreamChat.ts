// useLivestreamChat — Phase 2 mock chat. Seeds from the prototype's static
// chat array and lets the composer push new "you" messages onto the list.
// Replaced in Phase 3c by the real chat subscription + insert RPC.
import { useCallback, useMemo, useState } from 'react';
import { mockChat, mockHost, type MockChatMessage } from '../_mock/streamData.mock';

export type Participant = string; // just the username — matches prototype shape

export type UseLivestreamChat = {
  messages: MockChatMessage[];
  participants: Participant[];
  sendMessage: (msg: Pick<MockChatMessage, 'text' | 'mention'>) => void;
};

export function useLivestreamChat(_livestreamId: string): UseLivestreamChat {
  const [messages, setMessages] = useState<MockChatMessage[]>(() => mockChat.slice());

  // Participants = host + every distinct user who's spoken in chat.
  // (Matches `chatParticipants` from the prototype.)
  const participants = useMemo<Participant[]>(
    () => Array.from(new Set([mockHost.name, ...messages.map((m) => m.user)])),
    [messages],
  );

  const sendMessage = useCallback(
    ({ text, mention }: Pick<MockChatMessage, 'text' | 'mention'>) => {
      setMessages((prev) => [...prev, { user: 'you', text, mention }]);
    },
    [],
  );

  return { messages, participants, sendMessage };
}
