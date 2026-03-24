import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const muted = await prisma.mutedUser.findMany({
    where: { userId: session.user.id },
  });

  return NextResponse.json(muted);
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { username } = await request.json();
  if (!username || typeof username !== 'string') {
    return NextResponse.json({ error: 'Username is required' }, { status: 400 });
  }

  const muted = await prisma.mutedUser.upsert({
    where: { userId_username: { userId: session.user.id, username } },
    update: {},
    create: { userId: session.user.id, username },
  });

  return NextResponse.json(muted, { status: 201 });
}
