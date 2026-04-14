"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { ConnectScreen } from "@/components/ConnectScreen";
import { useFarcasterContext } from "@/hooks/fid/useFarcasterContext";
import LoadingSpinner from "@/components/LoadingSpinner";

interface WalletGateScreenProps {
  soundEnabled?: boolean;
}

export function WalletGateScreen({ soundEnabled = true }: WalletGateScreenProps) {
  const farcasterContext = useFarcasterContext();
  const { status } = useAccount();
  const [isConnectingWallet, setIsConnectingWallet] = useState(false);
  const isInFarcaster = farcasterContext.isInMiniapp;
  const isCheckingWalletAccess = !farcasterContext.isReady || isConnectingWallet;

  // While wagmi is reconnecting (page navigation in Base App), show a spinner
  // instead of the connect screen so the user doesn't have to press connect
  if (status === 'reconnecting' || status === 'connecting') {
    return (
      <div className="fixed inset-0 bg-vintage-deep-black flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

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

