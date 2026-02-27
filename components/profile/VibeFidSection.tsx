'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/lib/fid/convex-generated/api';
import Link from 'next/link';
import { CardMedia } from '@/components/fid/CardMedia';
import FoilCardEffect from '@/components/fid/FoilCardEffect';
import CriminalBackstoryCard from '@/components/fid/CriminalBackstoryCard';
import { VibeMailInbox, VibeMailComposer } from '@/components/fid/VibeMail';
import { useFarcasterContext } from '@/hooks/fid/useFarcasterContext';
import { useVibeVote } from '@/hooks/fid/useVibeVote';
import { useVBMSBalance } from '@/hooks/fid/useVBMSContracts';
import { generateCriminalBackstory } from '@/lib/fid/generateCriminalBackstory';
import { getFarcasterAccountCreationDate } from '@/lib/fid/farcasterRegistry';
import { getUserByFid, calculateRarityFromScore } from '@/lib/fid/neynar';
import { AudioManager } from '@/lib/fid/audio-manager';
import { fidTranslations } from '@/lib/fid/fidTranslations';
import { generateFarcasterCardImage } from '@/lib/fid/generateFarcasterCard';
import { generateCardVideo } from '@/lib/fid/generateCardVideo';
import { shareToFarcaster } from '@/lib/fid/share-utils';
import { useLanguage } from '@/contexts/LanguageContext';

const getRarityFromScore = (score: number) => {
  if (score >= 0.99) return 'Mythic';
  if (score >= 0.90) return 'Legendary';
  if (score >= 0.79) return 'Epic';
  if (score >= 0.70) return 'Rare';
  return 'Common';
};

interface VibeFidSectionProps {
  fid: number;
  isOwnProfile: boolean;
  address?: string;
  hasVibeBadge?: boolean;
  onCardStatus?: (exists: boolean) => void;
}

