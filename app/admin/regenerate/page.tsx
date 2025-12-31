'use client';

import { useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { generateFarcasterCardImage } from '@/lib/generateFarcasterCard';
import { generateCardVideo } from '@/lib/generateCardVideo';

export default function RegeneratePage() {
  const [fid, setFid] = useState('558987');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const card = useQuery(api.farcasterCards.getFarcasterCardByFid,
    fid ? { fid: parseInt(fid) } : 'skip'
  );
  const updateCardImages = useMutation(api.farcasterCards.updateCardImages);

  const handleRegenerate = async () => {
    if (!card) {
      setStatus('Card not found');
      return;
    }

    setLoading(true);
    setStatus('Starting regeneration...');

    try {
      // Step 1: Generate card image
      setStatus('Generating card image...');
      const bounty = card.power * 10;

      const cardImageDataUrl = await generateFarcasterCardImage({
        pfpUrl: card.pfpUrl,
        displayName: card.displayName,
        username: card.username,
        fid: card.fid,
        neynarScore: card.neynarScore,
        rarity: card.rarity,
        suit: card.suit as any,
        rank: card.rank as any,
        suitSymbol: card.suitSymbol,
        color: card.color as 'red' | 'black',
        bio: card.bio || '',
        bounty,
      });

      // Step 2: Upload static PNG
      setStatus('Uploading card PNG to IPFS...');
      const cardPngBlob = await fetch(cardImageDataUrl).then(r => r.blob());
      const pngFormData = new FormData();
      pngFormData.append('image', cardPngBlob, `card-${card.fid}.png`);

      const pngUploadResponse = await fetch('/api/upload-nft-image', {
        method: 'POST',
        body: pngFormData,
      });

      if (!pngUploadResponse.ok) {
        throw new Error('Failed to upload card image');
      }

      const { ipfsUrl: cardImageIpfsUrl } = await pngUploadResponse.json();
      setStatus(`Card PNG uploaded: ${cardImageIpfsUrl}`);

      // Step 3: Generate video with foil
      setStatus('Generating video with foil effect...');
      const videoBlob = await generateCardVideo({
        cardImageDataUrl,
        foilType: (card.foil || 'None') as 'None' | 'Standard' | 'Prize',
        pfpUrl: card.pfpUrl,
      });

      // Step 4: Upload video
      setStatus('Uploading video to IPFS...');
      const videoFormData = new FormData();
      videoFormData.append('video', videoBlob, `card-${card.fid}.webm`);

      const videoUploadResponse = await fetch('/api/upload-nft-video', {
        method: 'POST',
        body: videoFormData,
      });

      if (!videoUploadResponse.ok) {
        throw new Error('Failed to upload video');
      }

      const { ipfsUrl: videoIpfsUrl } = await videoUploadResponse.json();
      setStatus(`Video uploaded: ${videoIpfsUrl}`);

      // Step 5: Update Convex
      setStatus('Updating card in database...');
      await updateCardImages({
        fid: card.fid,
        imageUrl: videoIpfsUrl,
        cardImageUrl: cardImageIpfsUrl,
      });

      // Step 6: Refresh OpenSea
      setStatus('Refreshing OpenSea metadata...');
      await fetch('/api/opensea/refresh-metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fid: card.fid }),
      });

      setStatus(`SUCCESS! Card regenerated.
Video: ${videoIpfsUrl}
PNG: ${cardImageIpfsUrl}`);

    } catch (error: any) {
      setStatus(`ERROR: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-3xl font-bold mb-8">Admin: Regenerate Card</h1>

      <div className="max-w-xl space-y-4">
        <div>
          <label className="block mb-2">FID:</label>
          <input
            type="text"
            value={fid}
            onChange={(e) => setFid(e.target.value)}
            className="w-full p-2 bg-gray-800 border border-gray-600 rounded"
          />
        </div>

        {card && (
          <div className="p-4 bg-gray-800 rounded">
            <h2 className="text-xl font-bold mb-2">Card Found:</h2>
            <p>Username: @{card.username}</p>
            <p>Display Name: {card.displayName}</p>
            <p>Rarity: {card.rarity}</p>
            <p>Card: {card.rank}{card.suitSymbol}</p>
            <p>Foil: {card.foil}</p>
            <p>Power: {card.power}</p>
            <p>Current imageUrl: {card.imageUrl || '(empty)'}</p>
            <p>Current cardImageUrl: {card.cardImageUrl || '(empty)'}</p>
          </div>
        )}

        <button
          onClick={handleRegenerate}
          disabled={loading || !card}
          className="w-full p-4 bg-yellow-600 hover:bg-yellow-500 disabled:bg-gray-600 rounded font-bold"
        >
          {loading ? 'Processing...' : 'Regenerate Card Video'}
        </button>

        {status && (
          <pre className="p-4 bg-gray-800 rounded whitespace-pre-wrap text-sm">
            {status}
          </pre>
        )}
      </div>
    </div>
  );
}
