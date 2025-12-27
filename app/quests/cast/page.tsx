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

export default function CastQuestsPage() {
  const router = useRouter();
  const { address, isConnecting } = useAccount();
  const { t } = useLanguage();

  // Featured Casts
  const featuredCasts = useQuery(api.featuredCasts.getActiveCasts);
  const claimCastReward = useMutation(api.featuredCasts.claimCastInteractionReward);

  // Get user FID from profile
  const profile = useQuery(
    api.profiles.getProfile,
    address ? { address: address.toLowerCase() } : "skip"
  );
  const userFid = profile?.fid;
  const hasVibeBadge = profile?.hasVibeBadge;
  const castInteractionReward = hasVibeBadge ? 600 : 300;

  // State
  const [currentCastIndex, setCurrentCastIndex] = useState(0);
  const [castData, setCastData] = useState<Record<string, NeynarCast>>({});
  const [castInteractionProgress, setCastInteractionProgress] = useState<Record<string, Record<string, boolean>>>({});
  const [verifyingInteraction, setVerifyingInteraction] = useState<string | null>(null);
  const [claimingInteraction, setClaimingInteraction] = useState<string | null>(null);
  const [visitedCastInteractions, setVisitedCastInteractions] = useState<Set<string>>(new Set());

  // Fetch cast data
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

  // Fetch cast interaction progress
  useEffect(() => {
    const currentCast = featuredCasts?.[currentCastIndex];
    if (!currentCast || !address) return;

    const fetchProgress = async () => {
      try {
        const response = await fetch(`/api/cast-interaction/progress?address=${address}&castHash=${currentCast.castHash}`);
        if (response.ok) {
          const data = await response.json();
          setCastInteractionProgress(prev => ({
            ...prev,
            [currentCast.castHash]: data
          }));
        }
      } catch (e) {
        console.error('Error fetching cast progress:', e);
      }
    };
    fetchProgress();
  }, [featuredCasts, currentCastIndex, address]);

  // Auto-rotate cast carousel
  useEffect(() => {
    if (!featuredCasts || featuredCasts.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentCastIndex(prev => (prev + 1) % featuredCasts.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [featuredCasts]);

  // Cast interaction handler
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
        body: JSON.stringify({
          castHash: currentCast.castHash,
          warpcastUrl: currentCast.warpcastUrl,
          viewerFid: userFid,
          interactionType,
        }),
      });
      const verifyData = await verifyResponse.json();

      if (!verifyData.verified) {
        alert(`Please ${interactionType} the cast on Warpcast first!`);
        setVerifyingInteraction(null);
        return;
      }

      setVerifyingInteraction(null);
      setClaimingInteraction(key);

      const result = await claimCastReward({
        address: address.toLowerCase(),
        castHash: currentCast.castHash,
        interactionType,
      });

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
      <div className="fixed inset-0 bg-vintage-deep-black overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-vintage-charcoal via-vintage-deep-black to-vintage-charcoal/50" />
        <div className="relative z-10 flex items-center justify-center h-full">
          <div className="text-center">
            <h2 className="text-3xl font-display font-bold text-vintage-gold mb-4">{t('questsWantedCasts')}</h2>
            <p className="text-vintage-ice/70">{t('questsConnectWallet')}</p>
          </div>
        </div>
      </div>
    );
  }

  const currentCast = featuredCasts?.[currentCastIndex];
  const currentCastData = currentCast ? castData[currentCast.warpcastUrl] : null;

  return (
    <div className="fixed inset-0 bg-vintage-deep-black overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-vintage-charcoal via-vintage-deep-black to-vintage-charcoal/50" />

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 p-3">
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push("/")}
            className="group px-3 py-2 bg-black/50 hover:bg-vintage-gold/10 text-vintage-ice hover:text-vintage-gold border border-vintage-gold/20 hover:border-vintage-gold/50 rounded transition-all duration-200 text-xs font-bold uppercase tracking-wider"
          >
            <span className="group-hover:-translate-x-0.5 inline-block transition-transform">←</span> {t('questsHome')}
          </button>

          <h1 className="text-2xl font-display font-bold text-vintage-gold tracking-wider">{t('questsTitle')}</h1>

          <div className="w-20" />
        </div>
      </div>

      {/* Tabs */}
      <div className="absolute top-14 left-0 right-0 z-10 px-3 py-2">
        <div className="flex gap-2 max-w-md mx-auto">
          <button
            onClick={() => router.push("/quests")}
            className="flex-1 py-2 px-3 rounded-lg font-bold text-sm transition-all bg-vintage-charcoal/30 border border-vintage-gold/20 text-vintage-ice/70"
          >
            {t('questsMissions')}
          </button>
          <button
            className="flex-1 py-2 px-3 rounded-lg font-bold text-sm transition-all bg-vintage-gold/20 border border-vintage-gold/50 text-vintage-gold"
          >
            {t('questsWantedCasts')}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="absolute inset-0 pt-28 pb-4 overflow-hidden">
        <div className="relative z-10 px-4 py-2 max-w-md mx-auto h-full flex flex-col">
          <div className="space-y-2">
            {/* Featured cast with interactions - Compact */}
            {featuredCasts && featuredCasts.length > 0 && currentCast && (
              <div className="bg-vintage-charcoal/50 border border-vintage-gold/30 rounded-xl p-3">
                {/* Cast carousel dots + author row */}
                <div className="flex items-center gap-2 mb-2">
                  {currentCastData?.author.pfp_url && (
                    <img
                      src={currentCastData.author.pfp_url}
                      alt=""
                      className="w-8 h-8 rounded-full border border-vintage-gold/30"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-vintage-ice font-bold text-sm truncate">
                      {currentCastData?.author.display_name || currentCastData?.author.username || "Loading..."}
                    </p>
                  </div>
                  {/* Carousel dots */}
                  {featuredCasts.length > 1 && (
                    <div className="flex gap-1">
                      {featuredCasts.map((_: any, idx: number) => (
                        <button
                          key={idx}
                          onClick={() => setCurrentCastIndex(idx)}
                          className={`w-2 h-2 rounded-full transition-all ${
                            idx === currentCastIndex ? "bg-vintage-gold" : "bg-vintage-gold/30"
                          }`}
                        />
                      ))}
                    </div>
                  )}
                  <a
                    href={currentCast.warpcastUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-vintage-gold hover:text-vintage-gold/80 text-xs"
                  >
                    {t('questsView')}
                  </a>
                </div>

                {/* Cast text - compact */}
                {currentCastData && (
                  <p className="text-vintage-ice/80 text-xs line-clamp-2 mb-2">{currentCastData.text}</p>
                )}

                {/* Engagement stats */}
                {currentCastData && (
                  <div className="flex items-center gap-3 mb-2 text-[10px] text-vintage-ice/50">
                    <span className="flex items-center gap-1">
                      <svg className="w-3 h-3 text-pink-400" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                      </svg>
                      {currentCastData.reactions?.likes_count || 0}
                    </span>
                    <span className="flex items-center gap-1">
                      <svg className="w-3 h-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      {currentCastData.reactions?.recasts_count || 0}
                    </span>
                    <span className="flex items-center gap-1">
                      <svg className="w-3 h-3 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      {currentCastData.replies?.count || 0}
                    </span>
                  </div>
                )}

                {/* Interaction buttons - inline */}
                {userFid && (
                  <div className="flex gap-2">
                    {[
                      { type: "like" as const, label: "Like", color: "pink" },
                      { type: "recast" as const, label: "Recast", color: "green" },
                      { type: "reply" as const, label: "Reply", color: "blue" },
                    ].map(({ type, label, color }) => {
                      const progress = castInteractionProgress[currentCast.castHash];
                      const claimed = progress?.[type === "like" ? "liked" : type === "recast" ? "recasted" : "replied"];
                      const isVerifyingThis = verifyingInteraction === `${type}-${currentCast.castHash}`;
                      const isClaimingThis = claimingInteraction === `${type}-${currentCast.castHash}`;

                      return (
                        <button
                          key={type}
                          onClick={() => handleCastInteraction(type)}
                          disabled={claimed || isVerifyingThis || isClaimingThis}
                          className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg border transition-all text-xs ${
                            claimed
                              ? "bg-green-900/30 border-green-500/50"
                              : "bg-vintage-black/30 border-vintage-gold/20 hover:border-vintage-gold/50"
                          } disabled:cursor-not-allowed`}
                        >
                          {type === "like" && (
                            <svg className={`w-4 h-4 ${claimed ? "text-green-400" : "text-pink-400"}`} fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                            </svg>
                          )}
                          {type === "recast" && (
                            <svg className={`w-4 h-4 ${claimed ? "text-green-400" : "text-green-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                          )}
                          {type === "reply" && (
                            <svg className={`w-4 h-4 ${claimed ? "text-green-400" : "text-blue-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                          )}
                          <span className={`font-bold ${claimed ? "text-green-400" : "text-vintage-gold"}`}>
                            {isVerifyingThis || isClaimingThis ? "..." : claimed ? t('questsDone') : `+${castInteractionReward}`}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Cast Auctions - Compact */}
            {address && (
              <FeaturedCastAuctions
                address={address}
                userFid={userFid ? Number(userFid) : undefined}
                soundEnabled={true}
              />
            )}

            {!userFid && (
              <div className="bg-vintage-gold/5 border border-vintage-gold/20 rounded-lg p-3">
                <p className="text-vintage-gold text-xs text-center">{t('questsConnectFarcasterEarn')}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
