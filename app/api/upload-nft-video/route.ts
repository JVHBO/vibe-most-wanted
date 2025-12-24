import { NextRequest, NextResponse } from 'next/server';
import { uploadToFilebase } from '@/lib/filebase';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * Upload NFT video to Filebase IPFS via S3-compatible API
 * 🚀 BANDWIDTH FIX: Uses singleton S3Client
 *
 * Expects:
 * - FormData with 'video' field containing video blob
 *
 * Returns:
 * - { ipfsUrl: string, cid: string }
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const videoBlob = formData.get('video') as Blob;

    if (!videoBlob) {
      return NextResponse.json(
        { error: 'No video file provided' },
        { status: 400 }
      );
    }

    // Convert blob to buffer
    const arrayBuffer = await videoBlob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Generate unique filename (WebM format)
    const timestamp = Date.now();
    const filename = `card-${timestamp}.webm`;

    // 🚀 BANDWIDTH FIX: Use singleton S3 client
    const result = await uploadToFilebase(buffer, filename, 'video/webm');

    if (!result) {
      throw new Error('Upload failed');
    }

    console.log(`✅ Video uploaded to IPFS via Filebase, CID: ${result.cid}`);
    console.log(`   IPFS URL: ${result.ipfsUrl}`);

    return NextResponse.json({
      ipfsUrl: result.ipfsUrl,
      cid: result.cid,
      success: true,
    });

  } catch (error: any) {
    console.error('Error uploading to Filebase:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
