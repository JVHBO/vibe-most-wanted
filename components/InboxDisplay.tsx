"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { InboxModal } from "./InboxModal";

export function InboxDisplay() {
  const { address } = useAccount();
  const [showModal, setShowModal] = useState(false);

  const economy = useQuery(
    api.vbmsClaim.getPlayerEconomy,
    address ? { address } : "skip"
  );

  const inboxAmount = economy?.inbox || 0;
  const hasUncollected = inboxAmount >= 100;

  if (!address) return null;

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="bg-vintage-deep-black border-2 border-vintage-gold text-vintage-gold px-3 md:px-4 py-1.5 md:py-2 rounded-lg hover:bg-vintage-gold/20 transition font-bold text-sm md:text-base relative"
        title="VBMS Inbox"
      >
        <span className="text-lg">📬</span>
        {hasUncollected && (
          <span className="absolute -top-1 -right-1 bg-yellow-500 text-black text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1 animate-pulse">
            {inboxAmount >= 1000 ? `${Math.floor(inboxAmount / 1000)}K` : inboxAmount}
          </span>
        )}
      </button>

      {showModal && (
        <InboxModal
          inboxAmount={inboxAmount}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
