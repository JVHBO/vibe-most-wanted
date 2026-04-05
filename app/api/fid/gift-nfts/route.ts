/**
 * API Route: GET /api/gift-nfts?address=0x...&collection=vibe
 *
 * Fetches user's NFTs from giftable collections (LTC collections).
 * Uses Reservoir API (free for public data).
 * Excludes: AFCL, VibeFID, Nothing, Custom
 */

import { NextResponse } from "next/server";

// Giftable collections with their contract addresses (only active collections)
const GIFTABLE_COLLECTIONS = [
  { id: 'vibe', name: 'Vibe Most Wanted', contract: '0xf14c1dc8ce5fe65413379f76c43fa1460c31e728' },
];

// OpenSea API key
const OPENSEA_API_KEY = process.env.OPENSEA_API_KEY || '';

// Use OpenSea API (free tier)
async function fetchNFTsFromOpenSea(ownerAddress: string, contractAddress: string, collectionId: string) {
  // OpenSea uses chain/account/nfts endpoint with contract filter
  const url = `https://api.opensea.io/api/v2/chain/base/account/${ownerAddress}/nfts?limit=100`;

  const res = await fetch(url, {
    headers: {
      accept: 'application/json',
      'X-API-KEY': OPENSEA_API_KEY,
    },
  });

  if (!res.ok) {
    console.error(`OpenSea error for ${collectionId}:`, res.status);
    return [];
  }

  const data = await res.json();
  const allNfts = data.nfts || [];

  // Filter by contract address
  return allNfts.filter((nft: any) =>
    nft.contract?.toLowerCase() === contractAddress.toLowerCase()
  );
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get("address");
    const collectionId = searchParams.get("collection");

    if (!address) {
      return NextResponse.json({ error: "Missing address" }, { status: 400 });
    }

    // If collection specified, only fetch from that collection
    const collectionsToFetch = collectionId
      ? GIFTABLE_COLLECTIONS.filter(c => c.id === collectionId)
      : GIFTABLE_COLLECTIONS;

    if (collectionId && collectionsToFetch.length === 0) {
      return NextResponse.json({ error: "Invalid collection" }, { status: 400 });
    }

    // Fetch NFTs from each collection
    const results = await Promise.all(
      collectionsToFetch.map(async (col) => {
        try {
          const nfts = await fetchNFTsFromOpenSea(address, col.contract, col.id);

          // Process NFTs (OpenSea format) - no filtering, let frontend handle it
          const processed = nfts.map((nft: any) => {
              const traits = nft.traits || [];
              const rarity = traits.find(
                (t: any) => t.trait_type?.toLowerCase() === 'rarity'
              )?.value || '';

              // Get image URL from OpenSea
              let imageUrl = nft.image_url || nft.display_image_url || '';

              // Convert IPFS URLs
              if (imageUrl.startsWith('ipfs://')) {
                imageUrl = `https://ipfs.io/ipfs/${imageUrl.slice(7)}`;
              }

              return {
                tokenId: nft.identifier || nft.token_id,
                name: nft.name || `#${nft.identifier || nft.token_id}`,
                imageUrl,
                rarity,
                collectionId: col.id,
                collectionName: col.name,
                contractAddress: col.contract,
              };
            });

          return { collectionId: col.id, nfts: processed };
        } catch (err) {
          console.error(`Error fetching ${col.id}:`, err);
          return { collectionId: col.id, nfts: [] };
        }
      })
    );

    // Build response
    const collections: Record<string, any[]> = {};
    let totalNfts = 0;

    for (const result of results) {
      if (result.nfts.length > 0) {
        collections[result.collectionId] = result.nfts;
        totalNfts += result.nfts.length;
      }
    }

    // If fetching single collection, return simpler response
    if (collectionId) {
      const nfts = collections[collectionId] || [];
      return NextResponse.json({
        success: true,
        collectionId,
        nfts,
        count: nfts.length,
      });
    }

    const collectionsInfo = GIFTABLE_COLLECTIONS
      .map(col => ({
        id: col.id,
        name: col.name,
        count: collections[col.id]?.length || 0,
      }))
      .filter(c => c.count > 0);

    return NextResponse.json({
      success: true,
      totalNfts,
      collections,
      collectionsInfo,
    });

  } catch (error: any) {
    console.error("Error fetching gift NFTs:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch NFTs" },
      { status: 500 }
    );
  }
}
