"use client";

import React, { useEffect, useState, useCallback, useMemo, memo, useRef } from "react";
import Link from "next/link";
import NextImage from "next/image";
import { useRouter } from "next/navigation";
import { ConvexProfileService, type UserProfile, type MatchHistory } from "../lib/convex-profile"; // ✨ Convex para Profiles
import { ConvexPvPService, type GameRoom } from "../lib/convex-pvp"; // ✨ Convex para PvP Rooms
import { sdk } from "@farcaster/miniapp-sdk";
import { BadgeList } from "@/components/Badge";
import { getUserBadges } from "@/lib/badges";
import { useLanguage } from "@/contexts/LanguageContext";
import { useMusic } from "@/contexts/MusicContext";
import { useAccount, useDisconnect } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useQuery, useMutation, useConvex } from "convex/react";

import { api } from "@/convex/_generated/api";
import FoilCardEffect from "@/components/FoilCardEffect";
import DifficultyModal from "@/components/DifficultyModal";
import { ProgressBar } from "@/components/ProgressBar";
import AchievementsView from "@/components/AchievementsView";
import { ShopView } from "@/components/ShopView";
import { CreateProfileModal } from "@/components/CreateProfileModal";
import { SettingsModal } from "@/components/SettingsModal";
import { InboxDisplay } from "@/components/InboxDisplay";
import { CoinsInboxDisplay } from "@/components/CoinsInboxDisplay";
import { RewardChoiceModal } from "@/components/RewardChoiceModal";
import { PveCardSelectionModal } from "@/components/PveCardSelectionModal";
import { EliminationOrderingModal } from "@/components/EliminationOrderingModal";
import { PvPMenuModals } from "@/components/PvPMenuModals";
import { GamePopups } from "@/components/GamePopups";
import { PvPInRoomModal } from "@/components/PvPInRoomModal";
import { AttackCardSelectionModal } from "@/components/AttackCardSelectionModal";
import { PokerBattleTable } from "@/components/PokerBattleTable";
import { PokerMatchmaking } from "@/components/PokerMatchmaking";
import { HAND_SIZE, getMaxAttacks, JC_CONTRACT_ADDRESS as JC_WALLET_ADDRESS, IS_DEV } from "@/lib/config";
// 🚀 Performance-optimized hooks
import { useTotalPower, useSortedByPower, useStrongestCards } from "@/hooks/useCardCalculations";
// 📝 Development logger (silent in production)
import { devLog, devError, devWarn } from "@/lib/utils/logger";
// 🔊 Audio Manager
import { AudioManager } from "@/lib/audio-manager";
// 🎨 Loading Spinner
import LoadingSpinner from "@/components/LoadingSpinner";

import { filterCardsByCollections, type CollectionId } from "@/lib/collections/index";
const ALCHEMY_API_KEY = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_VIBE_CONTRACT;
const JC_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_JC_CONTRACT || CONTRACT_ADDRESS; // JC can have different contract
const CHAIN = process.env.NEXT_PUBLIC_ALCHEMY_CHAIN;

const imageUrlCache = new Map();
const IMAGE_CACHE_TIME = 1000 * 60 * 60;

const getFromCache = (key: string): string | null => {
  const item = imageUrlCache.get(key);
  if (!item) return null;
  const timeDiff = Date.now() - item.time;
  if (timeDiff > IMAGE_CACHE_TIME) {
    imageUrlCache.delete(key);
    return null;
  }
  return item.url;
};

const setCache = (key: string, value: string): void => {
  imageUrlCache.set(key, { url: value, time: Date.now() });
};

// 🎨 Avatar URL helper - Uses real Twitter profile pic when available, DiceBear as fallback
const getAvatarUrl = (twitterData?: string | null | { twitter?: string; twitterProfileImageUrl?: string }): string | null => {
  // Handle different input types
  if (!twitterData) return null;

  // If it's an object with profile image URL, use that (real Twitter photo)
  if (typeof twitterData === 'object' && twitterData.twitterProfileImageUrl) {
    // IMPORTANT: Only use real Twitter CDN URLs (pbs.twimg.com)
    // Skip unavatar.io URLs as the service is unreliable (frequent 503 errors)
    const profileImageUrl = twitterData.twitterProfileImageUrl;
    if (profileImageUrl.includes('pbs.twimg.com')) {
      // Twitter returns "_normal" size (48x48), replace with "_400x400" for better quality
      return profileImageUrl.replace('_normal', '_400x400');
    }
    // If it's unavatar.io or other unreliable service, fall through to DiceBear
  }

  // Fall back to DiceBear generated avatar
  const twitter = typeof twitterData === 'string' ? twitterData : twitterData?.twitter;
  if (!twitter) return null;
  const username = twitter.replace('@', '');
  return `https://api.dicebear.com/7.x/adventurer/svg?seed=${username}&backgroundColor=1a1414`;
};

const getAvatarFallback = (twitterData?: string | null | { twitter?: string; twitterProfileImageUrl?: string }): string => {
  const twitter = typeof twitterData === 'string' ? twitterData : twitterData?.twitter;
  if (!twitter) return 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%2306b6d4"><circle cx="12" cy="12" r="10"/></svg>';
  const username = twitter.replace('@', '');
  // Secondary fallback: initials-based DiceBear
  return `https://api.dicebear.com/7.x/initials/svg?seed=${username}&backgroundColor=1a1414`;
};

// Tornar AudioManager global para persistir entre páginas

function findAttr(nft: any, trait: string): string {
  const locs = [nft?.raw?.metadata?.attributes, nft?.metadata?.attributes, nft?.metadata?.traits, nft?.raw?.metadata?.traits];
  for (const attrs of locs) {
    if (!Array.isArray(attrs)) continue;
    const found = attrs.find((a: any) => {
      const traitType = String(a?.trait_type || a?.traitType || a?.name || '').toLowerCase().trim();
      const searchTrait = trait.toLowerCase().trim();
      return traitType === searchTrait || traitType.includes(searchTrait);
    });
    if (found) {
      const value = found.value !== undefined ? found.value : found.trait_value;
      if (value !== undefined && value !== null) return String(value).trim();
    }
  }
  return '';
}

function isUnrevealed(nft: any): boolean {
  const hasAttrs = !!(nft?.raw?.metadata?.attributes?.length || nft?.metadata?.attributes?.length || nft?.raw?.metadata?.traits?.length || nft?.metadata?.traits?.length);

  // Se não tem atributos, é não revelada
  if (!hasAttrs) return true;

  const r = (findAttr(nft, 'rarity') || '').toLowerCase();
  const s = (findAttr(nft, 'status') || '').toLowerCase();
  const n = String(nft?.name || '').toLowerCase();

  // Verifica se tem indicadores explícitos de não revelada
  if (r === 'unopened' || s === 'unopened' || n === 'unopened' || n.includes('sealed pack')) {
    return true;
  }

  // Se tem imagem OU tem rarity, considera revelada
  const hasImage = !!(nft?.image?.cachedUrl || nft?.image?.originalUrl || nft?.metadata?.image || nft?.raw?.metadata?.image);
  const hasRarity = r !== '';

  return !(hasImage || hasRarity);
}

function calcPower(nft: any): number {
  const foil = findAttr(nft, 'foil') || 'None';
  const rarity = findAttr(nft, 'rarity') || 'Common';
  const wear = findAttr(nft, 'wear') || 'Lightly Played';

  // Base power by rarity (from tutorial)
  let base = 5;
  const r = rarity.toLowerCase();
  if (r.includes('mythic')) base = 800;
  else if (r.includes('legend')) base = 240;
  else if (r.includes('epic')) base = 80;
  else if (r.includes('rare')) base = 20;
  else if (r.includes('common')) base = 5;
  else base = 5;

  // Wear multiplier (from tutorial: Pristine=×1.8, Mint=×1.4, Others=×1.0)
  let wearMult = 1.0;
  const w = wear.toLowerCase();
  if (w.includes('pristine')) wearMult = 1.8;
  else if (w.includes('mint')) wearMult = 1.4;

  // Foil multiplier (from tutorial: Prize=×15, Standard=×2.5)
  let foilMult = 1.0;
  const f = foil.toLowerCase();
  if (f.includes('prize')) foilMult = 15.0;
  else if (f.includes('standard')) foilMult = 2.5;

  const power = base * wearMult * foilMult;
  return Math.max(1, Math.round(power));
}

function normalizeUrl(url: string): string {
  if (!url) return '';
  let u = url.trim();
  if (u.startsWith('ipfs://')) u = 'https://ipfs.io/ipfs/' + u.slice(7);
  else if (u.startsWith('ipfs/')) u = 'https://ipfs.io/ipfs/' + u.slice(5);
  u = u.replace(/^http:\/\//i, 'https://');
  return u;
}

async function getImage(nft: any): Promise<string> {
  const tid = nft.tokenId;
  const cached = getFromCache(tid);
  if (cached) return cached;

  const extractUrl = (value: any): string | null => {
    if (!value) return null;
    if (typeof value === 'string') return value;
    if (typeof value === 'object') return value.url || value.cachedUrl || value.originalUrl || value.gateway || null;
    return null;
  };

  try {
    const uri = nft?.tokenUri?.gateway || nft?.raw?.tokenUri;
    if (uri) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(uri, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        const json = await res.json();
        const imageFromUri = json?.image || json?.image_url || json?.imageUrl;
        if (imageFromUri) {
          let imageUrl = String(imageFromUri);
          if (imageUrl.includes('wieldcd.net')) {
            const proxyUrl = `https://vibechain.com/api/proxy?url=${encodeURIComponent(imageUrl)}`;
            setCache(tid, proxyUrl);
            return proxyUrl;
          }
          imageUrl = normalizeUrl(imageUrl);
          if (imageUrl && !imageUrl.includes('undefined')) {
            setCache(tid, imageUrl);
            return imageUrl;
          }
        }
      }
    }
  } catch (error) {
    devWarn(`⚠️ Failed to fetch image from tokenUri for NFT #${tid}:`, error);
  }

  let rawImage = extractUrl(nft?.raw?.metadata?.image);
  if (rawImage) {
    if (rawImage.includes('wieldcd.net')) {
      const proxyUrl = `https://vibechain.com/api/proxy?url=${encodeURIComponent(rawImage)}`;
      setCache(tid, proxyUrl);
      return proxyUrl;
    }
    rawImage = normalizeUrl(rawImage);
    if (rawImage && !rawImage.includes('undefined')) {
      setCache(tid, rawImage);
      return rawImage;
    }
  }

  const alchemyUrls = [
    extractUrl(nft?.image?.cachedUrl),
    extractUrl(nft?.image?.thumbnailUrl),
    extractUrl(nft?.image?.pngUrl),
    extractUrl(nft?.image?.originalUrl),
  ].filter(Boolean);

  for (const url of alchemyUrls) {
    if (url) {
      if (url.includes('wieldcd.net')) {
        const proxyUrl = `https://vibechain.com/api/proxy?url=${encodeURIComponent(url)}`;
        setCache(tid, proxyUrl);
        return proxyUrl;
      }
      const norm = normalizeUrl(String(url));
      if (norm && !norm.includes("undefined")) {
        setCache(tid, norm);
        return norm;
      }
    }
  }

  const placeholder = `https://via.placeholder.com/300x420/6366f1/ffffff?text=NFT+%23${tid}`;
  setCache(tid, placeholder);
  return placeholder;
}

async function fetchNFTs(owner: string, contractAddress?: string, onProgress?: (page: number, cards: number) => void): Promise<any[]> {
  if (!ALCHEMY_API_KEY) throw new Error("API Key não configurada");
  if (!CHAIN) throw new Error("Chain não configurada");
  const contract = contractAddress || CONTRACT_ADDRESS;
  if (!contract) throw new Error("Contract address não configurado");

  let allNfts: any[] = [];
  let pageKey: string | undefined = undefined;
  let pageCount = 0;
  const maxPages = 20; // Reduced from 70 - most users have < 2000 NFTs

  do {
    pageCount++;
    const url: string = `https://${CHAIN}.g.alchemy.com/nft/v3/${ALCHEMY_API_KEY}/getNFTsForOwner?owner=${owner}&contractAddresses[]=${contract}&withMetadata=true&pageSize=100${pageKey ? `&pageKey=${pageKey}` : ''}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`API falhou: ${res.status}`);
    const json = await res.json();

    // Don't filter here - some NFTs don't have attributes cached in Alchemy
    // Filter after metadata refresh instead (like profile page does)
    const pageNfts = json.ownedNfts || [];
    allNfts = allNfts.concat(pageNfts);

    // Report progress
    if (onProgress) {
      onProgress(pageCount, allNfts.length);
    }

    pageKey = json.pageKey;
  } while (pageKey && pageCount < maxPages);

  return allNfts;
}

const NFTCard = memo(({ nft, selected, onSelect }: { nft: any; selected: boolean; onSelect: (nft: any) => void }) => {
  const tid = nft.tokenId;
  const [imgError, setImgError] = useState(0);

  const getRarityColor = (rarity: string) => {
    const r = (rarity || '').toLowerCase();
    if (r.includes('legend')) return 'from-orange-500 to-yellow-400';
    if (r.includes('epic')) return 'from-purple-500 to-pink-500';
    if (r.includes('rare')) return 'from-blue-500 to-cyan-400';
    return 'from-gray-600 to-gray-500';
  };

  const getRarityRing = (rarity: string) => {
    const r = (rarity || '').toLowerCase();
    if (r.includes('legend')) return 'ring-vintage-gold shadow-gold-lg';
    if (r.includes('epic')) return 'ring-vintage-silver shadow-neon';
    if (r.includes('rare')) return 'ring-vintage-burnt-gold shadow-gold';
    return 'ring-vintage-charcoal shadow-lg';
  };

  const fallbacks = useMemo(() => {
    const allUrls = [];
    if (nft.imageUrl) allUrls.push(nft.imageUrl);
    if (nft?.raw?.metadata?.image) allUrls.push(String(nft.raw.metadata.image));
    [nft?.image?.cachedUrl, nft?.image?.thumbnailUrl, nft?.image?.pngUrl, nft?.image?.originalUrl].forEach((url) => {
      if (url) allUrls.push(String(url));
    });
    if (nft?.metadata?.image) allUrls.push(String(nft.metadata.image));
    allUrls.push(`https://via.placeholder.com/300x420/6366f1/ffffff?text=NFT+%23${tid}`);
    // Allow both absolute URLs (http/https) and relative paths (for FREE cards)
    return [...new Set(allUrls)].filter(url => url && !url.includes('undefined') && (url.startsWith('http') || url.startsWith('/')));
  }, [nft, tid]);

  const currentSrc = fallbacks[imgError] || fallbacks[fallbacks.length - 1];
  const foilValue = (nft.foil || '').trim();

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onSelect(nft);
  }, [nft, onSelect]);

  return (
    <>
      <style>{`
        @keyframes holographic {
          0% {
            background-position: 0% 50%;
            filter: hue-rotate(0deg) brightness(1.2) saturate(1.5);
          }
          25% {
            background-position: 50% 100%;
            filter: hue-rotate(90deg) brightness(1.3) saturate(1.6);
          }
          50% {
            background-position: 100% 50%;
            filter: hue-rotate(180deg) brightness(1.4) saturate(1.7);
          }
          75% {
            background-position: 50% 0%;
            filter: hue-rotate(270deg) brightness(1.3) saturate(1.6);
          }
          100% {
            background-position: 0% 50%;
            filter: hue-rotate(360deg) brightness(1.2) saturate(1.5);
          }
        }

        @keyframes prizePulse {
          0%, 100% { opacity: 0.95; }
          50% { opacity: 1; }
        }

        @keyframes prizeGlow {
          0%, 100% { box-shadow: 0 0 20px rgba(255, 215, 0, 0.6), 0 0 40px rgba(255, 140, 0, 0.4), 0 0 60px rgba(255, 0, 255, 0.3); }
          50% { box-shadow: 0 0 30px rgba(255, 215, 0, 0.8), 0 0 60px rgba(255, 140, 0, 0.6), 0 0 90px rgba(255, 0, 255, 0.5); }
        }


        @keyframes cardReflection {
          0% {
            transform: translateX(-200%) translateY(-200%) rotate(45deg);
            opacity: 0;
          }
          50% {
            opacity: 0.3;
          }
          100% {
            transform: translateX(200%) translateY(200%) rotate(45deg);
            opacity: 0;
          }
        }

        @keyframes rainbowShine {
          0% {
            background-position: -200% center;
          }
          100% {
            background-position: 200% center;
          }
        }

        @keyframes shake {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-3deg); }
          75% { transform: rotate(3deg); }
        }

        @keyframes rainbowShine {
          0% {
            background-position: -200% center;
          }
          100% {
            background-position: 200% center;
          }
        }

        .prize-card-ring {
          animation: prizeGlow 2s ease-in-out infinite;
        }
      `}</style>
      
      <div className={`relative group transition-all duration-300 ${selected ? 'scale-95' : 'hover:scale-105'} cursor-pointer`} onClick={handleClick} style={{filter: 'drop-shadow(0 8px 16px rgba(0, 0, 0, 0.6))'}}>
        {/* Ring wrapper OUTSIDE overflow-hidden */}
        <div className={`rounded-lg ${
          selected ? `ring-4 ${getRarityRing(nft.rarity || '')} shadow-xl` :
          'ring-2 ring-vintage-deep-black/50 hover:ring-vintage-gold/50'
        }`}>
          <FoilCardEffect
            foilType={(foilValue === 'Standard' || foilValue === 'Prize') ? foilValue as 'Standard' | 'Prize' : null}
            className="relative rounded-lg"
          >
            <div style={{boxShadow: 'inset 0 0 10px rgba(255, 215, 0, 0.1)'}} className="rounded-lg overflow-hidden">
            <img src={currentSrc} alt={`#${tid}`} className="w-full aspect-[2/3] object-cover bg-vintage-deep-black pointer-events-none" loading="lazy" onError={() => { if (imgError < fallbacks.length - 1) setImgError(imgError + 1); }} />

            <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/95 to-transparent p-3 pointer-events-none z-20">
              <div className="flex items-center justify-between">
                <span className={`font-bold text-xl drop-shadow-lg bg-gradient-to-r ${getRarityColor(nft.rarity || '')} bg-clip-text text-transparent`}>{nft.power || 0} PWR</span>
                {selected && (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="drop-shadow-lg">
                    <path d="M20 6L9 17L4 12" stroke="#D4AF37" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 via-black/80 to-transparent p-3 pointer-events-none z-20">
              {nft.rarity && (
                <div className="text-xs font-bold uppercase tracking-wider text-white drop-shadow-lg">
                  {nft.rarity}
                </div>
              )}
              {nft.wear && (
                <div className="text-xs text-yellow-300 font-semibold drop-shadow-lg">
                  {nft.wear}
                </div>
              )}
            </div>
          </div>
          </FoilCardEffect>
        </div>
      </div>
    </>
  );
});

