'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ConvexProfileService, type UserProfile, type MatchHistory } from '@/lib/convex-profile';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import sdk from '@farcaster/miniapp-sdk';
import { BadgeList } from '@/components/Badge';
import { getUserBadges } from '@/lib/badges';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAccount } from 'wagmi';
import { useFarcasterVBMSBalance } from '@/lib/hooks/useFarcasterVBMS';
import FoilCardEffect from '@/components/FoilCardEffect';
import { CardLoadingSpinner } from '@/components/LoadingSpinner';
import { GiftIcon, FarcasterIcon } from '@/components/PokerIcons';
import { filterCardsByCollections, COLLECTIONS, type CollectionId, getCardUniqueId } from "@/lib/collections/index";
import { CardMedia } from '@/components/CardMedia';
import { convertIpfsUrl } from '@/lib/ipfs-url-converter';
import { openMarketplace } from '@/lib/marketplace-utils';
import { isUnrevealed as isUnrevealedShared, findAttr, calcPower } from '@/lib/nft/attributes';
import { isSameCard, findCard, getCardKey } from '@/lib/nft';
import { usePlayerCards } from '@/contexts/PlayerCardsContext';
import { getCardDisplayPower } from '@/lib/power-utils';

const ALCHEMY_API_KEY = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
const CHAIN = process.env.NEXT_PUBLIC_ALCHEMY_CHAIN || process.env.NEXT_PUBLIC_CHAIN || 'base-mainnet';
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_VIBE_CONTRACT || process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
const NEYNAR_API_KEY = process.env.NEXT_PUBLIC_NEYNAR_API_KEY;

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

// NOTE: getImage, findAttr, calcPower, isUnrevealed functions are now imported from shared modules
// This prevents code duplication and ensures consistent behavior across the app

