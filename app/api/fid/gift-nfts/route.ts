/**
 * API Route: GET /api/gift-nfts?address=0x...&collection=vibe
 *
 * Fetches user's NFTs from giftable collections (LTC collections).
 * Uses Reservoir API (free for public data).
 * Excludes: AFCL, VibeFID, Nothing, Custom
 */

import { NextResponse } from "next/server";

// Giftable collections with their contract addresses
const GIFTABLE_COLLECTIONS = [
  { id: 'vmw', name: 'Vibe Most Wanted', contract: '0xf14c1dc8ce5fe65413379f76c43fa1460c31e728' },
  { id: 'gmvbrs', name: 'GM VBRS', contract: '0x3c781E5Ad1a2e994DC150849cCC0e91207845047' },
  { id: 'viberuto', name: 'Viberuto', contract: '0xE2f420b10654d1b9e4a49AFc0fD8e81f0B72b36b' },
  { id: 'meowverse', name: 'Meowverse', contract: '0x18eC55B9b8302DC00BF4cc5b40c5775c22a47c73' },
  { id: 'poorlydrawnpepes', name: 'Poorly Drawn Pepes', contract: '0xbcc8c8b9b67dbca52db53fe944d61e10a40b4ba4' },
  { id: 'teampothead', name: 'Team Pothead', contract: '0x91Fc5B0F10245AA7F9F9c43c88b03f5A61Addb65' },
  { id: 'tarot', name: 'Tarot', contract: '0xD6fe6462AFF59cB1f2d002614bb23ebeb6a55917' },
  { id: 'baseballcabal', name: 'Baseball Cabal', contract: '0xB9FA56b8803fC95aBB7C2e6E30E4a0C3F9ed2EBc' },
  { id: 'vibefx', name: 'Vibe FX', contract: '0x28b5c04BC6d395a9f0F52D0A92BEDC08ca6Ae577' },
  { id: 'historyofcomputer', name: 'History of Computer', contract: '0xC6beD1C230FC7537E09C4f1E22f07e2ED3B37C10' },
  { id: 'cumioh', name: '$CU-MI-OH!', contract: '0x628bC5E5b7e55d2C66Ae8c66ef99c323c44E88f9' },
  { id: 'viberotbangers', name: 'Vibe Rot Bangers', contract: '0x60F2c5a84155f08DB58c28d85fA3F36eEEd8B20F' },
];

// OpenSea API key
const OPENSEA_API_KEY = process.env.OPENSEA_API_KEY || '7805aa61f1a04c90ab1e4a274af51617';

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
