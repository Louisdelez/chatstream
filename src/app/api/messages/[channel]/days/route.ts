import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ channel: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { channel } = await params;

  const groups = await prisma.message.groupBy({
    by: ['dayKey'],
    where: { channel },
    _count: { id: true },
    orderBy: { dayKey: 'desc' },
  });

  const days = groups.map((g) => ({
    dayKey: g.dayKey,
    count: g._count.id,
    label: new Date(g.dayKey + 'T00:00:00Z').toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    }),
  }));

  return NextResponse.json(days);
}
