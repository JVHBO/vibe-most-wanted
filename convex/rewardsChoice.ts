/**
 * REWARDS CHOICE SYSTEM
 *
 * Allows players to choose between "Claim Now" or "Claim Later" for rewards
 * Works with PvE, PvP, Attack, and Leaderboard systems
 */

import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { ethers } from "ethers";

// ========== HELPERS ==========

function generateNonce(): string {
  // Generate bytes32 nonce (64 hex characters)
  const timestamp = Date.now().toString(16).padStart(16, '0');
  const random1 = Math.random().toString(16).substring(2).padStart(16, '0');
  const random2 = Math.random().toString(16).substring(2).padStart(16, '0');
  const random3 = Math.random().toString(16).substring(2).padStart(16, '0');
  return `0x${timestamp}${random1}${random2}${random3}`.substring(0, 66); // 0x + 64 chars
}

async function signClaimMessage(
  address: string,
  amount: number,
  nonce: string
): Promise<string> {
  // Get private key from environment variable
  const SIGNER_PRIVATE_KEY = process.env.VBMS_SIGNER_PRIVATE_KEY;

  if (!SIGNER_PRIVATE_KEY) {
    throw new Error('VBMS_SIGNER_PRIVATE_KEY not configured in environment variables');
  }

  // Create wallet from private key
  const wallet = new ethers.Wallet(SIGNER_PRIVATE_KEY);

  // Encode message: keccak256(abi.encodePacked(address, uint256, bytes32))
  // Amount needs to be converted to wei (18 decimals)
  const amountInWei = ethers.parseEther(amount.toString());

  const messageHash = ethers.solidityPackedKeccak256(
    ['address', 'uint256', 'bytes32'],
    [address, amountInWei, nonce]
  );

  // Sign the message hash WITH Ethereum Signed Message prefix
  // Contract expects: keccak256("\x19Ethereum Signed Message:\n32" + messageHash)
  const signature = await wallet.signMessage(ethers.getBytes(messageHash));

  console.log(`[Rewards Signature] Address: ${address}, Amount: ${amount} VBMS (${amountInWei} wei), Nonce: ${nonce}`);
  console.log(`[Rewards Signature] Message Hash: ${messageHash}`);
  console.log(`[Rewards Signature] Signature: ${signature}`);
  console.log(`[Rewards Signature] Signer Address: ${wallet.address}`);

  return signature;
}

/**
 * Process reward choice after battle - Claim Now or Send to Inbox
 */
export const processRewardChoice = mutation({
  args: {
    address: v.string(),
    amount: v.number(),
    choice: v.union(v.literal("claim_now"), v.literal("claim_later")),
    source: v.union(
      v.literal("pve"),
      v.literal("pvp"),
      v.literal("attack"),
      v.literal("defense"),
      v.literal("leaderboard")
    ),
  },
  handler: async (ctx, { address, amount, choice, source }) => {
    console.log('[processRewardChoice] Called with:', { address, amount, choice, source });

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q) => q.eq("address", address.toLowerCase()))
      .first();

    if (!profile) {
      console.error('[processRewardChoice] Profile not found for address:', address);
      throw new Error("Profile not found");
    }

    console.log('[processRewardChoice] Profile found:', {
      coins: profile.coins,
      inbox: profile.inbox
    });

    if (choice === "claim_now") {
      // CLAIM NOW: Convert VBMS to VBMS blockchain
      const currentCoins = profile.coins || 0;

      console.log('[processRewardChoice] Checking balance:', { currentCoins, amount });

      if (currentCoins < amount) {
        const error = `Saldo insuficiente. Você tem ${currentCoins} VBMS, precisa de ${amount}`;
        console.error('[processRewardChoice]', error);
        throw new Error(error);
      }

      // Deduct VBMS
      const newCoinsBalance = currentCoins - amount;

      console.log('[processRewardChoice] Generating signature...');

      // Generate signature for blockchain claim
      const nonce = generateNonce();
      let signature: string;

      try {
        signature = await signClaimMessage(address, amount, nonce);
        console.log('[processRewardChoice] Signature generated successfully');
      } catch (signError: any) {
        console.error('[processRewardChoice] Signature generation failed:', signError);
        throw new Error(`Failed to generate signature: ${signError.message}`);
      }

      // Update profile - remove VBMS
      await ctx.db.patch(profile._id, {
        coins: newCoinsBalance,
        lastUpdated: Date.now(),
      });

      // Track analytics
      await ctx.db.insert("claimAnalytics", {
        playerAddress: address.toLowerCase(),
        choice: "immediate",
        amount,
        inboxTotal: profile.inbox || 0,
        bonusAvailable: false,
        timestamp: Date.now(),
      });

      return {
        success: true,
        choice: "claim_now",
        amount: amount,
        nonce: nonce,
        signature: signature,
        newCoinsBalance: newCoinsBalance,
        message: `💳 ${amount} VBMS convertidos para VBMS! Assine a transação.`,
      };
    } else {
      // CLAIM LATER: Keep in VBMS (do nothing, just close modal)
      return {
        success: true,
        choice: "claim_later",
        amount: amount,
        coinsBalance: profile.coins || 0,
        message: `📥 ${amount} VBMS guardados! Converta depois quando quiser.`,
      };
    }
  },
});

/**
 * Get pending rewards from a completed match
 * (This is called before the choice is made)
 */
export const getPendingReward = mutation({
  args: {
    address: v.string(),
    matchId: v.id("matches"),
  },
  handler: async (ctx, { address, matchId }) => {
    const match = await ctx.db.get(matchId);

    if (!match) {
      throw new Error("Match not found");
    }

    if (match.playerAddress.toLowerCase() !== address.toLowerCase()) {
      throw new Error("Unauthorized: Not your match");
    }

    // Check if already claimed
    if (match.rewardsClaimed) {
      throw new Error("Rewards already claimed");
    }

    const coinsEarned = match.coinsEarned || 0;

    return {
      matchId: matchId,
      coinsEarned: coinsEarned,
      matchType: match.type,
      result: match.result,
      canClaim: coinsEarned > 0,
    };
  },
});

/**
 * Mark match as claimed after processing reward choice
 */
export const markMatchAsClaimed = mutation({
  args: {
    matchId: v.id("matches"),
    claimType: v.union(v.literal("immediate"), v.literal("inbox")),
  },
  handler: async (ctx, { matchId, claimType }) => {
    const match = await ctx.db.get(matchId);

    if (!match) {
      throw new Error("Match not found");
    }

    if (match.rewardsClaimed) {
      throw new Error("Match already marked as claimed");
    }

    await ctx.db.patch(matchId, {
      rewardsClaimed: true,
      claimedAt: Date.now(),
      claimType: claimType,
    });

    return {
      success: true,
      matchId: matchId,
      claimType: claimType,
    };
  },
});
