"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAccount } from "wagmi";
import { InboxModal } from "./InboxModal";

export function InboxDisplay() {
  const { address } = useAccount();
  const [showModal, setShowModal] = useState(false);

  const economy = useQuery(
    api.vbmsClaim.getPlayerEconomy,
    address ? { address } : "skip"
  );

  if (!address || !economy) return null;

  const inboxAmount = economy.inbox || 0;
  const hasUncollected = inboxAmount >= 100;

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
