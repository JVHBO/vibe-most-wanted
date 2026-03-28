"use client";

import { useState, useEffect, useRef } from "react";
import { useConvex } from "convex/react";
import Link from "next/link";
import {
  useAccount, useBalance, useReadContract,
  useWriteContract, useWaitForTransactionReceipt, useSwitchChain,
} from "wagmi";
import { api } from "@/convex/_generated/api";
import { AudioManager } from "@/lib/audio-manager";
import { formatUnits, parseUnits } from "viem";

// ─── Addresses ────────────────────────────────────────────────────────────────
const RAFFLE_BASE   = "0x54ac4e3782a21341440c418e7c37b26f937095e4" as const;
const RAFFLE_ARB    = "0x81739e45a49a84b65c4a528b24048ab2ac172555" as const;
const VBMS_ADDRESS  = "0xf14c1dc8ce5fe65413379f76c43fa1460c31e728" as const;
const USDC_ADDRESS  = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913" as const;
const USND_ADDRESS  = "0x4ecf61a6c2fab8a047ceb3b3b263b401763e9d49" as const;
const OPENSEA_URL   = "https://opensea.io/assets/base/0xf14c1dc8ce5fe65413379f76c43fa1460c31e728";

const BASE_CHAIN_ID = 8453;
const ARB_CHAIN_ID  = 42161;

// ─── ABIs ─────────────────────────────────────────────────────────────────────
const RAFFLE_BASE_ABI = [
  { name: "buyWithVBMS", type: "function", stateMutability: "nonpayable",
    inputs: [{ name: "count", type: "uint256" }], outputs: [] },
  { name: "buyWithUSDC", type: "function", stateMutability: "nonpayable",
    inputs: [{ name: "count", type: "uint256" }], outputs: [] },
  { name: "buyWithETH", type: "function", stateMutability: "payable",
    inputs: [{ name: "count", type: "uint256" }], outputs: [] },
  { name: "getETHCost", type: "function", stateMutability: "view",
    inputs: [{ name: "count", type: "uint256" }],
    outputs: [{ name: "ethWei", type: "uint256" }, { name: "ethPriceUSD8", type: "uint256" }] },
  { name: "getCostVBMS", type: "function", stateMutability: "view",
    inputs: [{ name: "count", type: "uint256" }], outputs: [{ type: "uint256" }] },
  { name: "getCostUSDC", type: "function", stateMutability: "view",
    inputs: [{ name: "count", type: "uint256" }], outputs: [{ type: "uint256" }] },
] as const;

const RAFFLE_ARB_ABI = [
  { name: "buyWithUSDN", type: "function", stateMutability: "nonpayable",
    inputs: [{ name: "count", type: "uint256" }], outputs: [] },
  { name: "buyWithETH", type: "function", stateMutability: "payable",
    inputs: [{ name: "count", type: "uint256" }], outputs: [] },
  { name: "getETHCost", type: "function", stateMutability: "view",
    inputs: [{ name: "count", type: "uint256" }],
    outputs: [{ name: "ethWei", type: "uint256" }, { name: "ethPriceUSD8", type: "uint256" }] },
  { name: "getUSDNCost", type: "function", stateMutability: "view",
    inputs: [{ name: "count", type: "uint256" }], outputs: [{ type: "uint256" }] },
] as const;

const ERC20_ABI = [
  { name: "balanceOf", type: "function", stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }] },
  { name: "allowance", type: "function", stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }],
    outputs: [{ name: "", type: "uint256" }] },
  { name: "approve", type: "function", stateMutability: "nonpayable",
    inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }],
    outputs: [{ name: "", type: "bool" }] },
] as const;

// ─── Types ────────────────────────────────────────────────────────────────────
type BuyStatus = "idle" | "switching" | "approving" | "buying" | "success" | "error";

interface RaffleConfig {
  ticketPriceVBMS: number;
  ticketPriceUSD: number;
  maxTickets: number;
  durationDays: number;
  epoch: number;
  visible: boolean;
  updatedAt: number;
}

interface RaffleEntry {
  address: string;
  tickets: number;
  chain: string;
  txHash: string;
}

