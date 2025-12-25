'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { generateFarcasterCardImage } from '@/lib/generateFarcasterCard';
import { generateCardVideo } from '@/lib/generateCardVideo';
import { getFidTraits } from '@/lib/fidTraits';

interface CardParams {
  fid: number;
  username: string;
  displayName: string;
  pfpUrl: string;
  bio: string;
  neynarScore: number;
  followerCount: number;
  rarity: string;
  suit: string;
  rank: string;
  suitSymbol: string;
  color: string;
  power: number;
}

function RegenerateContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<string>('Waiting for parameters...');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);

  // Check if running on localhost
  const isLocalhost = typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  // Block access if not localhost
  if (!isLocalhost) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4 text-red-500">🚫 Access Denied</h1>
          <p className="text-gray-400">This page is only accessible on localhost.</p>
        </div>
      </div>
    );
  }

  // Get card params from URL
  const cardParams: CardParams | null = searchParams.get('fid') ? {
    fid: parseInt(searchParams.get('fid') || '0'),
    username: searchParams.get('username') || '',
    displayName: searchParams.get('displayName') || '',
    pfpUrl: searchParams.get('pfpUrl') || '',
    bio: searchParams.get('bio') || '',
    neynarScore: parseFloat(searchParams.get('neynarScore') || '0'),
    followerCount: parseInt(searchParams.get('followerCount') || '0'),
    rarity: searchParams.get('rarity') || 'Common',
    suit: searchParams.get('suit') || 'spades',
    rank: searchParams.get('rank') || 'A',
    suitSymbol: searchParams.get('suitSymbol') || '♠',
    color: searchParams.get('color') || 'black',
    power: parseInt(searchParams.get('power') || '10'),
  } : null;

  const generateCard = async () => {
    if (!cardParams) {
      setError('Missing card parameters in URL');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setStatus('Generating card image...');

    try {
      // Get deterministic traits for this FID
      const traits = getFidTraits(cardParams.fid);

      // Generate card image
      const cardImageDataUrl = await generateFarcasterCardImage({
        pfpUrl: cardParams.pfpUrl,
        displayName: cardParams.displayName,
        username: cardParams.username,
        fid: cardParams.fid,
        neynarScore: cardParams.neynarScore,
        rarity: cardParams.rarity,
        suit: cardParams.suit as any,
        rank: cardParams.rank as any,
        suitSymbol: cardParams.suitSymbol,
        color: cardParams.color as 'red' | 'black',
        bio: cardParams.bio,
        bounty: cardParams.power * 10,
      });

      setImageUrl(cardImageDataUrl);
      setStatus('Card image generated! Now generating video with animated PFP...');

      // Generate video with animated PFP support
      const videoBlob = await generateCardVideo({
        cardImageDataUrl,
        foilType: traits.foil as 'None' | 'Standard' | 'Prize',
        duration: 8,
        fps: 30,
        pfpUrl: cardParams.pfpUrl, // Pass PFP URL for animated GIF detection
      });

      // Create URL for video preview
      const videoObjectUrl = URL.createObjectURL(videoBlob);
      setVideoUrl(videoObjectUrl);
      setStatus('Video generated! Ready to upload.');

      // Store the blob for upload
      (window as any).__generatedVideoBlob = videoBlob;

    } catch (err: any) {
      console.error('Generation error:', err);
      setError(err.message || 'Failed to generate card');
      setStatus('Error during generation');
    } finally {
      setIsGenerating(false);
    }
  };

  const uploadToIPFS = async () => {
    const blob = (window as any).__generatedVideoBlob;
    if (!blob) {
      setError('No video to upload. Generate first.');
      return;
    }

    setStatus('Uploading to IPFS via Filebase...');

    try {
      const formData = new FormData();
      formData.append('video', blob, 'card.mp4');

      const response = await fetch('/api/upload-nft-video', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed');
      }

      setUploadedUrl(result.ipfsUrl);
      setStatus(`Uploaded! IPFS URL: ${result.ipfsUrl}`);

      // Expose for Playwright to read
      (window as any).__uploadedIpfsUrl = result.ipfsUrl;

    } catch (err: any) {
      setError(err.message || 'Upload failed');
      setStatus('Upload error');
    }
  };

  // Auto-start if autoGenerate param is present
  useEffect(() => {
    if (searchParams.get('autoGenerate') === 'true' && cardParams && !isGenerating) {
      generateCard();
    }
  }, [searchParams]);

  // Auto-upload if autoUpload param is present and video is ready
  useEffect(() => {
    if (searchParams.get('autoUpload') === 'true' && videoUrl && !uploadedUrl) {
      uploadToIPFS();
    }
  }, [videoUrl]);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-3xl font-bold mb-8">VibeFID Card Regeneration (Admin)</h1>

      {/* Status */}
      <div className="mb-6 p-4 bg-gray-800 rounded-lg">
        <p className="text-lg">
          <span className="text-yellow-400">Status:</span> {status}
        </p>
        {error && <p className="text-red-400 mt-2">Error: {error}</p>}
      </div>

      {/* Card Parameters */}
      {cardParams && (
        <div className="mb-6 p-4 bg-gray-800 rounded-lg">
          <h2 className="text-xl font-bold mb-2">Card Parameters</h2>
          <pre className="text-sm overflow-auto">
            {JSON.stringify(cardParams, null, 2)}
          </pre>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-4 mb-8">
        <button
          onClick={generateCard}
          disabled={isGenerating || !cardParams}
          className="px-6 py-3 bg-yellow-500 text-black font-bold rounded-lg hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGenerating ? 'Generating...' : 'Generate Card & Video'}
        </button>

        <button
          onClick={uploadToIPFS}
          disabled={!videoUrl}
          className="px-6 py-3 bg-green-500 text-black font-bold rounded-lg hover:bg-green-400 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Upload to IPFS
        </button>
      </div>

      {/* Preview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Card Image */}
        {imageUrl && (
          <div>
            <h3 className="text-xl font-bold mb-2">Card Image</h3>
            <img src={imageUrl} alt="Generated card" className="max-w-full h-auto rounded-lg" />
          </div>
        )}

        {/* Video */}
        {videoUrl && (
          <div>
            <h3 className="text-xl font-bold mb-2">Generated Video (with animated PFP)</h3>
            <video
              src={videoUrl}
              autoPlay
              loop
              muted
              playsInline
              className="max-w-full h-auto rounded-lg"
              controls
            />
          </div>
        )}
      </div>

      {/* Uploaded URL */}
      {uploadedUrl && (
        <div className="mt-8 p-4 bg-green-900 rounded-lg">
          <h3 className="text-xl font-bold mb-2">Uploaded IPFS URL</h3>
          <code id="ipfsUrl" className="text-sm break-all text-green-300">
            {uploadedUrl}
          </code>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-8 p-4 bg-gray-800 rounded-lg text-sm">
        <h3 className="text-lg font-bold mb-2">Usage</h3>
        <p>Add parameters to URL:</p>
        <code className="block mt-2 text-xs bg-gray-700 p-2 rounded overflow-auto">
          /admin/regenerate?fid=249478&username=maximleader.eth&displayName=Maximbase&pfpUrl=...&autoGenerate=true&autoUpload=true
        </code>
      </div>
    </div>
  );
}

export default function RegeneratePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-900 text-white p-8">Loading...</div>}>
      <RegenerateContent />
    </Suspense>
  );
}
