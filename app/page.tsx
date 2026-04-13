"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";
import { useMusic } from "@/contexts/MusicContext";
import { useProfile } from "@/contexts/ProfileContext";
import { useAccount, useDisconnect } from "wagmi";
import { useFarcasterVBMSBalance } from "@/lib/hooks/useFarcasterVBMS";
import { GameHeader } from "@/components/GameHeader";
import { ConnectScreen } from "@/components/ConnectScreen";
import { useRouter } from "next/navigation";
import { usePlayerCards } from "@/contexts/PlayerCardsContext";
import { useQuery } from "convex/react";
import { AudioManager } from "@/lib/audio-manager";
import { useFarcasterContext } from "@/hooks/fid/useFarcasterContext";

import { api } from "@/convex/_generated/api";
import { CreateProfileModal } from "@/components/CreateProfileModal";
import { CpuArenaModal } from "@/components/CpuArenaModal";

const SettingsModal = dynamic(() => import("@/components/SettingsModal").then(m => m.SettingsModal), { ssr: false });
const ChangelogModal = dynamic(() => import("@/components/ChangelogModal").then(m => m.ChangelogModal), { ssr: false });
const ReportModal = dynamic(() => import("@/components/ReportModal").then(m => m.ReportModal), { ssr: false });
const CoinsInboxModal = dynamic(() => import("@/components/CoinsInboxModal").then(m => m.CoinsInboxModal), { ssr: false });
const MyCardsModal = dynamic(() => import("@/app/(game)/components/modals/MyCardsModal").then(m => m.MyCardsModal), { ssr: false });

