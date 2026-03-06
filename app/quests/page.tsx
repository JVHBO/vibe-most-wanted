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
import { WantedCastsTab } from "@/components/fid/WantedCastsTab";
import { VibeMailInboxWithClaim } from "@/components/fid/VibeMail";
import { VibeFIDConvexProvider } from "@/contexts/VibeFIDConvexProvider";


export default function QuestsPage() {
  const router = useRouter();
  const { isConnecting } = useAccount();
  const { primaryAddress: address } = usePrimaryAddress(); // 🔗 MULTI-WALLET: Use primary address
  const { t } = useLanguage();
  const { refreshProfile } = useProfile();
  const { validateOnArb } = useArbValidator();
  const [activeTab, setActiveTab] = useState<'missions' | 'wanted' | 'messages'>('missions');

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
  // fid is stored as string in VMW, farcasterFid is the numeric version
  const userFid = profileDashboard?.farcasterFid || (profileDashboard?.fid ? parseInt(profileDashboard.fid as string) : undefined);
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
  const [claimFeedback, setClaimFeedback] = useState<Record<string, number>>({});
  const [socialCarouselIndices, setSocialCarouselIndices] = useState<Record<string, number>>({});
  const [socialSlideDir, setSocialSlideDir] = useState<Record<string, 'left' | 'right'>>({});
  const [missionCarouselIdx, setMissionCarouselIdx] = useState(0);

  // Auto-rotate social quest carousels — vbms at 0s, arb_creators offset by 2.5s
  const socialQuestCountsRef = useRef<Record<string, number>>({});
  const arbCarouselIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const rotateGroup = (groupId: string) => {
      setSocialSlideDir(prev => ({ ...prev, [groupId]: 'right' }));
      setSocialCarouselIndices(prev => {
        const count = socialQuestCountsRef.current[groupId] ?? 0;
        if (count <= 1) return prev;
        const cur = prev[groupId] ?? 0;
        return { ...prev, [groupId]: (cur + 1) % count };
      });
    };

    const vbmsInterval = setInterval(() => rotateGroup('vbms'), 10000);

    const arbTimeout = setTimeout(() => {
      rotateGroup('arb_creators');
      arbCarouselIntervalRef.current = setInterval(() => rotateGroup('arb_creators'), 10000);
    }, 5000);

    return () => {
      clearInterval(vbmsInterval);
      clearTimeout(arbTimeout);
      if (arbCarouselIntervalRef.current) clearInterval(arbCarouselIntervalRef.current);
    };
  }, []);

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
    if (chain === effectiveChain) return;
    setLocalChain(chain);
    if (!address) return;
    try { await setPreferredChainMutation({ address, chain }); }
    catch (e) { console.error('Failed to switch chain:', e); }
  };

  // No API call needed - pfp/banner URLs are hardcoded in socialQuests.ts

  // All mission types (matching backend) - using translation keys
  const ALL_MISSION_TYPES = [
    { type: 'daily_login', reward: 50, date: 'today', titleKey: 'mission_daily_login', descKey: 'mission_daily_login_desc' },
    { type: 'first_pve_win', reward: 25, date: 'today', titleKey: 'mission_first_pve_win', descKey: 'mission_first_pve_win_desc' },
    { type: 'first_pvp_match', reward: 50, date: 'today', titleKey: 'mission_first_pvp_match', descKey: 'mission_first_pvp_match_desc' },
    { type: 'first_baccarat_win', reward: 100, date: 'today', titleKey: 'mission_first_baccarat_win', descKey: 'mission_first_baccarat_win_desc' },
    { type: 'streak_3', reward: 75, date: 'today', titleKey: 'mission_streak_3', descKey: 'mission_streak_3_desc' },
    { type: 'streak_5', reward: 150, date: 'today', titleKey: 'mission_streak_5', descKey: 'mission_streak_5_desc' },
    { type: 'tcg_pve_win', reward: 25, date: 'today', titleKey: 'mission_tcg_pve_win', descKey: 'mission_tcg_pve_win_desc' },
    { type: 'tcg_pvp_match', reward: 50, date: 'today', titleKey: 'mission_tcg_pvp_match', descKey: 'mission_tcg_pvp_match_desc' },
    { type: 'tcg_play_3', reward: 75, date: 'today', titleKey: 'mission_tcg_play_3', descKey: 'mission_tcg_play_3_desc' },
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
      await claimSocialReward({ address: address.toLowerCase(), questId: quest.id });
    } catch (error) {
      console.error("Error claiming:", error);
    } finally {
      setClaiming(null);
    }
  };

  // Follow button: opens URL and marks as visited
  const handleFollowQuest = (quest: SocialQuest) => {
    window.open(quest.url, "_blank");
    setVisitedQuests(prev => new Set([...prev, quest.id]));
    AudioManager.buttonClick();
  };

  // Verify button: verifies follow then auto-claims reward
  const handleVerifyAndClaim = async (quest: SocialQuest) => {
    if (!userFid || !address) return;
    setVerifying(quest.id);
    try {
      const result = await verifyAndCompleteQuest({
        address: address.toLowerCase(),
        questId: quest.id,
        userFid: parseInt(userFid as string) || 0,
      });
      if (!result.completed) {
        // Not followed yet — reopen link
        window.open(quest.url, "_blank");
        return;
      }
      setLocalCompleted(prev => new Set([...prev, quest.id]));
      // Auto-claim immediately after verification
      setClaiming(quest.id);
      await claimSocialReward({ address: address.toLowerCase(), questId: quest.id });
      // Show brief coin feedback
      setClaimFeedback(prev => ({ ...prev, [quest.id]: quest.reward }));
      setTimeout(() => setClaimFeedback(prev => { const n = { ...prev }; delete n[quest.id]; return n; }), 3000);
      AudioManager.buttonSuccess();
    } catch (error) {
      console.error("Error verifying/claiming:", error);
    } finally {
      setVerifying(null);
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
    <div className="fixed inset-0 bg-[#1a1a1a] overflow-hidden">

      {/* Header */}
      <div className={`absolute top-0 left-0 right-0 z-20 ${activeTab === 'messages' ? 'bg-[#111]' : 'bg-[#1a1a1a]'} border-b-4 border-black`}>
        <div className="flex items-center justify-between px-3 py-1.5">
          <button
            onClick={() => router.push("/")}
            className="px-2 py-1 bg-[#CC2222] hover:bg-[#AA1111] text-white border-4 border-black text-[11px] font-black uppercase tracking-widest active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all"
            style={{ boxShadow: '4px 4px 0px #000' }}
          >
            ← BACK
          </button>
          <h1 className="text-sm font-black text-white uppercase tracking-widest">{t('questsTitle')}</h1>
          <div className="w-20" />
        </div>

        {/* Tabs */}
        <div className="flex px-2 pb-1.5 pt-1 gap-1">
          {[
            { key: 'missions' as const, label: t('questsMissions'), activeClass: 'qt-missions-active', inactiveClass: 'qt-missions-inactive' },
            { key: 'wanted' as const, label: t('questsWantedCasts'), activeClass: 'qt-wanted-active', inactiveClass: 'qt-wanted-inactive' },
            { key: 'messages' as const, label: 'VibeMail', activeClass: 'qt-messages-active', inactiveClass: 'qt-messages-inactive' },
          ].map(({ key, label, activeClass, inactiveClass }) => {
            const u = profileDashboard?.username?.toLowerCase();
            const locked = key === 'messages' && u !== 'jvhbo' && u !== 'vibefid';
            return (
              <button
                key={key}
                onClick={() => { if (locked) return; AudioManager.buttonClick(); setActiveTab(key); }}
                disabled={locked}
                className={`flex-1 py-1.5 font-black uppercase border-4 border-black transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none ${locked ? 'qt-messages-locked opacity-40 cursor-not-allowed' : activeTab === key ? `${activeClass} shadow-none` : `${inactiveClass} shadow-[3px_3px_0px_#000]`}`}
                style={{ fontSize: 'clamp(8px, 2.8vw, 11px)', lineHeight: 1.2 }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <div className={`absolute inset-0 pt-[84px] ${activeTab === 'messages' ? 'flex flex-col overflow-hidden' : 'pb-4 overflow-y-auto'}`}>
        {activeTab === 'missions' && (
        <div className="relative z-10 px-3 py-2 max-w-md mx-auto space-y-3 overflow-x-hidden">

          {/* Chain toggle + 2x bonus row */}
          <div className="flex items-center gap-2 mt-2">
            {/* 2x bonus indicator */}
            {(() => {
              const _has2x = vibeBadgeEligibility?.hasVibeFIDCards || profileDashboard?.hasVibeBadge;
              const _src = profileDashboard?.hasVibeBadge ? "VIBE Badge" : vibeBadgeEligibility?.hasVibeFIDCards ? "VibeFID" : "";
              return _has2x ? (
                <div className="flex-1 px-2 py-1 bg-vintage-gold/15 border border-vintage-gold/50 flex items-center gap-1.5">
                  <span className="text-vintage-gold font-bold text-[10px]">{_src} {t('questsBonus2xActive')}</span>
                  {effectiveChain === "arbitrum" && (
                    <span className="ml-auto px-1.5 py-0.5 bg-blue-900/40 border border-blue-500/50 text-blue-400 font-bold text-[9px]">ARB 2x</span>
                  )}
                </div>
              ) : (
                <div className="flex-1 px-2 py-1 bg-vintage-gold/10 border border-vintage-gold/30 flex items-center justify-between gap-1">
                  <span className="text-vintage-ice/70 text-[10px]">{t('questsGet2x')}</span>
                  <div className="flex items-center gap-1">
                    {effectiveChain === "arbitrum" && (
                      <span className="px-1.5 py-0.5 bg-blue-900/40 border border-blue-500/50 text-blue-400 font-bold text-[9px]">ARB 2x</span>
                    )}
                    <button onClick={() => router.push('/fid')}
                      className="px-2 py-0.5 bg-vintage-gold text-black font-bold text-[9px] animate-pulse border border-black">
                      {t('questsMintVibeFID')}
                    </button>
                  </div>
                </div>
              );
            })()}
            {/* Chain toggle */}
            {arbSupported && (
              <div className="flex gap-1 shrink-0">
                <button
                  onClick={() => { AudioManager.buttonClick(); handleSwitchChain('base'); }}
                  className={`flex items-center gap-1 px-3 py-0.5 font-bold text-[10px] uppercase tracking-wide border border-black/60 transition-all ${effectiveChain === 'base' ? 'ct-base-active' : 'ct-base-inactive opacity-50'}`}
                >
                  <svg width="10" height="10" viewBox="0 0 111 111" fill="none">
                    <circle cx="55.5" cy="55.5" r="55.5" fill={effectiveChain === 'base' ? 'white' : '#6b7280'}/>
                    <path d="M55.4999 11.5C31.0225 11.5 11 31.5225 11 55.9999C11 80.4773 31.0225 100.5 55.4999 100.5C79.9773 100.5 99.9998 80.4773 99.9998 55.9999C99.9998 31.5225 79.9773 11.5 55.4999 11.5Z" fill={effectiveChain === 'base' ? '#0052FF' : 'none'}/>
                  </svg>
                  BASE
                </button>
                <button
                  onClick={() => { AudioManager.buttonClick(); handleSwitchChain('arbitrum'); }}
                  className={`flex items-center gap-1 px-3 py-0.5 font-bold text-[10px] uppercase tracking-wide border border-black/60 transition-all ${effectiveChain === 'arbitrum' ? 'ct-arb-active' : 'ct-arb-inactive opacity-50'}`}
                >
                  <svg width="10" height="10" viewBox="0 0 50 50" fill="none">
                    <circle cx="25" cy="25" r="25" fill={effectiveChain === 'arbitrum' ? '#12AAFF' : '#6b7280'}/>
                    <path d="M25 8L11 17V33L25 42L39 33V17L25 8Z" fill="white" fillOpacity="0.2" stroke="white" strokeWidth="1.5"/>
                    <path d="M19 31L25 20L31 31" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M21.5 27H28.5" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  ARB
                </button>
              </div>
            )}
          </div>

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
                  {(() => {
                    const hasClaimable = missions.some(m => m.completed && !m.claimed);
                    return (
                      <button
                        onClick={async () => {
                          if (!address || !hasClaimable) return;
                          setIsClaimingAll(true);
                          try {
                            const chain = effectiveChain;
                            await claimAllMissions({ playerAddress: address.toLowerCase(), chain });
                            await refreshMissions();
                          } catch (e) {
                            console.error(e);
                          } finally {
                            setIsClaimingAll(false);
                          }
                        }}
                        disabled={isClaimingAll || !hasClaimable}
                        className="relative px-3 py-1 font-bold text-xs rounded border-2 border-black transition-all"
                        style={{
                          backgroundColor: hasClaimable ? '#FFD700' : '#333',
                          color: hasClaimable ? '#000' : '#666',
                          boxShadow: hasClaimable ? '2px 2px 0px #000' : 'none',
                          borderColor: hasClaimable ? '#000' : '#555',
                        }}
                      >
                        {hasClaimable && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />}
                        {isClaimingAll ? "..." : t('mission_claim_all')}
                      </button>
                    );
                  })()}
                </div>
                {isLoadingMissions ? (
                  <div className="flex items-center justify-center py-6">
                    <div className="animate-spin w-5 h-5 border-2 border-vintage-gold border-t-transparent rounded-full" />
                  </div>
                ) : (() => {
                  const missionList = missions
                    .filter((m: any) => !m.claimed)
                    .sort((a: any, b: any) => {
                      if (a.completed && !b.completed) return -1;
                      if (b.completed && !a.completed) return 1;
                      return 0;
                    });
                  if (missionList.length === 0) return <p className="text-vintage-ice/40 text-xs text-center py-4">{t('questsAllClaimed')}</p>;
                  const mIdx = Math.min(missionCarouselIdx, missionList.length - 1);
                  const mission = missionList[mIdx];
                  const isClaiming = claimingMission === mission._id;
                  const isPlaceholder = mission._id.startsWith('placeholder_');
                  const isVibeBadge = mission.missionType === 'claim_vibe_badge';
                  const mAura = 5 * (vibeBadgeEligibility?.hasVibeFIDCards || profileDashboard?.hasVibeBadge ? 2 : 1) * (effectiveChain === "arbitrum" ? 2 : 1);
                  return (
                    <div className="px-3 py-2">
                      {/* Compact carousel card */}
                      <div className={`flex items-center gap-3 p-2.5 border-2 transition-all ${mission.completed ? "border-yellow-400/30 bg-yellow-400/5" : "border-white/10 opacity-60"}`}>
                        <div className={`w-1 self-stretch flex-shrink-0 ${mission.completed ? "bg-yellow-400" : "bg-white/10"}`} />
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-bold truncate ${mission.completed ? "text-vintage-ice" : "text-vintage-ice/50"}`}>
                            {t(mission.titleKey)}
                          </p>
                          <p className="text-[10px] text-vintage-ice/40 truncate">{t(mission.descKey)}</p>
                          {mission.reward > 0 && (
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-vintage-gold font-bold text-[10px]">
                                +{effectiveChain === "arbitrum" ? mission.reward * 2 : mission.reward} VBMS
                                {effectiveChain === "arbitrum" && <span className="text-blue-400 text-[8px] ml-0.5">2x</span>}
                              </span>
                              <span className="text-purple-400 text-[9px] font-bold">
                                +{mAura} aura
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
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
                              className={`relative px-2 py-1 border-2 border-black font-bold text-xs ${isVibeBadge ? "bg-purple-500 text-white" : "bg-vintage-gold text-black"}`}
                              style={{ boxShadow: "2px 2px 0px #000" }}
                            >
                              <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                              {isClaiming ? "..." : t('mission_claim')}
                            </button>
                          ) : (
                            <span className="text-vintage-ice/20 text-[10px]">{t('mission_locked')}</span>
                          )}
                          <button onClick={() => setMissionCarouselIdx(i => Math.max(0, i - 1))} disabled={mIdx === 0}
                            className="w-6 h-6 bg-black border border-[#FFD700]/50 flex items-center justify-center disabled:opacity-20">
                            <span className="text-[#FFD700] font-black text-xs leading-none">‹</span>
                          </button>
                          <span className="text-white/30 text-[9px]">{mIdx + 1}/{missionList.length}</span>
                          <button onClick={() => setMissionCarouselIdx(i => Math.min(missionList.length - 1, i + 1))} disabled={mIdx >= missionList.length - 1}
                            className="w-6 h-6 bg-black border border-[#FFD700]/50 flex items-center justify-center disabled:opacity-20">
                            <span className="text-[#FFD700] font-black text-xs leading-none">›</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Keyframes for carousel slide animation */}
              <style>{`
                @keyframes carouselSlideRight {
                  from { transform: translateX(48px); opacity: 0; }
                  to   { transform: translateX(0);    opacity: 1; }
                }
                @keyframes carouselSlideLeft {
                  from { transform: translateX(-48px); opacity: 0; }
                  to   { transform: translateX(0);     opacity: 1; }
                }
              `}</style>

              {/* Social Quests - Carousel by group */}
              {(() => {
                const isAdmin = profileDashboard?.username?.toLowerCase() === 'jvhbo';
                const GROUPS = [
                  { id: 'vbms', label: t('questsVibeCreators') },
                  { id: 'arb_creators', label: t('questsArbCreators') },
                ];
                return (
                  <div className="space-y-3">
                    {GROUPS.map(({ id: groupId, label: groupLabel }) => {
                      const groupQuests = SOCIAL_QUESTS.filter(q =>
                        q.type !== 'notification' && q.type !== 'miniapp' &&
                        q.group === groupId &&
                        (isAdmin || getQuestStatus(q) !== 'claimed')
                      );
                      if (groupQuests.length === 0) return null;

                      // Update ref for auto-rotate
                      socialQuestCountsRef.current[groupId] = groupQuests.length;

                      const idx = socialCarouselIndices[groupId] ?? 0;
                      const quest = groupQuests[Math.min(idx, groupQuests.length - 1)];
                      const isFeatured = quest.featured === true;
                      const groupColor = isFeatured ? '#FFD700' : groupId === 'arb_creators' ? '#12AAFF' : '#FFD700';
                      const status = getQuestStatus(quest);
                      const isVerifying = verifying === quest.id;
                      const isClaimingSocial = claiming === quest.id;
                      const pfp = quest.pfpUrl;
                      const banner = quest.bannerUrl;
                      const displayReward = effectiveChain === "arbitrum" ? quest.reward * 2 : quest.reward;
                      const hasVibeFID2x = vibeBadgeEligibility?.hasVibeFIDCards || profileDashboard?.hasVibeBadge;
                      const auraReward = 5 * (hasVibeFID2x ? 2 : 1) * (effectiveChain === "arbitrum" ? 2 : 1);

                      const goToIdx = (newIdx: number) => {
                        const clamped = Math.max(0, Math.min(groupQuests.length - 1, newIdx));
                        setSocialSlideDir(prev => ({ ...prev, [groupId]: clamped > idx ? 'right' : 'left' }));
                        setSocialCarouselIndices(prev => ({ ...prev, [groupId]: clamped }));
                      };
                      const slideDir = socialSlideDir[groupId] ?? 'right';

                      return (
                        <div key={groupId} className="border-4 overflow-hidden" style={{ borderColor: groupColor, boxShadow: `3px 3px 0px ${groupColor}80` }}>
                          {/* Group header — fixed, never slides */}
                          <div className="px-3 py-1.5 bg-[#111] border-b-2 flex items-center justify-between" style={{ borderColor: groupColor }}>
                            <div className="flex items-center gap-1.5">
                              <p className="text-xs font-black uppercase tracking-widest" style={{ color: groupColor }}>{groupLabel}</p>
                              {isFeatured && (
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="#FFD700">
                                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                                </svg>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5">
                              {groupId === 'vbms' && effectiveChain === 'arbitrum' && (
                                <span className="px-1.5 py-0.5 bg-blue-900/60 border border-blue-500/60 text-[#12AAFF] font-black text-[9px] uppercase tracking-wider">ARB 2x</span>
                              )}
                              <p className="text-white/40 text-[10px]">{idx + 1}/{groupQuests.length}</p>
                            </div>
                          </div>

                          {/* Sliding content — key forces re-mount on quest change */}
                          <div key={quest.id} style={{
                            animation: `carouselSlide${slideDir === 'right' ? 'Right' : 'Left'} 0.32s ease-out`,
                          }}>

                          {/* Banner image area */}
                          <div className="relative h-28 bg-[#0a0a0a] flex items-center justify-center overflow-hidden">
                            {/* Background: banner fills entire area, pfp blurred fallback */}
                            {banner ? (
                              <div className="absolute inset-0 bg-cover bg-center"
                                style={{ backgroundImage: `url(${banner})` }} />
                            ) : pfp ? (
                              <div className="absolute inset-0 bg-cover bg-center blur-sm scale-110 opacity-30"
                                style={{ backgroundImage: `url(${pfp})` }} />
                            ) : null}
                            {/* Only darken when no banner */}
                            {!banner && <div className="absolute inset-0 bg-black/40" />}
                            {/* Gradient at bottom to make info readable */}
                            {banner && <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />}
                            {/* Group type badge */}
                            <span className={`absolute top-2 left-2 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider border ${
                              quest.type === 'channel'
                                ? 'bg-purple-900/80 text-purple-300 border-purple-500/60'
                                : groupId === 'arb_creators'
                                ? 'bg-blue-900/80 text-[#12AAFF] border-blue-500/60'
                                : 'bg-black/80 text-[#FFD700] border-[#FFD700]/40'
                            }`}>
                              {quest.type === 'channel' ? '#CHANNEL' : groupId === 'arb_creators' ? 'ARB' : '@FOLLOW'}
                            </span>
                            {/* Claimed overlay */}
                            {status === 'claimed' && (
                              <div className="absolute inset-0 bg-green-900/60 flex items-center justify-center z-10">
                                <span className="text-green-400 font-black text-lg">DONE</span>
                              </div>
                            )}
                            {/* pfp */}
                            {pfp ? (
                              <img src={pfp} alt={quest.displayName}
                                className="relative z-10 w-16 h-16 rounded-full object-cover border-4 shadow-lg"
                                style={{ borderColor: groupColor }} />
                            ) : (
                              <div className="relative z-10 w-16 h-16 rounded-full bg-[#222] border-4 flex items-center justify-center"
                                style={{ borderColor: `${groupColor}40` }}>
                                <span className="font-black text-xl" style={{ color: `${groupColor}99` }}>{quest.type === 'channel' ? '#' : '@'}</span>
                              </div>
                            )}
                          </div>

                          {/* Info row */}
                          <div className="px-3 pt-2 pb-1 bg-[#111]">
                            <p className="text-white font-black text-xs truncate">{quest.displayName}</p>
                            <p className="text-white/50 text-[10px] truncate">{quest.description}</p>
                          </div>

                          {/* Buttons row */}
                          <div className="px-3 pb-3 bg-[#111] flex items-center justify-between gap-2">
                            <div className="flex flex-col">
                              <span className="text-[#FFD700] font-bold text-xs">
                                +{displayReward} VBMS
                                {effectiveChain === "arbitrum" && <span className="text-blue-400 text-[8px] ml-0.5">2x</span>}
                              </span>
                              <span className="text-purple-400 text-[9px] font-bold">
                                +{auraReward} aura
                                {hasVibeFID2x && <span className="text-blue-400 text-[8px] ml-0.5">×2</span>}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              {/* Carousel nav */}
                              {groupQuests.length > 1 && (
                                <>
                                  <button onClick={() => goToIdx(idx - 1)} disabled={idx === 0}
                                    className="w-7 h-7 bg-black border-2 flex items-center justify-center disabled:opacity-30"
                                    style={{ borderColor: `${groupColor}80` }}>
                                    <span className="font-black text-sm leading-none" style={{ color: groupColor }}>‹</span>
                                  </button>
                                  <button onClick={() => goToIdx(idx + 1)} disabled={idx >= groupQuests.length - 1}
                                    className="w-7 h-7 bg-black border-2 flex items-center justify-center disabled:opacity-30"
                                    style={{ borderColor: `${groupColor}80` }}>
                                    <span className="font-black text-sm leading-none" style={{ color: groupColor }}>›</span>
                                  </button>
                                </>
                              )}
                              {/* Two-step: FOLLOW (always works) + VERIFY/DONE */}
                              <>
                                {/* Step 1: FOLLOW — always functional, even after claimed */}
                                <button
                                  onClick={() => { AudioManager.buttonClick(); handleFollowQuest(quest); }}
                                  onMouseEnter={() => AudioManager.buttonHover()}
                                  className="px-2 py-1.5 bg-[#111] border-2 font-black text-[10px] transition-all"
                                  style={{
                                    borderColor: (visitedQuests.has(quest.id) || status === 'claimed') ? `${groupColor}40` : groupColor,
                                    color: (visitedQuests.has(quest.id) || status === 'claimed') ? `${groupColor}60` : groupColor,
                                    boxShadow: (visitedQuests.has(quest.id) || status === 'claimed') ? 'none' : `2px 2px 0px #000`,
                                  }}>
                                  {t('questsFollow')}
                                </button>
                                {/* Step 2: VERIFY (unlocks after follow) or DONE (after claimed) */}
                                {status === 'claimed' ? (
                                  <button disabled
                                    className="px-2 py-1.5 font-black text-[10px] border-2 border-green-700/50 bg-green-900/30 text-green-400 opacity-70">
                                    {claimFeedback[quest.id] ? `+${claimFeedback[quest.id]} COINS` : t('questsDone')}
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => { AudioManager.buttonClick(); handleVerifyAndClaim(quest); }}
                                    onMouseEnter={() => AudioManager.buttonHover()}
                                    disabled={!visitedQuests.has(quest.id) || isVerifying || isClaimingSocial || !userFid}
                                    className="px-2 py-1.5 font-black text-[10px] border-2 border-black transition-all disabled:opacity-30"
                                    style={{
                                      backgroundColor: visitedQuests.has(quest.id) ? '#FFD700' : '#222',
                                      color: visitedQuests.has(quest.id) ? '#000' : '#666',
                                      boxShadow: visitedQuests.has(quest.id) ? '2px 2px 0px #000' : 'none',
                                    }}>
                                    {(isVerifying || isClaimingSocial) ? "..." : t('questsVerify')}
                                  </button>
                                )}
                              </>
                            </div>
                          </div>


                          </div>{/* end sliding content */}
                        </div>
                      );
                    })}

                    {!userFid && (
                      <p className="text-vintage-ice/50 text-[10px] text-center">{t('questsConnectFarcaster')}</p>
                    )}
                  </div>
                );
              })()}
            </div>

        </div>
        )} {/* end activeTab === 'missions' */}

        {activeTab === 'wanted' && (
          <WantedCastsTab
            myFid={userFid}
            myAddress={address}
            hasVibeBadge={profileDashboard?.hasVibeBadge || vibeBadgeEligibility?.hasVibeFIDCards || false}
            soundEnabled={true}
          />
        )}

        {/* Messages Tab - inline, no modal */}
        {activeTab === 'messages' && (
          <VibeFIDConvexProvider>
            <div className="flex-1 flex flex-col overflow-hidden">
            {userFid ? (
              <VibeMailInboxWithClaim
                cardFid={userFid}
                username={profileDashboard?.username}
                onClose={() => setActiveTab('missions')}
                pendingVbms={0}
                address={address}
                myFid={userFid}
                myAddress={address}
                isClaimingRewards={false}
                isClaimTxPending={false}
                onClaim={async () => {}}
                inline={true}
              />
            ) : (
              <div className="px-4 py-8 text-center">
                <p className="text-white/50 mb-4">Connect Farcaster to view messages</p>
                <button onClick={() => setActiveTab('missions')} className="text-white/50 text-sm">← Back</button>
              </div>
            )}
            </div>
          </VibeFIDConvexProvider>
        )}
      </div>
    </div>
  );
}
