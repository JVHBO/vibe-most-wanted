import { NextRequest, NextResponse } from 'next/server';
import { TwitterApi } from 'twitter-api-v2';
import { ProfileService } from '@/lib/firebase';
import crypto from 'crypto';

const CALLBACK_URL = process.env.NEXT_PUBLIC_APP_URL
  ? `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/twitter/callback`
  : 'http://localhost:3000/api/auth/twitter/callback';

// Encryption key from env (must match the one in route.ts)
const ENCRYPTION_KEY = process.env.TWITTER_ENCRYPTION_KEY || 'default-key-please-change-this!!';

function decrypt(encryptedText: string): string {
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
  const parts = encryptedText.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = parts[1];
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
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

    // Decrypt the state to get codeVerifier and address
    let codeVerifier: string;
    let address: string;

    try {
      // Decode from base64url (URL-safe base64)
      const base64 = state
        .replace(/-/g, '+')
        .replace(/_/g, '/');

      // Add padding if needed
      const padding = '='.repeat((4 - (base64.length % 4)) % 4);
      const encryptedState = Buffer.from(base64 + padding, 'base64').toString();
      console.log('✅ Decoded base64url state');

      const decryptedState = decrypt(encryptedState);
      console.log('✅ Decrypted state');

      const { codeVerifier: cv, address: addr, timestamp } = JSON.parse(decryptedState);
      codeVerifier = cv;
      address = addr;

      // Check if token is expired (older than 10 minutes)
      const age = Date.now() - timestamp;
      if (age > 10 * 60 * 1000) {
        console.error('❌ OAuth state expired:', age / 1000, 'seconds old');
        return NextResponse.redirect(new URL('/?error=twitter_auth_failed&reason=state_expired', request.url));
      }

      console.log('✅ Got address from state:', address);
    } catch (error) {
      console.error('❌ Failed to decrypt state:', error);
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

    // Save Twitter handle to Firebase
    console.log('💾 Saving to Firebase...');
    await ProfileService.updateTwitter(address, userObject.username);
    console.log('✅ Saved to Firebase');

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
