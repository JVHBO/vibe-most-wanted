import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/lib/fid/convex-generated/api';
import { generateCardImageServer } from '@/lib/fid/generateCardServer';
import { uploadToFilebase } from '@/lib/fid/filebase';

export const runtime = 'nodejs';
export const maxDuration = 60;

const VIBEFID_CONVEX_URL =
  process.env.NEXT_PUBLIC_VIBEFID_CONVEX_URL ||
  'https://scintillating-mandrill-101.convex.cloud';

/**
 * POST /api/fid/regenerate-card
 *
 * Server-side card image regeneration for VibeFID cards.
 * Generates PNG, uploads to Filebase/IPFS, updates Convex.
 *
 * Body: { fid: number, secret?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fid, secret } = body;

    if (!fid || typeof fid !== 'number') {
      return NextResponse.json({ error: 'Missing or invalid fid (must be number)' }, { status: 400 });
    }

    // Optional auth - if ADMIN_REGENERATE_KEY is set, require it
    const adminKey = process.env.ADMIN_REGENERATE_KEY;
    if (adminKey && secret !== adminKey) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Fetch card data from VibeFID Convex
    const convex = new ConvexHttpClient(VIBEFID_CONVEX_URL);
    const card = await convex.query(api.farcasterCards.getFarcasterCardByFid, { fid });

    if (!card) {
      return NextResponse.json({ error: `Card not found for FID ${fid}` }, { status: 404 });
    }

    console.log(`🎨 Regenerating card image for FID ${fid} (${card.displayName})`);

    // 2. Generate PNG server-side
    const pngBuffer = await generateCardImageServer({
      fid: card.fid,
      username: card.username,
      displayName: card.displayName,
      pfpUrl: card.pfpUrl,
      neynarScore: card.neynarScore,
      suit: card.suit,
      suitSymbol: card.suitSymbol,
      rank: card.rank,
      color: card.color,
      power: card.power,
    });

    console.log(`✅ PNG generated: ${pngBuffer.length} bytes`);

    // 3. Upload to Filebase/IPFS
    const filename = `card-${fid}-${Date.now()}.png`;
    const uploadResult = await uploadToFilebase(pngBuffer, filename, 'image/png');

    if (!uploadResult) {
      throw new Error('Failed to upload to Filebase');
    }

    console.log(`✅ Uploaded to IPFS: ${uploadResult.ipfsUrl}`);

    // 4. Update Convex with new image URLs
    // Use cardImageUrl for PNG and imageUrl (normally video) also set to PNG
    await convex.mutation(api.farcasterCards.updateCardImages, {
      fid,
      cardImageUrl: uploadResult.ipfsUrl,
      imageUrl: uploadResult.ipfsUrl, // Use PNG as fallback for video too
    });

    console.log(`✅ Convex updated for FID ${fid}`);

    return NextResponse.json({
      success: true,
      fid,
      cardImageUrl: uploadResult.ipfsUrl,
      imageUrl: uploadResult.ipfsUrl,
      cid: uploadResult.cid,
      message: `Card image regenerated for FID ${fid}`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('❌ Regenerate card error:', message);
    return NextResponse.json(
      { error: 'Failed to regenerate card', details: message },
      { status: 500 }
    );
  }
}
