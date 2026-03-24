'use client';

import { useMemo, useCallback, useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { MessageSquare } from 'lucide-react';
import { useTwitchChat } from '@/hooks/useTwitchChat';
import { useAutoScroll } from '@/hooks/useAutoScroll';
import { useChatStore } from '@/stores/chatStore';
import { useFilterStore } from '@/stores/filterStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useMuteStore } from '@/stores/muteStore';
import { useAuthStore } from '@/stores/authStore';
import { useChannelStore } from '@/stores/channelStore';
import { usePinStore } from '@/stores/pinStore';
import { ChatDocument } from '@/components/chat/ChatDocument';
import { ChatMessageRow } from '@/components/chat/ChatMessage';
import { ChatToolbar } from '@/components/chat/ChatToolbar';
import { BottomBar } from '@/components/chat/BottomBar';
import { PinnedPanel } from '@/components/chat/PinnedPanel';
import { ChannelSidebar } from '@/components/chat/ChannelSidebar';
import { TwitchSetup } from '@/components/chat/TwitchSetup';
import { ArchivePanel } from '@/components/chat/ArchivePanel';
import { MigratePrompt } from '@/components/MigratePrompt';
import { useStreamStatus } from '@/hooks/useStreamStatus';

export default function ChatPage() {
  const params = useParams();
  const channel = params.channel as string;

  const { sendMessage } = useTwitchChat(channel);
  const streamInfo = useStreamStatus(channel);
  const [showArchives, setShowArchives] = useState(false);
  const loadSession = useAuthStore((s) => s.loadSession);

  useEffect(() => {
    loadSession().then(() => {
      const appUser = useAuthStore.getState().appUser;
      if (appUser) {
        useSettingsStore.getState().loadFromServer();
        useChannelStore.getState().loadFromServer();
        useMuteStore.getState().loadFromServer();
        usePinStore.getState().loadFromServer(channel);
      }
    });
  }, [loadSession, channel]);

  const messages = useChatStore((s) => s.messages);
  const status = useChatStore((s) => s.status);
  const roles = useFilterStore((s) => s.roles);
  const keyword = useFilterStore((s) => s.keyword);
  const showSubs = useSettingsStore((s) => s.showSubs);
  const showGiftSubs = useSettingsStore((s) => s.showGiftSubs);
  const showPrime = useSettingsStore((s) => s.showPrime);
  const showBits = useSettingsStore((s) => s.showBits);
  const showRaids = useSettingsStore((s) => s.showRaids);
  const mutedUsers = useMuteStore((s) => s.mutedUsers);
  const muteHost = useMuteStore((s) => s.muteHost);

  const filteredMessages = useMemo(() => {
    let result = messages;

    // Filter muted users
    result = result.filter((m) => {
      const name = m.username.toLowerCase();
      if (muteHost && name === channel.toLowerCase()) return false;
      if (mutedUsers.includes(name)) return false;
      return true;
    });

    // Filter events
    result = result.filter((m) => {
      if (!m.eventType) return true;
      if (m.eventType === 'sub' || m.eventType === 'resub') return showSubs;
      if (m.eventType === 'giftsub') return showGiftSubs;
      if (m.eventType === 'prime') return showPrime;
      if (m.eventType === 'bits') return showBits;
      if (m.eventType === 'raid') return showRaids;
      return true;
    });

    if (roles !== 'all') {
      result = result.filter((m) =>
        m.eventType || m.roles.some((r) => roles.includes(r))
      );
    }

    if (keyword.trim()) {
      const kw = keyword.toLowerCase();
      result = result.filter(
        (m) =>
          m.message.toLowerCase().includes(kw) ||
          m.displayName.toLowerCase().includes(kw)
      );
    }

    return result;
  }, [messages, roles, keyword, showSubs, showGiftSubs, showPrime, showBits, showRaids, mutedUsers, muteHost, channel]);

  const { containerRef, isAtBottom, scrollToBottom } = useAutoScroll([
    filteredMessages.length,
  ]);

  const handleScrollToMessage = useCallback((messageId: string) => {
    const el = document.getElementById(`msg-${messageId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('!bg-purple-100');
      setTimeout(() => el.classList.remove('!bg-purple-100'), 2000);
    }
  }, []);

  return (
    <div className="flex h-screen relative">
      <ChannelSidebar activeChannel={channel} />
      <div className="flex flex-col flex-1 min-w-0">
        <ChatToolbar
          filteredMessages={filteredMessages}
          channel={channel}
          allMessages={messages}
          streamInfo={streamInfo}
          onOpenArchives={() => setShowArchives(true)}
        />

        <ChatDocument
          containerRef={containerRef}
          isAtBottom={isAtBottom}
          scrollToBottom={scrollToBottom}
          messageCount={filteredMessages.length}
          channel={channel}
          streamTitle={streamInfo.title}
        >
          {filteredMessages.length === 0 && status === 'connected' && (
            <div className="flex flex-col items-center justify-center py-20" style={{ color: 'var(--text-faint)' }}>
              <MessageSquare className="w-12 h-12 mb-4" />
              <p className="text-sm">En attente de messages...</p>
            </div>
          )}

          {filteredMessages.length === 0 && status === 'connecting' && (
            <div className="flex flex-col items-center justify-center py-20" style={{ color: 'var(--text-faint)' }}>
              <div className="w-8 h-8 border-2 border-purple-300 border-t-purple-600 rounded-full animate-spin mb-4" />
              <p className="text-sm">Connexion au chat #{channel}...</p>
            </div>
          )}

          {filteredMessages.length === 0 && status === 'error' && (
            <div className="flex flex-col items-center justify-center py-20 text-red-400">
              <p className="text-sm">Impossible de se connecter au chat #{channel}</p>
            </div>
          )}

          {filteredMessages.map((msg) => (
            <ChatMessageRow key={msg.id} message={msg} />
          ))}
        </ChatDocument>

        <BottomBar
          onSendMessage={sendMessage}
          channel={channel}
          totalMessages={filteredMessages.length}
        />
      </div>

      <PinnedPanel onScrollToMessage={handleScrollToMessage} channel={channel} />
      <TwitchSetup />
      <MigratePrompt />
      {showArchives && (
        <ArchivePanel
          channel={channel}
          onClose={() => setShowArchives(false)}
          onLoadInMain={(msgs) => {
            const loadMessages = useChatStore.getState().loadMessages;
            loadMessages(msgs);
          }}
        />
      )}
    </div>
  );
}
