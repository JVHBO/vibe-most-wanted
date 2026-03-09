'use client';

import { useState } from 'react';
import { AudioManager } from '@/lib/audio-manager';

interface CreateQuestModalProps {
  address: string;
  fid: number;
  username: string;
  coins: number;
  onClose: () => void;
  onCreated: () => void;
}

type QuestType = 'follow_me' | 'join_channel' | 'rt_cast' | 'use_miniapp' | 'like_cast';

const QUEST_TYPE_INFO: Record<QuestType, { label: string; placeholder: string; hint: string; icon: string }> = {
  follow_me: {
    label: 'Follow Me',
    placeholder: 'Your Farcaster profile (auto-filled)',
    hint: 'Players will be asked to follow your account.',
    icon: '👤',
  },
  join_channel: {
    label: 'Join Channel',
    placeholder: 'Channel ID e.g. vibe-most-wanted',
    hint: 'Players will be asked to join your channel.',
    icon: '📢',
  },
  rt_cast: {
    label: 'Recast a Cast',
    placeholder: 'https://warpcast.com/...',
    hint: 'Players will be asked to recast a specific cast.',
    icon: '🔁',
  },
  use_miniapp: {
    label: 'Use Miniapp',
    placeholder: 'vibemostwanted.xyz',
    hint: 'Players need recent activity in Vibe Most Wanted (last 7 days).',
    icon: '🎮',
  },
  like_cast: {
    label: 'Like Cast',
    placeholder: 'https://warpcast.com/...',
    hint: 'Players will be asked to like a specific cast.',
    icon: '❤️',
  },
};

const FEE_PERCENT = 0.1;
const MIN_REWARD = 50;
const MAX_REWARD = 5000;
const MAX_COMPLETERS = 20;

