"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useConvex, useMutation } from "convex/react";
import { useAccount } from "wagmi";
import { api } from "@/convex/_generated/api";
import Link from "next/link";

// ─── Owner ────────────────────────────────────────────────────────────────────
const OWNER_ADDRESS = "0x2a9585da40de004d6ff0f5f12cfe726bd2f98b52";

// ─── Cache ────────────────────────────────────────────────────────────────────
const CACHE_KEY = "vmw_admin_stats_v2";
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24h

// ─── Types ────────────────────────────────────────────────────────────────────
interface OverviewData {
  users:    { total: number; active24h: number; active7d: number; active30d: number };
  economy:  { totalCoins: number; totalInbox: number; totalLifetime: number; totalVbmsClaimed: number; claims24h: number; claims7d: number };
  matches:  { total: number; pvp: number; pve: number; attack: number; last24h: number; last7d: number };
  tcg:      { total: number; last24h: number };
  slots:    { total: number; last24h: number; totalWon: number; foilSpins: number };
  baccarat: { total: number; last24h: number; totalPot: number };
  raid:     { participants: number; active7d: number; totalDamage: number };
  vibefid:  { base: number; arb: number; total: number };
  raffle:   { entries: number };
  roulette: { total: number };
  bugs:     { total: number };
  fetchedAt: number;
}

interface NeynarUser {
  _id: string;
  fid: number;
  username: string;
  displayName: string;
  pfpUrl: string;
  neynarScore: number;
  rarity: string;
  followerCount: number;
  followingCount: number;
  powerBadge: boolean;
  chain?: string;
  mintedAt: number;
}

interface ApiStat {
  _id: string;
  key: string;
  value: number;
  lastUpdated: number;
}

interface LiveServiceData {
  neynar?: {
    ok?: boolean; status?: number;
    limit?: string | null; remaining?: string | null; reset?: string | null;
    monthUsed?: string | null; monthLimit?: string | null;
    error?: string;
  };
  wield?: { ok?: boolean; status?: number; limit?: string | null; remaining?: string | null; error?: string };
  opensea?: { ok?: boolean; status?: number; limit?: string | null; remaining?: string | null; reset?: string | null; error?: string };
  filebase?: {
    bucket?: string; totalObjects?: number; totalSizeBytes?: number;
    totalSizeMB?: number; estimatedMints?: number; storageLimitBytes?: number;
    error?: string;
  };
  alchemy?: {
    chain?: string; hasKey?: boolean; freeTierCUMonthly?: number; note?: string;
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString();
}

function fmtDate(ts: number): string {
  return new Date(ts).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}

function timeAgo(ts: number): string {
  const d = Date.now() - ts;
  if (d < 60_000)     return `${Math.floor(d / 1000)}s atrás`;
  if (d < 3_600_000)  return `${Math.floor(d / 60_000)}m atrás`;
  if (d < 86_400_000) return `${Math.floor(d / 3_600_000)}h atrás`;
  return `${Math.floor(d / 86_400_000)}d atrás`;
}

const RARITY_COLOR: Record<string, string> = {
  Common:    "bg-gray-200 text-gray-800",
  Rare:      "bg-blue-200 text-blue-900",
  Epic:      "bg-purple-200 text-purple-900",
  Legendary: "bg-yellow-200 text-yellow-900",
  Mythic:    "bg-red-200 text-red-900",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, color = "bg-white",
}: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className={`${color} border-2 border-black shadow-[3px_3px_0px_#000] p-4 rounded-sm`}>
      <div className="text-xs font-bold uppercase text-gray-500 tracking-widest mb-1">{label}</div>
      <div className="text-2xl font-black font-mono">{typeof value === "number" ? fmt(value) : value}</div>
      {sub && <div className="text-xs text-gray-500 mt-1">{sub}</div>}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h2 className="text-sm font-black uppercase tracking-widest border-b-2 border-black pb-1 mb-4">{title}</h2>
      {children}
    </div>
  );
}

