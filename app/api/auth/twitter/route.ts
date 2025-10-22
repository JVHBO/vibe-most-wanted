import { NextRequest, NextResponse } from 'next/server';
import { TwitterApi } from 'twitter-api-v2';
import { nanoid } from 'nanoid';
import { TwitterOAuthStore } from '@/lib/twitter-oauth-store';

const CALLBACK_URL = process.env.NEXT_PUBLIC_APP_URL
  ? `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/twitter/callback`
  : 'http://localhost:3000/api/auth/twitter/callback';

export async function GET(request: NextRequest) {
  try {
    console.log('🔵 Twitter OAuth init started');
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');

    if (!address) {
      console.error('❌ No address provided');
      return NextResponse.json({ error: 'Address required' }, { status: 400 });
    }

    console.log('✅ Address:', address);

    if (!process.env.TWITTER_CLIENT_ID || !process.env.TWITTER_CLIENT_SECRET) {
      console.error('❌ Missing Twitter credentials:', {
        hasClientId: !!process.env.TWITTER_CLIENT_ID,
        hasClientSecret: !!process.env.TWITTER_CLIENT_SECRET,
      });
      return NextResponse.json({ error: 'Twitter credentials not configured' }, { status: 500 });
    }

    console.log('✅ Twitter credentials found');
    console.log('🔗 Callback URL:', CALLBACK_URL);

    const client = new TwitterApi({
      clientId: process.env.TWITTER_CLIENT_ID,
      clientSecret: process.env.TWITTER_CLIENT_SECRET,
    });

    const { url, codeVerifier, state } = client.generateOAuth2AuthLink(
      CALLBACK_URL,
      {
        scope: ['tweet.read', 'users.read'],
      }
    );

    console.log('✅ OAuth link generated');

    // Generate a unique state ID to store in memory
    const stateId = nanoid();

    // Store codeVerifier and address with the stateId
    TwitterOAuthStore.set(stateId, codeVerifier, address);
    console.log('✅ Stored OAuth data with ID:', stateId);

    // Add stateId to the OAuth URL
    const urlWithState = `${url}&state=${stateId}`;

    console.log('✅ Returning auth URL');
    return NextResponse.json({ url: urlWithState });
  } catch (error: any) {
    console.error('❌ Twitter OAuth init error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
    });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
