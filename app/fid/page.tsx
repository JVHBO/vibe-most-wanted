"use client";

import { useState, useEffect } from "react";
import { useAccount, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { getUserByFid, calculateRarityFromScore, getBasePowerFromRarity, generateRandomFoil, generateRandomWear, generateRandomSuit, generateRankFromRarity, getSuitSymbol, getSuitColor } from "@/lib/neynar";
import type { NeynarUser, CardSuit, CardRank } from "@/lib/neynar";
import { generateFarcasterCardImage } from "@/lib/generateFarcasterCard";
import { VIBEFID_ABI, VIBEFID_CONTRACT_ADDRESS, MINT_PRICE } from "@/lib/contracts/VibeFIDABI";
import { parseEther } from "viem";
import FoilCardEffect from "@/components/FoilCardEffect";
import { useFarcasterContext } from "@/lib/hooks/useFarcasterContext";

interface GeneratedTraits {
  rarity: string;
  foil: string;
  wear: string;
  suit: CardSuit;
  rank: CardRank;
  suitSymbol: string;
  color: 'red' | 'black';
  power: number;
}

export default function FidPage() {
  const { address } = useAccount();
  const farcasterContext = useFarcasterContext();
  const [fidInput, setFidInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userData, setUserData] = useState<NeynarUser | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [generatedTraits, setGeneratedTraits] = useState<GeneratedTraits | null>(null);

  // Temporary storage for mint data
  const [pendingMintData, setPendingMintData] = useState<any>(null);

  // Success modal state
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [mintedCardData, setMintedCardData] = useState<any>(null);

  // Auto-fill FID if in Farcaster miniapp
  useEffect(() => {
    if (farcasterContext.isReady && farcasterContext.user?.fid && !fidInput) {
      setFidInput(farcasterContext.user.fid.toString());
    }
  }, [farcasterContext.isReady, farcasterContext.user?.fid]);

  // Contract interaction
  const { writeContract, data: hash, isPending: isContractPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  // Mutations
  const mintCard = useMutation(api.farcasterCards.mintFarcasterCard);

  // Save to Convex after successful on-chain mint
  useEffect(() => {
    if (isConfirmed && pendingMintData) {
      const saveToConvex = async () => {
        try {
          setError("Saving card data...");

          // Validate all required fields
          const validatedData = {
            fid: Number(pendingMintData.fid),
            username: String(pendingMintData.username),
            displayName: String(pendingMintData.displayName),
            pfpUrl: String(pendingMintData.pfpUrl),
            bio: String(pendingMintData.bio || ""),
            neynarScore: Number(pendingMintData.neynarScore),
            followerCount: Number(pendingMintData.followerCount),
            followingCount: Number(pendingMintData.followingCount),
            powerBadge: Boolean(pendingMintData.powerBadge),
            address: String(pendingMintData.address),
            rarity: String(pendingMintData.rarity),
            foil: String(pendingMintData.foil),
            wear: String(pendingMintData.wear),
            power: Number(pendingMintData.power),
            suit: String(pendingMintData.suit),
            rank: String(pendingMintData.rank),
            suitSymbol: String(pendingMintData.suitSymbol),
            color: String(pendingMintData.color),
            imageUrl: String(pendingMintData.imageUrl),
          };

          console.log('💾 Saving to Convex:', validatedData);

          await mintCard(validatedData);
          setError(null);

          // Show success modal with card data
          setMintedCardData({
            ...validatedData,
            cardImage: previewImage, // Card image for display
            txHash: hash,
          });
          setShowSuccessModal(true);

          // Reset form
          setUserData(null);
          setPreviewImage(null);
          setGeneratedTraits(null);
          setFidInput("");
          setPendingMintData(null);
        } catch (err: any) {
          console.error('❌ Convex save error:', err);
          setError(`NFT minted but failed to save metadata: ${err.message}`);
        } finally {
          setLoading(false);
        }
      };
      saveToConvex();
    }
  }, [isConfirmed, pendingMintData, hash]);

  // Queries
  const myCards = useQuery(
    api.farcasterCards.getFarcasterCardsByAddress,
    address ? { address } : "skip"
  );

  const handleFetchUser = async () => {
    setError(null);
    setUserData(null);
    setPreviewImage(null);
    setGeneratedTraits(null);

    const fid = parseInt(fidInput);
    if (isNaN(fid) || fid <= 0) {
      setError("Please enter a valid FID number");
      return;
    }

    setLoading(true);

    try {
      const user = await getUserByFid(fid);

      if (!user) {
        setError(`No user found for FID ${fid}`);
        setLoading(false);
        return;
      }

      setUserData(user);
    } catch (err: any) {
      setError(err.message || "Failed to fetch user data");
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePreview = async () => {
    if (!userData) {
      setError("No user data loaded");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const score = userData.experimental?.neynar_user_score || 0;
      const rarity = calculateRarityFromScore(score);

      // Generate random suit and rank
      const suit = generateRandomSuit();
      const suitSymbol = getSuitSymbol(suit);
      const color = getSuitColor(suit);
      const rank = generateRankFromRarity(rarity);

      // Generate random foil and wear
      const foil = generateRandomFoil();
      const wear = generateRandomWear();

      // Calculate power with foil and wear multipliers
      const basePower = getBasePowerFromRarity(rarity);

      // Wear multiplier
      const wearMultiplier: Record<string, number> = {
        Pristine: 1.8,
        Mint: 1.4,
        "Lightly Played": 1.0,
        "Moderately Played": 1.0,
        "Heavily Played": 1.0,
      };

      // Foil multiplier
      const foilMultiplier: Record<string, number> = {
        Prize: 15.0,
        Standard: 2.5,
        None: 1.0,
      };

      const wearMult = wearMultiplier[wear] || 1.0;
      const foilMult = foilMultiplier[foil] || 1.0;
      const power = Math.round(basePower * wearMult * foilMult);

      // Save generated traits
      setGeneratedTraits({
        rarity,
        foil,
        wear,
        suit,
        rank,
        suitSymbol,
        color,
        power,
      });

      // Generate card image
      const imageDataUrl = await generateFarcasterCardImage({
        fid: userData.fid,
        username: userData.username,
        displayName: userData.display_name,
        pfpUrl: userData.pfp_url,
        bio: userData.profile?.bio?.text || "",
        neynarScore: score,
        suit,
        suitSymbol,
        rank,
        color,
        rarity,
      });

      setPreviewImage(imageDataUrl);
    } catch (err: any) {
      setError(err.message || "Failed to generate preview");
    } finally {
      setLoading(false);
    }
  };

  const handleMintCard = async () => {
    if (!address) {
      setError("Please connect your wallet");
      return;
    }

    if (!userData) {
      setError("No user data loaded");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const score = userData.experimental?.neynar_user_score || 0;

      // Use generated traits if available (from preview), otherwise generate new ones
      let traits = generatedTraits;
      let cardImageDataUrl = previewImage;

      if (!traits || !cardImageDataUrl) {
        const rarity = calculateRarityFromScore(score);
        const suit = generateRandomSuit();
        const suitSymbol = getSuitSymbol(suit);
        const color = getSuitColor(suit);
        const rank = generateRankFromRarity(rarity);
        const foil = generateRandomFoil();
        const wear = generateRandomWear();

        // Calculate power with foil and wear multipliers
        const basePower = getBasePowerFromRarity(rarity);
        const wearMultiplier: Record<string, number> = {
          Pristine: 1.8,
          Mint: 1.4,
          "Lightly Played": 1.0,
          "Moderately Played": 1.0,
          "Heavily Played": 1.0,
        };
        const foilMultiplier: Record<string, number> = {
          Prize: 15.0,
          Standard: 2.5,
          None: 1.0,
        };
        const wearMult = wearMultiplier[wear] || 1.0;
        const foilMult = foilMultiplier[foil] || 1.0;
        const power = Math.round(basePower * wearMult * foilMult);

        traits = { rarity, suit, suitSymbol, color, rank, foil, wear, power };

        // Generate card image if not already generated
        cardImageDataUrl = await generateFarcasterCardImage({
          fid: userData.fid,
          username: userData.username,
          displayName: userData.display_name,
          pfpUrl: userData.pfp_url,
          bio: userData.profile?.bio?.text || "",
          neynarScore: score,
          suit,
          suitSymbol,
          rank,
          color,
          rarity,
        });
      }

      const { rarity, suit, suitSymbol, color, rank, foil, wear, power } = traits;

      // Convert card image from data URL to blob
      setError("Preparing card image...");
      const base64Data = cardImageDataUrl.split(',')[1];
      const binaryData = atob(base64Data);
      const arrayBuffer = new ArrayBuffer(binaryData.length);
      const uint8Array = new Uint8Array(arrayBuffer);
      for (let i = 0; i < binaryData.length; i++) {
        uint8Array[i] = binaryData.charCodeAt(i);
      }
      const imageBlob = new Blob([uint8Array], { type: 'image/png' });

      // Upload image to IPFS
      setError("Uploading to IPFS...");
      const formData = new FormData();
      formData.append('image', imageBlob, `card-${userData.fid}.png`);

      const uploadResponse = await fetch('/api/upload-nft-image', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload image to IPFS');
      }

      const { ipfsUrl } = await uploadResponse.json();

      // Get signature from backend
      setError("Verifying FID ownership and getting signature...");
      const signatureResponse = await fetch('/api/farcaster/mint-signature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address,
          fid: userData.fid,
          ipfsURI: ipfsUrl,
        }),
      });

      if (!signatureResponse.ok) {
        const errorData = await signatureResponse.json();
        throw new Error(errorData.error || 'Failed to get mint signature');
      }

      const { signature } = await signatureResponse.json();

      // Store mint data for later (after on-chain confirmation)
      setPendingMintData({
        fid: userData.fid,
        username: userData.username,
        displayName: userData.display_name,
        pfpUrl: userData.pfp_url,
        bio: userData.profile?.bio?.text || "",
        neynarScore: score,
        followerCount: userData.follower_count,
        followingCount: userData.following_count,
        powerBadge: userData.power_badge,
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
      });

      // Mint NFT on smart contract
      setError("Minting NFT on-chain (confirm transaction in wallet)...");
      writeContract({
        address: VIBEFID_CONTRACT_ADDRESS,
        abi: VIBEFID_ABI,
        functionName: 'presignedMint',
        args: [BigInt(userData.fid), ipfsUrl, signature as `0x${string}`],
        value: parseEther(MINT_PRICE),
      });

      // Note: Transaction confirmation is handled by useWaitForTransactionReceipt hook
      // After confirmation, data is saved to Convex in useEffect above

    } catch (err: any) {
      setError(err.message || "Failed to mint card");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-vintage-charcoal to-vintage-deep-black p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-display font-bold text-vintage-gold mb-2">
            VibeFID
          </h1>
          <p className="text-vintage-ice">
            Mint playable cards from Farcaster profiles
          </p>
        </div>

        {/* Success message when in miniapp */}
        {farcasterContext.isReady && farcasterContext.isInMiniapp && farcasterContext.user && (
          <div className="bg-green-900/30 border border-green-500/50 rounded-lg p-4 mb-6 text-center">
            <p className="text-green-300">
              ✅ Conectado como <span className="font-bold">@{farcasterContext.user.username || `FID ${farcasterContext.user.fid}`}</span>
              {" "}(FID: {farcasterContext.user.fid})
            </p>
            <p className="text-green-400 text-sm mt-1">
              Seu FID foi pré-preenchido. Você pode mintar seu próprio card ou de outros usuários.
            </p>
          </div>
        )}

        {/* Input Section */}
        <div className="bg-vintage-black/50 rounded-xl border border-vintage-gold/50 p-6 mb-8">
          <label className="block text-vintage-gold mb-2">
            Enter Farcaster FID
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              value={fidInput}
              onChange={(e) => setFidInput(e.target.value)}
              placeholder="e.g., 214746"
              className="flex-1 px-4 py-2 bg-vintage-charcoal border border-vintage-gold/30 rounded-lg text-vintage-ice focus:outline-none focus:border-vintage-gold"
            />
            <button
              onClick={handleFetchUser}
              disabled={loading}
              className="px-6 py-2 bg-vintage-gold text-vintage-black font-bold rounded-lg hover:bg-vintage-burnt-gold transition-colors disabled:opacity-50"
            >
              {loading ? "Loading..." : "Fetch"}
            </button>
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-900/50 border border-red-500 rounded-lg text-red-200">
              {error}
            </div>
          )}
        </div>

        {/* User Preview */}
        {userData && (
          <div className="bg-vintage-black/50 rounded-xl border border-vintage-gold/50 p-6 mb-8">
            <div className="flex items-start gap-6">
              {/* PFP */}
              <img
                src={userData.pfp_url}
                alt={userData.username}
                className="w-32 h-32 rounded-lg border-2 border-vintage-gold"
              />

              {/* Info */}
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-vintage-gold mb-1">
                  {userData.display_name}
                </h2>
                <p className="text-vintage-ice mb-2">@{userData.username}</p>
                <p className="text-vintage-ice/80 text-sm mb-4">
                  {userData.profile?.bio?.text || "No bio"}
                </p>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <span className="text-vintage-burnt-gold">FID:</span>{" "}
                    <span className="text-vintage-ice">{userData.fid}</span>
                  </div>
                  <div>
                    <span className="text-vintage-burnt-gold">Score:</span>{" "}
                    <span className="text-vintage-ice">
                      {userData.experimental?.neynar_user_score?.toFixed(2) || "N/A"}
                    </span>
                  </div>
                  <div>
                    <span className="text-vintage-burnt-gold">Followers:</span>{" "}
                    <span className="text-vintage-ice">{userData.follower_count}</span>
                  </div>
                  <div>
                    <span className="text-vintage-burnt-gold">Rarity:</span>{" "}
                    <span className="text-vintage-ice">
                      {calculateRarityFromScore(userData.experimental?.neynar_user_score || 0)}
                    </span>
                  </div>
                  <div>
                    <span className="text-vintage-burnt-gold">Card Range:</span>{" "}
                    <span className="text-vintage-ice">
                      {(() => {
                        const rarity = calculateRarityFromScore(userData.experimental?.neynar_user_score || 0);
                        if (rarity === 'Common') return '2-6';
                        if (rarity === 'Rare') return '7-8';
                        if (rarity === 'Epic') return '9-10-J';
                        if (rarity === 'Legendary') return 'Q-K';
                        return 'A';
                      })()}
                    </span>
                  </div>
                </div>

                {userData.power_badge && (
                  <div className="inline-block px-3 py-1 bg-purple-600 text-white text-sm rounded-full mb-4">
                    ⚡ Power Badge
                  </div>
                )}

                {/* Generate Preview Button */}
                <button
                  onClick={handleGeneratePreview}
                  disabled={loading}
                  className="w-full px-6 py-3 mb-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {loading ? "Generating..." : "Generate Card Preview"}
                </button>

                {/* Mint Button */}
                <button
                  onClick={handleMintCard}
                  disabled={loading || !address}
                  className="w-full px-6 py-3 bg-vintage-gold text-vintage-black font-bold rounded-lg hover:bg-vintage-burnt-gold transition-colors disabled:opacity-50"
                >
                  {!address
                    ? "Connect Wallet to Mint"
                    : loading
                    ? "Minting..."
                    : "Mint Card"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Card Preview */}
        {previewImage && generatedTraits && (
          <div className="bg-vintage-black/50 rounded-xl border border-vintage-gold/50 p-6 mb-8">
            <h2 className="text-2xl font-bold text-vintage-gold mb-4 text-center">
              Card Preview
            </h2>
            <div className="flex flex-col items-center gap-6">
              {/* Card Image with Foil Effect */}
              <FoilCardEffect
                foilType={generatedTraits.foil === 'None' ? null : (generatedTraits.foil as 'Standard' | 'Prize')}
                className="w-full max-w-md rounded-lg shadow-2xl border-4 border-vintage-gold overflow-hidden"
              >
                <img
                  src={previewImage}
                  alt="Card Preview"
                  className="w-full h-full object-cover"
                />
              </FoilCardEffect>

              {/* Generated Traits */}
              <div className="w-full max-w-md bg-vintage-charcoal/80 rounded-lg border border-vintage-gold/30 p-6">
                <h3 className="text-xl font-bold text-vintage-gold mb-4 text-center">
                  Generated Traits
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-vintage-burnt-gold font-semibold">Card:</span>{" "}
                    <span className={`font-bold ${generatedTraits.color === 'red' ? 'text-red-500' : 'text-white'}`}>
                      {generatedTraits.rank}{generatedTraits.suitSymbol}
                    </span>
                  </div>
                  <div>
                    <span className="text-vintage-burnt-gold font-semibold">Rarity:</span>{" "}
                    <span className="text-vintage-ice">{generatedTraits.rarity}</span>
                  </div>
                  <div>
                    <span className="text-vintage-burnt-gold font-semibold">Foil:</span>{" "}
                    <span className={`font-bold ${
                      generatedTraits.foil === 'Prize' ? 'text-purple-400' :
                      generatedTraits.foil === 'Standard' ? 'text-blue-400' :
                      'text-vintage-ice'
                    }`}>
                      {generatedTraits.foil}
                    </span>
                  </div>
                  <div>
                    <span className="text-vintage-burnt-gold font-semibold">Wear:</span>{" "}
                    <span className="text-vintage-ice">{generatedTraits.wear}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-vintage-burnt-gold font-semibold">Power:</span>{" "}
                    <span className="text-vintage-gold font-bold text-lg">{generatedTraits.power}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* My Cards */}
        {myCards && myCards.length > 0 && (
          <div className="bg-vintage-black/50 rounded-xl border border-vintage-gold/50 p-6">
            <h2 className="text-2xl font-bold text-vintage-gold mb-4">
              My Farcaster Cards ({myCards.length})
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myCards.map((card: any) => (
                <div
                  key={card._id}
                  className="bg-vintage-charcoal rounded-lg border border-vintage-gold/30 p-4"
                >
                  {/* Card Symbol */}
                  <div className="text-center mb-2">
                    <span className={`text-4xl font-bold ${card.color === 'red' ? 'text-red-500' : 'text-black'}`}>
                      {card.rank}{card.suitSymbol}
                    </span>
                  </div>

                  <img
                    src={card.pfpUrl}
                    alt={card.username}
                    className="w-full aspect-square object-cover rounded-lg mb-2"
                  />
                  <p className="text-vintage-gold font-bold">{card.displayName}</p>
                  <p className="text-vintage-ice/70 text-sm">@{card.username}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-vintage-burnt-gold text-sm">{card.rarity}</span>
                    <span className="text-vintage-ice text-sm">⚡ {card.power}</span>
                  </div>
                  <div className="mt-1 text-center text-xs text-vintage-ice/50">
                    Score: {card.neynarScore.toFixed(2)}
                  </div>

                  {/* Share Button */}
                  <a
                    href={(() => {
                      const shareUrl = `https://www.vibemostwanted.xyz/share/fid/${card.fid}`;
                      const foilText = card.foil !== 'None' ? ` with ${card.foil} foil` : '';
                      const castText = `Just minted my VibeFID!\n\n${card.rarity}${foilText} • ${card.power} power\n\n@jvhbo`;

                      return `https://warpcast.com/~/compose?text=${encodeURIComponent(castText)}&embeds[]=${encodeURIComponent(shareUrl)}`;
                    })()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 w-full px-3 py-2 bg-purple-600/80 hover:bg-purple-600 text-white text-sm font-bold rounded-lg transition-colors flex items-center justify-center gap-1"
                  >
                    <span className="text-base">🔮</span>
                    Share
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Success Modal */}
        {showSuccessModal && mintedCardData && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
            <div className="bg-vintage-charcoal rounded-xl border-2 border-vintage-gold p-8 max-w-md w-full relative">
              {/* Close button */}
              <button
                onClick={() => setShowSuccessModal(false)}
                className="absolute top-4 right-4 text-vintage-ice hover:text-vintage-gold text-3xl leading-none"
              >
                ×
              </button>

              <h2 className="text-3xl font-display font-bold text-vintage-gold mb-4 text-center">
                VibeFID Minted! 🎉
              </h2>

              {/* Card Preview */}
              {mintedCardData.cardImage && (
                <div className="mb-6">
                  <FoilCardEffect
                    foilType={mintedCardData.foil === 'None' ? null : (mintedCardData.foil as 'Standard' | 'Prize')}
                    className="w-full rounded-lg shadow-2xl border-4 border-vintage-gold overflow-hidden"
                  >
                    <img
                      src={mintedCardData.cardImage}
                      alt="Minted Card"
                      className="w-full h-full object-cover"
                    />
                  </FoilCardEffect>
                </div>
              )}

              {/* Card Stats */}
              <div className="bg-vintage-black/50 rounded-lg p-4 mb-6">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-vintage-burnt-gold">Rarity:</span>{" "}
                    <span className="text-vintage-ice font-bold">{mintedCardData.rarity}</span>
                  </div>
                  <div>
                    <span className="text-vintage-burnt-gold">Foil:</span>{" "}
                    <span className={`font-bold ${
                      mintedCardData.foil === 'Prize' ? 'text-purple-400' :
                      mintedCardData.foil === 'Standard' ? 'text-blue-400' :
                      'text-vintage-ice'
                    }`}>
                      {mintedCardData.foil}
                    </span>
                  </div>
                  <div>
                    <span className="text-vintage-burnt-gold">Wear:</span>{" "}
                    <span className="text-vintage-ice">{mintedCardData.wear}</span>
                  </div>
                  <div>
                    <span className="text-vintage-burnt-gold">Power:</span>{" "}
                    <span className="text-vintage-gold font-bold text-lg">{mintedCardData.power}</span>
                  </div>
                </div>
              </div>

              {/* Share Button */}
              <a
                href={(() => {
                  const shareUrl = `https://www.vibemostwanted.xyz/share/fid/${mintedCardData.fid}`;
                  const foilText = mintedCardData.foil !== 'None' ? ` with ${mintedCardData.foil} foil` : '';
                  const castText = `Just minted my VibeFID!\n\n${mintedCardData.rarity}${foilText} • ${mintedCardData.power} power\n\n@jvhbo`;

                  return `https://warpcast.com/~/compose?text=${encodeURIComponent(castText)}&embeds[]=${encodeURIComponent(shareUrl)}`;
                })()}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full px-6 py-4 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2 mb-3"
              >
                <span className="text-xl">🔮</span>
                Share to Farcaster
              </a>

              {/* View on BaseScan */}
              {mintedCardData.txHash && (
                <a
                  href={`https://basescan.org/tx/${mintedCardData.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full px-6 py-3 bg-vintage-black/50 hover:bg-vintage-black text-vintage-ice font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <span>🔗</span>
                  View on BaseScan
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
