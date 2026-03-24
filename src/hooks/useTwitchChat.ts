'use client';

import { useEffect, useRef, useCallback } from 'react';
import tmi from 'tmi.js';
import { createTwitchClient, tagsToMessage } from '@/lib/twitch';
import { useChatStore } from '@/stores/chatStore';
import { saveMessages, createSession, endSession, getTodayMessages } from '@/lib/db';
import { fetchRecentMessages } from '@/lib/twitch';
import { ChatMessage } from '@/types';
import { useUserColorStore } from '@/stores/userColorStore';
import { useAuthStore } from '@/stores/authStore';

export function useTwitchChat(channel: string | null) {
  const clientRef = useRef<tmi.Client | null>(null);
  const bufferRef = useRef<ChatMessage[]>([]);
  const sessionIdRef = useRef<string | null>(null);

  const addMessage = useChatStore((s) => s.addMessage);
  const setUserColor = useUserColorStore((s) => s.setColor);
  const loadMessages = useChatStore((s) => s.loadMessages);
  const setStatus = useChatStore((s) => s.setStatus);
  const setChannel = useChatStore((s) => s.setChannel);
  const clearMessages = useChatStore((s) => s.clearMessages);
  const setSessionId = useChatStore((s) => s.setSessionId);
  const twitchLinked = useAuthStore((s) => s.twitchLinked);
  const appUser = useAuthStore((s) => s.appUser);
  const appUserIdRef = useRef(appUser?.id);
  const twitchLinkedRef = useRef(twitchLinked);
  appUserIdRef.current = appUser?.id;
  twitchLinkedRef.current = twitchLinked;
  const appUserId = appUser?.id;

  const sendMessage = useCallback(
    async (text: string) => {
      if (!clientRef.current || !channel || !text.trim()) return;
      try {
        await clientRef.current.say(channel, text.trim());
      } catch (err) {
        console.error('Failed to send message:', err);
      }
    },
    [channel]
  );

  useEffect(() => {
    if (!channel) return;

    clearMessages();
    setChannel(channel);
    setStatus('connecting');

    let client: tmi.Client | null = null;
    let flushInterval: ReturnType<typeof setInterval> | null = null;
    let cancelled = false;

    const setup = async () => {
      // Fetch Twitch token from server if user is logged in and has Twitch linked
      let auth: { username: string; token: string } | undefined;
      if (appUserIdRef.current && twitchLinkedRef.current) {
        try {
          const res = await fetch('/api/twitch/token');
          if (res.ok) {
            const data = await res.json();
            auth = { username: data.login, token: data.accessToken };
          }
        } catch {
          // Continue without auth — anonymous connection
        }
      }

      if (cancelled) return;

      client = createTwitchClient(channel, auth);
      clientRef.current = client;

      // Create session
      createSession(channel).then((session) => {
        sessionIdRef.current = session.id;
        setSessionId(session.id);
      });

      const registerColor = (msg: ChatMessage) => {
        if (msg.color) setUserColor(msg.username, msg.color);
      };

      client.on('connected', async () => {
        setStatus('connected');

        // 1. Load today's stored messages from IndexedDB
        const storedMessages = await getTodayMessages(channel);
        const storedIds = new Set(storedMessages.map((m) => m.id));
        if (storedMessages.length > 0) {
          for (const m of storedMessages) registerColor(m);
          loadMessages(storedMessages);
        }

        // 2. Fetch recent messages from API, add only new ones
        const recentMessages = await fetchRecentMessages(channel);
        const newMessages = recentMessages.filter((m) => !storedIds.has(m.id));
        if (newMessages.length > 0) {
          for (const m of newMessages) registerColor(m);
          for (const m of newMessages) addMessage(m);
          bufferRef.current.push(...newMessages);
        }
      });

      client.on('disconnected', () => {
        setStatus('disconnected');
      });

      // Use 'chat' event instead of 'message' — 'chat' only fires for real
      // PRIVMSG messages, NOT for USERNOTICE (subs, raids, bits, gifts).
      // This prevents all event duplication.
      client.on('chat', (ch: string, tags: tmi.ChatUserstate, message: string, _self: boolean) => {
        if (tags.bits) return; // cheers handled by 'cheer' event
        const msg = tagsToMessage(ch, tags, message, false);
        if (sessionIdRef.current) msg.sessionId = sessionIdRef.current;
        registerColor(msg);
        addMessage(msg);
        bufferRef.current.push(msg);
      });

      client.on('action', (ch: string, tags: tmi.ChatUserstate, message: string, _self: boolean) => {
        const msg = tagsToMessage(ch, tags, message, true);
        if (sessionIdRef.current) msg.sessionId = sessionIdRef.current;
        registerColor(msg);
        addMessage(msg);
        bufferRef.current.push(msg);
      });

      // ── Event handlers (subs, bits, raids) ──

      const addEvent = (msg: ChatMessage) => {
        if (sessionIdRef.current) msg.sessionId = sessionIdRef.current;
        addMessage(msg);
        bufferRef.current.push(msg);
      };

      const makeEventMsg = (
        ch: string,
        username: string,
        displayName: string,
        message: string,
        eventType: ChatMessage['eventType'],
        eventData: ChatMessage['eventData'],
        color?: string,
        twitchId?: string
      ): ChatMessage => ({
        id: twitchId || crypto.randomUUID(),
        timestamp: Date.now(),
        channel: ch.replace('#', ''),
        username: username || 'twitch',
        displayName: displayName || username || 'Twitch',
        color: color || null,
        message,
        roles: ['viewer'],
        badges: {},
        emotes: null,
        isAction: false,
        eventType,
        eventData,
      });

      // Sub / Resub
      client.on('subscription', (ch, username, methods, _msg, tags) => {
        const plan = methods?.plan === 'Prime' ? 'Prime' : methods?.plan === '1000' ? 'Tier 1' : methods?.plan === '2000' ? 'Tier 2' : methods?.plan === '3000' ? 'Tier 3' : 'Sub';
        const isPrime = methods?.plan === 'Prime';
        const displayName = tags?.['display-name'] || username;
        addEvent(makeEventMsg(
          ch, username, displayName,
          `s'est abonné${isPrime ? ' avec Prime' : ` (${plan})`}`,
          isPrime ? 'prime' : 'sub',
          { plan: plan, months: 1 },
          tags?.color,
          tags?.id
        ));
      });

      client.on('resub', (ch, username, months, msg, tags, methods) => {
        const plan = methods?.plan === 'Prime' ? 'Prime' : methods?.plan === '1000' ? 'Tier 1' : methods?.plan === '2000' ? 'Tier 2' : methods?.plan === '3000' ? 'Tier 3' : 'Sub';
        const isPrime = methods?.plan === 'Prime';
        const displayName = tags?.['display-name'] || username;
        const cumulMonths = parseInt(String(tags?.['msg-param-cumulative-months'] || months), 10) || Number(months);
        addEvent(makeEventMsg(
          ch, username, displayName,
          `se réabonne${isPrime ? ' avec Prime' : ` (${plan})`} — ${cumulMonths} mois${msg ? ` : ${msg}` : ''}`,
          isPrime ? 'prime' : 'resub',
          { plan, months: cumulMonths },
          tags?.color,
          tags?.id
        ));
      });

      // Gift subs (mystery gift = bulk)
      client.on('submysterygift', (ch, username, numbOfSubs, methods, tags) => {
        const displayName = tags?.['display-name'] || username;
        const plan = methods?.plan === '1000' ? 'Tier 1' : methods?.plan === '2000' ? 'Tier 2' : methods?.plan === '3000' ? 'Tier 3' : 'Sub';
        addEvent(makeEventMsg(
          ch, username, displayName,
          `a offert ${numbOfSubs} abonnement${numbOfSubs > 1 ? 's' : ''} (${plan}) à la communauté`,
          'giftsub',
          { giftCount: numbOfSubs, plan },
          tags?.color,
          tags?.id
        ));
      });

      // Single gift sub
      client.on('subgift', (ch, username, _streakMonths, recipient, methods, tags) => {
        const isMystery = tags?.['msg-param-origin-id'];
        if (isMystery) return;

        const displayName = tags?.['display-name'] || username;
        const plan = methods?.plan === '1000' ? 'Tier 1' : methods?.plan === '2000' ? 'Tier 2' : methods?.plan === '3000' ? 'Tier 3' : 'Sub';
        addEvent(makeEventMsg(
          ch, username, displayName,
          `a offert un abonnement (${plan}) à ${recipient}`,
          'giftsub',
          { giftCount: 1, plan, recipientName: recipient },
          tags?.color,
          tags?.id
        ));
      });

      // Bits (cheers)
      client.on('cheer', (ch, tags, message) => {
        const username = tags.username || 'anonymous';
        const displayName = tags['display-name'] || username;
        const bits = parseInt(tags.bits || '0', 10);
        addEvent(makeEventMsg(
          ch, username, displayName,
          `${bits} bits${message ? ` — ${message}` : ''}`,
          'bits',
          { bits },
          tags.color,
          tags.id
        ));
      });

      // Raid
      client.on('raided', (ch, username, viewers) => {
        addEvent(makeEventMsg(
          ch, username, username,
          `raid de ${viewers} viewer${viewers > 1 ? 's' : ''}`,
          'raid',
          { viewers },
          undefined,
          `raid-${username}-${Date.now()}`
        ));
      });

      // Flush buffer: save to IndexedDB and also POST to server API
      flushInterval = setInterval(() => {
        if (bufferRef.current.length > 0) {
          const toSave = [...bufferRef.current];
          bufferRef.current = [];

          // Save to IndexedDB (local)
          saveMessages(toSave);

          // Also sync to server API
          fetch(`/api/messages/${encodeURIComponent(channel)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(toSave),
          }).catch(() => {});
        }
      }, 2000);

      client.connect().catch(() => {
        setStatus('error');
      });
    };

    setup();

    return () => {
      cancelled = true;
      if (flushInterval) clearInterval(flushInterval);
      if (bufferRef.current.length > 0) {
        const toSave = [...bufferRef.current];
        bufferRef.current = [];
        saveMessages(toSave);
        fetch(`/api/messages/${encodeURIComponent(channel)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(toSave),
        }).catch(() => {});
      }
      if (sessionIdRef.current) {
        endSession(sessionIdRef.current);
        sessionIdRef.current = null;
      }
      if (client) {
        client.disconnect();
      }
      clientRef.current = null;
      setStatus('disconnected');
    };
  }, [channel, twitchLinked, appUserId, addMessage, setStatus, setChannel, clearMessages, setSessionId, loadMessages, setUserColor]);

  return { sendMessage };
}
