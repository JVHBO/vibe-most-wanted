"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAccount } from "wagmi";
import { CoinsInboxModal } from "./CoinsInboxModal";
import NextImage from "next/image";

interface CoinsInboxDisplayProps {
  compact?: boolean; // For miniapp/mobile view
}

export function CoinsInboxDisplay({ compact = false }: CoinsInboxDisplayProps) {
  const { address } = useAccount();
  const [showModal, setShowModal] = useState(false);

  const inboxStatus = useQuery(
    api.coinsInbox.getInboxStatus,
    address ? { address } : "skip"
  );

  // Debug logging
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    console.log('[CoinsInboxDisplay] address:', address, 'inboxStatus:', inboxStatus, 'compact:', compact);
  }

  // Always render, even if data is loading (don't return null!)
  const isLoading = !address || !inboxStatus;
  const coinsInbox = inboxStatus?.coinsInbox || 0;
  const hasUncollected = coinsInbox > 0;

  // Compact version for miniapp (icon only, like other buttons)
  if (compact) {
    return (
      <>
        <button
          onClick={() => !isLoading && setShowModal(true)}
          disabled={isLoading}
          className={`relative bg-vintage-deep-black border-2 border-vintage-gold text-vintage-gold px-3 md:px-4 py-1.5 md:py-2 rounded-lg hover:bg-vintage-gold/20 transition font-bold text-sm md:text-base flex items-center justify-center ${
            isLoading ? 'opacity-50 cursor-wait' : 'cursor-pointer'
          }`}
          title={isLoading ? "Loading..." : "Coins Inbox"}
        >
          <NextImage
            src="/images/icons/inbox.svg"
            alt="Inbox"
            width={20}
            height={20}
            className={`w-5 h-5 md:w-6 md:h-6 ${isLoading ? 'animate-pulse' : ''}`}
          />
          {!isLoading && hasUncollected && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-vintage-orange rounded-full animate-notification-pulse" />
          )}
        </button>

        {showModal && inboxStatus && (
          <CoinsInboxModal
            inboxStatus={inboxStatus}
            onClose={() => setShowModal(false)}
          />
        )}
      </>
    );
  }

  // Full version for website header
  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="relative flex items-center gap-2 px-3 py-2 rounded-lg bg-vintage-deep-black/50 border border-vintage-gold/30 hover:border-vintage-gold/60 transition-all"
      >
        <NextImage src="/images/icons/inbox.svg" alt="Inbox" width={24} height={24} className="w-6 h-6" />
        <div className="text-left">
          <div className="text-xs text-vintage-gold/60">Coins Inbox</div>
          <div className="text-sm font-bold text-vintage-gold">
            {coinsInbox.toLocaleString()} coins
          </div>
        </div>

        {hasUncollected && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-vintage-orange rounded-full animate-notification-pulse" />
        )}
      </button>

      {showModal && (
        <CoinsInboxModal
          inboxStatus={inboxStatus}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
