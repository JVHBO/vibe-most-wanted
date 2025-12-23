import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { createPublicClient, http, formatEther } from "viem";
import { base } from "viem/chains";
import { Id } from "@/convex/_generated/dataModel";

function getConvexClient() {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) throw new Error("NEXT_PUBLIC_CONVEX_URL not defined");
  return new ConvexHttpClient(url);
}

// Contract addresses
const VBMS_TOKEN = "0xb03439567cd22f278b21e1ffcdfb8e1696763827";
const POOL_ADDRESS = "0x062b914668f3fd35c3ae02e699cb82e1cf4be18b";

/**
 * Add VBMS to an existing cast's pool
 * 1. Verify TX transferred VBMS from user to pool
 * 2. Add to pool via Convex mutation
 */
export async function POST(request: NextRequest) {
  try {
    const convex = getConvexClient();
    const { txHash, address, auctionId, bidAmount } = await request.json();

    if (!txHash || !address || !auctionId || bidAmount === undefined) {
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
        if (log.topics.length >= 3) {
          const from = `0x${log.topics[1]?.slice(26)}`.toLowerCase();
          const to = `0x${log.topics[2]?.slice(26)}`.toLowerCase();

          if (to === POOL_ADDRESS.toLowerCase()) {
            fromAddress = from;
            const valueHex = log.data.slice(0, 66);
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
        { success: false, error: "Transfer sender doesn't match contributor" },
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
          error: `Transfer amount (${transferAmountVBMS}) doesn't match contribution (${bidAmount})`,
        },
        { status: 400 }
      );
    }

    // Add to pool via Convex
    const result = await convex.mutation(api.castAuctions.addToPool, {
      address: normalizedAddress,
      auctionId: auctionId as Id<"castAuctions">,
      bidAmount,
      txHash,
    });

    return NextResponse.json({
      success: true,
      contribution: transferAmountVBMS,
      ...result,
    });
  } catch (error: any) {
    console.error("[AddToPool] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to add to pool" },
      { status: 500 }
    );
  }
}