// Match History Section Component
const MatchHistorySection = memo(({ address }: { address: string }) => {
  const { t } = useLanguage();

  // 🚀 OPTIMIZED: Use summary query (95% bandwidth reduction)
  const matchHistory = useQuery(
    api.matches.getMatchHistorySummary,
    address ? { address: address.toLowerCase(), limit: 20 } : "skip"
  );

  if (!matchHistory || matchHistory.length === 0) {
    return (
      <div className="bg-vintage-charcoal/50 backdrop-blur-lg rounded-2xl border-2 border-vintage-gold/30 p-6">
        <h2 className="text-2xl font-display font-bold mb-4 flex items-center gap-2 text-vintage-gold">
          <NextImage src="/images/icons/battle.svg" alt="Battle" width={32} height={32} /> {t('matchHistory')}
        </h2>
        <div className="bg-vintage-black/50 border border-vintage-gold/20 rounded-xl p-8 text-center">
          <p className="text-vintage-burnt-gold">{t('noMatches')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-vintage-charcoal/50 backdrop-blur-lg rounded-2xl border-2 border-vintage-gold/30 p-6">
      <h2 className="text-2xl font-display font-bold mb-4 flex items-center gap-2 text-vintage-gold">
        <NextImage src="/images/icons/battle.svg" alt="Battle" width={32} height={32} /> {t('matchHistory')}
      </h2>
      <div className="space-y-3">
        {matchHistory.map((match: any, index: number) => {
          const isWin = match.result === 'win';
          const isTie = match.result === 'tie';
          const borderColor = isWin ? 'border-green-500/50' : isTie ? 'border-yellow-500/50' : 'border-red-500/50';
          const resultColor = isWin ? 'text-green-400' : isTie ? 'text-yellow-400' : 'text-red-400';
          const resultIcon = isWin ? '/images/icons/victory.svg' : isTie ? '/images/icons/cards.svg' : '/images/icons/defeat.svg';
          const resultText = isWin ? t('victory').toUpperCase() : isTie ? t('tie').toUpperCase() : t('defeat').toUpperCase();

          return (
            <div
              key={match._id || index}
              className={`bg-vintage-charcoal border-2 ${borderColor} rounded-xl p-4 hover:scale-[1.01] transition-transform`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* Match Type & Result */}
                <div className="flex items-center gap-4">
                  <NextImage
                    src={resultIcon}
                    alt={resultText}
                    width={48}
                    height={48}
                    className="text-vintage-gold"
                  />
                  <div>
                    <p className={`font-display font-bold text-lg ${resultColor} flex items-center gap-2`}>
                      {resultText}
                    </p>
                    <p className="text-xs text-vintage-burnt-gold font-modern">
                      {match.type === 'pvp' ? t('playerVsPlayer') :
                       match.type === 'attack' ? t('attack') :
                       match.type === 'defense' ? t('defense') :
                       t('playerVsEnvironment')}
                    </p>
                    <p className="text-xs text-vintage-burnt-gold/70">
                      {new Date(match.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Power Stats */}
                <div className="flex items-center gap-4">
                  <div className="text-center bg-vintage-black/50 px-4 py-2 rounded-lg border border-vintage-gold/50">
                    <p className="text-xs text-vintage-burnt-gold font-modern">{t('yourPower')}</p>
                    <p className="text-xl font-bold text-vintage-gold">{match.playerPower}</p>
                  </div>
                  <div className="text-2xl text-vintage-burnt-gold font-bold">VS</div>
                  <div className="text-center bg-vintage-black/50 px-4 py-2 rounded-lg border border-vintage-silver/50">
                    <p className="text-xs text-vintage-burnt-gold font-modern">{t('opponent').toUpperCase()}</p>
                    <p className="text-xl font-bold text-vintage-silver">{match.opponentPower}</p>
                  </div>
                </div>

                {/* Opponent Info (if PvP/Attack/Defense) */}
                {match.opponentUsername && (
                  <div className="text-xs font-modern">
                    <p className="text-vintage-gold">vs @{match.opponentUsername}</p>
                    {match.opponentAddress && (
                      <p className="text-vintage-burnt-gold font-mono">
                        {match.opponentAddress.slice(0, 6)}...{match.opponentAddress.slice(-4)}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

export default function TCGPage() {
  const { lang, setLang, t } = useLanguage();
  const { musicMode, setMusicMode, isMusicEnabled, setIsMusicEnabled, setVolume: syncMusicVolume } = useMusic();
  const router = useRouter();
  const playButtonsRef = useRef<HTMLDivElement>(null);

  // Wagmi hooks for wallet connection
  const { address: wagmiAddress, isConnected } = useAccount();
  const { disconnect } = useDisconnect();

  // State for Farcaster address (when in miniapp)
  const [farcasterAddress, setFarcasterAddress] = useState<string | null>(null);
  const [isInFarcaster, setIsInFarcaster] = useState<boolean>(false);
  const [isCheckingFarcaster, setIsCheckingFarcaster] = useState<boolean>(false); // Changed to false for testing

  // 🔧 DEV MODE: Force admin wallet for testing
  const DEV_WALLET_BYPASS = false; // DISABLED: Only for localhost testing
  const address = DEV_WALLET_BYPASS
    ? '0xbb4c7d8b2e32c7c99d358be999377c208cce53c2'
    : (farcasterAddress || wagmiAddress);

  // Debug bypass
  useEffect(() => {
    console.log('🔧 BYPASS ACTIVE:', { DEV_WALLET_BYPASS, address, wagmiAddress, farcasterAddress });
  }, [address, wagmiAddress, farcasterAddress]);

  // Query player's economy data
  const playerEconomy = useQuery(api.economy.getPlayerEconomy, address ? { address } : "skip");
  const dailyQuest = useQuery(api.quests.getDailyQuest, {});
  const questProgress = useQuery(api.quests.getQuestProgress, address ? { address } : "skip");

  // 🎯 Weekly Quests & Missions
  const weeklyProgress = useQuery(api.quests.getWeeklyProgress, address ? { address } : "skip");

  // Debug logging for address changes
  useEffect(() => {
    devLog('🔍 Address state:', {
      wagmiAddress,
      farcasterAddress,
      finalAddress: address,
      isConnected
    });
  }, [wagmiAddress, farcasterAddress, address, isConnected]);

  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [musicEnabled, setMusicEnabled] = useState<boolean>(true);
  const [musicVolume, setMusicVolume] = useState<number>(0.1); // Volume padrão 10%
  const [showTutorial, setShowTutorial] = useState<boolean>(false);
  const [tutorialPage, setTutorialPage] = useState<number>(1);
  const TUTORIAL_PAGES = 4; // Total number of tutorial pages
  const [sortByPower, setSortByPower] = useState<boolean>(false);
  const [sortAttackByPower, setSortAttackByPower] = useState<boolean>(false);
  const [cardTypeFilter, setCardTypeFilter] = useState<'all' | 'free' | 'nft'>('all');
  const [selectedCollections, setSelectedCollections] = useState<CollectionId[]>([]);
  const [nfts, setNfts] = useState<any[]>([]);
  const [jcNfts, setJcNfts] = useState<any[]>([]);
  const [jcNftsLoading, setJcNftsLoading] = useState<boolean>(true);
  const [jcLoadingProgress, setJcLoadingProgress] = useState<{page: number, cards: number} | null>(null);
  const [filteredCount, setFilteredCount] = useState<number>(0);
  const [status, setStatus] = useState<string>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedCards, setSelectedCards] = useState<any[]>([]);
  const [playerPower, setPlayerPower] = useState<number>(0);
  const [dealerPower, setDealerPower] = useState<number>(0);
  const [result, setResult] = useState<string>('');
  const [isBattling, setIsBattling] = useState<boolean>(false);
  const [dealerCards, setDealerCards] = useState<any[]>([]);
  const [showBattleScreen, setShowBattleScreen] = useState<boolean>(false);
  const [battlePhase, setBattlePhase] = useState<string>('cards');
  const [battleOpponentName, setBattleOpponentName] = useState<string>('Dealer');
  const [battlePlayerName, setBattlePlayerName] = useState<string>('You');
  const [battlePlayerPfp, setBattlePlayerPfp] = useState<string | null>(null);
  const [battleOpponentPfp, setBattleOpponentPfp] = useState<string | null>(null);
  const [showLossPopup, setShowLossPopup] = useState<boolean>(false);
  const [showWinPopup, setShowWinPopup] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const CARDS_PER_PAGE = 12;

  // 🎉 Victory Images - Random selection on each win!
  const VICTORY_IMAGES = [
    '/victory-1.jpg', // Gigachad original
    '/victory-2.jpg', // Musculoso sorrindo
  ];
  const [currentVictoryImage, setCurrentVictoryImage] = useState<string>(VICTORY_IMAGES[0]);
  const victoryAudioRef = useRef<HTMLAudioElement | null>(null);

  // PvP States
  const [gameMode, setGameMode] = useState<'ai' | 'pvp' | null>(null);
  const [pvpMode, setPvpMode] = useState<'menu' | 'pvpMenu' | 'autoMatch' | 'selectMode' | 'createRoom' | 'joinRoom' | 'inRoom' | null>(null);
  const [roomCode, setRoomCode] = useState<string>('');
  const [currentRoom, setCurrentRoom] = useState<any>(null);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [selectedRoomMode, setSelectedRoomMode] = useState<'ranked' | 'casual'>('ranked');

  // AI Difficulty (5 levels with progressive unlock)
  const [aiDifficulty, setAiDifficulty] = useState<'gey' | 'goofy' | 'gooner' | 'gangster' | 'gigachad'>('gey');
  const [eliminationDifficulty, setEliminationDifficulty] = useState<'gey' | 'goofy' | 'gooner' | 'gangster' | 'gigachad'>('gey');
  const [pokerCpuDifficulty, setPokerCpuDifficulty] = useState<'gey' | 'goofy' | 'gooner' | 'gangster' | 'gigachad'>('gey');

  // Convex client for imperative queries
  const convex = useConvex();

  // 🚀 Performance: Memoized NFT calculations (only recomputes when nfts change)
  const totalNftPower = useTotalPower(nfts);
  const openedCardsCount = useMemo(() => nfts.filter(nft => !isUnrevealed(nft)).length, [nfts]);
  const unopenedCardsCount = useMemo(() => nfts.filter(nft => isUnrevealed(nft)).length, [nfts]);
  const nftTokenIds = useMemo(() => nfts.map(nft => nft.tokenId), [nfts]);

  // 🚀 Performance: Memoized sorted NFTs (for auto-select and AI)
  const sortedNfts = useSortedByPower(nfts);
  const strongestNfts = useStrongestCards(nfts, HAND_SIZE);

  // 🚀 Performance: Memoized JC NFTs (AI deck)
  const sortedJcNfts = useSortedByPower(jcNfts);
  const strongestJcNfts = useStrongestCards(jcNfts, HAND_SIZE);
  const strongestJcNftsForPoker = useStrongestCards(jcNfts, 10); // Poker Battle needs 10 cards

  // Economy mutations
  const awardPvECoins = useMutation(api.economy.awardPvECoins);
  const awardPvPCoins = useMutation(api.economy.awardPvPCoins);
  const recordAttackResult = useMutation(api.economy.recordAttackResult); // ⚛️ ATOMIC: Combines coins + match + profile update
  const claimLoginBonus = useMutation(api.economy.claimLoginBonus);
  const payEntryFee = useMutation(api.economy.payEntryFee);
  const claimQuestReward = useMutation(api.quests.claimQuestReward);

  // 🎁 Welcome Pack
  const hasReceivedWelcomePack = useQuery(api.welcomePack.hasReceivedWelcomePack, address ? { address } : "skip");
  const claimWelcomePack = useMutation(api.welcomePack.claimWelcomePack);

  // 🎯 Weekly Quests mutations
  const claimWeeklyReward = useMutation(api.quests.claimWeeklyReward);

  // 🏅 Weekly Leaderboard Rewards
  const weeklyRewardEligibility = useQuery(api.quests.checkWeeklyRewardEligibility, address ? { address } : "skip");
  const claimWeeklyLeaderboardReward = useMutation(api.quests.claimWeeklyLeaderboardReward);
  const [isClaimingWeeklyReward, setIsClaimingWeeklyReward] = useState<boolean>(false);

  // 🔒 Defense Lock System - Get locked cards for Attack/PvP modes
  const attackLockedCards = useQuery(
    api.profiles.getAvailableCards,
    address ? { address, mode: "attack" } : "skip"
  );
  const pvpLockedCards = useQuery(
    api.profiles.getAvailableCards,
    address ? { address, mode: "pvp" } : "skip"
  );
  const [loginBonusClaimed, setLoginBonusClaimed] = useState<boolean>(false);
  const [isClaimingBonus, setIsClaimingBonus] = useState<boolean>(false);
  const [showWelcomePackPopup, setShowWelcomePackPopup] = useState<boolean>(false);
  const [isClaimingWelcomePack, setIsClaimingWelcomePack] = useState<boolean>(false);
  const [isClaimingQuest, setIsClaimingQuest] = useState<boolean>(false);
  const [unlockedDifficulties, setUnlockedDifficulties] = useState<Set<string>>(new Set(['gey']));
  const [isDifficultyModalOpen, setIsDifficultyModalOpen] = useState(false);
  const [tempSelectedDifficulty, setTempSelectedDifficulty] = useState<'gey' | 'goofy' | 'gooner' | 'gangster' | 'gigachad' | null>(null);

  // Elimination Mode States
  const [battleMode, setBattleMode] = useState<'normal' | 'elimination'>('normal');
  const [eliminationPhase, setEliminationPhase] = useState<'ordering' | 'battle' | null>(null);
  const [orderedPlayerCards, setOrderedPlayerCards] = useState<any[]>([]);
  const [orderedOpponentCards, setOrderedOpponentCards] = useState<any[]>([]);
  const [currentRound, setCurrentRound] = useState<number>(1);
  const [roundResults, setRoundResults] = useState<('win' | 'loss' | 'tie')[]>([]);
  const [eliminationPlayerScore, setEliminationPlayerScore] = useState<number>(0);
  const [eliminationOpponentScore, setEliminationOpponentScore] = useState<number>(0);
  const pvpBattleStarted = useRef<boolean>(false); // PvP battle flag to prevent double-start (useRef for immediate sync access)
  const pvpProcessedBattles = useRef<Set<string>>(new Set()); // Track which battles have been processed to prevent duplicates

  // Profile States
  const [currentView, setCurrentView] = useState<'game' | 'profile' | 'leaderboard' | 'missions' | 'achievements' | 'shop'>('game');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [showCreateProfile, setShowCreateProfile] = useState<boolean>(false);
  const [profileUsername, setProfileUsername] = useState<string>('');
  const [isCreatingProfile, setIsCreatingProfile] = useState<boolean>(false);
  const [leaderboard, setLeaderboard] = useState<UserProfile[]>([]);
  const [currentLeaderboardPage, setCurrentLeaderboardPage] = useState<number>(1);
  const LEADERBOARD_PER_PAGE = 10;
  const [matchHistory, setMatchHistory] = useState<MatchHistory[]>([]);
  const [isLoadingProfile, setIsLoadingProfile] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showChangeUsername, setShowChangeUsername] = useState<boolean>(false);

  // Missions States
  const [missions, setMissions] = useState<any[]>([]);
  const [isLoadingMissions, setIsLoadingMissions] = useState<boolean>(false);
  const [isClaimingMission, setIsClaimingMission] = useState<string | null>(null);
  const [isClaimingAll, setIsClaimingAll] = useState<boolean>(false);

  // Defense Deck States
  const [showDefenseDeckSaved, setShowDefenseDeckSaved] = useState<boolean>(false);
  const [defenseDeckSaveStatus, setDefenseDeckSaveStatus] = useState<string>(''); // For retry feedback
  const [showPveCardSelection, setShowPveCardSelection] = useState<boolean>(false);
  const [pveSelectedCards, setPveSelectedCards] = useState<any[]>([]);
  const [pveSortByPower, setPveSortByPower] = useState<boolean>(false);
  const [newUsername, setNewUsername] = useState<string>('');
  const [isChangingUsername, setIsChangingUsername] = useState<boolean>(false);

  // Attack States
  const [showAttackCardSelection, setShowAttackCardSelection] = useState<boolean>(false);
  const [attackSelectedCards, setAttackSelectedCards] = useState<any[]>([]);
  const [targetPlayer, setTargetPlayer] = useState<UserProfile | null>(null);
  const [attacksRemaining, setAttacksRemaining] = useState<number>(getMaxAttacks(null));
  const [isAttacking, setIsAttacking] = useState<boolean>(false);
  const [isConfirmingCards, setIsConfirmingCards] = useState<boolean>(false);

  // Poker Battle States
  const [showPokerBattle, setShowPokerBattle] = useState<boolean>(false);
  const [pokerMode, setPokerMode] = useState<'cpu' | 'pvp'>('pvp');

  // 🚀 Performance: Memoized battle card power totals (for UI display)
  const pveSelectedCardsPower = useTotalPower(pveSelectedCards);
  const attackSelectedCardsPower = useTotalPower(attackSelectedCards);
  const dealerCardsPower = useTotalPower(dealerCards);

  // ✅ PvP Preview States
  const [showPvPPreview, setShowPvPPreview] = useState<boolean>(false);
  const [pvpPreviewData, setPvpPreviewData] = useState<any>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState<boolean>(false);

  // Notifications States
  const [defensesReceived, setDefensesReceived] = useState<any[]>([]);
  const [unreadDefenses, setUnreadDefenses] = useState<number>(0);

  // Refs for preventing race conditions
  const updateStatsInProgress = useRef(false);

  // Calculate max attacks for current user
  const maxAttacks = useMemo(() => getMaxAttacks(address), [address]);

  // Battle Result States for sharing
  const [lastBattleResult, setLastBattleResult] = useState<{
    result: 'win' | 'loss' | 'tie';
    playerPower: number;
    opponentPower: number;
    opponentName: string;
    opponentTwitter?: string;
    type: 'pve' | 'pvp' | 'attack' | 'defense';
    coinsEarned?: number;
    playerPfpUrl?: string;
    opponentPfpUrl?: string;
  } | null>(null);
  const [showTiePopup, setShowTiePopup] = useState(false);
  const [tieGifLoaded, setTieGifLoaded] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showDailyClaimPopup, setShowDailyClaimPopup] = useState(false);

  // Reward Choice Modal State
  const [showRewardChoice, setShowRewardChoice] = useState(false);
  const [pendingReward, setPendingReward] = useState<{
    amount: number;
    source: "pve" | "pvp" | "attack" | "defense" | "leaderboard";
  } | null>(null);

  // Share incentives
  const [sharesRemaining, setSharesRemaining] = useState<number | undefined>(undefined);

  // Update shares remaining when profile changes
  useEffect(() => {
    if (userProfile) {
      const today = new Date().toISOString().split('T')[0];
      const dailyShares = userProfile.lastShareDate === today ? (userProfile.dailyShares || 0) : 0;
      setSharesRemaining(3 - dailyShares);
    }
  }, [userProfile]);

  // Handle share button click - award bonus
  const handleShareClick = async (platform: 'twitter' | 'farcaster') => {
    if (!address || !userProfile) return;

    try {
      const result = await convex.mutation(api.economy.awardShareBonus, {
        address,
        type: 'victory',
      });

      if (result.success) {
        setSuccessMessage(result.message);
        setSharesRemaining(result.remaining);
        // Refresh profile to update coins
        const updatedProfile = await ConvexProfileService.getProfile(address);
        if (updatedProfile) {
          setUserProfile(updatedProfile);
        }
      } else {
        // Already claimed or limit reached - just show message
        if (result.message) {
          setErrorMessage(result.message);
        }
      }
    } catch (error: any) {
      console.error('Error awarding share bonus:', error);
    }
  };

  // Preload tie.gif to prevent loading delay
  useEffect(() => {
    const img = new Image();
    img.src = '/tie.gif';
    img.onload = () => setTieGifLoaded(true);
  }, []);

  // Carregar estado da música do localStorage na montagem
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedMusicEnabled = localStorage.getItem('musicEnabled');
      const savedMusicVolume = localStorage.getItem('musicVolume');

      if (savedMusicEnabled !== null) {
        setMusicEnabled(savedMusicEnabled === 'true');
      }
      if (savedMusicVolume !== null) {
        const volume = parseFloat(savedMusicVolume);
        setMusicVolume(volume);
        // Sincroniza o AudioManager.currentVolume imediatamente
        AudioManager.currentVolume = volume;
        devLog(`📦 Volume carregado do localStorage: ${volume} (${Math.round(volume * 100)}%)`);
      }
    }
  }, []);

  // Sync music volume with MusicContext
  useEffect(() => {
    syncMusicVolume(musicVolume);
  }, [musicVolume, syncMusicVolume]);

  // Auto-connect Farcaster wallet in miniapp context
  useEffect(() => {
    const initFarcasterWallet = async () => {
      try {
        // Check if we're in Farcaster context
        if (sdk && typeof sdk.wallet !== 'undefined' && sdk.wallet.ethProvider) {
          setIsInFarcaster(true);
          const addresses = await sdk.wallet.ethProvider.request({
            method: "eth_requestAccounts"
          });
          if (addresses && addresses[0]) {
            setFarcasterAddress(addresses[0]);
            localStorage.setItem('connectedAddress', addresses[0].toLowerCase());
            devLog('✓ Auto-connected Farcaster wallet:', addresses[0]);

            // ✓ Save FID to profile for notifications
            try {
              const context = await sdk.context;
              const fid = context?.user?.fid;
              if (fid) {
                devLog('📱 Farcaster FID detected:', fid);
                // Update profile with FID
                const profile = await ConvexProfileService.getProfile(addresses[0]);
                if (profile && (!profile.fid || profile.fid !== fid.toString())) {
                  await ConvexProfileService.updateProfile(addresses[0], {
                    fid: fid.toString()
                  });
                  devLog('✓ FID saved to profile');
                }
              }
            } catch (fidError) {
              devLog('! Could not save FID:', fidError);
            }
          } else {
            // Failed to get address, reset Farcaster state
            setIsInFarcaster(false);
          }
        }
      } catch (err) {
        devLog('! Not in Farcaster context or wallet unavailable');
        // Reset Farcaster state on error
        setIsInFarcaster(false);
        setFarcasterAddress(null);
      } finally {
        // Always set checking to false after checking
        setIsCheckingFarcaster(false);
      }
    };
    initFarcasterWallet();
  }, []);

  // 🔔 Handler to enable Farcaster notifications
  const handleEnableNotifications = async () => {
    try {
      if (!sdk || !sdk.actions || !isInFarcaster) {
        devLog('! Farcaster SDK not available');
        return;
      }

      devLog('🔔 Requesting Farcaster notification permissions...');
      await sdk.actions.addMiniApp();
      devLog('✓ Notification permission requested');

      if (soundEnabled) AudioManager.buttonClick();
    } catch (error) {
      devError('✗ Error enabling notifications:', error);
      if (soundEnabled) AudioManager.buttonError();
    }
  };

  // 🎉 Show victory popup with smart image selection based on victory margin
  const showVictory = () => {
    let isOverwhelmingVictory = false;

    // Calculate if victory was overwhelming based on power difference
    if (lastBattleResult?.playerPower && lastBattleResult?.opponentPower) {
      const playerPower = lastBattleResult.playerPower;
      const opponentPower = lastBattleResult.opponentPower;
      const powerDifference = playerPower - opponentPower;
      const victoryMargin = (powerDifference / opponentPower) * 100;

      // Overwhelming victory = 50% or more power advantage
      isOverwhelmingVictory = victoryMargin >= 50;

      devLog(`🎯 Victory margin: ${victoryMargin.toFixed(1)}% (${playerPower} vs ${opponentPower})`);
      devLog(`💪 ${isOverwhelmingVictory ? 'OVERWHELMING' : 'Normal'} victory!`);
    }

    // Select victory image based on victory type
    let victoryImage: string;

    if (isOverwhelmingVictory) {
      // OVERWHELMING VICTORY → victory-2.jpg (Moreno musculoso + gay vibes)
      victoryImage = VICTORY_IMAGES[1]; // victory-2.jpg

      // Play Marvin audio for overwhelming victories
      const audio = new Audio('/marvin-victory.mp3');
      audio.volume = 0.5;
      audio.play().catch(err => devLog('Audio play failed:', err));

      // Store audio ref so we can stop it later
      victoryAudioRef.current = audio;
    } else {
      // NORMAL VICTORY → victory-1.jpg (Gigachad)
      victoryImage = VICTORY_IMAGES[0]; // victory-1.jpg

      // Play default win sound
      if (soundEnabled) AudioManager.win();
    }

    setCurrentVictoryImage(victoryImage);

    // Check if there are coins earned to save for later reward choice
    if (lastBattleResult?.coinsEarned && lastBattleResult.coinsEarned > 0) {
      // Save reward data to show reward choice modal AFTER victory screen closes
      setPendingReward({
        amount: lastBattleResult.coinsEarned,
        source: lastBattleResult.type,
      });
    }

    // Always show victory popup first
    setShowWinPopup(true);
  };

  // 🎵 Handler to close victory screen and stop audio
  const handleCloseVictoryScreen = () => {
    // Stop victory audio if playing
    if (victoryAudioRef.current) {
      victoryAudioRef.current.pause();
      victoryAudioRef.current.currentTime = 0;
      victoryAudioRef.current = null;
    }
    setShowWinPopup(false);

    // After closing victory screen, show reward choice modal if there are pending rewards
    if (pendingReward && pendingReward.amount > 0) {
      setShowRewardChoice(true);
    }
  };

  // 🎵 Handler to close defeat screen
  const handleCloseDefeatScreen = () => {
    setShowLossPopup(false);

    // After closing defeat screen, show reward choice modal if there are pending rewards
    if (pendingReward && pendingReward.amount > 0) {
      setShowRewardChoice(true);
    }
  };

  // 💰 Handler to claim daily login bonus
  const handleClaimLoginBonus = async () => {
    if (!address || loginBonusClaimed || isClaimingBonus) return;

    try {
      setIsClaimingBonus(true);
      devLog('💰 Claiming login bonus...');

      const result = await claimLoginBonus({ address });

      if (result.awarded > 0) {
        devLog(`✓ Login bonus claimed: +${result.awarded} $TESTVBMS`);
        setLoginBonusClaimed(true);
        if (soundEnabled) AudioManager.buttonClick();
      } else {
        devLog(`! ${result.reason}`);
        if (soundEnabled) AudioManager.buttonError();
      }
    } catch (error) {
      devError('✗ Error claiming login bonus:', error);
      if (soundEnabled) AudioManager.buttonError();
    } finally {
      setIsClaimingBonus(false);
    }
  };

  // 🎁 Handler to claim welcome pack
  const handleClaimWelcomePack = async () => {
    if (!address || isClaimingWelcomePack) return;

    try {
      setIsClaimingWelcomePack(true);
      devLog('🎁 Claiming welcome pack...');

      const result = await claimWelcomePack({ address });

      devLog('✓ Welcome pack claimed: 1 Basic Pack!');
      setShowWelcomePackPopup(false);
      if (soundEnabled) AudioManager.buttonClick();
    } catch (error: any) {
      devError('✗ Error claiming welcome pack:', error);
      alert(error.message || 'Failed to claim welcome pack');
      if (soundEnabled) AudioManager.buttonError();
    } finally {
      setIsClaimingWelcomePack(false);
    }
  };

  // 🎯 Handler to claim daily quest reward
  const handleClaimQuestReward = async () => {
    if (!address || isClaimingQuest) return;

    try {
      setIsClaimingQuest(true);
      devLog('🎯 Claiming quest reward...');

      const result = await claimQuestReward({ address });

      devLog(`✓ Quest reward claimed: +${result.reward} $TESTVBMS`);
      if (soundEnabled) AudioManager.buttonClick();
    } catch (error: any) {
      devError('✗ Error claiming quest reward:', error);
      alert(error.message || 'Failed to claim quest reward');
      if (soundEnabled) AudioManager.buttonError();
    } finally {
      setIsClaimingQuest(false);
    }
  };

  // 🏅 Handler to claim weekly leaderboard reward
  const handleClaimWeeklyLeaderboardReward = async () => {
    if (!address || isClaimingWeeklyReward) return;

    try {
      setIsClaimingWeeklyReward(true);
      devLog('🏅 Claiming weekly leaderboard reward...');

      const result = await claimWeeklyLeaderboardReward({ address });

      devLog(`✓ Weekly reward claimed: Rank #${result.rank} → +${result.reward} $TESTVBMS`);
      if (soundEnabled) AudioManager.buttonClick();

      // Show success alert
      alert(`🎁 Weekly Reward Claimed!\n\nRank #${result.rank}: +${result.reward} $TESTVBMS\nNew Balance: ${result.newBalance.toLocaleString()} coins`);
    } catch (error: any) {
      devError('✗ Error claiming weekly reward:', error);
      alert(error.message || 'Failed to claim weekly reward');
      if (soundEnabled) AudioManager.buttonError();
    } finally {
      setIsClaimingWeeklyReward(false);
    }
  };

  // Salvar estado da música no localStorage e controlar reprodução
  // ⚠️ DISABLED: Now using MusicContext instead of AudioManager
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('musicEnabled', isMusicEnabled.toString());

      // Stop old AudioManager to prevent dual playback
      AudioManager.stopBackgroundMusic();
    }
  }, [isMusicEnabled]);

  // Atualiza e salva volume da música quando musicVolume muda
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('musicVolume', musicVolume.toString());
      AudioManager.setVolume(musicVolume);
    }
  }, [musicVolume]);

  // Farcaster SDK - Informa que o app está pronto
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).sdk?.actions?.ready) {
      (window as any).sdk.actions.ready();
    }
  }, []);

  // 🎁 Show welcome pack popup if user hasn't received it
  useEffect(() => {
    if (address && hasReceivedWelcomePack === false) {
      setShowWelcomePackPopup(true);
    }
  }, [address, hasReceivedWelcomePack]);

  // Sync login bonus claimed status and show popup on login
  useEffect(() => {
    if (playerEconomy?.dailyLimits?.loginBonus) {
      setLoginBonusClaimed(true);
    } else {
      setLoginBonusClaimed(false);
      // Show daily claim popup on login if bonus not claimed
      if (address && userProfile && playerEconomy) {
        setShowDailyClaimPopup(true);
      }
    }
  }, [playerEconomy, address, userProfile]);

  // Check for Twitter OAuth success
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const twitterConnected = urlParams.get('twitter_connected');
    const error = urlParams.get('error');

    if (twitterConnected) {
      // Check if this is a popup window
      if (window.opener) {
        // This is the popup - send message to parent and close
        window.opener.postMessage({ type: 'twitter_connected', username: twitterConnected }, window.location.origin);
        window.close();
      } else if (userProfile) {
        // This is the main window - update profile
        setUserProfile({ ...userProfile, twitter: twitterConnected });
        // Clean up URL
        window.history.replaceState({}, '', '/');
        // Show success message
        alert(`✓ Twitter connected: @${twitterConnected}`);
      }
    } else if (error === 'twitter_auth_failed') {
      if (window.opener) {
        // This is the popup - notify parent and close
        window.opener.postMessage({ type: 'twitter_error' }, window.location.origin);
        window.close();
      } else {
        alert('✗ Failed to connect Twitter. Please try again.');
        window.history.replaceState({}, '', '/');
      }
    }

    // Listen for messages from OAuth popup
    const handleMessage = (event: MessageEvent) => {
      // Verify origin for security
      if (event.origin !== window.location.origin) return;

      if (event.data.type === 'twitter_connected') {
        devLog('✓ Twitter connected via popup:', event.data.username);
        if (address) {
          // Reload profile from Convex to get the updated Twitter handle
          ConvexProfileService.getProfile(address).then((profile) => {
            if (profile) {
              setUserProfile(profile);
              devLog('✓ Profile reloaded with Twitter:', profile.twitter);
            }
          });
        }
      } else if (event.data.type === 'twitter_error') {
        alert('✗ Failed to connect Twitter. Please try again.');
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [userProfile, address]);

  // Check for attack parameter (from rematch button)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const attackAddress = urlParams.get('attack');

    if (attackAddress && address && nfts.length > 0) {
      // Fetch target player profile
      ConvexProfileService.getProfile(attackAddress).then((profile) => {
        if (profile) {
          devLog('🎯 Opening attack modal for:', profile.username);
          setTargetPlayer(profile);
          setShowAttackCardSelection(true);
          setAttackSelectedCards([]);
          setCurrentView('game');
          // Clean up URL
          window.history.replaceState({}, '', '/');
        } else {
          devWarn('! Could not find profile for attack target:', attackAddress);
          // Clean up URL even if profile not found
          window.history.replaceState({}, '', '/');
        }
      }).catch((err) => {
        devError('✗ Error loading attack target profile:', err);
        // Clean up URL on error
        window.history.replaceState({}, '', '/');
      });
    }
  }, [address, nfts.length]);

  const toggleMusic = useCallback(async () => {
    if (soundEnabled) {
      await AudioManager.init();
      if (!isMusicEnabled) AudioManager.toggleOn();
      else AudioManager.toggleOff();
    }
    // Update MusicContext state
    setIsMusicEnabled(!isMusicEnabled);
    // Keep local state in sync
    setMusicEnabled(!isMusicEnabled);
  }, [isMusicEnabled, soundEnabled, setIsMusicEnabled]);

  // Wallet connection is now handled by RainbowKit ConnectButton
  // No need for manual connectWallet function

  const disconnectWallet = useCallback(() => {
    if (soundEnabled) AudioManager.buttonNav();
    disconnect();
    // Clear Farcaster state as well
    setFarcasterAddress(null);
    setIsInFarcaster(false);
    localStorage.removeItem('connectedAddress');
    setNfts([]);
    setSelectedCards([]);
    setFilteredCount(0);
    setStatus("idle");
    setErrorMsg(null);
    setPlayerPower(0);
    setDealerPower(0);
    setResult('');
    setDealerCards([]);
    devLog('🔌 Desconectado');
  }, [soundEnabled, disconnect]);

  const loadNFTs = useCallback(async () => {
    if (!address) {
      devLog('! loadNFTs called but no address');
      return;
    }
    devLog('🎴 Starting to load NFTs for address:', address);
    try {
      setStatus("fetching");
      setErrorMsg(null);
      devLog('📡 Fetching NFTs from Alchemy...');
      const raw = await fetchNFTs(address);
      devLog('✓ Received NFTs from Alchemy:', raw.length);

      const METADATA_BATCH_SIZE = 50;
      const enrichedRaw = [];

      for (let i = 0; i < raw.length; i += METADATA_BATCH_SIZE) {
        const batch = raw.slice(i, i + METADATA_BATCH_SIZE);
        const batchResults = await Promise.all(
          batch.map(async (nft) => {
            const tokenUri = nft?.tokenUri?.gateway || nft?.raw?.tokenUri;
            if (!tokenUri) return nft;
            try {
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 2000);
              const res = await fetch(tokenUri, { signal: controller.signal });
              clearTimeout(timeoutId);
              if (res.ok) {
                const metadata = await res.json();
                return { ...nft, metadata: metadata, raw: { ...nft.raw, metadata: metadata } };
              }
            } catch (error) {
              devWarn(`⚠️ Failed to refresh metadata for NFT #${nft.tokenId}:`, error);
            }
            return nft;
          })
        );
        enrichedRaw.push(...batchResults);
      }

      // Filter unopened cards AFTER metadata refresh (not before)
      // This ensures we have fresh attributes to check
      const revealed = enrichedRaw.filter((nft) => {
        const rarity = findAttr(nft, 'rarity').toLowerCase();
        const status = findAttr(nft, 'status').toLowerCase();
        // Keep cards that are NOT unopened
        return rarity !== 'unopened' && status !== 'unopened';
      });

      const filtered = enrichedRaw.length - revealed.length;
      setFilteredCount(filtered);
      devLog(`📊 NFT Stats: Total=${enrichedRaw.length}, Revealed=${revealed.length}, Filtered=${filtered}`);

      const IMAGE_BATCH_SIZE = 50;
      const processed = [];

      for (let i = 0; i < revealed.length; i += IMAGE_BATCH_SIZE) {
        const batch = revealed.slice(i, i + IMAGE_BATCH_SIZE);
        const enriched = await Promise.all(
          batch.map(async (nft) => {
            const imageUrl = await getImage(nft);
            return {
              ...nft,
              imageUrl,
              rarity: findAttr(nft, 'rarity'),
              status: findAttr(nft, 'status'),
              wear: findAttr(nft, 'wear'),
              foil: findAttr(nft, 'foil'),
              power: calcPower(nft),
            };
          })
        );
        processed.push(...enriched);
      }

      // Load FREE cards from cardInventory
      try {
        const freeCards = await convex.query(api.cardPacks.getPlayerCards, { address });
        devLog('🆓 FREE cards loaded:', freeCards?.length || 0);

        if (freeCards && freeCards.length > 0) {
          const freeCardsFormatted = freeCards.map((card: any) => ({
            tokenId: card.cardId,
            title: `FREE ${card.rarity} Card`,
            description: `Free card from pack opening`,
            imageUrl: card.imageUrl,
            rarity: card.rarity,
            status: 'revealed',
            wear: card.wear,
            foil: card.foil || 'None',
            power: card.power,
            badgeType: card.badgeType, // 'FREE_CARD'
            isFreeCard: true,
          }));
          processed.push(...freeCardsFormatted);
        }
      } catch (error) {
        devWarn('⚠️ Failed to load FREE cards:', error);
      }

      setNfts([...processed]);
      setStatus("loaded");
      devLog('🎉 Cards loaded successfully (NFTs + FREE):', processed.length);
    } catch (e: any) {
      devLog('✗ Error loading NFTs:', e);
      setStatus("failed");
      setErrorMsg(e.message);
    }
  }, [address]);

  useEffect(() => {
    if (address) {
      devLog('📦 Address changed, loading NFTs:', address);
      loadNFTs();
    }
  }, [address, loadNFTs]);

  const loadJCNFTs = useCallback(async () => {
    try {
      devLog('※ Loading JC deck from optimized static file...');

      // Load from optimized static endpoint (instant!)
      const res = await fetch('/api/jc-deck');
      if (!res.ok) {
        throw new Error(`Failed to load JC deck: ${res.status}`);
      }

      const data = await res.json();
      const cards = data.cards || [];

      devLog(`✓ JC deck loaded instantly: ${cards.length} cards from ${data.source}`);

      // Map to expected format with normalized URLs
      const processed = cards.map((card: any) => ({
        tokenId: card.tokenId,
        imageUrl: normalizeUrl(card.imageUrl || ''),
        rarity: card.rarity,
        status: card.status,
        power: card.power,
        name: card.name,
        attributes: card.attributes || [],
        // Reconstruct full NFT object if needed
        raw: {
          metadata: {
            name: card.name,
            image: card.imageUrl,
            attributes: card.attributes
          }
        }
      }));

      setJcNfts(processed);
      setJcNftsLoading(false);

      devLog('✓ JC NFTs ready:', processed.length, 'cards');
      devLog(`   Legendary: ${processed.filter((c: any) => c.rarity === 'Legendary').length}`);
      devLog(`   Epic: ${processed.filter((c: any) => c.rarity === 'Epic').length}`);
      devLog(`   Rare: ${processed.filter((c: any) => c.rarity === 'Rare').length}`);

    } catch (e: any) {
      devError('✗ Error loading JC NFTs from static file:', e);
      devLog('!  Falling back to live API...');

      // Fallback to original live API method
      try {
        const revealed = await fetchNFTs(JC_WALLET_ADDRESS, JC_CONTRACT_ADDRESS, (page, cards) => {
          setJcLoadingProgress({ page, cards });
        });

        const processed = revealed.map(nft => {
          const imageUrl = nft?.image?.cachedUrl ||
                           nft?.image?.thumbnailUrl ||
                           nft?.image?.originalUrl ||
                           nft?.raw?.metadata?.image ||
                           '';

          return {
            ...nft,
            imageUrl: normalizeUrl(imageUrl),
            rarity: findAttr(nft, 'rarity'),
            status: findAttr(nft, 'status'),
            wear: findAttr(nft, 'wear'),
            foil: findAttr(nft, 'foil'),
            power: calcPower(nft),
          };
        });

        setJcNfts(processed);
        setJcNftsLoading(false);
        setJcLoadingProgress(null);
        devLog('✓ JC NFTs loaded from live API:', processed.length, 'cards');

      } catch (fallbackError: any) {
        devError('✗ Fallback also failed:', fallbackError);
        setJcNftsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    loadJCNFTs();
  }, []); // Run only once on mount

  // Load unlocked difficulties from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('unlockedDifficulties');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setUnlockedDifficulties(new Set(parsed));
      } catch (e) {
        devError('Error loading unlocked difficulties:', e);
      }
    }
  }, []);

  // Save unlocked difficulties to localStorage
  const unlockNextDifficulty = useCallback((currentDifficulty: string) => {
    const difficultyOrder = ['gey', 'goofy', 'gooner', 'gangster', 'gigachad'];
    const currentIndex = difficultyOrder.indexOf(currentDifficulty);

    if (currentIndex < difficultyOrder.length - 1) {
      const nextDifficulty = difficultyOrder[currentIndex + 1];
      setUnlockedDifficulties(prev => {
        const newSet = new Set(prev);
        newSet.add(nextDifficulty);
        localStorage.setItem('unlockedDifficulties', JSON.stringify(Array.from(newSet)));
        return newSet;
      });
      devLog(`Unlocked difficulty: ${nextDifficulty}`);
      return nextDifficulty;
    }
    return null;
  }, []);

  const handleSelectCard = useCallback((card: any) => {
    setSelectedCards(prev => {
      const isSelected = prev.find(c => c.tokenId === card.tokenId);
      if (isSelected) {
        if (soundEnabled) AudioManager.deselectCard();
        return prev.filter(c => c.tokenId !== card.tokenId);
      } else if (prev.length < HAND_SIZE) {
        if (soundEnabled) AudioManager.selectCard();
        const newSelection = [...prev, card];

        // Auto-scroll to battle button on mobile when 5 cards selected
        if (newSelection.length === HAND_SIZE) {
          setTimeout(() => {
            const battleButton = document.getElementById('battle-button');
            if (battleButton && window.innerWidth < 768) {
              battleButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }, 300);
        }

        return newSelection;
      }
      return prev;
    });
  }, [soundEnabled]);

  const clearSelection = useCallback(() => {
    setSelectedCards([]);
    if (soundEnabled) AudioManager.deselectCard();
  }, [soundEnabled]);

  const selectStrongest = useCallback(() => {
    // 🚀 Performance: Using pre-sorted memoized NFTs
    setSelectedCards(strongestNfts);
    if (soundEnabled) AudioManager.selectCard();

    // Auto-scroll to battle button on mobile
    setTimeout(() => {
      const battleButton = document.getElementById('battle-button');
      if (battleButton && window.innerWidth < 768) {
        battleButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 300);
  }, [strongestNfts, soundEnabled]);

  // Generate AI hand with strategic ordering based on difficulty
  const generateAIHand = useCallback((difficulty: 'gey' | 'goofy' | 'gooner' | 'gangster' | 'gigachad') => {
    const available = jcNfts;
    if (available.length < HAND_SIZE) {
      alert('AI deck not ready yet...');
      return [];
    }

    const sorted = [...available].sort((a, b) => (b.power || 0) - (a.power || 0));
    let pickedCards: any[] = [];

    // Select cards based on difficulty (same logic as normal battle)
    switch (difficulty) {
      case 'gey':
        const weakest = sorted.filter(c => (c.power || 0) === 15);
        pickedCards = weakest.sort(() => Math.random() - 0.5).slice(0, HAND_SIZE);
        break;
      case 'goofy':
        const weak = sorted.filter(c => {
          const p = c.power || 0;
          return p === 18 || p === 21;
        });
        pickedCards = weak.sort(() => Math.random() - 0.5).slice(0, HAND_SIZE);
        break;
      case 'gooner':
        const medium = sorted.filter(c => {
          const p = c.power || 0;
          return p === 60 || p === 72;
        });
        pickedCards = medium.sort(() => Math.random() - 0.5).slice(0, HAND_SIZE);
        break;
      case 'gangster':
        const cards150 = sorted.filter(c => (c.power || 0) === 150);
        if (cards150.length >= HAND_SIZE) {
          pickedCards = cards150.sort(() => Math.random() - 0.5).slice(0, HAND_SIZE);
        } else {
          const legendaries = sorted.filter(c => (c.rarity || '').toLowerCase().includes('legend'));
          pickedCards = legendaries.slice(0, HAND_SIZE);
        }
        break;
      case 'gigachad':
        pickedCards = sorted.slice(0, HAND_SIZE);
        break;
    }

    // Apply strategic ordering based on difficulty
    let orderedCards: any[] = [];
    switch (difficulty) {
      case 'gey':
      case 'goofy':
        // Random order (no strategy)
        orderedCards = pickedCards.sort(() => Math.random() - 0.5);
        break;
      case 'gooner':
        // Weak-first strategy (sacrifice weak cards)
        orderedCards = [...pickedCards].sort((a, b) => (a.power || 0) - (b.power || 0));
        break;
      case 'gangster':
        // Strong-first strategy (overwhelming force)
        orderedCards = [...pickedCards].sort((a, b) => (b.power || 0) - (a.power || 0));
        break;
      case 'gigachad':
        // Balanced strategy (strong-weak-strong-weak-strong)
        const sortedByPower = [...pickedCards].sort((a, b) => (b.power || 0) - (a.power || 0));
        orderedCards = [
          sortedByPower[0], // strongest
          sortedByPower[4], // weakest
          sortedByPower[1], // 2nd strongest
          sortedByPower[3], // 2nd weakest
          sortedByPower[2]  // middle
        ];
        break;
    }

    devLog(`🤖 AI ordered cards for ${difficulty}:`, orderedCards.map(c => `#${c.tokenId} (${c.power} PWR)`));
    return orderedCards;
  }, [jcNfts]);

  const playHand = useCallback((cardsToPlay?: any[], battleDifficulty?: typeof aiDifficulty) => {
        const cards = cardsToPlay || selectedCards;
    const difficulty = battleDifficulty || aiDifficulty; // Use parameter if provided, otherwise state
    if (cards.length !== HAND_SIZE || isBattling) return;
    setIsBattling(true);
    setShowBattleScreen(true);
    setBattlePhase('cards');
    setBattleOpponentName('Mecha George Floyd'); // Show Mecha George Floyd name
    setBattlePlayerName(userProfile?.username || 'You'); // Show player username
    setBattleOpponentPfp(`/images/mecha-george-floyd.jpg?v=${Date.now()}`); // Mecha George pfp with cache bust
    // Player pfp from Twitter if available (same logic as profile/home)
    setBattlePlayerPfp(getAvatarUrl(userProfile ? { twitter: userProfile.twitter, twitterProfileImageUrl: userProfile.twitterProfileImageUrl } : null));
    setShowLossPopup(false);
    setShowWinPopup(false);
    setResult('');
    setPlayerPower(0);
    setDealerPower(0);

    if (soundEnabled) AudioManager.playHand();

    // Calculate player power (one-time calculation per battle, no need for memoization)
    const playerTotal = cards.reduce((sum, c) => sum + (c.power || 0), 0);
    // Use JC's deck for dealer cards
    const available = jcNfts;

    devLog('🎮 BATTLE DEBUG:');
    devLog('  JC available cards:', available.length);
    devLog('  JC deck loading status:', jcNftsLoading);
    devLog('  AI difficulty:', difficulty);
    if (available.length > 0) {
      // 🚀 Performance: Use pre-sorted memoized array
      devLog('  Top 5 strongest:', sortedJcNfts.slice(0, 5).map(c => ({ tokenId: c.tokenId, power: c.power, rarity: c.rarity })));
      devLog('  Bottom 5 weakest:', sortedJcNfts.slice(-5).map(c => ({ tokenId: c.tokenId, power: c.power, rarity: c.rarity })));
    }

    if (available.length < HAND_SIZE) {
      devLog('! Mecha George Floyd deck not loaded yet - retrying in 2 seconds...');

      // Auto-retry after 2 seconds if deck not loaded
      if (!jcNftsLoading) {
        setTimeout(() => {
          devLog('🔄 Retrying battle after waiting for deck to load...');
          playHand(cards, difficulty); // Fix: pass parameters to preserve selected difficulty
        }, 2000);
      }

      setIsBattling(false);
      setShowBattleScreen(false);
      alert('Loading AI deck... Please try again in a moment.');
      return;
    }

    // 🚀 Performance: Use pre-sorted memoized array instead of sorting again
    const sorted = sortedJcNfts;

    devLog('🎲 AI DECK SELECTION DEBUG:');
    devLog('  Available cards:', available.length);
    devLog('  Sorted top 5:', sorted.slice(0, 5).map(c => `#${c.tokenId} (${c.power} PWR)`));
    devLog('  Difficulty:', difficulty);

    let pickedDealer: any[] = [];

    // Different strategies based on difficulty (5 levels)
    // Power-based ranges (actual unique values: 15, 18, 21, 38, 45, 53, 60, 72, 84, 150, 180, 225)
    switch (difficulty) {
      case 'gey':
        // GEY (Level 1): Weakest (15 PWR only), total = 75 PWR
        const weakest = sorted.filter(c => (c.power || 0) === 15);
        pickedDealer = weakest.sort(() => Math.random() - 0.5).slice(0, HAND_SIZE);
        devLog('~ GEY: 15 PWR only');
        devLog('  Available:', weakest.length);
        devLog('  Picked 5:', pickedDealer.map(c => `#${c.tokenId} (${c.power} PWR)`));
        devLog('  Total PWR:', pickedDealer.reduce((sum, c) => sum + (c.power || 0), 0));
        break;

      case 'goofy':
        // GOOFY (Level 2): Weak (18-21 PWR), total ~90-105 PWR
        const weak = sorted.filter(c => {
          const p = c.power || 0;
          return p === 18 || p === 21;
        });
        if (weak.length >= HAND_SIZE) {
          pickedDealer = weak.sort(() => Math.random() - 0.5).slice(0, HAND_SIZE);
        } else {
          // Fallback: expand to include nearby power values (15-38 range)
          devLog('  ! Not enough 18-21 PWR cards, using expanded range');
          const weakExpanded = sorted.filter(c => {
            const p = c.power || 0;
            return p >= 18 && p <= 38;
          });
          pickedDealer = weakExpanded.sort(() => Math.random() - 0.5).slice(0, HAND_SIZE);
        }
        devLog('∿ GOOFY: 18-21 PWR');
        devLog('  Available:', weak.length);
        devLog('  Picked 5:', pickedDealer.map(c => `#${c.tokenId} (${c.power} PWR)`));
        devLog('  Total PWR:', pickedDealer.reduce((sum, c) => sum + (c.power || 0), 0));
        break;

      case 'gooner':
        // GOONER (Level 3): Medium (60-72 PWR), total ~300-360 PWR
        const medium = sorted.filter(c => {
          const p = c.power || 0;
          return p === 60 || p === 72;
        });
        pickedDealer = medium.sort(() => Math.random() - 0.5).slice(0, HAND_SIZE);
        devLog('† GOONER: 60-72 PWR');
        devLog('  Available:', medium.length);
        devLog('  Picked 5:', pickedDealer.map(c => `#${c.tokenId} (${c.power} PWR)`));
        devLog('  Total PWR:', pickedDealer.reduce((sum, c) => sum + (c.power || 0), 0));
        break;

      case 'gangster':
        // GANGSTER (Level 4): Strong legendaries (150 PWR only, total 750)
        // Filter cards with exactly 150 power
        const cards150 = sorted.filter(c => (c.power || 0) === 150);
        devLog('‡ GANGSTER DEBUG:');
        devLog('  Total cards in sorted:', sorted.length);
        devLog('  Cards with 150 PWR:', cards150.length);
        if (cards150.length > 0) {
          devLog('  First 3 cards with 150 PWR:', cards150.slice(0, 3).map(c => `#${c.tokenId} (${c.power} PWR, ${c.rarity})`));
        }

        if (cards150.length >= HAND_SIZE) {
          // Randomize to add variety
          pickedDealer = cards150.sort(() => Math.random() - 0.5).slice(0, HAND_SIZE);
          devLog('  ✓ Picked', HAND_SIZE, 'random cards from 150 PWR pool');
        } else {
          // Fallback: pick legendaries
          devLog('  ! Not enough 150 PWR cards, using legendaries fallback');
          const legendaries = sorted.filter(c => {
            const r = (c.rarity || '').toLowerCase();
            return r.includes('legend');
          });
          devLog('  Legendaries found:', legendaries.length);
          pickedDealer = legendaries.slice(0, HAND_SIZE);
        }
        devLog('‡ GANGSTER FINAL:', pickedDealer.length, 'cards picked');
        devLog('  Cards:', pickedDealer.map(c => `#${c.tokenId} (${c.power} PWR)`));
        devLog('  Total PWR:', pickedDealer.reduce((sum, c) => sum + (c.power || 0), 0));
        break;

      case 'gigachad':
        // GIGACHAD (Level 5): TOP 5 STRONGEST (always same cards, total ~855)
        pickedDealer = sorted.slice(0, HAND_SIZE);
        devLog('§ GIGACHAD picked top 5:', pickedDealer.map(c => `#${c.tokenId} (${c.power} PWR)`));
        devLog('§ GIGACHAD total PWR:', pickedDealer.reduce((sum, c) => sum + (c.power || 0), 0));
        break;
    }

    setTimeout(() => {
      // Use orderedOpponentCards if elimination mode, otherwise use pickedDealer
      setDealerCards(battleMode === 'elimination' ? orderedOpponentCards : pickedDealer);
      if (soundEnabled) AudioManager.shuffle();
    }, 1000);

    const dealerTotal = pickedDealer.reduce((sum, c) => sum + (c.power || 0), 0);

    // Check if this is elimination mode
    if (battleMode === 'elimination') {
      // Elimination mode: play round-by-round
      setTimeout(() => {
        // Compare current round's cards
        const playerCard = orderedPlayerCards[currentRound - 1];
        const opponentCard = orderedOpponentCards[currentRound - 1];

        if (!playerCard || !opponentCard) {
          devError('✗ Missing cards for elimination round!');
          return;
        }

        setPlayerPower(playerCard.power || 0);
        setDealerPower(opponentCard.power || 0);

        setBattlePhase('clash');
        if (soundEnabled) AudioManager.cardBattle();
      }, 2500);

      setTimeout(() => {
        const playerCard = orderedPlayerCards[currentRound - 1];
        const opponentCard = orderedOpponentCards[currentRound - 1];
        const playerCardPower = playerCard?.power || 0;
        const opponentCardPower = opponentCard?.power || 0;

        setBattlePhase('result');

        let roundResult: 'win' | 'loss' | 'tie';
        let newPlayerScore = eliminationPlayerScore;
        let newOpponentScore = eliminationOpponentScore;

        if (playerCardPower > opponentCardPower) {
          roundResult = 'win';
          newPlayerScore++;
          setResult(t('playerWins'));
        } else if (playerCardPower < opponentCardPower) {
          roundResult = 'loss';
          newOpponentScore++;
          setResult(t('dealerWins'));
        } else {
          roundResult = 'tie';
          setResult(t('tie'));
        }

        setEliminationPlayerScore(newPlayerScore);
        setEliminationOpponentScore(newOpponentScore);
        setRoundResults([...roundResults, roundResult]);

        devLog(`✦ Round ${currentRound} result:`, roundResult, `Score: ${newPlayerScore}-${newOpponentScore}`);

        // Check if match is over
        setTimeout(() => {
          const isMatchOver = currentRound === 5 || newPlayerScore === 3 || newOpponentScore === 3;

          if (isMatchOver) {
            // Determine final winner
            const finalResult: 'win' | 'loss' | 'tie' = newPlayerScore > newOpponentScore ? 'win' : newPlayerScore < newOpponentScore ? 'loss' : 'tie';

            if (finalResult === 'win') {
              setResult(t('playerWins'));
              // Unlock next difficulty
              const unlockedDiff = unlockNextDifficulty(difficulty);
              if (unlockedDiff) {
                devLog(`🔓 Unlocked new difficulty: ${unlockedDiff.toUpperCase()}`);
              }
            } else if (finalResult === 'loss') {
              setResult(t('dealerWins'));
            } else {
              setResult(t('tie'));
            }

            // Award economy coins and record match, then show popup
            (async () => {
              let coinsEarned = 0;

              if (userProfile && address) {
                try {
                  // Award economy coins for PvE Elimination
                  const reward = await awardPvECoins({
                    address,
                    difficulty: eliminationDifficulty,
                    language: lang,
                    won: finalResult === 'win'
                  });
                  coinsEarned = reward?.awarded || 0;
                  if (coinsEarned > 0) {
                    devLog(`💰 Elimination Mode: Awarded ${coinsEarned} $TESTVBMS`, reward);
                  }

                  // Record match with coins earned
                  await ConvexProfileService.recordMatch(
                    address,
                    'pve',
                    finalResult,
                    newPlayerScore,
                    newOpponentScore,
                    orderedPlayerCards,
                    orderedOpponentCards,
                    undefined,
                    undefined,
                    coinsEarned, // coinsEarned
                    0, // entryFeePaid (PvE is free)
                    eliminationDifficulty // difficulty
                  );

                  ConvexProfileService.getMatchHistory(address, 20).then(setMatchHistory);
                } catch (err) {
                  devError('✗ Error awarding PvE coins (Elimination):', err);
                }
              }

              // ✅ FIX: Set battle result BEFORE closing battle screen
              // This ensures the popup shows the correct coins earned
              setLastBattleResult({
                result: finalResult,
                playerPower: newPlayerScore,
                opponentPower: newOpponentScore,
                opponentName: 'Mecha George Floyd',
                type: 'pve',
                coinsEarned,
                playerPfpUrl: userProfile?.twitterProfileImageUrl,
                opponentPfpUrl: undefined, // PvE opponent has no PFP
              });

              // Set pending reward to show RewardChoiceModal after victory/defeat screen
              if (coinsEarned > 0) {
                setPendingReward({
                  amount: coinsEarned,
                  source: 'pve'
                });
              }

              // Close battle first
              setTimeout(() => {
                setIsBattling(false);
                setShowBattleScreen(false);
                setBattlePhase('cards');
                setBattleMode('normal');
                setEliminationPhase(null);

                // Show result popup after closing battle
                setTimeout(() => {
                  if (finalResult === 'win') {
                    showVictory();
                  } else if (finalResult === 'loss') {
                    setShowLossPopup(true);
                    if (soundEnabled) AudioManager.lose();
                  } else {
                    setShowTiePopup(true);
                    if (soundEnabled) AudioManager.tie();
                  }
                }, 100);
              }, 2000);
            })();
          } else {
            // Next round
            setTimeout(() => {
              setCurrentRound(currentRound + 1);
              setBattlePhase('cards');

              // Trigger next round battle sequence
              setTimeout(() => {
                const nextPlayerCard = orderedPlayerCards[currentRound]; // currentRound is still old value here
                const nextOpponentCard = orderedOpponentCards[currentRound];

                setPlayerPower(nextPlayerCard?.power || 0);
                setDealerPower(nextOpponentCard?.power || 0);

                setBattlePhase('clash');
                if (soundEnabled) AudioManager.cardBattle();

                setTimeout(() => {
                  setBattlePhase('result');
                }, 1000);
              }, 1000);
            }, 2000);
          }
        }, 2000);
      }, 3500);

      return; // Skip normal battle logic
    }

    // Normal mode battle logic
    setTimeout(() => {
      setBattlePhase('clash');
      if (soundEnabled) AudioManager.cardBattle();
    }, 2500);

    setTimeout(() => {
      setPlayerPower(playerTotal);
      setDealerPower(dealerTotal);
      setBattlePhase('result');
    }, 3500);

    setTimeout(() => {
      devLog('🎮 RESULTADO:', { playerTotal, dealerTotal });

      let matchResult: 'win' | 'loss' | 'tie';

      if (playerTotal > dealerTotal) {
        devLog('✓ JOGADOR VENCEU!');
        matchResult = 'win';
        setResult(t('playerWins'));

        // Unlock next difficulty on win
        const unlockedDiff = unlockNextDifficulty(difficulty);
        if (unlockedDiff) {
          devLog(`🔓 Unlocked new difficulty: ${unlockedDiff.toUpperCase()}`);
        }
      } else if (playerTotal < dealerTotal) {
        devLog('✗ DEALER VENCEU!');
        matchResult = 'loss';
        setResult(t('dealerWins'));
      } else {
        devLog('TIE!');
        matchResult = 'tie';
        setResult(t('tie'));
      }

      // Award economy coins and record PvE match, then show popup
      (async () => {
        let coinsEarned = 0;

        if (userProfile && address) {
          try {
            // Award economy coins for PvE
            devLog(`🎯 PvE Difficulty: ${aiDifficulty}`); // Debug log
            const reward = await awardPvECoins({
              address,
              difficulty: aiDifficulty,
              language: lang,
              won: matchResult === 'win'
            });
            coinsEarned = reward?.awarded || 0;
            if (coinsEarned > 0) {
              devLog(`💰 PvE ${aiDifficulty}: Awarded ${coinsEarned} $TESTVBMS`, reward);
            }

            // Record match with coins earned
            await ConvexProfileService.recordMatch(
              address,
              'pve',
              matchResult,
              playerTotal,
              dealerTotal,
              cards,
              pickedDealer,
              undefined,
              undefined,
              coinsEarned, // coinsEarned
              0, // entryFeePaid (PvE is free)
              aiDifficulty // difficulty
            );

            // Reload match history
            ConvexProfileService.getMatchHistory(address, 20).then(setMatchHistory);
          } catch (err) {
            devError('✗ Error awarding PvE coins:', err);
          }
        }

        // ✅ FIX: Set battle result BEFORE closing battle screen
        // This ensures the popup shows the correct coins earned
        setLastBattleResult({
          result: matchResult,
          playerPower: playerTotal,
          opponentPower: dealerTotal,
          opponentName: 'Mecha George Floyd',
          type: 'pve',
          coinsEarned,
          playerPfpUrl: userProfile?.twitterProfileImageUrl,
          opponentPfpUrl: undefined, // PvE opponent has no PFP
        });

        // Set pending reward to show RewardChoiceModal after victory/defeat screen
        if (coinsEarned > 0) {
          setPendingReward({
            amount: coinsEarned,
            source: 'pve'
          });
        }

        // Fecha a tela de batalha PRIMEIRO
        setTimeout(() => {
          setIsBattling(false);
          setShowBattleScreen(false);
          setBattlePhase('cards');

          // Mostra popup DEPOIS de fechar batalha
          setTimeout(() => {
            if (matchResult === 'win') {
              showVictory();
            } else if (matchResult === 'loss') {
              setShowLossPopup(true);
              if (soundEnabled) AudioManager.lose();
            } else {
              setShowTiePopup(true);
              if (soundEnabled) AudioManager.tie();
            }
          }, 100);
        }, 2000);
      })();
    }, 4500);
  }, [selectedCards, nfts, t, soundEnabled, isBattling, aiDifficulty, address, userProfile]);

  const saveDefenseDeck = useCallback(async () => {
    if (!address || !userProfile || selectedCards.length !== HAND_SIZE) return;

    try {
      // ✓ Verify profile exists in Convex first
      devLog('🔍 Verifying profile exists...');
      const existingProfile = await ConvexProfileService.getProfile(address);
      if (!existingProfile) {
        devError('✗ Profile not found in Convex!');
        alert('Error: Your profile was not found. Please create a profile first.');
        return;
      }
      devLog('✓ Profile verified:', existingProfile.username);

      // ✓ Validate all cards have required data
      const invalidCards = selectedCards.filter(card =>
        !card.tokenId ||
        typeof card.power !== 'number' ||
        isNaN(card.power) ||
        !card.imageUrl ||
        card.imageUrl === 'undefined' ||
        card.imageUrl === ''
      );

      if (invalidCards.length > 0) {
        devError('✗ Invalid cards detected:', invalidCards);
        alert(`Error: ${invalidCards.length} card(s) have invalid data (missing image or power). Please refresh the page and try again.`);
        return;
      }

      // ✓ MUDANÇA: Salvar objetos completos ao invés de apenas tokenIds
      const defenseDeckData = selectedCards.map(card => {
        const hasFoil = card.foil && card.foil !== 'None' && card.foil !== '';
        return {
          tokenId: String(card.tokenId),
          power: Number(card.power) || 0,
          imageUrl: String(card.imageUrl),
          name: card.name || `Card #${card.tokenId}`,
          rarity: card.rarity || 'Common',
          foil: hasFoil ? String(card.foil) : undefined,
        };
      });

      devLog('💾 Saving defense deck:', {
        address,
        cardCount: defenseDeckData.length,
        cards: defenseDeckData.map(c => ({
          tokenId: c.tokenId,
          power: c.power,
          foil: c.foil,
          imageUrl: c.imageUrl.substring(0, 50) + '...'
        }))
      });

      // ✓ Try to save with retry logic
      let saveSuccess = false;
      let lastError: any = null;

      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          setDefenseDeckSaveStatus(`Saving... (Attempt ${attempt}/3)`);
          devLog(`📡 Attempt ${attempt}/3 to save defense deck...`);
          await ConvexProfileService.updateDefenseDeck(address, defenseDeckData);
          devLog(`✓ Defense deck saved successfully on attempt ${attempt}`);
          saveSuccess = true;
          setDefenseDeckSaveStatus('');
          break;
        } catch (err: any) {
          lastError = err;
          devError(`✗ Attempt ${attempt}/3 failed:`, err);

          // If it's the last attempt, throw
          if (attempt === 3) {
            setDefenseDeckSaveStatus('');
            throw err;
          }

          // Wait before retry (exponential backoff)
          setDefenseDeckSaveStatus(`Retrying in ${attempt} second(s)...`);
          await new Promise(resolve => setTimeout(resolve, attempt * 1000));
        }
      }

      if (saveSuccess) {
        if (soundEnabled) AudioManager.buttonSuccess();
        setShowDefenseDeckSaved(true);

        // Hide success message after 3 seconds
        setTimeout(() => {
          setShowDefenseDeckSaved(false);
        }, 3000);

        // Reload profile to get updated defense deck
        const updatedProfile = await ConvexProfileService.getProfile(address);
        if (updatedProfile) {
          setUserProfile(updatedProfile);
        }
      }
    } catch (error: any) {
      devError('Error saving defense deck:', error);

      // More helpful error message
      const errorMsg = error?.message || String(error);
      if (errorMsg.includes('Server Error') || errorMsg.includes('Request ID')) {
        alert('Error: Convex server error. This might be temporary. Please wait a few seconds and try again.');
      } else if (errorMsg.includes('Profile not found')) {
        alert('Error: Your profile was not found. Please refresh the page and try again.');
      } else {
        alert(`Error saving defense deck: ${errorMsg}\n\nPlease try again or refresh the page.`);
      }
    }
  }, [address, userProfile, selectedCards, soundEnabled]);

  const totalPower = useMemo(() =>
    selectedCards.reduce((sum, c) => sum + (c.power || 0), 0),
    [selectedCards]
  );

  // 🚀 Performance: Filter by card type (FREE/NFT), collection, and sort
  const filteredAndSortedNfts = useMemo(() => {
    let filtered = nfts;

    // Apply type filter
    if (cardTypeFilter === 'free') {
      filtered = nfts.filter(card => card.badgeType === 'FREE_CARD');
    } else if (cardTypeFilter === 'nft') {
      filtered = nfts.filter(card => card.badgeType !== 'FREE_CARD');

    // Apply collection filter (if any collections are selected)
    if (selectedCollections.length > 0) {
      filtered = filterCardsByCollections(filtered, selectedCollections);
    }
    }

    // Apply sort
    if (!sortByPower) return filtered;
    return [...filtered].sort((a, b) => (b.power || 0) - (a.power || 0));
  }, [nfts, sortByPower, cardTypeFilter, selectedCollections, sortedNfts]);

  const totalPages = Math.ceil(filteredAndSortedNfts.length / CARDS_PER_PAGE);

  const displayNfts = useMemo(() => {
    const start = (currentPage - 1) * CARDS_PER_PAGE;
    const end = start + CARDS_PER_PAGE;
    return filteredAndSortedNfts.slice(start, end);
  }, [filteredAndSortedNfts, currentPage, CARDS_PER_PAGE]);

  useEffect(() => {
    setCurrentPage(1);
  }, [sortByPower, cardTypeFilter, nfts.length]);

  // 🔒 Sorted NFTs for attack modal (show locked cards but mark them)
  const sortedAttackNfts = useMemo(() => {
    if (!sortAttackByPower) return nfts;
    return [...nfts].sort((a, b) => (b.power || 0) - (a.power || 0));
  }, [nfts, sortAttackByPower]);

  // Helper to check if card is locked
  const isCardLocked = (tokenId: string, mode: 'attack' | 'pvp') => {
    const lockedCards = mode === 'attack' ? attackLockedCards : pvpLockedCards;
    return (lockedCards?.lockedTokenIds as string[] | undefined)?.includes(tokenId) || false;
  };

  // Sorted NFTs for PvE modal (PvE allows defense cards - NO lock)
  const sortedPveNfts = useMemo(() => {
    if (!pveSortByPower) return nfts;
    return [...nfts].sort((a, b) => (b.power || 0) - (a.power || 0));
  }, [nfts, pveSortByPower]);

  // Convex Room Listener - Escuta mudanças na sala em tempo real
  useEffect(() => {
    if (pvpMode === 'inRoom' && roomCode) {
      // Reset battle flag when entering a new room to prevent stale state from previous battles
      pvpBattleStarted.current = false;
      pvpProcessedBattles.current.clear(); // Clear processed battles set for new room
      devLog('🔄 Reset pvpBattleStarted to false for new room');
      devLog('🎧 Convex listener started for room:', roomCode);

      let hasSeenRoom = false; // Flag para rastrear se já vimos a sala pelo menos uma vez
      let battleProcessing = false; // Local flag to prevent concurrent battle starts within same listener

      const unsubscribe = ConvexPvPService.watchRoom(roomCode, async (room) => {
        if (room) {
          hasSeenRoom = true; // Marca que vimos a sala
          // Check if players are ready (Convex: ready = has cards)
          const hostReady = !!room.hostCards && room.hostCards.length > 0;
          const guestReady = !!room.guestCards && room.guestCards.length > 0;

          devLog('🔄 Room update received:', {
            hostReady,
            guestReady,
            roomStatus: room.status,
            pvpBattleStarted: pvpBattleStarted.current,
            battleProcessing
          });
          setCurrentRoom(room);

          // Se ambos os jogadores estiverem prontos, inicia a batalha
          // Só inicia quando status é 'playing' (após ambos submeterem cartas)
          if (hostReady && guestReady && room.status === 'playing') {
            // Create unique battle ID to prevent duplicate processing
            const battleId = `${room.roomId}_${room.hostPower}_${room.guestPower}_${room.startedAt || Date.now()}`;

            // Check if this battle has already been processed
            if (pvpProcessedBattles.current.has(battleId)) {
              devLog('! Battle already processed, skipping:', battleId);
              return; // Skip if already processed
            }

            // Mark this battle as processed IMMEDIATELY (before any async operations)
            pvpProcessedBattles.current.add(battleId);
            pvpBattleStarted.current = true;
            battleProcessing = true;
            devLog('✓ Ambos jogadores prontos! Iniciando batalha única:', battleId);

            // Pay entry fee only for ranked matches (casual is free)
            const isRanked = room.mode === 'ranked' || room.mode === undefined; // Default to ranked for legacy rooms
            if (isRanked) {
              try {
                await payEntryFee({ address: address || '', mode: 'pvp' });
                devLog('💰 PvP entry fee paid: 20 $TESTVBMS (ranked match)');
              } catch (error: any) {
                devError('❌ Failed to pay PvP entry fee:', error);
                // Continue with battle even if payment fails (already committed to battle)
              }
            } else {
              devLog('🎮 Casual match - no entry fee required');
            }

            // Determina quem é o jogador local e quem é o oponente
            const isHost = room.hostAddress === address?.toLowerCase();
            const playerCards = isHost ? (room.hostCards || []) : (room.guestCards || []);
            const opponentCards = isHost ? (room.guestCards || []) : (room.hostCards || []);
            const playerPower = isHost ? (room.hostPower || 0) : (room.guestPower || 0);
            const opponentPower = isHost ? (room.guestPower || 0) : (room.hostPower || 0);
            const opponentAddress = isHost ? room.guestAddress : room.hostAddress;
            const opponentName = isHost ? (room.guestUsername || 'Guest') : (room.hostUsername || 'Host');
            const playerName = isHost ? (room.hostUsername || 'You') : (room.guestUsername || 'You');

            // Busca perfil do oponente para pegar Twitter
            let opponentTwitter = undefined;
            let opponentPfpUrl = undefined;
            if (opponentAddress) {
              try {
                const opponentProfile = await ConvexProfileService.getProfile(opponentAddress);
                opponentTwitter = opponentProfile?.twitter;
                opponentPfpUrl = opponentProfile?.twitterProfileImageUrl;
                devLog('Opponent profile loaded:', opponentProfile?.username, 'twitter:', opponentTwitter);
              } catch (e) {
                devLog('Failed to load opponent profile:', e);
              }
            }

            // Executa a batalha PvP com animações (igual PVE)
            setIsBattling(true);
            setShowBattleScreen(true);
            setBattlePhase('cards');
            setBattleOpponentName(opponentName); // Show PvP opponent username
            setBattlePlayerName(playerName); // Show player username
            // Opponent pfp from Twitter if available
            setBattleOpponentPfp(getAvatarUrl(opponentTwitter));
            // Player pfp from Twitter if available
            setBattlePlayerPfp(getAvatarUrl(userProfile ? { twitter: userProfile.twitter, twitterProfileImageUrl: userProfile.twitterProfileImageUrl } : null));
            setShowLossPopup(false);
            setShowWinPopup(false);
            setResult('');
            setPlayerPower(0);
            setDealerPower(0);

            if (soundEnabled) AudioManager.playHand();

            // Mostra cartas do oponente (como "dealer")
            setTimeout(() => {
              setDealerCards(opponentCards);
              if (soundEnabled) AudioManager.shuffle();
            }, 1000);

            // Fase de clash - cartas batem
            setTimeout(() => {
              setBattlePhase('clash');
              if (soundEnabled) AudioManager.cardBattle();
            }, 2500);

            // Mostra poderes
            setTimeout(() => {
              setPlayerPower(playerPower);
              setDealerPower(opponentPower);
              setBattlePhase('result');
            }, 3500);

            // Mostra resultado final
            setTimeout(() => {
              const playerWins = playerPower > opponentPower;
              const isDraw = playerPower === opponentPower;

              let matchResult: 'win' | 'loss' | 'tie';

              if (playerWins) {
                matchResult = 'win';
                setResult(t('playerWins'));
              } else if (isDraw) {
                matchResult = 'tie';
                setResult(t('tie'));
              } else {
                matchResult = 'loss';
                setResult(t('dealerWins'));
              }

              // Award economy coins and record PvP match, then show popup
              (async () => {
                let coinsEarned = 0;

                if (userProfile && address) {
                  try {
                    // ✅ Award economy coins for ranked PvP only (casual is free)
                    if (isRanked) {
                      const reward = await awardPvPCoins({
                        address,
                        won: matchResult === 'win',
                        language: lang,
                        opponentAddress: opponentAddress // ✅ Pass opponent for ranking bonus
                      });
                      coinsEarned = reward?.awarded || 0;
                      if (coinsEarned > 0) {
                        devLog(`💰 PvP: Awarded ${coinsEarned} $TESTVBMS`, reward);
                        if (reward?.bonuses && reward.bonuses.length > 0) {
                          devLog(`🎁 Bonuses: ${reward.bonuses.join(', ')}`);
                        }
                      }
                    } else {
                      devLog('🎮 Casual match - no coins awarded');
                    }

                    // Record match with coins earned and entry fee paid
                    await ConvexProfileService.recordMatch(
                      address,
                      'pvp',
                      matchResult,
                      playerPower,
                      opponentPower,
                      playerCards,
                      opponentCards,
                      opponentAddress,
                      opponentName,
                      coinsEarned, // coinsEarned (0 for casual)
                      isRanked ? 20 : 0 // entryFeePaid (20 for ranked, 0 for casual)
                    );

                    ConvexProfileService.getMatchHistory(address, 20).then(setMatchHistory);

                    // 🔔 Send notification to defender (opponent)
                    fetch('/api/notifications/send', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        type: 'defense_attacked',
                        data: {
                          defenderAddress: opponentAddress,
                          defenderUsername: opponentName || 'Unknown',
                          attackerUsername: userProfile.username || 'Unknown',
                          result: matchResult === 'win' ? 'lose' : 'win', // Inverted: attacker wins = defender loses
                          coinsChange: coinsEarned, // Attacker's coin change (positive = won coins, negative = lost coins)
                        },
                      }),
                    }).catch(err => devError('Error sending notification:', err));
                  } catch (err) {
                    devError('✗ Error awarding PvP coins:', err);
                  }
                }

                // Fecha a tela de batalha PRIMEIRO
                setTimeout(() => {
                  setIsBattling(false);
                  setShowBattleScreen(false);
                  setBattlePhase('cards');

                  // Set last battle result for sharing
                  setLastBattleResult({
                    result: matchResult,
                    playerPower: playerPower,
                    opponentPower: opponentPower,
                    opponentName: opponentName,
                    opponentTwitter: opponentTwitter,
                    type: 'pvp',
                    coinsEarned,
                    playerPfpUrl: userProfile?.twitterProfileImageUrl,
                    opponentPfpUrl: opponentPfpUrl,
                  });

                  // Set pending reward to show RewardChoiceModal after victory/defeat screen
                  if (coinsEarned > 0) {
                    setPendingReward({
                      amount: coinsEarned,
                      source: 'pvp'
                    });
                  }

                  // Mostra popup DEPOIS de fechar batalha
                  setTimeout(() => {
                    if (matchResult === 'win') {
                      showVictory();
                    } else if (matchResult === 'loss') {
                      setShowLossPopup(true);
                      if (soundEnabled) AudioManager.lose();
                    } else {
                      setShowTiePopup(true);
                      if (soundEnabled) AudioManager.tie();
                    }
                  }, 100);

                  // Reset battle flag immediately so player can start new match without waiting
                  pvpBattleStarted.current = false;
                  battleProcessing = false; // Also reset local flag
                  devLog('🔄 Battle ended, reset pvpBattleStarted immediately');
                  // Fecha a sala PVP e volta ao menu após ver o resultado
                  setTimeout(async () => {
                    // Deleta a sala do Convex se for o host
                    if (currentRoom && roomCode && address && address.toLowerCase() === currentRoom.hostAddress) {
                      try {
                        await ConvexPvPService.leaveRoom(roomCode, address);
                        devLog('✓ Room deleted after battle ended');
                      } catch (err) {
                        devError('✗ Error deleting room:', err);
                      }
                    }

                    setPvpMode(null);
                    setGameMode(null);
                    setRoomCode('');
                    setCurrentRoom(null);
                    setSelectedCards([]);
                    setDealerCards([]); // Clear dealer cards
                    pvpBattleStarted.current = false; // Reset battle flag
                  }, 5000);
                }, 2000);
              })();
            }, 3500);
          }
        } else {
          // Sala não existe - só volta ao menu se já vimos a sala antes (foi deletada)
          // Se nunca vimos, pode estar sendo criada ainda (race condition)
          if (hasSeenRoom) {
            devLog('! Sala foi deletada, voltando ao menu');
            setPvpMode('pvpMenu');
            setRoomCode('');
            setCurrentRoom(null);
          } else {
            devLog('Aguardando sala ser criada...');
          }
        }
      });

      return () => {
        unsubscribe();
      };
    }
  }, [pvpMode, roomCode, address, soundEnabled]);

  // Auto Match Listener - Detecta quando uma sala é criada para o jogador
  useEffect(() => {
    if (pvpMode === 'autoMatch' && isSearching && address) {
      devLog('🔍 Starting matchmaking listener for:', address);

      const unsubscribe = ConvexPvPService.watchMatchmaking(address, (roomCode) => {
        if (roomCode) {
          devLog('✓ Match found! Room:', roomCode);
          setRoomCode(roomCode);
          setPvpMode('inRoom');
          setIsSearching(false);
        } else {
          devLog('! Matchmaking cancelled or failed');
          setIsSearching(false);
          setPvpMode('pvpMenu');
        }
      });

      // ConvexPvPService já cuida do polling internamente, não precisa de heartbeat manual
      return () => {
        devLog('🛑 Stopping matchmaking listener');
        unsubscribe();
      };
    }
  }, [pvpMode, isSearching, address]);

  // Farcaster SDK - Call ready() when app loads
  useEffect(() => {
    const initFarcasterSDK = async () => {
      try {
        await sdk.actions.ready();
        devLog('✓ Farcaster SDK ready called');
      } catch (error) {
        devError('✗ Error calling Farcaster ready:', error);
      }
    };

    initFarcasterSDK();
  }, []);

  // Load user profile when wallet connects
  useEffect(() => {
    if (address) {
      setIsLoadingProfile(true);
      ConvexProfileService.getProfile(address).then((profile) => {
        setUserProfile(profile);
        setIsLoadingProfile(false);

        // Only show create profile if profile is actually null (not exists in DB)
        if (!profile) {
          devLog('🆕 New user detected - forcing profile creation');
          setShowCreateProfile(true);
        } else {
          setShowCreateProfile(false);
        }

        // Load match history
        if (profile) {
          ConvexProfileService.getMatchHistory(address, 20).then(setMatchHistory);
        }
      });
    } else {
      setUserProfile(null);
      setMatchHistory([]);
      setShowCreateProfile(false);
    }
  }, [address]);

  // Load missions when address changes
  useEffect(() => {
    if (address) {
      loadMissions();
    }
  }, [address]);

  // Helper function to get mission info
  const getMissionInfo = (missionType: string) => {
    const missionData: Record<string, { icon: string; title: string; description: string }> = {
      daily_login: {
        icon: '/images/icons/mission.svg',
        title: 'Daily Login',
        description: 'Login bonus for today',
      },
      first_pve_win: {
        icon: '/images/icons/victory.svg',
        title: 'First PvE Victory',
        description: 'Win your first PvE battle today',
      },
      first_pvp_match: {
        icon: '/images/icons/battle.svg',
        title: 'First PvP Match',
        description: 'Complete your first PvP match today',
      },
      streak_3: {
        icon: '/images/icons/achievement.svg',
        title: '3-Win Streak',
        description: 'Win 3 matches in a row',
      },
      streak_5: {
        icon: '/images/icons/achievement.svg',
        title: '5-Win Streak',
        description: 'Win 5 matches in a row',
      },
      streak_10: {
        icon: '/images/icons/achievement.svg',
        title: '10-Win Streak',
        description: 'Win 10 matches in a row',
      },
      welcome_gift: {
        icon: '/images/icons/coins.svg',
        title: 'Welcome Gift',
        description: 'Welcome to Vibe Most Wanted!',
      },
    };

    return missionData[missionType] || {
      icon: '/images/icons/help.svg',
      title: 'Unknown Mission',
      description: missionType,
    };
  };

  // Function to load missions
  const loadMissions = async () => {
    if (!address) return;

    setIsLoadingMissions(true);
    try {
      // Get completed missions from database
      const playerMissions = await convex.query(api.missions.getPlayerMissions, {
        playerAddress: address,
      });

      // Define all possible missions
      const allMissionTypes = [
        { type: 'daily_login', reward: 25, date: 'today' },
        { type: 'first_pve_win', reward: 50, date: 'today' },
        { type: 'first_pvp_match', reward: 100, date: 'today' },
        { type: 'streak_3', reward: 150, date: 'today' },
        { type: 'streak_5', reward: 300, date: 'today' },
        { type: 'streak_10', reward: 750, date: 'today' },
        { type: 'welcome_gift', reward: 500, date: 'once' },
      ];

      // Merge with existing missions from DB
      const completeMissionsList = allMissionTypes.map((missionDef) => {
        const existingMission = (playerMissions || []).find(
          (m: any) => m.missionType === missionDef.type
        );

        if (existingMission) {
          return existingMission; // Return actual mission from DB
        } else {
          // Return placeholder for locked mission
          return {
            _id: `placeholder_${missionDef.type}`,
            missionType: missionDef.type,
            completed: false,
            claimed: false,
            reward: missionDef.reward,
            date: missionDef.date,
          };
        }
      });

      setMissions(completeMissionsList);
      devLog('📋 Loaded missions:', completeMissionsList);
    } catch (error) {
      devError('Error loading missions:', error);

      // Fallback: Always show locked missions even on error
      const fallbackMissions = [
        { _id: 'placeholder_daily_login', missionType: 'daily_login', completed: false, claimed: false, reward: 25, date: 'today' },
        { _id: 'placeholder_first_pve_win', missionType: 'first_pve_win', completed: false, claimed: false, reward: 50, date: 'today' },
        { _id: 'placeholder_first_pvp_match', missionType: 'first_pvp_match', completed: false, claimed: false, reward: 100, date: 'today' },
        { _id: 'placeholder_streak_3', missionType: 'streak_3', completed: false, claimed: false, reward: 150, date: 'today' },
        { _id: 'placeholder_streak_5', missionType: 'streak_5', completed: false, claimed: false, reward: 300, date: 'today' },
        { _id: 'placeholder_streak_10', missionType: 'streak_10', completed: false, claimed: false, reward: 750, date: 'today' },
        { _id: 'placeholder_welcome_gift', missionType: 'welcome_gift', completed: false, claimed: false, reward: 500, date: 'once' },
      ];
      setMissions(fallbackMissions);
    } finally {
      setIsLoadingMissions(false);
    }
  };

  // Function to claim individual mission
  const claimMission = async (missionId: string) => {
    if (!address) return;

    // Don't try to claim placeholder missions
    if (missionId.startsWith('placeholder_')) {
      if (soundEnabled) AudioManager.buttonError();
      return;
    }

    setIsClaimingMission(missionId);
    try {
      const result = await convex.mutation(api.missions.claimMission, {
        playerAddress: address,
        missionId: missionId as any,
        language: lang,
      });

      if (soundEnabled) AudioManager.buttonSuccess();
      devLog('✅ Mission claimed:', result);

      // Reload missions and profile
      await loadMissions();
      const updatedProfile = await ConvexProfileService.getProfile(address);
      setUserProfile(updatedProfile);
    } catch (error: any) {
      devError('Error claiming mission:', error);
      if (soundEnabled) AudioManager.buttonError();
      alert(error.message || 'Failed to claim mission');
    } finally {
      setIsClaimingMission(null);
    }
  };

  // Function to claim all missions
  const claimAllMissions = async () => {
    if (!address) return;

    setIsClaimingAll(true);
    try {
      const result = await convex.mutation(api.missions.claimAllMissions, {
        playerAddress: address,
        language: lang,
      });

      if (result && result.claimed > 0) {
        if (soundEnabled) AudioManager.buttonSuccess();
        devLog(`✅ Claimed ${result.claimed} missions (+${result.totalReward} coins)`);

        // Reload missions and profile
        await loadMissions();
        const updatedProfile = await ConvexProfileService.getProfile(address);
        setUserProfile(updatedProfile);
      } else {
        if (soundEnabled) AudioManager.buttonClick();
        alert('No missions to claim!');
      }
    } catch (error: any) {
      devError('Error claiming all missions:', error);
      if (soundEnabled) AudioManager.buttonError();
      alert(error.message || 'Failed to claim missions');
    } finally {
      setIsClaimingAll(false);
    }
  };

  // Auto scroll to play buttons when 5 cards are selected
  useEffect(() => {
    if (selectedCards.length === 5 && playButtonsRef.current) {
      setTimeout(() => {
        playButtonsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    }
  }, [selectedCards.length]);

  // Update profile stats when NFTs change (with mutex to prevent race conditions)
  useEffect(() => {
    // Guard: Skip if update already in progress
    if (updateStatsInProgress.current) {
      devLog('⏸️ Stats update already in progress, skipping...');
      return;
    }

    if (address && userProfile && nfts.length > 0) {
      updateStatsInProgress.current = true;

      // 🚀 Performance: Using pre-computed memoized values
      devLog('📊 Updating profile stats:', { totalCards: nfts.length, openedCards: openedCardsCount, totalPower: totalNftPower, tokenIds: nftTokenIds.length });

      // Update stats and reload profile to show updated values
      ConvexProfileService.updateStats(address, nfts.length, openedCardsCount, unopenedCardsCount, totalNftPower, nftTokenIds)
        .then(() => {
          // Reload profile to get updated stats
          return ConvexProfileService.getProfile(address);
        })
        .then((updatedProfile) => {
          if (updatedProfile) {
            setUserProfile(updatedProfile);
          }
        })
        .catch((error) => {
          devError('Error updating profile stats:', error);
        })
        .finally(() => {
          // Always release the lock
          updateStatsInProgress.current = false;
        });
    }
  }, [address, nfts]); // Removed userProfile to prevent infinite loop

  // Load leaderboard with 30-minute refresh (usando Convex agora! 🚀)
  useEffect(() => {
    const loadLeaderboard = () => {
      ConvexProfileService.getLeaderboard().then(setLeaderboard);
    };

    loadLeaderboard();
    const interval = setInterval(loadLeaderboard, 30 * 60 * 1000); // 30 minutes (sem limites com Convex!)

    return () => clearInterval(interval);
  }, []);

  // Cleanup old rooms and matchmaking entries periodically
  useEffect(() => {
    // Run cleanup immediately on mount
    ConvexPvPService.cleanupOldRooms().catch(err => devError('Cleanup error:', err));

    // Run cleanup every 2 minutes
    const cleanupInterval = setInterval(() => {
      ConvexPvPService.cleanupOldRooms().catch(err => devError('Cleanup error:', err));
    }, 2 * 60 * 1000);

    return () => clearInterval(cleanupInterval);
  }, []);

  // Calculate attacks remaining based on UTC date
  useEffect(() => {
    if (!userProfile || !address) {
      setAttacksRemaining(0);
      return;
    }

    const now = new Date();
    const todayUTC = now.toISOString().split('T')[0]; // YYYY-MM-DD in UTC
    const lastAttackDate = userProfile.lastAttackDate || '';
    const attacksToday = userProfile.attacksToday || 0;

    if (lastAttackDate === todayUTC) {
      // Same day, use existing count
      setAttacksRemaining(Math.max(0, maxAttacks - attacksToday));
    } else {
      // New day detected - just set attacks to max locally
      // Let the backend handle the reset when user makes next attack
      devLog('🆕 New day detected! Attacks reset to max.');
      setAttacksRemaining(maxAttacks);
    }
  }, [userProfile?.lastAttackDate, userProfile?.attacksToday, maxAttacks, address]);

  // Reset tutorial page when tutorial closes
  useEffect(() => {
    if (!showTutorial) {
      setTutorialPage(1);
    }
  }, [showTutorial]);

  // Load defenses received (attacks from other players)
  useEffect(() => {
    if (!address || !userProfile) {
      setDefensesReceived([]);
      setUnreadDefenses(0);
      return;
    }

    // Fetch match history filtering only defenses
    ConvexProfileService.getMatchHistory(address, 20).then((history) => {
      const defenses = history.filter(match => match.type === 'defense');
      setDefensesReceived(defenses);

      // Check localStorage for last seen timestamp
      const lastSeenKey = `defenses_last_seen_${address.toLowerCase()}`;
      const lastSeen = parseInt(localStorage.getItem(lastSeenKey) || '0');

      // Count unread defenses (newer than last seen)
      const unread = defenses.filter(d => d.timestamp > lastSeen).length;
      setUnreadDefenses(unread);
    });
  }, [address, userProfile]);

  return (
    <div className="min-h-screen game-background text-vintage-ice p-4 lg:p-6 overflow-x-hidden relative">
      {/* Ambient floating particles */}
      <div className="fixed inset-0 pointer-events-none z-0">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="floating-particle"
            style={{
              left: `${Math.random() * 100}%`,
              animationDuration: `${15 + Math.random() * 20}s`,
              animationDelay: `${Math.random() * 10}s`,
            }}
          />
        ))}
      </div>

      {/* Content wrapper with z-index */}
      <div className={`relative z-10 ${!isInFarcaster ? 'max-w-7xl mx-auto' : ''}`}>
      {/* Game Popups (Victory, Loss, Tie, Error, Success, Daily Claim, Welcome Pack) */}
      <GamePopups
        showWinPopup={showWinPopup}
        currentVictoryImage={currentVictoryImage}
        isInFarcaster={isInFarcaster}
        lastBattleResult={lastBattleResult}
        userProfile={userProfile}
        soundEnabled={soundEnabled}
        handleCloseVictoryScreen={handleCloseVictoryScreen}
        sharesRemaining={sharesRemaining}
        onShareClick={handleShareClick}
        showLossPopup={showLossPopup}
        handleCloseDefeatScreen={handleCloseDefeatScreen}
        showTiePopup={showTiePopup}
        setShowTiePopup={setShowTiePopup}
        tieGifLoaded={tieGifLoaded}
        errorMessage={errorMessage}
        setErrorMessage={setErrorMessage}
        successMessage={successMessage}
        setSuccessMessage={setSuccessMessage}
        showDailyClaimPopup={showDailyClaimPopup}
        setShowDailyClaimPopup={setShowDailyClaimPopup}
        loginBonusClaimed={loginBonusClaimed}
        isClaimingBonus={isClaimingBonus}
        handleClaimLoginBonus={handleClaimLoginBonus}
        showWelcomePackPopup={showWelcomePackPopup}
        setShowWelcomePackPopup={setShowWelcomePackPopup}
        isClaimingWelcomePack={isClaimingWelcomePack}
        handleClaimWelcomePack={handleClaimWelcomePack}
        t={t}
      />

      {/* Reward Choice Modal */}
      {showRewardChoice && pendingReward && (
        <RewardChoiceModal
          amount={pendingReward.amount}
          source={pendingReward.source}
          onClose={() => {
            setShowRewardChoice(false);
            setPendingReward(null);
          }}
          onChoiceMade={(choice) => {
            devLog(`🎯 Player chose: ${choice} for ${pendingReward.amount} coins`);
          }}
        />
      )}

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        t={t}
        musicEnabled={musicEnabled}
        toggleMusic={toggleMusic}
        musicVolume={musicVolume}
        setMusicVolume={setMusicVolume}
        lang={lang}
        setLang={setLang}
        soundEnabled={soundEnabled}
        musicMode={musicMode}
        setMusicMode={setMusicMode}
        userProfile={userProfile}
        showChangeUsername={showChangeUsername}
        setShowChangeUsername={setShowChangeUsername}
        newUsername={newUsername}
        setNewUsername={setNewUsername}
        isChangingUsername={isChangingUsername}
        setIsChangingUsername={setIsChangingUsername}
        address={address}
        setUserProfile={setUserProfile}
        setErrorMessage={setErrorMessage}
      />

      {/* Elimination Mode - Card Ordering Screen */}
      <EliminationOrderingModal
        isOpen={eliminationPhase === 'ordering'}
        orderedPlayerCards={orderedPlayerCards}
        setOrderedPlayerCards={setOrderedPlayerCards}
        soundEnabled={soundEnabled}
        onStartBattle={() => {
          // Generate AI card order based on difficulty
          const aiCards = generateAIHand(eliminationDifficulty);
          setOrderedOpponentCards(aiCards);

          // Start elimination battle
          setEliminationPhase('battle');
          setCurrentRound(1);
          setRoundResults([]);
          setEliminationPlayerScore(0);
          setEliminationOpponentScore(0);
          setShowBattleScreen(true);
        }}
        onCancel={() => {
          setEliminationPhase(null);
          setBattleMode('normal');
          setShowPveCardSelection(true);
        }}
      />

      {showBattleScreen && (
        <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-[300]">
          <div className="w-full max-w-6xl p-8">
            {/* Title - Different for Elimination Mode */}
            {battleMode === 'elimination' ? (
              <div className="text-center mb-6 md:mb-8">
                <h2 className="text-2xl md:text-4xl font-bold text-purple-400 uppercase tracking-wider mb-2">
                  ✦ ELIMINATION MODE
                </h2>
                <div className="flex items-center justify-center gap-4 md:gap-8 text-lg md:text-2xl font-bold">
                  <span className="text-cyan-400">Round {currentRound}/5</span>
                  <span className="text-vintage-gold">•</span>
                  <span className="text-cyan-400">You {eliminationPlayerScore}</span>
                  <span className="text-vintage-gold">-</span>
                  <span className="text-red-400">{eliminationOpponentScore} Opponent</span>
                </div>
              </div>
            ) : (
              <h2 className="text-3xl md:text-5xl font-bold text-center mb-8 md:mb-12 text-yellow-400 uppercase tracking-wider" style={{ animation: 'battlePowerPulse 2s ease-in-out infinite' }}>
                {t('battle')}
              </h2>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 mb-8">
              {/* Player Cards */}
              <div>
                {/* Player Header with Avatar */}
                <div className="flex flex-col items-center mb-3 md:mb-4">
                  <div className="w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden border-4 border-cyan-500 shadow-lg shadow-cyan-500/50 mb-2 bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center relative">
                    {userProfile?.twitter ? (
                      <img
                        src={getAvatarUrl({ twitter: userProfile.twitter, twitterProfileImageUrl: userProfile.twitterProfileImageUrl }) || ''}
                        alt={battlePlayerName}
                        className="w-full h-full object-cover absolute inset-0"
                        onLoad={() => devLog('Player PFP loaded:', userProfile.twitter)}
                        onError={(e) => {
                          devLog('Player PFP failed to load, using fallback:', userProfile.twitter);
                          (e.target as HTMLImageElement).src = getAvatarFallback({ twitter: userProfile.twitter, twitterProfileImageUrl: userProfile.twitterProfileImageUrl });
                        }}
                      />
                    ) : null}
                    <span className={`text-2xl md:text-3xl font-bold text-white ${userProfile?.twitter ? 'opacity-0' : 'opacity-100'}`}>
                      {battlePlayerName?.substring(0, 2).toUpperCase() || '??'}
                    </span>
                  </div>
                  <h3 className="text-xl md:text-2xl font-bold text-vintage-neon-blue text-center">{battlePlayerName}</h3>
                </div>

                {/* Cards Display - Different for Elimination Mode */}
                {battleMode === 'elimination' ? (
                  // Show only current round's card (single large card)
                  <div className="flex flex-col items-center gap-4">
                    <div className="text-purple-400 font-bold text-lg">Position #{currentRound}</div>
                    <div
                      className="relative w-48 md:w-64 aspect-[2/3] rounded-lg overflow-hidden ring-4 ring-cyan-500"
                      style={{
                        animation: battlePhase === 'clash'
                          ? `battleGlowBlue 1.5s ease-in-out infinite`
                          : 'battleCardFadeIn 0.8s ease-out'
                      }}
                    >
                      <FoilCardEffect
                        foilType={(selectedCards[currentRound - 1]?.foil === 'Standard' || selectedCards[currentRound - 1]?.foil === 'Prize') ? selectedCards[currentRound - 1].foil : null}
                        className="w-full h-full"
                      >
                        <img src={selectedCards[currentRound - 1]?.imageUrl} alt={`#${selectedCards[currentRound - 1]?.tokenId}`} className="w-full h-full object-cover" loading="eager" />
                      </FoilCardEffect>
                      <div
                        className="absolute top-0 left-0 bg-cyan-500 text-white text-lg md:text-xl font-bold px-3 py-2 rounded-br"
                        style={{
                          animation: battlePhase === 'clash'
                            ? 'battlePowerPulse 1s ease-in-out infinite'
                            : undefined
                        }}
                      >
                        {selectedCards[currentRound - 1]?.power}
                      </div>
                    </div>
                    {/* Show mini previous cards if not first round */}
                    {currentRound > 1 && (
                      <div className="flex gap-1 mt-2">
                        {orderedPlayerCards.slice(0, currentRound - 1).map((card, i) => (
                          <div key={i} className={`w-12 h-16 rounded border-2 ${roundResults[i] === 'win' ? 'border-green-500' : roundResults[i] === 'loss' ? 'border-red-500' : 'border-yellow-500'} opacity-50`}>
                            <img src={card.imageUrl} alt="" className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  // Normal mode - show all 5 cards
                  <>
                    <div
                      className="grid grid-cols-5 gap-1 md:gap-2"
                      style={{
                        animation: battlePhase === 'clash'
                          ? 'battleCardShake 2s ease-in-out'
                          : 'battleCardFadeIn 0.8s ease-out'
                      }}
                    >
                      {selectedCards.map((c, i) => (
                        <div
                          key={i}
                          className="relative aspect-[2/3] rounded-lg overflow-hidden ring-2 ring-cyan-500"
                          style={{
                            animation: battlePhase === 'clash'
                              ? `battleGlowBlue 1.5s ease-in-out infinite`
                              : undefined,
                            animationDelay: `${i * 0.1}s`
                          }}
                        >
                          <FoilCardEffect
                            foilType={(c.foil === 'Standard' || c.foil === 'Prize') ? c.foil : null}
                            className="w-full h-full"
                          >
                            <img src={c.imageUrl} alt={`#${c.tokenId}`} className="w-full h-full object-cover" loading="eager" />
                          </FoilCardEffect>
                          <div
                            className="absolute top-0 left-0 bg-cyan-500 text-white text-xs md:text-sm font-bold px-1 md:px-2 py-1 rounded-br"
                            style={{
                              animation: battlePhase === 'clash'
                                ? 'battlePowerPulse 1s ease-in-out infinite'
                                : undefined
                            }}
                          >
                            {c.power}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 md:mt-4 text-center">
                      <p
                        className="text-3xl md:text-4xl font-bold text-vintage-neon-blue"
                        style={{
                          animation: battlePhase === 'result'
                            ? 'battlePowerPulse 1.5s ease-in-out 3'
                            : undefined
                        }}
                      >
                        {playerPower}
                      </p>
                    </div>
                  </>
                )}
              </div>

              {/* Opponent Cards */}
              <div>
                {/* Opponent Header with Avatar */}
                <div className="flex flex-col items-center mb-3 md:mb-4">
                  <div className="w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden border-4 border-red-500 shadow-lg shadow-red-500/50 mb-2 bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center relative">
                    {battleOpponentPfp ? (
                      <img
                        src={battleOpponentPfp}
                        alt={battleOpponentName}
                        className="w-full h-full object-cover absolute inset-0"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          setBattleOpponentPfp(null); // Reset to null so initials show
                        }}
                      />
                    ) : null}
                    <span className={`text-2xl md:text-3xl font-bold text-white ${battleOpponentPfp ? 'opacity-0' : 'opacity-100'}`}>
                      {battleOpponentName?.substring(0, 2).toUpperCase() || '??'}
                    </span>
                  </div>
                  <h3 className="text-xl md:text-2xl font-bold text-red-400 text-center">{battleOpponentName}</h3>
                </div>

                {/* Cards Display - Different for Elimination Mode */}
                {battleMode === 'elimination' ? (
                  // Show only current round's card (single large card)
                  <div className="flex flex-col items-center gap-4">
                    <div className="text-purple-400 font-bold text-lg">Position #{currentRound}</div>
                    <div
                      className="relative w-48 md:w-64 aspect-[2/3] rounded-lg overflow-hidden ring-4 ring-red-500"
                      style={{
                        animation: battlePhase === 'clash'
                          ? `battleGlowRed 1.5s ease-in-out infinite`
                          : 'battleCardFadeIn 0.8s ease-out'
                      }}
                    >
                      <FoilCardEffect
                        foilType={(dealerCards[currentRound - 1]?.foil === 'Standard' || dealerCards[currentRound - 1]?.foil === 'Prize') ? dealerCards[currentRound - 1].foil : null}
                        className="w-full h-full"
                      >
                        <img src={dealerCards[currentRound - 1]?.imageUrl} alt={`#${dealerCards[currentRound - 1]?.tokenId}`} className="w-full h-full object-cover" loading="eager" />
                      </FoilCardEffect>
                      <div
                        className="absolute top-0 left-0 bg-red-500 text-white text-lg md:text-xl font-bold px-3 py-2 rounded-br"
                        style={{
                          animation: battlePhase === 'clash'
                            ? 'battlePowerPulse 1s ease-in-out infinite'
                            : undefined
                        }}
                      >
                        {dealerCards[currentRound - 1]?.power}
                      </div>
                      {battlePhase === 'result' && (
                        <div className="absolute bottom-0 right-0 bg-black/80 text-vintage-gold text-xs px-2 py-1 rounded-tl font-mono">
                          #{dealerCards[currentRound - 1]?.tokenId}
                        </div>
                      )}
                    </div>
                    {/* Show mini previous cards if not first round */}
                    {currentRound > 1 && (
                      <div className="flex gap-1 mt-2">
                        {orderedOpponentCards.slice(0, currentRound - 1).map((card, i) => (
                          <div key={i} className={`w-12 h-16 rounded border-2 ${roundResults[i] === 'loss' ? 'border-green-500' : roundResults[i] === 'win' ? 'border-red-500' : 'border-yellow-500'} opacity-50`}>
                            <img src={card.imageUrl} alt="" className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  // Normal mode - show all 5 cards
                  <>
                    <div
                      className="grid grid-cols-5 gap-1 md:gap-2"
                      style={{
                        animation: battlePhase === 'clash'
                          ? 'battleCardShake 2s ease-in-out'
                          : 'battleCardFadeIn 0.8s ease-out'
                      }}
                    >
                      {dealerCards.map((c, i) => (
                        <div
                          key={i}
                          className="relative aspect-[2/3] rounded-lg overflow-hidden ring-2 ring-red-500"
                          style={{
                            animation: battlePhase === 'clash'
                              ? `battleGlowRed 1.5s ease-in-out infinite`
                              : undefined,
                            animationDelay: `${i * 0.1}s`
                          }}
                        >
                          <FoilCardEffect
                            foilType={(c.foil === 'Standard' || c.foil === 'Prize') ? c.foil : null}
                            className="w-full h-full"
                          >
                            <img src={c.imageUrl} alt={`#${c.tokenId}`} className="w-full h-full object-cover" loading="eager" />
                          </FoilCardEffect>
                          <div
                            className="absolute top-0 left-0 bg-red-500 text-white text-xs md:text-sm font-bold px-1 md:px-2 py-1 rounded-br"
                            style={{
                              animation: battlePhase === 'clash'
                                ? 'battlePowerPulse 1s ease-in-out infinite'
                                : undefined
                            }}
                          >
                            {c.power}
                          </div>
                          {battlePhase === 'result' && (
                            <div className="absolute bottom-0 right-0 bg-black/80 text-vintage-gold text-xs px-2 py-1 rounded-tl font-mono">
                              #{c.tokenId}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 md:mt-4 text-center">
                      <p
                        className="text-3xl md:text-4xl font-bold text-red-400"
                        style={{
                          animation: battlePhase === 'result'
                            ? 'battlePowerPulse 1.5s ease-in-out 3'
                            : undefined
                        }}
                      >
                        {dealerPower}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Result */}
            {battlePhase === 'result' && result && (
              <div className="text-center" style={{ animation: 'battleResultSlide 0.8s ease-out' }}>
                <div className={`text-3xl md:text-6xl font-bold ${
                  result === t('playerWins') ? 'text-green-400' :
                  result === t('dealerWins') ? 'text-red-400' :
                  'text-yellow-400'
                }`}>
                  {battleMode === 'elimination' && currentRound <= 5
                    ? (result === t('playerWins') ? '★ ROUND WIN!' : result === t('dealerWins') ? '† ROUND LOST' : '~ ROUND TIE')
                    : result
                  }
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* PvE Card Selection Modal */}
      <PveCardSelectionModal
        isOpen={showPveCardSelection}
        onClose={() => setShowPveCardSelection(false)}
        isDifficultyModalOpen={isDifficultyModalOpen}
        t={t}
        handSize={HAND_SIZE}
        pveSelectedCards={pveSelectedCards}
        setPveSelectedCards={setPveSelectedCards}
        sortedPveNfts={sortedPveNfts}
        pveSortByPower={pveSortByPower}
        setPveSortByPower={setPveSortByPower}
        soundEnabled={soundEnabled}
        jcNfts={jcNfts}
        setIsDifficultyModalOpen={setIsDifficultyModalOpen}
        pveSelectedCardsPower={pveSelectedCardsPower}
      />

      {/* ✅ PvP Preview Modal - Shows potential gains/losses before battle */}
      {showPvPPreview && pvpPreviewData && targetPlayer && (
        <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-[200] p-2 sm:p-4 overflow-y-auto">
          <div className="bg-gradient-to-br from-vintage-charcoal via-vintage-black to-vintage-charcoal rounded-xl sm:rounded-2xl border-2 border-vintage-gold max-w-2xl w-full p-4 sm:p-6 md:p-8 shadow-2xl shadow-vintage-gold/30 my-4">
            {/* Header */}
            <div className="text-center mb-4 sm:mb-6">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold text-vintage-gold mb-1 sm:mb-2">
                ⚔️ BATTLE PREVIEW
              </h2>
              <p className="text-xs sm:text-sm text-vintage-burnt-gold font-modern">
                Potential gains and losses for this battle
              </p>
            </div>

            {/* Rankings */}
            <div className="flex justify-between items-center mb-3 sm:mb-4 md:mb-6 p-2 sm:p-3 md:p-4 bg-vintage-black/50 rounded-lg sm:rounded-xl border border-vintage-gold/30">
              <div className="text-center flex-1">
                <p className="text-[10px] sm:text-xs text-vintage-burnt-gold font-modern mb-0.5 sm:mb-1">YOUR RANK</p>
                <p className="text-xl sm:text-2xl md:text-3xl font-bold text-cyan-400">#{pvpPreviewData.playerRank}</p>
              </div>
              <div className="text-vintage-gold text-lg sm:text-xl md:text-2xl">VS</div>
              <div className="text-center flex-1">
                <p className="text-[10px] sm:text-xs text-vintage-burnt-gold font-modern mb-0.5 sm:mb-1">OPPONENT RANK</p>
                <p className="text-xl sm:text-2xl md:text-3xl font-bold text-red-400">#{pvpPreviewData.opponentRank}</p>
              </div>
            </div>

            {/* Win/Loss Scenarios */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3 md:gap-4 mb-3 sm:mb-4 md:mb-6">
              {/* Win Scenario */}
              <div className="bg-green-900/20 border-2 border-green-500/50 rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-5">
                <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
                  <NextImage src="/images/icons/victory.svg" alt="Victory" width={24} height={24} className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8" />
                  <h3 className="text-sm sm:text-base md:text-xl font-bold text-green-400 font-display">IF YOU WIN</h3>
                </div>

                <div className="mb-2 sm:mb-3 md:mb-4">
                  <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-green-300 mb-0.5 sm:mb-1">
                    +{pvpPreviewData.win.totalReward}
                  </p>
                  <p className="text-xs sm:text-sm text-green-200/70">$TESTVBMS</p>
                </div>

                <div className="space-y-1 sm:space-y-1.5 md:space-y-2 text-xs sm:text-sm">
                  <div className="flex justify-between text-green-100/80">
                    <span>Base Reward:</span>
                    <span className="font-mono">+{pvpPreviewData.win.baseReward}</span>
                  </div>

                  {pvpPreviewData.win.rankingBonus > 0 && (
                    <div className="flex justify-between text-yellow-300 font-medium">
                      <span>⭐ Ranking Bonus ({pvpPreviewData.win.rankingMultiplier.toFixed(1)}x):</span>
                      <span className="font-mono">+{pvpPreviewData.win.rankingBonus}</span>
                    </div>
                  )}

                  {pvpPreviewData.win.firstPvpBonus > 0 && (
                    <div className="flex justify-between text-blue-300">
                      <span>First PvP Today:</span>
                      <span className="font-mono">+{pvpPreviewData.win.firstPvpBonus}</span>
                    </div>
                  )}

                  {pvpPreviewData.win.streakBonus > 0 && (
                    <div className="flex justify-between text-purple-300 font-medium">
                      <span>🔥 {pvpPreviewData.win.streakMessage}:</span>
                      <span className="font-mono">+{pvpPreviewData.win.streakBonus}</span>
                    </div>
                  )}
                </div>

                {pvpPreviewData.currentStreak > 0 && (
                  <div className="mt-2 sm:mt-3 p-1.5 sm:p-2 bg-orange-500/20 rounded text-[10px] sm:text-xs text-orange-200 border border-orange-500/30">
                    Current Streak: {pvpPreviewData.currentStreak} win{pvpPreviewData.currentStreak !== 1 ? 's' : ''}
                  </div>
                )}
              </div>

              {/* Loss Scenario */}
              <div className="bg-red-900/20 border-2 border-red-500/50 rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-5">
                <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
                  <NextImage src="/images/icons/defeat.svg" alt="Defeat" width={24} height={24} className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8" />
                  <h3 className="text-sm sm:text-base md:text-xl font-bold text-red-400 font-display">IF YOU LOSE</h3>
                </div>

                <div className="mb-2 sm:mb-3 md:mb-4">
                  <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-red-300 mb-0.5 sm:mb-1">
                    {pvpPreviewData.loss.totalPenalty}
                  </p>
                  <p className="text-xs sm:text-sm text-red-200/70">$TESTVBMS</p>
                </div>

                <div className="space-y-1 sm:space-y-1.5 md:space-y-2 text-xs sm:text-sm">
                  <div className="flex justify-between text-red-100/80">
                    <span>Base Penalty:</span>
                    <span className="font-mono">{pvpPreviewData.loss.basePenalty}</span>
                  </div>

                  {pvpPreviewData.loss.penaltyReduction > 0 && (
                    <div className="flex justify-between text-orange-300 font-medium">
                      <span>🛡️ Penalty Reduced ({Math.round(pvpPreviewData.loss.rankingMultiplier * 100)}%):</span>
                      <span className="font-mono">+{pvpPreviewData.loss.penaltyReduction}</span>
                    </div>
                  )}
                </div>

                {pvpPreviewData.loss.penaltyReduction > 0 && (
                  <div className="mt-2 sm:mt-3 p-1.5 sm:p-2 bg-orange-500/20 rounded text-[10px] sm:text-xs text-orange-200 border border-orange-500/30">
                    Fighting a high-ranked opponent reduces your loss!
                  </div>
                )}
              </div>
            </div>

            {/* Current Balance */}
            <div className="mb-3 sm:mb-4 md:mb-6 p-2 sm:p-3 bg-vintage-black/50 rounded-lg border border-vintage-gold/20 text-center">
              <p className="text-[10px] sm:text-xs text-vintage-burnt-gold mb-0.5 sm:mb-1">YOUR CURRENT BALANCE</p>
              <p className="text-lg sm:text-xl md:text-2xl font-bold text-vintage-gold">{pvpPreviewData.playerCoins} $TESTVBMS</p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 sm:gap-3 md:gap-4">
              <button
                onClick={async () => {
                  // Fechar modal e continuar com o ataque
                  setShowPvPPreview(false);
                  if (soundEnabled) AudioManager.buttonClick();

                  // Agora sim, fazer o ataque
                  setIsAttacking(true);

                  try {
                    // Pay entry fee
                    await payEntryFee({ address: address || '', mode: 'attack' });
                    devLog('Attack entry fee paid: 50 $TESTVBMS');

                    // Setup battle (código original continua aqui...)
                    devLog('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                    devLog(`✦ ATTACKING: ${targetPlayer.username}`);
                    devLog(`🛡️ Validating opponent's defense deck...`);

                    // ✅ SECURITY: Validate defense deck against owned NFTs
                    const validatedDeck = await ConvexProfileService.getValidatedDefenseDeck(targetPlayer.address);

                    if (validatedDeck.removedCards.length > 0) {
                      devWarn(`⚠️ Removed ${validatedDeck.removedCards.length} invalid cards from ${targetPlayer.username}'s defense deck (no longer owned)`);
                    }

                    if (!validatedDeck.isValid) {
                      devWarn(`⚠️ Could not validate ${targetPlayer.username}'s defense deck - using as-is`);
                    }

                    const defenderCards = validatedDeck.defenseDeck.map((card) => ({
                      tokenId: card.tokenId,
                      power: card.power,
                      imageUrl: card.imageUrl,
                      name: card.name,
                      rarity: card.rarity,
                    }));

                    devLog(`✅ Defense deck validated: ${defenderCards.length} valid cards`);
                    devLog('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

                    setSelectedCards(attackSelectedCards);
                    setDealerCards(defenderCards);
                    setBattleOpponentName(targetPlayer.username);
                    setBattlePlayerName(userProfile?.username || 'You');
                    setBattleOpponentPfp(getAvatarUrl(targetPlayer.twitter));
                    setBattlePlayerPfp(getAvatarUrl(userProfile ? { twitter: userProfile.twitter, twitterProfileImageUrl: userProfile.twitterProfileImageUrl } : null));
                    setShowAttackCardSelection(false);
                    setIsBattling(true);
                    setShowBattleScreen(true);
                    setBattlePhase('cards');
                    setGameMode('pvp');

                    if (soundEnabled) AudioManager.playHand();

                    // Calculate power totals (one-time calculation per attack, no need for memoization)
                    const playerTotal = attackSelectedCards.reduce((sum, c) => sum + (c.power || 0), 0);
                    const dealerTotal = defenderCards.reduce((sum, c) => sum + (c.power || 0), 0);

                    setTimeout(() => {
                      setBattlePhase('clash');
                      if (soundEnabled) AudioManager.cardBattle();
                    }, 2500);

                    setTimeout(() => {
                      setPlayerPower(playerTotal);
                      setDealerPower(dealerTotal);
                      setBattlePhase('result');
                    }, 3500);

                    setTimeout(async () => {
                      let matchResult: 'win' | 'loss' | 'tie';
                      if (playerTotal > dealerTotal) {
                        matchResult = 'win';
                      } else if (playerTotal < dealerTotal) {
                        matchResult = 'loss';
                      } else {
                        matchResult = 'tie';
                        setShowTiePopup(true);
                        if (soundEnabled) AudioManager.tie();
                        setTimeout(() => setShowTiePopup(false), 3000);
                      }

                      let coinsEarned = 0;

                      if (userProfile && address) {
                        try {
                          // ⚛️ ATOMIC: Single transaction for coins + match + profile update
                          const result = await recordAttackResult({
                            playerAddress: address,
                            playerPower: playerTotal,
                            playerCards: attackSelectedCards,
                            playerUsername: userProfile.username,
                            result: matchResult,
                            opponentAddress: targetPlayer.address,
                            opponentUsername: targetPlayer.username,
                            opponentPower: dealerTotal,
                            opponentCards: defenderCards,
                            entryFeePaid: 0, // No entry fee for leaderboard attacks
                            language: lang,
                          });

                          coinsEarned = result.coinsAwarded || 0;

                          devLog(`⚛️ ATOMIC: Attack recorded successfully`);
                          devLog(`💰 Coins awarded: ${coinsEarned}`);
                          if (result.bonuses && result.bonuses.length > 0) {
                            devLog(`🎁 Bonuses: ${result.bonuses.join(', ')}`);
                          }

                          // Update UI with returned profile (no separate getProfile call needed!)
                          if (result.profile) {
                            setUserProfile(result.profile);
                            setAttacksRemaining(maxAttacks - (result.profile.attacksToday || 0));
                          }
                        } catch (error: any) {
                          devError('⚛️ ATOMIC: Error recording attack:', error);
                        }
                      }

                      setLastBattleResult({
                        result: matchResult,
                        playerPower: playerTotal,
                        opponentPower: dealerTotal,
                        opponentName: targetPlayer.username,
                        opponentTwitter: targetPlayer.twitter,
                        type: 'attack',
                        coinsEarned,
                        playerPfpUrl: userProfile?.twitterProfileImageUrl,
                        opponentPfpUrl: targetPlayer.twitterProfileImageUrl,
                      });

                      // 🔔 Send notification (outside atomic transaction - non-critical)
                      if (address && userProfile) {

                        // 🔔 Send notification to defender with coins info
                        fetch('/api/notifications/send', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            type: 'defense_attacked',
                            data: {
                              defenderAddress: targetPlayer.address,
                              defenderUsername: targetPlayer.username || 'Unknown',
                              attackerUsername: userProfile.username || 'Unknown',
                              result: matchResult === 'win' ? 'lose' : 'win', // Inverted: attacker wins = defender loses
                              coinsChange: coinsEarned, // Attacker's coin change
                            },
                          }),
                        }).catch(err => devError('Error sending notification:', err));
                      }

                      // Close battle first
                      setIsBattling(false);
                      setShowBattleScreen(false);
                      setBattlePhase('cards');
                      setIsAttacking(false);
                      setShowAttackCardSelection(false);
                      setTargetPlayer(null);
                      setAttackSelectedCards([]);

                      // 🎯 Show victory/loss popup after closing
                      setTimeout(() => {
                        if (matchResult === 'win') {
                          showVictory();
                        } else if (matchResult === 'loss') {
                          setShowLossPopup(true);
                          if (soundEnabled) AudioManager.lose();
                        }
                        // Note: Tie popup is already shown above
                      }, 100);
                    }, 4500);

                  } catch (error: any) {
                    setErrorMessage('Error: ' + error.message);
                    setIsAttacking(false);
                    if (soundEnabled) AudioManager.buttonError();
                  }
                }}
                disabled={isAttacking}
                className="flex-1 px-4 sm:px-6 md:px-8 py-2.5 sm:py-3 md:py-4 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-600 text-white rounded-lg sm:rounded-xl font-display font-bold text-sm sm:text-base md:text-xl shadow-lg transition-all uppercase tracking-wider border-2 border-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAttacking ? 'ATTACKING...' : '⚔️ ATTACK'}
              </button>

              <button
                onClick={() => {
                  setShowPvPPreview(false);
                  if (soundEnabled) AudioManager.buttonClick();
                }}
                disabled={isAttacking}
                className="px-4 sm:px-6 md:px-8 py-2.5 sm:py-3 md:py-4 bg-vintage-black/50 border-2 border-vintage-burnt-gold text-vintage-burnt-gold rounded-lg sm:rounded-xl hover:bg-vintage-burnt-gold hover:text-vintage-black transition-all font-modern font-bold text-sm sm:text-base md:text-lg uppercase disabled:opacity-50 disabled:cursor-not-allowed"
              >
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Attack Card Selection Modal */}
      <AttackCardSelectionModal
        showAttackCardSelection={showAttackCardSelection}
        targetPlayer={targetPlayer}
        attackSelectedCards={attackSelectedCards}
        attackSelectedCardsPower={attackSelectedCardsPower}
        sortAttackByPower={sortAttackByPower}
        sortedAttackNfts={sortedAttackNfts}
        isAttacking={isAttacking}
        isLoadingPreview={isLoadingPreview}
        HAND_SIZE={HAND_SIZE}
        soundEnabled={soundEnabled}
        address={address}
        userProfile={userProfile}
        lang={lang}
        setShowAttackCardSelection={setShowAttackCardSelection}
        setSortAttackByPower={setSortAttackByPower}
        setAttackSelectedCards={setAttackSelectedCards}
        setIsAttacking={setIsAttacking}
        setTargetPlayer={setTargetPlayer}
        setIsLoadingPreview={setIsLoadingPreview}
        setPvpPreviewData={setPvpPreviewData}
        setShowPvPPreview={setShowPvPPreview}
        setErrorMessage={setErrorMessage}
        setSelectedCards={setSelectedCards}
        setDealerCards={setDealerCards}
        setBattleOpponentName={setBattleOpponentName}
        setBattlePlayerName={setBattlePlayerName}
        setBattleOpponentPfp={setBattleOpponentPfp}
        setBattlePlayerPfp={setBattlePlayerPfp}
        setIsBattling={setIsBattling}
        setShowBattleScreen={setShowBattleScreen}
        setBattlePhase={setBattlePhase}
        setGameMode={setGameMode}
        setPlayerPower={setPlayerPower}
        setDealerPower={setDealerPower}
        setUserProfile={setUserProfile}
        setAttacksRemaining={setAttacksRemaining}
        setLastBattleResult={setLastBattleResult}
        showVictory={showVictory}
        setShowLossPopup={setShowLossPopup}
        setShowTiePopup={setShowTiePopup}
        isCardLocked={isCardLocked}
        payEntryFee={payEntryFee}
        recordAttackResult={recordAttackResult}
        getAvatarUrl={getAvatarUrl}
        maxAttacks={maxAttacks}
        convex={convex}
        api={api}
      />

      {/* Poker Battle - handles both CPU and PvP modes */}
      {showPokerBattle && (
        <PokerBattleTable
          onClose={() => setShowPokerBattle(false)}
          playerCards={sortedNfts}
          isCPUMode={pokerMode === 'cpu'}
          opponentDeck={pokerMode === 'cpu' ? strongestJcNftsForPoker : []}
          difficulty={pokerMode === 'cpu' ? pokerCpuDifficulty : undefined}
          playerAddress={address || ''}
          playerUsername={userProfile?.username || ''}
          isInFarcaster={isInFarcaster}
          soundEnabled={soundEnabled}
        />
      )}

      {/* PvP Menu Modals (Game mode selection, PvP menu, Create/Join room, Auto-match) */}
      <PvPMenuModals
        pvpMode={pvpMode}
        roomCode={roomCode}
        isSearching={isSearching}
        selectedRoomMode={selectedRoomMode}
        aiDifficulty={aiDifficulty}
        unlockedDifficulties={unlockedDifficulties}
        playerEconomy={playerEconomy}
        userProfile={userProfile}
        address={address}
        soundEnabled={soundEnabled}
        setPvpMode={setPvpMode}
        setRoomCode={setRoomCode}
        setIsSearching={setIsSearching}
        setSelectedRoomMode={setSelectedRoomMode}
        setGameMode={setGameMode}
        setShowPveCardSelection={setShowPveCardSelection}
        setPveSelectedCards={setPveSelectedCards}
        setErrorMessage={setErrorMessage}
        setIsDifficultyModalOpen={setIsDifficultyModalOpen}
        t={t}
      />

      {/* PvP In Room Modal (waiting for opponent & card selection) */}
      <PvPInRoomModal
        pvpMode={pvpMode}
        roomCode={roomCode}
        currentRoom={currentRoom}
        address={address}
        soundEnabled={soundEnabled}
        nfts={nfts}
        selectedCards={selectedCards}
        isConfirmingCards={isConfirmingCards}
        setPvpMode={setPvpMode}
        setRoomCode={setRoomCode}
        setCurrentRoom={setCurrentRoom}
        setSelectedCards={setSelectedCards}
        setIsConfirmingCards={setIsConfirmingCards}
        isCardLocked={isCardLocked}
        t={t}
      />

      {showTutorial && (
        <div className="fixed inset-x-0 top-0 bottom-20 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-2 md:p-4" onClick={() => setShowTutorial(false)}>
          <div className={`bg-vintage-deep-black rounded-2xl border-2 border-vintage-gold max-w-2xl w-full p-3 md:p-8 shadow-[0_0_40px_rgba(255,215,0,0.4)] ${isInFarcaster ? 'max-h-[calc(100vh-240px)]' : 'max-h-[calc(100vh-100px)]'} flex flex-col`} onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-3 md:mb-6 flex-shrink-0">
              <div>
                <h2 className="text-xl md:text-3xl font-display font-bold text-vintage-gold" style={{textShadow: '0 0 15px rgba(255, 215, 0, 0.5)'}}>{t('tutorialTitle')}</h2>
                <p className="text-xs text-vintage-burnt-gold mt-1">{tutorialPage}/{TUTORIAL_PAGES}</p>
              </div>
              <button onClick={() => setShowTutorial(false)} className="text-vintage-burnt-gold hover:text-vintage-gold text-xl md:text-2xl transition">✕</button>
            </div>

            {/* Page Content - Max height with scroll for individual pages if needed */}
            <div className="overflow-y-auto flex-1 min-h-0">
              <div className="space-y-3 md:space-y-6 text-vintage-ice">
                {/* PAGE 1: Welcome + Need Cards + How to Play */}
                {tutorialPage === 1 && (
                  <>
                    {/* Precisa de Cartas? */}
                    <div className="relative p-1 rounded-xl" style={{background: 'linear-gradient(145deg, #FFD700, #C9A227, #FFD700)', boxShadow: '0 0 20px rgba(255, 215, 0, 0.4)', animation: 'pulse 2s ease-in-out infinite'}}>
                      <div className="bg-vintage-black/90 p-3 md:p-5 rounded-lg">
                        <h3 className="text-lg md:text-xl font-display font-bold text-vintage-gold mb-2 flex items-center gap-2">
                          <span className="text-xl md:text-2xl">$</span> {t('needCards')}
                        </h3>
                        <p className="mb-3 md:mb-4 text-sm md:text-base text-vintage-burnt-gold">{t('needCardsDesc')}</p>
                        <a
                          href="https://vibechain.com/market/vibe-most-wanted?ref=XCLR1DJ6LQTT"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-4 md:px-6 py-2 md:py-3 rounded-xl font-modern font-bold text-sm md:text-base transition-all hover:scale-105"
                          style={{background: 'linear-gradient(145deg, #FFD700, #C9A227)', color: '#0C0C0C', boxShadow: '0 0 15px rgba(255, 215, 0, 0.5)'}}
                        >
                          {t('buyCards')} $
                        </a>
                      </div>
                    </div>

                    {/* Como Jogar */}
                    <div className="bg-vintage-charcoal/50 p-3 md:p-5 rounded-xl border border-vintage-gold/30">
                      <h3 className="text-lg md:text-xl font-display font-bold text-vintage-gold mb-2 md:mb-3 flex items-center gap-2">
                        <span className="text-xl md:text-2xl">?</span> {t('howToPlay')}
                      </h3>
                      <div className="bg-vintage-black/50 p-3 md:p-4 rounded-lg border border-vintage-gold/20">
                        <p className="whitespace-pre-line text-xs md:text-sm leading-relaxed text-vintage-ice">{t('howToPlayDesc')}</p>
                      </div>
                    </div>
                  </>
                )}

                {/* PAGE 2: Power System */}
                {tutorialPage === 2 && (
                  <>
                    {/* Poder Total */}
                    <div className="bg-vintage-charcoal/50 p-5 rounded-xl border border-vintage-neon-blue/30">
                      <h3 className="text-xl font-display font-bold text-vintage-neon-blue mb-3 flex items-center gap-2">
                        <span className="text-2xl">※</span> {t('totalPowerInfo')}
                      </h3>
                      <div className="bg-vintage-black/50 p-4 rounded-lg border border-vintage-neon-blue/20">
                        <p className="whitespace-pre-line text-sm leading-relaxed text-vintage-ice">{t('totalPowerInfoDesc')}</p>
                      </div>
                    </div>

                    {/* Como o Poder Funciona */}
                    <div className="bg-vintage-charcoal/50 p-5 rounded-xl border border-vintage-gold/30">
                      <h3 className="text-xl font-display font-bold text-vintage-gold mb-2 flex items-center gap-2">
                        <span className="text-2xl">※</span> {t('powerCalc')}
                      </h3>
                      <p className="mb-3 text-sm text-vintage-burnt-gold">{t('powerCalcDesc')}</p>
                      <div className="bg-vintage-black/50 p-4 rounded-lg space-y-3 text-sm border border-vintage-gold/20">
                        <div>
                          <p className="text-vintage-gold font-bold font-modern">{t('rarityBase')}</p>
                          <p className="ml-4 text-vintage-burnt-gold text-xs mt-1">{t('rarityValues')}</p>
                        </div>
                        <div>
                          <p className="text-vintage-gold font-bold font-modern">{t('wearMultiplier')}</p>
                          <p className="ml-4 text-vintage-burnt-gold text-xs mt-1">{t('wearValues')}</p>
                        </div>
                        <div>
                          <p className="text-vintage-gold font-bold font-modern">{t('foilMultiplier')}</p>
                          <p className="ml-4 text-vintage-burnt-gold text-xs mt-1">{t('foilValues')}</p>
                        </div>
                      </div>
                    </div>

                    {/* Foil Types */}
                    <div className="bg-vintage-felt-green/20 p-4 rounded-xl border border-vintage-gold/30">
                      <div className="space-y-2 text-sm">
                        <p className="text-vintage-gold font-bold font-modern flex items-center gap-2">
                          <span className="text-xl">★</span> {t('prizeFoil')}
                        </p>
                        <p className="text-vintage-neon-blue font-bold font-modern flex items-center gap-2">
                          <span className="text-xl">☆</span> {t('standardFoil')}
                        </p>
                      </div>
                    </div>

                    {/* Exemplos */}
                    <div className="bg-vintage-charcoal/50 p-5 rounded-xl border border-vintage-gold/30">
                      <h3 className="text-xl font-display font-bold text-vintage-gold mb-3 flex items-center gap-2">
                        <span className="text-2xl">§</span> {t('powerExamples')}
                      </h3>
                      <div className="bg-vintage-black/50 p-4 rounded-lg space-y-2 text-sm border border-vintage-gold/20">
                        <p className="text-vintage-ice">• {t('exampleCommon')}</p>
                        <p className="text-vintage-ice">• {t('exampleRare')}</p>
                        <p className="text-vintage-ice">• {t('exampleLegendary')}</p>
                        <p className="text-vintage-gold font-bold text-base flex items-center gap-2">
                          <span>•</span> {t('exampleMythic')}
                        </p>
                      </div>
                    </div>
                  </>
                )}

                {/* PAGE 3: Economy + Defense */}
                {tutorialPage === 3 && (
                  <>
                    {/* Sistema de Moedas / Economy */}
                    <div className="bg-gradient-to-r from-vintage-gold/20 to-vintage-burnt-gold/20 p-5 rounded-xl border border-vintage-gold shadow-[0_0_15px_rgba(255,215,0,0.2)]">
                      <h3 className="text-xl font-display font-bold text-vintage-gold mb-3 flex items-center gap-2">
                        <span className="text-2xl">$</span> {t('economyInfo')}
                      </h3>
                      <div className="bg-vintage-black/50 p-4 rounded-lg border border-vintage-gold/20">
                        <p className="whitespace-pre-line text-sm leading-relaxed text-vintage-ice">{t('economyInfoDesc')}</p>
                      </div>
                    </div>

                    {/* Deck de Defesa */}
                    <div className="bg-vintage-charcoal/50 p-5 rounded-xl border border-vintage-burnt-gold/30">
                      <h3 className="text-xl font-display font-bold text-vintage-burnt-gold mb-3 flex items-center gap-2">
                        <span className="text-2xl">◆</span> {t('defenseDeckInfo')}
                      </h3>
                      <div className="bg-vintage-black/50 p-4 rounded-lg border border-vintage-burnt-gold/20">
                        <p className="whitespace-pre-line text-sm leading-relaxed text-vintage-ice">{t('defenseDeckInfoDesc')}</p>
                      </div>
                    </div>
                  </>
                )}

                {/* PAGE 4: Attack + Leaderboard */}
                {tutorialPage === 4 && (
                  <>
                    {/* Sistema de Ataques */}
                    <div className="bg-vintage-charcoal/50 p-5 rounded-xl border border-red-500/30">
                      <h3 className="text-xl font-display font-bold text-red-400 mb-3 flex items-center gap-2">
                        <span className="text-2xl">†</span> {t('attackSystemInfo')}
                      </h3>
                      <div className="bg-vintage-black/50 p-4 rounded-lg border border-red-500/20">
                        <p className="whitespace-pre-line text-sm leading-relaxed text-vintage-ice">{t('attackSystemInfoDesc')}</p>
                      </div>
                    </div>

                    {/* Ranking Global */}
                    <div className="bg-vintage-charcoal/50 p-5 rounded-xl border border-vintage-gold/30">
                      <h3 className="text-xl font-display font-bold text-vintage-gold mb-3 flex items-center gap-2">
                        <span className="text-2xl">★</span> {t('leaderboardInfo')}
                      </h3>
                      <div className="bg-vintage-black/50 p-4 rounded-lg border border-vintage-gold/20">
                        <p className="whitespace-pre-line text-sm leading-relaxed text-vintage-ice">{t('leaderboardInfoDesc')}</p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Navigation */}
            <div className="mt-3 md:mt-6 pt-3 border-t border-vintage-gold/20 flex items-center justify-between gap-2 md:gap-4 flex-shrink-0">
              {/* Previous Button */}
              <button
                onClick={() => {
                  if (tutorialPage > 1) {
                    setTutorialPage(tutorialPage - 1);
                    if (soundEnabled) AudioManager.buttonClick();
                  }
                }}
                disabled={tutorialPage === 1}
                className={`px-3 md:px-6 py-2 md:py-3 rounded-lg font-modern font-bold text-sm md:text-base transition-all ${
                  tutorialPage === 1
                    ? 'bg-vintage-black/30 text-vintage-burnt-gold/30 cursor-not-allowed border border-vintage-gold/10'
                    : 'bg-vintage-charcoal border border-vintage-gold text-vintage-gold hover:bg-vintage-gold/20 hover:scale-105'
                }`}
              >
                ← <span className="hidden sm:inline">{t('previous') || 'Previous'}</span><span className="sm:hidden">Prev</span>
              </button>

              {/* Page Indicators (Dots) */}
              <div className="flex gap-2">
                {Array.from({ length: TUTORIAL_PAGES }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-2 rounded-full transition-all ${
                      i + 1 === tutorialPage
                        ? 'w-8 bg-vintage-gold'
                        : 'w-2 bg-vintage-gold/30'
                    }`}
                  />
                ))}
              </div>

              {/* Next / Done Button */}
              {tutorialPage < TUTORIAL_PAGES ? (
                <button
                  onClick={() => {
                    setTutorialPage(tutorialPage + 1);
                    if (soundEnabled) AudioManager.buttonClick();
                  }}
                  className="px-3 md:px-6 py-2 md:py-3 rounded-lg font-modern font-bold text-sm md:text-base bg-vintage-gold text-vintage-black hover:bg-vintage-gold-dark transition-all hover:scale-105"
                >
                  <span className="hidden sm:inline">{t('next') || 'Next'}</span><span className="sm:hidden">Next</span> →
                </button>
              ) : (
                <div className="relative p-1 rounded-lg" style={{background: 'linear-gradient(145deg, #FFD700, #C9A227, #FFD700)', boxShadow: '0 0 15px rgba(255, 215, 0, 0.5)'}}>
                  <button
                    onClick={() => setShowTutorial(false)}
                    className="px-4 md:px-8 py-2 md:py-3 rounded-lg font-display font-bold text-sm md:text-base transition-all hover:scale-[1.02]"
                    style={{background: 'linear-gradient(145deg, #FFD700, #C9A227)', color: '#0C0C0C'}}
                  >
                    {t('understood')} ♠
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <header className={`flex flex-col items-center gap-3 md:gap-6 mb-4 md:mb-8 p-3 md:p-6 bg-vintage-deep-black border-2 border-vintage-gold rounded-lg shadow-[0_0_30px_rgba(255,215,0,0.3)] ${isInFarcaster ? 'mt-[70px]' : ''}`}>
        {!isInFarcaster && (
          <div className="text-center relative">
            <div className="absolute inset-0 blur-3xl opacity-30 bg-vintage-gold rounded-full" style={{boxShadow: '0 0 80px rgba(255, 215, 0, 0.4)'}}></div>
            <h1 className="relative text-3xl md:text-5xl lg:text-6xl font-display font-black text-vintage-gold tracking-wider mb-1 md:mb-2" style={{textShadow: '0 0 20px rgba(255, 215, 0, 0.5), 0 0 40px rgba(255, 215, 0, 0.3)'}}>
              VIBE MOST WANTED
            </h1>
            <p className="relative text-xs md:text-sm text-vintage-burnt-gold font-modern tracking-[0.2em] md:tracking-[0.3em] uppercase">{t('cardBattle')}</p>
          </div>
        )}

        <div className="flex flex-col md:flex-row items-center gap-2 md:gap-3 w-full md:w-auto">
          <a
            href="https://vibechain.com/market/vibe-most-wanted?ref=XCLR1DJ6LQTT"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 md:px-6 py-2.5 md:py-3 border-2 border-vintage-gold text-vintage-black font-modern font-semibold rounded-lg transition-all duration-300 shadow-gold hover:shadow-gold-lg tracking-wider flex flex-col items-center justify-center gap-1 text-sm md:text-base"
            style={{background: 'linear-gradient(145deg, #FFD700, #C9A227)'}}
          >
            <div className="flex items-center justify-center gap-2">
              <span className="text-base md:text-lg">◆</span> <span className="hidden md:inline">{t('buyCardsExternal') || 'BUY CARDS ON VIBE MARKET'}</span><span className="md:hidden">Buy Cards</span>
            </div>
            <span className="text-[10px] md:text-xs opacity-75 font-normal leading-tight">{t('orOpenYourPacks') || 'or open your sealed packs'}</span>
          </a>

          {!isInFarcaster && (
            <a
              href="https://farcaster.xyz/miniapps/UpOGC4pheWVP/vibe-most-wanted"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 md:px-6 py-2.5 md:py-3 border-2 border-purple-500 text-purple-300 hover:text-purple-100 bg-purple-900/30 hover:bg-purple-800/40 font-modern font-semibold rounded-lg transition-all duration-300 tracking-wider flex items-center gap-2 text-sm md:text-base"
            >
              <span className="text-base md:text-lg">♦</span> {t('tryMiniapp')}
            </a>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Notifications Button - Only show if user is logged in */}
          {address && userProfile && (
            <button
              onClick={() => {
                // Mark all as read
                const lastSeenKey = `defenses_last_seen_${address.toLowerCase()}`;
                localStorage.setItem(lastSeenKey, Date.now().toString());
                setUnreadDefenses(0);

                // Redirect to profile with scroll to match history
                const username = userProfile.username;
                router.push(`/profile/${username}?scrollTo=match-history`);
              }}
              className={`bg-vintage-deep-black border-2 text-vintage-gold px-3 md:px-4 py-1.5 md:py-2 rounded-lg hover:bg-vintage-gold/20 transition font-bold text-sm md:text-base relative ${
                unreadDefenses > 0 ? 'border-red-500 animate-notification-pulse' : 'border-vintage-gold'
              }`}
              title={unreadDefenses > 0 ? `${unreadDefenses} novos ataques recebidos` : 'Notificações'}
            >
              <NextImage src="/images/icons/notification.svg" alt="Notifications" width={20} height={20} />
              {unreadDefenses > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                  {unreadDefenses}
                </span>
              )}
            </button>
          )}

          <button
            onClick={() => {
              if (soundEnabled) AudioManager.buttonClick();
              setShowSettings(true);
            }}
            className="bg-vintage-deep-black border-2 border-vintage-gold text-vintage-gold px-3 md:px-4 py-1.5 md:py-2 rounded-lg hover:bg-vintage-gold/20 transition font-bold text-sm md:text-base"
            title={t('settings')}
          >
            <NextImage src="/images/icons/settings.svg" alt="Settings" width={20} height={20} className="w-5 h-5 md:w-6 md:h-6" />
          </button>

          {/* Coins Inbox - Only show here in miniapp (compact mode) */}
          {isInFarcaster && <CoinsInboxDisplay compact />}

          <Link
            href="/docs"
            className="bg-vintage-deep-black border-2 border-vintage-gold text-vintage-gold px-3 md:px-4 py-1.5 md:py-2 rounded-lg hover:bg-vintage-gold/20 transition font-bold text-sm md:text-base inline-flex items-center justify-center"
            title="Documentação"
          >
            <NextImage src="/images/icons/help.svg" alt="Help" width={20} height={20} className="w-5 h-5 md:w-6 md:h-6" />
          </Link>
        </div>
      </header>

      {!address ? (
        <div className="flex flex-col items-center justify-center py-20">
          {/* Show loading while checking for Farcaster OR if confirmed in Farcaster */}
          {isCheckingFarcaster || isInFarcaster ? (
            <div className="bg-vintage-charcoal backdrop-blur-lg p-8 rounded-2xl border-2 border-vintage-gold max-w-md text-center">
              <div className="text-6xl mb-4 text-vintage-gold font-display animate-pulse">♠</div>
              <div className="w-full px-6 py-4 bg-vintage-gold/20 text-vintage-gold rounded-xl border-2 border-vintage-gold/50 font-display font-semibold">
                {t('loading')}...
              </div>
            </div>
          ) : (
            /* Show full connect modal ONLY after confirming NOT in Farcaster */
            <div className="bg-vintage-charcoal backdrop-blur-lg p-8 rounded-2xl border-2 border-vintage-gold max-w-md text-center">
              <div className="text-6xl mb-4 text-vintage-gold font-display">♠</div>
              <h2 className="text-2xl font-bold mb-4 text-vintage-gold">{t('connectTitle')}</h2>
              <p className="text-vintage-burnt-gold mb-6">{t('connectDescription')}</p>

              <div className="flex justify-center">
                <ConnectButton.Custom>
                  {({
                    account,
                    chain,
                    openAccountModal,
                    openChainModal,
                    openConnectModal,
                    mounted,
                  }) => {
                    return (
                      <div
                        {...(!mounted && {
                          'aria-hidden': true,
                          'style': {
                            opacity: 0,
                            pointerEvents: 'none',
                            userSelect: 'none',
                          },
                        })}
                      >
                        {(() => {
                          if (!mounted || !account || !chain) {
                            return (
                              <button
                                onClick={openConnectModal}
                                className="w-full px-6 py-4 bg-vintage-gold hover:bg-vintage-gold-dark text-vintage-black rounded-xl shadow-gold hover:shadow-gold-lg transition-all font-display font-semibold"
                              >
                                {t('connectWallet')}
                              </button>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    );
                  }}
                </ConnectButton.Custom>
              </div>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Claude AI Disclaimer */}
          <div className="mb-4 bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-purple-500/10 border-2 border-purple-400/30 rounded-xl p-3 md:p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2L2 12L12 22L22 12L12 2Z" stroke="#A855F7" strokeWidth="2" fill="#A855F7" fillOpacity="0.2"/>
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-purple-300 font-bold text-sm md:text-base mb-1">
                  {t('claudeDisclaimerTitle')}
                </p>
                {/* Desktop: normal text */}
                <p className="hidden md:block text-purple-200/90 text-xs md:text-sm leading-relaxed">
                  {t('claudeDisclaimerText')}
                </p>
                {/* Mobile: scrolling marquee */}
                <div className="md:hidden overflow-hidden">
                  <p className="text-purple-200/90 text-xs leading-relaxed animate-marquee whitespace-nowrap inline-block">
                    {t('claudeDisclaimerText')}&nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Metadata Delay Warning Banner */}
          <div className="mb-4 bg-gradient-to-r from-orange-500/20 via-yellow-500/20 to-orange-500/20 border-2 border-yellow-500/50 rounded-xl p-3 md:p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="#EAB308" strokeWidth="2" fill="#EAB308" fillOpacity="0.2"/>
                  <path d="M12 8V12" stroke="#EAB308" strokeWidth="2" strokeLinecap="round"/>
                  <circle cx="12" cy="16" r="1" fill="#EAB308"/>
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-yellow-300 font-bold text-sm md:text-base mb-1">
                  {t('metadataWarningTitle')}
                </p>
                <p className="text-yellow-200/90 text-xs md:text-sm leading-relaxed">
                  {t('metadataWarningText')}
                </p>
              </div>
            </div>
          </div>

          <div className={`mb-3 md:mb-6 ${isInFarcaster ? 'fixed top-0 left-0 right-0 z-[100] m-0' : ''}`}>
            <div className={`bg-vintage-charcoal/80 backdrop-blur-lg p-2 md:p-4 ${isInFarcaster ? 'rounded-none border-b-2' : 'rounded-xl border-2'} border-vintage-gold/30 shadow-gold`}>
              <div className="flex flex-wrap items-center justify-between gap-2 md:gap-3">
                <div className="flex items-center gap-2">
                  {/* Profile Button */}
                  {userProfile ? (
                    <Link
                      href={`/profile/${userProfile.username}`}
                      onClick={() => { if (soundEnabled) AudioManager.buttonClick(); }}
                      className="flex items-center gap-2 px-4 py-2 bg-purple-600/20 hover:bg-purple-600/30 border border-vintage-gold/50 rounded-lg transition"
                    >
                      {userProfile.twitter ? (
                        <img
                          src={getAvatarUrl({ twitter: userProfile.twitter, twitterProfileImageUrl: userProfile.twitterProfileImageUrl }) || ''}
                          alt={userProfile.username}
                          className="w-6 h-6 rounded-full"
                          onError={(e) => { (e.target as HTMLImageElement).src = getAvatarFallback({ twitter: userProfile.twitter, twitterProfileImageUrl: userProfile.twitterProfileImageUrl }); }}
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-vintage-gold to-vintage-burnt-gold flex items-center justify-center text-xs font-bold text-vintage-black">
                          {userProfile.username[0].toUpperCase()}
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white">@{userProfile.username}</span>
                        <BadgeList badges={getUserBadges(userProfile.address, userProfile.userIndex ?? 9999)} size="sm" />
                      </div>
                    </Link>
                  ) : (
                    <button
                      onClick={() => {
                        if (soundEnabled) AudioManager.buttonClick();
                        setShowCreateProfile(true);
                      }}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-semibold"
                    >
                      {t('createProfile')}
                    </button>
                  )}

                  {/* Disconnect Button */}
                  <button
                    onClick={disconnectWallet}
                    className="px-3 py-2 bg-vintage-charcoal hover:bg-vintage-gold/20 text-vintage-gold rounded-lg border border-vintage-gold/50 font-modern font-semibold transition-all"
                    title={t('disconnect')}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="#D4AF37" strokeWidth="2" strokeLinecap="round"/>
                      <path d="M16 17l5-5-5-5M21 12H9" stroke="#D4AF37" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>

                  {/* Coin Balance Display */}
                  {address && userProfile && playerEconomy && (
                    <div className="bg-gradient-to-r from-vintage-gold/20 to-vintage-burnt-gold/20 border-2 border-vintage-gold px-3 md:px-4 py-1.5 md:py-2 rounded-lg flex items-center gap-2 shadow-[0_0_20px_rgba(255,215,0,0.3)]">
                      <span className="text-vintage-gold text-xl md:text-2xl font-bold">$</span>
                      <div className="flex flex-col">
                        <span className="text-vintage-gold font-display font-bold text-xs md:text-sm leading-none">
                          {(playerEconomy.coins || 0).toLocaleString()}
                        </span>
                        <span className="text-vintage-burnt-gold font-modern text-[8px] md:text-[10px] leading-none mt-0.5">
                          $TESTVBMS
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Coins Inbox - Only show in header on website (not in miniapp) */}
                  {userProfile && !isInFarcaster && <CoinsInboxDisplay />}
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className={isInFarcaster ? 'fixed bottom-0 left-0 right-0 z-[100] safe-area-bottom' : 'mb-3 md:mb-6 relative z-40'}>
            <div className={`bg-vintage-charcoal backdrop-blur-lg ${isInFarcaster ? 'rounded-none border-t-2' : 'rounded-xl border-2'} border-vintage-gold/50 ${isInFarcaster ? 'p-1' : 'p-2'} flex gap-1`}>
              <button
                onClick={() => {
                  if (soundEnabled) AudioManager.buttonClick();
                  setCurrentView('game');
                }}
                className={`flex-1 min-w-0 ${isInFarcaster ? 'px-1 py-2 flex flex-col items-center justify-center gap-0.5' : 'px-2 md:px-6 py-2 md:py-3 flex items-center gap-2'} rounded-lg font-modern font-semibold transition-all ${isInFarcaster ? 'text-[10px] leading-tight' : 'text-xs md:text-base'} ${
                  currentView === 'game'
                    ? 'bg-vintage-gold text-vintage-black shadow-gold'
                    : 'bg-vintage-black text-vintage-gold hover:bg-vintage-gold/10 border border-vintage-gold/30'
                }`}
              >
                {isInFarcaster ? (
                  <>
                    <span className="text-[10px] font-bold whitespace-nowrap">{t('title')}</span>
                    <span className="text-xl leading-none">♠</span>
                  </>
                ) : (
                  <>
                    <span className="text-base md:text-lg">♠</span>
                    <span className="hidden sm:inline">{t('title')}</span>
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  if (soundEnabled) AudioManager.buttonClick();
                  setCurrentView('missions');
                }}
                className={`flex-1 min-w-0 ${isInFarcaster ? 'px-1 py-2 flex flex-col items-center justify-center gap-0.5' : 'px-2 md:px-6 py-2 md:py-3 flex items-center gap-2'} rounded-lg font-modern font-semibold transition-all ${isInFarcaster ? 'text-[10px] leading-tight' : 'text-xs md:text-base'} ${
                  currentView === 'missions'
                    ? 'bg-vintage-gold text-vintage-black shadow-gold'
                    : 'bg-vintage-black text-vintage-gold hover:bg-vintage-gold/10 border border-vintage-gold/30'
                }`}
              >
                {isInFarcaster ? (
                  <>
                    <span className="text-[10px] font-bold whitespace-nowrap">{t('missions')}</span>
                    <span className="text-xl leading-none">◈</span>
                  </>
                ) : (
                  <>
                    <span className="text-base md:text-lg">◈</span>
                    <span className="hidden sm:inline">{t('missions')}</span>
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  if (soundEnabled) AudioManager.buttonClick();
                  setCurrentView('achievements');
                }}
                className={`flex-1 min-w-0 ${isInFarcaster ? 'px-1 py-2 flex flex-col items-center justify-center gap-0.5' : 'px-2 md:px-6 py-2 md:py-3 flex items-center gap-2'} rounded-lg font-modern font-semibold transition-all ${isInFarcaster ? 'text-[10px] leading-tight' : 'text-xs md:text-base'} ${
                  currentView === 'achievements'
                    ? 'bg-vintage-gold text-vintage-black shadow-gold'
                    : 'bg-vintage-black text-vintage-gold hover:bg-vintage-gold/10 border border-vintage-gold/30'
                }`}
              >
                {isInFarcaster ? (
                  <>
                    <span className="text-[9px] font-bold whitespace-nowrap">{t('achievements')}</span>
                    <span className="text-xl leading-none">★</span>
                  </>
                ) : (
                  <>
                    <span className="text-base md:text-lg">★</span>
                    <span className="hidden sm:inline">{t('achievements')}</span>
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  if (soundEnabled) AudioManager.buttonClick();
                  setCurrentView('leaderboard');
                }}
                className={`flex-1 min-w-0 ${isInFarcaster ? 'px-1 py-2 flex flex-col items-center justify-center gap-0.5' : 'px-2 md:px-6 py-2 md:py-3 flex items-center gap-2'} rounded-lg font-modern font-semibold transition-all ${isInFarcaster ? 'text-[10px] leading-tight' : 'text-xs md:text-base'} ${
                  currentView === 'leaderboard'
                    ? 'bg-vintage-gold text-vintage-black shadow-gold'
                    : 'bg-vintage-black text-vintage-gold hover:bg-vintage-gold/10 border border-vintage-gold/30'
                }`}
              >
                {isInFarcaster ? (
                  <>
                    <span className="text-[9px] font-bold whitespace-nowrap">{t('leaderboard')}</span>
                    <span className="text-xl leading-none">♔</span>
                  </>
                ) : (
                  <>
                    <span className="text-base md:text-lg">♔</span>
                    <span className="hidden sm:inline">{t('leaderboard')}</span>
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  if (soundEnabled) AudioManager.buttonClick();
                  setCurrentView('shop');
                }}
                className={`flex-1 min-w-0 ${isInFarcaster ? 'px-1 py-2 flex flex-col items-center justify-center gap-0.5' : 'px-2 md:px-6 py-2 md:py-3 flex items-center gap-2'} rounded-lg font-modern font-semibold transition-all ${isInFarcaster ? 'text-[10px] leading-tight' : 'text-xs md:text-base'} ${
                  currentView === 'shop'
                    ? 'bg-vintage-gold text-vintage-black shadow-gold'
                    : 'bg-vintage-black text-vintage-gold hover:bg-vintage-gold/10 border border-vintage-gold/30'
                }`}
              >
                {isInFarcaster ? (
                  <>
                    <span className="text-[10px] font-bold whitespace-nowrap">Shop</span>
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                      <polyline points="9 22 9 12 15 12 15 22" />
                    </svg>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 md:w-6 md:h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                      <polyline points="9 22 9 12 15 12 15 22" />
                    </svg>
                    <span className="hidden sm:inline">Shop</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Content wrapper with padding for fixed bars in miniapp */}
          <div className={isInFarcaster ? 'pt-[70px] pb-[65px]' : ''}>
          {errorMsg && (
            <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-4 mb-6">
              <p className="text-red-400 font-bold">✗ {t('error')}</p>
              <p className="text-red-300 text-sm mt-1">{errorMsg}</p>
              <button onClick={loadNFTs} className="mt-3 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm">{t('retryButton')}</button>
            </div>
          )}

          {status === 'fetching' && (
            <div className="flex items-center justify-center gap-3 text-vintage-neon-blue mb-6 bg-vintage-charcoal/50 p-6 rounded-xl border border-vintage-gold/30">
              <LoadingSpinner size="md" variant="purple" />
              <p className="font-medium text-lg">{t('loading')}</p>
            </div>
          )}

          {/* Game View */}
          {currentView === 'game' && (
          <>
          {/* Daily Quest Card */}
          {address && userProfile && questProgress && questProgress.quest && (
            <div className="bg-vintage-charcoal/80 backdrop-blur-lg rounded-2xl border-2 border-vintage-gold/30 p-4 md:p-6 mb-6 shadow-gold">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-3xl md:text-4xl">◈</span>
                  <div>
                    <h3 className="text-lg md:text-xl font-display font-bold text-vintage-gold">DAILY QUEST</h3>
                    <p className="text-xs md:text-sm text-vintage-burnt-gold font-modern capitalize">
                      {questProgress.quest.difficulty} • +{questProgress.quest.reward} $TESTVBMS
                    </p>
                  </div>
                </div>
                {questProgress.claimed ? (
                  <div className="px-3 md:px-4 py-1.5 md:py-2 bg-vintage-black/50 text-vintage-burnt-gold border border-vintage-gold/20 rounded-lg font-modern font-semibold text-xs md:text-sm">
                    ✓ {t('questClaimed')}
                  </div>
                ) : questProgress.completed ? (
                  <button
                    onClick={handleClaimQuestReward}
                    disabled={isClaimingQuest}
                    className="px-3 md:px-4 py-1.5 md:py-2 bg-gradient-to-r from-vintage-gold to-vintage-gold-dark text-vintage-black border-2 border-vintage-gold hover:from-vintage-gold-dark hover:to-vintage-burnt-gold rounded-lg font-modern font-semibold text-xs md:text-sm transition-all shadow-gold hover:scale-105"
                  >
                    {isClaimingQuest ? '...' : `✦ ${t('claimReward')}`}
                  </button>
                ) : null}
              </div>

              <p className="text-vintage-ice font-modern text-sm md:text-base mb-3">
                {questProgress.quest.description}
              </p>

              {!questProgress.claimed && (
                <ProgressBar
                  current={questProgress.progress}
                  target={questProgress.quest.requirement.count || 1}
                  showPercentage={true}
                  showNumbers={true}
                  size="md"
                  variant="gold"
                  animate={true}
                />
              )}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-3">
              <div className="bg-vintage-charcoal/50 backdrop-blur-lg rounded-2xl border-2 border-vintage-gold/50 p-6">
                <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
                  <h2 className="text-2xl font-display font-bold text-vintage-gold flex items-center gap-2">
                    <span className="text-3xl">♦</span>
                    {t('yourNfts')}
                    {nfts.length > 0 && <span className="text-sm text-vintage-burnt-gold">({nfts.length})</span>}
                  </h2>

                  {nfts.length > 0 && (
                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={loadNFTs}
                        disabled={status === 'fetching'}
                        className="px-4 py-2 bg-vintage-charcoal hover:bg-vintage-gold/20 disabled:bg-vintage-black disabled:text-vintage-burnt-gold border border-vintage-gold/50 text-vintage-gold rounded-lg text-sm font-modern font-semibold transition-all"
                        title="Refresh cards and metadata"
                      >
                        ↻
                      </button>
                      <select
                        value={selectedCollections.length === 0 ? 'all' : selectedCollections[0]}
                        onChange={(e) => {
                          if (e.target.value === 'all') {
                            setSelectedCollections([]);
                          } else {
                            setSelectedCollections([e.target.value as CollectionId]);
                          }
                        }}
                        className="px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-modern font-medium transition-all bg-vintage-charcoal border border-vintage-gold/30 text-vintage-gold hover:bg-vintage-gold/10 focus:outline-none focus:ring-2 focus:ring-vintage-gold [&>option]:bg-vintage-charcoal [&>option]:text-vintage-gold"
                      >
                        <option value="all" className="bg-vintage-charcoal text-vintage-gold">All</option>
                        <option value="vibe" className="bg-vintage-charcoal text-vintage-gold">VBMS</option>
                      </select>
                      <button
                        onClick={() => setSortByPower(!sortByPower)}
                        className={`px-4 py-2 rounded-lg text-sm font-modern font-medium transition-all ${
                          sortByPower
                            ? 'bg-vintage-gold text-vintage-black shadow-gold'
                            : 'bg-vintage-charcoal border border-vintage-gold/30 text-vintage-gold hover:bg-vintage-gold/10'
                        }`}
                      >
                        {sortByPower ? '↓ ' + t('sortByPower') : '⇄ ' + t('sortDefault')}
                      </button>
                      <button
                        onClick={() => setCardTypeFilter(cardTypeFilter === 'all' ? 'free' : cardTypeFilter === 'free' ? 'nft' : 'all')}
                        className={`px-4 py-2 rounded-lg text-sm font-modern font-medium transition-all ${
                          cardTypeFilter !== 'all'
                            ? 'bg-vintage-gold text-vintage-black shadow-gold'
                            : 'bg-vintage-charcoal border border-vintage-gold/30 text-vintage-gold hover:bg-vintage-gold/10'
                        }`}
                      >
                        {cardTypeFilter === 'all' ? '⊞ All Cards' : cardTypeFilter === 'free' ? '◈ FREE Only' : '🎴 NFT Only'}
                      </button>
                    </div>
                  )}
                </div>

                {nfts.length === 0 && status !== 'fetching' && (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">∅</div>
                    <p className="text-vintage-burnt-gold mb-6">{t('noNfts')}</p>
                    <div className="bg-vintage-gold/10 border border-vintage-gold/30 rounded-xl p-4 max-w-md mx-auto">
                      <p className="text-sm text-vintage-gold font-semibold mb-2">⏱️ NEWLY OPENED CARDS TAKE TIME TO APPEAR</p>
                      <p className="text-xs text-vintage-burnt-gold">
                        Cards you just opened may take 5-10 minutes to show up on the site. This is because metadata needs to be indexed. This is normal and always happens! Refresh the page after a few minutes if your new cards don't appear immediately.
                      </p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-3">
                  {displayNfts.map((nft) => (
                    <NFTCard
                      key={nft.tokenId}
                      nft={nft}
                      selected={selectedCards.some(c => c.tokenId === nft.tokenId)}
                      onSelect={handleSelectCard}
                    />
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-6">
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="px-4 py-2 bg-vintage-charcoal hover:bg-vintage-gold/20 disabled:bg-vintage-black disabled:text-vintage-burnt-gold border border-vintage-gold/50 text-vintage-gold rounded-lg transition font-modern"
                    >
                      ←
                    </button>
                    <span className="text-sm text-vintage-burnt-gold">
                      {currentPage} / {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="px-4 py-2 bg-vintage-charcoal hover:bg-vintage-gold/20 disabled:bg-vintage-black disabled:text-vintage-burnt-gold border border-vintage-gold/50 text-vintage-gold rounded-lg transition font-modern"
                    >
                      →
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div>
              <div className="bg-vintage-charcoal rounded-2xl border-2 border-vintage-gold p-6 sticky top-6 shadow-gold" style={{boxShadow: '0 0 30px rgba(255, 215, 0, 0.3), inset 0 0 60px rgba(0, 0, 0, 0.5)'}}>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-display font-bold text-vintage-gold" style={{textShadow: '0 0 10px rgba(255, 215, 0, 0.5)'}}>
                    {t('yourHand')}
                  </h2>
                  <div className="flex gap-2">
                    {nfts.length >= HAND_SIZE && selectedCards.length === 0 && (
                      <button onClick={selectStrongest} className="px-3 py-1 bg-vintage-gold/20 text-vintage-gold border border-vintage-gold/50 rounded-lg text-xs hover:bg-vintage-gold/30 transition font-modern font-semibold">
                        {t('selectStrongest')}
                      </button>
                    )}
                    {selectedCards.length > 0 && (
                      <button onClick={clearSelection} className="px-3 py-1 bg-vintage-black/50 text-vintage-gold border border-vintage-gold/50 rounded-lg text-xs hover:bg-vintage-black/70 transition font-modern">
                        {t('clearSelection')}
                      </button>
                    )}
                  </div>
                </div>

                {/* Felt Table Surface */}
                <div className="bg-vintage-felt-green p-4 rounded-xl border-2 border-vintage-gold/40 mb-4" style={{boxShadow: 'inset 0 2px 8px rgba(0, 0, 0, 0.6)', backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(0,0,0,.05) 2px, rgba(0,0,0,.05) 4px)'}}>
                  <div className="grid grid-cols-5 gap-2 min-h-[120px]">
                    {selectedCards.map((c, i) => (
                      <FoilCardEffect key={i} foilType={(c.foil === 'Standard' || c.foil === 'Prize') ? c.foil : null} className="relative aspect-[2/3] rounded-lg overflow-hidden ring-2 ring-vintage-gold shadow-gold">
                        <img src={c.imageUrl} alt={`#${c.tokenId}`} className="w-full h-full object-cover" />
                        <div className="absolute top-0 left-0 bg-vintage-gold text-vintage-black text-xs px-1 rounded-br font-bold">{c.power}</div>
                      </FoilCardEffect>
                    ))}
                    {[...Array(HAND_SIZE - selectedCards.length)].map((_, i) => (
                      <div key={`e-${i}`} className="aspect-[2/3] rounded-xl border-2 border-dashed border-vintage-gold/40 flex items-center justify-center text-vintage-gold/50 bg-vintage-felt-green/30">
                        <span className="text-2xl font-bold">+</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Illuminated Casino Panel for Defense Deck Button */}
                <div ref={playButtonsRef} className="relative p-1 rounded-xl mb-4" style={{background: 'linear-gradient(145deg, #FFD700, #C9A227, #FFD700)', boxShadow: '0 0 20px rgba(255, 215, 0, 0.5), inset 0 0 10px rgba(255, 215, 0, 0.3)'}}>
                  <div className="bg-vintage-black/90 p-4 rounded-lg">
                    <button
                      id="defense-deck-button"
                      onClick={saveDefenseDeck}
                      disabled={selectedCards.length !== HAND_SIZE || !userProfile}
                      className={`w-full px-6 py-4 rounded-xl shadow-lg text-lg font-display font-bold transition-all uppercase tracking-wide ${
                        selectedCards.length === HAND_SIZE && userProfile
                          ? 'text-vintage-black hover:shadow-gold-lg'
                          : 'bg-vintage-black/50 text-vintage-gold/40 cursor-not-allowed border border-vintage-gold/20'
                      }`}
                      style={selectedCards.length === HAND_SIZE && userProfile ? {
                        background: 'linear-gradient(145deg, #FFD700, #C9A227)',
                        boxShadow: '0 0 20px rgba(255, 215, 0, 0.6), 0 4px 8px rgba(0, 0, 0, 0.4)'
                      } : {}}
                    >
                      Save Defense Deck ({selectedCards.length}/{HAND_SIZE})
                    </button>
                    {showDefenseDeckSaved && (
                      <div className="mt-2 text-center text-green-400 font-modern font-semibold animate-pulse">
                        ✓ Defense Deck Saved!
                      </div>
                    )}
                    {/* Defense Deck Save Status (retry feedback) */}
                    {defenseDeckSaveStatus && (
                      <div className="mt-2 text-center text-yellow-400 font-modern font-semibold animate-pulse">
                        {defenseDeckSaveStatus}
                      </div>
                    )}
                  </div>
                </div>

                {/* Battle vs AI Button */}
                <div className="mb-4">
                  <button
                    onClick={() => {
                      if (soundEnabled) AudioManager.buttonClick();
                      setPokerMode('pvp'); // Reset poker mode to prevent confusion with poker CPU
                      setShowPveCardSelection(true);
                      setPveSelectedCards([]);
                    }}
                    disabled={!userProfile}
                    className={`w-full px-6 py-3 rounded-xl font-display font-bold transition-all uppercase tracking-wide ${
                      userProfile
                        ? 'bg-vintage-neon-blue hover:bg-vintage-neon-blue/80 text-vintage-black shadow-neon hover:scale-105'
                        : 'bg-vintage-black/50 text-vintage-gold/40 cursor-not-allowed border border-vintage-gold/20'
                    }`}
                  >
                    Battle vs AI
                  </button>
                </div>

                {/* Battle vs Player Button */}
                <div className="mb-4">
                  <button
                    onClick={() => {
                      if (soundEnabled) AudioManager.buttonClick();
                      setPokerMode('pvp'); // Reset poker mode to prevent confusion with poker CPU
                      setGameMode('pvp');
                      setPvpMode('pvpMenu');
                    }}
                    disabled={!userProfile}
                    className={`w-full px-6 py-3 rounded-xl font-display font-bold transition-all uppercase tracking-wide ${
                      userProfile
                        ? 'bg-vintage-gold hover:bg-vintage-gold-dark text-vintage-black shadow-gold hover:scale-105'
                        : 'bg-vintage-black/50 text-vintage-gold/40 cursor-not-allowed border border-vintage-gold/20'
                    }`}
                  >
                    Battle vs Player
                  </button>
                </div>

                {/* Poker Battle CPU Button */}
                <div className="mb-4">
                  <button
                    onClick={() => {
                      if (soundEnabled) AudioManager.buttonClick();
                      setPokerMode('cpu');
                      setTempSelectedDifficulty(pokerCpuDifficulty);
                      setIsDifficultyModalOpen(true);
                    }}
                    disabled={!userProfile}
                    className={`w-full px-6 py-3 rounded-xl font-display font-bold transition-all uppercase tracking-wide ${
                      userProfile
                        ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-neon hover:scale-105'
                        : 'bg-vintage-black/50 text-vintage-gold/40 cursor-not-allowed border border-vintage-gold/20'
                    }`}
                  >
                    Poker Battle CPU
                  </button>
                </div>

                {/* Poker Battle PvP Button */}
                <div className="mb-4">
                  <button
                    onClick={() => {
                      if (soundEnabled) AudioManager.buttonClick();
                      setPokerMode('pvp');
                      setShowPokerBattle(true);
                    }}
                    disabled={!userProfile}
                    className={`w-full px-6 py-3 rounded-xl font-display font-bold transition-all uppercase tracking-wide ${
                      userProfile
                        ? 'bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white shadow-neon hover:scale-105'
                        : 'bg-vintage-black/50 text-vintage-gold/40 cursor-not-allowed border border-vintage-gold/20'
                    }`}
                  >
                    Poker Battle PvP
                  </button>
                </div>

                <div className="mt-6 space-y-4">
                  {dealerCards.length > 0 && !showBattleScreen && (
                    <div className="bg-gradient-to-br from-vintage-wine to-vintage-black backdrop-blur p-4 rounded-xl border-2 border-vintage-gold/50">
                      <p className="text-xs font-modern font-semibold text-vintage-gold mb-3"><span className="text-lg">♦</span> {t('dealerCards').toUpperCase()}</p>
                      <div className="grid grid-cols-5 gap-2 mb-3">
                        {dealerCards.map((c, i) => (
                          <FoilCardEffect key={i} foilType={(c.foil === 'Standard' || c.foil === 'Prize') ? c.foil : null} className="relative aspect-[2/3] rounded-lg overflow-hidden ring-2 ring-red-500 shadow-lg shadow-red-500/30">
                            <img src={c.imageUrl} alt={`#${c.tokenId}`} className="w-full h-full object-cover" />
                            <div className="absolute top-0 left-0 bg-red-500 text-white text-xs px-1 rounded-br">{c.power}</div>
                            <div className="absolute bottom-0 right-0 bg-black/80 text-vintage-gold text-xs px-2 py-1 rounded-tl font-mono">#{c.tokenId}</div>
                          </FoilCardEffect>
                        ))}
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-vintage-burnt-gold">{t('dealerTotalPower')}</p>
                        {/* 🚀 Performance: Use memoized power total */}
                        <p className="text-2xl font-bold text-red-400">{dealerCardsPower}</p>
                      </div>
                    </div>
                  )}
                  
                  <div className="bg-vintage-charcoal p-6 rounded-xl border-2 border-vintage-gold shadow-gold">
                    <p className="text-xs font-semibold text-vintage-burnt-gold mb-2 font-modern flex items-center gap-2">
                      <span className="text-lg">※</span> {t('totalPower')}
                    </p>
                    <p className="text-5xl font-bold text-vintage-neon-blue font-display">{totalPower}</p>
                  </div>
                  
                  {playerPower > 0 && (
                    <div className="bg-vintage-charcoal/80 backdrop-blur p-4 rounded-xl border-2 border-vintage-gold/30 space-y-3">
                      <p className="text-xs font-semibold text-vintage-burnt-gold font-modern">§ {t('lastResult')}</p>
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-xs text-vintage-burnt-gold">{t('you')}</p>
                          <p className="text-2xl font-bold text-blue-400">{playerPower}</p>
                        </div>
                        <div className="text-2xl">✦</div>
                        <div className="text-right">
                          <p className="text-xs text-vintage-burnt-gold">{t('dealer')}</p>
                          <p className="text-2xl font-bold text-red-400">{dealerPower}</p>
                        </div>
                      </div>
                      {result && (
                        <div className="text-center pt-3 border-t border-vintage-gold/30">
                          <p className="text-xl font-bold text-yellow-300 animate-pulse">{result}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          </>
          )}

          {/* Leaderboard View */}
          {currentView === 'leaderboard' && (
            <div className="max-w-6xl mx-auto">
              <div className="bg-vintage-charcoal/80 backdrop-blur-lg rounded-2xl border-2 border-vintage-gold/30 shadow-gold p-3 md:p-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 md:gap-0 mb-4 md:mb-6">
                  <h1 className="text-2xl md:text-4xl font-bold text-yellow-400 flex items-center gap-2 md:gap-3">
                    <span className="text-2xl md:text-4xl">★</span> {t('leaderboard')}
                  </h1>
                  <div className="text-left md:text-right">
                    {userProfile && (
                      <div>
                        <p className="text-xs md:text-sm font-modern font-semibold text-vintage-gold mb-0">
                          ◈ <span className="hidden md:inline">Attacks Remaining:</span> <span className="text-vintage-neon-blue">{attacksRemaining}/{maxAttacks}</span>
                        </p>
                        <p className="text-[10px] text-vintage-burnt-gold ml-3">
                          {(() => {
                            const now = new Date();
                            const tomorrow = new Date(now);
                            tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
                            tomorrow.setUTCHours(0, 0, 0, 0);
                            const diff = tomorrow.getTime() - now.getTime();
                            const hours = Math.floor(diff / (1000 * 60 * 60));
                            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                            return `Resets in ${hours}h ${minutes}m (00:00 UTC)`;
                          })()}
                        </p>
                      </div>
                    )}
                    {/* 🔔 Farcaster Notifications Button */}
                    {isInFarcaster && userProfile && (
                      <button
                        onClick={handleEnableNotifications}
                        className="mb-1 px-2 py-1 rounded-lg bg-vintage-gold/10 hover:bg-vintage-gold/20 border border-vintage-gold/30 text-vintage-gold text-[10px] md:text-xs font-modern font-semibold transition-all hover:scale-105"
                      >
                        ◈ Enable Notifications
                      </button>
                    )}
                  </div>
                </div>

                {leaderboard.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-6xl mb-4">§</p>
                    <p className="text-vintage-burnt-gold">{t('noProfile')}</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto -mx-3 md:mx-0">
                    <table className="w-full text-sm md:text-base">
                      <thead>
                        <tr className="border-b border-vintage-gold/20">
                          <th className="text-left p-2 md:p-4 text-vintage-burnt-gold font-semibold text-xs md:text-base">#{/* {t('rank')} */}</th>
                          <th className="text-left p-2 md:p-4 text-vintage-burnt-gold font-semibold text-xs md:text-base">{t('player')}</th>
                          <th className="text-right p-2 md:p-4 text-vintage-burnt-gold font-semibold text-xs md:text-base hidden md:table-cell">Opened</th>
                          <th className="text-right p-2 md:p-4 text-vintage-burnt-gold font-semibold text-xs md:text-base">{t('power')}</th>
                          <th className="text-right p-2 md:p-4 text-vintage-burnt-gold font-semibold text-xs md:text-base hidden lg:table-cell">{t('wins')}</th>
                          <th className="text-right p-2 md:p-4 text-vintage-burnt-gold font-semibold text-xs md:text-base hidden lg:table-cell">{t('losses')}</th>
                          <th className="text-center p-2 md:p-4 text-vintage-burnt-gold font-semibold text-xs md:text-base">Weekly Reward</th>
                          <th className="text-center p-1 md:p-4 text-vintage-burnt-gold font-semibold text-xs md:text-base"><span className="hidden sm:inline">Actions</span></th>
                        </tr>
                      </thead>
                      <tbody>
                        {leaderboard
                          .slice((currentLeaderboardPage - 1) * LEADERBOARD_PER_PAGE, currentLeaderboardPage * LEADERBOARD_PER_PAGE)
                          .map((profile, sliceIndex) => {
                            const index = (currentLeaderboardPage - 1) * LEADERBOARD_PER_PAGE + sliceIndex;
                            return (
                          <tr key={profile.address} className={`border-b border-vintage-gold/10 hover:bg-vintage-gold/10 transition ${profile.address === address ? 'bg-vintage-gold/20' : ''}`}>
                            <td className="p-2 md:p-4">
                              <span className={`text-lg md:text-2xl font-bold ${
                                index === 0 ? 'text-yellow-400' :
                                index === 1 ? 'text-gray-300' :
                                index === 2 ? 'text-orange-400' :
                                'text-gray-500'
                              }`}>
                                #{index + 1}
                              </span>
                            </td>
                            <td className="p-2 md:p-4">
                              <Link href={`/profile/${profile.username}`} className="block hover:scale-105 transition-transform">
                                <div>
                                  <div className="flex items-center gap-1 md:gap-2 mb-1">
                                    <p className="font-bold text-vintage-neon-blue hover:text-cyan-300 transition-colors text-xs md:text-base">{profile.username}</p>
                                    <BadgeList badges={getUserBadges(profile.address, profile.userIndex ?? 9999)} size="xs" />
                                  </div>
                                  <p className="text-[10px] md:text-xs text-vintage-burnt-gold font-mono hidden sm:block">{profile.address.slice(0, 6)}...{profile.address.slice(-4)}</p>
                                </div>
                              </Link>
                            </td>
                            <td className="p-2 md:p-4 text-right text-green-400 font-bold text-sm md:text-base hidden md:table-cell">{profile.stats?.openedCards || 0}</td>
                            <td className="p-2 md:p-4 text-right text-yellow-400 font-bold text-base md:text-xl">{(profile.stats?.totalPower || 0).toLocaleString()}</td>
                            <td className="p-2 md:p-4 text-right text-vintage-neon-blue font-semibold text-sm md:text-base hidden lg:table-cell">{(profile.stats?.pveWins || 0) + (profile.stats?.pvpWins || 0)}</td>
                            <td className="p-2 md:p-4 text-right text-red-400 font-semibold text-sm md:text-base hidden lg:table-cell">{(profile.stats?.pveLosses || 0) + (profile.stats?.pvpLosses || 0)}</td>
                            <td className="p-2 md:p-4 text-center">
                              {/* Weekly Reward Claim Button (TOP 10 only) */}
                              {index < 10 && profile.address.toLowerCase() === address?.toLowerCase() && (() => {
                                const rank = index + 1;
                                let reward = 0;
                                if (rank === 1) reward = 1000;
                                else if (rank === 2) reward = 750;
                                else if (rank === 3) reward = 500;
                                else if (rank <= 10) reward = 300;

                                const canClaim = weeklyRewardEligibility?.eligible && weeklyRewardEligibility?.rank === rank;
                                const alreadyClaimed = weeklyRewardEligibility?.claimed;

                                if (alreadyClaimed) {
                                  return (
                                    <div className="text-[10px] md:text-xs text-vintage-burnt-gold">
                                      <div>✓ Claimed</div>
                                      <div className="text-green-400">{reward} coins</div>
                                    </div>
                                  );
                                }

                                if (canClaim) {
                                  return (
                                    <button
                                      onClick={() => {
                                        if (soundEnabled) AudioManager.buttonClick();
                                        handleClaimWeeklyLeaderboardReward();
                                      }}
                                      disabled={isClaimingWeeklyReward}
                                      className="px-2 md:px-3 py-1 md:py-1.5 rounded-lg bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-modern font-bold text-xs md:text-sm transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      {isClaimingWeeklyReward ? '...' : `🎁 Claim ${reward}`}
                                    </button>
                                  );
                                }

                                return (
                                  <div className="text-[10px] md:text-xs text-vintage-burnt-gold">
                                    <div>{reward} coins</div>
                                    <div className="text-gray-500">Next week</div>
                                  </div>
                                );
                              })()}
                              {index >= 10 && (
                                <div className="text-[10px] md:text-xs text-gray-500">-</div>
                              )}
                            </td>
                            <td className="p-1 md:p-4 text-center">
                              {profile.address.toLowerCase() !== address?.toLowerCase() && (
                                <button
                                  onClick={() => {
                                    // Check attack limit
                                    if (attacksRemaining <= 0) {
                                      alert(`You have used all ${maxAttacks} attacks for today. Attacks reset at midnight UTC.`);
                                      if (soundEnabled) AudioManager.buttonError();
                                      return;
                                    }
                                    // Open attack card selection
                                    if (soundEnabled) AudioManager.buttonClick();
                                    setTargetPlayer(profile);
                                    setShowAttackCardSelection(true);
                                    setAttackSelectedCards([]);
                                  }}
                                  disabled={!userProfile || attacksRemaining <= 0}
                                  className={`px-2 md:px-3 py-1 md:py-1.5 rounded-lg font-modern font-semibold text-xs md:text-sm transition-all ${
                                    userProfile && attacksRemaining > 0
                                      ? 'bg-red-600 hover:bg-red-700 text-white hover:scale-105'
                                      : 'bg-vintage-black/50 text-vintage-burnt-gold cursor-not-allowed border border-vintage-gold/20'
                                  }`}
                                >
                                  †<span className="hidden sm:inline"> Attack</span>
                                </button>
                              )}
                              {profile.address.toLowerCase() === address?.toLowerCase() && (
                                <span className="text-[10px] md:text-xs text-vintage-burnt-gold">(You)</span>
                              )}
                            </td>
                          </tr>
                        );
                          })}
                      </tbody>
                    </table>

                    {/* Pagination Controls - shows up to 1000 players (100 pages) */}
                    {leaderboard.length > LEADERBOARD_PER_PAGE && (
                      <div className="mt-6 flex items-center justify-center gap-2 flex-wrap">
                        <button
                          onClick={() => {
                            setCurrentLeaderboardPage(Math.max(1, currentLeaderboardPage - 1));
                            if (soundEnabled) AudioManager.buttonClick();
                          }}
                          disabled={currentLeaderboardPage === 1}
                          className="px-3 md:px-4 py-2 bg-vintage-charcoal border-2 border-vintage-gold/50 hover:border-vintage-gold disabled:border-vintage-gold/20 disabled:text-vintage-burnt-gold text-vintage-gold rounded-lg font-semibold transition text-sm md:text-base"
                        >
                          ← {t('previous')}
                        </button>

                        {/* Page numbers with ellipsis */}
                        <div className="flex gap-1 md:gap-2">
                          {(() => {
                            const totalPages = Math.ceil(leaderboard.length / LEADERBOARD_PER_PAGE);
                            const current = currentLeaderboardPage;
                            const pages: (number | string)[] = [];

                            if (totalPages <= 7) {
                              // Show all pages if 7 or fewer
                              for (let i = 1; i <= totalPages; i++) {
                                pages.push(i);
                              }
                            } else {
                              // Always show first page
                              pages.push(1);

                              // Show ellipsis or pages around current
                              if (current > 3) {
                                pages.push('ellipsis-start');
                              }

                              // Show current page ± 1
                              for (let i = Math.max(2, current - 1); i <= Math.min(totalPages - 1, current + 1); i++) {
                                pages.push(i);
                              }

                              // Show ellipsis before last page
                              if (current < totalPages - 2) {
                                pages.push('ellipsis-end');
                              }

                              // Always show last page
                              pages.push(totalPages);
                            }

                            return pages.map((page, index) => {
                              if (typeof page === 'string') {
                                return (
                                  <span key={page} className="px-2 py-2 text-vintage-burnt-gold text-sm md:text-base">
                                    ...
                                  </span>
                                );
                              }

                              return (
                                <button
                                  key={page}
                                  onClick={() => {
                                    setCurrentLeaderboardPage(page);
                                    if (soundEnabled) AudioManager.buttonClick();
                                  }}
                                  className={`px-2 md:px-3 py-2 rounded-lg font-semibold transition text-sm md:text-base ${
                                    currentLeaderboardPage === page
                                      ? 'bg-vintage-gold text-vintage-black border-2 border-vintage-gold'
                                      : 'bg-vintage-charcoal border-2 border-vintage-gold/50 hover:border-vintage-gold text-vintage-gold'
                                  }`}
                                >
                                  {page}
                                </button>
                              );
                            });
                          })()}
                        </div>

                        <button
                          onClick={() => {
                            setCurrentLeaderboardPage(Math.min(Math.ceil(leaderboard.length / LEADERBOARD_PER_PAGE), currentLeaderboardPage + 1));
                            if (soundEnabled) AudioManager.buttonClick();
                          }}
                          disabled={currentLeaderboardPage === Math.ceil(leaderboard.length / LEADERBOARD_PER_PAGE)}
                          className="px-3 md:px-4 py-2 bg-vintage-charcoal border-2 border-vintage-gold/50 hover:border-vintage-gold disabled:border-vintage-gold/20 disabled:text-vintage-burnt-gold text-vintage-gold rounded-lg font-semibold transition text-sm md:text-base"
                        >
                          {t('next')} →
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Match History Section */}
                {userProfile && (
                  <div className="mt-8">
                    <MatchHistorySection address={userProfile.address} />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 🎯 Missions View */}
          {currentView === 'missions' && (
            <div className="max-w-6xl mx-auto space-y-6">
              {/* Weekly Quests Section */}
              <div className="bg-vintage-charcoal/80 backdrop-blur-lg rounded-2xl border-2 border-vintage-gold/30 p-6 shadow-gold">
                <div className="flex items-center gap-3 mb-6">
                  <NextImage src="/images/icons/mission.svg" alt="Missions" width={48} height={48} />
                  <div>
                    <h2 className="text-2xl md:text-3xl font-display font-bold text-vintage-gold">WEEKLY MISSIONS</h2>
                    <p className="text-sm text-vintage-burnt-gold font-modern">Reset every Sunday 00:00 UTC</p>
                  </div>
                </div>

                {!address || !userProfile ? (
                  <div className="text-center py-8">
                    <p className="text-vintage-burnt-gold">Create a profile to track weekly missions</p>
                  </div>
                ) : weeklyProgress ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Attack Master Quest */}
                    {weeklyProgress.quests.weekly_attack_wins && (
                      <div className="bg-vintage-black/50 rounded-xl p-4 border border-vintage-gold/20">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <NextImage src="/images/icons/victory.svg" alt="Victory" width={32} height={32} />
                            <div>
                              <h3 className="text-lg font-bold text-vintage-gold">Attack Master</h3>
                              <p className="text-xs text-vintage-burnt-gold">Win 20 attacks</p>
                            </div>
                          </div>
                          {weeklyProgress.quests.weekly_attack_wins.claimed ? (
                            <div className="px-3 py-1.5 bg-vintage-black/50 text-vintage-burnt-gold border border-vintage-gold/20 rounded-lg text-xs font-semibold">
                              ✓ Claimed
                            </div>
                          ) : weeklyProgress.quests.weekly_attack_wins.completed ? (
                            <button
                              onClick={async () => {
                                try {
                                  await claimWeeklyReward({ address, questId: 'weekly_attack_wins' });
                                  if (soundEnabled) AudioManager.buttonSuccess();
                                } catch (error) {
                                  devError('Error claiming reward:', error);
                                  if (soundEnabled) AudioManager.buttonError();
                                }
                              }}
                              className="px-3 py-1.5 bg-gradient-to-r from-vintage-gold to-vintage-gold-dark text-vintage-black border border-vintage-gold hover:from-vintage-gold-dark hover:to-vintage-burnt-gold rounded-lg text-xs font-semibold transition-all hover:scale-105 shadow-gold"
                            >
                              ✦ Claim 300 $TESTVBMS
                            </button>
                          ) : null}
                        </div>
                        <ProgressBar
                          current={weeklyProgress.quests.weekly_attack_wins.current}
                          target={weeklyProgress.quests.weekly_attack_wins.target}
                          showPercentage={true}
                          showNumbers={true}
                          size="sm"
                          variant="gold"
                          animate={true}
                        />
                      </div>
                    )}

                    {/* Active Player Quest */}
                    {weeklyProgress.quests.weekly_total_matches && (
                      <div className="bg-vintage-black/50 rounded-xl p-4 border border-vintage-gold/20">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <NextImage src="/images/icons/battle.svg" alt="Battle" width={32} height={32} />
                            <div>
                              <h3 className="text-lg font-bold text-vintage-gold">Active Player</h3>
                              <p className="text-xs text-vintage-burnt-gold">Play 30 matches (any mode)</p>
                            </div>
                          </div>
                          {weeklyProgress.quests.weekly_total_matches.claimed ? (
                            <div className="px-3 py-1.5 bg-vintage-black/50 text-vintage-burnt-gold border border-vintage-gold/20 rounded-lg text-xs font-semibold">
                              ✓ Claimed
                            </div>
                          ) : weeklyProgress.quests.weekly_total_matches.completed ? (
                            <button
                              onClick={async () => {
                                try {
                                  await claimWeeklyReward({ address, questId: 'weekly_total_matches' });
                                  if (soundEnabled) AudioManager.buttonSuccess();
                                } catch (error) {
                                  devError('Error claiming reward:', error);
                                  if (soundEnabled) AudioManager.buttonError();
                                }
                              }}
                              className="px-3 py-1.5 bg-gradient-to-r from-vintage-gold to-vintage-gold-dark text-vintage-black border border-vintage-gold hover:from-vintage-gold-dark hover:to-vintage-burnt-gold rounded-lg text-xs font-semibold transition-all hover:scale-105 shadow-gold"
                            >
                              ✦ Claim 200 $TESTVBMS
                            </button>
                          ) : null}
                        </div>
                        <ProgressBar
                          current={weeklyProgress.quests.weekly_total_matches.current}
                          target={weeklyProgress.quests.weekly_total_matches.target}
                          showPercentage={true}
                          showNumbers={true}
                          size="sm"
                          variant="gold"
                          animate={true}
                        />
                      </div>
                    )}

                    {/* Fortress Quest */}
                    {weeklyProgress.quests.weekly_defense_wins && (
                      <div className="bg-vintage-black/50 rounded-xl p-4 border border-vintage-gold/20">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <NextImage src="/images/icons/cards.svg" alt="Defense" width={32} height={32} />
                            <div>
                              <h3 className="text-lg font-bold text-vintage-gold">Fortress</h3>
                              <p className="text-xs text-vintage-burnt-gold">Defend successfully 10 times</p>
                            </div>
                          </div>
                          {weeklyProgress.quests.weekly_defense_wins.claimed ? (
                            <div className="px-3 py-1.5 bg-vintage-black/50 text-vintage-burnt-gold border border-vintage-gold/20 rounded-lg text-xs font-semibold">
                              ✓ Claimed
                            </div>
                          ) : weeklyProgress.quests.weekly_defense_wins.completed ? (
                            <button
                              onClick={async () => {
                                try {
                                  await claimWeeklyReward({ address, questId: 'weekly_defense_wins' });
                                  if (soundEnabled) AudioManager.buttonSuccess();
                                } catch (error) {
                                  devError('Error claiming reward:', error);
                                  if (soundEnabled) AudioManager.buttonError();
                                }
                              }}
                              className="px-3 py-1.5 bg-gradient-to-r from-vintage-gold to-vintage-gold-dark text-vintage-black border border-vintage-gold hover:from-vintage-gold-dark hover:to-vintage-burnt-gold rounded-lg text-xs font-semibold transition-all hover:scale-105 shadow-gold"
                            >
                              ✦ Claim 400 $TESTVBMS
                            </button>
                          ) : null}
                        </div>
                        <ProgressBar
                          current={weeklyProgress.quests.weekly_defense_wins.current}
                          target={weeklyProgress.quests.weekly_defense_wins.target}
                          showPercentage={true}
                          showNumbers={true}
                          size="sm"
                          variant="gold"
                          animate={true}
                        />
                      </div>
                    )}

                    {/* Unbeatable Quest */}
                    {weeklyProgress.quests.weekly_pve_streak && (
                      <div className="bg-vintage-black/50 rounded-xl p-4 border border-vintage-gold/20">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">🔥</span>
                            <div>
                              <h3 className="text-lg font-bold text-vintage-gold">Unbeatable</h3>
                              <p className="text-xs text-vintage-burnt-gold">Win 10 PvE battles in a row</p>
                            </div>
                          </div>
                          {weeklyProgress.quests.weekly_pve_streak.claimed ? (
                            <div className="px-3 py-1.5 bg-vintage-black/50 text-vintage-burnt-gold border border-vintage-gold/20 rounded-lg text-xs font-semibold">
                              ✓ Claimed
                            </div>
                          ) : weeklyProgress.quests.weekly_pve_streak.completed ? (
                            <button
                              onClick={async () => {
                                try {
                                  await claimWeeklyReward({ address, questId: 'weekly_pve_streak' });
                                  if (soundEnabled) AudioManager.buttonSuccess();
                                } catch (error) {
                                  devError('Error claiming reward:', error);
                                  if (soundEnabled) AudioManager.buttonError();
                                }
                              }}
                              className="px-3 py-1.5 bg-gradient-to-r from-vintage-gold to-vintage-gold-dark text-vintage-black border border-vintage-gold hover:from-vintage-gold-dark hover:to-vintage-burnt-gold rounded-lg text-xs font-semibold transition-all hover:scale-105 shadow-gold"
                            >
                              ✦ Claim 500 $TESTVBMS
                            </button>
                          ) : null}
                        </div>
                        <ProgressBar
                          current={weeklyProgress.quests.weekly_pve_streak.current}
                          target={weeklyProgress.quests.weekly_pve_streak.target}
                          showPercentage={true}
                          showNumbers={true}
                          size="sm"
                          variant="gold"
                          animate={true}
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <LoadingSpinner size="lg" variant="gold" text="Loading missions..." />
                  </div>
                )}
              </div>

              {/* Weekly Rewards Status - Player's Current Standing */}
              <div className="bg-vintage-charcoal/80 backdrop-blur-lg rounded-2xl border-2 border-vintage-gold/30 p-6 shadow-gold mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">⏰</span>
                    <div>
                      <h3 className="text-xl font-display font-bold text-vintage-gold">NEXT DISTRIBUTION</h3>
                      <p className="text-sm text-vintage-burnt-gold font-modern">Sunday 00:00 UTC</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-display font-bold text-vintage-gold" id="weekly-countdown">
                      {(() => {
                        const now = new Date();
                        const dayOfWeek = now.getUTCDay();
                        const daysUntilSunday = dayOfWeek === 0 ? 7 : 7 - dayOfWeek;
                        const nextSunday = new Date(now);
                        nextSunday.setUTCDate(now.getUTCDate() + daysUntilSunday);
                        nextSunday.setUTCHours(0, 0, 0, 0);

                        const diff = nextSunday.getTime() - now.getTime();
                        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

                        return `${days}d ${hours}h`;
                      })()}
                    </p>
                    <p className="text-xs text-vintage-burnt-gold">remaining</p>
                  </div>
                </div>

                {/* Current Rank & Reward */}
                {userProfile && leaderboard.length > 0 && (() => {
                  const playerRank = leaderboard.findIndex(p => p.address === userProfile.address) + 1;
                  let nextReward = 0;
                  let rewardTier = '';

                  if (playerRank === 1) {
                    nextReward = 1000;
                    rewardTier = '🥇 1st Place';
                  } else if (playerRank === 2) {
                    nextReward = 750;
                    rewardTier = '🥈 2nd Place';
                  } else if (playerRank === 3) {
                    nextReward = 500;
                    rewardTier = '🥉 3rd Place';
                  } else if (playerRank >= 4 && playerRank <= 10) {
                    nextReward = 300;
                    rewardTier = `⭐ ${playerRank}th Place`;
                  } else if (playerRank > 10) {
                    rewardTier = `📊 Rank #${playerRank}`;
                  }

                  return (
                    <div className="bg-vintage-black/50 rounded-xl p-4 border border-vintage-gold/20">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-vintage-burnt-gold mb-1">Your Current Rank</p>
                          <p className="text-2xl font-display font-bold text-vintage-gold">{rewardTier}</p>
                          {playerRank > 10 && (
                            <p className="text-xs text-orange-400 mt-1">Climb to TOP 10 to earn rewards!</p>
                          )}
                        </div>
                        {nextReward > 0 && (
                          <div className="text-right">
                            <p className="text-sm text-green-400 mb-1">Next Reward</p>
                            <p className="text-3xl font-display font-bold text-green-300">+{nextReward.toLocaleString()}</p>
                            <p className="text-xs text-green-400">$TESTVBMS</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* TOP 10 Preview */}
                <div className="mt-4">
                  <h4 className="text-sm font-bold text-vintage-gold mb-2 flex items-center gap-2">
                    <span>🏆</span>
                    CURRENT TOP 10
                  </h4>
                  <div className="space-y-1 max-h-64 overflow-y-auto">
                    {leaderboard.slice(0, 10).map((profile, index) => {
                      const rank = index + 1;
                      let rankIcon = '';
                      let rewardAmount = 0;

                      if (rank === 1) { rankIcon = '🥇'; rewardAmount = 1000; }
                      else if (rank === 2) { rankIcon = '🥈'; rewardAmount = 750; }
                      else if (rank === 3) { rankIcon = '🥉'; rewardAmount = 500; }
                      else { rankIcon = '⭐'; rewardAmount = 300; }

                      const isCurrentUser = profile.address === userProfile?.address;

                      return (
                        <div
                          key={profile.address}
                          className={`flex items-center justify-between p-2 rounded ${
                            isCurrentUser
                              ? 'bg-vintage-gold/20 border border-vintage-gold'
                              : 'bg-vintage-black/30'
                          }`}
                        >
                          <div className="flex items-center gap-2 flex-1">
                            <span className="text-lg w-8">{rankIcon}</span>
                            <span className="text-xs text-vintage-burnt-gold w-6">#{rank}</span>
                            <span className={`text-sm font-semibold truncate ${
                              isCurrentUser ? 'text-vintage-gold' : 'text-vintage-ice'
                            }`}>
                              {profile.username}
                              {isCurrentUser && <span className="text-xs text-vintage-burnt-gold ml-1">(you)</span>}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-yellow-400">{(profile.stats?.totalPower || 0).toLocaleString()} PWR</span>
                            <span className="text-xs text-green-400 font-bold min-w-[60px] text-right">+{rewardAmount}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Missions View */}
          {currentView === 'missions' && (
            <div className="max-w-4xl mx-auto">
              <div className="bg-vintage-charcoal/80 backdrop-blur-lg rounded-2xl border-2 border-vintage-gold/30 shadow-gold p-4 md:p-8">
                <div className="text-center mb-6">
                  <h1 className="text-3xl md:text-4xl font-display font-bold text-vintage-gold mb-2">
                    🎁 Daily Missions
                  </h1>
                  <p className="text-vintage-burnt-gold font-modern text-sm md:text-base">
                    Complete missions and claim your rewards!
                  </p>
                </div>

                {isLoadingMissions ? (
                  <div className="flex justify-center items-center py-20">
                    <LoadingSpinner size="xl" variant="gold" />
                  </div>
                ) : missions.length === 0 ? (
                  <div className="text-center py-20">
                    <p className="text-2xl mb-4">🎯</p>
                    <p className="text-vintage-burnt-gold font-modern">
                      No missions available yet. Play some matches to unlock rewards!
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-4 mb-6">
                      {missions.map((mission) => {
                        const missionInfo = getMissionInfo(mission.missionType);
                        const isClaimed = mission.claimed;
                        const isCompleted = mission.completed;

                        return (
                          <div
                            key={mission._id}
                            className={`bg-vintage-black/50 rounded-xl p-4 md:p-6 border-2 transition-all ${
                              isClaimed
                                ? 'border-vintage-gold/20 opacity-60'
                                : isCompleted
                                ? 'border-vintage-gold shadow-gold'
                                : 'border-vintage-gold/30'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-4">
                              {/* Mission Info */}
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <NextImage src={missionInfo.icon} alt={missionInfo.title} width={32} height={32} />
                                  <h3 className="text-lg md:text-xl font-display font-bold text-vintage-gold">
                                    {missionInfo.title}
                                  </h3>
                                </div>
                                <p className="text-sm md:text-base text-vintage-burnt-gold font-modern mb-3">
                                  {missionInfo.description}
                                </p>
                                <div className="flex items-center gap-2">
                                  <span className="text-vintage-gold font-bold text-lg">
                                    +{mission.reward}
                                  </span>
                                  <span className="text-vintage-burnt-gold text-sm">$TESTVBMS</span>
                                </div>
                              </div>

                              {/* Claim Button */}
                              <div className="flex-shrink-0">
                                {isClaimed ? (
                                  <div className="px-4 py-2 bg-green-600/20 border-2 border-green-500 rounded-lg text-green-400 font-bold text-sm md:text-base whitespace-nowrap">
                                    ✓ Claimed
                                  </div>
                                ) : isCompleted ? (
                                  <button
                                    onClick={() => claimMission(mission._id)}
                                    disabled={isClaimingMission === mission._id}
                                    className="px-4 py-2 bg-vintage-gold hover:bg-vintage-gold-dark text-vintage-black rounded-lg font-display font-bold text-sm md:text-base shadow-gold transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                                  >
                                    {isClaimingMission === mission._id ? 'Claiming...' : 'Claim'}
                                  </button>
                                ) : (
                                  <div className="px-4 py-2 bg-vintage-charcoal border-2 border-vintage-gold/30 rounded-lg text-vintage-burnt-gold text-sm md:text-base whitespace-nowrap">
                                    Locked
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Claim All Button */}
                    {missions.some((m) => m.completed && !m.claimed) && (
                      <div className="border-t-2 border-vintage-gold/20 pt-6">
                        <button
                          onClick={claimAllMissions}
                          disabled={isClaimingAll}
                          className="w-full px-8 py-4 bg-gradient-to-r from-vintage-gold to-vintage-burnt-gold hover:from-vintage-gold-dark hover:to-vintage-gold text-vintage-black rounded-xl font-display font-bold text-lg md:text-xl shadow-gold-lg transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isClaimingAll ? 'Claiming All...' : `🎁 Claim All Rewards (${missions.filter((m) => m.completed && !m.claimed).length})`}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
          </div>
          {/* End content wrapper */}

          {/* 🏆 Achievements View */}
          {currentView === 'achievements' && (
            <AchievementsView
              playerAddress={address}
              nfts={nfts}
              onSuccess={setSuccessMessage}
              onError={setErrorMessage}
            />
          )}

          {/* 🏪 Shop View */}
          {currentView === 'shop' && <ShopView address={address} />}

          {/* Create Profile Modal */}
          <CreateProfileModal
            isOpen={showCreateProfile && !isCheckingFarcaster}
            onClose={() => setShowCreateProfile(false)}
            address={address}
            profileUsername={profileUsername}
            setProfileUsername={setProfileUsername}
            isCreatingProfile={isCreatingProfile}
            setIsCreatingProfile={setIsCreatingProfile}
            setUserProfile={setUserProfile}
            setCurrentView={setCurrentView}
            soundEnabled={soundEnabled}
            t={t}
          />

        </>
      )}

      {/* Difficulty Selection Modal */}
      <DifficultyModal
        isOpen={isDifficultyModalOpen}
        onClose={() => {
          setIsDifficultyModalOpen(false);
          setTempSelectedDifficulty(null);
        }}
        onSelect={(difficulty) => {
          if (soundEnabled) AudioManager.buttonClick();
          setTempSelectedDifficulty(difficulty);
        }}
        onBattle={(difficulty) => {
          // Check if this is Poker CPU mode
          if (pokerMode === 'cpu') {
            if (soundEnabled) AudioManager.buttonClick();
            setPokerCpuDifficulty(difficulty);
            setIsDifficultyModalOpen(false);
            setTempSelectedDifficulty(null);
            setShowPokerBattle(true);
          } else {
            // Don't play sound here - playHand() will play AudioManager.playHand()
            setAiDifficulty(difficulty);
            setIsDifficultyModalOpen(false);
            setTempSelectedDifficulty(null);

            // Start the battle with selected cards and difficulty
            setShowPveCardSelection(false);
            setGameMode('ai');
            setPvpMode(null);
            setSelectedCards(pveSelectedCards);
            setBattleMode('normal');

            // Pass difficulty directly to playHand to avoid state timing issues
            playHand(pveSelectedCards, difficulty);
          }
        }}
        onEliminationBattle={(difficulty) => {
          if (soundEnabled) AudioManager.buttonClick();
          setAiDifficulty(difficulty);
          setEliminationDifficulty(difficulty); // Store for elimination mode
          setIsDifficultyModalOpen(false);
          setTempSelectedDifficulty(null);

          // Start elimination mode
          setShowPveCardSelection(false);
          setGameMode('ai');
          setPvpMode(null);
          setSelectedCards(pveSelectedCards);
          setBattleMode('elimination');
          setEliminationPhase('ordering');
          setOrderedPlayerCards(pveSelectedCards);
        }}
        unlockedDifficulties={unlockedDifficulties as Set<'gey' | 'goofy' | 'gooner' | 'gangster' | 'gigachad'>}
        currentDifficulty={aiDifficulty}
        tempSelected={tempSelectedDifficulty}
      />
      </div>
    </div>
  );
}