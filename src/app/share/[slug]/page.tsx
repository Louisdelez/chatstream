'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { AlertTriangle, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { ChatMessageRow } from '@/components/chat/ChatMessage';
import { useSettingsStore } from '@/stores/settingsStore';
import { usePinStore, TextFormat, PinnedItem, TextStyle } from '@/stores/pinStore';
import { useAuthStore } from '@/stores/authStore';
import { hasPermission } from '@/lib/share-permissions';
import { ChatMessage } from '@/types';

interface ShareInfo {
  id: string;
  channel: string;
  slug: string;
  createdAt: string;
  expiresAt: string | null;
  active: boolean;
  permission: string;
}

function formatDateLabel(dateStr: string) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function SharePage() {
  const params = useParams();
  const slug = params.slug as string;

  const [shareInfo, setShareInfo] = useState<ShareInfo | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [formats, setFormats] = useState<TextFormat[]>([]);
  const [pins, setPins] = useState<PinnedItem[]>([]);
  const [availableDays, setAvailableDays] = useState<string[]>([]);
  const [selectedDay, setSelectedDay] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const appUser = useAuthStore((s) => s.appUser);
  const loadSession = useAuthStore((s) => s.loadSession);

  const fontSize = useSettingsStore((s) => s.fontSize);
  const fontFamily = useSettingsStore((s) => s.fontFamily);
  const theme = useSettingsStore((s) => s.theme);
  const toggleTheme = useSettingsStore((s) => s.toggleTheme);

  // Load session on mount
  useEffect(() => {
    loadSession();
  }, [loadSession]);

  // Fetch messages for a given day
  const fetchMessages = useCallback(async (day: string) => {
    setLoadingMessages(true);
    try {
      const msgsRes = await fetch(`/api/shares/${slug}/messages?date=${day}&chunk=0`);
      if (msgsRes.ok) {
        const rawMsgs = await msgsRes.json();
        const mapped: ChatMessage[] = rawMsgs.map((m: Record<string, unknown>) => ({
          id: m.id as string,
          timestamp: new Date(m.timestamp as string).getTime(),
          channel: m.channel as string,
          username: m.username as string,
          displayName: m.displayName as string,
          color: (m.color as string) ?? null,
          message: m.message as string,
          roles: (m.roles as string[]) ?? [],
          badges: (m.badges as Record<string, string>) ?? {},
          emotes: (m.emotes as Record<string, string[]>) ?? null,
          isAction: (m.isAction as boolean) ?? false,
          eventType: m.eventType as string | undefined,
          eventData: m.eventData as Record<string, unknown> | undefined,
        }));
        setMessages(mapped);
      } else {
        setMessages([]);
      }
    } catch {
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  }, [slug]);

  // Fetch share info + available days + formats + pins on mount
  useEffect(() => {
    async function fetchShare() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/shares/${slug}`);
        if (!res.ok) {
          const data = await res.json();
          if (res.status === 410) {
            setError('Ce lien de partage a expiré.');
          } else if (res.status === 404) {
            setError('Ce lien de partage est introuvable ou a été désactivé.');
          } else {
            setError(data.error || 'Erreur inconnue');
          }
          return;
        }
        const info: ShareInfo = await res.json();
        setShareInfo(info);

        // Fetch available days, formats, pins in parallel
        const today = new Date().toISOString().slice(0, 10);
        const [daysRes, msgsRes, fmtsRes, pinsRes] = await Promise.all([
          fetch(`/api/shares/${slug}/messages?mode=days`),
          fetch(`/api/shares/${slug}/messages?date=${today}&chunk=0`),
          fetch(`/api/shares/${slug}/formats`),
          fetch(`/api/shares/${slug}/pins`),
        ]);

        if (daysRes.ok) {
          const days: string[] = await daysRes.json();
          setAvailableDays(days);
          // If today has no data but other days exist, select the most recent day
          if (days.length > 0 && !days.includes(today)) {
            setSelectedDay(days[0]);
            // Fetch messages for that day instead
            const altRes = await fetch(`/api/shares/${slug}/messages?date=${days[0]}&chunk=0`);
            if (altRes.ok) {
              const rawMsgs = await altRes.json();
              const mapped: ChatMessage[] = rawMsgs.map((m: Record<string, unknown>) => ({
                id: m.id as string,
                timestamp: new Date(m.timestamp as string).getTime(),
                channel: m.channel as string,
                username: m.username as string,
                displayName: m.displayName as string,
                color: (m.color as string) ?? null,
                message: m.message as string,
                roles: (m.roles as string[]) ?? [],
                badges: (m.badges as Record<string, string>) ?? {},
                emotes: (m.emotes as Record<string, string[]>) ?? null,
                isAction: (m.isAction as boolean) ?? false,
                eventType: m.eventType as string | undefined,
                eventData: m.eventData as Record<string, unknown> | undefined,
              }));
              setMessages(mapped);
            }
          } else if (msgsRes.ok) {
            const rawMsgs = await msgsRes.json();
            const mapped: ChatMessage[] = rawMsgs.map((m: Record<string, unknown>) => ({
              id: m.id as string,
              timestamp: new Date(m.timestamp as string).getTime(),
              channel: m.channel as string,
              username: m.username as string,
              displayName: m.displayName as string,
              color: (m.color as string) ?? null,
              message: m.message as string,
              roles: (m.roles as string[]) ?? [],
              badges: (m.badges as Record<string, string>) ?? {},
              emotes: (m.emotes as Record<string, string[]>) ?? null,
              isAction: (m.isAction as boolean) ?? false,
              eventType: m.eventType as string | undefined,
              eventData: m.eventData as Record<string, unknown> | undefined,
            }));
            setMessages(mapped);
          }
        } else if (msgsRes.ok) {
          const rawMsgs = await msgsRes.json();
          const mapped: ChatMessage[] = rawMsgs.map((m: Record<string, unknown>) => ({
            id: m.id as string,
            timestamp: new Date(m.timestamp as string).getTime(),
            channel: m.channel as string,
            username: m.username as string,
            displayName: m.displayName as string,
            color: (m.color as string) ?? null,
            message: m.message as string,
            roles: (m.roles as string[]) ?? [],
            badges: (m.badges as Record<string, string>) ?? {},
            emotes: (m.emotes as Record<string, string[]>) ?? null,
            isAction: (m.isAction as boolean) ?? false,
            eventType: m.eventType as string | undefined,
            eventData: m.eventData as Record<string, unknown> | undefined,
          }));
          setMessages(mapped);
        }

        if (fmtsRes.ok) {
          const rawFmts = await fmtsRes.json();
          const mapped: TextFormat[] = rawFmts.map((f: Record<string, unknown>) => ({
            serverId: f.id as string,
            messageId: f.messageId as string,
            start: f.start as number,
            end: f.end as number,
            style: f.style as TextStyle,
            color: (f.color as string) ?? undefined,
          }));
          setFormats(mapped);
        }

        if (pinsRes.ok) {
          const rawPins = await pinsRes.json();
          const mapped: PinnedItem[] = rawPins.map((p: Record<string, unknown>) => ({
            id: crypto.randomUUID(),
            serverId: p.id as string,
            messageId: p.messageId as string,
            channel: p.channel as string,
            displayName: p.displayName as string,
            color: (p.color as string) ?? null,
            text: p.text as string,
            fullMessage: p.fullMessage as string,
            timestamp: new Date(p.timestamp as string).getTime(),
            pinnedAt: new Date(p.pinnedAt as string).getTime(),
          }));
          setPins(mapped);
        }
      } catch {
        setError('Impossible de charger le partage.');
      } finally {
        setLoading(false);
      }
    }

    fetchShare();
  }, [slug]);

  // Inject share formats into the pin store so ChatMessageRow can read them
  useEffect(() => {
    if (formats.length > 0) {
      const store = usePinStore.getState();
      // Merge share formats without removing existing ones
      const existingIds = new Set(store.formats.map((f) => `${f.messageId}-${f.start}-${f.end}-${f.style}`));
      const newFormats = formats.filter(
        (f) => !existingIds.has(`${f.messageId}-${f.start}-${f.end}-${f.style}`)
      );
      if (newFormats.length > 0) {
        usePinStore.setState({ formats: [...store.formats, ...newFormats] });
      }
    }
  }, [formats]);

  const canFormat = useMemo(
    () => shareInfo ? hasPermission(shareInfo.permission, 'format') : false,
    [shareInfo]
  );
  const canPin = useMemo(
    () => shareInfo ? hasPermission(shareInfo.permission, 'pin') : false,
    [shareInfo]
  );

  // Day navigation helpers
  const currentDayIndex = availableDays.indexOf(selectedDay);
  // availableDays is sorted desc, so "prev" (older) is index+1, "next" (newer) is index-1
  const hasNewerDay = currentDayIndex > 0;
  const hasOlderDay = currentDayIndex < availableDays.length - 1 && currentDayIndex !== -1;

  const goToNewerDay = () => {
    if (hasNewerDay) {
      const newDay = availableDays[currentDayIndex - 1];
      setSelectedDay(newDay);
      fetchMessages(newDay);
    }
  };

  const goToOlderDay = () => {
    if (hasOlderDay) {
      const newDay = availableDays[currentDayIndex + 1];
      setSelectedDay(newDay);
      fetchMessages(newDay);
    }
  };

  const handleDayChange = (day: string) => {
    setSelectedDay(day);
    fetchMessages(day);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-page)' }}>
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#9333ea' }} />
          <p style={{ color: 'var(--text-muted)' }}>Chargement du partage...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-page)' }}>
        <div className="flex flex-col items-center gap-4 max-w-md text-center px-4">
          <AlertTriangle className="w-12 h-12 text-red-400" />
          <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
            Partage indisponible
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>{error}</p>
          <a
            href="/"
            className="mt-4 px-4 py-2 rounded-lg text-sm text-white transition"
            style={{ background: '#9333ea' }}
          >
            Retour a l&apos;accueil
          </a>
        </div>
      </div>
    );
  }

  if (!shareInfo) return null;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-page)' }}>
      {/* Header */}
      <header
        className="border-b px-4 py-3 flex items-center justify-between"
        style={{ background: 'var(--bg-toolbar)', borderColor: 'var(--border)' }}
      >
        <div className="flex items-center gap-3">
          <h1 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
            #{shareInfo.channel}
          </h1>
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--bg-active)', color: '#9333ea' }}>
            Partage
          </span>
        </div>
        <div className="flex items-center gap-3">
          {appUser && (canFormat || canPin) && (
            <span className="text-xs" style={{ color: 'var(--text-faint)' }}>
              {canPin ? 'Lecture + Mise en forme + Epingles' : canFormat ? 'Lecture + Mise en forme' : 'Lecture seule'}
            </span>
          )}
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-lg border transition"
            style={{ borderColor: 'var(--border)', background: 'var(--bg-document)' }}
          >
            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
              {theme === 'light' ? '🌙' : '☀️'}
            </span>
          </button>
        </div>
      </header>

      {/* Document */}
      <div className="flex-1 flex justify-center pt-4 px-4">
        <div className="w-full sm:max-w-[900px]">
          {/* Document header with day navigation */}
          <div
            className="border rounded-t-lg px-6 py-4"
            style={{ background: 'var(--bg-document)', borderColor: 'var(--border)' }}
          >
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-secondary)' }}>
              Chat — {shareInfo.channel}
            </h2>
            {/* Day navigation */}
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={goToOlderDay}
                disabled={!hasOlderDay}
                className="p-1 rounded transition disabled:opacity-30"
                style={{ color: 'var(--text-muted)' }}
                title="Jour précédent"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {availableDays.length > 1 ? (
                <select
                  value={selectedDay}
                  onChange={(e) => handleDayChange(e.target.value)}
                  className="text-sm rounded px-2 py-1 border cursor-pointer"
                  style={{
                    background: 'var(--bg-document)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  {availableDays.map((day) => (
                    <option key={day} value={day}>
                      {formatDateLabel(day)}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  {formatDateLabel(selectedDay)}
                </span>
              )}

              <button
                onClick={goToNewerDay}
                disabled={!hasNewerDay}
                className="p-1 rounded transition disabled:opacity-30"
                style={{ color: 'var(--text-muted)' }}
                title="Jour suivant"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              {loadingMessages && (
                <Loader2 className="w-4 h-4 animate-spin ml-2" style={{ color: 'var(--text-muted)' }} />
              )}

              <span className="text-sm ml-auto" style={{ color: 'var(--text-muted)' }}>
                {messages.length} message{messages.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {/* Messages */}
          <div
            className="border border-t-0 rounded-b-lg overflow-y-auto"
            style={{
              background: 'var(--bg-document)',
              borderColor: 'var(--border)',
              fontSize: `${fontSize}px`,
              fontFamily: `'${fontFamily}', sans-serif`,
              maxHeight: 'calc(100vh - 200px)',
            }}
          >
            {loadingMessages ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--text-muted)' }} />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20" style={{ color: 'var(--text-faint)' }}>
                <p className="text-sm">Aucun message pour cette date.</p>
              </div>
            ) : (
              messages.map((msg) => (
                <ChatMessageRow key={msg.id} message={msg} />
              ))
            )}
          </div>

          {/* Pins section */}
          {pins.length > 0 && (
            <div className="mt-4 mb-8">
              <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
                Messages epingles ({pins.length})
              </h3>
              <div
                className="border rounded-lg divide-y"
                style={{ background: 'var(--bg-document)', borderColor: 'var(--border)' }}
              >
                {pins.map((pin) => (
                  <div key={pin.id} className="px-4 py-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold" style={{ color: pin.color || 'var(--text-primary)' }}>
                        {pin.displayName}
                      </span>
                      <span className="text-xs" style={{ color: 'var(--text-faint)' }}>
                        {new Date(pin.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{pin.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
