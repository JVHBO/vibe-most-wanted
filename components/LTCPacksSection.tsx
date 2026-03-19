"use client";

/**
 * VMW LTC Section — Vibe Most Wanted on-chain packs (vibe.market)
 * - Buy: mint NFT packs with ETH
 * - Open: reveal cards on-chain via Pyth VRF
 * - Burn: sell opened cards for VBMS or ETH
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useReadContract, useAccount } from "wagmi";
import { useWriteContractWithAttribution } from "@/lib/hooks/useWriteContractWithAttribution";
import { formatEther } from "viem";
import { base } from "viem/chains";
import { toast } from "sonner";
import sdk from "@farcaster/miniapp-sdk";
import { createPublicClient, http } from "viem";
import { getVbmsBaccaratImageUrlByTokenId, getVbmsBaccaratImageUrl } from "@/lib/tcg/images";
import FoilCardEffect from "@/components/FoilCardEffect";
import { shareToFarcaster } from "@/lib/share-utils";
import { FarcasterIcon } from "@/components/PokerIcons";

// ── Contracts ─────────────────────────────────────────────────────────────────
const VMW_DROP = "0xf14c1dc8ce5fe65413379f76c43fa1460c31e728" as `0x${string}`;
const VMW_TOKEN = "0xb03439567cd22f278b21e1ffcdfb8e1696763827" as `0x${string}`;
const ZERO = "0x0000000000000000000000000000000000000000" as `0x${string}`;

// ── ABIs ──────────────────────────────────────────────────────────────────────
const DROP_ABI = [
  { name: "getMintPrice", type: "function", inputs: [{ name: "amount", type: "uint256" }], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { name: "getEntropyFee", type: "function", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { name: "getTokenRarity", type: "function", inputs: [{ name: "tokenId", type: "uint256" }], outputs: [{ type: "tuple", components: [{ name: "rarity", type: "uint8" }, { name: "randomValue", type: "uint256" }, { name: "tokenSpecificRandomness", type: "uint256" }] }], stateMutability: "view" },
  { name: "COMMON_OFFER", type: "function", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { name: "RARE_OFFER", type: "function", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { name: "EPIC_OFFER", type: "function", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { name: "LEGENDARY_OFFER", type: "function", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { name: "MYTHIC_OFFER", type: "function", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { name: "mint", type: "function", inputs: [{ name: "amount", type: "uint256" }, { name: "recipient", type: "address" }, { name: "referrer", type: "address" }, { name: "originReferrer", type: "address" }], outputs: [], stateMutability: "payable" },
  { name: "open", type: "function", inputs: [{ name: "tokenIds", type: "uint256[]" }], outputs: [], stateMutability: "payable" },
  { name: "sellAndClaimOffer", type: "function", inputs: [{ name: "tokenId", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
] as const;

const TOKEN_ABI = [
  { name: "getTokenSellQuote", type: "function", inputs: [{ name: "tokenAmount", type: "uint256" }], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { name: "sell", type: "function", inputs: [{ name: "tokensToSell", type: "uint256" }, { name: "recipient", type: "address" }, { name: "minPayoutSize", type: "uint256" }, { name: "referrer", type: "address" }, { name: "originReferrer", type: "address" }], outputs: [{ type: "uint256" }], stateMutability: "nonpayable" },
  { name: "balanceOf", type: "function", inputs: [{ name: "account", type: "address" }], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { name: "approve", type: "function", inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ type: "bool" }], stateMutability: "nonpayable" },
] as const;

// ── Rarity helpers ────────────────────────────────────────────────────────────
const RARITY_NAMES = ["Common", "Rare", "Epic", "Legendary", "Mythic"] as const;
const RARITY_COLORS = [
  "text-vintage-ice",
  "text-blue-400",
  "text-purple-400",
  "text-yellow-400",
  "text-pink-400",
] as const;
const RARITY_BG = [
  "border-white/20 bg-white/5",
  "border-blue-400/40 bg-blue-400/10",
  "border-purple-400/40 bg-purple-400/10",
  "border-yellow-400/40 bg-yellow-400/10",
  "border-pink-400/40 bg-pink-400/10",
] as const;
const PACK_IMAGE = "https://vibechain.com/api/proxy?url=https%3A%2F%2Fimagedelivery.net%2Fg4iQ0bIzMZrjFMgjAnSGfw%2F54f04f3d-8d29-420e-aaeb-ba6b17e45e00%2Fpublic";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Box { tokenId: string; isRevealed: boolean; imageUrl?: string; rarity?: number }
interface RevealedCard { tokenId: string; rarity: number; imageUrl?: string; name?: string; foil?: string }

// ── Hook: owned boxes ─────────────────────────────────────────────────────────
function useOwnedBoxes(address: string | undefined) {
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(() => {
    if (!address) return;
    setLoading(true);
    fetch(`/api/vibemarket/owned?address=${address.toLowerCase()}&contractAddress=${VMW_DROP}`)
      .then((r) => r.json())
      .then((d) => {
        console.log('[VMW packs]', d);
        const rawBoxes = d.boxes ?? d.boosterboxes ?? d.data?.boxes ?? d.data?.boosterboxes;
        if (Array.isArray(rawBoxes)) {
          const RNAME: Record<string, number> = { COMMON: 0, RARE: 1, EPIC: 2, LEGENDARY: 3, MYTHIC: 4 };
          setBoxes(rawBoxes.map((b: any) => ({
            tokenId: String(b.tokenId ?? b.id ?? ""),
            isRevealed: b.rarityName && b.rarityName !== "NOT_ASSIGNED",
            imageUrl: b.imageUrl || b.image,
            rarity: RNAME[b.rarityName] ?? 0,
          })));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [address]);

  useEffect(() => { refresh(); }, [refresh]);

  const unopened = boxes.filter((b) => !b.isRevealed && b.tokenId);
  const opened = boxes.filter((b) => b.isRevealed && b.tokenId);

  return { boxes, unopened, opened, loading, refresh };
}

// ── Offer amounts hook ────────────────────────────────────────────────────────
function useOfferAmounts() {
  const { data: common } = useReadContract({ address: VMW_DROP, abi: DROP_ABI, functionName: "COMMON_OFFER", chainId: base.id, query: { staleTime: 300_000 } });
  const { data: rare } = useReadContract({ address: VMW_DROP, abi: DROP_ABI, functionName: "RARE_OFFER", chainId: base.id, query: { staleTime: 300_000 } });
  const { data: epic } = useReadContract({ address: VMW_DROP, abi: DROP_ABI, functionName: "EPIC_OFFER", chainId: base.id, query: { staleTime: 300_000 } });
  const { data: legendary } = useReadContract({ address: VMW_DROP, abi: DROP_ABI, functionName: "LEGENDARY_OFFER", chainId: base.id, query: { staleTime: 300_000 } });
  const { data: mythic } = useReadContract({ address: VMW_DROP, abi: DROP_ABI, functionName: "MYTHIC_OFFER", chainId: base.id, query: { staleTime: 300_000 } });
  return [common, rare, epic, legendary, mythic] as (bigint | undefined)[];
}

// ── Buy Card (Slide 2 of carousel) ───────────────────────────────────────────
export function VMWPackCard({ address, onMintSuccess }: { address: string | undefined; onMintSuccess?: (qty: number) => void }) {
  const [qty, setQty] = useState(1);
  const [minting, setMinting] = useState(false);
  const { chainId } = useAccount();
  const { writeContractAsync } = useWriteContractWithAttribution();

  const { data: priceData } = useReadContract({
    address: VMW_DROP, abi: DROP_ABI, functionName: "getMintPrice",
    args: [BigInt(qty)], chainId: base.id, query: { staleTime: 30_000 },
  });
  const priceWei = priceData as bigint | undefined;
  const priceEth = priceWei ? parseFloat(formatEther(priceWei)).toFixed(4) : null;
  const [priceUsd, setPriceUsd] = useState<string | null>(null);
  useEffect(() => {
    if (!priceEth) return;
    fetch(`https://build.wield.xyz/utils/eth-to-usd?eth=${priceEth}`)
      .then(r => r.json())
      .then(d => setPriceUsd((d.usd || d.price || 0).toFixed(2)))
      .catch(() => {});
  }, [priceEth]);

  const handleMint = async () => {
    if (!address || !priceWei) return;
    if (chainId !== base.id) { toast.error("Switch to Base to mint"); return; }
    setMinting(true);
    try {
      await writeContractAsync({
        address: VMW_DROP, abi: DROP_ABI, functionName: "mint",
        args: [BigInt(qty), address as `0x${string}`, ZERO, ZERO],
        value: priceWei, chainId: base.id,
      });
      toast.success(`Minted ${qty} pack${qty > 1 ? "s" : ""}! ✅`);
      onMintSuccess?.(qty);
    } catch (e: any) {
      toast.error((e?.shortMessage || e?.message || "Mint failed").slice(0, 80));
    } finally { setMinting(false); }
  };

  return (
    <div className="bg-vintage-charcoal/50 border border-vintage-gold/30 rounded-xl p-4 shadow-xl h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-4 mb-3">
        <img src={PACK_IMAGE} alt="VMW Pack" className="w-16 h-16 object-contain drop-shadow-[4px_4px_0px_rgba(0,0,0,1)]" loading="lazy" />
        <div className="flex-1">
          <h3 className="text-xl font-display font-bold text-vintage-gold">Vibe Most Wanted Packs</h3>
          <p className="text-vintage-ice/60 text-xs">1 LTC card per pack · NFT on Base</p>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ padding: "4px 10px", borderRadius: "999px", fontSize: "11px", fontWeight: 700, background: "#D4A843", color: "#000" }}>
            {priceEth ? `${priceEth} ETH` : "…"}
          </div>
          {priceUsd && <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)", marginTop: "2px" }}>${priceUsd}</div>}
        </div>
      </div>

      {/* Info */}
      <div className="bg-green-500/10 border border-green-500/30 rounded-lg px-3 py-2 mb-3">
        <p className="text-green-300/80 text-xs text-center">Real NFTs · 2× power vs Nothing cards · Mythic tier</p>
      </div>

      {/* Vibechain disclaimer */}
      <div className="bg-blue-500/10 border border-blue-400/20 rounded-lg px-3 py-1.5 mb-3">
        <p className="text-blue-300/60 text-[10px] text-center">⚡ Drop rates, rarity & pricing powered by <span className="font-bold text-blue-300/80">vibe.market</span> · Same cards as in-game</p>
      </div>

      {/* Drop Rates */}
      <div className="bg-vintage-black/30 border border-vintage-gold/20 rounded-lg p-2 mb-3 text-xs">
        <div className="grid grid-cols-5 gap-1 text-center">
          <div><span className="text-vintage-ice/50 block">Common</span><span className="text-vintage-ice font-bold">66%</span></div>
          <div><span className="text-blue-400/70 block">Rare</span><span className="text-blue-400 font-bold">24%</span></div>
          <div><span className="text-purple-400/70 block">Epic</span><span className="text-purple-400 font-bold">9%</span></div>
          <div><span className="text-yellow-400/70 block">Legend</span><span className="text-yellow-400 font-bold">0.45%</span></div>
          <div><span className="text-pink-400/70 block">Mythic</span><span className="text-pink-400 font-bold">0.02%</span></div>
        </div>
      </div>

      {/* Qty */}
      <div className="flex items-center justify-center gap-2 mb-3">
        <span className="text-vintage-ice/50 text-xs">Qty:</span>
        {[1, 5, 10].map((q) => (
          <button key={q} onClick={() => setQty(q)}
            className={`text-xs font-bold px-3 py-1 rounded transition-all ${qty === q ? "bg-vintage-gold text-vintage-black" : "bg-white/10 text-white/60 hover:bg-white/20"}`}>
            {q}
          </button>
        ))}
      </div>

      {/* Buy button */}
      <div className="mt-auto">
        <button onClick={handleMint} disabled={minting || !priceWei || !address}
          className="shop-claim-btn w-full h-11 font-display font-bold rounded transition-all disabled:opacity-50 text-vintage-black active:translate-y-[4px] bg-vintage-gold bg-gradient-to-b from-vintage-gold to-vintage-burnt-gold hover:from-yellow-400 hover:to-amber-500">
          {minting ? "Minting…" : `Buy ${qty > 1 ? qty + "× " : ""}Pack`}
        </button>
      </div>
    </div>
  );
}

