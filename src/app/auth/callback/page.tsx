'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';

export default function AuthCallback() {
  const router = useRouter();
  const loadSession = useAuthStore((s) => s.loadSession);

  useEffect(() => {
    // The Twitch OAuth callback is now handled server-side at /api/twitch/callback.
    // This page handles any remaining client-side redirects (e.g. from better-auth).
    loadSession().then(() => {
      router.push('/');
    });
  }, [router, loadSession]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-purple-300 border-t-purple-600 rounded-full animate-spin mx-auto mb-4" />
        <p style={{ color: 'var(--text-muted)' }}>Connexion en cours...</p>
      </div>
    </div>
  );
}
