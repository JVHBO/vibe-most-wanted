"use client";

import React, { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { fetchAndProcessNFTs } from "../../lib/nft-fetcher";
import AchievementsView from "../../components/AchievementsView";

export default function AchievementsPage() {
  const { address } = useAccount();
  const [nfts, setNfts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const addr = address?.toLowerCase();

  // Fetch NFTs when user connects
  useEffect(() => {
    const fetchNFTs = async () => {
      if (!addr) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const fetchedNFTs = await fetchAndProcessNFTs(addr, {
          refreshMetadata: false, // Fast load
          maxPages: 10,
        });
        setNfts(fetchedNFTs);
      } catch (error) {
        console.error("Error fetching NFTs:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchNFTs();
  }, [addr]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-900 via-indigo-900 to-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-spin">🏆</div>
          <p className="text-xl">Loading achievements...</p>
        </div>
      </div>
    );
  }

  return <AchievementsView playerAddress={addr} nfts={nfts} />;
}
