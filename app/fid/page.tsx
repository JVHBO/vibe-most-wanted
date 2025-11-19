"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { getUserByFid, calculateRarityFromScore, getBasePowerFromRarity, generateRandomFoil, generateRandomWear } from "@/lib/neynar";
import type { NeynarUser } from "@/lib/neynar";

export default function FidPage() {
  const { address } = useAccount();
  const [fidInput, setFidInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userData, setUserData] = useState<NeynarUser | null>(null);

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
      // Calculate rarity from score
      const score = userData.experimental?.neynar_user_score || 0;
      const rarity = calculateRarityFromScore(score);
      const basePower = getBasePowerFromRarity(rarity);

      // Generate random foil and wear
      const foil = generateRandomFoil();
      const wear = generateRandomWear();

      // Calculate final power (simplified - you can add modifiers)
      const power = basePower;

      // For now, use the PFP URL directly as imageUrl
      // TODO: Call Nanobanana IA to generate the card image
      const imageUrl = userData.pfp_url;

      // Mint the card
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
        imageUrl,
      });

      alert(result.message);
      setUserData(null);
      setFidInput("");
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
                </div>

                {userData.power_badge && (
                  <div className="inline-block px-3 py-1 bg-purple-600 text-white text-sm rounded-full mb-4">
                    ⚡ Power Badge
                  </div>
                )}

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

        {/* My Cards */}
        {myCards && myCards.length > 0 && (
          <div className="bg-vintage-black/50 rounded-xl border border-vintage-gold/50 p-6">
            <h2 className="text-2xl font-bold text-vintage-gold mb-4">
              My Farcaster Cards ({myCards.length})
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myCards.map((card) => (
                <div
                  key={card._id}
                  className="bg-vintage-charcoal rounded-lg border border-vintage-gold/30 p-4"
                >
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
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
