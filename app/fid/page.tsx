"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { getUserByFid, calculateRarityFromScore, getBasePowerFromRarity, generateRandomFoil, generateRandomWear, generateRandomSuit, generateRankFromRarity, getSuitSymbol, getSuitColor } from "@/lib/neynar";
import type { NeynarUser, CardSuit, CardRank } from "@/lib/neynar";
import { generateFarcasterCardImage } from "@/lib/generateFarcasterCard";
import { generateCardVideo } from "@/lib/generateCardVideo";
import FoilCardEffect from "@/components/FoilCardEffect";

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
  const [fidInput, setFidInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userData, setUserData] = useState<NeynarUser | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [generatedTraits, setGeneratedTraits] = useState<GeneratedTraits | null>(null);

  // Mutations
  const mintCard = useMutation(api.farcasterCards.mintFarcasterCard);

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

      // Generate MP4 video with foil animation
      setError("Generating video with foil animation...");
      const videoBlob = await generateCardVideo({
        cardImageDataUrl,
        foilType: foil as 'None' | 'Standard' | 'Prize',
        duration: 3,
        fps: 30,
      });

      // Upload video to IPFS
      setError("Uploading to IPFS...");
      const formData = new FormData();
      formData.append('video', videoBlob, `card-${userData.fid}.webm`);

      const uploadResponse = await fetch('/api/upload-nft-video', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload video to IPFS');
      }

      const { ipfsUrl } = await uploadResponse.json();

      // Mint the card with IPFS URL
      setError("Minting card...");
      const result = await mintCard({
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
        imageUrl: ipfsUrl, // Use IPFS URL
      });

      alert(`${result.message}\n\nIPFS URL: ${ipfsUrl}`);
      setUserData(null);
      setPreviewImage(null);
      setGeneratedTraits(null);
      setFidInput("");
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to mint card");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-vintage-charcoal to-vintage-deep-black p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-display font-bold text-vintage-gold mb-2">
            Farcaster Card Mint
          </h1>
          <p className="text-vintage-ice">
            Mint playable cards from Farcaster profiles
          </p>
        </div>

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
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
