"use client";

import { useConvex } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Doc } from "@/convex/_generated/dataModel";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";

type AuctionDoc = Doc<"castAuctions">;

const PAGE_SIZE = 10;

interface CastEngagement {
  likes: number;
  recasts: number;
  replies: number;
}

export default function FeaturedHistoryPage() {
  const convex = useConvex();
  const [history, setHistory] = useState<AuctionDoc[] | null>(null);
  const [page, setPage] = useState(0);
  const [engagements, setEngagements] = useState<Record<string, CastEngagement>>({});
  const loadedRef = useRef(false);

  // One-time load — no persistent subscription
  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    convex.query(api.castAuctions.getAuctionHistory, { limit: 50 }).then(setHistory);
  }, [convex]);

  // Fetch engagements for current page only
  useEffect(() => {
    if (!history) return;
    const pageItems = history.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

    const fetchEngagements = async () => {
      const newEngagements: Record<string, CastEngagement> = {};
      await Promise.all(pageItems.map(async (auction) => {
        const key = auction.castHash || auction._id;
        if (!auction.warpcastUrl || engagements[key]) return;
        try {
          const res = await fetch(`/api/cast-by-url?url=${encodeURIComponent(auction.warpcastUrl)}`);
          if (res.ok) {
            const data = await res.json();
            if (data.cast) {
              newEngagements[key] = {
                likes: data.cast.reactions?.likes_count || 0,
                recasts: data.cast.reactions?.recasts_count || 0,
                replies: data.cast.replies?.count || 0,
              };
            }
          }
        } catch {}
      }));
      if (Object.keys(newEngagements).length > 0) {
        setEngagements(prev => ({ ...prev, ...newEngagements }));
      }
    };

    fetchEngagements();
  }, [history, page]);

  const formatDate = (timestamp: number) =>
    new Date(timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  const totalPages = history ? Math.ceil(history.length / PAGE_SIZE) : 0;
  const pageItems = history ? history.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE) : [];

  return (
    <div className="h-screen flex flex-col bg-vintage-deep-black overflow-hidden">
      {/* Sticky header */}
      <div className="flex-shrink-0 border-b-2 border-vintage-gold/30" style={{ background: "#1A1A1A", zIndex: 50 }}>
        <div className="max-w-4xl mx-auto px-3 py-2.5 flex items-center justify-between">
          <Link
            href="/"
            className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white border-2 border-black rounded text-xs font-bold uppercase tracking-wider transition"
            style={{ boxShadow: "2px 2px 0px #000" }}
          >
            ← BACK
          </Link>
          <h1 className="text-vintage-gold font-bold text-lg tracking-wider">Hall of Fame</h1>
          <div className="w-16" />
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-4">

          {/* Stats */}
          {history && (
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="bg-vintage-charcoal rounded-lg border border-vintage-gold/30 p-2 text-center">
                <p className="text-lg font-bold text-vintage-gold">{history.length}</p>
                <p className="text-vintage-ice text-xs">Winners</p>
              </div>
              <div className="bg-vintage-charcoal rounded-lg border border-vintage-gold/30 p-2 text-center">
                <p className="text-lg font-bold text-vintage-gold">
                  {history.reduce((sum, a) => sum + (a.winningBid || 0), 0).toLocaleString()}
                </p>
                <p className="text-vintage-ice text-xs">VBMS Spent</p>
              </div>
              <div className="bg-vintage-charcoal rounded-lg border border-vintage-gold/30 p-2 text-center">
                <p className="text-lg font-bold text-vintage-gold">
                  {new Set(history.map((a) => a.winnerAddress)).size}
                </p>
                <p className="text-vintage-ice text-xs">Unique</p>
              </div>
            </div>
          )}

          {/* Loading */}
          {!history ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin w-8 h-8 border-2 border-vintage-gold border-t-transparent rounded-full" />
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-vintage-ice text-lg">No wanted casts yet</p>
              <p className="text-vintage-ice text-sm mt-2">Be the first to bid on a wanted cast!</p>
            </div>
          ) : (
            <>
              {/* List */}
              <div className="space-y-4 mb-4">
                {pageItems.map((auction, idx) => {
                  const globalIdx = page * PAGE_SIZE + idx;
                  const engKey = auction.castHash || auction._id;
                  const eng = engagements[engKey];
                  return (
                    <div
                      key={auction._id}
                      className="bg-vintage-charcoal rounded-xl border border-vintage-gold/30 overflow-hidden hover:border-vintage-gold/50 transition-all"
                    >
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                              globalIdx === 0 ? "bg-yellow-500/20 text-yellow-400 border-2 border-yellow-500/50"
                              : globalIdx === 1 ? "bg-gray-400/20 text-gray-300 border-2 border-gray-400/50"
                              : globalIdx === 2 ? "bg-orange-600/20 text-orange-400 border-2 border-orange-500/50"
                              : "bg-vintage-charcoal text-vintage-ice border border-vintage-gold/20"
                            }`}>
                              #{globalIdx + 1}
                            </div>
                            <div className="flex items-center gap-2">
                              {auction.castAuthorPfp && (
                                <img src={auction.castAuthorPfp} alt="" className="w-8 h-8 rounded-full" />
                              )}
                              <div>
                                <p className="text-vintage-gold font-bold text-sm">@{auction.castAuthorUsername || "unknown"}</p>
                                <p className="text-vintage-ice text-xs">Cast author</p>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-vintage-gold font-bold text-lg">
                              {auction.winningBid?.toLocaleString()} VBMS
                            </p>
                            {auction.status === "active" ? (
                              <span className="inline-block px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full border border-green-500/30">LIVE</span>
                            ) : (
                              <p className="text-vintage-ice text-xs">Completed</p>
                            )}
                          </div>
                        </div>

                        {auction.castText && (
                          <div className="bg-vintage-black/80 rounded-lg p-3 mb-3 border border-vintage-gold/20">
                            <p className="text-vintage-ice text-sm line-clamp-2">"{auction.castText}"</p>
                          </div>
                        )}

                        {eng && (
                          <div className="flex items-center gap-4 mb-3 text-xs">
                            <span className="flex items-center gap-1 text-pink-400">
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                              {eng.likes}
                            </span>
                            <span className="flex items-center gap-1 text-green-400">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                              {eng.recasts}
                            </span>
                            <span className="flex items-center gap-1 text-blue-400">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
                              {eng.replies}
                            </span>
                          </div>
                        )}

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-vintage-ice text-xs">Winner:</span>
                            <span className="text-vintage-gold text-sm font-medium">@{auction.winnerUsername || "unknown"}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            {auction.featureEndsAt && (
                              <span className="text-vintage-ice text-xs">{formatDate(auction.featureEndsAt)}</span>
                            )}
                            {auction.warpcastUrl && (
                              <a href={auction.warpcastUrl} target="_blank" rel="noopener noreferrer"
                                className="text-purple-400 hover:text-purple-300 text-xs flex items-center gap-1">
                                View Cast
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                                </svg>
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-3 pb-6">
                  <button
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="px-4 py-2 bg-vintage-charcoal border border-vintage-gold/30 text-vintage-gold text-sm rounded-lg disabled:opacity-30 hover:border-vintage-gold/60 transition"
                  >
                    ← Prev
                  </button>
                  <span className="text-vintage-ice text-sm">
                    {page + 1} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                    disabled={page === totalPages - 1}
                    className="px-4 py-2 bg-vintage-charcoal border border-vintage-gold/30 text-vintage-gold text-sm rounded-lg disabled:opacity-30 hover:border-vintage-gold/60 transition"
                  >
                    Next →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
