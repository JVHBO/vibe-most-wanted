"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useAction, useConvex } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAccount } from "wagmi";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SOCIAL_QUESTS, type SocialQuest } from "@/lib/socialQuests";
import { AudioManager } from "@/lib/audio-manager";
import LoadingSpinner from "@/components/LoadingSpinner";
import { WalletGateScreen } from "@/components/WalletGateScreen";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePrimaryAddress } from "@/lib/hooks/usePrimaryAddress";
import { useProfile } from "@/contexts/ProfileContext";
import { useArbValidator, ARB_CLAIM_TYPE } from "@/lib/hooks/useArbValidator";
import { isMiniappMode, isWarpcastClient } from "@/lib/utils/miniapp";
import { CONTRACTS, ERC20_ABI } from "@/lib/contracts";
import { encodeFunctionData, parseEther } from "viem";
import { dataSuffix as ATTRIBUTION_SUFFIX } from "@/lib/hooks/useWriteContractWithAttribution";
import { VibeMailInboxWithClaim } from "@/components/fid/VibeMail";
import { VibeFIDConvexProvider, vibefidConvex } from "@/contexts/VibeFIDConvexProvider";
import { api as fidApi } from "@/lib/fid/convex-generated/api";


export default function QuestsPage() {
  const router = useRouter();
  const { isConnecting } = useAccount();
  const { primaryAddress: address } = usePrimaryAddress(); // 🔗 MULTI-WALLET: Use primary address
  const { t } = useLanguage();
  const { refreshProfile } = useProfile();
  const { validateOnArb } = useArbValidator();
  const [activeTab, setActiveTab] = useState<'missions' | 'messages'>('missions');

  // Social Quests
  const socialQuestProgress = useQuery(
    api.socialQuests.getSocialQuestProgress,
    address ? { address: address.toLowerCase() } : "skip"
  );
  const markCompleted = useMutation(api.socialQuests.markQuestCompleted);
  const verifyAndCompleteQuest = useAction(api.socialQuests.verifyAndCompleteQuest);
  const claimSocialReward = useMutation(api.socialQuests.claimSocialQuestReward);
  const customFollowQuests = useQuery(api.socialQuests.getCustomFollowQuests);
  const addCustomFollowQuest = useMutation(api.socialQuests.addCustomFollowQuest);
  const claimCustomFollowReward = useMutation(api.socialQuests.claimCustomFollowReward);
  const claimedCustomQuestIds = useQuery(
    api.socialQuests.getClaimedCustomQuestIds,
    address ? { address: address.toLowerCase() } : "skip"
  );


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

  // VibeMail unread count for red dot on tab
  const [vibeMailUnread, setVibeMailUnread] = useState(0);
  useEffect(() => {
    if (!userFid) return;
    vibefidConvex.query(fidApi.cardVotes.getUnreadMessageCount, { cardFid: userFid })
      .then(setVibeMailUnread).catch(() => {});
  }, [userFid]);

  // State
  const [verifying, setVerifying] = useState<string | null>(null);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [localCompleted, setLocalCompleted] = useState<Set<string>>(new Set());
  const [localClaimed, setLocalClaimed] = useState<Set<string>>(new Set());
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
  const markAndClaimNeynarScoreCast = useMutation(api.missions.markAndClaimNeynarScoreCast);
  const markAndClaimDailyShare = useMutation(api.missions.markAndClaimDailyShare);
  const [castingNeynarScore, setCastingNeynarScore] = useState(false);
  const [sharingDaily, setSharingDaily] = useState(false);
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
  const [showAllQuestsModal, setShowAllQuestsModal] = useState(false);
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

  // Open URL using Farcaster SDK when inside miniapp, otherwise window.open
  const openExternalUrl = async (url: string) => {
    if (isMiniappMode()) {
      try {
        const { sdk } = await import('@farcaster/miniapp-sdk');
        await sdk.actions.openUrl(url);
        return;
      } catch (e) {
        console.error('[openExternalUrl] SDK failed, falling back:', e);
      }
    }
    window.open(url, '_blank');
  };

  // Dynamic banner cache for quests that don't have hardcoded bannerUrl
  const [dynamicBanners, setDynamicBanners] = useState<Record<number, string>>({});

  // Custom follow quest UI state
  const [customQuestUsername, setCustomQuestUsername] = useState('');
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [customQuestError, setCustomQuestError] = useState('');
  const [customCarouselIdx, setCustomCarouselIdx] = useState(0);
  const [claimingCustom, setClaimingCustom] = useState<string | null>(null);
  const [claimedCustom, setClaimedCustom] = useState<Set<string>>(new Set());

  // Sync claimed custom quests from backend on load
  useEffect(() => {
    if (claimedCustomQuestIds && claimedCustomQuestIds.length > 0) {
      setClaimedCustom(new Set(claimedCustomQuestIds));
    }
  }, [claimedCustomQuestIds]);
  const [customQuestPreview, setCustomQuestPreview] = useState<{ fid: number; username: string; display_name: string; pfp_url?: string; banner_url?: string } | null>(null);
  const [customSearchResults, setCustomSearchResults] = useState<{ fid: number; username: string; display_name: string; pfp_url?: string }[]>([]);
  const [customSearchOpen, setCustomSearchOpen] = useState(false);
  const [customModalOpen, setCustomModalOpen] = useState(false);
  const customSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // All mission types (matching backend) - using translation keys
  const ALL_MISSION_TYPES = [
    { type: 'neynar_score_cast', reward: 200, date: 'weekly', titleKey: 'mission_neynar_score_cast', descKey: 'mission_neynar_score_cast_desc' },
    { type: 'daily_share', reward: 100, date: 'today', titleKey: 'mission_daily_share', descKey: 'mission_daily_share_desc' },
    { type: 'daily_login', reward: 50, date: 'today', titleKey: 'mission_daily_login', descKey: 'mission_daily_login_desc' },
    { type: 'first_baccarat_win', reward: 100, date: 'today', titleKey: 'mission_first_baccarat_win', descKey: 'mission_first_baccarat_win_desc' },
    { type: 'first_pve_win', reward: 25, date: 'today', titleKey: 'mission_first_pve_win', descKey: 'mission_first_pve_win_desc' },
    { type: 'first_pvp_match', reward: 50, date: 'today', titleKey: 'mission_first_pvp_match', descKey: 'mission_first_pvp_match_desc' },
    { type: 'streak_3', reward: 75, date: 'today', titleKey: 'mission_streak_3', descKey: 'mission_streak_3_desc' },
    { type: 'streak_5', reward: 150, date: 'today', titleKey: 'mission_streak_5', descKey: 'mission_streak_5_desc' },
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

  // Fetch Farcaster banners for ALL follow quests (overrides hardcoded stale URLs)
  useEffect(() => {
    const fidsToFetch = SOCIAL_QUESTS
      .filter(q => q.type === 'follow' && q.targetFid)
      .map(q => q.targetFid!);
    for (const fid of fidsToFetch) {
      fetch(`/api/fid/user-profile?fid=${fid}`)
        .then(r => r.json())
        .then(d => {
          // banner_url takes priority; fall back to pfp_url for zoom effect
          setDynamicBanners(prev => ({ ...prev, [fid]: d.banner_url || d.pfp_url || '' }));
        })
        .catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      // Special handling for VibeFID minted — Base OR ARB counts
      if (def.type === 'vibefid_minted') {
        const hasVibeFID = vibeBadgeEligibility?.hasVibeFIDCards || false;
        return {
          _id: existing?._id || 'placeholder_vibefid_minted',
          missionType: def.type,
          completed: hasVibeFID,
          claimed: existing?.claimed || false,
          reward: def.reward,
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
      openExternalUrl(quest.url);
      setVisitedQuests((prev) => new Set([...prev, quest.id]));
      AudioManager.buttonClick();
      return;
    }

    if (!userFid || !address) {
      openExternalUrl(quest.url);
      return;
    }

    setVerifying(quest.id);
    try {
      // Use Convex action to verify and mark complete in one call
      const result = await verifyAndCompleteQuest({
        address: address.toLowerCase(),
        questId: quest.id,
        userFid: userFid ?? 0,
      });
      if (result.completed) {
        setLocalCompleted((prev) => new Set([...prev, quest.id]));
        AudioManager.buttonSuccess();
      } else {
        openExternalUrl(quest.url);
      }
    } catch (error) {
      console.error("Error verifying quest:", error);
      openExternalUrl(quest.url);
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
    openExternalUrl(quest.url);
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
        userFid: userFid ?? 0,
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
      setLocalClaimed(prev => new Set([...prev, quest.id]));
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
    if (progress?.claimed || localClaimed.has(quest.id)) return "claimed";
    if (progress?.completed || localCompleted.has(quest.id)) return "completed";
    return "pending";
  };

  if (!address) {
    return <WalletGateScreen />;
  }

  if (isConnecting && address) {
    return (
      <div className="fixed inset-0 bg-vintage-deep-black flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-[#1a1a1a] overflow-hidden">

      {/* Header */}
      <div className={`absolute top-0 left-0 right-0 z-20 bg-[#1a1a1a] border-b-4 border-black`}>
        <div className="relative flex items-center justify-between px-3 py-1.5">
          <Link
            href="/"
            onClick={() => AudioManager.buttonClick()}
            className="px-2 py-1 bg-[#CC2222] hover:bg-[#AA1111] text-white border-4 border-black text-[11px] font-black uppercase tracking-widest active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all"
            style={{ boxShadow: '4px 4px 0px #000' }}
          >
            ← BACK
          </Link>
          <h1 className="absolute left-1/2 -translate-x-1/2 text-2xl font-display font-bold text-vintage-gold tracking-wider max-w-[55%] truncate">QUESTS</h1>
          <div className="w-20" />
        </div>

        {/* Tabs - simplified */}
        <div className="flex px-2 pb-1.5 pt-1 gap-1">
          {[
            { key: 'missions' as const, label: t('questsMissions') },
            { key: 'messages' as const, label: 'VibeMail' },
          ].map(({ key, label }) => {
            const u = profileDashboard?.username?.toLowerCase();
            const locked = key === 'messages' && u !== 'jvhbo' && u !== 'vibefid';
            return (
              <button
                key={key}
                onClick={() => { if (locked) return; AudioManager.buttonClick(); setActiveTab(key); }}
                disabled={locked}
                className={`relative flex-1 py-2 text-xs font-bold uppercase transition-all border ${
                  activeTab === key
                    ? 'bg-vintage-gold text-black border-black'
                    : 'bg-[#1a1a1a] text-white/60 border-white/20'
                }`}
              >
                {label}
                {key === 'messages' && vibeMailUnread > 0 && activeTab !== 'messages' && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-black" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <div className={`absolute inset-0 pt-[90px] ${activeTab === 'messages' ? 'flex flex-col overflow-hidden' : 'pb-4 overflow-y-auto'}`}>
        {activeTab === 'missions' && (
        <div className="relative z-10 px-3 py-2 max-w-md mx-auto space-y-3 overflow-x-hidden">

          {/* Chain toggle - subtle */}

          {/* Missions */}
          <div className="space-y-3">
              {/* Simple Bonus Quests */}
              {SOCIAL_QUESTS.filter(q => (q.type === 'notification' || q.type === 'miniapp') && getQuestStatus(q) !== 'claimed').length > 0 && (
                <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                  <p className="text-white/60 text-xs font-bold mb-2 uppercase tracking-wider">Bonus Quests</p>
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
                          <div key={quest.id} className="flex items-center justify-between gap-2 p-2 bg-white/5 rounded border border-white/10">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <span className="text-sm">{quest.type === 'notification' ? '🔔' : '⭐'}</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-white text-xs font-bold truncate">{quest.displayName}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-vintage-gold text-xs font-bold">
                                +{effectiveChain === "arbitrum" ? quest.reward * 2 : quest.reward}
                              </span>
                              {status === "claimed" ? (
                                <span className="text-green-400 text-xs">Done</span>
                              ) : status === "completed" ? (
                                <button
                                  onClick={() => { AudioManager.buttonClick(); handleClaimSocial(quest); }}
                                  disabled={isClaimingSocial}
                                  className="px-2 py-1 bg-vintage-gold text-black text-xs font-bold border-2 border-black"
                                  style={{ boxShadow: '2px 2px 0px #000' }}
                                >
                                  {isClaimingSocial ? "..." : 'CLAIM'}
                                </button>
                              ) : (
                                <button
                                  onClick={() => { AudioManager.buttonClick(); verifyQuest(quest); }}
                                  disabled={isVerifying}
                                  className="px-2 py-1 bg-white/10 text-white text-xs font-bold border border-white/20 hover:bg-white/20"
                                >
                                  {isVerifying ? "..." : quest.type === 'notification' ? 'Activate' : 'Add'}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Personal Missions - compact carousel */}
              <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
                {isLoadingMissions ? (
                  <div className="flex items-center justify-center py-3">
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  </div>
                ) : (() => {
                  const missionList = missions
                    .filter((m: any) => !m.claimed)
                    .sort((a: any, b: any) => {
                      if (a.missionType === 'neynar_score_cast') return -1;
                      if (b.missionType === 'neynar_score_cast') return 1;
                      if (a.completed && !b.completed) return -1;
                      if (b.completed && !a.completed) return 1;
                      return 0;
                    });
                  if (missionList.length === 0) return <p className="text-white/40 text-sm text-center py-3">All claims completed</p>;
                  const mIdx = Math.min(missionCarouselIdx, missionList.length - 1);
                  const mission = missionList[mIdx];
                  const isClaiming = claimingMission === mission._id;
                  const isPlaceholder = mission._id.startsWith('placeholder_');
                  const isVibeBadge = mission.missionType === 'claim_vibe_badge';
                  const mAura = 5 * (vibeBadgeEligibility?.hasVibeFIDCards || profileDashboard?.hasVibeBadge ? 2 : 1) * (effectiveChain === "arbitrum" ? 2 : 1);
                  const isNeymarQuest = mission.missionType === 'neynar_score_cast';
                  const isShareQuest = mission.missionType === 'daily_share';

                  return (
                    <div className="p-2">
                      <div className="flex items-center gap-2 mb-2">
                        <button
                          onClick={() => setMissionCarouselIdx(i => Math.max(0, i - 1))}
                          disabled={mIdx === 0}
                          className="w-5 h-5 bg-black/40 border border-white/20 flex items-center justify-center disabled:opacity-30"
                        >
                          <span className="text-white/60 text-[10px]">‹</span>
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-xs font-bold truncate">{t(mission.titleKey)}</p>
                          <p className="text-white/30 text-[10px] truncate">{t(mission.descKey)}</p>
                          {mission.reward > 0 && (
                            <div className="flex items-center gap-2 mt-1 text-[10px]">
                              <span className="text-vintage-gold font-bold">+{effectiveChain === "arbitrum" ? mission.reward * 2 : mission.reward} VBMS</span>
                              <span className="text-purple-400">+{mAura} aura</span>
                            </div>
                          )}
                        </div>
                        <span className="text-white/30 text-[10px]">{mIdx + 1}/{missionList.length}</span>
                        <button
                          onClick={() => setMissionCarouselIdx(i => Math.min(missionList.length - 1, i + 1))}
                          disabled={mIdx >= missionList.length - 1}
                          className="w-5 h-5 bg-black/40 border border-white/20 flex items-center justify-center disabled:opacity-30"
                        >
                          <span className="text-white/60 text-[10px]">›</span>
                        </button>
                      </div>
                      <div className="flex items-center justify-end gap-2 mt-1">
                        {mission.completed && !isPlaceholder && (
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
                            className="px-3 py-1 bg-vintage-gold text-black text-[10px] font-bold border-2 border-black"
                            style={{ boxShadow: '2px 2px 0px #000' }}
                          >
                            {isClaiming ? "..." : 'CLAIM'}
                          </button>
                        )}
                        {isNeymarQuest && !mission.completed && (
                          <button
                            onClick={async () => {
                              if (!address || castingNeynarScore) return;
                              AudioManager.buttonClick();
                              setCastingNeynarScore(true);
                              try {
                                const { sdk } = await import('@farcaster/miniapp-sdk');
                                await sdk.actions.composeCast({ text: "@vibefid what's my neymar score" });
                                await markAndClaimNeynarScoreCast({ playerAddress: address.toLowerCase(), chain: effectiveChain });
                                AudioManager.buttonSuccess();
                                await refreshMissions();
                              } catch (e: any) {
                                if (!e?.message?.includes('Already claimed')) console.error(e);
                              } finally { setCastingNeynarScore(false); }
                            }}
                            disabled={castingNeynarScore}
                            className="px-3 py-1 bg-cyan-500 text-black text-[10px] font-bold border-2 border-black"
                            style={{ boxShadow: '2px 2px 0px #000' }}
                          >
                            {castingNeynarScore ? '...' : '🎙️ CAST'}
                          </button>
                        )}
                        {isShareQuest && !mission.completed && (
                          <button
                            onClick={async () => {
                              if (!address || sharingDaily) return;
                              AudioManager.buttonClick();
                              setSharingDaily(true);
                              try {
                                const { sdk } = await import('@farcaster/miniapp-sdk');
                                const shareUrl = `https://vibemostwanted.xyz/share/vibe/${address}`;
                                const power = profileDashboard?.stats?.totalPower || 0;
                                const aura = profileDashboard?.stats?.aura || 0;
                                await sdk.actions.composeCast({
                                  text: `⚔️ Playing Vibe Most Wanted!\n\nPower: ${power} | Aura: ${aura}\nCollect cards, earn $VBMS, battle for glory!`,
                                  embeds: [shareUrl],
                                });
                                await markAndClaimDailyShare({ playerAddress: address.toLowerCase(), chain: effectiveChain });
                                AudioManager.buttonSuccess();
                                await refreshMissions();
                              } catch (e: any) {
                                if (!e?.message?.includes('Already claimed')) console.error(e);
                              } finally { setSharingDaily(false); }
                            }}
                            disabled={sharingDaily}
                            className="px-3 py-1 bg-cyan-500 text-black text-[10px] font-bold border-2 border-black"
                            style={{ boxShadow: '2px 2px 0px #000' }}
                          >
                            {sharingDaily ? '...' : '📤 SHARE'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* All Quests Modal */}
              {showAllQuestsModal && (
                <div className="fixed inset-0 z-[300] flex items-end justify-center bg-black/70" onClick={() => setShowAllQuestsModal(false)}>
                  <div
                    className="w-full max-w-md bg-vintage-charcoal border-t-2 border-x-2 border-vintage-gold/40 rounded-t-2xl"
                    style={{ maxHeight: 'calc(100% - 64px)', display: 'flex', flexDirection: 'column' }}
                    onClick={e => e.stopPropagation()}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-vintage-gold/20 flex-shrink-0">
                      <span className="font-display font-bold text-vintage-gold text-sm">📋 All Missions</span>
                      <button onClick={() => setShowAllQuestsModal(false)} className="text-vintage-gold/60 hover:text-vintage-gold text-lg leading-none">✕</button>
                    </div>
                    {/* List */}
                    <div className="overflow-y-auto flex-1 px-3 py-2 space-y-1.5">
                      {missions.map((m: any) => {
                        const isNeymar = m.missionType === 'neynar_score_cast';
                        const isShare = m.missionType === 'daily_share';
                        const isActionQuest = (isNeymar || isShare) && !m.claimed;
                        const isActive = m.completed || isNeymar || isShare;
                        const statusLabel = m.claimed ? '✅' : isNeymar ? '🎙️' : isShare ? '📤' : m.completed ? '🔓' : '🔒';
                        return (
                          <div key={m._id} className={`flex items-center gap-2 p-2 rounded-lg border ${m.claimed ? 'border-green-500/20 bg-green-900/10' : isActive ? 'border-vintage-gold/40 bg-vintage-gold/5' : 'border-white/5'}`}>
                            <span className="text-base shrink-0">{statusLabel}</span>
                            <div className="flex-1 min-w-0">
                              <p className={`text-xs font-bold truncate ${m.claimed ? 'text-vintage-ice/40 line-through' : isActive ? 'text-vintage-ice' : 'text-vintage-ice/40'}`}>
                                {t(m.titleKey)}
                              </p>
                              {m.reward > 0 && (
                                <span className="text-[9px] text-vintage-gold/60">+{m.reward} VBMS</span>
                              )}
                            </div>
                            {isActionQuest ? (
                              <button
                                onClick={async () => {
                                  if (!address) return;
                                  AudioManager.buttonClick();
                                  setShowAllQuestsModal(false);
                                  if (isNeymar) {
                                    setCastingNeynarScore(true);
                                    try {
                                      const { sdk } = await import('@farcaster/miniapp-sdk');
                                      await sdk.actions.composeCast({ text: "@vibefid what's my neymar score" });
                                      await markAndClaimNeynarScoreCast({ playerAddress: address.toLowerCase(), chain: effectiveChain });
                                      AudioManager.buttonSuccess();
                                      await refreshMissions();
                                    } catch (e: any) {
                                      if (!e?.message?.includes('Already claimed')) console.error(e);
                                    } finally { setCastingNeynarScore(false); }
                                  } else if (isShare) {
                                    setSharingDaily(true);
                                    try {
                                      const { sdk } = await import('@farcaster/miniapp-sdk');
                                      const shareUrl = `https://vibemostwanted.xyz/share/vibe/${address}`;
                                      const power = profileDashboard?.stats?.totalPower || 0;
                                      const aura = profileDashboard?.stats?.aura || 0;
                                      await sdk.actions.composeCast({
                                        text: `⚔️ Playing Vibe Most Wanted!\n\nPower: ${power} | Aura: ${aura}\nCollect cards, earn $VBMS, battle for glory!`,
                                        embeds: [shareUrl],
                                      });
                                      await markAndClaimDailyShare({ playerAddress: address.toLowerCase(), chain: effectiveChain });
                                      AudioManager.buttonSuccess();
                                      await refreshMissions();
                                    } catch (e: any) {
                                      if (!e?.message?.includes('Already claimed')) console.error(e);
                                    } finally { setSharingDaily(false); }
                                  }
                                }}
                                className="px-2 py-1 border-2 border-black bg-cyan-500 text-black font-bold text-[10px] shrink-0"
                                style={{ boxShadow: "2px 2px 0px #000" }}
                              >
                                {isNeymar ? '🎙️ Cast' : '📤 Share'}
                              </button>
                            ) : (
                              <span className={`text-[10px] font-bold shrink-0 ${m.claimed ? 'text-green-400' : m.completed ? 'text-yellow-400' : 'text-vintage-ice/30'}`}>
                                {m.claimed ? 'Done' : m.completed ? 'Claim' : 'Locked'}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

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


            {/* Custom Follow Quests - same style as Vibe Creators */}
            {(customFollowQuests?.length ?? 0) > 0 && (
              <div className="border-4 overflow-hidden" style={{ borderColor: '#A855F7', boxShadow: '3px 3px 0px #A855F780' }}>
                {/* Header */}
                <div className="px-3 py-1.5 bg-[#111] border-b-2 flex items-center justify-between" style={{ borderColor: '#A855F7' }}>
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-black uppercase tracking-widest" style={{ color: '#A855F7' }}>Follow Community</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {(customFollowQuests?.length ?? 0) > 1 && (
                      <>
                        <button onClick={() => setCustomCarouselIdx(i => Math.max(0, i - 1))} disabled={customCarouselIdx === 0}
                          className="w-7 h-7 bg-black flex items-center justify-center disabled:opacity-30" style={{ borderColor: '#A855F780', borderWidth: '2px', borderStyle: 'solid' }}>
                          <span className="font-black text-sm leading-none" style={{ color: '#A855F7' }}>‹</span>
                        </button>
                        <span className="text-white/40 text-[10px]">{Math.min(customCarouselIdx, (customFollowQuests?.length ?? 1) - 1) + 1}/{customFollowQuests?.length}</span>
                        <button onClick={() => setCustomCarouselIdx(i => Math.min((customFollowQuests?.length ?? 0) - 1, i + 1))} disabled={customCarouselIdx >= (customFollowQuests?.length ?? 0) - 1}
                          className="w-7 h-7 bg-black flex items-center justify-center disabled:opacity-30" style={{ borderColor: '#A855F780', borderWidth: '2px', borderStyle: 'solid' }}>
                          <span className="font-black text-sm leading-none" style={{ color: '#A855F7' }}>›</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Carousel content */}
                {(() => {
                  if (!customFollowQuests || customFollowQuests.length === 0) return null;
                  const q = customFollowQuests[customCarouselIdx];
                  const questId = q._id;
                  const isClaimed = claimedCustom.has(questId);
                  const isClaiming = claimingCustom === questId;
                  const pfp = q.pfpUrl;
                  const banner = q.bannerUrl || pfp;
                  const displayName = (q as any).displayName || q.targetUsername;
                  const profileUrl = `https://warpcast.com/${q.targetUsername}`;

                  return (
                    <div key={questId}>
                      {/* Banner image area */}
                      <div className="relative h-28 bg-[#111] flex items-center justify-center overflow-hidden">
                        {banner && (
                          <img src={banner} className="absolute inset-0 w-full h-full object-cover" style={{ opacity: 0.8, filter: 'none' }} alt="" />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/10" />
                        <span className="absolute top-2 left-2 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider border bg-[#A855F7]/80 text-white border-[#A855F7]/60">
                          COMMUNITY
                        </span>
                        {isClaimed && (
                          <div className="absolute inset-0 bg-green-900/60 flex items-center justify-center z-10">
                            <span className="text-green-400 font-black text-lg">DONE</span>
                          </div>
                        )}
                        {pfp ? (
                          <img src={pfp} alt={displayName} className="relative z-10 w-16 h-16 rounded-full object-cover border-4 shadow-lg" style={{ borderColor: '#A855F7' }} />
                        ) : (
                          <div className="relative z-10 w-16 h-16 rounded-full bg-[#222] border-4 flex items-center justify-center" style={{ borderColor: '#A855F740' }}>
                            <span className="font-black text-xl" style={{ color: '#A855F799' }}>@</span>
                          </div>
                        )}
                      </div>

                      {/* Info row */}
                      <div className="px-3 pt-2 pb-1 bg-[#111]">
                        <p className="text-white font-black text-xs truncate">{displayName}</p>
                      </div>

                      {/* Buttons row */}
                      <div className="px-3 pb-3 bg-[#111] flex items-center justify-between gap-2">
                        <div className="flex flex-col">
                          <span className="text-[#FFD700] font-bold text-xs">+{q.reward} VBMS</span>
                          <span className="text-purple-400 text-[9px] font-bold">+50 aura</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => { AudioManager.buttonClick(); openExternalUrl(profileUrl); }}
                            className="px-2 py-1.5 bg-[#111] border-2 font-black text-[10px] transition-all"
                            style={{ borderColor: '#A855F7', color: '#A855F7', boxShadow: '2px 2px 0px #000' }}>
                            {t('questsFollow')}
                          </button>
                          <button
                            onClick={async () => {
                              if (!address || isClaimed || isClaiming) return;
                              setClaimingCustom(questId);
                              try {
                                await claimCustomFollowReward({ address: address.toLowerCase(), questId });
                                setClaimedCustom(prev => new Set([...prev, questId]));
                              } catch (e: any) {
                                const msg = e.data || e.message || 'Error';
                                if (msg === 'Already claimed') {
                                  setClaimedCustom(prev => new Set([...prev, questId]));
                                } else {
                                  setCustomQuestError(msg);
                                }
                              }
                              finally { setClaimingCustom(null); }
                            }}
                            disabled={isClaimed || isClaiming || !address}
                            className="px-2 py-1.5 font-black text-[10px] border-2 border-black transition-all disabled:opacity-60"
                            style={{
                              backgroundColor: isClaimed ? '#1a2a1a' : '#FFD700',
                              color: isClaimed ? '#22C55E' : '#000',
                              boxShadow: isClaimed ? 'none' : '2px 2px 0px #000',
                            }}>
                            {isClaimed ? (t('questsDone') || 'Done') : isClaiming ? '...' : (t('questsVerify') || 'Verify')}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Add custom quest button */}
            {address && (
              <button
                onClick={() => setCustomModalOpen(true)}
                className="w-full py-2 bg-[#A855F7]/20 border border-[#A855F7]/50 text-[#A855F7] text-xs font-bold uppercase rounded hover:bg-[#A855F7]/30 transition-all"
              >
                + Add to Follow Community (100k VBMS)
              </button>
            )}

            {/* Custom Modal */}
            {customModalOpen && (
              <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70" onClick={() => { setCustomModalOpen(false); setCustomQuestUsername(''); setCustomQuestPreview(null); setCustomSearchResults([]); setCustomQuestError(''); }}>
                <div className="w-72 max-w-[90%] bg-[#0d0d0d] border-4 border-[#A855F7] rounded-xl overflow-hidden" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-between px-3 py-2 border-b border-[#A855F7]/30">
                    <span className="font-black text-xs uppercase" style={{ color: '#A855F7' }}>Add to Follow Community</span>
                    <button onClick={() => { setCustomModalOpen(false); setCustomQuestUsername(''); setCustomQuestPreview(null); setCustomSearchResults([]); setCustomQuestError(''); }} className="text-white/40 hover:text-white text-sm">✕</button>
                  </div>
                  <div className="p-3 space-y-3">
                    {customQuestPreview && customQuestPreview.pfp_url && (
                      <div className="flex items-center gap-2">
                        <img src={customQuestPreview.pfp_url} className="w-10 h-10 rounded-full border-2 border-[#A855F7]" alt="" />
                        <div>
                          <p className="text-white text-sm font-bold">{customQuestPreview.display_name}</p>
                          <p className="text-[#A855F7] text-xs">@{customQuestPreview.username}</p>
                        </div>
                      </div>
                    )}
                    <input
                      autoFocus
                      value={customQuestUsername}
                      onChange={e => {
                        const val = e.target.value.replace(/^@/, '');
                        setCustomQuestUsername(val);
                        setCustomQuestError('');
                        setCustomQuestPreview(null);
                        if (customSearchTimer.current) clearTimeout(customSearchTimer.current);
                        if (val.length < 2) { setCustomSearchResults([]); return; }
                        customSearchTimer.current = setTimeout(async () => {
                          const r = await fetch(`/api/fid/neynar-user-search?q=${encodeURIComponent(val)}`);
                          const d = await r.json();
                          setCustomSearchResults(d.users || []);
                        }, 300);
                      }}
                      placeholder="Search @username or FID..."
                      className="w-full bg-[#111] border border-white/20 text-white text-xs px-2 py-2 rounded focus:outline-none focus:border-[#A855F7]"
                    />
                    {customSearchResults.length > 0 && !customQuestPreview && (
                      <div className="border border-white/20 bg-[#0a0a0a] max-h-32 overflow-y-auto rounded">
                        {customSearchResults.map(u => (
                          <button
                            key={u.fid}
                            onClick={() => {
                              setCustomQuestUsername(u.username);
                              setCustomQuestPreview({ fid: u.fid, username: u.username, display_name: u.display_name, pfp_url: u.pfp_url });
                              setCustomSearchResults([]);
                            }}
                            className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-white/10 text-left border-b border-white/5 last:border-0"
                          >
                            {u.pfp_url && <img src={u.pfp_url} className="w-6 h-6 rounded-full shrink-0" alt="" />}
                            <div className="min-w-0 flex-1">
                              <p className="text-white text-xs font-bold truncate">{u.display_name}</p>
                              <p className="text-[#A855F7] text-[10px] truncate">@{u.username} · {u.fid}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    {customQuestError && <p className="text-red-400 text-xs">{customQuestError}</p>}
                    <button
                      disabled={isAddingCustom || !customQuestUsername.trim() || !!(customQuestPreview && customFollowQuests?.some((q: any) => q.targetFid === customQuestPreview.fid))}
                      onClick={async () => {
                        if (!address || !customQuestUsername.trim()) return;
                        if (customQuestPreview && customFollowQuests?.some((q: any) => q.targetFid === customQuestPreview.fid)) {
                          setCustomQuestError('This user is already in Follow Community');
                          return;
                        }
                        setIsAddingCustom(true);
                        setCustomQuestError('');
                        try {
                          let data = customQuestPreview as any;
                          if (!data?.fid) throw new Error('Select a user first');
                          const { sdk } = await import('@farcaster/miniapp-sdk');
                          const provider = await sdk.wallet.getEthereumProvider();
                          if (!provider) throw new Error('Wallet not available');
                          try {
                            await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0x2105' }] });
                          } catch {}
                          const txCallData = encodeFunctionData({
                            abi: ERC20_ABI,
                            functionName: 'transfer',
                            args: [CONTRACTS.VBMSPoolTroll as `0x${string}`, parseEther('100000')],
                          });
                          const txData = (txCallData + ATTRIBUTION_SUFFIX.slice(2)) as `0x${string}`;
                          const txHash = await provider!.request({
                            method: 'eth_sendTransaction',
                            params: [{ from: address as `0x${string}`, to: CONTRACTS.VBMSToken, data: txData }],
                          }) as string;
                          if (!txHash) throw new Error('TX failed');
                          await addCustomFollowQuest({
                            address: address.toLowerCase(),
                            targetUsername: data.username || customQuestUsername.trim(),
                            displayName: data.display_name || undefined,
                            targetFid: data.fid,
                            pfpUrl: data.pfp_url || undefined,
                            bannerUrl: data.banner_url || undefined,
                            txHash,
                          });
                          setCustomQuestUsername('');
                          setCustomQuestPreview(null);
                          setCustomModalOpen(false);
                        } catch (e: any) {
                          setCustomQuestError(e.data || e.shortMessage || e.message || 'Error');
                        } finally {
                          setIsAddingCustom(false);
                        }
                      }}
                      className="w-full py-2 bg-[#A855F7] text-white text-xs font-bold border-2 border-black rounded disabled:opacity-40"
                      style={{ boxShadow: '2px 2px 0px #000' }}
                    >
                      {isAddingCustom ? 'CONFIRM IN WALLET...' : 'Pay 100k VBMS & Add'}
                    </button>
                  </div>
                </div>
              </div>
            )}

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
                      const dynData = quest.targetFid ? dynamicBanners[quest.targetFid] : undefined;
                      // Hardcoded bannerUrl always wins; only use Neynar data if no hardcoded banner
                      const banner = quest.bannerUrl || (dynData && dynData !== pfp ? dynData : null);
                      const bgSrc = banner || pfp;
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
                              <p className="text-white/40 text-[10px]">{idx + 1}/{groupQuests.length}</p>
                            </div>
                          </div>

                          {/* Sliding content — key forces re-mount on quest change */}
                          <div key={quest.id} style={{
                            animation: `carouselSlide${slideDir === 'right' ? 'Right' : 'Left'} 0.32s ease-out`,
                          }}>

                          {/* Banner image area */}
                          <div className="relative h-28 bg-[#111] flex items-center justify-center overflow-hidden">
                            {bgSrc && (
                              <img
                                src={bgSrc}
                                className="absolute inset-0 w-full h-full object-cover"
                                style={{
                                  opacity: 0.8,
                                  filter: 'none',
                                }}
                                alt=""
                              />
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/10" />
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
                          </div>

                          {/* Buttons row */}
                          <div className="px-3 pb-3 bg-[#111] flex items-center justify-between gap-2">
                            <div className="flex flex-col">
                              <span className="text-[#FFD700] font-bold text-xs">
                                +{displayReward} VBMS
                              </span>
                              <span className="text-purple-400 text-[9px] font-bold">
                                +{auraReward} aura
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
                                    borderColor: groupColor,
                                    color: groupColor,
                                    boxShadow: `2px 2px 0px #000`,
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

        {/* Messages Tab - inline, no modal */}
        {activeTab === 'messages' && (
          <VibeFIDConvexProvider>
            <div className="flex-1 flex flex-col overflow-hidden">
            {userFid ? (
              <VibeMailInboxWithClaim
                cardFid={userFid}
                username={profileDashboard?.username}
                onClose={() => { setActiveTab('missions'); }}
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
                <button onClick={() => setActiveTab('missions')} className="text-red-500 hover:text-red-400 text-sm">← Back</button>
              </div>
            )}
            </div>
          </VibeFIDConvexProvider>
        )}
      </div>
    </div>
  );
}
