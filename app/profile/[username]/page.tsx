'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ProfileService, UserProfile, MatchHistory } from '@/lib/firebase';
import sdk from '@farcaster/frame-sdk';

export default function ProfilePage() {
  const params = useParams();
  const router = useRouter();
  const username = params.username as string;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [matchHistory, setMatchHistory] = useState<MatchHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentUserAddress, setCurrentUserAddress] = useState<string | null>(null);

  // Load current user's address
  useEffect(() => {
    const initSDK = async () => {
      try {
        await sdk.actions.ready();
        const context = await sdk.context;
        if (context?.user?.verified_addresses?.eth_addresses?.[0]) {
          setCurrentUserAddress(context.user.verified_addresses.eth_addresses[0].toLowerCase());
        }
      } catch (err) {
        console.error('Error loading current user:', err);
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
              <p className="text-gray-400 font-mono text-sm mb-2">
                {profile.address.slice(0, 8)}...{profile.address.slice(-8)}
              </p>
              <div className="flex items-center gap-2">
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
                {/* Edit Twitter button - only visible to profile owner */}
                {currentUserAddress && currentUserAddress.toLowerCase() === profile.address.toLowerCase() && (
                  <button
                    onClick={async () => {
                      const newTwitter = prompt('Enter your X/Twitter handle (without @):', profile.twitter || '');
                      if (newTwitter !== null && newTwitter.trim()) {
                        try {
                          await ProfileService.updateTwitter(profile.address, newTwitter.replace('@', '').trim());
                          setProfile({ ...profile, twitter: newTwitter.replace('@', '').trim() });
                        } catch (err) {
                          console.error('Error updating Twitter:', err);
                          alert('Failed to update Twitter handle');
                        }
                      }
                    }}
                    className="text-blue-400 hover:text-blue-300 text-xs px-2 py-1 bg-blue-900/30 rounded border border-blue-500/30 transition"
                  >
                    {profile.twitter ? '✏️ Edit' : '➕ Add X'}
                  </button>
                )}
              </div>
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
