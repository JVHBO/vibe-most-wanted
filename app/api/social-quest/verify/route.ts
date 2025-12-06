/**
 * Social Quest Verification API
 *
 * Verifies if user has completed a social quest using Neynar API
 * - Follow: Check if user follows target FID
 * - Channel: Auto-verified (API requires paid plan)
 */

import { NextRequest, NextResponse } from 'next/server';
import { SOCIAL_QUESTS } from '@/lib/socialQuests';

const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY || process.env.NEXT_PUBLIC_NEYNAR_API_KEY;
const NEYNAR_API_BASE = 'https://api.neynar.com/v2';

interface VerifyRequest {
  questId: string;
  userFid: number;
}

/**
 * Check if user follows target FID
 */
async function checkFollow(userFid: number, targetFid: number): Promise<boolean> {
  if (!NEYNAR_API_KEY) {
    throw new Error('NEYNAR_API_KEY not configured');
  }

  try {
    // Use the "user bulk" endpoint with viewer_fid to check following status
    const response = await fetch(
      `${NEYNAR_API_BASE}/farcaster/user/bulk?fids=${targetFid}&viewer_fid=${userFid}`,
      {
        headers: {
          'accept': 'application/json',
          'api_key': NEYNAR_API_KEY,
        },
      }
    );

    if (!response.ok) {
      console.error(`Neynar API error: ${response.status}`);
      return false;
    }

    const data = await response.json();

    if (!data.users || data.users.length === 0) {
      return false;
    }

    // Check if viewer (userFid) follows the target
    const targetUser = data.users[0];
    return targetUser.viewer_context?.following === true;
  } catch (error) {
    console.error('Error checking follow:', error);
    return false;
  }
}

/**
 * Check if user is member of channel
 * NOTE: Neynar channel membership API requires paid plan
 * Auto-verify channel quests (trust-based) until we upgrade
 */
function checkChannelMembership(): boolean {
  // Channel membership API is paid on Neynar
  // Auto-complete channel quests for now (trust-based)
  return true;
}

export async function POST(request: NextRequest) {
  try {
    const body: VerifyRequest = await request.json();
    const { questId, userFid } = body;

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

    let completed = false;

    if (quest.type === 'follow' && quest.targetFid) {
      completed = await checkFollow(userFid, quest.targetFid);
    } else if (quest.type === 'channel') {
      // Auto-verify channel quests (Neynar API is paid)
      completed = checkChannelMembership();
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
