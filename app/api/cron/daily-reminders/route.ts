/**
 * Daily Reminders Cron Job
 *
 * Runs every 24 hours after first login to remind players to claim daily bonus
 * Simple version: Just logs for now, will send notifications in Phase 2
 */

export const runtime = 'edge';

export async function GET(request: Request) {
  try {
    // Verify cron secret (Vercel automatically adds this header)
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new Response('Unauthorized', { status: 401 });
    }

    // For now, just log that cron ran successfully
    // In Phase 2, we'll query Convex for players and send Farcaster notifications
    console.log('🔔 Daily reminders cron executed at:', new Date().toISOString());
    console.log('📊 This will send notifications to players who haven\'t claimed daily bonus');

    return new Response(JSON.stringify({
      success: true,
      message: 'Daily reminders cron executed',
      timestamp: new Date().toISOString(),
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('❌ Error in daily reminders cron:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
