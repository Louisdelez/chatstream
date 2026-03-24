'use client';

import { useMemo } from 'react';
import {
  BarChart, Bar,
  PieChart, Pie, Cell,
  LineChart, Line,
  AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { TrackedWord, TimePoint, CHART_COLORS, ChartType } from './WordCounter';

interface Props {
  words: TrackedWord[];
  timeline: TimePoint[];
  chartType: ChartType;
}

export function WordCounterChart({ words, timeline, chartType }: Props) {
  if (words.length === 0) return null;

  // Data for bar and pie charts (current counts)
  const countData = useMemo(() =>
    words.map((w, i) => ({
      name: w.word,
      count: w.count,
      fill: CHART_COLORS[i % CHART_COLORS.length],
    })),
    [words]
  );

  // For line/area, use timeline data. If no timeline yet, use count data as single point
  const lineData = useMemo(() => {
    if (timeline.length > 0) return timeline;
    const point: Record<string, number | string> = { time: 'Now' };
    for (const w of words) point[w.word] = w.count;
    return [point];
  }, [timeline, words]);

  const tooltipStyle = {
    contentStyle: {
      background: 'var(--bg-dropdown)',
      border: '1px solid var(--border)',
      borderRadius: '8px',
      fontSize: '12px',
      color: 'var(--text-primary)',
    },
  };

  return (
    <div style={{ height: '180px' }}>
      <ResponsiveContainer width="100%" height="100%">
        {chartType === 'bar' ? (
          <BarChart data={countData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
            <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} allowDecimals={false} />
            <Tooltip {...tooltipStyle} />
            <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={60}>
              {countData.map((entry, i) => (
                <Cell key={i} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        ) : chartType === 'pie' ? (
          <PieChart>
            <Pie
              data={countData}
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={75}
              dataKey="count"
              nameKey="name"
              label={({ name, value }) => `${name}: ${value}`}
              labelLine={false}
              style={{ fontSize: '11px' }}
            >
              {countData.map((entry, i) => (
                <Cell key={i} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip {...tooltipStyle} />
            <Legend iconSize={10} wrapperStyle={{ fontSize: '11px' }} />
          </PieChart>
        ) : chartType === 'line' ? (
          <LineChart data={lineData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="time" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
            <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} allowDecimals={false} />
            <Tooltip {...tooltipStyle} />
            <Legend iconSize={10} wrapperStyle={{ fontSize: '11px' }} />
            {words.map((w, i) => (
              <Line
                key={w.id}
                type="monotone"
                dataKey={w.word}
                stroke={CHART_COLORS[i % CHART_COLORS.length]}
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            ))}
          </LineChart>
        ) : (
          <AreaChart data={lineData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="time" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
            <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} allowDecimals={false} />
            <Tooltip {...tooltipStyle} />
            <Legend iconSize={10} wrapperStyle={{ fontSize: '11px' }} />
            {words.map((w, i) => (
              <Area
                key={w.id}
                type="monotone"
                dataKey={w.word}
                stroke={CHART_COLORS[i % CHART_COLORS.length]}
                fill={CHART_COLORS[i % CHART_COLORS.length]}
                fillOpacity={0.2}
                strokeWidth={2}
              />
            ))}
          </AreaChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
