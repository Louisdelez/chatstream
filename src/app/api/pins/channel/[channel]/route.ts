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

  const pins = await prisma.pin.findMany({
    where: { userId: session.user.id, channel },
    orderBy: { pinnedAt: 'desc' },
  });

  return NextResponse.json(pins);
}
