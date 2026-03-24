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

  if (!account || !account.accessToken) {
    return NextResponse.json({ error: 'No Twitch account linked' }, { status: 404 });
  }

  // Check if token is expired and refresh if needed
  if (account.accessTokenExpiresAt && account.accessTokenExpiresAt < new Date()) {
    if (!account.refreshToken) {
      return NextResponse.json({ error: 'Token expired and no refresh token' }, { status: 401 });
    }

    const clientId = process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID!;
    const clientSecret = process.env.TWITCH_CLIENT_SECRET!;

    const refreshRes = await fetch('https://id.twitch.tv/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'refresh_token',
        refresh_token: account.refreshToken,
      }),
    });

    if (!refreshRes.ok) {
      return NextResponse.json({ error: 'Failed to refresh token' }, { status: 401 });
    }

    const refreshData = await refreshRes.json();

    await prisma.account.update({
      where: { id: account.id },
      data: {
        accessToken: refreshData.access_token,
        refreshToken: refreshData.refresh_token ?? account.refreshToken,
        accessTokenExpiresAt: new Date(Date.now() + refreshData.expires_in * 1000),
      },
    });

    return NextResponse.json({
      accessToken: refreshData.access_token,
      login: account.accountId,
    });
  }

  // Fetch the Twitch username for tmi.js identity
  const clientId = process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID!;
  const userRes = await fetch('https://api.twitch.tv/helix/users', {
    headers: {
      'Authorization': `Bearer ${account.accessToken}`,
      'Client-Id': clientId,
    },
  });

  let login = account.accountId;
  if (userRes.ok) {
    const userData = await userRes.json();
    login = userData.data?.[0]?.login ?? account.accountId;
  }

  return NextResponse.json({
    accessToken: account.accessToken,
    login,
  });
}