// Use the shared isUnrevealed function (aliased as isUnrevealedShared in imports)
const isUnrevealed = isUnrevealedShared;

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
  const [localNfts, setLocalNfts] = useState<any[]>([]);
  const [loadingNFTs, setLoadingNFTs] = useState(false);

  // 🎴 Use cards from context (already loaded on home page)
  const { nfts: contextNfts, isLoading: contextLoading, status: contextStatus } = usePlayerCards();

  // 🔗 Determine if viewing own profile
  const isOwnProfile = profile && currentUserAddress && profile.address.toLowerCase() === currentUserAddress.toLowerCase();

  // 🎴 Use context cards for own profile, localNfts for others
  const nfts = isOwnProfile ? contextNfts : localNfts;
  const isNftsLoading = isOwnProfile ? contextLoading : loadingNFTs;

  const [copiedAddress, setCopiedAddress] = useState(false);
  const [currentNFTPage, setCurrentNFTPage] = useState(1);
  const [selectedCollections, setSelectedCollections] = useState<CollectionId[]>([]);
  const NFT_PER_PAGE = 30;
  const [rematchesRemaining, setRematchesRemaining] = useState<number>(5);
  const MAX_REMATCHES = 5;
  const [farcasterUsername, setFarcasterUsername] = useState<string>('');
  const [farcasterPfp, setFarcasterPfp] = useState<string>('');

  // 🚀 OPTIMIZED: Use summary query (95% bandwidth reduction)
  const matchHistory = useQuery(
    api.matches.getMatchHistorySummary,
    profile?.address ? { address: profile.address, limit: 20 } : "skip"
  );

  // 💰 Real on-chain VBMS balance for profile being viewed
  const { balance: vbmsBalance } = useFarcasterVBMSBalance(profile?.address);

  // Share Reward System
  const rewardProfileShare = useMutation(api.cardPacks.rewardProfileShare);
  const claimShareBonus = useMutation(api.economy.claimShareBonus);
  const [showShareReward, setShowShareReward] = useState(false);
  const [shareRewardMessage, setShareRewardMessage] = useState('');

  // Attack Modal States
  const [showAttackCardSelection, setShowAttackCardSelection] = useState<boolean>(false);
  const [attackSelectedCards, setAttackSelectedCards] = useState<any[]>([]);
  const [targetOpponent, setTargetOpponent] = useState<UserProfile | null>(null);

  // Filtros
  const [filterRarity, setFilterRarity] = useState<string>('all');
  const [filterFoil, setFilterFoil] = useState<string>('all');

  // Force metadata refresh state (check localStorage on mount)
  const [forceMetadataRefresh, setForceMetadataRefresh] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('forceMetadataRefresh');
      if (stored === 'true') {
        localStorage.removeItem('forceMetadataRefresh'); // Clear after reading
        return true;
      }
    }
    return false;
  });

  // Auto-detect and connect Farcaster wallet if in miniapp
  useEffect(() => {
    const initFarcasterWallet = async () => {
      try {
        if (sdk && typeof sdk.wallet !== 'undefined') {
          const provider = await sdk.wallet.getEthereumProvider();
          if (provider) {
            try {
              const addresses = await provider.request({
                method: "eth_requestAccounts"
              });
              if (addresses && addresses[0]) {
                setFarcasterAddress(addresses[0]);
                devLog('✅ Auto-connected Farcaster wallet in profile:', addresses[0]);
              } else {
                // Failed to get address, reset state
                setFarcasterAddress(null);
              }
            } catch (requestError: any) {
              // Silently handle authorization errors
              if (requestError?.message?.includes('not been authorized')) {
                devLog('⚠️ Farcaster wallet not authorized yet');
                setFarcasterAddress(null);
                return;
              }
              throw requestError;
            }
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

    if (shouldScroll && matchHistory && Array.isArray(matchHistory) && matchHistory.length >= 0) {
      // Retry scroll with exponential backoff
      let attempts = 0;
      const maxAttempts = 5;

      const attemptScroll = () => {
        attempts++;

        // Wait for next frame to ensure DOM is ready
        requestAnimationFrame(() => {
          const matchHistoryElement = document.getElementById('match-history');
          if (matchHistoryElement) {
            matchHistoryElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
            devLog(`✅ Scrolled to match history (attempt ${attempts})`);
          } else if (attempts < maxAttempts) {
            devLog(`⚠️ Match history element not found, retrying... (attempt ${attempts}/${maxAttempts})`);
            // Exponential backoff: 500ms, 1000ms, 2000ms, 3000ms, 4000ms
            setTimeout(attemptScroll, attempts * 1000);
          } else {
            devLog('❌ Failed to scroll to match history after max attempts');
          }
        });
      };

      // Initial delay to let page load
      setTimeout(attemptScroll, 500);
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

        // Busca username do Farcaster se tiver FID (usando Neynar API)
        if (profileData.fid && NEYNAR_API_KEY) {
          try {
            const fcResponse = await fetch(
              `https://api.neynar.com/v2/farcaster/user/bulk?fids=${profileData.fid}`,
              {
                headers: {
                  'accept': 'application/json',
                  'api_key': NEYNAR_API_KEY,
                },
              }
            );
            if (fcResponse.ok) {
              const fcData = await fcResponse.json();
              const fcUser = fcData.users?.[0];
              if (fcUser) {
                setFarcasterUsername(fcUser.username || '');
                setFarcasterPfp(fcUser.pfp_url || '');
              }
            }
          } catch (error) {
            console.error('Error fetching Farcaster username:', error);
          }
        }

        // ✅ Profile is loaded - show page immediately
        setLoading(false);

        // 🎴 Only fetch NFTs for OTHER users' profiles
        // Own profile uses PlayerCardsContext (already loaded on home page)
        const viewingOwnProfile = currentUserAddress && currentUserAddress.toLowerCase() === address.toLowerCase();

        if (!viewingOwnProfile) {
          setLoadingNFTs(true);
          try {
            devLog('🔍 Fetching NFTs for other user:', address);
            const res = await fetch(`/api/profile-nfts?address=${encodeURIComponent(address)}`);
            if (!res.ok) throw new Error(`API error: ${res.status}`);
            const data = await res.json();
            if (!data.success) throw new Error(data.error || 'Failed to fetch NFTs');

            // Deduplicate
            const seenCards = new Set<string>();
            const enriched = (data.cards || []).filter((card: any) => {
              const uniqueId = `${card.collection || 'vibe'}_${card.tokenId}`;
              if (seenCards.has(uniqueId)) return false;
              seenCards.add(uniqueId);
              return true;
            });

            devLog('✅ Other user NFTs loaded:', enriched.length);
            setLocalNfts(enriched);
          } catch (err: any) {
            devError('❌ Error loading NFTs:', err.message || err);
            setLocalNfts([]);
          }
          setLoadingNFTs(false);
        } else {
          devLog('🔗 Using context cards for own profile');
        }
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
        // Retry with exponential backoff
        let attempts = 0;
        const maxAttempts = 5;

        const attemptScroll = () => {
          attempts++;

          requestAnimationFrame(() => {
            const element = document.getElementById('match-history');
            if (element) {
              element.scrollIntoView({ behavior: 'smooth', block: 'start' });
              devLog(`✅ Hash scroll to match history (attempt ${attempts})`);
            } else if (attempts < maxAttempts) {
              devLog(`⚠️ Match history element not found, retrying... (attempt ${attempts}/${maxAttempts})`);
              setTimeout(attemptScroll, attempts * 1000);
            }
          });
        };

        setTimeout(attemptScroll, 500);
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

  // 🔧 FIX: Filtrar NFTs ANTES dos early returns para seguir as regras dos hooks
  // Filtrar NFTs com useMemo para evitar recalcular em todo render
  // Also includes deduplication to prevent duplicate cards
  const filteredNfts = useMemo(() => {
    // STEP 1: Deduplicate using unique ID (collection + tokenId)
    const seen = new Set<string>();
    const dedupedNfts = nfts.filter(nft => {
      const uniqueId = getCardUniqueId(nft);
      if (seen.has(uniqueId)) {
        devWarn(`⚠️ Duplicate card filtered in profile: ${uniqueId}`);
        return false;
      }
      seen.add(uniqueId);
      return true;
    });

    // STEP 2: Apply filters
    let filtered = dedupedNfts.filter(nft => {
      const rarity = nft.rarity || '';
      const foilTrait = nft.foil || '';

      // Filtro de raridade
      if (filterRarity !== 'all') {
        if (!rarity.toLowerCase().includes(filterRarity.toLowerCase())) return false;
      }

      // Filtro de foil
      if (filterFoil !== 'all') {
        const foilLower = foilTrait.toLowerCase();
        const hasFoil = foilLower && foilLower !== 'none' && foilLower !== '';
        if (filterFoil === 'none' && hasFoil) return false;
        if (filterFoil === 'standard' && !foilLower.includes('standard')) return false;
        if (filterFoil === 'prize' && !foilLower.includes('prize')) return false;
      }

      return true;
    });

    // Apply collection filter (if any collections are selected)
    if (selectedCollections.length > 0) {
      filtered = filterCardsByCollections(filtered, selectedCollections);
    }

    return filtered;
  }, [nfts, filterRarity, filterFoil, selectedCollections]);

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
  const totalTies = 0; // Ties are not currently tracked in stats
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

  return (
    <div className="min-h-screen bg-vintage-black text-vintage-ice p-3 md:p-6 overflow-x-hidden">
      {/* Compact Profile Header */}
      <div className="max-w-6xl mx-auto mb-4">
        <div className="bg-vintage-charcoal rounded-xl border border-vintage-gold/50 p-4 md:p-5">
          {/* Back button */}
          <button
            onClick={() => router.push('/')}
            className="text-vintage-gold hover:text-vintage-gold-dark text-sm font-modern mb-3"
          >
            ← Back
          </button>

          {/* Main profile row */}
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-vintage-gold to-vintage-burnt-gold rounded-full flex-shrink-0 overflow-hidden">
              {profile.twitterProfileImageUrl ? (
                <img
                  src={profile.twitterProfileImageUrl.includes('pbs.twimg.com') ? profile.twitterProfileImageUrl.replace('_normal', '_400x400') : profile.twitterProfileImageUrl}
                  alt={profile.username}
                  className="w-full h-full object-cover"
                  onError={(e) => { const img = e.target as HTMLImageElement; if (farcasterPfp) img.src = farcasterPfp; else img.style.display = 'none'; }}
                />
              ) : farcasterPfp ? (
                <img src={farcasterPfp} alt={profile.username} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl font-bold">{profile.username.substring(0, 2).toUpperCase()}</div>
              )}
            </div>

            {/* Name + Links */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl md:text-2xl font-display font-bold text-vintage-gold truncate">{profile.username}</h1>
                <BadgeList badges={getUserBadges(profile.address, profile.userIndex ?? 9999, profile.hasVibeBadge)} size="sm" />
              </div>
              <div className="flex items-center gap-2 mt-1 flex-wrap text-xs">
                <button onClick={copyAddress} className="text-vintage-burnt-gold hover:text-vintage-gold font-mono">
                  {profile.address.slice(0, 6)}...{profile.address.slice(-4)} {copiedAddress ? '✓' : ''}
                </button>
                {profile.fid && farcasterUsername && (
                  <a href={`https://warpcast.com/${farcasterUsername}`} target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300">@{farcasterUsername}</a>
                )}
                {profile.twitter && (
                  <a href={`https://twitter.com/${profile.twitter.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="text-vintage-neon-blue hover:text-blue-400">𝕏</a>
                )}
                {profile.fid && (
                  <button onClick={() => openMarketplace(`https://farcaster.xyz/miniapps/aisYLhjuH5_G/vibefid/fid/${profile.fid}`, sdk, true)} className="text-vintage-gold hover:text-vintage-burnt-gold">♦ VibeFID</button>
                )}
              </div>
            </div>

          </div>

          {/* Stats row - compact horizontal */}
          <div className="grid grid-cols-4 gap-2 mt-4 pt-3 border-t border-vintage-gold/20">
            <div className="text-center">
              <p className="text-sm md:text-lg font-bold text-vintage-gold">{nfts.length || profile.stats.totalCards}</p>
              <p className="text-[9px] text-vintage-burnt-gold">CARDS</p>
            </div>
            <div className="text-center">
              <p className="text-sm md:text-lg font-bold text-vintage-gold">{(profile.stats.totalPower || 0).toLocaleString()}</p>
              <p className="text-[9px] text-vintage-burnt-gold">POWER</p>
            </div>
            <div className="text-center">
              {/* @ts-expect-error - honor field */}
              <p className="text-sm md:text-lg font-bold text-purple-400">{(profile.stats.honor ?? 500).toLocaleString()}</p>
              <p className="text-[9px] text-vintage-burnt-gold">HONOR</p>
            </div>
            <div className="text-center">
              <p className="text-sm md:text-lg font-bold text-vintage-gold">
                {(() => { const b = Number(vbmsBalance || 0); if (b >= 1_000_000) return `${(b / 1_000_000).toFixed(1)}M`; if (b >= 1_000) return `${(b / 1_000).toFixed(1)}K`; return b.toLocaleString(undefined, { maximumFractionDigits: 0 }); })()}
              </p>
              <p className="text-[9px] text-vintage-burnt-gold">$VBMS</p>
            </div>
          </div>
        </div>
      </div>


      {/* NFT Cards Collection */}
      <div className="max-w-6xl mx-auto mb-4">
        {/* Header + Filters in one row */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-vintage-gold text-lg">♠</span>
            <span className="text-vintage-gold font-semibold">{filteredNfts.length} cards</span>
          </div>

          {/* Compact Filters */}
          <div className="flex flex-wrap gap-2 sm:ml-auto">
            <select
              value={filterRarity}
              onChange={(e) => { setFilterRarity(e.target.value); setCurrentNFTPage(1); }}
              className="bg-vintage-charcoal border border-vintage-gold/30 rounded px-2 py-1 text-xs text-vintage-gold"
            >
              <option value="all">Rarity</option>
              <option value="common">Common</option>
              <option value="rare">Rare</option>
              <option value="epic">Epic</option>
              <option value="legendary">Legend</option>
            </select>
            <select
              value={filterFoil}
              onChange={(e) => { setFilterFoil(e.target.value); setCurrentNFTPage(1); }}
              className="bg-vintage-charcoal border border-vintage-gold/30 rounded px-2 py-1 text-xs text-vintage-gold"
            >
              <option value="all">Foil</option>
              <option value="none">No Foil</option>
              <option value="standard">Standard</option>
              <option value="prize">Prize</option>
            </select>
            <select
              value={selectedCollections.length === 0 ? 'all' : selectedCollections[0]}
              onChange={(e) => { if (e.target.value === 'all') setSelectedCollections([]); else setSelectedCollections([e.target.value as CollectionId]); setCurrentNFTPage(1); }}
              className="bg-vintage-charcoal border border-vintage-gold/30 rounded px-2 py-1 text-xs text-vintage-gold"
            >
              <option value="all">Collection</option>
              <option value="vibe">VBMS</option>
              <option value="vibe rot bangers">BANGER</option>
              <option value="cumioh">CUMIO</option>
              <option value="vibefid">VIBEFID</option>
              <option value="meowverse">MEOVV</option>
              <option value="viberuto">VBRTO</option>
              <option value="gmvbrs">VBRS</option>
            </select>
            {(filterRarity !== 'all' || filterFoil !== 'all' || selectedCollections.length > 0) && (
              <button
                onClick={() => { setFilterRarity('all'); setFilterFoil('all'); setSelectedCollections([]); setCurrentNFTPage(1); }}
                className="text-vintage-burnt-gold hover:text-vintage-gold text-xs"
              >
                ✕ Clear
              </button>
            )}
          </div>
        </div>
        {isNftsLoading ? (
          <CardLoadingSpinner text="Loading cards..." />
        ) : nfts.length === 0 ? (
          <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-8 text-center">
            <p className="text-gray-400">{t('noCardsInCollection')}</p>
          </div>
        ) : filteredNfts.length === 0 ? (
          <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-8 text-center">
            <p className="text-gray-400">{t('noCardsMatchFilters')}</p>

            {/* Buy Collection Button - Show when filtered by collection with no NFTs */}
            {selectedCollections.length > 0 &&
             nfts.length > 0 &&
             (() => {
               const collection = COLLECTIONS[selectedCollections[0]];
               return collection?.marketplaceUrl;
             })() && (
              <div className="mt-6">
                {COLLECTIONS[selectedCollections[0]].marketplaceUrl?.startsWith('/') ? (
                  <Link
                    href={COLLECTIONS[selectedCollections[0]].marketplaceUrl!}
                    className="inline-block px-4 md:px-6 py-2.5 md:py-3 border-2 border-red-600 text-white font-modern font-semibold rounded-lg transition-all duration-300 shadow-lg hover:shadow-red-600/50 tracking-wider"
                    style={{background: 'linear-gradient(145deg, #DC2626, #991B1B)'}}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-base md:text-lg">◆</span>
                      <span>{COLLECTIONS[selectedCollections[0]].buttonText || `BUY ${COLLECTIONS[selectedCollections[0]].displayName.toUpperCase()} PACKS`}</span>
                    </div>
                  </Link>
                ) : (
                  <a
                    href={COLLECTIONS[selectedCollections[0]].marketplaceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block px-4 md:px-6 py-2.5 md:py-3 border-2 border-red-600 text-white font-modern font-semibold rounded-lg transition-all duration-300 shadow-lg hover:shadow-red-600/50 tracking-wider"
                    style={{background: 'linear-gradient(145deg, #DC2626, #991B1B)'}}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-base md:text-lg">◆</span>
                      <span>{COLLECTIONS[selectedCollections[0]].buttonText || `BUY ${COLLECTIONS[selectedCollections[0]].displayName.toUpperCase()} PACKS`}</span>
                    </div>
                  </a>
                )}
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2">
              {filteredNfts
                .slice((currentNFTPage - 1) * NFT_PER_PAGE, currentNFTPage * NFT_PER_PAGE)
                .map((nft) => {
                  const tokenId = nft.tokenId;
                  const power = nft.power || 0;
                  const rarity = nft.rarity || 'Common';
                  const foilValue = nft.foil || '';
                  const imageUrl = nft.imageUrl || '';
                  const foilEffect = getFoilEffect(foilValue);

                  // Final power with collection multiplier
                  const finalPower = getCardDisplayPower(nft);

                  return (
                    <div key={getCardUniqueId(nft)} className="relative group">
                      <div className={`relative overflow-hidden rounded-lg ring-1 ${getRarityRing(rarity)}`}>
                        <CardMedia
                          src={convertIpfsUrl(imageUrl) || imageUrl}
                          alt={`#${tokenId}`}
                          className="w-full aspect-[2/3] object-cover bg-vintage-deep-black"
                          loading="lazy"
                        />
                        {foilEffect && <div className={`absolute inset-0 ${foilEffect}`}></div>}
                        <div className="absolute top-0 left-0 bg-black/80 px-1.5 py-0.5 rounded-br text-[10px] font-bold text-vintage-gold">
                          {finalPower}
                        </div>
                      </div>
                    </div>
                  );
                })}

              {/* Buy Collection Button - Show as grid item when filtering by collection */}
              {selectedCollections.length > 0 &&
               filteredNfts.slice((currentNFTPage - 1) * NFT_PER_PAGE, currentNFTPage * NFT_PER_PAGE).length < NFT_PER_PAGE &&
               (() => {
                 const collection = COLLECTIONS[selectedCollections[0]];
                 return collection?.marketplaceUrl;
               })() && (
                COLLECTIONS[selectedCollections[0]].marketplaceUrl?.startsWith('/') ? (
                  <Link
                    href={COLLECTIONS[selectedCollections[0]].marketplaceUrl!}
                    className="aspect-[2/3] flex flex-col items-center justify-center border-2 border-red-600 text-white font-modern font-semibold rounded-lg transition-all duration-300 shadow-lg hover:shadow-red-600/50 hover:scale-105 tracking-wider p-4"
                    style={{background: 'linear-gradient(145deg, #DC2626, #991B1B)'}}
                  >
                    <div className="flex flex-col items-center justify-center gap-2 text-center">
                      <span className="text-2xl md:text-3xl">◆</span>
                      <span className="text-xs md:text-sm leading-tight">
                        {COLLECTIONS[selectedCollections[0]].buttonText || `BUY ${COLLECTIONS[selectedCollections[0]].displayName.toUpperCase()} PACKS`}
                      </span>
                    </div>
                  </Link>
                ) : (
                  <a
                    href={COLLECTIONS[selectedCollections[0]].marketplaceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="aspect-[2/3] flex flex-col items-center justify-center border-2 border-red-600 text-white font-modern font-semibold rounded-lg transition-all duration-300 shadow-lg hover:shadow-red-600/50 hover:scale-105 tracking-wider p-4"
                    style={{background: 'linear-gradient(145deg, #DC2626, #991B1B)'}}
                  >
                    <div className="flex flex-col items-center justify-center gap-2 text-center">
                      <span className="text-2xl md:text-3xl">◆</span>
                      <span className="text-xs md:text-sm leading-tight">
                        {COLLECTIONS[selectedCollections[0]].buttonText || `BUY ${COLLECTIONS[selectedCollections[0]].displayName.toUpperCase()} PACKS`}
                      </span>
                    </div>
                  </a>
                )
              )}
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
                    <CardMedia src={card.imageUrl} alt={`#${card.tokenId}`} className="w-full h-full object-cover" />
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
                // Use findCard for proper collection+tokenId comparison
                const isSelected = findCard(attackSelectedCards, nft);
                return (
                  <div
                    key={getCardKey(nft)}
                    onClick={() => {
                      if (isSelected) {
                        // Use isSameCard for proper collection+tokenId comparison
                        setAttackSelectedCards(prev => prev.filter(c => !isSameCard(c, nft)));
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
                    <CardMedia src={nft.imageUrl} alt={`#${nft.tokenId}`} className="w-full h-full object-cover" />
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

      {/* Share Reward Popup */}
      {showShareReward && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9999] backdrop-blur-sm">
          <div className="bg-vintage-charcoal border-4 border-vintage-gold rounded-2xl p-8 max-w-md mx-4 shadow-[0_0_50px_rgba(255,215,0,0.5)] animate-[scale-in_0.3s_ease-out]">
            <div className="text-center">
              <div className="text-6xl mb-4 animate-bounce">🎁</div>
              <h2 className="text-3xl font-display font-bold text-vintage-gold mb-4">
                Share Reward!
              </h2>
              <p className="text-vintage-ice font-modern text-lg mb-6">
                {shareRewardMessage}
              </p>
              <button
                onClick={() => setShowShareReward(false)}
                className="px-8 py-3 bg-vintage-gold hover:bg-vintage-burnt-gold text-vintage-black font-modern font-bold rounded-xl transition-all transform hover:scale-105"
              >
                Awesome!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
