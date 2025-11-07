"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAccount } from "wagmi";
import { CoinsInboxModal } from "./CoinsInboxModal";

export function CoinsInboxDisplay() {
  const { address } = useAccount();
  const [showModal, setShowModal] = useState(false);

  const inboxStatus = useQuery(
    api.coinsInbox.getInboxStatus,
    address ? { address } : "skip"
  );

  if (!address || !inboxStatus) return null;

  const coinsInbox = inboxStatus.coinsInbox || 0;
  const hasUncollected = coinsInbox > 0;

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="relative flex items-center gap-2 px-3 py-2 rounded-lg bg-vintage-deep-black/50 border border-vintage-gold/30 hover:border-vintage-gold/60 transition-all"
      >
        <span className="text-2xl">💰</span>
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
