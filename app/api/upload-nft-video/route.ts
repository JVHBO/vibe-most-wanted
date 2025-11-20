import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * Upload NFT video to Filebase IPFS via S3-compatible API
 *
 * Expects:
 * - FormData with 'video' field containing video blob
 *
 * Returns:
 * - { ipfsUrl: string, cid: string }
 */
export async function POST(request: NextRequest) {
  try {
    const accessKey = process.env.FILEBASE_ACCESS_KEY;
    const secretKey = process.env.FILEBASE_SECRET_KEY;
    const bucketName = process.env.FILEBASE_BUCKET_NAME || 'vibefid';

    if (!accessKey || !secretKey) {
      return NextResponse.json(
        { error: 'Filebase credentials not configured' },
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

    // Convert blob to buffer
    const arrayBuffer = await videoBlob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Configure S3 client for Filebase
    const s3Client = new S3Client({
      endpoint: 'https://s3.filebase.com',
      region: 'us-east-1',
      credentials: {
        accessKeyId: accessKey,
        secretAccessKey: secretKey,
      },
      forcePathStyle: true, // Required for Filebase
    });

    // Generate unique filename
    const timestamp = Date.now();
    const filename = `card-${timestamp}.mp4`;

    // Upload to Filebase S3 bucket (automatically pins to IPFS)
    const uploadCommand = new PutObjectCommand({
      Bucket: bucketName,
      Key: filename,
      Body: buffer,
      ContentType: 'video/mp4',
    });

    await s3Client.send(uploadCommand);

    // Get CID from object metadata
    const headCommand = new HeadObjectCommand({
      Bucket: bucketName,
      Key: filename,
    });

    const headResult = await s3Client.send(headCommand);
    const cid = headResult.Metadata?.cid;

    if (!cid) {
      throw new Error('Failed to retrieve CID from uploaded file');
    }

    // Use standard ipfs.io gateway with .mp4 extension
    // Extension allows CardMedia component to detect it as video
    const ipfsUrl = `https://ipfs.io/ipfs/${cid}?filename=card.mp4`;

    console.log(`✅ Video uploaded to IPFS via Filebase, CID: ${cid}`);
    console.log(`   IPFS URL: ${ipfsUrl}`);

    return NextResponse.json({
      ipfsUrl,
      cid,
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
