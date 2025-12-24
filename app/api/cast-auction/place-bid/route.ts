import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { createPublicClient, http, parseAbi, formatEther } from "viem";
import { base } from "viem/chains";

function getConvexClient() {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) throw new Error("NEXT_PUBLIC_CONVEX_URL not defined");
  return new ConvexHttpClient(url);
}

// Contract addresses
const VBMS_TOKEN = "0xb03439567cd22f278b21e1ffcdfb8e1696763827";
const POOL_ADDRESS = "0x062b914668f3fd35c3ae02e699cb82e1cf4be18b";

// ERC20 Transfer event ABI
const transferEventAbi = parseAbi([
  "event Transfer(address indexed from, address indexed to, uint256 value)",
]);

/**
 * Verify VBMS transfer and place bid
 * 1. Verify TX transferred VBMS from user to pool
 * 2. Record bid in Convex
 */
export async function POST(request: NextRequest) {
  try {
    const convex = getConvexClient();
    const {
      txHash,
      address,
      slotNumber,
      bidAmount,
      castHash,
      warpcastUrl,
      castAuthorFid,
      castAuthorUsername,
      castAuthorPfp,
      castText,
    } = await request.json();

    if (!txHash || !address || bidAmount === undefined) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    const normalizedAddress = address.toLowerCase();

    // Create viem client to verify TX
    const client = createPublicClient({
      chain: base,
      transport: http(),
    });

    // Get transaction receipt
    const receipt = await client.getTransactionReceipt({
      hash: txHash as `0x${string}`,
    });

    if (!receipt) {
      return NextResponse.json(
        { success: false, error: "Transaction not found" },
        { status: 400 }
      );
    }

    if (receipt.status !== "success") {
      return NextResponse.json(
        { success: false, error: "Transaction failed" },
        { status: 400 }
      );
    }

    // Find Transfer event to pool
    let transferAmount = BigInt(0);
    let fromAddress = "";

    for (const log of receipt.logs) {
      if (log.address.toLowerCase() !== VBMS_TOKEN.toLowerCase()) continue;

      try {
        const event = {
          topics: log.topics,
          data: log.data,
        };

        // Check if this is a Transfer event to the pool
        // topics[0] = event signature
        // topics[1] = from (indexed)
        // topics[2] = to (indexed)
        if (log.topics.length >= 3) {
          const from = `0x${log.topics[1]?.slice(26)}`.toLowerCase();
          const to = `0x${log.topics[2]?.slice(26)}`.toLowerCase();

          if (to === POOL_ADDRESS.toLowerCase()) {
            fromAddress = from;
            // Value is in first 32 bytes of log.data (may have extra data appended like builder code)
            const valueHex = log.data.slice(0, 66); // 0x + 64 hex chars = 32 bytes
            transferAmount = BigInt(valueHex);
          }
        }
      } catch (e) {
        continue;
      }
    }

    if (transferAmount === BigInt(0)) {
      return NextResponse.json(
        { success: false, error: "No VBMS transfer to pool found in transaction" },
        { status: 400 }
      );
    }

    // Verify sender matches
    if (fromAddress !== normalizedAddress) {
      return NextResponse.json(
        { success: false, error: "Transfer sender doesn't match bidder" },
        { status: 400 }
      );
    }

    // Convert to number (VBMS has 18 decimals)
    const transferAmountVBMS = Number(formatEther(transferAmount));

    // Verify amount matches bid
    if (Math.abs(transferAmountVBMS - bidAmount) > 0.01) {
      return NextResponse.json(
        {
          success: false,
          error: `Transfer amount (${transferAmountVBMS}) doesn't match bid amount (${bidAmount})`,
        },
        { status: 400 }
      );
    }

    // Record bid in Convex
    const result = await convex.mutation(api.castAuctions.placeBidWithVBMS, {
      address: normalizedAddress,
      slotNumber,
      bidAmount,
      txHash,
      castHash,
      warpcastUrl,
      castAuthorFid,
      castAuthorUsername,
      castAuthorPfp,
      castText,
    });

    return NextResponse.json({
      ...result,
      success: true,
      bidAmount: transferAmountVBMS,
    });
  } catch (error: any) {
    console.error("[PlaceBid] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to place bid" },
      { status: 500 }
    );
  }
}
