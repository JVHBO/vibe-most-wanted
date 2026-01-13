/**
 * 📊 Alchemy API Tracking Endpoint
 *
 * Receives tracking data from frontend and saves to Convex.
 * Fire-and-forget - doesn't block the UI.
 */

import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL || '');

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();

    // Validate source
    const validSources = ['vbms', 'vibefid', 'unknown'];
    const source = validSources.includes(data.source) ? data.source : 'unknown';

    // Track in Convex (fire-and-forget)
    await convex.mutation(api.alchemyTracking.trackAlchemyCall, {
      source,
      endpoint: data.endpoint || 'unknown',
      contractAddress: data.contractAddress,
      ownerAddress: data.ownerAddress,
      pageNumber: data.pageNumber,
      cached: data.cached,
      responseTime: data.responseTime,
      success: data.success,
      errorMessage: data.errorMessage,
    });

    return NextResponse.json({ tracked: true });
  } catch (error) {
    // Don't fail - tracking is best-effort
    console.error('[Alchemy Tracking] Error:', error);
    return NextResponse.json({ tracked: false }, { status: 200 });
  }
}

// GET for full dashboard
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const view = searchParams.get('view') || 'dashboard';
    const days = parseInt(searchParams.get('days') || '7');

    if (view === 'comparison') {
      // Quick comparison VBMS vs VibeFID
      const comparison = await convex.query(api.alchemyTracking.getSourceComparison, {});
      return NextResponse.json(comparison);
    }

    if (view === 'simple') {
      // Simple stats
      const stats = await convex.query(api.alchemyTracking.getAlchemyStats, { days });
      return NextResponse.json(stats);
    }

    // Full dashboard (default)
    const dashboard = await convex.query(api.alchemyTracking.getAlchemyDashboard, { days });
    return NextResponse.json(dashboard);
  } catch (error) {
    console.error('[Alchemy Tracking] Error:', error);
    return NextResponse.json({ error: 'Failed to get stats' }, { status: 500 });
  }
}
