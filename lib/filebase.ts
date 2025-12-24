/**
 * Filebase S3 Client Singleton
 *
 * 🚀 BANDWIDTH FIX: Reuse S3Client across requests in the same runtime instance
 * Avoids recreating the client and TCP connections on each request
 */
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';

// ═══════════════════════════════════════════════════════════════════════════════
// SINGLETON S3 CLIENT
// ═══════════════════════════════════════════════════════════════════════════════

let s3ClientInstance: S3Client | null = null;

/**
 * Get the Filebase S3 client singleton
 * Creates client on first call, reuses on subsequent calls within same runtime
 */
export function getFilebaseClient(): S3Client | null {
  const accessKey = process.env.FILEBASE_ACCESS_KEY;
  const secretKey = process.env.FILEBASE_SECRET_KEY;

  if (!accessKey || !secretKey) {
    console.error('Filebase credentials not configured');
    return null;
  }

  if (!s3ClientInstance) {
    s3ClientInstance = new S3Client({
      endpoint: 'https://s3.filebase.com',
      region: 'us-east-1',
      credentials: {
        accessKeyId: accessKey,
        secretAccessKey: secretKey,
      },
      forcePathStyle: true, // Required for Filebase
    });
    console.log('🚀 Created new Filebase S3 client instance');
  }

  return s3ClientInstance;
}

/**
 * Get default bucket name
 */
export function getFilebaseBucket(): string {
  return process.env.FILEBASE_BUCKET_NAME || 'vibefid';
}

/**
 * Upload a file to Filebase and get its IPFS CID
 */
export async function uploadToFilebase(
  buffer: Buffer,
  filename: string,
  contentType: string
): Promise<{ ipfsUrl: string; cid: string } | null> {
  const s3Client = getFilebaseClient();
  const bucketName = getFilebaseBucket();

  if (!s3Client) {
    throw new Error('Filebase credentials not configured');
  }

  // Upload to Filebase S3 bucket (automatically pins to IPFS)
  const uploadCommand = new PutObjectCommand({
    Bucket: bucketName,
    Key: filename,
    Body: buffer,
    ContentType: contentType,
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

  // Use Filebase gateway - faster since file is hosted there
  const ipfsUrl = `https://ipfs.filebase.io/ipfs/${cid}`;

  return { ipfsUrl, cid };
}

// Re-export for convenience
export { PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
