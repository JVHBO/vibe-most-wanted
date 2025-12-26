"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAccount } from "wagmi";
import { useRouter } from "next/navigation";
import { useCachedDailyQuest } from "@/lib/convex-cache";
import { SOCIAL_QUESTS, type SocialQuest } from "@/lib/socialQuests";
import { AudioManager } from "@/lib/audio-manager";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useLanguage } from "@/contexts/LanguageContext";

export default function QuestsPage() {
  const router = useRouter();
  const { address, isConnecting } = useAccount();
  const { t } = useLanguage();

  // Daily Quest
  const { quest: dailyQuest, refresh: refreshDailyQuest } = useCachedDailyQuest();
  const questProgress = useQuery(
    api.quests.getQuestProgress,
    address ? { address: address.toLowerCase() } : "skip"
  );
  const claimDailyReward = useMutation(api.quests.claimQuestReward);
  const ensureDailyQuest = useMutation(api.quests.ensureDailyQuest);

  // Social Quests
  const socialQuestProgress = useQuery(
    api.socialQuests.getSocialQuestProgress,
    address ? { address: address.toLowerCase() } : "skip"
  );
  const markCompleted = useMutation(api.socialQuests.markQuestCompleted);
  const claimSocialReward = useMutation(api.socialQuests.claimSocialQuestReward);


  // Get user FID from profile
  const profile = useQuery(
    api.profiles.getProfile,
    address ? { address: address.toLowerCase() } : "skip"
  );
  const userFid = profile?.fid;

  // State
  const [isClaiming, setIsClaiming] = useState(false);
  const [verifying, setVerifying] = useState<string | null>(null);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [localCompleted, setLocalCompleted] = useState<Set<string>>(new Set());
  const [visitedQuests, setVisitedQuests] = useState<Set<string>>(new Set());

  // Personal Missions (Welcome, VibeFID, Daily Login, etc)
  const personalMissions = useQuery(
    api.missions.getPlayerMissions,
    address ? { playerAddress: address.toLowerCase() } : "skip"
  );
  const claimMission = useMutation(api.missions.claimMission);
  const claimAllMissions = useMutation(api.missions.claimAllMissions);
  const ensureWelcomeGift = useMutation(api.missions.ensureWelcomeGift);
  const markDailyLogin = useMutation(api.missions.markDailyLogin);
  const vibeBadgeEligibility = useQuery(
    api.missions.checkVibeBadgeEligibility,
    address ? { playerAddress: address.toLowerCase() } : "skip"
  );
  const claimVibeBadge = useMutation(api.missions.claimVibeBadge);
  const [claimingMission, setClaimingMission] = useState<string | null>(null);
  const [claimingBadge, setClaimingBadge] = useState(false);
  const [missions, setMissions] = useState<any[]>([]);
  const [isLoadingMissions, setIsLoadingMissions] = useState(true);
  const [isClaimingAll, setIsClaimingAll] = useState(false);

  // All mission types (matching backend) - using translation keys
  const ALL_MISSION_TYPES = [
    { type: 'daily_login', reward: 100, date: 'today', titleKey: 'mission_daily_login', descKey: 'mission_daily_login_desc' },
    { type: 'first_pve_win', reward: 50, date: 'today', titleKey: 'mission_first_pve_win', descKey: 'mission_first_pve_win_desc' },
    { type: 'first_pvp_match', reward: 100, date: 'today', titleKey: 'mission_first_pvp_match', descKey: 'mission_first_pvp_match_desc' },
    { type: 'streak_3', reward: 150, date: 'today', titleKey: 'mission_streak_3', descKey: 'mission_streak_3_desc' },
    { type: 'streak_5', reward: 300, date: 'today', titleKey: 'mission_streak_5', descKey: 'mission_streak_5_desc' },
    { type: 'streak_10', reward: 750, date: 'today', titleKey: 'mission_streak_10', descKey: 'mission_streak_10_desc' },
    { type: 'welcome_gift', reward: 500, date: 'once', titleKey: 'mission_welcome_gift', descKey: 'mission_welcome_gift_desc' },
    { type: 'vibefid_minted', reward: 5000, date: 'once', titleKey: 'mission_vibefid_minted', descKey: 'mission_vibefid_minted_desc' },
    { type: 'claim_vibe_badge', reward: 0, date: 'once', titleKey: 'mission_vibe_badge', descKey: 'mission_vibe_badge_desc' },
  ];

  // Initialize missions and daily quest on mount
  useEffect(() => {
    if (!address) return;
    const init = async () => {
      try {
        // Ensure daily quest exists
        await ensureDailyQuest({});
        refreshDailyQuest();

        // Ensure missions exist
        await ensureWelcomeGift({ playerAddress: address.toLowerCase() });
        await markDailyLogin({ playerAddress: address.toLowerCase() });
      } catch (e) {
        console.error('Error initializing:', e);
      }
    };
    init();
  }, [address]);

  // Build complete missions list from personalMissions + ALL_MISSION_TYPES
  useEffect(() => {
    if (personalMissions === undefined) {
      setIsLoadingMissions(true);
      return;
    }

    const completeMissionsList = ALL_MISSION_TYPES.map((def) => {
      const existing = (personalMissions || []).find((m: any) => m.missionType === def.type);
      if (existing) {
        return { ...existing, titleKey: def.titleKey, descKey: def.descKey };
      }
      // Special handling for VIBE badge
      if (def.type === 'claim_vibe_badge') {
        return {
          _id: 'placeholder_claim_vibe_badge',
          missionType: def.type,
          completed: vibeBadgeEligibility?.eligible || false,
          claimed: vibeBadgeEligibility?.hasBadge || false,
          reward: 0,
          titleKey: def.titleKey,
          descKey: def.descKey,
        };
      }
      // Return locked mission placeholder
      return {
        _id: `placeholder_${def.type}`,
        missionType: def.type,
        completed: false,
        claimed: false,
        reward: def.reward,
        titleKey: def.titleKey,
        descKey: def.descKey,
      };
    });
    setMissions(completeMissionsList);
    setIsLoadingMissions(false);
  }, [personalMissions, vibeBadgeEligibility]);



  // Daily Quest handlers
  const handleClaimDaily = async () => {
    if (!questProgress || questProgress.claimed || isClaiming || !address) return;
    setIsClaiming(true);
    try {
      await claimDailyReward({ address: address.toLowerCase() });
      AudioManager.win();
    } catch (error) {
      console.error("Failed to claim:", error);
    } finally {
      setIsClaiming(false);
    }
  };

  // Social Quest handlers
  const verifyQuest = async (quest: SocialQuest) => {
    if (!visitedQuests.has(quest.id)) {
      window.open(quest.url, "_blank");
      setVisitedQuests((prev) => new Set([...prev, quest.id]));
      AudioManager.buttonClick();
      return;
    }

    if (!userFid || !address) {
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
        await markCompleted({ address: address.toLowerCase(), questId: quest.id });
        setLocalCompleted((prev) => new Set([...prev, quest.id]));
        AudioManager.buttonSuccess();
      } else {
        window.open(quest.url, "_blank");
      }
    } catch (error) {
      console.error("Error verifying quest:", error);
      window.open(quest.url, "_blank");
    } finally {
      setVerifying(null);
    }
  };

  const handleClaimSocial = async (quest: SocialQuest) => {
    if (!address) return;
    setClaiming(quest.id);
    try {
      const result = await claimSocialReward({ address: address.toLowerCase(), questId: quest.id });
      if (result.success) AudioManager.win();
    } catch (error) {
      console.error("Error claiming:", error);
    } finally {
      setClaiming(null);
    }
  };

  const getQuestStatus = (quest: SocialQuest) => {
    const progress = socialQuestProgress?.[quest.id];
    if (progress?.claimed) return "claimed";
    if (progress?.completed || localCompleted.has(quest.id)) return "completed";
    return "pending";
  };

  if (isConnecting) {
    return (
      <div className="fixed inset-0 bg-vintage-deep-black flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!address) {
    return (
      <div className="fixed inset-0 bg-vintage-deep-black overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-vintage-charcoal via-vintage-deep-black to-vintage-charcoal/50" />
        <div className="relative z-10 flex items-center justify-center h-full">
          <div className="text-center">
            <h2 className="text-3xl font-display font-bold text-vintage-gold mb-4">QUESTS</h2>
            <p className="text-vintage-ice/70">Connect wallet to access</p>
          </div>
        </div>
      </div>
    );
  }

  const dailyProgress = questProgress?.progress || 0;
  const dailyTarget = dailyQuest?.requirement?.count || 1;
  const dailyCompleted = dailyProgress >= dailyTarget;
  const canClaimDaily = dailyCompleted && !questProgress?.claimed;

  return (
    <div className="fixed inset-0 bg-vintage-deep-black overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-vintage-charcoal via-vintage-deep-black to-vintage-charcoal/50" />

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 p-3">
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="group px-3 py-2 bg-black/50 hover:bg-vintage-gold/10 text-vintage-ice hover:text-vintage-gold border border-vintage-gold/20 hover:border-vintage-gold/50 rounded transition-all duration-200 text-xs font-bold uppercase tracking-wider"
          >
            <span className="group-hover:-translate-x-0.5 inline-block transition-transform">←</span> Back
          </button>

          <h1 className="text-2xl font-display font-bold text-vintage-gold tracking-wider">QUESTS</h1>

          <div className="w-20" />
        </div>
      </div>

      {/* Tabs */}
      <div className="absolute top-14 left-0 right-0 z-10 px-3 py-2">
        <div className="flex gap-2 max-w-md mx-auto">
          <button
            className="flex-1 py-2 px-3 rounded-lg font-bold text-sm transition-all bg-vintage-gold/20 border border-vintage-gold/50 text-vintage-gold"
          >
            Missions
          </button>
          <button
            onClick={() => router.push("/quests/cast")}
            className="flex-1 py-2 px-3 rounded-lg font-bold text-sm transition-all bg-vintage-charcoal/30 border border-vintage-gold/20 text-vintage-ice/70"
          >
            Wanted Casts
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="absolute inset-0 pt-28 pb-4 overflow-hidden">
        <div className="relative z-10 px-4 py-2 max-w-md mx-auto h-full flex flex-col">

          {/* Missions */}
          <div className="flex-1 overflow-y-auto space-y-3 max-h-[calc(100vh-180px)]">
              {/* Daily Quest */}
              <div className="bg-vintage-charcoal/50 border border-vintage-gold/30 rounded-xl p-3">
                <p className="text-vintage-gold text-xs font-bold mb-2">DAILY QUEST</p>
                {dailyQuest ? (
                  <>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-vintage-ice font-semibold text-sm truncate">{dailyQuest.description}</p>
                        <p className="text-xs text-vintage-ice/60">{dailyQuest.difficulty}</p>
                      </div>
                      <span className="text-vintage-gold font-bold text-sm">+{dailyQuest.reward}</span>
                    </div>

                    {/* Progress bar */}
                    <div className="mb-2">
                      <div className="w-full bg-vintage-black border border-vintage-gold/30 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${dailyCompleted ? "bg-green-500" : "bg-vintage-gold"}`}
                          style={{ width: `${Math.min((dailyProgress / dailyTarget) * 100, 100)}%` }}
                        />
                      </div>
                      <p className="text-xs text-vintage-ice/60 mt-1 text-right">{dailyProgress}/{dailyTarget}</p>
                    </div>

                    {/* Claim button */}
                    {questProgress?.claimed ? (
                      <span className="text-green-400 text-xs font-bold">Claimed</span>
                    ) : canClaimDaily ? (
                      <button
                        onClick={handleClaimDaily}
                        disabled={isClaiming}
                        className="w-full bg-vintage-gold text-black font-bold py-2 px-4 rounded-lg text-sm disabled:opacity-50"
                      >
                        {isClaiming ? "..." : "Claim"}
                      </button>
                    ) : null}
                  </>
                ) : dailyQuest === undefined ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin w-5 h-5 border-2 border-vintage-gold border-t-transparent rounded-full" />
                  </div>
                ) : (
                  <p className="text-vintage-ice/50 text-xs text-center py-2">No daily quest available</p>
                )}
              </div>

              {/* Personal Missions (Welcome, VibeFID, etc) */}
              <div className="bg-vintage-charcoal/50 border border-vintage-gold/30 rounded-xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-vintage-gold text-xs font-bold">PERSONAL MISSIONS</p>
                  {missions.some(m => m.completed && !m.claimed) && (
                    <button
                      onClick={async () => {
                        if (!address) return;
                        setIsClaimingAll(true);
                        try {
                          await claimAllMissions({ playerAddress: address.toLowerCase() });
                          AudioManager.win();
                        } catch (e) {
                          console.error(e);
                        } finally {
                          setIsClaimingAll(false);
                        }
                      }}
                      disabled={isClaimingAll}
                      className="relative px-2 py-1 rounded bg-vintage-gold text-black font-bold text-[10px]"
                    >
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
                      {isClaimingAll ? "..." : t('mission_claim_all')}
                    </button>
                  )}
                </div>
                {isLoadingMissions ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin w-5 h-5 border-2 border-vintage-gold border-t-transparent rounded-full" />
                  </div>
                ) : (
                  <div className="space-y-2">
                    {missions.map((mission: any) => {
                      const isClaiming = claimingMission === mission._id;
                      const isPlaceholder = mission._id.startsWith('placeholder_');
                      const isVibeBadge = mission.missionType === 'claim_vibe_badge';

                      return (
                        <div
                          key={mission._id}
                          className={`p-2 rounded-lg border transition-all ${
                            mission.claimed
                              ? "bg-green-900/20 border-green-500/30 opacity-60"
                              : mission.completed
                              ? "bg-vintage-gold/10 border-vintage-gold/50"
                              : "bg-vintage-black/30 border-vintage-gold/20 opacity-50"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-vintage-ice text-xs font-medium truncate">{t(mission.titleKey)}</p>
                              <p className="text-[10px] text-vintage-ice/50 truncate">{t(mission.descKey)}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              {mission.reward > 0 && (
                                <span className="text-vintage-gold font-bold text-xs">+{mission.reward}</span>
                              )}
                              {mission.claimed ? (
                                <span className="text-green-400 text-[10px]">{t('mission_done')}</span>
                              ) : mission.completed && !isPlaceholder ? (
                                <button
                                  onClick={async () => {
                                    if (!address) return;
                                    setClaimingMission(mission._id);
                                    try {
                                      if (isVibeBadge) {
                                        await claimVibeBadge({ playerAddress: address.toLowerCase() });
                                      } else {
                                        await claimMission({
                                          playerAddress: address.toLowerCase(),
                                          missionId: mission._id,
                                        });
                                      }
                                      AudioManager.win();
                                    } catch (e) {
                                      console.error(e);
                                    } finally {
                                      setClaimingMission(null);
                                    }
                                  }}
                                  disabled={isClaiming}
                                  className={`relative px-2 py-1 rounded font-bold text-[10px] ${
                                    isVibeBadge
                                      ? "bg-purple-500 text-white"
                                      : "bg-vintage-gold text-black"
                                  }`}
                                >
                                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
                                  {isClaiming ? "..." : t('mission_claim')}
                                </button>
                              ) : (
                                <span className="text-vintage-ice/30 text-[10px]">{t('mission_locked')}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Social Quests */}
              <div className="bg-vintage-charcoal/50 border border-vintage-gold/30 rounded-xl p-3">
                <p className="text-vintage-gold text-xs font-bold mb-2">SOCIAL QUESTS</p>
                <div className="space-y-2">
                  {SOCIAL_QUESTS.map((quest) => {
                    const status = getQuestStatus(quest);
                    const isVerifying = verifying === quest.id;
                    const isClaimingSocial = claiming === quest.id;

                    return (
                      <div
                        key={quest.id}
                        className={`p-2 rounded-lg border transition-all ${
                          status === "claimed"
                            ? "bg-green-900/20 border-green-500/30 opacity-60"
                            : status === "completed"
                            ? "bg-vintage-gold/10 border-vintage-gold/50"
                            : "bg-vintage-black/30 border-vintage-gold/20"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                              quest.type === "channel"
                                ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                                : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                            }`}>
                              {quest.type === "channel" ? "#" : "@"}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-vintage-ice font-medium text-xs truncate">{quest.displayName}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-vintage-gold font-bold text-xs">+{quest.reward}</span>
                            {status === "claimed" ? (
                              <span className="text-green-400 text-[10px]">Done</span>
                            ) : status === "completed" ? (
                              <button
                                onClick={() => handleClaimSocial(quest)}
                                disabled={isClaimingSocial}
                                className="px-2 py-1 rounded bg-vintage-gold text-black font-bold text-[10px]"
                              >
                                {isClaimingSocial ? "..." : "Claim"}
                              </button>
                            ) : (
                              <button
                                onClick={() => verifyQuest(quest)}
                                disabled={isVerifying}
                                className="px-2 py-1 rounded bg-vintage-charcoal border border-vintage-gold/50 text-vintage-gold font-bold text-[10px]"
                              >
                                {isVerifying ? "..." : visitedQuests.has(quest.id) ? "Verify" : "Go"}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {!userFid && (
                  <p className="text-vintage-ice/50 text-[10px] text-center mt-2">Connect Farcaster to auto-verify</p>
                )}
              </div>
            </div>

        </div>
      </div>
    </div>
  );
}
