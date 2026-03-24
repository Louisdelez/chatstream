import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface PinnedItem {
  id: string;
  serverId?: string; // server-side ID for sync
  messageId: string;
  channel: string;
  displayName: string;
  color: string | null;
  text: string;
  fullMessage: string;
  timestamp: number;
  pinnedAt: number;
}

export type TextStyle = 'highlight' | 'bold' | 'italic' | 'underline' | 'strikethrough';

export interface TextFormat {
  serverId?: string; // server-side ID for sync
  messageId: string;
  start: number;
  end: number;
  style: TextStyle;
  color?: string; // only for highlight
}

interface PinStore {
  pins: PinnedItem[];
  formats: TextFormat[];
  panelOpen: boolean;

  addPin: (pin: Omit<PinnedItem, 'id' | 'pinnedAt'>) => void;
  removePin: (id: string) => void;
  clearPins: (channel: string) => void;

  addFormat: (f: TextFormat) => void;
  removeFormat: (messageId: string, start: number, end: number, style: TextStyle) => void;

  togglePanel: () => void;
  setPanel: (open: boolean) => void;

  loadFromServer: (channel: string) => Promise<void>;
}

export const usePinStore = create<PinStore>()(
  persist(
    (set, get) => ({
      pins: [],
      formats: [],
      panelOpen: false,

      addPin: (pin) => {
        const newPin: PinnedItem = {
          ...pin,
          id: crypto.randomUUID(),
          pinnedAt: Date.now(),
        };
        set((s) => ({ pins: [...s.pins, newPin] }));

        // Sync to server
        fetch('/api/pins', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messageId: pin.messageId,
            channel: pin.channel,
            displayName: pin.displayName,
            color: pin.color,
            text: pin.text,
            fullMessage: pin.fullMessage,
            timestamp: pin.timestamp,
          }),
        })
          .then((res) => res.ok ? res.json() : null)
          .then((serverPin) => {
            if (serverPin?.id) {
              set((s) => ({
                pins: s.pins.map((p) =>
                  p.id === newPin.id ? { ...p, serverId: serverPin.id } : p
                ),
              }));
            }
          })
          .catch(() => {});
      },

      removePin: (id) => {
        const pin = get().pins.find((p) => p.id === id);
        set((s) => ({ pins: s.pins.filter((p) => p.id !== id) }));

        // Sync to server using serverId if available, otherwise try with local id
        const serverId = pin?.serverId || id;
        fetch(`/api/pins/${serverId}`, { method: 'DELETE' }).catch(() => {});
      },

      clearPins: (channel: string) => {
        const pinsToRemove = get().pins.filter((p) => p.channel === channel);
        set((s) => ({ pins: s.pins.filter((p) => p.channel !== channel) }));

        // Sync deletions to server
        for (const pin of pinsToRemove) {
          const serverId = pin.serverId || pin.id;
          fetch(`/api/pins/${serverId}`, { method: 'DELETE' }).catch(() => {});
        }
      },

      addFormat: (f) => {
        set((s) => ({ formats: [...s.formats, f] }));

        // Sync to server
        fetch('/api/formats', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messageId: f.messageId,
            start: f.start,
            end: f.end,
            style: f.style,
            color: f.color ?? null,
          }),
        })
          .then((res) => res.ok ? res.json() : null)
          .then((serverFormat) => {
            if (serverFormat?.id) {
              set((s) => ({
                formats: s.formats.map((fmt) =>
                  fmt.messageId === f.messageId &&
                  fmt.start === f.start &&
                  fmt.end === f.end &&
                  fmt.style === f.style &&
                  !fmt.serverId
                    ? { ...fmt, serverId: serverFormat.id }
                    : fmt
                ),
              }));
            }
          })
          .catch(() => {});
      },

      removeFormat: (messageId, start, end, style) => {
        const format = get().formats.find(
          (f) => f.messageId === messageId && f.start === start && f.end === end && f.style === style
        );

        set((s) => ({
          formats: s.formats.filter(
            (f) =>
              !(f.messageId === messageId && f.start === start && f.end === end && f.style === style)
          ),
        }));

        // Sync to server
        if (format?.serverId) {
          fetch(`/api/formats/${format.serverId}`, { method: 'DELETE' }).catch(() => {});
        }
      },

      togglePanel: () => set((s) => ({ panelOpen: !s.panelOpen })),
      setPanel: (open) => set({ panelOpen: open }),

      loadFromServer: async (channel: string) => {
        try {
          const [pinsRes, formatsRes] = await Promise.all([
            fetch(`/api/pins/channel/${encodeURIComponent(channel)}`),
            fetch(`/api/formats/channel/${encodeURIComponent(channel)}`),
          ]);

          if (pinsRes.ok) {
            const serverPins = await pinsRes.json();
            const mappedPins: PinnedItem[] = serverPins.map((sp: Record<string, unknown>) => ({
              id: crypto.randomUUID(),
              serverId: sp.id as string,
              messageId: sp.messageId as string,
              channel: sp.channel as string,
              displayName: sp.displayName as string,
              color: (sp.color as string) ?? null,
              text: sp.text as string,
              fullMessage: sp.fullMessage as string,
              timestamp: new Date(sp.timestamp as string).getTime(),
              pinnedAt: new Date(sp.pinnedAt as string).getTime(),
            }));

            set((s) => {
              // Merge: keep local pins for other channels, replace for this channel
              const otherPins = s.pins.filter((p) => p.channel !== channel);
              return { pins: [...otherPins, ...mappedPins] };
            });
          }

          if (formatsRes.ok) {
            const serverFormats = await formatsRes.json();
            const mappedFormats: TextFormat[] = serverFormats.map((sf: Record<string, unknown>) => ({
              serverId: sf.id as string,
              messageId: sf.messageId as string,
              start: sf.start as number,
              end: sf.end as number,
              style: sf.style as TextStyle,
              color: (sf.color as string) ?? undefined,
            }));

            set((s) => {
              // Merge: keep local formats for messages not in this channel's server data
              const serverMessageIds = new Set(mappedFormats.map((f) => f.messageId));
              const otherFormats = s.formats.filter((f) => !serverMessageIds.has(f.messageId));
              return { formats: [...otherFormats, ...mappedFormats] };
            });
          }
        } catch {
          // Silently fail — use local data
        }
      },
    }),
    {
      name: 'chatstream-pins',
      // Migrate old format (highlights -> formats)
      migrate: (persisted: unknown) => {
        const state = persisted as Record<string, unknown>;
        if (state && 'highlights' in state && !('formats' in state)) {
          const highlights = state.highlights as Array<{ messageId: string; start: number; end: number; color: string }>;
          return {
            ...state,
            formats: highlights.map((h) => ({
              ...h,
              style: 'highlight' as TextStyle,
            })),
          };
        }
        return state;
      },
      version: 2,
    }
  )
);
