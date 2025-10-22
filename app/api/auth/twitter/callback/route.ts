import { NextRequest, NextResponse } from 'next/server';
import { TwitterApi } from 'twitter-api-v2';
import { ProfileService } from '@/lib/firebase';
import { TwitterOAuthStore } from '@/lib/twitter-oauth-store';

const CALLBACK_URL = process.env.NEXT_PUBLIC_APP_URL
  ? `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/twitter/callback`
  : 'http://localhost:3000/api/auth/twitter/callback';

export async function GET(request: NextRequest) {
  try {
    console.log('🔵 Twitter OAuth callback started');
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    console.log('📥 Received params:', { code: code?.substring(0, 10) + '...', state: state?.substring(0, 10) + '...' });

    if (!code || !state) {
      console.error('❌ Missing code or state');
      return NextResponse.redirect(new URL('/?error=twitter_auth_failed&reason=missing_params', request.url));
    }

    // Get OAuth data from store using state ID
    const oauthData = TwitterOAuthStore.get(state);

    console.log('📦 Store lookup:', { hasData: !!oauthData, state });

    if (!oauthData) {
      console.error('❌ OAuth state not found or expired');
      return NextResponse.redirect(new URL('/?error=twitter_auth_failed&reason=state_not_found', request.url));
    }

    const { codeVerifier, address } = oauthData;
    console.log('✅ Got address from store:', address);

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

    // Save Twitter handle to Firebase
    console.log('💾 Saving to Firebase...');
    await ProfileService.updateTwitter(address, userObject.username);
    console.log('✅ Saved to Firebase');

    // Delete OAuth state from store
    TwitterOAuthStore.delete(state);
    console.log('✅ Cleared OAuth state');

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
