'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation } from 'convex/react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/fid/convex-generated/api';
import { CardMedia } from '@/components/fid/CardMedia';
import FoilCardEffect from '@/components/fid/FoilCardEffect';
import { VibeMailInbox } from '@/components/fid/VibeMail';
import { VibeFIDConvexProvider } from '@/contexts/VibeFIDConvexProvider';
import { getUserByFid, calculateRarityFromScore } from '@/lib/fid/neynar';
import { sdk } from '@farcaster/miniapp-sdk';
import { generateFarcasterCardImage } from '@/lib/fid/generateFarcasterCard';
import { generateCardVideo } from '@/lib/fid/generateCardVideo';
import { shareToFarcaster } from '@/lib/fid/share-utils';
import { generateCriminalBackstory } from '@/lib/fid/generateCriminalBackstory';
import { getFarcasterAccountCreationDate } from '@/lib/fid/farcasterRegistry';
import CriminalBackstoryCard from '@/components/fid/CriminalBackstoryCard';
import { LanguageSelect } from '@/components/SettingsModal';
import { useLanguage } from '@/contexts/LanguageContext';
import { fidTranslations } from '@/lib/fid/fidTranslations';

interface VibeFidMailModalProps {
  fid: number;
  username?: string;
  ownerFid?: number; // logged-in user's FID — upgrade/mail only shown if fid === ownerFid
  onClose: () => void;
}

const RARITY_BASE_POWER: Record<string, number> = { Common: 10, Rare: 20, Epic: 50, Legendary: 100, Mythic: 600 };
const WEAR_MULT: Record<string, number> = { Pristine: 1.8, Mint: 1.4, 'Lightly Played': 1.0, 'Moderately Played': 1.0, 'Heavily Played': 1.0 };
const FOIL_MULT: Record<string, number> = { Prize: 6.0, Standard: 2.0, None: 1.0 };

const RARITY_BORDER: Record<string, string> = {
  Common: '#9ca3af',
  Rare: '#3b82f6',
  Epic: '#a855f7',
  Legendary: '#eab308',
  Mythic: '#ef4444',
};

const RARITY_GLOW: Record<string, string> = {
  Common: 'rgba(156,163,175,0.3)',
  Rare: 'rgba(59,130,246,0.3)',
  Epic: 'rgba(168,85,247,0.4)',
  Legendary: 'rgba(234,179,8,0.4)',
  Mythic: 'rgba(239,68,68,0.5)',
};

function calcPower(rarity: string, wear: string, foil: string) {
  return Math.round((RARITY_BASE_POWER[rarity] || 5) * (WEAR_MULT[wear] || 1) * (FOIL_MULT[foil] || 1));
}

