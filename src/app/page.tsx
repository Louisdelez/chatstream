'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MessageSquare, ArrowRight, LogIn } from 'lucide-react';
import { authClient } from '@/lib/auth-client';

export default function Home() {
  const [channel, setChannel] = useState('');
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = channel.trim().toLowerCase();
    if (name) {
      router.push(`/chat/${name}`);
    }
  };

  return (
    <div className="flex flex-col flex-1 items-center justify-center min-h-screen px-3 sm:px-4" style={{ background: 'var(--bg-page)' }}>
      <div className="text-center mb-8 sm:mb-12">
        <div className="flex items-center justify-center gap-2 sm:gap-3 mb-4">
          <MessageSquare className="w-8 h-8 sm:w-10 sm:h-10 text-purple-600" />
          <h1 className="text-2xl sm:text-4xl font-bold" style={{ color: 'var(--text-primary)' }}>ChatStream</h1>
        </div>
        <p className="text-base sm:text-lg max-w-md" style={{ color: 'var(--text-muted)' }}>
          Lisez n&apos;importe quel chat Twitch en temps réel,
          dans un format document clair et exportable.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-md">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-xs sm:text-sm font-mono" style={{ color: 'var(--text-muted)' }}>
              twitch.tv/
            </span>
            <input
              type="text"
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              placeholder="nom_de_la_chaine"
              className="w-full h-10 sm:h-12 pl-20 sm:pl-24 pr-3 sm:pr-4 rounded-xl border focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition text-sm sm:text-base"
              style={{
                borderColor: 'var(--border)',
                background: 'var(--bg-document)',
                color: 'var(--text-primary)',
              }}
              autoFocus
            />
          </div>
          <button
            type="submit"
            disabled={!channel.trim()}
            className="h-10 sm:h-12 px-4 sm:px-6 rounded-xl bg-purple-600 text-white font-medium hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-2"
          >
            <span className="hidden sm:inline">Ouvrir</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </form>

      <div className="mt-6 flex flex-col items-center gap-2">
        <Link
          href="/login"
          className="flex items-center gap-2 text-sm text-purple-600 hover:underline"
        >
          <LogIn className="w-4 h-4" />
          Se connecter / Créer un compte
        </Link>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Lecture anonyme disponible — compte requis pour écrire et sauvegarder
        </p>
      </div>
    </div>
  );
}
