'use client';

import { X } from 'lucide-react';
import { useAuthStore, getTwitchLinkUrl } from '@/stores/authStore';

export function TwitchSetup() {
  const showSetup = useAuthStore((s) => s.showSetup);
  const setShowSetup = useAuthStore((s) => s.setShowSetup);
  const appUser = useAuthStore((s) => s.appUser);

  if (!showSetup) return null;

  const handleLink = () => {
    setShowSetup(false);
    window.location.href = getTwitchLinkUrl();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setShowSetup(false)} />
      <div
        className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md rounded-xl shadow-2xl border p-6"
        style={{ background: 'var(--bg-document)', borderColor: 'var(--border)' }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            Lier ton compte Twitch
          </h2>
          <button onClick={() => setShowSetup(false)} style={{ color: 'var(--text-muted)' }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {!appUser ? (
          <div>
            <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
              Tu dois d&apos;abord te connecter à ChatStream avant de lier ton compte Twitch.
            </p>
            <a
              href="/login"
              className="inline-block h-10 px-5 rounded-lg bg-purple-600 text-white font-medium hover:bg-purple-700 transition text-sm leading-10 text-center"
            >
              Se connecter
            </a>
          </div>
        ) : (
          <div>
            <p className="text-sm mb-5" style={{ color: 'var(--text-muted)' }}>
              Lie ton compte Twitch pour envoyer des messages dans le chat.
              Tu seras redirigé vers Twitch pour autoriser l&apos;accès.
            </p>
            <button
              onClick={handleLink}
              className="h-10 px-5 rounded-lg bg-purple-600 text-white font-medium hover:bg-purple-700 transition text-sm"
            >
              Lier mon compte Twitch
            </button>
          </div>
        )}
      </div>
    </>
  );
}
