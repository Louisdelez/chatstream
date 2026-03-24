import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { ChatMessage, ChatSession } from '@/types';

interface ChatStreamDB extends DBSchema {
  messages: {
    key: string;
    value: ChatMessage;
    indexes: {
      'by-channel': string;
      'by-timestamp': number;
      'by-session': string;
    };
  };
  sessions: {
    key: string;
    value: ChatSession;
    indexes: {
      'by-channel': string;
    };
  };
}

const DB_NAME = 'chatstream';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<ChatStreamDB>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<ChatStreamDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const msgStore = db.createObjectStore('messages', { keyPath: 'id' });
        msgStore.createIndex('by-channel', 'channel');
        msgStore.createIndex('by-timestamp', 'timestamp');
        msgStore.createIndex('by-session', 'sessionId');

        const sessStore = db.createObjectStore('sessions', { keyPath: 'id' });
        sessStore.createIndex('by-channel', 'channel');
      },
    });
  }
  return dbPromise;
}

// ── Helpers date ──

function getDayStart(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function getDayEnd(date: Date): number {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

export function formatDayKey(timestamp: number): string {
  const d = new Date(timestamp);
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    .replace(/^\w/, (c) => c.toUpperCase());
}

export function formatDayKeyShort(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// ── Messages CRUD ──

export async function saveMessages(msgs: ChatMessage[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('messages', 'readwrite');
  await Promise.all([...msgs.map((m) => tx.store.put(m)), tx.done]);
}

export async function getChannelMessages(channel: string): Promise<ChatMessage[]> {
  const db = await getDB();
  const messages = await db.getAllFromIndex('messages', 'by-channel', channel);
  return messages.sort((a, b) => a.timestamp - b.timestamp);
}

/** Get messages for a channel on a specific day */
export async function getChannelMessagesForDay(channel: string, date: Date): Promise<ChatMessage[]> {
  const start = getDayStart(date);
  const end = getDayEnd(date);
  const db = await getDB();
  const all = await db.getAllFromIndex('messages', 'by-channel', channel);
  return all
    .filter((m) => m.timestamp >= start && m.timestamp <= end)
    .sort((a, b) => a.timestamp - b.timestamp);
}

/** Get messages for today */
export async function getTodayMessages(channel: string): Promise<ChatMessage[]> {
  return getChannelMessagesForDay(channel, new Date());
}

export interface ArchiveChunk {
  index: number;
  from: number; // timestamp first msg
  to: number;   // timestamp last msg
  count: number;
  label: string; // e.g. "1 — 1000"
}

export interface ArchiveDay {
  date: Date;
  count: number;
  label: string;
  chunks: ArchiveChunk[];
}

const CHUNK_SIZE = 1000;

/** Get all days with chunks of 1000 messages for a channel */
export async function getArchivedDays(channel: string): Promise<ArchiveDay[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex('messages', 'by-channel', channel);
  all.sort((a, b) => a.timestamp - b.timestamp);

  const dayMap = new Map<string, { date: Date; messages: ChatMessage[] }>();

  for (const msg of all) {
    const d = new Date(msg.timestamp);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (!dayMap.has(key)) {
      const dayDate = new Date(d);
      dayDate.setHours(0, 0, 0, 0);
      dayMap.set(key, { date: dayDate, messages: [] });
    }
    dayMap.get(key)!.messages.push(msg);
  }

  return Array.from(dayMap.values())
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .map((day) => {
      const chunks: ArchiveChunk[] = [];
      for (let i = 0; i < day.messages.length; i += CHUNK_SIZE) {
        const slice = day.messages.slice(i, i + CHUNK_SIZE);
        const chunkIndex = Math.floor(i / CHUNK_SIZE);
        const from = i + 1;
        const to = Math.min(i + CHUNK_SIZE, day.messages.length);
        chunks.push({
          index: chunkIndex,
          from: slice[0].timestamp,
          to: slice[slice.length - 1].timestamp,
          count: slice.length,
          label: `${from} — ${to}`,
        });
      }
      return {
        date: day.date,
        count: day.messages.length,
        label: formatDayKey(day.date.getTime()),
        chunks,
      };
    });
}

/** Get messages for a specific chunk of a day */
export async function getChunkMessages(channel: string, date: Date, chunkIndex: number): Promise<ChatMessage[]> {
  const start = getDayStart(date);
  const end = getDayEnd(date);
  const db = await getDB();
  const all = await db.getAllFromIndex('messages', 'by-channel', channel);
  const dayMessages = all
    .filter((m) => m.timestamp >= start && m.timestamp <= end)
    .sort((a, b) => a.timestamp - b.timestamp);

  const from = chunkIndex * CHUNK_SIZE;
  return dayMessages.slice(from, from + CHUNK_SIZE);
}

/** Delete messages older than X days */
export async function cleanupOldMessages(channel: string, keepDays: number): Promise<number> {
  const cutoff = getDayStart(new Date()) - keepDays * 24 * 60 * 60 * 1000;
  const db = await getDB();
  const all = await db.getAllFromIndex('messages', 'by-channel', channel);
  const toDelete = all.filter((m) => m.timestamp < cutoff);

  if (toDelete.length > 0) {
    const tx = db.transaction('messages', 'readwrite');
    await Promise.all(toDelete.map((m) => tx.store.delete(m.id)));
    await tx.done;
  }

  return toDelete.length;
}

// ── Sessions ──

export async function createSession(channel: string): Promise<ChatSession> {
  const db = await getDB();
  const session: ChatSession = {
    id: crypto.randomUUID(),
    channel,
    startedAt: Date.now(),
    messageCount: 0,
  };
  await db.put('sessions', session);
  return session;
}

export async function endSession(sessionId: string): Promise<void> {
  const db = await getDB();
  const session = await db.get('sessions', sessionId);
  if (session) {
    const messages = await db.getAllFromIndex('messages', 'by-session', sessionId);
    session.endedAt = Date.now();
    session.messageCount = messages.length;
    await db.put('sessions', session);
  }
}

export async function getSessionMessages(sessionId: string): Promise<ChatMessage[]> {
  const db = await getDB();
  const messages = await db.getAllFromIndex('messages', 'by-session', sessionId);
  return messages.sort((a, b) => a.timestamp - b.timestamp);
}

export async function listSessions(): Promise<ChatSession[]> {
  const db = await getDB();
  const sessions = await db.getAll('sessions');
  return sessions.sort((a, b) => b.startedAt - a.startedAt);
}

export async function deleteSession(sessionId: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(['sessions', 'messages'], 'readwrite');
  await tx.objectStore('sessions').delete(sessionId);
  const msgStore = tx.objectStore('messages');
  const messages = await msgStore.index('by-session').getAllKeys(sessionId);
  await Promise.all(messages.map((key) => msgStore.delete(key)));
  await tx.done;
}
