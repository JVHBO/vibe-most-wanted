'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ConvexProfileService, type UserProfile, type MatchHistory } from '@/lib/convex-profile';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import sdk from '@farcaster/miniapp-sdk';
import { BadgeList } from '@/components/Badge';
import { getUserBadges } from '@/lib/badges';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAccount } from 'wagmi';
import FoilCardEffect from '@/components/FoilCardEffect';

const ALCHEMY_API_KEY = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
const CHAIN = process.env.NEXT_PUBLIC_ALCHEMY_CHAIN || process.env.NEXT_PUBLIC_CHAIN || 'base-mainnet';
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_VIBE_CONTRACT || process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;

// Development logging helpers - only log in development mode
const isDev = process.env.NODE_ENV === 'development';
const devLog = (...args: any[]) => {
  if (isDev) console.log(...args);
};
const devWarn = (...args: any[]) => {
  if (isDev) console.warn(...args);
};
const devError = (...args: any[]) => {
  if (isDev) console.error(...args);
};

// Image cache (same as main page)
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

// URL normalization (same as main page)
function normalizeUrl(url: string): string {
  if (!url) return '';
  let u = url.trim();
  if (u.startsWith('ipfs://')) u = 'https://ipfs.io/ipfs/' + u.slice(7);
  else if (u.startsWith('ipfs/')) u = 'https://ipfs.io/ipfs/' + u.slice(5);
  u = u.replace(/^http:\/\//i, 'https://');
  return u;
}

// Get image URL with caching and proxy handling (same as main page)
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
  } catch {}

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

// Helper to find attribute
function findAttr(nft: any, trait: string): string {
  const locs = [nft?.raw?.metadata?.attributes, nft?.metadata?.attributes, nft?.metadata?.traits, nft?.raw?.metadata?.traits];
  for (const attrs of locs) {
    if (!Array.isArray(attrs)) continue;
    const found = attrs.find((a: any) => {
      const traitType = String(a?.trait_type || a?.traitType || a?.name || '').toLowerCase().trim();
      const searchTrait = trait.toLowerCase().trim();
      return traitType === searchTrait || traitType.includes(searchTrait) || searchTrait.includes(traitType);
    });
    if (found) {
      return String(found?.value || found?.trait_value || found?.displayType || '').trim();
    }
  }
  return '';
}

// Check if card is unrevealed
function isUnrevealed(nft: any): boolean {
  const hasAttrs = !!(nft?.raw?.metadata?.attributes?.length || nft?.metadata?.attributes?.length || nft?.raw?.metadata?.traits?.length || nft?.metadata?.traits?.length);

  if (!hasAttrs) return true;

  const r = (findAttr(nft, 'rarity') || '').toLowerCase();
  const s = (findAttr(nft, 'status') || '').toLowerCase();
  const n = String(nft?.name || '').toLowerCase();

  if (r === 'unopened' || s === 'unopened' || n === 'unopened' || n.includes('sealed pack')) {
    return true;
  }

  const hasImage = !!(nft?.image?.cachedUrl || nft?.image?.originalUrl || nft?.metadata?.image || nft?.raw?.metadata?.image);
  const hasRarity = r !== '';

  return !(hasImage || hasRarity);
}

// Calculate card power (same as main page)
function calcPower(nft: any): number {
  const foil = findAttr(nft, 'foil') || 'None';
  const rarity = findAttr(nft, 'rarity') || 'Common';
  const wear = findAttr(nft, 'wear') || 'Lightly Played';
  let base = 15;
  const r = rarity.toLowerCase();
  if (r.includes('legend')) base = 150;
  else if (r.includes('epic')) base = 60;
  else if (r.includes('rare')) base = 15;
  else if (r.includes('common')) base = 15;
  else base = 15;
  let wearMult = 1.0;
  const w = wear.toLowerCase();
  if (w.includes('pristine')) wearMult = 1.25;
  else if (w.includes('mint')) wearMult = 1.1;
  let foilMult = 1.0;
  const f = foil.toLowerCase();
  if (f.includes('prize')) foilMult = 15.0;
  else if (f.includes('standard')) foilMult = 2.5;
  const power = base * wearMult * foilMult;
  return Math.max(1, Math.round(power));
}

