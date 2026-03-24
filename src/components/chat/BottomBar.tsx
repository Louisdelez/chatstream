'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Send, LogIn, LogOut } from 'lucide-react';
import { useAuthStore, getTwitchLinkUrl } from '@/stores/authStore';
import { useChatStore } from '@/stores/chatStore';
import { authClient } from '@/lib/auth-client';

interface Props {
  onSendMessage: (text: string) => void;
  channel: string;
  totalMessages: number;
}

export function BottomBar({ onSendMessage, channel, totalMessages }: Props) {
  const router = useRouter();
  const [input, setInput] = useState('');
  const appUser = useAuthStore((s) => s.appUser);
  const twitchLinked = useAuthStore((s) => s.twitchLinked);
  const twitchDisplayName = useAuthStore((s) => s.twitchDisplayName);
  const logout = useAuthStore((s) => s.logout);
  const setShowSetup = useAuthStore((s) => s.setShowSetup);
  const status = useChatStore((s) => s.status);
  const isConnected = status === 'connected';
  const canSend = !!appUser && twitchLinked;

  const inputChars = input.length;
  const inputWords = input.trim() ? input.trim().split(/\s+/).length : 0;

  const handleSend = () => {
    if (!input.trim() || !canSend) return;
    onSendMessage(input);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div
      className="no-print flex items-center gap-2 sm:gap-4 px-2 sm:px-4 py-1.5 border-t text-xs shrink-0"
      style={{ background: 'var(--bg-toolbar)', borderColor: 'var(--border)', color: 'var(--text-faint)' }}
    >
      {/* Left stats */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {canSend ? (
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="w-5 h-5 rounded-full bg-purple-600 flex items-center justify-center text-white text-[10px] font-bold">
              {(twitchDisplayName ?? appUser?.name ?? 'U')[0].toUpperCase()}
            </span>
            <span className="hidden sm:inline" style={{ color: 'var(--text-muted)' }}>
              {twitchDisplayName ?? appUser?.name}
            </span>
            <button
              onClick={async () => {
                logout();
                await authClient.signOut();
                router.push('/login');
              }}
              className="p-0.5 rounded transition"
              style={{ color: 'var(--text-faint)' }}
              title="Déconnexion"
            >
              <LogOut className="w-3 h-3" />
            </button>
          </div>
        ) : appUser && !twitchLinked ? (
          <button
            onClick={() => {
              window.location.href = getTwitchLinkUrl();
            }}
            className="flex items-center gap-1.5 px-2 py-1 rounded transition cursor-pointer"
            style={{ color: '#9146FF' }}
            title="Lier ton compte Twitch pour envoyer des messages"
          >
            <LogIn className="w-3 h-3" />
            <span className="hidden sm:inline">Lier Twitch</span>
          </button>
        ) : (
          <button
            onClick={() => setShowSetup(true)}
            className="flex items-center gap-1.5 px-2 py-1 rounded transition cursor-pointer"
            style={{ color: '#9146FF' }}
            title="Se connecter avec Twitch pour envoyer des messages"
          >
            <LogIn className="w-3 h-3" />
            <span className="hidden sm:inline">Connexion Twitch</span>
          </button>
        )}
        <span className="hidden sm:block tb-separator w-px h-3.5" />
        <span className="hidden sm:inline">{totalMessages} msgs</span>
      </div>

      {/* Center: message input */}
      <div className="flex-1 flex items-center gap-2 max-w-xl mx-auto">
        {canSend ? (
          <>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isConnected ? `Envoyer un message dans #${channel}...` : 'Déconnecté...'}
              disabled={!isConnected}
              className="tb-input flex-1 h-7 px-2 sm:px-3 text-xs rounded-lg border focus:outline-none focus:ring-1 focus:ring-purple-400"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || !isConnected}
              className="tb-btn p-1.5 rounded-lg border transition"
              title="Envoyer"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </>
        ) : (
          <div className="flex-1 text-center" style={{ color: 'var(--text-faint)' }}>
            <span className="hidden sm:inline">Connectez-vous et liez Twitch pour envoyer des messages</span>
            <span className="sm:hidden">Connexion requise</span>
          </div>
        )}
      </div>

      {/* Right stats — only when typing, hidden on mobile */}
      {input.length > 0 && (
        <div className="hidden sm:flex items-center gap-3 shrink-0">
          <span>{inputChars} caractère{inputChars !== 1 ? 's' : ''}</span>
          <span className="tb-separator w-px h-3.5" />
          <span>{inputWords} mot{inputWords !== 1 ? 's' : ''}</span>
        </div>
      )}
    </div>
  );
}
