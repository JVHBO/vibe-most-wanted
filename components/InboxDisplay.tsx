"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAccount } from "wagmi";
import { InboxModal } from "./InboxModal";

interface InboxDisplayProps {
  compact?: boolean; // For miniapp/mobile view
}

export function InboxDisplay({ compact = false }: InboxDisplayProps) {
  const { address } = useAccount();
  const [showModal, setShowModal] = useState(false);

  const economy = useQuery(
    api.vbmsClaim.getPlayerEconomy,
    address ? { address } : "skip"
  );

  if (!address || !economy) return null;

  const inboxAmount = economy.inbox || 0;
  const hasUncollected = inboxAmount >= 100;

  // Compact version for miniapp (icon only, like other buttons)
  if (compact) {
    return (
      <>
        <button
          onClick={() => setShowModal(true)}
          className="relative bg-vintage-deep-black border-2 border-vintage-gold text-vintage-gold px-3 md:px-4 py-1.5 md:py-2 rounded-lg hover:bg-vintage-gold/20 transition font-bold text-sm md:text-base flex items-center justify-center"
          title={`Inbox: ${inboxAmount.toLocaleString()} TESTVBMS`}
        >
          <span className="text-xl md:text-2xl">📬</span>
          {hasUncollected && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-vintage-orange rounded-full animate-notification-pulse" />
          )}
        </button>

        {showModal && (
          <InboxModal
            economy={economy}
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
        <span className="text-2xl">📬</span>
        <div className="text-left">
          <div className="text-xs text-vintage-gold/60">Inbox</div>
          <div className="text-sm font-bold text-vintage-gold">
            {inboxAmount.toLocaleString()} TESTVBMS
          </div>
        </div>

        {hasUncollected && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-vintage-orange rounded-full animate-notification-pulse" />
        )}
      </button>

      {showModal && (
        <InboxModal
          economy={economy}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
