'use client';

import { useState, useEffect } from 'react';
import { Upload, Check, X, AlertTriangle } from 'lucide-react';
import { migrateLocalData, hasLocalData, MigrateProgress } from '@/lib/migrate-client';
import { useAuthStore } from '@/stores/authStore';
import { useChannelStore } from '@/stores/channelStore';

export function MigratePrompt() {
  const appUser = useAuthStore((s) => s.appUser);
  const channels = useChannelStore((s) => s.channels);

  const [show, setShow] = useState(false);
  const [progress, setProgress] = useState<MigrateProgress | null>(null);
  const [migrating, setMigrating] = useState(false);

  useEffect(() => {
    if (!appUser) return;
    // Check if already migrated
    const migrated = localStorage.getItem('chatstream-migrated');
    if (migrated === 'true') return;
    // Check if local data exists
    if (hasLocalData()) {
      setShow(true);
    }
  }, [appUser]);

  const handleMigrate = async () => {
    setMigrating(true);
    const channelNames = channels;
    const result = await migrateLocalData(channelNames, setProgress);
    if (result.success) {
      // Mark as migrated
      localStorage.setItem('chatstream-migrated', 'true');
      // Clear local stores after short delay so user sees success
      setTimeout(() => {
        localStorage.removeItem('chatstream-pins');
        localStorage.removeItem('chatstream-settings');
        localStorage.removeItem('chatstream-mute');
        setShow(false);
      }, 2000);
    }
    setMigrating(false);
  };

  const handleDismiss = () => {
    localStorage.setItem('chatstream-migrated', 'true');
    setShow(false);
  };

  if (!show) return null;

  const isDone = progress?.phase === 'done';
  const isError = progress?.phase === 'error';
  const progressPercent =
    progress && progress.total > 0
      ? Math.round((progress.current / progress.total) * 100)
      : 0;

  return (
    <div
      className="fixed bottom-4 right-4 z-50 w-96 rounded-xl shadow-xl border p-4"
      style={{ background: 'var(--bg-document)', borderColor: 'var(--border)' }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Upload className="w-5 h-5" style={{ color: '#9333ea' }} />
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Importer vos donnees locales ?
          </h3>
        </div>
        {!migrating && (
          <button
            onClick={handleDismiss}
            className="p-0.5 rounded transition hover:opacity-70"
            style={{ color: 'var(--text-faint)' }}
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {!progress && (
        <>
          <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
            Des donnees locales (messages, epingles, mises en forme) ont ete detectees.
            Voulez-vous les importer vers votre compte ?
          </p>
          <button
            onClick={handleMigrate}
            disabled={migrating}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-white transition disabled:opacity-50"
            style={{ background: '#9333ea' }}
          >
            <Upload className="w-4 h-4" />
            Importer
          </button>
        </>
      )}

      {progress && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            {isDone && <Check className="w-4 h-4 text-green-500" />}
            {isError && <AlertTriangle className="w-4 h-4 text-red-400" />}
            <p
              className="text-xs"
              style={{ color: isError ? '#f87171' : isDone ? '#22c55e' : 'var(--text-muted)' }}
            >
              {progress.message}
            </p>
          </div>

          {!isDone && !isError && (
            <div className="w-full rounded-full h-2 overflow-hidden" style={{ background: 'var(--bg-input)' }}>
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ background: '#9333ea', width: `${progressPercent}%` }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
