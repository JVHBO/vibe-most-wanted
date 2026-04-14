"use client";

import { useState } from "react";
import { ConnectScreen } from "@/components/ConnectScreen";
import { useFarcasterContext } from "@/hooks/fid/useFarcasterContext";

interface WalletGateScreenProps {
  soundEnabled?: boolean;
}

export function WalletGateScreen({ soundEnabled = true }: WalletGateScreenProps) {
  const farcasterContext = useFarcasterContext();
  const [isConnectingWallet, setIsConnectingWallet] = useState(false);
  const isInFarcaster = farcasterContext.isInMiniapp;
  const isCheckingWalletAccess = !farcasterContext.isReady || isConnectingWallet;

  return (
    <div
      className="fixed inset-0 bg-vintage-deep-black"
      style={{
        overflow: "hidden",
        padding: "24px 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <ConnectScreen
        isCheckingFarcaster={isCheckingWalletAccess}
        setIsCheckingFarcaster={setIsConnectingWallet}
        isInFarcaster={isInFarcaster}
        isFrameMode={false}
        soundEnabled={soundEnabled}
      />
    </div>
  );
}

