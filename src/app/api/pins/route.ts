import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { messageId, channel, displayName, color, text, fullMessage, timestamp } =
    await request.json();

  if (!messageId || !channel || !displayName || !text || !fullMessage || !timestamp) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const pin = await prisma.pin.create({
    data: {
      userId: session.user.id,
      messageId,
      channel,
      displayName,
      color: color ?? null,
      text,
      fullMessage,
      timestamp: new Date(timestamp),
    },
  });

  return NextResponse.json(pin, { status: 201 });
}
