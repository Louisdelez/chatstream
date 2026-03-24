import { getChannelMessages } from '@/lib/db';

const BATCH_SIZE = 1000;

export interface MigrateProgress {
  phase: 'reading' | 'uploading' | 'done' | 'error';
  current: number;
  total: number;
  message: string;
}

type ProgressCallback = (progress: MigrateProgress) => void;

function readLocalStore(key: string): Record<string, unknown> | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.state ?? parsed;
  } catch {
    return null;
  }
}

export function hasLocalData(): boolean {
  if (typeof window === 'undefined') return false;
  const pins = readLocalStore('chatstream-pins');
  const settings = readLocalStore('chatstream-settings');
  const mute = readLocalStore('chatstream-mute');
  return !!(pins || settings || mute);
}

export async function migrateLocalData(
  channels: string[],
  onProgress?: ProgressCallback,
): Promise<{ success: boolean; error?: string }> {
  try {
    const report = (p: Partial<MigrateProgress>) =>
      onProgress?.({
        phase: 'reading',
        current: 0,
        total: 0,
        message: '',
        ...p,
      });

    report({ phase: 'reading', message: 'Lecture des donnees locales...' });

    // 1. Read IndexedDB messages
    const allMessages: Record<string, unknown>[] = [];
    for (const channel of channels) {
      try {
        const msgs = await getChannelMessages(channel);
        for (const m of msgs) {
          allMessages.push({
            id: m.id,
            channel: m.channel,
            timestamp: new Date(m.timestamp).toISOString(),
            username: m.username,
            displayName: m.displayName,
            color: m.color,
            message: m.message,
            roles: m.roles,
            badges: m.badges,
            emotes: m.emotes,
            isAction: m.isAction,
            eventType: m.eventType ?? null,
            eventData: m.eventData ?? null,
            dayKey: new Date(m.timestamp).toISOString().slice(0, 10),
          });
        }
      } catch {
        // Skip this channel if IDB read fails
      }
    }

    // 2. Read localStorage stores
    const pinsStore = readLocalStore('chatstream-pins');
    const settingsStore = readLocalStore('chatstream-settings');
    const muteStore = readLocalStore('chatstream-mute');

    const formats = (pinsStore?.formats as Record<string, unknown>[]) ?? [];
    const pins = (pinsStore?.pins as Record<string, unknown>[]) ?? [];
    const mutedUsers = (muteStore?.mutedUsers as string[]) ?? [];

    // Build settings object (pick only relevant fields)
    let settings: Record<string, unknown> | undefined;
    if (settingsStore) {
      settings = {
        fontSize: settingsStore.fontSize,
        fontFamily: settingsStore.fontFamily,
        compact: settingsStore.compact,
        showTimestamps: settingsStore.showTimestamps,
        showPlatform: settingsStore.showPlatform,
        showBadges: settingsStore.showBadges,
        showUsername: settingsStore.showUsername,
        pageLayout: settingsStore.pageLayout,
        showSubs: settingsStore.showSubs,
        showGiftSubs: settingsStore.showGiftSubs,
        showPrime: settingsStore.showPrime,
        showBits: settingsStore.showBits,
        showRaids: settingsStore.showRaids,
      };
    }

    const totalMessages = allMessages.length;
    const totalBatches = Math.ceil(totalMessages / BATCH_SIZE) || 1;

    // 3. Upload in batches
    // First batch includes everything except messages (or the first batch of messages)
    for (let i = 0; i < totalBatches; i++) {
      const batchMessages = allMessages.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);

      report({
        phase: 'uploading',
        current: i + 1,
        total: totalBatches,
        message: `Envoi du lot ${i + 1}/${totalBatches} (${batchMessages.length} messages)...`,
      });

      const body: Record<string, unknown> = {
        messages: batchMessages,
      };

      // Include non-message data in the first batch
      if (i === 0) {
        body.formats = formats;
        body.pins = pins;
        body.settings = settings;
        body.mutedUsers = mutedUsers;
        body.channels = channels;
      }

      const res = await fetch('/api/migrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Erreur serveur (${res.status})`);
      }
    }

    report({
      phase: 'done',
      current: totalBatches,
      total: totalBatches,
      message: 'Migration terminee !',
    });

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue';
    onProgress?.({
      phase: 'error',
      current: 0,
      total: 0,
      message,
    });
    return { success: false, error: message };
  }
}
