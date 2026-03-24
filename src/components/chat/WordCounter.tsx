'use client';

import { useState, useEffect, useRef } from 'react';
import { Hash, Play, Square, Clock, X, Plus, Trash2, BarChart3 } from 'lucide-react';
import { useChatStore } from '@/stores/chatStore';

export interface TrackedWord {
  id: string;
  word: string;
  count: number;
}

export interface TimePoint {
  time: string;
  timestamp: number;
  [word: string]: number | string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onWordsChange: (words: TrackedWord[]) => void;
  onTimelineChange: (timeline: TimePoint[]) => void;
  onShowChartChange: (show: boolean) => void;
  showChart: boolean;
  onChartTypeChange: (type: ChartType) => void;
}

export function WordCounter({ isOpen, onClose, onWordsChange, onTimelineChange, onShowChartChange, showChart, onChartTypeChange }: Props) {
  const [words, setWords] = useState<TrackedWord[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [useTimer, setUseTimer] = useState(false);
  const [timerMinutes, setTimerMinutes] = useState(5);
  const [timeLeft, setTimeLeft] = useState(0);
  const [chartType, setChartTypeLocal] = useState<'bar' | 'pie' | 'line' | 'area'>('bar');
  const setChartType = (t: ChartType) => { setChartTypeLocal(t); onChartTypeChange(t); };
  const startTimestampRef = useRef<number>(0);
  const lastMessageCountRef = useRef<number>(0);
  const timelineRef = useRef<TimePoint[]>([]);

  const messages = useChatStore((s) => s.messages);

  // Sync words to parent
  useEffect(() => { onWordsChange(words); }, [words, onWordsChange]);

  const addWord = () => {
    const w = inputValue.trim().toLowerCase();
    if (!w || words.some((t) => t.word === w)) return;
    setWords((prev) => [...prev, { id: crypto.randomUUID(), word: w, count: 0 }]);
    setInputValue('');
  };

  const removeWord = (id: string) => {
    setWords((prev) => prev.filter((w) => w.id !== id));
  };

  const clearAll = () => {
    setWords([]);
    setIsRunning(false);
    setTimeLeft(0);
    timelineRef.current = [];
    onTimelineChange([]);
  };

  const handleStart = () => {
    if (words.length === 0) return;
    setWords((prev) => prev.map((w) => ({ ...w, count: 0 })));
    startTimestampRef.current = Date.now();
    lastMessageCountRef.current = messages.length;
    timelineRef.current = [];
    onTimelineChange([]);
    setIsRunning(true);
    if (useTimer) setTimeLeft(timerMinutes * 60);
  };

  const handleStop = () => {
    setIsRunning(false);
    setTimeLeft(0);
  };

  // Count words in new messages
  useEffect(() => {
    if (!isRunning || words.length === 0) return;

    const newMessages = messages.slice(lastMessageCountRef.current);
    lastMessageCountRef.current = messages.length;
    if (newMessages.length === 0) return;

    setWords((prev) => {
      const updated = prev.map((tracked) => {
        let addedCount = 0;
        const searchWord = tracked.word.toLowerCase();
        for (const msg of newMessages) {
          if (msg.timestamp < startTimestampRef.current) continue;
          const text = msg.message.toLowerCase();
          let idx = 0;
          while ((idx = text.indexOf(searchWord, idx)) !== -1) {
            addedCount++;
            idx += searchWord.length;
          }
        }
        return addedCount > 0 ? { ...tracked, count: tracked.count + addedCount } : tracked;
      });
      return updated;
    });
  }, [messages, isRunning, words]);

  // Record timeline every 5 seconds when running
  useEffect(() => {
    if (!isRunning || words.length === 0) return;

    const interval = setInterval(() => {
      const now = new Date();
      const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
      const point: TimePoint = { time, timestamp: Date.now() };
      for (const w of words) {
        point[w.word] = w.count;
      }
      timelineRef.current = [...timelineRef.current, point];
      onTimelineChange(timelineRef.current);
    }, 5000);

    return () => clearInterval(interval);
  }, [isRunning, words, onTimelineChange]);

  // Timer countdown
  useEffect(() => {
    if (!isRunning || !useTimer || timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) { setIsRunning(false); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isRunning, useTimer, timeLeft]);

  const formatTimeLeft = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  const totalCount = words.reduce((sum, w) => sum + w.count, 0);

  return (
    <>
      <div className="fixed inset-0 z-10" onClick={onClose} />
      <div className="tb-dropdown absolute right-0 top-full mt-1 z-20 rounded-lg shadow-lg border py-3 px-4" style={{ width: '340px' }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Hash className="w-4 h-4 text-purple-500" />
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Compteur de mots</span>
          </div>
          <div className="flex items-center gap-1">
            {words.length > 0 && (
              <>
                <button
                  onClick={() => onShowChartChange(!showChart)}
                  className={`p-1 rounded transition ${showChart ? 'text-purple-500' : ''}`}
                  style={!showChart ? { color: 'var(--text-faint)' } : {}}
                  title="Afficher le graphique"
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                </button>
                <button onClick={clearAll} className="p-1 rounded transition" style={{ color: 'var(--text-faint)' }} title="Tout effacer">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Chart type selector */}
        {showChart && words.length > 0 && (
          <div className="flex items-center gap-1 mb-3">
            {([
              { key: 'bar', label: 'Barres' },
              { key: 'pie', label: 'Camembert' },
              { key: 'line', label: 'Courbe' },
              { key: 'area', label: 'Aire' },
            ] as const).map((t) => (
              <button
                key={t.key}
                onClick={() => setChartType(t.key)}
                className={`px-2 py-1 text-[10px] rounded-lg border transition ${chartType === t.key ? 'tb-active' : 'tb-btn'}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}

        {/* Add word input */}
        <div className="flex gap-1.5 mb-3">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addWord()}
            placeholder="Mot, lettre ou chiffre..."
            className="tb-input flex-1 h-7 px-2 text-xs rounded-lg border focus:outline-none focus:ring-1 focus:ring-purple-400"
            disabled={isRunning}
          />
          <button onClick={addWord} disabled={!inputValue.trim() || isRunning} className="tb-btn p-1.5 rounded-lg border transition" title="Ajouter">
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Tracked words */}
        {words.length > 0 && (
          <div className="space-y-1.5 mb-3">
            {words.map((w, i) => (
              <div key={w.id} className="flex items-center justify-between py-1 px-2 rounded" style={{ background: 'var(--bg-input)' }}>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                  <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{w.word}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-purple-500">{w.count}</span>
                  {!isRunning && (
                    <button onClick={() => removeWord(w.id)} className="p-0.5 rounded" style={{ color: 'var(--text-faint)' }}>
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            ))}
            {words.length > 1 && (
              <div className="flex items-center justify-between py-1 px-2">
                <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Total</span>
                <span className="text-sm font-bold text-purple-500">{totalCount}</span>
              </div>
            )}
          </div>
        )}

        {/* Timer option */}
        {!isRunning && words.length > 0 && (
          <div className="flex items-center gap-2 mb-3">
            <button onClick={() => setUseTimer(!useTimer)} className={`flex items-center gap-1.5 px-2 py-1 text-xs rounded-lg border transition ${useTimer ? 'tb-active' : 'tb-btn'}`}>
              <Clock className="w-3 h-3" />
              Minuteur
            </button>
            {useTimer && (
              <select value={timerMinutes} onChange={(e) => setTimerMinutes(Number(e.target.value))} className="tb-input h-6 px-1 text-xs rounded border focus:outline-none">
                {[1, 2, 3, 5, 10, 15, 30, 60].map((m) => (
                  <option key={m} value={m}>{m} min</option>
                ))}
              </select>
            )}
          </div>
        )}

        {/* Timer display */}
        {isRunning && useTimer && timeLeft > 0 && (
          <div className="text-center mb-3">
            <span className="text-lg font-bold font-mono" style={{ color: timeLeft <= 10 ? '#ef4444' : 'var(--text-primary)' }}>
              {formatTimeLeft(timeLeft)}
            </span>
          </div>
        )}

        {/* Start/Stop */}
        {words.length > 0 && (
          <button
            onClick={isRunning ? handleStop : handleStart}
            className={`w-full flex items-center justify-center gap-2 h-8 rounded-lg text-xs font-semibold transition ${
              isRunning ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-purple-600 hover:bg-purple-700 text-white'
            }`}
          >
            {isRunning ? <><Square className="w-3.5 h-3.5" /> Stop</> : <><Play className="w-3.5 h-3.5" /> Start</>}
          </button>
        )}

        {words.length === 0 && (
          <p className="text-xs text-center py-2" style={{ color: 'var(--text-faint)' }}>Ajoutez des mots a compter dans le chat</p>
        )}
      </div>
    </>
  );
}

export const CHART_COLORS = ['#9333ea', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#8b5cf6'];
export type ChartType = 'bar' | 'pie' | 'line' | 'area';
