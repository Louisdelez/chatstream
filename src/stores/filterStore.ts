import { create } from 'zustand';
import { UserRole } from '@/types';

interface FilterStore {
  roles: UserRole[] | 'all';
  keyword: string;
  setRoles: (roles: UserRole[] | 'all') => void;
  setKeyword: (keyword: string) => void;
  reset: () => void;
}

export const useFilterStore = create<FilterStore>((set) => ({
  roles: 'all',
  keyword: '',
  setRoles: (roles) => set({ roles }),
  setKeyword: (keyword) => set({ keyword }),
  reset: () => set({ roles: 'all', keyword: '' }),
}));
