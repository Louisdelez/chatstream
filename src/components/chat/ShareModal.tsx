'use client';

import { useState } from 'react';
import { X, Copy, Check, Link, Loader2 } from 'lucide-react';

interface Props {
  channel: string;
  onClose: () => void;
}

const PERMISSION_OPTIONS = [
  { value: 'view', label: 'Lecture seule' },
  { value: 'format', label: 'Mise en forme' },
  { value: 'pin', label: 'Epingles' },
  { value: 'full', label: 'Complet' },
];

export function ShareModal({ channel, onClose }: Props) {
  const [permission, setPermission] = useState('view');
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCreate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/shares', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel, permission }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Erreur lors de la creation du partage');
        return;
      }
      const share = await res.json();
      const url = `${window.location.origin}/share/${share.slug}`;
      setShareUrl(url);
    } catch {
      setError('Erreur reseau');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const input = document.createElement('input');
      input.value = shareUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      <div
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md rounded-xl shadow-xl border p-6"
        style={{ background: 'var(--bg-document)', borderColor: 'var(--border)' }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            Partager #{channel}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg transition hover:opacity-70"
            style={{ color: 'var(--text-muted)' }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!shareUrl ? (
          <>
            <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
              Niveau de permission
            </label>
            <select
              value={permission}
              onChange={(e) => setPermission(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-1 focus:ring-purple-400"
              style={{
                background: 'var(--bg-input)',
                borderColor: 'var(--border)',
                color: 'var(--text-primary)',
              }}
            >
              {PERMISSION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            {error && (
              <p className="text-sm text-red-400 mb-3">{error}</p>
            )}

            <button
              onClick={handleCreate}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white transition disabled:opacity-50"
              style={{ background: '#9333ea' }}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Link className="w-4 h-4" />
              )}
              Creer le lien
            </button>
          </>
        ) : (
          <>
            <p className="text-sm mb-3" style={{ color: 'var(--text-muted)' }}>
              Votre lien de partage est pret :
            </p>
            <div
              className="flex items-center gap-2 rounded-lg border px-3 py-2 mb-4"
              style={{ background: 'var(--bg-input)', borderColor: 'var(--border)' }}
            >
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="flex-1 text-sm bg-transparent focus:outline-none"
                style={{ color: 'var(--text-primary)' }}
              />
              <button
                onClick={handleCopy}
                className="p-1.5 rounded-lg transition hover:opacity-70"
                style={{ color: copied ? '#22c55e' : 'var(--text-muted)' }}
                title="Copier"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            <button
              onClick={onClose}
              className="w-full px-4 py-2.5 rounded-lg text-sm font-medium border transition"
              style={{
                background: 'var(--bg-btn)',
                borderColor: 'var(--border-btn)',
                color: 'var(--text-secondary)',
              }}
            >
              Fermer
            </button>
          </>
        )}
      </div>
    </>
  );
}
