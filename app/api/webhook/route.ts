import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { event, data } = body;

    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL_PROD || process.env.NEXT_PUBLIC_CONVEX_URL!;
    const convex = new ConvexHttpClient(convexUrl);

    if ((event === 'miniapp_added' || event === 'notifications_enabled') && data?.fid && data?.notificationDetails) {
      const { token, url } = data.notificationDetails;
      await convex.mutation(api.notifications.saveToken, {
        fid: data.fid,
        token,
        url,
      });
      console.log(`✅ Token saved for FID ${data.fid}`);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('❌ Webhook error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
