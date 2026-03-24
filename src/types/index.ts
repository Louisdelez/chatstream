export type UserRole = 'broadcaster' | 'moderator' | 'vip' | 'subscriber' | 'viewer';

export type EventType = 'sub' | 'resub' | 'giftsub' | 'prime' | 'bits' | 'raid';

export interface ChatMessage {
  id: string;
  timestamp: number;
  channel: string;
  username: string;
  displayName: string;
  color: string | null;
  message: string;
  roles: UserRole[];
  badges: Record<string, string>;
  emotes: Record<string, string[]> | null;
  isAction: boolean;
  sessionId?: string;
  // Event data
  eventType?: EventType;
  eventData?: {
    months?: number;
    giftCount?: number;
    bits?: number;
    viewers?: number;
    plan?: string;
    recipientName?: string;
  };
}

export interface ChatSession {
  id: string;
  channel: string;
  startedAt: number;
  endedAt?: number;
  messageCount: number;
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';
