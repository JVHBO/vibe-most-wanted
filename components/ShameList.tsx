"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

interface Exploiter {
  address: string;
  username: string;
  fid: number;
  amountStolen: number;
  claims: number;
}

export default function ShameList() {
  const shameData = useQuery(api.blacklist.getShameList);

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
    <div className="bg-red-950/30 border border-red-800/50 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-red-900/50 px-4 py-3 border-b border-red-800/50">
        <div className="flex items-center justify-between">
          <h3 className="text-red-400 font-bold text-lg flex items-center gap-2">
            <span className="text-xl">&#x1F6A8;</span> SHAME LIST
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
      </div>

      {/* List */}
      <div className="max-h-[400px] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="bg-red-900/30 sticky top-0">
            <tr className="text-red-400/80 text-xs">
              <th className="px-3 py-2 text-left">#</th>
              <th className="px-3 py-2 text-left">Username</th>
              <th className="px-3 py-2 text-right">Stolen</th>
              <th className="px-3 py-2 text-right">Claims</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-red-800/30">
            {shameData.exploiters.map((exploiter: Exploiter, index: number) => (
              <tr
                key={exploiter.address}
                className="hover:bg-red-900/20 transition-colors"
              >
                <td className="px-3 py-2 text-red-500 font-mono text-xs">
                  {index + 1}
                </td>
                <td className="px-3 py-2">
                  <a
                    href={`https://warpcast.com/${exploiter.username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-red-300 hover:text-red-100 hover:underline font-medium"
                  >
                    @{exploiter.username}
                  </a>
                  <div className="text-red-500/50 text-xs font-mono">
                    {exploiter.address.slice(0, 6)}...{exploiter.address.slice(-4)}
                  </div>
                </td>
                <td className="px-3 py-2 text-right">
                  <span className="text-red-300 font-bold">
                    {exploiter.amountStolen.toLocaleString()}
                  </span>
                  <span className="text-red-500/70 text-xs ml-1">VBMS</span>
                </td>
                <td className="px-3 py-2 text-right text-red-400/80 font-mono">
                  {exploiter.claims}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="bg-red-900/30 px-4 py-2 border-t border-red-800/50">
        <p className="text-red-500/80 text-xs">
          <span className="font-bold">Exploit:</span>{" "}
          {shameData.summary.exploitType}
        </p>
        <a
          href="https://github.com/JVHBO/vibe-most-wanted/blob/main/EXPLOIT-REPORT-2025-12-12.md"
          target="_blank"
          rel="noopener noreferrer"
          className="text-red-400 hover:text-red-300 text-xs underline"
        >
          Full Report on GitHub
        </a>
      </div>
    </div>
  );
}
