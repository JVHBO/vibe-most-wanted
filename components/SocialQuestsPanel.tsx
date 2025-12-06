"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { SOCIAL_QUESTS, type SocialQuest } from "@/lib/socialQuests";
import { AudioManager } from "@/lib/audio-manager";
import type { NeynarCast } from "@/lib/neynar";

interface SocialQuestsPanelProps {
  address: string;
  userFid?: number;
  soundEnabled?: boolean;
  onRewardClaimed?: (amount: number) => void;
}

export function SocialQuestsPanel({
  address,
  userFid,
  soundEnabled = true,
  onRewardClaimed,
}: SocialQuestsPanelProps) {
  const [verifying, setVerifying] = useState<string | null>(null);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [localCompleted, setLocalCompleted] = useState<Set<string>>(new Set());
  const [visitedQuests, setVisitedQuests] = useState<Set<string>>(new Set());
  const [currentCastIndex, setCurrentCastIndex] = useState(0);
  const [castData, setCastData] = useState<Record<string, NeynarCast>>({});
  const [loadingCasts, setLoadingCasts] = useState(false);

  const featuredCasts = useQuery(api.featuredCasts.getActiveCasts);

  const questProgress = useQuery(
    api.socialQuests.getSocialQuestProgress,
    address ? { address } : "skip"
  );

  const markCompleted = useMutation(api.socialQuests.markQuestCompleted);
  const claimReward = useMutation(api.socialQuests.claimSocialQuestReward);

  // Fetch cast data for all featured casts
  useEffect(() => {
    if (!featuredCasts || featuredCasts.length === 0) return;

    const fetchCasts = async () => {
      setLoadingCasts(true);
      const newCastData: Record<string, NeynarCast> = {};

      for (const fc of featuredCasts) {
        if (castData[fc.warpcastUrl]) continue; // Already fetched
        try {
          const response = await fetch(`/api/cast-by-url?url=${encodeURIComponent(fc.warpcastUrl)}`);
          if (response.ok) {
            const data = await response.json();
            if (data.cast) {
              newCastData[fc.warpcastUrl] = data.cast;
            }
          }
        } catch (error) {
          console.error("Error fetching cast:", fc.warpcastUrl, error);
        }
      }

      if (Object.keys(newCastData).length > 0) {
        setCastData((prev) => ({ ...prev, ...newCastData }));
      }
      setLoadingCasts(false);
    };

    fetchCasts();
  }, [featuredCasts]);

  // Auto-rotate carousel
  useEffect(() => {
    if (!featuredCasts || featuredCasts.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentCastIndex((prev) => (prev + 1) % featuredCasts.length);
    }, 8000); // 8 seconds for embedded casts (more time to read)
    return () => clearInterval(interval);
  }, [featuredCasts]);

  const verifyQuest = async (quest: SocialQuest) => {
    // First click: Open the link and mark as visited
    if (!visitedQuests.has(quest.id)) {
      window.open(quest.url, "_blank");
      setVisitedQuests((prev) => new Set([...prev, quest.id]));
      if (soundEnabled) AudioManager.buttonClick();
      return;
    }

    // Second click: Verify the quest
    if (!userFid) {
      window.open(quest.url, "_blank");
      return;
    }

    setVerifying(quest.id);
    try {
      const response = await fetch("/api/social-quest/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questId: quest.id, userFid }),
      });
      const data = await response.json();
      if (data.completed) {
        await markCompleted({ address, questId: quest.id });
        setLocalCompleted((prev) => new Set([...prev, quest.id]));
        if (soundEnabled) AudioManager.buttonSuccess();
      } else {
        // Not completed - open link again
        window.open(quest.url, "_blank");
        if (soundEnabled) AudioManager.buttonClick();
      }
    } catch (error) {
      console.error("Error verifying quest:", error);
      window.open(quest.url, "_blank");
    } finally {
      setVerifying(null);
    }
  };

  const handleClaim = async (quest: SocialQuest) => {
    setClaiming(quest.id);
    try {
      const result = await claimReward({ address, questId: quest.id });
      if (result.success) {
        if (soundEnabled) AudioManager.win();
        onRewardClaimed?.(result.reward);
      }
    } catch (error) {
      console.error("Error claiming reward:", error);
      if (soundEnabled) AudioManager.buttonError();
    } finally {
      setClaiming(null);
    }
  };

  const getQuestStatus = (quest: SocialQuest) => {
    const progress = questProgress?.[quest.id];
    if (progress?.claimed) return "claimed";
    if (progress?.completed || localCompleted.has(quest.id)) return "completed";
    return "pending";
  };

  const totalQuests = SOCIAL_QUESTS.length;
  const completedQuests = SOCIAL_QUESTS.filter((q) => getQuestStatus(q) === "claimed").length;
  const totalPotentialReward = SOCIAL_QUESTS.reduce((sum, q) => sum + q.reward, 0);
  const claimableReward = SOCIAL_QUESTS.filter((q) => getQuestStatus(q) === "completed").reduce((sum, q) => sum + q.reward, 0);

  const renderQuest = (quest: SocialQuest) => {
    const status = getQuestStatus(quest);
    const isVerifying = verifying === quest.id;
    const isClaiming = claiming === quest.id;

    return (
      <div
        key={quest.id}
        className={`p-3 rounded-lg border transition-all ${
          status === "claimed"
            ? "bg-green-900/20 border-green-500/30 opacity-60"
            : status === "completed"
            ? "bg-vintage-gold/10 border-vintage-gold/50 animate-pulse"
            : "bg-vintage-charcoal/50 border-vintage-gold/20 hover:border-vintage-gold/40"
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {quest.type === "channel" ? (
              <svg className="w-5 h-5 text-vintage-gold flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M5.41 21L6.12 17H2.12L2.47 15H6.47L7.53 9H3.53L3.88 7H7.88L8.59 3H10.59L9.88 7H15.88L16.59 3H18.59L17.88 7H21.88L21.53 9H17.53L16.47 15H20.47L20.12 17H16.12L15.41 21H13.41L14.12 17H8.12L7.41 21H5.41ZM9.47 9L8.47 15H14.47L15.47 9H9.47Z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-vintage-gold flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
              </svg>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-vintage-gold font-bold text-sm truncate">{quest.displayName}</p>
              <p className="text-vintage-burnt-gold text-xs truncate">{quest.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-vintage-gold font-bold text-sm whitespace-nowrap">+{quest.reward}</span>
            {status === "claimed" ? (
              <span className="px-3 py-1.5 rounded-lg bg-green-600/20 text-green-400 text-xs font-bold">Claimed</span>
            ) : status === "completed" ? (
              <button onClick={() => handleClaim(quest)} disabled={isClaiming} className="px-3 py-1.5 rounded-lg bg-vintage-gold text-vintage-black font-bold text-xs hover:bg-vintage-gold/90 transition-all disabled:opacity-50">
                {isClaiming ? "..." : "Claim"}
              </button>
            ) : (
              <button onClick={() => verifyQuest(quest)} disabled={isVerifying} className="px-3 py-1.5 rounded-lg bg-vintage-charcoal border border-vintage-gold/50 text-vintage-gold font-bold text-xs hover:bg-vintage-gold/10 transition-all disabled:opacity-50">
                {isVerifying ? "..." : visitedQuests.has(quest.id) ? "Verify" : "Go"}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  const currentCast = featuredCasts?.[currentCastIndex];
  const currentCastData = currentCast ? castData[currentCast.warpcastUrl] : null;

  // Get first image from cast embeds
  const getCastImage = (cast: NeynarCast | null): string | null => {
    if (!cast?.embeds) return null;
    for (const embed of cast.embeds) {
      if (embed.url && (embed.url.includes('.jpg') || embed.url.includes('.png') || embed.url.includes('.gif') || embed.url.includes('.webp'))) {
        return embed.url;
      }
      if (embed.metadata?.image?.url) {
        return embed.metadata.image.url;
      }
    }
    return null;
  };

  const formatTimeAgo = (timestamp: string): string => {
    const now = new Date();
    const castDate = new Date(timestamp);
    const diffMs = now.getTime() - castDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    if (diffMins > 0) return `${diffMins}m ago`;
    return "now";
  };

  return (
    <div className="space-y-4">
      {featuredCasts && featuredCasts.length > 0 && (
        <div className="bg-vintage-charcoal/80 rounded-xl border-2 border-purple-500/30 p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-purple-300 font-bold text-sm flex items-center gap-2">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M18.8 8.2H5.2L3 9.4v7.8l3.2 3.2h9.6l3-3V9.4l-1-1.2zm-1.6 8.4l-1.6 1.6H8.4L6.8 16.6V11l1-1.2h8.4l1 1.2v5.6z"/><path d="M5.2 5.6L8.4 3.6h7.2l3.2 2H5.2z"/></svg>
              Featured Cast
            </h4>
            {featuredCasts.length > 1 && (
              <div className="flex gap-1">
                {featuredCasts.map((_: unknown, idx: number) => (
                  <button key={idx} onClick={() => setCurrentCastIndex(idx)} className={`w-2 h-2 rounded-full transition-all ${idx === currentCastIndex ? "bg-purple-400" : "bg-purple-400/30 hover:bg-purple-400/50"}`} />
                ))}
              </div>
            )}
          </div>

          <a
            href={currentCast?.warpcastUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-lg bg-purple-900/20 border border-purple-500/30 hover:border-purple-500/50 transition-all overflow-hidden"
          >
            {loadingCasts && !currentCastData ? (
              <div className="p-4 flex items-center justify-center">
                <div className="animate-spin w-5 h-5 border-2 border-purple-400 border-t-transparent rounded-full" />
              </div>
            ) : currentCastData ? (
              <div className="p-3">
                {/* Author info */}
                <div className="flex items-center gap-2 mb-2">
                  {currentCastData.author.pfp_url ? (
                    <img
                      src={currentCastData.author.pfp_url}
                      alt={currentCastData.author.username}
                      className="w-8 h-8 rounded-full border border-purple-500/50"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-purple-600/50 flex items-center justify-center">
                      <span className="text-purple-200 text-xs font-bold">
                        {currentCastData.author.username?.charAt(0)?.toUpperCase() || "?"}
                      </span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-purple-200 font-bold text-sm truncate">
                      {currentCastData.author.display_name || currentCastData.author.username}
                    </p>
                    <p className="text-purple-400/70 text-xs">
                      @{currentCastData.author.username} · {formatTimeAgo(currentCastData.timestamp)}
                    </p>
                  </div>
                  <svg className="w-4 h-4 text-purple-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 17L17 7M17 7H7M17 7V17" /></svg>
                </div>

                {/* Cast text */}
                <p className="text-purple-100 text-sm mb-2 line-clamp-3 whitespace-pre-wrap">
                  {currentCastData.text}
                </p>

                {/* Cast image if present */}
                {getCastImage(currentCastData) && (
                  <div className="mt-2 rounded-lg overflow-hidden border border-purple-500/30">
                    <img
                      src={getCastImage(currentCastData)!}
                      alt="Cast embed"
                      className="w-full h-32 object-cover"
                    />
                  </div>
                )}

                {/* Engagement stats */}
                <div className="flex items-center gap-4 mt-2 text-purple-400/70 text-xs">
                  <span className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                    {currentCastData.reactions?.likes_count || 0}
                  </span>
                  <span className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/></svg>
                    {currentCastData.reactions?.recasts_count || 0}
                  </span>
                  <span className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M21.99 4c0-1.1-.89-2-1.99-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18z"/></svg>
                    {currentCastData.replies?.count || 0}
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-3">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-purple-400" viewBox="0 0 24 24" fill="currentColor"><path d="M18.8 8.2H5.2L3 9.4v7.8l3.2 3.2h9.6l3-3V9.4l-1-1.2zm-1.6 8.4l-1.6 1.6H8.4L6.8 16.6V11l1-1.2h8.4l1 1.2v5.6z"/><path d="M5.2 5.6L8.4 3.6h7.2l3.2 2H5.2z"/></svg>
                  <span className="text-purple-300 text-sm font-medium">View on Warpcast</span>
                </div>
                <p className="text-vintage-burnt-gold text-xs mt-2 truncate">{currentCast?.castHash}</p>
              </div>
            )}
          </a>
        </div>
      )}
      <div className="bg-vintage-charcoal/80 rounded-xl border-2 border-vintage-gold/30 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-vintage-gold font-display font-bold text-lg">Social Quests</h3>
          <div className="text-right">
            <p className="text-vintage-gold font-bold text-sm">{completedQuests}/{totalQuests} Complete</p>
            {claimableReward > 0 && <p className="text-green-400 text-xs animate-pulse">+{claimableReward} claimable!</p>}
          </div>
        </div>
        <div className="h-2 bg-vintage-black rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-vintage-gold to-vintage-burnt-gold transition-all" style={{ width: `${(completedQuests / totalQuests) * 100}%` }} />
        </div>
        <p className="text-vintage-burnt-gold text-xs mt-2 text-center">Total Rewards: {totalPotentialReward} $TESTVBMS</p>
      </div>
      <div className="bg-vintage-charcoal/80 rounded-xl border-2 border-vintage-gold/30 p-4">
        <h4 className="text-vintage-gold font-bold text-sm mb-3 flex items-center gap-2">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" /></svg>
          Follow & Join
        </h4>
        <div className="space-y-2">{SOCIAL_QUESTS.map(renderQuest)}</div>
      </div>
      {!userFid && (
        <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-3">
          <p className="text-yellow-400 text-xs text-center">Connect with Farcaster to auto-verify quests</p>
        </div>
      )}
    </div>
  );
}
