"use client";

import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";
import { useMusic } from "@/contexts/MusicContext";
import { getAssetUrl } from "@/lib/ipfs-assets";
import { useProfile } from "@/contexts/ProfileContext";
import { useAccount, useDisconnect } from "wagmi";
import { useFarcasterVBMSBalance } from "@/lib/hooks/useFarcasterVBMS";
import { sdk } from "@farcaster/miniapp-sdk";
import { GameHeader } from "@/components/GameHeader";
import { useRouter, useSearchParams } from "next/navigation";
import { usePlayerCards } from "@/contexts/PlayerCardsContext";
import { useQuery, useMutation, useConvex } from "convex/react";
import { toast } from "sonner";
import { usePrimaryAddress } from "@/lib/hooks/usePrimaryAddress";
import { useMiniappFrameContext } from "@/components/MiniappFrame";

import { api } from "@/convex/_generated/api";
import { api as fidApi } from "@/lib/fid/convex-generated/api";
import { vibefidConvex } from "@/contexts/VibeFIDConvexProvider";
import { CreateProfileModal } from "@/components/CreateProfileModal";
import { DEFAULT_TOUR_STEPS } from "@/components/GuidedTour";
import { GamePopups } from "@/components/GamePopups";
import { PvPPreviewModal } from "@/components/PvPPreviewModal";
import { GameNavBar } from "@/components/GameNavBar";
import { ConnectScreen } from "@/components/ConnectScreen";
import { AllCollectionsButton } from "@/components/AllCollectionsButton";
import BannedScreen from "@/components/BannedScreen";
// Components
import { GameGrid, CardsPreview } from "@/components/home";
import { Roulette } from "@/components/Roulette";
import { HAND_SIZE, getMaxAttacks, isAdmin } from "@/lib/config";
// Hooks
import { useTotalPower, useSortedByPower, useStrongestCards, usePowerByCollection } from "@/hooks/useCardCalculations";
import { usePopupStates } from "@/hooks/usePopupStates";
import { useBattleState, type BattleResult, VICTORY_IMAGES } from "@/hooks/useBattleState";
import { useMissionState } from "@/hooks/useMissionState";
import { useFarcasterInit } from "@/hooks/useFarcasterInit";
import { useAccessAnalytics } from "@/hooks/useAccessAnalytics";
import { useAutoCreateProfile } from "@/hooks/useAutoCreateProfile";
// 📝 Logger
import { devLog, devError, devWarn } from "@/lib/utils/logger";

const DifficultyModal = dynamic(() => import("@/components/DifficultyModal"), { ssr: false });
const TutorialModal = dynamic(() => import("@/components/TutorialModal").then(m => m.TutorialModal), { ssr: false });
const GuidedTour = dynamic(() => import("@/components/GuidedTour").then(m => m.GuidedTour), { ssr: false });
const SettingsModal = dynamic(() => import("@/components/SettingsModal").then(m => m.SettingsModal), { ssr: false });
const CpuArenaModal = dynamic(() => import("@/components/CpuArenaModal").then(m => m.CpuArenaModal), { ssr: false });
const BaccaratModal = dynamic(() => import("@/components/BaccaratModal").then(m => m.BaccaratModal), { ssr: false });
const CoinsInboxModal = dynamic(() => import("@/components/CoinsInboxModal").then(m => m.CoinsInboxModal), { ssr: false });
const PveCardSelectionModal = dynamic(() => import("@/components/PveCardSelectionModal").then(m => m.PveCardSelectionModal), { ssr: false });
const ChangelogModal = dynamic(() => import("@/components/ChangelogModal").then(m => m.ChangelogModal), { ssr: false });
const ReportModal = dynamic(() => import("@/components/ReportModal").then(m => m.ReportModal), { ssr: false });
const MyCardsModal = dynamic(() => import("@/app/(game)/components/modals/MyCardsModal").then(m => m.MyCardsModal), { ssr: false });

