import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';
import { devLog, devError } from '@/lib/utils/logger';

/**
 * API endpoint to send test notification
 *
 * Call with: POST /api/test-notifications
 * Optional body: { title: "...", body: "...", fid: "123456" }
 * If fid is provided, sends only to that user. Otherwise sends to all.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));

    const title = body.title || '🎮 $VBMS';
    const message = body.body || 'Notifications are working! Ready to play?';
    const targetFid = body.fid; // Optional: send only to this FID

    devLog('📢 Sending test notifications...', targetFid ? `to FID ${targetFid}` : 'to all');

    // Initialize Convex
    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

    // Get tokens - either single user or all
    let tokens;
    if (targetFid) {
      const singleToken = await convex.query(api.notifications.getTokenByFid, { fid: String(targetFid) });
      tokens = singleToken ? [singleToken] : [];
    } else {
      tokens = await convex.query(api.notifications.getAllTokens);
    }

    if (!tokens || tokens.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No tokens found in Convex',
        sent: 0,
      });
    }

    devLog(`📱 Found ${tokens.length} users with notifications enabled`);

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
          targetUrl: 'https://vibemostwanted.xyz',
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

    devLog(`📊 Results: ${sent} sent, ${failed} failed`);

    return NextResponse.json({
      success: true,
      message: `Sent ${sent} notifications, ${failed} failed`,
      total: tokens.length,
      sent,
      failed,
      results,
    });

  } catch (error: any) {
    devError('❌ Error sending notifications:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
