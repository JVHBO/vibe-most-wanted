"use client";

import { useState } from "react";
import { getUserByFid, calculateRarityFromScore } from "@/lib/neynar";
import { getFidTraits } from "@/lib/fidTraits";
import { generateFarcasterCardImage } from "@/lib/generateFarcasterCard";
import { generateCardVideo } from "@/lib/generateCardVideo";
import { VIBEFID_POWER_CONFIG } from "@/lib/collections";
import FoilCardEffect from "@/components/FoilCardEffect";
import { CardMedia } from "@/components/CardMedia";

export default function FidTestPage() {
  const [fid, setFid] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cardPng, setCardPng] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [traits, setTraits] = useState<any>(null);

  const handleGenerate = async () => {
    if (!fid) return;

    setLoading(true);
    setError(null);
    setCardPng(null);
    setVideoUrl(null);
    setTraits(null);

    try {
      // Fetch user
      const user = await getUserByFid(Number(fid));
      if (!user) {
        setError(`No user found for FID ${fid}`);
        return;
      }

      const score = user.experimental?.neynar_user_score || 0;
      const rarity = calculateRarityFromScore(score);

      // Get FID-based traits (DETERMINISTIC)
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

      setTraits({ rarity, foil, wear, power });

      // Generate PNG with CSS foil effect
      const cardImageDataUrl = await generateFarcasterCardImage({
        fid: user.fid,
        username: user.username,
        displayName: user.display_name,
        pfpUrl: user.pfp_url,
        bio: user.profile?.bio?.text || "",
        neynarScore: score,
        suit: 'hearts',
        suitSymbol: '♥',
        rank: 'A',
        color: 'red',
        rarity,
        bounty: power * 10,
      });

      setCardPng(cardImageDataUrl);

      // Generate video with foil animation
      console.log('🎬 Generating video with foilType:', foil);
      const videoBlob = await generateCardVideo({
        cardImageDataUrl,
        foilType: foil as 'None' | 'Standard' | 'Prize',
        duration: 8,
        fps: 30,
      });
      console.log('🎬 Video generated, size:', videoBlob.size);

      const videoObjectUrl = URL.createObjectURL(videoBlob);
      setVideoUrl(videoObjectUrl);

    } catch (err: any) {
      setError(err.message || "Failed to generate");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-vintage-charcoal to-vintage-deep-black p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-display font-bold text-vintage-gold mb-8 text-center">
          VibeFID Test Page
        </h1>

        <div className="bg-vintage-black/50 rounded-xl border border-vintage-gold/50 p-6 mb-8">
          <div className="flex gap-4">
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

          {error && (
            <div className="mt-4 p-4 bg-red-900/50 border border-red-500 rounded-lg text-red-200">
              {error}
            </div>
          )}
        </div>

        {traits && (
          <div className="bg-vintage-black/50 rounded-xl border border-vintage-gold/50 p-6 mb-8">
            <h2 className="text-2xl font-bold text-vintage-gold mb-4">Traits</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                  Video with Rendered Foil (OpenSea/IPFS)
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
