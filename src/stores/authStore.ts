import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authClient } from '@/lib/auth-client';

interface AppUser {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
}

interface TwitchInfo {
  linked: boolean;
  displayName: string | null;
  accountId: string | null;
}

interface TwitchToken {
  accessToken: string;
  login: string;
}

interface AuthStore {
  appUser: AppUser | null;
  twitchLinked: boolean;
  twitchDisplayName: string | null;
  twitchAccountId: string | null;
  twitchToken: TwitchToken | null;
  showSetup: boolean;
  sessionLoading: boolean;

  loadSession: () => Promise<void>;
  loadTwitchStatus: () => Promise<void>;
  fetchTwitchToken: () => Promise<TwitchToken | null>;
  logout: () => void;
  setShowSetup: (show: boolean) => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      appUser: null,
      twitchLinked: false,
      twitchDisplayName: null,
      twitchAccountId: null,
      twitchToken: null,
      showSetup: false,
      sessionLoading: false,

      loadSession: async () => {
        set({ sessionLoading: true });
        try {
          const { data: session } = await authClient.getSession();
          if (session?.user) {
            set({
              appUser: {
                id: session.user.id,
                email: session.user.email,
                name: session.user.name,
                image: session.user.image ?? null,
              },
            });
            // Also load Twitch status once we have a session
            await get().loadTwitchStatus();
          } else {
            set({ appUser: null, twitchLinked: false, twitchDisplayName: null, twitchAccountId: null, twitchToken: null });
          }
        } catch {
          set({ appUser: null });
        } finally {
          set({ sessionLoading: false });
        }
      },

      loadTwitchStatus: async () => {
        try {
          const res = await fetch('/api/twitch/status');
          if (!res.ok) return;
          const data: TwitchInfo = await res.json();
          set({
            twitchLinked: data.linked,
            twitchDisplayName: data.displayName ?? null,
            twitchAccountId: data.accountId ?? null,
          });
        } catch {
          // Ignore errors
        }
      },

      fetchTwitchToken: async () => {
        try {
          const res = await fetch('/api/twitch/token');
          if (!res.ok) {
            set({ twitchToken: null });
            return null;
          }
          const data: TwitchToken = await res.json();
          set({ twitchToken: data });
          return data;
        } catch {
          set({ twitchToken: null });
          return null;
        }
      },

      logout: () => {
        set({
          appUser: null,
          twitchLinked: false,
          twitchDisplayName: null,
          twitchAccountId: null,
          twitchToken: null,
        });
      },

      setShowSetup: (showSetup) => set({ showSetup }),
    }),
    {
      name: 'chatstream-auth',
      partialize: (state: AuthStore) => ({
        showSetup: state.showSetup,
      }),
    }
  )
);

export function getTwitchLinkUrl(): string {
  return '/api/twitch/link';
}