export default function HomePage() {
  const { t, lang, setLang } = useLanguage();
  const { address } = useAccount();
  const { disconnect } = useDisconnect();
  const { userProfile, isLoadingProfile, setUserProfile } = useProfile();
  const farcasterContext = useFarcasterContext();
  const { balance: vbmsBlockchainBalance } = useFarcasterVBMSBalance(address);
  const {
    musicMode, setMusicMode, isMusicEnabled, setIsMusicEnabled, setVolume: syncMusicVolume,
    customMusicUrl, setCustomMusicUrl, isCustomMusicLoading, customMusicError,
    playlist, setPlaylist, addToPlaylist, removeFromPlaylist, currentPlaylistIndex,
    skipToNext, skipToPrevious, currentTrackName, currentTrackThumbnail, isPaused, pause, play,
  } = useMusic();

  const router = useRouter();
  const [soundEnabled] = useState(true);
  const [isConnectingWallet, setIsConnectingWallet] = useState(false);
  const [showMyCardsModal, setShowMyCardsModal] = useState(false);
  const [showCoinsInbox, setShowCoinsInbox] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showCreateProfileModal, setShowCreateProfileModal] = useState(false);
  const [profileUsername, setProfileUsername] = useState('');
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);
  const [musicVolume, setMusicVolume] = useState(0.1);
  const [showChangeUsername, setShowChangeUsername] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [isChangingUsername, setIsChangingUsername] = useState(false);
  const [showCpuArena, setShowCpuArena] = useState(false);
  const [showChangelog, setShowChangelog] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const lastAutoPromptAddressRef = useRef<string | null>(null);
  const getProfilePromptSeenKey = (walletAddress: string) => `vmw_profile_prompt_seen_${walletAddress.toLowerCase()}`;
  const showWalletGate = !address;
  const isInFarcaster = farcasterContext.isInMiniapp;
  const isCheckingWalletAccess = !farcasterContext.isReady || isConnectingWallet;

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
  const playerMissions = useQuery(api.missions.getPlayerMissions, address ? { playerAddress: address } : "skip");
  const hasClaimableMissions = (playerMissions ?? []).some((m: any) => m.completed && !m.claimed);

  const cardCount = nfts.length;
  const hasEnoughCards = cardCount >= 5;
  const cardsLoading = cardsStatus === 'idle' || cardsStatus === 'fetching';

  const getAvatarUrl = (profile: { twitter?: string; twitterProfileImageUrl?: string } | null): string | null => {
    if (!profile) return null;
    return profile.twitterProfileImageUrl || null;
  };

  const getDefaultUsernameFromAddress = (walletAddress: string): string => {
    const normalized = walletAddress.toLowerCase();
    return `user_${normalized.slice(2, 6)}${normalized.slice(-4)}`;
  };

  // Wallet-first onboarding (no FID): open create profile modal with a suggested username.
  useEffect(() => {
    if (!address) {
      lastAutoPromptAddressRef.current = null;
      return;
    }

    if (isLoadingProfile || userProfile) return;

    const normalizedAddress = address.toLowerCase();
    const promptSeenKey = getProfilePromptSeenKey(normalizedAddress);
    const hasSeenPrompt = typeof window !== "undefined" && localStorage.getItem(promptSeenKey) === "1";

    const farcasterSuggestedUsername = farcasterContext.user?.username?.trim();
    const sanitizedFarcasterUsername = farcasterSuggestedUsername
      ? farcasterSuggestedUsername.toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 20)
      : "";
    const hasWalletDefaultUsername = profileUsername.startsWith("user_");

    if (sanitizedFarcasterUsername && (!profileUsername.trim() || hasWalletDefaultUsername)) {
      setProfileUsername(sanitizedFarcasterUsername);
    } else if (!profileUsername.trim()) {
      setProfileUsername(getDefaultUsernameFromAddress(normalizedAddress));
    }

    if (!hasSeenPrompt && lastAutoPromptAddressRef.current !== normalizedAddress) {
      setShowCreateProfileModal(true);
      lastAutoPromptAddressRef.current = normalizedAddress;
      if (typeof window !== "undefined") {
        localStorage.setItem(promptSeenKey, "1");
      }
    }
  }, [address, isLoadingProfile, userProfile, profileUsername, farcasterContext.user?.username]);

  return (
    <div style={{ minHeight: '100dvh', background: '#1E1E1E', overflow: showWalletGate ? 'hidden' : undefined }}>
    <style>{`
      * { -webkit-tap-highlight-color: transparent; box-sizing: border-box; }
      .bg-vintage-charcoal\\/80 { background: #1E1E1E !important; backdrop-filter: none !important; border: none !important; border-bottom: 2px solid #000 !important; border-radius: 0 !important; }
      .bg-vintage-charcoal\\/95 { background: #1E1E1E !important; backdrop-filter: none !important; }
      .border-vintage-gold\\/30 { border-color: transparent !important; }
      /* GameHeader — ID override (vence neobrutalism !important) */
      #th-hdr button { background: #1E1E1E !important; border: none !important; box-shadow: none !important; border-radius: 0 !important; transform: none !important; color: #FACC15 !important; }
      #th-hdr button:hover { background: rgba(255,255,255,0.05) !important; box-shadow: none !important; transform: none !important; color: #FACC15 !important; }
      #th-hdr button * { color: #FACC15 !important; }
      #th-hdr .tour-settings-gear svg, #th-hdr .tour-settings-gear svg * { stroke: #FACC15 !important; color: #FACC15 !important; }
      #th-hdr .tour-settings-btn { border-right: 1.5px solid #000 !important; }
      #th-hdr .tour-settings-gear { border-left: 1.5px solid #000 !important; }
      #th-hdr .tour-docs-btn { background: #1E1E1E !important; border: none !important; box-shadow: none !important; border-radius: 0 !important; transform: none !important; color: #FACC15 !important; border-left: 1.5px solid #000 !important; }
      #th-hdr .tour-docs-btn:hover { background: rgba(255,255,255,0.05) !important; box-shadow: none !important; transform: none !important; }
      #th-hdr .tour-docs-btn svg, #th-hdr .tour-docs-btn svg * { stroke: #FACC15 !important; }
      #th-hdr .tour-dex-btn span { font-size: 14px !important; font-weight: 600 !important; }
      #th-hdr .tour-dex-btn > div:last-child { display: none !important; }
      /* Compactar todos os itens do header */
      #th-hdr button, #th-hdr .tour-docs-btn { height: 40px !important; }
      #th-hdr .tour-settings-gear, #th-hdr .tour-docs-btn { width: 40px !important; }
      #th-hdr .tour-dex-btn { min-width: 0 !important; padding: 4px 10px !important; }
      #th-hdr .tour-settings-btn { padding: 4px 8px !important; }
      #th-hdr [class*="max-w-\\[120px\\]"] { max-width: 80px !important; }
      #th-hdr [class*="flex-wrap"] { flex-wrap: nowrap !important; gap: 4px !important; }
      @keyframes spinCW { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      @keyframes pulseGlow { 0%,100% { opacity: 0.08; } 50% { opacity: 0.16; } }
      @keyframes redDot { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.7; transform: scale(1.3); } }
      @keyframes fadeInUp { 0% { opacity: 0; transform: translateY(4px); } 100% { opacity: 1; transform: translateY(0); } }
      @keyframes cardFloat { 0%,100% { transform: translateY(0) scale(1); opacity: 0.08; } 50% { transform: translateY(-3px) scale(1.02); opacity: 0.15; } }
      @keyframes lockPulse { 0%,100% { opacity: 0.1; } 50% { opacity: 0.18; } }
      @keyframes lbCard1 { 0%,100%{transform:translateY(4px)} 12%,22%{transform:translateY(-7px)} 35%{transform:translateY(4px)} }
      @keyframes lbCard2 { 0%,35%,100%{transform:translateY(4px)} 47%,57%{transform:translateY(-7px)} 70%{transform:translateY(4px)} }
      @keyframes lbCard3 { 0%,70%,100%{transform:translateY(4px)} 80%,89%{transform:translateY(-7px)} 98%{transform:translateY(4px)} }
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
      @keyframes dotPulse { 0%,80%,100% { opacity:0.2; transform:scale(0.8); } 40% { opacity:1; transform:scale(1); } }
    `}</style>

      {!showWalletGate && (
      <div id="th-hdr">
        <GameHeader
          isInFarcaster={isInFarcaster}
          soundEnabled={soundEnabled}
          userProfile={userProfile}
          isLoadingProfile={isLoadingProfile}
          address={address}
          vbmsBlockchainBalance={vbmsBlockchainBalance}
          getAvatarUrl={getAvatarUrl}
          onSettingsClick={() => setShowSettingsModal(true)}
          onCreateProfileClick={() => setShowCreateProfileModal(true)}
          onDexClick={() => router.push('/dex')}
          onProfileClick={() => userProfile && router.push(`/profile/${userProfile.username}`)}
        />
      </div>
      )}

      {/* CONTENT — preso entre header e nav */}
      <div
        className="home-content-container"
        style={showWalletGate
          ? {
              position: 'fixed',
              inset: 0,
              overflow: 'hidden',
              padding: '24px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }
          : {
              position: 'fixed',
              top: 48,
              bottom: 60,
              left: 0,
              right: 0,
              overflowY: 'hidden',
              padding: '36px 4px 8px',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
      >
        {showWalletGate ? (
          <ConnectScreen
            isCheckingFarcaster={isCheckingWalletAccess}
            setIsCheckingFarcaster={setIsConnectingWallet}
            isInFarcaster={isInFarcaster}
            isFrameMode={false}
            soundEnabled={soundEnabled}
          />
        ) : (
          <>
          {/* PLAY NOW */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#4ade80', animation: 'pulseGlow 2s infinite' }} />
            <span style={{ fontSize: 9, fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: 1 }}>{t('playNow')}</span>
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
              <div style={{ fontSize: 6.5, fontWeight: 600, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: 1.5 }}>{t('noCardsNeeded')}</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: '#fff', lineHeight: 1, marginTop: 2 }}>{t('spinText')}</div>
              <div style={{ marginTop: 6, display: 'inline-block', padding: '2px 10px', background: '#22c55e', color: '#000', borderRadius: 4, fontSize: 9, fontWeight: 700 }}>{t('free')}</div>
            </div>
          </Link>

          {/* Baccarat + Arena row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>
            <Link href="/baccarat" style={{ borderRadius: 10, overflow: 'hidden', background: 'linear-gradient(135deg, #064E3B, #059669)', border: 'none', animation: 'fadeInUp 0.35s ease', minHeight: 72, textDecoration: 'none', position: 'relative' }}>
              {/* Chip grande — direita */}
              <div style={{ position: 'absolute', right: -10, top: '50%', transform: 'translateY(-50%)', animation: 'chipFlip 2.4s ease-in-out infinite', transformOrigin: 'center' }}>
                <svg width="80" height="80" viewBox="0 0 80 80">
                  <circle cx="40" cy="40" r="38" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.15)" strokeWidth="2"/>
                  {Array.from({ length: 12 }).map((_, i) => { const a=(i*30*Math.PI)/180; return <line key={i} x1={40+32*Math.cos(a)} y1={40+32*Math.sin(a)} x2={40+38*Math.cos(a)} y2={40+38*Math.sin(a)} stroke="rgba(255,255,255,0.2)" strokeWidth="4" strokeLinecap="round"/>; })}
                  <circle cx="40" cy="40" r="28" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.1)" strokeWidth="1.5"/>
                  {Array.from({ length: 6 }).map((_, i) => { const a=(i*60*Math.PI)/180; return <line key={i} x1={40+10*Math.cos(a)} y1={40+10*Math.sin(a)} x2={40+27*Math.cos(a)} y2={40+27*Math.sin(a)} stroke="rgba(255,255,255,0.1)" strokeWidth="5"/>; })}
                  <circle cx="40" cy="40" r="10" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5"/>
                  <text x="40" y="44" textAnchor="middle" fontSize="9" fontWeight="900" fill="rgba(255,255,255,0.25)">$</text>
                </svg>
              </div>
              {/* Chip pequeno — esquerda alta */}
              <div style={{ position: 'absolute', left: 6, top: 4, animation: 'chipFlip 3.1s ease-in-out infinite 0.8s', transformOrigin: 'center' }}>
                <svg width="30" height="30" viewBox="0 0 80 80">
                  <circle cx="40" cy="40" r="38" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.12)" strokeWidth="2"/>
                  {Array.from({ length: 12 }).map((_, i) => { const a=(i*30*Math.PI)/180; return <line key={i} x1={40+32*Math.cos(a)} y1={40+32*Math.sin(a)} x2={40+38*Math.cos(a)} y2={40+38*Math.sin(a)} stroke="rgba(255,255,255,0.15)" strokeWidth="4" strokeLinecap="round"/>; })}
                  <circle cx="40" cy="40" r="18" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.1)" strokeWidth="1.5"/>
                  <text x="40" y="44" textAnchor="middle" fontSize="12" fontWeight="900" fill="rgba(255,255,255,0.2)">$</text>
                </svg>
              </div>
              {/* Chip pequeno — esquerda baixa */}
              <div style={{ position: 'absolute', left: 14, bottom: 4, animation: 'chipFlip 2.8s ease-in-out infinite 0.4s', transformOrigin: 'center' }}>
                <svg width="22" height="22" viewBox="0 0 80 80">
                  <circle cx="40" cy="40" r="38" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.12)" strokeWidth="2"/>
                  {Array.from({ length: 8 }).map((_, i) => { const a=(i*45*Math.PI)/180; return <line key={i} x1={40+32*Math.cos(a)} y1={40+32*Math.sin(a)} x2={40+38*Math.cos(a)} y2={40+38*Math.sin(a)} stroke="rgba(255,255,255,0.15)" strokeWidth="5" strokeLinecap="round"/>; })}
                  <circle cx="40" cy="40" r="16" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.1)" strokeWidth="1.5"/>
                </svg>
              </div>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: '#fff' }}>BACCARAT</div>
              </div>
            </Link>

            <div onClick={() => { if (soundEnabled) AudioManager.buttonClick(); setShowCpuArena(true); }} style={{ borderRadius: 10, overflow: 'hidden', background: 'linear-gradient(135deg, #1E3A8A, #2563EB)', border: 'none', animation: 'fadeInUp 0.4s ease', minHeight: 72, cursor: 'pointer', position: 'relative' }}>
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
            </div>
          </div>

          {/* NEED CARDS */}
          <div style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}>
              <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#555', animation: 'lockPulse 2s infinite' }} />
              <span style={{ fontSize: 9, fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: 1 }}>{t('homeNeedCards')}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>
              {(() => {
                const raidStyle = {
                  borderRadius: 10, overflow: 'hidden',
                  background: hasEnoughCards ? 'linear-gradient(135deg, #1F2937, #7F1D1D)' : '#1F2937',
                  animation: 'fadeInUp 0.45s ease', minHeight: 72,
                  opacity: hasEnoughCards ? 1 : 0.4,
                  border: 'none',
                  cursor: hasEnoughCards ? 'pointer' : 'not-allowed',
                };
                const lbStyle = {
                  borderRadius: 10, overflow: 'hidden',
                  background: hasEnoughCards ? 'linear-gradient(135deg, #3B1F00, #D97706)' : '#1F2937',
                  border: 'none',
                  animation: 'fadeInUp 0.5s ease', minHeight: 72,
                  opacity: hasEnoughCards ? 1 : 0.4,
                  cursor: hasEnoughCards ? 'pointer' : 'not-allowed',
                };
                return (
                  <>
                  <Link href={hasEnoughCards ? '/raid' : '#'} style={raidStyle as any} onClick={(e) => { if (!hasEnoughCards) e.preventDefault(); }}>
                    <div style={{ padding: '10px 6px', textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', pointerEvents: hasEnoughCards ? 'auto' : 'none' }}>
                      {hasEnoughCards && (
                        <div style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', opacity: 0.35 }}>
                          <svg width="70" height="60" viewBox="0 0 70 60">
                            <g style={{ animation: 'bossDestroy 6s ease-in-out infinite' }}>
                              <circle cx="52" cy="30" r="14" fill="none" stroke="#ef4444" strokeWidth="1"/>
                              <polygon points="44,18 41,11 47,17" fill="#ef4444"/>
                              <polygon points="60,18 63,11 57,17" fill="#ef4444"/>
                              <circle cx="47" cy="28" r="2" fill="#ef4444"/>
                              <circle cx="57" cy="28" r="2" fill="#ef4444"/>
                              <path d="M46,35 L48,38 L50,35 L52,39 L54,35 L56,38 L58,35" fill="none" stroke="#ef4444" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
                            </g>
                            <circle cx="8" cy="8"  r="4" fill="none" stroke="#ef4444" strokeWidth="1"/>
                            <circle cx="5" cy="28" r="3" fill="none" stroke="#ef4444" strokeWidth="1"/>
                            <circle cx="8" cy="48" r="4" fill="none" stroke="#ef4444" strokeWidth="1"/>
                            <line x1="12" y1="8"  x2="37" y2="20" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" style={{ opacity:0, animation:'shot1 6s ease-in-out infinite' }}/>
                            <line x1="8"  y1="28" x2="37" y2="28" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" style={{ opacity:0, animation:'shot2 6s ease-in-out infinite' }}/>
                            <line x1="12" y1="48" x2="37" y2="36" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" style={{ opacity:0, animation:'shot3 6s ease-in-out infinite' }}/>
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
                  <Link href={hasEnoughCards ? '/leaderboard' : '#'} style={lbStyle as any} onClick={(e) => { if (!hasEnoughCards) e.preventDefault(); }}>
                    <div style={{ padding: '10px 6px', textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', pointerEvents: hasEnoughCards ? 'auto' : 'none' }}>
                      {hasEnoughCards && (
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', padding: '4px 10px 6px', overflow: 'hidden' }}>
                          <div style={{ animation: 'lbCard1 5s ease-in-out infinite', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                            <span style={{ fontSize: 9, fontWeight: 900, color: 'rgba(255,215,0,0.55)', animation: 'rank1on1 5s ease-in-out infinite', opacity: 0 }}>#1</span>
                            <svg width="28" height="38" viewBox="0 0 28 38" opacity="0.25">
                              <rect x="0" y="0" width="28" height="38" rx="3" fill="rgba(255,215,0,0.12)" stroke="#fbbf24" strokeWidth="1.2"/>
                              <line x1="4" y1="10" x2="24" y2="10" stroke="#fbbf24" strokeWidth="1"/>
                              <line x1="4" y1="15" x2="17" y2="15" stroke="#fbbf24" strokeWidth="1"/>
                            </svg>
                          </div>
                          <div style={{ animation: 'lbCard2 5s ease-in-out infinite', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                            <span style={{ fontSize: 9, fontWeight: 900, color: 'rgba(255,215,0,0.55)', animation: 'rank1on2 5s ease-in-out infinite', opacity: 0 }}>#1</span>
                            <svg width="28" height="38" viewBox="0 0 28 38" opacity="0.25">
                              <rect x="0" y="0" width="28" height="38" rx="3" fill="rgba(255,215,0,0.12)" stroke="#fbbf24" strokeWidth="1.2"/>
                              <line x1="4" y1="10" x2="24" y2="10" stroke="#fbbf24" strokeWidth="1"/>
                              <line x1="4" y1="15" x2="17" y2="15" stroke="#fbbf24" strokeWidth="1"/>
                            </svg>
                          </div>
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
                  </>
                );
              })()}
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
                <span style={{ fontSize: 7, fontWeight: 600, color: 'rgba(156,163,175,0.5)', textTransform: 'uppercase', letterSpacing: 1.5 }}>{t('yourCards')}</span>
                {cardsLoading ? (
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#FACC15', animation: 'dotPulse 1.2s ease-in-out infinite 0s' }} />
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#FACC15', animation: 'dotPulse 1.2s ease-in-out infinite 0.2s' }} />
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#FACC15', animation: 'dotPulse 1.2s ease-in-out infinite 0.4s' }} />
                  </div>
                ) : (
                  <span style={{ fontSize: 20, fontWeight: 900, color: '#FACC15', lineHeight: 1 }}>{cardCount}</span>
                )}
              </div>
              <span style={{ fontSize: 9, fontWeight: 700, color: 'rgba(156,163,175,0.5)', flexShrink: 0, marginRight: 4 }}>{t('viewAll')}</span>
            </div>
          </div>

          {/* RAFFLE CATEGORY */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 16 }}>
            <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#FFD700', animation: 'pulseGlow 2s infinite' }} />
            <span style={{ fontSize: 9, fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: 1 }}>Raffle</span>
          </div>

          {/* RAFFLE */}
          <Link href="/raffle" style={{ borderRadius: 10, overflow: 'hidden', background: 'linear-gradient(135deg, #FACC15, #B45309)', animation: 'fadeInUp 0.5s ease', minHeight: 50, textDecoration: 'none', position: 'relative' }}>
            {/* Background ticker - pure decoration */}
            <div style={{ position: 'absolute', right: 3, top: 0, bottom: 0, width: 140, overflow: 'hidden', opacity: 0.30, zIndex: 0 }}>

              <div style={{ animation: 'tickerScroll 18s linear infinite', display: 'flex', flexDirection: 'column', gap: 4 }}>
                {((raffleEntries || []) as any[]).map((e) => {
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
                    <span style={{ fontSize: 7, color: 'rgba(0,0,0,0.5)', textTransform: 'uppercase', lineHeight: 1, display: 'block', marginTop: 1, position: 'relative', zIndex: 1 }}>{t('timeLeft')}</span>
                  </>
                ) : (
                  <span style={{ fontSize: 8, fontWeight: 800, color: 'rgba(0,0,0,0.5)', lineHeight: 1, display: 'block', position: 'relative', zIndex: 1 }}>{t('ended')}</span>
                )}
              </div>
            </div>
          </Link>

          {/* Spacer */}
          <div style={{ height: '10px' }} />
          </>
        )}
      </div>

      <MyCardsModal isOpen={showMyCardsModal} onClose={() => setShowMyCardsModal(false)} nfts={nfts} soundEnabled={soundEnabled} />
      {showCoinsInbox && inboxStatus && (
        <CoinsInboxModal inboxStatus={inboxStatus} onClose={() => setShowCoinsInbox(false)} userAddress={address} />
      )}
      <CreateProfileModal
        isOpen={showCreateProfileModal}
        onClose={() => setShowCreateProfileModal(false)}
        address={address}
        profileUsername={profileUsername}
        setProfileUsername={setProfileUsername}
        isCreatingProfile={isCreatingProfile}
        setIsCreatingProfile={setIsCreatingProfile}
        setUserProfile={setUserProfile}
        setCurrentView={() => {}}
        soundEnabled={soundEnabled}
        t={t}
        isInFarcaster={isInFarcaster}
        farcasterUser={farcasterContext.user ? {
          fid: farcasterContext.user.fid,
          username: farcasterContext.user.username || `fid${farcasterContext.user.fid}`,
          displayName: farcasterContext.user.displayName,
          pfpUrl: farcasterContext.user.pfpUrl,
        } : null}
      />
      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        t={t}
        musicEnabled={isMusicEnabled}
        toggleMusic={() => setIsMusicEnabled(!isMusicEnabled)}
        musicVolume={musicVolume}
        setMusicVolume={(v) => { setMusicVolume(v); syncMusicVolume(v); }}
        lang={lang}
        setLang={setLang}
        soundEnabled={soundEnabled}
        musicMode={musicMode}
        setMusicMode={setMusicMode}
        userProfile={userProfile}
        showChangeUsername={showChangeUsername}
        setShowChangeUsername={setShowChangeUsername}
        newUsername={newUsername}
        setNewUsername={setNewUsername}
        isChangingUsername={isChangingUsername}
        setIsChangingUsername={setIsChangingUsername}
        address={address}
        setUserProfile={setUserProfile}
        setErrorMessage={() => {}}
        customMusicUrl={customMusicUrl}
        setCustomMusicUrl={setCustomMusicUrl}
        isCustomMusicLoading={isCustomMusicLoading}
        customMusicError={customMusicError}
        playlist={playlist}
        setPlaylist={setPlaylist}
        addToPlaylist={addToPlaylist}
        removeFromPlaylist={removeFromPlaylist}
        currentPlaylistIndex={currentPlaylistIndex}
        skipToNext={skipToNext}
        skipToPrevious={skipToPrevious}
        currentTrackName={currentTrackName}
        currentTrackThumbnail={currentTrackThumbnail}
        isPaused={isPaused}
        pause={pause}
        play={play}
        disconnectWallet={disconnect}
        onChangelogClick={() => { setShowSettingsModal(false); setShowChangelog(true); }}
        onReportClick={() => { setShowSettingsModal(false); setShowReport(true); }}
        isInFarcaster={isInFarcaster}
      />
      {showChangelog && <ChangelogModal t={t} isOpen onReportBug={() => setShowReport(true)} onClose={() => setShowChangelog(false)} />}
      {showReport && <ReportModal t={t} isOpen onClose={() => setShowReport(false)} address={address} fid={userProfile?.farcasterFid} username={userProfile?.username} currentView="home" farcasterDisplayName={userProfile?.farcasterDisplayName as string | null | undefined} />}
      {showCpuArena && address && <CpuArenaModal isOpen onClose={() => setShowCpuArena(false)} address={address} soundEnabled={soundEnabled} t={t} isInFarcaster={isInFarcaster} />}

      {/* BOTTOM NAV */}
      {!showWalletGate && (
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100, background: '#1E1E1E', borderTop: '2px solid #000', padding: '4px', display: 'flex', alignItems: 'stretch', gap: 0, height: 60 }}>
        {[
          { label: 'HOME',   icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>, onClick: () => router.push('/') },
          { label: 'REDEEM', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="10" width="18" height="12" rx="2"/><path d="M12 10V4"/><path d="M12 4c-2 0-4 2-4 4h4"/><path d="M12 4c2 0 4 2 4 4h-4"/><line x1="12" y1="10" x2="12" y2="22"/><line x1="3" y1="15" x2="21" y2="15"/></svg>, onClick: () => setShowCoinsInbox(true), hasDot: ((inboxStatus?.coinsInbox ?? 0) > 0) || ((inboxStatus?.coins ?? 0) >= 100) },
          { label: 'EARN',   icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>, onClick: () => router.push('/quests'), hasDot: hasClaimableMissions },
          { label: 'SHOP',   icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>, onClick: () => router.push('/shop') },
        ].reduce<React.ReactNode[]>((acc, { label, icon, onClick, hasDot }: any, i, arr) => {
          acc.push(
            <div key={label} onClick={onClick}
              style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, cursor: 'pointer', color: '#FACC15', padding: '4px 2px' }}
            >
              {hasDot && <span style={{ position: 'absolute', top: 4, right: '12%', width: 7, height: 7, borderRadius: '50%', background: '#ef4444', animation: 'redDot 1.2s ease-in-out infinite', zIndex: 10, border: '1px solid #fff' }} />}
              <span style={{ fontSize: 8, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</span>
              {icon}
            </div>
          );
          if (i < arr.length - 1) acc.push(
            <div key={`sep-${i}`} style={{ width: 1.5, background: 'rgba(0,0,0,0.8)', alignSelf: 'stretch', margin: '6px 0' }} />
          );
          return acc;
        }, [])}
      </div>
      )}
    </div>
  );
}
