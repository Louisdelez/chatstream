import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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
