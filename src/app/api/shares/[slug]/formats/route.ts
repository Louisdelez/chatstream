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

  const formats = await prisma.format.findMany({
    where: {
      userId: share.ownerId,
      message: { channel: share.channel },
    },
  });

  return NextResponse.json(formats);
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
  if (!hasPermission(permission, 'format')) {
    return NextResponse.json({ error: 'Insufficient permission' }, { status: 403 });
  }

  const { messageId, start, end, style, color } = await request.json();
  if (!messageId || start == null || end == null || !style) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const format = await prisma.format.create({
    data: {
      userId: session.user.id,
      messageId,
      start,
      end,
      style,
      color: color ?? null,
    },
  });

  return NextResponse.json(format, { status: 201 });
}
