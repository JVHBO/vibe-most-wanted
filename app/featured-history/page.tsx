"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Doc } from "@/convex/_generated/dataModel";
import Link from "next/link";
import { useState, useEffect } from "react";

type AuctionDoc = Doc<"castAuctions">;

interface CastEngagement {
  likes: number;
  recasts: number;
  replies: number;
}

export default function FeaturedHistoryPage() {
  const history = useQuery(api.castAuctions.getAuctionHistory, { limit: 100 });
  const [engagements, setEngagements] = useState<Record<string, CastEngagement>>({});

  // Fetch engagement data for all casts
  useEffect(() => {
    if (!history || history.length === 0) return;

    const fetchEngagements = async () => {
      const newEngagements: Record<string, CastEngagement> = {};

      for (const auction of history) {
        if (!auction.warpcastUrl || engagements[auction.castHash || '']) continue;

        try {
          const response = await fetch(`/api/cast-by-url?url=${encodeURIComponent(auction.warpcastUrl)}`);
          if (response.ok) {
            const data = await response.json();
            if (data.cast) {
              newEngagements[auction.castHash || auction._id] = {
                likes: data.cast.reactions?.likes_count || data.cast.reactions?.likes || 0,
                recasts: data.cast.reactions?.recasts_count || data.cast.reactions?.recasts || 0,
                replies: data.cast.replies?.count || 0,
              };
            }
          }
        } catch (e) {
          console.error('Failed to fetch cast engagement:', e);
        }
      }

      setEngagements(prev => ({ ...prev, ...newEngagements }));
    };

    fetchEngagements();
  }, [history]);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-vintage-deep-black">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-vintage-charcoal/95 backdrop-blur-sm border-b border-vintage-gold/30">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-vintage-gold hover:text-vintage-gold/80 transition-colors"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
              </svg>
            </Link>
            <h1 className="text-vintage-gold font-bold text-xl">
              Wanted Cast Hall of Fame
            </h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mb-6">
          <div className="bg-vintage-charcoal rounded-lg border border-vintage-gold/30 p-2 text-center">
            <p className="text-lg font-bold text-vintage-gold">
              {history?.length || 0}
            </p>
            <p className="text-vintage-ice text-xs">Winners</p>
          </div>
          <div className="bg-vintage-charcoal rounded-lg border border-vintage-gold/30 p-2 text-center">
            <p className="text-lg font-bold text-vintage-gold">
              {history
                ?.reduce((sum: number, a: AuctionDoc) => sum + (a.winningBid || 0), 0)
                .toLocaleString() || 0}
            </p>
            <p className="text-vintage-ice text-xs">VBMS Spent</p>
          </div>
          <div className="bg-vintage-charcoal rounded-lg border border-vintage-gold/30 p-2 text-center">
            <p className="text-lg font-bold text-vintage-gold">
              {new Set(history?.map((a: AuctionDoc) => a.winnerAddress)).size || 0}
            </p>
            <p className="text-vintage-ice text-xs">Unique</p>
          </div>
        </div>

        {/* History List */}
        {!history ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin w-8 h-8 border-2 border-vintage-gold border-t-transparent rounded-full" />
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-20">
            <svg
              className="w-16 h-16 mx-auto text-vintage-gold/50 mb-4"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
            </svg>
            <p className="text-vintage-ice text-lg">
              No wanted casts yet
            </p>
            <p className="text-vintage-ice text-sm mt-2">
              Be the first to bid on a wanted cast!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {history.map((auction: AuctionDoc, index: number) => (
              <div
                key={auction._id}
                className="bg-vintage-charcoal rounded-xl border border-vintage-gold/30 overflow-hidden hover:border-vintage-gold/50 transition-all"
              >
                <div className="p-4">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex items-center gap-3">
                      {/* Rank Badge */}
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                          index === 0
                            ? "bg-yellow-500/20 text-yellow-400 border-2 border-yellow-500/50"
                            : index === 1
                            ? "bg-gray-400/20 text-gray-300 border-2 border-gray-400/50"
                            : index === 2
                            ? "bg-orange-600/20 text-orange-400 border-2 border-orange-500/50"
                            : "bg-vintage-charcoal text-vintage-ice border border-vintage-gold/20"
                        }`}
                      >
                        #{index + 1}
                      </div>

                      {/* Cast Author */}
                      <div className="flex items-center gap-2">
                        {auction.castAuthorPfp && (
                          <img
                            src={auction.castAuthorPfp}
                            alt=""
                            className="w-8 h-8 rounded-full"
                          />
                        )}
                        <div>
                          <p className="text-vintage-gold font-bold text-sm">
                            @{auction.castAuthorUsername || "unknown"}
                          </p>
                          <p className="text-vintage-ice text-xs">
                            Cast author
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Winning Bid + Status */}
                    <div className="text-right">
                      <p className="text-vintage-gold font-bold text-lg">
                        {auction.winningBid?.toLocaleString()} VBMS
                      </p>
                      {auction.status === "active" ? (
                        <span className="inline-block px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full border border-green-500/30">
                          LIVE
                        </span>
                      ) : (
                        <p className="text-vintage-ice text-xs">
                          Completed
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Cast Text */}
                  {auction.castText && (
                    <div className="bg-vintage-black/80 rounded-lg p-3 mb-3 border border-vintage-gold/20">
                      <p className="text-vintage-ice text-sm line-clamp-2">
                        "{auction.castText}"
                      </p>
                    </div>
                  )}

                  {/* Engagement Stats */}
                  {engagements[auction.castHash || auction._id] && (
                    <div className="flex items-center gap-4 mb-3 text-xs">
                      <span className="flex items-center gap-1 text-pink-400">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                        {engagements[auction.castHash || auction._id].likes}
                      </span>
                      <span className="flex items-center gap-1 text-green-400">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                        {engagements[auction.castHash || auction._id].recasts}
                      </span>
                      <span className="flex items-center gap-1 text-blue-400">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                        {engagements[auction.castHash || auction._id].replies}
                      </span>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-vintage-ice text-xs">
                        Winner:
                      </span>
                      <span className="text-vintage-gold text-sm font-medium">
                        @{auction.winnerUsername || "unknown"}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      {auction.featureEndsAt && (
                        <span className="text-vintage-ice text-xs">
                          {formatDate(auction.featureEndsAt)}
                        </span>
                      )}
                      {auction.warpcastUrl && (
                        <a
                          href={auction.warpcastUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-purple-400 hover:text-purple-300 text-xs flex items-center gap-1"
                        >
                          View Cast
                          <svg
                            className="w-3 h-3"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                            />
                          </svg>
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
