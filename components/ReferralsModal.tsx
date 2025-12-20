'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { X, Copy, Check, Gift, Users, Trophy, Share2 } from 'lucide-react';
import { Z_INDEX } from '@/lib/z-index';
import type { ReferralTier } from '@/convex/referrals';
import { createPortal } from 'react-dom';
import { sdk } from '@farcaster/miniapp-sdk';
import { isMiniappMode } from '@/lib/utils/miniapp';
import { useLanguage } from '@/contexts/LanguageContext';
import { AudioManager } from '@/lib/audio-manager';

// Extended tier type with progress info
type TierWithProgress = ReferralTier & { isUnlocked: boolean; isClaimed: boolean; canClaim: boolean };

// Types for referral data
interface ReferralEntry {
  username: string;
  status: string;
  completedAt?: number;
}

interface LeaderboardEntry {
  rank: number;
  username: string;
  totalReferrals: number;
  hasBadge: boolean;
}

interface ReferralsModalProps {
  isOpen: boolean;
  onClose: () => void;
  address: string;
  username: string;
  soundEnabled?: boolean;
}

export default function ReferralsModal({
  isOpen,
  onClose,
  address,
  username,
  soundEnabled = true
}: ReferralsModalProps) {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);
  const [claimingTier, setClaimingTier] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'rewards' | 'referrals' | 'leaderboard'>('rewards');

  // Queries
  const stats = useQuery(
    api.referrals.getMyReferralStats,
    isOpen && address ? { address } : 'skip'
  );

  const tiers = useQuery(
    api.referrals.getReferralTiers,
    isOpen ? {} : 'skip'
  );

  const myReferrals = useQuery(
    api.referrals.getMyReferrals,
    isOpen && address && activeTab === 'referrals' ? { address } : 'skip'
  );

  const leaderboard = useQuery(
    api.referrals.getReferralLeaderboard,
    isOpen && activeTab === 'leaderboard' ? {} : 'skip'
  );

  // Mutations
  const claimReward = useMutation(api.referrals.claimReferralReward);

  const referralLink = `https://www.vibemostwanted.xyz/invite/${username}`;
  const isInFarcaster = isMiniappMode();

  // Filter tiers to show progress
  const tiersWithProgress = useMemo((): TierWithProgress[] => {
    if (!tiers || !stats) return [];
    const claimedSet = new Set(stats.claimedTiers);
    return tiers.map((tier: ReferralTier) => ({
      ...tier,
      isUnlocked: stats.totalReferrals >= tier.tier,
      isClaimed: claimedSet.has(tier.tier),
      canClaim: stats.totalReferrals >= tier.tier && !claimedSet.has(tier.tier),
    }));
  }, [tiers, stats]);

  // Get next unclaimed tier
  const nextTier = useMemo((): TierWithProgress | undefined => {
    return tiersWithProgress.find((t) => !t.isClaimed);
  }, [tiersWithProgress]);

  if (!isOpen) return null;
  if (typeof window === 'undefined') return null;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      if (soundEnabled) AudioManager.buttonClick();
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleShare = async () => {
    if (soundEnabled) AudioManager.buttonClick();

    if (isInFarcaster) {
      try {
        // Use native Farcaster compose action
        await sdk.actions.composeCast({
          text: `Join me in VIBE Most Wanted! Battle with NFT cards, play poker, and defeat raid bosses together! 🎴⚔️`,
          embeds: [referralLink],
        });
      } catch (err) {
        // Fallback to openUrl with Warpcast compose
        try {
          await sdk.actions.openUrl({
            url: `https://warpcast.com/~/compose?text=${encodeURIComponent(`Join me in VIBE Most Wanted! Battle with NFT cards, play poker, and defeat raid bosses together! 🎴⚔️\n\n${referralLink}`)}`,
          });
        } catch {
          handleCopyLink();
        }
      }
    } else {
      // Open share dialog or copy
      if (navigator.share) {
        try {
          await navigator.share({
            title: 'Join VIBE Most Wanted',
            text: `${username} invited you to VIBE Most Wanted!`,
            url: referralLink,
          });
        } catch (err) {
          handleCopyLink();
        }
      } else {
        handleCopyLink();
      }
    }
  };

  const handleClaimReward = async (tier: number) => {
    if (claimingTier) return;
    setClaimingTier(tier);

    try {
      const result = await claimReward({ address, tier });
      if (result.success) {
        if (soundEnabled) AudioManager.buttonSuccess();
      }
    } catch (err) {
      console.error('Failed to claim:', err);
    } finally {
      setClaimingTier(null);
    }
  };

  const formatReward = (tier: typeof tiersWithProgress[0]) => {
    if (tier.type === 'vbms') {
      return `${tier.amount.toLocaleString()} VBMS`;
    } else if (tier.type === 'pack') {
      return `${tier.amount} ${tier.packType?.toUpperCase()} Pack`;
    } else if (tier.type === 'badge') {
      return `BADGE + ${tier.amount.toLocaleString()} VBMS`;
    }
    return tier.description;
  };

  const modal = (
    <div
      className="fixed inset-0 bg-black/90 flex items-center justify-center p-4"
      style={{ zIndex: Z_INDEX.modal }}
      onClick={onClose}
    >
      <div
        className="bg-vintage-charcoal rounded-2xl border-2 border-vintage-gold max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-vintage-gold/30">
          <h2 className="text-xl font-display font-bold text-vintage-gold flex items-center gap-2">
            <Users className="w-6 h-6" />
            Referrals
          </h2>
          <button
            onClick={onClose}
            className="text-vintage-burnt-gold hover:text-vintage-gold transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Stats Card */}
        <div className="p-4 bg-gradient-to-r from-vintage-gold/10 to-vintage-gold/5 border-b border-vintage-gold/20">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-3xl font-bold text-vintage-gold">
                {stats?.totalReferrals || 0}
              </div>
              <div className="text-xs text-vintage-burnt-gold">Friends Invited</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-green-400">
                {stats?.totalVbmsEarned?.toLocaleString() || 0}
              </div>
              <div className="text-xs text-vintage-burnt-gold">VBMS Earned</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-purple-400">
                {stats?.totalPacksEarned || 0}
              </div>
              <div className="text-xs text-vintage-burnt-gold">Packs Earned</div>
            </div>
          </div>

          {/* Share Link */}
          <div className="mt-4 flex gap-2">
            <div className="flex-1 bg-vintage-black/50 rounded-lg px-3 py-2 text-sm text-vintage-ice/70 truncate border border-vintage-gold/20">
              {referralLink}
            </div>
            <button
              onClick={handleCopyLink}
              className="px-3 py-2 bg-vintage-gold/20 hover:bg-vintage-gold/30 text-vintage-gold rounded-lg transition-colors"
            >
              {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
            </button>
            <button
              onClick={handleShare}
              className="px-4 py-2 bg-vintage-gold hover:bg-vintage-gold-dark text-vintage-black font-bold rounded-lg transition-colors flex items-center gap-2"
            >
              <Share2 className="w-5 h-5" />
              Share
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-vintage-gold/20">
          <button
            onClick={() => setActiveTab('rewards')}
            className={`flex-1 py-3 text-sm font-bold transition-colors ${
              activeTab === 'rewards'
                ? 'text-vintage-gold border-b-2 border-vintage-gold'
                : 'text-vintage-burnt-gold hover:text-vintage-gold'
            }`}
          >
            <Gift className="w-4 h-4 inline mr-1" />
            Rewards
          </button>
          <button
            onClick={() => setActiveTab('referrals')}
            className={`flex-1 py-3 text-sm font-bold transition-colors ${
              activeTab === 'referrals'
                ? 'text-vintage-gold border-b-2 border-vintage-gold'
                : 'text-vintage-burnt-gold hover:text-vintage-gold'
            }`}
          >
            <Users className="w-4 h-4 inline mr-1" />
            My Referrals
          </button>
          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`flex-1 py-3 text-sm font-bold transition-colors ${
              activeTab === 'leaderboard'
                ? 'text-vintage-gold border-b-2 border-vintage-gold'
                : 'text-vintage-burnt-gold hover:text-vintage-gold'
            }`}
          >
            <Trophy className="w-4 h-4 inline mr-1" />
            Leaderboard
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'rewards' && (
            <div className="space-y-2">
              {/* Progress indicator */}
              {nextTier && (
                <div className="mb-4 p-3 bg-vintage-gold/10 rounded-lg border border-vintage-gold/30">
                  <div className="text-sm text-vintage-burnt-gold mb-1">Next Reward</div>
                  <div className="flex items-center justify-between">
                    <div className="text-vintage-gold font-bold">
                      {nextTier.tier} invites - {formatReward(nextTier)}
                    </div>
                    <div className="text-vintage-ice/70 text-sm">
                      {stats?.totalReferrals || 0}/{nextTier.tier}
                    </div>
                  </div>
                  <div className="mt-2 h-2 bg-vintage-black/50 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-vintage-gold transition-all"
                      style={{
                        width: `${Math.min(100, ((stats?.totalReferrals || 0) / nextTier.tier) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Rewards Table */}
              {tiersWithProgress.map(tier => (
                <div
                  key={tier.tier}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                    tier.isClaimed
                      ? 'bg-green-900/20 border-green-500/30'
                      : tier.canClaim
                      ? 'bg-vintage-gold/20 border-vintage-gold animate-pulse'
                      : tier.isUnlocked
                      ? 'bg-vintage-black/30 border-vintage-gold/30'
                      : 'bg-vintage-black/20 border-vintage-gold/10 opacity-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                        tier.isMilestone
                          ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-black'
                          : tier.isClaimed
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-vintage-gold/20 text-vintage-gold'
                      }`}
                    >
                      {tier.tier}
                    </div>
                    <div>
                      <div className={`font-bold text-sm ${tier.isClaimed ? 'text-green-400' : 'text-vintage-ice'}`}>
                        {formatReward(tier)}
                      </div>
                      {tier.type === 'badge' && (
                        <div className="text-xs text-purple-400">Special Badge!</div>
                      )}
                    </div>
                  </div>

                  {tier.isClaimed ? (
                    <div className="text-green-400 text-sm font-bold flex items-center gap-1">
                      <Check className="w-4 h-4" />
                      Claimed
                    </div>
                  ) : tier.canClaim ? (
                    <button
                      onClick={() => handleClaimReward(tier.tier)}
                      disabled={claimingTier === tier.tier}
                      className="px-4 py-2 bg-vintage-gold hover:bg-vintage-gold-dark text-vintage-black font-bold text-sm rounded-lg transition-colors disabled:opacity-50"
                    >
                      {claimingTier === tier.tier ? 'Claiming...' : 'Claim'}
                    </button>
                  ) : (
                    <div className="text-vintage-burnt-gold/50 text-sm">
                      {tier.tier - (stats?.totalReferrals || 0)} more
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {activeTab === 'referrals' && (
            <div className="space-y-2">
              {!myReferrals || myReferrals.length === 0 ? (
                <div className="text-center py-8 text-vintage-burnt-gold">
                  <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No referrals yet</p>
                  <p className="text-sm mt-1">Share your link to invite friends!</p>
                </div>
              ) : (
                myReferrals.map((ref: ReferralEntry, i: number) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 bg-vintage-black/30 rounded-lg border border-vintage-gold/20"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-vintage-gold/20 flex items-center justify-center text-vintage-gold font-bold text-sm">
                        {ref.username[0]?.toUpperCase()}
                      </div>
                      <span className="text-vintage-ice font-medium">{ref.username}</span>
                    </div>
                    <div className={`text-sm ${
                      ref.status === 'completed' ? 'text-green-400' : 'text-vintage-burnt-gold'
                    }`}>
                      {ref.status === 'completed' ? 'Joined' : ref.status}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'leaderboard' && (
            <div className="space-y-2">
              {!leaderboard || leaderboard.length === 0 ? (
                <div className="text-center py-8 text-vintage-burnt-gold">
                  <Trophy className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No referrers yet</p>
                  <p className="text-sm mt-1">Be the first to invite friends!</p>
                </div>
              ) : (
                leaderboard.map((entry: LeaderboardEntry) => (
                  <div
                    key={entry.rank}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      entry.rank <= 3
                        ? 'bg-vintage-gold/10 border-vintage-gold/40'
                        : 'bg-vintage-black/30 border-vintage-gold/20'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                          entry.rank === 1
                            ? 'bg-yellow-500 text-black'
                            : entry.rank === 2
                            ? 'bg-gray-300 text-black'
                            : entry.rank === 3
                            ? 'bg-orange-400 text-black'
                            : 'bg-vintage-gold/20 text-vintage-gold'
                        }`}
                      >
                        {entry.rank}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-vintage-ice font-medium">{entry.username}</span>
                        {entry.hasBadge && (
                          <span className="text-purple-400 text-lg" title="Referrer Badge">
                            🏅
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-vintage-gold font-bold">
                      {entry.totalReferrals} invited
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Badge Display */}
        {stats?.hasBadge && (
          <div className="p-4 border-t border-vintage-gold/20 bg-gradient-to-r from-purple-900/30 to-pink-900/30">
            <div className="flex items-center justify-center gap-2 text-purple-400">
              <span className="text-2xl">🏅</span>
              <span className="font-bold">REFERRER BADGE UNLOCKED!</span>
              <span className="text-2xl">🏅</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
