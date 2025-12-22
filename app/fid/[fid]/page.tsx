'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useLanguage } from '@/contexts/LanguageContext';
import { generateCriminalBackstory } from '@/lib/generateCriminalBackstory';
import { getFarcasterAccountCreationDate } from '@/lib/farcasterRegistry';
import CriminalBackstoryCard from '@/components/CriminalBackstoryCard';
import Link from 'next/link';
import { CardMedia } from '@/components/CardMedia';
import { convertIpfsUrl } from '@/lib/ipfs-url-converter';
import FoilCardEffect from '@/components/FoilCardEffect';
import { getFidTraits } from '@/lib/fidTraits';
import { sdk } from '@farcaster/miniapp-sdk';
import { getUserByFid, calculateRarityFromScore } from '@/lib/neynar';
import { AudioManager } from '@/lib/audio-manager';
import { useFarcasterContext } from '@/lib/hooks/useFarcasterContext';
import { fidTranslations } from '@/lib/fidTranslations';
import { generateFarcasterCardImage } from '@/lib/generateFarcasterCard';
import { generateCardVideo } from '@/lib/generateCardVideo';

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

  // Fetch all cards for this FID
  const fidCards = useQuery(api.farcasterCards.getFarcasterCardsByFid, { fid });

  // Neynar score history
  const scoreHistory = useQuery(api.neynarScore.getScoreHistory, { fid });
  const saveScoreCheck = useMutation(api.neynarScore.saveScoreCheck);
  const upgradeCardRarity = useMutation(api.farcasterCards.upgradeCardRarity);
  const updateCardImages = useMutation(api.farcasterCards.updateCardImages);

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
  const [neynarScoreData, setNeynarScoreData] = useState<{ score: number; rarity: string; fid: number; username: string } | null>(null);
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

  // Check Neynar Score
  const handleCheckNeynarScore = async () => {
    AudioManager.buttonClick();

    if (!farcasterContext.user) {
      setError("Please connect your Farcaster account first");
      setTimeout(() => setError(null), 3000);
      return;
    }

    const userFid = farcasterContext.user.fid;
    setLoading(true);
    setError(null);

    try {
      const user = await getUserByFid(userFid);
      if (!user) {
        setError(`No user found for FID ${userFid}`);
        setLoading(false);
        setTimeout(() => setError(null), 3000);
        return;
      }

      const score = user.experimental.neynar_user_score;
      const rarity = calculateRarityFromScore(score);

      // Save score to history
      await saveScoreCheck({
        fid: user.fid,
        username: user.username,
        score,
        rarity,
      });

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
      setTimeout(() => setError(null), 3000);
    }
  };

  // Check if upgrade is available
  const canUpgrade = () => {
    if (!card || !neynarScoreData) return false;
    const rarityOrder = ['Common', 'Rare', 'Epic', 'Legendary', 'Mythic'];
    const currentRarityIndex = rarityOrder.indexOf(card.rarity);
    const newRarityIndex = rarityOrder.indexOf(neynarScoreData.rarity);
    return newRarityIndex > currentRarityIndex;
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

  // Handle upgrade with animation and video regeneration
  const handleUpgrade = async () => {
    if (!card || !neynarScoreData || !canUpgrade()) return;

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
      // Step 1: Upgrade rarity/power in database
      const result = await upgradeCardRarity({
        fid: card.fid,
        newNeynarScore: neynarScoreData.score,
        newRarity: neynarScoreData.rarity,
      });

      const newBounty = result.newPower * 10;

      // Step 2: Regenerate video with new values
      setEvolutionPhase('regenerating');
      setRegenerationStatus('Generating new card image...');

      // Generate new card image with updated bounty/rarity
      const cardImageDataUrl = await generateFarcasterCardImage({
        pfpUrl: card.pfpUrl,
        displayName: card.displayName,
        username: card.username,
        fid: card.fid,
        neynarScore: card.neynarScore, // Keep original neynar score on card
        rarity: result.newRarity,
        suit: card.suit as any,
        rank: card.rank as any,
        suitSymbol: card.suitSymbol,
        color: card.color as 'red' | 'black',
        bio: card.bio || '',
        bounty: newBounty,
      });

      setRegenerationStatus('Generating video with foil effect...');

      // Generate video with foil animation
      const videoBlob = await generateCardVideo({
        cardImageDataUrl,
        foilType: card.foil as 'None' | 'Standard' | 'Prize',
        duration: 3,
        fps: 30,
        pfpUrl: card.pfpUrl,
      });

      setRegenerationStatus('Uploading to IPFS...');

      // Upload to IPFS
      const formData = new FormData();
      formData.append('video', videoBlob, 'card.webm');

      const uploadResponse = await fetch('/api/upload-nft-video', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        const uploadError = await uploadResponse.json();
        throw new Error(uploadError.error || 'Failed to upload video');
      }

      const uploadResult = await uploadResponse.json();
      const newVideoUrl = uploadResult.ipfsUrl;

      setRegenerationStatus('Updating card data...');

      // Step 3: Update card images in database
      await updateCardImages({
        fid: card.fid,
        imageUrl: newVideoUrl,
      });

      setEvolutionData({
        oldRarity: result.oldRarity,
        newRarity: result.newRarity,
        oldPower: result.oldPower,
        newPower: result.newPower,
        oldScore: result.oldScore || card.neynarScore,
        newScore: result.newScore || neynarScoreData.score,
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

  // Notify Farcaster SDK that app is ready
  useEffect(() => {
    const initFarcasterSDK = async () => {
      try {
        if (typeof window !== 'undefined') {
          await sdk.actions.ready();
          console.log('✅ Farcaster SDK ready called');
        }
      } catch (error) {
        console.error('Error calling Farcaster SDK ready:', error);
      }
    };
    initFarcasterSDK();
  }, []);

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
    <div className="min-h-screen bg-gradient-to-b from-vintage-charcoal to-vintage-deep-black p-8">
      {/* Language Selector - Fixed Top Right */}
      <div className="fixed top-4 right-4 z-50">
        <select
          value={lang}
          onChange={(e) => setLang(e.target.value as any)}
          className="px-4 py-2 bg-vintage-charcoal border-2 border-vintage-gold/50 rounded-lg text-vintage-ice focus:outline-none focus:border-vintage-gold text-sm shadow-lg hover:border-vintage-gold transition-colors"
        >
          <option value="en">🇺🇸 English</option>
          <option value="pt-BR">🇧🇷 Português</option>
          <option value="es">🇪🇸 Español</option>
          <option value="hi">🇮🇳 हिन्दी</option>
          <option value="ru">🇷🇺 Русский</option>
          <option value="zh-CN">🇨🇳 中文</option>
        </select>
      </div>

      <div className="max-w-4xl mx-auto">
        {/* Mint Your Card Button - Top */}
        <div className="mb-6 text-center">
          <Link
            href="/fid"
            className="px-6 py-3 bg-vintage-gold text-vintage-black font-bold rounded-lg hover:bg-vintage-burnt-gold transition-colors inline-block"
          >
            ← Mint Your Card
          </Link>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-display font-bold text-vintage-gold mb-2">
            VibeFID #{fid}
          </h1>
          <p className="text-vintage-ice">
            {card?.displayName} (
            <a
              href={`https://farcaster.xyz/${card?.username}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-vintage-gold hover:text-vintage-burnt-gold transition-colors underline"
            >
              @{card?.username}
            </a>
            )
          </p>
        </div>

        {/* Card Display */}
        {card && (
          <div className="bg-vintage-black/50 rounded-xl border border-vintage-gold/50 p-6 mb-8">
            <div className="flex flex-col items-center">
              {/* Card Image/Video */}
              <div className="w-full max-w-md mb-6">
                <FoilCardEffect
                  foilType={currentTraits?.foil === 'None' ? null : (currentTraits?.foil as 'Standard' | 'Prize' | null)}
                  className="w-full rounded-lg shadow-2xl border-4 border-vintage-gold overflow-hidden"
                >
                  <CardMedia
                    src={card.imageUrl || card.pfpUrl}
                    alt={card.username}
                    className="w-full"
                  />
                </FoilCardEffect>
              </div>

              {/* Card Stats */}
              <div className="w-full max-w-md bg-vintage-charcoal/80 rounded-lg border border-vintage-gold/30 p-6">
                <h3 className="text-xl font-bold text-vintage-gold mb-4 text-center">
                  Card Stats
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-vintage-burnt-gold font-semibold">Card:</span>{" "}
                    <span className={`font-bold ${card.color === 'red' ? 'text-red-500' : 'text-white'}`}>
                      {card.rank}{card.suitSymbol}
                    </span>
                  </div>
                  <div>
                    <span className="text-vintage-burnt-gold font-semibold">Rarity:</span>{" "}
                    <span className="text-vintage-ice">{card.rarity}</span>
                  </div>
                  <div>
                    <span className="text-vintage-burnt-gold font-semibold">Foil:</span>{" "}
                    <span className={`font-bold ${
                      currentTraits?.foil === 'Prize' ? 'text-purple-400' :
                      currentTraits?.foil === 'Standard' ? 'text-blue-400' :
                      'text-vintage-ice'
                    }`}>
                      {currentTraits?.foil || 'None'}
                    </span>
                  </div>
                  <div>
                    <span className="text-vintage-burnt-gold font-semibold">Wear:</span>{" "}
                    <span className="text-vintage-ice">{currentTraits?.wear || 'Unknown'}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-vintage-burnt-gold font-semibold">Power:</span>{" "}
                    <span className="text-vintage-gold font-bold text-lg">{correctPower}</span>
                  </div>
                  <div className="col-span-2 pt-2 border-t border-vintage-gold/20">
                    <span className="text-vintage-burnt-gold font-semibold">Neynar Score:</span>{" "}
                    <span className="text-vintage-ice font-bold">{card.neynarScore.toFixed(3)}</span>
                    <span className="text-vintage-ice/60 text-xs ml-2">(at mint time)</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 w-full max-w-md space-y-3">
                <div className="flex gap-4">
                  {/* Share to Farcaster */}
                  <a
                    href={(() => {
                      const shareUrl = `https://www.vibemostwanted.xyz/share/fid/${card.fid}`;

                      // Build dynamic share text with emojis
                      const rarityEmojiMap: Record<string, string> = {
                        'Mythic': '👑',
                        'Legendary': '⚡',
                        'Epic': '💎',
                        'Rare': '🔥',
                        'Common': '⭐'
                      };
                      const rarityEmoji = rarityEmojiMap[card.rarity] || '🎴';

                      const foilEmoji = currentTraits?.foil === 'Prize' ? '✨' : currentTraits?.foil === 'Standard' ? '💫' : '';
                      const foilText = currentTraits?.foil !== 'None' ? ` ${currentTraits?.foil} Foil` : '';

                      const castText = `🃏 Just minted my VibeFID!\n\n${rarityEmoji} ${card.rarity}${foilText}\n⚡ ${correctPower} Power ${foilEmoji}\n🎯 FID #${card.fid}\n\n🎲 Play Poker Battles\n🗡️ Fight in PvE\n💰 Earn coins\n\n🎮 Mint yours! @jvhbo`;

                      return `https://warpcast.com/~/compose?text=${encodeURIComponent(castText)}&embeds[]=${encodeURIComponent(shareUrl)}`;
                    })()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 px-6 py-4 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <span className="text-xl">🔮</span>
                    <span className="hidden sm:inline">Share to Farcaster</span>
                    <span className="sm:hidden">Share</span>
                  </a>

                  {/* View on OpenSea */}
                  <a
                    href={`https://opensea.io/assets/base/${card.contractAddress || '0x60274A138d026E3cB337B40567100FdEC3127565'}/${card.fid}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 px-6 py-4 bg-vintage-gold hover:bg-vintage-burnt-gold text-vintage-black font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <span className="hidden sm:inline">View on OpenSea</span>
                    <span className="sm:hidden">OpenSea</span>
                  </a>
                </div>

                {/* Check Your Neynar Score Button */}
                {farcasterContext.user && (
                  <button
                    onClick={handleCheckNeynarScore}
                    disabled={loading}
                    className="w-full px-6 py-4 bg-vintage-charcoal border-2 border-vintage-gold/50 text-vintage-gold font-bold rounded-lg hover:bg-vintage-gold/10 transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
                  >
                    {loading ? t.generatingScore : t.checkNeynarScore}
                  </button>
                )}

                {/* Error message */}
                {error && (
                  <div className="p-3 bg-red-900/50 border border-red-500 rounded-lg text-red-200 text-sm text-center">
                    {error}
                  </div>
                )}

                {/* Score History Chart */}
                {scoreHistory && scoreHistory.totalChecks > 0 && (
                  <div className="mt-4 bg-vintage-charcoal/80 rounded-lg border border-vintage-gold/30 p-4">
                    <h4 className="text-vintage-gold font-bold mb-3 text-center">
                      📊 Neynar Score Progress
                    </h4>

                    {/* Progress Summary */}
                    <div className="grid grid-cols-3 gap-2 mb-4 text-center text-sm">
                      <div className="bg-vintage-black/50 rounded p-2">
                        <p className="text-vintage-burnt-gold text-xs">First Check</p>
                        <p className="text-vintage-ice font-bold">{scoreHistory.firstCheck.score.toFixed(3)}</p>
                      </div>
                      <div className="bg-vintage-black/50 rounded p-2">
                        <p className="text-vintage-burnt-gold text-xs">Current</p>
                        <p className="text-vintage-gold font-bold">{scoreHistory.latestCheck.score.toFixed(3)}</p>
                      </div>
                      <div className="bg-vintage-black/50 rounded p-2">
                        <p className="text-vintage-burnt-gold text-xs">Change</p>
                        <p className={`font-bold ${scoreHistory.scoreDiff >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {scoreHistory.scoreDiff >= 0 ? '+' : ''}{scoreHistory.scoreDiff.toFixed(3)}
                        </p>
                      </div>
                    </div>

                    {/* Visual Chart - Simple bar representation */}
                    {scoreHistory.history && scoreHistory.history.length > 1 && (
                      <div className="mb-3">
                        <p className="text-vintage-burnt-gold text-xs mb-2 text-center">Score History (Last {scoreHistory.history.length} checks)</p>
                        <div className="flex items-end justify-center gap-1 h-16 px-2">
                          {[...scoreHistory.history].reverse().map((check: any, index: number) => {
                            // Normalize score to height (0.0-1.0 range, most scores are 0.5-1.0)
                            const minScore = Math.min(...scoreHistory.history.map((h: any) => h.score));
                            const maxScore = Math.max(...scoreHistory.history.map((h: any) => h.score));
                            const range = maxScore - minScore || 0.1;
                            const normalizedHeight = ((check.score - minScore) / range) * 100;
                            const heightPercent = Math.max(20, Math.min(100, normalizedHeight));

                            return (
                              <div
                                key={check._id || index}
                                className="flex-1 max-w-4 bg-gradient-to-t from-vintage-gold to-vintage-burnt-gold rounded-t transition-all hover:opacity-80"
                                style={{ height: `${heightPercent}%` }}
                                title={`${check.score.toFixed(3)} - ${new Date(check.checkedAt).toLocaleDateString()}`}
                              />
                            );
                          })}
                        </div>
                        <div className="flex justify-between text-vintage-ice/50 text-xs mt-1 px-2">
                          <span>Oldest</span>
                          <span>Recent</span>
                        </div>
                      </div>
                    )}

                    {/* Stats Footer */}
                    <div className="flex justify-between items-center text-xs border-t border-vintage-gold/20 pt-2">
                      <span className="text-vintage-ice/60">
                        {scoreHistory.totalChecks} total checks
                      </span>
                      <span className={`font-bold ${parseFloat(scoreHistory.percentChange) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {parseFloat(scoreHistory.percentChange) >= 0 ? '↑' : '↓'} {Math.abs(parseFloat(scoreHistory.percentChange))}%
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Criminal Backstory */}
        {backstory && card && (
          <div className="mb-8">
            <CriminalBackstoryCard
              backstory={backstory}
              displayName={card.displayName}
              lang={lang}
            />
          </div>
        )}

        {/* Mint History for this FID */}
        {fidCards && fidCards.length > 1 && (
          <div className="bg-vintage-black/50 rounded-xl border border-vintage-gold/50 p-6 mb-8">
            <h2 className="text-2xl font-bold text-vintage-gold mb-4">
              All Mints ({fidCards.length} total)
            </h2>
            <p className="text-vintage-ice/70 mb-4 text-sm">
              All mints of FID #{fid}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {fidCards.slice(1).map((mintedCard: any) => (
                <Link
                  key={mintedCard._id}
                  href={`/fid/${mintedCard.fid}`}
                  className="bg-vintage-charcoal rounded-lg border border-vintage-gold/30 p-4 hover:border-vintage-gold transition-colors"
                >
                  <div className="text-center mb-2">
                    <span className={`text-2xl font-bold ${mintedCard.color === 'red' ? 'text-red-500' : 'text-black'}`}>
                      {mintedCard.rank}{mintedCard.suitSymbol}
                    </span>
                  </div>

                  <div className="aspect-square mb-2 rounded-lg overflow-hidden">
                    <CardMedia
                      src={mintedCard.imageUrl || mintedCard.pfpUrl}
                      alt={mintedCard.username}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-vintage-burnt-gold text-sm">{mintedCard.rarity}</span>
                    <span className="text-vintage-ice text-sm">⚡ {mintedCard.power}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

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

                {/* Upgrade Available Banner */}
                {canUpgrade() && card && (
                  <div className="border-t border-vintage-gold/20 pt-4 mt-4">
                    <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/50 rounded-lg p-4 text-center">
                      <p className="text-yellow-400 font-bold text-lg mb-1">⬆️ UPGRADE AVAILABLE!</p>
                      <p className="text-vintage-ice text-sm">
                        Your score improved! Upgrade from <span className="text-vintage-burnt-gold font-bold">{card.rarity}</span> to{' '}
                        <span className="text-yellow-400 font-bold">{neynarScoreData.rarity}</span>
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-3">
                {/* Upgrade Button - Only show if upgrade is available */}
                {canUpgrade() && (
                  <button
                    onClick={handleUpgrade}
                    disabled={isUpgrading}
                    className="w-full px-4 py-4 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-black font-bold rounded-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 animate-pulse"
                  >
                    {isUpgrading ? '⏳ Upgrading...' : '⬆️ UPGRADE CARD RARITY'}
                  </button>
                )}

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
          </div>
        )}

        {/* Evolution Animation Modal */}
        {showEvolutionModal && card && (
          <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
            <div className="max-w-md w-full text-center">
              {/* Card with Animation */}
              <div className={`relative mb-8 transition-all duration-500 ${
                evolutionPhase === 'shaking' ? 'animate-shake' : ''
              } ${evolutionPhase === 'glowing' ? 'animate-glow' : ''} ${
                evolutionPhase === 'transforming' ? 'animate-transform-card scale-110' : ''
              }`}>
                {/* Glow Effect */}
                {(evolutionPhase === 'glowing' || evolutionPhase === 'transforming') && (
                  <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 rounded-xl blur-xl opacity-75 animate-pulse" />
                )}

                {/* Card */}
                <div className="relative w-64 mx-auto">
                  <FoilCardEffect
                    foilType={currentTraits?.foil === 'None' ? null : (currentTraits?.foil as 'Standard' | 'Prize' | null)}
                    className="w-full rounded-lg shadow-2xl border-4 border-vintage-gold overflow-hidden"
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
                    {[...Array(20)].map((_, i) => (
                      <div
                        key={i}
                        className="absolute w-2 h-2 bg-yellow-400 rounded-full animate-particle"
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
              <div className="mb-6">
                {evolutionPhase === 'shaking' && (
                  <p className="text-2xl font-bold text-vintage-gold animate-pulse">🔮 Channeling power...</p>
                )}
                {evolutionPhase === 'glowing' && (
                  <p className="text-2xl font-bold text-yellow-400 animate-pulse">✨ Energy building...</p>
                )}
                {evolutionPhase === 'transforming' && (
                  <p className="text-2xl font-bold text-orange-400 animate-pulse">⚡ EVOLVING!</p>
                )}
                {evolutionPhase === 'regenerating' && (
                  <div className="space-y-3">
                    <p className="text-2xl font-bold text-cyan-400 animate-pulse">🎬 Regenerating Card...</p>
                    {regenerationStatus && (
                      <p className="text-vintage-ice text-sm">{regenerationStatus}</p>
                    )}
                  </div>
                )}
                {evolutionPhase === 'complete' && evolutionData && (
                  <div className="space-y-4">
                    <p className="text-3xl font-bold text-green-400">🎉 EVOLUTION COMPLETE!</p>

                    <div className="bg-vintage-black/50 rounded-lg border border-vintage-gold/30 p-6">
                      <div className="flex items-center justify-center gap-4 mb-4">
                        <div className="text-center">
                          <p className="text-vintage-burnt-gold text-xs">Before</p>
                          <p className="text-vintage-ice text-lg font-bold">{evolutionData.oldRarity}</p>
                          <p className="text-vintage-ice/60 text-sm">⚡ {evolutionData.oldPower}</p>
                        </div>
                        <div className="text-3xl">→</div>
                        <div className="text-center">
                          <p className="text-yellow-400 text-xs">After</p>
                          <p className="text-yellow-400 text-xl font-bold">{evolutionData.newRarity}</p>
                          <p className="text-yellow-400 text-sm">⚡ {evolutionData.newPower}</p>
                          <p className="text-green-400 text-xs mt-1">💰 ${evolutionData.newBounty.toLocaleString()}</p>
                        </div>
                      </div>

                      <div className="text-center border-t border-vintage-gold/20 pt-4">
                        <p className="text-vintage-burnt-gold text-xs">Neynar Score</p>
                        <p className="text-vintage-gold font-bold">
                          {evolutionData.oldScore.toFixed(3)} → {evolutionData.newScore.toFixed(3)}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <a
                        href={(() => {
                          const shareUrl = `https://www.vibemostwanted.xyz/fid/${fid}`;
                          const castText = `⚡ My VibeFID just EVOLVED!\n\n🃏 ${evolutionData.oldRarity} → ${evolutionData.newRarity}\n💪 Power: ${evolutionData.oldPower} → ${evolutionData.newPower}\n💰 Bounty: $${evolutionData.newBounty.toLocaleString()}\n\n🎴 @jvhbo`;
                          return `https://warpcast.com/~/compose?text=${encodeURIComponent(castText)}&embeds[]=${encodeURIComponent(shareUrl)}`;
                        })()}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => AudioManager.buttonClick()}
                        className="flex-1 px-4 py-4 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg transition-colors text-center"
                      >
                        📢 Share Evolution
                      </a>
                      <button
                        onClick={() => {
                          AudioManager.buttonClick();
                          setShowEvolutionModal(false);
                          setEvolutionPhase('idle');
                          setEvolutionData(null);
                          setNeynarScoreData(null);
                        }}
                        className="flex-1 px-4 py-4 bg-vintage-gold hover:bg-vintage-burnt-gold text-vintage-black font-bold rounded-lg transition-colors"
                      >
                        ✓ Close
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
