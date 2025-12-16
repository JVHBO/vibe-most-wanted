"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { AudioManager } from "@/lib/audio-manager";
import Link from "next/link";
import { Doc } from "@/convex/_generated/dataModel";

type AuctionDoc = Doc<"castAuctions">;
type BidDoc = Doc<"castAuctionBids">;

const MAX_BID = 120000;

interface FeaturedCastAuctionsProps {
  address: string;
  userFid?: number;
  soundEnabled?: boolean;
  onBidPlaced?: (amount: number) => void;
}

interface CastPreview {
  hash: string;
  text: string;
  author: {
    fid: number;
    username: string;
    displayName: string;
    pfpUrl: string;
  };
  timestamp: string;
  reactions: { likes: number; recasts: number };
  replies: number;
  imageUrl?: string;
}

export function FeaturedCastAuctions({
  address,
  userFid,
  soundEnabled = true,
  onBidPlaced,
}: FeaturedCastAuctionsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [castUrl, setCastUrl] = useState("");
  const [bidAmount, setBidAmount] = useState("");
  const [castPreview, setCastPreview] = useState<CastPreview | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isBidding, setIsBidding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Queries
  const auctionStates = useQuery(api.castAuctions.getAllAuctionStates);
  const currentBidders = useQuery(api.castAuctions.getCurrentBidders, {});

  // Get player balance from profile
  const profile = useQuery(api.profiles.getProfile, address ? { address } : "skip");
  const userBalance = profile?.coins || 0;

  // Mutation
  const placeBid = useMutation(api.castAuctions.placeBid);

  // Get current auction (the one ending soonest)
  const currentAuction = auctionStates?.bidding?.sort(
    (a: AuctionDoc, b: AuctionDoc) => a.auctionEndsAt - b.auctionEndsAt
  )[0];

  // Calculate minimum bid
  const getMinimumBid = () => {
    if (!currentAuction || currentAuction.currentBid === 0) return 10000;
    return Math.max(
      currentAuction.currentBid + 1000,
      Math.ceil(currentAuction.currentBid * 1.1)
    );
  };

  // Validate cast URL
  const handleValidateCast = async () => {
    if (!castUrl.trim()) {
      setError("Enter a cast URL");
      return;
    }

    setIsValidating(true);
    setError(null);
    setCastPreview(null);

    try {
      const response = await fetch("/api/cast-auction/validate-cast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ warpcastUrl: castUrl }),
      });

      const data = await response.json();

      if (!data.valid) {
        setError(data.error || "Invalid cast");
        return;
      }

      setCastPreview(data.cast);
      if (soundEnabled) AudioManager.buttonClick();
    } catch (e) {
      setError("Failed to validate cast");
    } finally {
      setIsValidating(false);
    }
  };

  // Place bid
  const handlePlaceBid = async () => {
    if (!currentAuction || !castPreview || !bidAmount) return;

    const amount = parseInt(bidAmount);
    const minimum = getMinimumBid();

    if (isNaN(amount) || amount < minimum) {
      setError(`Minimum bid is ${minimum.toLocaleString()} VBMS`);
      return;
    }

    if (amount > MAX_BID) {
      setError(`Maximum bid is ${MAX_BID.toLocaleString()} VBMS`);
      return;
    }

    if (amount > userBalance) {
      setError(`Insufficient balance. You have ${userBalance.toLocaleString()} VBMS`);
      return;
    }

    setIsBidding(true);
    setError(null);

    try {
      const result = await placeBid({
        address,
        slotNumber: currentAuction.slotNumber,
        bidAmount: amount,
        castHash: castPreview.hash,
        warpcastUrl: castUrl,
        castAuthorFid: castPreview.author.fid,
        castAuthorUsername: castPreview.author.username,
        castAuthorPfp: castPreview.author.pfpUrl,
        castText: castPreview.text,
      });

      if (result.success) {
        setSuccess(`Bid placed! ${amount.toLocaleString()} VBMS`);
        setBidAmount("");
        setCastUrl("");
        setCastPreview(null);
        setIsExpanded(false);
        if (soundEnabled) AudioManager.win();
        onBidPlaced?.(amount);
      }
    } catch (e: any) {
      setError(e.message || "Failed to place bid");
      if (soundEnabled) AudioManager.buttonError();
    } finally {
      setIsBidding(false);
    }
  };

  // Clear messages after delay
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  // Countdown timer
  const CountdownTimer = ({ endsAt }: { endsAt: number }) => {
    const [timeLeft, setTimeLeft] = useState("");

    useEffect(() => {
      const updateTimer = () => {
        const now = Date.now();
        const diff = endsAt - now;

        if (diff <= 0) {
          setTimeLeft("Ended");
          return;
        }

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        if (hours > 0) {
          setTimeLeft(`${hours}h ${minutes}m`);
        } else if (minutes > 0) {
          setTimeLeft(`${minutes}m ${seconds}s`);
        } else {
          setTimeLeft(`${seconds}s`);
        }
      };

      updateTimer();
      const interval = setInterval(updateTimer, 1000);
      return () => clearInterval(interval);
    }, [endsAt]);

    return (
      <span className={`font-mono ${timeLeft.includes("s") && !timeLeft.includes("m") ? "text-red-400 animate-pulse" : "text-amber-400"}`}>
        {timeLeft}
      </span>
    );
  };

  if (!currentAuction) return null;

  const hasBid = currentAuction.currentBid > 0;

  return (
    <div className="mt-3 border-t border-purple-500/20 pt-3">
      {/* Collapsed View - Just a button */}
      {!isExpanded ? (
        <div className="flex items-center justify-between">
          <button
            onClick={() => setIsExpanded(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 rounded-lg text-amber-300 text-xs font-bold transition-all"
          >
            <span>🔥</span>
            <span>Sponsor a Cast</span>
          </button>
          <div className="flex items-center gap-2 text-xs">
            {hasBid ? (
              <span className="text-vintage-burnt-gold">
                Top: {currentAuction.currentBid.toLocaleString()} VBMS
              </span>
            ) : (
              <span className="text-vintage-burnt-gold">Min: 10k VBMS</span>
            )}
            <CountdownTimer endsAt={currentAuction.auctionEndsAt} />
          </div>
        </div>
      ) : (
        /* Expanded View - Bid Form */
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h5 className="text-amber-300 font-bold text-sm flex items-center gap-2">
              <span>🔥</span> Sponsor a Cast
              <button
                onClick={() => setShowHelp(!showHelp)}
                className="text-vintage-burnt-gold hover:text-vintage-gold text-xs ml-1"
              >
                ?
              </button>
            </h5>
            <button
              onClick={() => setIsExpanded(false)}
              className="text-vintage-burnt-gold hover:text-vintage-gold text-xs"
            >
              ✕ Close
            </button>
          </div>

          {/* Help tooltip */}
          {showHelp && (
            <div className="p-2 bg-purple-900/30 border border-purple-500/50 rounded-lg text-xs text-vintage-cream">
              <p className="font-bold text-purple-300 mb-1">How it works:</p>
              <ul className="list-disc list-inside space-y-1 text-vintage-burnt-gold">
                <li>Bid VBMS to have your cast featured for 24h</li>
                <li>Min: 10k VBMS | Max: 120k VBMS</li>
                <li>Outbid by +10% or +1k (whichever is higher)</li>
                <li>Winner pays, losers get refund in testVBMS</li>
                <li>Anti-snipe: bids in last 5min extend auction by 3min</li>
              </ul>
            </div>
          )}

          {/* Current bid info */}
          <div className="flex items-center justify-between text-xs bg-vintage-charcoal/50 rounded-lg p-2">
            <div>
              {hasBid ? (
                <span className="text-vintage-gold">
                  🏆 @{currentAuction.bidderUsername}: {currentAuction.currentBid.toLocaleString()} VBMS
                </span>
              ) : (
                <span className="text-vintage-burnt-gold">No bids yet - Min: 10,000 VBMS</span>
              )}
            </div>
            <CountdownTimer endsAt={currentAuction.auctionEndsAt} />
          </div>

          {/* Bidders list */}
          {currentBidders && currentBidders.length > 0 && (
            <div className="text-xs">
              <p className="text-vintage-burnt-gold mb-1">Recent bids:</p>
              <div className="space-y-1 max-h-20 overflow-y-auto">
                {currentBidders.slice(0, 5).map((bid: any, i: number) => (
                  <div key={bid._id} className={`flex justify-between ${bid.isWinning ? 'text-green-400' : bid.status === 'refunded' ? 'text-vintage-burnt-gold/50 line-through' : 'text-vintage-burnt-gold'}`}>
                    <span>@{bid.bidderUsername}</span>
                    <span>{bid.bidAmount.toLocaleString()} VBMS {bid.isWinning && '👑'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Success/Error Messages */}
          {success && (
            <div className="p-2 bg-green-900/30 border border-green-500/50 rounded-lg text-green-400 text-xs">
              {success}
            </div>
          )}
          {error && (
            <div className="p-2 bg-red-900/30 border border-red-500/50 rounded-lg text-red-400 text-xs">
              {error}
            </div>
          )}

          {/* Cast URL Input */}
          <div>
            <label className="text-xs text-vintage-burnt-gold mb-1 block">Cast URL</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={castUrl}
                onChange={(e) => setCastUrl(e.target.value)}
                placeholder="https://farcaster.xyz/user/0x..."
                className="flex-1 px-3 py-2 bg-vintage-charcoal border border-vintage-gold/30 rounded-lg text-vintage-cream text-sm focus:border-vintage-gold focus:outline-none"
              />
              <button
                onClick={handleValidateCast}
                disabled={isValidating || !castUrl.trim()}
                className="px-4 py-2 bg-vintage-gold/20 border border-vintage-gold/50 text-vintage-gold rounded-lg text-sm font-bold hover:bg-vintage-gold/30 disabled:opacity-50 transition-all"
              >
                {isValidating ? "..." : "Load"}
              </button>
            </div>
          </div>

          {/* Cast Preview */}
          {castPreview && (
            <div className="p-3 bg-vintage-charcoal/50 border border-vintage-gold/20 rounded-lg">
              <div className="flex items-start gap-3">
                {castPreview.author.pfpUrl && (
                  <img
                    src={castPreview.author.pfpUrl}
                    alt={castPreview.author.username}
                    className="w-8 h-8 rounded-full"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-vintage-gold font-bold text-sm">
                    {castPreview.author.displayName}
                  </p>
                  <p className="text-vintage-burnt-gold text-xs">
                    @{castPreview.author.username}
                  </p>
                  <p className="text-vintage-cream text-sm mt-1 line-clamp-2">
                    {castPreview.text}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Bid Amount */}
          {castPreview && (
            <div>
              <label className="text-xs text-vintage-burnt-gold mb-1 block">
                Bid Amount (min: {getMinimumBid().toLocaleString()} | max: {MAX_BID.toLocaleString()} VBMS)
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={bidAmount}
                  onChange={(e) => setBidAmount(e.target.value)}
                  placeholder={getMinimumBid().toLocaleString()}
                  className="flex-1 px-3 py-2 bg-vintage-charcoal border border-vintage-gold/30 rounded-lg text-vintage-cream text-sm focus:border-vintage-gold focus:outline-none"
                />
                <button
                  onClick={handlePlaceBid}
                  disabled={isBidding || !bidAmount}
                  className="px-6 py-2 bg-amber-500 text-black rounded-lg text-sm font-bold hover:bg-amber-400 disabled:opacity-50 transition-all"
                >
                  {isBidding ? "..." : "Bid"}
                </button>
              </div>
              <p className="text-xs text-vintage-burnt-gold mt-1">
                Your balance: {userBalance.toLocaleString()} VBMS
              </p>
            </div>
          )}

          {/* Link to history */}
          <div className="text-center">
            <Link
              href="/featured-history"
              className="text-xs text-vintage-gold/60 hover:text-vintage-gold"
            >
              View past winners →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
