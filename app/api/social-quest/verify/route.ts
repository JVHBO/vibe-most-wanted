/**
 * Social Quest Verification API
 *
 * Verifies if user has completed a social quest using Neynar API
 * - Follow: Check if user follows target FID
 * - Channel: Auto-verified (API requires paid plan)
 *
 * 🔒 SECURITY: This API now marks quest as completed after verification
 * Uses verifyAndCompleteQuest action which does verification server-side
 */

import { NextRequest, NextResponse } from 'next/server';
import { SOCIAL_QUESTS } from '@/lib/socialQuests';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';

// Convex client for actions
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

interface VerifyRequest {
  questId: string;
  userFid: number;
  address?: string; // Player's wallet address to mark quest as completed
}

export async function POST(request: NextRequest) {
  try {
    const body: VerifyRequest = await request.json();
    const { questId, userFid, address } = body;

    if (!questId || !userFid) {
      return NextResponse.json(
        { error: 'Missing questId or userFid' },
        { status: 400 }
      );
    }

    // Find quest
    const quest = SOCIAL_QUESTS.find(q => q.id === questId);
    if (!quest) {
      return NextResponse.json(
        { error: 'Quest not found' },
        { status: 404 }
      );
    }

    // Only allow follow/channel quests through this endpoint
    if (quest.type !== 'follow' && quest.type !== 'channel') {
      return NextResponse.json(
        { error: 'Invalid quest type for this endpoint' },
        { status: 400 }
      );
    }

    let completed = false;

    if (address) {
      // Use the Convex action which does verification AND marks complete
      try {
        const result = await convex.action(api.socialQuests.verifyAndCompleteQuest, {
          address,
          questId,
          userFid,
        });
        completed = result.completed;
        if (completed) {
          console.log(`✅ Quest ${questId} verified and marked completed for ${address}`);
        }
      } catch (err) {
        console.error(`Failed to verify quest ${questId}:`, err);
        // Return false so user can retry
        completed = false;
      }
    }

    return NextResponse.json({
      questId,
      completed,
      quest: {
        displayName: quest.displayName,
        reward: quest.reward,
        url: quest.url,
      },
    });
  } catch (error) {
    console.error('Error verifying quest:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
