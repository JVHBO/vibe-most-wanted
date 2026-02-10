'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useAction } from 'convex/react';
import { api } from '@/lib/fid/convex-generated/api';
import { useLanguage } from '@/contexts/LanguageContext';
import { generateCriminalBackstory } from '@/lib/fid/generateCriminalBackstory';
import { getFarcasterAccountCreationDate } from '@/lib/fid/farcasterRegistry';
import CriminalBackstoryCard from '@/components/fid/CriminalBackstoryCard';
import Link from 'next/link';
import { CardMedia } from '@/components/fid/CardMedia';
import { convertIpfsUrl } from '@/lib/fid/ipfs-url-converter';
import FoilCardEffect from '@/components/fid/FoilCardEffect';
import { getFidTraits } from '@/lib/fid/fidTraits';
import { sdk } from '@farcaster/miniapp-sdk';
import { getUserByFid, calculateRarityFromScore } from '@/lib/fid/neynar';
import { AudioManager } from '@/lib/fid/audio-manager';
import { useFarcasterContext } from '@/hooks/fid/useFarcasterContext';
import { fidTranslations } from '@/lib/fid/fidTranslations';
import { generateFarcasterCardImage } from '@/lib/fid/generateFarcasterCard';
import { generateCardVideo } from '@/lib/fid/generateCardVideo';
import { generateShareImage } from '@/lib/fid/generateShareImage';
import { convertIpfsToDataUrl } from '@/lib/fid/ipfs-url-converter';
import { useVibeVote } from '@/hooks/fid/useVibeVote';
import { DailyLeader } from '@/components/fid/DailyLeader';
import { useAccount } from 'wagmi';
import { useVBMSBalance, useClaimVBMS } from '@/hooks/fid/useVBMSContracts';
import { VibeMailInbox, VibeMailComposer } from '@/components/fid/VibeMail';
import { shareToFarcaster } from '@/lib/fid/share-utils';

// Helper to calculate rarity from score for display
const getRarityFromScore = (score: number) => {
  if (score >= 0.99) return 'Mythic';
  if (score >= 0.90) return 'Legendary';
  if (score >= 0.79) return 'Epic';
  if (score >= 0.70) return 'Rare';
  return 'Common';
};

