import { NextRequest, NextResponse } from 'next/server';
import { TwitterApi } from 'twitter-api-v2';
import { ProfileService } from '@/lib/firebase';

const CALLBACK_URL = process.env.NEXT_PUBLIC_APP_URL
  ? `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/twitter/callback`
  : 'http://localhost:3000/api/auth/twitter/callback';

export async function GET(request: NextRequest) {
  try {
    console.log('🔵 Twitter OAuth callback started');
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    console.log('📥 Received params:', { code: code?.substring(0, 10) + '...', hasState: !!state });

    if (!code) {
      console.error('❌ Missing code');
      return NextResponse.redirect(new URL('/?error=twitter_auth_failed&reason=missing_code', request.url));
    }

    // Get codeVerifier and address from cookies
    const codeVerifier = request.cookies.get('twitter_code_verifier')?.value;
    const address = request.cookies.get('twitter_address')?.value;

    console.log('🍪 Cookies:', { hasCodeVerifier: !!codeVerifier, address });

    if (!codeVerifier || !address) {
      console.error('❌ Missing cookies');
      return NextResponse.redirect(new URL('/?error=twitter_auth_failed&reason=missing_cookies', request.url));
    }

    console.log('✅ Got address from cookies:', address);

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

    // Redirect back to app with success and clear cookies
    const response = NextResponse.redirect(new URL(`/?twitter_connected=${userObject.username}`, request.url));

    // Clear the temporary cookies
    response.cookies.delete('twitter_code_verifier');
    response.cookies.delete('twitter_address');

    return response;
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
