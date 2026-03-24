import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET() {
  const clientId = process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID;
  const baseUrl = process.env.BETTER_AUTH_URL || 'http://localhost:3001';

  if (!clientId) {
    return NextResponse.json({ error: 'Twitch client ID not configured' }, { status: 500 });
  }

  const state = crypto.randomUUID();
  const redirectUri = `${baseUrl}/api/twitch/callback`;

  // Store state in cookie for CSRF protection
  const cookieStore = await cookies();
  cookieStore.set('twitch_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10 minutes
    path: '/',
  });

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'chat:read chat:edit',
    state,
  });

  return NextResponse.redirect(`https://id.twitch.tv/oauth2/authorize?${params.toString()}`);
}
