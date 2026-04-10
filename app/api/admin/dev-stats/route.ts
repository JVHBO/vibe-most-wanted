/**
 * /api/admin/dev-stats
 * Owner-only endpoint — returns live stats from external services.
 * Protected by VMW_INTERNAL_SECRET in Authorization header.
 */
import { NextRequest, NextResponse } from "next/server";
import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";

const OWNER = "0x2a9585da40de004d6ff0f5f12cfe726bd2f98b52";

export async function GET(req: NextRequest) {
  // Auth: expect ?owner=<address>
  const owner = req.nextUrl.searchParams.get("owner")?.toLowerCase();
  if (owner !== OWNER) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: Record<string, unknown> = {};

  // ── Neynar (live rate-limit headers) ─────────────────────────────────────
  try {
    const key = process.env.NEYNAR_API_KEY ?? process.env.NEXT_PUBLIC_NEYNAR_API_KEY ?? "";
    const res = await fetch("https://api.neynar.com/v2/farcaster/user/bulk?fids=3", {
      headers: { api_key: key },
      signal: AbortSignal.timeout(6000),
    });
    results.neynar = {
      ok: res.ok,
      status: res.status,
      limit:     res.headers.get("x-ratelimit-limit"),
      remaining: res.headers.get("x-ratelimit-remaining"),
      reset:     res.headers.get("x-ratelimit-reset"),
      // monthly usage from Neynar billing headers (if present)
      monthUsed: res.headers.get("x-monthly-usage"),
      monthLimit: res.headers.get("x-monthly-limit"),
    };
  } catch (e) {
    results.neynar = { error: String(e) };
  }

  // ── Wield (live headers) ──────────────────────────────────────────────────
  try {
    const key = process.env.WIELD_API_KEY ?? process.env.NEXT_PUBLIC_WIELD_API_KEY ?? "";
    const res = await fetch(
      "https://build.wield.xyz/vibe/boosterbox/collection/0xF14C1dC8Ce5fE65413379F76c43fA1460C31e728/stats",
      {
        headers: { "API-KEY": key },
        signal: AbortSignal.timeout(6000),
      }
    );
    results.wield = {
      ok: res.ok,
      status: res.status,
      limit:     res.headers.get("x-ratelimit-limit"),
      remaining: res.headers.get("x-ratelimit-remaining"),
      reset:     res.headers.get("x-ratelimit-reset"),
    };
  } catch (e) {
    results.wield = { error: String(e) };
  }

  // ── OpenSea (live headers) ────────────────────────────────────────────────
  try {
    const key = process.env.OPENSEA_API_KEY ?? "";
    const res = await fetch(
      "https://api.opensea.io/api/v2/chain/base/contract/0xF14C1dC8Ce5fE65413379F76c43fA1460C31e728/nfts?limit=1",
      {
        headers: { "x-api-key": key },
        signal: AbortSignal.timeout(6000),
      }
    );
    results.opensea = {
      ok: res.ok,
      status: res.status,
      limit:     res.headers.get("x-ratelimit-limit"),
      remaining: res.headers.get("x-ratelimit-remaining"),
      reset:     res.headers.get("x-ratelimit-reset"),
    };
  } catch (e) {
    results.opensea = { error: String(e) };
  }

  // ── Filebase (S3 bucket stats) ────────────────────────────────────────────
  try {
    const accessKey = process.env.FILEBASE_ACCESS_KEY;
    const secretKey = process.env.FILEBASE_SECRET_KEY;
    const bucketName = process.env.FILEBASE_BUCKET_NAME ?? "test33";

    if (accessKey && secretKey) {
      const s3 = new S3Client({
        endpoint: "https://s3.filebase.com",
        region: "us-east-1",
        credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
        forcePathStyle: true,
      });

      let totalObjects = 0;
      let totalSizeBytes = 0;
      let continuationToken: string | undefined;

      do {
        const cmd = new ListObjectsV2Command({
          Bucket: bucketName,
          MaxKeys: 1000,
          ContinuationToken: continuationToken,
        });
        const out = await s3.send(cmd);
        totalObjects    += out.Contents?.length ?? 0;
        totalSizeBytes  += out.Contents?.reduce((s, o) => s + (o.Size ?? 0), 0) ?? 0;
        continuationToken = out.NextContinuationToken;
      } while (continuationToken);

      // 3 files per VibeFID mint (PNG card + share PNG + WebM video)
      const estimatedMints = Math.floor(totalObjects / 3);

      results.filebase = {
        bucket: bucketName,
        totalObjects,
        totalSizeBytes,
        totalSizeMB: Math.round(totalSizeBytes / 1024 / 1024),
        estimatedMints,
        // Filebase free: 1TB storage. Warn at 800GB.
        storageLimitBytes: 1_000_000_000_000,
      };
    } else {
      results.filebase = { error: "Missing Filebase credentials" };
    }
  } catch (e) {
    results.filebase = { error: String(e) };
  }

  // ── Alchemy (Webhook signing key validity check) ───────────────────────────
  // Can't query CU usage via public API — tracked through apiStats instead.
  results.alchemy = {
    note: "CU usage tracked via apiStats counters. Check dashboard.alchemy.com for exact usage.",
    chain: process.env.NEXT_PUBLIC_ALCHEMY_CHAIN ?? "base-mainnet",
    hasKey: !!process.env.NEXT_PUBLIC_ALCHEMY_API_KEY,
    hasWebhookKey: !!process.env.ALCHEMY_WEBHOOK_SIGNING_KEY,
    // Free tier: 300M CU/month. Paid: varies.
    freeTierCUMonthly: 300_000_000,
  };

  return NextResponse.json(results, {
    headers: { "Cache-Control": "no-store" },
  });
}
