'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ProfileService, UserProfile, MatchHistory } from '@/lib/firebase';
import sdk from '@farcaster/miniapp-sdk';

const ALCHEMY_API_KEY = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
const CHAIN = process.env.NEXT_PUBLIC_CHAIN || 'base-mainnet';
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;

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
          const playerNFTs = await fetchNFTs(address);
          setNfts(playerNFTs);
        } catch (err) {
          console.error('Error loading NFTs:', err);
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
            <p className="text-3xl font-bold text-purple-400">{profile.stats.totalCards}</p>
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
          🃏 Card Collection ({nfts.length})
        </h2>
        {loadingNFTs ? (
          <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent mb-4"></div>
            <p className="text-gray-400">Loading cards...</p>
          </div>
        ) : nfts.length === 0 ? (
          <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-8 text-center">
            <p className="text-gray-400">No cards in collection</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {nfts.map((nft) => {
              const tokenId = nft.tokenId;
              const power = nft.raw?.metadata?.attributes?.find((a: any) => a.trait_type === 'Power')?.value || 0;
              const rarity = nft.raw?.metadata?.attributes?.find((a: any) => a.trait_type === 'Rarity')?.value || 'Common';
              const imageUrl = nft.image?.cachedUrl || nft.image?.thumbnailUrl || nft.raw?.metadata?.image || '';

              const getRarityColor = (r: string) => {
                const rLower = (r || '').toLowerCase();
                if (rLower.includes('legend')) return 'from-orange-500 to-yellow-400';
                if (rLower.includes('epic')) return 'from-purple-500 to-pink-500';
                if (rLower.includes('rare')) return 'from-blue-500 to-cyan-400';
                return 'from-gray-600 to-gray-500';
              };

              return (
                <div key={tokenId} className="relative group hover:scale-105 transition-all duration-300">
                  <div className="relative overflow-hidden rounded-xl ring-2 ring-gray-700 hover:ring-purple-500 transition-all">
                    <img
                      src={imageUrl}
                      alt={`Card #${tokenId}`}
                      className="w-full aspect-[2/3] object-cover bg-gray-900"
                      loading="lazy"
                    />
                    <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/95 to-transparent p-3">
                      <div className="flex items-center justify-between">
                        <span className={`font-bold text-xl drop-shadow-lg bg-gradient-to-r ${getRarityColor(rarity)} bg-clip-text text-transparent`}>
                          ⚡ {power}
                        </span>
                      </div>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 to-transparent p-2">
                      <p className="text-xs text-gray-300 font-mono text-center">#{tokenId}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
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
