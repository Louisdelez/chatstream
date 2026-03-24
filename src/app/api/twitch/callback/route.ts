import { NextRequest, NextResponse } from 'next/server';
import { cookies, headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(new URL('/?twitch_error=' + encodeURIComponent(error), request.url));
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL('/?twitch_error=missing_params', request.url));
  }

  // Verify state
  const cookieStore = await cookies();
  const storedState = cookieStore.get('twitch_oauth_state')?.value;
  cookieStore.delete('twitch_oauth_state');

  if (!storedState || storedState !== state) {
    return NextResponse.redirect(new URL('/?twitch_error=invalid_state', request.url));
  }

  const clientId = process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID!;
  const clientSecret = process.env.TWITCH_CLIENT_SECRET!;
  const baseUrl = process.env.BETTER_AUTH_URL || 'http://localhost:3001';
  const redirectUri = `${baseUrl}/api/twitch/callback`;

  // Exchange code for tokens
  const tokenRes = await fetch('https://id.twitch.tv/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(new URL('/?twitch_error=token_exchange_failed', request.url));
  }

  const tokenData = await tokenRes.json();
  const { access_token, refresh_token, expires_in, scope } = tokenData;

  // Fetch Twitch user info
  const userRes = await fetch('https://api.twitch.tv/helix/users', {
    headers: {
      'Authorization': `Bearer ${access_token}`,
      'Client-Id': clientId,
    },
  });

  if (!userRes.ok) {
    return NextResponse.redirect(new URL('/?twitch_error=user_fetch_failed', request.url));
  }

  const userData = await userRes.json();
  const twitchUser = userData.data?.[0];

  if (!twitchUser) {
    return NextResponse.redirect(new URL('/?twitch_error=no_user_data', request.url));
  }

  // Create or update Account record with providerId: 'twitch'
  const expiresAt = new Date(Date.now() + expires_in * 1000);

  await prisma.account.upsert({
    where: {
      id: await getExistingAccountId(session.user.id),
    },
    update: {
      accountId: twitchUser.id,
      accessToken: access_token,
      refreshToken: refresh_token ?? null,
      accessTokenExpiresAt: expiresAt,
      scope: scope ? (Array.isArray(scope) ? scope.join(' ') : scope) : null,
    },
    create: {
      userId: session.user.id,
      providerId: 'twitch',
      accountId: twitchUser.id,
      accessToken: access_token,
      refreshToken: refresh_token ?? null,
      accessTokenExpiresAt: expiresAt,
      scope: scope ? (Array.isArray(scope) ? scope.join(' ') : scope) : null,
    },
  });

  return NextResponse.redirect(new URL('/?twitch_linked=true', request.url));
}

async function getExistingAccountId(userId: string): Promise<string> {
  const existing = await prisma.account.findFirst({
    where: { userId, providerId: 'twitch' },
    select: { id: true },
  });
  return existing?.id ?? 'nonexistent';
}
