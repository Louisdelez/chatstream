import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const KNOWN_BOTS = [
  'nightbot',
  'streamelements',
  'moobot',
  'fossabot',
  'streamlabs',
  'wizebot',
  'soundalerts',
  'restreambot',
  'botisimo',
  'coebot',
  'deepbot',
];

interface MuteStore {
  mutedUsers: string[]; // lowercase usernames
  muteHost: boolean; // mute the broadcaster/host

  toggleMuteUser: (username: string) => void;
  addMutedUser: (username: string) => void;
  removeMutedUser: (username: string) => void;
  toggleMuteHost: () => void;
  isMuted: (username: string, channel: string) => boolean;
  loadFromServer: () => Promise<void>;
}

export const useMuteStore = create<MuteStore>()(
  persist(
    (set, get) => ({
      mutedUsers: [],
      muteHost: false,

      toggleMuteUser: (username) => {
        const name = username.toLowerCase();
        const isMuted = get().mutedUsers.includes(name);

        if (isMuted) {
          set((s) => ({ mutedUsers: s.mutedUsers.filter((u) => u !== name) }));
          // Sync removal to server
          fetch(`/api/muted/${encodeURIComponent(name)}`, { method: 'DELETE' }).catch(() => {});
        } else {
          set((s) => ({ mutedUsers: [...s.mutedUsers, name] }));
          // Sync addition to server
          fetch('/api/muted', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: name }),
          }).catch(() => {});
        }
      },

      addMutedUser: (username) => {
        const name = username.toLowerCase();
        if (get().mutedUsers.includes(name)) return;

        set((s) => ({ mutedUsers: [...s.mutedUsers, name] }));
        // Sync to server
        fetch('/api/muted', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: name }),
        }).catch(() => {});
      },

      removeMutedUser: (username) => {
        const name = username.toLowerCase();
        set((s) => ({ mutedUsers: s.mutedUsers.filter((u) => u !== name) }));
        // Sync to server
        fetch(`/api/muted/${encodeURIComponent(name)}`, { method: 'DELETE' }).catch(() => {});
      },

      toggleMuteHost: () => set((s) => ({ muteHost: !s.muteHost })),

      isMuted: (username, channel) => {
        const state = get();
        const name = username.toLowerCase();
        if (state.muteHost && name === channel.toLowerCase()) return true;
        return state.mutedUsers.includes(name);
      },

      loadFromServer: async () => {
        try {
          const res = await fetch('/api/muted');
          if (!res.ok) return;
          const data = await res.json();
          const serverMuted: string[] = data.map((m: { username: string }) => m.username);
          set({ mutedUsers: serverMuted });
        } catch {
          // Silently fail — use local data
        }
      },
    }),
    { name: 'chatstream-mute' }
  )
);
