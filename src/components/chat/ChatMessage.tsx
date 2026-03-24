'use client';

import React, { memo, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { ChatMessage as ChatMessageType } from '@/types';
import { useSettingsStore } from '@/stores/settingsStore';
import { usePinStore, TextFormat } from '@/stores/pinStore';
import { formatTime, hashColor } from '@/lib/formatters';
import { Gift, Star, Crown, Zap as BitsIcon, Users } from 'lucide-react';
import { RoleBadge, ViewerBadge, hasBadgeIcon } from '@/components/chat/RoleBadge';
import { PlatformIcon } from '@/components/chat/PlatformIcon';
import { useUserColorStore } from '@/stores/userColorStore';
import { EventType } from '@/types';

/** Check if a hex color is too close to white or black (hard to read) */
function isColorTooExtreme(color: string): boolean {
  if (!color || !color.startsWith('#')) return false;
  const hex = color.replace('#', '');
  if (hex.length < 6) return false;
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  // Perceived luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  // Too dark (< 0.15) or too bright (> 0.85)
  return luminance < 0.15 || luminance > 0.85;
}

const EVENT_CONFIG: Record<EventType, { icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; color: string; bg: string }> = {
  sub: { icon: Star, color: '#a35bf0', bg: 'rgba(163, 91, 240, 0.1)' },
  resub: { icon: Star, color: '#a35bf0', bg: 'rgba(163, 91, 240, 0.1)' },
  prime: { icon: Crown, color: '#1e90ff', bg: 'rgba(30, 144, 255, 0.1)' },
  giftsub: { icon: Gift, color: '#e005b9', bg: 'rgba(224, 5, 185, 0.1)' },
  bits: { icon: BitsIcon, color: '#ff8c00', bg: 'rgba(255, 140, 0, 0.1)' },
  raid: { icon: Users, color: '#e91916', bg: 'rgba(233, 25, 22, 0.1)' },
};

interface Props {
  message: ChatMessageType;
}

// ── Emote parsing ──

interface EmotePosition {
  id: string;
  start: number;
  end: number; // inclusive end from Twitch, we'll convert to exclusive
}

function getEmoteUrl(emoteId: string, size: '1.0' | '2.0' | '3.0' = '2.0'): string {
  return `https://static-cdn.jtvnw.net/emoticons/v2/${emoteId}/default/dark/${size}`;
}

function parseEmotePositions(emotes: Record<string, string[]> | null): EmotePosition[] {
  if (!emotes) return [];
  const positions: EmotePosition[] = [];
  for (const [id, ranges] of Object.entries(emotes)) {
    for (const range of ranges) {
      const [startStr, endStr] = range.split('-');
      positions.push({
        id,
        start: parseInt(startStr, 10),
        end: parseInt(endStr, 10) + 1, // convert to exclusive
      });
    }
  }
  return positions.sort((a, b) => a.start - b.start);
}

/** Split message text into text segments and emote segments */
interface TextSegment { type: 'text'; text: string; start: number; end: number }
interface EmoteSegment { type: 'emote'; id: string; name: string; start: number; end: number }
type MessageSegment = TextSegment | EmoteSegment;

function splitMessageIntoSegments(text: string, emotes: Record<string, string[]> | null): MessageSegment[] {
  const positions = parseEmotePositions(emotes);
  if (positions.length === 0) {
    return [{ type: 'text', text, start: 0, end: text.length }];
  }

  const segments: MessageSegment[] = [];
  let lastEnd = 0;

  for (const pos of positions) {
    if (pos.start > lastEnd) {
      segments.push({ type: 'text', text: text.slice(lastEnd, pos.start), start: lastEnd, end: pos.start });
    }
    segments.push({ type: 'emote', id: pos.id, name: text.slice(pos.start, pos.end), start: pos.start, end: pos.end });
    lastEnd = pos.end;
  }

  if (lastEnd < text.length) {
    segments.push({ type: 'text', text: text.slice(lastEnd), start: lastEnd, end: text.length });
  }

  return segments;
}

// ── Formatting ──

interface StyledSpan {
  start: number;
  end: number;
  styles: Set<string>;
  highlightColor?: string;
}

function mergeFormats(start: number, end: number, formats: TextFormat[]): StyledSpan[] {
  const relevant = formats.filter((f) => f.start < end && f.end > start);
  if (relevant.length === 0) return [{ start, end, styles: new Set(), highlightColor: undefined }];

  const points = new Set<number>();
  points.add(start);
  points.add(end);
  for (const f of relevant) {
    points.add(Math.max(start, f.start));
    points.add(Math.min(end, f.end));
  }

  const sorted = Array.from(points).sort((a, b) => a - b);
  const spans: StyledSpan[] = [];

  for (let i = 0; i < sorted.length - 1; i++) {
    const s = sorted[i];
    const e = sorted[i + 1];
    if (s >= e) continue;

    const styles = new Set<string>();
    let highlightColor: string | undefined;

    for (const f of relevant) {
      if (f.start <= s && f.end >= e) {
        styles.add(f.style);
        if (f.style === 'highlight' && f.color) {
          highlightColor = f.color;
        }
      }
    }

    spans.push({ start: s, end: e, styles, highlightColor });
  }

  return spans;
}

function buildStyle(span: StyledSpan): { style: React.CSSProperties; className: string } | null {
  if (span.styles.size === 0 && !span.highlightColor) return null;

  const style: React.CSSProperties = {};
  const classNames: string[] = [];

  if (span.highlightColor) {
    style.backgroundColor = span.highlightColor;
    classNames.push('rounded-sm', 'px-0.5');
  }
  if (span.styles.has('bold')) style.fontWeight = 'bold';
  if (span.styles.has('italic')) style.fontStyle = 'italic';
  if (span.styles.has('underline') && span.styles.has('strikethrough')) {
    style.textDecoration = 'underline line-through';
  } else if (span.styles.has('underline')) {
    style.textDecoration = 'underline';
  } else if (span.styles.has('strikethrough')) {
    style.textDecoration = 'line-through';
  }

  return { style, className: classNames.join(' ') };
}

// ── Inline parsing (links + @mentions) ──

const INLINE_REGEX = /(https?:\/\/[^\s]+)|(@(\w+))/g;

interface InlinePart {
  type: 'text' | 'link' | 'mention';
  value: string;
  username?: string; // for mentions
}

function parseInlineElements(text: string): InlinePart[] {
  const parts: InlinePart[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(INLINE_REGEX)) {
    const index = match.index!;
    if (index > lastIndex) {
      parts.push({ type: 'text', value: text.slice(lastIndex, index) });
    }

    if (match[1]) {
      // URL
      parts.push({ type: 'link', value: match[1] });
    } else if (match[2]) {
      // @mention
      parts.push({ type: 'mention', value: match[2], username: match[3] });
    }

    lastIndex = index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push({ type: 'text', value: text.slice(lastIndex) });
  }

  return parts.length > 0 ? parts : [{ type: 'text', value: text }];
}

function renderInlineContent(
  text: string,
  key: string,
  getUserColor: (username: string) => string | null
): React.ReactNode[] {
  const parts = parseInlineElements(text);
  return parts.map((part, k) => {
    if (part.type === 'link') {
      return (
        <span key={`${key}-${k}`} className="block">
          <a
            href={part.value}
            target="_blank"
            rel="noopener noreferrer"
            className="text-purple-600 underline hover:text-purple-800 break-all"
          >
            {part.value}
          </a>
        </span>
      );
    }
    if (part.type === 'mention' && part.username) {
      const rawMentionColor = getUserColor(part.username) || hashColor(part.username);
      const mentionColor = isColorTooExtreme(rawMentionColor) ? hashColor(part.username) : rawMentionColor;
      return (
        <span
          key={`${key}-${k}`}
          className="font-bold cursor-default"
          style={{ color: mentionColor }}
          title={`@${part.username}`}
        >
          {part.username}
        </span>
      );
    }
    return <React.Fragment key={`${key}-${k}`}>{part.value}</React.Fragment>;
  });
}

// ── Render segments ──

function renderSegments(
  segments: MessageSegment[],
  formats: TextFormat[],
  isAction: boolean,
  userColor: string,
  fontSize: number,
  getUserColor: (username: string) => string | null
) {
  const emoteSize = Math.max(20, Math.round(fontSize * 1.5));

  const parts: React.ReactNode[] = [];

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];

    if (seg.type === 'emote') {
      const spans = mergeFormats(seg.start, seg.end, formats);
      const highlightColor = spans[0]?.highlightColor;

      const img = (
        <img
          key={`emote-${i}`}
          src={getEmoteUrl(seg.id)}
          alt={seg.name}
          title={seg.name}
          width={emoteSize}
          height={emoteSize}
          className="inline-block align-middle mx-0.5"
          loading="lazy"
        />
      );

      if (highlightColor) {
        parts.push(
          <span key={`emote-hl-${i}`} className="rounded-sm px-0.5" style={{ backgroundColor: highlightColor }}>
            {img}
          </span>
        );
      } else {
        parts.push(img);
      }
    } else {
      // Text segment — apply formatting + inline parsing
      const textSpans = mergeFormats(seg.start, seg.end, formats);

      for (let j = 0; j < textSpans.length; j++) {
        const span = textSpans[j];
        const content = seg.text.slice(span.start - seg.start, span.end - seg.start);
        const styling = buildStyle(span);
        const inlineContent = renderInlineContent(content, `${i}-${j}`, getUserColor);

        if (styling) {
          parts.push(
            <span key={`${i}-${j}`} style={styling.style} className={styling.className}>
              {inlineContent}
            </span>
          );
        } else {
          parts.push(<React.Fragment key={`${i}-${j}`}>{inlineContent}</React.Fragment>);
        }
      }
    }
  }

  if (isAction) return <em style={{ color: userColor }}>{parts}</em>;
  return <>{parts}</>;
}

