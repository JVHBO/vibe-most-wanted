"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useAction, useConvex } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAccount } from "wagmi";
import { useRouter } from "next/navigation";
import { SOCIAL_QUESTS, type SocialQuest } from "@/lib/socialQuests";
import { AudioManager } from "@/lib/audio-manager";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePrimaryAddress } from "@/lib/hooks/usePrimaryAddress";
import { useProfile } from "@/contexts/ProfileContext";
import { useArbValidator, ARB_CLAIM_TYPE } from "@/lib/hooks/useArbValidator";
import { isMiniappMode, isWarpcastClient } from "@/lib/utils/miniapp";


export default function QuestsPage() {
  const router = useRouter();
  const { isConnecting } = useAccount();
  const { primaryAddress: address } = usePrimaryAddress(); // 🔗 MULTI-WALLET: Use primary address
  const { t } = useLanguage();
  const { refreshProfile } = useProfile();
  const { validateOnArb } = useArbValidator();

  // Social Quests
  const socialQuestProgress = useQuery(
    api.socialQuests.getSocialQuestProgress,
    address ? { address: address.toLowerCase() } : "skip"
  );
  const markCompleted = useMutation(api.socialQuests.markQuestCompleted);
  const verifyAndCompleteQuest = useAction(api.socialQuests.verifyAndCompleteQuest);
  const claimSocialReward = useMutation(api.socialQuests.claimSocialQuestReward);


  // 🚀 BANDWIDTH FIX: Use getProfileDashboard instead of getProfile
  // Only needs fid, saves ~50KB per call
  const profileDashboard = useQuery(
    api.profiles.getProfileDashboard,
    address ? { address: address.toLowerCase() } : "skip"
  );
  const userFid = profileDashboard?.fid;
  // Effective chain: use profile preference (safety net in useArbValidator
  // blocks ARB tx on unsupported clients like Base App)
  const [localChain, setLocalChain] = useState<'base' | 'arbitrum'>('arbitrum');
  useEffect(() => {
    const c = (profileDashboard as any)?.preferredChain;
    if (c) setLocalChain(c);
  }, [(profileDashboard as any)?.preferredChain]);
  const effectiveChain = localChain;

  // State
  const [verifying, setVerifying] = useState<string | null>(null);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [localCompleted, setLocalCompleted] = useState<Set<string>>(new Set());
  const [visitedQuests, setVisitedQuests] = useState<Set<string>>(new Set());

  // Personal Missions (Welcome, VibeFID, Daily Login, etc)
  // 🚀 BANDWIDTH FIX: Converted from useQuery to manual query to avoid WebSocket subscription
  const convex = useConvex();
  const [personalMissions, setPersonalMissions] = useState<any[] | undefined>(undefined);
  const missionsLoadedRef = useRef(false);

  // Reset ref and state when wallet changes
  useEffect(() => {
    missionsLoadedRef.current = false;
    setPersonalMissions(undefined);
  }, [address]);

  // Load missions once per address
  useEffect(() => {
    if (!address || missionsLoadedRef.current) return;
    missionsLoadedRef.current = true;

    const loadMissions = async () => {
      try {
        const result = await convex.query(api.missions.getPlayerMissions, {
          playerAddress: address.toLowerCase(),
        });
        setPersonalMissions(result || []);
      } catch (e) {
        console.error('Error loading missions:', e);
        setPersonalMissions([]);
      }
    };
    loadMissions();
  }, [address, convex]);

  // Refresh missions after claim
  const refreshMissions = async () => {
    if (!address) return;
    try {
      const result = await convex.query(api.missions.getPlayerMissions, {
        playerAddress: address.toLowerCase(),
      });
      setPersonalMissions(result || []);
    } catch (e) {
      console.error('Error refreshing missions:', e);
    }
  };

  const claimMission = useMutation(api.missions.claimMission);
  const claimAllMissions = useMutation(api.missions.claimAllMissions);
  const setPreferredChainMutation = useMutation(api.missions.setPreferredChain);
  const markChainModalSeenMutation = useMutation(api.missions.markChainModalSeen);
  const [showChainModal, setShowChainModal] = useState(false);
  const [pendingClaimAction, setPendingClaimAction] = useState<(() => void) | null>(null);
  const ensureWelcomeGift = useMutation(api.missions.ensureWelcomeGift);
  const markDailyLogin = useMutation(api.missions.markDailyLogin);
  // 🚀 ON-CHAIN: VibeFID verification now uses action with Alchemy
  const [vibeBadgeEligibility, setVibeBadgeEligibility] = useState<{
    eligible: boolean;
    hasVibeFIDCards: boolean;
    hasBadge: boolean;
    vibeFIDCount: number;
  } | null>(null);
  const claimVibeBadge = useAction(api.missions.claimVibeBadge);
  const [claimingMission, setClaimingMission] = useState<string | null>(null);
  const [claimingBadge, setClaimingBadge] = useState(false);
  const [missions, setMissions] = useState<any[]>([]);
  const [isLoadingMissions, setIsLoadingMissions] = useState(true);
  const [isClaimingAll, setIsClaimingAll] = useState(false);
  const [arbSupported, setArbSupported] = useState(false);

  useEffect(() => {
    if (!isMiniappMode()) { setArbSupported(true); return; }
    const checkArb = async () => {
      try {
        const { sdk } = await import('@farcaster/miniapp-sdk');
        const ctx = await sdk.context;
        setArbSupported(isWarpcastClient(ctx?.client?.clientFid));
      } catch { setArbSupported(false); }
    };
    const timer = setTimeout(checkArb, 300);
    return () => clearTimeout(timer);
  }, []);

  const handleSwitchChain = async (chain: 'base' | 'arbitrum') => {
    setLocalChain(chain);
    if (!address) return;
    try { await setPreferredChainMutation({ address, chain }); }
    catch (e) { console.error('Failed to switch chain:', e); }
  };

  // All mission types (matching backend) - using translation keys
  const ALL_MISSION_TYPES = [
    { type: 'daily_login', reward: 50, date: 'today', titleKey: 'mission_daily_login', descKey: 'mission_daily_login_desc' },
    { type: 'first_pve_win', reward: 25, date: 'today', titleKey: 'mission_first_pve_win', descKey: 'mission_first_pve_win_desc' },
    { type: 'first_pvp_match', reward: 50, date: 'today', titleKey: 'mission_first_pvp_match', descKey: 'mission_first_pvp_match_desc' },
    { type: 'first_baccarat_win', reward: 100, date: 'today', titleKey: 'mission_first_baccarat_win', descKey: 'mission_first_baccarat_win_desc' },
    { type: 'streak_3', reward: 75, date: 'today', titleKey: 'mission_streak_3', descKey: 'mission_streak_3_desc' },
    { type: 'streak_5', reward: 150, date: 'today', titleKey: 'mission_streak_5', descKey: 'mission_streak_5_desc' },
    { type: 'tcg_win_streak_3', reward: 150, date: 'today', titleKey: 'mission_tcg_win_streak_3', descKey: 'mission_tcg_win_streak_3_desc' },
    { type: 'welcome_gift', reward: 250, date: 'once', titleKey: 'mission_welcome_gift', descKey: 'mission_welcome_gift_desc' },
    { type: 'vibefid_minted', reward: 5000, date: 'once', titleKey: 'mission_vibefid_minted', descKey: 'mission_vibefid_minted_desc' },
    { type: 'claim_vibe_badge', reward: 0, date: 'once', titleKey: 'mission_vibe_badge', descKey: 'mission_vibe_badge_desc' },
  ];

  // Initialize missions on mount
  // 🚀 BANDWIDTH FIX: Only call these mutations once per session/day
  // 🚀 BANDWIDTH FIX #2: Skip ensureWelcomeGift if user already has it
  useEffect(() => {
    if (!address || profileDashboard === undefined) return;
    const init = async () => {
      const sessionKey = `vbms_missions_init_${address.toLowerCase()}`;
      const today = new Date().toISOString().split('T')[0];
      const cached = sessionStorage.getItem(sessionKey);

      if (cached === today) return; // Already initialized today

      try {
        // 🚀 BANDWIDTH FIX: Only call ensureWelcomeGift if user doesn't have it yet
        // This saves ~10MB/day by skipping the mutation for users who already have the gift
        if (!profileDashboard?.hasReceivedWelcomeGift) {
          await ensureWelcomeGift({ playerAddress: address.toLowerCase() });
        }
        await markDailyLogin({ playerAddress: address.toLowerCase() });
        sessionStorage.setItem(sessionKey, today);
      } catch (e) {
        console.error('Error initializing:', e);
      }
    };
    init();
  }, [address, profileDashboard]);

  // 🚀 ON-CHAIN: Load VibeFID badge eligibility via Alchemy action
  useEffect(() => {
    if (!address) {
      setVibeBadgeEligibility(null);
      return;
    }

    const checkBadge = async () => {
      try {
        const result = await convex.action(api.missions.checkVibeBadgeEligibility, {
          playerAddress: address.toLowerCase(),
        });
        setVibeBadgeEligibility(result);
      } catch (e) {
        console.error('Error checking badge eligibility:', e);
        setVibeBadgeEligibility(null);
      }
    };
    checkBadge();
  }, [address, convex]);

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


  // Social Quest handlers
  const verifyQuest = async (quest: SocialQuest) => {
    // Handle SDK action quests (notification & miniapp)
    if (quest.type === 'notification' || quest.type === 'miniapp') {
      if (!userFid || !address) {
        AudioManager.buttonClick();
        return;
      }

      setVerifying(quest.id);
      try {
        const { sdk } = await import('@farcaster/miniapp-sdk');
        const result = await sdk.actions.addMiniApp();
        console.log('[QuestsPage] addMiniApp result:', result, 'quest:', quest.id);

        if (result) {
          // For miniapp quest - user added miniapp
          if (quest.type === 'miniapp') {
            await markCompleted({ address: address.toLowerCase(), questId: quest.id });
            setLocalCompleted((prev) => new Set([...prev, quest.id]));
            AudioManager.buttonSuccess();
          }

          // For notification quest - check if notifications enabled
          if (quest.type === 'notification') {
            if (result.notificationDetails) {
              await markCompleted({ address: address.toLowerCase(), questId: quest.id });
              setLocalCompleted((prev) => new Set([...prev, quest.id]));
              AudioManager.buttonSuccess();
            } else {
              AudioManager.buttonClick();
            }
          }
        }
      } catch (error) {
        console.error("[QuestsPage] SDK error:", error);
        AudioManager.buttonClick();
      } finally {
        setVerifying(null);
      }
      return;
    }

    // Regular quests (follow/channel)
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
      // Use Convex action to verify and mark complete in one call
      const result = await verifyAndCompleteQuest({
        address: address.toLowerCase(),
        questId: quest.id,
        userFid: parseInt(userFid as string) || 0,
      });
      if (result.completed) {
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
      const chain = effectiveChain;
      if (chain === "arbitrum") {
        await validateOnArb(quest.reward, ARB_CLAIM_TYPE.MISSION);
      }
      const result = await claimSocialReward({ address: address.toLowerCase(), questId: quest.id });
      // Sound removed - was repetitive
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
            <h2 className="text-3xl font-display font-bold text-vintage-gold mb-4">{t('questsTitle')}</h2>
            <p className="text-vintage-ice/70">{t('questsConnectWallet')}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-vintage-deep-black overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-vintage-charcoal via-vintage-deep-black to-black" />

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-20 bg-vintage-charcoal/90 border-b-2 border-vintage-gold/40 backdrop-blur-sm">
        <div className="flex items-center justify-between px-3 py-2.5">
          <button
            onClick={() => router.push("/")}
            className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white font-bold border-2 border-black text-xs uppercase tracking-wide transition-all active:translate-x-[2px] active:translate-y-[2px]"
            style={{ boxShadow: "3px 3px 0px #000" }}
          >
            ← BACK
          </button>
          <h1 className="text-xl font-display font-bold text-vintage-gold tracking-wider">{t('questsTitle')}</h1>
          {arbSupported ? (
            <div style={{ display:"flex", gap:"4px", background:"rgba(0,0,0,0.6)", padding:"4px", borderRadius:"8px" }}>
              <button
                onClick={() => { AudioManager.buttonClick(); handleSwitchChain('base'); }}
                style={{ padding:"4px 12px", borderRadius:"4px", fontWeight:700, fontSize:"12px", border:"none", cursor:"pointer", background: effectiveChain === 'base' ? '#F59E0B' : '#3F3F46', color: effectiveChain === 'base' ? '#000' : '#A1A1AA' }}
              >BASE</button>
              <button
                onClick={() => { AudioManager.buttonClick(); handleSwitchChain('arbitrum'); }}
                style={{ padding:"4px 12px", borderRadius:"4px", fontWeight:700, fontSize:"12px", border:"none", cursor:"pointer", background: effectiveChain === 'arbitrum' ? '#F59E0B' : '#3F3F46', color: effectiveChain === 'arbitrum' ? '#000' : '#A1A1AA' }}
              >ARB</button>
            </div>
          ) : <div className="w-20" />}
        </div>

        {/* Tabs */}
        <div className="flex border-t border-vintage-gold/20">
          <button className="flex-1 py-2.5 text-sm font-bold text-vintage-gold border-b-2 border-vintage-gold bg-vintage-gold/10 border-r border-r-vintage-gold/20">
            {t('questsMissions')}
          </button>
          <button
            onClick={() => router.push("/quests/cast")}
            className="flex-1 py-2.5 text-sm font-bold text-vintage-ice/80 hover:text-vintage-gold bg-vintage-charcoal/60 hover:bg-vintage-gold/5 transition-colors"
          >
            {t('questsWantedCasts')}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="absolute inset-0 pt-24 pb-4 overflow-y-auto">
        <div className="relative z-10 px-3 py-2 max-w-md mx-auto space-y-3">

          {/* Missions */}
          <div className="space-y-3">
              {/* 🎁 BONUS QUESTS - Hide if all claimed */}
              {SOCIAL_QUESTS.filter(q => (q.type === 'notification' || q.type === 'miniapp') && getQuestStatus(q) !== 'claimed').length > 0 && (
              <div className="bg-gradient-to-b from-vintage-gold/30 to-vintage-charcoal/90 rounded-xl border-2 border-vintage-gold/50 p-3 shadow-lg">
                <p className="text-vintage-gold text-sm font-bold mb-2 flex items-center gap-2">
                  🎁 BONUS QUESTS (+2000 VBMS)
                </p>
                <div className="space-y-2">
                  {SOCIAL_QUESTS
                  .filter(q => (q.type === 'notification' || q.type === 'miniapp') && getQuestStatus(q) !== 'claimed')
                  .sort((a, b) => {
                    const statusA = getQuestStatus(a);
                    const statusB = getQuestStatus(b);
                    if (statusA === 'completed' && statusB !== 'completed') return -1;
                    if (statusB === 'completed' && statusA !== 'completed') return 1;
                    return 0;
                  })
                  .map((quest) => {
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
                            ? "bg-vintage-gold/10 border-vintage-gold/50 animate-pulse"
                            : "bg-vintage-black/30 border-vintage-gold/30"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <span className="text-xl">{quest.type === 'notification' ? '🔔' : '⭐'}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-vintage-gold font-bold text-xs truncate">{quest.displayName}</p>
                              <p className="text-vintage-burnt-gold text-[10px] truncate">{quest.description}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-vintage-gold font-bold text-xs">
                              +{effectiveChain === "arbitrum" ? quest.reward * 2 : quest.reward}
                              {effectiveChain === "arbitrum" && <span className="text-blue-400 text-[8px] ml-0.5">ARB 2x</span>}
                            </span>
                            {status === "claimed" ? (
                              <span className="text-green-400 text-[10px]">{t('questsDone')}</span>
                            ) : status === "completed" ? (
                              <button
                                onClick={() => { AudioManager.buttonClick(); handleClaimSocial(quest); }}
                                onMouseEnter={() => AudioManager.buttonHover()}
                                disabled={isClaimingSocial}
                                className="px-2 py-1 rounded border-2 border-black bg-vintage-gold text-black font-bold text-[10px]"
                                style={{ boxShadow: "2px 2px 0px #000" }}
                              >
                                {isClaimingSocial ? "..." : t('questsClaim')}
                              </button>
                            ) : (
                              <button
                                onClick={() => { AudioManager.buttonClick(); verifyQuest(quest); }}
                                onMouseEnter={() => AudioManager.buttonHover()}
                                disabled={isVerifying}
                                className="px-2.5 py-1 rounded border-2 border-vintage-gold/50 bg-vintage-charcoal text-vintage-gold font-bold text-[10px] hover:border-vintage-gold transition-all"
                              >
                                {isVerifying ? "..." : quest.type === 'notification' ? 'Ativar' : 'Adicionar'}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              )}

              {/* Personal Missions (Welcome, VibeFID, etc) */}
              <div className="bg-vintage-charcoal/80 border-2 border-vintage-gold/40 rounded-xl overflow-hidden" style={{ boxShadow: "3px 3px 0px rgba(0,0,0,0.5)" }}>
                <div className="flex items-center justify-between px-3 py-2 border-b border-vintage-gold/20">
                  <p className="text-vintage-gold text-sm font-bold">{t('questsPersonalMissions')}</p>
                  {missions.some(m => m.completed && !m.claimed) && (
                    <button
                      onClick={async () => {
                        if (!address) return;
                        setIsClaimingAll(true);
                        try {
                          const chain = effectiveChain;
                          const result = await claimAllMissions({ playerAddress: address.toLowerCase(), chain });
                          if (chain === "arbitrum" && result?.totalReward > 0) {
                            await validateOnArb(result.totalReward, ARB_CLAIM_TYPE.MISSION);
                          }
                          await refreshMissions();
                        } catch (e) {
                          console.error(e);
                        } finally {
                          setIsClaimingAll(false);
                        }
                      }}
                      disabled={isClaimingAll}
                      className="relative px-3 py-1 bg-vintage-gold text-black font-bold text-xs rounded border-2 border-black"
                      style={{ boxShadow: "2px 2px 0px #000" }}
                    >
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
                      {isClaimingAll ? "..." : t('mission_claim_all')}
                    </button>
                  )}
                </div>
                {isLoadingMissions ? (
                  <div className="flex items-center justify-center py-6">
                    <div className="animate-spin w-5 h-5 border-2 border-vintage-gold border-t-transparent rounded-full" />
                  </div>
                ) : (
                  <div className="divide-y divide-vintage-gold/10">
                    {missions
                    .filter((m: any) => !m.claimed)
                    .sort((a: any, b: any) => {
                      if (a.completed && !b.completed) return -1;
                      if (b.completed && !a.completed) return 1;
                      return 0;
                    })
                    .map((mission: any) => {
                      const isClaiming = claimingMission === mission._id;
                      const isPlaceholder = mission._id.startsWith('placeholder_');
                      const isVibeBadge = mission.missionType === 'claim_vibe_badge';

                      return (
                        <div
                          key={mission._id}
                          className={`flex items-center gap-3 px-3 py-2.5 transition-all ${
                            mission.completed ? "bg-yellow-400/5" : "opacity-50"
                          }`}
                        >
                          {/* State indicator */}
                          <div className={`w-1 self-stretch flex-shrink-0 ${
                            mission.completed ? "bg-yellow-400" : "bg-white/10"
                          }`} />
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs font-bold truncate ${mission.completed ? "text-vintage-ice" : "text-vintage-ice/50"}`}>
                              {t(mission.titleKey)}
                            </p>
                            <p className="text-[10px] text-vintage-ice/40 truncate">{t(mission.descKey)}</p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {mission.reward > 0 && (
                              <div className="flex flex-col items-end">
                                <span className="text-vintage-gold font-bold text-xs">
                                  +{effectiveChain === "arbitrum" ? mission.reward * 2 : mission.reward}
                                  {effectiveChain === "arbitrum" && <span className="text-blue-400 text-[8px] ml-0.5">2x</span>}
                                </span>
                                <span className="text-purple-400 text-[9px] font-bold">+1 aura</span>
                              </div>
                            )}
                            {mission.completed && !isPlaceholder ? (
                              <button
                                onClick={async () => {
                                  AudioManager.buttonClick();
                                  if (!address) return;
                                  setClaimingMission(mission._id);
                                  try {
                                    if (isVibeBadge) {
                                      await claimVibeBadge({ playerAddress: address.toLowerCase() });
                                      await refreshProfile();
                                    } else {
                                      const chain = effectiveChain;
                                      await claimMission({ playerAddress: address.toLowerCase(), missionId: mission._id, chain });
                                      if (chain === "arbitrum" && mission.reward > 0) await validateOnArb(mission.reward, ARB_CLAIM_TYPE.MISSION);
                                    }
                                    AudioManager.buttonSuccess();
                                    await refreshMissions();
                                  } catch (e) { console.error(e); }
                                  finally { setClaimingMission(null); }
                                }}
                                disabled={isClaiming}
                                className={`relative px-2.5 py-1 rounded border-2 border-black font-bold text-xs ${isVibeBadge ? "bg-purple-500 text-white" : "bg-vintage-gold text-black"}`}
                                style={{ boxShadow: "2px 2px 0px #000" }}
                              >
                                <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                                {isClaiming ? "..." : t('mission_claim')}
                              </button>
                            ) : (
                              <span className="text-vintage-ice/20 text-[10px]">{t('mission_locked')}</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Social Quests (Follow & Join) */}
              <div className="bg-vintage-charcoal/80 border-2 border-vintage-gold/40 rounded-xl overflow-hidden" style={{ boxShadow: "3px 3px 0px rgba(0,0,0,0.5)" }}>
                <div className="px-3 py-2 border-b border-vintage-gold/20">
                  <p className="text-vintage-gold text-sm font-bold">{t('questsSocialQuests')}</p>
                </div>

                {/* 2x Bonus Banners */}
                {(() => {
                  // 🐛 FIX: Check actual VibeFID NFT ownership, not just Farcaster FID
                  const hasVibeFID = vibeBadgeEligibility?.hasVibeFIDCards || false;
                  const hasVibeBadge = profileDashboard?.hasVibeBadge;
                  const has2xBonus = hasVibeFID || hasVibeBadge;
                  const bonusSource = hasVibeBadge ? "VIBE Badge" : hasVibeFID ? "VibeFID" : "";
                  const isArb = effectiveChain === "arbitrum";

                  return (
                    <>
                      {has2xBonus ? (
                        <div className="p-2 mb-1 bg-vintage-gold/15 border border-vintage-gold/50 rounded-lg flex items-center gap-2">
                          <span className="text-vintage-gold">🎖️</span>
                          <span className="text-vintage-gold font-bold text-xs">{bonusSource} Active</span>
                          <span className="text-vintage-ice text-[10px]">2x coins!</span>
                        </div>
                      ) : (
                        <div className="p-2 mb-1 bg-vintage-gold/10 border border-vintage-gold/30 rounded-lg flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span>✨</span>
                            <span className="text-vintage-ice text-xs">Get 2x rewards!</span>
                          </div>
                          <button
                            onClick={() => router.push('/fid')}
                            className="px-2 py-1 rounded bg-vintage-gold text-black font-bold text-[10px] animate-pulse"
                          >
                            Mint VibeFID
                          </button>
                        </div>
                      )}
                      {isArb && (
                        <div className="p-2 mb-2 bg-blue-900/20 border border-blue-500/40 rounded-lg flex items-center gap-2">
                          <span className="text-blue-400">◆</span>
                          <span className="text-blue-400 font-bold text-xs">Arbitrum 2x</span>
                          <span className="text-vintage-ice text-[10px]">Quest rewards doubled!</span>
                        </div>
                      )}
                    </>
                  );
                })()}
                <div className="divide-y divide-vintage-gold/10">
                  {SOCIAL_QUESTS
                  .filter(q => q.type !== 'notification' && q.type !== 'miniapp' && getQuestStatus(q) !== 'claimed')
                  .sort((a, b) => {
                    const statusA = getQuestStatus(a);
                    const statusB = getQuestStatus(b);
                    if (statusA === 'completed' && statusB !== 'completed') return -1;
                    if (statusB === 'completed' && statusA !== 'completed') return 1;
                    return 0;
                  })
                  .map((quest) => {
                    const status = getQuestStatus(quest);
                    const isVerifying = verifying === quest.id;
                    const isClaimingSocial = claiming === quest.id;

                    return (
                      <div key={quest.id} className={`flex items-center gap-3 px-3 py-2.5 transition-all ${status === "completed" ? "bg-yellow-400/5" : ""}`}>
                        <div className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                          quest.type === "channel"
                            ? "bg-purple-500/20 text-purple-400 border border-purple-500/40"
                            : "bg-blue-500/20 text-blue-400 border border-blue-500/40"
                        }`}>
                          {quest.type === "channel" ? "#" : "@"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-vintage-ice font-bold text-xs truncate">{quest.displayName}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-vintage-gold font-bold text-xs">
                            +{effectiveChain === "arbitrum" ? quest.reward * 2 : quest.reward}
                            {effectiveChain === "arbitrum" && <span className="text-blue-400 text-[8px] ml-0.5">2x</span>}
                          </span>
                          {status === "completed" ? (
                            <button onClick={() => { AudioManager.buttonClick(); handleClaimSocial(quest); }} onMouseEnter={() => AudioManager.buttonHover()} disabled={isClaimingSocial}
                              className="px-2.5 py-1 bg-vintage-gold text-black font-bold text-xs rounded border-2 border-black"
                              style={{ boxShadow: "2px 2px 0px #000" }}>
                              {isClaimingSocial ? "..." : t('questsClaim')}
                            </button>
                          ) : (
                            <button onClick={() => { AudioManager.buttonClick(); verifyQuest(quest); }} onMouseEnter={() => AudioManager.buttonHover()} disabled={isVerifying}
                              className="px-2.5 py-1 bg-vintage-charcoal border-2 border-vintage-gold/50 text-vintage-gold font-bold text-xs rounded hover:border-vintage-gold transition-all"
                              style={{ boxShadow: "none" }}>
                              {isVerifying ? "..." : visitedQuests.has(quest.id) ? t('questsVerify') : t('questsGo')}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {!userFid && (
                  <p className="text-vintage-ice/50 text-[10px] text-center px-3 py-2">{t('questsConnectFarcaster')}</p>
                )}
              </div>
            </div>

        </div>
      </div>
    </div>
  );
}
