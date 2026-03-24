'use client';

import {
  Tv,
  Sword,
  Gem,
  Star,
  Crown,
  Zap,
  User,
} from 'lucide-react';
import { ROLE_COLORS } from '@/lib/constants';

const BADGE_CONFIG: Record<string, { icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; color: string }> = {
  broadcaster: { icon: Tv, color: ROLE_COLORS.broadcaster },
  moderator: { icon: Sword, color: ROLE_COLORS.moderator },
  vip: { icon: Gem, color: ROLE_COLORS.vip },
  subscriber: { icon: Star, color: ROLE_COLORS.subscriber },
  premium: { icon: Crown, color: '#FFD700' },
  turbo: { icon: Zap, color: '#9146FF' },
};

interface Props {
  badge: string;
  size?: number;
}

export function RoleBadge({ badge, size = 14 }: Props) {
  const config = BADGE_CONFIG[badge];
  if (!config) return null;

  const Icon = config.icon;
  return (
    <Icon
      className="shrink-0"
      style={{ width: size, height: size, color: config.color }}
    />
  );
}

export function ViewerBadge({ size = 14 }: { size?: number }) {
  return (
    <User
      className="shrink-0"
      style={{ width: size, height: size, color: '#9ca3af' }}
    />
  );
}

export function hasBadgeIcon(badge: string): boolean {
  return badge in BADGE_CONFIG;
}
