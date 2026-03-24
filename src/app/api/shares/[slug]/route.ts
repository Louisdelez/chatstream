import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  const share = await prisma.share.findUnique({
    where: { slug },
    include: { accesses: true },
  });

  if (!share || !share.active) {
    return NextResponse.json({ error: 'Share not found' }, { status: 404 });
  }

  if (share.expiresAt && share.expiresAt < new Date()) {
    return NextResponse.json({ error: 'Share has expired' }, { status: 410 });
  }

  return NextResponse.json({
    id: share.id,
    channel: share.channel,
    slug: share.slug,
    createdAt: share.createdAt,
    expiresAt: share.expiresAt,
    active: share.active,
    permission: share.accesses[0]?.permission ?? 'view',
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { slug } = await params;

  const share = await prisma.share.findUnique({ where: { slug } });
  if (!share || share.ownerId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const body = await request.json();
  const { permission, active, expiresAt } = body;

  const updated = await prisma.share.update({
    where: { slug },
    data: {
      ...(active !== undefined && { active }),
      ...(expiresAt !== undefined && { expiresAt: expiresAt ? new Date(expiresAt) : null }),
    },
    include: { accesses: true },
  });

  if (permission !== undefined && updated.accesses[0]) {
    await prisma.shareAccess.update({
      where: { id: updated.accesses[0].id },
      data: { permission },
    });
  }

  const result = await prisma.share.findUnique({
    where: { slug },
    include: { accesses: true },
  });

  return NextResponse.json(result);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { slug } = await params;

  const share = await prisma.share.findUnique({ where: { slug } });
  if (!share || share.ownerId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  await prisma.share.delete({ where: { slug } });

  return NextResponse.json({ success: true });
}
