import { NextRequest, NextResponse } from 'next/server';
import { TwitterApi } from 'twitter-api-v2';
import { ProfileService } from '@/lib/firebase';

const CALLBACK_URL = process.env.NEXT_PUBLIC_APP_URL
  ? `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/twitter/callback`
  : 'http://localhost:3000/api/auth/twitter/callback';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    if (!code || !state) {
      return NextResponse.redirect(new URL('/?error=twitter_auth_failed', request.url));
    }

    // Decode state to get address and codeVerifier
    const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
    const { address, codeVerifier } = stateData;

    const client = new TwitterApi({
      clientId: process.env.TWITTER_CLIENT_ID!,
      clientSecret: process.env.TWITTER_CLIENT_SECRET!,
    });

    // Exchange code for access token
    const { client: loggedClient, accessToken, refreshToken } = await client.loginWithOAuth2({
      code,
      codeVerifier,
      redirectUri: CALLBACK_URL,
    });

    // Get user info
    const { data: userObject } = await loggedClient.v2.me();

    // Save Twitter handle to Firebase
    await ProfileService.updateTwitter(address, userObject.username);

    // Redirect back to app with success
    return NextResponse.redirect(new URL(`/?twitter_connected=${userObject.username}`, request.url));
  } catch (error: any) {
    console.error('Twitter OAuth callback error:', error);
    return NextResponse.redirect(new URL('/?error=twitter_auth_failed', request.url));
  }
}
