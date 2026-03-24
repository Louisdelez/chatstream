import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_SETTINGS } from '@/lib/constants';

export type ThemeMode = 'light' | 'dark';
export type PageLayout = 'page' | 'full';

interface SettingsState {
  theme: ThemeMode;
  pageLayout: PageLayout;
  fontSize: number;
  fontFamily: string;
  compact: boolean;
  showTimestamps: boolean;
  showPlatform: boolean;
  showBadges: boolean;
  showUsername: boolean;
  showSubs: boolean;
  showGiftSubs: boolean;
  showPrime: boolean;
  showBits: boolean;
  showRaids: boolean;
  maxMessages: number;
}

interface SettingsStore extends SettingsState {
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  setPageLayout: (layout: PageLayout) => void;
  setFontSize: (size: number) => void;
  setFontFamily: (font: string) => void;
  toggleCompact: () => void;
  toggleTimestamps: () => void;
  togglePlatform: () => void;
  toggleBadges: () => void;
  toggleUsername: () => void;
  toggleSubs: () => void;
  toggleGiftSubs: () => void;
  togglePrime: () => void;
  toggleBits: () => void;
  toggleRaids: () => void;
  setMaxMessages: (n: number) => void;
  loadFromServer: () => Promise<void>;
}

// Settings keys that get synced to server
const SETTINGS_KEYS: (keyof SettingsState)[] = [
  'theme', 'pageLayout', 'fontSize', 'fontFamily', 'compact',
  'showTimestamps', 'showPlatform', 'showBadges', 'showUsername',
  'showSubs', 'showGiftSubs', 'showPrime', 'showBits', 'showRaids',
  'maxMessages',
];

let syncTimer: ReturnType<typeof setTimeout> | null = null;

function debouncedSyncToServer() {
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(async () => {
    try {
      const state = useSettingsStore.getState();
      const payload: Record<string, unknown> = {};
      for (const key of SETTINGS_KEYS) {
        payload[key] = state[key];
      }
      await fetch('/api/user/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch {
      // Silently fail — local state is the source of truth
    }
  }, 1000);
}

function setAndSync(partial: Partial<SettingsState>) {
  useSettingsStore.setState(partial);
  debouncedSyncToServer();
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      ...DEFAULT_SETTINGS,

      setTheme: (theme) => setAndSync({ theme }),
      toggleTheme: () => setAndSync({ theme: get().theme === 'light' ? 'dark' : 'light' }),
      setPageLayout: (pageLayout) => setAndSync({ pageLayout }),
      setFontSize: (fontSize) => setAndSync({ fontSize }),
      setFontFamily: (fontFamily) => setAndSync({ fontFamily }),
      toggleCompact: () => setAndSync({ compact: !get().compact }),
      toggleTimestamps: () => setAndSync({ showTimestamps: !get().showTimestamps }),
      togglePlatform: () => setAndSync({ showPlatform: !get().showPlatform }),
      toggleBadges: () => setAndSync({ showBadges: !get().showBadges }),
      toggleUsername: () => setAndSync({ showUsername: !get().showUsername }),
      toggleSubs: () => setAndSync({ showSubs: !get().showSubs }),
      toggleGiftSubs: () => setAndSync({ showGiftSubs: !get().showGiftSubs }),
      togglePrime: () => setAndSync({ showPrime: !get().showPrime }),
      toggleBits: () => setAndSync({ showBits: !get().showBits }),
      toggleRaids: () => setAndSync({ showRaids: !get().showRaids }),
      setMaxMessages: (maxMessages) => setAndSync({ maxMessages }),

      loadFromServer: async () => {
        try {
          const res = await fetch('/api/user/settings');
          if (!res.ok) return;
          const data = await res.json();
          const merged: Partial<SettingsState> = {};
          for (const key of SETTINGS_KEYS) {
            if (key in data && data[key] !== undefined && data[key] !== null) {
              (merged as Record<string, unknown>)[key] = data[key];
            }
          }
          set(merged);
        } catch {
          // Silently fail — use local settings
        }
      },
    }),
    { name: 'chatstream-settings' }
  )
);
