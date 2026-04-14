"use client";

import { useState, useEffect } from "react";
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
  const [reconnectTimedOut, setReconnectTimedOut] = useState(false);
  const isInFarcaster = farcasterContext.isInMiniapp;
  const isCheckingWalletAccess = !farcasterContext.isReady || isConnectingWallet;

  // After 3s of reconnecting with no result, stop waiting
  useEffect(() => {
    if (status !== 'reconnecting') { setReconnectTimedOut(false); return; }
    const t = setTimeout(() => setReconnectTimedOut(true), 3000);
    return () => clearTimeout(t);
  }, [status]);

  if ((status === 'reconnecting' || status === 'connecting') && !reconnectTimedOut) {
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

