import { create } from 'zustand';

interface ChannelStore {
  channels: string[];
  sidebarOpen: boolean;
  addChannel: (channel: string) => void;
  removeChannel: (channel: string) => void;
  toggleSidebar: () => void;
  setSidebar: (open: boolean) => void;
  loadFromServer: () => Promise<void>;
}

export const useChannelStore = create<ChannelStore>((set, get) => ({
  channels: [],
  sidebarOpen: false,

  addChannel: (channel) => {
    const name = channel.toLowerCase().trim();
    if (!name || get().channels.includes(name)) return;
    set((s) => ({ channels: [...s.channels, name] }));

    // Sync to server
    fetch('/api/channels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    }).catch(() => {});
  },

  removeChannel: (channel) => {
    set((s) => ({ channels: s.channels.filter((c) => c !== channel) }));

    // Sync to server
    fetch(`/api/channels/${encodeURIComponent(channel)}`, {
      method: 'DELETE',
    }).catch(() => {});
  },

  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebar: (open) => set({ sidebarOpen: open }),

  loadFromServer: async () => {
    try {
      const res = await fetch('/api/channels');
      if (!res.ok) return;
      const data = await res.json();
      const serverChannels: string[] = data.map((c: { name: string }) => c.name);
      set({ channels: serverChannels });
    } catch {
      // Silently fail — use local data
    }
  },
}));
