import { NextRequest, NextResponse } from 'next/server';
import { TwitterApi } from 'twitter-api-v2';
import crypto from 'crypto';

const CALLBACK_URL = process.env.NEXT_PUBLIC_APP_URL
  ? `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/twitter/callback`
  : 'http://localhost:3000/api/auth/twitter/callback';

// Encryption key from env (must be 32 bytes)
const ENCRYPTION_KEY = process.env.TWITTER_ENCRYPTION_KEY || 'default-key-please-change-this!!';
const ENCRYPTION_IV_LENGTH = 16;

function encrypt(text: string): string {
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
  const iv = crypto.randomBytes(ENCRYPTION_IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

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

    // Encrypt the sensitive data (codeVerifier + address)
    const dataToEncrypt = JSON.stringify({ codeVerifier, address, timestamp: Date.now() });
    const encryptedState = encrypt(dataToEncrypt);

    // Use base64url encoding instead (URL-safe, no special chars)
    const base64State = Buffer.from(encryptedState).toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    console.log('✅ Encrypted OAuth data');

    // Add encrypted state to the OAuth URL
    const urlWithState = `${url}&state=${base64State}`;

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
