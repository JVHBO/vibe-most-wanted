"use client";

import { useEffect } from "react";
import { useFarcasterContext } from "@/lib/hooks/useFarcasterContext";
import { sdk } from "@farcaster/miniapp-sdk";
import { AudioManager } from "@/lib/audio-manager";

const VIBEFID_MINIAPP_URL = 'https://farcaster.xyz/miniapps/aisYLhjuH5_G/vibefid';

export default function FidRedirectPage() {
  const farcasterContext = useFarcasterContext();

  // Auto-redirect when ready
  useEffect(() => {
    if (farcasterContext.isReady) {
      handleOpenVibeFID();
    }
  }, [farcasterContext.isReady]);

  const handleOpenVibeFID = async () => {
    AudioManager.buttonClick();

    if (farcasterContext.isInMiniapp) {
      try {
        await sdk.actions.openMiniApp({ url: VIBEFID_MINIAPP_URL });
      } catch (err) {
        console.error('Failed to open VibeFID miniapp:', err);
        window.location.href = VIBEFID_MINIAPP_URL;
      }
    } else {
      window.location.href = VIBEFID_MINIAPP_URL;
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
      {/* Background gradient */}
      <div className="fixed inset-0 bg-gradient-to-br from-purple-900/20 via-black to-yellow-900/20 pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 text-center space-y-8">
        {/* Logo/Title */}
        <div className="space-y-2">
          <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500">
            VibeFID
          </h1>
          <p className="text-gray-400 text-lg">
            Mint Playable Cards from Farcaster Profiles
          </p>
        </div>

        {/* Button */}
        <button
          onClick={handleOpenVibeFID}
          className="px-8 py-4 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-black font-bold text-xl rounded-xl shadow-lg shadow-yellow-500/30 transition-all duration-200 hover:scale-105 active:scale-95"
        >
          Open VibeFID Miniapp
        </button>

        {/* Loading indicator */}
        {!farcasterContext.isReady && (
          <p className="text-gray-500 text-sm animate-pulse">
            Loading...
          </p>
        )}
      </div>
    </div>
  );
}
