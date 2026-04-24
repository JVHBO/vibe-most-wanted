'use client';

import { Suspense, useEffect, useState, useMemo, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ConvexProfileService, type UserProfile, type MatchHistory } from '@/lib/convex-profile';
import { useQuery, useMutation, useConvex } from 'convex/react';
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
import { AudioManager } from '@/lib/audio-manager';
import { openMarketplace } from '@/lib/marketplace-utils';
import { VibeFIDConvexProvider } from '@/contexts/VibeFIDConvexProvider';
import { VibeFidSection } from '@/components/profile/VibeFidSection';
import { isUnrevealed as isUnrevealedShared, findAttr, calcPower } from '@/lib/nft/attributes';
import { isSameCard, findCard, getCardKey } from '@/lib/nft';
import { usePlayerCards } from '@/contexts/PlayerCardsContext';
import { getCardDisplayPower } from '@/lib/power-utils';
import { getCharacterFromImage } from '@/lib/vmw-image-mapping';
import tcgCardsData from '@/data/vmw-tcg-cards.json';
import { getAuraLevelProgress, AURA_LEVELS } from '@/lib/aura-levels';
import tcgAbilitiesData from '@/data/tcg-abilities.json';

// TCG abilities type
const tcgAbilities: Record<string, { name: string; type: string; description: string }> = tcgAbilitiesData.abilities as any;

const ALCHEMY_API_KEY = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
const CHAIN = process.env.NEXT_PUBLIC_ALCHEMY_CHAIN || process.env.NEXT_PUBLIC_CHAIN || 'base-mainnet';
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_VIBE_CONTRACT || process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY || process.env.NEXT_PUBLIC_NEYNAR_API_KEY;

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