// ─── Gauge bar ────────────────────────────────────────────────────────────────
function UsageBar({
  label, used, limit, unit, live = false, sublabel,
}: {
  label: string; used: number; limit: number; unit: string;
  live?: boolean; sublabel?: string;
}) {
  const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
  const barColor =
    pct > 85 ? "bg-red-500" :
    pct > 60 ? "bg-orange-400" :
    pct > 30 ? "bg-yellow-400" : "bg-green-500";
  const textColor =
    pct > 85 ? "text-red-600" :
    pct > 60 ? "text-orange-500" : "text-gray-700";

  return (
    <div className="bg-gray-50 border-2 border-black p-3 rounded-sm">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-black uppercase tracking-wide">{label}</span>
        {live && <span className="text-[9px] px-1 py-0.5 bg-green-200 text-green-800 font-black rounded">LIVE</span>}
      </div>
      {sublabel && <div className="text-[9px] text-gray-400 mb-1">{sublabel}</div>}
      <div className="h-3 bg-gray-200 border border-gray-300 rounded-sm overflow-hidden mb-1">
        <div className={`h-full ${barColor} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <div className="flex justify-between items-center">
        <span className="text-[10px] text-gray-500 font-mono">
          {fmt(used)} / {fmt(limit)} {unit}
        </span>
        <span className={`text-[10px] font-black ${textColor}`}>{pct.toFixed(1)}%</span>
      </div>
    </div>
  );
}

// ─── Service Card ─────────────────────────────────────────────────────────────
function ServiceCard({
  name, status, children, accent = "bg-gray-100",
}: {
  name: string; status?: "ok" | "warn" | "error" | "unknown";
  children: React.ReactNode; accent?: string;
}) {
  const dot =
    status === "ok"    ? "bg-green-400" :
    status === "warn"  ? "bg-yellow-400" :
    status === "error" ? "bg-red-500" : "bg-gray-400";

  return (
    <div className={`${accent} border-2 border-black shadow-[3px_3px_0px_#000] rounded-sm overflow-hidden`}>
      <div className="flex items-center gap-2 px-3 py-2 bg-black/5 border-b border-black/20">
        <div className={`w-2 h-2 rounded-full ${dot}`} />
        <span className="font-black uppercase text-xs tracking-wider">{name}</span>
      </div>
      <div className="p-3 space-y-2">{children}</div>
    </div>
  );
}

function KV({ k, v, mono = true }: { k: string; v: string | number | null | undefined; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-2 text-[11px]">
      <span className="text-gray-500">{k}</span>
      <span className={`font-black ${mono ? "font-mono" : ""} text-right`}>{v ?? "—"}</span>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminStatsPage() {
  const convex = useConvex();
  const { address } = useAccount();
  const isOwner = address?.toLowerCase() === OWNER_ADDRESS;

  const [overview,   setOverview]   = useState<OverviewData | null>(null);
  const [neynar,     setNeynar]     = useState<NeynarUser[]>([]);
  const [apiStats,   setApiStats]   = useState<ApiStat[]>([]);
  const [liveData,   setLiveData]   = useState<LiveServiceData | null>(null);

  const [loading,       setLoading]       = useState(true);
  const [loadMsg,       setLoadMsg]       = useState("Carregando...");
  const [error,         setError]         = useState<string | null>(null);
  const [neynarLoading, setNeynarLoading] = useState(true);
  const [devLoading,    setDevLoading]    = useState(true);
  const [liveLoading,   setLiveLoading]   = useState(false);

  const resetStats = useMutation(api.adminStats.resetApiStats);
  const [resetting, setResetting] = useState(false);

  const loadedRef = useRef(false);

  const loadAll = useCallback(async (force = false) => {
    setLoading(true);
    setError(null);

    // ── Overview (cache 24h) ──────────────────────────────────────────────────
    try {
      let usedCache = false;
      if (!force) {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached) as { data: OverviewData; ts: number };
          if (Date.now() - parsed.ts < CACHE_TTL) {
            setOverview(parsed.data);
            setLoading(false);
            usedCache = true;
          }
        }
      }
      if (!usedCache) {
        setLoadMsg("Buscando stats (Convex)...");
        const data = await convex.query(api.adminStats.getOverview, {});
        localStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() }));
        setOverview(data as unknown as OverviewData);
        setLoading(false);
      }
    } catch (e) {
      setError("Erro ao buscar overview: " + String(e));
      setLoading(false);
    }

    // ── Neynar table (one-shot, no cache) ────────────────────────────────────
    setNeynarLoading(true);
    try {
      setLoadMsg("Buscando Neynar scores...");
      const users = await convex.query(api.adminStats.getTopNeynarUsers, {});
      setNeynar(users as unknown as NeynarUser[]);
    } catch (e) {
      console.error("Neynar error:", e);
    } finally {
      setNeynarLoading(false);
    }

    // ── Dev panel (owner only) ────────────────────────────────────────────────
    if (address?.toLowerCase() === OWNER_ADDRESS) {
      setDevLoading(true);
      setLiveLoading(true);
      try {
        setLoadMsg("Buscando API stats...");
        const [stats, live] = await Promise.all([
          convex.query(api.adminStats.getApiStats, {}),
          fetch(`/api/admin/dev-stats?owner=${address.toLowerCase()}`).then(r => r.json()),
        ]);
        setApiStats(stats as unknown as ApiStat[]);
        setLiveData(live as LiveServiceData);
      } catch (e) {
        console.error("Dev panel error:", e);
      } finally {
        setDevLoading(false);
        setLiveLoading(false);
      }
    } else {
      setDevLoading(false);
      setLiveLoading(false);
    }
  }, [convex, address]);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    loadAll();
  }, [loadAll]);

  const handleReset = async () => {
    if (!address) return;
    if (!confirm("Resetar TODOS os contadores de API? (irreversível)")) return;
    setResetting(true);
    try {
      const r = await resetStats({ callerAddress: address });
      alert(`Resetados ${(r as any).reset} contadores.`);
      const stats = await convex.query(api.adminStats.getApiStats, {});
      setApiStats(stats as unknown as ApiStat[]);
    } catch (e) {
      alert("Erro: " + String(e));
    } finally {
      setResetting(false);
    }
  };

  const handleRefresh = () => {
    loadedRef.current = false;
    localStorage.removeItem(CACHE_KEY);
    setNeynar([]);
    setApiStats([]);
    setLiveData(null);
    loadAll(true);
  };

  // ── Helper: get sum of apiStats by key prefix ─────────────────────────────
  const sumStats = (prefix: string) =>
    apiStats.filter(s => s.key.includes(prefix)).reduce((sum, s) => sum + s.value, 0);
  const statVal = (key: string) =>
    apiStats.find(s => s.key === key)?.value ?? 0;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#f5f0e8] font-mono">

      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <div className="border-b-4 border-black bg-yellow-400 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="text-xs font-black uppercase border-2 border-black px-2 py-1 bg-white shadow-[2px_2px_0px_#000] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
          >
            ← Home
          </Link>
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight">VMW ANALYTICS</h1>
            <p className="text-xs text-black/60">
              {overview
                ? `Cache de ${fmtDate(overview.fetchedAt)} · atualiza a cada 24h`
                : loadMsg}
            </p>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="text-xs font-black uppercase border-2 border-black px-3 py-2 bg-white shadow-[3px_3px_0px_#000] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all disabled:opacity-50"
        >
          {loading ? "..." : "Force Refresh"}
        </button>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {error && (
          <div className="mb-4 p-3 border-2 border-red-600 bg-red-100 text-red-800 text-sm font-bold">{error}</div>
        )}

        {/* ── Users ────────────────────────────────────────────────────────── */}
        <Section title="Usuarios">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Total Cadastrados" value={overview?.users.total   ?? "—"} color="bg-blue-100" />
            <StatCard label="Ativos 24h"         value={overview?.users.active24h ?? "—"} color="bg-green-100" />
            <StatCard label="Ativos 7 dias"      value={overview?.users.active7d  ?? "—"} color="bg-green-50" />
            <StatCard label="Ativos 30 dias"     value={overview?.users.active30d ?? "—"} color="bg-green-50" />
          </div>
        </Section>

        {/* ── Economia ─────────────────────────────────────────────────────── */}
        <Section title="Economia">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <StatCard label="TESTVBMS Circulando" value={overview?.economy.totalCoins    ?? "—"} color="bg-orange-100" sub="nas carteiras" />
            <StatCard label="TESTVBMS Inbox"      value={overview?.economy.totalInbox    ?? "—"} color="bg-orange-50"  sub="não coletado" />
            <StatCard label="Lifetime Earned"     value={overview?.economy.totalLifetime ?? "—"} color="bg-yellow-100" sub="total histórico" />
            <StatCard label="VBMS Claimado"       value={overview?.economy.totalVbmsClaimed ?? "—"} color="bg-purple-100" sub="on-chain total" />
            <StatCard label="Claims 24h"          value={overview?.economy.claims24h ?? "—"} color="bg-purple-50" />
            <StatCard label="Claims 7 dias"       value={overview?.economy.claims7d  ?? "—"} color="bg-purple-50" />
          </div>
        </Section>

        {/* ── Batalhas ─────────────────────────────────────────────────────── */}
        <Section title="Batalhas">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
            <StatCard label="Total Matches"    value={overview?.matches.total   ?? "—"} color="bg-red-100" />
            <StatCard label="PvP"              value={overview?.matches.pvp     ?? "—"} color="bg-red-50" />
            <StatCard label="PvE / Poker CPU"  value={overview?.matches.pve     ?? "—"} color="bg-red-50" />
            <StatCard label="Attack Raids"     value={overview?.matches.attack  ?? "—"} color="bg-red-50" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Matches 24h"      value={overview?.matches.last24h ?? "—"} color="bg-orange-50" />
            <StatCard label="Matches 7 dias"   value={overview?.matches.last7d  ?? "—"} color="bg-orange-50" />
            <StatCard label="TCG Total"        value={overview?.tcg.total       ?? "—"} color="bg-cyan-100" />
            <StatCard label="TCG 24h"          value={overview?.tcg.last24h     ?? "—"} color="bg-cyan-50" />
          </div>
        </Section>

        {/* ── Jogos ────────────────────────────────────────────────────────── */}
        <Section title="Jogos & Entretenimento">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
            <StatCard label="Slot Spins Total"    value={overview?.slots.total     ?? "—"} color="bg-yellow-100" />
            <StatCard label="Slot Spins 24h"      value={overview?.slots.last24h   ?? "—"} color="bg-yellow-50" />
            <StatCard label="Foil Spins"          value={overview?.slots.foilSpins ?? "—"} color="bg-yellow-200" sub="spins com foil" />
            <StatCard label="TESTVBMS Ganho Slot" value={overview?.slots.totalWon  ?? "—"} color="bg-yellow-50" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Baccarat Rounds"     value={overview?.baccarat.total     ?? "—"} color="bg-green-100" />
            <StatCard label="Baccarat 24h"        value={overview?.baccarat.last24h   ?? "—"} color="bg-green-50" />
            <StatCard label="Baccarat Pot Total"  value={overview?.baccarat.totalPot  ?? "—"} color="bg-green-100" sub="TESTVBMS" />
            <StatCard label="Roulette Spins"      value={overview?.roulette.total     ?? "—"} color="bg-pink-100" />
          </div>
        </Section>

        {/* ── Raid & NFTs ───────────────────────────────────────────────────── */}
        <Section title="Raid & NFTs">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Raid Participants"  value={overview?.raid.participants ?? "—"} color="bg-red-100" />
            <StatCard label="Raid Ativos 7d"     value={overview?.raid.active7d    ?? "—"} color="bg-red-50" />
            <StatCard label="Dano Total Raid"    value={overview?.raid.totalDamage ?? "—"} color="bg-red-200" />
            <StatCard label="Raffle Entries"     value={overview?.raffle.entries   ?? "—"} color="bg-indigo-100" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
            <StatCard label="VibeFID (Base)"     value={overview?.vibefid.base  ?? "—"} color="bg-blue-100" sub="0x6027..." />
            <StatCard label="VibeFID (Arb)"      value={overview?.vibefid.arb   ?? "—"} color="bg-blue-50"  sub="0xC39D..." />
            <StatCard label="VibeFID Total"      value={overview?.vibefid.total ?? "—"} color="bg-blue-200" />
            <StatCard label="Bug Reports"        value={overview?.bugs.total    ?? "—"} color="bg-gray-100" />
          </div>
        </Section>

        {/* ── Neynar Score Table ───────────────────────────────────────────── */}
        <Section title={`Top Neynar Score ≥ 0.9 (${neynar.length} users)`}>
          {neynarLoading ? (
            <div className="border-2 border-black p-8 text-center text-sm text-gray-500">Carregando scores...</div>
          ) : neynar.length === 0 ? (
            <div className="border-2 border-black p-8 text-center text-sm text-gray-500">Nenhum usuário com score ≥ 0.9</div>
          ) : (
            <div className="border-2 border-black shadow-[4px_4px_0px_#000] overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-black text-yellow-400 uppercase">
                    <th className="px-3 py-2 text-left font-black w-8">#</th>
                    <th className="px-3 py-2 text-left font-black">User</th>
                    <th className="px-3 py-2 text-left font-black">FID</th>
                    <th className="px-3 py-2 text-right font-black">Score</th>
                    <th className="px-3 py-2 text-left font-black">Rarity</th>
                    <th className="px-3 py-2 text-right font-black">Followers</th>
                    <th className="px-3 py-2 text-center font-black">Badge</th>
                    <th className="px-3 py-2 text-left font-black">Chain</th>
                    <th className="px-3 py-2 text-left font-black">Minted</th>
                  </tr>
                </thead>
                <tbody>
                  {neynar.map((u, i) => (
                    <tr key={u._id} className={`border-t border-gray-200 hover:bg-yellow-50 ${i % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
                      <td className="px-3 py-2 font-black text-gray-400">{i + 1}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          {u.pfpUrl && <img src={u.pfpUrl} alt="" className="w-5 h-5 rounded-full border border-black" />}
                          <div>
                            <div className="font-black">{u.username}</div>
                            <div className="text-gray-400 text-[10px]">{u.displayName}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2 font-mono text-gray-600">{u.fid}</td>
                      <td className="px-3 py-2 text-right font-black text-green-700">{u.neynarScore.toFixed(4)}</td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black ${RARITY_COLOR[u.rarity] ?? "bg-gray-100"}`}>
                          {u.rarity}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right font-mono">{fmt(u.followerCount)}</td>
                      <td className="px-3 py-2 text-center">
                        {u.powerBadge ? <span className="text-yellow-500 font-black">★</span> : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-3 py-2 text-gray-500 uppercase text-[10px]">{u.chain || "base"}</td>
                      <td className="px-3 py-2 text-gray-400 text-[10px]">{fmtDate(u.mintedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        {/* ════════════════════════════════════════════════════════════════════ */}
        {/* ── DEV PANEL (owner only) ──────────────────────────────────────── */}
        {/* ════════════════════════════════════════════════════════════════════ */}
        {isOwner && (
          <div className="border-4 border-red-600 shadow-[6px_6px_0px_#dc2626] bg-[#0f0f0f] rounded-sm">

            {/* Dev panel header */}
            <div className="bg-red-600 text-white px-4 py-2 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="font-black uppercase text-sm tracking-widest">DEV PANEL</span>
                <span className="text-[10px] bg-black/30 px-2 py-0.5 rounded font-mono">OWNER ONLY</span>
                {liveLoading && (
                  <span className="text-[10px] bg-yellow-400 text-black px-2 py-0.5 rounded font-black animate-pulse">
                    LOADING LIVE DATA...
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleRefresh}
                  className="text-[10px] font-black uppercase px-2 py-1 bg-white text-red-700 border border-white hover:bg-red-50 transition-colors"
                >
                  Refresh All
                </button>
                <button
                  onClick={handleReset}
                  disabled={resetting}
                  className="text-[10px] font-black uppercase px-2 py-1 bg-red-900 text-white border border-red-400 hover:bg-red-950 transition-colors disabled:opacity-50"
                >
                  {resetting ? "Resetando..." : "Reset Counters"}
                </button>
              </div>
            </div>

            <div className="p-4 space-y-6">
              {devLoading ? (
                <div className="text-sm text-gray-400 text-center py-8">Carregando dados do dev panel...</div>
              ) : (
                <>

                  {/* ── ROW 1: Convex + Vercel ─────────────────────────────────────── */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                    {/* CONVEX */}
                    <ServiceCard name="Convex" accent="bg-[#1a1a2e]" status={apiStats.length > 0 ? "ok" : "unknown"}>
                      <KV k="Deployment" v="prod:agile-orca-761" />
                      <KV k="Schema tables" v="50+ tabelas" />
                      <KV k="Plan" v="Pro (pay per use)" />
                      <div className="pt-1 space-y-2">
                        <UsageBar
                          label="Function calls tracked"
                          used={sumStats("alchemy_") + sumStats("rpc_") + sumStats("gift_") + sumStats("cache_")}
                          limit={1_000_000}
                          unit="calls"
                          sublabel="estimativa — sem limite fixo no Pro"
                        />
                        <div className="text-[9px] text-gray-500 italic">
                          Convex Pro: sem limites fixos, cobrança por uso. Ver dashboard.convex.dev
                        </div>
                      </div>
                      {/* API Stats summary */}
                      <div className="mt-2 border border-gray-700 rounded overflow-hidden">
                        <div className="bg-gray-800 text-gray-300 text-[9px] font-black uppercase px-2 py-1 flex justify-between">
                          <span>API Counters ({apiStats.length} chaves)</span>
                          <span>Valor</span>
                        </div>
                        <div className="max-h-40 overflow-y-auto">
                          {apiStats.length === 0 ? (
                            <div className="text-[10px] text-gray-500 p-2">Nenhum counter registrado</div>
                          ) : (
                            apiStats.map((s, i) => (
                              <div
                                key={s._id}
                                className={`flex justify-between px-2 py-1 text-[10px] ${i % 2 === 0 ? "bg-[#111]" : "bg-[#1a1a1a]"} ${s.value === 0 ? "opacity-30" : ""}`}
                              >
                                <span className="font-mono text-gray-400">{s.key}</span>
                                <span className={`font-black font-mono ${s.value > 5000 ? "text-red-400" : s.value > 1000 ? "text-orange-400" : s.value > 100 ? "text-yellow-400" : "text-green-400"}`}>
                                  {s.value.toLocaleString()}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </ServiceCard>

                    {/* VERCEL */}
                    <ServiceCard name="Vercel" accent="bg-[#0d0d0d]" status="ok">
                      <KV k="Project" v="vibemostwanted.xyz" />
                      <KV k="Framework" v="Next.js 15" />
                      <KV k="Plan" v="Verificar dashboard" mono={false} />
                      <div className="mt-1 space-y-2">
                        <UsageBar
                          label="Invocações Serverless (estimativa)"
                          used={Math.max(
                            (overview?.matches.last7d ?? 0) * 10 +
                            (overview?.slots.last24h ?? 0) * 30,
                            0
                          )}
                          limit={100_000}
                          unit="req/dia (Hobby)"
                          sublabel="baseado em matches + slots 24h × APIs médias"
                        />
                        <UsageBar
                          label="Bandwidth (estimativa)"
                          used={Math.round((overview?.users.active30d ?? 0) * 5)}
                          limit={100_000}
                          unit="MB/mês (Hobby)"
                          sublabel="~5MB por usuário ativo/mês (estimativa)"
                        />
                        <UsageBar
                          label="Edge Middleware Invocations"
                          used={0}
                          limit={500_000}
                          unit="req/dia (Hobby)"
                          sublabel="sem middleware configurado"
                        />
                      </div>
                      <div className="mt-2 space-y-1">
                        <KV k="Hobby: Functions" v="100K req/dia" />
                        <KV k="Hobby: Bandwidth" v="100GB/mês" />
                        <KV k="Hobby: Build Minutes" v="100h/mês" />
                        <KV k="Hobby: Cron Jobs" v="2 max / 24h min" />
                        <KV k="Pro: Functions" v="Unlimited (soft)" />
                      </div>
                      <a
                        href="https://vercel.com/dashboard"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 block text-center text-[10px] font-black uppercase px-2 py-1.5 bg-white text-black border border-gray-400 hover:bg-gray-100 transition-colors"
                      >
                        Abrir Vercel Dashboard →
                      </a>
                    </ServiceCard>
                  </div>

                  {/* ── ROW 2: Neynar + Alchemy ───────────────────────────────────── */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                    {/* NEYNAR */}
                    <ServiceCard
                      name="Neynar API"
                      accent="bg-[#1a1000]"
                      status={
                        liveData?.neynar?.error ? "error" :
                        liveData?.neynar?.remaining && parseInt(liveData.neynar.remaining) < 10 ? "warn" :
                        liveData?.neynar?.ok === false ? "error" : "ok"
                      }
                    >
                      {liveData?.neynar?.error ? (
                        <div className="text-red-400 text-[10px]">Erro: {liveData.neynar.error}</div>
                      ) : (
                        <>
                          <div className="flex gap-2 mb-2">
                            <span className="text-[10px] px-2 py-0.5 bg-green-900 text-green-300 rounded font-black">LIVE</span>
                            <span className="text-[10px] text-gray-500">HTTP {liveData?.neynar?.status ?? "..."}</span>
                          </div>
                          <UsageBar
                            label="Rate limit restante"
                            used={parseInt(liveData?.neynar?.remaining ?? "0") || 0}
                            limit={parseInt(liveData?.neynar?.limit ?? "1") || 1}
                            unit="req"
                            live
                            sublabel="janela de rate limit atual"
                          />
                          <div className="space-y-1 mt-2">
                            <KV k="Limite (janela)" v={liveData?.neynar?.limit ?? "—"} />
                            <KV k="Restante" v={liveData?.neynar?.remaining ?? "—"} />
                            <KV k="Reset em" v={liveData?.neynar?.reset ? new Date(parseInt(liveData.neynar.reset) * 1000).toLocaleTimeString("pt-BR") : "—"} />
                            <KV k="Uso mensal" v={liveData?.neynar?.monthUsed ?? "N/A (header não enviado)"} mono={false} />
                            <KV k="Limite mensal" v={liveData?.neynar?.monthLimit ?? "ver hub.neynar.com"} mono={false} />
                            <KV k="Plano Free" v="300 req/min estimado" mono={false} />
                          </div>
                          <a href="https://hub.neynar.com" target="_blank" rel="noopener noreferrer"
                            className="mt-2 block text-center text-[10px] font-black uppercase px-2 py-1.5 bg-white text-black border border-gray-400 hover:bg-gray-100">
                            Neynar Dashboard →
                          </a>
                        </>
                      )}
                    </ServiceCard>

                    {/* ALCHEMY */}
                    <ServiceCard name="Alchemy RPC" accent="bg-[#0a0a1a]" status="ok">
                      <KV k="Chain" v={liveData?.alchemy?.chain ?? "base-mainnet"} />
                      <KV k="API Key" v={liveData?.alchemy?.hasKey ? "✓ Configurada" : "✗ Faltando"} />
                      <KV k="Webhook Key" v={liveData?.alchemy?.hasKey ? "✓ Configurada" : "—"} />
                      <div className="mt-2 space-y-2">
                        <UsageBar
                          label="CU Estimados (Alchemy calls rastreados)"
                          used={Math.round(sumStats("alchemy_") * 26 + statVal("rpc_calls") * 19)}
                          limit={liveData?.alchemy?.freeTierCUMonthly ?? 300_000_000}
                          unit="CU/mês (Free)"
                          sublabel="eth_call≈26 CU · eth_getBalance≈19 CU"
                        />
                      </div>
                      <div className="space-y-1 mt-2">
                        <KV k="Free tier" v="300M CU/mês" />
                        <KV k="eth_call" v="26 CU cada" />
                        <KV k="getAssetTransfers" v="150 CU cada" />
                        <KV k="alchemy_getTokenMetadata" v="16 CU cada" />
                        <KV k="eth_getLogs" v="75 CU cada" />
                      </div>
                      <a href="https://dashboard.alchemy.com" target="_blank" rel="noopener noreferrer"
                        className="mt-2 block text-center text-[10px] font-black uppercase px-2 py-1.5 bg-white text-black border border-gray-400 hover:bg-gray-100">
                        Alchemy Dashboard →
                      </a>
                    </ServiceCard>
                  </div>

                  {/* ── ROW 3: Filebase + Wield/OpenSea ──────────────────────────── */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                    {/* FILEBASE */}
                    <ServiceCard
                      name="Filebase (IPFS Storage)"
                      accent="bg-[#0a1a0a]"
                      status={
                        liveData?.filebase?.error ? "error" :
                        (liveData?.filebase?.totalObjects ?? 0) > 900 ? "warn" : "ok"
                      }
                    >
                      {liveData?.filebase?.error ? (
                        <div className="text-red-400 text-[10px]">Erro: {liveData.filebase.error}</div>
                      ) : (
                        <>
                          <div className="flex gap-2 mb-2">
                            <span className="text-[10px] px-2 py-0.5 bg-green-900 text-green-300 rounded font-black">LIVE</span>
                            <span className="text-[10px] text-gray-500">bucket: {liveData?.filebase?.bucket ?? "test33"}</span>
                          </div>
                          <UsageBar
                            label="Objetos no bucket (test33)"
                            used={liveData?.filebase?.totalObjects ?? 0}
                            limit={3_000}
                            unit="objetos (~1000 mints)"
                            live
                            sublabel="3 arquivos por mint (PNG + share + WebM)"
                          />
                          <UsageBar
                            label="Storage usado"
                            used={liveData?.filebase?.totalSizeMB ?? 0}
                            limit={1_000_000}
                            unit="MB (1TB limit)"
                            sublabel="Filebase free: 1TB por conta"
                          />
                          <div className="space-y-1 mt-2">
                            <KV k="Total objetos" v={(liveData?.filebase?.totalObjects ?? 0).toLocaleString()} />
                            <KV k="Tamanho total" v={`${liveData?.filebase?.totalSizeMB ?? 0} MB`} />
                            <KV k="Mints estimados" v={(liveData?.filebase?.estimatedMints ?? 0).toLocaleString()} />
                            <KV k="Capacidade restante" v={`~${Math.floor(((3000 - (liveData?.filebase?.totalObjects ?? 0)) / 3))} mints`} mono={false} />
                          </div>
                          <div className="mt-2 text-[9px] text-gray-500 italic">
                            4 contas total (490/490/462/0) · Novos mints → test33 · card-* NUNCA DELETAR
                          </div>
                        </>
                      )}
                    </ServiceCard>

                    {/* WIELD + OPENSEA + OUTROS */}
                    <div className="space-y-4">
                      <ServiceCard
                        name="Wield API"
                        accent="bg-[#1a0a1a]"
                        status={liveData?.wield?.error ? "error" : liveData?.wield?.ok ? "ok" : "unknown"}
                      >
                        {liveData?.wield?.error ? (
                          <div className="text-red-400 text-[10px]">Erro: {liveData.wield.error}</div>
                        ) : (
                          <>
                            <KV k="Status HTTP" v={liveData?.wield?.status ?? "—"} />
                            <KV k="Rate limit" v={liveData?.wield?.limit ?? "não informado"} />
                            <KV k="Restante" v={liveData?.wield?.remaining ?? "não informado"} />
                            <KV k="Base URL" v="build.wield.xyz/vibe/boosterbox" />
                            <KV k="Header" v="API-KEY (não x-api-key)" mono={false} />
                          </>
                        )}
                      </ServiceCard>

                      <ServiceCard
                        name="OpenSea API"
                        accent="bg-[#0a0a1a]"
                        status={liveData?.opensea?.error ? "error" : liveData?.opensea?.ok ? "ok" : "unknown"}
                      >
                        {liveData?.opensea?.error ? (
                          <div className="text-red-400 text-[10px]">Erro: {liveData.opensea.error}</div>
                        ) : (
                          <>
                            <KV k="Status HTTP" v={liveData?.opensea?.status ?? "—"} />
                            <KV k="Rate limit" v={liveData?.opensea?.limit ?? "não informado"} />
                            <KV k="Restante" v={liveData?.opensea?.remaining ?? "não informado"} />
                            <KV k="Reset" v={liveData?.opensea?.reset ? new Date(parseInt(liveData.opensea.reset) * 1000).toLocaleTimeString("pt-BR") : "—"} />
                            <KV k="Plano" v="4 req/s (com API key)" mono={false} />
                          </>
                        )}
                      </ServiceCard>
                    </div>
                  </div>

                  {/* ── ROW 4: Resumo de limites críticos ────────────────────────── */}
                  <div className="border border-red-800 rounded-sm p-3 bg-[#1a0000]">
                    <div className="text-red-400 font-black text-xs uppercase mb-3 flex items-center gap-2">
                      <span>⚠</span>
                      <span>Resumo de Limites — Alertas</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                      {[
                        {
                          service: "Vercel (Hobby)",
                          limit: "100K req/dia · 100GB bandwidth/mês",
                          risk: "baixo",
                          action: "Monitorar se crescimento acelerar",
                        },
                        {
                          service: "Neynar",
                          limit: liveData?.neynar?.limit
                            ? `${liveData.neynar.limit} req/janela`
                            : "ver hub.neynar.com",
                          risk: (parseInt(liveData?.neynar?.remaining ?? "999") < 50) ? "alto" : "baixo",
                          action: "Caching de 10min implementado em lib/neynar.ts",
                        },
                        {
                          service: "Alchemy",
                          limit: "300M CU/mês (free)",
                          risk: "baixo",
                          action: "Monitorar em dashboard.alchemy.com",
                        },
                        {
                          service: "Filebase (test33)",
                          limit: "1TB storage · sem limite de objetos",
                          risk: (liveData?.filebase?.totalObjects ?? 0) > 1400 ? "médio" : "baixo",
                          action: "Criar nova conta quando test33 atingir 1500 objetos",
                        },
                        {
                          service: "Convex",
                          limit: "Pro — sem limites fixos (pay per use)",
                          risk: "baixo",
                          action: "Ver dashboard.convex.dev para billing",
                        },
                        {
                          service: "OpenSea",
                          limit: "4 req/s com API key",
                          risk: "baixo",
                          action: "Chamadas são raras (só para refresh de NFTs)",
                        },
                      ].map(({ service, limit, risk, action }) => (
                        <div
                          key={service}
                          className={`p-2 rounded border ${
                            risk === "alto"   ? "border-red-600 bg-red-950" :
                            risk === "médio"  ? "border-yellow-700 bg-yellow-950" :
                            "border-gray-700 bg-gray-900"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-black text-white">{service}</span>
                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                              risk === "alto"  ? "bg-red-500 text-white" :
                              risk === "médio" ? "bg-yellow-500 text-black" :
                              "bg-gray-600 text-gray-300"
                            }`}>{risk.toUpperCase()}</span>
                          </div>
                          <div className="text-gray-400 text-[10px]">{limit}</div>
                          <div className="text-gray-500 text-[9px] mt-0.5 italic">{action}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                </>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-[10px] text-gray-400 font-mono">
          {overview && `Cache: ${fmtDate(overview.fetchedAt)} · TTL 24h · `}
          {neynar.length > 0 && `${neynar.length} usuários score ≥ 0.9 · `}
          VMW Analytics
        </div>
      </div>
    </div>
  );
}
