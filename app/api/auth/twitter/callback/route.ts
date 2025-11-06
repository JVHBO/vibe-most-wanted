import { NextRequest, NextResponse } from 'next/server';
import { TwitterApi } from 'twitter-api-v2';
import { ConvexProfileService } from '@/lib/convex-profile';
import { devLog, devError } from '@/lib/utils/logger';

const CALLBACK_URL = process.env.NEXT_PUBLIC_APP_URL
  ? `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/twitter/callback`
  : 'http://localhost:3000/api/auth/twitter/callback';

// Simple decoding function
function decodeState(encoded: string): any {
  try {
    // Convert base64url back to base64
    const base64 = encoded
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    // Add padding
    const padding = '='.repeat((4 - (base64.length % 4)) % 4);
    const json = Buffer.from(base64 + padding, 'base64').toString('utf8');

    return JSON.parse(json);
  } catch (error) {
    throw new Error('Invalid state parameter - corrupted or malformed data');
  }
}

export async function GET(request: NextRequest) {
  try {
    devLog('🔵 Twitter OAuth callback started');
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    devLog('📥 Received params:', { code: code?.substring(0, 10) + '...', state: state?.substring(0, 20) + '...' });

    if (!code || !state) {
      devError('❌ Missing code or state');
      return NextResponse.redirect(new URL('/?error=twitter_auth_failed&reason=missing_params', request.url));
    }

    // Decode the state to get codeVerifier and address
    let codeVerifier: string;
    let address: string;

    try {
      devLog('🔍 State received:', state);
      devLog('🔍 State length:', state.length);

      const stateData = decodeState(state);
      devLog('✅ Decoded state:', stateData);

      codeVerifier = stateData.codeVerifier;
      address = stateData.address;
      const timestamp = stateData.timestamp;

      devLog('✅ Extracted data:', { address, hasCodeVerifier: !!codeVerifier, timestamp });

      // Check if token is expired (older than 10 minutes)
      const age = Date.now() - timestamp;
      if (age > 10 * 60 * 1000) {
        devError('❌ OAuth state expired:', age / 1000, 'seconds old');
        return NextResponse.redirect(new URL('/?error=twitter_auth_failed&reason=state_expired', request.url));
      }

      devLog('✅ Got address from state:', address);
    } catch (error: any) {
      devError('❌ Failed to decode state:', error);
      devError('❌ Error message:', error.message);
      devError('❌ State value:', state);
      return NextResponse.redirect(new URL('/?error=twitter_auth_failed&reason=invalid_state', request.url));
    }

    if (!process.env.TWITTER_CLIENT_ID || !process.env.TWITTER_CLIENT_SECRET) {
      devError('❌ Missing Twitter credentials in env');
      return NextResponse.redirect(new URL('/?error=twitter_auth_failed&reason=missing_credentials', request.url));
    }

    const client = new TwitterApi({
      clientId: process.env.TWITTER_CLIENT_ID,
      clientSecret: process.env.TWITTER_CLIENT_SECRET,
    });

    devLog('🔄 Exchanging code for token...');
    // Exchange code for access token
    const { client: loggedClient, accessToken, refreshToken } = await client.loginWithOAuth2({
      code,
      codeVerifier,
      redirectUri: CALLBACK_URL,
    });

    devLog('✅ Token exchange successful');

    // Get user info (request profile_image_url field)
    devLog('👤 Fetching user info...');
    const { data: userObject } = await loggedClient.v2.me({
      'user.fields': ['profile_image_url']
    });
    devLog('✅ Got user:', userObject.username);
    devLog('📸 Profile image URL:', userObject.profile_image_url);

    // Save Twitter handle + profile image to Convex
    devLog('💾 Saving to Convex...');
    await ConvexProfileService.updateTwitter(
      address,
      userObject.username,
      undefined,
      userObject.profile_image_url
    );
    devLog('✅ Saved to Convex');

    // Redirect back to app with success
    return NextResponse.redirect(new URL(`/?twitter_connected=${userObject.username}`, request.url));
  } catch (error: any) {
    devError('❌ Twitter OAuth callback error:', error);
    devError('Error details:', {
      message: error.message,
      code: error.code,
      data: error.data
    });
    return NextResponse.redirect(new URL(`/?error=twitter_auth_failed&reason=${encodeURIComponent(error.message)}`, request.url));
  }
}
