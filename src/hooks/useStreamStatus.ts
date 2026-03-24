'use client';

import { useEffect, useState, useRef } from 'react';

export type StreamStatus = 'live' | 'offline' | 'loading';

interface StreamInfo {
  status: StreamStatus;
  title: string;
  gameName: string;
  viewerCount: number;
  avatar: string;
}

const POLL_INTERVAL = 30000; // 30 seconds

export function useStreamStatus(channel: string): StreamInfo {
  const [info, setInfo] = useState<StreamInfo>({
    status: 'loading',
    title: '',
    gameName: '',
    viewerCount: 0,
    avatar: '',
  });
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!channel) return;

    const fetchStatus = async () => {
      try {
        // Use the unofficial Twitch API endpoint that doesn't require auth
        const res = await fetch(
          `https://decapi.me/twitch/uptime/${encodeURIComponent(channel)}`
        );
        const text = await res.text();
        const isOffline = text.toLowerCase().includes('offline');

        // Fetch avatar
        let avatar = '';
        try {
          const avatarRes = await fetch(
            `https://decapi.me/twitch/avatar/${encodeURIComponent(channel)}`
          );
          avatar = await avatarRes.text();
          if (!avatar.startsWith('http')) avatar = '';
        } catch { /* ignore */ }

        if (isOffline) {
          setInfo({ status: 'offline', title: '', gameName: '', viewerCount: 0, avatar });
        } else {
          // Stream is live, get more info
          try {
            const viewerRes = await fetch(
              `https://decapi.me/twitch/viewercount/${encodeURIComponent(channel)}`
            );
            const viewerText = await viewerRes.text();
            const viewers = parseInt(viewerText, 10) || 0;

            const titleRes = await fetch(
              `https://decapi.me/twitch/title/${encodeURIComponent(channel)}`
            );
            const title = await titleRes.text();

            const gameRes = await fetch(
              `https://decapi.me/twitch/game/${encodeURIComponent(channel)}`
            );
            const game = await gameRes.text();

            setInfo({
              status: 'live',
              title: title || '',
              gameName: game || '',
              viewerCount: viewers,
              avatar,
            });
          } catch {
            setInfo((prev) => ({ ...prev, status: 'live' }));
          }
        }
      } catch {
        // API error, don't change status
      }
    };

    fetchStatus();
    intervalRef.current = setInterval(fetchStatus, POLL_INTERVAL);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [channel]);

  return info;
}
