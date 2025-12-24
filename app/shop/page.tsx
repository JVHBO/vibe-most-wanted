"use client";

import { useAccount } from "wagmi";
import Link from "next/link";
import { ShopView } from "@/components/ShopView";
import { useLanguage } from "@/contexts/LanguageContext";
import { PriceTicker } from "@/components/PriceTicker";
import LoadingSpinner from "@/components/LoadingSpinner";

export default function ShopPage() {
  const { address, isConnecting } = useAccount();
  const { t } = useLanguage();

  if (isConnecting) {
    return (
      <div className="min-h-screen bg-vintage-deep-black flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-vintage-deep-black text-white">
      {/* Price Ticker */}
      <PriceTicker />

      {/* Header */}
      <div className="sticky top-0 z-50 bg-vintage-deep-black/95 backdrop-blur-sm border-b border-vintage-gold/30">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-vintage-gold hover:text-vintage-ice transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="font-display font-bold">{t('back') || 'Back'}</span>
          </Link>
          <h1 className="text-xl font-display font-bold text-vintage-gold">
            Shop
          </h1>
          <div className="w-16" /> {/* Spacer for centering */}
        </div>
      </div>

      {/* Shop Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {!address ? (
          <div className="text-center py-12">
            <p className="text-vintage-burnt-gold text-lg mb-4">
              Connect your wallet to access the shop
            </p>
            <Link
              href="/"
              className="inline-block px-6 py-3 bg-vintage-gold text-vintage-black rounded-lg font-bold hover:bg-vintage-ice transition-colors"
            >
              Go to Home
            </Link>
          </div>
        ) : (
          <ShopView address={address} />
        )}
      </div>
    </div>
  );
}