function ProfilePageContent() {
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

  // 🔗 Determine if viewing own profile (primary OR linked wallet)
  const isOwnProfile = profile && currentUserAddress && (() => {
    const addr = currentUserAddress.toLowerCase();
    if (profile.address.toLowerCase() === addr) return true;
    if (profile.linkedAddresses?.some((a: string) => a.toLowerCase() === addr)) return true;
    return false;
  })();

  // 🎴 Use context cards for own profile, localNfts for others
  const nfts = isOwnProfile ? contextNfts : localNfts;
  const isNftsLoading = isOwnProfile ? contextLoading : loadingNFTs;

  const [activeTab, setActiveTab] = useState<'vibefid' | 'album' | 'stats'>('vibefid');
  const [vibeFidCardExists, setVibeFidCardExists] = useState<boolean>(false);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [currentNFTPage, setCurrentNFTPage] = useState(1);
  const [selectedCollections, setSelectedCollections] = useState<CollectionId[]>([]);
  const NFT_PER_PAGE = 30;
  const [rematchesRemaining, setRematchesRemaining] = useState<number>(5);
  const MAX_REMATCHES = 5;
  const [farcasterUsername, setFarcasterUsername] = useState<string>('');
  const [farcasterPfp, setFarcasterPfp] = useState<string>('');

  // 🚀 BANDWIDTH FIX: Convert useQuery to manual query (no WebSocket subscription)
  const convex = useConvex();
  const [matchHistory, setMatchHistory] = useState<any[] | undefined>(undefined);
  const matchHistoryLoadedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!profile?.address) return;
    // Only load once per address per session
    if (matchHistoryLoadedRef.current === profile.address) return;
    matchHistoryLoadedRef.current = profile.address;

    const loadMatchHistory = async () => {
      try {
        const result = await convex.query(api.matches.getMatchHistorySummary, {
          address: profile.address,
          limit: 20
        });
        setMatchHistory(result || []);
      } catch (err) {
        console.error('[Profile] Error loading match history:', err);
        setMatchHistory([]);
      }
    };
    loadMatchHistory();
  }, [profile?.address, convex]);

  // 💰 Real on-chain VBMS balance for profile being viewed
  const { balance: vbmsBalance } = useFarcasterVBMSBalance(profile?.address);

  // Share Reward System
  const claimShareBonus = useMutation(api.economy.claimShareBonus);
  const [showShareReward, setShowShareReward] = useState(false);
  const [albumPage, setAlbumPage] = useState(0);
  const ALBUM_PER_PAGE = 18;

  // Album card modal state
  const [selectedAlbumCard, setSelectedAlbumCard] = useState<{
    card: any;
    ownedCards: any[];
    ability: any;
    cardKey?: string;
    baccaratImagePath?: string;
  } | null>(null);
  const [shareRewardMessage, setShareRewardMessage] = useState('');
  const [showAuraGuide, setShowAuraGuide] = useState(false);

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

  // Auto-detect and connect Farcaster wallet if in miniapp (not Base App)
  useEffect(() => {
    const initFarcasterWallet = async () => {
      try {
        const { shouldUseFarcasterSDK } = await import('@/lib/utils/miniapp');
        if (shouldUseFarcasterSDK() && sdk && typeof sdk.wallet !== 'undefined') {
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

        // Busca username do Farcaster se tiver FID — Haatz primary, Neynar fallback
        if (profileData.fid) {
          try {
            let fcResponse = await fetch(
              `https://haatz.quilibrium.com/v2/farcaster/user/bulk?fids=${profileData.fid}`,
              { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(5000) }
            ).catch(() => null);
            if (!fcResponse?.ok && NEYNAR_API_KEY) {
              fcResponse = await fetch(
                `https://api.neynar.com/v2/farcaster/user/bulk?fids=${profileData.fid}`,
                { headers: { 'accept': 'application/json', 'api_key': NEYNAR_API_KEY } }
              ).catch(() => null);
            }
            if (fcResponse?.ok) {
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
        // Check primary address AND linked wallets
        const addr = currentUserAddress?.toLowerCase();
        const viewingOwnProfile = addr && (
          address.toLowerCase() === addr ||
          (profileData.linkedAddresses || []).some((a: string) => a.toLowerCase() === addr)
        );

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

  // Set default tab based on profile data
  useEffect(() => {
    if (!profile) return;
    if (profile.fid && !isNaN(parseInt(profile.fid))) {
      setActiveTab('vibefid');
    } else if (isOwnProfile) {
      setActiveTab('album');
    } else {
      setActiveTab('stats');
    }
  }, [profile?.fid, !!isOwnProfile]);

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
          <p className="text-white text-xl">{t('profileLoading')}</p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-vintage-black flex items-center justify-center p-4">
        <div className="text-center bg-red-900/20 border border-red-500/50 rounded-xl p-8 max-w-md">
          <p className="text-red-400 text-2xl mb-4">❌ {error || t('profileNotFound')}</p>
          <button
            onClick={() => router.push('/')}
            className="px-3 py-1.5 bg-[#CC2222] hover:bg-[#AA1111] text-white text-[11px] font-bold uppercase tracking-wider transition-colors rounded-md"
          >
            {t('profileBackToGame')}
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
    <div className="min-h-screen bg-vintage-black text-vintage-ice p-3 md:p-6 pb-20" style={{ overflowX: 'clip' }}>
      {/* Aura Level Guide Modal */}
      {showAuraGuide && (
        <div className="fixed inset-0 bg-black/90 z-[200] flex items-center justify-center p-4" onClick={() => setShowAuraGuide(false)}>
          <div className="bg-vintage-charcoal border-2 border-vintage-gold/30 rounded-xl max-w-sm w-full" style={{ maxHeight: 'calc(100% - 32px)', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-vintage-gold/20 sticky top-0 bg-vintage-charcoal">
              <span className="text-vintage-gold font-black text-sm uppercase tracking-wide">Aura Levels & Perks</span>
              <button onClick={() => setShowAuraGuide(false)} className="text-vintage-burnt-gold text-xl leading-none">×</button>
            </div>
            <div className="p-3 space-y-2">
              {AURA_LEVELS.map((lvl, i) => {
                const GUIDE_PERKS: Record<string, string[]> = {
                  human:    ['100k/day earn cap'],
                  great_ape:['1 free VibeMail/day', '100k/day earn cap'],
                  ssj1:     ['1 free VibeMail/day', '+1 Roulette spin/day', '200k/day earn cap'],
                  ssj2:     ['2 free VibeMails/day', '+2 Roulette spins/day', '300k/day earn cap'],
                  ssj3:     ['3 free VibeMails/day', '+4 Roulette spins/day', '400k/day earn cap'],
                  ssj4:     ['4 free VibeMails/day', '+6 Roulette spins/day', '500k/day earn cap'],
                  ssj_god:  ['5 free VibeMails/day', '+8 Roulette spins/day', '650k/day earn cap'],
                  ssj_blue: ['5 free VibeMails/day', '+10 Roulette spins/day', '750k/day earn cap'],
                };
                const perks = GUIDE_PERKS[lvl.key] ?? [];
                const isCurrentLevel = lvl.key === getAuraLevelProgress(profile?.stats?.aura ?? 0).level.key;
                return (
                  <div key={lvl.key} className={`p-2 rounded border ${isCurrentLevel ? 'border-vintage-gold/40 bg-vintage-gold/5' : 'border-black/20 bg-vintage-black/20'}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs font-black uppercase ${lvl.color}`}>{lvl.name || 'Human'}</span>
                      <span className="text-[9px] text-vintage-burnt-gold/50">{lvl.threshold.toLocaleString()} XP{isCurrentLevel ? ' ← you' : ''}</span>
                    </div>
                    <ul className="space-y-0.5">
                      {perks.map((p, j) => (
                        <li key={j} className="flex items-center gap-1.5 text-[9px] text-white/60">
                          <span className="w-1 h-1 rounded-full bg-vintage-burnt-gold/40 flex-shrink-0" />
                          {p}
                          <span className="ml-auto text-[7px] text-yellow-500/60 font-bold">SOON</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
      {/* Compact Profile Header */}
      <div className="max-w-6xl mx-auto mb-4">
        <div className="bg-vintage-charcoal rounded-xl border border-vintage-gold/50 p-4 md:p-5">
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
                <h1 className="text-xl md:text-2xl font-display font-bold text-vintage-gold uppercase tracking-wide drop-shadow-[2px_2px_0px_#000] truncate">{profile.username}</h1>
                <BadgeList badges={getUserBadges(profile.address, profile.userIndex ?? 9999, vibeFidCardExists === true)} size="sm" />
              </div>
              <div className="flex items-center gap-2 mt-1 flex-wrap text-xs">
                <button onClick={copyAddress} className="text-vintage-burnt-gold hover:text-vintage-gold font-mono">
                  {profile.address.slice(0, 6)}...{profile.address.slice(-4)} {copiedAddress ? '✓' : ''}
                </button>
                {profile.fid && farcasterUsername && (
                  <a href={`https://base.app/profile/${profile.address}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center px-2 py-0.5 bg-purple-600 text-white text-xs font-bold border-2 border-black shadow-[2px_2px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all">@{farcasterUsername}</a>
                )}
                {profile.twitter && (
                  <a href={`https://twitter.com/${profile.twitter.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="text-vintage-neon-blue hover:text-blue-400">𝕏</a>
                )}
                {profile.fid && (
                  <button onClick={() => openMarketplace(`/fid/${profile.fid}`, sdk, true)} className="inline-flex items-center px-2 py-0.5 bg-vintage-gold text-black text-xs font-bold border-2 border-black shadow-[2px_2px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all">{t('profileVibeFID')}</button>
                )}
              </div>
            </div>

          </div>

          {/* Stats row - compact horizontal */}
          <div className="flex mt-4 border-2 border-black bg-vintage-black/40 shadow-[3px_3px_0px_#000]">
            <div className="flex-1 flex flex-col items-center justify-center py-2">
              <p className="text-sm md:text-base font-bold text-vintage-gold leading-none">{nfts.length || profile.stats.totalCards}</p>
              <p className="text-[9px] text-vintage-burnt-gold uppercase tracking-wide mt-1">{t('profileCards')}</p>
            </div>
            <div className="w-px bg-black/40" />
            <div className="flex-1 flex flex-col items-center justify-center py-2">
              <p className="text-sm md:text-base font-bold text-vintage-gold leading-none">{(profile.stats.totalPower || 0).toLocaleString()}</p>
              <p className="text-[9px] text-vintage-burnt-gold uppercase tracking-wide mt-1">{t('profilePower')}</p>
            </div>
            <div className="w-px bg-black/40" />
            <div className="flex-1 flex flex-col items-center justify-center py-2">
              {(() => {
                const auraXP = profile.stats.aura ?? 0;
                const lvl = getAuraLevelProgress(auraXP);
                return (
                  <>
                    <p className={`text-sm md:text-base font-bold leading-none ${lvl.level.color}`}>
                      {(profile.stats.aura ?? 500).toLocaleString()}
                    </p>
                    {lvl.level.name && (
                      <span className={`text-[9px] font-black uppercase tracking-wide ${lvl.level.color}`}>{lvl.level.name}</span>
                    )}
                    <p className="text-[9px] text-vintage-burnt-gold uppercase tracking-wide mt-0.5">{t('profileAura')}</p>
                  </>
                );
              })()}
            </div>
            <div className="w-px bg-black/40" />
            <div className="flex-1 flex flex-col items-center justify-center py-2">
              <p className="text-sm md:text-base font-bold text-vintage-gold leading-none">
                {(() => { const b = Number(vbmsBalance || 0); if (b >= 1_000_000) return `${(b / 1_000_000).toFixed(1)}M`; if (b >= 1_000) return `${(b / 1_000).toFixed(1)}K`; return b.toLocaleString(undefined, { maximumFractionDigits: 0 }); })()}
              </p>
              <p className="text-[9px] text-vintage-burnt-gold uppercase tracking-wide mt-1">{t('profileVbms')}</p>
            </div>
          </div>

          {/* SSJ Level Panel */}
          {(() => {
            const aura = profile.stats.aura ?? 0;
            const { level, progress, next } = getAuraLevelProgress(aura);
            const nextLevel = AURA_LEVELS[AURA_LEVELS.findIndex(l => l.key === level.key) + 1] ?? null;

            // Perks per level key — all SOON for now
            const PERKS: Record<string, { icon: string; label: string }[]> = {
              human:    [{ icon: '💰', label: '100k/day earn cap' }],
              great_ape:[{ icon: '✉️', label: '1 free VibeMail/day' }, { icon: '💰', label: '100k/day earn cap' }],
              ssj1:     [{ icon: '✉️', label: '1 free VibeMail/day' }, { icon: '🎰', label: '+1 Roulette spin/day' }, { icon: '💰', label: '200k/day earn cap' }],
              ssj2:     [{ icon: '✉️', label: '2 free VibeMails/day' }, { icon: '🎰', label: '+2 Roulette spins/day' }, { icon: '💰', label: '300k/day earn cap' }],
              ssj3:     [{ icon: '✉️', label: '3 free VibeMails/day' }, { icon: '🎰', label: '+4 Roulette spins/day' }, { icon: '💰', label: '400k/day earn cap' }],
              ssj4:     [{ icon: '✉️', label: '4 free VibeMails/day' }, { icon: '🎰', label: '+6 Roulette spins/day' }, { icon: '💰', label: '500k/day earn cap' }],
              ssj_god:  [{ icon: '✉️', label: '5 free VibeMails/day' }, { icon: '🎰', label: '+8 Roulette spins/day' }, { icon: '💰', label: '650k/day earn cap' }],
              ssj_blue: [{ icon: '✉️', label: '5 free VibeMails/day' }, { icon: '🎰', label: '+10 Roulette spins/day' }, { icon: '💰', label: '750k/day earn cap' }],
            };

            const levelIdx = AURA_LEVELS.findIndex(l => l.key === level.key);
            const unlockedPerks = PERKS[level.key] ?? [];

            return (
              <div className="mt-3 w-full border-2 border-black bg-vintage-black/40 shadow-[2px_2px_0px_#000]">
                {/* Header row */}
                <div className="flex items-center justify-between px-3 py-2 border-b border-black/30">
                  <div className="flex items-center gap-2">
                    <span className={`text-base font-black uppercase tracking-wider ${level.color}`}>
                      {level.name || 'Human'}
                    </span>
                    <span className="text-[9px] text-vintage-burnt-gold/50 uppercase">Aura Level</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px]">
                    <span className={`font-bold ${level.color}`}>{aura.toLocaleString()}</span>
                    {next && <span className="text-vintage-burnt-gold/40">/ {next.toLocaleString()} XP</span>}
                    {!next && <span className="text-cyan-400 font-bold text-[9px]">MAX LEVEL</span>}
                    <button
                      onClick={() => setShowAuraGuide(true)}
                      className="w-4 h-4 rounded-full bg-vintage-burnt-gold/30 text-vintage-burnt-gold text-[9px] font-black flex items-center justify-center hover:bg-vintage-burnt-gold/50 transition-colors flex-shrink-0"
                    >?</button>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="px-3 pt-2 pb-1">
                  <div className="w-full h-1 bg-vintage-deep-black rounded-full overflow-hidden">
                    <div
                      className={`h-full bg-gradient-to-r ${level.gradient} transition-all duration-700`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  {next && nextLevel && (
                    <div className="flex justify-between mt-0.5">
                      <span className={`text-[8px] font-bold ${level.color}`}>{level.name || 'Human'}</span>
                      <span className={`text-[8px] font-bold ${nextLevel.color}`}>{nextLevel.name}</span>
                    </div>
                  )}
                </div>

                {/* Perks grid */}
                <div className="px-3 pb-2 pt-1">
                  <p className="text-[8px] text-vintage-burnt-gold/50 uppercase tracking-wider mb-1.5">Perks</p>
                  {unlockedPerks.length > 0 ? (
                    <div className="flex flex-col gap-1">
                      {unlockedPerks.map((perk, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="text-[11px]">{perk.icon}</span>
                          <span className="text-[10px] text-white/70">{perk.label}</span>
                          <span className="ml-auto text-[8px] bg-yellow-500/20 text-yellow-400 font-bold px-1.5 py-0.5 rounded uppercase tracking-wide border border-yellow-500/30">SOON</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[9px] text-vintage-burnt-gold/30 italic">No perks at this level</p>
                  )}

                  {/* Next level teaser */}
                  {nextLevel && (PERKS[nextLevel.key]?.length ?? 0) > 0 && (
                    <div className="mt-2 pt-2 border-t border-black/20">
                      <p className="text-[8px] text-vintage-burnt-gold/40 uppercase tracking-wider mb-1">
                        Next: <span className={nextLevel.color}>{nextLevel.name}</span> at {nextLevel.threshold.toLocaleString()} XP
                      </p>
                      {PERKS[nextLevel.key].slice(0, 2).map((perk, i) => (
                        <div key={i} className="flex items-center gap-2 opacity-40">
                          <span className="text-[10px]">{perk.icon}</span>
                          <span className="text-[9px] text-white/50">{perk.label}</span>
                          <span className="ml-auto text-[7px] bg-black/40 text-white/30 font-bold px-1 py-0.5 rounded uppercase">🔒</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Back button */}
          <button
            onClick={() => router.push('/')}
            className="mt-3 px-3 py-1.5 bg-[#CC2222] hover:bg-[#AA1111] text-white text-[11px] font-bold uppercase tracking-wider transition-colors rounded-md"
          >
            {t('profileBack')}
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="max-w-6xl mx-auto px-4 mb-3">
        <div className="flex gap-2">
          {profile?.fid && !isNaN(parseInt(profile.fid)) && (
            <button
              onClick={() => setActiveTab('vibefid')}
              className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider border-2 border-black shadow-[3px_3px_0px_#000] transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none ${
                activeTab === 'vibefid'
                  ? 'bg-vintage-gold text-black'
                  : 'bg-vintage-charcoal text-vintage-gold hover:bg-vintage-gold/10'
              }`}
            >
              VibeFID
            </button>
          )}
          {isOwnProfile && (
            <button
              onClick={() => setActiveTab('album')}
              className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider border-2 border-black shadow-[3px_3px_0px_#000] transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none ${
                activeTab === 'album'
                  ? 'bg-vintage-gold text-black'
                  : 'bg-vintage-charcoal text-vintage-gold hover:bg-vintage-gold/10'
              }`}
            >
              Album
            </button>
          )}
          <button
            onClick={() => setActiveTab('stats')}
            className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider border-2 border-black shadow-[3px_3px_0px_#000] transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none ${
              activeTab === 'stats'
                ? 'bg-vintage-gold text-black'
                : 'bg-vintage-charcoal text-vintage-gold hover:bg-vintage-gold/10'
            }`}
          >
            Stats
          </button>
        </div>
      </div>

      {/* VibeFID Card Section — always mounted so onCardStatus fires on load */}
      {profile?.fid && !isNaN(parseInt(profile.fid)) && (
        <div className={`max-w-6xl mx-auto mb-4 px-4 ${activeTab !== 'vibefid' ? 'hidden' : ''}`}>
          <VibeFIDConvexProvider>
            <VibeFidSection
              fid={parseInt(profile.fid)}
              isOwnProfile={!!isOwnProfile}
              address={currentUserAddress || undefined}
              hasVibeBadge={!!profile.hasVibeBadge}
              onCardStatus={setVibeFidCardExists}
              vmwCoinsBalance={isOwnProfile ? (profile.coins || 0) : undefined}
            />
          </VibeFIDConvexProvider>
        </div>
      )}

      {/* No VibeFID tab for profiles without FID — redirect to Album if active */}
      {activeTab === 'vibefid' && (!profile?.fid || isNaN(parseInt(profile.fid || ''))) && (
        <div className="max-w-6xl mx-auto px-4 mb-4">
          <div className="bg-vintage-charcoal rounded-xl border border-vintage-gold/50 p-6 text-center">
            <p className="text-vintage-ice/50 text-sm">This player has no VibeFID card.</p>
          </div>
        </div>
      )}

      {/* Stats Tab */}
      {activeTab === 'stats' && (
        <div className="max-w-6xl mx-auto px-4 mb-4">
          <div className="bg-vintage-charcoal rounded-xl border border-vintage-gold/50 p-4">
            <p className="text-vintage-gold font-bold text-sm uppercase tracking-wider mb-3">Battle Stats</p>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-vintage-black/40 rounded border border-vintage-gold/20 py-3">
                <p className="text-green-400 font-bold text-lg">{totalWins}</p>
                <p className="text-vintage-burnt-gold text-[10px] uppercase">Wins</p>
              </div>
              <div className="bg-vintage-black/40 rounded border border-vintage-gold/20 py-3">
                <p className="text-red-400 font-bold text-lg">{totalLosses}</p>
                <p className="text-vintage-burnt-gold text-[10px] uppercase">Losses</p>
              </div>
              <div className="bg-vintage-black/40 rounded border border-vintage-gold/20 py-3">
                <p className="text-vintage-gold font-bold text-lg">{winRate}%</p>
                <p className="text-vintage-burnt-gold text-[10px] uppercase">Win Rate</p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-center">
              <div className="bg-vintage-black/40 rounded border border-vintage-gold/20 py-2">
                <p className="text-vintage-gold font-bold">{profile.stats.pveWins || 0} / {profile.stats.pveLosses || 0}</p>
                <p className="text-vintage-burnt-gold text-[10px] uppercase">PvE W/L</p>
              </div>
              <div className="bg-vintage-black/40 rounded border border-vintage-gold/20 py-2">
                <p className="text-vintage-gold font-bold">{profile.stats.pvpWins || 0} / {profile.stats.pvpLosses || 0}</p>
                <p className="text-vintage-burnt-gold text-[10px] uppercase">PvP W/L</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VMW Album - Card Collection Tracker */}
      {activeTab === 'album' && isOwnProfile && (
        <div className="max-w-6xl mx-auto mb-4">
          <div className="bg-vintage-charcoal rounded-xl border border-vintage-gold/50 p-4">
            {/* Album Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-vintage-gold font-semibold">{t('profileVmwAlbum')}</span>
                {/* Paginação inline */}
                {Math.ceil(((nfts || []).filter((c: any) => c.collection === "vibe").length) / ALBUM_PER_PAGE) > 1 && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setAlbumPage(p => Math.max(0, p - 1))}
                      disabled={albumPage === 0}
                      className="w-6 h-6 flex items-center justify-center bg-vintage-black border border-vintage-gold/50 text-vintage-gold rounded text-xs font-bold disabled:opacity-30"
                    >
                      ←
                    </button>
                    <span className="text-vintage-burnt-gold text-xs font-bold px-1">
                      {albumPage + 1}/{Math.ceil(((nfts || []).filter((c: any) => c.collection === "vibe").length) / ALBUM_PER_PAGE)}
                    </span>
                    <button
                      onClick={() => setAlbumPage(p => Math.min(Math.ceil(((nfts || []).filter((c: any) => c.collection === "vibe").length) / ALBUM_PER_PAGE) - 1, p + 1))}
                      disabled={albumPage === Math.ceil(((nfts || []).filter((c: any) => c.collection === "vibe").length) / ALBUM_PER_PAGE) - 1}
                      className="w-6 h-6 flex items-center justify-center bg-vintage-black border border-vintage-gold/50 text-vintage-gold rounded text-xs font-bold disabled:opacity-30"
                    >
                      →
                    </button>
                  </div>
                )}
              </div>
              {(() => {
                const playerVbmsCards = (nfts || []).filter((card: any) => card.collection === "vibe");
                const ownedCardCounts: Record<string, number> = {};
                const aliases: Record<string, string> = (tcgCardsData as any).aliases || {};
                const tokenIdToName: Record<number, string> = {};
                (tcgCardsData.cards || []).forEach((c: any) => {
                  if (c.tokenId) tokenIdToName[c.tokenId] = c.baccarat?.toLowerCase();
                });
                playerVbmsCards.forEach((card: any) => {
                  const imageUrl = card.imageUrl || card.image || "";
                  const characterFromImage = getCharacterFromImage(imageUrl);
                  const attrName = findAttr(card, "name");
                  let cardName = (card.character || characterFromImage || attrName || card.name || "").toLowerCase().trim();
                  if (aliases[cardName]) cardName = aliases[cardName].toLowerCase();
                  if (!cardName && card.tokenId && tokenIdToName[card.tokenId]) cardName = tokenIdToName[card.tokenId];
                  if (cardName) {
                    ownedCardCounts[cardName] = (ownedCardCounts[cardName] || 0) + 1;
                  }
                });
                const allTcgCards = tcgCardsData.cards || [];
                const totalOwned = Object.keys(ownedCardCounts).length;
                const totalCards = allTcgCards.length;
                return (
                  <span className="text-sm text-vintage-burnt-gold">
                    {t('albumCollected').replace('{owned}', totalOwned.toString()).replace('{total}', totalCards.toString()).replace('{percent}', Math.round(totalOwned / totalCards * 100).toString())}
                  </span>
                );
              })()}
            </div>

            {/* Progress Bar */}
            {(() => {
              const playerVbmsCards = (nfts || []).filter((card: any) => card.collection === "vibe");
              const ownedCardCounts: Record<string, number> = {};

              // Aliases from tcg-cards.json (onChainName -> baccarat)
              const aliases: Record<string, string> = (tcgCardsData as any).aliases || {};

              // Create tokenId to baccarat name lookup
              const tokenIdToName: Record<number, string> = {};
              (tcgCardsData.cards || []).forEach((c: any) => {
                if (c.tokenId) tokenIdToName[c.tokenId] = c.baccarat?.toLowerCase();
              });

              playerVbmsCards.forEach((card: any) => {
                const imageUrl = card.imageUrl || card.image || "";
                const characterFromImage = getCharacterFromImage(imageUrl);
                // Also check attributes for "name" trait (most reliable)
                const attrName = findAttr(card, "name");
                let cardName = (card.character || characterFromImage || attrName || card.name || "").toLowerCase().trim();

                // Apply alias if exists (e.g., "filthy" -> "don filthy")
                if (aliases[cardName]) {
                  cardName = aliases[cardName].toLowerCase();
                }

                // Fallback to tokenId lookup
                if (!cardName && card.tokenId && tokenIdToName[card.tokenId]) {
                  cardName = tokenIdToName[card.tokenId];
                }

                if (cardName) {
                  ownedCardCounts[cardName] = (ownedCardCounts[cardName] || 0) + 1;
                }
              });
              const allTcgCards = tcgCardsData.cards || [];
              const totalOwned = Object.keys(ownedCardCounts).length;
              const totalCards = allTcgCards.length;

              // Sort by rarity: Mythic > Legendary > Epic > Rare > Common
              const rarityOrder: Record<string, number> = { Mythic: 0, Legendary: 1, Epic: 2, Rare: 3, Common: 4 };
              const sortedCards = [...allTcgCards].sort((a: any, b: any) => {
                return (rarityOrder[a.rarity] ?? 5) - (rarityOrder[b.rarity] ?? 5);
              });

              const albumTotalPages = Math.ceil(sortedCards.length / ALBUM_PER_PAGE);
              const pagedCards = sortedCards.slice(albumPage * ALBUM_PER_PAGE, (albumPage + 1) * ALBUM_PER_PAGE);

              return (
                <>
                  <div className="w-full bg-vintage-black rounded-full h-2 overflow-hidden mb-3">
                    <div
                      className="h-full bg-gradient-to-r from-vintage-gold to-vintage-burnt-gold transition-all duration-500"
                      style={{ width: `${(totalOwned / totalCards) * 100}%` }}
                    />
                  </div>

                  {/* Card Grid */}
                  <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2 max-h-[50vh] overflow-y-auto">
                    {pagedCards.map((card: any, idx: number) => {
                      const cardKey = card.baccarat?.toLowerCase() || card.onChainName?.toLowerCase();
                      const owned = ownedCardCounts[cardKey] || 0;
                      const ability = tcgAbilities[cardKey];

                      const rarityBorder =
                        card.rarity === "Mythic" ? "ring-red-500 shadow-red-500/30" :
                        card.rarity === "Legendary" ? "ring-vintage-gold shadow-vintage-gold/30" :
                        card.rarity === "Epic" ? "ring-purple-500 shadow-purple-500/30" :
                        card.rarity === "Rare" ? "ring-blue-500 shadow-blue-500/30" :
                        "ring-gray-600";

                      // Helper to get normalized card name with alias
                      const getNormalizedName = (c: any) => {
                        const imgUrl = c.imageUrl || c.image || "";
                        // Also check attributes for "name" trait (most reliable for VMW cards)
                        const attrName = findAttr(c, "name");
                        let charName = (c.character || getCharacterFromImage(imgUrl) || attrName || c.name || "").toLowerCase().trim();
                        if (aliases[charName]) charName = aliases[charName].toLowerCase();
                        return charName;
                      };

                      // Also check by tokenId as fallback
                      const cardTokenId = card.tokenId;
                      const ownedCard = playerVbmsCards.find((c: any) =>
                        getNormalizedName(c) === cardKey ||
                        (cardTokenId && c.tokenId === cardTokenId)
                      );
                      const cardImage = ownedCard?.imageUrl || ownedCard?.image;

                      // Build baccarat image path for unowned cards
                      const rankMap: Record<string, string> = {
                        'A': 'ace', '2': '2', '3': '3', '4': '4', '5': '5', '6': '6',
                        '7': '7', '8': '8', '9': '9', '10': '10', 'J': 'jack', 'Q': 'queen', 'K': 'king'
                      };
                      const baccaratImagePath = card.suit && card.rank && card.suit !== '???' && card.rank !== '???'
                        ? `/images/baccarat/${rankMap[card.rank] || card.rank} ${card.suit}, ${card.baccarat}.png`
                        : (card.rank === '???')
                          ? (card.baccarat === 'clawdmoltopenbot'
                            ? 'https://ipfs.filebase.io/ipfs/QmUsuM3CEHM6FXBzqHiC8XvZfZeDPy6zuEFmorYX9saBqv'
                            : `/images/baccarat/joker, ${card.baccarat}.png`)
                          : null;

                      // Get all owned copies of this card (by name or tokenId)
                      const allOwnedCopies = playerVbmsCards.filter((c: any) =>
                        getNormalizedName(c) === cardKey ||
                        (cardTokenId && c.tokenId === cardTokenId)
                      );

                      return (
                        <div
                          key={idx}
                          onClick={() => {
                            AudioManager.selectCard();
                            // Clickable for all cards - pass baccaratImagePath for unowned cards
                            setSelectedAlbumCard({
                              card,
                              ownedCards: allOwnedCopies,
                              ability,
                              cardKey,
                              baccaratImagePath: baccaratImagePath || undefined
                            });
                          }}
                          onMouseEnter={() => AudioManager.buttonHover()}
                          className={`relative aspect-[2/3] overflow-hidden cursor-pointer transition-all border-2 border-black shadow-[3px_3px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0px_#000] ${
                            owned > 0
                              ? `hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_#000]`
                              : "opacity-50 grayscale hover:opacity-80 hover:grayscale-0"
                          }`}
                          title={`${card.onChainName} (${card.rarity})${owned > 0 ? ` - ${owned}x` : ""}`}
                        >
                          {(() => {
                            // Get foil type from the first owned card
                            const foil = ownedCard ? (ownedCard.foil || findAttr(ownedCard, "foil") || "").toLowerCase() : "";
                            const hasFoil = foil && foil !== "none" && foil !== "";
                            const foilClass = foil.includes("prize") ? "prize-foil" : foil.includes("standard") ? "standard-foil" : "";

                            return (
                              <>
                                {owned > 0 && cardImage ? (
                                  <img
                                    src={cardImage}
                                    alt={card.onChainName}
                                    className="w-full h-full object-cover"
                                  />
                                ) : baccaratImagePath ? (
                                  <img
                                    src={baccaratImagePath}
                                    alt={card.onChainName}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full bg-vintage-black flex items-center justify-center">
                                    <span className="text-gray-700 text-lg">?</span>
                                  </div>
                                )}
                                {/* Foil effect overlay */}
                                {hasFoil && <div className={`absolute inset-0 ${foilClass} pointer-events-none`}></div>}
                              </>
                            );
                          })()}

                          {owned > 1 && (
                            <div className="absolute top-0 right-0 bg-vintage-gold text-vintage-black text-[8px] font-bold px-1 rounded-bl">
                              {owned}x
                            </div>
                          )}

                          {owned > 0 && ability && (
                            <div className={`absolute top-0 left-0 w-2.5 h-2.5 rounded-br text-[5px] flex items-center justify-center font-bold ${
                              ability.type === "ongoing" ? "bg-green-500 text-white" :
                              "bg-blue-500 text-white"
                            }`}>
                              {ability.type === "ongoing" ? "O" : "R"}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>


                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Attack Card Selection Modal (Simplified for Profile) */}
      {showAttackCardSelection && targetOpponent && nfts.length > 0 && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-[150] p-4 overflow-y-auto">
          <div className="bg-vintage-charcoal rounded-2xl border-2 border-red-600 max-w-4xl w-full p-4 shadow-lg shadow-red-600/50 my-4 max-h-[95vh] overflow-y-auto">
            <h2 className="text-3xl font-display font-bold text-center mb-2 text-red-500">
              {t('profileAttackTitle').replace('{username}', targetOpponent.username.toUpperCase())}
            </h2>
            <p className="text-center text-vintage-burnt-gold mb-6 text-sm font-modern">
              {t('profileAttackChoose').replace('{count}', String(attackSelectedCards.length))}
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
                <p className="text-xs text-vintage-burnt-gold">{t('profileAttackPower')}</p>
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

      {/* Album Card Modal */}
      {selectedAlbumCard && (
        <div
          className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-[200] p-4"
          onClick={() => setSelectedAlbumCard(null)}
        >
          <div
            className="bg-vintage-charcoal rounded-2xl border-2 border-vintage-gold max-w-lg w-full p-6 shadow-[0_0_50px_rgba(255,215,0,0.3)]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Card Name & Rarity */}
            <div className="text-center mb-4">
              <h2 className={`text-2xl font-bold ${
                selectedAlbumCard.card.rarity === "Mythic" ? "text-red-500" :
                selectedAlbumCard.card.rarity === "Legendary" ? "text-yellow-400" :
                selectedAlbumCard.card.rarity === "Epic" ? "text-purple-400" :
                selectedAlbumCard.card.rarity === "Rare" ? "text-blue-400" :
                "text-gray-300"
              }`}>
                {selectedAlbumCard.card.onChainName}
              </h2>
              <p className="text-sm text-vintage-burnt-gold">
                {selectedAlbumCard.card.rarity}
                {selectedAlbumCard.ownedCards.length > 0
                  ? ` • ${t('tcgOwnedCount', { count: selectedAlbumCard.ownedCards.length })}`
                  : ` • ${t('tcgNotOwnedYet')}`
                }
              </p>
            </div>

            {/* Stacked Cards with Foil Effect OR Baccarat Image for unowned */}
            <div className="relative flex justify-center mb-4" style={{ height: '280px' }}>
              {selectedAlbumCard.ownedCards.length > 0 ? (
                selectedAlbumCard.ownedCards.slice(0, 5).map((ownedCard: any, i: number) => {
                  const foil = (ownedCard.foil || '').toLowerCase();
                  const hasFoil = foil && foil !== 'none' && foil !== '';
                  const foilClass = foil.includes('prize') ? 'prize-foil' : foil.includes('standard') ? 'standard-foil' : '';

                  return (
                    <div
                      key={i}
                      className="absolute w-44 aspect-[2/3] rounded-xl overflow-hidden shadow-2xl transition-all duration-300 hover:z-50 hover:scale-110"
                      style={{
                        transform: `rotate(${(i - Math.floor(selectedAlbumCard.ownedCards.length / 2)) * 8}deg) translateX(${(i - Math.floor(selectedAlbumCard.ownedCards.length / 2)) * 20}px)`,
                        zIndex: i,
                      }}
                    >
                      <img
                        src={ownedCard.imageUrl || ownedCard.image}
                        alt={selectedAlbumCard.card.onChainName}
                        className="w-full h-full object-cover"
                      />
                      {hasFoil && <div className={`absolute inset-0 ${foilClass}`}></div>}
                      {/* Power badge */}
                      <div className="absolute top-2 left-2 bg-black/80 px-2 py-1 rounded text-vintage-gold font-bold text-sm">
                        {ownedCard.power}
                      </div>
                      {/* Foil badge */}
                      {hasFoil && (
                        <div className="absolute top-2 right-2 bg-gradient-to-r from-pink-500 to-purple-500 px-2 py-0.5 rounded text-white text-xs font-bold">
                          {foil.includes('prize') ? '✨ PRIZE' : '⭐ FOIL'}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                /* Unowned card - show baccarat image with grayscale overlay */
                <div className="w-44 aspect-[2/3] rounded-xl overflow-hidden shadow-2xl relative">
                  {selectedAlbumCard.baccaratImagePath ? (
                    <img
                      src={selectedAlbumCard.baccaratImagePath}
                      alt={selectedAlbumCard.card.onChainName}
                      className="w-full h-full object-cover grayscale"
                    />
                  ) : (
                    <div className="w-full h-full bg-vintage-black flex items-center justify-center">
                      <span className="text-gray-700 text-4xl">?</span>
                    </div>
                  )}
                  {/* Locked overlay */}
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <span className="text-4xl">🔒</span>
                  </div>
                </div>
              )}
            </div>

            {/* Token IDs below cards */}
            {selectedAlbumCard.ownedCards.length > 0 && (
              <div className="flex flex-wrap justify-center gap-2 mb-4">
                {selectedAlbumCard.ownedCards.slice(0, 5).map((ownedCard: any, i: number) => (
                  <span key={i} className="text-vintage-burnt-gold/60 text-xs">
                    #{ownedCard.tokenId}
                  </span>
                ))}
              </div>
            )}

            {/* Ability Info */}
            {selectedAlbumCard.ability && (
              <div className="p-3 rounded-xl mb-4 bg-purple-900/30 border border-purple-500/50">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-purple-400">⚡</span>
                  <span className="text-vintage-gold font-bold">
                    {(() => {
                      const cardKey = selectedAlbumCard.cardKey?.replace(/\s+/g, '_').replace(/-/g, '_') || '';
                      const underscoreKey = `ability_${cardKey}_name`;
                      const camelKey = `ability${cardKey.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join('')}Name`;
                      return t(underscoreKey as any) || t(camelKey as any) || selectedAlbumCard.ability.name;
                    })()}
                  </span>
                </div>
                <p className="text-sm text-gray-300">
                  {(() => {
                    const cardKey = selectedAlbumCard.cardKey?.replace(/\s+/g, '_').replace(/-/g, '_') || '';
                    const underscoreKey = `ability_${cardKey}_desc`;
                    const camelKey = `ability${cardKey.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join('')}Desc`;
                    return t(underscoreKey as any) || t(camelKey as any) || selectedAlbumCard.ability.description;
                  })()}
                </p>
              </div>
            )}

            {/* Close Button */}
            <button
              onClick={() => setSelectedAlbumCard(null)}
              className="w-full py-3 bg-vintage-gold hover:bg-vintage-burnt-gold text-vintage-black font-bold rounded-xl transition-all"
            >
              {t('tcgClose')}
            </button>
          </div>
        </div>
      )}

      {/* Share Reward Popup */}
      {showShareReward && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[9999] backdrop-blur-sm">
          <div className="bg-vintage-charcoal border-4 border-vintage-gold rounded-2xl p-8 max-w-md mx-4 shadow-[0_0_50px_rgba(255,215,0,0.5)] animate-[scale-in_0.3s_ease-out]">
            <div className="text-center">
              <div className="text-6xl mb-4 animate-bounce">🎁</div>
              <h2 className="text-3xl font-display font-bold text-vintage-gold mb-4">
                {t('profileShareReward')}
              </h2>
              <p className="text-vintage-ice font-modern text-lg mb-6">
                {shareRewardMessage}
              </p>
              <button
                onClick={() => setShowShareReward(false)}
                className="px-8 py-3 bg-vintage-gold hover:bg-vintage-burnt-gold text-vintage-black font-modern font-bold rounded-xl transition-all transform hover:scale-105"
              >
                {t('profileAwesome')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-vintage-black" />}>
      <ProfilePageContent />
    </Suspense>
  );
}
