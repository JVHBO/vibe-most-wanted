"use client";

import { Suspense } from "react";
import { useAccount } from "wagmi";
import { useSearchParams } from "next/navigation";
import { ShopView } from "@/components/ShopView";
import LoadingSpinner from "@/components/LoadingSpinner";
import { WalletGateScreen } from "@/components/WalletGateScreen";
import { useReconnectTimeout } from "@/hooks/useReconnectTimeout";

function ShopPageInner() {
  const { address, status } = useAccount();
  const searchParams = useSearchParams();
  const initialSlide = searchParams.get('slide') === '1' ? 1 : 0;
  const isReconnecting = useReconnectTimeout(status);

  if (isReconnecting) {
    return (
      <div className="fixed inset-0 bg-vintage-deep-black flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!address) {
    return <WalletGateScreen />;
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