export function VibeFidSection({ fid, isOwnProfile, address, hasVibeBadge, onCardStatus }: VibeFidSectionProps) {
  const { lang } = useLanguage();
  const t = fidTranslations[lang] || fidTranslations['en'];
  const farcasterContext = useFarcasterContext();

  // Check if viewing own card via Farcaster FID
  const isLocalhost = typeof window !== 'undefined' && window.location.hostname === 'localhost';
  const devUser = isLocalhost ? { fid, username: 'test' } : null;
  const effectiveUser = farcasterContext.user || devUser;
  const isOwnCard = effectiveUser?.fid === fid;

  // VibeFID Convex queries (uses VibeFIDConvexProvider context)
  const fidCards = useQuery(api.farcasterCards.getFarcasterCardsByFid, { fid });
  const scoreHistory = useQuery(api.neynarScore.getScoreHistory, { fid });
  const saveScoreCheck = useMutation(api.neynarScore.saveScoreCheck);
  const upgradeCardRarity = useMutation(api.farcasterCards.upgradeCardRarity);
  const refreshCardScore = useMutation(api.farcasterCards.refreshCardScore);
  const updateCardImages = useMutation(api.farcasterCards.updateCardImages);

  const unreadMessageCount = useQuery(
    api.cardVotes.getUnreadMessageCount,
    isOwnCard ? { cardFid: fid } : 'skip'
  );

  const card = fidCards?.[0];
  const currentTraits = card ? { foil: card.foil, wear: card.wear } : null;

  const correctPower = card && currentTraits ? (() => {
    const rarityBasePower: Record<string, number> = { Common: 10, Rare: 20, Epic: 50, Legendary: 100, Mythic: 600 };
    const wearMultiplier: Record<string, number> = { Pristine: 1.8, Mint: 1.4, 'Lightly Played': 1.0, 'Moderately Played': 1.0, 'Heavily Played': 1.0 };
    const foilMultiplier: Record<string, number> = { Prize: 6.0, Standard: 2.0, None: 1.0 };
    const basePower = rarityBasePower[card.rarity] || 5;
    const wearMult = wearMultiplier[currentTraits.wear] || 1.0;
    const foilMult = foilMultiplier[currentTraits.foil] || 1.0;
    return Math.round(basePower * wearMult * foilMult);
  })() : 0;

  // Wallet + voting
  const viewerFid = effectiveUser?.fid || 0;
  const viewerAddress = (address || '0x0000000000000000000000000000000000000000') as `0x${string}`;
  const { balance: vbmsBalance } = useVBMSBalance(address as `0x${string}` | undefined);
  const {
    isVoting, hasVoted, totalVotes, freeVotesRemaining,
    voteFree, votePaid, voteCostVBMS,
  } = useVibeVote({ cardFid: fid, voterFid: viewerFid, voterAddress: viewerAddress });

  // State
  const [backstory, setBackstory] = useState<any>(null);
  const [neynarScoreData, setNeynarScoreData] = useState<{
    score: number; rarity: string; fid: number; username: string; displayName: string; pfpUrl: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [showBackstoryModal, setShowBackstoryModal] = useState(false);
  const [showVibeMailInbox, setShowVibeMailInbox] = useState(false);
  const [showPaidVoteModal, setShowPaidVoteModal] = useState(false);
  const [showEvolutionModal, setShowEvolutionModal] = useState(false);
  const [showTraitsPopup, setShowTraitsPopup] = useState(false);

  // VibeMail state
  const [vibeMailTab, setVibeMailTab] = useState<'free' | 'paid'>('free');
  const [paidVoteCount, setPaidVoteCount] = useState(1);
  const [freeVibeMailMessage, setFreeVibeMailMessage] = useState('');
  const [freeVibeMailAudioId, setFreeVibeMailAudioId] = useState<string | null>(null);
  const [freeVibeMailImageId, setFreeVibeMailImageId] = useState<string | null>(null);
  const [vibeMailMessage, setVibeMailMessage] = useState('');
  const [vibeMailAudioId, setVibeMailAudioId] = useState<string | null>(null);
  const [vibeMailImageId, setVibeMailImageId] = useState<string | null>(null);

  // Evolution state
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [evolutionPhase, setEvolutionPhase] = useState<'idle' | 'shaking' | 'glowing' | 'transforming' | 'regenerating' | 'complete'>('idle');
  const [regenerationStatus, setRegenerationStatus] = useState('');
  const [evolutionData, setEvolutionData] = useState<{
    oldRarity: string; newRarity: string; oldPower: number; newPower: number;
    oldScore: number; newScore: number; newBounty: number;
  } | null>(null);

  // Generate backstory
  useEffect(() => {
    if (!card) return;
    const run = async () => {
      try {
        const createdAt = await Promise.race([
          getFarcasterAccountCreationDate(card.fid),
          new Promise<null>(resolve => setTimeout(() => resolve(null), 3000)),
        ]);
        const story = generateCriminalBackstory({
          username: card.username,
          displayName: card.displayName,
          bio: (card as any).bio || '',
          fid: card.fid,
          followerCount: 0,
          rarity: card.rarity,
          power: card.power,
          bounty: card.power * 10,
          createdAt: createdAt,
        }, lang);
        setBackstory(story);
      } catch {}
    };
    run();
  }, [card, lang]);

  const canUpgrade = () => {
    if (!isOwnCard || !card || !neynarScoreData) return false;
    const rarityOrder = ['Common', 'Rare', 'Epic', 'Legendary', 'Mythic'];
    const rarityImproved = rarityOrder.indexOf(neynarScoreData.rarity) > rarityOrder.indexOf(card.rarity);
    const neverUpgraded = !card.upgradedAt;
    const scoreChanged = Math.abs(neynarScoreData.score - card.neynarScore) > 0.02;
    return neverUpgraded || rarityImproved || scoreChanged;
  };

  const isRarityUpgrade = () => {
    if (!card || !neynarScoreData) return false;
    const rarityOrder = ['Common', 'Rare', 'Epic', 'Legendary', 'Mythic'];
    return rarityOrder.indexOf(neynarScoreData.rarity) > rarityOrder.indexOf(card.rarity);
  };

  const handleCheckNeynarScore = async () => {
    AudioManager.buttonClick();
    setLoading(true);
    setError(null);
    try {
      const user = await getUserByFid(fid);
      if (!user) {
        setError(`No user found for FID ${fid}`);
        setLoading(false);
        setTimeout(() => setError(null), 3000);
        return;
      }
      const score = user.experimental.neynar_user_score;
      const rarity = calculateRarityFromScore(score);
      if (isOwnCard) {
        await saveScoreCheck({ fid: user.fid, username: user.username, score, rarity });
      }
      setNeynarScoreData({ score, rarity, fid: user.fid, username: user.username, displayName: user.display_name, pfpUrl: user.pfp_url });
      setShowScoreModal(true);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch Neynar score');
      setTimeout(() => setError(null), 3000);
    }
    setLoading(false);
  };

  const handleUpgrade = async () => {
    if (!isOwnCard || !card || !neynarScoreData || !canUpgrade()) return;
    AudioManager.buttonClick();
    setIsUpgrading(true);
    setShowScoreModal(false);
    setShowEvolutionModal(true);
    setEvolutionPhase('shaking');
    await new Promise(r => setTimeout(r, 800));
    setEvolutionPhase('glowing');
    await new Promise(r => setTimeout(r, 1200));
    try { new Audio('/sounds/evolution.mp3').play().catch(() => {}); } catch {}
    setEvolutionPhase('transforming');
    await new Promise(r => setTimeout(r, 1500));
    try {
      let result: any;
      let newBounty: number;
      if (isRarityUpgrade()) {
        result = await upgradeCardRarity({
          fid: card.fid, newNeynarScore: neynarScoreData.score, newRarity: neynarScoreData.rarity,
          username: neynarScoreData.username, displayName: neynarScoreData.displayName, pfpUrl: neynarScoreData.pfpUrl,
        });
        newBounty = result.newPower * 10;
      } else {
        result = await refreshCardScore({
          fid: card.fid, newNeynarScore: neynarScoreData.score,
          username: neynarScoreData.username, displayName: neynarScoreData.displayName, pfpUrl: neynarScoreData.pfpUrl,
        });
        newBounty = card.power * 10;
      }
      setEvolutionPhase('regenerating');
      setRegenerationStatus('Generating new card image...');
      const cardImageDataUrl = await generateFarcasterCardImage({
        pfpUrl: neynarScoreData.pfpUrl, displayName: neynarScoreData.displayName,
        username: neynarScoreData.username, fid: card.fid, neynarScore: neynarScoreData.score,
        rarity: isRarityUpgrade() && result.newRarity ? result.newRarity : card.rarity,
        suit: card.suit as any, rank: card.rank as any, suitSymbol: card.suitSymbol,
        color: card.color as 'red' | 'black', bio: card.bio || '', bounty: newBounty,
      });
      setRegenerationStatus('Generating video...');
      const videoBlob = await generateCardVideo({
        cardImageDataUrl, foilType: card.foil as 'None' | 'Standard' | 'Prize',
        duration: 3, fps: 30, pfpUrl: neynarScoreData.pfpUrl,
      });
      setRegenerationStatus('Uploading to IPFS...');
      const videoFormData = new FormData();
      videoFormData.append('video', videoBlob, 'card.webm');
      const videoUploadResponse = await fetch('/api/fid/upload-nft-video', { method: 'POST', body: videoFormData });
      if (!videoUploadResponse.ok) throw new Error('Failed to upload video');
      const { ipfsUrl: newVideoUrl } = await videoUploadResponse.json();
      setRegenerationStatus('Uploading card image...');
      const pngBlob = await (await fetch(cardImageDataUrl)).blob();
      const pngFormData = new FormData();
      pngFormData.append('image', pngBlob, 'card.png');
      const pngUploadResponse = await fetch('/api/fid/upload-nft-image', { method: 'POST', body: pngFormData });
      let newCardImageUrl: string | undefined;
      if (pngUploadResponse.ok) {
        const { ipfsUrl } = await pngUploadResponse.json();
        newCardImageUrl = ipfsUrl;
      }
      setRegenerationStatus('Updating card data...');
      await updateCardImages({ fid: card.fid, imageUrl: newVideoUrl, cardImageUrl: newCardImageUrl });
      try {
        await fetch('/api/fid/opensea/refresh-metadata', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fid: card.fid }),
        });
      } catch {}
      setEvolutionData({
        oldRarity: result.oldRarity ?? card.rarity, newRarity: result.newRarity ?? card.rarity,
        oldPower: result.oldPower ?? card.power, newPower: result.newPower ?? card.power,
        oldScore: card.neynarScore, newScore: neynarScoreData.score, newBounty,
      });
      setEvolutionPhase('complete');
      setRegenerationStatus('');
    } catch (err: any) {
      setError(err.message || 'Failed to upgrade card');
      setShowEvolutionModal(false);
      setEvolutionPhase('idle');
      setRegenerationStatus('');
    }
    setIsUpgrading(false);
  };

  // Report card status to parent for badge display
  useEffect(() => {
    if (fidCards === undefined) return;
    onCardStatus?.(fidCards.length > 0);
  }, [fidCards?.length]);

  // Loading state
  if (fidCards === undefined) {
    return (
      <div className="bg-vintage-charcoal rounded-xl border border-vintage-gold/50 p-6">
        <div className="flex items-center gap-2 text-vintage-gold/60 text-sm">
          <span className="animate-spin">⟳</span> Loading VibeFID card...
        </div>
      </div>
    );
  }

  // Mint banner if no card
  if (fidCards.length === 0) {
    return (
      <div className="bg-vintage-charcoal rounded-xl border border-vintage-gold/50 p-6 text-center">
        {hasVibeBadge ? (
          <>
            <p className="text-yellow-400 font-bold text-base mb-1">VibeFID NFT detected</p>
            <p className="text-vintage-ice/60 text-sm mb-2">
              This player owns a VibeFID NFT on-chain, but the card was received via transfer — no Convex record exists for FID #{fid}.
            </p>
            <p className="text-vintage-ice/40 text-xs">
              The card data is only created when minted through the app.
            </p>
          </>
        ) : (
          <>
            <p className="text-vintage-gold font-bold text-base mb-1">No VibeFID Card</p>
            <p className="text-vintage-ice/60 text-sm mb-4">This player hasn&apos;t minted their VibeFID card yet.</p>
          </>
        )}
        {isOwnProfile && (
          <Link
            href="/fid"
            className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-vintage-gold text-black font-bold border-2 border-black shadow-[3px_3px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all text-sm"
          >
            {hasVibeBadge ? 'Sync Card' : 'Mint Now'}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="bg-vintage-charcoal rounded-xl border border-vintage-gold/50 p-4">
      {/* Section header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-vintage-gold font-bold text-sm uppercase tracking-wider">VibeFID Card</span>
        {card && (
          <span className="text-vintage-burnt-gold text-xs">FID #{card.fid}</span>
        )}
      </div>

      {card && (
        <div className="flex gap-4">
          {/* Left: Card */}
          <div className="relative w-36 flex-shrink-0">
            {/* Card image */}
            <FoilCardEffect
              foilType={currentTraits?.foil === 'None' ? null : (currentTraits?.foil as 'Standard' | 'Prize' | null)}
              className="w-full rounded-lg shadow-xl border-2 border-vintage-gold overflow-hidden"
            >
              <CardMedia src={card.imageUrl || card.pfpUrl} alt={card.username} className="w-full" />
            </FoilCardEffect>

            {/* Traits button */}
            <div className="absolute -bottom-2 -left-2 z-20">
              <button
                onClick={() => { AudioManager.buttonClick(); setShowTraitsPopup(v => !v); }}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
                style={{ background: '#059669', border: '2px solid #000', boxShadow: '2px 2px 0px #000', color: '#fff' }}
                title="Card Traits"
              >
                <span className="text-xs font-bold">T</span>
              </button>
              {showTraitsPopup && (
                <div className="absolute bottom-9 left-0 z-30 bg-[#1E1E1E] border-2 border-black shadow-[4px_4px_0px_#000] rounded-sm p-3 min-w-[150px] text-xs">
                  <div className="flex items-center gap-2 mb-2 pb-2 border-b border-[#444]">
                    <span className={`font-black text-base ${card.color === 'red' ? 'text-red-500' : 'text-white'}`}>{card.rank}{card.suitSymbol}</span>
                    <span className="text-vintage-ice font-bold">{card.rarity}</span>
                  </div>
                  {currentTraits?.foil && currentTraits.foil !== 'None' && (
                    <div className="flex justify-between mb-1.5">
                      <span className="text-gray-400">Foil</span>
                      <span className={`font-bold ${currentTraits.foil === 'Prize' ? 'text-purple-400' : 'text-blue-400'}`}>{currentTraits.foil}</span>
                    </div>
                  )}
                  <div className="flex justify-between mb-1.5">
                    <span className="text-gray-400">Power</span>
                    <span className="text-[#FFD400] font-black">⚡ {correctPower}</span>
                  </div>
                  <div className="flex justify-between mb-1.5">
                    <span className="text-gray-400">Neynar</span>
                    <span className="text-white font-bold">{card.neynarScore.toFixed(3)}</span>
                  </div>
                  {currentTraits?.wear && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Wear</span>
                      <span className="text-white font-bold">{currentTraits.wear}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* VibeMail button */}
            <button
              onClick={() => {
                AudioManager.buttonClick();
                if (isOwnCard) { setShowVibeMailInbox(true); return; }
                if (!viewerFid) {
                  setError('Connect Farcaster to vibe');
                  setTimeout(() => setError(null), 3000);
                  return;
                }
                setShowPaidVoteModal(true);
              }}
              disabled={isVoting}
              className="absolute -bottom-2 -right-2 z-20 w-8 h-8 rounded-xl flex items-center justify-center transition-all disabled:opacity-70"
              style={{ background: '#BE185D', border: '2px solid #000', boxShadow: '2px 2px 0px #000', color: '#fff' }}
              title={isOwnCard ? `VibeMail inbox` : `Send VibeMail`}
            >
              {isVoting ? (
                <span className="animate-spin text-sm">⟳</span>
              ) : isOwnCard ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                </svg>
              )}
              {isOwnCard && unreadMessageCount !== undefined && unreadMessageCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[9px] font-bold flex items-center justify-center text-white">
                  {unreadMessageCount > 9 ? '9+' : unreadMessageCount}
                </span>
              )}
            </button>
          </div>

          {/* Right: Info + Actions */}
          <div className="flex-1 flex flex-col gap-2 min-w-0">
            {/* Name + Rarity */}
            <div>
              <p className="text-vintage-gold font-bold text-sm truncate">@{card.username}</p>
              <p className="text-vintage-ice/70 text-xs">{card.rarity} {currentTraits?.foil !== 'None' && currentTraits?.foil ? `• ${currentTraits.foil} Foil` : ''}</p>
              <p className="text-[#FFD400] text-xs font-bold mt-0.5">⚡ {correctPower} Power</p>
            </div>

            {/* Score */}
            <div className="bg-vintage-black/40 rounded border border-vintage-gold/20 px-2 py-1.5">
              <p className="text-vintage-burnt-gold text-[10px] uppercase tracking-wide">Neynar Score</p>
              <p className="text-vintage-gold font-bold text-base leading-tight">{card.neynarScore.toFixed(3)}</p>
              <p className="text-vintage-ice/50 text-[10px]">{card.rarity}</p>
            </div>

            {/* Vote count */}
            <div className="flex items-center gap-1">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="#BE185D">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
              <span className="text-vintage-ice/60 text-xs">{totalVotes} vibes</span>
            </div>

            {/* Action buttons */}
            <div className="flex gap-1.5 mt-auto">
              <button
                onClick={handleCheckNeynarScore}
                disabled={loading}
                className="flex-1 px-2 py-1.5 bg-vintage-black border border-vintage-gold/40 text-vintage-gold font-bold rounded text-xs hover:bg-vintage-gold/10 transition-colors disabled:opacity-50"
              >
                {loading ? '...' : 'Score'}
              </button>
              <button
                onClick={() => {
                  if (!card) return;
                  const chainSlug = (card as any).chain === 'arbitrum' ? 'arbitrum' : 'base';
                  const contract = (card as any).contractAddress || '0x60274A138d026E3cB337B40567100FdEC3127565';
                  window.open(`https://opensea.io/assets/${chainSlug}/${contract}/${card.fid}`, '_blank');
                }}
                className="flex-1 px-2 py-1.5 bg-vintage-black border border-vintage-gold/40 text-vintage-gold font-bold rounded text-xs hover:bg-vintage-gold/10 transition-colors"
              >
                OpenSea
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mt-2 p-2 bg-red-900/50 border border-red-500 rounded text-red-200 text-xs text-center">
          {error}
        </div>
      )}

      {/* === MODALS === */}

      {/* Neynar Score Modal */}
      {showScoreModal && neynarScoreData && (
        <div className="fixed inset-0 bg-black/80 flex items-start justify-center z-[10000] p-4 pt-16 pb-20 overflow-y-auto">
          <div className="bg-vintage-charcoal rounded-xl border-2 border-vintage-gold/50 p-4 max-w-md w-full">
            <h2 className="text-xl font-bold text-vintage-gold mb-3 text-center">Neynar Score</h2>
            <div className="bg-vintage-black/50 rounded-lg border border-vintage-gold/30 p-4 mb-3">
              <div className="text-center">
                <p className="text-vintage-burnt-gold text-xs mb-1">@{neynarScoreData.username}</p>
                <div className="text-4xl font-bold text-vintage-gold mb-1">{neynarScoreData.score.toFixed(3)}</div>
                <p className="text-vintage-ice text-xs">Current Score</p>
                {card && (
                  <p className={`text-xs mt-1 font-bold ${neynarScoreData.score > card.neynarScore ? 'text-green-400' : neynarScoreData.score < card.neynarScore ? 'text-red-400' : 'text-vintage-ice/50'}`}>
                    {neynarScoreData.score > card.neynarScore ? '+' : ''}
                    {(neynarScoreData.score - card.neynarScore).toFixed(4)} from mint
                  </p>
                )}
              </div>
              <div className="flex justify-between items-center mt-3 pt-3 border-t border-vintage-gold/20">
                <span className="text-vintage-burnt-gold text-xs">Rarity Available</span>
                <span className="text-vintage-ice font-bold">{neynarScoreData.rarity}</span>
              </div>
            </div>

            {canUpgrade() && card && (
              <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/50 rounded-lg p-3 mb-3 text-center">
                <p className="text-yellow-400 font-bold mb-1">Upgrade Available!</p>
                <p className="text-vintage-ice text-xs">
                  <span className="text-vintage-burnt-gold">{card.rarity}</span> → <span className="text-yellow-400">{neynarScoreData.rarity}</span>
                </p>
              </div>
            )}

            {scoreHistory?.history && scoreHistory.history.length > 0 && (
              <div className="bg-vintage-black/30 rounded-lg border border-vintage-gold/20 p-3 mb-3">
                <p className="text-vintage-burnt-gold text-xs mb-2 font-bold">Score History ({scoreHistory.totalChecks} checks)</p>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {scoreHistory.history.slice(0, 10).map((entry: any, i: number) => {
                    const prevScore = i < scoreHistory.history.length - 1 ? scoreHistory.history[i + 1]?.score : null;
                    const diff = prevScore !== null ? entry.score - prevScore : 0;
                    return (
                      <div key={i} className="flex justify-between items-center text-xs py-1 border-b border-vintage-gold/10 last:border-0">
                        <span className="text-vintage-ice/60 w-14">{new Date(entry.checkedAt).toLocaleDateString()}</span>
                        <span className="text-vintage-burnt-gold text-[10px] w-14">{getRarityFromScore(entry.score)}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-vintage-ice">{entry.score.toFixed(3)}</span>
                          {prevScore !== null && diff !== 0 && (
                            <span className={diff > 0 ? 'text-green-400' : 'text-red-400'}>{diff > 0 ? '+' : ''}{diff.toFixed(4)}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2">
              {canUpgrade() && (
                <button
                  onClick={handleUpgrade}
                  disabled={isUpgrading}
                  className="w-full px-4 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-black font-bold rounded-lg transition-all disabled:opacity-50"
                >
                  {isUpgrading ? 'Upgrading...' : isRarityUpgrade() ? 'Upgrade Rarity' : 'Refresh Score'}
                </button>
              )}
              <button
                onClick={() => { AudioManager.buttonClick(); setShowScoreModal(false); }}
                className="w-full px-3 py-2 bg-vintage-charcoal border border-vintage-gold/30 text-vintage-gold rounded-lg hover:bg-vintage-gold/10 transition-colors text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Evolution Modal */}
      {showEvolutionModal && card && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[10000] p-4 overflow-y-auto">
          <div className="max-w-sm w-full text-center my-auto">
            <div className={`relative mb-6 transition-all duration-500 ${evolutionPhase === 'shaking' ? 'animate-shake' : ''} ${evolutionPhase === 'glowing' ? 'animate-glow' : ''} ${evolutionPhase === 'transforming' ? 'animate-transform-card scale-105' : ''}`}>
              {(evolutionPhase === 'glowing' || evolutionPhase === 'transforming') && (
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 rounded-xl blur-xl opacity-75 animate-pulse" />
              )}
              <div className="relative w-44 mx-auto">
                <FoilCardEffect
                  foilType={currentTraits?.foil === 'None' ? null : (currentTraits?.foil as 'Standard' | 'Prize' | null)}
                  className="w-full rounded-lg shadow-2xl border-4 border-vintage-gold overflow-hidden"
                >
                  <CardMedia src={card.imageUrl || card.pfpUrl} alt={card.username} className="w-full" />
                </FoilCardEffect>
              </div>
              {evolutionPhase === 'transforming' && (
                <div className="absolute inset-0 pointer-events-none">
                  {[...Array(12)].map((_, i) => (
                    <div key={i} className="absolute w-2 h-2 bg-yellow-400 rounded-full animate-particle"
                      style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`, animationDelay: `${Math.random() * 0.5}s` }} />
                  ))}
                </div>
              )}
            </div>
            <div className="mb-4">
              {evolutionPhase === 'shaking' && <p className="text-2xl font-bold text-vintage-gold animate-pulse">Channeling Power...</p>}
              {evolutionPhase === 'glowing' && <p className="text-2xl font-bold text-yellow-400 animate-pulse">Energy Building...</p>}
              {evolutionPhase === 'transforming' && <p className="text-2xl font-bold text-orange-400 animate-pulse">Evolving!</p>}
              {evolutionPhase === 'regenerating' && (
                <div className="space-y-2">
                  <p className="text-2xl font-bold text-cyan-400 animate-pulse">Regenerating...</p>
                  {regenerationStatus && <p className="text-vintage-ice text-xs">{regenerationStatus}</p>}
                </div>
              )}
              {evolutionPhase === 'complete' && evolutionData && (
                <div className="space-y-3">
                  <p className="text-3xl font-bold text-green-400">Evolved!</p>
                  <div className="bg-vintage-black/50 rounded-lg border border-vintage-gold/30 p-4">
                    <div className="flex items-center justify-center gap-4 mb-3">
                      <div className="text-center">
                        <p className="text-vintage-burnt-gold text-xs">Before</p>
                        <p className="text-vintage-ice font-bold">{evolutionData.oldRarity}</p>
                        <p className="text-vintage-ice/60 text-xs">⚡ {evolutionData.oldPower}</p>
                      </div>
                      <div className="text-2xl">→</div>
                      <div className="text-center">
                        <p className="text-yellow-400 text-xs">After</p>
                        <p className="text-yellow-400 font-bold text-lg">{evolutionData.newRarity}</p>
                        <p className="text-yellow-400 text-xs">⚡ {evolutionData.newPower}</p>
                      </div>
                    </div>
                    <div className="text-center border-t border-vintage-gold/20 pt-2">
                      <p className="text-vintage-burnt-gold text-xs">Neynar Score</p>
                      <p className="text-vintage-gold font-bold text-sm">{evolutionData.oldScore.toFixed(3)} → {evolutionData.newScore.toFixed(3)}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={async () => {
                        AudioManager.buttonClick();
                        const castText = `My VibeFID just EVOLVED!\n\n${evolutionData.oldRarity} → ${evolutionData.newRarity}\nPower: ${evolutionData.oldPower} → ${evolutionData.newPower}\n\n@jvhbo`;
                        await shareToFarcaster(castText, `https://vibemostwanted.xyz/fid/${fid}`);
                      }}
                      className="flex-1 px-3 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg transition-colors text-sm"
                    >
                      Share
                    </button>
                    <button
                      onClick={() => { AudioManager.buttonClick(); setShowEvolutionModal(false); setEvolutionPhase('idle'); setEvolutionData(null); setNeynarScoreData(null); }}
                      className="flex-1 px-3 py-3 bg-vintage-gold hover:bg-vintage-burnt-gold text-vintage-black font-bold rounded-lg transition-colors text-sm"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Criminal Backstory Modal */}
      {showBackstoryModal && backstory && card && (
        <div className="fixed inset-0 bg-black/80 flex items-start justify-center z-[10000] px-4 pt-16 pb-20 overflow-y-auto">
          <div className="bg-vintage-charcoal rounded-xl border-2 border-vintage-gold/50 p-4 max-w-md w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-vintage-gold">Lore Criminal Record</h2>
              <button onClick={() => { AudioManager.buttonClick(); setShowBackstoryModal(false); }} className="text-vintage-gold hover:text-vintage-burnt-gold text-xl">✕</button>
            </div>
            <CriminalBackstoryCard backstory={backstory} displayName={card.displayName} lang={lang} />
          </div>
        </div>
      )}

      {/* Paid VibeMail Modal */}
      {showPaidVoteModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 p-4 pt-16 pb-24">
          <div className="bg-vintage-charcoal border-2 border-vintage-gold rounded-2xl p-4 w-full max-w-sm max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <button onClick={() => { AudioManager.buttonClick(); setShowPaidVoteModal(false); }} className="w-8 h-8 bg-vintage-black/50 border border-vintage-gold/30 rounded-full text-vintage-gold hover:bg-vintage-gold/20 transition-all text-sm font-bold">✕</button>
              <h3 className="text-vintage-gold font-bold text-lg text-center">VibeMail</h3>
              <div className="w-8" />
            </div>

            {/* VBMS Balance */}
            <div className="bg-vintage-black/50 rounded-lg p-3 mb-4">
              <p className="text-vintage-ice/60 text-xs mb-1">Your VBMS Balance</p>
              <p className="text-vintage-gold font-bold text-lg">
                {parseFloat(vbmsBalance || '0').toLocaleString(undefined, { maximumFractionDigits: 2 })} VBMS
              </p>
            </div>

            {/* Tab Toggle */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => { AudioManager.buttonClick(); setVibeMailTab('free'); }}
                disabled={freeVotesRemaining <= 0}
                className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all ${vibeMailTab === 'free' ? 'bg-green-500 text-black' : 'bg-vintage-black/50 text-vintage-ice/60 hover:bg-vintage-black/80'} ${freeVotesRemaining <= 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                Free ({freeVotesRemaining}/1)
              </button>
              <button
                onClick={() => { AudioManager.buttonClick(); setVibeMailTab('paid'); }}
                className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all ${vibeMailTab === 'paid' ? 'bg-yellow-500 text-black' : 'bg-vintage-black/50 text-vintage-ice/60 hover:bg-vintage-black/80'}`}
              >
                Paid
              </button>
            </div>

            {/* Paid vote count */}
            {vibeMailTab === 'paid' && (
              <div className="mb-4">
                <p className="text-vintage-ice/60 text-xs mb-2">Vibes to send</p>
                <div className="flex items-center gap-2">
                  <button onClick={() => setPaidVoteCount(Math.max(1, paidVoteCount - 1))} className="w-10 h-10 bg-vintage-black border border-vintage-gold/30 text-vintage-gold rounded-lg font-bold hover:bg-vintage-gold/10">-</button>
                  <input type="number" value={paidVoteCount} onChange={e => setPaidVoteCount(Math.max(1, parseInt(e.target.value) || 1))} className="flex-1 h-10 bg-vintage-black border border-vintage-gold/30 text-vintage-gold text-center rounded-lg font-bold" min="1" />
                  <button onClick={() => setPaidVoteCount(paidVoteCount + 1)} className="w-10 h-10 bg-vintage-black border border-vintage-gold/30 text-vintage-gold rounded-lg font-bold hover:bg-vintage-gold/10">+</button>
                </div>
              </div>
            )}

            <VibeMailComposer
              message={vibeMailTab === 'free' ? freeVibeMailMessage : vibeMailMessage}
              setMessage={vibeMailTab === 'free' ? setFreeVibeMailMessage : setVibeMailMessage}
              audioId={vibeMailTab === 'free' ? freeVibeMailAudioId : vibeMailAudioId}
              setAudioId={vibeMailTab === 'free' ? setFreeVibeMailAudioId : setVibeMailAudioId}
              imageId={vibeMailTab === 'free' ? freeVibeMailImageId : vibeMailImageId}
              setImageId={vibeMailTab === 'free' ? setFreeVibeMailImageId : setVibeMailImageId}
            />

            {vibeMailTab === 'paid' && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mt-4 mb-4">
                <div className="flex justify-between items-center">
                  <span className="text-vintage-ice text-sm">Cost per vibe:</span>
                  <span className="text-yellow-400 font-bold">{voteCostVBMS} VBMS</span>
                </div>
                <div className="flex justify-between items-center mt-2 pt-2 border-t border-yellow-500/20">
                  <span className="text-vintage-ice font-bold">Total:</span>
                  <span className="text-yellow-400 font-bold text-lg">{(parseInt(voteCostVBMS) * paidVoteCount).toLocaleString()} VBMS</span>
                </div>
              </div>
            )}

            {vibeMailTab === 'free' && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 mt-4 mb-4">
                <p className="text-green-400 text-sm text-center">1 free VibeMail per day!</p>
              </div>
            )}

            <button
              onClick={async () => {
                AudioManager.buttonClick();
                if (vibeMailTab === 'free') {
                  const result = await voteFree(freeVibeMailMessage || undefined, freeVibeMailAudioId || undefined, freeVibeMailImageId || undefined);
                  if (result.success) {
                    setShowPaidVoteModal(false);
                    setFreeVibeMailMessage(''); setFreeVibeMailAudioId(null); setFreeVibeMailImageId(null);
                  } else {
                    setError(result.error || 'Vote failed');
                    setTimeout(() => setError(null), 5000);
                  }
                } else {
                  const result = await votePaid(paidVoteCount, vibeMailMessage, vibeMailAudioId || undefined, vibeMailImageId || undefined);
                  if (result.success) {
                    setShowPaidVoteModal(false);
                    setPaidVoteCount(1); setVibeMailMessage(''); setVibeMailAudioId(null); setVibeMailImageId(null);
                  } else {
                    setError(result.error || 'Vote failed');
                    setTimeout(() => setError(null), 5000);
                  }
                }
              }}
              disabled={isVoting || (vibeMailTab === 'free' && freeVotesRemaining <= 0) || (vibeMailTab === 'paid' && parseFloat(vbmsBalance || '0') < parseInt(voteCostVBMS) * paidVoteCount)}
              className={`w-full py-3 font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed ${vibeMailTab === 'free' ? 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-black' : 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-black'}`}
            >
              {isVoting ? 'Sending...' : 'Send Vibe'}
            </button>

            {vibeMailTab === 'paid' && parseFloat(vbmsBalance || '0') < parseInt(voteCostVBMS) * paidVoteCount && (
              <p className="text-red-400 text-xs text-center mt-2">Insufficient VBMS balance</p>
            )}
          </div>
        </div>
      )}

      {/* VibeMail Inbox */}
      {showVibeMailInbox && isOwnCard && (
        <VibeMailInbox cardFid={fid} onClose={() => setShowVibeMailInbox(false)} />
      )}
    </div>
  );
}
