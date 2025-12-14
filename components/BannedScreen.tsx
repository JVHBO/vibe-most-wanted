"use client";

interface BannedScreenProps {
  username: string;
  amountStolen: number;
  reason: string;
}

// Mushu "Dishonor" GIF from Tenor
const MUSHU_DISHONOR_GIF = "https://media1.tenor.com/m/2GeIejx2hbYAAAAC/mushu-mulan.gif";

export default function BannedScreen({ username, amountStolen, reason }: BannedScreenProps) {
  return (
    <div className="fixed inset-0 bg-black z-[9999] flex items-center justify-center p-4">
      <div className="max-w-lg w-full text-center">
        {/* Mushu Dishonor GIF */}
        <div className="mb-4">
          <img
            src={MUSHU_DISHONOR_GIF}
            alt="Dishonor on you!"
            className="w-48 h-auto mx-auto rounded-lg shadow-lg"
          />
        </div>

        {/* Ban Icon */}
        <div className="text-6xl mb-4 animate-pulse">
          🚫
        </div>

        {/* Title */}
        <h1 className="text-4xl font-bold text-red-500 mb-4">
          BANNED
        </h1>

        {/* Username */}
        <p className="text-2xl text-red-400 mb-6">
          @{username}
        </p>

        {/* Reason */}
        <div className="bg-red-950/50 border border-red-800 rounded-xl p-6 mb-6">
          <p className="text-red-300 text-lg">
            {reason}
          </p>
        </div>

        {/* Amount Stolen */}
        <div className="bg-red-900/30 rounded-lg p-4 mb-6">
          <p className="text-red-500 text-sm mb-2">Amount Exploited:</p>
          <p className="text-red-400 text-3xl font-bold">
            {amountStolen.toLocaleString()} VBMS
          </p>
        </div>

        {/* Warning */}
        <p className="text-red-600 text-sm">
          This ban is permanent and cannot be appealed.
        </p>

        {/* Skull decoration */}
        <div className="mt-8 flex justify-center gap-4 text-4xl opacity-50">
          <span>💀</span>
          <span>⚰️</span>
          <span>💀</span>
        </div>
      </div>
    </div>
  );
}
