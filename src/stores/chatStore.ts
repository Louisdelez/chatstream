import { create } from 'zustand';
import { ChatMessage, ConnectionStatus } from '@/types';
import { DEFAULT_SETTINGS } from '@/lib/constants';

// External mutable structures — never copied, O(1) operations
const messageIdSet = new Set<string>();
let messageBuffer: ChatMessage[] = [];
let pendingMessages: ChatMessage[] = [];
let flushScheduled = false;

interface ChatStore {
  channel: string | null;
  status: ConnectionStatus;
  messages: ChatMessage[];
  messageCount: number;
  sessionId: string | null;

  setChannel: (channel: string | null) => void;
  setStatus: (status: ConnectionStatus) => void;
  addMessage: (msg: ChatMessage) => void;
  addMessages: (msgs: ChatMessage[]) => void;
  loadMessages: (msgs: ChatMessage[]) => void;
  clearMessages: () => void;
  setSessionId: (id: string | null) => void;
}

function flushPending() {
  if (pendingMessages.length === 0) return;

  const toAdd = pendingMessages;
  pendingMessages = [];
  flushScheduled = false;

  useChatStore.setState((state) => {
    const max = DEFAULT_SETTINGS.maxMessages;

    for (const msg of toAdd) {
      if (messageIdSet.has(msg.id)) continue;
      messageIdSet.add(msg.id);
      messageBuffer.push(msg);
    }

    // Trim if over max
    if (messageBuffer.length > max) {
      const excess = messageBuffer.length - max;
      for (let i = 0; i < excess; i++) {
        messageIdSet.delete(messageBuffer[i].id);
      }
      messageBuffer = messageBuffer.slice(excess);
    }

    // Return new array reference so React re-renders
    return { messages: messageBuffer.slice(), messageCount: messageBuffer.length };
  });
}

export const useChatStore = create<ChatStore>((set) => ({
  channel: null,
  status: 'disconnected',
  messages: [],
  messageCount: 0,
  sessionId: null,

  setChannel: (channel) => set({ channel }),
  setStatus: (status) => set({ status }),

  // Batched: collects messages and flushes every 100ms via requestAnimationFrame
  addMessage: (msg) => {
    if (messageIdSet.has(msg.id)) return;
    pendingMessages.push(msg);

    if (!flushScheduled) {
      flushScheduled = true;
      if (typeof requestAnimationFrame !== 'undefined') {
        requestAnimationFrame(flushPending);
      } else {
        setTimeout(flushPending, 50);
      }
    }
  },

  // Immediate batch add (for loading recent messages)
  addMessages: (msgs) => {
    pendingMessages.push(...msgs);
    flushPending();
  },

  loadMessages: (msgs) => {
    const max = DEFAULT_SETTINGS.maxMessages;
    const sliced = msgs.slice(-max);
    messageIdSet.clear();
    messageBuffer = [];
    for (const m of sliced) {
      if (!messageIdSet.has(m.id)) {
        messageIdSet.add(m.id);
        messageBuffer.push(m);
      }
    }
    set({ messages: messageBuffer.slice(), messageCount: messageBuffer.length });
  },

  clearMessages: () => {
    messageIdSet.clear();
    messageBuffer = [];
    pendingMessages = [];
    flushScheduled = false;
    set({ messages: [], messageCount: 0 });
  },

  setSessionId: (id) => set({ sessionId: id }),
}));