export default function FidCardPage() {
  const params = useParams();
  const fid = parseInt(params.fid as string);
  const { lang, setLang } = useLanguage();
  const farcasterContext = useFarcasterContext();
  const t = fidTranslations[lang];

  // DEV MODE: Simulate Farcaster context for localhost testing
  const isLocalhost = typeof window !== 'undefined' && window.location.hostname === 'localhost';
  const devUser = isLocalhost ? { fid: fid, username: 'test' } : null;
  const effectiveUser = farcasterContext.user || devUser;

  // Check if viewing own card (only owner can upgrade)
  const isOwnCard = effectiveUser?.fid === fid;

  // Fetch all cards for this FID
  const fidCards = useQuery(api.farcasterCards.getFarcasterCardsByFid, { fid });

  // Neynar score history
  const scoreHistory = useQuery(api.neynarScore.getScoreHistory, { fid });
  const saveScoreCheck = useMutation(api.neynarScore.saveScoreCheck);
  const upgradeCardRarity = useMutation(api.farcasterCards.upgradeCardRarity);
  const refreshCardScore = useMutation(api.farcasterCards.refreshCardScore);
  const updateCardImages = useMutation(api.farcasterCards.updateCardImages);

  // Vibe Rewards
  const vibeRewards = useQuery(api.vibeRewards.getRewards, { fid });
  const prepareVibeRewardsClaim = useAction(api.vibeRewards.prepareVibeRewardsClaim);
  const restoreClaimOnTxFailure = useMutation(api.vibeRewards.restoreClaimOnTxFailure);
  const [isClaiming, setIsClaiming] = useState(false);

  // Get the most recent card (first one)
  const card = fidCards?.[0];

  // Use traits from database (set at mint time)
  const currentTraits = card ? { foil: card.foil, wear: card.wear } : null;

  // Calculate power based on rarity + stored traits from database
  const correctPower = card && currentTraits ? (() => {
    const rarityBasePower = {
      Common: 10, Rare: 20, Epic: 50, Legendary: 100, Mythic: 600,
    };
    const wearMultiplier = {
      Pristine: 1.8, Mint: 1.4, 'Lightly Played': 1.0,
      'Moderately Played': 1.0, 'Heavily Played': 1.0,
    };
    const foilMultiplier = {
      Prize: 6.0, Standard: 2.0, None: 1.0,
    };
    const basePower = rarityBasePower[card.rarity as keyof typeof rarityBasePower] || 5;
    const wearMult = wearMultiplier[currentTraits.wear as keyof typeof wearMultiplier] || 1.0;
    const foilMult = foilMultiplier[currentTraits.foil as keyof typeof foilMultiplier] || 1.0;
    return Math.round(basePower * wearMult * foilMult);
  })() : 0;


  const [backstory, setBackstory] = useState<any>(null);

  // Neynar score state
  const [neynarScoreData, setNeynarScoreData] = useState<{ score: number; rarity: string; fid: number; username: string; displayName: string; pfpUrl: string } | null>(null);
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Upgrade state
  const [showEvolutionModal, setShowEvolutionModal] = useState(false);
  const [evolutionData, setEvolutionData] = useState<{
    oldRarity: string;
    newRarity: string;
    oldPower: number;
    newPower: number;
    oldScore: number;
    newScore: number;
    newBounty: number;
  } | null>(null);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [evolutionPhase, setEvolutionPhase] = useState<'idle' | 'shaking' | 'glowing' | 'transforming' | 'regenerating' | 'complete'>('idle');
  const [regenerationStatus, setRegenerationStatus] = useState<string>('');
  const [isRefreshingMetadata, setIsRefreshingMetadata] = useState(false);
  const [metadataRefreshed, setMetadataRefreshed] = useState(false);
  const [showOpenSeaModal, setShowOpenSeaModal] = useState(false);
  const [showVBMSModal, setShowVBMSModal] = useState(false);

  // Share with language state
  const [showShareModal, setShowShareModal] = useState(false);
  const [showBackstoryModal, setShowBackstoryModal] = useState(false);
  const [shareLanguage, setShareLanguage] = useState(lang);
  const [isGeneratingShare, setIsGeneratingShare] = useState(false);

  // Wallet connection for VBMS payments
  const { address: connectedAddress, isConnected: isWalletConnected } = useAccount();
  const { balance: vbmsBalance } = useVBMSBalance(connectedAddress);
  const { claimVBMS, isPending: isClaimTxPending } = useClaimVBMS();

  // Debug log
  console.log("🔌 Wallet:", isWalletConnected ? connectedAddress : "NOT CONNECTED");
  console.log("💰 VBMS Balance:", vbmsBalance);
  console.log("🎯 isOwnCard:", isOwnCard, "effectiveUser?.fid:", effectiveUser?.fid, "cardFid:", fid);
  console.log("🏆 vibeRewards:", vibeRewards);

  // Voting system
  const viewerFid = effectiveUser?.fid || 0;
  const viewerAddress = connectedAddress || '0x0000000000000000000000000000000000000000' as `0x${string}`;
  const {
    isVoting,
    hasVoted,
    totalVotes,
    freeVotesRemaining,
    prizeInfo,
    voteFree,
    votePaid,
    voteCostVBMS,
    txHash,
  } = useVibeVote({ cardFid: fid, voterFid: viewerFid, voterAddress: viewerAddress });

  // Paid vote modal state
  const [showPaidVoteModal, setShowPaidVoteModal] = useState(false);
  const [vibeMailTab, setVibeMailTab] = useState<'free' | 'paid'>('free'); // 'free' or 'paid'
  const [showFreeVoteModal, setShowFreeVoteModal] = useState(false);
  const [freeVibeMailMessage, setFreeVibeMailMessage] = useState('');
  const [freeVibeMailAudioId, setFreeVibeMailAudioId] = useState<string | null>(null);
  const [freeVibeMailImageId, setFreeVibeMailImageId] = useState<string | null>(null);
  const [showVoteExplainModal, setShowVoteExplainModal] = useState(false);
  const [paidVoteCount, setPaidVoteCount] = useState(1);

  // VibeMail state
  const [vibeMailMessage, setVibeMailMessage] = useState('');
  const [vibeMailAudioId, setVibeMailAudioId] = useState<string | null>(null);
  const [vibeMailImageId, setVibeMailImageId] = useState<string | null>(null);
  const [showVibeMailInbox, setShowVibeMailInbox] = useState(false);
  const unreadMessageCount = useQuery(
    api.cardVotes.getUnreadMessageCount,
    isOwnCard ? { cardFid: fid } : 'skip'
  );

  // Handle share with selected language - uses score GIF
  const handleShareWithLanguage = async (selectedLang: typeof lang) => {
    if (!card) return;

    try {
      setShowShareModal(false);

      // Get translations for selected language
      const shareT = fidTranslations[selectedLang];

      // Fetch VibeFID rank from Convex
      let vibefidRankText = '';
      try {
        const convexUrl = "https://scintillating-mandrill-101.convex.cloud";
        const rankResponse = await fetch(`${convexUrl}/api/query`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            path: 'farcasterCards:getVibeFIDRank',
            args: { fid: card.fid },
            format: 'json',
          }),
        });
        if (rankResponse.ok) {
          const rankData = await rankResponse.json();
          if (rankData.value?.rank) {
            vibefidRankText = `🏆 VibeFID Rank: #${rankData.value.rank} / ${rankData.value.totalCards}`;
          }
        }
      } catch (e) {
        console.log('Failed to fetch VibeFID rank');
      }

      // Fetch global rank from OpenRank (via proxy to avoid CORS)
      let globalRankText = '';
      const currentScore = neynarScoreData?.score ?? card.neynarScore ?? 0;
      try {
        const openRankResponse = await fetch('/api/fid/openrank', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fid: card.fid }),
        });
        if (openRankResponse.ok) {
          const openRankData = await openRankResponse.json();
          if (openRankData.rank) {
            globalRankText = `🌍 Global Rank: #${openRankData.rank.toLocaleString()}`;
          }
        }
      } catch (e) {
        console.log('OpenRank failed, using estimate');
      }

      // Fallback estimate if OpenRank failed
      if (!globalRankText) {
        let estimate = 'Top 50%';
        if (currentScore >= 1.00) estimate = 'Top 50';
        else if (currentScore >= 0.99) estimate = 'Top 200';
        else if (currentScore >= 0.95) estimate = 'Top 1k';
        else if (currentScore >= 0.90) estimate = 'Top 2.5k';
        else if (currentScore >= 0.85) estimate = 'Top 5k';
        else if (currentScore >= 0.80) estimate = 'Top 10k';
        else if (currentScore >= 0.70) estimate = 'Top 25k';
        globalRankText = `🌍 Global: ${estimate}`;
      }

      // Build cast text
      const foilText = currentTraits?.foil !== 'None' ? ` | ${currentTraits?.foil} Foil` : '';

      // Calculate score diff from mint (currentScore already defined above)
      const mintScore = card.neynarScore ?? currentScore;
      const scoreDiff = currentScore - mintScore;
      const diffSign = scoreDiff >= 0 ? '+' : '';

      // Check for rarity upgrade
      const mintRarity = scoreHistory?.mintRarity || card.rarity;
      const currentRarity = neynarScoreData?.rarity || card.rarity;
      const rarityChanged = mintRarity && mintRarity !== currentRarity;
      const upgradeText = rarityChanged
        ? `\n⬆️ ${mintRarity} → ${currentRarity}`
        : '';

      // Build ranking section
      const rankingSection = [vibefidRankText, globalRankText].filter(Boolean).join('\n');

      const castText = `${shareT.yourVibeFidCard || 'My VibeFID Card'} 🎴

${currentRarity}${foilText}
⚡ ${correctPower} Power
📊 Score: ${currentScore.toFixed(3)} (${diffSign}${scoreDiff.toFixed(4)})${upgradeText}

${rankingSection}

FID #${card.fid}

${shareT.shareTextMintYours || 'Mint yours at'} @jvhbo`;

      // Share URL - uses static PNG image
      const shareUrl = `https://vibemostwanted.xyz/share/score/${card.fid}?v=${Date.now()}`;

      await shareToFarcaster(castText, shareUrl);
    } catch (error) {
      console.error('Share failed:', error);
      alert('Failed to share. Please try again.');
    }
  };

  // Refresh OpenSea metadata
  const handleRefreshMetadata = async () => {
    if (!card) return;

    AudioManager.buttonClick();
    setIsRefreshingMetadata(true);
    setMetadataRefreshed(false);

    try {
      const response = await fetch('/api/fid/opensea/refresh-metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fid: card.fid }),
      });

      if (response.ok) {
        setMetadataRefreshed(true);
        setTimeout(() => setMetadataRefreshed(false), 5000);
      }
    } catch (e) {
      console.error('Refresh metadata failed:', e);
    }

    setIsRefreshingMetadata(false);
  };

  // Check Neynar Score
  const handleCheckNeynarScore = async () => {
    AudioManager.buttonClick();

    if (!farcasterContext.user) {
      setError("Please connect your Farcaster account first");
      setTimeout(() => setError(null), 3000);
      return;
    }

    // Use the card's FID (from URL), not the viewer's FID
    const cardFid = fid;
    setLoading(true);
    setError(null);

    try {
      const user = await getUserByFid(cardFid);
      if (!user) {
        setError(`No user found for FID ${cardFid}`);
        setLoading(false);
        setTimeout(() => setError(null), 3000);
        return;
      }

      const score = user.experimental.neynar_user_score;
      const rarity = calculateRarityFromScore(score);

      // Only save score to history if viewing own card
      if (isOwnCard) {
        await saveScoreCheck({
          fid: user.fid,
          username: user.username,
          score,
          rarity,
        });
      }

      setNeynarScoreData({
        score,
        rarity,
        fid: user.fid,
        username: user.username,
        displayName: user.display_name,
        pfpUrl: user.pfp_url,
      });
      setShowScoreModal(true);
      setLoading(false);
    } catch (err: any) {
      setError(err.message || "Failed to fetch Neynar score");
      setLoading(false);
      setTimeout(() => setError(null), 3000);
    }
  };

  // Check if upgrade is available (only for card owner)
  // Allow: ONE TIME sync (if never upgraded) OR rarity would change OR score changed significantly
  const canUpgrade = () => {
    if (!isOwnCard || !card || !neynarScoreData) return false;
    const rarityOrder = ['Common', 'Rare', 'Epic', 'Legendary', 'Mythic'];
    const currentRarityIndex = rarityOrder.indexOf(card.rarity);
    const newRarityIndex = rarityOrder.indexOf(neynarScoreData.rarity);
    const rarityImproved = newRarityIndex > currentRarityIndex;
    const neverUpgraded = !card.upgradedAt;
    // Allow refresh if score changed by more than 0.02 (updates card image)
    const scoreChanged = Math.abs(neynarScoreData.score - card.neynarScore) > 0.02;
    // Allow upgrade if: never synced before OR rarity would improve OR score changed
    return neverUpgraded || rarityImproved || scoreChanged;
  };

  // Check if this is a rarity upgrade or just a score refresh
  const isRarityUpgrade = () => {
    if (!card || !neynarScoreData) return false;
    const rarityOrder = ['Common', 'Rare', 'Epic', 'Legendary', 'Mythic'];
    return rarityOrder.indexOf(neynarScoreData.rarity) > rarityOrder.indexOf(card.rarity);
  };

  // Play evolution sound
  const playEvolutionSound = () => {
    try {
      const audio = new Audio('/sounds/evolution.mp3');
      audio.volume = 0.7;
      audio.play().catch(e => console.log('Audio play failed:', e));
    } catch (e) {
      console.log('Audio error:', e);
    }
  };

  // Handle upgrade with animation and video regeneration (only card owner can upgrade)
  const handleUpgrade = async () => {
    // Only the card owner can perform the upgrade
    if (!isOwnCard || !card || !neynarScoreData || !canUpgrade()) return;

    AudioManager.buttonClick();
    setIsUpgrading(true);
    setShowScoreModal(false);
    setShowEvolutionModal(true);
    setEvolutionPhase('shaking');
    setRegenerationStatus('');

    // Animation sequence
    await new Promise(resolve => setTimeout(resolve, 800)); // Shake
    setEvolutionPhase('glowing');
    await new Promise(resolve => setTimeout(resolve, 1200)); // Glow

    // Play evolution sound when transforming starts
    playEvolutionSound();
    setEvolutionPhase('transforming');
    await new Promise(resolve => setTimeout(resolve, 1500)); // Transform (longer to match sound)

    try {
      // Step 1: Upgrade rarity/power OR just refresh score
      let result;
      let newBounty;

      if (isRarityUpgrade()) {
        // Full upgrade - changes rarity, power, score, and profile
        result = await upgradeCardRarity({
          fid: card.fid,
          newNeynarScore: neynarScoreData.score,
          newRarity: neynarScoreData.rarity,
          username: neynarScoreData.username,
          displayName: neynarScoreData.displayName,
          pfpUrl: neynarScoreData.pfpUrl,
        });
        newBounty = result.newPower * 10;
      } else {
        // Just refresh score and profile - keep rarity and power
        result = await refreshCardScore({
          fid: card.fid,
          newNeynarScore: neynarScoreData.score,
          username: neynarScoreData.username,
          displayName: neynarScoreData.displayName,
          pfpUrl: neynarScoreData.pfpUrl,
        });
        newBounty = card.power * 10; // Keep same bounty
      }

      // Step 2: Regenerate video with new values
      setEvolutionPhase('regenerating');
      setRegenerationStatus('Generating new card image...');

      // Generate new card image with updated values (use new profile data)
      const cardImageDataUrl = await generateFarcasterCardImage({
        pfpUrl: neynarScoreData.pfpUrl,
        displayName: neynarScoreData.displayName,
        username: neynarScoreData.username,
        fid: card.fid,
        neynarScore: neynarScoreData.score, // Use NEW score for card image
        rarity: isRarityUpgrade() && 'newRarity' in result ? result.newRarity : card.rarity, // Use new or keep current
        suit: card.suit as any,
        rank: card.rank as any,
        suitSymbol: card.suitSymbol,
        color: card.color as 'red' | 'black',
        bio: card.bio || '',
        bounty: newBounty,
      });

      setRegenerationStatus('Generating video with foil effect...');

      // Generate video with foil animation (use new pfp)
      const videoBlob = await generateCardVideo({
        cardImageDataUrl,
        foilType: card.foil as 'None' | 'Standard' | 'Prize',
        duration: 3,
        fps: 30,
        pfpUrl: neynarScoreData.pfpUrl,
      });

      setRegenerationStatus('Uploading to IPFS...');

      // Upload VIDEO to IPFS
      const videoFormData = new FormData();
      videoFormData.append('video', videoBlob, 'card.webm');

      const videoUploadResponse = await fetch('/api/fid/upload-nft-video', {
        method: 'POST',
        body: videoFormData,
      });

      if (!videoUploadResponse.ok) {
        const uploadError = await videoUploadResponse.json();
        throw new Error(uploadError.error || 'Failed to upload video');
      }

      const videoUploadResult = await videoUploadResponse.json();
      const newVideoUrl = videoUploadResult.ipfsUrl;

      // Upload static PNG to IPFS (so card image also updates!)
      setRegenerationStatus('Uploading card image...');
      const pngBlob = await (await fetch(cardImageDataUrl)).blob();
      const pngFormData = new FormData();
      pngFormData.append('image', pngBlob, 'card.png');

      const pngUploadResponse = await fetch('/api/fid/upload-nft-image', {
        method: 'POST',
        body: pngFormData,
      });

      let newCardImageUrl: string | undefined;
      if (pngUploadResponse.ok) {
        const pngUploadResult = await pngUploadResponse.json();
        newCardImageUrl = pngUploadResult.ipfsUrl;
      }

      setRegenerationStatus('Updating card data...');

      // Step 3: Update card images in database (both video AND static PNG)
      await updateCardImages({
        fid: card.fid,
        imageUrl: newVideoUrl,
        cardImageUrl: newCardImageUrl,
      });

      // Step 4: Refresh OpenSea metadata
      setRegenerationStatus('Refreshing OpenSea metadata...');
      try {
        await fetch('/api/fid/opensea/refresh-metadata', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fid: card.fid }),
        });
      } catch (e) {
        console.log('OpenSea refresh failed (non-critical):', e);
      }

      setEvolutionData({
        oldRarity: 'oldRarity' in result ? result.oldRarity : card.rarity,
        newRarity: 'newRarity' in result ? result.newRarity : card.rarity,
        oldPower: 'oldPower' in result ? result.oldPower : card.power,
        newPower: 'newPower' in result ? result.newPower : card.power,
        oldScore: card.neynarScore,
        newScore: neynarScoreData.score,
        newBounty,
      });

      setEvolutionPhase('complete');
      setRegenerationStatus('');
      AudioManager.buttonClick(); // Victory sound
    } catch (err: any) {
      console.error('Upgrade error:', err);
      setError(err.message || "Failed to upgrade card");
      setShowEvolutionModal(false);
      setEvolutionPhase('idle');
      setRegenerationStatus('');
    }

    setIsUpgrading(false);
  };

  // Notify Farcaster SDK that app is ready - affects ranking!
  // CRITICAL: Call ready() IMMEDIATELY - affects ranking and $10k reward pool!
  const [sdkReadyCalled, setSdkReadyCalled] = useState(false);

  useEffect(() => {
    if (sdkReadyCalled) return;

    const initFarcasterSDK = async () => {
      try {
        if (typeof window === 'undefined') return;

        if (!sdk || typeof sdk.actions?.ready !== 'function') {
          console.log('[VibeFID Card] SDK not available');
          return;
        }

        // Call ready() IMMEDIATELY - DO NOT wait for wallet/context!
        await sdk.actions.ready();
        setSdkReadyCalled(true);
        console.log('[VibeFID Card] ✅ SDK ready() called IMMEDIATELY');
      } catch (error) {
        console.error('[VibeFID Card] ❌ SDK ready() error:', error);
      }
    };

    initFarcasterSDK();
  }, [sdkReadyCalled]);

  // Generate backstory for the card
  useEffect(() => {
    if (card) {
      const generateBackstory = async () => {
        try {
          // Fetch creation date with timeout
          const createdAt = await Promise.race([
            getFarcasterAccountCreationDate(card.fid),
            new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000)) // 3s timeout
          ]);

          const story = generateCriminalBackstory({
            username: card.username,
            displayName: card.displayName,
            bio: card.bio || "",
            fid: card.fid,
            followerCount: card.followerCount,
            createdAt,
            power: card.power,
            bounty: card.power * 10,
            rarity: card.rarity,
          }, lang);
          setBackstory(story);
        } catch (error) {
          console.error('Error generating backstory:', error);
          // Generate backstory without creation date if it fails
          const story = generateCriminalBackstory({
            username: card.username,
            displayName: card.displayName,
            bio: card.bio || "",
            fid: card.fid,
            followerCount: card.followerCount,
            createdAt: null,
            power: card.power,
            bounty: card.power * 10,
            rarity: card.rarity,
          }, lang);
          setBackstory(story);
        }
      };
      generateBackstory();
    }
  }, [card, lang]);

  if (!fidCards) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-vintage-charcoal to-vintage-deep-black flex items-center justify-center">
        <div className="text-vintage-gold text-xl">Loading...</div>
      </div>
    );
  }

  if (fidCards.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-vintage-charcoal to-vintage-deep-black flex items-center justify-center p-8">
        <div className="text-center">
          <h1 className="text-3xl font-display font-bold text-vintage-gold mb-4">
            No Card Found
          </h1>
          <p className="text-vintage-ice mb-6">
            This FID hasn't been minted yet.
          </p>
          <Link
            href="/fid"
            className="px-6 py-3 bg-vintage-gold text-vintage-black font-bold rounded-lg hover:bg-vintage-burnt-gold transition-colors inline-block"
          >
            Mint Your Card
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-vintage-charcoal to-vintage-deep-black overflow-hidden">
      {/* Fixed Header Bar */}
      <div className="fixed top-0 left-0 right-0 z-[9999] bg-vintage-charcoal/95 backdrop-blur-sm border-b border-vintage-gold/30 px-3 py-2">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          {/* Left: User Info */}
          <div className="flex items-center gap-2">
            {card && (
              <>
                <img
                  src={card.pfpUrl}
                  alt="Profile"
                  className="w-8 h-8 rounded-full border-2 border-vintage-gold"
                />
                <div className="text-left">
                  <a
                    href={`https://farcaster.xyz/${card.username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-vintage-gold font-bold text-xs leading-tight hover:text-vintage-burnt-gold"
                  >
                    @{card.username}
                  </a>
                  <p className="text-vintage-ice/60 text-xs">
                    FID #{fid}
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Right: Language */}
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value as any)}
            className="h-8 px-2 bg-[#1a1a1a] border border-vintage-gold/30 rounded-lg text-vintage-gold font-bold focus:outline-none focus:border-vintage-gold text-xs hover:border-vintage-gold hover:bg-vintage-gold/10 transition-all cursor-pointer"
          >
            <option value="en">EN</option>
            <option value="pt-BR">PT</option>
            <option value="es">ES</option>
            <option value="it">IT</option>
            <option value="fr">FR</option>
            <option value="ja">JA</option>
            <option value="zh-CN">ZH</option>
            <option value="ru">RU</option>
            <option value="hi">HI</option>
            <option value="id">ID</option>
          </select>
        </div>
      </div>

      {/* Main Content - Fixed viewport */}
      <div className="fixed inset-0 flex flex-col items-center justify-center z-10" style={{ top: '56px', bottom: '64px' }}>
        {card && (
          <div className="flex flex-col items-center gap-2 px-4 w-full max-w-xs">
            {/* Card with Refresh Button */}
            <div className="relative w-full">
              {/* Lore Button - Top Left Corner */}
              {backstory && (
                <button
                  onClick={() => {
                    AudioManager.buttonClick();
                    setShowBackstoryModal(true);
                  }}
                  className="absolute -top-2 -left-2 z-20 w-8 h-8 rounded-full flex items-center justify-center transition-all bg-vintage-charcoal border border-vintage-gold/50 text-vintage-gold hover:bg-vintage-gold/20"
                  title="View Lore"
                >
                  <span className="text-xs font-bold">L</span>
                </button>
              )}

              {/* Refresh Metadata Button - Top Right Corner */}
              <div className="absolute -top-2 -right-2 z-20">
                <button
                  onClick={handleRefreshMetadata}
                  disabled={isRefreshingMetadata}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                    metadataRefreshed
                      ? 'bg-green-600 text-white scale-110'
                      : 'bg-vintage-charcoal border border-vintage-gold/50 text-vintage-gold hover:bg-vintage-gold/20'
                  } disabled:opacity-50`}
                  title="Refresh OpenSea Metadata"
                >
                  {isRefreshingMetadata ? (
                    <span className="animate-spin text-xs">⟳</span>
                  ) : metadataRefreshed ? (
                    <span className="text-xs">✓</span>
                  ) : (
                    <span className="text-xs">⟳</span>
                  )}
                </button>
                {/* Feedback tooltip */}
                {(isRefreshingMetadata || metadataRefreshed) && (
                  <div className={`absolute top-10 right-0 whitespace-nowrap px-2 py-1 rounded text-xs font-bold shadow-lg ${
                    metadataRefreshed ? 'bg-green-600 text-white' : 'bg-vintage-gold text-black'
                  }`}>
                    {isRefreshingMetadata ? 'Refreshing OpenSea...' : 'OpenSea Updated!'}
                  </div>
                )}
              </div>

              {/* Card Image/Video */}
              <FoilCardEffect
                foilType={currentTraits?.foil === 'None' ? null : (currentTraits?.foil as 'Standard' | 'Prize' | null)}
                className="w-full rounded-xl shadow-2xl border-2 border-vintage-gold overflow-hidden"
              >
                <CardMedia
                  src={card.imageUrl || card.pfpUrl}
                  alt={card.username}
                  className="w-full"
                />
                            </FoilCardEffect>

              {/* Vibe/VibeMail Button - Bottom Right Corner */}
              <button
                onClick={async () => {
                  AudioManager.buttonClick();
                  // If own card, open VibeMail inbox
                  if (isOwnCard) {
                    setShowVibeMailInbox(true);
                    return;
                  }
                  if (!viewerFid) {
                    setError('Connect Farcaster to vibe');
                    setTimeout(() => setError(null), 3000);
                    return;
                  }
                  // Show unified VibeMail modal
                  if (true) {
                    if (isWalletConnected) {
                      setShowPaidVoteModal(true);
                    } else {
                      setError('Connect wallet for more vibes');
                      setTimeout(() => setError(null), 3000);
                    }
                    return;
                  }
                }}
                disabled={isVoting}
                className={`absolute -bottom-2 -right-2 z-20 w-10 h-10 rounded-xl flex items-center justify-center transition-all bg-vintage-black border-2 ${
                  isOwnCard
                    ? 'border-vintage-gold text-vintage-gold hover:bg-vintage-gold/10'
                    : hasVoted
                      ? 'border-vintage-gold text-vintage-gold hover:bg-vintage-gold/10'
                      : 'border-vintage-gold/50 text-vintage-gold hover:border-vintage-gold hover:bg-vintage-gold/10'
                } disabled:opacity-70`}
                title={isOwnCard ? `VibeMail • ${totalVotes} vibes` : hasVoted ? `${totalVotes} vibes • Send more` : `Send vibe • ${totalVotes} vibes`}
              >
                {isVoting ? (
                  <span className="animate-spin text-sm">⟳</span>
                ) : isOwnCard ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <rect x="4" y="2" width="16" height="20" rx="2" ry="2" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                      <text x="12" y="15" textAnchor="middle" fontSize="10" fill="currentColor">♠</text>
                    </svg>
                )}
              </button>

</div>

            {/* Compact Stats Row */}
            <div className="w-full bg-vintage-charcoal/80 rounded-lg border border-vintage-gold/30 p-3">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <span className={`font-bold text-lg ${card.color === 'red' ? 'text-red-500' : 'text-white'}`}>
                    {card.rank}{card.suitSymbol}
                  </span>
                  <span className="text-vintage-ice">{card.rarity}</span>
                  <span className={`${
                    currentTraits?.foil === 'Prize' ? 'text-purple-400' :
                    currentTraits?.foil === 'Standard' ? 'text-blue-400' :
                    'text-vintage-ice/50'
                  }`}>
                    {currentTraits?.foil !== 'None' ? `${currentTraits?.foil} Foil` : ''}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-vintage-gold font-bold">⚡ {correctPower}</span>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs mt-2 pt-2 border-t border-vintage-gold/20">
                <span className="text-vintage-burnt-gold">Neynar: {card.neynarScore.toFixed(3)}</span>
                <span className="text-vintage-ice/50">{currentTraits?.wear}</span>
              </div>
            </div>

            {/* Action Buttons Row */}
            <div className="w-full flex gap-2">
              <button
                onClick={() => {
                  AudioManager.buttonClick();
                  setShowOpenSeaModal(true);
                }}
                className="flex-1 px-3 py-2 bg-vintage-charcoal border border-vintage-gold/50 text-vintage-gold font-bold rounded-lg hover:bg-vintage-gold/10 transition-colors text-xs text-center"
              >
                OpenSea
              </button>

              {farcasterContext.user && (
                <button
                  onClick={handleCheckNeynarScore}
                  disabled={loading}
                  className="flex-1 px-3 py-2 bg-vintage-charcoal border border-vintage-gold/50 text-vintage-gold font-bold rounded-lg hover:bg-vintage-gold/10 transition-colors text-xs disabled:opacity-50"
                >
                  {loading ? '...' : 'Score'}
                </button>
              )}
            </div>




            {/* Error message */}
            {error && (
              <div className="w-full p-2 bg-red-900/50 border border-red-500 rounded-lg text-red-200 text-xs text-center">
                {error}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-[9999] safe-area-bottom">
        <div className="bg-vintage-charcoal/95 backdrop-blur-lg border-t-2 border-vintage-gold/30 p-1 flex gap-1">
          <button
            onClick={() => {
              AudioManager.buttonClick();
              setShowVBMSModal(true);
            }}
            className="flex-1 min-w-0 px-1 py-2 flex flex-col items-center justify-center gap-0.5 rounded-lg font-semibold transition-all text-[10px] leading-tight bg-vintage-black text-vintage-gold hover:bg-vintage-gold/10 border border-vintage-gold/30"
          >
            <span className="text-[10px] font-bold whitespace-nowrap">Vibe</span>
            <span className="text-xl leading-none">♠</span>
          </button>
          <Link
            href="/fid/most-wanted"
            onClick={() => AudioManager.buttonClick()}
            className="flex-1 min-w-0 px-1 py-2 flex flex-col items-center justify-center gap-0.5 rounded-lg font-semibold transition-all text-[10px] leading-tight bg-vintage-black text-vintage-gold hover:bg-vintage-gold/10 border border-vintage-gold/30"
          >
            <span className="text-[10px] font-bold whitespace-nowrap">Most Wanted</span>
            <span className="text-xl leading-none">♣</span>
          </Link>
          <Link
            href="/fid"
            onClick={() => AudioManager.buttonClick()}
            className="flex-1 min-w-0 px-1 py-2 flex flex-col items-center justify-center gap-0.5 rounded-lg font-semibold transition-all text-[10px] leading-tight bg-vintage-black text-vintage-gold hover:bg-vintage-gold/10 border border-vintage-gold/30"
          >
            <span className="text-[10px] font-bold whitespace-nowrap">Back</span>
            <span className="text-xl leading-none">←</span>
          </Link>
        </div>
      </div>

      {/* Neynar Score Modal */}
      {showScoreModal && neynarScoreData && (
          <div className="fixed inset-0 bg-black/80 flex items-start justify-center z-50 p-4 pt-16 pb-20 overflow-y-auto">
            <div className="bg-vintage-charcoal rounded-xl border-2 border-vintage-gold/50 p-4 max-w-md w-full">
              <h2 className="text-xl font-bold text-vintage-gold mb-3 text-center">
                {t.neynarScoreTitle}
              </h2>

              {/* Current Score */}
              <div className="bg-vintage-black/50 rounded-lg border border-vintage-gold/30 p-4 mb-3">
                <div className="text-center">
                  <p className="text-vintage-burnt-gold text-xs mb-1">@{neynarScoreData.username}</p>
                  <div className="text-4xl font-bold text-vintage-gold mb-1">
                    {neynarScoreData.score.toFixed(3)}
                  </div>
                  <p className="text-vintage-ice text-xs">{t.currentScore}</p>
                  {card && card.neynarScore && (
                    <p className={`text-xs mt-1 font-bold ${
                      neynarScoreData.score > card.neynarScore ? 'text-green-400' :
                      neynarScoreData.score < card.neynarScore ? 'text-red-400' : 'text-vintage-ice/50'
                    }`}>
                      {neynarScoreData.score > card.neynarScore ? '+' : ''}
                      {(neynarScoreData.score - card.neynarScore).toFixed(4)} from mint
                    </p>
                  )}
                </div>
                <div className="flex justify-between items-center mt-3 pt-3 border-t border-vintage-gold/20">
                  <span className="text-vintage-burnt-gold text-xs">{t.rarityAvailable || "Rarity Available"}</span>
                  <span className="text-vintage-ice font-bold">{neynarScoreData.rarity}</span>
                </div>
              </div>

              {/* Upgrade Available Banner */}
              {canUpgrade() && card && (
                <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/50 rounded-lg p-3 mb-3 text-center">
                  <p className="text-yellow-400 font-bold mb-1">{t.upgradeAvailable}</p>
                  <p className="text-vintage-ice text-xs">
                    <span className="text-vintage-burnt-gold">{card.rarity}</span> → <span className="text-yellow-400">{neynarScoreData.rarity}</span>
                  </p>
                </div>
              )}

              {/* Score History */}
              {scoreHistory && scoreHistory.history && scoreHistory.history.length > 0 && (
                <div className="bg-vintage-black/30 rounded-lg border border-vintage-gold/20 p-3 mb-3">
                  <p className="text-vintage-burnt-gold text-xs mb-2 font-bold">{t.scoreHistory} ({scoreHistory.totalChecks} {t.checks})</p>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {scoreHistory.history.slice(0, 10).map((entry: any, i: number) => {
                      const prevScore = i < scoreHistory.history.length - 1 ? scoreHistory.history[i + 1]?.score : null;
                      const diff = prevScore !== null ? entry.score - prevScore : 0;
                      return (
                        <div key={i} className="flex justify-between items-center text-xs py-1 border-b border-vintage-gold/10 last:border-0">
                          <span className="text-vintage-ice/60 w-14">
                            {new Date(entry.checkedAt).toLocaleDateString()}</span>
                          <span className="text-vintage-burnt-gold text-[10px] w-14">{getRarityFromScore(entry.score)}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-vintage-ice">{entry.score.toFixed(3)}</span>
                            {prevScore !== null && diff !== 0 && (
                              <span className={diff > 0 ? 'text-green-400' : 'text-red-400'}>
                                {diff > 0 ? '+' : ''}{diff.toFixed(4)}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col gap-2">
                {canUpgrade() && (
                  <button
                    onClick={handleUpgrade}
                    disabled={isUpgrading}
                    className="w-full px-4 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-black font-bold rounded-lg transition-all disabled:opacity-50"
                  >
                    {isUpgrading ? t.upgrading : (isRarityUpgrade() ? t.upgradeRarity : (t.refreshScore || 'REFRESH SCORE'))}
                  </button>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      AudioManager.buttonClick();
                      setShowScoreModal(false);
                    }}
                    className={isOwnCard ? "flex-1 px-3 py-2 bg-vintage-charcoal border border-vintage-gold/30 text-vintage-gold rounded-lg hover:bg-vintage-gold/10 transition-colors text-sm" : "w-full px-3 py-2 bg-vintage-charcoal border border-vintage-gold/30 text-vintage-gold rounded-lg hover:bg-vintage-gold/10 transition-colors text-sm"}
                  >
                    {t.back}
                  </button>
                  {isOwnCard && (
                    <button
                      onClick={() => {
                        AudioManager.buttonClick();
                        setShowShareModal(true);
                      }}
                      className="flex-1 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg transition-colors text-center text-sm"
                    >
                      Share
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}


        {/* Evolution Animation Modal */}
        {showEvolutionModal && card && (
          <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
            <div className="max-w-sm w-full text-center my-auto">
              {/* Card with Animation */}
              <div className={`relative mb-4 sm:mb-8 transition-all duration-500 ${
                evolutionPhase === 'shaking' ? 'animate-shake' : ''
              } ${evolutionPhase === 'glowing' ? 'animate-glow' : ''} ${
                evolutionPhase === 'transforming' ? 'animate-transform-card scale-105 sm:scale-110' : ''
              }`}>
                {/* Glow Effect */}
                {(evolutionPhase === 'glowing' || evolutionPhase === 'transforming') && (
                  <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 rounded-xl blur-xl opacity-75 animate-pulse" />
                )}

                {/* Card */}
                <div className="relative w-40 sm:w-56 mx-auto">
                  <FoilCardEffect
                    foilType={currentTraits?.foil === 'None' ? null : (currentTraits?.foil as 'Standard' | 'Prize' | null)}
                    className="w-full rounded-lg shadow-2xl border-2 sm:border-4 border-vintage-gold overflow-hidden"
                  >
                    <CardMedia
                      src={card.imageUrl || card.pfpUrl}
                      alt={card.username}
                      className="w-full"
                    />
                  </FoilCardEffect>
                </div>

                {/* Particles */}
                {evolutionPhase === 'transforming' && (
                  <div className="absolute inset-0 pointer-events-none">
                    {[...Array(12)].map((_, i) => (
                      <div
                        key={i}
                        className="absolute w-1.5 h-1.5 sm:w-2 sm:h-2 bg-yellow-400 rounded-full animate-particle"
                        style={{
                          left: `${Math.random() * 100}%`,
                          top: `${Math.random() * 100}%`,
                          animationDelay: `${Math.random() * 0.5}s`,
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Phase Text */}
              <div className="mb-4 sm:mb-6">
                {evolutionPhase === 'shaking' && (
                  <p className="text-lg sm:text-2xl font-bold text-vintage-gold animate-pulse">🔮 {t.channelingPower}</p>
                )}
                {evolutionPhase === 'glowing' && (
                  <p className="text-lg sm:text-2xl font-bold text-yellow-400 animate-pulse">✨ {t.energyBuilding}</p>
                )}
                {evolutionPhase === 'transforming' && (
                  <p className="text-lg sm:text-2xl font-bold text-orange-400 animate-pulse">⚡ {t.evolving}</p>
                )}
                {evolutionPhase === 'regenerating' && (
                  <div className="space-y-2">
                    <p className="text-lg sm:text-2xl font-bold text-cyan-400 animate-pulse">🎬 {t.regenerating}</p>
                    {regenerationStatus && (
                      <p className="text-vintage-ice text-xs sm:text-xs">{regenerationStatus}</p>
                    )}
                  </div>
                )}
                {evolutionPhase === 'complete' && evolutionData && (
                  <div className="space-y-3 sm:space-y-4">
                    <p className="text-xl sm:text-3xl font-bold text-green-400">🎉 {t.evolved}</p>

                    <div className="bg-vintage-black/50 rounded-lg border border-vintage-gold/30 p-3 sm:p-6">
                      <div className="flex items-center justify-center gap-3 sm:gap-4 mb-3 sm:mb-4">
                        <div className="text-center">
                          <p className="text-vintage-burnt-gold text-[10px] sm:text-xs">{t.before}</p>
                          <p className="text-vintage-ice text-xs sm:text-lg font-bold">{evolutionData.oldRarity}</p>
                          <p className="text-vintage-ice/60 text-xs sm:text-xs">⚡ {evolutionData.oldPower}</p>
                        </div>
                        <div className="text-xl sm:text-3xl">→</div>
                        <div className="text-center">
                          <p className="text-yellow-400 text-[10px] sm:text-xs">{t.after}</p>
                          <p className="text-yellow-400 text-base sm:text-xl font-bold">{evolutionData.newRarity}</p>
                          <p className="text-yellow-400 text-xs sm:text-xs">⚡ {evolutionData.newPower}</p>
                          <p className="text-green-400 text-[10px] sm:text-xs mt-1">💰 ${evolutionData.newBounty.toLocaleString()}</p>
                        </div>
                      </div>

                      <div className="text-center border-t border-vintage-gold/20 pt-2 sm:pt-4">
                        <p className="text-vintage-burnt-gold text-[10px] sm:text-xs">Neynar Score</p>
                        <p className="text-vintage-gold font-bold text-xs sm:text-base">
                          {evolutionData.oldScore.toFixed(3)} → {evolutionData.newScore.toFixed(3)}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2 sm:gap-3">
                      <button
                        onClick={async () => {
                          AudioManager.buttonClick();
                          const shareUrl = `https://vibemostwanted.xyz/fid/${fid}`;
                          const scoreDiff = evolutionData.newScore - evolutionData.oldScore;
                          const diffSign = scoreDiff >= 0 ? '+' : '';
                          const castText = `My VibeFID just EVOLVED!\n\n${evolutionData.oldRarity} → ${evolutionData.newRarity}\nPower: ${evolutionData.oldPower} → ${evolutionData.newPower}\nNeynar Score: ${diffSign}${scoreDiff.toFixed(4)}\nBounty: $${evolutionData.newBounty.toLocaleString()}\n\n@jvhbo`;
                          await shareToFarcaster(castText, shareUrl);
                        }}
                        className="flex-1 px-3 py-3 sm:px-4 sm:py-4 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg transition-colors text-center text-xs sm:text-base"
                      >
                        Share
                      </button>
                      <button
                        onClick={() => {
                          AudioManager.buttonClick();
                          setShowEvolutionModal(false);
                          setEvolutionPhase('idle');
                          setEvolutionData(null);
                          setNeynarScoreData(null);
                        }}
                        className="flex-1 px-3 py-3 sm:px-4 sm:py-4 bg-vintage-gold hover:bg-vintage-burnt-gold text-vintage-black font-bold rounded-lg transition-colors text-xs sm:text-base"
                      >
                        {t.close}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Share with Language Modal */}
        {showShareModal && card && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-vintage-charcoal rounded-xl border-2 border-vintage-gold/50 p-6 max-w-sm w-full">
              <h2 className="text-xl font-bold text-vintage-gold mb-4 text-center">
                {t.shareToFarcaster || 'Share to Farcaster'}
              </h2>

              <p className="text-vintage-ice text-xs mb-4 text-center">
                {t.selectLanguageForShare || 'Select language for share image:'}
              </p>

              {/* Language Options */}
              <div className="grid grid-cols-3 gap-2 mb-6">
                {[
                  { code: 'en', flag: '🇺🇸', name: 'English' },
                  { code: 'pt-BR', flag: '🇧🇷', name: 'Português' },
                  { code: 'es', flag: '🇪🇸', name: 'Español' },
                  { code: 'ja', flag: '🇯🇵', name: '日本語' },
                  { code: 'zh-CN', flag: '🇨🇳', name: '中文' },
                  { code: 'ru', flag: '🇷🇺', name: 'Русский' },
                  { code: 'hi', flag: '🇮🇳', name: 'हिन्दी' },
                  { code: 'fr', flag: '🇫🇷', name: 'Français' },
                  { code: 'id', flag: '🇮🇩', name: 'Bahasa' },
                  { code: 'it', flag: '🇮🇹', name: 'Italiano' },
                ].map((langOption) => (
                  <button
                    key={langOption.code}
                    onClick={() => {
                      AudioManager.buttonClick();
                      handleShareWithLanguage(langOption.code as typeof lang);
                    }}
                    disabled={isGeneratingShare}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      isGeneratingShare
                        ? 'opacity-50 cursor-not-allowed'
                        : 'hover:border-vintage-gold hover:bg-vintage-gold/10'
                    } border-vintage-gold/30 bg-vintage-black/50`}
                  >
                    <span className="text-2xl block mb-1">{langOption.flag}</span>
                    <span className="text-vintage-gold text-xs font-semibold">{langOption.name}</span>
                  </button>
                ))}
              </div>

              {isGeneratingShare && (
                <div className="text-center mb-4">
                  <p className="text-vintage-gold animate-pulse">⏳ Generating image...</p>
                </div>
              )}

              {/* Cancel Button */}
              <button
                onClick={() => {
                  AudioManager.buttonClick();
                  setShowShareModal(false);
                }}
                disabled={isGeneratingShare}
                className="w-full px-3 py-2 bg-vintage-charcoal border border-vintage-gold/30 text-vintage-gold rounded-lg hover:bg-vintage-gold/10 transition-colors disabled:opacity-50"
              >
                {t.cancel || 'Cancel'}
              </button>
            </div>
          </div>
        )}

        {/* OpenSea Confirmation Modal */}
        {showOpenSeaModal && card && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 p-4 pt-16 pb-24">
            <div className="bg-vintage-charcoal border-2 border-vintage-gold rounded-2xl p-4 w-full max-w-sm">
              <h3 className="text-vintage-gold font-bold text-lg mb-3 text-center">
                {t.openOpenSea || 'Open OpenSea?'}
              </h3>
              <p className="text-vintage-ice/80 text-sm text-center mb-4">
                {t.openOpenSeaDesc || 'You will be redirected to OpenSea to view this NFT.'}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    AudioManager.buttonClick();
                    setShowOpenSeaModal(false);
                  }}
                  className="flex-1 py-2 bg-vintage-burnt-gold/30 hover:bg-vintage-burnt-gold/50 text-vintage-gold font-bold rounded-xl transition-all"
                >
                  {t.cancel || 'Cancel'}
                </button>
                <button
                  onClick={() => {
                    AudioManager.buttonClick();
                    const url = `https://opensea.io/assets/base/${card.contractAddress || '0x60274A138d026E3cB337B40567100FdEC3127565'}/${card.fid}`;
                    window.open(url, '_blank');
                    setShowOpenSeaModal(false);
                  }}
                  className="flex-1 py-2 bg-vintage-gold hover:bg-yellow-500 text-vintage-black font-bold rounded-xl transition-all"
                >
                  {t.open || 'Open'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* VBMS Confirmation Modal - Highest z-index to be above all other modals */}
        {showVBMSModal && (
          <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/80 p-4">
            <div className="bg-vintage-charcoal border-2 border-vintage-gold rounded-2xl p-4 w-full max-w-sm">
              <h3 className="text-vintage-gold font-bold text-lg mb-3 text-center">
                {(t as unknown as Record<string, string>).openVBMS || 'Open Vibe Most Wanted?'}
              </h3>
              <p className="text-vintage-ice/80 text-sm text-center mb-4">
                {(t as unknown as Record<string, string>).openVBMSDesc || 'You will be redirected to Vibe Most Wanted to play the game.'}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    AudioManager.buttonClick();
                    setShowVBMSModal(false);
                  }}
                  className="flex-1 py-2 bg-vintage-burnt-gold/30 hover:bg-vintage-burnt-gold/50 text-vintage-gold font-bold rounded-xl transition-all"
                >
                  {t.cancel || 'Cancel'}
                </button>
                <button
                  onClick={async () => {
                    AudioManager.buttonClick();
                    const VBMS_MINIAPP_URL = 'https://farcaster.xyz/miniapps/0sNKxskaSKsH/vbms---game-and-wanted-cast';
                    if (farcasterContext.isInMiniapp) {
                      try {
                        await sdk.actions.openMiniApp({ url: VBMS_MINIAPP_URL });
                      } catch (err) {
                        window.open(VBMS_MINIAPP_URL, '_blank');
                      }
                    } else {
                      window.open(VBMS_MINIAPP_URL, '_blank');
                    }
                    setShowVBMSModal(false);
                  }}
                  className="flex-1 py-2 bg-vintage-gold hover:bg-yellow-500 text-vintage-black font-bold rounded-xl transition-all"
                >
                  {t.open || 'Open'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Criminal Backstory Modal */}
        {showBackstoryModal && backstory && card && (
          <div className="fixed inset-0 bg-black/80 flex items-start justify-center z-[100] px-4 pt-16 pb-20 overflow-y-auto">
            <div className="bg-vintage-charcoal rounded-xl border-2 border-vintage-gold/50 p-4 max-w-md w-full max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-vintage-gold">
                  Lore Criminal Record
                </h2>
                <button
                  onClick={() => {
                    AudioManager.buttonClick();
                    setShowBackstoryModal(false);
                  }}
                  className="text-vintage-gold hover:text-vintage-burnt-gold text-xl"
                >
                  ✕
                </button>
              </div>

              <CriminalBackstoryCard
                backstory={backstory}
                displayName={card.displayName}
                lang={lang}
              />
            </div>
          </div>
        )}

        {/* Paid Vote Modal */}
        {showPaidVoteModal && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 p-4 pt-16 pb-24">
            <div className="bg-vintage-charcoal border-2 border-vintage-gold rounded-2xl p-4 w-full max-w-sm max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-3">
                <button
                  onClick={() => {
                    AudioManager.buttonClick();
                    setShowPaidVoteModal(false);
                  }}
                  className="w-8 h-8 bg-vintage-black/50 border border-vintage-gold/30 rounded-full text-vintage-gold hover:bg-vintage-gold/20 transition-all text-sm font-bold"
                >
                  ✕
                </button>
                <h3 className="text-vintage-gold font-bold text-lg text-center">
                  VibeMail
                </h3>
                <button
                  onClick={() => {
                    AudioManager.buttonClick();
                    setShowVoteExplainModal(true);
                  }}
                  className="w-8 h-8 bg-vintage-black/50 border border-vintage-gold/30 rounded-full text-vintage-gold hover:bg-vintage-gold/20 transition-all text-sm font-bold"
                >
                  ?
                </button>
              </div>

              {/* VBMS Balance */}
              <div className="bg-vintage-black/50 rounded-lg p-3 mb-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-vintage-ice/60 text-xs">{(t as any).yourVbmsBalance || 'Your VBMS Balance'}</p>
                  <button
                    onClick={async () => {
                      AudioManager.buttonClick();
                      const DEX_URL = 'https://farcaster.xyz/miniapps/0sNKxskaSKsH/vbms---game-and-wanted-cast/dex';
                      if (farcasterContext.isInMiniapp) {
                        try {
                          await sdk.actions.openMiniApp({ url: DEX_URL });
                        } catch (err) {
                          window.open(DEX_URL, '_blank');
                        }
                      } else {
                        window.open(DEX_URL, '_blank');
                      }
                    }}
                    className="text-vintage-burnt-gold text-xs hover:text-vintage-gold transition-colors"
                  >
                    {(t as any).needMoreVbms || 'Need more VBMS'} →
                  </button>
                </div>
                <p className="text-vintage-gold font-bold text-lg">
                  {parseFloat(vbmsBalance).toLocaleString(undefined, { maximumFractionDigits: 2 })} VBMS
                </p>
              </div>

              {/* Tab Toggle - Free / Paid */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => { AudioManager.buttonClick(); setVibeMailTab('free'); }}
                  disabled={freeVotesRemaining <= 0}
                  className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all ${
                    vibeMailTab === 'free'
                      ? 'bg-green-500 text-black'
                      : 'bg-vintage-black/50 text-vintage-ice/60 hover:bg-vintage-black/80'
                  } ${freeVotesRemaining <= 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  🆓 Free ({freeVotesRemaining}/1)
                </button>
                <button
                  onClick={() => { AudioManager.buttonClick(); setVibeMailTab('paid'); }}
                  className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all ${
                    vibeMailTab === 'paid'
                      ? 'bg-yellow-500 text-black'
                      : 'bg-vintage-black/50 text-vintage-ice/60 hover:bg-vintage-black/80'
                  }`}
                >
                  💰 Paid
                </button>
              </div>

              {/* Paid Vote Count Selector - Only show in paid mode */}
              {vibeMailTab === 'paid' && (
                <div className="mb-4">
                  <p className="text-vintage-ice/60 text-xs mb-2">{(t as any).vibesToSend || 'Vibes to send'}</p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPaidVoteCount(Math.max(1, paidVoteCount - 1))}
                      className="w-10 h-10 bg-vintage-black border border-vintage-gold/30 text-vintage-gold rounded-lg font-bold hover:bg-vintage-gold/10"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      value={paidVoteCount}
                      onChange={(e) => setPaidVoteCount(Math.max(1, parseInt(e.target.value) || 1))}
                      className="flex-1 h-10 bg-vintage-black border border-vintage-gold/30 text-vintage-gold text-center rounded-lg font-bold"
                      min="1"
                    />
                    <button
                      onClick={() => setPaidVoteCount(paidVoteCount + 1)}
                      className="w-10 h-10 bg-vintage-black border border-vintage-gold/30 text-vintage-gold rounded-lg font-bold hover:bg-vintage-gold/10"
                    >
                      +
                    </button>
                  </div>
                </div>
              )}

              {/* VibeMail Composer */}
              <VibeMailComposer
                message={vibeMailTab === 'free' ? freeVibeMailMessage : vibeMailMessage}
                setMessage={vibeMailTab === 'free' ? setFreeVibeMailMessage : setVibeMailMessage}
                audioId={vibeMailTab === 'free' ? freeVibeMailAudioId : vibeMailAudioId}
                setAudioId={vibeMailTab === 'free' ? setFreeVibeMailAudioId : setVibeMailAudioId}
                imageId={vibeMailTab === 'free' ? freeVibeMailImageId : vibeMailImageId}
                setImageId={vibeMailTab === 'free' ? setFreeVibeMailImageId : setVibeMailImageId}
              />

              {/* Cost Summary - Only for paid */}
              {vibeMailTab === 'paid' && (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mb-4 mt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-vintage-ice text-sm">{(t as any).costPerVibe || 'Cost per vibe'}:</span>
                    <span className="text-yellow-400 font-bold">{voteCostVBMS} VBMS</span>
                  </div>
                  <div className="flex justify-between items-center mt-2 pt-2 border-t border-yellow-500/20">
                    <span className="text-vintage-ice font-bold">{(t as any).total || 'Total'}:</span>
                    <span className="text-yellow-400 font-bold text-lg">
                      {(parseInt(voteCostVBMS) * paidVoteCount).toLocaleString()} VBMS
                    </span>
                  </div>
                </div>
              )}

              {/* Free info */}
              {vibeMailTab === 'free' && (
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 mb-4 mt-4">
                  <p className="text-green-400 text-sm text-center">
                    🆓 {(t as any).freeVoteInfo || '1 free VibeMail per day!'}
                  </p>
                </div>
              )}

              {/* Send Button */}
              <button
                onClick={async () => {
                  AudioManager.buttonClick();
                  if (vibeMailTab === 'free') {
                    const result = await voteFree(freeVibeMailMessage || undefined, freeVibeMailAudioId || undefined, freeVibeMailImageId || undefined);
                    if (result.success) {
                      setShowPaidVoteModal(false);
                      setFreeVibeMailMessage('');
                      setFreeVibeMailAudioId(null);
                      setFreeVibeMailImageId(null);
                    } else {
                      setError(result.error || 'Vote failed');
                      setTimeout(() => setError(null), 5000);
                    }
                  } else {
                    const result = await votePaid(paidVoteCount, vibeMailMessage, vibeMailAudioId || undefined, vibeMailImageId || undefined);
                    if (result.success) {
                      setShowPaidVoteModal(false);
                      setPaidVoteCount(1);
                      setVibeMailMessage('');
                      setVibeMailAudioId(null);
                      setVibeMailImageId(null);
                    } else {
                      setError(result.error || 'Vote failed');
                      setTimeout(() => setError(null), 5000);
                    }
                  }
                }}
                disabled={isVoting || (vibeMailTab === 'free' && freeVotesRemaining <= 0) || (vibeMailTab === 'paid' && parseFloat(vbmsBalance) < parseInt(voteCostVBMS) * paidVoteCount)}
                className={`w-full py-3 font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                  vibeMailTab === 'free'
                    ? 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-black'
                    : 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-black'
                }`}
              >
                {isVoting ? ((t as any).sendingTx || 'Sending...') : ((t as any).sendVibe || 'Send Vibe')}
              </button>

              {/* Insufficient Balance Warning */}
              {vibeMailTab === 'paid' && parseFloat(vbmsBalance) < parseInt(voteCostVBMS) * paidVoteCount && (
                <p className="text-red-400 text-xs text-center mt-2">
                  {(t as any).insufficientVbms || 'Insufficient VBMS balance'}
                </p>
              )}
            </div>
          </div>
        )}

        {/* VibeMail Inbox Modal */}
        {showVibeMailInbox && isOwnCard && (
          <VibeMailInbox
            cardFid={fid}
            onClose={() => setShowVibeMailInbox(false)}
          />
        )}

        {/* Vote Explanation Modal */}
        {showVoteExplainModal && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/90 p-4">
            <div className="bg-vintage-charcoal border-2 border-vintage-gold rounded-2xl p-5 w-full max-w-md max-h-[80vh] overflow-y-auto">
              <h3 className="text-vintage-gold font-bold text-xl mb-4 text-center">
                🗳️ {(t as any).whatIsVoting || 'What is Voting?'}
              </h3>

              <div className="space-y-4 text-vintage-ice text-sm">
                <div className="bg-vintage-black/50 rounded-lg p-3">
                  <p className="text-vintage-gold font-bold mb-2">📊 {(t as any).howVotingWorks || 'How Voting Works'}</p>
                  <p>{(t as any).votingExplain1 || 'Vote for your favorite cards to help them climb the Most Wanted ranking. The more votes a card has, the higher it appears!'}</p>
                </div>

                <div className="bg-vintage-black/50 rounded-lg p-3">
                  <p className="text-vintage-gold font-bold mb-2">🆓 {(t as any).freeVotes || 'Free Votes'}</p>
                  <p>{(t as any).freeVotesExplain || 'You get 3 free votes per day. Use them wisely to support cards you like!'}</p>
                </div>

                <div className="bg-vintage-black/50 rounded-lg p-3">
                  <p className="text-vintage-gold font-bold mb-2">💰 {(t as any).paidVotesTitle || 'Paid Votes (VBMS)'}</p>
                  <p>{(t as any).paidVotesExplain || 'Want more votes? Use VBMS tokens to cast unlimited paid votes! Each paid vote costs VBMS tokens.'}</p>
                </div>

                <div className="bg-vintage-black/50 rounded-lg p-3">
                  <p className="text-vintage-gold font-bold mb-2">🎁 {(t as any).vbmsRewards || 'VBMS Rewards'}</p>
                  <p>{(t as any).vbmsRewardsExplain || 'Every vote you receive on your card earns you 100 VBMS tokens! Build your ranking and earn rewards.'}</p>
                </div>

                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                  <p className="text-yellow-400 font-bold mb-2">💡 {(t as any).proTip || 'Pro Tip'}</p>
                  <p className="text-yellow-200">{(t as any).votingProTip || 'Share your card on Farcaster to get more votes and climb the ranking faster!'}</p>
                </div>
              </div>

              <button
                onClick={() => {
                  AudioManager.buttonClick();
                  setShowVoteExplainModal(false);
                }}
                className="w-full mt-5 py-3 bg-gradient-to-r from-vintage-gold to-vintage-burnt-gold hover:from-yellow-400 hover:to-orange-400 text-black font-bold rounded-xl transition-all"
              >
                {t.gotIt}
              </button>
            </div>
          </div>
        )}
    </div>
  );
}
