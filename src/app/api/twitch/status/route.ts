import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const account = await prisma.account.findFirst({
    where: { userId: session.user.id, providerId: 'twitch' },
  });

  if (!account) {
    return NextResponse.json({ linked: false });
  }

  // Fetch display name from Twitch
  let displayName: string | null = null;
  if (account.accessToken) {
    const clientId = process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID!;
    try {
      const userRes = await fetch('https://api.twitch.tv/helix/users', {
        headers: {
          'Authorization': `Bearer ${account.accessToken}`,
          'Client-Id': clientId,
        },
      });
      if (userRes.ok) {
        const userData = await userRes.json();
        displayName = userData.data?.[0]?.display_name ?? null;
      }
    } catch {
      // Ignore fetch errors, return linked status without display name
    }
  }

  return NextResponse.json({
    linked: true,
    displayName,
    accountId: account.accountId,
  });
}

export async function DELETE() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await prisma.account.deleteMany({
    where: { userId: session.user.id, providerId: 'twitch' },
  });

  return NextResponse.json({ success: true });
}
