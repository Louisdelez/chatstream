import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const settings = await prisma.userSettings.upsert({
    where: { userId: session.user.id },
    update: {},
    create: { userId: session.user.id },
  });

  return NextResponse.json(settings);
}

const ALLOWED_SETTINGS_KEYS = new Set([
  'theme', 'pageLayout', 'fontSize', 'fontFamily', 'compact',
  'showTimestamps', 'showPlatform', 'showBadges', 'showUsername',
  'showSubs', 'showGiftSubs', 'showPrime', 'showBits', 'showRaids',
  'maxMessages',
]);

function pickAllowedSettings(obj: Record<string, unknown>) {
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(obj)) {
    if (ALLOWED_SETTINGS_KEYS.has(key)) {
      result[key] = obj[key];
    }
  }
  return result;
}

export async function PUT(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const data = pickAllowedSettings(body);

  const settings = await prisma.userSettings.upsert({
    where: { userId: session.user.id },
    update: data,
    create: { userId: session.user.id, ...data },
  });

  return NextResponse.json(settings);
}
