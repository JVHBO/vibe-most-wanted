"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { AudioManager } from "@/lib/audio-manager";
import Link from "next/link";
import { Doc } from "@/convex/_generated/dataModel";

type AuctionDoc = Doc<"castAuctions">;
type BidDoc = Doc<"castAuctionBids">;

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
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [castUrl, setCastUrl] = useState("");
  const [bidAmount, setBidAmount] = useState("");
  const [castPreview, setCastPreview] = useState<CastPreview | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isBidding, setIsBidding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Queries
  const auctionStates = useQuery(api.castAuctions.getAllAuctionStates);
  const myBids = useQuery(
    api.castAuctions.getMyBids,
    address ? { address } : "skip"
  );

  // Get player balance from profile
  const profile = useQuery(api.profiles.getProfile, address ? { address } : "skip");
  const userBalance = profile?.coins || 0;

  // Mutation
  const placeBid = useMutation(api.castAuctions.placeBid);

  // Calculate minimum bid for selected slot
  const getMinimumBid = (slotNumber: number) => {
    const auction = auctionStates?.bidding.find(
      (a: AuctionDoc) => a.slotNumber === slotNumber
    );
    if (!auction || auction.currentBid === 0) return 10000; // 10k minimum
    // 10% increment or 1k minimum
    return Math.max(
      auction.currentBid + 1000,
      Math.ceil(auction.currentBid * 1.1)
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
    if (selectedSlot === null || !castPreview || !bidAmount) return;

    const amount = parseInt(bidAmount);
    const minimum = getMinimumBid(selectedSlot);

    if (isNaN(amount) || amount < minimum) {
      setError(`Minimum bid is ${minimum.toLocaleString()} VBMS`);
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
        slotNumber: selectedSlot,
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
        setSelectedSlot(null);
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

  // Countdown timer component
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
      <span
        className={`font-mono ${
          timeLeft.includes("s") && !timeLeft.includes("m")
            ? "text-red-400 animate-pulse"
            : "text-vintage-gold"
        }`}
      >
        {timeLeft}
      </span>
    );
  };

  return (
    <div className="bg-vintage-charcoal/80 rounded-xl border-2 border-amber-500/30 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-amber-300 font-bold text-sm flex items-center gap-2">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" />
          </svg>
          Featured Cast Auctions
        </h4>
        <Link
          href="/featured-history"
          className="text-xs text-vintage-gold/70 hover:text-vintage-gold transition-colors"
        >
          View History &rarr;
        </Link>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="mb-3 p-2 bg-green-900/30 border border-green-500/50 rounded-lg text-green-400 text-xs">
          {success}
        </div>
      )}
      {error && (
        <div className="mb-3 p-2 bg-red-900/30 border border-red-500/50 rounded-lg text-red-400 text-xs">
          {error}
        </div>
      )}

      {/* Auction Slots */}
      <div className="space-y-2 mb-4">
        {[0, 1, 2].map((slot) => {
          const auction = auctionStates?.bidding.find(
            (a: AuctionDoc) => a.slotNumber === slot
          );
          const activeAuction = auctionStates?.active.find(
            (a: AuctionDoc) => a.slotNumber === slot
          );
          const isSelected = selectedSlot === slot;
          const hasBid = auction && auction.currentBid > 0;

          return (
            <div
              key={slot}
              onClick={() => !activeAuction && setSelectedSlot(isSelected ? null : slot)}
              className={`p-3 rounded-lg border transition-all cursor-pointer ${
                activeAuction
                  ? "bg-green-900/20 border-green-500/30 cursor-default"
                  : isSelected
                  ? "bg-vintage-gold/10 border-vintage-gold/50"
                  : "bg-vintage-charcoal/50 border-vintage-gold/20 hover:border-vintage-gold/40"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-vintage-gold font-bold text-sm">
                    Slot {slot + 1}
                  </span>
                  {activeAuction ? (
                    <span className="px-2 py-0.5 bg-green-600/30 text-green-400 text-xs rounded">
                      LIVE
                    </span>
                  ) : (
                    <span className="text-vintage-burnt-gold text-xs">
                      <CountdownTimer endsAt={auction?.auctionEndsAt || 0} />
                    </span>
                  )}
                </div>
                <div className="text-right">
                  {activeAuction ? (
                    <div>
                      <p className="text-xs text-green-400">
                        @{activeAuction.castAuthorUsername || "unknown"}
                      </p>
                      <p className="text-xs text-vintage-burnt-gold">
                        {activeAuction.winningBid?.toLocaleString()} VBMS
                      </p>
                    </div>
                  ) : hasBid ? (
                    <div>
                      <p className="text-vintage-gold font-bold text-sm">
                        {auction.currentBid.toLocaleString()} VBMS
                      </p>
                      <p className="text-xs text-vintage-burnt-gold">
                        by @{auction.bidderUsername || "unknown"}
                      </p>
                    </div>
                  ) : (
                    <p className="text-vintage-burnt-gold text-xs">
                      Min: 10,000 VBMS
                    </p>
                  )}
                </div>
              </div>

              {/* Current winning cast preview */}
              {hasBid && auction.castText && !activeAuction && (
                <p className="mt-2 text-xs text-vintage-cream/70 truncate">
                  "{auction.castText}"
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Bid Form (when slot selected) */}
      {selectedSlot !== null && (
        <div className="border-t border-vintage-gold/20 pt-4 space-y-3">
          <h5 className="text-vintage-gold font-bold text-sm">
            Bid on Slot {selectedSlot + 1}
          </h5>

          {/* Cast URL Input */}
          <div>
            <label className="text-xs text-vintage-burnt-gold mb-1 block">
              Cast URL
            </label>
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
                    className="w-10 h-10 rounded-full"
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
                  <div className="flex gap-3 mt-2 text-xs text-vintage-burnt-gold">
                    <span>{castPreview.reactions.likes} likes</span>
                    <span>{castPreview.reactions.recasts} recasts</span>
                    <span>{castPreview.replies} replies</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Bid Amount */}
          {castPreview && (
            <div>
              <label className="text-xs text-vintage-burnt-gold mb-1 block">
                Bid Amount (min: {getMinimumBid(selectedSlot).toLocaleString()}{" "}
                VBMS)
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={bidAmount}
                  onChange={(e) => setBidAmount(e.target.value)}
                  placeholder={getMinimumBid(selectedSlot).toLocaleString()}
                  className="flex-1 px-3 py-2 bg-vintage-charcoal border border-vintage-gold/30 rounded-lg text-vintage-cream text-sm focus:border-vintage-gold focus:outline-none"
                />
                <button
                  onClick={handlePlaceBid}
                  disabled={isBidding || !bidAmount}
                  className="px-6 py-2 bg-vintage-gold text-vintage-black rounded-lg text-sm font-bold hover:bg-vintage-gold/90 disabled:opacity-50 transition-all"
                >
                  {isBidding ? "Bidding..." : "Place Bid"}
                </button>
              </div>
              <p className="text-xs text-vintage-burnt-gold mt-1">
                Your balance: {userBalance.toLocaleString()} VBMS
              </p>
            </div>
          )}
        </div>
      )}

      {/* User's Active Bids */}
      {myBids && myBids.length > 0 && (
        <div className="border-t border-vintage-gold/20 pt-4 mt-4">
          <h5 className="text-vintage-gold font-bold text-xs mb-2">
            Your Recent Bids
          </h5>
          <div className="space-y-1 max-h-24 overflow-y-auto">
            {myBids.slice(0, 5).map((bid: BidDoc) => (
              <div
                key={bid._id}
                className="flex items-center justify-between text-xs"
              >
                <span className="text-vintage-cream">
                  Slot {bid.slotNumber + 1}
                </span>
                <span
                  className={`font-bold ${
                    bid.status === "active"
                      ? "text-green-400"
                      : bid.status === "won"
                      ? "text-vintage-gold"
                      : "text-red-400"
                  }`}
                >
                  {bid.bidAmount.toLocaleString()} -{" "}
                  {bid.status === "active"
                    ? "Winning"
                    : bid.status === "won"
                    ? "Won!"
                    : "Outbid"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
