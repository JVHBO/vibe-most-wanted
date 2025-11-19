import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * Upload NFT video to NFT.Storage (IPFS)
 *
 * Expects:
 * - FormData with 'video' field containing video blob
 *
 * Returns:
 * - { ipfsUrl: string, cid: string }
 */
export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.NFT_STORAGE_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'NFT.Storage API key not configured' },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const videoBlob = formData.get('video') as Blob;

    if (!videoBlob) {
      return NextResponse.json(
        { error: 'No video file provided' },
        { status: 400 }
      );
    }

    // Upload to NFT.Storage
    const nftStorageFormData = new FormData();
    nftStorageFormData.append('file', videoBlob, 'card.mp4');

    const uploadResponse = await fetch('https://api.nft.storage/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      body: nftStorageFormData,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('NFT.Storage upload failed:', errorText);
      return NextResponse.json(
        { error: 'Failed to upload to NFT.Storage', details: errorText },
        { status: uploadResponse.status }
      );
    }

    const uploadResult = await uploadResponse.json();
    const cid = uploadResult.value.cid;
    const ipfsUrl = `https://nftstorage.link/ipfs/${cid}`;

    console.log(`✅ Video uploaded to IPFS: ${ipfsUrl}`);

    return NextResponse.json({
      ipfsUrl,
      cid,
      success: true,
    });

  } catch (error: any) {
    console.error('Error uploading to NFT.Storage:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
