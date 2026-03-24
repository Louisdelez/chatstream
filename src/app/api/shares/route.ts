import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { nanoid } from 'nanoid';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const shares = await prisma.share.findMany({
    where: { ownerId: session.user.id },
    include: { accesses: true },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(shares);
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { channel, permission } = await request.json();
  if (!channel || !permission) {
    return NextResponse.json({ error: 'channel and permission are required' }, { status: 400 });
  }

  const slug = nanoid(10);

  const share = await prisma.share.create({
    data: {
      ownerId: session.user.id,
      channel,
      slug,
      accesses: {
        create: { permission },
      },
    },
    include: { accesses: true },
  });

  return NextResponse.json(share, { status: 201 });
}
