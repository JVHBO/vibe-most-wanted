"use client";

import { useState } from "react";
import { useAccount, useWriteContract } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { getUserByFid, calculateRarityFromScore, getSuitFromFid, getSuitSymbol, getSuitColor, generateRankFromRarity } from "@/lib/neynar";
import { getFidTraits } from "@/lib/fidTraits";
import { getFarcasterAccountCreationDate } from "@/lib/farcasterRegistry";
import { generateFarcasterCardImage } from "@/lib/generateFarcasterCard";
import { generateCardVideo } from "@/lib/generateCardVideo";
import { VIBEFID_POWER_CONFIG } from "@/lib/collections";
import { VIBEFID_ABI, VIBEFID_CONTRACT_ADDRESS, MINT_PRICE } from "@/lib/contracts/VibeFIDABI";
import { parseEther } from "viem";
import FoilCardEffect from "@/components/FoilCardEffect";
import { CardMedia } from "@/components/CardMedia";

export default function FidTestPage() {
  const { address } = useAccount();
  const { writeContract } = useWriteContract();
  const mintCard = useMutation(api.farcasterCards.mintFarcasterCard);

  // Password protection
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState(false);

  const [fid, setFid] = useState("");
  const [loading, setLoading] = useState(false);
  const [minting, setMinting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cardPng, setCardPng] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [traits, setTraits] = useState<any>(null);
  const [userData, setUserData] = useState<any>(null);

  // Password check
  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const correctPassword = process.env.NEXT_PUBLIC_FID_PAGE_PASSWORD || "vibefid2025";

    if (passwordInput === correctPassword) {
      setIsAuthenticated(true);
      setPasswordError(false);
    } else {
      setPasswordError(true);
    }
  };

  const handleGenerate = async () => {
    if (!fid) return;

    setLoading(true);
    setError(null);
    setCardPng(null);
    setVideoUrl(null);
    setTraits(null);
    setUserData(null);

    try {
      // Fetch user
      const user = await getUserByFid(Number(fid));
      if (!user) {
        setError(`No user found for FID ${fid}`);
        return;
      }

      setUserData(user);

      const score = user.experimental?.neynar_user_score || 0;
      const rarity = calculateRarityFromScore(score);

      // Get DETERMINISTIC traits based on FID
      const suit = getSuitFromFid(Number(fid));
      const suitSymbol = getSuitSymbol(suit);
      const color = getSuitColor(suit);
      const rank = generateRankFromRarity(rarity);
      const fidTraits = getFidTraits(Number(fid));
      const foil = fidTraits.foil;
      const wear = fidTraits.wear;

      // Calculate power
      const rarityKey = rarity.toLowerCase() as 'mythic' | 'legendary' | 'epic' | 'rare' | 'common';
      const basePower = VIBEFID_POWER_CONFIG.rarityBase[rarityKey] || VIBEFID_POWER_CONFIG.rarityBase.common;
      const wearKey = wear.toLowerCase().replace(' ', '') as 'pristine' | 'mint';
      const wearMult = VIBEFID_POWER_CONFIG.wearMultiplier[wearKey] || VIBEFID_POWER_CONFIG.wearMultiplier.default;
      const foilKey = foil.toLowerCase() as 'prize' | 'standard' | 'none';
      const foilMult = VIBEFID_POWER_CONFIG.foilMultiplier[foilKey] || VIBEFID_POWER_CONFIG.foilMultiplier.none;
      const power = Math.round(basePower * wearMult * foilMult);

      setTraits({ rarity, foil, wear, power, suit, suitSymbol, color, rank });

      // Generate PNG
      const cardImageDataUrl = await generateFarcasterCardImage({
        fid: user.fid,
        username: user.username,
        displayName: user.display_name,
        pfpUrl: user.pfp_url,
        bio: user.profile?.bio?.text || "",
        neynarScore: score,
        suit,
        suitSymbol,
        rank,
        color,
        rarity,
        bounty: power * 10,
      });

      setCardPng(cardImageDataUrl);

      // Generate video
      const videoBlob = await generateCardVideo({
        cardImageDataUrl,
        foilType: foil as 'None' | 'Standard' | 'Prize',
        duration: 8,
        fps: 30,
      });

      const videoObjectUrl = URL.createObjectURL(videoBlob);
      setVideoUrl(videoObjectUrl);

    } catch (err: any) {
      setError(err.message || "Failed to generate");
    } finally {
      setLoading(false);
    }
  };

  const handleMint = async () => {
    if (!address || !userData || !traits || !cardPng) {
      setError("Missing data for minting");
      return;
    }

    setMinting(true);
    setError(null);

    try {
      const { rarity, foil, wear, power, suit, suitSymbol, color, rank } = traits;

      // Upload PNG to IPFS
      setError("Uploading card image...");
      const cardPngBlob = await fetch(cardPng).then(r => r.blob());
      const pngFormData = new FormData();
      pngFormData.append('image', cardPngBlob, `card-${userData.fid}.png`);

      const pngUploadResponse = await fetch('/api/upload-nft-image', {
        method: 'POST',
        body: pngFormData,
      });

      if (!pngUploadResponse.ok) throw new Error('Failed to upload PNG');
      const { ipfsUrl: cardImageIpfsUrl } = await pngUploadResponse.json();

      // Generate share image
      setError("Generating share image...");
      const { generateShareImage } = await import('@/lib/generateShareImage');
      const createdAt = await getFarcasterAccountCreationDate(userData.fid);

      const shareImageDataUrl = await generateShareImage({
        cardImageDataUrl: cardPng,
        backstoryData: {
          username: userData.username,
          displayName: userData.display_name,
          bio: userData.profile?.bio?.text || "",
          fid: userData.fid,
          followerCount: userData.follower_count,
          createdAt,
          power,
          bounty: power * 10,
          rarity,
        },
        displayName: userData.display_name,
        lang: 'en',
      });

      // Upload share image
      setError("Uploading share image...");
      const shareImageBlob = await fetch(shareImageDataUrl).then(r => r.blob());
      const shareFormData = new FormData();
      shareFormData.append('image', shareImageBlob, `share-${userData.fid}.png`);

      const shareUploadResponse = await fetch('/api/upload-nft-image', {
        method: 'POST',
        body: shareFormData,
      });

      if (!shareUploadResponse.ok) throw new Error('Failed to upload share image');
      const { ipfsUrl: shareImageIpfsUrl } = await shareUploadResponse.json();

      // Generate and upload video
      setError("Generating video...");
      const videoBlob = await generateCardVideo({
        cardImageDataUrl: cardPng,
        foilType: foil as 'None' | 'Standard' | 'Prize',
        duration: 8,
        fps: 30,
      });

      const formData = new FormData();
      formData.append('video', videoBlob, `card-${userData.fid}.webm`);

      setError("Uploading video...");
      const uploadResponse = await fetch('/api/upload-nft-video', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) throw new Error('Failed to upload video');
      const { ipfsUrl } = await uploadResponse.json();

      // Get metadata URL
      const metadataUrl = `https://www.vibemostwanted.xyz/api/metadata/fid/${userData.fid}`;

      // Get signature
      setError("Getting signature...");
      const signatureResponse = await fetch('/api/farcaster/mint-signature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address,
          fid: userData.fid,
          ipfsURI: metadataUrl,
        }),
      });

      if (!signatureResponse.ok) throw new Error('Failed to get signature');
      const { signature } = await signatureResponse.json();

      // Mint NFT
      setError("Minting NFT (confirm in wallet)...");
      await writeContract({
        address: VIBEFID_CONTRACT_ADDRESS,
        abi: VIBEFID_ABI,
        functionName: 'presignedMint',
        args: [BigInt(userData.fid), metadataUrl, signature as `0x${string}`],
        value: parseEther(MINT_PRICE),
      });

      // Save to Convex
      setError("Saving to database...");
      await mintCard({
        fid: userData.fid,
        username: userData.username,
        displayName: userData.display_name,
        pfpUrl: userData.pfp_url,
        bio: userData.profile?.bio?.text || "",
        neynarScore: userData.experimental?.neynar_user_score || 0,
        followerCount: userData.follower_count,
        followingCount: userData.following_count,
        powerBadge: userData.power_badge || false,
        address,
        rarity,
        foil,
        wear,
        power,
        suit,
        rank,
        suitSymbol,
        color,
        imageUrl: ipfsUrl,
        cardImageUrl: cardImageIpfsUrl,
        shareImageUrl: shareImageIpfsUrl,
        contractAddress: VIBEFID_CONTRACT_ADDRESS.toLowerCase(),
      });

      setError("✅ Minted successfully!");

    } catch (err: any) {
      setError(err.message || "Failed to mint");
    } finally {
      setMinting(false);
    }
  };

  const handleShare = async () => {
    if (!cardPng || !userData || !traits) return;

    try {
      setError("Generating share image...");
      const { generateShareImage } = await import('@/lib/generateShareImage');
      const createdAt = await getFarcasterAccountCreationDate(userData.fid);

      const shareImageDataUrl = await generateShareImage({
        cardImageDataUrl: cardPng,
        backstoryData: {
          username: userData.username,
          displayName: userData.display_name,
          bio: userData.profile?.bio?.text || "",
          fid: userData.fid,
          followerCount: userData.follower_count,
          createdAt,
          power: traits.power,
          bounty: traits.power * 10,
          rarity: traits.rarity,
        },
        displayName: userData.display_name,
        lang: 'en',
      });

      // Download share image
      const link = document.createElement('a');
      link.href = shareImageDataUrl;
      link.download = `vibefid-${userData.fid}.png`;
      link.click();

      setError("✅ Share image downloaded!");
    } catch (err: any) {
      setError(err.message || "Failed to generate share image");
    }
  };

  // If not authenticated, show password form
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-vintage-charcoal to-vintage-deep-black flex items-center justify-center p-8">
        <div className="bg-vintage-black/50 rounded-xl border border-vintage-gold/50 p-8 max-w-md w-full">
          <h1 className="text-3xl font-display font-bold text-vintage-gold mb-2 text-center">
            🔒 VibeFID Test Access
          </h1>
          <p className="text-vintage-ice text-center mb-6">
            Enter password to access test page
          </p>

          <form onSubmit={handlePasswordSubmit}>
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="Enter password"
              className="w-full px-4 py-3 bg-vintage-charcoal border border-vintage-gold/30 rounded-lg text-vintage-ice focus:outline-none focus:border-vintage-gold mb-4"
              autoFocus
            />

            {passwordError && (
              <div className="mb-4 p-3 bg-red-900/50 border border-red-500 rounded-lg text-red-200 text-sm text-center">
                ❌ Incorrect password
              </div>
            )}

            <button
              type="submit"
              className="w-full px-6 py-3 bg-vintage-gold text-vintage-black font-bold rounded-lg hover:bg-vintage-burnt-gold transition-colors"
            >
              Unlock
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-vintage-charcoal to-vintage-deep-black p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-display font-bold text-vintage-gold mb-8 text-center">
          VibeFID Test Page
        </h1>

        <div className="bg-vintage-black/50 rounded-xl border border-vintage-gold/50 p-6 mb-8">
          <div className="flex gap-4 mb-4">
            <input
              type="number"
              value={fid}
              onChange={(e) => setFid(e.target.value)}
              placeholder="Enter FID"
              className="flex-1 px-4 py-3 bg-vintage-charcoal border border-vintage-gold/30 rounded-lg text-vintage-ice focus:outline-none focus:border-vintage-gold"
            />
            <button
              onClick={handleGenerate}
              disabled={loading || !fid}
              className="px-8 py-3 bg-vintage-gold text-vintage-black font-bold rounded-lg hover:bg-vintage-burnt-gold transition-colors disabled:opacity-50"
            >
              {loading ? "Generating..." : "Generate"}
            </button>
          </div>

          {traits && (
            <div className="flex gap-4">
              <button
                onClick={handleShare}
                disabled={!cardPng}
                className="flex-1 px-6 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                📤 Download Share Image
              </button>

              {address ? (
                <button
                  onClick={handleMint}
                  disabled={minting}
                  className="flex-1 px-6 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  {minting ? "Minting..." : "🎴 Mint Card (0.0003 ETH)"}
                </button>
              ) : (
                <ConnectButton.Custom>
                  {({ openConnectModal }) => (
                    <button
                      onClick={openConnectModal}
                      className="flex-1 px-6 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Connect Wallet to Mint
                    </button>
                  )}
                </ConnectButton.Custom>
              )}
            </div>
          )}

          {error && (
            <div className={`mt-4 p-4 rounded-lg ${error.includes('✅') ? 'bg-green-900/50 border-green-500 text-green-200' : 'bg-red-900/50 border-red-500 text-red-200'} border`}>
              {error}
            </div>
          )}
        </div>

        {traits && (
          <div className="bg-vintage-black/50 rounded-xl border border-vintage-gold/50 p-6 mb-8">
            <h2 className="text-2xl font-bold text-vintage-gold mb-4">Traits (DETERMINISTIC based on FID)</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <span className="text-vintage-burnt-gold">Rarity:</span>{" "}
                <span className="text-vintage-ice">{traits.rarity}</span>
              </div>
              <div>
                <span className="text-vintage-burnt-gold">Foil:</span>{" "}
                <span className={`font-bold ${
                  traits.foil === 'Prize' ? 'text-purple-400' :
                  traits.foil === 'Standard' ? 'text-blue-400' :
                  'text-vintage-ice'
                }`}>{traits.foil}</span>
              </div>
              <div>
                <span className="text-vintage-burnt-gold">Wear:</span>{" "}
                <span className="text-vintage-ice">{traits.wear}</span>
              </div>
              <div>
                <span className="text-vintage-burnt-gold">Power:</span>{" "}
                <span className="text-vintage-gold font-bold">{traits.power}</span>
              </div>
              <div>
                <span className="text-vintage-burnt-gold">Card:</span>{" "}
                <span className={traits.color === 'red' ? 'text-red-500' : 'text-white'}>{traits.rank}{traits.suitSymbol}</span>
              </div>
            </div>
          </div>
        )}

        {(cardPng || videoUrl) && (
          <div className="grid md:grid-cols-2 gap-8">
            {/* PNG with CSS Foil Effect */}
            {cardPng && (
              <div className="bg-vintage-black/50 rounded-xl border border-vintage-gold/50 p-6">
                <h2 className="text-2xl font-bold text-vintage-gold mb-4">
                  PNG + CSS Foil Effect
                </h2>
                <FoilCardEffect
                  foilType={traits?.foil === 'None' ? null : (traits?.foil as 'Standard' | 'Prize')}
                  className="w-full rounded-lg shadow-2xl border-4 border-vintage-gold overflow-hidden"
                >
                  <CardMedia
                    src={cardPng}
                    alt="Card PNG"
                    className="w-full"
                  />
                </FoilCardEffect>
              </div>
            )}

            {/* Video with Rendered Foil */}
            {videoUrl && (
              <div className="bg-vintage-black/50 rounded-xl border border-vintage-gold/50 p-6">
                <h2 className="text-2xl font-bold text-vintage-gold mb-4">
                  Video (OpenSea/IPFS)
                </h2>
                <video
                  src={videoUrl}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full rounded-lg shadow-2xl border-4 border-vintage-gold"
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
