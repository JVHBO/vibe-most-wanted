import { NextRequest, NextResponse } from 'next/server';
import { TwitterApi } from 'twitter-api-v2';

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

    // Create response with cookies to store codeVerifier and address
    const response = NextResponse.json({ url });

    // Set cookies with the data we need (expires in 10 minutes)
    response.cookies.set('twitter_code_verifier', codeVerifier, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
    });

    response.cookies.set('twitter_address', address, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
    });

    console.log('✅ Returning auth URL with cookies set');
    return response;
  } catch (error: any) {
    console.error('❌ Twitter OAuth init error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
    });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
