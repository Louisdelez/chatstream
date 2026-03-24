import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const CHUNK_SIZE = 1000;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ channel: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { channel } = await params;
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');
  const chunk = parseInt(searchParams.get('chunk') ?? '0', 10);

  if (!date) {
    return NextResponse.json({ error: 'date query param is required' }, { status: 400 });
  }

  const messages = await prisma.message.findMany({
    where: { channel, dayKey: date },
    orderBy: { timestamp: 'asc' },
    skip: chunk * CHUNK_SIZE,
    take: CHUNK_SIZE,
  });

  return NextResponse.json(messages);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ channel: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { channel } = await params;
  const messages: Array<Record<string, unknown>> = await request.json();

  if (!Array.isArray(messages)) {
    return NextResponse.json({ error: 'Body must be an array of messages' }, { status: 400 });
  }

  const upserts = messages.map((msg) => {
    const timestamp = new Date(msg.timestamp as string);
    const dayKey = timestamp.toISOString().slice(0, 10);

    return prisma.message.upsert({
      where: { id: msg.id as string },
      update: {
        channel,
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
      },
      create: {
        id: msg.id as string,
        channel,
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
      },
    });
  });

  const results = await prisma.$transaction(upserts);

  return NextResponse.json({ saved: results.length }, { status: 201 });
}