// ── Component ──

function ChatMessageComponent({ message }: Props) {
  const compact = useSettingsStore((s) => s.compact);
  const showTimestamps = useSettingsStore((s) => s.showTimestamps);
  const showPlatform = useSettingsStore((s) => s.showPlatform);
  const showBadges = useSettingsStore((s) => s.showBadges);
  const showUsername = useSettingsStore((s) => s.showUsername);
  const fontSize = useSettingsStore((s) => s.fontSize);
  const formats = usePinStore(
    useShallow((s) => s.formats.filter((f) => f.messageId === message.id))
  );
  const getColor = useUserColorStore((s) => s.getColor);

  const segments = useMemo(
    () => splitMessageIntoSegments(message.message, message.emotes),
    [message.message, message.emotes]
  );

  const rawColor = message.color || hashColor(message.username);
  const userColor = isColorTooExtreme(rawColor) ? hashColor(message.username) : rawColor;
  const eventConfig = message.eventType ? EVENT_CONFIG[message.eventType] : null;

  return (
    <div
      id={`msg-${message.id}`}
      data-message-id={message.id}
      className={`grid rounded transition-colors items-start ${
        compact ? 'py-0.5 gap-x-2 sm:gap-x-3' : 'py-1 sm:py-1.5 gap-x-2 sm:gap-x-4'
      }`}
      onMouseEnter={(e) => e.currentTarget.style.background = eventConfig ? eventConfig.bg : 'var(--bg-hover)'}
      onMouseLeave={(e) => e.currentTarget.style.background = eventConfig ? eventConfig.bg : 'transparent'}
      style={{
        gridTemplateColumns: `${showTimestamps ? '50px' : ''} ${showPlatform ? '24px' : ''} ${showBadges ? '28px' : ''} ${showUsername ? '90px' : ''} 1fr`,
        background: eventConfig ? eventConfig.bg : undefined,
        borderRadius: '4px',
      }}
    >
      {/* Colonne 1 : Heure */}
      {showTimestamps && (
        <span className="text-xs font-mono tabular-nums leading-relaxed pt-px" style={{ color: 'var(--text-faint)' }}>
          {formatTime(message.timestamp)}
        </span>
      )}

      {/* Colonne 2 : Plateforme */}
      {showPlatform && (
        <span className="flex items-center justify-center leading-relaxed">
          <PlatformIcon platform="twitch" size={14} />
        </span>
      )}

      {/* Colonne 3 : Rôle ou icône événement */}
      {showBadges && (
        <span className="flex items-center justify-center leading-relaxed">
          {eventConfig ? (
            <eventConfig.icon className="shrink-0" style={{ width: 14, height: 14, color: eventConfig.color }} />
          ) : Object.keys(message.badges).some((b) => hasBadgeIcon(b))
            ? Object.keys(message.badges).map((badge) =>
                hasBadgeIcon(badge) ? (
                  <RoleBadge key={badge} badge={badge} size={14} />
                ) : null
              )
            : <ViewerBadge size={14} />
          }
        </span>
      )}

      {/* Colonne 4 : Pseudo */}
      {showUsername && (
        <span
          className="font-semibold truncate leading-relaxed"
          style={{ color: userColor }}
          title={message.displayName}
        >
          {message.displayName}
        </span>
      )}

      {/* Colonne 5 : Message (texte justifié avec emotes) */}
      <span
        className="leading-relaxed min-w-0"
        style={{ textAlign: 'justify', hyphens: 'auto', color: 'var(--text-secondary)' }}
        data-msg-text={message.id}
        data-msg-body={message.id}
      >
        {renderSegments(segments, formats, message.isAction, userColor, fontSize, getColor)}
      </span>
    </div>
  );
}

export const ChatMessageRow = memo(ChatMessageComponent);
