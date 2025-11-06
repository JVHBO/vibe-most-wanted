import { NextRequest, NextResponse } from 'next/server';
import { TwitterApi } from 'twitter-api-v2';
import crypto from 'crypto';
import { devLog, devError } from '@/lib/utils/logger';

const CALLBACK_URL = process.env.NEXT_PUBLIC_APP_URL
  ? `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/twitter/callback`
  : 'http://localhost:3000/api/auth/twitter/callback';

// Simple encoding function (base64 is enough for short-lived state)
function encodeState(data: any): string {
  const json = JSON.stringify(data);
  return Buffer.from(json).toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

export async function GET(request: NextRequest) {
  try {
    devLog('🔵 Twitter OAuth init started');
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');

    if (!address) {
      devError('❌ No address provided');
      return NextResponse.json({ error: 'Address required' }, { status: 400 });
    }

    devLog('✅ Address:', address);

    if (!process.env.TWITTER_CLIENT_ID || !process.env.TWITTER_CLIENT_SECRET) {
      devError('❌ Missing Twitter credentials:', {
        hasClientId: !!process.env.TWITTER_CLIENT_ID,
        hasClientSecret: !!process.env.TWITTER_CLIENT_SECRET,
      });
      return NextResponse.json({ error: 'Twitter credentials not configured' }, { status: 500 });
    }

    devLog('✅ Twitter credentials found');
    devLog('🔗 Callback URL:', CALLBACK_URL);

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

    devLog('✅ OAuth link generated');

    // Encode the state data (codeVerifier + address + timestamp)
    const stateData = { codeVerifier, address, timestamp: Date.now() };
    const encodedState = encodeState(stateData);

    devLog('✅ Encoded OAuth data');
    devLog('🔍 State data:', stateData);
    devLog('🔍 Encoded state:', encodedState);
    devLog('🔍 Encoded state length:', encodedState.length);

    // Add state to the OAuth URL
    const urlWithState = `${url}&state=${encodedState}`;

    devLog('✅ Returning auth URL');
    return NextResponse.json({ url: urlWithState });
  } catch (error: any) {
    devError('❌ Twitter OAuth init error:', error);
    devError('Error details:', {
      message: error.message,
      stack: error.stack,
    });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
