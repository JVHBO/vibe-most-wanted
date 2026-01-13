/**
 * API Route: GET /api/gift-nfts?address=0x...
 *
 * Fetches user's NFTs from giftable collections (LTC collections).
 * Excludes: AFCL, VibeFID, Nothing, Custom
 */

import { NextResponse } from "next/server";
import { fetchNFTs, getImage } from "@/lib/nft/fetcher";
import { findAttr } from "@/lib/nft/attributes";
import { COLLECTIONS, type CollectionId } from "@/lib/collections";

// Collections that can be gifted via VibeMail (only active collections)
const GIFTABLE_COLLECTIONS: CollectionId[] = [
  'vibe',           // $VBMS
  'gmvbrs',         // GM VBRS
  'viberuto',       // Viberuto
  'meowverse',      // Meowverse
  'viberotbangers', // Vibe Rot Bangers
];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get("address");

    if (!address) {
      return NextResponse.json({ error: "Missing address" }, { status: 400 });
    }

    // Fetch NFTs from each giftable collection
    const allNfts: any[] = [];

    for (const collectionId of GIFTABLE_COLLECTIONS) {
      const collection = COLLECTIONS[collectionId];
      if (!collection || !collection.enabled || !collection.contractAddress) {
        continue;
      }

      try {
        const nfts = await fetchNFTs(address, collection.contractAddress);

        // Tag each NFT with collection info
        const taggedNfts = nfts.map(nft => ({
          ...nft,
          collectionId,
          collectionName: collection.displayName,
          contractAddress: collection.contractAddress,
        }));

        allNfts.push(...taggedNfts);
      } catch (error) {
        console.error(`Error fetching ${collectionId}:`, error);
        // Continue with other collections
      }
    }

    // Process NFTs to get image URLs and filter out unopened
    const processed = await Promise.all(
      allNfts.map(async (nft) => {
        try {
          const rarity = findAttr(nft, 'rarity') || findAttr(nft, 'Rarity') || '';
          const status = findAttr(nft, 'status') || findAttr(nft, 'Status') || '';

          // Skip unopened cards
          if (rarity.toLowerCase() === 'unopened' || status.toLowerCase() === 'unopened') {
            return null;
          }

          const imageUrl = await getImage(nft, nft.collectionId);
          const name = nft?.raw?.metadata?.name || nft?.name || `#${nft.tokenId}`;

          return {
            tokenId: nft.tokenId,
            name,
            imageUrl,
            rarity,
            collectionId: nft.collectionId,
            collectionName: nft.collectionName,
            contractAddress: nft.contractAddress,
          };
        } catch (error) {
          console.error(`Error processing NFT ${nft.tokenId}:`, error);
          return null;
        }
      })
    );

    // Filter out null values and sort by collection
    const validNfts = processed.filter(Boolean);

    // Group by collection
    const groupedByCollection: Record<string, typeof validNfts> = {};
    for (const nft of validNfts) {
      if (!nft) continue;
      const collectionId = nft.collectionId;
      if (!groupedByCollection[collectionId]) {
        groupedByCollection[collectionId] = [];
      }
      groupedByCollection[collectionId].push(nft);
    }

    return NextResponse.json({
      success: true,
      totalNfts: validNfts.length,
      collections: groupedByCollection,
      collectionsInfo: GIFTABLE_COLLECTIONS.map(id => ({
        id,
        name: COLLECTIONS[id].displayName,
        count: groupedByCollection[id]?.length || 0,
      })).filter(c => c.count > 0),
    });

  } catch (error: any) {
    console.error("Error fetching gift NFTs:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch NFTs" },
      { status: 500 }
    );
  }
}
