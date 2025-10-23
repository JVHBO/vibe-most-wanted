'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ProfileService, UserProfile, MatchHistory } from '@/lib/firebase';
import sdk from '@farcaster/miniapp-sdk';

const ALCHEMY_API_KEY = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
const CHAIN = process.env.NEXT_PUBLIC_ALCHEMY_CHAIN || process.env.NEXT_PUBLIC_CHAIN || 'base-mainnet';
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_VIBE_CONTRACT || process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;

async function fetchNFTs(owner: string): Promise<any[]> {
  if (!ALCHEMY_API_KEY) throw new Error("API Key não configurada");
  if (!CHAIN) throw new Error("Chain não configurada");
  if (!CONTRACT_ADDRESS) throw new Error("Contract address não configurado");

  let allNfts: any[] = [];
  let pageKey: string | undefined = undefined;
  let pageCount = 0;
  const maxPages = 20;

  do {
    pageCount++;
    const url: string = `https://${CHAIN}.g.alchemy.com/nft/v3/${ALCHEMY_API_KEY}/getNFTsForOwner?owner=${owner}&contractAddresses[]=${CONTRACT_ADDRESS}&withMetadata=true&pageSize=100${pageKey ? `&pageKey=${pageKey}` : ''}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`API falhou: ${res.status}`);
    const json = await res.json();
    allNfts = allNfts.concat(json.ownedNfts || []);
    pageKey = json.pageKey;
  } while (pageKey && pageCount < maxPages);

  return allNfts;
}

export default function ProfilePage() {
  const params = useParams();
  const router = useRouter();
  const username = params.username as string;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [matchHistory, setMatchHistory] = useState<MatchHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentUserAddress, setCurrentUserAddress] = useState<string | null>(null);
  const [nfts, setNfts] = useState<any[]>([]);
  const [loadingNFTs, setLoadingNFTs] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [currentNFTPage, setCurrentNFTPage] = useState(1);
  const NFT_PER_PAGE = 12;

  // Filtros
  const [filterRarity, setFilterRarity] = useState<string>('all');
  const [filterFoil, setFilterFoil] = useState<string>('all');
  const [filterRevealed, setFilterRevealed] = useState<string>('revealed');

  // Load current user's address
  useEffect(() => {
    const initSDK = async () => {
      try {
        // Primeiro tenta pegar do localStorage (mais rápido e confiável)
        const savedAddress = localStorage.getItem('connectedAddress');
        if (savedAddress) {
          console.log('✅ Current user address from localStorage:', savedAddress);
          setCurrentUserAddress(savedAddress.toLowerCase());
          return;
        }

        // Se não tiver no localStorage, tenta SDK
        await sdk.actions.ready();

        // Tenta obter o endereço do wallet conectado
        if (sdk && typeof sdk.wallet !== 'undefined') {
          const addresses = await sdk.wallet.ethProvider.request({
            method: "eth_requestAccounts"
          });
          if (addresses && addresses[0]) {
            console.log('✅ Current user address loaded from SDK:', addresses[0]);
            setCurrentUserAddress(addresses[0].toLowerCase());
          } else {
            console.log('⚠️ No address found in wallet');
          }
        } else {
          console.log('⚠️ SDK wallet not available');
        }
      } catch (err) {
        console.error('❌ Error loading current user:', err);
      }
    };
    initSDK();
  }, []);

  useEffect(() => {
    async function loadProfile() {
      try {
        setLoading(true);
        setError('');

        // Busca o endereço pelo username
        const address = await ProfileService.getAddressByUsername(username.toLowerCase());

        if (!address) {
          setError('Profile not found');
          setLoading(false);
          return;
        }

        // Carrega o perfil completo
        const profileData = await ProfileService.getProfile(address);

        if (!profileData) {
          setError('Profile not found');
          setLoading(false);
          return;
        }

        setProfile(profileData);

        // Carrega histórico de partidas
        const history = await ProfileService.getMatchHistory(address, 50);
        setMatchHistory(history);

        // Carrega NFTs do jogador
        setLoadingNFTs(true);
        try {
          console.log('🔍 Fetching NFTs for address:', address);
          console.log('📊 Config:', {
            ALCHEMY_API_KEY: ALCHEMY_API_KEY ? '✅ Set' : '❌ Missing',
            CHAIN,
            CONTRACT_ADDRESS: CONTRACT_ADDRESS ? '✅ Set' : '❌ Missing'
          });
          const playerNFTs = await fetchNFTs(address);
          console.log('✅ NFTs loaded:', playerNFTs.length);
          setNfts(playerNFTs);
        } catch (err: any) {
          console.error('❌ Error loading NFTs:', err.message || err);
          // Se falhar, deixa array vazio
          setNfts([]);
        }
        setLoadingNFTs(false);

        setLoading(false);
      } catch (err: any) {
        console.error('Error loading profile:', err);
        setError('Failed to load profile');
        setLoading(false);
      }
    }

    if (username) {
      loadProfile();
    }
  }, [username]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-cyan-500 border-t-transparent mb-4"></div>
          <p className="text-white text-xl">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
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

  const totalWins = profile.stats.pveWins + profile.stats.pvpWins;
  const totalLosses = profile.stats.pveLosses + profile.stats.pvpLosses;
  const totalMatches = totalWins + totalLosses;
  const winRate = totalMatches > 0 ? ((totalWins / totalMatches) * 100).toFixed(1) : '0';

  const copyAddress = async () => {
    if (profile?.address) {
      try {
        await navigator.clipboard.writeText(profile.address);
        setCopiedAddress(true);
        setTimeout(() => setCopiedAddress(false), 2000);
      } catch (err) {
        console.error('Failed to copy address:', err);
      }
    }
  };

  // Helper function para encontrar atributo (mesma lógica da página principal)
  const findAttr = (nft: any, trait: string): string => {
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
  };

  // Helper function para verificar se a carta está revelada (mesma lógica da página principal)
  const isUnrevealed = (nft: any): boolean => {
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
  };

  // Filtrar NFTs
  const filteredNfts = nfts.filter(nft => {
    // Pegar atributos usando findAttr
    const rarity = findAttr(nft, 'Rarity');
    const foilTrait = findAttr(nft, 'Foil');
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white p-4 lg:p-8">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-6">
        <button
          onClick={() => router.push('/')}
          className="text-cyan-400 hover:text-cyan-300 transition-colors mb-4 flex items-center gap-2"
        >
          ← Back to Game
        </button>
      </div>

      {/* Profile Header */}
      <div className="max-w-6xl mx-auto mb-8">
        <div className="bg-gradient-to-br from-purple-900/50 to-pink-900/50 rounded-2xl border-2 border-purple-500/50 p-8 shadow-2xl">
          <div className="flex flex-col md:flex-row items-center gap-6">
            {/* Avatar */}
            <div className="w-32 h-32 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center text-6xl font-bold shadow-lg">
              {profile.username.substring(0, 2).toUpperCase()}
            </div>

            {/* Profile Info */}
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-4xl md:text-5xl font-bold mb-2 bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                {profile.username}
              </h1>
              <div className="flex items-center gap-2 justify-center md:justify-start mb-2">
                <p className="text-gray-400 font-mono text-sm">
                  {profile.address}
                </p>
                <button
                  onClick={copyAddress}
                  className="text-gray-400 hover:text-white transition-colors p-1 rounded hover:bg-gray-700/50"
                  title="Copy wallet address"
                >
                  {copiedAddress ? '✓' : '📋'}
                </button>
              </div>
              {profile.twitter && (
                <a
                  href={`https://twitter.com/${profile.twitter.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1"
                >
                  𝕏 @{profile.twitter.replace('@', '')}
                </a>
              )}
            </div>

            {/* Quick Stats */}
            <div className="flex gap-4">
              <div className="bg-green-900/30 px-6 py-3 rounded-xl border border-green-500/30 text-center">
                <p className="text-3xl font-bold text-green-400">{totalWins}</p>
                <p className="text-xs text-gray-400">Wins</p>
              </div>
              <div className="bg-red-900/30 px-6 py-3 rounded-xl border border-red-500/30 text-center">
                <p className="text-3xl font-bold text-red-400">{totalLosses}</p>
                <p className="text-xs text-gray-400">Losses</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="max-w-6xl mx-auto mb-8">
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          📊 Statistics
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-purple-900/30 to-pink-900/30 p-6 rounded-xl border border-purple-500/30">
            <p className="text-xs text-gray-400 mb-1">🃏 Total Cards</p>
            <p className="text-3xl font-bold text-purple-400">{nfts.length || profile.stats.totalCards}</p>
          </div>
          <div className="bg-gradient-to-br from-yellow-900/30 to-orange-900/30 p-6 rounded-xl border border-yellow-500/30">
            <p className="text-xs text-gray-400 mb-1">⚡ Total Power</p>
            <p className="text-3xl font-bold text-yellow-400">{profile.stats.totalPower.toLocaleString()}</p>
          </div>
          <div className="bg-gradient-to-br from-blue-900/30 to-cyan-900/30 p-6 rounded-xl border border-blue-500/30">
            <p className="text-xs text-gray-400 mb-1">🎮 PvE Record</p>
            <p className="text-2xl font-bold text-cyan-400">
              {profile.stats.pveWins}W / {profile.stats.pveLosses}L
            </p>
          </div>
          <div className="bg-gradient-to-br from-pink-900/30 to-purple-900/30 p-6 rounded-xl border border-pink-500/30">
            <p className="text-xs text-gray-400 mb-1">⚔️ PvP Record</p>
            <p className="text-2xl font-bold text-pink-400">
              {profile.stats.pvpWins}W / {profile.stats.pvpLosses}L
            </p>
          </div>
        </div>

        {/* Win Rate */}
        <div className="mt-4 bg-gradient-to-r from-cyan-900/30 to-purple-900/30 p-6 rounded-xl border border-cyan-500/30">
          <div className="flex items-center justify-between mb-2">
            <p className="text-gray-400">Overall Win Rate</p>
            <p className="text-3xl font-bold text-cyan-400">{winRate}%</p>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-4 overflow-hidden">
            <div
              className="bg-gradient-to-r from-cyan-500 to-purple-500 h-full transition-all duration-500"
              style={{ width: `${winRate}%` }}
            />
          </div>
        </div>
      </div>

      {/* NFT Cards Collection */}
      <div className="max-w-6xl mx-auto mb-8">
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          🃏 Card Collection ({filteredNfts.length} / {nfts.length})
        </h2>

        {/* Filtros */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Filtro de Revelação */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">📦 Card Status</label>
              <select
                value={filterRevealed}
                onChange={(e) => {
                  setFilterRevealed(e.target.value);
                  setCurrentNFTPage(1);
                }}
                className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="all">All Cards</option>
                <option value="revealed">Revealed Only</option>
                <option value="unrevealed">Unopened Packs</option>
              </select>
            </div>

            {/* Filtro de Raridade */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">✨ Rarity</label>
              <select
                value={filterRarity}
                onChange={(e) => {
                  setFilterRarity(e.target.value);
                  setCurrentNFTPage(1);
                }}
                className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                disabled={filterRevealed === 'unrevealed'}
              >
                <option value="all">All Rarities</option>
                <option value="common">Common</option>
                <option value="rare">Rare</option>
                <option value="epic">Epic</option>
                <option value="legendary">Legendary</option>
                <option value="mythic">Mythic</option>
              </select>
            </div>

            {/* Filtro de Foil */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">🌟 Foil</label>
              <select
                value={filterFoil}
                onChange={(e) => {
                  setFilterFoil(e.target.value);
                  setCurrentNFTPage(1);
                }}
                className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
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
              className="mt-4 bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
            >
              🔄 Reset Filters
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
            <p className="text-gray-400">No cards in collection</p>
          </div>
        ) : filteredNfts.length === 0 ? (
          <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-8 text-center">
            <p className="text-gray-400">No cards match the selected filters</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {filteredNfts
                .slice((currentNFTPage - 1) * NFT_PER_PAGE, currentNFTPage * NFT_PER_PAGE)
                .map((nft) => {
                  const tokenId = nft.tokenId;
                  const power = findAttr(nft, 'Power') || 0;
                  const rarity = findAttr(nft, 'Rarity') || 'Common';
                  const imageUrl = nft.image?.cachedUrl || nft.image?.thumbnailUrl || nft.raw?.metadata?.image || '';

                  // OpenSea URL (Base chain)
                  const openSeaUrl = `https://opensea.io/assets/base/${CONTRACT_ADDRESS}/${tokenId}`;

                  // Check if NFT is listed (simplificado - verifica se tem marketplace data)
                  const isListed = nft.raw?.metadata?.marketplace || nft.contract?.openSeaMetadata?.floorPrice;

                  const getRarityColor = (r: string) => {
                    const rLower = (r || '').toLowerCase();
                    if (rLower.includes('legend')) return 'from-orange-500 to-yellow-400';
                    if (rLower.includes('epic')) return 'from-purple-500 to-pink-500';
                    if (rLower.includes('rare')) return 'from-blue-500 to-cyan-400';
                    return 'from-gray-600 to-gray-500';
                  };

                  return (
                    <a
                      key={tokenId}
                      href={openSeaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="relative group hover:scale-105 transition-all duration-300"
                    >
                      <div className="relative overflow-hidden rounded-xl ring-2 ring-gray-700 group-hover:ring-purple-500 transition-all">
                        <img
                          src={imageUrl}
                          alt={`Card #${tokenId}`}
                          className="w-full aspect-[2/3] object-cover bg-gray-900"
                          loading="lazy"
                        />

                        {/* Power badge */}
                        <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/95 to-transparent p-3">
                          <div className="flex items-center justify-between">
                            <span className={`font-bold text-xl drop-shadow-lg bg-gradient-to-r ${getRarityColor(rarity)} bg-clip-text text-transparent`}>
                              ⚡ {power}
                            </span>
                            {isListed && (
                              <span className="text-xs bg-green-600 text-white px-2 py-1 rounded-full font-bold">
                                LISTED
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Token ID and OpenSea link */}
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 to-transparent p-2">
                          <p className="text-xs text-gray-300 font-mono text-center mb-1">#{tokenId}</p>
                          <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <svg className="w-4 h-4 text-cyan-400" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 0C5.374 0 0 5.374 0 12s5.374 12 12 12 12-5.374 12-12S18.626 0 12 0zm5.52 14.168c-.044.28-.088.56-.132.84-.044.28-.088.56-.132.84-.088.56-.176 1.12-.264 1.68-.044.28-.088.56-.132.84-.044.28-.088.56-.132.84-.088.56-.176 1.12-.264 1.68-.044.28-.088.56-.132.84-.044.28-.088.56-.132.84-.088.56-.176 1.12-.264 1.68l-1.56-1.56c.088-.56.176-1.12.264-1.68.044-.28.088-.56.132-.84.044-.28.088-.56.132-.84.088-.56.176-1.12.264-1.68.044-.28.088-.56.132-.84.044-.28.088-.56.132-.84.088-.56.176-1.12.264-1.68.044-.28.088-.56.132-.84.044-.28.088-.56.132-.84.088-.56.176-1.12.264-1.68l1.56 1.56c-.088.56-.176 1.12-.264 1.68z"/>
                            </svg>
                            <span className="text-xs text-cyan-400 font-semibold">View on OpenSea</span>
                          </div>
                        </div>
                      </div>
                    </a>
                  );
                })}
            </div>

            {/* Pagination */}
            {filteredNfts.length > NFT_PER_PAGE && (
              <div className="mt-6 flex items-center justify-center gap-2">
                <button
                  onClick={() => setCurrentNFTPage(Math.max(1, currentNFTPage - 1))}
                  disabled={currentNFTPage === 1}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 text-white rounded-lg font-semibold transition"
                >
                  ← Previous
                </button>

                <div className="flex gap-2">
                  {Array.from({ length: Math.ceil(filteredNfts.length / NFT_PER_PAGE) }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => setCurrentNFTPage(page)}
                      className={`w-10 h-10 rounded-lg font-semibold transition ${
                        currentNFTPage === page
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-700 hover:bg-gray-600 text-white'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setCurrentNFTPage(Math.min(Math.ceil(filteredNfts.length / NFT_PER_PAGE), currentNFTPage + 1))}
                  disabled={currentNFTPage === Math.ceil(filteredNfts.length / NFT_PER_PAGE)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 text-white rounded-lg font-semibold transition"
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Match History */}
      <div className="max-w-6xl mx-auto">
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          📜 Match History
        </h2>
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
              const resultText = isWin ? '✅ Victory' : isTie ? '🤝 Tie' : '❌ Defeat';

              return (
                <div
                  key={match.id}
                  className={`bg-gradient-to-r ${bgColor} to-transparent border ${borderColor} rounded-xl p-4 hover:scale-[1.02] transition-transform`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Match Type & Result */}
                    <div className="flex items-center gap-4">
                      <div className="text-3xl">
                        {match.type === 'pvp' ? '⚔️' : '🎮'}
                      </div>
                      <div>
                        <p className={`font-bold text-lg ${resultColor}`}>{resultText}</p>
                        <p className="text-xs text-gray-400">
                          {match.type === 'pvp' ? 'Player vs Player' : 'Player vs Environment'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(match.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {/* Power Stats */}
                    <div className="flex items-center gap-4">
                      <div className="text-center bg-purple-900/30 px-4 py-2 rounded-lg border border-purple-500/30">
                        <p className="text-xs text-gray-400">Your Power</p>
                        <p className="text-xl font-bold text-purple-400">{match.playerPower}</p>
                      </div>
                      <div className="text-2xl text-gray-500">VS</div>
                      <div className="text-center bg-pink-900/30 px-4 py-2 rounded-lg border border-pink-500/30">
                        <p className="text-xs text-gray-400">Opponent</p>
                        <p className="text-xl font-bold text-pink-400">{match.opponentPower}</p>
                      </div>
                    </div>

                    {/* Opponent Address (if PvP) */}
                    {match.type === 'pvp' && match.opponentAddress && (
                      <div className="text-xs text-gray-400 font-mono bg-gray-800/50 px-3 py-2 rounded-lg">
                        vs {match.opponentAddress.slice(0, 6)}...{match.opponentAddress.slice(-4)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
