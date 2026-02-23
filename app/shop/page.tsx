"use client";

import { useAccount } from "wagmi";
import { ShopView } from "@/components/ShopView";
import LoadingSpinner from "@/components/LoadingSpinner";

const SHOP_ENABLED = false; // Set to true to reopen shop

export default function ShopPage() {
  const { address, isConnecting } = useAccount();

  if (!SHOP_ENABLED) {
    return (
      <div className="fixed inset-0 bg-vintage-deep-black flex items-center justify-center">
        <div className="text-center text-white">
          <p className="text-2xl font-bold mb-2">Shop Temporarily Unavailable</p>
          <p className="text-gray-400">We will be back soon.</p>
        </div>
      </div>
    );
  }

  if (isConnecting) {
    return (
      <div className="fixed inset-0 bg-vintage-deep-black flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return <ShopView address={address} />;
}