export default function TestHomePage() {
  const { t } = useLanguage();
  const { address } = useAccount();
  const { userProfile, isLoadingProfile } = useProfile();
  const { balance: vbmsBlockchainBalance } = useFarcasterVBMSBalance(address);

  const router = useRouter();
  const [soundEnabled] = useState(true);
  const [isInFarcaster, setIsInFarcaster] = useState(false);
  const [showMyCardsModal, setShowMyCardsModal] = useState(false);
  const [showCoinsInbox, setShowCoinsInbox] = useState(false);

  useEffect(() => {
    sdk?.context?.then((c) => setIsInFarcaster(!!c)).catch(() => setIsInFarcaster(false));
  }, []);

  const { nfts, status: cardsStatus } = usePlayerCards();

  const profileDashboard = useQuery(api.profiles.getProfileDashboard, address ? { address } : "skip");
  const inboxStatus = profileDashboard ? {
    coinsInbox: profileDashboard.coinsInbox,
    coins: profileDashboard.coins,
    inbox: profileDashboard.inbox,
    lifetimeEarned: profileDashboard.lifetimeEarned,
    cooldownRemaining: profileDashboard.cooldownRemaining,
    pendingConversion: profileDashboard.pendingConversion || 0,
    pendingConversionTimestamp: profileDashboard.pendingConversionTimestamp || null,
  } : null;

  const raffleConfig = useQuery(api.raffle.getRaffleConfig);
  const raffleEntries = useQuery(api.raffle.getRecentEntries, { limit: 20 });
  const raffleTimeLeft = useMemo(() => {
    if (!raffleConfig) return null;
    const endsAt = (raffleConfig as any).updatedAt + (raffleConfig as any).durationDays * 86400_000;
    const diff = endsAt - Date.now();
    if (diff <= 0) return null;
    const totalMins = Math.floor(diff / 60000);
    const h = Math.floor(totalMins / 60);
    const m = totalMins % 60;
    return { h, m };
  }, [raffleConfig]);
  const cardCount = nfts.length;
  const hasEnoughCards = cardCount >= 5;
  const cardsLoading = cardsStatus === 'idle' || cardsStatus === 'fetching';

  const getAvatarUrl = (profile: { twitter?: string; twitterProfileImageUrl?: string } | null): string | null => {
    if (!profile) return null;
    return profile.twitterProfileImageUrl || null;
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%', background: '#1E1E1E', overflow: 'hidden',
    }}>
    <style>{`
      * { -webkit-tap-highlight-color: transparent; box-sizing: border-box; }
      .bg-vintage-charcoal\\/80, .bg-vintage-charcoal\\/95 { background: #1E1E1E !important; backdrop-filter: none !important; }
      .border-vintage-gold\\/30 { border-color: transparent !important; }
      /* Force header margin to 0 — flex handles all spacing */
      .mb-3 { margin-bottom: 0 !important; }
      .mb-6 { margin-bottom: 0 !important; }
      .mb-6 { margin-bottom: 0 !important; }
      @keyframes spinCW { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      @keyframes pulseGlow { 0%,100% { opacity: 0.08; } 50% { opacity: 0.16; } }
      @keyframes fadeInUp { 0% { opacity: 0; transform: translateY(4px); } 100% { opacity: 1; transform: translateY(0); } }
      @keyframes cardFloat { 0%,100% { transform: translateY(0) scale(1); opacity: 0.08; } 50% { transform: translateY(-3px) scale(1.02); opacity: 0.15; } }
      @keyframes lockPulse { 0%,100% { opacity: 0.1; } 50% { opacity: 0.18; } }
      @keyframes lbCard1 { 0%,100%{transform:translateY(8px)} 12%,22%{transform:translateY(-20px)} 35%{transform:translateY(8px)} }
      @keyframes lbCard2 { 0%,35%,100%{transform:translateY(8px)} 47%,57%{transform:translateY(-20px)} 70%{transform:translateY(8px)} }
      @keyframes lbCard3 { 0%,70%,100%{transform:translateY(8px)} 80%,89%{transform:translateY(-20px)} 98%{transform:translateY(8px)} }
      @keyframes rank1on1 { 0%,9%,28%,100%{opacity:0} 13%,24%{opacity:1} }
      @keyframes rank1on2 { 0%,43%,64%,100%{opacity:0} 48%,59%{opacity:1} }
      @keyframes rank1on3 { 0%,76%,93%,100%{opacity:0} 81%,90%{opacity:1} }
      @keyframes shot1     { 0%,8%,22%,100% { opacity:0; } 12%,18% { opacity:0.8; } }
      @keyframes shot2     { 0%,28%,42%,100% { opacity:0; } 32%,38% { opacity:0.8; } }
      @keyframes shot3     { 0%,48%,62%,100% { opacity:0; } 52%,58% { opacity:0.8; } }
      @keyframes shotAll   { 0%,74%,88%,100% { opacity:0; } 77%,84% { opacity:1; } }
      @keyframes bossDestroy { 0%,86%,97%,100% { opacity:1; } 88%,95% { opacity:0; } }
      @keyframes chipFlip { 0%,100% { transform: scaleX(1); } 20% { transform: scaleX(0.05); } 40%,80% { transform: scaleX(1); } 90% { transform: scaleX(0.05); } }
      @keyframes cardDown1 { 0%,100%{transform:translateY(-4px) rotate(-7deg)} 50%{transform:translateY(10px) rotate(-7deg)} }
      @keyframes cardDown2 { 0%,100%{transform:translateY(-2px) rotate(1deg)} 50%{transform:translateY(12px) rotate(1deg)} }
      @keyframes cardDown3 { 0%,100%{transform:translateY(-5px) rotate(8deg)} 50%{transform:translateY(9px) rotate(8deg)} }
      @keyframes tickerScroll { 0%{transform:translateY(0)} 100%{transform:translateY(-50%)} }
      @keyframes beamLR { 0%,5% { left:18%; width:0; opacity:0.35; } 35% { left:18%; width:64%; opacity:0.35; } 42%,100% { left:18%; width:64%; opacity:0; } }
      @keyframes beamRL { 0%,50% { right:18%; width:0; opacity:0; } 55% { right:18%; width:0; opacity:0.35; } 85% { right:18%; width:64%; opacity:0.35; } 92%,100% { right:18%; width:64%; opacity:0; } }
      @keyframes pushRight { 0%,38%,55%,100% { transform:translateY(-50%) translateX(0); } 43%,50% { transform:translateY(-50%) translateX(28px); } }
      @keyframes pushLeft  { 0%,83%,98%,100% { transform:translateY(-50%) translateX(0); } 88%,95% { transform:translateY(-50%) translateX(-28px); } }
    `}</style>

      <GameHeader
        isInFarcaster={isInFarcaster}
        soundEnabled={soundEnabled}
        userProfile={userProfile}
        isLoadingProfile={isLoadingProfile}
        address={address}
        vbmsBlockchainBalance={vbmsBlockchainBalance}
        getAvatarUrl={getAvatarUrl}
        onSettingsClick={() => {}}
        onCreateProfileClick={() => {}}
      />

      {/* CONTENT - scrollable middle area */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '8px 4px' }}>

          {/* PLAY NOW */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#4ade80', animation: 'pulseGlow 2s infinite' }} />
            <span style={{ fontSize: 9, fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: 1 }}>Play Now</span>
          </div>

          {/* SPIN */}
          <Link href="/roulette" style={{ display: 'block', borderRadius: 10, overflow: 'hidden', background: 'linear-gradient(135deg, #6D28D9, #9333EA)', border: '1px solid #A78BFA', animation: 'fadeInUp 0.3s ease', minHeight: 80, textDecoration: 'none', position: 'relative' }}>
            {/* Roulette wheel — full height, right side */}
            <div style={{ position: 'absolute', right: -10, top: '50%', transform: 'translateY(-50%)', animation: 'spinCW 6s linear infinite' }}>
              <svg width="110" height="110" viewBox="0 0 110 110">
                {/* Outer ring */}
                <circle cx="55" cy="55" r="52" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="2"/>
                {/* Colored segments */}
                {Array.from({ length: 18 }).map((_, i) => {
                  const angle = (i * 360) / 18;
                  const rad = (angle * Math.PI) / 180;
                  const rad2 = ((angle + 20) * Math.PI) / 180;
                  const r = 50;
                  const x1 = 55 + r * Math.cos(rad);
                  const y1 = 55 + r * Math.sin(rad);
                  const x2 = 55 + r * Math.cos(rad2);
                  const y2 = 55 + r * Math.sin(rad2);
                  const colors = ['rgba(220,38,38,0.5)', 'rgba(0,0,0,0.4)'];
                  return (
                    <path key={i}
                      d={`M55,55 L${x1},${y1} A${r},${r} 0 0,1 ${x2},${y2} Z`}
                      fill={colors[i % 2]}
                      stroke="rgba(255,255,255,0.15)" strokeWidth="0.5"
                    />
                  );
                })}
                {/* Inner rings */}
                <circle cx="55" cy="55" r="18" fill="rgba(0,0,0,0.4)" stroke="rgba(255,215,0,0.6)" strokeWidth="1.5"/>
                <circle cx="55" cy="55" r="10" fill="rgba(0,0,0,0.6)" stroke="rgba(255,255,255,0.3)" strokeWidth="1"/>
                {/* Spoke lines */}
                {Array.from({ length: 9 }).map((_, i) => {
                  const angle = (i * 360) / 9;
                  const rad = (angle * Math.PI) / 180;
                  return (
                    <line key={i}
                      x1={55 + 18 * Math.cos(rad)} y1={55 + 18 * Math.sin(rad)}
                      x2={55 + 50 * Math.cos(rad)} y2={55 + 50 * Math.sin(rad)}
                      stroke="rgba(255,255,255,0.2)" strokeWidth="0.8"
                    />
                  );
                })}
                {/* Center dot */}
                <circle cx="55" cy="55" r="4" fill="#FFD700"/>
              </svg>
            </div>
            <div style={{ padding: '10px 14px', position: 'relative', zIndex: 1 }}>
              <div style={{ fontSize: 6.5, fontWeight: 600, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: 1.5 }}>No Cards Needed</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: '#fff', lineHeight: 1, marginTop: 2 }}>SPIN</div>
              <div style={{ marginTop: 6, display: 'inline-block', padding: '2px 10px', background: '#22c55e', color: '#000', borderRadius: 4, fontSize: 9, fontWeight: 700 }}>Free</div>
            </div>
          </Link>

          {/* Baccarat + Arena row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>
            <Link href="/baccarat" style={{ borderRadius: 10, overflow: 'hidden', background: '#1F2937', border: '1px solid #374151', animation: 'fadeInUp 0.35s ease', minHeight: 72, textDecoration: 'none', position: 'relative' }}>
              {/* Chip flip */}
              <div style={{ position: 'absolute', right: -8, top: '50%', transform: 'translateY(-50%)', animation: 'chipFlip 2.4s ease-in-out infinite', transformOrigin: 'center' }}>
                <svg width="80" height="80" viewBox="0 0 80 80">
                  <circle cx="40" cy="40" r="38" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.12)" strokeWidth="2"/>
                  {Array.from({ length: 12 }).map((_, i) => {
                    const a = (i * 30 * Math.PI) / 180;
                    const x1 = 40 + 32 * Math.cos(a), y1 = 40 + 32 * Math.sin(a);
                    const x2 = 40 + 38 * Math.cos(a), y2 = 40 + 38 * Math.sin(a);
                    return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(255,255,255,0.18)" strokeWidth="4" strokeLinecap="round"/>;
                  })}
                  <circle cx="40" cy="40" r="28" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.1)" strokeWidth="1.5"/>
                  {Array.from({ length: 6 }).map((_, i) => {
                    const a = (i * 60 * Math.PI) / 180;
                    const x1 = 40 + 10 * Math.cos(a), y1 = 40 + 10 * Math.sin(a);
                    const x2 = 40 + 27 * Math.cos(a), y2 = 40 + 27 * Math.sin(a);
                    return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(255,255,255,0.1)" strokeWidth="5"/>;
                  })}
                  <circle cx="40" cy="40" r="10" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5"/>
                  <text x="40" y="44" textAnchor="middle" fontSize="9" fontWeight="900" fill="rgba(255,255,255,0.2)">$</text>
                </svg>
              </div>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: '#fff' }}>BACCARAT</div>
              </div>
            </Link>

            <Link href="/tcg" style={{ borderRadius: 10, overflow: 'hidden', background: '#1F2937', border: '1px solid #374151', animation: 'fadeInUp 0.4s ease', minHeight: 72, textDecoration: 'none', position: 'relative' }}>
              {/* VibeFID cover — esquerda */}
              <img src="/covers/vibefid-cover.png" alt=""
                style={{ position: 'absolute', left: -4, top: '50%', height: '88%', width: 'auto', objectFit: 'cover', borderRadius: 4, opacity: 0.12, animation: 'pushLeft 3s ease-in-out infinite' }}
              />
              {/* VMW cover — direita */}
              <img src="https://vibechain.com/api/proxy?url=https%3A%2F%2Fimagedelivery.net%2Fg4iQ0bIzMZrjFMgjAnSGfw%2F54f04f3d-8d29-420e-aaeb-ba6b17e45e00%2Fpublic" alt=""
                style={{ position: 'absolute', right: -4, top: '50%', height: '88%', width: 'auto', objectFit: 'cover', borderRadius: 4, opacity: 0.12, animation: 'pushRight 3s ease-in-out infinite' }}
              />
              {/* Beam L→R */}
              <div style={{ position: 'absolute', top: '50%', height: 1.5, background: 'linear-gradient(to right, rgba(255,255,255,0.9), rgba(255,215,0,0.6))', borderRadius: 2, animation: 'beamLR 3s ease-in-out infinite', marginTop: -0.75 }} />
              {/* Beam R→L */}
              <div style={{ position: 'absolute', top: '50%', height: 1.5, background: 'linear-gradient(to left, rgba(255,255,255,0.9), rgba(255,215,0,0.6))', borderRadius: 2, animation: 'beamRL 3s ease-in-out infinite', marginTop: -0.75 }} />
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#fff' }}>ARENA</div>
              </div>
            </Link>
          </div>

          {/* NEED CARDS */}
          <div style={{ marginTop: 2 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}>
              <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#555', animation: 'lockPulse 2s infinite' }} />
              <span style={{ fontSize: 9, fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: 1 }}>Need Cards</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>
              <Link href="/raid" style={{
                borderRadius: 10, overflow: 'hidden',
                background: hasEnoughCards ? 'linear-gradient(135deg, #1F2937, #7F1D1D)' : 'linear-gradient(135deg, #1a1a1a, #111111)',
                animation: 'fadeInUp 0.45s ease', minHeight: 72, textDecoration: 'none',
                opacity: hasEnoughCards ? 1 : 0.5,
                border: 'none',
              }}>
                <div style={{ padding: '10px 6px', textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
                  {hasEnoughCards && (
                    <div style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', opacity: 0.35 }}>
                      <svg width="70" height="60" viewBox="0 0 70 60">
                        {/* Boss — demon face */}
                        <g style={{ animation: 'bossDestroy 6s ease-in-out infinite' }}>
                          <circle cx="52" cy="30" r="14" fill="none" stroke="#ef4444" strokeWidth="1"/>
                          <polygon points="44,18 41,11 47,17" fill="#ef4444"/>
                          <polygon points="60,18 63,11 57,17" fill="#ef4444"/>
                          <circle cx="47" cy="28" r="2" fill="#ef4444"/>
                          <circle cx="57" cy="28" r="2" fill="#ef4444"/>
                          <path d="M46,35 L48,38 L50,35 L52,39 L54,35 L56,38 L58,35" fill="none" stroke="#ef4444" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
                        </g>
                        {/* Static balls */}
                        <circle cx="8" cy="8"  r="4" fill="none" stroke="#ef4444" strokeWidth="1"/>
                        <circle cx="5" cy="28" r="3" fill="none" stroke="#ef4444" strokeWidth="1"/>
                        <circle cx="8" cy="48" r="4" fill="none" stroke="#ef4444" strokeWidth="1"/>
                        {/* Individual shots */}
                        <line x1="12" y1="8"  x2="37" y2="20" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" style={{ opacity:0, animation:'shot1 6s ease-in-out infinite' }}/>
                        <line x1="8"  y1="28" x2="37" y2="28" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" style={{ opacity:0, animation:'shot2 6s ease-in-out infinite' }}/>
                        <line x1="12" y1="48" x2="37" y2="36" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" style={{ opacity:0, animation:'shot3 6s ease-in-out infinite' }}/>
                        {/* Final combined shots */}
                        <line x1="12" y1="8"  x2="37" y2="20" stroke="#ff9999" strokeWidth="2.5" strokeLinecap="round" style={{ opacity:0, animation:'shotAll 6s ease-in-out infinite' }}/>
                        <line x1="8"  y1="28" x2="37" y2="28" stroke="#ff9999" strokeWidth="2.5" strokeLinecap="round" style={{ opacity:0, animation:'shotAll 6s ease-in-out infinite' }}/>
                        <line x1="12" y1="48" x2="37" y2="36" stroke="#ff9999" strokeWidth="2.5" strokeLinecap="round" style={{ opacity:0, animation:'shotAll 6s ease-in-out infinite' }}/>
                      </svg>
                    </div>
                  )}
                  <div style={{ position: 'relative', zIndex: 1 }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: hasEnoughCards ? '#fff' : '#555', textTransform: 'uppercase' }}>Boss Raid</div>
                  </div>
                </div>
              </Link>

              <Link href="/leaderboard" style={{
                borderRadius: 10, overflow: 'hidden',
                background: '#1F2937',
                border: '1px solid #374151',
                animation: 'fadeInUp 0.5s ease', minHeight: 72, textDecoration: 'none',
                opacity: hasEnoughCards ? 1 : 0.5,
              }}>
                <div style={{ padding: '10px 6px', textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
                  {hasEnoughCards && (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', padding: '4px 10px 6px', overflow: 'hidden' }}>
                      {/* Card 1 */}
                      <div style={{ animation: 'lbCard1 5s ease-in-out infinite', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                        <span style={{ fontSize: 9, fontWeight: 900, color: 'rgba(255,215,0,0.55)', animation: 'rank1on1 5s ease-in-out infinite', opacity: 0 }}>#1</span>
                        <svg width="28" height="38" viewBox="0 0 28 38" opacity="0.25">
                          <rect x="0" y="0" width="28" height="38" rx="3" fill="rgba(255,215,0,0.12)" stroke="#fbbf24" strokeWidth="1.2"/>
                          <line x1="4" y1="10" x2="24" y2="10" stroke="#fbbf24" strokeWidth="1"/>
                          <line x1="4" y1="15" x2="17" y2="15" stroke="#fbbf24" strokeWidth="1"/>
                        </svg>
                      </div>
                      {/* Card 2 */}
                      <div style={{ animation: 'lbCard2 5s ease-in-out infinite', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                        <span style={{ fontSize: 9, fontWeight: 900, color: 'rgba(255,215,0,0.55)', animation: 'rank1on2 5s ease-in-out infinite', opacity: 0 }}>#1</span>
                        <svg width="28" height="38" viewBox="0 0 28 38" opacity="0.25">
                          <rect x="0" y="0" width="28" height="38" rx="3" fill="rgba(255,215,0,0.12)" stroke="#fbbf24" strokeWidth="1.2"/>
                          <line x1="4" y1="10" x2="24" y2="10" stroke="#fbbf24" strokeWidth="1"/>
                          <line x1="4" y1="15" x2="17" y2="15" stroke="#fbbf24" strokeWidth="1"/>
                        </svg>
                      </div>
                      {/* Card 3 */}
                      <div style={{ animation: 'lbCard3 5s ease-in-out infinite', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                        <span style={{ fontSize: 9, fontWeight: 900, color: 'rgba(255,215,0,0.55)', animation: 'rank1on3 5s ease-in-out infinite', opacity: 0 }}>#1</span>
                        <svg width="28" height="38" viewBox="0 0 28 38" opacity="0.25">
                          <rect x="0" y="0" width="28" height="38" rx="3" fill="rgba(255,215,0,0.12)" stroke="#fbbf24" strokeWidth="1.2"/>
                          <line x1="4" y1="10" x2="24" y2="10" stroke="#fbbf24" strokeWidth="1"/>
                          <line x1="4" y1="15" x2="17" y2="15" stroke="#fbbf24" strokeWidth="1"/>
                        </svg>
                      </div>
                    </div>
                  )}
                  <div style={{ position: 'relative', zIndex: 1 }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: hasEnoughCards ? '#fff' : '#555', textTransform: 'uppercase' }}>Leaderboard</div>
                  </div>
                </div>
              </Link>
            </div>
          </div>

          {/* YOUR CARDS */}
          <div onClick={() => setShowMyCardsModal(true)} style={{ display: 'block', borderRadius: 10, overflow: 'hidden', background: '#1F2937', border: '1px solid #374151', animation: 'fadeInUp 0.4s ease', minHeight: 56, cursor: 'pointer', position: 'relative' }}>
            {/* Card images background — só a cabeça, descendo */}
            {nfts.slice(0, 5).map((card, i) => {
              const anims = ['cardDown1 3.2s','cardDown2 3.8s','cardDown3 3.5s','cardDown1 4s','cardDown2 4.3s'];
              const lefts = ['8%','26%','44%','62%','78%'];
              return card.imageUrl ? (
                <img key={i} src={card.imageUrl} alt="" style={{ position: 'absolute', left: lefts[i], top: 0, height: 74, width: 'auto', objectFit: 'cover', objectPosition: 'top', opacity: 0.14, animation: `${anims[i]} ease-in-out infinite`, borderRadius: 3, pointerEvents: 'none' }} />
              ) : null;
            })}
            <div style={{ padding: '10px 14px', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 1 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontSize: 7, fontWeight: 600, color: 'rgba(156,163,175,0.5)', textTransform: 'uppercase', letterSpacing: 1.5 }}>Your Cards</span>
                <span style={{ fontSize: 20, fontWeight: 900, color: '#FACC15', lineHeight: 1 }}>{cardsLoading ? '...' : cardCount}</span>
              </div>
              <span style={{ fontSize: 9, fontWeight: 700, color: 'rgba(156,163,175,0.5)', flexShrink: 0, marginRight: 4 }}>View All &gt;</span>
            </div>
          </div>

          {/* RAFFLE CATEGORY */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 16 }}>
            <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#FFD700', animation: 'pulseGlow 2s infinite' }} />
            <span style={{ fontSize: 9, fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: 1 }}>Raffle</span>
          </div>

          {/* RAFFLE */}
          <Link href="/raffle" style={{ borderRadius: 10, overflow: 'hidden', background: 'linear-gradient(135deg, #FACC15, #B45309)', animation: 'fadeInUp 0.5s ease', minHeight: 60, textDecoration: 'none', position: 'relative' }}>
            {/* Background ticker - pure decoration */}
            <div style={{ position: 'absolute', right: 3, top: 0, bottom: 0, width: 140, overflow: 'hidden', opacity: 0.30, zIndex: 0 }}>

              <div style={{ animation: 'tickerScroll 18s linear infinite', display: 'flex', flexDirection: 'column', gap: 4 }}>
                {(raffleEntries || []).map((e) => {
                  const u = e.username || e.address.slice(0, 6);
                  const c = e.chain === 'base' ? 'BASE' : 'ARB';
                  return (
                    <div key={e._id} style={{ textAlign: 'right', whiteSpace: 'nowrap', fontSize: 6.5, fontWeight: 700, color: 'rgba(0,0,0,0.6)', padding: '0 4px' }}>
                      {u} buy {e.tickets} ticket with {e.token} on {c}
                    </div>
                  );
                })}
              </div>
            </div>
            <div style={{ padding: '12px 12px', position: 'relative', display: 'flex', alignItems: 'center', height: '100%' }}>
              {/* Image */}
              <div style={{ flex: 'none', width: 54, alignSelf: 'stretch', borderRadius: 6, overflow: 'hidden', background: '#111', flexShrink: 0, zIndex: 1 }}>
                <img src="/images/baccarat/queen%20diamonds%2C%20goofy%20romero.png" alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'center' }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
              </div>
              {/* Prize info */}
              <div style={{ flex: 1, minWidth: 0, padding: '0 8px', zIndex: 1 }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: '#000', textTransform: 'uppercase', letterSpacing: 1, lineHeight: 1.1, display: 'block' }}>{(raffleConfig as any)?.prizeDescription || 'Raffle'}</span>
                <div style={{ display: 'flex', gap: 6, marginTop: 3, flexWrap: 'wrap' }}>
                  {(raffleConfig as any)?.cardValueUSD && (
                    <span style={{ fontSize: 8, color: 'rgba(0,0,0,0.6)', fontWeight: 700, lineHeight: 1 }}>Card ~${(raffleConfig as any).cardValueUSD}</span>
                  )}
                  {(raffleConfig as any)?.ticketPriceUSD && (
                    <span style={{ fontSize: 8, color: 'rgba(0,0,0,0.6)', fontWeight: 700, lineHeight: 1 }}>· Ticket ${(raffleConfig as any).ticketPriceUSD}</span>
                  )}
                </div>
              </div>
              {/* Timer */}
              <div style={{ flex: 'none', width: 90, textAlign: 'right', position: 'relative', zIndex: 1 }}>
                {raffleTimeLeft ? (
                  <>
                    <span style={{ fontSize: 10, fontWeight: 800, color: '#000', lineHeight: 1, display: 'block', position: 'relative', zIndex: 1 }}>{raffleTimeLeft.h}h {raffleTimeLeft.m}m</span>
                    <span style={{ fontSize: 7, color: 'rgba(0,0,0,0.5)', textTransform: 'uppercase', lineHeight: 1, display: 'block', marginTop: 1, position: 'relative', zIndex: 1 }}>left</span>
                  </>
                ) : (
                  <span style={{ fontSize: 8, fontWeight: 800, color: 'rgba(0,0,0,0.5)', lineHeight: 1, display: 'block', position: 'relative', zIndex: 1 }}>Ended</span>
                )}
              </div>
            </div>
          </Link>

          {/* Spacer */}
          <div style={{ height: '10px' }} />
      </div>

      <MyCardsModal isOpen={showMyCardsModal} onClose={() => setShowMyCardsModal(false)} nfts={nfts} soundEnabled={soundEnabled} />
      {showCoinsInbox && inboxStatus && (
        <CoinsInboxModal inboxStatus={inboxStatus} onClose={() => setShowCoinsInbox(false)} userAddress={address} />
      )}

      {/* BOTTOM NAV - flex child, always at bottom of flex container */}
      <div style={{ flexShrink: 0, background: '#1E1E1E', padding: '4px 4px 4px 4px', display: 'flex', gap: 4 }}>
          {[
            { label: 'HOME',   bg: '#1E1E1E', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>, onClick: () => router.push('/test-home') },
            { label: 'REDEEM',  bg: '#1E1E1E', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="10" width="18" height="12" rx="2"/><path d="M12 10V4"/><path d="M12 4c-2 0-4 2-4 4h4"/><path d="M12 4c2 0 4 2 4 4h-4"/><line x1="12" y1="10" x2="12" y2="22"/><line x1="3" y1="15" x2="21" y2="15"/></svg>, onClick: () => setShowCoinsInbox(true) },
            { label: 'EARN',   bg: '#1E1E1E', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>, onClick: () => router.push('/quests') },
            { label: 'SHOP',   bg: '#1E1E1E', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>, onClick: () => router.push('/shop') },
          ].map(({ label, bg, icon, onClick }) => (
            <button
              key={label}
              onClick={onClick}
              className="tour-nav-btn"
              style={{ background: bg, borderRadius: 10, flex: 1, minWidth: 0, padding: '8px 4px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, border: 'none', cursor: 'pointer', color: '#FACC15' }}
            >
              <span style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, whiteSpace: 'nowrap' }}>{label}</span>
              {icon}
            </button>
          ))}
      </div>
    </div>
  );
}
