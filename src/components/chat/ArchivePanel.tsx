'use client';

import { useState, useEffect, useCallback } from 'react';
import { Calendar, ChevronRight, ArrowLeft, Trash2, FileText, ExternalLink } from 'lucide-react';
import { getArchivedDays, getChunkMessages, cleanupOldMessages, ArchiveDay, ArchiveChunk } from '@/lib/db';
import { formatTime } from '@/lib/formatters';
import { ChatMessage } from '@/types';
import { ChatMessageRow } from './ChatMessage';

interface Props {
  channel: string;
  onClose: () => void;
  onLoadInMain: (messages: ChatMessage[]) => void;
}

type View = 'days' | 'chunks' | 'messages';

export function ArchivePanel({ channel, onClose, onLoadInMain }: Props) {
  const [days, setDays] = useState<ArchiveDay[]>([]);
  const [selectedDay, setSelectedDay] = useState<ArchiveDay | null>(null);
  const [selectedChunk, setSelectedChunk] = useState<ArchiveChunk | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>('days');

  // Load available days
  useEffect(() => {
    setLoading(true);
    getArchivedDays(channel).then((d) => {
      setDays(d);
      setLoading(false);
    });
  }, [channel]);

  // Load messages for selected chunk
  useEffect(() => {
    if (!selectedDay || !selectedChunk) {
      setMessages([]);
      return;
    }
    setLoading(true);
    getChunkMessages(channel, selectedDay.date, selectedChunk.index).then((msgs) => {
      setMessages(msgs);
      setLoading(false);
    });
  }, [selectedDay, selectedChunk, channel]);

  const handleSelectDay = (day: ArchiveDay) => {
    setSelectedDay(day);
    if (day.chunks.length === 1) {
      // Only 1 chunk, go directly to messages
      setSelectedChunk(day.chunks[0]);
      setView('messages');
    } else {
      setView('chunks');
    }
  };

  const handleSelectChunk = (chunk: ArchiveChunk) => {
    setSelectedChunk(chunk);
    setView('messages');
  };

  const handleBack = () => {
    if (view === 'messages' && selectedDay && selectedDay.chunks.length > 1) {
      setSelectedChunk(null);
      setView('chunks');
    } else {
      setSelectedDay(null);
      setSelectedChunk(null);
      setView('days');
    }
  };

  const handleCleanup = useCallback(async () => {
    const deleted = await cleanupOldMessages(channel, 30);
    if (deleted > 0) {
      const updated = await getArchivedDays(channel);
      setDays(updated);
      setSelectedDay(null);
      setSelectedChunk(null);
      setView('days');
    }
  }, [channel]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const title =
    view === 'days'
      ? `Archives — ${channel}`
      : view === 'chunks' && selectedDay
        ? selectedDay.label
        : selectedDay && selectedChunk
          ? `${selectedDay.label} — Messages ${selectedChunk.label}`
          : '';

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div
        className="relative z-10 m-auto w-full max-w-3xl max-h-[80vh] flex flex-col rounded-xl shadow-2xl border overflow-hidden"
        style={{ background: 'var(--bg-document)', borderColor: 'var(--border)' }}
      >
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-3">
            {view !== 'days' ? (
              <button onClick={handleBack} className="p-1 rounded-lg transition" style={{ color: 'var(--text-muted)' }}>
                <ArrowLeft className="w-4 h-4" />
              </button>
            ) : (
              <Calendar className="w-5 h-5 text-purple-500" />
            )}
            <div>
              <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h2>
              {view === 'messages' && (
                <p className="text-xs" style={{ color: 'var(--text-faint)' }}>
                  {messages.length} message{messages.length !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {view === 'messages' && messages.length > 0 && (
              <button
                onClick={() => {
                  onLoadInMain(messages);
                  onClose();
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg border bg-purple-600 text-white hover:bg-purple-700 transition"
                title="Ouvrir dans la vue principale pour éditer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Ouvrir dans le chat</span>
              </button>
            )}
            {view === 'days' && days.length > 0 && (
              <button
                onClick={handleCleanup}
                className="tb-btn flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg border transition"
                title="Supprimer les archives de plus de 30 jours"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Nettoyer +30j</span>
              </button>
            )}
            <button onClick={onClose} className="tb-btn px-3 py-1.5 text-xs rounded-lg border transition">
              Fermer
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-6 h-6 border-2 border-purple-300 border-t-purple-600 rounded-full animate-spin" />
            </div>
          ) : view === 'messages' ? (
            /* Messages view */
            <div className="px-3 sm:px-5 py-3">
              {messages.map((msg) => (
                <ChatMessageRow key={msg.id} message={msg} />
              ))}
            </div>
          ) : view === 'chunks' && selectedDay ? (
            /* Chunks list for a day */
            <div className="py-2">
              {selectedDay.chunks.map((chunk) => (
                <button
                  key={chunk.index}
                  onClick={() => handleSelectChunk(chunk)}
                  className="tb-dropdown-item w-full flex items-center justify-between px-5 py-3 transition"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="w-4 h-4" style={{ color: 'var(--text-faint)' }} />
                    <div className="text-left">
                      <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                        Messages {chunk.label}
                      </span>
                      <span className="block text-xs" style={{ color: 'var(--text-faint)' }}>
                        {formatTime(chunk.from)} — {formatTime(chunk.to)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs" style={{ color: 'var(--text-faint)' }}>
                      {chunk.count} msgs
                    </span>
                    <ChevronRight className="w-4 h-4" style={{ color: 'var(--text-faint)' }} />
                  </div>
                </button>
              ))}
            </div>
          ) : (
            /* Days list */
            <div className="py-2">
              {days.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20" style={{ color: 'var(--text-faint)' }}>
                  <Calendar className="w-10 h-10 mb-3" />
                  <p className="text-sm">Aucune archive</p>
                  <p className="text-xs mt-1">Les messages sont archivés automatiquement</p>
                </div>
              ) : (
                days.map((day) => {
                  const isToday = day.date.getTime() === today.getTime();
                  return (
                    <button
                      key={day.date.getTime()}
                      onClick={() => handleSelectDay(day)}
                      className="tb-dropdown-item w-full flex items-center justify-between px-5 py-3 transition"
                    >
                      <div className="flex items-center gap-3">
                        <Calendar className="w-4 h-4" style={{ color: isToday ? '#9333ea' : 'var(--text-faint)' }} />
                        <div className="text-left">
                          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                            {day.label}
                          </span>
                          {isToday && (
                            <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-600 font-medium">
                              Aujourd&apos;hui
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs" style={{ color: 'var(--text-faint)' }}>
                          {day.count.toLocaleString('fr-FR')} msgs
                          {day.chunks.length > 1 && ` · ${day.chunks.length} blocs`}
                        </span>
                        <ChevronRight className="w-4 h-4" style={{ color: 'var(--text-faint)' }} />
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
