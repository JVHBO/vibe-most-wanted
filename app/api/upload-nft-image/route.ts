import { NextRequest, NextResponse } from 'next/server';
import { uploadToFilebase } from '@/lib/filebase';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * Upload NFT image to Filebase IPFS via S3-compatible API
 * 🚀 BANDWIDTH FIX: Uses singleton S3Client
 *
 * Expects:
 * - FormData with 'image' field containing PNG blob
 *
 * Returns:
 * - { ipfsUrl: string, cid: string }
 */
export async function POST(request: NextRequest) {
  try {
    let buffer: Buffer;
    let filename: string;

    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      // Handle JSON with base64 data
      const json = await request.json();
      const { imageData, filename: providedFilename } = json;

      if (!imageData) {
        return NextResponse.json(
          { error: 'No imageData provided' },
          { status: 400 }
        );
      }

      // Extract base64 data (remove data:image/png;base64, prefix if present)
      const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
      buffer = Buffer.from(base64Data, 'base64');
      filename = providedFilename || `card-${Date.now()}.png`;

    } else {
      // Handle FormData (legacy)
      const formData = await request.formData();
      const imageBlob = formData.get('image') as Blob;

      if (!imageBlob) {
        return NextResponse.json(
          { error: 'No image file provided' },
          { status: 400 }
        );
      }

      // Convert blob to buffer
      const arrayBuffer = await imageBlob.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
      filename = `card-${Date.now()}.png`;
    }

    // 🚀 BANDWIDTH FIX: Use singleton S3 client
    const result = await uploadToFilebase(buffer, filename, 'image/png');

    if (!result) {
      throw new Error('Upload failed');
    }

    console.log(`✅ Image uploaded to IPFS via Filebase, CID: ${result.cid}`);

    return NextResponse.json({
      ipfsUrl: result.ipfsUrl,
      imageUrl: result.ipfsUrl, // Alias for client compatibility
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
