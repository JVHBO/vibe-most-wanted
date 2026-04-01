"use client";

import { useState, useEffect, useRef } from "react";
import { useConvex, useQuery, useMutation, useAction } from "convex/react";
import Link from "next/link";
import {
  useAccount, useBalance, useReadContract,
  useWaitForTransactionReceipt, useSwitchChain, useSignMessage,
} from "wagmi";
import { useWriteContractWithAttribution } from "@/lib/hooks/useWriteContractWithAttribution";
import { api } from "@/convex/_generated/api";
import { AudioManager } from "@/lib/audio-manager";
import { formatUnits, parseUnits } from "viem";
import { useLanguage } from "@/contexts/LanguageContext";
import { shareToFarcaster } from "@/lib/share-utils";

// ─── Addresses ────────────────────────────────────────────────────────────────
const RAFFLE_BASE   = "0x54ac4e3782a21341440c418e7c37b26f937095e4" as const;
const RAFFLE_ARB    = "0x320128eA0382EaD559094b229E8cCD04D37ebC22" as const;
// ERC-20 VBMS token (confirmed in convex/blockchainVerify.ts — NOT the NFT collection)
const VBMS_ADDRESS  = "0xb03439567cd22f278b21e1ffcdfb8e1696763827" as const;
const USDC_ADDRESS  = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913" as const;
const USND_ADDRESS  = "0x4ecf61a6c2fab8a047ceb3b3b263b401763e9d49" as const;
const OPENSEA_URL   = "https://opensea.io/item/base/0xf14c1dc8ce5fe65413379f76c43fa1460c31e728/13384";

const BASE_CHAIN_ID = 8453;
const ARB_CHAIN_ID  = 42161;

// ─── ABIs ─────────────────────────────────────────────────────────────────────
const RAFFLE_BASE_ABI = [
  { name: "active", type: "function", stateMutability: "view",
    inputs: [], outputs: [{ name: "", type: "bool" }] },
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
  { name: "totalTickets", type: "function", stateMutability: "view",
    inputs: [], outputs: [{ type: "uint256" }] },
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
  username: string | null;
  tickets: number;
  chain: string;
}

interface RaffleRecentEntry {
  address: string;
  username?: string | null;
  tickets: number;
  chain: string;
  token: string;
  txHash: string;
  timestamp: number;
}

interface PlayerTicketInfo {
  totalTickets: number;
  playerTotal: number;
  playerRanges: Array<{ start: number; end: number; chain: string; token: string }>;
}

function fmtAddr(addr: string) {
  return addr.slice(0, 6) + "…" + addr.slice(-4);
}

function arbTxUrl(txHash: string) {
  return `https://arbiscan.io/tx/${txHash}`;
}
function baseTxUrl(txHash: string) {
  return `https://basescan.org/tx/${txHash}`;
}

