"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAccount } from "wagmi";
import { CoinsInboxModal } from "./CoinsInboxModal";
import NextImage from "next/image";
import { useLanguage } from "@/contexts/LanguageContext";
import { useVBMSBalance } from "@/lib/hooks/useVBMSContracts";

interface CoinsInboxDisplayProps {
  compact?: boolean; // For miniapp/mobile view
}

export function CoinsInboxDisplay({ compact = false }: CoinsInboxDisplayProps) {
  const { address } = useAccount();
  const [showModal, setShowModal] = useState(false);
  const { t } = useLanguage();

  const inboxStatus = useQuery(
    api.coinsInbox.getInboxStatus,
    address ? { address } : "skip"
  );

  // Get actual VBMS wallet balance from blockchain
  const { balance: vbmsWalletBalance, isLoading: isBalanceLoading } = useVBMSBalance(address);

  // Debug logging
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    console.log('[CoinsInboxDisplay] address:', address, 'inboxStatus:', inboxStatus, 'vbmsWalletBalance:', vbmsWalletBalance, 'compact:', compact);
  }

  // Always render, even if data is loading (don't return null!)
  const isLoading = !address || !inboxStatus || isBalanceLoading;
  const vbmsInbox = inboxStatus?.inbox || 0; // VBMS inbox (auto-converted from TESTVBMS)
  const vbmsBalance = parseFloat(vbmsWalletBalance || '0'); // Actual VBMS token balance
  const hasUncollected = vbmsInbox > 0;

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
          title={isLoading ? t('loading') : `VBMS Wallet: ${vbmsBalance.toLocaleString()} VBMS`}
        >
          <NextImage
            src="/images/icons/inbox.svg"
            alt="Wallet"
            width={20}
            height={20}
            className={`w-5 h-5 md:w-6 md:h-6 ${isLoading ? 'animate-pulse' : ''}`}
          />
          {!isLoading && hasUncollected && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-vintage-orange rounded-full animate-notification-pulse" />
          )}
        </button>

        {showModal && inboxStatus && !isLoading && (
          <CoinsInboxModal
            inboxStatus={inboxStatus}
            onClose={() => setShowModal(false)}
          />
        )}
      </>
    );
  }

  // Full version for website header - shows wallet balance
  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="relative flex items-center gap-2 px-3 py-2 rounded-lg bg-vintage-deep-black/50 border border-vintage-gold/30 hover:border-vintage-gold/60 transition-all"
      >
        <NextImage src="/images/icons/inbox.svg" alt="Wallet" width={24} height={24} className="w-6 h-6" />
        <div className="text-left">
          <div className="text-xs text-vintage-gold/60">VBMS Wallet</div>
          <div className="text-sm font-bold text-vintage-gold">
            {vbmsBalance.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} VBMS
          </div>
        </div>

        {hasUncollected && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-vintage-orange rounded-full animate-notification-pulse" />
        )}
      </button>

      {showModal && inboxStatus && !isLoading && (
        <CoinsInboxModal
          inboxStatus={inboxStatus}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
