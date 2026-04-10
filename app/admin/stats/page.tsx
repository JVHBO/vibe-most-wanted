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
  if (d < 60_000)       return `${Math.floor(d / 1000)}s atrás`;
  if (d < 3_600_000)    return `${Math.floor(d / 60_000)}m atrás`;
  if (d < 86_400_000)   return `${Math.floor(d / 3_600_000)}h atrás`;
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
      <h2 className="text-sm font-black uppercase tracking-widest border-b-2 border-black pb-1 mb-4">
        {title}
      </h2>
      {children}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminStatsPage() {
  const convex = useConvex();
  const { address } = useAccount();
  const isOwner = address?.toLowerCase() === OWNER_ADDRESS;

  const [overview, setOverview]   = useState<OverviewData | null>(null);
  const [neynar,   setNeynar]     = useState<NeynarUser[]>([]);
  const [apiStats, setApiStats]   = useState<ApiStat[]>([]);
  const [loading,  setLoading]    = useState(true);
  const [loadMsg,  setLoadMsg]    = useState("Carregando...");
  const [error,    setError]      = useState<string | null>(null);
  const [neynarLoading, setNeynarLoading] = useState(true);
  const [devLoading,    setDevLoading]    = useState(true);

  const resetStats = useMutation(api.adminStats.resetApiStats);
  const [resetting, setResetting] = useState(false);

  const loadedRef = useRef(false);

  const loadAll = useCallback(async (force = false) => {
    setLoading(true);
    setError(null);

    // ── Overview (cache 24h) ──────────────────────────────────────────────────
    try {
      const cached = !force && localStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached) as { data: OverviewData; ts: number };
        if (Date.now() - parsed.ts < CACHE_TTL) {
          setOverview(parsed.data);
          setLoading(false);
        } else {
          // stale — fetch in background below
        }
      }

      if (!cached || force || ((() => {
        try { return Date.now() - JSON.parse(cached!).ts >= CACHE_TTL; } catch { return true; }
      })())) {
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
      try {
        setLoadMsg("Buscando API stats...");
        const stats = await convex.query(api.adminStats.getApiStats, {});
        setApiStats(stats as unknown as ApiStat[]);
      } catch (e) {
        console.error("API stats error:", e);
      } finally {
        setDevLoading(false);
      }
    } else {
      setDevLoading(false);
    }
  }, [convex, address]);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    loadAll();
  }, [loadAll]);

  const handleReset = async () => {
    if (!confirm("Resetar TODOS os contadores de API? (irreversível)")) return;
    setResetting(true);
    try {
      const r = await resetStats({});
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
    setNeynar([]);
    setApiStats([]);
    loadAll(true);
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#f5f0e8] font-mono">
      {/* Header */}
      <div className="border-b-4 border-black bg-yellow-400 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-xs font-black uppercase border-2 border-black px-2 py-1 bg-white shadow-[2px_2px_0px_#000] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all">
            ← Home
          </Link>
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight">VMW ANALYTICS</h1>
            <p className="text-xs text-black/60">
              {overview
                ? `Dados de ${fmtDate(overview.fetchedAt)} · atualiza a cada 24h`
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
          <div className="mb-4 p-3 border-2 border-red-600 bg-red-100 text-red-800 text-sm font-bold">
            {error}
          </div>
        )}

        {/* ── Users ────────────────────────────────────────────────────────── */}
        <Section title="Usuarios">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Total Cadastrados"   value={overview?.users.total   ?? "—"} color="bg-blue-100" />
            <StatCard label="Ativos 24h"          value={overview?.users.active24h ?? "—"} color="bg-green-100" />
            <StatCard label="Ativos 7 dias"       value={overview?.users.active7d  ?? "—"} color="bg-green-50" />
            <StatCard label="Ativos 30 dias"      value={overview?.users.active30d ?? "—"} color="bg-green-50" />
          </div>
        </Section>

        {/* ── Economy ──────────────────────────────────────────────────────── */}
        <Section title="Economia">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <StatCard label="TESTVBMS Circulando" value={overview?.economy.totalCoins ?? "—"} color="bg-orange-100" sub="nas carteiras" />
            <StatCard label="TESTVBMS Inbox"      value={overview?.economy.totalInbox ?? "—"} color="bg-orange-50" sub="não coletado" />
            <StatCard label="Lifetime Earned"     value={overview?.economy.totalLifetime ?? "—"} color="bg-yellow-100" sub="total histórico" />
            <StatCard label="VBMS Claimado"       value={overview?.economy.totalVbmsClaimed ?? "—"} color="bg-purple-100" sub="on-chain total" />
            <StatCard label="Claims 24h"          value={overview?.economy.claims24h ?? "—"} color="bg-purple-50" />
            <StatCard label="Claims 7 dias"       value={overview?.economy.claims7d ?? "—"} color="bg-purple-50" />
          </div>
        </Section>

        {/* ── Batalhas ─────────────────────────────────────────────────────── */}
        <Section title="Batalhas">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
            <StatCard label="Total Matches"  value={overview?.matches.total   ?? "—"} color="bg-red-100" />
            <StatCard label="PvP"            value={overview?.matches.pvp     ?? "—"} color="bg-red-50" />
            <StatCard label="PvE / Poker CPU" value={overview?.matches.pve   ?? "—"} color="bg-red-50" />
            <StatCard label="Attack Raids"   value={overview?.matches.attack  ?? "—"} color="bg-red-50" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Matches 24h"    value={overview?.matches.last24h ?? "—"} color="bg-orange-50" />
            <StatCard label="Matches 7 dias" value={overview?.matches.last7d  ?? "—"} color="bg-orange-50" />
            <StatCard label="TCG Total"      value={overview?.tcg.total       ?? "—"} color="bg-cyan-100" />
            <StatCard label="TCG 24h"        value={overview?.tcg.last24h     ?? "—"} color="bg-cyan-50" />
          </div>
        </Section>

        {/* ── Jogos ────────────────────────────────────────────────────────── */}
        <Section title="Jogos & Entretenimento">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
            <StatCard label="Slot Spins Total"  value={overview?.slots.total     ?? "—"} color="bg-yellow-100" />
            <StatCard label="Slot Spins 24h"    value={overview?.slots.last24h   ?? "—"} color="bg-yellow-50" />
            <StatCard label="Foil Spins"        value={overview?.slots.foilSpins ?? "—"} color="bg-yellow-200" sub="spins com foil" />
            <StatCard label="TESTVBMS Ganho Slot" value={overview?.slots.totalWon ?? "—"} color="bg-yellow-50" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Baccarat Rounds"   value={overview?.baccarat.total     ?? "—"} color="bg-green-100" />
            <StatCard label="Baccarat 24h"      value={overview?.baccarat.last24h   ?? "—"} color="bg-green-50" />
            <StatCard label="Baccarat Pot Total" value={overview?.baccarat.totalPot ?? "—"} color="bg-green-100" sub="TESTVBMS" />
            <StatCard label="Roulette Spins"    value={overview?.roulette.total     ?? "—"} color="bg-pink-100" />
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
            <StatCard label="VibeFID (Arb)"      value={overview?.vibefid.arb   ?? "—"} color="bg-blue-50" sub="0xC39D..." />
            <StatCard label="VibeFID Total"      value={overview?.vibefid.total ?? "—"} color="bg-blue-200" />
            <StatCard label="Bug Reports"        value={overview?.bugs.total    ?? "—"} color="bg-gray-100" />
          </div>
        </Section>

        {/* ── Neynar Score Table ───────────────────────────────────────────── */}
        <Section title={`Top Neynar Score ≥ 0.9 (${neynar.length} users)`}>
          {neynarLoading ? (
            <div className="border-2 border-black p-8 text-center text-sm text-gray-500">
              Carregando scores...
            </div>
          ) : neynar.length === 0 ? (
            <div className="border-2 border-black p-8 text-center text-sm text-gray-500">
              Nenhum usuário com score ≥ 0.9
            </div>
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
                    <tr
                      key={u._id}
                      className={`border-t border-gray-200 hover:bg-yellow-50 transition-colors ${i % 2 === 0 ? "bg-white" : "bg-gray-50"}`}
                    >
                      <td className="px-3 py-2 font-black text-gray-400">{i + 1}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          {u.pfpUrl && (
                            <img src={u.pfpUrl} alt="" className="w-5 h-5 rounded-full border border-black" />
                          )}
                          <div>
                            <div className="font-black">{u.username}</div>
                            <div className="text-gray-400 text-[10px]">{u.displayName}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2 font-mono text-gray-600">{u.fid}</td>
                      <td className="px-3 py-2 text-right font-black text-green-700">
                        {u.neynarScore.toFixed(4)}
                      </td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black ${RARITY_COLOR[u.rarity] ?? "bg-gray-100"}`}>
                          {u.rarity}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right font-mono">{fmt(u.followerCount)}</td>
                      <td className="px-3 py-2 text-center">
                        {u.powerBadge ? (
                          <span title="Power Badge" className="text-yellow-500 font-black">★</span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-gray-500 uppercase text-[10px]">
                        {u.chain || "base"}
                      </td>
                      <td className="px-3 py-2 text-gray-400 text-[10px]">
                        {fmtDate(u.mintedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        {/* ── Dev Panel (owner only) ───────────────────────────────────────── */}
        {isOwner && (
          <div className="border-4 border-red-600 shadow-[6px_6px_0px_#dc2626] bg-white rounded-sm">
            <div className="bg-red-600 text-white px-4 py-2 flex items-center justify-between">
              <span className="font-black uppercase text-sm tracking-widest">
                DEV PANEL — OWNER ONLY
              </span>
              <div className="flex gap-2">
                <button
                  onClick={handleRefresh}
                  className="text-[10px] font-black uppercase px-2 py-1 bg-white text-red-700 border border-white hover:bg-red-50 transition-colors"
                >
                  Refresh
                </button>
                <button
                  onClick={handleReset}
                  disabled={resetting}
                  className="text-[10px] font-black uppercase px-2 py-1 bg-red-800 text-white border border-white hover:bg-red-900 transition-colors disabled:opacity-50"
                >
                  {resetting ? "Resetando..." : "Reset Counters"}
                </button>
              </div>
            </div>

            <div className="p-4">
              {devLoading ? (
                <div className="text-sm text-gray-500 text-center py-6">Carregando API stats...</div>
              ) : apiStats.length === 0 ? (
                <div className="text-sm text-gray-500 text-center py-6">Nenhum stat registrado ainda.</div>
              ) : (
                <>
                  {/* Quick summary */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                    {[
                      { key: "alchemy_", label: "Alchemy Total", color: "bg-blue-100" },
                      { key: "gift_nfts_", label: "Gift NFTs", color: "bg-green-100" },
                      { key: "rpc_", label: "RPC Calls", color: "bg-orange-100" },
                      { key: "cache_", label: "Cache Hits", color: "bg-purple-100" },
                    ].map(({ key, label, color }) => {
                      const total = apiStats
                        .filter(s => s.key.includes(key))
                        .reduce((sum, s) => sum + s.value, 0);
                      return (
                        <div key={key} className={`${color} border-2 border-black p-3 rounded-sm`}>
                          <div className="text-[10px] font-black uppercase text-gray-500">{label}</div>
                          <div className="text-xl font-black font-mono">{fmt(total)}</div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Full table */}
                  <div className="border-2 border-black overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-gray-100 border-b-2 border-black">
                          <th className="px-3 py-2 text-left font-black uppercase">Chave</th>
                          <th className="px-3 py-2 text-right font-black uppercase">Valor</th>
                          <th className="px-3 py-2 text-right font-black uppercase">Último Update</th>
                        </tr>
                      </thead>
                      <tbody>
                        {apiStats.map((stat, i) => (
                          <tr
                            key={stat._id}
                            className={`border-t border-gray-100 ${i % 2 === 0 ? "bg-white" : "bg-gray-50"} ${stat.value === 0 ? "opacity-40" : ""}`}
                          >
                            <td className="px-3 py-1.5 font-mono text-gray-700">{stat.key}</td>
                            <td className={`px-3 py-1.5 text-right font-black font-mono ${stat.value > 1000 ? "text-red-600" : stat.value > 100 ? "text-orange-600" : "text-gray-800"}`}>
                              {stat.value.toLocaleString()}
                            </td>
                            <td className="px-3 py-1.5 text-right text-gray-400 text-[10px]">
                              {timeAgo(stat.lastUpdated)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Neynar limit estimate */}
                  <div className="mt-4 border-2 border-dashed border-gray-400 p-3 text-xs text-gray-600">
                    <div className="font-black mb-1 uppercase text-[10px]">Limites Estimados</div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {[
                        {
                          label: "Neynar API",
                          used: apiStats.find(s => s.key === "neynar_calls")?.value ?? 0,
                          limit: 300,
                          unit: "req/dia (free tier est.)",
                        },
                        {
                          label: "Alchemy RPC",
                          used: apiStats.filter(s => s.key.startsWith("alchemy_")).reduce((s, x) => s + x.value, 0),
                          limit: 300_000_000,
                          unit: "compute units/mês",
                        },
                        {
                          label: "Wield API",
                          used: apiStats.find(s => s.key === "wield_calls")?.value ?? 0,
                          limit: 10_000,
                          unit: "req/mês (estimado)",
                        },
                      ].map(({ label, used, limit, unit }) => {
                        const pct = Math.min(100, (used / limit) * 100);
                        const barColor = pct > 80 ? "bg-red-500" : pct > 50 ? "bg-orange-400" : "bg-green-500";
                        return (
                          <div key={label} className="bg-gray-50 border border-gray-300 p-2 rounded">
                            <div className="font-black text-[10px] uppercase mb-1">{label}</div>
                            <div className="text-[10px] text-gray-500 mb-1">{used.toLocaleString()} / {limit.toLocaleString()} {unit}</div>
                            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div className={`h-full ${barColor} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                            </div>
                            <div className={`text-[10px] mt-1 font-black ${pct > 80 ? "text-red-600" : "text-gray-500"}`}>
                              {pct.toFixed(1)}%
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="text-[10px] text-gray-400 mt-2">
                      * Limites são estimados. Verifique dashboards oficiais para valores exatos.
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