function timeAgo(ts: number, tFn: (k: any) => string) {
  const diff = Date.now() - ts;
  if (diff < 60_000) return `${Math.max(1, Math.floor(diff / 1000))}${tFn('raffleTimeAgoSecs')}`;
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}${tFn('raffleTimeAgoMins')}`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}${tFn('raffleTimeAgoHours')}`;
  return `${Math.floor(diff / 86_400_000)}${tFn('raffleTimeAgoDays')}`;
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
  const s = Math.floor((diff % 60000) / 1000);
  return { d, h, m, s, ended: diff === 0 && endsAt !== null };
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
  const { t } = useLanguage();
  const { address: walletAddress, chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();

  const [showInfo, setShowInfo] = useState(false);
  const [showBuy,  setShowBuy]  = useState(false);
  const [buyQty,   setBuyQty]   = useState(1);
  const [status,   setStatus]   = useState<BuyStatus>("idle");
  const [errMsg,   setErrMsg]   = useState("");
  const [lastBuyChain, setLastBuyChain] = useState<"base" | "arb" | null>(null);
  const [lastBuyToken, setLastBuyToken] = useState<string>("VBMS");
  const [pendingApprove, setPendingApprove] = useState(false);
  const [config,        setConfig]        = useState<RaffleConfig | null>(null);
  const [entries,       setEntries]       = useState<RaffleEntry[]>([]);
  const [recentEntries, setRecentEntries] = useState<RaffleRecentEntry[]>([]);
  const [myNewTickets,      setMyNewTickets]      = useState<number[]>([]);
  const [playerInfo,        setPlayerInfo]        = useState<PlayerTicketInfo | null>(null);
  const [myPurchasesPage,   setMyPurchasesPage]   = useState(0);
  const [pendingTxList,     setPendingTxList]     = useState<Array<{ txHash: string; chain: "base" | "arb"; qty: number; token: string }>>([]);
  const [shareClaimed,      setShareClaimed]      = useState(false);
  const [shareClaiming,     setShareClaiming]     = useState(false);
  const claimShareBonusAction = useAction(api.raffle.claimShareBonus);
  const { signMessageAsync } = useSignMessage();
  const [showCardModal,     setShowCardModal]     = useState(false);
  const cardRotRef = useRef({ rotY: 0, rotX: 0, dragging: false, lastX: 0, lastY: 0 });
  const cardInnerRef = useRef<HTMLDivElement>(null);
  const loaded              = useRef(false);
  const feedTimer           = useRef<ReturnType<typeof setInterval> | null>(null);
  const ticketRangeStartRef = useRef<number | null>(null);

  function loadRaffleData(epoch: number, addr?: string) {
    Promise.all([
      convex.query(api.raffle.getRaffleBuyers, { epoch }).catch(() => []),
      convex.query(api.raffle.getRecentEntries, { epoch, limit: 10 }).catch(() => []),
      addr ? convex.query(api.raffle.getPlayerTicketInfo, { address: addr, epoch }).catch(() => null) : Promise.resolve(null),
    ]).then(([buyers, recent, pinfo]) => {
      if (buyers) setEntries(buyers as RaffleEntry[]);
      if (recent) {
        setRecentEntries(recent as RaffleRecentEntry[]);
        // Remove from pendingTxList once txHash appears in recent entries
        setPendingTxList(prev =>
          prev.filter(p => !(recent as RaffleRecentEntry[]).some(e => e.txHash === p.txHash))
        );
      }
      if (pinfo) setPlayerInfo(pinfo as PlayerTicketInfo);
      else if (addr === undefined) setPlayerInfo(null);
    });
  }

  const liveConfig = useQuery(api.raffle.getRaffleConfig);
  useEffect(() => {
    if (!liveConfig) return;
    const cfg = liveConfig as unknown as RaffleConfig;
    setConfig(cfg);
    const epoch = cfg.epoch ?? 1;
    if (feedTimer.current) clearInterval(feedTimer.current);
    loadRaffleData(epoch, walletAddress?.toLowerCase());
    feedTimer.current = setInterval(() => loadRaffleData(epoch, walletAddress?.toLowerCase()), 30_000);
    return () => { if (feedTimer.current) clearInterval(feedTimer.current); };
  }, [liveConfig?.epoch]);

  // Lock body scroll when any modal is open
  useEffect(() => {
    const open = showBuy || showInfo;
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [showBuy, showInfo]);

  const endsAt      = config ? config.updatedAt + config.durationDays * 86400000 : null;
  const { d, h, m, s, ended } = useCountdown(endsAt);
  const raffleResult = useQuery(api.raffle.getRaffleResult, { epoch: config?.epoch ?? 1 });
  const totalTicketsConvex = entries.reduce((sum, e) => sum + e.tickets, 0);
  const bonusTicketCount  = useQuery(api.raffle.getBonusTicketCount, { epoch: config?.epoch }) ?? 0;
  const ticketPriceVBMS = config?.ticketPriceVBMS ?? 10000;
  const ticketPriceUSD  = config?.ticketPriceUSD  ?? 0.06;

  // ── Raffle active state ──
  const { data: raffleActive } = useReadContract({
    address: RAFFLE_BASE, abi: RAFFLE_BASE_ABI, functionName: "active",
    args: [], chainId: BASE_CHAIN_ID,
    query: { refetchInterval: 30_000 },
  });
  const isRaffleActive = raffleActive === true;

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

  // ── ARB total tickets (on-chain, live) ──
  const { data: arbTotalTicketsRaw, refetch: refetchArbTotal } = useReadContract({
    address: RAFFLE_ARB, abi: RAFFLE_ARB_ABI, functionName: "totalTickets",
    args: [], chainId: ARB_CHAIN_ID,
    query: { refetchInterval: 30_000 },
  });
  const arbTotalTickets = arbTotalTicketsRaw !== undefined ? Number(arbTotalTicketsRaw) : null;
  // Use Convex count (epoch-aware). ARB on-chain can be stale from prev epoch.
  const totalTickets = totalTicketsConvex;
  const paidTickets  = Math.max(0, totalTickets - bonusTicketCount);
  const totalVBMS    = paidTickets * ticketPriceVBMS;

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
  const { writeContractAsync } = useWriteContractWithAttribution();
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
      // Add to pendingTxList until cron syncs it (~2min)
      if (txHash && lastBuyChain) {
        setPendingTxList(prev => [...prev, { txHash, chain: lastBuyChain!, qty: buyQty, token: lastBuyToken }]);
      }
      // If ARB purchase: fetch new totalTickets to compute ticket numbers
      if (lastBuyChain === "arb" && ticketRangeStartRef.current !== null) {
        const before = ticketRangeStartRef.current;
        refetchArbTotal().then(({ data }) => {
          const after = Number(data ?? 0);
          if (after > before) {
            setMyNewTickets(Array.from({ length: after - before }, (_, i) => before + i + 1));
          }
        });
      }
      // reload entries + recent feed + player info
      const epoch = config?.epoch ?? 1;
      loadRaffleData(epoch, walletAddress?.toLowerCase());
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
      setLastBuyChain("base");
      setLastBuyToken("VBMS");
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
      setLastBuyChain("base");
      setLastBuyToken("USDC");
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
      setLastBuyChain("base");
      setLastBuyToken("ETH");
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
      // Capture current total so we know which tickets the player gets
      ticketRangeStartRef.current = arbTotalTickets ?? 0;
      setLastBuyChain("arb");
      setLastBuyToken("USND");
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
      // Capture current total so we know which tickets the player gets
      ticketRangeStartRef.current = arbTotalTickets ?? 0;
      setLastBuyChain("arb");
      setLastBuyToken("ETH");
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
    setLastBuyChain(null);
    setLastBuyToken("VBMS");
    setMyNewTickets([]);
    ticketRangeStartRef.current = null;
  }

  const pendingTx = pendingTxList.length > 0 ? pendingTxList[0] : null; // compat alias for banner

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
      <div className="bg-black border-b-4 border-[#FFD700] px-4 py-3 flex items-center shrink-0 relative">
        <Link
          href="/"
          onClick={() => AudioManager.buttonClick()}
          className="px-2 py-1 bg-[#CC2222] hover:bg-[#AA1111] text-white border-4 border-[#FFD700] text-[11px] font-black uppercase tracking-widest active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all z-10"
          style={{ boxShadow: '4px 4px 0px #FFD700' }}
        >
          {t('raffleBack')}
        </Link>
        <h1 className="absolute left-1/2 -translate-x-1/2 font-display font-black text-[#FFD700] text-base uppercase tracking-widest pointer-events-none">
          Raffle
        </h1>
        <button
          onClick={() => setShowInfo(true)}
          className="w-8 h-8 border-2 border-[#FFD700] bg-[#FFD700]/10 text-[#FFD700] font-black text-sm flex items-center justify-center shadow-[2px_2px_0px_#FFD700] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all ml-auto z-10"
        >?</button>
      </div>

      {/* ── Card flip 3D modal ── */}
      {showCardModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)' }}
          onClick={() => { setShowCardModal(false); cardRotRef.current = { rotY: 0, rotX: 0, dragging: false, lastX: 0, lastY: 0 }; if (cardInnerRef.current) cardInnerRef.current.style.transform = 'rotateY(0deg) rotateX(0deg)'; }}
        >
          <div className="flex flex-col items-center gap-4" onClick={e => e.stopPropagation()}>
            {/* 3D card — drag to spin */}
            <div
              className="select-none"
              style={{ perspective: '900px', width: 204, height: 310, cursor: 'grab' }}
              onMouseDown={e => {
                cardRotRef.current.dragging = true;
                cardRotRef.current.lastX = e.clientX;
                cardRotRef.current.lastY = e.clientY;
                (e.currentTarget as HTMLDivElement).style.cursor = 'grabbing';
              }}
              onMouseMove={e => {
                if (!cardRotRef.current.dragging) return;
                const dx = e.clientX - cardRotRef.current.lastX;
                const dy = e.clientY - cardRotRef.current.lastY;
                cardRotRef.current.lastX = e.clientX;
                cardRotRef.current.lastY = e.clientY;
                cardRotRef.current.rotY += dx * 0.7;
                cardRotRef.current.rotX -= dy * 0.4;
                cardRotRef.current.rotX = Math.max(-40, Math.min(40, cardRotRef.current.rotX));
                if (cardInnerRef.current) {
                  cardInnerRef.current.style.transform = `rotateY(${cardRotRef.current.rotY}deg) rotateX(${cardRotRef.current.rotX}deg)`;
                }
              }}
              onMouseUp={e => { cardRotRef.current.dragging = false; (e.currentTarget as HTMLDivElement).style.cursor = 'grab'; }}
              onMouseLeave={e => { cardRotRef.current.dragging = false; (e.currentTarget as HTMLDivElement).style.cursor = 'grab'; }}
              onTouchStart={e => {
                const t = e.touches[0];
                cardRotRef.current.dragging = true;
                cardRotRef.current.lastX = t.clientX;
                cardRotRef.current.lastY = t.clientY;
              }}
              onTouchMove={e => {
                if (!cardRotRef.current.dragging) return;
                const t = e.touches[0];
                const dx = t.clientX - cardRotRef.current.lastX;
                const dy = t.clientY - cardRotRef.current.lastY;
                cardRotRef.current.lastX = t.clientX;
                cardRotRef.current.lastY = t.clientY;
                cardRotRef.current.rotY += dx * 0.7;
                cardRotRef.current.rotX -= dy * 0.4;
                cardRotRef.current.rotX = Math.max(-40, Math.min(40, cardRotRef.current.rotX));
                if (cardInnerRef.current) {
                  cardInnerRef.current.style.transform = `rotateY(${cardRotRef.current.rotY}deg) rotateX(${cardRotRef.current.rotX}deg)`;
                }
              }}
              onTouchEnd={() => { cardRotRef.current.dragging = false; }}
            >
              <div
                ref={cardInnerRef}
                style={{
                  width: '100%', height: '100%',
                  position: 'relative',
                  transformStyle: 'preserve-3d',
                  transform: 'rotateY(0deg) rotateX(0deg)',
                }}
              >
                {/* Front — carta inteira visível */}
                <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', borderRadius: 12, overflow: 'hidden', boxShadow: '0 0 40px rgba(255,215,0,0.5)', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <img
                    src="/images/baccarat/queen%20diamonds%2C%20goofy%20romero.png"
                    alt="Goofy Romero"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
                {/* Back — zoom para cobrir bordas do formato diferente */}
                <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: 'rotateY(180deg)', borderRadius: 12, overflow: 'hidden', boxShadow: '0 0 40px rgba(255,215,0,0.5)' }}>
                  <img
                    src="/images/card-back.png"
                    alt="VMW Card Back"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', transform: 'scale(1.13) translateY(1.3%)', transformOrigin: 'center' }}
                    onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/images/gif-background.png'; }}
                  />
                  <a
                    href={OPENSEA_URL} target="_blank" rel="noopener noreferrer"
                    style={{ position: 'absolute', bottom: 10, left: 0, right: 0, textAlign: 'center', color: '#000', fontSize: 11, fontFamily: 'monospace', fontWeight: 900, textDecoration: 'none', letterSpacing: 1 }}
                  >#13384 ↗</a>
                </div>
              </div>
            </div>
            <p className="text-white/40 text-[10px] uppercase tracking-widest">{t('raffleCardDragHint')}</p>
            <button
              onClick={() => { setShowCardModal(false); cardRotRef.current = { rotY: 0, rotX: 0, dragging: false, lastX: 0, lastY: 0 }; }}
              className="text-white/30 text-xs font-black uppercase tracking-widest hover:text-white/60 transition-colors"
            >✕ {t('raffleCardClose')}</button>
          </div>
        </div>
      )}

      {/* ── Info modal ── */}
      {showInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={() => setShowInfo(false)}>
          <div className="absolute inset-0 bg-black/80" />
          <div className="relative w-full max-w-sm border-2 border-black bg-[#1a1a1a] shadow-[6px_6px_0px_#FFD700]" onClick={e => e.stopPropagation()}>
            <div className="bg-[#FFD700] border-b-2 border-black px-4 py-2.5 flex items-center justify-between">
              <span className="text-black font-black text-sm uppercase tracking-widest">{t('raffleHowItWorks')}</span>
              <button onClick={() => setShowInfo(false)} className="text-black font-black text-lg leading-none">✕</button>
            </div>
            <div className="px-4 py-4 space-y-4 text-sm">
              <div className="space-y-1.5">
                <p className="text-[#FFD700] font-black text-xs uppercase tracking-wider">🎟️ {t('raffleInfoQ1')}</p>
                <p className="text-white/70 text-[11px] leading-relaxed">{t('raffleInfoA1')}</p>
              </div>
              <div className="space-y-1.5">
                <p className="text-[#FFD700] font-black text-xs uppercase tracking-wider">🏆 {t('raffleInfoQ2')}</p>
                <p className="text-white/70 text-[11px] leading-relaxed">{t('raffleInfoA2')}</p>
              </div>
              <div className="space-y-1.5">
                <p className="text-[#FFD700] font-black text-xs uppercase tracking-wider">♻️ {t('raffleInfoQ3')}</p>
                <p className="text-white/70 text-[11px] leading-relaxed">{t('raffleInfoA3')}</p>
              </div>
              <div className="border-t border-white/10 pt-3">
                <p className="text-white/30 text-[10px]">{t('raffleInfoContract')} {RAFFLE_BASE.slice(0, 10)}…{RAFFLE_BASE.slice(-6)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Buy modal ── */}
      {showBuy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => { if (!isBusy) { setShowBuy(false); resetStatus(); } }}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />
          <div
            className="relative w-full max-w-sm border-2 border-black bg-[#1a1a1a] shadow-[6px_6px_0px_#FFD700] flex flex-col max-h-[90vh]"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-[#FFD700] border-b-2 border-black px-4 py-3 flex items-center justify-between shrink-0">
              <span className="text-black font-black text-sm uppercase tracking-widest">🎟️ {t('raffleBuyTickets')}</span>
              <button
                onClick={() => { if (!isBusy) { setShowBuy(false); resetStatus(); } }}
                className="w-7 h-7 flex items-center justify-center border-2 border-black bg-black text-[#FFD700] font-black text-xs shadow-[2px_2px_0px_#333] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
              >✕</button>
            </div>

            {/* Body */}
            <div className="px-3 py-3 space-y-3 overflow-y-auto">

              {/* Status feedback */}
              {status === "success" && (
                <div className="bg-green-900/40 border-2 border-green-500 px-3 py-2.5 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-green-400 font-black text-xs uppercase">
                        🎉 {buyQty} {t('raffleTicketsBought')}
                      </p>
                      {lastBuyChain === "arb" && myNewTickets.length > 0 && (
                        <div className="mt-2">
                          <p className="text-green-300/70 text-[9px] uppercase tracking-wider mb-1.5">{t('raffleYourNumbers')}</p>
                          <div className="flex flex-wrap gap-1">
                            {myNewTickets.map(n => (
                              <span key={n} className="bg-[#FFD700] text-black font-black text-[10px] px-2 py-0.5 border-2 border-black shadow-[1px_1px_0_#000]">
                                #{n}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {lastBuyChain === "base" && (
                        <p className="text-green-300/60 text-[10px] mt-1.5">{t('raffleBaseSync')}</p>
                      )}
                      {lastBuyChain === "arb" && myNewTickets.length === 0 && (
                        <p className="text-green-300/60 text-[10px] mt-1">{t('raffleArbRegistered')}</p>
                      )}
                    </div>
                    <button onClick={resetStatus} className="text-green-400/60 text-xs shrink-0 mt-0.5">✕</button>
                  </div>
                  {/* Share bonus — shown right after purchase */}
                  <div className="border-t border-green-500/30 pt-2">
                    {shareClaimed ? (
                      <p className="text-green-400/70 font-black text-[10px] uppercase text-center">✅ +1 bonus ticket claimed!</p>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <p className="text-[#FFD700] font-black text-[10px] uppercase">🎁 Share & get +1 ticket</p>
                          <p className="text-white/40 text-[9px]">Cast on Farcaster · one time per raffle</p>
                        </div>
                        <button
                          disabled={shareClaiming}
                          onClick={async () => {
                            const castText = `Just entered the Goofy Romero ($23) raffle 🎟️\n\nTicket: $0.06 each — grab yours before it's gone!`;
                            shareToFarcaster(castText, "https://vibemostwanted.xyz/share/raffle");
                            setShareClaiming(true);
                            try {
                              const addr = walletAddress!.toLowerCase();
                              const epoch = config?.epoch ?? 1;
                              const message = `claim-share-bonus:${addr}:${epoch}`;
                              const signature = await signMessageAsync({ message });
                              await claimShareBonusAction({ address: addr, signature });
                              setShareClaimed(true);
                            } catch(e: any) {
                              if (e?.message?.includes("Already claimed")) setShareClaimed(true);
                            } finally { setShareClaiming(false); }
                          }}
                          className="shrink-0 bg-[#FFD700] text-black font-black text-[10px] uppercase tracking-wider px-3 py-2 border-2 border-black shadow-[2px_2px_0px_#000] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all disabled:opacity-50"
                        >
                          {shareClaiming ? "…" : "Share 🔗"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {status === "error" && (
                <div className="bg-red-900/40 border-2 border-red-500 px-3 py-2 flex items-center justify-between gap-2">
                  <span className="text-red-400 font-black text-[10px] flex-1">{errMsg || "Erro na transação"}</span>
                  <button onClick={resetStatus} className="text-red-400/60 text-xs shrink-0">✕</button>
                </div>
              )}
              {(status === "switching" || status === "approving" || status === "buying") && (
                <div className="bg-[#FFD700]/10 border-2 border-[#FFD700]/40 px-3 py-2.5 text-center">
                  <span className="text-[#FFD700] font-black text-xs uppercase animate-pulse">
                    {status === "switching" ? t('raffleSwitchingChain') : status === "approving" ? t('raffleApprovingToken') : t('raffleSendingTx')}
                  </span>
                </div>
              )}
              {pendingApprove && status === "idle" && (
                <div className="bg-blue-900/40 border-2 border-blue-500 px-3 py-2 text-center">
                  <p className="text-blue-300 font-black text-[10px] uppercase">{t('raffleApprovedClickBuy')}</p>
                </div>
              )}

              {/* Qty selector */}
              <div className="flex items-center gap-2 bg-black/30 border-2 border-black px-3 py-2">
                <span className="text-white/50 text-[9px] font-black uppercase tracking-wider flex-1">{t('raffleQuantity')}</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => setBuyQty(q => Math.max(1, q - 1))} disabled={isBusy}
                    className="w-7 h-7 border-2 border-black bg-[#111] text-white font-black text-base flex items-center justify-center shadow-[2px_2px_0px_#FFD700] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all disabled:opacity-40">−</button>
                  <input
                    type="number" min={1} max={50} value={buyQty} disabled={isBusy}
                    onChange={e => { const v = parseInt(e.target.value); if (!isNaN(v)) setBuyQty(Math.min(50, Math.max(1, v))); }}
                    className="text-[#FFD700] font-black text-xl w-12 text-center tabular-nums bg-transparent border-0 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <button onClick={() => setBuyQty(q => Math.min(50, q + 1))} disabled={isBusy}
                    className="w-7 h-7 border-2 border-black bg-[#111] text-white font-black text-base flex items-center justify-center shadow-[2px_2px_0px_#FFD700] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all disabled:opacity-40">+</button>
                </div>
              </div>

              {/* ARB options — shown first */}
              <div className="border-2 border-black overflow-hidden">
                <div className="bg-[#12AAFF] px-3 py-1 flex items-center justify-between">
                  <span className="text-black font-black text-[8px] uppercase tracking-widest">{t('raffleArbitrumOne')}</span>
                  <span className="text-black/70 text-[7px] font-bold uppercase tracking-wide">⚡ Instant on-chain</span>
                </div>

                {/* USND */}
                <div className="flex items-center gap-2 px-3 py-2 border-b border-white/5">
                  <img src="/tokens/usnd.avif" alt="USND" className="w-8 h-8 shrink-0 rounded-full object-cover border-2 border-black shadow-[1px_1px_0px_#000]" />
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-black text-xs leading-none">
                      {costUSDN ? fmtBal(costUSDN as bigint, 18, "USND") : `$${(ticketPriceUSD * buyQty).toFixed(2)} USND`}
                    </p>
                    <p className="text-white/30 text-[8px]">{t('raffleBalance')} {fmtBal(usndBal as bigint | undefined, 18, "USND")}</p>
                  </div>
                  <button onClick={handleBuyUSDN} disabled={!walletAddress || isBusy}
                    className="border-2 border-black font-black text-xs px-4 py-2 uppercase shrink-0 bg-[#FFD700] text-black shadow-[3px_3px_0px_#000] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:translate-x-0 disabled:translate-y-0 disabled:shadow-[3px_3px_0px_#000]">
                    {!usndAllowance || (costUSDN && (usndAllowance as bigint) < (costUSDN as bigint)) ? t('raffleApprove') : isBusy ? "…" : t('raffleBuy')}
                  </button>
                </div>

                {/* ETH ARB */}
                <div className="flex items-center gap-2 px-3 py-2">
                  <img src="/tokens/eth.png" alt="ETH" className="w-8 h-8 shrink-0 rounded-full object-cover border-2 border-black shadow-[1px_1px_0px_#000]" />
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-black text-xs leading-none">
                      {arbEthWeiCost ? fmtBal(arbEthWeiCost as bigint, 18, "ETH") : `≈${(0.000023 * buyQty).toFixed(6)} ETH`}
                    </p>
                    <p className="text-white/30 text-[8px]">{t('raffleBalance')} {fmtBal(arbEthBal?.value, 18, "ETH")}</p>
                  </div>
                  <button onClick={handleBuyETHArb} disabled={!walletAddress || isBusy}
                    className="border-2 border-black font-black text-xs px-4 py-2 uppercase shrink-0 bg-[#FFD700] text-black shadow-[3px_3px_0px_#000] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:translate-x-0 disabled:translate-y-0 disabled:shadow-[3px_3px_0px_#000]">
                    {isBusy ? "…" : t('raffleBuy')}
                  </button>
                </div>
              </div>

              {/* BASE options */}
              <div className="border-2 border-black overflow-hidden">
                <div className="bg-[#0052FF] px-3 py-1.5 flex items-center justify-between">
                  <span className="text-white font-black text-[9px] uppercase tracking-widest">{t('raffleBaseMainnet')}</span>
                  <span className="text-white/60 text-[7px] font-bold uppercase tracking-wide">⏳ Syncs in ~2 min</span>
                </div>

                {/* VBMS */}
                <div className="flex items-center gap-2 px-3 py-2 border-b border-white/5">
                  <img src="/tokens/vbms.png" alt="VBMS" className="w-8 h-8 shrink-0 rounded-full object-cover border-2 border-black shadow-[1px_1px_0px_#000]" />
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-black text-xs leading-none">{vbmsPriceLabel}</p>
                    <p className="text-white/30 text-[8px]">{t('raffleBalance')} {fmtBal(vbmsBal as bigint | undefined, 18, "VBMS")}</p>
                  </div>
                  <button onClick={handleBuyVBMS} disabled={!walletAddress || isBusy}
                    className="border-2 border-black font-black text-xs px-4 py-2 uppercase shrink-0 bg-[#FFD700] text-black shadow-[3px_3px_0px_#000] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:translate-x-0 disabled:translate-y-0 disabled:shadow-[3px_3px_0px_#000]">
                    {vbmsNeedsApprove && !pendingApprove ? t('raffleApprove') : isBusy ? "…" : t('raffleBuy')}
                  </button>
                </div>

                {/* USDC */}
                <div className="flex items-center gap-2 px-3 py-2 border-b border-white/5">
                  <img src="/tokens/usdc.png" alt="USDC" className="w-8 h-8 shrink-0 rounded-full object-cover border-2 border-black shadow-[1px_1px_0px_#000]" />
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-black text-xs leading-none">{usdcPriceLabel}</p>
                    <p className="text-white/30 text-[8px]">{t('raffleBalance')} {fmtBal(usdcBal as bigint | undefined, 6, "USDC")}</p>
                  </div>
                  <button onClick={handleBuyUSDC} disabled={!walletAddress || isBusy}
                    className="border-2 border-black font-black text-xs px-4 py-2 uppercase shrink-0 bg-[#FFD700] text-black shadow-[3px_3px_0px_#000] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:translate-x-0 disabled:translate-y-0 disabled:shadow-[3px_3px_0px_#000]">
                    {usdcNeedsApprove && !pendingApprove ? t('raffleApprove') : isBusy ? "…" : t('raffleBuy')}
                  </button>
                </div>

                {/* ETH Base */}
                <div className="flex items-center gap-2 px-3 py-2">
                  <img src="/tokens/eth.png" alt="ETH" className="w-8 h-8 shrink-0 rounded-full object-cover border-2 border-black shadow-[1px_1px_0px_#000]" />
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-black text-xs leading-none">{ethPriceLabel}</p>
                    <p className="text-white/30 text-[8px]">{t('raffleBalance')} {fmtBal(baseEthBal?.value, 18, "ETH")}</p>
                  </div>
                  <button onClick={handleBuyETHBase} disabled={!walletAddress || isBusy}
                    className="border-2 border-black font-black text-xs px-4 py-2 uppercase shrink-0 bg-[#FFD700] text-black shadow-[3px_3px_0px_#000] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:translate-x-0 disabled:translate-y-0 disabled:shadow-[3px_3px_0px_#000]">
                    {isBusy ? "…" : t('raffleBuy')}
                  </button>
                </div>
              </div>

              {!walletAddress && (
                <div className="border-2 border-white/10 bg-white/5 px-3 py-2 text-center">
                  <p className="text-white/40 text-[9px] font-black uppercase tracking-wider">{t('raffleConnectWallet')}</p>
                </div>
              )}

              {/* Pending tx banner — bought but not yet synced to Convex */}
              {pendingTx && (
                <div className="border-2 border-[#FFD700]/50 bg-[#FFD700]/5 px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[#FFD700] text-xs animate-spin shrink-0">⏳</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[#FFD700] font-black text-[10px] uppercase tracking-wider">
                        {pendingTx.qty}🎟️ {pendingTx.token} · {t('raffleSyncing')}
                      </p>
                      <p className="text-white/40 text-[9px] mt-0.5 font-mono truncate">
                        <a
                          href={pendingTx.chain === "base" ? baseTxUrl(pendingTx.txHash) : arbTxUrl(pendingTx.txHash)}
                          target="_blank" rel="noopener noreferrer"
                          className="hover:text-white/70 transition-colors"
                        >
                          {pendingTx.txHash.slice(0, 10)}…{pendingTx.txHash.slice(-6)} ↗
                        </a>
                      </p>
                    </div>
                    <span className={`text-[7px] font-black px-1.5 py-0.5 border-2 border-black shrink-0 ${pendingTx.chain === "base" ? "bg-[#0052FF] text-white" : "bg-[#12AAFF] text-black"}`}>
                      {pendingTx.chain.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-white/30 text-[8px] mt-1.5">{t('raffleSyncHint')}</p>
                </div>
              )}

              {/* My Purchases — paginated, 2 items per page */}
              {walletAddress && (() => {
                const myBuys = recentEntries.filter(e => e.address.toLowerCase() === walletAddress.toLowerCase());
                const PAGE_SIZE = 2;
                const totalPages = Math.ceil(myBuys.length / PAGE_SIZE);
                const page = Math.min(myPurchasesPage, totalPages - 1);
                const visible = myBuys.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
                if (myBuys.length === 0) return null;
                return (
                <div className="border-2 border-[#FFD700]/30 overflow-hidden">
                  <div className="bg-[#FFD700]/10 border-b border-[#FFD700]/20 px-3 py-1 flex items-center justify-between">
                    <span className="text-[#FFD700] font-black text-[9px] uppercase tracking-widest">{t('raffleMyBuys')}</span>
                    {totalPages > 1 && (
                      <div className="flex items-center gap-1">
                        <button onClick={() => setMyPurchasesPage(p => Math.max(0, p - 1))} disabled={page === 0}
                          className="w-4 h-4 text-[#FFD700]/60 disabled:opacity-30 text-[10px] flex items-center justify-center">‹</button>
                        <span className="text-white/30 text-[8px]">{page + 1}/{totalPages}</span>
                        <button onClick={() => setMyPurchasesPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                          className="w-4 h-4 text-[#FFD700]/60 disabled:opacity-30 text-[10px] flex items-center justify-center">›</button>
                      </div>
                    )}
                  </div>
                  <div className="divide-y divide-white/5">
                    {visible
                      .map(e => (
                        <a
                          key={e.txHash}
                          href={e.chain === "base" ? baseTxUrl(e.txHash) : arbTxUrl(e.txHash)}
                          target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-2 px-3 py-2 hover:bg-white/5 transition-colors"
                        >
                          <span className={`text-[8px] font-black px-1.5 py-0.5 border-2 border-black shrink-0 ${e.chain === "base" ? "bg-[#0052FF] text-white" : "bg-[#12AAFF] text-black"}`}>
                            {e.chain.toUpperCase()}
                          </span>
                          <span className="text-white/30 text-[8px] font-black shrink-0 border border-white/10 px-1">{e.token}</span>
                          <span className="text-[#FFD700] font-black text-[10px] flex-1">{e.tickets}🎟️</span>
                          <span className="text-white/30 text-[8px] font-mono shrink-0">{timeAgo(e.timestamp, t)}</span>
                          <span className="text-blue-400/60 text-[8px] shrink-0">↗</span>
                        </a>
                      ))
                    }
                  </div>
                </div>
              );
            })()}

              <div className="h-1" />
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
              <div
                className="shrink-0 border-r-2 border-black flex items-center justify-center overflow-hidden relative p-2 cursor-pointer"
                style={{ width: 120, minHeight: 160, background: 'radial-gradient(ellipse at center, #2a2a3e 0%, #111 100%)' }}
                onClick={() => { setShowCardModal(true); }}
                title="Clique para ver a carta"
              >
                <img
                  src="/images/baccarat/queen%20diamonds%2C%20goofy%20romero.png"
                  alt="Goofy Romero"
                  className="object-contain drop-shadow-lg"
                  style={{ maxHeight: 144, maxWidth: 100, width: 'auto', height: 'auto' }}
                  onError={(e) => {
                    const el = e.currentTarget as HTMLImageElement;
                    el.style.display = "none";
                    el.parentElement!.innerHTML = '<div style="font-size:3rem;display:flex;align-items:center;justify-content:center;height:144px">🃏</div>';
                  }}
                />
                {/* Shine sweep effect */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: 'linear-gradient(105deg, transparent 30%, rgba(255,215,0,0.15) 50%, transparent 70%)',
                    animation: 'card-shine 2.8s ease-in-out infinite',
                  }}
                />
                <div className="absolute bottom-1 right-1 text-white/30 text-[8px] font-mono pointer-events-none">↗</div>
              </div>
              <div className="flex-1 p-4 flex flex-col justify-center gap-2">
                <span className="inline-block text-[8px] font-black uppercase tracking-widest text-[#FFD700] bg-[#FFD700]/10 border border-[#FFD700]/40 px-2 py-0.5 self-start">Legendary</span>
                <p className="text-[#FFD700] font-display font-black text-xl leading-tight">Goofy Romero</p>
                <p className="text-white/40 text-[10px] font-bold uppercase tracking-wider">Queen of Diamonds</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-white font-black text-lg">~$23</span>
                  <span className="text-white/30 text-[10px] font-mono">≈ 3.7M VBMS</span>
                </div>
                <p className="text-white/50 text-[9px] leading-tight mt-0.5">
                  {t('raffleVibeMarketHint').split('VibeMarket')[0]}
                  <a href="https://vibechain.com/market/vibe-most-wanted?ref=XCLR1DJ6LQTT" target="_blank" rel="noopener noreferrer" className="text-[#FFD700] underline underline-offset-2 hover:text-white transition-colors">VibeMarket</a>
                  {t('raffleVibeMarketHint').split('VibeMarket')[1]}
                </p>
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
                <div className="flex items-center h-7 gap-1">
                  <span className="font-black text-xl text-white leading-none">{totalTickets}</span>
                  {config?.maxTickets && <span className="text-white/30 font-bold text-[10px] leading-none">/{config.maxTickets >= 1000 ? `${config.maxTickets / 1000}k` : config.maxTickets}</span>}
                </div>
                <span className="text-white/40 text-[9px] uppercase font-bold">{t('raffleTicketsLabel')}</span>
              </div>
              <div className="flex flex-col items-center py-3 border-r-2 border-black">
                <div className="flex items-center h-7">
                  <span className="font-black text-sm text-[#FFD700] leading-none">
                    {totalVBMS >= 1_000_000 ? `${(totalVBMS / 1_000_000).toFixed(1)}M`
                      : totalVBMS >= 1_000 ? `${(totalVBMS / 1_000).toFixed(0)}k`
                      : totalVBMS.toString()}
                  </span>
                </div>
                <span className="text-white/40 text-[9px] uppercase font-bold">{t('raffleVbmsPool')}</span>
              </div>
              <div className="flex flex-col items-center py-3">
                <div className="flex items-center h-7">
                  {ended ? (
                    <span className="font-black text-base text-red-400 leading-none">{t('raffleEnded')}</span>
                  ) : endsAt ? (
                    <span className="font-mono font-black text-base text-[#FFD700] leading-none tabular-nums">
                      {d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}m` : `${m}m ${String(s).padStart(2,'0')}s`}
                    </span>
                  ) : (
                    <span className="font-mono font-black text-base text-white/30 leading-none">— —</span>
                  )}
                </div>
                <span className="text-white/40 text-[9px] uppercase font-bold">{t('raffleLeft')}</span>
              </div>
            </div>
            {/* Ticket progress bar */}
            {config?.maxTickets && (
              <div className="border-t-2 border-black bg-black/40 px-3 py-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-white/30 text-[8px] font-black uppercase tracking-widest">TICKET LIMIT</span>
                  <span className="text-white/50 text-[8px] font-mono">{totalTickets} / {config.maxTickets.toLocaleString()}</span>
                </div>
                <div className="h-2 bg-black/60 border border-black/60 overflow-hidden">
                  {(() => {
                    const pct = Math.min(100, (totalTickets / config.maxTickets) * 100);
                    const color = pct >= 90 ? '#ef4444' : pct >= 60 ? '#f97316' : '#FFD700';
                    return <div className="h-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />;
                  })()}
                </div>
              </div>
            )}
          </div>

          {/* Winner banner — shown when draw completed */}
          {raffleResult && (
            <div className="border-2 border-[#FFD700] bg-[#1a1a1a] shadow-[4px_4px_0px_#FFD700] overflow-hidden">
              <div className="bg-[#FFD700] px-3 py-2 text-center">
                <span className="text-black font-black text-xs uppercase tracking-widest">🏆 Winner</span>
              </div>
              <div className="px-3 py-3 space-y-2">
                {/* Name + wallet */}
                <div className="text-center">
                  <p className="text-[#FFD700] font-black text-lg leading-tight">
                    {(raffleResult as any).username ? `@${(raffleResult as any).username}` : `${(raffleResult as any).winner.slice(0,6)}…${(raffleResult as any).winner.slice(-4)}`}
                  </p>
                  <p className="text-white/30 font-mono text-[9px] mt-0.5">{(raffleResult as any).winner}</p>
                </div>
                {/* Ticket + method */}
                <div className="flex items-center justify-center gap-3 pt-1">
                  <div className="text-center">
                    <p className="text-white font-black text-sm">#{(raffleResult as any).winnerTicket}</p>
                    <p className="text-white/40 text-[8px] uppercase">ticket</p>
                  </div>
                  <div className="w-px h-8 bg-white/10" />
                  <div className="text-center">
                    <p className="text-white font-black text-sm">
                      {entries.find((e: any) => e.address === (raffleResult as any).winner)?.tickets ?? (raffleResult as any).totalEntries}
                    </p>
                    <p className="text-white/40 text-[8px] uppercase">tickets</p>
                  </div>
                  {(raffleResult as any).winnerChain && (
                    <>
                      <div className="w-px h-8 bg-white/10" />
                      <div className="text-center">
                        <span className={`text-[9px] font-black px-1.5 py-0.5 border-2 border-black ${(raffleResult as any).winnerChain === "base" ? "bg-[#0052FF] text-white" : "bg-[#12AAFF] text-black"}`}>
                          {((raffleResult as any).winnerChain as string).toUpperCase()}
                        </span>
                        <p className="text-white/40 text-[8px] uppercase mt-0.5">{(raffleResult as any).winnerToken}</p>
                      </div>
                    </>
                  )}
                </div>
                {(raffleResult as any).drawTxHash && (
                  <div className="text-center pt-1">
                    <a
                      href={`https://arbiscan.io/tx/${(raffleResult as any).drawTxHash}`}
                      target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-blue-400/70 text-[9px] font-mono hover:text-blue-400 transition-colors"
                    >
                      VRF TX ↗
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Awaiting draw banner — ended but no winner yet */}
          {ended && !raffleResult && (
            <div className="border-2 border-white/20 bg-[#1a1a1a] px-3 py-3 text-center">
              <p className="text-white/60 font-black text-xs uppercase tracking-widest animate-pulse">⏳ {t('raffleDrawing')}</p>
              <p className="text-white/30 text-[10px] mt-1">Chainlink VRF · Arbitrum One</p>
            </div>
          )}

          {/* Buy button */}
          {isRaffleActive && !ended ? (
            <button
              onClick={() => { setShowBuy(true); resetStatus(); }}
              className="w-full border-2 border-black bg-[#FFD700] text-black font-black text-sm uppercase tracking-widest py-3.5 shadow-[4px_4px_0px_#000] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] transition-all"
            >
              🎟️ {t('raffleBuyTickets')}
            </button>
          ) : ended ? null : raffleActive === false ? (
            <div className="w-full border-2 border-black bg-[#333] text-white/40 font-black text-sm uppercase tracking-widest py-3.5 text-center shadow-[4px_4px_0px_#555]">
              {t('raffleNotActive')}
            </div>
          ) : (
            <div className="w-full border-2 border-black bg-[#222] text-white/20 font-black text-sm uppercase tracking-widest py-3.5 text-center animate-pulse">
              🎟️ {t('raffleBuyTickets')}…
            </div>
          )}

          {/* Recent Activity Feed */}
          {recentEntries.length > 0 && (
            <div className="border-2 border-black bg-[#1a1a1a] shadow-[4px_4px_0px_#000] overflow-hidden">
              <div className="bg-black border-b-2 border-black px-3 py-2 flex items-center justify-between">
                <span className="text-[#FFD700] font-black text-[10px] uppercase tracking-widest">{t('raffleRecentActivity')}</span>
                <span className="text-white/20 font-mono text-[8px]">{t('raffleLast')} {recentEntries.length}</span>
              </div>
              <div className="divide-y divide-black/40 max-h-52 overflow-y-auto">
                {recentEntries.map((e) => (
                  <div key={e.txHash} className="flex items-center gap-2 px-3 py-2">
                    <span className={`text-[8px] font-black px-1.5 py-0.5 border-2 border-black shrink-0 ${e.chain === "base" ? "bg-[#0052FF] text-white" : "bg-[#12AAFF] text-black"}`}>
                      {e.chain.toUpperCase()}
                    </span>
                    <span className="text-white/30 text-[8px] font-black shrink-0 border border-white/10 px-1">{e.token}</span>
                    <a
                      href={e.chain === "base" ? baseTxUrl(e.txHash) : arbTxUrl(e.txHash)}
                      target="_blank" rel="noopener noreferrer"
                      className="flex-1 min-w-0 truncate hover:underline"
                    >
                      <span className="font-bold text-[10px] text-white/80">
                        {e.username ? `@${e.username}` : fmtAddr(e.address)}
                      </span>
                    </a>
                    <span className="text-[#FFD700] font-black text-[10px] shrink-0">{e.tickets}🎟️</span>
                    <span className="text-white/30 text-[8px] font-mono shrink-0">{timeAgo(e.timestamp, t)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}


          {/* My Tickets */}
          {walletAddress && ((playerInfo && playerInfo.playerTotal > 0) || pendingTxList.length > 0) && (
            <div className="border-2 border-black bg-[#1a1a1a] shadow-[4px_4px_0px_#FFD700] overflow-hidden">
              <div className="bg-[#FFD700] border-b-2 border-black px-3 py-2 flex items-center justify-between">
                <span className="text-black font-black text-[10px] uppercase tracking-widest">🎟️ {t('raffleMine')}</span>
                <span className="text-black font-black text-sm">
                  {(playerInfo?.playerTotal ?? 0) + pendingTxList.reduce((s, p) => s + p.qty, 0)} {t('raffleTicketsLabel')}
                </span>
              </div>
              <div className="px-3 py-3 space-y-2">
                {playerInfo && playerInfo.playerRanges.map((r, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className={`text-[8px] font-black px-1.5 py-0.5 border-2 border-black shrink-0 ${r.chain === "base" ? "bg-[#0052FF] text-white" : "bg-[#12AAFF] text-black"}`}>
                      {r.chain.toUpperCase()} · {r.token}
                    </span>
                    <div className="flex flex-wrap gap-1 flex-1">
                      {Array.from({ length: r.end - r.start + 1 }, (_, k) => r.start + k).map(n => (
                        <span key={n} className="bg-[#FFD700] text-black font-black text-[10px] px-2 py-0.5 border-2 border-black shadow-[1px_1px_0_#000]">
                          #{n}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
                {/* Pending txs — bought but not yet synced */}
                {pendingTxList.map(p => (
                  <div key={p.txHash} className="flex items-center gap-2">
                    <span className={`text-[8px] font-black px-1.5 py-0.5 border-2 border-black shrink-0 ${p.chain === "base" ? "bg-[#0052FF] text-white" : "bg-[#12AAFF] text-black"}`}>
                      {p.chain.toUpperCase()} · {p.token}
                    </span>
                    <span className="text-[#FFD700]/60 font-black text-[10px] animate-pulse">
                      {p.qty}🎟️ {t('raffleSyncing')}…
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Participants */}
          {entries.length > 0 && (
            <div className="border-2 border-black bg-[#1a1a1a] shadow-[4px_4px_0px_#000] overflow-hidden">
              <div className="bg-[#FFD700] border-b-2 border-black px-3 py-2 flex items-center justify-between">
                <span className="text-black font-black text-[10px] uppercase tracking-widest">{t('raffleParticipants')}</span>
                <span className="text-black/60 font-bold text-[9px]">{entries.length} {t('raffleWallets')}</span>
              </div>
              <div className="divide-y divide-black/40 max-h-48 overflow-y-auto">
                {entries.map((e, i) => (
                  <div key={e.address} className="flex items-center gap-2 px-3 py-2">
                    <span className="text-white/30 font-mono text-[9px] w-4 text-right shrink-0">{i + 1}</span>
                    <span className="flex-1 font-mono text-[10px] text-white/70 truncate">
                      {e.username ? `@${e.username}` : fmtAddr(e.address)}
                    </span>
                    <span className="text-[#FFD700] font-black text-[10px] shrink-0">{e.tickets}🎟️</span>
                    <div className="flex gap-0.5 shrink-0">
                      {((e as any).chains?.length > 0 ? (e as any).chains : [e.chain]).map((c: string) => (
                        <span key={c} className={`text-[8px] font-black px-1.5 py-0.5 border-2 border-black ${c === "base" ? "bg-[#0052FF] text-white" : "bg-[#12AAFF] text-black"}`}>
                          {c.toUpperCase()}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* VRF */}
          <div className="border-2 border-black bg-[#1a1a1a] shadow-[4px_4px_0px_#000] overflow-hidden">
            <div className="bg-black border-b-2 border-black px-3 py-2">
              <span className="text-[#FFD700] font-black text-[10px] uppercase tracking-widest">{t('raffleVerifiableFairness')}</span>
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
