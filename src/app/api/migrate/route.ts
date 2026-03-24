import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

interface MigrateBody {
  messages?: Array<Record<string, unknown>>;
  formats?: Array<Record<string, unknown>>;
  pins?: Array<Record<string, unknown>>;
  settings?: Record<string, unknown>;
  mutedUsers?: string[];
  channels?: string[];
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body: MigrateBody = await request.json();
  const userId = session.user.id;

  const ALLOWED_SETTINGS_KEYS = new Set([
    'theme', 'pageLayout', 'fontSize', 'fontFamily', 'compact',
    'showTimestamps', 'showPlatform', 'showBadges', 'showUsername',
    'showSubs', 'showGiftSubs', 'showPrime', 'showBits', 'showRaids',
    'maxMessages',
  ]);

  const counts = { messages: 0, formats: 0, pins: 0, mutedUsers: 0, channels: 0, settings: 0 };

  await prisma.$transaction(async (tx) => {
    // Channels
    if (body.channels?.length) {
      for (const name of body.channels) {
        await tx.userChannel.upsert({
          where: { userId_name: { userId, name } },
          update: {},
          create: { userId, name },
        });
      }
      counts.channels = body.channels.length;
    }

    // Settings
    if (body.settings) {
      const data: Record<string, unknown> = {};
      for (const key of Object.keys(body.settings)) {
        if (ALLOWED_SETTINGS_KEYS.has(key)) {
          data[key] = body.settings[key];
        }
      }
      await tx.userSettings.upsert({
        where: { userId },
        update: data,
        create: { userId, ...data },
      });
      counts.settings = 1;
    }

    // Muted users
    if (body.mutedUsers?.length) {
      for (const username of body.mutedUsers) {
        await tx.mutedUser.upsert({
          where: { userId_username: { userId, username } },
          update: {},
          create: { userId, username },
        });
      }
      counts.mutedUsers = body.mutedUsers.length;
    }

    // Messages
    if (body.messages?.length) {
      const messageData = body.messages.map((msg) => {
        const timestamp = new Date(msg.timestamp as string);
        const dayKey = (msg.dayKey as string) || timestamp.toISOString().slice(0, 10);
        return {
          id: msg.id as string,
          channel: msg.channel as string,
          timestamp,
          username: msg.username as string,
          displayName: msg.displayName as string,
          color: (msg.color as string) ?? null,
          message: msg.message as string,
          roles: (msg.roles as string[]) ?? [],
          badges: (msg.badges as object) ?? {},
          emotes: (msg.emotes as object) ?? null,
          isAction: (msg.isAction as boolean) ?? false,
          eventType: (msg.eventType as string) ?? null,
          eventData: (msg.eventData as object) ?? null,
          dayKey,
        };
      });
      const result = await tx.message.createMany({
        data: messageData,
        skipDuplicates: true,
      });
      counts.messages = result.count;
    }

    // Formats
    if (body.formats?.length) {
      for (const fmt of body.formats) {
        await tx.format.upsert({
          where: {
            userId_messageId_start_end_style: {
              userId,
              messageId: fmt.messageId as string,
              start: fmt.start as number,
              end: fmt.end as number,
              style: fmt.style as string,
            },
          },
          update: { color: (fmt.color as string) ?? null },
          create: {
            userId,
            messageId: fmt.messageId as string,
            start: fmt.start as number,
            end: fmt.end as number,
            style: fmt.style as string,
            color: (fmt.color as string) ?? null,
          },
        });
      }
      counts.formats = body.formats.length;
    }

    // Pins
    if (body.pins?.length) {
      for (const p of body.pins) {
        await tx.pin.create({
          data: {
            userId,
            messageId: p.messageId as string,
            channel: p.channel as string,
            displayName: p.displayName as string,
            color: (p.color as string) ?? null,
            text: p.text as string,
            fullMessage: p.fullMessage as string,
            timestamp: new Date(p.timestamp as string),
          },
        });
      }
      counts.pins = body.pins.length;
    }
  });

  return NextResponse.json({ success: true, counts }, { status: 201 });
}
