/**
 * /api/raffle/sync-base
 *
 * Webhook endpoint para detectar eventos TicketPurchased na Base chain.
 * Registrar no Alchemy como Address Activity webhook apontando para esta rota.
 *
 * Fluxo:
 *   Alchemy detecta TX no VBMSRaffleBase
 *   → POST aqui com payload + assinatura HMAC
 *   → Valida assinatura com ALCHEMY_RAFFLE_SIGNING_KEY
 *   → Parseia evento TicketPurchased
 *   → Chama processBaseTicketPurchase no Convex
 */

import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

// ─── Constantes ────────────────────────────────────────────────────────────────
// topic0 = keccak256("TicketPurchased(address,uint256,uint256,address,uint256)")
// NOTE: recalculate this after deploying the new VBMSRaffleBase contract.
// Old event (3 params): "0x9d9af8e38d66c62e2c12f0225249fd9d721c54b83f48d9352c97c6cacdcb6f31"
// New event (4 params, includes token address): recompute with ethers.utils.id("TicketPurchased(address,uint256,uint256,address,uint256)")
const TICKET_PURCHASED_TOPIC = "0x3c21b9b2d77366bb49d2e24d368d043e15a59329cb5f15eccdc99ac5ffaa2b6f";

const VBMS_ADDR = "0xf14c1dc8ce5fe65413379f76c43fa1460c31e728";
const USDC_ADDR = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// ─── Validação de assinatura Alchemy ──────────────────────────────────────────
function validateAlchemySignature(body: string, signature: string | null, signingKey: string): boolean {
  if (!signature) return false;
  const hmac = createHmac("sha256", signingKey);
  hmac.update(body, "utf8");
  return hmac.digest("hex") === signature;
}

// ─── Decodifica log do evento ──────────────────────────────────────────────────
function decodeTicketPurchased(log: {
  topics: string[];
  data: string;
  transactionHash: string;
  blockNumber: string;
}): {
  buyer: string;
  count: number;
  epoch: number;
  txHash: string;
  blockNumber: number;
  token: string;
} | null {
  try {
    if (!log.topics || log.topics[0]?.toLowerCase() !== TICKET_PURCHASED_TOPIC.toLowerCase()) {
      return null;
    }
    // TicketPurchased(address indexed buyer, uint256 count, uint256 amount, address token, uint256 indexed raffleEpoch)
    // topics[0]=sig, topics[1]=buyer, topics[2]=raffleEpoch
    const buyer = "0x" + log.topics[1].slice(26).toLowerCase();
    const epoch = parseInt(log.topics[2] ?? "0x1", 16);

    // data = abi.encode(count, amount, token) — each 32 bytes
    const data = log.data.startsWith("0x") ? log.data.slice(2) : log.data;
    const count = parseInt(data.slice(0, 64), 16);
    // token address is in data[128:192], rightmost 40 hex chars = 20 bytes
    const tokenHex = data.length >= 192 ? "0x" + data.slice(152, 192).toLowerCase() : null;

    let token = "VBMS";
    if (tokenHex === "0x0000000000000000000000000000000000000000") token = "ETH";
    else if (tokenHex === USDC_ADDR) token = "USDC";
    else if (tokenHex && tokenHex !== VBMS_ADDR) token = tokenHex; // unknown token

    const txHash = log.transactionHash;
    const blockNumber = parseInt(log.blockNumber, 16);

    if (!buyer || isNaN(count) || count <= 0) return null;

    return { buyer, count, epoch, txHash, blockNumber, token };
  } catch {
    return null;
  }
}

// ─── POST handler ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const signingKey = process.env.ALCHEMY_RAFFLE_SIGNING_KEY;
  if (!signingKey) {
    return NextResponse.json({ error: "Webhook signing key not configured" }, { status: 500 });
  }

  const body = await req.text();
  const signature = req.headers.get("x-alchemy-signature");

  // Valida assinatura HMAC — rejeita requests não autenticados
  if (!validateAlchemySignature(body, signature, signingKey)) {
    console.warn("[raffle/sync-base] Invalid signature");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: any;
  try {
    payload = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const baseContractAddress = (process.env.RAFFLE_BASE_ADDRESS ?? "").toLowerCase();
  if (!baseContractAddress) {
    return NextResponse.json({ error: "RAFFLE_BASE_ADDRESS not configured" }, { status: 500 });
  }

  // Alchemy Address Activity webhook — payload.event.activity[]
  const activities: any[] = payload?.event?.activity ?? [];
  const processed: string[] = [];
  const skipped: string[]   = [];
  const errors: string[]    = [];

  for (const activity of activities) {
    // Cada activity pode ter múltiplos logs
    const logs: any[] = activity?.log ? [activity.log] : (activity?.logs ?? []);

    for (const log of logs) {
      // Filtra logs do contrato Base
      if ((log?.address ?? "").toLowerCase() !== baseContractAddress) continue;

      const decoded = decodeTicketPurchased(log);
      if (!decoded) {
        skipped.push(log?.transactionHash ?? "unknown");
        continue;
      }

      try {
        // Chama Convex — processBaseTicketPurchase é internalAction
        // Precisamos chamar via mutation pública ou via HTTP action
        // Como não temos rota pública, usamos recordARBEntry adaptado para base
        // A função internalAction só pode ser chamada internamente, mas podemos usar
        // uma mutation wrapper pública protegida pelo VMW_INTERNAL_SECRET
        const internalSecret = process.env.VMW_INTERNAL_SECRET;
        if (!internalSecret) throw new Error("VMW_INTERNAL_SECRET not set");

        await convex.mutation(api.raffle.recordBaseEntryPublic, {
          adminKey:    internalSecret,
          buyer:       decoded.buyer,
          count:       decoded.count,
          txHash:      decoded.txHash,
          epoch:       decoded.epoch,
          blockNumber: decoded.blockNumber,
          token:       decoded.token,
        });

        processed.push(decoded.txHash);
        console.log(`[raffle/sync-base] Processed: ${decoded.buyer} × ${decoded.count} (tx: ${decoded.txHash})`);
      } catch (e: any) {
        console.error(`[raffle/sync-base] Error processing ${log?.transactionHash}:`, e.message);
        errors.push(log?.transactionHash ?? "unknown");
      }
    }
  }

  return NextResponse.json({
    ok: true,
    processed: processed.length,
    skipped: skipped.length,
    errors: errors.length,
    txHashes: processed,
  });
}

// GET para health check / verificação do Alchemy
export async function GET() {
  return NextResponse.json({ ok: true, endpoint: "raffle/sync-base" });
}
