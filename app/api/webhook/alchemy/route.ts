/**
 * Alchemy Webhook Handler
 *
 * Receives NFT transfer events from Alchemy and updates Convex database.
 * This is the source of truth for NFT ownership.
 *
 * Webhook setup in Alchemy Dashboard:
 * 1. Go to https://dashboard.alchemy.com/webhooks
 * 2. Create new webhook
 * 3. Select "NFT Activity" type
 * 4. Add all collection contracts
 * 5. Set webhook URL to: https://www.vibemostwanted.xyz/api/webhook/alchemy
 * 6. Copy signing key to ALCHEMY_WEBHOOK_SIGNING_KEY env var
 */

import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { internal } from "@/convex/_generated/api";
import { createHmac } from "crypto";

// Collection contract to ID mapping (from lib/collections.ts)
const CONTRACT_TO_COLLECTION: Record<string, string> = {
  // All collection contracts (lowercase)
  "0xf14c1dc8ce5fe65413379f76c43fa1460c31e728": "vibe",              // $VBMS
  "0xefe512e73ca7356c20a21aa9433bad5fc9342d46": "gmvbrs",            // GM VBRS
  "0x60274a138d026e3cb337b40567100fdec3127565": "vibefid",           // VibeFID
  "0x70b4005a83a0b39325d27cf31bd4a7a30b15069f": "viberuto",          // Viberuto
  "0xf0bf71bcd1f1aeb1ba6be0afbc38a1abe9aa9150": "meowverse",         // Meowverse
  "0x8cb5b730943b25403ccac6d5fd649bd0cbde76d8": "poorlydrawnpepes",  // Poorly Drawn Pepes
  "0x1f16007c7f08bf62ad37f8cfaf87e1c0cf8e2aea": "teampothead",       // Team Pothead
  "0x34d639c63384a00a2d25a58f73bea73856aa0550": "tarot",             // Tarot
  "0x3ff41af61d092657189b1d4f7d74d994514724bb": "baseballcabal",     // Baseball Cabal
  "0xc7f2d8c035b2505f30a5417c0374ac0299d88553": "vibefx",            // Vibe FX
  "0x319b12e8eba0be2eae1112b357ba75c2c178b567": "historyofcomputer", // History of Computer
  "0xfeabae8bdb41b2ae507972180df02e70148b38e1": "cumioh",            // $CU-MI-OH!
  "0x120c612d79a3187a3b8b4f4bb924cebe41eb407a": "viberotbangers",    // Vibe Rot Bangers
};

// Initialize Convex client
const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL!;
const convex = new ConvexHttpClient(convexUrl);

/**
 * Verify Alchemy webhook signature
 */
function verifySignature(body: string, signature: string, signingKey: string): boolean {
  if (!signingKey) {
    console.warn("[Webhook] No signing key configured, skipping verification");
    return true; // Allow in dev
  }

  const hmac = createHmac("sha256", signingKey);
  hmac.update(body);
  const expectedSignature = hmac.digest("hex");

  return signature === expectedSignature;
}

/**
 * Parse Alchemy NFT Activity webhook payload
 */
interface AlchemyNFTActivity {
  network: string;
  activity: Array<{
    fromAddress: string;
    toAddress: string;
    contractAddress: string;
    erc721TokenId?: string;
    erc1155Metadata?: Array<{ tokenId: string; value: string }>;
    category: string; // "token" for NFT transfers
    blockNum: string; // hex block number
    hash: string; // tx hash
  }>;
}

export async function POST(request: Request) {
  try {
    // Get raw body for signature verification
    const rawBody = await request.text();
    const signature = request.headers.get("x-alchemy-signature") || "";
    const signingKey = process.env.ALCHEMY_WEBHOOK_SIGNING_KEY || "";

    // Verify signature
    if (!verifySignature(rawBody, signature, signingKey)) {
      console.error("[Webhook] Invalid signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // Parse payload
    const payload: AlchemyNFTActivity = JSON.parse(rawBody);

    if (!payload.activity || payload.activity.length === 0) {
      return NextResponse.json({ message: "No activity" }, { status: 200 });
    }

    console.log(`[Webhook] Received ${payload.activity.length} activities from Alchemy`);

    // Process each transfer
    let processed = 0;
    let skipped = 0;

    for (const activity of payload.activity) {
      // Only process NFT transfers (category = "token")
      if (activity.category !== "token" && activity.category !== "erc721") {
        skipped++;
        continue;
      }

      const contractAddress = activity.contractAddress.toLowerCase();
      const collectionId = CONTRACT_TO_COLLECTION[contractAddress];

      if (!collectionId) {
        console.log(`[Webhook] Unknown contract: ${contractAddress}`);
        skipped++;
        continue;
      }

      // Get token ID (ERC721 or ERC1155)
      let tokenId: string | undefined;
      if (activity.erc721TokenId) {
        // Convert hex to decimal string
        tokenId = parseInt(activity.erc721TokenId, 16).toString();
      } else if (activity.erc1155Metadata?.[0]?.tokenId) {
        tokenId = parseInt(activity.erc1155Metadata[0].tokenId, 16).toString();
      }

      if (!tokenId) {
        console.log(`[Webhook] No tokenId found for activity`);
        skipped++;
        continue;
      }

      const blockNumber = parseInt(activity.blockNum, 16);

      // Call Convex mutation to handle transfer
      try {
        await convex.mutation(internal.nftOwnership.handleNFTTransfer, {
          contractAddress,
          tokenId,
          fromAddress: activity.fromAddress,
          toAddress: activity.toAddress,
          collectionId,
          blockNumber,
          // Metadata will be fetched separately if needed
        });
        processed++;
      } catch (error) {
        console.error(`[Webhook] Failed to process transfer: ${error}`);
      }
    }

    console.log(`[Webhook] Processed: ${processed}, Skipped: ${skipped}`);

    return NextResponse.json({
      success: true,
      processed,
      skipped,
    });

  } catch (error: any) {
    console.error("[Webhook] Error:", error);
    return NextResponse.json(
      { error: error.message || "Webhook processing failed" },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    status: "ok",
    message: "Alchemy webhook endpoint active",
    collections: Object.keys(CONTRACT_TO_COLLECTION).length,
  });
}