function ModalInner({ fid, username, ownerFid, onClose }: VibeFidMailModalProps) {
  const isOwnCard = !ownerFid || ownerFid === fid;
  const { lang } = useLanguage();
  const t = fidTranslations[lang] ?? fidTranslations['en'];
  const [mobilePanel, setMobilePanel] = useState<'card' | 'mail'>('card');
  const [loading, setLoading] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [scoreData, setScoreData] = useState<{ score: number; rarity: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshingMetadata, setIsRefreshingMetadata] = useState(false);
  const [metadataRefreshed, setMetadataRefreshed] = useState(false);
  const [showTraitsPopup, setShowTraitsPopup] = useState(false);
  const [showBackstoryModal, setShowBackstoryModal] = useState(false);
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [upgradeSuccess, setUpgradeSuccess] = useState(false);
  const [showUpgradeAnim, setShowUpgradeAnim] = useState(false);
  const [upgradeAnimPhase, setUpgradeAnimPhase] = useState<'charging'|'burst'|'reveal'>('charging');
  const [backstory, setBackstory] = useState<any>(null);
  const router = useRouter();
  const fidCards = useQuery(api.farcasterCards.getFarcasterCardsByFid, { fid });
  const unreadCount = useQuery(api.cardVotes.getUnreadMessageCount, { cardFid: fid });
  const scoreHistory = useQuery(api.neynarScore.getScoreHistory, { fid });
  const saveScoreCheck = useMutation(api.neynarScore.saveScoreCheck);
  const upgradeCardRarity = useMutation(api.farcasterCards.upgradeCardRarity);
  const refreshCardScore = useMutation(api.farcasterCards.refreshCardScore);
  const card = fidCards?.[0];
  const power = card ? calcPower(card.rarity, card.wear, card.foil) : 0;

  const updateCardImages = useMutation(api.farcasterCards.updateCardImages);

  // Silent background regeneration: PNG + WebM + Filebase upload + OpenSea refresh
  const regenerateCardFull = (cardData: typeof card, newScore: number) => {
    if (!cardData) return;
    (async () => {
      try {
        const cardImageDataUrl = await generateFarcasterCardImage({
          pfpUrl: cardData.pfpUrl, displayName: cardData.displayName,
          username: cardData.username, fid: cardData.fid, neynarScore: newScore,
          rarity: cardData.rarity, suit: cardData.suit, rank: cardData.rank,
          suitSymbol: cardData.suitSymbol, color: cardData.color,
          bio: cardData.bio || '', bounty: cardData.power * 10,
        });
        const videoBlob = await generateCardVideo({
          cardImageDataUrl, foilType: (cardData.foil as any) || 'None', duration: 3, fps: 30, pfpUrl: cardData.pfpUrl,
        });
        const videoForm = new FormData();
        videoForm.append('video', videoBlob, 'card.webm');
        const videoRes = await fetch('/api/fid/upload-nft-video', { method: 'POST', body: videoForm });
        const pngBlob = await (await fetch(cardImageDataUrl)).blob();
        const pngForm = new FormData();
        pngForm.append('image', pngBlob, 'card.png');
        const [videoResult, pngResult] = await Promise.all([
          videoRes.json(),
          fetch('/api/fid/upload-nft-image', { method: 'POST', body: pngForm }).then(r => r.json()),
        ]);
        await updateCardImages({ fid: cardData.fid, imageUrl: videoResult.ipfsUrl, cardImageUrl: pngResult.ipfsUrl });
        fetch('/api/fid/opensea/refresh-metadata', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fid: cardData.fid }),
        }).catch(() => {});
      } catch { /* silent */ }
    })();
  };

  const canUpgrade = () => {
    if (!card || !scoreData) return false;
    const rarityOrder = ['Common', 'Rare', 'Epic', 'Legendary', 'Mythic'];
    return rarityOrder.indexOf(scoreData.rarity) > rarityOrder.indexOf(card.rarity);
  };

  const canSync = () => {
    if (!card || !scoreData) return false;
    if (typeof window !== 'undefined' && sessionStorage.getItem(`score_synced_${fid}`)) return false;
    return !canUpgrade() && scoreData.score !== card.neynarScore;
  };

  const handleSync = async () => {
    if (!card || !scoreData) return;
    setIsUpgrading(true);
    try {
      await refreshCardScore({ fid: card.fid, newNeynarScore: scoreData.score });
      sessionStorage.setItem(`score_synced_${fid}`, '1');
      setUpgradeSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Sync failed');
      setTimeout(() => setError(null), 3000);
    } finally {
      setIsUpgrading(false);
    }
  };

  const handleUpgrade = async () => {
    if (!card || !scoreData || !canUpgrade()) return;
    // Show animation first
    setShowUpgradeAnim(true);
    setUpgradeAnimPhase('charging');
    setTimeout(() => setUpgradeAnimPhase('burst'), 900);
    setTimeout(() => setUpgradeAnimPhase('reveal'), 1600);
    // Do the upgrade in background during animation
    setIsUpgrading(true);
    try {
      await upgradeCardRarity({ fid: card.fid, newNeynarScore: scoreData.score, newRarity: scoreData.rarity });
      regenerateCardFull({ ...card, rarity: scoreData.rarity, power: calcPower(scoreData.rarity, card.wear, card.foil), neynarScore: scoreData.score }, scoreData.score);
      setTimeout(() => {
        setShowUpgradeAnim(false);
        setUpgradeSuccess(true);
      }, 2800);
    } catch (err: any) {
      setShowUpgradeAnim(false);
      setError(err.message || 'Upgrade failed');
      setTimeout(() => setError(null), 3000);
    } finally {
      setIsUpgrading(false);
    }
  };

  useEffect(() => {
    if (!card) return;
    const generate = async () => {
      const createdAt = await Promise.race([
        getFarcasterAccountCreationDate(card.fid),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000)),
      ]);
      const story = generateCriminalBackstory({
        username: card.username, displayName: card.displayName, bio: card.bio || '',
        fid: card.fid, followerCount: card.followerCount, createdAt,
        power: card.power, bounty: card.power * 10, rarity: card.rarity,
      }, 'en');
      setBackstory(story);
    };
    generate();
  }, [card?.fid]);

  const handleRefreshMetadata = async () => {
    setIsRefreshingMetadata(true);
    setMetadataRefreshed(false);
    try {
      await fetch('/api/fid/opensea/refresh-metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fid }),
      });
      setMetadataRefreshed(true);
      setTimeout(() => setMetadataRefreshed(false), 5000);
    } catch (e) { console.error('Refresh failed:', e); }
    setIsRefreshingMetadata(false);
  };

  const handleCheckScore = async () => {
    setLoading(true);
    setError(null);
    try {
      const user = await getUserByFid(fid);
      if (!user) { setError(`No user found for FID ${fid}`); return; }
      const score = user.experimental.neynar_user_score;
      const rarity = calculateRarityFromScore(score);
      await saveScoreCheck({ fid: user.fid, username: user.username, score, rarity });
      setScoreData({ score, rarity });
      setShowScoreModal(true);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch score');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!card) return;
    setShareLoading(true);
    try {
      const currentScore = scoreData?.score ?? card.neynarScore ?? 0;
      const currentRarity = scoreData?.rarity ?? card.rarity;
      const foilText = card.foil && card.foil !== 'None' ? ` | ${card.foil} Foil` : '';

      // Fetch VibeFID rank
      let vibefidRankText = '';
      try {
        const rankRes = await fetch('https://scintillating-mandrill-101.convex.cloud/api/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: 'farcasterCards:getVibeFIDRank', args: { fid: card.fid }, format: 'json' }),
        });
        if (rankRes.ok) {
          const d = await rankRes.json();
          if (d.value?.rank) vibefidRankText = `🏆 VibeFID Rank: #${d.value.rank} / ${d.value.totalCards}`;
        }
      } catch { /* non-critical */ }

      // Fetch global OpenRank
      let globalRankText = '';
      try {
        const orRes = await fetch('/api/fid/openrank', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fid: card.fid }),
        });
        if (orRes.ok) {
          const d = await orRes.json();
          if (d.rank) globalRankText = `🌍 Global Rank: #${d.rank.toLocaleString()}`;
        }
      } catch { /* non-critical */ }

      if (!globalRankText) {
        if (currentScore >= 0.99) globalRankText = '🌍 Global: Top 200';
        else if (currentScore >= 0.95) globalRankText = '🌍 Global: Top 1k';
        else if (currentScore >= 0.85) globalRankText = '🌍 Global: Top 5k';
        else globalRankText = '🌍 Global: Top 25k';
      }

      const scoreDiff = currentScore - (card.neynarScore ?? currentScore);
      const diffSign = scoreDiff >= 0 ? '+' : '';
      const rankingSection = [vibefidRankText, globalRankText].filter(Boolean).join('\n');

      const castText = `My VibeFID Card 🎴\n\n${currentRarity}${foilText}\n⚡ ${power.toLocaleString()} Power\n📊 Score: ${currentScore.toFixed(3)} (${diffSign}${scoreDiff.toFixed(4)})\n\n${rankingSection}\n\nFID #${card.fid}\n\nMint yours at @jvhbo`;
      const shareUrl = `https://vibemostwanted.xyz/share/score/${card.fid}?lang=en&v=${Date.now()}`;
      await shareToFarcaster(castText, shareUrl);
    } catch (err: any) {
      setError(err.message || 'Failed to share');
      setTimeout(() => setError(null), 3000);
    } finally {
      setShareLoading(false);
    }
  };

  if (mobilePanel === 'mail') {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6" style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }} onClick={onClose}>
        <div
          className="w-full max-w-sm rounded-xl border border-vintage-gold/40 overflow-hidden relative flex flex-col"
          style={{ background: 'rgba(17,24,39,0.92)', backdropFilter: 'blur(12px)', maxHeight: '82vh' }}
          onClick={e => e.stopPropagation()}
        >
          {/* Mail header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-vintage-gold/30 flex-shrink-0 gap-2">
            <button
              onClick={() => setMobilePanel('card')}
              className="flex items-center gap-1 px-2 py-1 text-xs font-bold text-black bg-vintage-gold hover:bg-yellow-400 border border-yellow-600 rounded transition-all flex-shrink-0"
            >← Card</button>
            <LanguageSelect />
            <button
              onClick={onClose}
              className="w-7 h-7 bg-red-700 text-white font-bold text-xs border border-red-500 rounded flex items-center justify-center hover:bg-red-600 transition-colors flex-shrink-0"
            >✕</button>
          </div>
          <div className="flex-1 overflow-hidden flex flex-col min-h-0">
            <VibeMailInbox cardFid={fid} username={card?.username || username} onClose={onClose} inline={true} hideClose={true} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Card mode: overlay + centered popup */}
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6" style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }} onClick={onClose}>
        <div
          className="w-full max-w-sm rounded-xl border border-vintage-gold/40 overflow-hidden relative"
          style={{ background: 'rgba(15,15,15,0.97)', backdropFilter: 'blur(12px)' }}
          onClick={e => e.stopPropagation()}
        >
      <div className="w-full h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-vintage-gold/30 flex-shrink-0">
          <span className="text-vintage-gold font-bold text-sm uppercase tracking-wider">VibeFID</span>
          <button
            onClick={onClose}
            className="w-7 h-7 bg-red-700 text-white font-bold text-xs border border-red-500 rounded flex items-center justify-center flex-shrink-0 hover:bg-red-600 transition-colors"
          >✕</button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto">
          {/* Card panel */}
          <div className="w-full p-4 flex justify-center">
            {fidCards === undefined ? (
              <div className="bg-vintage-charcoal rounded-xl border border-vintage-gold/50 p-6 w-full max-w-sm">
                <div className="flex items-center gap-2 text-vintage-gold/60 text-sm">
                  <span className="animate-spin">⟳</span> Loading VibeFID card...
                </div>
              </div>
            ) : !card ? (
              <div className="bg-vintage-charcoal rounded-xl border border-vintage-gold/50 p-6 text-center w-full max-w-sm">
                <p className="text-vintage-gold font-bold text-base mb-1">No VibeFID Card</p>
                <p className="text-vintage-ice/60 text-sm mb-4">This player hasn&apos;t minted their VibeFID card yet.</p>
                <button
                  onClick={() => { onClose(); router.push('/fid'); }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-vintage-gold text-black font-bold border-2 border-black shadow-[3px_3px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all text-sm"
                >
                  Mint Now
                </button>
              </div>
            ) : (
              <div className="flex gap-4 items-start w-full max-w-sm">
                {/* Left: Card image with rarity border + corner buttons */}
                <div className="relative w-36 flex-shrink-0 flex flex-col pt-3 pb-3">
                  {/* Lore button - top left */}
                  {backstory && (
                    <button
                      onClick={() => setShowBackstoryModal(true)}
                      className="absolute -top-2 -left-2 z-20 w-7 h-7 rounded-full flex items-center justify-center transition-all"
                      style={{ background: '#7C3AED', border: '2px solid #000', boxShadow: '2px 2px 0px #000', color: '#fff' }}
                      title="View Lore"
                    >
                      <span className="text-[10px] font-bold">L</span>
                    </button>
                  )}
                  {/* Refresh metadata - top right */}
                  <button
                    onClick={handleRefreshMetadata}
                    disabled={isRefreshingMetadata}
                    className="absolute -top-2 -right-2 z-20 w-7 h-7 rounded-full flex items-center justify-center transition-all disabled:opacity-50"
                    style={metadataRefreshed
                      ? { background: '#16A34A', border: '2px solid #000', boxShadow: '2px 2px 0px #000', color: '#fff' }
                      : { background: '#0891B2', border: '2px solid #000', boxShadow: '2px 2px 0px #000', color: '#fff' }}
                    title="Refresh OpenSea Metadata"
                  >
                    {isRefreshingMetadata ? <span className="animate-spin text-[10px]">⟳</span>
                      : metadataRefreshed ? <span className="text-[10px]">✓</span>
                      : <span className="text-[10px]">⟳</span>}
                  </button>
                  {/* Traits button - bottom left */}
                  <div className="absolute -bottom-2 -left-2 z-20">
                    <button
                      onClick={() => setShowTraitsPopup(v => !v)}
                      className="w-7 h-7 rounded-full flex items-center justify-center transition-all"
                      style={{ background: '#059669', border: '2px solid #000', boxShadow: '2px 2px 0px #000', color: '#fff' }}
                      title="Card Traits"
                    >
                      <span className="text-[10px] font-bold">T</span>
                    </button>
                    {showTraitsPopup && (
                      <div className="absolute bottom-9 left-0 z-30 bg-[#1E1E1E] border-2 border-black shadow-[4px_4px_0px_#000] rounded-sm p-3 min-w-[140px] text-xs">
                        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-[#444]">
                          <span className={`font-black text-base ${card.color === 'red' ? 'text-red-500' : 'text-white'}`}>{card.rank}{card.suitSymbol}</span>
                          <span className="text-vintage-ice font-bold">{card.rarity}</span>
                        </div>
                        {card.foil && card.foil !== 'None' && (
                          <div className="flex justify-between mb-1.5">
                            <span className="text-gray-400">Foil</span>
                            <span className={`font-bold ${card.foil === 'Prize' ? 'text-purple-400' : 'text-blue-400'}`}>{card.foil}</span>
                          </div>
                        )}
                        <div className="flex justify-between mb-1.5">
                          <span className="text-gray-400">Power</span>
                          <span className="text-[#FFD700] font-black">⚡ {power}</span>
                        </div>
                        <div className="flex justify-between mb-1.5">
                          <span className="text-gray-400">Neynar</span>
                          <span className="text-white font-bold">{card.neynarScore?.toFixed(3)}</span>
                        </div>
                        {card.wear && (
                          <div className="flex justify-between">
                            <span className="text-gray-400">Wear</span>
                            <span className="text-white font-bold">{card.wear}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div
                    className="w-full aspect-[2/3] rounded-lg overflow-hidden"
                    style={{
                      border: `2px solid ${RARITY_BORDER[card.rarity] || '#eab308'}`,
                      boxShadow: `0 0 14px ${RARITY_GLOW[card.rarity] || 'rgba(234,179,8,0.3)'}`,
                    }}
                  >
                    <FoilCardEffect
                      foilType={card.foil === 'None' ? null : (card.foil as 'Standard' | 'Prize' | null)}
                      className="w-full h-full"
                    >
                      <CardMedia src={card.cardImageUrl || card.imageUrl || card.pfpUrl} alt={card.username} className="w-full h-full object-cover" />
                    </FoilCardEffect>
                  </div>
                  {/* VibeMail button - bottom right (own card only) */}
                  {isOwnCard && <button
                    onClick={() => setMobilePanel('mail')}
                    className="absolute -bottom-2 -right-2 z-20 w-7 h-7 rounded-xl flex items-center justify-center transition-all"
                    style={{ background: '#BE185D', border: '2px solid #000', boxShadow: '2px 2px 0px #000', color: '#fff' }}
                    title="VibeMail inbox"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                    </svg>
                  </button>}
                </div>
                {/* Right: Info */}
                <div className="flex-1 flex flex-col gap-2 min-w-0">
                  <div>
                    <p className="text-vintage-ice/70 text-xs">
                      {card.rarity}{card.foil && card.foil !== 'None' ? ` • ${card.foil} ${t.foil}` : ''}
                    </p>
                    <p className="text-[#FFD700] text-xs font-bold mt-0.5">⚡ {power.toLocaleString()} {t.power}</p>
                  </div>

                  {/* Neynar score box — shows live score if checked */}
                  <div className="bg-vintage-black/40 rounded border border-vintage-gold/20 px-2 py-1.5">
                    <p className="text-vintage-burnt-gold text-[10px] uppercase tracking-wide">Neynar Score</p>
                    <p className="text-vintage-gold font-bold text-base leading-tight">
                      {scoreData ? scoreData.score.toFixed(3) : card.neynarScore?.toFixed(3)}
                    </p>
                    {scoreData && scoreData.rarity !== card.rarity && (
                      <p className="text-green-400 text-[10px]">{card.rarity} → {scoreData.rarity}</p>
                    )}
                  </div>

                  {error && <p className="text-red-400 text-[10px]">{error}</p>}

                  <p className="text-vintage-ice/30 text-[10px]">FID #{card.fid}</p>

                  {/* Action buttons */}
                  <div className="flex flex-col gap-1.5">
                    <button
                      onClick={handleCheckScore}
                      disabled={loading}
                      className="px-2 py-1.5 bg-[#0891B2] border border-cyan-500/50 text-white font-bold rounded hover:bg-[#0e7490] transition-colors disabled:opacity-50"
                      style={{ fontSize: 'clamp(9px, 2.5vw, 12px)' }}
                    >
                      {loading ? '...' : t.score}
                    </button>
                    <button
                      onClick={handleShare}
                      disabled={shareLoading}
                      className="px-2 py-1.5 bg-[#7c3aed] border border-purple-500/50 text-white font-bold rounded hover:bg-[#6d28d9] transition-colors disabled:opacity-50"
                      style={{ fontSize: 'clamp(9px, 2.5vw, 12px)' }}
                    >
                      {shareLoading ? '...' : t.share}
                    </button>
                    <button
                      onClick={() => {
                        const chainSlug = (card as any).chain === 'arbitrum' ? 'arbitrum' : 'base';
                        const contract = (card as any).contractAddress || '0x60274A138d026E3cB337B40567100FdEC3127565';
                        const url = `https://opensea.io/assets/${chainSlug}/${contract}/${card.fid}`;
                        try { sdk.actions.openUrl(url); } catch { window.open(url, '_blank'); }
                      }}
                      className="px-2 py-1.5 bg-[#BE185D] border border-pink-400/50 text-white font-bold rounded hover:bg-[#9d174d] transition-colors"
                      style={{ fontSize: 'clamp(9px, 2.5vw, 12px)' }}
                    >
                      OpenSea
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Upgrade Animation Overlay */}
          {showUpgradeAnim && scoreData && card && (
            <div className="absolute inset-0 z-40 rounded-xl overflow-hidden flex flex-col items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.92)' }}>
              {/* Glow rings */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="rounded-full" style={{
                  width: upgradeAnimPhase === 'charging' ? 60 : upgradeAnimPhase === 'burst' ? 260 : 180,
                  height: upgradeAnimPhase === 'charging' ? 60 : upgradeAnimPhase === 'burst' ? 260 : 180,
                  background: upgradeAnimPhase === 'burst' ? 'radial-gradient(circle, rgba(255,215,0,0.35) 0%, transparent 70%)' : 'radial-gradient(circle, rgba(255,215,0,0.15) 0%, transparent 70%)',
                  transition: 'all 0.7s ease-out',
                  boxShadow: upgradeAnimPhase !== 'charging' ? '0 0 60px 20px rgba(255,215,0,0.3)' : '0 0 20px 5px rgba(255,215,0,0.15)',
                }}/>
              </div>
              {upgradeAnimPhase === 'charging' && (
                <div className="flex flex-col items-center gap-3 z-10">
                  <div className="w-12 h-12 rounded-full border-4 border-yellow-400 border-t-transparent animate-spin"/>
                  <p className="text-yellow-400 font-bold text-sm tracking-widest uppercase">Upgrading...</p>
                </div>
              )}
              {upgradeAnimPhase === 'burst' && (
                <div className="flex flex-col items-center gap-2 z-10" style={{ animation: 'none' }}>
                  <div className="text-5xl" style={{ animation: 'none', filter: 'drop-shadow(0 0 20px gold)' }}>⚡</div>
                  <p className="text-yellow-300 font-bold text-lg tracking-widest uppercase" style={{ textShadow: '0 0 20px gold' }}>UPGRADING!</p>
                </div>
              )}
              {upgradeAnimPhase === 'reveal' && (
                <div className="flex flex-col items-center gap-3 z-10">
                  <div className="text-4xl" style={{ filter: 'drop-shadow(0 0 15px gold)' }}>★</div>
                  <p className="text-yellow-400 font-bold text-xs uppercase tracking-widest">{card.rarity}</p>
                  <p className="text-white font-bold text-2xl" style={{ textShadow: '0 0 20px gold' }}>→ {scoreData.rarity}</p>
                  <p className="text-green-400 font-bold text-sm">Card Upgraded!</p>
                </div>
              )}
            </div>
          )}

          {/* Score Modal — rendered via portal to escape parent clipping */}
          {showScoreModal && scoreData && card && typeof document !== 'undefined' && createPortal(
            <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4" onClick={() => { setShowScoreModal(false); setUpgradeSuccess(false); }}>
            <div className="w-full max-w-sm rounded-xl border border-vintage-gold/40 flex flex-col p-3 gap-2 overflow-y-auto" style={{ maxHeight: '85vh', background: '#0a0a0a' }} onClick={e => e.stopPropagation()}>
              {/* Header */}
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold text-vintage-gold uppercase tracking-wide">Neynar Score</h2>
                <button onClick={() => { setShowScoreModal(false); setUpgradeSuccess(false); }} className="w-7 h-7 bg-red-700 text-white font-bold text-xs border border-red-500 rounded flex items-center justify-center hover:bg-red-600 transition-colors">✕</button>
              </div>
              {/* Score */}
              <div className="bg-vintage-black/50 rounded border border-vintage-gold/30 px-3 py-1.5 flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-vintage-gold leading-none">{scoreData.score.toFixed(3)}</div>
                  <p className={`text-[10px] font-bold ${scoreData.score > card.neynarScore ? 'text-green-400' : scoreData.score < card.neynarScore ? 'text-red-400' : 'text-vintage-ice/50'}`}>
                    {scoreData.score > card.neynarScore ? '+' : ''}{(scoreData.score - card.neynarScore).toFixed(4)} from mint
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-vintage-burnt-gold text-[9px]">Rarity</p>
                  <p className="text-vintage-ice font-bold text-xs">{scoreData.rarity}</p>
                </div>
              </div>
              {/* Upgrade / success */}
              {upgradeSuccess ? (
                <div className="bg-green-900/40 border border-green-500/50 rounded px-2 py-1.5 text-center text-[10px] text-green-400 font-bold">
                  {canUpgrade() ? `★ Card upgraded to ${scoreData.rarity}!` : '✓ Score synced!'}
                </div>
              ) : isOwnCard && canUpgrade() && (
                <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-400/60 rounded px-2 py-1.5 text-center text-[10px]">
                  <span className="text-vintage-burnt-gold">{card.rarity}</span>
                  <span className="text-yellow-400 font-bold mx-1">→</span>
                  <span className="text-yellow-300 font-bold">{scoreData.rarity}</span>
                  <span className="text-yellow-400 font-bold ml-1">eligible!</span>
                </div>
              )}
              {/* Score history — sparkline chart */}
              {scoreHistory?.history && scoreHistory.history.length > 1 && (() => {
                const pts = [...scoreHistory.history].reverse().slice(0, 12);
                const scores = pts.map((e: any) => e.score);
                const min = Math.min(...scores) - 0.005;
                const max = Math.max(...scores) + 0.005;
                const W = 260, H = 52;
                const x = (i: number) => (i / (pts.length - 1)) * W;
                const y = (s: number) => H - ((s - min) / (max - min)) * H;
                const path = pts.map((e: any, i: number) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(e.score).toFixed(1)}`).join(' ');
                const last = pts[pts.length - 1];
                const first = pts[0];
                const trend = last.score >= first.score;
                return (
                  <div className="bg-vintage-black/30 rounded border border-vintage-gold/20 px-2 py-1.5 flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <p className="text-vintage-burnt-gold text-[9px] font-bold">History ({scoreHistory.totalChecks} checks)</p>
                      <span className={`text-[9px] font-bold ${trend ? 'text-green-400' : 'text-red-400'}`}>
                        {trend ? '▲' : '▼'} {Math.abs(last.score - first.score).toFixed(3)}
                      </span>
                    </div>
                    <svg width="100%" height="72" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
                      {/* Grid lines */}
                      <line x1="0" y1={H/2} x2={W} y2={H/2} stroke="rgba(234,179,8,0.1)" strokeWidth="1" strokeDasharray="4,4"/>
                      {/* Area fill */}
                      <path d={`${path} L${x(pts.length-1).toFixed(1)},${H} L0,${H} Z`} fill={trend ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)'}/>
                      {/* Line */}
                      <path d={path} fill="none" stroke={trend ? '#22c55e' : '#ef4444'} strokeWidth="1.5" strokeLinejoin="round"/>
                      {/* Dots */}
                      {pts.map((e: any, i: number) => (
                        <circle key={i} cx={x(i)} cy={y(e.score)} r="2" fill={trend ? '#22c55e' : '#ef4444'}/>
                      ))}
                    </svg>
                    <div className="flex justify-between text-[8px] text-vintage-ice/30 mt-0.5 mb-1.5">
                      <span>{new Date(first.checkedAt).toLocaleDateString()}</span>
                      <span>{new Date(last.checkedAt).toLocaleDateString()}</span>
                    </div>
                    {/* Text history */}
                    <div className="space-y-0.5">
                      {scoreHistory.history.slice(0, 3).map((entry: any, i: number) => {
                        const prev = scoreHistory.history[i + 1]?.score ?? null;
                        const diff = prev !== null ? entry.score - prev : 0;
                        return (
                          <div key={i} className="flex justify-between items-center text-[9px] py-0.5 border-b border-vintage-gold/10 last:border-0">
                            <span className="text-vintage-ice/40">{new Date(entry.checkedAt).toLocaleDateString()}</span>
                            <span className="text-vintage-ice font-bold">{entry.score.toFixed(3)}</span>
                            {prev !== null && diff !== 0 ? (
                              <span className={`w-14 text-right ${diff > 0 ? 'text-green-400' : 'text-red-400'}`}>{diff > 0 ? '+' : ''}{diff.toFixed(4)}</span>
                            ) : <span className="w-14"/>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
              {/* Actions */}
              {isOwnCard && canUpgrade() && !upgradeSuccess && (
                <button onClick={handleUpgrade} disabled={isUpgrading}
                  className="w-full py-2 text-black font-bold rounded text-xs disabled:opacity-50 uppercase tracking-widest"
                  style={{ background: 'linear-gradient(135deg, #FFD700, #FF8C00)', boxShadow: '0 0 16px rgba(255,215,0,0.5)', border: '2px solid rgba(255,215,0,0.8)', letterSpacing: '0.1em' }}>
                  {isUpgrading ? '...' : `⚡ UPGRADE CARD`}
                </button>
              )}
              {isOwnCard && canSync() && !upgradeSuccess && (
                <button onClick={handleSync} disabled={isUpgrading}
                  className="vmt-sync w-full py-2 font-bold rounded text-xs disabled:opacity-50 uppercase tracking-widest border transition-colors"
                  style={{ letterSpacing: '0.1em', color: '#FFD700', background: 'rgba(17,17,17,0.8)', borderColor: 'rgba(255,215,0,0.4)' }}>
                  {isUpgrading ? '...' : `↻ SYNC SCORE`}
                </button>
              )}
            </div>
            </div>,
            document.body
          )}

          {/* Lore modal — z-30, compact inline render */}
          {showBackstoryModal && backstory && card && (
            <div className="absolute inset-0 bg-black/92 backdrop-blur-sm flex flex-col z-30 rounded-xl p-3 gap-2">
              {/* Header */}
              <div className="flex items-center justify-between flex-shrink-0">
                <div>
                  <p className="text-[9px] text-vintage-burnt-gold uppercase tracking-widest font-bold">Criminal Record</p>
                  <p className="text-vintage-gold font-bold text-xs leading-tight truncate">{card.displayName}</p>
                </div>
                <button onClick={() => setShowBackstoryModal(false)} className="w-7 h-7 bg-red-700 text-white font-bold text-xs border border-red-500 rounded flex items-center justify-center hover:bg-red-600 transition-colors flex-shrink-0">✕</button>
              </div>
              {/* 2-col grid */}
              <div className="grid grid-cols-2 gap-x-3 gap-y-2 flex-shrink-0">
                {[
                  { label: 'Wanted For', value: backstory.wantedFor },
                  { label: 'Danger', value: backstory.dangerLevel },
                  { label: 'Date', value: backstory.dateOfCrime },
                  { label: 'Last Seen', value: backstory.lastSeen },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-[8px] text-vintage-burnt-gold uppercase tracking-wide mb-0.5">{label}</p>
                    <p className="text-[10px] text-vintage-ice font-semibold leading-tight">{value}</p>
                  </div>
                ))}
              </div>
              {/* Associates */}
              <div className="flex-shrink-0">
                <p className="text-[8px] text-vintage-burnt-gold uppercase tracking-wide mb-0.5">Known Associates</p>
                <p className="text-[10px] text-vintage-ice leading-tight line-clamp-2">{backstory.associates}</p>
              </div>
              {/* Story */}
              <div className="flex-1 bg-vintage-black/40 rounded border border-vintage-gold/20 px-2 py-1.5 overflow-y-auto">
                <p className="text-[9px] text-vintage-ice/80 leading-relaxed">{backstory.story}</p>
              </div>
              {/* Warning */}
              <p className="text-[8px] text-vintage-burnt-gold text-center font-bold uppercase tracking-wider flex-shrink-0">⚠ Approach with extreme caution ⚠</p>
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
    </>
  );
}

export function VibeFidMailModal(props: VibeFidMailModalProps) {
  return (
    <VibeFIDConvexProvider>
      <ModalInner {...props} />
    </VibeFIDConvexProvider>
  );
}
