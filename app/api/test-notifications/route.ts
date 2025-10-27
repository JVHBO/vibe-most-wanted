import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';

/**
 * API endpoint to send test notification to all users
 *
 * Call with: POST /api/test-notifications
 * Optional body: { title: "...", body: "..." }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));

    const title = body.title || '🎮 Vibe Most Wanted';
    const message = body.body || 'Notifications are working! Ready to play?';

    console.log('📢 Sending test notifications...');

    // Initialize Convex
    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

    // Get all tokens from Convex
    const tokens = await convex.query(api.notifications.getAllTokens);

    if (!tokens || tokens.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No tokens found in Convex',
        sent: 0,
      });
    }

    console.log(`📱 Found ${tokens.length} users with notifications enabled`);

    let sent = 0;
    let failed = 0;
    const results = [];

    // Send to each user
    for (const tokenData of tokens) {
      try {
        const payload = {
          notificationId: `test_${tokenData.fid}_${Date.now()}`,
          title: title.slice(0, 32),
          body: message.slice(0, 128),
          tokens: [tokenData.token],
          targetUrl: 'https://vibe-most-wanted.vercel.app',
        };

        const response = await fetch(tokenData.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          const result = await response.json();

          if (result.invalidTokens?.includes(tokenData.token)) {
            failed++;
            results.push({ fid: tokenData.fid, status: 'invalid_token' });
          } else if (result.rateLimitedTokens?.includes(tokenData.token)) {
            failed++;
            results.push({ fid: tokenData.fid, status: 'rate_limited' });
          } else {
            sent++;
            results.push({ fid: tokenData.fid, status: 'sent' });
          }
        } else {
          failed++;
          results.push({ fid: tokenData.fid, status: 'failed', error: response.statusText });
        }

        // Wait 100ms between notifications to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error: any) {
        failed++;
        results.push({ fid: tokenData.fid, status: 'error', error: error.message });
      }
    }

    console.log(`📊 Results: ${sent} sent, ${failed} failed`);

    return NextResponse.json({
      success: true,
      message: `Sent ${sent} notifications, ${failed} failed`,
      total: tokens.length,
      sent,
      failed,
      results,
    });

  } catch (error: any) {
    console.error('❌ Error sending notifications:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
