"use client";

import { useState, useEffect } from "react";
import { useAccount, useWaitForTransactionReceipt, useWriteContract, useConnect, useSendTransaction } from "wagmi";
import { encodeFunctionData } from "viem";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { getUserByFid, calculateRarityFromScore, getBasePowerFromRarity, generateRandomSuit, getSuitFromFid, generateRankFromRarity, getSuitSymbol, getSuitColor } from "@/lib/neynar";
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
import { useMusic } from "@/contexts/MusicContext";
import type { CriminalBackstoryData } from "@/lib/generateCriminalBackstory";
import { VIBEFID_POWER_CONFIG } from "@/lib/collections";
import { fidTranslations } from "@/lib/fidTranslations";
import type { SupportedLanguage } from "@/lib/translations";
import FidGenerationModal from "@/components/FidGenerationModal";
import FidAboutTraitsModal from "@/components/FidAboutTraitsModal";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AudioManager } from "@/lib/audio-manager";
import { sdk } from "@farcaster/miniapp-sdk";

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
  const { connect, connectors } = useConnect();
  const farcasterContext = useFarcasterContext();
  const { lang, setLang } = useLanguage();
  const { isMusicEnabled, setIsMusicEnabled } = useMusic();
  const t = fidTranslations[lang];
  const router = useRouter();

  // Auto-connect wallet in Farcaster miniapp
  useEffect(() => {
    const autoConnectWallet = async () => {
      // Only auto-connect if in Farcaster miniapp and wallet not connected
      if (farcasterContext.isReady && farcasterContext.isInMiniapp && !address) {
        console.log('[FID] 🔗 Auto-connecting wallet in Farcaster miniapp...');

        const farcasterConnector = connectors.find((c) =>
          c.id === 'farcasterMiniApp' ||
          c.id === 'farcaster' ||
          c.name?.toLowerCase().includes('farcaster')
        );

        if (farcasterConnector) {
          try {
            await connect({ connector: farcasterConnector });
            console.log('[FID] ✅ Wallet auto-connected!');
          } catch (err) {
            console.error('[FID] ❌ Failed to auto-connect wallet:', err);
          }
        } else {
          console.error('[FID] ❌ Farcaster connector not found. Available:', connectors.map(c => c.id));
        }
      }
    };

    autoConnectWallet();
  }, [farcasterContext.isReady, farcasterContext.isInMiniapp, address, connect, connectors]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userData, setUserData] = useState<NeynarUser | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [generatedTraits, setGeneratedTraits] = useState<GeneratedTraits | null>(null);
  const [backstoryData, setBackstoryData] = useState<CriminalBackstoryData | null>(null);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [mintedSuccessfully, setMintedSuccessfully] = useState(false);

  // Neynar score state
  const [neynarScoreData, setNeynarScoreData] = useState<{ score: number; rarity: string; fid: number; username: string } | null>(null);
  const [showScoreModal, setShowScoreModal] = useState(false);

  // Temporary storage for mint data
  // 🔒 FIX: Also persist to localStorage to handle page refresh/close
  const [pendingMintData, setPendingMintData] = useState<any>(() => {
    // Restore from localStorage on mount
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('vibefid_pending_mint');
      if (saved) {
        try {
          const data = JSON.parse(saved);
          console.log('📦 Restored pending mint data from localStorage:', data.fid);
          return data;
        } catch (e) {
          console.error('Failed to parse pending mint data:', e);
        }
      }
    }
    return null;
  });

  /**
   * CARD GENERATION & PERSISTENCE FLOW:
   *
   * 1. Player clicks "Generate" → handleGenerateCard()
   *    - Checks if card already exists in localStorage
   *    - If exists: shows saved card (no new generation)
   *    - If not exists: generates new card and saves to localStorage
   *
   * 2. Card persists even if player closes page
   *    - useEffect loads saved card on mount
   *    - Player can continue from where they left off
   *
   * 3. Player clicks "Mint" → handleMintCard()
   *    - Generates video with foil effects
   *    - Uploads video to IPFS (gets permanent URL)
   *    - Gets signature from backend
   *    - Mints NFT on-chain (contract ensures 1 mint per FID)
   *    - After successful mint, clears localStorage
   *
   * 4. Contract prevents duplicate mints
   *    - Each FID can only be minted once
   *    - Enforced on smart contract level
   */

  // LocalStorage key for generated card
  const getStorageKey = () => {
    const fid = farcasterContext.user?.fid;
    return fid ? `vibefid_generated_${fid}` : null;
  };

  // Save generated card to localStorage
  const saveGeneratedCard = (data: any) => {
    const key = getStorageKey();
    if (key) {
      localStorage.setItem(key, JSON.stringify(data));
    }
  };

  // Load generated card from localStorage
  const loadGeneratedCard = () => {
    const key = getStorageKey();
    if (key) {
      const saved = localStorage.getItem(key);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          // Validate that previewImage is a data URL (not IPFS or other URL)
          if (parsed.previewImage && !parsed.previewImage.startsWith('data:')) {
            console.warn('⚠️ Invalid preview image in localStorage (not a data URL), clearing cache');
            localStorage.removeItem(key);
            return null;
          }
          return parsed;
        } catch (e) {
          console.error('Failed to parse saved card:', e);
          localStorage.removeItem(key);
        }
      }
    }
    return null;
  };

  // Clear generated card from localStorage
  const clearGeneratedCard = () => {
    const key = getStorageKey();
    if (key) {
      localStorage.removeItem(key);
    }
  };

  // Load saved card on mount (when user is ready)
  useEffect(() => {
    if (farcasterContext.isReady && farcasterContext.user) {
      const saved = loadGeneratedCard();
      if (saved) {
        setUserData(saved.userData);
        setPreviewImage(saved.previewImage);
        setGeneratedTraits(saved.generatedTraits);
        setBackstoryData(saved.backstoryData);
        // Don't auto-open modal - let user click "Generate" button to see it
      }
    }
  }, [farcasterContext.isReady, farcasterContext.user]);

  // Notify Farcaster SDK that miniapp is ready
  useEffect(() => {
    const initFarcasterSDK = async () => {
      try {
        if (typeof window !== 'undefined') {
          await sdk.actions.ready();
          console.log('[SDK] Farcaster SDK ready called');
        }
      } catch (error) {
        console.error('Error calling Farcaster SDK ready:', error);
      }
    };
    initFarcasterSDK();
  }, []);

  // Background music is already playing from main page
  // No need to start it again here

  // Combined fetch and generate function
  const handleGenerateCard = async () => {
    // Play button click sound
    AudioManager.buttonClick();

    // Check if user is connected
    if (!farcasterContext.user) {
      // Redirect to main page to connect
      setError("Redirecting to connect Farcaster wallet...");
      setTimeout(() => {
        window.location.href = '/';
      }, 1000);
      return;
    }

    // Check if card already generated (saved in localStorage)
    const existingCard = loadGeneratedCard();
    if (existingCard) {
      // Card already generated - show it instead of generating a new one
      setUserData(existingCard.userData);
      setPreviewImage(existingCard.previewImage);
      setGeneratedTraits(existingCard.generatedTraits);
      setBackstoryData(existingCard.backstoryData);
      setShowModal(true);
      return;
    }

    // Use logged-in user's FID
    const fid = farcasterContext.user.fid;

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

    // Generate DETERMINISTIC suit and rank based on FID
    const suit = getSuitFromFid(user.fid); // DETERMINISTIC based on FID
    const suitSymbol = getSuitSymbol(suit);
    const color = getSuitColor(suit);
    const rank = generateRankFromRarity(rarity);

    // Generate FID-based foil and wear traits (DETERMINISTIC - NO extraSeed!)
    const fidTraits = getFidTraits(user.fid); // REMOVED Date.now()
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
    const backstory = {
      username: user.username,
      displayName: user.display_name,
      bio: user.profile?.bio?.text || "",
      fid: user.fid,
      followerCount: user.follower_count,
      createdAt,
      power,
      bounty: power * 10,
      rarity,
    };
    setBackstoryData(backstory);

    // Save to localStorage so card persists if user leaves page
    saveGeneratedCard({
      userData: user,
      previewImage: imageDataUrl,
      generatedTraits: {
        rarity,
        foil,
        wear,
        suit,
        rank,
        suitSymbol,
        color,
        power,
      },
      backstoryData: backstory,
    });
  };

  // Check Neynar Score
  const handleCheckNeynarScore = async () => {
    // Play button click sound
    AudioManager.buttonClick();

    // Check if user is connected
    if (!farcasterContext.user) {
      setError("Please connect your Farcaster account first");
      return;
    }

    const fid = farcasterContext.user.fid;

    setLoading(true);
    setError(null);

    try {
      // Fetch user data from Neynar
      const user = await getUserByFid(fid);
      if (!user) {
        setError(`No user found for FID ${fid}`);
        setLoading(false);
        return;
      }

      const score = user.experimental.neynar_user_score;
      const rarity = calculateRarityFromScore(score);

      // Save score to history (same as /fid/[fid] page)
      await saveScoreCheck({
        fid: user.fid,
        username: user.username,
        score,
        rarity,
      });

      // Set score data and show modal
      setNeynarScoreData({
        score,
        rarity,
        fid: user.fid,
        username: user.username,
      });
      setShowScoreModal(true);
      setLoading(false);

    } catch (err: any) {
      setError(err.message || "Failed to fetch Neynar score");
      setLoading(false);
    }
  };

  // Contract interaction - use both methods for iOS compatibility
  const { writeContract, data: writeHash, isPending: isContractPending, error: writeError } = useWriteContract();
  const { sendTransaction, data: sendHash, isPending: isSendPending, error: sendError } = useSendTransaction();

  // Use whichever hash is available
  const hash = writeHash || sendHash;

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  // Handle contract errors
  useEffect(() => {
    const error = writeError || sendError;
    if (error) {
      console.error('❌ Contract error:', error);
      setError(error.message || "Transaction failed. Please try again.");
      setLoading(false);
    }
  }, [writeError, sendError]);

  // Mutations
  const mintCard = useMutation(api.farcasterCards.mintFarcasterCard);
  const saveScoreCheck = useMutation(api.neynarScore.saveScoreCheck);

  // 🔒 FIX: Check for pending mint data on page load and try to save
  // This handles cases where user refreshed page or transaction was pending
  useEffect(() => {
    const checkPendingMint = async () => {
      const saved = localStorage.getItem('vibefid_pending_mint');
      if (!saved) return;

      try {
        const data = JSON.parse(saved);
        // Only try to save if data is recent (less than 1 hour old)
        const age = Date.now() - (data.timestamp || 0);
        if (age > 60 * 60 * 1000) {
          console.log('⏰ Pending mint data expired, clearing...');
          localStorage.removeItem('vibefid_pending_mint');
          return;
        }

        console.log('🔄 Found pending mint data, attempting to save to Convex...');
        setError("Recovering unsaved mint data...");

        const validatedData: any = {
          fid: Number(data.fid),
          username: String(data.username),
          displayName: String(data.displayName),
          pfpUrl: String(data.pfpUrl),
          bio: String(data.bio || ""),
          neynarScore: Number(data.neynarScore),
          followerCount: Number(data.followerCount),
          followingCount: Number(data.followingCount),
          powerBadge: Boolean(data.powerBadge),
          address: String(data.address),
          rarity: String(data.rarity),
          foil: String(data.foil),
          wear: String(data.wear),
          power: Number(data.power),
          suit: String(data.suit),
          rank: String(data.rank),
          suitSymbol: String(data.suitSymbol),
          color: String(data.color),
          imageUrl: String(data.imageUrl),
          contractAddress: VIBEFID_CONTRACT_ADDRESS.toLowerCase(),
        };

        if (data.cardImageUrl) validatedData.cardImageUrl = String(data.cardImageUrl);
        if (data.shareImageUrl) validatedData.shareImageUrl = String(data.shareImageUrl);

        await mintCard(validatedData);

        // Success! Clear localStorage
        localStorage.removeItem('vibefid_pending_mint');
        setPendingMintData(null);
        setError(null);
        setMintedSuccessfully(true);
        console.log('✅ Successfully recovered and saved mint data!');
      } catch (err: any) {
        // 🔧 IMPROVED: Better error extraction from Convex errors
        const errorMsg = err?.message || err?.data?.message || err?.data || String(err);
        const errorStr = String(errorMsg).toLowerCase();
        console.error('❌ Failed to recover mint data:', errorStr, err);

        // 🔧 IMPROVED: More keywords to detect duplicate/existing card errors
        const isDuplicateError =
          errorStr.includes('already') ||
          errorStr.includes('duplicate') ||
          errorStr.includes('fid') ||
          errorStr.includes('minted') ||
          errorStr.includes('exists');

        if (isDuplicateError) {
          console.log('ℹ️ Card already exists in Convex, clearing pending data');
          localStorage.removeItem('vibefid_pending_mint');
          setPendingMintData(null);
          setError(null);
          setMintedSuccessfully(true); // Show success since card exists
        } else {
          const cleanError = errorStr.slice(0, 100);
          setError(`Failed to save mint data: ${cleanError}`);
          // Clear localStorage after 5s to prevent stuck state
          setTimeout(() => {
            localStorage.removeItem('vibefid_pending_mint');
            setPendingMintData(null);
          }, 5000);
        }
      }
    };

    // Run on mount
    checkPendingMint();
  }, [mintCard]);

  // Save to Convex after successful on-chain mint
  useEffect(() => {
    if (isConfirmed && pendingMintData) {
      const saveToConvex = async () => {
        try {
          // Play victory sound on successful mint
          AudioManager.win();

          setError("Saving card data...");

          // Validate all required fields
          const validatedData: any = {
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

          // Add cardImageUrl only if it exists (optional field)
          if (pendingMintData.cardImageUrl) {
            validatedData.cardImageUrl = String(pendingMintData.cardImageUrl);
          }

          // Add contractAddress (VibeFID)
          validatedData.contractAddress = VIBEFID_CONTRACT_ADDRESS.toLowerCase();

          // Add shareImageUrl only if it exists (optional field)
          if (pendingMintData.shareImageUrl) {
            validatedData.shareImageUrl = String(pendingMintData.shareImageUrl);
          }

          console.log('💾 Saving to Convex:', validatedData);

          await mintCard(validatedData);
          setError(null);

          // Mark as successfully minted (show share buttons in modal)
          setMintedSuccessfully(true);

          // 🔒 FIX: Clear pending mint data from localStorage (successfully saved to Convex)
          localStorage.removeItem('vibefid_pending_mint');
          setPendingMintData(null);
          console.log('✅ Cleared pending mint data - successfully saved to Convex');

          // Clear localStorage (card has been minted)
          clearGeneratedCard();
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

  // Pagination and search state
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const cardsPerPage = 12;

  // Debounce search to avoid too many queries
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1); // Reset to first page on search
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Queries - Use search query with pagination
  const searchResult = useQuery(api.farcasterCards.searchFarcasterCards, {
    searchTerm: debouncedSearch || undefined,
    limit: cardsPerPage,
    offset: (currentPage - 1) * cardsPerPage,
  });

  // Query to get current user's minted card (if exists)
  const userFid = farcasterContext.user?.fid;
  const myCard = useQuery(
    api.farcasterCards.getFarcasterCardByFid,
    userFid ? { fid: userFid } : "skip"
  );

  const handleShare = async (currentLang: SupportedLanguage) => {
    if (!previewImage || !userData || !generatedTraits) return;

    try {
      const { generateShareImage } = await import('@/lib/generateShareImage');
      const createdAt = await getFarcasterAccountCreationDate(userData.fid);

      const shareImageDataUrl = await generateShareImage({
        cardImageDataUrl: previewImage,
        backstoryData: {
          username: userData.username,
          displayName: userData.display_name,
          bio: userData.profile?.bio?.text || "",
          fid: userData.fid,
          followerCount: userData.follower_count,
          createdAt,
          power: generatedTraits.power,
          bounty: generatedTraits.power * 10,
          rarity: generatedTraits.rarity,
        },
        displayName: userData.display_name,
        lang: currentLang,
      });

      // Download share image
      const link = document.createElement('a');
      link.href = shareImageDataUrl;
      link.download = `vibefid-${userData.fid}.png`;
      link.click();
    } catch (err: any) {
      console.error('Failed to generate share image:', err);
    }
  };

  const handleMintCard = async () => {
    console.log('🎯 handleMintCard called!', { address, userData: !!userData, farcasterUser: farcasterContext.user });

    if (!address) {
      console.error('❌ No wallet address connected');
      setError("Please connect your wallet");
      return;
    }

    if (!userData) {
      console.error('❌ No userData available');
      setError("No user data loaded");
      return;
    }

    console.log('✅ Starting mint process for FID:', userData.fid);
    setLoading(true);
    setError(null);

    try {
      const score = userData.experimental?.neynar_user_score || 0;

      // ALWAYS recalculate traits for mint (don't trust preview/localStorage)
      // This ensures deterministic traits even if preview was generated with old random code
      const rarity = calculateRarityFromScore(score);
      const suit = getSuitFromFid(userData.fid); // DETERMINISTIC based on FID
      const suitSymbol = getSuitSymbol(suit);
      const color = getSuitColor(suit);
      const rank = generateRankFromRarity(rarity);

      // Generate FID-based foil and wear traits (DETERMINISTIC for final mint)
      // NO extraSeed - same FID always gives same traits on-chain
      const fidTraits = getFidTraits(userData.fid);
      const foil = fidTraits.foil;
      const wear = fidTraits.wear;

      console.log('🎯 MINT DEBUG - FID:', userData.fid, 'Calculated Foil:', foil, 'Wear:', wear);

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

      // ALWAYS regenerate card image with recalculated power/bounty
      // This ensures the bounty on the image matches the metadata trait
      // (Don't reuse preview - it might have old bounty from before deterministic fix)
      const createdAt = await getFarcasterAccountCreationDate(userData.fid);
      const cardImageDataUrl = await generateFarcasterCardImage({
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
        bounty: power * 10, // Bounty = Power × 10 (matches metadata API)
        createdAt: createdAt || undefined,
      });

      // Upload static card PNG to IPFS first (for sharing)
      setError("Uploading card image to IPFS...");
      const cardPngBlob = await fetch(cardImageDataUrl).then(r => r.blob());
      const pngFormData = new FormData();
      pngFormData.append('image', cardPngBlob, `card-${userData.fid}.png`);

      const pngUploadResponse = await fetch('/api/upload-nft-image', {
        method: 'POST',
        body: pngFormData,
      });

      if (!pngUploadResponse.ok) {
        throw new Error('Failed to upload card image to IPFS');
      }

      const { ipfsUrl: cardImageIpfsUrl } = await pngUploadResponse.json();

      console.log('🖼️ Card PNG IPFS URL:', cardImageIpfsUrl);
      if (!cardImageIpfsUrl) {
        throw new Error('Card PNG IPFS upload returned empty URL!');
      }

      // Generate share image (card + criminal text for social sharing)
      setError("Generating share image...");
      const { generateShareImage } = await import('@/lib/generateShareImage');

      const shareImageDataUrl = await generateShareImage({
        cardImageDataUrl,
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
        lang, // Use current language from context
      });

      // Upload share image to IPFS
      setError("Uploading share image to IPFS...");
      const shareImageBlob = await fetch(shareImageDataUrl).then(r => r.blob());
      const shareFormData = new FormData();
      shareFormData.append('image', shareImageBlob, `share-${userData.fid}.png`);

      const shareUploadResponse = await fetch('/api/upload-nft-image', {
        method: 'POST',
        body: shareFormData,
      });

      if (!shareUploadResponse.ok) {
        throw new Error('Failed to upload share image to IPFS');
      }

      const { ipfsUrl: shareImageIpfsUrl } = await shareUploadResponse.json();

      console.log('📤 Share Image IPFS URL:', shareImageIpfsUrl);
      if (!shareImageIpfsUrl) {
        throw new Error('Share image IPFS upload returned empty URL!');
      }

      // Generate MP4 video with foil animation (3s static, 5s animated PFP)
      setError("Generating video with foil animation...");
      console.log('🎬 VIDEO DEBUG - About to generate video with foil:', foil);
      const videoBlob = await generateCardVideo({
        cardImageDataUrl,
        foilType: foil as 'None' | 'Standard' | 'Prize',
        // Duration auto-determined: 3s for static PFP, 5s for animated PFP
        pfpUrl: userData.pfp_url, // Pass PFP URL for animated GIF support
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

      console.log('🔥 Video IPFS URL:', ipfsUrl);
      if (!ipfsUrl) {
        throw new Error('IPFS upload returned empty URL!');
      }

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
      // 🔒 FIX: Also save to localStorage to survive page refresh
      const mintData = {
        fid: userData.fid,
        username: userData.username,
        displayName: userData.display_name,
        pfpUrl: userData.pfp_url,
        bio: userData.profile?.bio?.text || "",
        neynarScore: score,
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
        imageUrl: ipfsUrl, // Video (MP4)
        cardImageUrl: cardImageIpfsUrl, // Static PNG for sharing
        shareImageUrl: shareImageIpfsUrl, // Share image with card + criminal text
        timestamp: Date.now(), // Track when mint was initiated
      };
      setPendingMintData(mintData);
      localStorage.setItem('vibefid_pending_mint', JSON.stringify(mintData));
      console.log('💾 Saved pending mint data to localStorage:', userData.fid);

      // Mint NFT on smart contract
      setError("Minting NFT on-chain (confirm transaction in wallet)...");
      console.log('🚀 Preparing mint transaction:', {
        address: VIBEFID_CONTRACT_ADDRESS,
        functionName: 'presignedMint',
        fid: userData.fid,
        metadataUrl,
        mintPrice: MINT_PRICE,
        userAddress: address,
      });

      // Detect iOS for alternative transaction method
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      console.log('📱 Device detection - iOS:', isIOS);

      if (isIOS) {
        // iOS: Use sendTransaction with encoded data (more compatible with Farcaster miniapp)
        console.log('📱 Using sendTransaction for iOS compatibility');
        const data = encodeFunctionData({
          abi: VIBEFID_ABI,
          functionName: 'presignedMint',
          args: [BigInt(userData.fid), metadataUrl, signature as `0x${string}`],
        });

        sendTransaction({
          to: VIBEFID_CONTRACT_ADDRESS,
          data,
          value: parseEther(MINT_PRICE),
        });
      } else {
        // Non-iOS: Use standard writeContract
        console.log('💻 Using writeContract for desktop/Android');
        writeContract({
          address: VIBEFID_CONTRACT_ADDRESS,
          abi: VIBEFID_ABI,
          functionName: 'presignedMint',
          args: [BigInt(userData.fid), metadataUrl, signature as `0x${string}`],
          value: parseEther(MINT_PRICE),
        });
      }

      // Note: Transaction confirmation is handled by useWaitForTransactionReceipt hook
      // After confirmation, data is saved to Convex in useEffect above

    } catch (err: any) {
      setError(err.message || "Failed to mint card");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-vintage-charcoal to-vintage-deep-black p-2 sm:p-4 md:p-8 overflow-x-hidden">
      {/* Language Selector & Mute Button - Fixed Top Right */}
      <div className="fixed top-2 right-2 z-50 flex items-center gap-2">
        <button
          onClick={() => setIsMusicEnabled(!isMusicEnabled)}
          className="p-1.5 bg-vintage-charcoal/90 border border-vintage-gold/30 rounded text-vintage-ice hover:border-vintage-gold transition-colors shadow-md"
          title={isMusicEnabled ? "Mute" : "Unmute"}
        >
          {isMusicEnabled ? "🔊" : "🔇"}
        </button>
        <select
          value={lang}
          onChange={(e) => setLang(e.target.value as any)}
          className="px-2 py-1 bg-vintage-charcoal/90 border border-vintage-gold/30 rounded text-vintage-ice focus:outline-none focus:border-vintage-gold text-xs shadow-md hover:border-vintage-gold transition-colors"
        >
          <option value="en">🇺🇸</option>
          <option value="pt-BR">🇧🇷</option>
          <option value="es">🇪🇸</option>
          <option value="hi">🇮🇳</option>
          <option value="ru">🇷🇺</option>
          <option value="zh-CN">🇨🇳</option>
          <option value="id">🇮🇩</option>
          <option value="fr">🇫🇷</option>
          <option value="ja">🇯🇵</option>
        </select>
      </div>

      <div className="max-w-4xl mx-auto w-full">
        {/* Header */}
        <div className="text-center mb-4 sm:mb-6 md:mb-8 px-2 relative">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold text-vintage-gold mb-2">
            {t.fidPageTitle}
          </h1>
          <p className="text-sm sm:text-base text-vintage-ice mb-3">
            {t.fidPageDesc}
          </p>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Link
              href="/"
              onClick={() => AudioManager.buttonClick()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-vintage-charcoal border border-vintage-gold/30 text-vintage-gold rounded-lg hover:bg-vintage-gold/10 transition-colors text-sm"
            >
              <span>←</span>
              <span>{t.home}</span>
            </Link>
            <button
              onClick={() => {
                AudioManager.buttonClick();
                setShowAboutModal(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-vintage-gold/10 border border-vintage-gold/30 text-vintage-gold rounded-lg hover:bg-vintage-gold/20 transition-colors text-sm"
            >
              <span>{t.aboutTraits}</span>
            </button>
          </div>
        </div>

        {/* Success message when in miniapp */}
        {farcasterContext.isReady && farcasterContext.isInMiniapp && farcasterContext.user && (
          <div className="bg-green-900/30 border border-green-500/50 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6 text-center">
            <p className="text-green-300 text-xs sm:text-sm md:text-base break-words">
              ✅ {t.connectedAs} <span className="font-bold">@{farcasterContext.user.username || `FID ${farcasterContext.user.fid}`}</span>
              {" "}(FID: {farcasterContext.user.fid})
            </p>
          </div>
        )}

        {/* My Card Section (if user has minted card) */}
        {myCard && (
          <div className="bg-gradient-to-br from-vintage-gold/20 to-vintage-burnt-gold/10 rounded-lg sm:rounded-xl border-2 border-vintage-gold p-4 sm:p-6 mb-4 sm:mb-6 md:mb-8 shadow-[0_0_30px_rgba(255,215,0,0.3)]">
            <div className="text-center mb-4">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-vintage-gold mb-2">
                🎴 {t.yourCard || "Your VibeFID Card"}
              </h2>
              <p className="text-sm sm:text-base text-vintage-ice/70">
                {t.alreadyMinted || "You already have a minted card!"}
              </p>
            </div>

            <div className="flex flex-col items-center gap-4">
              {/* View Full Card Button */}
              <Link
                href={`/fid/${myCard.fid}`}
                onClick={() => AudioManager.buttonClick()}
                className="px-6 sm:px-8 py-3 sm:py-4 bg-vintage-gold text-vintage-black font-bold text-base sm:text-lg rounded-lg hover:bg-vintage-burnt-gold transition-all hover:scale-105 shadow-[0_0_20px_rgba(255,215,0,0.4)]"
              >
                {t.viewMyCard || "View My Card"} →
              </Link>

              {/* Check Neynar Score */}
              <button
                onClick={handleCheckNeynarScore}
                disabled={loading}
                className="px-6 sm:px-8 py-3 sm:py-4 bg-vintage-charcoal border-2 border-vintage-gold/50 text-vintage-gold font-bold text-sm sm:text-base rounded-lg hover:bg-vintage-gold/10 transition-all hover:scale-105 disabled:opacity-50"
              >
                📊 {t.checkNeynarScore}
              </button>
            </div>
          </div>
        )}

        {/* Mint Section (only show if user doesn't have a card) */}
        {!myCard && (
          <div className="bg-vintage-black/50 rounded-lg sm:rounded-xl border border-vintage-gold/50 p-3 sm:p-4 md:p-6 mb-4 sm:mb-6 md:mb-8">
            <div className="text-center">
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-vintage-gold mb-4">
                {t.mintYourCard}
              </h2>
              <p className="text-sm sm:text-base text-vintage-ice/70 mb-6">
                {t.transformProfile}
              </p>

              {/* Mint Button */}
              <button
                onClick={handleGenerateCard}
                disabled={loading}
                className="px-6 sm:px-8 py-3 sm:py-4 bg-vintage-gold text-vintage-black font-bold text-base sm:text-lg rounded-lg hover:bg-vintage-burnt-gold transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 shadow-[0_0_20px_rgba(255,215,0,0.4)]"
              >
                {loading ? t.generating : farcasterContext.user ? t.mintMyCard : t.connectFarcasterToMint}
              </button>

              {/* Check Neynar Score Button */}
              {farcasterContext.user && (
                <button
                  onClick={handleCheckNeynarScore}
                  disabled={loading}
                  className="mt-3 px-6 sm:px-8 py-3 sm:py-4 bg-vintage-charcoal border-2 border-vintage-gold/50 text-vintage-gold font-bold text-sm sm:text-base rounded-lg hover:bg-vintage-gold/10 transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
                >
                  {t.checkNeynarScore}
                </button>
              )}

              {error && (
                <div className="mt-4 p-3 sm:p-4 bg-red-900/50 border border-red-500 rounded-lg text-red-200 text-sm sm:text-base break-words">
                  {error}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Generation Modal */}
        <FidGenerationModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          backstoryData={backstoryData}
          displayName={userData?.display_name || ""}
          previewImage={previewImage}
          generatedTraits={generatedTraits}
          onMint={handleMintCard}
          isMinting={loading || isContractPending || isSendPending || isConfirming}
          isMintedSuccessfully={mintedSuccessfully}
          fid={userData?.fid}
          onShare={handleShare}
          username={userData?.username}
          walletAddress={address}
          onConnectWallet={async () => {
            const farcasterConnector = connectors.find((c) =>
              c.id === 'farcasterMiniApp' ||
              c.id === 'farcaster' ||
              c.name?.toLowerCase().includes('farcaster')
            );
            if (farcasterConnector) {
              try {
                await connect({ connector: farcasterConnector });
              } catch (err) {
                console.error('Failed to connect wallet:', err);
              }
            }
          }}
        />

        {/* Neynar Score Modal */}
        {showScoreModal && neynarScoreData && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-vintage-charcoal rounded-xl border-2 border-vintage-gold/50 p-6 max-w-md w-full">
              <h2 className="text-2xl font-bold text-vintage-gold mb-4 text-center">
                {t.neynarScoreTitle}
              </h2>

              <div className="bg-vintage-black/50 rounded-lg border border-vintage-gold/30 p-6 mb-6">
                <div className="text-center mb-4">
                  <p className="text-vintage-burnt-gold text-sm mb-2">@{neynarScoreData.username} (FID #{neynarScoreData.fid})</p>
                  <div className="text-5xl font-bold text-vintage-gold mb-2">
                    {neynarScoreData.score.toFixed(3)}
                  </div>
                  <p className="text-vintage-ice text-sm font-bold">{t.currentScore} ⚡</p>
                  <p className="text-vintage-ice/60 text-xs mt-1">(Real-time from Neynar API)</p>
                </div>

                <div className="border-t border-vintage-gold/20 pt-4">
                  <p className="text-vintage-burnt-gold text-sm mb-2 text-center">{t.rarity}</p>
                  <p className="text-vintage-ice text-xl font-bold text-center">{neynarScoreData.rarity}</p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    AudioManager.buttonClick();
                    setShowScoreModal(false);
                  }}
                  className="flex-1 px-4 py-3 bg-vintage-charcoal border border-vintage-gold/30 text-vintage-gold rounded-lg hover:bg-vintage-gold/10 transition-colors"
                >
                  {t.back}
                </button>
                <a
                  href={(() => {
                    const shareUrl = 'https://www.vibemostwanted.xyz/fid';
                    const castText = `📊 My Neynar Score: ${neynarScoreData.score.toFixed(3)}\n${neynarScoreData.rarity} Rarity\n\n🎴 Check your score and mint your VibeFID card! @jvhbo`;
                    return `https://warpcast.com/~/compose?text=${encodeURIComponent(castText)}&embeds[]=${encodeURIComponent(shareUrl)}`;
                  })()}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => AudioManager.buttonClick()}
                  className="flex-1 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg transition-colors text-center"
                >
                  {t.shareToFarcaster}
                </a>
              </div>
            </div>
          </div>
        )}

        {/* All Minted Cards with Pagination and Search */}
        {searchResult && (() => {
          const { cards: currentCards, totalCount, hasMore } = searchResult;
          const totalPages = Math.ceil(totalCount / cardsPerPage);
          const startIndex = (currentPage - 1) * cardsPerPage;
          const endIndex = Math.min(startIndex + cardsPerPage, totalCount);

          return (
            <div className="bg-vintage-black/50 rounded-lg sm:rounded-xl border border-vintage-gold/50 p-3 sm:p-4 md:p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-vintage-gold">
                  {t.allMinted}
                </h2>

                {/* Search Input */}
                <div className="relative w-full sm:w-auto">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder={t.searchPlaceholder || "Search by name or FID..."}
                    className="w-full sm:w-64 px-4 py-2 pl-10 bg-vintage-charcoal border border-vintage-gold/30 rounded-lg text-vintage-ice placeholder-vintage-ice/50 focus:outline-none focus:border-vintage-gold text-sm"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-vintage-ice/50">🔍</span>
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-vintage-ice/50 hover:text-vintage-ice text-sm"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* Cards Grid */}
              {currentCards.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                {currentCards.map((card: any) => (
                  <Link
                    key={card._id}
                    href={`/fid/${card.fid}`}
                    onClick={() => AudioManager.buttonClick()}
                    className="bg-vintage-charcoal rounded-lg border border-vintage-gold/30 p-4 hover:border-vintage-gold transition-all hover:scale-105 cursor-pointer"
                  >
                    {/* Card Symbol */}
                    <div className="text-center mb-2">
                      <span className={`text-4xl font-bold ${card.color === 'red' ? 'text-red-500' : 'text-black'}`}>
                        {card.rank}{card.suitSymbol}
                      </span>
                    </div>

                    {/* Card Image (use cardImageUrl if available, fallback to pfpUrl) */}
                    <img
                      src={card.cardImageUrl || card.pfpUrl}
                      alt={card.username}
                      className="w-full aspect-[3/4] object-contain rounded-lg mb-2 bg-vintage-black/50"
                      onError={(e) => {
                        // Fallback to pfpUrl if cardImageUrl fails
                        if (card.cardImageUrl && (e.target as HTMLImageElement).src !== card.pfpUrl) {
                          (e.target as HTMLImageElement).src = card.pfpUrl;
                        }
                      }}
                    />
                    <p className="text-vintage-gold font-bold truncate">{card.displayName}</p>
                    <p className="text-vintage-ice/70 text-sm truncate">
                      <a
                        href={`https://farcaster.xyz/${card.username}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-vintage-gold hover:text-vintage-burnt-gold transition-colors underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        @{card.username}
                      </a>
                    </p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-vintage-burnt-gold text-sm">{card.rarity}</span>
                      <span className="text-vintage-ice text-sm">⚡ {card.power}</span>
                    </div>
                    <div className="mt-1 text-center text-xs text-vintage-ice/50">
                      Score: {card.neynarScore.toFixed(2)}
                    </div>

                    <div className="mt-3 text-center text-xs text-vintage-burnt-gold">
                      Click to view card →
                    </div>
                  </Link>
                ))}
              </div>
              ) : (
                <div className="text-center py-12 text-vintage-ice/60">
                  <span className="text-4xl block mb-4">🔍</span>
                  <p className="text-lg">{t.noCardsFound || "No cards found"}</p>
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm("")}
                      className="mt-4 px-4 py-2 bg-vintage-gold/20 border border-vintage-gold/30 text-vintage-gold rounded-lg hover:bg-vintage-gold/30 transition-colors text-sm"
                    >
                      {t.clearSearch || "Clear search"}
                    </button>
                  )}
                </div>
              )}

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  {/* Previous Button */}
                  <button
                    onClick={() => {
                      AudioManager.buttonClick();
                      setCurrentPage(prev => Math.max(1, prev - 1));
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    disabled={currentPage === 1}
                    className="px-4 py-2 bg-vintage-charcoal border border-vintage-gold/30 text-vintage-gold rounded-lg hover:bg-vintage-gold/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    {t.previous}
                  </button>

                  {/* Page Numbers */}
                  <div className="flex gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                      // Show first page, last page, current page, and pages around current
                      const showPage =
                        pageNum === 1 ||
                        pageNum === totalPages ||
                        (pageNum >= currentPage - 1 && pageNum <= currentPage + 1);

                      // Show ellipsis
                      const showEllipsisBefore = pageNum === currentPage - 2 && currentPage > 3;
                      const showEllipsisAfter = pageNum === currentPage + 2 && currentPage < totalPages - 2;

                      if (!showPage && !showEllipsisBefore && !showEllipsisAfter) {
                        return null;
                      }

                      if (showEllipsisBefore || showEllipsisAfter) {
                        return (
                          <span key={pageNum} className="px-2 py-2 text-vintage-ice/50">
                            ...
                          </span>
                        );
                      }

                      return (
                        <button
                          key={pageNum}
                          onClick={() => {
                            AudioManager.buttonClick();
                            setCurrentPage(pageNum);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                            currentPage === pageNum
                              ? 'bg-vintage-gold text-vintage-black font-bold'
                              : 'bg-vintage-charcoal border border-vintage-gold/30 text-vintage-gold hover:bg-vintage-gold/10'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  {/* Next Button */}
                  <button
                    onClick={() => {
                      AudioManager.buttonClick();
                      setCurrentPage(prev => Math.min(totalPages, prev + 1));
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 bg-vintage-charcoal border border-vintage-gold/30 text-vintage-gold rounded-lg hover:bg-vintage-gold/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    {t.next}
                  </button>
                </div>
              )}

              {/* Page Info */}
              {totalCount > 0 && (
              <div className="mt-4 text-center text-sm text-vintage-ice/70">
                {t.pageOf} {currentPage} {t.of} {totalPages} • {t.showing} {startIndex + 1}-{endIndex} {t.of} {totalCount} {t.cards}
              </div>
              )}
            </div>
          );
        })()}

        {/* About Traits Modal */}
        <FidAboutTraitsModal
          isOpen={showAboutModal}
          onClose={() => setShowAboutModal(false)}
        />

        {/* OLD MODAL REMOVED - replaced with FidAboutTraitsModal component */}
        {false && showAboutModal && (
          <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50 overflow-y-auto hidden">
            <div className="bg-vintage-charcoal rounded-xl border-2 border-vintage-gold max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="sticky top-0 bg-vintage-charcoal border-b-2 border-vintage-gold/30 p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl sm:text-2xl md:text-3xl font-display font-bold text-vintage-gold">
                    {fidTranslations[lang].aboutTraits}
                  </h2>
                  <button
                    onClick={() => {
                      AudioManager.buttonClick();
                      setShowAboutModal(false);
                    }}
                    className="text-vintage-ice hover:text-vintage-gold text-2xl sm:text-3xl leading-none bg-vintage-black/70 rounded-full w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center"
                  >
                    ×
                  </button>
                </div>

                {/* Language Selector */}
                <select
                  value={lang}
                  onChange={(e) => {
                    AudioManager.toggleOn();
                    setLang(e.target.value as any);
                  }}
                  className="px-3 py-2 bg-vintage-charcoal border border-vintage-gold/30 rounded-lg text-vintage-ice focus:outline-none focus:border-vintage-gold text-sm"
                >
                  <option value="en">🇺🇸 English</option>
                  <option value="pt-BR">🇧🇷 Português</option>
                  <option value="es">🇪🇸 Español</option>
                  <option value="hi">🇮🇳 हिन्दी</option>
                  <option value="ru">🇷🇺 Русский</option>
                  <option value="zh-CN">🇨🇳 中文</option>
                  <option value="id">🇮🇩 Bahasa</option>
                  <option value="fr">🇫🇷 Français</option>
                  <option value="ja">🇯🇵 日本語</option>
                </select>
              </div>

              {/* Content */}
              <div className="p-4 sm:p-6 space-y-6">
                <p className="text-vintage-ice text-sm sm:text-base leading-relaxed">
                  VibeFID cards have unique traits that determine their power and value. All traits are <span className="text-vintage-gold font-bold">deterministic</span> - your FID always gets the same traits!
                </p>

                {/* FID & Neynar Score */}
                <div className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 rounded-lg border-2 border-blue-500/50 p-4">
                  <h3 className="text-lg sm:text-xl font-bold text-blue-300 mb-3 flex items-center gap-2">
                    <span>🆔</span> FID & Neynar Score
                  </h3>
                  <div className="space-y-3 text-vintage-ice/80 text-sm">
                    <p>
                      <span className="font-bold text-blue-300">FID (Farcaster ID):</span> Your unique Farcaster identifier. It determines your <span className="font-bold">Suit</span> (♠ ♥ ♦ ♣), <span className="font-bold">Foil</span>, and <span className="font-bold">Wear</span> traits through deterministic algorithms - the same FID always gets the same traits!
                    </p>
                    <p>
                      <span className="font-bold text-purple-300">Neynar Score:</span> Measures your Farcaster engagement and reputation (followers, casts, reactions, etc.). Higher scores = <span className="font-bold text-vintage-gold">rarer cards</span> with more base power!
                    </p>
                    <div className="mt-2 p-3 bg-vintage-black/40 rounded border border-blue-500/30 text-xs">
                      💡 <span className="font-bold">Pro tip:</span> Engage more on Farcaster to increase your Neynar Score and get better cards!
                    </div>
                  </div>
                </div>

                {/* Rarity */}
                <div className="bg-vintage-black/50 rounded-lg border border-vintage-gold/30 p-4">
                  <h3 className="text-lg sm:text-xl font-bold text-vintage-gold mb-3 flex items-center gap-2">
                    <span>🎯</span> Rarity
                  </h3>
                  <p className="text-vintage-ice/80 text-sm mb-3">
                    Based on your Neynar Score. Higher scores = rarer cards with more base power.
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-purple-400 font-bold">Mythic</span>
                      <span className="text-vintage-ice text-sm">600 base power</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-orange-400 font-bold">Legendary</span>
                      <span className="text-vintage-ice text-sm">100 base power</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-pink-400 font-bold">Epic</span>
                      <span className="text-vintage-ice text-sm">50 base power</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-blue-400 font-bold">Rare</span>
                      <span className="text-vintage-ice text-sm">20 base power</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 font-bold">Common</span>
                      <span className="text-vintage-ice text-sm">10 base power</span>
                    </div>
                  </div>
                </div>

                {/* Foil */}
                <div className="bg-vintage-black/50 rounded-lg border border-vintage-gold/30 p-4">
                  <h3 className="text-lg sm:text-xl font-bold text-vintage-gold mb-3 flex items-center gap-2">
                    <span>✨</span> Foil Type
                  </h3>
                  <p className="text-vintage-ice/80 text-sm mb-3">
                    Randomly assigned based on your FID. Foil cards have visual effects and power multipliers!
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-purple-400 font-bold">Prize Foil</span>
                      <span className="text-vintage-ice text-sm">×6.0 power • 15% chance</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-blue-400 font-bold">Standard Foil</span>
                      <span className="text-vintage-ice text-sm">×2.0 power • 50% chance</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 font-bold">None</span>
                      <span className="text-vintage-ice text-sm">×1.0 power • 35% chance</span>
                    </div>
                  </div>
                </div>

                {/* Wear */}
                <div className="bg-vintage-black/50 rounded-lg border border-vintage-gold/30 p-4">
                  <h3 className="text-lg sm:text-xl font-bold text-vintage-gold mb-3 flex items-center gap-2">
                    <span>💎</span> Wear Condition
                  </h3>
                  <p className="text-vintage-ice/80 text-sm mb-3">
                    Randomly assigned based on your FID. Better condition = higher power!
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-green-400 font-bold">Pristine</span>
                      <span className="text-vintage-ice text-sm">×1.8 power • 40% chance</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-blue-400 font-bold">Mint</span>
                      <span className="text-vintage-ice text-sm">×1.4 power • 40% chance</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 font-bold">Lightly Played</span>
                      <span className="text-vintage-ice text-sm">×1.0 power • 20% chance</span>
                    </div>
                  </div>
                </div>

                {/* Power Calculation */}
                <div className="bg-gradient-to-br from-vintage-gold/20 to-vintage-burnt-gold/20 rounded-lg border-2 border-vintage-gold p-4">
                  <h3 className="text-lg sm:text-xl font-bold text-vintage-gold mb-3 flex items-center gap-2">
                    <span>⚡</span> Power Calculation
                  </h3>
                  <div className="text-center">
                    <div className="text-vintage-ice text-sm sm:text-base mb-2">
                      Power = <span className="text-vintage-gold font-bold">Base Power</span> × <span className="text-blue-400 font-bold">Foil</span> × <span className="text-green-400 font-bold">Wear</span>
                    </div>
                    <div className="text-vintage-ice/60 text-xs sm:text-sm mt-3">
                      Example: Mythic (600) × Prize Foil (6.0) × Pristine (1.8) = <span className="text-vintage-gold font-bold">6,480 Power</span>
                    </div>
                  </div>
                </div>

                {/* Card & Suit */}
                <div className="bg-vintage-black/50 rounded-lg border border-vintage-gold/30 p-4">
                  <h3 className="text-lg sm:text-xl font-bold text-vintage-gold mb-3 flex items-center gap-2">
                    <span>🃏</span> Card & Suit
                  </h3>
                  <p className="text-vintage-ice/80 text-sm">
                    <span className="font-bold">Suit</span> (♠ ♥ ♦ ♣) is deterministic based on FID.<br/>
                    <span className="font-bold">Rank</span> (A, K, Q, J, 10-2) is based on your rarity - higher rarity = higher rank.
                  </p>
                </div>

                {/* Bounty */}
                <div className="bg-vintage-black/50 rounded-lg border border-vintage-gold/30 p-4">
                  <h3 className="text-lg sm:text-xl font-bold text-vintage-gold mb-3 flex items-center gap-2">
                    <span>💰</span> Bounty
                  </h3>
                  <p className="text-vintage-ice/80 text-sm">
                    Your bounty reward = <span className="text-vintage-gold font-bold">Power × 10</span>
                  </p>
                </div>

                {/* Close Button */}
                <button
                  onClick={() => {
                    AudioManager.buttonClick();
                    setShowAboutModal(false);
                  }}
                  className="w-full px-6 py-3 bg-vintage-gold text-vintage-black font-bold rounded-lg hover:bg-vintage-burnt-gold transition-colors"
                >
                  {fidTranslations[lang].gotIt}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