export default function ProfilePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const username = decodeURIComponent(params.username as string);
  const { t } = useLanguage();

  // Get current user address from Wagmi
  const { address: wagmiAddress } = useAccount();

  // State for Farcaster address (when in miniapp)
  const [farcasterAddress, setFarcasterAddress] = useState<string | null>(null);

  // Use Farcaster address if available, otherwise Wagmi
  const currentUserAddress = farcasterAddress || wagmiAddress;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [nfts, setNfts] = useState<any[]>([]);
  const [loadingNFTs, setLoadingNFTs] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [currentNFTPage, setCurrentNFTPage] = useState(1);
  const NFT_PER_PAGE = 12;
  const [rematchesRemaining, setRematchesRemaining] = useState<number>(5);
  const MAX_REMATCHES = 5;

  // Query match history from Convex
  const matchHistory = useQuery(
    api.matches.getMatchHistory,
    profile?.address ? { address: profile.address, limit: 20 } : "skip"
  ) || [];

  // Attack Modal States
  const [showAttackCardSelection, setShowAttackCardSelection] = useState<boolean>(false);
  const [attackSelectedCards, setAttackSelectedCards] = useState<any[]>([]);
  const [targetOpponent, setTargetOpponent] = useState<UserProfile | null>(null);

  // Filtros
  const [filterRarity, setFilterRarity] = useState<string>('all');
  const [filterFoil, setFilterFoil] = useState<string>('all');
  const [filterRevealed, setFilterRevealed] = useState<string>('revealed');

  // Auto-detect and connect Farcaster wallet if in miniapp
  useEffect(() => {
    const initFarcasterWallet = async () => {
      try {
        if (sdk && typeof sdk.wallet !== 'undefined' && sdk.wallet.ethProvider) {
          const addresses = await sdk.wallet.ethProvider.request({
            method: "eth_requestAccounts"
          });
          if (addresses && addresses[0]) {
            setFarcasterAddress(addresses[0]);
            devLog('✅ Auto-connected Farcaster wallet in profile:', addresses[0]);
          } else {
            // Failed to get address, reset state
            setFarcasterAddress(null);
          }
        }
      } catch (err) {
        devLog('⚠️ Not in Farcaster context or wallet unavailable');
        // Reset state on error
        setFarcasterAddress(null);
      }
    };
    initFarcasterWallet();
  }, []);

  // Scroll to match history if hash is present or scrollTo param exists
  useEffect(() => {
    const shouldScroll =
      (typeof window !== 'undefined' && window.location.hash === '#match-history') ||
      searchParams.get('scrollTo') === 'match-history';

    if (shouldScroll) {
      // Wait for content to load before scrolling
      setTimeout(() => {
        const matchHistoryElement = document.getElementById('match-history');
        if (matchHistoryElement) {
          matchHistoryElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
          devLog('✅ Scrolled to match history');
        } else {
          devLog('⚠️ Match history element not found');
        }
      }, 1000);
    }
  }, [matchHistory, searchParams]);

  useEffect(() => {
    async function loadProfile() {
      try {
        setLoading(true);
        setError('');

        // ✅ Busca o endereço pelo username NO CONVEX (não Firebase)
        const address = await ConvexProfileService.getAddressByUsername(username.toLowerCase());

        if (!address) {
          setError(t('profileNotFound'));
          setLoading(false);
          return;
        }

        // Carrega o perfil completo
        const profileData = await ConvexProfileService.getProfile(address);

        if (!profileData) {
          setError(t('profileNotFound'));
          setLoading(false);
          return;
        }

        setProfile(profileData);

        // Carrega NFTs do jogador usando o fetcher unificado (OTIMIZADO)
        setLoadingNFTs(true);
        try {
          devLog('🔍 Fetching NFTs for address:', address);

          // ✅ Use the unified, optimized fetcher
          const { fetchAndProcessNFTs } = await import('@/lib/nft-fetcher');

          // ✅ Load NFTs for collection display (defense deck data is already in profile)
          const enriched = await fetchAndProcessNFTs(address, {
            maxPages: 8, // ✅ Reduced from 10 to 8 for faster loading
            refreshMetadata: false, // ✅ No need to refresh metadata
          });

          devLog('✅ NFTs fully enriched:', enriched.length);
          setNfts(enriched);
        } catch (err: any) {
          devError('❌ Error loading NFTs:', err.message || err);
          // Se falhar, deixa array vazio
          setNfts([]);
        }
        setLoadingNFTs(false);

        setLoading(false);
      } catch (err: any) {
        devError('Error loading profile:', err);
        setError(t('failedToLoadProfile'));
        setLoading(false);
      }
    }

    if (username) {
      loadProfile();
    }
  }, [username]);

  // Calculate rematches remaining based on UTC date
  useEffect(() => {
    if (!profile) {
      setRematchesRemaining(0);
      return;
    }

    const now = new Date();
    const todayUTC = now.toISOString().split('T')[0]; // YYYY-MM-DD in UTC
    const lastRematchDate = profile.lastRematchDate || '';
    const rematchesToday = profile.rematchesToday || 0;

    if (lastRematchDate === todayUTC) {
      // Same day, use existing count
      setRematchesRemaining(Math.max(0, MAX_REMATCHES - rematchesToday));
    } else {
      // New day, reset to max rematches
      setRematchesRemaining(MAX_REMATCHES);
    }
  }, [profile]);

  // Scroll to match history if hash is present (from notifications)
  useEffect(() => {
    const handleHashScroll = () => {
      if (typeof window !== 'undefined' && window.location.hash === '#match-history') {
        // Wait for content to load
        setTimeout(() => {
          const element = document.getElementById('match-history');
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 500);
      }
    };

    // Run on mount
    handleHashScroll();

    // Listen for hash changes
    window.addEventListener('hashchange', handleHashScroll);

    return () => {
      window.removeEventListener('hashchange', handleHashScroll);
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-vintage-black flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-cyan-500 border-t-transparent mb-4"></div>
          <p className="text-white text-xl">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-vintage-black flex items-center justify-center p-4">
        <div className="text-center bg-red-900/20 border border-red-500/50 rounded-xl p-8 max-w-md">
          <p className="text-red-400 text-2xl mb-4">❌ {error || 'Profile not found'}</p>
          <button
            onClick={() => router.push('/')}
            className="bg-purple-600 hover:bg-purple-700 px-6 py-3 rounded-lg font-bold transition-all"
          >
            ← Back to Game
          </button>
        </div>
      </div>
    );
  }

  const totalWins = (profile.stats.pveWins || 0) + (profile.stats.pvpWins || 0);
  const totalLosses = (profile.stats.pveLosses || 0) + (profile.stats.pvpLosses || 0);
  const totalMatches = totalWins + totalLosses;
  const winRate = totalMatches > 0 ? ((totalWins / totalMatches) * 100).toFixed(1) : '0';

  const copyAddress = async () => {
    if (profile?.address) {
      try {
        await navigator.clipboard.writeText(profile.address);
        setCopiedAddress(true);
        setTimeout(() => setCopiedAddress(false), 2000);
      } catch (err) {
        devError('Failed to copy address:', err);
      }
    }
  };

  // Helper functions para estilização das cartas (mesma lógica da página principal)
  const getRarityRing = (rarity: string) => {
    const r = (rarity || '').toLowerCase();
    if (r.includes('legend')) return 'ring-vintage-gold shadow-gold-lg';
    if (r.includes('epic')) return 'ring-vintage-silver shadow-neon';
    if (r.includes('rare')) return 'ring-vintage-burnt-gold shadow-gold';
    return 'ring-vintage-charcoal shadow-lg';
  };

  const getFoilEffect = (foil: string) => {
    const f = (foil || '').toLowerCase();
    if (f.includes('prize')) return 'prize-foil';
    if (f.includes('standard')) return 'standard-foil';
    return '';
  };

  // Filtrar NFTs
  const filteredNfts = nfts.filter(nft => {
    // Use enriched data directly
    const rarity = nft.rarity || '';
    const foilTrait = nft.foil || '';
    const revealed = !isUnrevealed(nft);

    // Filtro de revelação
    if (filterRevealed === 'revealed' && !revealed) return false;
    if (filterRevealed === 'unrevealed' && revealed) return false;

    // Filtro de raridade (só aplica em cartas reveladas)
    if (revealed && filterRarity !== 'all') {
      if (!rarity.toLowerCase().includes(filterRarity.toLowerCase())) return false;
    }

    // Filtro de foil (só aplica em cartas reveladas)
    if (revealed && filterFoil !== 'all') {
      if (filterFoil === 'none' && foilTrait) return false;
      if (filterFoil === 'standard' && !foilTrait.toLowerCase().includes('standard')) return false;
      if (filterFoil === 'prize' && !foilTrait.toLowerCase().includes('prize')) return false;
    }

    return true;
  });

  return (
    <div className="min-h-screen bg-vintage-black text-vintage-ice p-4 lg:p-8 overflow-x-hidden">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-6">
        <button
          onClick={() => router.push('/')}
          className="text-vintage-gold hover:text-vintage-gold-dark transition-colors mb-4 flex items-center gap-2 font-modern font-semibold"
        >
          ← Back to Game
        </button>
      </div>

      {/* Profile Header */}
      <div className="max-w-6xl mx-auto mb-8">
        <div className="bg-vintage-charcoal rounded-2xl border-2 border-vintage-gold p-8 shadow-gold">
          <div className="flex flex-col md:flex-row items-center gap-6">
            {/* Avatar */}
            <div className="w-32 h-32 bg-gradient-to-br from-vintage-gold to-vintage-burnt-gold rounded-full flex items-center justify-center text-6xl font-display font-bold shadow-gold overflow-hidden">
              {profile.twitter ? (
                <img
                  src={`https://unavatar.io/x/${profile.twitter.replace('@', '')}`}
                  alt={profile.username}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Try alternative services as fallback
                    const img = e.target as HTMLImageElement;
                    if (!profile.twitter) return;
                    const twitter = profile.twitter.replace('@', '');

                    if (img.src.includes('unavatar.io')) {
                      // Fallback to another service
                      img.src = `https://avatars.githubusercontent.com/${twitter}`;
                    } else if (img.src.includes('github')) {
                      // Final fallback: show initials
                      img.style.display = 'none';
                      img.parentElement!.innerHTML = `<span class="text-6xl font-display font-bold">${profile.username.substring(0, 2).toUpperCase()}</span>`;
                    }
                  }}
                />
              ) : (
                <span>{profile.username.substring(0, 2).toUpperCase()}</span>
              )}
            </div>

            {/* Profile Info */}
            <div className="flex-1 text-center md:text-left">
              <div className="flex flex-col md:flex-row items-center md:items-start gap-3 mb-2">
                <h1 className="text-4xl md:text-5xl font-display font-bold text-vintage-gold">
                  {profile.username}
                </h1>
                <div className="flex items-center gap-2">
                  <BadgeList badges={getUserBadges(profile.address, profile.userIndex ?? 9999)} size="md" />
                </div>
              </div>
              <div className="flex items-center gap-2 justify-center md:justify-start mb-2 max-w-full">
                <p className="text-vintage-burnt-gold font-mono text-sm">
                  {/* Mobile/miniapp: truncated format */}
                  <span className="md:hidden">
                    {profile.address.slice(0, 6)}...{profile.address.slice(-4)}
                  </span>
                  {/* Desktop: full address */}
                  <span className="hidden md:inline">
                    {profile.address}
                  </span>
                </p>
                <button
                  onClick={copyAddress}
                  className="px-2 py-1 bg-vintage-charcoal hover:bg-vintage-gold/20 border border-vintage-gold/50 rounded text-vintage-gold hover:text-vintage-ice transition-all text-xs font-modern font-semibold flex-shrink-0"
                  title="Copy wallet address"
                >
                  {copiedAddress ? t('addressCopied') : t('copyAddress')}
                </button>
              </div>
              {profile.twitter && (
                <a
                  href={`https://twitter.com/${profile.twitter.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-vintage-neon-blue hover:text-vintage-gold inline-flex items-center gap-1 font-modern"
                >
                  𝕏 @{profile.twitter.replace('@', '')}
                </a>
              )}
            </div>

            {/* Quick Stats */}
            <div className="flex gap-4">
              <div className="bg-vintage-black/50 px-6 py-3 rounded-xl border-2 border-vintage-gold text-center">
                <p className="text-3xl font-bold text-vintage-gold">{totalWins}</p>
                <p className="text-xs text-vintage-burnt-gold font-modern">WINS</p>
              </div>
              <div className="bg-vintage-black/50 px-6 py-3 rounded-xl border-2 border-vintage-silver text-center">
                <p className="text-3xl font-bold text-vintage-silver">{totalLosses}</p>
                <p className="text-xs text-vintage-burnt-gold font-modern">LOSSES</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="max-w-6xl mx-auto mb-8">
        <h2 className="text-2xl font-display font-bold mb-4 flex items-center gap-2 text-vintage-gold">
          <span className="text-3xl">♦</span> Statistics
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-vintage-charcoal p-6 rounded-xl border-2 border-vintage-gold/50">
            <p className="text-xs text-vintage-burnt-gold mb-1 font-modern">♠ TOTAL CARDS</p>
            <p className="text-3xl font-bold text-vintage-gold">{nfts.length || profile.stats.totalCards}</p>
          </div>
          <div className="bg-vintage-charcoal p-6 rounded-xl border-2 border-vintage-gold/50">
            <p className="text-xs text-vintage-burnt-gold mb-1 font-modern">◆ TOTAL POWER</p>
            <p className="text-3xl font-bold text-vintage-gold">{(profile.stats.totalPower || 0).toLocaleString()}</p>
          </div>
          <div className="bg-vintage-charcoal p-6 rounded-xl border-2 border-vintage-neon-blue/50">
            <p className="text-xs text-vintage-burnt-gold mb-1 font-modern">♣ PvE RECORD</p>
            <p className="text-2xl font-bold text-vintage-neon-blue">
              {profile.stats.pveWins || 0}W / {profile.stats.pveLosses || 0}L
            </p>
          </div>
          <div className="bg-vintage-charcoal p-6 rounded-xl border-2 border-vintage-silver/50">
            <p className="text-xs text-vintage-burnt-gold mb-1 font-modern">♥ PvP RECORD</p>
            <p className="text-2xl font-bold text-vintage-silver">
              {profile.stats.pvpWins || 0}W / {profile.stats.pvpLosses || 0}L
            </p>
          </div>
        </div>

        {/* Win Rate */}
        <div className="mt-4 bg-vintage-charcoal p-6 rounded-xl border-2 border-vintage-gold">
          <div className="flex items-center justify-between mb-2">
            <p className="text-vintage-burnt-gold font-modern font-semibold">OVERALL WIN RATE</p>
            <p className="text-3xl font-bold text-vintage-gold">{winRate}%</p>
          </div>
          <div className="w-full bg-vintage-black rounded-full h-4 overflow-hidden border border-vintage-gold/30">
            <div
              className="bg-gradient-to-r from-vintage-gold to-vintage-burnt-gold h-full transition-all duration-500"
              style={{ width: `${winRate}%` }}
            />
          </div>
        </div>
      </div>

      {/* Defense Deck */}
      {profile.defenseDeck && profile.defenseDeck.length === 5 && (() => {
        // Validate defense deck data
        const validCards = profile.defenseDeck.filter(card =>
          card &&
          card.tokenId &&
          typeof card.power === 'number' &&
          !isNaN(card.power) &&
          card.imageUrl &&
          card.imageUrl !== 'undefined' &&
          card.imageUrl !== ''
        );

        const hasInvalidData = validCards.length !== 5;

        return (
          <div className="max-w-6xl mx-auto mb-8">
            <h2 className="text-2xl font-display font-bold mb-4 flex items-center gap-2 text-vintage-gold">
              <span className="text-3xl">🛡️</span> Defense Deck
            </h2>
            <div className="bg-vintage-charcoal p-6 rounded-xl border-2 border-vintage-gold">
              {hasInvalidData ? (
                <div className="text-center py-8">
                  <p className="text-vintage-burnt-gold mb-4">⚠️ Defense deck has corrupted data</p>
                  <p className="text-sm text-vintage-silver">Player needs to reset their defense deck</p>
                </div>
              ) : (
                <>
                  <p className="text-sm text-vintage-burnt-gold mb-4 font-modern">
                    These cards will defend when this player is attacked
                  </p>
                  <div className="grid grid-cols-5 gap-4">
                    {validCards.map((card, i) => (
                      <FoilCardEffect key={i} foilType={(card.foil === 'Standard' || card.foil === 'Prize') ? card.foil : null} className="relative aspect-[2/3] rounded-lg overflow-hidden ring-2 ring-vintage-gold shadow-lg shadow-vintage-gold/30">
                        <img
                          src={card.imageUrl}
                          alt={`#${card.tokenId}`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            // Fallback for broken images
                            e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="300"%3E%3Crect width="200" height="300" fill="%23222"%2F%3E%3Ctext x="50%25" y="50%25" fill="%23FFD700" text-anchor="middle" dominant-baseline="middle" font-family="monospace"%3E%23' + card.tokenId + '%3C/text%3E%3C/svg%3E';
                          }}
                        />
                        <div className="absolute top-0 left-0 bg-vintage-gold text-vintage-black text-sm px-2 py-1 rounded-br font-bold">
                          {card.power}
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-vintage-black/90 to-transparent p-2">
                          <p className="text-xs text-vintage-gold font-modern">#{card.tokenId}</p>
                        </div>
                      </FoilCardEffect>
                    ))}
                  </div>
                  <div className="mt-4 text-center">
                    <p className="text-xs text-vintage-burnt-gold">Total Defense Power</p>
                    <p className="text-3xl font-bold text-vintage-gold">
                      {validCards.reduce((sum, card) => sum + (Number(card.power) || 0), 0)}
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        );
      })()}

      {/* NFT Cards Collection */}
      <div className="max-w-6xl mx-auto mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-display font-bold flex items-center gap-2 text-vintage-gold">
            <span className="text-3xl">♠</span> Card Collection ({filteredNfts.length} / {nfts.length})
          </h2>
          <button
            onClick={() => {
              setLoadingNFTs(true);
              window.location.reload();
            }}
            disabled={loadingNFTs}
            className="px-4 py-2 bg-vintage-charcoal hover:bg-vintage-gold/20 disabled:bg-vintage-black disabled:text-vintage-burnt-gold border border-vintage-gold/50 text-vintage-gold rounded-lg text-sm font-modern font-semibold transition-all"
            title="Refresh cards and metadata"
          >
            🔄 Refresh
          </button>
        </div>

        {/* Filtros */}
        <div className="bg-vintage-charcoal border-2 border-vintage-gold/50 rounded-xl p-4 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Filtro de Revelação */}
            <div>
              <label className="block text-sm font-modern font-semibold text-vintage-gold mb-2">♦ CARD STATUS</label>
              <select
                value={filterRevealed}
                onChange={(e) => {
                  setFilterRevealed(e.target.value);
                  setCurrentNFTPage(1);
                }}
                className="w-full bg-vintage-black border border-vintage-gold/50 rounded-lg px-3 py-2 text-vintage-gold focus:outline-none focus:ring-2 focus:ring-vintage-gold font-modern"
              >
                <option value="all">All Cards</option>
                <option value="revealed">Revealed Only</option>
                <option value="unrevealed">Unopened Packs</option>
              </select>
            </div>

            {/* Filtro de Raridade */}
            <div>
              <label className="block text-sm font-modern font-semibold text-vintage-gold mb-2">♣ RARITY</label>
              <select
                value={filterRarity}
                onChange={(e) => {
                  setFilterRarity(e.target.value);
                  setCurrentNFTPage(1);
                }}
                className="w-full bg-vintage-black border border-vintage-gold/50 rounded-lg px-3 py-2 text-vintage-gold focus:outline-none focus:ring-2 focus:ring-vintage-gold font-modern"
                disabled={filterRevealed === 'unrevealed'}
              >
                <option value="all">All Rarities</option>
                <option value="common">Common</option>
                <option value="rare">Rare</option>
                <option value="epic">Epic</option>
                <option value="legendary">Legendary</option>
              </select>
            </div>

            {/* Filtro de Foil */}
            <div>
              <label className="block text-sm font-modern font-semibold text-vintage-gold mb-2">♥ FOIL</label>
              <select
                value={filterFoil}
                onChange={(e) => {
                  setFilterFoil(e.target.value);
                  setCurrentNFTPage(1);
                }}
                className="w-full bg-vintage-black border border-vintage-gold/50 rounded-lg px-3 py-2 text-vintage-gold focus:outline-none focus:ring-2 focus:ring-vintage-gold font-modern"
                disabled={filterRevealed === 'unrevealed'}
              >
                <option value="all">All Foils</option>
                <option value="none">No Foil</option>
                <option value="standard">Standard Foil</option>
                <option value="prize">Prize Foil</option>
              </select>
            </div>
          </div>

          {/* Reset Filters Button */}
          {(filterRarity !== 'all' || filterFoil !== 'all' || filterRevealed !== 'revealed') && (
            <button
              onClick={() => {
                setFilterRarity('all');
                setFilterFoil('all');
                setFilterRevealed('revealed');
                setCurrentNFTPage(1);
              }}
              className="mt-4 bg-vintage-gold hover:bg-vintage-gold-dark text-vintage-black px-4 py-2 rounded-lg text-sm font-modern font-semibold transition-all"
            >
              ↻ Reset Filters
            </button>
          )}
        </div>
        {loadingNFTs ? (
          <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent mb-4"></div>
            <p className="text-gray-400">Loading cards...</p>
          </div>
        ) : nfts.length === 0 ? (
          <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-8 text-center">
            <p className="text-gray-400">{t('noCardsInCollection')}</p>
          </div>
        ) : filteredNfts.length === 0 ? (
          <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-8 text-center">
            <p className="text-gray-400">{t('noCardsMatchFilters')}</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-3">
              {filteredNfts
                .slice((currentNFTPage - 1) * NFT_PER_PAGE, currentNFTPage * NFT_PER_PAGE)
                .map((nft) => {
                  const tokenId = nft.tokenId;
                  const power = nft.power || 0;
                  const rarity = nft.rarity || 'Common';
                  const wear = nft.wear || '';
                  const foilValue = nft.foil || '';
                  const imageUrl = nft.imageUrl || '';
                  const openSeaUrl = `https://opensea.io/assets/base/${CONTRACT_ADDRESS}/${tokenId}`;

                  const foilEffect = getFoilEffect(foilValue);
                  const isLegendary = (rarity || '').toLowerCase().includes('legend');

                  const getRarityColor = (r: string) => {
                    const rLower = (r || '').toLowerCase();
                    if (rLower.includes('legend')) return 'from-orange-500 to-yellow-400';
                    if (rLower.includes('epic')) return 'from-purple-500 to-pink-500';
                    if (rLower.includes('rare')) return 'from-blue-500 to-cyan-400';
                    return 'from-gray-600 to-gray-500';
                  };

                  return (
                    <div
                      key={tokenId}
                      className="relative group transition-all duration-300 hover:scale-105 cursor-pointer"
                      style={{filter: 'drop-shadow(0 8px 16px rgba(0, 0, 0, 0.6))'}}
                    >
                      <div
                        className={`relative overflow-hidden rounded-xl ring-2 ${getRarityRing(rarity)} hover:ring-vintage-gold/50 ${isLegendary ? 'legendary-card' : ''}`}
                        style={{boxShadow: 'inset 0 0 10px rgba(255, 215, 0, 0.1)'}}
                      >
                        <img
                          src={imageUrl}
                          alt={`#${tokenId}`}
                          className="w-full aspect-[2/3] object-cover bg-vintage-deep-black pointer-events-none"
                          loading="lazy"
                        />

                        {/* Card Reflection on Hover */}
                        <div className="card-reflection"></div>

                        {/* Foil Effect */}
                        {foilEffect && (
                          <div className={`absolute inset-0 ${foilEffect}`}></div>
                        )}

                        {/* OpenSea Button (top right) */}
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                          <a
                            href={openSeaUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-vintage-neon-blue hover:bg-blue-500 text-white text-xs px-2 py-1 rounded-lg shadow-lg font-bold"
                            onClick={(e) => e.stopPropagation()}
                          >
                            OS
                          </a>
                        </div>

                        {/* Power Badge (top) */}
                        <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/95 to-transparent p-3 pointer-events-none z-20">
                          <div className="flex items-center justify-between">
                            <span className={`font-bold text-xl drop-shadow-lg bg-gradient-to-r ${getRarityColor(rarity)} bg-clip-text text-transparent`}>
                              {power} PWR
                            </span>
                          </div>
                        </div>

                        {/* Rarity + Wear Info (bottom) */}
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 via-black/80 to-transparent p-3 pointer-events-none z-20">
                          {rarity && (
                            <div className="text-xs font-bold uppercase tracking-wider text-white drop-shadow-lg">
                              {rarity}
                            </div>
                          )}
                          {wear && (
                            <div className="text-xs text-yellow-300 font-semibold drop-shadow-lg">
                              {wear}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Pagination */}
            {filteredNfts.length > NFT_PER_PAGE && (
              <div className="mt-6 flex items-center justify-center gap-1 md:gap-2 flex-wrap">
                <button
                  onClick={() => setCurrentNFTPage(Math.max(1, currentNFTPage - 1))}
                  disabled={currentNFTPage === 1}
                  className="px-2 md:px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 text-white rounded-lg font-semibold transition text-xs md:text-base"
                >
                  <span className="hidden sm:inline">← Previous</span>
                  <span className="sm:hidden">←</span>
                </button>

                <div className="flex gap-1 md:gap-2">
                  {(() => {
                    const totalPages = Math.ceil(filteredNfts.length / NFT_PER_PAGE);
                    const maxVisible = 5; // Mostrar no máximo 5 páginas no mobile
                    const pages: (number | string)[] = [];

                    if (totalPages <= maxVisible) {
                      // Se tem poucas páginas, mostra todas
                      for (let i = 1; i <= totalPages; i++) pages.push(i);
                    } else {
                      // Mostrar páginas ao redor da atual
                      if (currentNFTPage <= 3) {
                        for (let i = 1; i <= 4; i++) pages.push(i);
                        pages.push('...');
                        pages.push(totalPages);
                      } else if (currentNFTPage >= totalPages - 2) {
                        pages.push(1);
                        pages.push('...');
                        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
                      } else {
                        pages.push(1);
                        pages.push('...');
                        pages.push(currentNFTPage - 1);
                        pages.push(currentNFTPage);
                        pages.push(currentNFTPage + 1);
                        pages.push('...');
                        pages.push(totalPages);
                      }
                    }

                    return pages.map((page, idx) =>
                      typeof page === 'string' ? (
                        <span key={`ellipsis-${idx}`} className="w-8 md:w-10 h-8 md:h-10 flex items-center justify-center text-gray-500">...</span>
                      ) : (
                        <button
                          key={page}
                          onClick={() => setCurrentNFTPage(page)}
                          className={`w-8 md:w-10 h-8 md:h-10 rounded-lg font-semibold transition text-xs md:text-base ${
                            currentNFTPage === page
                              ? 'bg-purple-600 text-white'
                              : 'bg-gray-700 hover:bg-gray-600 text-white'
                          }`}
                        >
                          {page}
                        </button>
                      )
                    );
                  })()}
                </div>

                <button
                  onClick={() => setCurrentNFTPage(Math.min(Math.ceil(filteredNfts.length / NFT_PER_PAGE), currentNFTPage + 1))}
                  disabled={currentNFTPage === Math.ceil(filteredNfts.length / NFT_PER_PAGE)}
                  className="px-2 md:px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 text-white rounded-lg font-semibold transition text-xs md:text-base"
                >
                  <span className="hidden sm:inline">Next →</span>
                  <span className="sm:hidden">→</span>
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Match History */}
      <div id="match-history" className="max-w-6xl mx-auto scroll-mt-24">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            📜 Match History
          </h2>
          {profile.address.toLowerCase() === currentUserAddress?.toLowerCase() && (
            <p className="text-xs md:text-sm font-modern font-semibold text-vintage-gold">
              ⚔️ Revanches Restantes: <span className="text-vintage-neon-blue">{rematchesRemaining}/{MAX_REMATCHES}</span>
              <span className="block text-[10px] text-vintage-burnt-gold">Resetam à meia-noite (UTC)</span>
            </p>
          )}
        </div>
        {matchHistory.length === 0 ? (
          <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-8 text-center">
            <p className="text-gray-400">No matches played yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {matchHistory.map((match) => {
              const isWin = match.result === 'win';
              const isTie = match.result === 'tie';
              const borderColor = isWin ? 'border-green-500/50' : isTie ? 'border-yellow-500/50' : 'border-red-500/50';
              const bgColor = isWin ? 'from-green-900/20' : isTie ? 'from-yellow-900/20' : 'from-red-900/20';
              const resultColor = isWin ? 'text-green-400' : isTie ? 'text-yellow-400' : 'text-red-400';
              const resultText = isWin ? '♔ VICTORY' : isTie ? '♦ TIE' : '♠ DEFEAT';

              return (
                <div
                  key={match._id}
                  className={`bg-vintage-charcoal border-2 ${borderColor} rounded-xl p-4 hover:scale-[1.02] transition-transform`}
                >
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      {/* Match Type & Result */}
                      <div className="flex items-center gap-4">
                        <div className="text-3xl text-vintage-gold">
                          {match.type === 'pvp' ? '♥' : match.type === 'attack' ? '⚔️' : match.type === 'defense' ? '🛡️' : '♣'}
                        </div>
                        <div>
                          <p className={`font-display font-bold text-lg ${resultColor}`}>{resultText}</p>
                          <p className="text-xs text-vintage-burnt-gold font-modern">
                            {match.type === 'pvp' ? 'PLAYER VS PLAYER' :
                             match.type === 'attack' ? 'YOU ATTACKED' :
                             match.type === 'defense' ? 'YOU WERE ATTACKED' :
                             'PLAYER VS ENVIRONMENT'}
                          </p>
                          <p className="text-xs text-vintage-burnt-gold/70">
                            {new Date(match.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>

                      {/* Power Stats */}
                      <div className="flex items-center gap-4">
                        <div className="text-center bg-vintage-black/50 px-4 py-2 rounded-lg border border-vintage-gold/50">
                          <p className="text-xs text-vintage-burnt-gold font-modern">YOUR POWER</p>
                          <p className="text-xl font-bold text-vintage-gold">{match.playerPower}</p>
                        </div>
                        <div className="text-2xl text-vintage-burnt-gold font-bold">VS</div>
                        <div className="text-center bg-vintage-black/50 px-4 py-2 rounded-lg border border-vintage-silver/50">
                          <p className="text-xs text-vintage-burnt-gold font-modern">OPPONENT</p>
                          <p className="text-xl font-bold text-vintage-silver">{match.opponentPower}</p>
                        </div>
                      </div>

                      {/* Opponent Address (if PvP/Attack/Defense) */}
                      {match.opponentAddress && (
                        <div className="text-xs text-vintage-gold font-mono bg-vintage-black/50 px-3 py-2 rounded-lg border border-vintage-gold/30">
                          vs {match.opponentAddress.slice(0, 6)}...{match.opponentAddress.slice(-4)}
                          {match.opponentUsername && (
                            <span className="block text-vintage-burnt-gold mt-1">@{match.opponentUsername}</span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Rematch Button - Only if LOST and has opponent */}
                    {match.result === 'loss' && match.opponentAddress && (match.type === 'pvp' || match.type === 'attack' || match.type === 'defense') &&
                     profile.address.toLowerCase() === currentUserAddress?.toLowerCase() && (
                      <div className="flex justify-end">
                        <button
                          onClick={async () => {
                            if (rematchesRemaining <= 0) {
                              alert('Você usou todas as 5 revanches de hoje! Revanches resetam à meia-noite (UTC).');
                              return;
                            }

                            // Validate opponent address
                            if (!match.opponentAddress) {
                              alert('Endereço do oponente não encontrado');
                              return;
                            }

                            // Load opponent profile
                            const opponentProfile = await ConvexProfileService.getProfile(match.opponentAddress);
                            if (!opponentProfile) {
                              alert('Oponente não encontrado');
                              return;
                            }

                            // Update rematch count in Firebase
                            try {
                              const now = new Date();
                              const todayUTC = now.toISOString().split('T')[0];

                              await ConvexProfileService.updateProfile(profile.address, {
                                rematchesToday: (profile.rematchesToday || 0) + 1,
                                lastRematchDate: todayUTC
                              });

                              // Update local state
                              setRematchesRemaining(prev => Math.max(0, prev - 1));
                            } catch (err) {
                              devError('Failed to update rematch count:', err);
                            }

                            // ✅ Open attack modal directly in profile (no redirect!)
                            setTargetOpponent(opponentProfile);
                            setAttackSelectedCards([]);
                            setShowAttackCardSelection(true);
                          }}
                          disabled={rematchesRemaining <= 0}
                          className={`px-4 py-2 rounded-lg font-modern font-semibold text-sm transition-all flex items-center gap-2 ${
                            rematchesRemaining > 0
                              ? 'bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white hover:scale-105'
                              : 'bg-vintage-black/50 text-vintage-burnt-gold cursor-not-allowed border border-vintage-gold/20'
                          }`}
                        >
                          <span>⚔️</span>
                          <span>Revanche</span>
                          <span className="text-xs opacity-75">({rematchesRemaining}/5)</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Attack Card Selection Modal (Simplified for Profile) */}
      {showAttackCardSelection && targetOpponent && nfts.length > 0 && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[150] p-4 overflow-y-auto">
          <div className="bg-vintage-charcoal rounded-2xl border-2 border-red-600 max-w-4xl w-full p-4 shadow-lg shadow-red-600/50 my-4 max-h-[95vh] overflow-y-auto">
            <h2 className="text-3xl font-display font-bold text-center mb-2 text-red-500">
              ⚔️ ATTACK {targetOpponent.username.toUpperCase()}
            </h2>
            <p className="text-center text-vintage-burnt-gold mb-6 text-sm font-modern">
              Choose 5 cards to attack with ({attackSelectedCards.length}/5 selected)
            </p>

            {/* Selected Cards Display */}
            <div className="mb-3 p-2 bg-vintage-black/50 rounded-xl border border-red-600/50">
              <div className="grid grid-cols-5 gap-1.5">
                {attackSelectedCards.map((card, i) => (
                  <div key={i} className="relative aspect-[2/3] rounded-lg overflow-hidden ring-2 ring-red-600 shadow-lg">
                    <img src={card.imageUrl} alt={`#${card.tokenId}`} className="w-full h-full object-cover" />
                    <div className="absolute top-0 left-0 bg-red-600 text-white text-xs px-1 rounded-br font-bold">{card.power}</div>
                  </div>
                ))}
                {Array(5 - attackSelectedCards.length).fill(0).map((_, i) => (
                  <div key={`e-${i}`} className="aspect-[2/3] rounded-xl border-2 border-dashed border-red-600/40 flex items-center justify-center text-red-600/50 bg-vintage-felt-green/30">
                    <span className="text-xl font-bold">+</span>
                  </div>
                ))}
              </div>
              <div className="mt-2 text-center">
                <p className="text-xs text-vintage-burnt-gold">Your Attack Power</p>
                <p className="text-xl font-bold text-red-500">
                  {attackSelectedCards.reduce((sum, c) => sum + (c.power || 0), 0)}
                </p>
              </div>
            </div>

            {/* Available Cards Grid */}
            <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-1.5 mb-4 max-h-[45vh] overflow-y-auto p-1">
              {nfts
                .filter(nft => nft.rarity && nft.rarity.toLowerCase() !== 'unopened')
                .map((nft) => {
                const isSelected = attackSelectedCards.find(c => c.tokenId === nft.tokenId);
                return (
                  <div
                    key={nft.tokenId}
                    onClick={() => {
                      if (isSelected) {
                        setAttackSelectedCards(prev => prev.filter(c => c.tokenId !== nft.tokenId));
                      } else if (attackSelectedCards.length < 5) {
                        setAttackSelectedCards(prev => [...prev, nft]);
                      }
                    }}
                    className={`relative aspect-[2/3] rounded-lg overflow-hidden cursor-pointer transition-all ${
                      isSelected
                        ? 'ring-4 ring-red-600 scale-95'
                        : 'hover:scale-105 hover:ring-2 hover:ring-vintage-gold/50'
                    }`}
                  >
                    <img src={nft.imageUrl} alt={`#${nft.tokenId}`} className="w-full h-full object-cover" />
                    <div className="absolute top-0 left-0 bg-vintage-gold text-vintage-black text-xs px-1 rounded-br font-bold">
                      {nft.power}
                    </div>
                    {isSelected && (
                      <div className="absolute inset-0 bg-red-600/20 flex items-center justify-center">
                        <div className="bg-red-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">
                          ✓
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={() => {
                  if (attackSelectedCards.length !== 5) return;
                  // Redirect to home with attack parameter
                  router.push(`/?attack=${targetOpponent.address}`);
                }}
                disabled={attackSelectedCards.length !== 5}
                className={`w-full px-6 py-4 rounded-xl font-display font-bold text-lg transition-all uppercase tracking-wide ${
                  attackSelectedCards.length === 5
                    ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/50 hover:scale-105'
                    : 'bg-vintage-black/50 text-vintage-gold/40 cursor-not-allowed border border-vintage-gold/20'
                }`}
              >
                ⚔️ Continue to Battle ({attackSelectedCards.length}/5)
              </button>

              <button
                onClick={() => {
                  setShowAttackCardSelection(false);
                  setAttackSelectedCards([]);
                  setTargetOpponent(null);
                }}
                className="w-full px-6 py-3 bg-vintage-black hover:bg-vintage-gold/10 text-vintage-gold border border-vintage-gold/50 rounded-xl font-modern font-semibold transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
