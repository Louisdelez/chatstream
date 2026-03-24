import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const CHUNK_SIZE = 1000;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  const share = await prisma.share.findUnique({ where: { slug } });
  if (!share || !share.active) {
    return NextResponse.json({ error: 'Share not found' }, { status: 404 });
  }
  if (share.expiresAt && share.expiresAt < new Date()) {
    return NextResponse.json({ error: 'Share has expired' }, { status: 410 });
  }

  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('mode');

  // Return list of available days for this share's channel
  if (mode === 'days') {
    const days = await prisma.message.findMany({
      where: { channel: share.channel },
      select: { dayKey: true },
      distinct: ['dayKey'],
      orderBy: { dayKey: 'desc' },
    });
    return NextResponse.json(days.map((d) => d.dayKey));
  }

  const date = searchParams.get('date');
  const chunk = parseInt(searchParams.get('chunk') ?? '0', 10);

  if (!date) {
    return NextResponse.json({ error: 'date query param is required' }, { status: 400 });
  }

  const messages = await prisma.message.findMany({
    where: { channel: share.channel, dayKey: date },
    orderBy: { timestamp: 'asc' },
    skip: chunk * CHUNK_SIZE,
    take: CHUNK_SIZE,
  });

  return NextResponse.json(messages);
}
