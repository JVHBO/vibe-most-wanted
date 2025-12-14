"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { AudioManager } from "@/lib/audio-manager";

// Mushu "Dishonor" GIF from Tenor
const MUSHU_DISHONOR_GIF = "https://media1.tenor.com/m/2GeIejx2hbYAAAAC/mushu-mulan.gif";

interface Exploiter {
  address: string;
  username: string;
  fid: number;
  amountStolen: number;
  claims: number;
}

interface ShameListProps {
  playerAddress?: string;
  soundEnabled?: boolean;
}

export default function ShameList({ playerAddress, soundEnabled = true }: ShameListProps) {
  const shameData = useQuery(api.blacklist.getShameList);
  const shameCounts = useQuery(api.blacklist.getExploiterShameCounts);
  const shameStatus = useQuery(
    api.blacklist.getShameStatus,
    playerAddress ? { playerAddress } : "skip"
  );
  const shameExploiter = useMutation(api.blacklist.shameExploiter);

  const [shamingAddress, setShamingAddress] = useState<string | null>(null);
  const [rewardAnimation, setRewardAnimation] = useState<{ show: boolean; x: number; y: number }>({
    show: false,
    x: 0,
    y: 0,
  });

  const handleShame = async (exploiterAddress: string, event: React.MouseEvent) => {
    if (!playerAddress || shamingAddress) return;

    // Check if already shamed this exploiter
    if (shameStatus?.shamedExploiters?.includes(exploiterAddress.toLowerCase())) {
      return;
    }

    // Check remaining shames
    if (shameStatus && shameStatus.remainingShames <= 0) {
      return;
    }

    setShamingAddress(exploiterAddress);

    try {
      const result = await shameExploiter({
        playerAddress,
        exploiterAddress,
      });

      if (result.success) {
        // Show reward animation at click position
        const rect = (event.target as HTMLElement).getBoundingClientRect();
        setRewardAnimation({
          show: true,
          x: rect.left + rect.width / 2,
          y: rect.top,
        });

        // Play sound
        if (soundEnabled) {
          AudioManager.buttonSuccess();
          AudioManager.hapticFeedback("medium");
        }

        // Hide animation after 3.5s (longer to show Mushu GIF properly)
        setTimeout(() => {
          setRewardAnimation({ show: false, x: 0, y: 0 });
        }, 3500);
      }
    } catch (error: any) {
      console.error("Shame error:", error);
      if (soundEnabled) {
        AudioManager.buttonError();
      }
    } finally {
      setShamingAddress(null);
    }
  };

  if (!shameData) {
    return (
      <div className="bg-red-950/30 border border-red-800/50 rounded-lg p-4 animate-pulse">
        <div className="h-6 bg-red-800/30 rounded w-48 mb-4"></div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-8 bg-red-800/20 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Floating Mushu + VBMS Animation */}
      {rewardAnimation.show && (
        <div
          className="fixed z-[9999] pointer-events-none animate-float-up"
          style={{
            left: rewardAnimation.x,
            top: rewardAnimation.y,
          }}
        >
          <div className="flex flex-col items-center gap-1">
            <img
              src={MUSHU_DISHONOR_GIF}
              alt="Dishonor!"
              className="w-20 h-20 rounded-lg shadow-lg"
            />
            <div className="text-green-400 font-bold text-xl whitespace-nowrap animate-pulse bg-black/70 px-2 py-1 rounded">
              +100 VBMS 💰
            </div>
          </div>
        </div>
      )}

      <div className="bg-red-950/30 border border-red-800/50 rounded-lg overflow-hidden">
        {/* Header */}
        <div className="bg-red-900/50 px-4 py-3 border-b border-red-800/50">
          <div className="flex items-center justify-between">
            <h3 className="text-red-400 font-bold text-lg flex items-center gap-2">
              <span className="text-xl">🚨</span> SHAME LIST
            </h3>
            <span className="text-red-500 text-xs font-mono">
              {shameData.summary.exploitDate}
            </span>
          </div>
          <p className="text-red-400/70 text-xs mt-1">
            {shameData.summary.totalExploiters} exploiters stole{" "}
            <span className="text-red-300 font-bold">
              {shameData.summary.totalStolen.toLocaleString()} VBMS
            </span>
          </p>

          {/* Shame Status */}
          {playerAddress && shameStatus && (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-yellow-400 text-xs">
                🔔 Shames: {shameStatus.totalShamesGiven}/{shameStatus.maxShames}
              </span>
              <span className="text-green-400 text-xs">
                (+{shameStatus.rewardPerShame} VBMS each)
              </span>
            </div>
          )}
        </div>

        {/* List */}
        <div className="max-h-[400px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-red-900/30 sticky top-0">
              <tr className="text-red-400/80 text-xs">
                <th className="px-2 py-2 text-left">#</th>
                <th className="px-2 py-2 text-left">Username</th>
                <th className="px-2 py-2 text-right">Stolen</th>
                <th className="px-2 py-2 text-center">Shames</th>
                <th className="px-2 py-2 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-red-800/30">
              {shameData.exploiters.map((exploiter: Exploiter, index: number) => {
                const shameCount = shameCounts?.[exploiter.address.toLowerCase()] || 0;
                const alreadyShamed = shameStatus?.shamedExploiters?.includes(
                  exploiter.address.toLowerCase()
                );
                const canShame =
                  playerAddress &&
                  shameStatus &&
                  shameStatus.remainingShames > 0 &&
                  !alreadyShamed;
                const isShaming = shamingAddress === exploiter.address;

                return (
                  <tr
                    key={exploiter.address}
                    className="hover:bg-red-900/20 transition-colors"
                  >
                    <td className="px-2 py-2 text-red-500 font-mono text-xs">
                      {index + 1}
                    </td>
                    <td className="px-2 py-2">
                      <a
                        href={`/profile/${exploiter.username}`}
                        className="text-red-300 hover:text-red-100 hover:underline font-medium"
                      >
                        @{exploiter.username}
                      </a>
                      <div className="text-red-500/50 text-xs font-mono">
                        {exploiter.address.slice(0, 6)}...{exploiter.address.slice(-4)}
                      </div>
                    </td>
                    <td className="px-2 py-2 text-right">
                      <span className="text-red-300 font-bold text-xs">
                        {exploiter.amountStolen.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-2 py-2 text-center">
                      <span className="text-yellow-400 font-bold">
                        {shameCount}
                      </span>
                      <span className="text-red-500/50 text-xs ml-1">🔔</span>
                    </td>
                    <td className="px-2 py-2 text-center">
                      <button
                        onClick={(e) => handleShame(exploiter.address, e)}
                        disabled={!canShame || isShaming}
                        className={`px-2 py-1 rounded text-xs font-bold transition-all ${
                          alreadyShamed
                            ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                            : canShame
                            ? "bg-yellow-600 hover:bg-yellow-500 text-black hover:scale-105 active:scale-95"
                            : "bg-gray-700 text-gray-500 cursor-not-allowed"
                        }`}
                      >
                        {isShaming ? "..." : alreadyShamed ? "✓" : "SHAME"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="bg-red-900/30 px-4 py-2 border-t border-red-800/50">
          <p className="text-red-500/80 text-xs">
            <span className="font-bold">Exploit:</span>{" "}
            {shameData.summary.exploitType}
          </p>
          <p className="text-yellow-500/80 text-xs mt-1">
            💡 Click SHAME to earn +100 VBMS (max 10 times total)
          </p>
        </div>
      </div>

      {/* CSS Animation */}
      <style jsx>{`
        @keyframes float-up {
          0% {
            opacity: 1;
            transform: translateY(0) translateX(-50%);
          }
          70% {
            opacity: 1;
            transform: translateY(-40px) translateX(-50%);
          }
          100% {
            opacity: 0;
            transform: translateY(-80px) translateX(-50%);
          }
        }
        .animate-float-up {
          animation: float-up 3.5s ease-out forwards;
        }
      `}</style>
    </>
  );
}
