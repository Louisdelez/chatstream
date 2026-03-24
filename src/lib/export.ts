import { ChatMessage } from '@/types';
import { formatTime, formatDate } from '@/lib/formatters';

export async function exportToPDF(elementId: string, channel: string): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) return;

  const html2pdf = (await import('html2pdf.js')).default;

  const opt = {
    margin: [0.5, 0.75, 0.5, 0.75] as [number, number, number, number],
    filename: `chatstream-${channel}-${formatDate(Date.now()).replace(/\//g, '-')}.pdf`,
    image: { type: 'jpeg' as const, quality: 0.95 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' as const },
    pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
  };

  await html2pdf().set(opt).from(element).save();
}

export function exportToText(messages: ChatMessage[], channel: string): void {
  const header = `Chat Twitch — #${channel}\nExporté le ${formatDate(Date.now())}\n${'─'.repeat(50)}\n\n`;
  const content = messages
    .map(
      (m) =>
        `[${formatTime(m.timestamp)}] ${m.displayName}: ${m.message}`
    )
    .join('\n');

  downloadFile(header + content, `chatstream-${channel}.txt`, 'text/plain');
}

export function exportToJSON(messages: ChatMessage[], channel: string): void {
  const data = {
    channel,
    exportedAt: new Date().toISOString(),
    messageCount: messages.length,
    messages: messages.map((m) => ({
      timestamp: new Date(m.timestamp).toISOString(),
      username: m.username,
      displayName: m.displayName,
      roles: m.roles,
      message: m.message,
      isAction: m.isAction,
    })),
  };

  downloadFile(
    JSON.stringify(data, null, 2),
    `chatstream-${channel}.json`,
    'application/json'
  );
}

function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
