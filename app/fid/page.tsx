"use client";

import { useState, useEffect } from "react";
import { useAccount, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { getUserByFid, calculateRarityFromScore, getBasePowerFromRarity, generateRandomSuit, generateRankFromRarity, getSuitSymbol, getSuitColor } from "@/lib/neynar";
import { getFidTraits } from "@/lib/fidTraits";
import { getFarcasterAccountCreationDate } from "@/lib/farcasterRegistry";
import type { NeynarUser, CardSuit, CardRank } from "@/lib/neynar";
import { generateFarcasterCardImage } from "@/lib/generateFarcasterCard";
import { generateCardVideo } from "@/lib/generateCardVideo";
import { VIBEFID_ABI, VIBEFID_CONTRACT_ADDRESS, MINT_PRICE } from "@/lib/contracts/VibeFIDABI";
import { parseEther } from "viem";
import FoilCardEffect from "@/components/FoilCardEffect";
import { useFarcasterContext } from "@/lib/hooks/useFarcasterContext";
import { useLanguage } from "@/contexts/LanguageContext";
import type { CriminalBackstoryData } from "@/lib/generateCriminalBackstory";
import { VIBEFID_POWER_CONFIG } from "@/lib/collections";
import FidGenerationModal from "@/components/FidGenerationModal";
import { useRouter } from "next/navigation";
import { CardMedia } from "@/components/CardMedia";

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
  const { lang } = useLanguage();
  const router = useRouter();

  // Password protection
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState(false);

  const [fidInput, setFidInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userData, setUserData] = useState<NeynarUser | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [generatedTraits, setGeneratedTraits] = useState<GeneratedTraits | null>(null);
  const [backstoryData, setBackstoryData] = useState<CriminalBackstoryData | null>(null);

  // Modal state
  const [showModal, setShowModal] = useState(false);

  // Temporary storage for mint data
  const [pendingMintData, setPendingMintData] = useState<any>(null);

  // Auto-fill FID if in Farcaster miniapp
  useEffect(() => {
    if (farcasterContext.isReady && farcasterContext.user?.fid && !fidInput) {
      setFidInput(farcasterContext.user.fid.toString());
    }
  }, [farcasterContext.isReady, farcasterContext.user?.fid]);

  // Combined fetch and generate function
  const handleGenerateCard = async () => {
    if (!fidInput) {
      setError("Please enter a FID");
      return;
    }

    const fid = parseInt(fidInput);
    if (isNaN(fid) || fid <= 0) {
      setError("Please enter a valid FID number");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch user data
      const user = await getUserByFid(fid);
      if (!user) {
        setError(`No user found for FID ${fid}`);
        setLoading(false);
        return;
      }

      setUserData(user);

      // Generate card immediately
      await generateCardForUser(user);

      // Open modal
      setShowModal(true);
    } catch (err: any) {
      setError(err.message || "Failed to generate card");
    } finally {
      setLoading(false);
    }
  };

  const generateCardForUser = async (user: NeynarUser) => {
    const score = user.experimental?.neynar_user_score || 0;
    const rarity = calculateRarityFromScore(score);

    // Generate random suit and rank
    const suit = generateRandomSuit();
    const suitSymbol = getSuitSymbol(suit);
    const color = getSuitColor(suit);
    const rank = generateRankFromRarity(rarity);

    // Generate FID-based foil and wear traits with randomness for preview
    const fidTraits = getFidTraits(user.fid, Date.now());
    const foil = fidTraits.foil;
    const wear = fidTraits.wear;

    // Calculate power with VibeFID balanced config
    const rarityKey = rarity.toLowerCase() as 'mythic' | 'legendary' | 'epic' | 'rare' | 'common';
    const basePower = VIBEFID_POWER_CONFIG.rarityBase[rarityKey] || VIBEFID_POWER_CONFIG.rarityBase.common;

    const wearKey = wear.toLowerCase().replace(' ', '') as 'pristine' | 'mint';
    const wearMult = VIBEFID_POWER_CONFIG.wearMultiplier[wearKey] || VIBEFID_POWER_CONFIG.wearMultiplier.default;

    const foilKey = foil.toLowerCase() as 'prize' | 'standard' | 'none';
    const foilMult = VIBEFID_POWER_CONFIG.foilMultiplier[foilKey] || VIBEFID_POWER_CONFIG.foilMultiplier.none;

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

    // Fetch account creation date
    const createdAt = await getFarcasterAccountCreationDate(user.fid);

    // Generate card image
    const imageDataUrl = await generateFarcasterCardImage({
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
      createdAt: createdAt || undefined,
    });

    setPreviewImage(imageDataUrl);

    // Store backstory data (will be generated in modal based on language)
    setBackstoryData({
      username: user.username,
      displayName: user.display_name,
      bio: user.profile?.bio?.text || "",
      fid: user.fid,
      followerCount: user.follower_count,
      createdAt,
      power,
      bounty: power * 10,
      rarity,
    });
  };

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

          // Redirect to individual FID page
          router.push(`/fid/${validatedData.fid}`);

          // Reset form
          setUserData(null);
          setPreviewImage(null);
          setGeneratedTraits(null);
          setBackstoryData(null);
          setFidInput("");
          setPendingMintData(null);
          setShowModal(false);
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

  // If not authenticated, show password form
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-vintage-charcoal to-vintage-deep-black flex items-center justify-center p-8">
        <div className="bg-vintage-black/50 rounded-xl border border-vintage-gold/50 p-8 max-w-md w-full">
          <h1 className="text-3xl font-display font-bold text-vintage-gold mb-2 text-center">
            🔒 VibeFID Access
          </h1>
          <p className="text-vintage-ice text-center mb-6">
            Enter password to access VibeFID minting
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

        // Generate FID-based foil and wear traits (DETERMINISTIC for final mint)
        // NO extraSeed - same FID always gives same traits on-chain
        const fidTraits = getFidTraits(userData.fid);
        const foil = fidTraits.foil;
        const wear = fidTraits.wear;

        // Calculate power with VibeFID balanced config
        const rarityKey = rarity.toLowerCase() as 'mythic' | 'legendary' | 'epic' | 'rare' | 'common';
        const basePower = VIBEFID_POWER_CONFIG.rarityBase[rarityKey] || VIBEFID_POWER_CONFIG.rarityBase.common;

        // Get wear multiplier from config
        const wearKey = wear.toLowerCase().replace(' ', '') as 'pristine' | 'mint';
        const wearMult = VIBEFID_POWER_CONFIG.wearMultiplier[wearKey] || VIBEFID_POWER_CONFIG.wearMultiplier.default;

        // Get foil multiplier from config
        const foilKey = foil.toLowerCase() as 'prize' | 'standard' | 'none';
        const foilMult = VIBEFID_POWER_CONFIG.foilMultiplier[foilKey] || VIBEFID_POWER_CONFIG.foilMultiplier.none;

        const power = Math.round(basePower * wearMult * foilMult);

        traits = { rarity, suit, suitSymbol, color, rank, foil, wear, power };

        // Fetch account creation date
        const createdAt = await getFarcasterAccountCreationDate(userData.fid);

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
          bounty: power * 10, // Bounty = Power × 10
          createdAt: createdAt || undefined,
        });
      }

      const { rarity, suit, suitSymbol, color, rank, foil, wear, power } = traits;

      // Generate MP4 video with foil animation (8 seconds for better effect)
      setError("Generating video with foil animation (8 seconds)...");
      const videoBlob = await generateCardVideo({
        cardImageDataUrl,
        foilType: foil as 'None' | 'Standard' | 'Prize',
        duration: 8, // Increased from 3 to 8 seconds
        fps: 30,
      });

      // Upload video to IPFS
      setError("Uploading video to IPFS...");
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

      // Build metadata URL that OpenSea will read
      const metadataUrl = `https://www.vibemostwanted.xyz/api/metadata/fid/${userData.fid}`;

      // Get signature from backend
      setError("Verifying FID ownership and getting signature...");
      const signatureResponse = await fetch('/api/farcaster/mint-signature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address,
          fid: userData.fid,
          ipfsURI: metadataUrl, // Use metadata URL instead of image URL
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
        args: [BigInt(userData.fid), metadataUrl, signature as `0x${string}`],
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
    <div className="min-h-screen bg-gradient-to-b from-vintage-charcoal to-vintage-deep-black p-2 sm:p-4 md:p-8 overflow-x-hidden">
      <div className="max-w-4xl mx-auto w-full">
        {/* Header */}
        <div className="text-center mb-4 sm:mb-6 md:mb-8 px-2">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold text-vintage-gold mb-2">
            VibeFID
          </h1>
          <p className="text-sm sm:text-base text-vintage-ice">
            Mint playable cards from Farcaster profiles
          </p>
        </div>

        {/* Success message when in miniapp */}
        {farcasterContext.isReady && farcasterContext.isInMiniapp && farcasterContext.user && (
          <div className="bg-green-900/30 border border-green-500/50 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6 text-center">
            <p className="text-green-300 text-xs sm:text-sm md:text-base break-words">
              ✅ Conectado como <span className="font-bold">@{farcasterContext.user.username || `FID ${farcasterContext.user.fid}`}</span>
              {" "}(FID: {farcasterContext.user.fid})
            </p>
            <p className="text-green-400 text-xs sm:text-sm mt-1 break-words">
              Seu FID foi pré-preenchido. Você pode mintar seu próprio card ou de outros usuários.
            </p>
          </div>
        )}

        {/* Input Section */}
        <div className="bg-vintage-black/50 rounded-lg sm:rounded-xl border border-vintage-gold/50 p-3 sm:p-4 md:p-6 mb-4 sm:mb-6 md:mb-8">
          <label className="block text-vintage-gold mb-2 text-sm sm:text-base">
            Enter Farcaster FID
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="number"
              value={fidInput}
              onChange={(e) => setFidInput(e.target.value)}
              placeholder="e.g., 214746"
              className="flex-1 px-3 sm:px-4 py-2 bg-vintage-charcoal border border-vintage-gold/30 rounded-lg text-vintage-ice focus:outline-none focus:border-vintage-gold text-sm sm:text-base w-full"
            />
            <button
              onClick={handleGenerateCard}
              disabled={loading}
              className="px-4 sm:px-6 py-2 bg-vintage-gold text-vintage-black font-bold rounded-lg hover:bg-vintage-burnt-gold transition-colors disabled:opacity-50 text-sm sm:text-base whitespace-nowrap w-full sm:w-auto"
            >
              {loading ? "Generating..." : "Generate Card"}
            </button>
          </div>

          {error && (
            <div className="mt-4 p-3 sm:p-4 bg-red-900/50 border border-red-500 rounded-lg text-red-200 text-sm sm:text-base break-words">
              {error}
            </div>
          )}
        </div>

        {/* Generation Modal */}
        <FidGenerationModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          backstoryData={backstoryData}
          displayName={userData?.display_name || ""}
          previewImage={previewImage}
          generatedTraits={generatedTraits}
          onMint={handleMintCard}
          isMinting={loading || isContractPending || isConfirming}
        />

        {/* My Cards */}
        {myCards && myCards.length > 0 && (
          <div className="bg-vintage-black/50 rounded-lg sm:rounded-xl border border-vintage-gold/50 p-3 sm:p-4 md:p-6">
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-vintage-gold mb-3 sm:mb-4">
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

                  {/* Card Image/Video */}
                  <CardMedia
                    src={card.imageUrl || card.pfpUrl}
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
      </div>
    </div>
  );
}
