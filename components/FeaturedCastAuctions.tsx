"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { AudioManager } from "@/lib/audio-manager";
import Link from "next/link";
import { Doc } from "@/convex/_generated/dataModel";
import { useTransferVBMS } from "@/lib/hooks/useVBMSContracts";
import { useFarcasterVBMSBalance } from "@/lib/hooks/useFarcasterVBMS";
import { useWaitForTransactionReceipt } from "wagmi";
import { parseEther } from "viem";
import { CONTRACTS } from "@/lib/contracts";

type AuctionDoc = Doc<"castAuctions">;
type BidDoc = Doc<"castAuctionBids">;

const MAX_BID = 120000;
const POOL_ADDRESS = CONTRACTS.VBMSPoolTroll as `0x${string}`;

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
  const [isExpanded, setIsExpanded] = useState(true);
  const [showHelp, setShowHelp] = useState(false);
  const [castUrl, setCastUrl] = useState("");
  const [bidAmount, setBidAmount] = useState("");
  const [castPreview, setCastPreview] = useState<CastPreview | null>(null);
  const [existingCastInfo, setExistingCastInfo] = useState<{
    exists: boolean;
    auctionId: string;
    slotNumber?: number;
    totalPool: number;
    contributorCount: number;
    topBidder: string;
  } | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isBidding, setIsBidding] = useState(false);
  const [bidStep, setBidStep] = useState<"idle" | "transferring" | "verifying">("idle");
  const [pendingTxHash, setPendingTxHash] = useState<`0x${string}` | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Queries
  const auctionStates = useQuery(api.castAuctions.getAllAuctionStates);
  const currentBidders = useQuery(api.castAuctions.getCurrentBidders, {});

  // Get profile for username
  const profile = useQuery(api.profiles.getProfile, address ? { address } : "skip");

  // Get real VBMS balance from wallet
  const { balance: vbmsBalance, refetch: refetchBalance } = useFarcasterVBMSBalance(address);
  const userBalance = Math.floor(parseFloat(vbmsBalance || "0"));

  // VBMS transfer hook
  const { transfer: transferVBMS, isPending: isTransferPending } = useTransferVBMS();

  // Wait for TX confirmation
  const { isLoading: isWaitingForTx, isSuccess: txConfirmed } = useWaitForTransactionReceipt({
    hash: pendingTxHash,
  });

  // Get current auction (the one ending soonest)
  const currentAuction = auctionStates?.bidding?.sort(
    (a: AuctionDoc, b: AuctionDoc) => a.auctionEndsAt - b.auctionEndsAt
  )[0];

  // Minimum bid - sem outbid, qualquer valor (min 1000 VBMS)
  const getMinimumBid = () => {
    return 1000;
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

      // Check if cast already exists in auction (pool feature)
      try {
        const existingCheck = await fetch("/api/cast-auction/check-existing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ castHash: data.cast.hash }),
        });
        const existingData = await existingCheck.json();
        
        if (existingData.exists) {
          setExistingCastInfo(existingData);
        } else {
          setExistingCastInfo(null);
        }
      } catch (checkError) {
        console.error("Failed to check existing cast:", checkError);
        setExistingCastInfo(null);
      }

      if (soundEnabled) AudioManager.buttonClick();
    } catch (e) {
      setError("Failed to validate cast");
    } finally {
      setIsValidating(false);
    }
  };

  // Store bid data for when TX confirms
  const [pendingBidData, setPendingBidData] = useState<{
    amount: number;
    slotNumber: number;
    castHash: string;
    warpcastUrl: string;
    castAuthorFid: number;
    castAuthorUsername: string;
    castAuthorPfp: string;
    castText: string;
    isPoolContribution?: boolean;
    auctionId?: string;
  } | null>(null);

  // Handle TX confirmation - verify and record bid via API
  useEffect(() => {
    if (txConfirmed && pendingTxHash && pendingBidData && bidStep === "transferring") {
      setBidStep("verifying");

      // Call API to verify TX and record bid (or add to pool)
      const verifyAndRecordBid = async () => {
        try {
          // Choose endpoint based on whether this is a pool contribution
          const endpoint = pendingBidData.isPoolContribution
            ? "/api/cast-auction/add-to-pool"
            : "/api/cast-auction/place-bid";

          const bodyData = pendingBidData.isPoolContribution
            ? {
                txHash: pendingTxHash,
                address,
                auctionId: pendingBidData.auctionId,
                bidAmount: pendingBidData.amount,
              }
            : {
                txHash: pendingTxHash,
                address,
                slotNumber: pendingBidData.slotNumber,
                bidAmount: pendingBidData.amount,
                castHash: pendingBidData.castHash,
                warpcastUrl: pendingBidData.warpcastUrl,
                castAuthorFid: pendingBidData.castAuthorFid,
                castAuthorUsername: pendingBidData.castAuthorUsername,
                castAuthorPfp: pendingBidData.castAuthorPfp,
                castText: pendingBidData.castText,
              };

          const response = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(bodyData),
          });

          const result = await response.json();

          if (result.success) {
            const successMsg = pendingBidData.isPoolContribution
              ? `Joined bid!`
              : `Bid placed! ${pendingBidData.amount.toLocaleString()} VBMS`;
            setSuccess(successMsg);
            setBidAmount("");
            setCastUrl("");
            setCastPreview(null);
            setExistingCastInfo(null);
            setIsExpanded(false);
            if (soundEnabled) AudioManager.win();
            onBidPlaced?.(pendingBidData.amount);
            refetchBalance();
          } else {
            setError(result.error || "Failed to verify bid");
            if (soundEnabled) AudioManager.buttonError();
          }
        } catch (e: any) {
          setError(e.message || "Failed to verify bid");
          if (soundEnabled) AudioManager.buttonError();
        } finally {
          setIsBidding(false);
          setBidStep("idle");
          setPendingTxHash(undefined);
          setPendingBidData(null);
        }
      };

      verifyAndRecordBid();
    }
  }, [txConfirmed, pendingTxHash, pendingBidData, bidStep, address, soundEnabled, onBidPlaced, refetchBalance]);

  // Place bid - transfer VBMS on-chain
  const handlePlaceBid = async () => {
    if (!currentAuction || !castPreview || !bidAmount) return;

    const amount = parseInt(bidAmount);
    // Pool contributions have lower minimum (1000 VBMS)
    const minimum = existingCastInfo ? 1000 : getMinimumBid();

    if (isNaN(amount) || amount < minimum) {
      setError(`Minimum ${existingCastInfo ? 'contribution' : 'bid'} is ${minimum.toLocaleString()} VBMS`);
      return;
    }

    if (amount > MAX_BID) {
      setError(`Maximum bid is ${MAX_BID.toLocaleString()} VBMS`);
      return;
    }

    if (amount > userBalance) {
      setError(`Insufficient VBMS. You have ${userBalance.toLocaleString()} VBMS in wallet`);
      return;
    }

    setIsBidding(true);
    setBidStep("transferring");
    setError(null);

    try {
      // Store bid data for when TX confirms
      setPendingBidData({
        amount,
        slotNumber: existingCastInfo?.slotNumber || currentAuction.slotNumber,
        castHash: castPreview.hash,
        warpcastUrl: castUrl,
        castAuthorFid: castPreview.author.fid,
        castAuthorUsername: castPreview.author.username,
        castAuthorPfp: castPreview.author.pfpUrl,
        castText: castPreview.text,
        isPoolContribution: !!existingCastInfo,
        auctionId: existingCastInfo?.auctionId,
      });

      // Transfer VBMS to pool on-chain
      const txHash = await transferVBMS(POOL_ADDRESS, parseEther(amount.toString()));
      setPendingTxHash(txHash);
      // TX confirmation will be handled by useEffect above

    } catch (e: any) {
      console.error("[CastAuction] Transfer error:", e);
      setError(e.message || "Failed to transfer VBMS");
      if (soundEnabled) AudioManager.buttonError();
      setIsBidding(false);
      setBidStep("idle");
      setPendingBidData(null);
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
                <li>Bid real VBMS from your wallet</li>
                <li>Min: 10k VBMS | Max: 120k VBMS</li>
                <li>Outbid by +10% or +1k (whichever is higher)</li>
                <li>Winner pays, losers can claim VBMS refund</li>
                <li>Anti-snipe: bids in last 5min extend auction by 3min</li>
              </ul>
            </div>
          )}

          {/* Current bid info with cast link */}
          <div className="text-xs bg-vintage-charcoal/50 rounded-lg p-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {hasBid ? (
                  <>
                    <span className="text-vintage-gold">
                      🏆 @{currentAuction.bidderUsername}: {currentAuction.currentBid.toLocaleString()} VBMS
                    </span>
                    <button
                      onClick={() => {
                        setExistingCastInfo({
                          exists: true,
                          auctionId: currentAuction._id,
                          slotNumber: currentAuction.slotNumber,
                          totalPool: currentAuction.currentBid,
                          contributorCount: 1,
                          topBidder: currentAuction.bidderUsername || '',
                        });
                        setCastPreview({
                          hash: currentAuction.castHash || '',
                          text: currentAuction.castText || '',
                          author: {
                            fid: currentAuction.castAuthorFid || 0,
                            username: currentAuction.castAuthorUsername || '',
                            displayName: currentAuction.castAuthorUsername || '',
                            pfpUrl: currentAuction.castAuthorPfp || '',
                          },
                          timestamp: '',
                          reactions: { likes: 0, recasts: 0 },
                          replies: 0,
                        });
                        if (soundEnabled) AudioManager.buttonClick();
                      }}
                      className="px-2 py-0.5 bg-amber-500/20 border border-amber-500/50 text-amber-400 rounded text-[10px] font-bold hover:bg-amber-500/30 transition-all"
                    >
                      + Join Bid
                    </button>
                  </>
                ) : (
                  <span className="text-vintage-burnt-gold">No bids yet - Min: 10,000 VBMS</span>
                )}
              </div>
              <CountdownTimer endsAt={currentAuction.auctionEndsAt} />
            </div>
            {hasBid && currentAuction.warpcastUrl && (
              <a
                href={currentAuction.warpcastUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-400 hover:text-purple-300 text-[10px] truncate block mt-1"
              >
                🔗 {currentAuction.warpcastUrl}
              </a>
            )}
          </div>



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

          {/* Pool Warning Banner */}
          {existingCastInfo && (
            <div className="p-3 bg-amber-900/40 border-2 border-amber-500/70 rounded-lg mb-3">
              <p className="text-amber-300 font-bold text-sm flex items-center gap-2">
                <span>⚠️</span> This cast is already in the auction!
              </p>
              <p className="text-amber-200/80 text-xs mt-1">
                Your bid will be <span className="font-bold text-amber-300">JOINED with the existing bid</span>
              </p>
              <div className="flex items-center justify-between mt-2 text-xs">
                <span className="text-vintage-burnt-gold">Total Pool: <span className="text-amber-300 font-bold">{existingCastInfo.totalPool?.toLocaleString()} VBMS</span></span>
                <span className="text-vintage-burnt-gold">{existingCastInfo.contributorCount} contributor(s)</span>
              </div>
            </div>
          )}

          {/* Bid Amount */}
          {castPreview && (
            <div>
              <label className="text-xs text-vintage-burnt-gold mb-1 block">
                {existingCastInfo ? 'Join Bid' : 'Bid Amount'} (min: {existingCastInfo ? '1,000' : getMinimumBid().toLocaleString()} | max: {MAX_BID.toLocaleString()} VBMS)
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
                  {bidStep === "transferring" ? "Sending..." : bidStep === "verifying" ? "Verifying..." : existingCastInfo ? "Join Bid" : "Bid"}
                </button>
              </div>
              <p className="text-xs text-vintage-burnt-gold mt-1">
                Wallet: {userBalance.toLocaleString()} VBMS
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