export function CreateQuestModal({ address, fid, username, coins, onClose, onCreated }: CreateQuestModalProps) {
  const [questType, setQuestType] = useState<QuestType>('follow_me');
  const [targetUrl, setTargetUrl] = useState('');
  const [targetDisplay, setTargetDisplay] = useState('');
  const [rewardPerCompleter, setRewardPerCompleter] = useState(500);
  const [maxCompleters, setMaxCompleters] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rewardPool = rewardPerCompleter * maxCompleters;
  const fee = Math.ceil(rewardPool * FEE_PERCENT);
  const totalCost = rewardPool + fee;
  const canAfford = coins >= totalCost;

  const getEffectiveTarget = () => {
    if (questType === 'follow_me') return `https://warpcast.com/${username}`;
    if (questType === 'use_miniapp') return 'vibemostwanted.xyz';
    return targetUrl.trim();
  };

  const noTargetNeeded = questType === 'follow_me' || questType === 'use_miniapp';

  const getEffectiveDisplay = () => {
    if (questType === 'follow_me') return `@${username}`;
    if (questType === 'use_miniapp') return 'Vibe Most Wanted';
    return targetDisplay.trim() || targetUrl.trim();
  };

  const handleCreate = async () => {
    AudioManager.buttonClick();
    const effectiveTarget = getEffectiveTarget();
    const effectiveDisplay = getEffectiveDisplay();

    if (!effectiveTarget) {
      setError('Please fill in the target');
      return;
    }
    if (!canAfford) {
      setError(`Insufficient coins (need ${totalCost.toLocaleString()})`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Dynamic import to avoid pulling VMW Convex into VibeFID context
      const { ConvexHttpClient } = await import('convex/browser');
      const { api } = await import('@/convex/_generated/api');

      const vmwConvexUrl = process.env.NEXT_PUBLIC_CONVEX_URL!;
      const client = new ConvexHttpClient(vmwConvexUrl);

      await client.mutation(api.playerQuests.createPlayerQuest, {
        address,
        fid,
        username,
        questType,
        targetUrl: effectiveTarget,
        targetDisplay: effectiveDisplay,
        rewardPerCompleter,
        maxCompleters,
      });

      onCreated();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create quest');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 p-4 pt-12 pb-24 overflow-y-auto">
      <div className="bg-[#1A1A1A] border-4 border-black shadow-[6px_6px_0px_#000] w-full max-w-sm">
        {/* Header */}
        <div className="bg-[#FFD700] border-b-4 border-black px-4 py-3 flex items-center justify-between">
          <h3 className="text-black font-black text-lg uppercase tracking-wide">Create Quest</h3>
          <button
            onClick={() => { AudioManager.buttonClick(); onClose(); }}
            className="w-8 h-8 bg-black text-[#FFD700] font-black flex items-center justify-center hover:bg-[#333] transition-colors"
          >
            X
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Quest Type */}
          <div>
            <p className="text-[#FFD700] font-bold text-xs uppercase tracking-wide mb-2">Quest Type</p>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(QUEST_TYPE_INFO) as QuestType[]).map((type) => {
                const info = QUEST_TYPE_INFO[type];
                return (
                  <button
                    key={type}
                    onClick={() => { AudioManager.buttonClick(); setQuestType(type); setTargetUrl(''); setTargetDisplay(''); }}
                    className={`px-3 py-2 border-2 border-black font-bold text-xs transition-all text-left ${
                      questType === type
                        ? 'bg-[#FFD700] text-black shadow-[2px_2px_0px_#000]'
                        : 'bg-[#2A2A2A] text-white hover:bg-[#333]'
                    }`}
                  >
                    <span className="block text-base mb-0.5">{info.icon}</span>
                    {info.label}
                  </button>
                );
              })}
            </div>
            <p className="text-white/50 text-xs mt-2">{QUEST_TYPE_INFO[questType].hint}</p>
          </div>

          {/* Target Input (hidden for follow_me and use_miniapp) */}
          {!noTargetNeeded && (
            <div>
              <p className="text-[#FFD700] font-bold text-xs uppercase tracking-wide mb-2">Target</p>
              <input
                type="text"
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                placeholder={QUEST_TYPE_INFO[questType].placeholder}
                className="w-full bg-[#0A0A0A] border-2 border-[#444] text-white px-3 py-2 text-sm font-mono focus:outline-none focus:border-[#FFD700]"
              />
              {questType === 'join_channel' && (
                <input
                  type="text"
                  value={targetDisplay}
                  onChange={(e) => setTargetDisplay(e.target.value)}
                  placeholder="Display name (e.g. Vibe Most Wanted)"
                  className="w-full bg-[#0A0A0A] border-2 border-[#444] border-t-0 text-white px-3 py-2 text-sm focus:outline-none focus:border-[#FFD700]"
                />
              )}
            </div>
          )}

          {/* Reward per completer */}
          <div>
            <p className="text-[#FFD700] font-bold text-xs uppercase tracking-wide mb-2">
              Reward per Completer
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setRewardPerCompleter(Math.max(MIN_REWARD, rewardPerCompleter - 50))}
                className="w-10 h-10 bg-[#333] border-2 border-black text-white font-black hover:bg-[#444] transition-colors"
              >
                -
              </button>
              <input
                type="number"
                value={rewardPerCompleter}
                onChange={(e) => setRewardPerCompleter(Math.min(MAX_REWARD, Math.max(MIN_REWARD, parseInt(e.target.value) || MIN_REWARD)))}
                className="flex-1 h-10 bg-[#0A0A0A] border-2 border-[#444] text-white text-center font-bold focus:outline-none focus:border-[#FFD700]"
                min={MIN_REWARD}
                max={MAX_REWARD}
                step={50}
              />
              <button
                onClick={() => setRewardPerCompleter(Math.min(MAX_REWARD, rewardPerCompleter + 50))}
                className="w-10 h-10 bg-[#333] border-2 border-black text-white font-black hover:bg-[#444] transition-colors"
              >
                +
              </button>
            </div>
            <p className="text-white/40 text-xs mt-1">{MIN_REWARD}–{MAX_REWARD.toLocaleString()} coins</p>
          </div>

          {/* Max completers */}
          <div>
            <p className="text-[#FFD700] font-bold text-xs uppercase tracking-wide mb-2">
              Max Completers
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setMaxCompleters(Math.max(1, maxCompleters - 1))}
                className="w-10 h-10 bg-[#333] border-2 border-black text-white font-black hover:bg-[#444] transition-colors"
              >
                -
              </button>
              <input
                type="number"
                value={maxCompleters}
                onChange={(e) => setMaxCompleters(Math.min(MAX_COMPLETERS, Math.max(1, parseInt(e.target.value) || 1)))}
                className="flex-1 h-10 bg-[#0A0A0A] border-2 border-[#444] text-white text-center font-bold focus:outline-none focus:border-[#FFD700]"
                min={1}
                max={MAX_COMPLETERS}
              />
              <button
                onClick={() => setMaxCompleters(Math.min(MAX_COMPLETERS, maxCompleters + 1))}
                className="w-10 h-10 bg-[#333] border-2 border-black text-white font-black hover:bg-[#444] transition-colors"
              >
                +
              </button>
            </div>
            <p className="text-white/40 text-xs mt-1">Max {MAX_COMPLETERS} slots</p>
          </div>

          {/* Cost breakdown */}
          <div className="bg-[#0A0A0A] border-2 border-[#333] p-3 space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-white/60">Reward pool</span>
              <span className="text-white font-bold">{rewardPool.toLocaleString()} coins</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-white/60">Platform fee (10%)</span>
              <span className="text-white/60">{fee.toLocaleString()} coins</span>
            </div>
            <div className="flex justify-between text-xs pt-1.5 border-t border-[#333]">
              <span className="text-[#FFD700] font-black">Total cost</span>
              <span className={`font-black ${canAfford ? 'text-[#FFD700]' : 'text-red-400'}`}>
                {totalCost.toLocaleString()} coins
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-white/40">Your balance</span>
              <span className={`text-xs ${canAfford ? 'text-white/40' : 'text-red-400'}`}>
                {coins.toLocaleString()} coins
              </span>
            </div>
            <p className="text-white/30 text-[10px] pt-1">Quest expires in 48h. Unused reward refunded (fee kept).</p>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-900/50 border-2 border-red-500 p-2 text-red-200 text-xs text-center">
              {error}
            </div>
          )}

          {/* Create Button */}
          <button
            onClick={handleCreate}
            disabled={loading || !canAfford}
            className="w-full py-3 bg-[#22C55E] border-4 border-black shadow-[4px_4px_0px_#000] text-black font-black text-sm uppercase tracking-wide hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_#000] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-x-0 disabled:translate-y-0 disabled:shadow-[4px_4px_0px_#000]"
          >
            {loading ? 'Creating...' : `Create Quest (${totalCost.toLocaleString()} coins)`}
          </button>
        </div>
      </div>
    </div>
  );
}
