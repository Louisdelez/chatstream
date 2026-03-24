import tmi from 'tmi.js';
import { ChatMessage, UserRole } from '@/types';

export function createTwitchClient(
  channel: string,
  auth?: { username: string; token: string }
): tmi.Client {
  const opts: tmi.Options = {
    options: { debug: false },
    connection: {
      secure: true,
      reconnect: true,
    },
    channels: [channel],
  };

  if (auth) {
    opts.identity = {
      username: auth.username,
      password: `oauth:${auth.token}`,
    };
  }

  return new tmi.Client(opts);
}

export function parseRoles(badges: Record<string, string> | undefined): UserRole[] {
  const roles: UserRole[] = [];
  if (!badges) return ['viewer'];
  if ('broadcaster' in badges) roles.push('broadcaster');
  if ('moderator' in badges) roles.push('moderator');
  if ('vip' in badges) roles.push('vip');
  if ('subscriber' in badges) roles.push('subscriber');
  if (roles.length === 0) roles.push('viewer');
  return roles;
}

export function tagsToMessage(
  channel: string,
  tags: tmi.ChatUserstate,
  text: string,
  isAction: boolean
): ChatMessage {
  return {
    id: tags.id ?? crypto.randomUUID(),
    timestamp: parseInt(tags['tmi-sent-ts'] ?? String(Date.now()), 10),
    channel: channel.replace('#', ''),
    username: tags.username ?? 'unknown',
    displayName: tags['display-name'] ?? tags.username ?? 'unknown',
    color: tags.color ?? null,
    message: text,
    roles: parseRoles(tags.badges as Record<string, string> | undefined),
    badges: (tags.badges as Record<string, string>) ?? {},
    emotes: tags.emotes ?? null,
    isAction,
  };
}

/**
 * Fetch recent chat messages from a channel using the recent-messages API.
 * This gives us messages that were sent before we connected.
 */
export async function fetchRecentMessages(channel: string): Promise<ChatMessage[]> {
  try {
    const res = await fetch(
      `https://recent-messages.robotty.de/api/v2/recent-messages/${encodeURIComponent(channel)}?limit=500`
    );
    if (!res.ok) return [];

    const data = await res.json();
    if (!data.messages || !Array.isArray(data.messages)) return [];

    const messages: ChatMessage[] = [];

    for (const raw of data.messages) {
      const parsed = parseIRCMessage(raw, channel);
      if (parsed) messages.push(parsed);
    }

    return messages;
  } catch {
    return [];
  }
}

/**
 * Parse a raw IRC message string into a ChatMessage.
 * Format: @tag1=val1;tag2=val2 :user!user@user.tmi.twitch.tv PRIVMSG #channel :message
 */
function parseIRCMessage(raw: string, channel: string): ChatMessage | null {
  try {
    // Must be a PRIVMSG
    if (!raw.includes('PRIVMSG')) return null;

    // Parse tags
    const tags: Record<string, string> = {};
    let rest = raw;

    if (raw.startsWith('@')) {
      const tagEnd = raw.indexOf(' ');
      const tagStr = raw.substring(1, tagEnd);
      rest = raw.substring(tagEnd + 1);

      for (const pair of tagStr.split(';')) {
        const eq = pair.indexOf('=');
        if (eq !== -1) {
          tags[pair.substring(0, eq)] = pair.substring(eq + 1).replace(/\\s/g, ' ').replace(/\\\\/g, '\\');
        }
      }
    }

    // Parse message text (after PRIVMSG #channel :)
    const msgMatch = rest.match(/PRIVMSG\s+#\S+\s+:(.*)$/);
    if (!msgMatch) return null;
    const message = msgMatch[1];

    // Check for /me action
    const isAction = message.startsWith('\x01ACTION ') && message.endsWith('\x01');
    const cleanMessage = isAction
      ? message.slice(8, -1)
      : message;

    // Parse badges
    const badges: Record<string, string> = {};
    if (tags['badges']) {
      for (const badge of tags['badges'].split(',')) {
        const [name, version] = badge.split('/');
        if (name) badges[name] = version ?? '1';
      }
    }

    // Parse emotes
    let emotes: Record<string, string[]> | null = null;
    if (tags['emotes']) {
      emotes = {};
      for (const emote of tags['emotes'].split('/')) {
        const [id, positions] = emote.split(':');
        if (id && positions) {
          emotes[id] = positions.split(',');
        }
      }
    }

    const timestamp = tags['tmi-sent-ts']
      ? parseInt(tags['tmi-sent-ts'], 10)
      : Date.now();

    return {
      id: tags['id'] ?? crypto.randomUUID(),
      timestamp,
      channel: channel.replace('#', ''),
      username: tags['login'] ?? tags['display-name']?.toLowerCase() ?? 'unknown',
      displayName: tags['display-name'] ?? 'unknown',
      color: tags['color'] || null,
      message: cleanMessage,
      roles: parseRoles(Object.keys(badges).length > 0 ? badges : undefined),
      badges,
      emotes,
      isAction,
    };
  } catch {
    return null;
  }
}
