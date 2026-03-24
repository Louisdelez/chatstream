'use client';

import { Pin, X, Trash2, ArrowRight } from 'lucide-react';
import { usePinStore } from '@/stores/pinStore';
import { formatTime } from '@/lib/formatters';
import { hashColor } from '@/lib/formatters';

interface Props {
  onScrollToMessage: (messageId: string) => void;
  channel: string;
}

export function PinnedPanel({ onScrollToMessage, channel }: Props) {
  const allPins = usePinStore((s) => s.pins);
  const pins = allPins.filter((p) => p.channel === channel);
  const panelOpen = usePinStore((s) => s.panelOpen);
  const removePin = usePinStore((s) => s.removePin);
  const clearPins = usePinStore((s) => s.clearPins);
  const setPanel = usePinStore((s) => s.setPanel);

  if (!panelOpen) return null;

  return (
    <>
      {/* Backdrop overlay on mobile/tablet */}
      <div
        className="lg:hidden fixed inset-0 bg-black/30 z-30"
        onClick={() => setPanel(false)}
      />
      <div className="fixed lg:relative z-40 lg:z-auto right-0 top-0 w-full sm:w-[350px] shrink-0 border-l flex flex-col h-full" style={{ borderColor: 'var(--border)', background: 'var(--bg-panel)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2">
          <Pin className="w-4 h-4 text-purple-500" />
          <h3 className="font-semibold text-sm" style={{ color: 'var(--text-secondary)' }}>
            Épingles ({pins.length})
          </h3>
        </div>
        <div className="flex items-center gap-1">
          {pins.length > 0 && (
            <button
              onClick={() => clearPins(channel)}
              className="p-1.5 rounded-lg hover:text-red-500 transition"
              style={{ color: 'var(--text-muted)' }}
              title="Tout supprimer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={() => setPanel(false)}
            className="p-1.5 rounded-lg transition"
            style={{ color: 'var(--text-muted)' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Pinned items */}
      <div className="flex-1 overflow-y-auto">
        {pins.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16" style={{ color: 'var(--text-muted)' }}>
            <Pin className="w-8 h-8 mb-3" />
            <p className="text-sm">Aucune épingle</p>
            <p className="text-xs mt-1 text-center px-4">
              Faites un clic droit sur un message pour l&apos;épingler
            </p>
          </div>
        ) : (
          <div className="py-2">
            {pins.map((pin) => (
              <div
                key={pin.id}
                className="group px-4 py-3 transition"
                style={{ borderBottom: '1px solid var(--border-light)' }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="text-xs font-semibold"
                        style={{ color: pin.color || hashColor(pin.displayName) }}
                      >
                        {pin.displayName}
                      </span>
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {formatTime(pin.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm break-words leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                      {pin.text}
                    </p>
                  </div>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition shrink-0">
                    <button
                      onClick={() => onScrollToMessage(pin.messageId)}
                      className="p-1 rounded hover:text-purple-600 transition"
                      style={{ color: 'var(--text-muted)' }}
                      title="Voir le message original"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => removePin(pin.id)}
                      className="p-1 rounded hover:text-red-500 transition"
                      style={{ color: 'var(--text-muted)' }}
                      title="Supprimer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
    </>
  );
}
