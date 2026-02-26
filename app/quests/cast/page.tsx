"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAccount } from "wagmi";
import { useRouter } from "next/navigation";
import LoadingSpinner from "@/components/LoadingSpinner";
import { FeaturedCastAuctions } from "@/components/FeaturedCastAuctions";
import type { NeynarCast } from "@/lib/neynar";
import { useLanguage } from "@/contexts/LanguageContext";
import { AudioManager } from "@/lib/audio-manager";

export default function CastQuestsPage() {
  const router = useRouter();
  const { address, isConnecting } = useAccount();
  const { t } = useLanguage();

  const featuredCasts = useQuery(api.featuredCasts.getActiveCasts);
  const claimCastReward = useMutation(api.featuredCasts.claimCastInteractionReward);

  const profileDashboard = useQuery(
    api.profiles.getProfileDashboard,
    address ? { address: address.toLowerCase() } : "skip"
  );
  const userFid = profileDashboard?.fid;
  const hasVibeBadge = profileDashboard?.hasVibeBadge;
  const castInteractionReward = hasVibeBadge ? 600 : 300;

  const [currentCastIndex, setCurrentCastIndex] = useState(0);
  const [castData, setCastData] = useState<Record<string, NeynarCast>>({});
  const [castInteractionProgress, setCastInteractionProgress] = useState<Record<string, Record<string, boolean>>>({});
  const [verifyingInteraction, setVerifyingInteraction] = useState<string | null>(null);
  const [claimingInteraction, setClaimingInteraction] = useState<string | null>(null);
  const [visitedCastInteractions, setVisitedCastInteractions] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!featuredCasts || featuredCasts.length === 0) return;
    const fetchCasts = async () => {
      const newCastData: Record<string, NeynarCast> = {};
      for (const fc of featuredCasts) {
        if (castData[fc.warpcastUrl]) continue;
        try {
          const response = await fetch(`/api/cast-by-url?url=${encodeURIComponent(fc.warpcastUrl)}`);
          if (response.ok) {
            const data = await response.json();
            if (data.cast) newCastData[fc.warpcastUrl] = data.cast;
          }
        } catch (error) {
          console.error("Error fetching cast:", error);
        }
      }
      if (Object.keys(newCastData).length > 0) {
        setCastData((prev) => ({ ...prev, ...newCastData }));
      }
    };
    fetchCasts();
  }, [featuredCasts]);

  useEffect(() => {
    const currentCast = featuredCasts?.[currentCastIndex];
    if (!currentCast || !address) return;
    const fetchProgress = async () => {
      try {
        const response = await fetch(`/api/cast-interaction/progress?address=${address}&castHash=${currentCast.castHash}`);
        if (response.ok) {
          const data = await response.json();
          setCastInteractionProgress(prev => ({ ...prev, [currentCast.castHash]: data }));
        }
      } catch (e) {
        console.error('Error fetching cast progress:', e);
      }
    };
    fetchProgress();
  }, [featuredCasts, currentCastIndex, address]);

  useEffect(() => {
    if (!featuredCasts || featuredCasts.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentCastIndex(prev => (prev + 1) % featuredCasts.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [featuredCasts]);

  const handleCastInteraction = async (interactionType: "like" | "recast" | "reply") => {
    const currentCast = featuredCasts?.[currentCastIndex];
    if (!currentCast || !userFid || !address) return;
    const key = `${interactionType}-${currentCast.castHash}`;
    if (!visitedCastInteractions.has(key)) {
      window.open(currentCast.warpcastUrl, "_blank");
      setVisitedCastInteractions(prev => new Set([...prev, key]));
      return;
    }
    setVerifyingInteraction(key);
    try {
      const verifyResponse = await fetch("/api/cast-interaction/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ castHash: currentCast.castHash, warpcastUrl: currentCast.warpcastUrl, viewerFid: userFid, interactionType }),
      });
      const verifyData = await verifyResponse.json();
      if (!verifyData.verified) {
        alert(`Please ${interactionType} the cast on Warpcast first!`);
        setVerifyingInteraction(null);
        return;
      }
      setVerifyingInteraction(null);
      setClaimingInteraction(key);
      const result = await claimCastReward({ address: address.toLowerCase(), castHash: currentCast.castHash, interactionType });
      if (result.success) {
        setCastInteractionProgress(prev => ({
          ...prev,
          [currentCast.castHash]: {
            ...prev[currentCast.castHash],
            [interactionType === "like" ? "liked" : interactionType === "recast" ? "recasted" : "replied"]: true,
          }
        }));
      }
    } catch (error) {
      console.error("Error claiming cast reward:", error);
    } finally {
      setVerifyingInteraction(null);
      setClaimingInteraction(null);
    }
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
      <div className="fixed inset-0 bg-vintage-deep-black flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-3xl font-display font-bold text-vintage-gold mb-4">{t('questsWantedCasts')}</h2>
          <p className="text-vintage-ice/70">{t('questsConnectWallet')}</p>
        </div>
      </div>
    );
  }

  const currentCast = featuredCasts?.[currentCastIndex];
  const currentCastData = currentCast ? castData[currentCast.warpcastUrl] : null;

  return (
    <div className="fixed inset-0 bg-vintage-deep-black overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-vintage-charcoal via-vintage-deep-black to-black" />

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-20 bg-vintage-charcoal/90 border-b-2 border-vintage-gold/40 backdrop-blur-sm">
        <div className="flex items-center justify-between px-3 py-2.5">
          <button
            onClick={() => router.push("/")}
            className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white border-2 border-black rounded text-xs font-bold uppercase tracking-wider"
            style={{ boxShadow: "2px 2px 0px #000" }}
          >
            ← BACK
          </button>
          <h1 className="text-xl font-display font-bold text-vintage-gold tracking-wider">{t('questsTitle')}</h1>
          <div className="w-20" />
        </div>

        {/* Tabs */}
        <div className="flex border-t border-vintage-gold/20">
          <button
            onClick={() => router.push("/quests")}
            className="flex-1 py-2.5 text-sm font-bold text-white/70 hover:text-white transition-colors border-r border-vintage-gold/30"
          >
            {t('questsMissions')}
          </button>
          <button className="flex-1 py-2.5 text-sm font-bold text-vintage-gold border-b-2 border-vintage-gold bg-vintage-gold/10">
            {t('questsWantedCasts')}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="absolute inset-0 pt-24 pb-4 overflow-y-auto">
        <div className="relative z-10 px-3 py-2 max-w-md mx-auto space-y-3">

          {/* Featured Cast Card */}
          {featuredCasts && featuredCasts.length > 0 && currentCast && (
            <div className="bg-[#1e1e1e] border border-zinc-700 rounded-xl overflow-hidden">

              {/* Post header */}
              <div className="flex items-start gap-3 px-4 pt-4 pb-2">
                {currentCastData?.author.pfp_url
                  ? <img src={currentCastData.author.pfp_url} alt="" className="w-10 h-10 rounded-full flex-shrink-0" />
                  : <div className="w-10 h-10 rounded-full bg-zinc-700 flex-shrink-0" />
                }
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-white font-bold text-sm truncate">
                        {currentCastData?.author.display_name || currentCastData?.author.username || "..."}
                      </span>
                      <span className="text-zinc-500 text-xs flex-shrink-0">
                        @{currentCastData?.author.username}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {currentCastData?.timestamp && (
                        <span className="text-zinc-500 text-xs">
                          {(() => {
                            const s = Math.floor((Date.now() - new Date(currentCastData.timestamp).getTime()) / 1000);
                            if (s < 60) return `${s}s`;
                            if (s < 3600) return `${Math.floor(s/60)}m`;
                            if (s < 86400) return `${Math.floor(s/3600)}h`;
                            return `${Math.floor(s/86400)}d`;
                          })()}
                        </span>
                      )}
                      {featuredCasts.length > 1 && (
                        <>
                          <button onClick={() => { AudioManager.buttonClick(); setCurrentCastIndex((currentCastIndex - 1 + featuredCasts.length) % featuredCasts.length); }} className="text-zinc-400 hover:text-white text-xs px-1">←</button>
                          <span className="text-zinc-600 text-[10px]">{currentCastIndex + 1}/{featuredCasts.length}</span>
                          <button onClick={() => { AudioManager.buttonClick(); setCurrentCastIndex((currentCastIndex + 1) % featuredCasts.length); }} className="text-zinc-400 hover:text-white text-xs px-1">→</button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Post text */}
              {currentCastData && (
                <p className="text-zinc-200 text-sm px-4 pb-3 leading-relaxed">
                  {currentCastData.text}
                </p>
              )}

              {/* Embed image */}
              {currentCastData?.embeds?.[0] && (() => {
                const embed = currentCastData.embeds[0];
                const imgUrl = embed.metadata?.image?.url || (embed.url?.match(/\.(jpg|jpeg|png|gif|webp)/i) ? embed.url : null);
                return imgUrl ? (
                  <div className="px-4 pb-3">
                    <img src={imgUrl} alt="" className="w-full rounded-xl max-h-52 object-cover border border-zinc-700" />
                  </div>
                ) : null;
              })()}

              {/* Stats row */}
              {currentCastData && (
                <div className="flex items-center gap-4 px-4 py-2 border-t border-zinc-800">
                  <span className="flex items-center gap-1 text-xs text-zinc-500">
                    <svg className="w-3.5 h-3.5 text-pink-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                    {currentCastData.reactions?.likes_count || 0}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-zinc-500">
                    <svg className="w-3.5 h-3.5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    {currentCastData.reactions?.recasts_count || 0}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-zinc-500">
                    <svg className="w-3.5 h-3.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                    {currentCastData.replies?.count || 0}
                  </span>
                  <a href={currentCast.warpcastUrl} target="_blank" rel="noopener noreferrer"
                    onClick={() => AudioManager.buttonClick()}
                    className="ml-auto text-zinc-500 hover:text-white text-xs transition-colors">
                    {t('questsView')} →
                  </a>
                </div>
              )}

              {/* Interaction buttons */}
              {userFid ? (
                <div className="grid grid-cols-3 divide-x divide-vintage-gold/30 border-t border-vintage-gold/30">
                  {[
                    { type: "like" as const, label: "Like", icon: (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                    ), color: "text-pink-400", activeBg: "bg-pink-900/40", hoverBg: "hover:bg-pink-500/20" },
                    { type: "recast" as const, label: "Recast", icon: (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    ), color: "text-green-400", activeBg: "bg-green-900/40", hoverBg: "hover:bg-green-500/20" },
                    { type: "reply" as const, label: "Reply", icon: (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                    ), color: "text-blue-400", activeBg: "bg-blue-900/40", hoverBg: "hover:bg-blue-500/20" },
                  ].map(({ type, label, icon, color, activeBg, hoverBg }) => {
                    const progress = castInteractionProgress[currentCast.castHash];
                    const claimed = progress?.[type === "like" ? "liked" : type === "recast" ? "recasted" : "replied"];
                    const isVerifyingThis = verifyingInteraction === `${type}-${currentCast.castHash}`;
                    const isClaimingThis = claimingInteraction === `${type}-${currentCast.castHash}`;

                    return (
                      <button
                        key={type}
                        onClick={() => { AudioManager.buttonClick(); handleCastInteraction(type); }}
                        onMouseEnter={() => AudioManager.buttonHover()}
                        disabled={claimed || isVerifyingThis || isClaimingThis}
                        className={`flex flex-col items-center justify-center py-3.5 gap-1.5 transition-colors disabled:cursor-not-allowed ${claimed ? activeBg : hoverBg}`}
                      >
                        <span className={claimed ? "text-green-400" : color}>{icon}</span>
                        <span className={`text-[11px] font-bold ${claimed ? "text-green-400" : "text-vintage-gold"}`}>
                          {isVerifyingThis || isClaimingThis ? "..." : claimed ? t('questsDone') : `+${castInteractionReward}`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="px-3 py-2 text-center">
                  <p className="text-vintage-gold text-xs">{t('questsConnectFarcasterEarn')}</p>
                </div>
              )}
            </div>
          )}

          {/* Cast Auctions */}
          {address && (
            <FeaturedCastAuctions
              address={address}
              userFid={userFid ? Number(userFid) : undefined}
              soundEnabled={true}
            />
          )}

          {!userFid && (
            <div className="bg-vintage-gold/5 border border-vintage-gold/20 rounded-lg p-3 text-center">
              <p className="text-vintage-gold text-xs">{t('questsConnectFarcasterEarn')}</p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
