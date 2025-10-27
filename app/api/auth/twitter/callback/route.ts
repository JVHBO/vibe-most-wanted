import { NextRequest, NextResponse } from 'next/server';
import { TwitterApi } from 'twitter-api-v2';
import { ConvexProfileService } from '@/lib/convex-profile';

const CALLBACK_URL = process.env.NEXT_PUBLIC_APP_URL
  ? `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/twitter/callback`
  : 'http://localhost:3000/api/auth/twitter/callback';

// Simple decoding function
function decodeState(encoded: string): any {
  // Convert base64url back to base64
  const base64 = encoded
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  // Add padding
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const json = Buffer.from(base64 + padding, 'base64').toString('utf8');

  return JSON.parse(json);
}

export async function GET(request: NextRequest) {
  try {
    console.log('🔵 Twitter OAuth callback started');
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    console.log('📥 Received params:', { code: code?.substring(0, 10) + '...', state: state?.substring(0, 20) + '...' });

    if (!code || !state) {
      console.error('❌ Missing code or state');
      return NextResponse.redirect(new URL('/?error=twitter_auth_failed&reason=missing_params', request.url));
    }

    // Decode the state to get codeVerifier and address
    let codeVerifier: string;
    let address: string;

    try {
      console.log('🔍 State received:', state);
      console.log('🔍 State length:', state.length);

      const stateData = decodeState(state);
      console.log('✅ Decoded state:', stateData);

      codeVerifier = stateData.codeVerifier;
      address = stateData.address;
      const timestamp = stateData.timestamp;

      console.log('✅ Extracted data:', { address, hasCodeVerifier: !!codeVerifier, timestamp });

      // Check if token is expired (older than 10 minutes)
      const age = Date.now() - timestamp;
      if (age > 10 * 60 * 1000) {
        console.error('❌ OAuth state expired:', age / 1000, 'seconds old');
        return NextResponse.redirect(new URL('/?error=twitter_auth_failed&reason=state_expired', request.url));
      }

      console.log('✅ Got address from state:', address);
    } catch (error: any) {
      console.error('❌ Failed to decode state:', error);
      console.error('❌ Error message:', error.message);
      console.error('❌ State value:', state);
      return NextResponse.redirect(new URL('/?error=twitter_auth_failed&reason=invalid_state', request.url));
    }

    if (!process.env.TWITTER_CLIENT_ID || !process.env.TWITTER_CLIENT_SECRET) {
      console.error('❌ Missing Twitter credentials in env');
      return NextResponse.redirect(new URL('/?error=twitter_auth_failed&reason=missing_credentials', request.url));
    }

    const client = new TwitterApi({
      clientId: process.env.TWITTER_CLIENT_ID,
      clientSecret: process.env.TWITTER_CLIENT_SECRET,
    });

    console.log('🔄 Exchanging code for token...');
    // Exchange code for access token
    const { client: loggedClient, accessToken, refreshToken } = await client.loginWithOAuth2({
      code,
      codeVerifier,
      redirectUri: CALLBACK_URL,
    });

    console.log('✅ Token exchange successful');

    // Get user info
    console.log('👤 Fetching user info...');
    const { data: userObject } = await loggedClient.v2.me();
    console.log('✅ Got user:', userObject.username);

    // Save Twitter handle to Convex
    console.log('💾 Saving to Convex...');
    await ConvexProfileService.updateTwitter(address, userObject.username);
    console.log('✅ Saved to Convex');

    // Redirect back to app with success
    return NextResponse.redirect(new URL(`/?twitter_connected=${userObject.username}`, request.url));
  } catch (error: any) {
    console.error('❌ Twitter OAuth callback error:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      data: error.data
    });
    return NextResponse.redirect(new URL(`/?error=twitter_auth_failed&reason=${encodeURIComponent(error.message)}`, request.url));
  }
}
