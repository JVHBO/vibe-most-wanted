/**
 * Social Quest SDK Verification API
 *
 * Marks SDK quests (notification, miniapp) as completed
 * These are verified by the Farcaster SDK on the client
 *
 * 🔒 SECURITY: Only accepts specific SDK quest types
 * The frontend can no longer call markQuestCompleted directly (internalMutation)
 */

import { NextRequest, NextResponse } from 'next/server';
import { SOCIAL_QUESTS } from '@/lib/socialQuests';
import { ConvexHttpClient } from 'convex/browser';
import { internal } from '@/convex/_generated/api';

// Convex client for internal mutations
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// Only allow these quest types through this endpoint
const ALLOWED_SDK_TYPES = ['notification', 'miniapp'];

interface VerifySDKRequest {
  questId: string;
  address: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: VerifySDKRequest = await request.json();
    const { questId, address } = body;

    if (!questId || !address) {
      return NextResponse.json(
        { error: 'Missing questId or address' },
        { status: 400 }
      );
    }

    // Find quest and verify it's an SDK quest type
    const quest = SOCIAL_QUESTS.find(q => q.id === questId);
    if (!quest) {
      return NextResponse.json(
        { error: 'Quest not found' },
        { status: 404 }
      );
    }

    // 🔒 SECURITY: Only allow SDK quest types through this endpoint
    if (!ALLOWED_SDK_TYPES.includes(quest.type)) {
      return NextResponse.json(
        { error: 'Invalid quest type for SDK verification' },
        { status: 400 }
      );
    }

    // Mark quest as completed
    try {
      await convex.mutation(internal.socialQuests.markQuestCompleted, {
        address,
        questId,
      });
      console.log(`✅ SDK Quest ${questId} marked completed for ${address}`);
    } catch (err) {
      console.error(`Failed to mark SDK quest ${questId} completed:`, err);
      return NextResponse.json(
        { error: 'Failed to mark quest completed' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      questId,
      completed: true,
    });
  } catch (error) {
    console.error('Error verifying SDK quest:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
