import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hasPermission } from '@/lib/share-permissions';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  const share = await prisma.share.findUnique({ where: { slug }, include: { accesses: true } });
  if (!share || !share.active) {
    return NextResponse.json({ error: 'Share not found' }, { status: 404 });
  }
  if (share.expiresAt && share.expiresAt < new Date()) {
    return NextResponse.json({ error: 'Share has expired' }, { status: 410 });
  }

  const pins = await prisma.pin.findMany({
    where: {
      userId: share.ownerId,
      channel: share.channel,
    },
    orderBy: { pinnedAt: 'desc' },
  });

  return NextResponse.json(pins);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { slug } = await params;

  const share = await prisma.share.findUnique({ where: { slug }, include: { accesses: true } });
  if (!share || !share.active) {
    return NextResponse.json({ error: 'Share not found' }, { status: 404 });
  }
  if (share.expiresAt && share.expiresAt < new Date()) {
    return NextResponse.json({ error: 'Share has expired' }, { status: 410 });
  }

  const permission = share.accesses[0]?.permission ?? 'view';
  if (!hasPermission(permission, 'pin')) {
    return NextResponse.json({ error: 'Insufficient permission' }, { status: 403 });
  }

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
