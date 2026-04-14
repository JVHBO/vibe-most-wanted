"use client";

import { Suspense } from "react";
import { useAccount } from "wagmi";
import { useSearchParams } from "next/navigation";
import { ShopView } from "@/components/ShopView";
import LoadingSpinner from "@/components/LoadingSpinner";
import { WalletGateScreen } from "@/components/WalletGateScreen";

function ShopPageInner() {
  const { address, isConnecting } = useAccount();
  const searchParams = useSearchParams();
  const initialSlide = searchParams.get('slide') === '1' ? 1 : 0;

  if (!address) {
    return <WalletGateScreen />;
  }

  if (isConnecting && address) {
    return (
      <div className="fixed inset-0 bg-vintage-deep-black flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return <ShopView address={address} initialSlide={initialSlide} />;
}

export default function ShopPage() {
  return (
    <Suspense fallback={
      <div className="fixed inset-0 bg-vintage-deep-black flex items-center justify-center">
        <LoadingSpinner />
      </div>
    }>
      <ShopPageInner />
    </Suspense>
  );
}
