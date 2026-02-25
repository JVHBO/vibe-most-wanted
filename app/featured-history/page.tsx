"use client";

import { useConvex } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import { useState, useEffect, useRef, useCallback } from "react";

interface AuctionHistoryItem {
  _id: string;
  _creationTime: number;
  winnerAddress?: string;
  winnerUsername?: string;
  winningBid?: number;
  castHash?: string;
  warpcastUrl?: string;
  castAuthorUsername?: string;
  castAuthorPfp?: string;
  castText?: string;
  featureStartsAt?: number;
  featureEndsAt?: number;
  status: string;
  slotNumber?: number;
}

interface CastEngagement {
  likes: number;
  recasts: number;
  replies: number;
}

const PAGE_SIZE = 10;

function formatVbms(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toLocaleString("en-US", { maximumFractionDigits: 3 }) + "M";
  if (n >= 1_000) return (n / 1_000).toLocaleString("en-US", { maximumFractionDigits: 1 }) + "K";
  return n.toLocaleString();
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function SkeletonCard() {
  return (
    <div className="bg-vintage-charcoal rounded-xl border border-vintage-gold/20 p-4 animate-pulse">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-vintage-gold/10" />
          <div className="w-8 h-8 rounded-full bg-vintage-gold/10" />
          <div>
            <div className="h-3 w-24 bg-vintage-gold/10 rounded mb-1" />
            <div className="h-2 w-16 bg-vintage-gold/10 rounded" />
          </div>
        </div>
        <div className="text-right">
          <div className="h-5 w-28 bg-vintage-gold/10 rounded mb-1" />
          <div className="h-2 w-16 bg-vintage-gold/10 rounded ml-auto" />
        </div>
      </div>
      <div className="h-12 bg-vintage-gold/5 rounded-lg mb-3" />
      <div className="flex gap-4">
        <div className="h-3 w-8 bg-vintage-gold/10 rounded" />
        <div className="h-3 w-8 bg-vintage-gold/10 rounded" />
        <div className="h-3 w-8 bg-vintage-gold/10 rounded" />
      </div>
    </div>
  );
}

function PaginationNumbers({
  page,
  totalPages,
  onPage,
}: {
  page: number;
  totalPages: number;
  onPage: (p: number) => void;
}) {
  const pages: (number | "...")[] = [];

  if (totalPages <= 7) {
    for (let i = 0; i < totalPages; i++) pages.push(i);
  } else {
    pages.push(0);
    if (page > 3) pages.push("...");
    for (let i = Math.max(1, page - 1); i <= Math.min(totalPages - 2, page + 1); i++) {
      pages.push(i);
    }
    if (page < totalPages - 4) pages.push("...");
    pages.push(totalPages - 1);
  }

  return (
    <div className="flex items-center gap-1">
      {pages.map((p, i) =>
        p === "..." ? (
          <span key={`ellipsis-${i}`} className="text-vintage-ice text-sm px-1">…</span>
        ) : (
          <button
            key={p}
            onClick={() => onPage(p as number)}
            className={`w-8 h-8 rounded-lg text-sm font-bold transition ${
              page === p
                ? "bg-vintage-gold text-vintage-deep-black"
                : "bg-vintage-charcoal border border-vintage-gold/30 text-vintage-gold hover:border-vintage-gold/60"
            }`}
          >
            {(p as number) + 1}
          </button>
        )
      )}
    </div>
  );
}

export default function FeaturedHistoryPage() {
  const convex = useConvex();
  const [history, setHistory] = useState<AuctionHistoryItem[] | null>(null);
  const [page, setPage] = useState(0);
  const [engagements, setEngagements] = useState<Record<string, CastEngagement>>({});
  const [loadingEng, setLoadingEng] = useState(false);
  const loadedRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // One-time load
  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    convex
      .query(api.castAuctions.getAuctionHistory, { limit: 100 })
      .then((data) => setHistory(data as AuctionHistoryItem[]));
  }, [convex]);

  // Fetch engagements for current page
  useEffect(() => {
    if (!history) return;
    const pageItems = history.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
    const toFetch = pageItems.filter(a => a.warpcastUrl && !engagements[a.castHash || a._id]);
    if (!toFetch.length) return;

    setLoadingEng(true);
    const fetchAll = async () => {
      const newEng: Record<string, CastEngagement> = {};
      await Promise.allSettled(toFetch.map(async (auction) => {
        const key = auction.castHash || auction._id;
        try {
          const res = await fetch(`/api/cast-by-url?url=${encodeURIComponent(auction.warpcastUrl!)}`);
          if (res.ok) {
            const data = await res.json();
            if (data.cast) {
              newEng[key] = {
                likes: data.cast.reactions?.likes_count || 0,
                recasts: data.cast.reactions?.recasts_count || 0,
                replies: data.cast.replies?.count || 0,
              };
            }
          }
        } catch {}
      }));
      if (Object.keys(newEng).length > 0) {
        setEngagements(prev => ({ ...prev, ...newEng }));
      }
      setLoadingEng(false);
    };

    fetchAll();
  }, [history, page]);

  const handlePage = useCallback((p: number) => {
    setPage(p);
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const totalPages = history ? Math.ceil(history.length / PAGE_SIZE) : 0;
  const pageItems = history ? history.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE) : [];

  const totalVbms = history ? history.reduce((sum, a) => sum + (a.winningBid || 0), 0) : 0;
  const uniqueWinners = history ? new Set(history.map(a => a.winnerAddress).filter(Boolean)).size : 0;

  return (
    <div className="h-screen flex flex-col bg-vintage-deep-black overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 border-b-2 border-vintage-gold/30" style={{ background: "#1A1A1A", zIndex: 50 }}>
        <div className="max-w-2xl mx-auto px-3 py-2.5 flex items-center justify-between">
          <Link
            href="/"
            className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white border-2 border-black rounded text-xs font-bold uppercase tracking-wider transition"
            style={{ boxShadow: "2px 2px 0px #000" }}
          >
            ← BACK
          </Link>
          <div className="text-center">
            <h1 className="text-vintage-gold font-bold text-base tracking-wider leading-tight">Hall of Fame</h1>
            <p className="text-vintage-gold/50 text-[10px] tracking-widest uppercase">Wanted Casts</p>
          </div>
          <div className="w-16" />
        </div>
      </div>

      {/* Scrollable content */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-3 py-3">

          {/* Stats */}
          {history && (
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="bg-vintage-charcoal rounded-lg border border-vintage-gold/30 p-2 text-center">
                <p className="text-xl font-bold text-vintage-gold">{history.length}</p>
                <p className="text-vintage-ice text-xs">Winners</p>
              </div>
              <div className="bg-vintage-charcoal rounded-lg border border-vintage-gold/30 p-2 text-center">
                <p className="text-sm font-bold text-vintage-gold leading-tight mt-1">{formatVbms(totalVbms)}</p>
                <p className="text-vintage-ice text-xs">VBMS Spent</p>
              </div>
              <div className="bg-vintage-charcoal rounded-lg border border-vintage-gold/30 p-2 text-center">
                <p className="text-xl font-bold text-vintage-gold">{uniqueWinners}</p>
                <p className="text-vintage-ice text-xs">Unique</p>
              </div>
            </div>
          )}

          {/* Content */}
          {!history ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-4xl mb-3">🏆</p>
              <p className="text-vintage-ice text-lg font-bold">No winners yet</p>
              <p className="text-vintage-ice/60 text-sm mt-1">Be the first to bid on a wanted cast!</p>
              <Link href="/" className="inline-block mt-4 px-4 py-2 bg-vintage-gold text-vintage-deep-black rounded-lg font-bold text-sm">
                Place a Bid
              </Link>
            </div>
          ) : (
            <>
              <div className="space-y-3 mb-4">
                {pageItems.map((auction, idx) => {
                  const globalIdx = page * PAGE_SIZE + idx;
                  const engKey = auction.castHash || auction._id;
                  const eng = engagements[engKey];
                  const isLive = auction.status === "active" || auction.status === "pending_feature";
                  const medal =
                    globalIdx === 0 ? { bg: "bg-yellow-500/20", text: "text-yellow-400", border: "border-yellow-500/50", label: "🥇" }
                    : globalIdx === 1 ? { bg: "bg-gray-400/15", text: "text-gray-300", border: "border-gray-400/50", label: "🥈" }
                    : globalIdx === 2 ? { bg: "bg-orange-600/15", text: "text-orange-400", border: "border-orange-500/50", label: "🥉" }
                    : null;

                  return (
                    <div
                      key={auction._id}
                      className={`bg-vintage-charcoal rounded-xl overflow-hidden transition-all ${
                        isLive ? "border-2 border-green-500/50 shadow-[0_0_12px_rgba(34,197,94,0.15)]" : "border border-vintage-gold/25 hover:border-vintage-gold/45"
                      }`}
                    >
                      <div className="p-3">
                        {/* Top row: rank + author + bid */}
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex items-center gap-2">
                            {/* Rank badge */}
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 border ${
                              medal
                                ? `${medal.bg} ${medal.text} ${medal.border}`
                                : "bg-vintage-charcoal text-vintage-ice border-vintage-gold/20"
                            }`}>
                              {medal ? medal.label : `#${globalIdx + 1}`}
                            </div>

                            {/* Author */}
                            <div className="flex items-center gap-2">
                              {auction.castAuthorPfp ? (
                                <img src={auction.castAuthorPfp} alt="" className="w-8 h-8 rounded-full flex-shrink-0 border border-vintage-gold/30" />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-vintage-gold/10 flex-shrink-0 flex items-center justify-center text-vintage-gold/40 text-xs">?</div>
                              )}
                              <div>
                                <p className="text-vintage-gold font-bold text-xs">@{auction.castAuthorUsername || "unknown"}</p>
                                <p className="text-vintage-ice/60 text-[10px]">Cast author</p>
                              </div>
                            </div>
                          </div>

                          {/* Bid + status */}
                          <div className="text-right flex-shrink-0">
                            <p className="text-vintage-gold font-bold text-base leading-tight">
                              {formatVbms(auction.winningBid || 0)} VBMS
                            </p>
                            {isLive ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-green-500/20 text-green-400 text-[10px] rounded-full border border-green-500/30">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                                LIVE
                              </span>
                            ) : auction.featureEndsAt ? (
                              <p className="text-vintage-ice/60 text-[10px]">{formatDate(auction.featureEndsAt)}</p>
                            ) : null}
                          </div>
                        </div>

                        {/* Cast text */}
                        {auction.castText && (
                          <div className="bg-black/40 rounded-lg px-3 py-2 mb-2 border border-vintage-gold/15">
                            <p className="text-vintage-ice/80 text-xs line-clamp-2 leading-relaxed">
                              &ldquo;{auction.castText}&rdquo;
                            </p>
                          </div>
                        )}

                        {/* Engagement + winner + view */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {eng ? (
                              <>
                                <span className="flex items-center gap-1 text-pink-400 text-[11px]">
                                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                                  {eng.likes}
                                </span>
                                <span className="flex items-center gap-1 text-green-400 text-[11px]">
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                                  {eng.recasts}
                                </span>
                                <span className="flex items-center gap-1 text-blue-400 text-[11px]">
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
                                  {eng.replies}
                                </span>
                              </>
                            ) : loadingEng ? (
                              <span className="text-vintage-ice/40 text-[10px]">loading...</span>
                            ) : (
                              <span className="text-vintage-ice/40 text-[10px]">Winner: @{auction.winnerUsername || "unknown"}</span>
                            )}
                          </div>

                          {auction.warpcastUrl && (
                            <a
                              href={auction.warpcastUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-purple-400 hover:text-purple-300 text-[11px] flex items-center gap-1 transition"
                            >
                              View Cast
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                              </svg>
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex flex-col items-center gap-2 pb-6">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handlePage(Math.max(0, page - 1))}
                      disabled={page === 0}
                      className="px-3 py-1.5 bg-vintage-charcoal border border-vintage-gold/30 text-vintage-gold text-sm rounded-lg disabled:opacity-30 hover:border-vintage-gold/60 transition"
                    >
                      ←
                    </button>
                    <PaginationNumbers page={page} totalPages={totalPages} onPage={handlePage} />
                    <button
                      onClick={() => handlePage(Math.min(totalPages - 1, page + 1))}
                      disabled={page === totalPages - 1}
                      className="px-3 py-1.5 bg-vintage-charcoal border border-vintage-gold/30 text-vintage-gold text-sm rounded-lg disabled:opacity-30 hover:border-vintage-gold/60 transition"
                    >
                      →
                    </button>
                  </div>
                  <p className="text-vintage-ice/50 text-xs">
                    {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, history.length)} of {history.length} entries
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
