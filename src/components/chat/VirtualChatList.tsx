'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ChatMessage } from '@/types';
import { ChatMessageRow } from './ChatMessage';

interface Props {
  messages: ChatMessage[];
  containerRef: React.RefObject<HTMLDivElement | null>;
  onAtBottomChange?: (atBottom: boolean) => void;
}

export function VirtualChatList({ messages, containerRef, onAtBottomChange }: Props) {
  const [isAtBottom, setIsAtBottom] = useState(true);
  const prevCountRef = useRef(messages.length);

  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => 36, // estimated row height
    overscan: 30, // render 30 extra rows above/below viewport
  });

  // Auto-scroll to bottom when new messages arrive and user is at bottom
  useEffect(() => {
    if (messages.length > prevCountRef.current && isAtBottom) {
      requestAnimationFrame(() => {
        virtualizer.scrollToIndex(messages.length - 1, { align: 'end' });
      });
    }
    prevCountRef.current = messages.length;
  }, [messages.length, isAtBottom, virtualizer]);

  // Track scroll position
  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const threshold = 100;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
    setIsAtBottom(atBottom);
    onAtBottomChange?.(atBottom);
  }, [containerRef, onAtBottomChange]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, [containerRef, handleScroll]);

  const items = virtualizer.getVirtualItems();

  return (
    <div
      style={{
        height: `${virtualizer.getTotalSize()}px`,
        width: '100%',
        position: 'relative',
      }}
    >
      {items.map((virtualItem) => {
        const msg = messages[virtualItem.index];
        return (
          <div
            key={msg.id}
            data-index={virtualItem.index}
            ref={virtualizer.measureElement}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            <ChatMessageRow message={msg} />
          </div>
        );
      })}
    </div>
  );
}
