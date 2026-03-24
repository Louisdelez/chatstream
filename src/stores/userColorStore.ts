import { create } from 'zustand';

interface UserColorStore {
  colors: Record<string, string>; // username lowercase -> color
  setColor: (username: string, color: string) => void;
  getColor: (username: string) => string | null;
}

export const useUserColorStore = create<UserColorStore>((set, get) => ({
  colors: {},
  setColor: (username, color) =>
    set((s) => ({
      colors: { ...s.colors, [username.toLowerCase()]: color },
    })),
  getColor: (username) => get().colors[username.toLowerCase()] ?? null,
}));
