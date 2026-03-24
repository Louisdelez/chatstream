import { UserRole } from '@/types';

export const ROLE_LABELS: Record<UserRole, string> = {
  broadcaster: 'Streamer',
  moderator: 'Modérateur',
  vip: 'VIP',
  subscriber: 'Abonné',
  viewer: 'Viewer',
};

export const ROLE_COLORS: Record<UserRole, string> = {
  broadcaster: '#e91916',
  moderator: '#00ad03',
  vip: '#e005b9',
  subscriber: '#a35bf0',
  viewer: '#9ca3af',
};

// Badge icons are now rendered via Lucide in RoleBadge component

export const DEFAULT_SETTINGS = {
  theme: 'light' as const,
  pageLayout: 'page' as const,
  fontSize: 15,
  compact: false,
  showTimestamps: true,
  showPlatform: true,
  showBadges: true,
  showUsername: true,
  showSubs: true,
  showGiftSubs: true,
  showPrime: true,
  showBits: true,
  showRaids: true,
  fontFamily: 'Inter',
  maxMessages: 20000,
};

export const TWITCH_COLORS = [
  '#FF0000', '#0000FF', '#008000', '#B22222', '#FF7F50',
  '#9ACD32', '#FF4500', '#2E8B57', '#DAA520', '#D2691E',
  '#5F9EA0', '#1E90FF', '#FF69B4', '#8A2BE2', '#00FF7F',
];
