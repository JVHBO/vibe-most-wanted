import { NextRequest, NextResponse } from 'next/server';
import { NeynarAPIClient } from '@neynar/nodejs-sdk';

/**
 * API endpoint to send test notification via Neynar
 *
 * Call with: POST /api/test-notifications
 * Body: { title?: "...", body?: "...", fid?: "123456" }
 * If fid is provided, sends only to that user. Otherwise sends to all.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));

    const title = body.title || '🎮 $VBMS';
    const message = body.body || 'Notifications are working! Ready to play?';
    const targetFid = body.fid ? Number(body.fid) : undefined;

    console.log('📢 Sending test notification via Neynar...', targetFid ? `to FID ${targetFid}` : 'to all');

    // Initialize Neynar client
    const apiKey = process.env.NEYNAR_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'NEYNAR_API_KEY not configured',
      }, { status: 500 });
    }

    const client = new NeynarAPIClient({ apiKey });

    // Send notification via Neynar
    const response = await client.publishFrameNotifications({
      targetFids: targetFid ? [targetFid] : [], // Empty = all users who enabled notifications
      notification: {
        title: title.slice(0, 32),
        body: message.slice(0, 128),
        targetUrl: 'https://vibemostwanted.xyz',
      },
    });

    console.log('📊 Neynar response:', JSON.stringify(response));

    return NextResponse.json({
      success: true,
      message: 'Notification sent via Neynar',
      response,
    });

  } catch (error: any) {
    console.error('❌ Error sending notification:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
