'use client';

import { ReactNode } from 'react';
import { useSettingsStore } from '@/stores/settingsStore';
import { ChevronDown } from 'lucide-react';
import { WordCounterChart } from './WordCounterChart';
import type { TrackedWord, TimePoint, ChartType } from './WordCounter';

interface Props {
  children: ReactNode;
  containerRef: React.RefObject<HTMLDivElement | null>;
  isAtBottom: boolean;
  scrollToBottom: () => void;
  messageCount: number;
  channel: string;
  streamTitle?: string;
  showChart?: boolean;
  trackedWords?: TrackedWord[];
  timeline?: TimePoint[];
  chartType?: ChartType;
}

export function ChatDocument({
  children,
  containerRef,
  isAtBottom,
  scrollToBottom,
  messageCount,
  channel,
  streamTitle,
  showChart,
  trackedWords,
  timeline,
  chartType,
}: Props) {
  const fontSize = useSettingsStore((s) => s.fontSize);
  const fontFamily = useSettingsStore((s) => s.fontFamily);
  const pageLayout = useSettingsStore((s) => s.pageLayout);

  const isFullPage = pageLayout === 'full';

  return (
    <div className={`flex-1 flex overflow-hidden min-h-0 ${isFullPage ? '' : 'justify-center pt-2 sm:pt-4 px-0 sm:px-4'}`}>
      <div className={`relative w-full flex flex-col min-h-0 ${isFullPage ? '' : 'sm:max-w-[900px]'}`}>
        {/* Document header */}
        <div
          className={`shrink-0 border-b px-3 sm:px-6 lg:px-10 py-3 sm:py-4 ${isFullPage ? '' : 'shadow-sm sm:rounded-t-lg border sm:border-b-0'}`}
          style={{ background: 'var(--bg-document)', borderColor: 'var(--border)' }}
        >
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-secondary)' }}>
            Chat — {channel}
          </h2>
          {streamTitle && (
            <p className="text-sm mt-1 truncate" style={{ color: 'var(--text-muted)' }}>
              {streamTitle}
            </p>
          )}
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            {new Date().toLocaleDateString('fr-FR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            }).replace(/^\w/, (c) => c.toUpperCase())}
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-faint)' }}>
            {messageCount} message{messageCount !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Chart (between header and messages) */}
        {showChart && trackedWords && trackedWords.length > 0 && (
          <div
            className="shrink-0 px-3 sm:px-6 lg:px-10 py-3"
            style={{ background: 'var(--bg-document)', borderBottom: '1px solid var(--border)' }}
          >
            <WordCounterChart words={trackedWords} timeline={timeline || []} chartType={chartType || 'bar'} />
          </div>
        )}

        {/* Document body (scrollable, takes remaining space) */}
        <div
          ref={containerRef}
          id="chat-document"
          className={`chat-document flex-1 overflow-y-auto px-3 sm:px-6 lg:px-10 py-3 sm:py-4 min-h-0 ${isFullPage ? '' : 'sm:border'}`}
          style={{
            fontSize: `${fontSize}px`,
            fontFamily: `'${fontFamily}', sans-serif`,
            background: 'var(--bg-document)',
            borderColor: 'var(--border)',
            boxShadow: isFullPage ? 'none' : 'var(--shadow-doc)',
            color: 'var(--text-primary)',
          }}
        >
          {children}
        </div>

        {/* Scroll to bottom button */}
        {!isAtBottom && (
          <button
            onClick={scrollToBottom}
            className="absolute bottom-4 right-4 w-10 h-10 rounded-full bg-purple-600 text-white shadow-lg flex items-center justify-center hover:bg-purple-700 transition"
            title="Aller en bas"
          >
            <ChevronDown className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
}
