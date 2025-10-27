import { NextRequest, NextResponse } from 'next/server';
import { database } from '@/lib/firebase-admin';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';

/**
 * API endpoint to migrate notification tokens from Firebase to Convex
 *
 * Call with: POST /api/migrate-notifications
 */
export async function POST(request: NextRequest) {
  try {
    console.log('📦 Starting migration of notification tokens...');

    // Initialize Convex
    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

    // 1. Get all tokens from Firebase
    console.log('🔍 Fetching tokens from Firebase...');
    const snapshot = await database.ref('notificationTokens').once('value');
    const firebaseTokens = snapshot.val();

    if (!firebaseTokens) {
      return NextResponse.json({
        success: true,
        message: 'No tokens found in Firebase',
        migrated: 0,
      });
    }

    // Convert Firebase object to array
    const tokensArray = Object.entries(firebaseTokens).map(([fid, data]: [string, any]) => ({
      fid,
      token: data.token,
      url: data.url,
      createdAt: data.updatedAt || Date.now(),
    }));

    console.log(`✅ Found ${tokensArray.length} tokens in Firebase`);

    // 2. Import to Convex
    console.log('📥 Importing tokens to Convex...');
    const result = await convex.mutation(api.notifications.importTokens, {
      tokens: tokensArray,
    });

    console.log(`✅ Migration complete! Imported: ${result.imported}, Updated: ${result.updated}`);

    return NextResponse.json({
      success: true,
      message: 'Migration completed successfully',
      imported: result.imported,
      updated: result.updated,
      total: tokensArray.length,
    });

  } catch (error: any) {
    console.error('❌ Migration error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