// ─── Countdown ────────────────────────────────────────────────────────────────
function useCountdown(endsAt: number | null) {
  const [diff, setDiff] = useState(0);
  useEffect(() => {
    if (!endsAt) return;
    const tick = () => setDiff(Math.max(0, endsAt - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endsAt]);
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return { d, h, m, ended: diff === 0 && endsAt !== null };
}

function fmtBal(raw: bigint | undefined, decimals: number, symbol: string) {
  if (raw === undefined) return "…";
  const n = parseFloat(formatUnits(raw, decimals));
  if (n === 0) return `0 ${symbol}`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M ${symbol}`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}k ${symbol}`;
  if (n < 0.0001)     return `<0.0001 ${symbol}`;
  return `${n.toFixed(n < 1 ? 6 : 2)} ${symbol}`;
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function RafflePage() {
  const convex = useConvex();
  const { address: walletAddress, chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();

  const [showInfo, setShowInfo] = useState(false);
  const [showBuy,  setShowBuy]  = useState(false);
  const [buyQty,   setBuyQty]   = useState(1);
  const [status,   setStatus]   = useState<BuyStatus>("idle");
  const [errMsg,   setErrMsg]   = useState("");
  const [pendingApprove, setPendingApprove] = useState(false);
  const [config,  setConfig]  = useState<RaffleConfig | null>(null);
  const [entries, setEntries] = useState<RaffleEntry[]>([]);
  const loaded = useRef(false);

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    Promise.all([
      convex.query(api.raffle.getRaffleConfig, {}).catch(() => null),
      convex.query(api.raffle.getRaffleBuyers, { epoch: 1 }).catch(() => []),
    ]).then(([cfg, buyers]) => {
      if (cfg) setConfig(cfg as RaffleConfig);
      if (buyers) setEntries(buyers as RaffleEntry[]);
    });
  }, [convex]);

  const endsAt      = config ? config.updatedAt + config.durationDays * 86400000 : null;
  const { d, h, m, ended } = useCountdown(endsAt);
  const totalTickets = entries.reduce((sum, e) => sum + e.tickets, 0);
  const ticketPriceVBMS = config?.ticketPriceVBMS ?? 10000;
  const ticketPriceUSD  = config?.ticketPriceUSD  ?? 0.06;
  const totalVBMS = totalTickets * ticketPriceVBMS;

  // ── Balances ──
  const { data: baseEthBal } = useBalance({
    address: walletAddress, chainId: BASE_CHAIN_ID,
    query: { enabled: !!walletAddress && showBuy },
  });
  const { data: vbmsBal } = useReadContract({
    address: VBMS_ADDRESS, abi: ERC20_ABI, functionName: "balanceOf",
    args: walletAddress ? [walletAddress] : undefined, chainId: BASE_CHAIN_ID,
    query: { enabled: !!walletAddress && showBuy },
  });
  const { data: usdcBal } = useReadContract({
    address: USDC_ADDRESS, abi: ERC20_ABI, functionName: "balanceOf",
    args: walletAddress ? [walletAddress] : undefined, chainId: BASE_CHAIN_ID,
    query: { enabled: !!walletAddress && showBuy },
  });
  const { data: arbEthBal } = useBalance({
    address: walletAddress, chainId: ARB_CHAIN_ID,
    query: { enabled: !!walletAddress && showBuy },
  });
  const { data: usndBal } = useReadContract({
    address: USND_ADDRESS, abi: ERC20_ABI, functionName: "balanceOf",
    args: walletAddress ? [walletAddress] : undefined, chainId: ARB_CHAIN_ID,
    query: { enabled: !!walletAddress && showBuy },
  });

  // ── On-chain costs ──
  const { data: costVBMS } = useReadContract({
    address: RAFFLE_BASE, abi: RAFFLE_BASE_ABI, functionName: "getCostVBMS",
    args: [BigInt(buyQty)], chainId: BASE_CHAIN_ID,
    query: { enabled: showBuy },
  });
  const { data: costUSDC } = useReadContract({
    address: RAFFLE_BASE, abi: RAFFLE_BASE_ABI, functionName: "getCostUSDC",
    args: [BigInt(buyQty)], chainId: BASE_CHAIN_ID,
    query: { enabled: showBuy },
  });
  const { data: ethCostData } = useReadContract({
    address: RAFFLE_BASE, abi: RAFFLE_BASE_ABI, functionName: "getETHCost",
    args: [BigInt(buyQty)], chainId: BASE_CHAIN_ID,
    query: { enabled: showBuy },
  });
  const ethWeiCost = ethCostData ? (ethCostData as [bigint, bigint])[0] : undefined;

  // ── ARB costs ──
  const { data: costUSDN } = useReadContract({
    address: RAFFLE_ARB, abi: RAFFLE_ARB_ABI, functionName: "getUSDNCost",
    args: [BigInt(buyQty)], chainId: ARB_CHAIN_ID,
    query: { enabled: showBuy },
  });
  const { data: arbEthCostData } = useReadContract({
    address: RAFFLE_ARB, abi: RAFFLE_ARB_ABI, functionName: "getETHCost",
    args: [BigInt(buyQty)], chainId: ARB_CHAIN_ID,
    query: { enabled: showBuy },
  });
  const arbEthWeiCost = arbEthCostData ? (arbEthCostData as [bigint, bigint])[0] : undefined;

  // ── ARB allowance ──
  const { data: usndAllowance, refetch: refetchUsndAllow } = useReadContract({
    address: USND_ADDRESS, abi: ERC20_ABI, functionName: "allowance",
    args: walletAddress ? [walletAddress, RAFFLE_ARB] : undefined, chainId: ARB_CHAIN_ID,
    query: { enabled: !!walletAddress && showBuy },
  });

  // ── Allowances ──
  const { data: vbmsAllowance, refetch: refetchVbmsAllow } = useReadContract({
    address: VBMS_ADDRESS, abi: ERC20_ABI, functionName: "allowance",
    args: walletAddress ? [walletAddress, RAFFLE_BASE] : undefined, chainId: BASE_CHAIN_ID,
    query: { enabled: !!walletAddress && showBuy },
  });
  const { data: usdcAllowance, refetch: refetchUsdcAllow } = useReadContract({
    address: USDC_ADDRESS, abi: ERC20_ABI, functionName: "allowance",
    args: walletAddress ? [walletAddress, RAFFLE_BASE] : undefined, chainId: BASE_CHAIN_ID,
    query: { enabled: !!walletAddress && showBuy },
  });

  // ── Write contract ──
  const { writeContractAsync } = useWriteContract();
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const { isSuccess: txConfirmed } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (txConfirmed && pendingApprove) {
      setPendingApprove(false);
      refetchVbmsAllow();
      refetchUsdcAllow();
      refetchUsndAllow();
      setStatus("idle");
    } else if (txConfirmed && status === "buying") {
      setStatus("success");
      // reload entries
      loaded.current = false;
      convex.query(api.raffle.getRaffleBuyers, { epoch: config?.epoch ?? 1 })
        .then(b => b && setEntries(b as RaffleEntry[]));
    }
  }, [txConfirmed]);

  async function ensureBase() {
    if (chainId !== BASE_CHAIN_ID) {
      setStatus("switching");
      await switchChainAsync({ chainId: BASE_CHAIN_ID });
    }
  }

  async function handleBuyVBMS() {
    if (!walletAddress || !costVBMS) return;
    try {
      await ensureBase();
      // Approve if needed
      if (!vbmsAllowance || (vbmsAllowance as bigint) < (costVBMS as bigint)) {
        setStatus("approving");
        setPendingApprove(true);
        const h = await writeContractAsync({
          address: VBMS_ADDRESS, abi: ERC20_ABI, functionName: "approve",
          args: [RAFFLE_BASE, costVBMS as bigint], chainId: BASE_CHAIN_ID,
        });
        setTxHash(h);
        // wait for approve to be confirmed via useEffect, then user clicks again
        return;
      }
      setStatus("buying");
      const h = await writeContractAsync({
        address: RAFFLE_BASE, abi: RAFFLE_BASE_ABI, functionName: "buyWithVBMS",
        args: [BigInt(buyQty)], chainId: BASE_CHAIN_ID,
      });
      setTxHash(h);
    } catch (e: any) {
      setStatus("error");
      setErrMsg(e?.shortMessage ?? e?.message ?? "Erro");
    }
  }

  async function handleBuyUSDC() {
    if (!walletAddress || !costUSDC) return;
    try {
      await ensureBase();
      if (!usdcAllowance || (usdcAllowance as bigint) < (costUSDC as bigint)) {
        setStatus("approving");
        setPendingApprove(true);
        const h = await writeContractAsync({
          address: USDC_ADDRESS, abi: ERC20_ABI, functionName: "approve",
          args: [RAFFLE_BASE, costUSDC as bigint], chainId: BASE_CHAIN_ID,
        });
        setTxHash(h);
        return;
      }
      setStatus("buying");
      const h = await writeContractAsync({
        address: RAFFLE_BASE, abi: RAFFLE_BASE_ABI, functionName: "buyWithUSDC",
        args: [BigInt(buyQty)], chainId: BASE_CHAIN_ID,
      });
      setTxHash(h);
    } catch (e: any) {
      setStatus("error");
      setErrMsg(e?.shortMessage ?? e?.message ?? "Erro");
    }
  }

  async function handleBuyETHBase() {
    if (!walletAddress || !ethWeiCost) return;
    try {
      await ensureBase();
      setStatus("buying");
      const h = await writeContractAsync({
        address: RAFFLE_BASE, abi: RAFFLE_BASE_ABI, functionName: "buyWithETH",
        args: [BigInt(buyQty)], value: ethWeiCost as bigint, chainId: BASE_CHAIN_ID,
      });
      setTxHash(h);
    } catch (e: any) {
      setStatus("error");
      setErrMsg(e?.shortMessage ?? e?.message ?? "Erro");
    }
  }

  async function handleBuyUSDN() {
    if (!walletAddress || !costUSDN) return;
    try {
      if (chainId !== ARB_CHAIN_ID) {
        setStatus("switching");
        await switchChainAsync({ chainId: ARB_CHAIN_ID });
      }
      if (!usndAllowance || (usndAllowance as bigint) < (costUSDN as bigint)) {
        setStatus("approving");
        setPendingApprove(true);
        const h = await writeContractAsync({
          address: USND_ADDRESS, abi: ERC20_ABI, functionName: "approve",
          args: [RAFFLE_ARB, costUSDN as bigint], chainId: ARB_CHAIN_ID,
        });
        setTxHash(h);
        return;
      }
      setStatus("buying");
      const h = await writeContractAsync({
        address: RAFFLE_ARB, abi: RAFFLE_ARB_ABI, functionName: "buyWithUSDN",
        args: [BigInt(buyQty)], chainId: ARB_CHAIN_ID,
      });
      setTxHash(h);
    } catch (e: any) {
      setStatus("error");
      setErrMsg(e?.shortMessage ?? e?.message ?? "Erro");
    }
  }

  async function handleBuyETHArb() {
    if (!walletAddress || !arbEthWeiCost) return;
    try {
      if (chainId !== ARB_CHAIN_ID) {
        setStatus("switching");
        await switchChainAsync({ chainId: ARB_CHAIN_ID });
      }
      setStatus("buying");
      const h = await writeContractAsync({
        address: RAFFLE_ARB, abi: RAFFLE_ARB_ABI, functionName: "buyWithETH",
        args: [BigInt(buyQty)], value: arbEthWeiCost as bigint, chainId: ARB_CHAIN_ID,
      });
      setTxHash(h);
    } catch (e: any) {
      setStatus("error");
      setErrMsg(e?.shortMessage ?? e?.message ?? "Erro");
    }
  }

  function resetStatus() {
    setStatus("idle");
    setErrMsg("");
    setPendingApprove(false);
  }

  const isBusy = status === "switching" || status === "approving" || status === "buying";

  const vbmsNeedsApprove = costVBMS && vbmsAllowance !== undefined
    ? (vbmsAllowance as bigint) < (costVBMS as bigint) : false;
  const usdcNeedsApprove = costUSDC && usdcAllowance !== undefined
    ? (usdcAllowance as bigint) < (costUSDC as bigint) : false;

  const vbmsPriceLabel = costVBMS
    ? fmtBal(costVBMS as bigint, 18, "VBMS")
    : `${(ticketPriceVBMS * buyQty / 1000).toFixed(0)}k VBMS`;
  const usdcPriceLabel = costUSDC
    ? fmtBal(costUSDC as bigint, 6, "USDC")
    : `$${(ticketPriceUSD * buyQty).toFixed(2)} USDC`;
  const ethPriceLabel = ethWeiCost
    ? fmtBal(ethWeiCost as bigint, 18, "ETH")
    : `≈${(0.000023 * buyQty).toFixed(6)} ETH`;

  return (
    <div className="min-h-screen bg-[#111] text-white flex flex-col">

      {/* ── Top bar ── */}
      <div className="bg-[#FFD700] border-b-4 border-black px-4 py-3 flex items-center gap-3 shrink-0">
        <Link
          href="/"
          onClick={() => AudioManager.buttonClick()}
          className="px-2 py-1 bg-[#CC2222] hover:bg-[#AA1111] text-white border-4 border-black text-[11px] font-black uppercase tracking-widest active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all"
          style={{ boxShadow: '4px 4px 0px #000' }}
        >
          ← BACK
        </Link>
        <h1 className="font-display font-black text-black text-base uppercase tracking-widest flex-1 text-center">
          🎟️ Raffle
        </h1>
        <button
          onClick={() => setShowInfo(true)}
          className="w-8 h-8 border-2 border-black bg-black text-[#FFD700] font-black text-sm flex items-center justify-center shadow-[2px_2px_0px_#333] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
        >?</button>
      </div>

      {/* ── Info modal ── */}
      {showInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={() => setShowInfo(false)}>
          <div className="absolute inset-0 bg-black/80" />
          <div className="relative w-full max-w-sm border-2 border-black bg-[#1a1a1a] shadow-[6px_6px_0px_#FFD700]" onClick={e => e.stopPropagation()}>
            <div className="bg-[#FFD700] border-b-2 border-black px-4 py-2.5 flex items-center justify-between">
              <span className="text-black font-black text-sm uppercase tracking-widest">Como funciona</span>
              <button onClick={() => setShowInfo(false)} className="text-black font-black text-lg leading-none">✕</button>
            </div>
            <div className="px-4 py-4 space-y-4 text-sm">
              <div className="space-y-1.5">
                <p className="text-[#FFD700] font-black text-xs uppercase tracking-wider">🎟️ O que é necessário?</p>
                <p className="text-white/70 text-[11px] leading-relaxed">Compre tickets com <b className="text-white">VBMS na BASE</b>, <b className="text-white">USDC na BASE</b> ou <b className="text-white">ETH</b>. Cada ticket = 1 entrada no sorteio.</p>
              </div>
              <div className="space-y-1.5">
                <p className="text-[#FFD700] font-black text-xs uppercase tracking-wider">🏆 Como é sorteado?</p>
                <p className="text-white/70 text-[11px] leading-relaxed">Via <b className="text-white">Chainlink VRF v2.5</b> — totalmente verificável on-chain. Prêmio enviado manualmente ao vencedor.</p>
              </div>
              <div className="space-y-1.5">
                <p className="text-[#FFD700] font-black text-xs uppercase tracking-wider">♻️ Para onde vai o dinheiro?</p>
                <p className="text-white/70 text-[11px] leading-relaxed">VBMS vai direto ao pool. USDC/ETH são usados para recomprar VBMS e reinjetar no pool.</p>
              </div>
              <div className="border-t border-white/10 pt-3">
                <p className="text-white/30 text-[10px]">Contrato Base: {RAFFLE_BASE.slice(0, 10)}…{RAFFLE_BASE.slice(-6)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Buy modal ── */}
      {showBuy && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => { if (!isBusy) setShowBuy(false); }}>
          <div className="absolute inset-0 bg-black/80" />
          <div
            className="relative w-full max-w-sm border-2 border-t-0 border-black bg-[#1a1a1a] shadow-[0_-4px_0_#FFD700]"
            onClick={e => e.stopPropagation()}
          >
            <div className="bg-[#FFD700] border-b-2 border-black px-4 py-2.5 flex items-center justify-between">
              <span className="text-black font-black text-sm uppercase tracking-widest">🎟️ Comprar Tickets</span>
              <button onClick={() => { if (!isBusy) { setShowBuy(false); resetStatus(); } }} className="text-black font-black text-lg leading-none">✕</button>
            </div>

            <div className="px-4 py-4 space-y-4">
              {/* Status feedback */}
              {status === "success" && (
                <div className="bg-green-900/40 border-2 border-green-500 px-3 py-2 flex items-center justify-between">
                  <span className="text-green-400 font-black text-xs uppercase">✅ Tickets comprados!</span>
                  <button onClick={resetStatus} className="text-green-400/60 text-xs">✕</button>
                </div>
              )}
              {status === "error" && (
                <div className="bg-red-900/40 border-2 border-red-500 px-3 py-2 flex items-center justify-between">
                  <span className="text-red-400 font-black text-[10px] truncate flex-1">{errMsg || "Erro na transação"}</span>
                  <button onClick={resetStatus} className="text-red-400/60 text-xs ml-2 shrink-0">✕</button>
                </div>
              )}
              {(status === "switching" || status === "approving" || status === "buying") && (
                <div className="bg-[#FFD700]/10 border-2 border-[#FFD700]/40 px-3 py-2">
                  <span className="text-[#FFD700] font-black text-xs uppercase animate-pulse">
                    {status === "switching" ? "⛓ Trocando rede…" : status === "approving" ? "🔑 Aprovando token…" : "⏳ Enviando transação…"}
                  </span>
                </div>
              )}
              {pendingApprove && status === "idle" && (
                <div className="bg-blue-900/40 border-2 border-blue-500 px-3 py-2">
                  <p className="text-blue-300 font-black text-[10px] uppercase">✅ Aprovação confirmada — clique em Buy novamente</p>
                </div>
              )}

              {/* Qty selector */}
              <div className="flex items-center gap-3">
                <span className="text-white/50 text-[10px] font-black uppercase tracking-wider flex-1">Quantidade</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setBuyQty(q => Math.max(1, q - 1))}
                    disabled={isBusy}
                    className="w-8 h-8 border-2 border-black bg-[#111] text-white font-black flex items-center justify-center shadow-[2px_2px_0px_#FFD700] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all disabled:opacity-40"
                  >−</button>
                  <span className="text-[#FFD700] font-black text-xl w-8 text-center tabular-nums">{buyQty}</span>
                  <button
                    onClick={() => setBuyQty(q => Math.min(20, q + 1))}
                    disabled={isBusy}
                    className="w-8 h-8 border-2 border-black bg-[#111] text-white font-black flex items-center justify-center shadow-[2px_2px_0px_#FFD700] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all disabled:opacity-40"
                  >+</button>
                </div>
              </div>

              {/* Options — BASE */}
              <div className="border-2 border-black overflow-hidden">
                <div className="bg-[#0052FF]/20 border-b border-black/40 px-3 py-1.5">
                  <span className="text-[#0052FF] font-black text-[9px] uppercase tracking-widest">BASE Mainnet</span>
                </div>

                {/* VBMS */}
                <div className="flex items-center gap-3 px-3 py-2.5 border-b border-black/30">
                  <div className="w-9 h-9 shrink-0 border-2 border-black bg-[#0052FF] flex flex-col items-center justify-center shadow-[2px_2px_0px_#000]">
                    <span className="text-white font-black text-[8px]">BASE</span>
                    <span className="text-white/70 font-bold text-[7px]">VBMS</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-black text-sm">{vbmsPriceLabel}</p>
                    <p className="text-white/40 text-[9px]">saldo: {fmtBal(vbmsBal as bigint | undefined, 18, "VBMS")}</p>
                  </div>
                  <button
                    onClick={handleBuyVBMS}
                    disabled={!walletAddress || isBusy}
                    className="border-2 border-black font-black text-[10px] px-3 py-1.5 uppercase transition-all shrink-0 bg-[#FFD700] text-black shadow-[2px_2px_0px_#000] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] disabled:opacity-40 disabled:cursor-not-allowed disabled:translate-x-0 disabled:translate-y-0 disabled:shadow-[2px_2px_0px_#000]"
                  >
                    {vbmsNeedsApprove && !pendingApprove ? "Approve" : isBusy ? "…" : "Buy"}
                  </button>
                </div>

                {/* USDC */}
                <div className="flex items-center gap-3 px-3 py-2.5 border-b border-black/30">
                  <div className="w-9 h-9 shrink-0 border-2 border-black bg-[#2775CA] flex flex-col items-center justify-center shadow-[2px_2px_0px_#000]">
                    <span className="text-white font-black text-[8px]">BASE</span>
                    <span className="text-white/70 font-bold text-[7px]">USDC</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-black text-sm">{usdcPriceLabel}</p>
                    <p className="text-white/40 text-[9px]">saldo: {fmtBal(usdcBal as bigint | undefined, 6, "USDC")}</p>
                  </div>
                  <button
                    onClick={handleBuyUSDC}
                    disabled={!walletAddress || isBusy}
                    className="border-2 border-black font-black text-[10px] px-3 py-1.5 uppercase transition-all shrink-0 bg-[#FFD700] text-black shadow-[2px_2px_0px_#000] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] disabled:opacity-40 disabled:cursor-not-allowed disabled:translate-x-0 disabled:translate-y-0 disabled:shadow-[2px_2px_0px_#000]"
                  >
                    {usdcNeedsApprove && !pendingApprove ? "Approve" : isBusy ? "…" : "Buy"}
                  </button>
                </div>

                {/* ETH Base */}
                <div className="flex items-center gap-3 px-3 py-2.5">
                  <div className="w-9 h-9 shrink-0 border-2 border-black bg-[#627EEA] flex flex-col items-center justify-center shadow-[2px_2px_0px_#000]">
                    <span className="text-white font-black text-[8px]">BASE</span>
                    <span className="text-white/70 font-bold text-[7px]">ETH</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-black text-sm">{ethPriceLabel}</p>
                    <p className="text-white/40 text-[9px]">saldo: {fmtBal(baseEthBal?.value, 18, "ETH")}</p>
                  </div>
                  <button
                    onClick={handleBuyETHBase}
                    disabled={!walletAddress || isBusy}
                    className="border-2 border-black font-black text-[10px] px-3 py-1.5 uppercase transition-all shrink-0 bg-[#FFD700] text-black shadow-[2px_2px_0px_#000] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] disabled:opacity-40 disabled:cursor-not-allowed disabled:translate-x-0 disabled:translate-y-0 disabled:shadow-[2px_2px_0px_#000]"
                  >
                    {isBusy ? "…" : "Buy"}
                  </button>
                </div>
              </div>

              {/* Options — ARB */}
              <div className="border-2 border-black overflow-hidden">
                <div className="bg-[#12AAFF]/20 border-b border-black/40 px-3 py-1.5">
                  <span className="text-[#12AAFF] font-black text-[9px] uppercase tracking-widest">Arbitrum One</span>
                </div>

                {/* USND */}
                <div className="flex items-center gap-3 px-3 py-2.5 border-b border-black/30">
                  <div className="w-9 h-9 shrink-0 border-2 border-black bg-[#12AAFF] flex flex-col items-center justify-center shadow-[2px_2px_0px_#000]">
                    <span className="text-white font-black text-[8px]">ARB</span>
                    <span className="text-white/70 font-bold text-[7px]">USND</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-black text-sm">
                      {costUSDN ? fmtBal(costUSDN as bigint, 18, "USND") : `$${(ticketPriceUSD * buyQty).toFixed(2)} USND`}
                    </p>
                    <p className="text-white/40 text-[9px]">saldo: {fmtBal(usndBal as bigint | undefined, 18, "USND")}</p>
                  </div>
                  <button
                    onClick={handleBuyUSDN}
                    disabled={!walletAddress || isBusy}
                    className="border-2 border-black font-black text-[10px] px-3 py-1.5 uppercase transition-all shrink-0 bg-[#FFD700] text-black shadow-[2px_2px_0px_#000] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] disabled:opacity-40 disabled:cursor-not-allowed disabled:translate-x-0 disabled:translate-y-0 disabled:shadow-[2px_2px_0px_#000]"
                  >
                    {!usndAllowance || (costUSDN && (usndAllowance as bigint) < (costUSDN as bigint)) ? "Approve" : isBusy ? "…" : "Buy"}
                  </button>
                </div>

                {/* ETH ARB */}
                <div className="flex items-center gap-3 px-3 py-2.5">
                  <div className="w-9 h-9 shrink-0 border-2 border-black bg-[#627EEA]/80 flex flex-col items-center justify-center shadow-[2px_2px_0px_#000]">
                    <span className="text-white font-black text-[8px]">ARB</span>
                    <span className="text-white/70 font-bold text-[7px]">ETH</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-black text-sm">
                      {arbEthWeiCost ? fmtBal(arbEthWeiCost as bigint, 18, "ETH") : `≈${(0.000023 * buyQty).toFixed(6)} ETH`}
                    </p>
                    <p className="text-white/40 text-[9px]">saldo: {fmtBal(arbEthBal?.value, 18, "ETH")}</p>
                  </div>
                  <button
                    onClick={handleBuyETHArb}
                    disabled={!walletAddress || isBusy}
                    className="border-2 border-black font-black text-[10px] px-3 py-1.5 uppercase transition-all shrink-0 bg-[#FFD700] text-black shadow-[2px_2px_0px_#000] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] disabled:opacity-40 disabled:cursor-not-allowed disabled:translate-x-0 disabled:translate-y-0 disabled:shadow-[2px_2px_0px_#000]"
                  >
                    {isBusy ? "…" : "Buy"}
                  </button>
                </div>
              </div>

              {!walletAddress && (
                <p className="text-white/30 text-[9px] text-center uppercase tracking-wider">Conecte sua wallet para comprar</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-sm mx-auto px-4 py-5 space-y-4">

          {/* Prize card */}
          <div className="border-2 border-black bg-[#1a1a1a] shadow-[4px_4px_0px_#FFD700] overflow-hidden">
            <div className="flex">
              <div className="shrink-0 bg-black border-r-2 border-black flex items-center justify-center overflow-hidden" style={{ width: 110, minHeight: 140 }}>
                <img
                  src="/images/baccarat/queen%20diamonds%2C%20goofy%20romero.png"
                  alt="Goofy Romero"
                  className="h-full w-auto object-contain"
                  style={{ maxHeight: 140 }}
                  onError={(e) => {
                    const el = e.currentTarget as HTMLImageElement;
                    el.style.display = "none";
                    el.parentElement!.innerHTML = '<div style="font-size:3rem;display:flex;align-items:center;justify-content:center;height:140px">🃏</div>';
                  }}
                />
              </div>
              <div className="flex-1 p-4 flex flex-col justify-center gap-2">
                <span className="inline-block text-[8px] font-black uppercase tracking-widest text-[#FFD700] bg-[#FFD700]/10 border border-[#FFD700]/40 px-2 py-0.5 self-start">Legendary</span>
                <p className="text-[#FFD700] font-display font-black text-xl leading-tight">Goofy Romero</p>
                <p className="text-white/40 text-[10px] font-bold uppercase tracking-wider">Queen of Diamonds</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-white font-black text-lg">~$23</span>
                  <span className="text-white/30 text-[10px] font-mono">≈ 3.7M VBMS</span>
                </div>
                <a
                  href={OPENSEA_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-0.5 text-[#2081E2] font-black text-[9px] uppercase tracking-wider hover:underline"
                >
                  <svg width="10" height="10" viewBox="0 0 90 90" fill="currentColor"><path d="M45 0C20.15 0 0 20.15 0 45s20.15 45 45 45 45-20.15 45-45S69.85 0 45 0zM22.05 46.25l.17-.26 10.45-16.37a.41.41 0 0 1 .72.04c1.74 3.9 3.24 8.75 2.54 11.77-.3 1.26-1.12 2.96-2.04 4.53a11.6 11.6 0 0 1-.38.63.4.4 0 0 1-.34.18H22.43a.41.41 0 0 1-.38-.52zm57.67 7.09a.42.42 0 0 1-.25.38c-1.06.45-4.68 2.1-6.19 4.18-3.84 5.34-6.77 12.97-13.33 12.97H33.42A20.53 20.53 0 0 1 12.9 50.34v-.35c0-.23.18-.41.41-.41h11.57c.26 0 .46.23.43.49-.11 1.03.07 2.08.52 3.04a6.5 6.5 0 0 0 5.86 3.67h9.19V50.1h-9.09a.42.42 0 0 1-.34-.66l.22-.31c.58-.82 1.41-2.08 2.25-3.52 1.58-2.66 3.12-5.98 3.12-9.3 0-.5-.03-1.06-.09-1.6a27.47 27.47 0 0 0-.37-2.92 21.67 21.67 0 0 0-.59-2.3c-.12-.4-.29-.82-.44-1.22l-.07-.22a.41.41 0 0 1 .58-.5l1.29.46.02.01 1.86.68 1.88.7 2 .75v-5.1a2.05 2.05 0 1 1 4.1 0v3.8l1.6.6c.13.05.25.11.37.19.39.26 1 .71 1.54 1.26 1.23 1.25 2.55 3.12 3.44 5.62.2.55.37 1.13.5 1.73.14.6.22 1.22.25 1.82.03.34.04.67.04 1 0 .93-.1 1.84-.3 2.71-.08.39-.19.78-.31 1.16a16.38 16.38 0 0 1-1.65 3.5l-.44.7-.02.04c-.29.45-.6.9-.92 1.34l-.21.3a.42.42 0 0 0 .34.66h5.98a7.29 7.29 0 0 0 5.13-2.08c.47-.46.89-.96 1.25-1.5 1.16-1.71 1.8-3.76 1.8-5.9v-.5a.42.42 0 0 1 .56-.39l12.08 4.52a.42.42 0 0 1 .27.39z"/></svg>
                  OpenSea
                </a>
              </div>
            </div>

            {/* Stats */}
            <div className="border-t-2 border-black grid grid-cols-3 bg-[#1a1a1a]">
              <div className="flex flex-col items-center py-3 border-r-2 border-black">
                <span className="font-black text-xl text-white leading-none">{totalTickets}</span>
                <span className="text-white/40 text-[9px] uppercase mt-0.5 font-bold">tickets</span>
              </div>
              <div className="flex flex-col items-center py-3 border-r-2 border-black">
                <span className="font-black text-sm text-[#FFD700] leading-none">
                  {totalVBMS >= 1_000_000 ? `${(totalVBMS / 1_000_000).toFixed(1)}M`
                    : totalVBMS >= 1_000 ? `${(totalVBMS / 1_000).toFixed(0)}k`
                    : totalVBMS.toString()}
                </span>
                <span className="text-white/40 text-[9px] uppercase mt-0.5 font-bold">VBMS pool</span>
              </div>
              <div className="flex flex-col items-center py-3">
                {ended ? (
                  <span className="font-black text-base text-red-400 leading-none">ENDED</span>
                ) : endsAt ? (
                  <span className="font-mono font-black text-base text-[#FFD700] leading-none tabular-nums">
                    {d > 0 ? `${d}d ${h}h` : `${h}h ${m}m`}
                  </span>
                ) : (
                  <span className="font-mono font-black text-base text-white/30 leading-none">— —</span>
                )}
                <span className="text-white/40 text-[9px] uppercase mt-0.5 font-bold">left</span>
              </div>
            </div>
          </div>

          {/* Buy button */}
          <button
            onClick={() => { setShowBuy(true); resetStatus(); }}
            className="w-full border-2 border-black bg-[#FFD700] text-black font-black text-sm uppercase tracking-widest py-3.5 shadow-[4px_4px_0px_#000] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] transition-all"
          >
            🎟️ Buy Tickets
          </button>

          {/* Participants */}
          {entries.length > 0 && (
            <div className="border-2 border-black bg-[#1a1a1a] shadow-[4px_4px_0px_#000] overflow-hidden">
              <div className="bg-[#FFD700] border-b-2 border-black px-3 py-2 flex items-center justify-between">
                <span className="text-black font-black text-[10px] uppercase tracking-widest">Participants</span>
                <span className="text-black/60 font-bold text-[9px]">{entries.length} wallets</span>
              </div>
              <div className="divide-y divide-black/40 max-h-48 overflow-y-auto">
                {entries.map((e, i) => (
                  <div key={e.txHash} className="flex items-center gap-2 px-3 py-2">
                    <span className="text-white/30 font-mono text-[9px] w-4 text-right">{i + 1}</span>
                    <span className="flex-1 font-mono text-[10px] text-white/60 truncate">{e.address.slice(0, 6)}…{e.address.slice(-4)}</span>
                    <span className="text-[#FFD700] font-black text-[10px]">{e.tickets}×</span>
                    <span className={`text-[8px] font-black px-1.5 py-0.5 border-2 border-black ${e.chain === "base" ? "bg-[#0052FF] text-white" : "bg-[#12AAFF] text-white"}`}>
                      {e.chain.toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* VRF */}
          <div className="border-2 border-black bg-[#1a1a1a] shadow-[4px_4px_0px_#000] overflow-hidden">
            <div className="bg-black border-b-2 border-black px-3 py-2">
              <span className="text-[#FFD700] font-black text-[10px] uppercase tracking-widest">🔗 Verifiable Fairness</span>
            </div>
            <div className="px-3 py-3 space-y-2">
              <p className="text-white/40 text-[10px] font-mono">formula: winnerIndex = vrfRandomWord % totalEntries</p>
              <p className="text-white/40 text-[10px]">Chainlink VRF v2.5 · Arbitrum One · Fully verifiable</p>
              <p className="text-white/30 text-[10px]">All entries recorded on-chain · Prize sent manually to winner</p>
            </div>
            <div className="border-t-2 border-black px-3 py-2 flex gap-2">
              <span className="bg-[#0052FF] text-white text-[9px] font-black px-2 py-0.5 border-2 border-black">BASE · VBMS + USDC + ETH</span>
              <span className="bg-[#12AAFF] text-white text-[9px] font-black px-2 py-0.5 border-2 border-black">ARB · USND + ETH</span>
            </div>
          </div>

          <div className="h-4" />
        </div>
      </div>
    </div>
  );
}
