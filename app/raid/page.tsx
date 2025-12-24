"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { RaidBossModal } from "@/components/RaidBossModal";
import { useLanguage } from "@/contexts/LanguageContext";
import { useMusic } from "@/contexts/MusicContext";
import { usePlayerCards } from "@/contexts/PlayerCardsContext";
import { PriceTicker } from "@/components/PriceTicker";
import LoadingSpinner from "@/components/LoadingSpinner";
import { sdk, Context } from "@farcaster/miniapp-sdk";
import type { Card } from "@/lib/types/card";

export default function RaidPage() {
  const { address, isConnecting } = useAccount();
  const router = useRouter();
  const { t } = useLanguage();
  const { isMusicEnabled } = useMusic();
  const { nfts } = usePlayerCards();
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [isInFarcaster, setIsInFarcaster] = useState<boolean>(false);
  const [isMounted, setIsMounted] = useState(false);

  // Check if running in Farcaster miniapp
  useEffect(() => {
    setIsMounted(true);
    async function checkFarcaster() {
      try {
        const context = await sdk.context;
        if (context?.client?.clientFid) {
          setIsInFarcaster(true);
        }
      } catch {
        setIsInFarcaster(false);
      }
    }
    checkFarcaster();
  }, []);

  // Sync sound with music setting
  useEffect(() => {
    setSoundEnabled(isMusicEnabled);
  }, [isMusicEnabled]);

  if (!isMounted) {
    return (
      <div className="min-h-screen bg-vintage-deep-black flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (isConnecting) {
    return (
      <div className="min-h-screen bg-vintage-deep-black flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!address) {
    return (
      <div className="min-h-screen bg-vintage-deep-black text-white">
        <PriceTicker />
        <div className="flex flex-col items-center justify-center min-h-[80vh] px-4">
          <div className="text-center">
            <div className="text-6xl mb-4">💀</div>
            <h1 className="text-2xl font-display font-bold text-vintage-gold mb-4">
              Boss Raid
            </h1>
            <p className="text-vintage-burnt-gold text-lg mb-6">
              Connect your wallet to access Boss Raid
            </p>
            <Link
              href="/"
              className="inline-block px-6 py-3 bg-vintage-gold text-vintage-black rounded-lg font-bold hover:bg-vintage-ice transition-colors"
            >
              Go to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-vintage-deep-black">
      {/* Price Ticker */}
      <PriceTicker />

      {/* Raid Boss Modal - Always open on this page */}
      <RaidBossModal
        isOpen={true}
        onClose={() => router.push('/')}
        userAddress={address}
        soundEnabled={soundEnabled}
        t={t as (key: string, params?: Record<string, any>) => string}
        allNfts={(nfts || []) as Card[]}
        isInFarcaster={isInFarcaster}
      />
    </div>
  );
}
