import { create } from 'zustand';
import { ChatMessage, ConnectionStatus } from '@/types';
import { DEFAULT_SETTINGS } from '@/lib/constants';

interface ChatStore {
  channel: string | null;
  status: ConnectionStatus;
  messages: ChatMessage[];
  messageIds: Set<string>;
  sessionId: string | null;

  setChannel: (channel: string | null) => void;
  setStatus: (status: ConnectionStatus) => void;
  addMessage: (msg: ChatMessage) => void;
  loadMessages: (msgs: ChatMessage[]) => void;
  clearMessages: () => void;
  setSessionId: (id: string | null) => void;
}

export const useChatStore = create<ChatStore>((set) => ({
  channel: null,
  status: 'disconnected',
  messages: [],
  messageIds: new Set<string>(),
  sessionId: null,

  setChannel: (channel) => set({ channel }),
  setStatus: (status) => set({ status }),
  addMessage: (msg) =>
    set((state) => {
      // Skip duplicate messages (O(1) lookup)
      if (state.messageIds.has(msg.id)) return state;

      const newIds = new Set(state.messageIds);
      newIds.add(msg.id);

      let messages: ChatMessage[];
      if (state.messages.length >= DEFAULT_SETTINGS.maxMessages) {
        const removed = state.messages[0];
        newIds.delete(removed.id);
        messages = [...state.messages.slice(1), msg];
      } else {
        messages = [...state.messages, msg];
      }
      return { messages, messageIds: newIds };
    }),
  loadMessages: (msgs) => {
    const sliced = msgs.slice(-DEFAULT_SETTINGS.maxMessages);
    return set({ messages: sliced, messageIds: new Set(sliced.map((m) => m.id)) });
  },
  clearMessages: () => set({ messages: [], messageIds: new Set<string>() }),
  setSessionId: (id) => set({ sessionId: id }),
}));
