"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAccount } from "wagmi";
import { CoinsInboxModal } from "./CoinsInboxModal";
import NextImage from "next/image";
import { useLanguage } from "@/contexts/LanguageContext";
import { useFarcasterVBMSBalance } from "@/lib/hooks/useFarcasterVBMS"; // Miniapp-compatible

interface CoinsInboxDisplayProps {
  compact?: boolean; // For miniapp/mobile view
  userAddress?: string; // Optional override for miniapp (when wagmi fails)
}

export function CoinsInboxDisplay({ compact = false, userAddress }: CoinsInboxDisplayProps) {
  const { address: wagmiAddress } = useAccount();
  // In compact mode, prefer userAddress prop (from userProfile) over wagmi
  // because wagmi may not work properly in Farcaster miniapp
  const address = compact && userAddress ? userAddress : wagmiAddress;
  const [showModal, setShowModal] = useState(false);
  const { t } = useLanguage();

  const inboxStatus = useQuery(
    api.coinsInbox.getInboxStatus,
    address ? { address } : "skip"
  );

  // Get actual VBMS wallet balance from blockchain (using Farcaster-compatible hook for miniapp)
  const { balance: vbmsWalletBalance, isLoading: isBalanceLoading } = useFarcasterVBMSBalance(address);

  // Debug logging (keep in production to diagnose miniapp issues)
  if (typeof window !== 'undefined') {
    console.log('[CoinsInboxDisplay] compact:', compact, 'address:', address, 'inboxStatus:', inboxStatus, 'vbmsWalletBalance:', vbmsWalletBalance, 'isBalanceLoading:', isBalanceLoading);
  }

  // Always render, even if data is loading (don't return null!)
  // In compact mode (miniapp), don't wait for blockchain balance - it may hang in Farcaster
  // Also, in compact mode, only check inboxStatus (address may not load properly in Farcaster)
  const isLoading = compact
    ? (inboxStatus === undefined) // Only wait for Convex query, not wallet address
    : (!address || !inboxStatus || isBalanceLoading);
  const vbmsInbox = inboxStatus?.coinsInbox || 0; // VBMS inbox (from leaderboard/rewards - ready to claim)
  const vbmsBalance = parseFloat(vbmsWalletBalance || '0'); // Actual VBMS token balance from blockchain
  const hasUncollected = vbmsInbox >= 100; // Show dot if VBMS ready to claim (min 100)

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
            userAddress={address}
          />
        )}
      </>
    );
  }

  // Full version for website header - simple icon button (like compact mode)
  return (
    <>
      <button
        onClick={() => !isLoading && setShowModal(true)}
        disabled={isLoading}
        className={`relative bg-vintage-deep-black border-2 border-vintage-gold text-vintage-gold px-3 md:px-4 py-1.5 md:py-2 rounded-lg hover:bg-vintage-gold/20 transition font-bold text-sm md:text-base flex items-center justify-center ${
          isLoading ? 'opacity-50 cursor-wait' : 'cursor-pointer'
        }`}
        title={isLoading ? t('loading') : `Claim Rewards`}
      >
        <NextImage
          src="/images/icons/inbox.svg"
          alt="Claim"
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
          userAddress={address}
        />
      )}
    </>
  );
}
