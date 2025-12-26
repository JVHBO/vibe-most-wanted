"use client";

import { useAccount } from "wagmi";
import { ShopView } from "@/components/ShopView";
import LoadingSpinner from "@/components/LoadingSpinner";

export default function ShopPage() {
  const { address, isConnecting } = useAccount();

  if (isConnecting) {
    return (
      <div className="fixed inset-0 bg-vintage-deep-black flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return <ShopView address={address} />;
}
