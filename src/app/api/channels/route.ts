import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const channels = await prisma.userChannel.findMany({
    where: { userId: session.user.id },
    orderBy: { addedAt: 'desc' },
  });

  return NextResponse.json(channels);
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { name } = await request.json();
  if (!name || typeof name !== 'string') {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }

  const channel = await prisma.userChannel.upsert({
    where: { userId_name: { userId: session.user.id, name } },
    update: {},
    create: { userId: session.user.id, name },
  });

  return NextResponse.json(channel, { status: 201 });
}