// ── Open Modal ────────────────────────────────────────────────────────────────
function OpenModal({ address, onClose, onRevealed, preSelectedIds }: {
  address: string;
  onClose: () => void;
  onRevealed: (cards: RevealedCard[]) => void;
  preSelectedIds?: string[];
}) {
  const { unopened, loading, refresh } = useOwnedBoxes(address);
  const [selected, setSelected] = useState<Set<string>>(new Set(preSelectedIds ?? []));
  const [opening, setOpening] = useState(false);
  const [phase, setPhase] = useState<"select" | "waiting" | "done">("select");
  const [dots, setDots] = useState(".");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 5;
  const { writeContractAsync } = useWriteContractWithAttribution();
  const { chainId } = useAccount();

  const { data: entropyFeeData } = useReadContract({
    address: VMW_DROP, abi: DROP_ABI, functionName: "getEntropyFee",
    chainId: base.id, query: { staleTime: 60_000 },
  });
  const entropyFee = entropyFeeData as bigint | undefined;

  // Animated dots
  useEffect(() => {
    if (phase !== "waiting") return;
    const t = setInterval(() => setDots((d) => d.length >= 3 ? "." : d + "."), 600);
    return () => clearInterval(t);
  }, [phase]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleOpen = async () => {
    if (!entropyFee || selected.size === 0) return;
    if (chainId !== base.id) { toast.error("Switch to Base"); return; }
    setOpening(true);
    setPhase("waiting");
    const ids = [...selected].map(BigInt);

    try {
      const totalFee = entropyFee * BigInt(ids.length);
      await writeContractAsync({
        address: VMW_DROP, abi: DROP_ABI, functionName: "open",
        args: [ids], value: totalFee, chainId: base.id,
      });

      // Poll for rarity revelation (up to 2 min, every 4s)
      const publicClient = createPublicClient({ chain: base, transport: http() });
      const revealed: RevealedCard[] = [];
      const deadline = Date.now() + 120_000;

      for (const id of ids) {
        let found = false;
        while (Date.now() < deadline && !found) {
          await new Promise((r) => setTimeout(r, 4000));
          try {
            const rarity = await publicClient.readContract({
              address: VMW_DROP, abi: DROP_ABI, functionName: "getTokenRarity",
              args: [id],
            }) as { rarity: number; randomValue: bigint };
            if (rarity.randomValue > 0n) {
              revealed.push({ tokenId: String(id), rarity: rarity.rarity });
              found = true;
            }
          } catch {}
        }
        if (!found) revealed.push({ tokenId: String(id), rarity: 0 }); // fallback
      }

      setPhase("done");
      refresh();
      onRevealed(revealed);
      onClose();
    } catch (e: any) {
      toast.error((e?.shortMessage || e?.message || "Open failed").slice(0, 80));
      setPhase("select");
    } finally {
      setOpening(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center" style={{ padding: '56px 16px 64px' }} onClick={onClose}>
      <div className="bg-vintage-charcoal border border-vintage-gold/50 rounded-2xl w-full max-w-sm p-4 flex flex-col overflow-hidden" style={{ maxHeight: '100%' }}
        onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-display font-bold text-vintage-gold">Open VMW Packs</h3>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-[#CC2222] hover:bg-[#AA1111] text-white font-black flex items-center justify-center text-sm active:scale-95 transition-all">×</button>
        </div>

        {phase === "waiting" ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 py-8">
            <div className="w-20 h-20 animate-spin rounded-full border-4 border-vintage-gold/30 border-t-vintage-gold" />
            <p className="text-vintage-gold font-bold">Opening{dots}</p>
            <p className="text-vintage-ice/50 text-xs text-center">Waiting for Pyth VRF randomness<br />This may take up to 30 seconds</p>
          </div>
        ) : (
          <>
            {loading ? (
              <p className="text-vintage-ice/50 text-center py-8">Loading packs…</p>
            ) : unopened.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-vintage-ice/50">No unopened packs</p>
                <p className="text-vintage-ice/30 text-xs mt-1">Buy packs first</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-vintage-ice/60 text-xs">{unopened.length} pack{unopened.length !== 1 ? "s" : ""} · {selected.size} selected</p>
                  {Math.ceil(unopened.length / PAGE_SIZE) > 1 && (
                    <div className="flex items-center gap-1">
                      <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                        className="w-7 h-7 rounded-lg bg-vintage-gold/20 border border-vintage-gold/50 text-vintage-gold disabled:opacity-30 text-base font-bold flex items-center justify-center active:scale-90 transition-all">‹</button>
                      <span className="text-xs text-vintage-gold font-bold px-1">{page + 1}/{Math.ceil(unopened.length / PAGE_SIZE)}</span>
                      <button onClick={() => setPage(p => Math.min(Math.ceil(unopened.length / PAGE_SIZE) - 1, p + 1))} disabled={page >= Math.ceil(unopened.length / PAGE_SIZE) - 1}
                        className="w-7 h-7 rounded-lg bg-vintage-gold/20 border border-vintage-gold/50 text-vintage-gold disabled:opacity-30 text-base font-bold flex items-center justify-center active:scale-90 transition-all">›</button>
                    </div>
                  )}
                </div>
                <div className="flex-1 overflow-y-auto space-y-2 mb-4">
                  {unopened.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map((box) => (
                    <button key={box.tokenId} onClick={() => toggleSelect(box.tokenId)}
                      className={`w-full flex items-center gap-3 p-2 rounded-xl border transition-all ${selected.has(box.tokenId) ? "border-vintage-gold bg-vintage-gold/10" : "border-white/10 bg-white/5 hover:border-white/20"}`}>
                      <img src={PACK_IMAGE} alt="Pack" className="w-8 h-8 object-contain" />
                      <div className="text-left">
                        <p className="text-sm font-bold text-white">VMW #{box.tokenId}</p>
                        <p className="text-xs text-vintage-ice/40">Unopened pack</p>
                      </div>
                      <div className={`ml-auto w-5 h-5 rounded-full border-2 flex items-center justify-center ${selected.has(box.tokenId) ? "border-vintage-gold bg-vintage-gold" : "border-white/30"}`}>
                        {selected.has(box.tokenId) && <span className="text-black text-xs font-black">✓</span>}
                      </div>
                    </button>
                  ))}
                </div>

                <div className="space-y-2">
                  <button onClick={() => setSelected(new Set(unopened.map((b) => b.tokenId)))}
                    className="w-full py-2 text-xs font-bold text-black bg-vintage-gold/80 hover:bg-vintage-gold rounded-lg transition-all active:scale-95">
                    Select All ({unopened.length})
                  </button>
                  <button onClick={handleOpen} disabled={selected.size === 0 || !entropyFee}
                    className="w-full py-3 font-black text-sm uppercase tracking-widest bg-[#FFD400] hover:bg-[#ECC200] text-black rounded-xl disabled:opacity-40 active:scale-95 transition-all shadow-[0_4px_0px_#000]">
                    Open {selected.size > 0 ? `${selected.size} ` : ""}Pack{selected.size !== 1 ? "s" : ""}
                    {entropyFee && selected.size > 0 ? ` · ${parseFloat(formatEther(entropyFee * BigInt(selected.size))).toFixed(5)} ETH` : ""}
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Revealed Cards Animation ──────────────────────────────────────────────────
type CardMeta = { image: string; cdnImage?: string; name?: string; foil?: string };

function RevealedCardsModal({ cards, onClose }: { cards: RevealedCard[]; onClose: () => void }) {
  const [flipped, setFlipped] = useState<Set<number>>(new Set());
  const [shakingCard, setShakingCard] = useState<number | null>(null);
  const [meta, setMeta] = useState<Record<string, CardMeta>>({});

  const playSound = (src: string) => {
    try { const a = new Audio(src); a.volume = 0.6; a.play().catch(() => {}); } catch {}
  };

  useEffect(() => {
    cards.forEach(card => {
      // 1. Try local baccarat image by tokenId immediately (no API call)
      const localByTokenId = getVbmsBaccaratImageUrlByTokenId(card.tokenId);
      if (localByTokenId) {
        setMeta(prev => ({ ...prev, [card.tokenId]: { image: localByTokenId } }));
      }
      // 2. Fetch metadata for name, foil, and better image resolution
      fetch(`https://build.wield.xyz/vibe/boosterbox/metadata/vibe-most-wanted/${card.tokenId}`)
        .then(r => r.json())
        .then(d => {
          const attrs: any[] = d.attributes || [];
          const get = (t: string) => attrs.find((a: any) => a.trait_type === t)?.value;
          const charName = get("name") || get("Name");
          const foil = get("Foil");
          const localByName = charName ? getVbmsBaccaratImageUrl(charName) : null;
          setMeta(prev => ({ ...prev, [card.tokenId]: {
            image: localByName || localByTokenId || d.image,
            cdnImage: d.image,
            name: charName,
            foil,
          }}));
        })
        .catch(() => {});
    });
  }, [cards]);

  const flip = (i: number) => {
    if (flipped.has(i) || shakingCard !== null) return;
    setShakingCard(i);
    playSound('/sounds/espera.mp3');
    setTimeout(() => {
      const rarity = RARITY_NAMES[cards[i]?.rarity] || "Common";
      const sounds: Record<string, string> = {
        Mythic: '/sounds/legendary-pull.mp3',
        Legendary: '/sounds/legendary-pull.mp3',
        Epic: '/sounds/epic-pull.mp3',
        Rare: '/sounds/rare-pull.mp3',
        Common: '/sounds/common-pull.mp3',
      };
      playSound(sounds[rarity] || sounds.Common);
      setFlipped((p) => { const n = new Set(p); n.add(i); return n; });
      setShakingCard(null);
    }, 1800);
  };
  const flipAll = () => {
    cards.forEach((_, i) => {
      if (!flipped.has(i)) {
        setTimeout(() => {
          const rarity = RARITY_NAMES[cards[i]?.rarity] || "Common";
          const sounds: Record<string, string> = { Mythic: '/sounds/legendary-pull.mp3', Legendary: '/sounds/legendary-pull.mp3', Epic: '/sounds/epic-pull.mp3', Rare: '/sounds/rare-pull.mp3', Common: '/sounds/common-pull.mp3' };
          playSound(sounds[rarity] || sounds.Common);
          setFlipped((p) => { const n = new Set(p); n.add(i); return n; });
        }, i * 400);
      }
    });
  };
  const allFlipped = flipped.size === cards.length;

  const doShare = () => {
    const card = cards[0];
    const m = meta[card?.tokenId];
    const name = m?.name || "";
    const rarity = RARITY_NAMES[card?.rarity] || "Common";
    const foilLabel = m?.foil && m.foil !== "None" ? `${m.foil} Foil ` : "";
    const text = [
      `🎴 Just pulled a ${foilLabel}${rarity}${name ? ` ${name}` : ""}!`,
      `Token #${card?.tokenId} · Vibe Most Wanted`,
      cards.length > 1 ? `(+${cards.length - 1} more cards)` : "",
    ].filter(Boolean).join("\n");
    // Build share URL passing card details for dynamic OG image
    const params = new URLSearchParams();
    params.set("rarity", rarity.toLowerCase());
    if (name) params.set("name", name);
    if (m?.foil && m.foil !== "None") params.set("foil", m.foil);
    if (card?.tokenId) params.set("tokenId", card.tokenId);
    // Pass card image — baccarat local path or CDN URL
    const imgToShare = m?.image || m?.cdnImage;
    if (imgToShare) params.set("cardImg", imgToShare);
    const shareUrl = `https://vibemostwanted.xyz/share/pack?${params.toString()}`;
    shareToFarcaster(text, shareUrl);
  };

  // Card size: bigger when single card, smaller for multiple
  const cardW = cards.length === 1 ? 160 : 120;
  const cardH = Math.round(cardW * 1.4);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.92)", padding: "56px 16px 64px" }}>
      <div className="w-full max-w-sm bg-[#111] rounded-2xl border border-vintage-gold/30 flex flex-col overflow-hidden" style={{ maxHeight: "100%" }}>

        {/* Handle + header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3">
          <div>
            <h3 className="text-base font-display font-bold text-vintage-gold">Cards Revealed! 🎴</h3>
            {!allFlipped && <p className="text-white/30 text-xs">Tap to flip</p>}
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#CC2222] flex items-center justify-center text-white font-black text-lg leading-none active:scale-90 transition-all">×</button>
        </div>

        {/* Cards area */}
        <div className="flex-1 overflow-y-auto flex flex-wrap gap-3 justify-center items-center content-center px-4 py-3 min-h-0">
          {cards.map((card, i) => {
            const m = meta[card.tokenId];
            const foilType: 'Prize' | 'Standard' | null = m?.foil === "Prize" ? "Prize" : (m?.foil && m.foil !== "None") ? "Standard" : null;
            const isFlipped = flipped.has(i);
            return (
              <div key={i} onClick={() => flip(i)} className={`cursor-pointer select-none flex-shrink-0 ${shakingCard === i ? 'card-shaking' : ''}`} style={{ perspective: 800 }}>
                <div style={{
                  transition: "transform 0.55s cubic-bezier(0.4,0,0.2,1)",
                  transformStyle: "preserve-3d",
                  transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
                  width: cardW, height: cardH, position: "relative",
                }}>
                  {/* Front — pack */}
                  <div style={{ backfaceVisibility: "hidden", position: "absolute", inset: 0 }}
                    className="rounded-2xl bg-[#1A1A1A] border border-vintage-gold/20 flex flex-col items-center justify-center gap-2 shadow-xl">
                    <img src={PACK_IMAGE} alt="pack" className="w-3/4 h-3/4 object-contain" />
                    <span className="text-[10px] text-white/30 font-mono">#{card.tokenId}</span>
                  </div>
                  {/* Back — card */}
                  <div style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)", position: "absolute", inset: 0 }}
                    className={`rounded-2xl border-2 overflow-hidden shadow-xl ${RARITY_BG[card.rarity] ?? RARITY_BG[0]}`}>
                    {m?.image
                      ? <FoilCardEffect foilType={foilType} className="w-full h-full">
                          <img src={m.image} alt="card" className="w-full h-full object-cover"
                            onError={(e) => { if (m.cdnImage) (e.target as HTMLImageElement).src = m.cdnImage; }} />
                        </FoilCardEffect>
                      : <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-2">
                          <span className={`text-base font-black ${RARITY_COLORS[card.rarity] ?? RARITY_COLORS[0]}`}>{RARITY_NAMES[card.rarity] ?? "Common"}</span>
                          <span className="text-[10px] text-white/30">#{card.tokenId}</span>
                        </div>
                    }
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 to-transparent pt-6 pb-1.5 px-1.5 text-center">
                      <span className={`text-[10px] font-black uppercase tracking-wider ${RARITY_COLORS[card.rarity] ?? RARITY_COLORS[0]}`}>{RARITY_NAMES[card.rarity] ?? "Common"}</span>
                      {m?.name && <span className="block text-[9px] text-white/60 capitalize mt-0.5">{m.name}</span>}
                      {foilType && <span className="block text-[8px] text-yellow-300 font-bold mt-0.5">✨ {foilType === "Prize" ? "PRIZE FOIL" : "FOIL"}</span>}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div className="px-4 pb-6 pt-3 border-t border-white/10 space-y-2">
          {!allFlipped && (
            <button onClick={flipAll}
              className="w-full py-2.5 rounded-xl border border-vintage-gold/40 bg-vintage-gold/10 text-vintage-gold text-sm font-bold active:scale-95 transition-all">
              Reveal All
            </button>
          )}
          <div className="grid grid-cols-3 gap-2">
            <a href={`https://opensea.io/assets/base/${VMW_DROP}/${cards[0].tokenId}`}
              target="_blank" rel="noopener noreferrer"
              className="flex flex-col items-center justify-center gap-1 py-2.5 rounded-xl bg-[#2081E2] text-white text-xs font-bold active:scale-95 transition-all">
              <svg width="18" height="18" viewBox="0 0 90 90" fill="none"><circle cx="45" cy="45" r="45" fill="white" fillOpacity="0.2"/><path d="M22.3 46.8l.2-.3 12.4-19.5c.2-.3.6-.2.7.1 2.1 4.7 3.9 10.5 3 14.1-.4 1.5-1.4 3.6-2.5 5.5-.1.3-.3.5-.4.8-.1.1-.2.2-.4.2H22.7c-.3 0-.5-.3-.4-.6v-.3zM74.5 49.6v.7c0 .2-.1.3-.3.4-.8.3-3.6 1.6-4.7 3.2-2.9 4.1-5.2 9.9-10.2 9.9H37.2c-7.5 0-13.6-6.1-13.6-13.7v-.2c0-.2.2-.4.4-.4h14.5c.3 0 .5.3.4.5-.1.7-.1 1.4 0 2.1.3 2.9 2.7 5.1 5.6 5.1h8.8v-5H44.7c-.3 0-.5-.3-.3-.6 0-.1.1-.1.1-.2 1.1-1.5 2.6-3.8 3-6.3.2-1.3.1-2.6-.1-3.8-.1-.5-.1-.9-.3-1.4v-.3c0-.1.1-.1.1-.1.7-.1 1.5.2 2.2.4.2.1.4.3.5.3.3.2.6.3.8.5.7.6 1.3 1.3 1.7 2.2.3.5.5 1.1.6 1.7.1.2.1.5.1.7 0 .4 0 .8-.1 1.2-.2.7-.5 1.3-.9 1.9h5.8c.2 0 .4.2.4.4v.1c0 .3-.3.6-.5.6z" fill="white"/></svg>
              OpenSea
            </a>
            <button onClick={doShare}
              className="flex flex-col items-center justify-center gap-1 py-2.5 rounded-xl bg-[#7C3AED] text-white text-xs font-bold active:scale-95 transition-all">
              <FarcasterIcon size={18} />
              Share
            </button>
            <button onClick={onClose}
              className="flex flex-col items-center justify-center gap-1 py-2.5 rounded-xl bg-vintage-gold text-black text-xs font-black active:scale-95 transition-all">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Burn Modal ────────────────────────────────────────────────────────────────
function BurnModal({ address, onClose }: { address: string; onClose: () => void }) {
  const { opened, loading, refresh } = useOwnedBoxes(address);
  const [selected, setSelected] = useState<string | null>(null);
  const [selling, setSelling] = useState(false);
  const [sellMode, setSellMode] = useState<"vbms" | "eth" | null>(null);
  const [burnPage, setBurnPage] = useState(0);
  const BURN_PAGE_SIZE = 5;
  const offers = useOfferAmounts();
  const { writeContractAsync } = useWriteContractWithAttribution();
  const { chainId } = useAccount();

  const selectedBox = opened.find((b) => b.tokenId === selected);
  const offerVbms = selectedBox?.rarity !== undefined ? offers[selectedBox.rarity] : undefined;

  // ETH quote for the VBMS offer amount
  const { data: ethQuoteData } = useReadContract({
    address: VMW_TOKEN, abi: TOKEN_ABI, functionName: "getTokenSellQuote",
    args: offerVbms ? [offerVbms] : undefined,
    chainId: base.id,
    query: { enabled: !!offerVbms, staleTime: 15_000 },
  });
  const ethQuote = ethQuoteData as bigint | undefined;

  const handleSell = async (mode: "vbms" | "eth") => {
    if (!selected || !address || chainId !== base.id) { toast.error("Switch to Base"); return; }
    setSelling(true);
    setSellMode(mode);
    try {
      // Step 1: sell card NFT → receive VBMS
      await writeContractAsync({
        address: VMW_DROP, abi: DROP_ABI, functionName: "sellAndClaimOffer",
        args: [BigInt(selected)], chainId: base.id,
      });
      toast.success(mode === "vbms" ? `Card sold for ${offerVbms ? parseFloat(formatEther(offerVbms)).toFixed(0) : "?"} VBMS! ✅` : "Step 1/2: Card sold for VBMS ✅");

      if (mode === "eth" && offerVbms) {
        // Step 2: sell VBMS → ETH
        const minOut = offerVbms * 95n / 100n; // 5% slippage
        await writeContractAsync({
          address: VMW_TOKEN, abi: TOKEN_ABI, functionName: "sell",
          args: [offerVbms, address as `0x${string}`, minOut, ZERO, ZERO],
          chainId: base.id,
        });
        toast.success(`Sold for ETH! ✅`);
      }

      refresh();
      setSelected(null);
      onClose();
    } catch (e: any) {
      toast.error((e?.shortMessage || e?.message || "Sell failed").slice(0, 80));
    } finally { setSelling(false); setSellMode(null); }
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center" style={{ padding: '56px 16px 64px' }} onClick={onClose}>
      <div className="bg-vintage-charcoal border border-vintage-gold/50 rounded-2xl w-full max-w-sm p-4 flex flex-col overflow-hidden" style={{ maxHeight: '100%' }}
        onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-display font-bold text-vintage-gold">Burn VMW Cards</h3>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-[#CC2222] hover:bg-[#AA1111] text-white font-black flex items-center justify-center text-sm active:scale-95 transition-all">×</button>
        </div>

        {loading ? (
          <p className="text-vintage-ice/50 text-center py-8">Loading cards…</p>
        ) : opened.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-vintage-ice/50">No opened cards yet</p>
            <p className="text-vintage-ice/30 text-xs mt-1">Open packs to reveal cards</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-3">
              <p className="text-vintage-ice/60 text-xs">Select a card to burn</p>
              {Math.ceil(opened.length / BURN_PAGE_SIZE) > 1 && (
                <div className="flex items-center gap-1">
                  <button onClick={() => setBurnPage(p => Math.max(0, p - 1))} disabled={burnPage === 0}
                    className="w-7 h-7 rounded-lg bg-vintage-gold/20 border border-vintage-gold/50 text-vintage-gold disabled:opacity-30 text-base font-bold flex items-center justify-center active:scale-90 transition-all">‹</button>
                  <span className="text-xs text-vintage-ice/40">{burnPage + 1}/{Math.ceil(opened.length / BURN_PAGE_SIZE)}</span>
                  <button onClick={() => setBurnPage(p => Math.min(Math.ceil(opened.length / BURN_PAGE_SIZE) - 1, p + 1))} disabled={burnPage >= Math.ceil(opened.length / BURN_PAGE_SIZE) - 1}
                    className="w-7 h-7 rounded-lg bg-vintage-gold/20 border border-vintage-gold/50 text-vintage-gold disabled:opacity-30 text-base font-bold flex items-center justify-center active:scale-90 transition-all">›</button>
                </div>
              )}
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 mb-4">
              {opened.slice(burnPage * BURN_PAGE_SIZE, (burnPage + 1) * BURN_PAGE_SIZE).map((box) => {
                const rarityIdx = box.rarity ?? 0;
                const offer = offers[rarityIdx];
                const cardImg = getVbmsBaccaratImageUrlByTokenId(box.tokenId);
                return (
                  <button key={box.tokenId} onClick={() => setSelected(box.tokenId)}
                    className={`w-full flex items-center gap-3 p-2 rounded-xl border transition-all ${selected === box.tokenId ? "border-vintage-gold bg-vintage-gold/10" : "border-white/10 bg-white/5 hover:border-white/20"}`}>
                    {cardImg
                      ? <img src={cardImg} alt="card" className="w-10 h-14 object-cover rounded-md flex-shrink-0" />
                      : <div className={`w-10 h-14 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${RARITY_BG[rarityIdx] ?? RARITY_BG[0]}`}><span className={`text-[10px] font-black ${RARITY_COLORS[rarityIdx] ?? RARITY_COLORS[0]}`}>{(RARITY_NAMES[rarityIdx] ?? "C").slice(0,1)}</span></div>}
                    <div className="text-left flex-1">
                      <p className={`text-sm font-bold ${RARITY_COLORS[rarityIdx] ?? RARITY_COLORS[0]}`}>
                        {RARITY_NAMES[rarityIdx] ?? "Common"}
                      </p>
                      <p className="text-xs text-vintage-ice/40">#{box.tokenId}</p>
                    </div>
                    {offer && (
                      <span className="text-xs text-vintage-gold font-bold">
                        {parseFloat(formatEther(offer)).toFixed(0)} VBMS
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {selected && (
              <div className="space-y-2 border-t border-vintage-gold/20 pt-4">
                <p className="text-xs text-vintage-ice/50 text-center mb-2">Choose burn method:</p>
                <div className="grid grid-cols-2 gap-2">
                  {/* Sell for VBMS */}
                  <button onClick={() => handleSell("vbms")} disabled={selling}
                    className="flex flex-col items-center py-3 rounded-xl bg-vintage-gold/10 border border-vintage-gold/40 hover:bg-vintage-gold/20 disabled:opacity-40 transition-all active:scale-95">
                    <span className="text-vintage-gold font-black text-sm">VBMS</span>
                    {offerVbms && <span className="text-xs text-vintage-ice/60 mt-0.5">{parseFloat(formatEther(offerVbms)).toFixed(0)} tokens</span>}
                    {selling && sellMode === "vbms" && <span className="text-[10px] text-vintage-gold/60 mt-1">Processing…</span>}
                  </button>
                  {/* Sell for ETH */}
                  <button onClick={() => handleSell("eth")} disabled={selling}
                    className="flex flex-col items-center py-3 rounded-xl bg-blue-500/10 border border-blue-400/40 hover:bg-blue-500/20 disabled:opacity-40 transition-all active:scale-95">
                    <span className="text-blue-400 font-black text-sm">ETH</span>
                    {ethQuote && <span className="text-xs text-vintage-ice/60 mt-0.5">{parseFloat(formatEther(ethQuote)).toFixed(5)} ETH</span>}
                    {selling && sellMode === "eth" && <span className="text-[10px] text-blue-400/60 mt-1">2 TXs…</span>}
                  </button>
                </div>
                <p className="text-[10px] text-vintage-ice/30 text-center">ETH = 2 transactions (sell card → sell tokens)</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Just Bought Modal ─────────────────────────────────────────────────────────
function JustBoughtModal({ packs, loading, onOpenNow, onLater }: {
  packs: Box[];
  loading: boolean;
  onOpenNow: (ids: string[]) => void;
  onLater: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/85 z-[100] flex items-center justify-center" style={{ padding: "56px 16px 64px" }}>
      <div className="w-full max-w-sm bg-[#111] border border-vintage-gold/50 rounded-2xl flex flex-col overflow-hidden shadow-2xl" style={{ maxHeight: "100%" }}>
        <div className="px-4 pt-5 pb-4 text-center border-b border-white/10">
          <div className="text-3xl mb-1">🎉</div>
          <h3 className="text-lg font-display font-bold text-vintage-gold">Packs Comprados!</h3>
          <p className="text-white/40 text-xs mt-0.5">Abra agora para revelar suas cartas</p>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {loading ? (
            <div className="flex flex-col items-center gap-3 py-8">
              <div className="w-10 h-10 rounded-full border-2 border-vintage-gold/30 border-t-vintage-gold animate-spin" />
              <p className="text-vintage-gold/60 text-xs">Indexando packs na blockchain…</p>
            </div>
          ) : packs.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-8">
              <div className="w-10 h-10 rounded-full border-2 border-vintage-gold/30 border-t-vintage-gold animate-spin" />
              <p className="text-vintage-gold/60 text-xs">Aguardando confirmação…</p>
            </div>
          ) : (
            packs.map((box) => (
              <div key={box.tokenId} className="flex items-center gap-3 p-2 rounded-xl border border-vintage-gold/30 bg-vintage-gold/5">
                <img src={PACK_IMAGE} alt="Pack" className="w-10 h-10 object-contain" />
                <div>
                  <p className="text-sm font-bold text-white">VMW #{box.tokenId}</p>
                  <p className="text-xs text-vintage-ice/40">Pack não aberto</p>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="px-4 pb-5 pt-3 space-y-2 border-t border-white/10">
          <button
            onClick={() => onOpenNow(packs.map(b => b.tokenId))}
            disabled={packs.length === 0}
            className="w-full py-3 font-black text-sm uppercase tracking-widest bg-[#FFD400] hover:bg-[#ECC200] text-black rounded-xl disabled:opacity-40 active:scale-95 transition-all shadow-[0_4px_0px_#000]">
            {packs.length > 0 ? `Abrir ${packs.length} Pack${packs.length > 1 ? "s" : ""} Agora` : "Aguardando…"}
          </button>
          <button onClick={onLater} className="w-full py-2 text-vintage-ice/40 text-xs font-bold hover:text-vintage-ice/60 transition-colors">
            Abrir depois
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Action Buttons for VMW slide ──────────────────────────────────────────────
export function VMWActionButtons({ address, autoOpenTrigger, mintQty = 1 }: { address: string | undefined; autoOpenTrigger?: number; mintQty?: number }) {
  const { boxes, unopened, opened, loading, refresh } = useOwnedBoxes(address);
  const [showOpen, setShowOpen] = useState(false);
  const [showBurn, setShowBurn] = useState(false);
  const [revealedCards, setRevealedCards] = useState<RevealedCard[]>([]);
  const [justBought, setJustBought] = useState<{ packs: Box[]; loading: boolean } | null>(null);
  const prevUnopened = useRef<Set<string>>(new Set());
  const [openPreSelected, setOpenPreSelected] = useState<string[] | null>(null);

  // After mint: snapshot current packs, start polling for new ones
  useEffect(() => {
    if (!autoOpenTrigger) return;
    prevUnopened.current = new Set(unopened.map(b => b.tokenId));
    setJustBought({ packs: [], loading: true });
    const t1 = setTimeout(() => refresh(), 4000);
    const t2 = setTimeout(() => refresh(), 8000);
    const t3 = setTimeout(() => refresh(), 15000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [autoOpenTrigger]);

  // When boxes update, find new packs for just-bought modal
  useEffect(() => {
    if (!justBought) return;
    const newPacks = unopened.filter(b => !prevUnopened.current.has(b.tokenId));
    if (newPacks.length > 0) {
      setJustBought({ packs: newPacks, loading: false });
    } else if (justBought.loading && unopened.length > 0) {
      // Fallback: show newest mintQty packs by tokenId
      const sorted = [...unopened].sort((a, b) => Number(b.tokenId) - Number(a.tokenId));
      setJustBought({ packs: sorted.slice(0, mintQty), loading: false });
    }
  }, [boxes]);

  return (
    <>
      <div className="max-w-sm mx-auto grid grid-cols-2 gap-3 mb-4">
        {/* Open Packs */}
        <button onClick={() => setShowOpen(true)} disabled={!address}
          className="shop-open-btn py-3 px-4 border-4 border-black font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-2 bg-[#FFD400] hover:bg-[#ECC200] text-black active:translate-x-[3px] active:translate-y-[3px] disabled:opacity-50">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 12v10H4V12" /><path d="M2 7h20v5H2z" /><path d="M12 22V7" />
            <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" /><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
          </svg>
          <span>Open {unopened.length > 0 ? `(${unopened.length})` : "Packs"}</span>
        </button>

        {/* Burn */}
        <button onClick={() => setShowBurn(true)} disabled={!address}
          className="shop-burn-btn py-3 px-4 border-4 border-black font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-2 bg-[#CC2222] hover:bg-[#AA1111] text-white active:translate-x-[3px] active:translate-y-[3px] disabled:opacity-50">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            <line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" />
          </svg>
          <span>Burn {opened.length > 0 ? `(${opened.length})` : "Cards"}</span>
        </button>
      </div>

      {/* Burn values */}
      <div className="max-w-sm mx-auto">
        <p className="text-xs text-vintage-ice/40 text-center mb-2">Burn Values (VBMS)</p>
        <div className="grid grid-cols-5 gap-1 text-xs text-center">
          <div className="rounded p-2 bg-vintage-charcoal/30 border border-[#D4A843]/20">
            <span className="text-vintage-ice/50 block">Common</span>
            <BurnValueDisplay rarityIndex={0} />
          </div>
          <div className="rounded p-2 bg-vintage-charcoal/30 border border-[#D4A843]/20">
            <span className="text-blue-400/70 block">Rare</span>
            <BurnValueDisplay rarityIndex={1} />
          </div>
          <div className="rounded p-2 bg-vintage-charcoal/30 border border-[#D4A843]/20">
            <span className="text-purple-400/70 block">Epic</span>
            <BurnValueDisplay rarityIndex={2} />
          </div>
          <div className="rounded p-2 bg-vintage-charcoal/30 border border-[#D4A843]/20">
            <span className="text-yellow-400/70 block">Legend</span>
            <BurnValueDisplay rarityIndex={3} />
          </div>
          <div className="rounded p-2 bg-vintage-charcoal/30 border border-[#D4A843]/20">
            <span className="text-pink-400/70 block">Mythic</span>
            <BurnValueDisplay rarityIndex={4} />
          </div>
        </div>
      </div>

      {justBought && address && (
        <JustBoughtModal
          packs={justBought.packs}
          loading={justBought.loading}
          onOpenNow={(ids) => {
            setJustBought(null);
            setOpenPreSelected(ids);
            setShowOpen(true);
          }}
          onLater={() => setJustBought(null)}
        />
      )}
      {showOpen && address && (
        <OpenModal
          address={address}
          onClose={() => { setShowOpen(false); setOpenPreSelected(null); }}
          onRevealed={(cards) => { setRevealedCards(cards); setShowOpen(false); setOpenPreSelected(null); }}
          preSelectedIds={openPreSelected ?? undefined}
        />
      )}
      {showBurn && address && <BurnModal address={address} onClose={() => setShowBurn(false)} />}
      {revealedCards.length > 0 && <RevealedCardsModal cards={revealedCards} onClose={() => setRevealedCards([])} />}
    </>
  );
}

function BurnValueDisplay({ rarityIndex }: { rarityIndex: number }) {
  const offers = useOfferAmounts();
  const offer = offers[rarityIndex];
  if (!offer) return <span className="text-green-400 font-bold">…</span>;
  const val = parseFloat(formatEther(offer));
  const display = val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val.toFixed(0);
  return <span className="text-green-400 font-bold">{display}</span>;
}
