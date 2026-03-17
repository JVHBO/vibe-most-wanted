import React, { useState, useRef } from "react";
import Link from "next/link";
import { AudioManager } from "@/lib/audio-manager";
import { useMutation, useConvex } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useWriteContract } from "wagmi";
import { CONTRACTS, ERC20_ABI } from "@/lib/contracts";
import { parseEther } from "viem";
import { getCharacterFromImage } from "@/lib/vmw-image-mapping";
import { tcgAbilities } from "@/lib/tcg/abilities";
import tcgCardsData from "@/data/vmw-tcg-cards.json";
import type { Id } from "@/convex/_generated/dataModel";

const REWARDED_BATTLES_PER_DAY = 5;
const BATTLE_AURA_REWARD = 85;

interface TCGLobbyProps {
  activeDeck: any;
  playerDecks: any[] | undefined;
  address: string | undefined;
  username: string;
  nfts: any[];
  dailyBattles: number;
  vbmsBalance: bigint | number | string;
  refetchVBMS: () => void;
  myDefensePool: any;
  defenseLeaderboard: any[] | undefined;
  autoSelectCombo: boolean;
  onAutoSelectComboChange: (value: boolean) => void;
  onStartPvE: () => void;
  onMatchCreated: (matchId: Id<"tcgMatches">) => void;
  onMatchJoined: (matchId: Id<"tcgMatches">) => void;
  onNavigate: (view: string) => void;
  onGoHome: () => void;
  t: (key: string) => string;
}

export function TCGLobby({
  activeDeck, playerDecks, address, username, nfts, dailyBattles,
  vbmsBalance, refetchVBMS, myDefensePool, defenseLeaderboard,
  autoSelectCombo, onAutoSelectComboChange,
  onStartPvE, onMatchCreated, onMatchJoined, onNavigate, onGoHome, t,
}: TCGLobbyProps) {
  const convex = useConvex();

  // Convex mutations
  const createMatch = useMutation(api.tcg.createMatch);
  const joinMatch = useMutation(api.tcg.joinMatch);
  const searchMatchMutation = useMutation(api.tcg.searchMatch);
  const cancelSearchMutation = useMutation(api.tcg.cancelSearch);
  const createMatchFromMatchmakingMutation = useMutation(api.tcg.createMatchFromMatchmaking);
  const autoMatchMutation = useMutation(api.tcg.autoMatch);
  const autoMatchWithStakeMutation = useMutation(api.tcg.autoMatchWithStake);
  const setDefensePoolMutation = useMutation(api.tcg.setDefensePool);
  const withdrawDefensePoolMutation = useMutation(api.tcg.withdrawDefensePool);
  const deleteDeckMutation = useMutation(api.tcg.deleteDeck);

  // Wagmi hooks
  const { writeContractAsync: writeTransfer } = useWriteContract();

  // Internal state
  const [lobbyTab, setLobbyTab] = useState<"play" | "rules" | "leaderboard">("play");
  const [roomIdInput, setRoomIdInput] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchElapsed, setSearchElapsed] = useState(0);
  const searchCancelledRef = useRef(false);
  const searchTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [showPoolModal, setShowPoolModal] = useState(false);
  const [selectedPoolTier, setSelectedPoolTier] = useState(10000);
  const [poolTxStep, setPoolTxStep] = useState<"idle" | "approving" | "transferring" | "done" | "error">("idle");
  const [attackConfirmTarget, setAttackConfirmTarget] = useState<{
    address: string;
    username: string;
    deckName: string;
    poolAmount: number;
    attackFee: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const hasDeck = activeDeck !== undefined && activeDeck !== null;

  // Get player's VBMS cards for album
  const playerVbmsCards = (nfts || []).filter((card: any) => card.collection === "vibe");
  const ownedCardCounts: Record<string, number> = {};
  playerVbmsCards.forEach((card: any) => {
    const imageUrl = card.imageUrl || card.image || "";
    const characterFromImage = getCharacterFromImage(imageUrl);
    const cardName = (card.character || characterFromImage || card.name || "").toLowerCase();
    if (cardName) {
      ownedCardCounts[cardName] = (ownedCardCounts[cardName] || 0) + 1;
    }
  });
  const allTcgCards = tcgCardsData.cards || [];
  const totalOwned = Object.keys(ownedCardCounts).length;
  const totalCards = allTcgCards.length;

  // Handlers
  const handleCreateMatch = async () => {
    if (!address) return;
    setError(null);
    try {
      const result = await createMatch({ address, username });
      onMatchCreated(result.matchId);
    } catch (err: any) {
      setError(err.message || "Failed to create match");
    }
  };

  const handleJoinMatch = async (roomId: string) => {
    if (!address) return;
    setError(null);
    try {
      const result = await joinMatch({ roomId: roomId.toUpperCase(), address, username });
      onMatchJoined(result.matchId);
    } catch (err: any) {
      const msg = err?.data?.message || err?.message || "Failed to join match";
      const cleanMsg = msg.replace(/^\[.*?\]\s*/, '').replace(/Uncaught Error:\s*/i, '');
      setError(cleanMsg || "Room not found or match unavailable");
    }
  };

  const handleFindMatch = async () => {
    if (!address || !activeDeck?._id) return;
    try {
      setError(null);
      setIsSearching(true);
      setSearchElapsed(0);
      searchCancelledRef.current = false;

      await searchMatchMutation({ address, username, deckId: activeDeck._id });

      let elapsed = 0;
      let foundPlayer = false;
      const maxSearchTime = 5;

      while (elapsed < maxSearchTime && !foundPlayer && !searchCancelledRef.current) {
        await new Promise(resolve => setTimeout(resolve, 500));
        if (searchCancelledRef.current) break;
        elapsed += 0.5;
        setSearchElapsed(elapsed);

        const matchStatus = await convex.query(api.tcg.checkMatchmaking, { address });

        if (matchStatus.status === "found_player" && matchStatus.opponent) {
          foundPlayer = true;
          const opponent = matchStatus.opponent;

          const matchResult = await createMatchFromMatchmakingMutation({
            player1Address: address,
            player2Address: opponent.address,
            player1Username: username,
            player2Username: opponent.username,
            player1DeckId: activeDeck._id,
            player2DeckId: opponent.deckId,
          });

          if (matchResult?.matchId) {
            onMatchJoined(matchResult.matchId);
          }
          setIsSearching(false);
          return;
        } else if (matchStatus.status === "expired" || matchStatus.status === "not_searching") {
          break;
        }
      }

      if (searchCancelledRef.current) {
        setIsSearching(false);
        return;
      }

      await cancelSearchMutation({ address });
      setSearchElapsed(elapsed + 0.5);

      const result = await autoMatchMutation({ address, username });
      if (result?.matchId) {
        onMatchJoined(result.matchId);
      }
      setIsSearching(false);
    } catch (e: any) {
      setIsSearching(false);
      if (searchTimerRef.current) clearInterval(searchTimerRef.current);
      setError(e.message || "No opponents found");
    }
  };

  const handleCancelSearch = async () => {
    searchCancelledRef.current = true;
    setIsSearching(false);
    if (address) await cancelSearchMutation({ address });
  };

  const handleActivatePool = async () => {
    if (!address || !activeDeck?._id) return;
    try {
      setError(null);
      setPoolTxStep("transferring");

      await writeTransfer({
        address: CONTRACTS.VBMSToken as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "transfer",
        args: [CONTRACTS.VBMSPoolTroll as `0x${string}`, parseEther(selectedPoolTier.toString())],
      });

      await setDefensePoolMutation({
        address,
        deckId: activeDeck._id,
        amount: selectedPoolTier,
        username,
      });

      setPoolTxStep("done");
      refetchVBMS();
      setShowPoolModal(false);
      setError(null);
    } catch (e: any) {
      setPoolTxStep("error");
      setError(e.message || "Transaction failed");
    }
  };

  const handleWithdrawPool = async () => {
    if (!address || !myDefensePool?.deckId) return;
    try {
      await withdrawDefensePoolMutation({ address, deckId: myDefensePool.deckId });
      setShowPoolModal(false);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleAttack = async () => {
    if (!address || !attackConfirmTarget) return;
    try {
      setError(null);
      const target = attackConfirmTarget;
      setAttackConfirmTarget(null);

      setPoolTxStep("transferring");
      await writeTransfer({
        address: CONTRACTS.VBMSToken as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "transfer",
        args: [CONTRACTS.VBMSPoolTroll as `0x${string}`, parseEther(target.attackFee.toString())],
      });

      setPoolTxStep("done");
      const result = await autoMatchWithStakeMutation({
        address,
        username,
        poolTier: target.poolAmount,
      });
      if (result?.matchId) {
        onMatchJoined(result.matchId);
      }
      refetchVBMS();
    } catch (e: any) {
      setPoolTxStep("idle");
      setError(e.message || "Failed to challenge");
    }
  };

  return (
    <div className="fixed inset-0 bg-vintage-deep-black overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-vintage-charcoal via-vintage-deep-black to-black" />

      {/* ===== TOP HUD ===== */}
      <div className="absolute top-0 left-0 right-0 z-10 p-3 bg-gradient-to-b from-black via-black/90 to-transparent backdrop-blur-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          {/* Left: Back button */}
          <Link
            href="/"
            onClick={() => { AudioManager.buttonNav(); onGoHome(); }}
            onMouseEnter={() => AudioManager.buttonHover()}
            className="px-2 py-1 bg-[#CC2222] hover:bg-[#AA1111] text-white border-4 border-black text-[11px] font-black uppercase tracking-widest active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all"
            style={{ boxShadow: '4px 4px 0px #000' }}
          >
            ← BACK
          </Link>

          {/* Center: Title */}
          <h1 className="text-base md:text-xl font-display font-bold text-vintage-gold uppercase tracking-widest">
            {t('tcgTitle')}
          </h1>

          {/* Right: Deck Builder Button */}
          <button
            onClick={() => { AudioManager.buttonNav(); onNavigate("deck-builder"); }}
            onMouseEnter={() => AudioManager.buttonHover()}
            className="tcg-tab-btn px-3 py-1.5 bg-[#FFD400] text-black border-4 border-black text-xs font-bold uppercase tracking-wider transition-all active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
          >
            {hasDeck ? t('tcgEdit') : t('tcgBuildDeck')}
          </button>
        </div>
      </div>

      {/* ===== MAIN SCROLLABLE CONTENT ===== */}
      <div className="absolute inset-0 pt-16 pb-24 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4">

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 bg-red-900/30 border border-red-500/50 rounded-lg flex items-center justify-between gap-3">
            <p className="text-red-300 text-xs flex-1">{error}</p>
            <button onClick={() => setError(null)} className="text-red-500/50 hover:text-red-400 text-lg leading-none">&times;</button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-4">
          <button
            onClick={() => setLobbyTab("play")}
            className={`tcg-tab-btn flex-1 py-2.5 px-3 font-black text-xs uppercase tracking-wider border-4 border-black transition-all active:translate-x-[3px] active:translate-y-[3px] active:shadow-none ${
              lobbyTab === "play"
                ? "bg-[#CC2222] text-white"
                : "bg-gray-800 text-vintage-gold"
            }`}
          >
            {t('tcgPlay')}
          </button>
          <button
            onClick={() => setLobbyTab("leaderboard")}
            className={`tcg-tab-btn flex-1 py-2.5 px-3 font-black text-xs uppercase tracking-wider border-4 border-black transition-all active:translate-x-[3px] active:translate-y-[3px] active:shadow-none ${
              lobbyTab === "leaderboard"
                ? "bg-[#FFD400] text-black"
                : "bg-gray-800 text-vintage-gold"
            }`}
          >
            Leaderboard
          </button>
          <button
            onClick={() => setLobbyTab("rules")}
            className={`tcg-tab-btn flex-1 py-2.5 px-3 font-black text-xs uppercase tracking-wider border-4 border-black transition-all active:translate-x-[3px] active:translate-y-[3px] active:shadow-none ${
              lobbyTab === "rules"
                ? "bg-[#FFD400] text-black"
                : "bg-gray-800 text-vintage-gold"
            }`}
          >
            {t('tcgRules')}
          </button>
        </div>

        {/* Tab Content */}
        {lobbyTab === "play" && (
          <div className="space-y-4">
            {/* Active Deck Info */}
            {hasDeck && (
              <div className="bg-vintage-charcoal/50 backdrop-blur-sm rounded-xl border-2 border-vintage-gold/40 overflow-hidden" style={{ boxShadow: '3px 3px 0px rgba(0,0,0,0.6)' }}>
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-[10px] text-vintage-burnt-gold uppercase tracking-wide mb-1">{t('tcgActiveDeck')}</p>
                      <p className="text-lg font-bold text-vintage-gold">{activeDeck.deckName}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs">
                        <span className="text-vintage-burnt-gold"><span className="text-vintage-gold font-bold">{activeDeck.vbmsCount}</span> VBMS</span>
                        <span className="text-vintage-gold/30">&bull;</span>
                        <span className="text-vintage-burnt-gold"><span className="text-vintage-gold font-bold">{activeDeck.nothingCount}</span> Nothing</span>
                        <span className="text-vintage-gold/30">&bull;</span>
                        <span className="text-purple-400 font-bold">{activeDeck.totalPower} PWR</span>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowPoolModal(true)}
                      className="tcg-btn-pool-action px-3 py-2 bg-[#FFD400] hover:bg-yellow-300 text-black border-4 border-black text-xs font-black uppercase tracking-wide transition-all flex items-center gap-1.5 active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
                    >
                      Pool: {(myDefensePool?.poolAmount || 0).toLocaleString()} {myDefensePool?.isActive && <span className="text-green-400">&#10003;</span>}
                    </button>
                  </div>
                </div>
              </div>
            )}


            {/* Play Buttons */}
            <div className="space-y-4">
              {!hasDeck ? (
                <div className="bg-vintage-charcoal/50 backdrop-blur-sm rounded-xl border-2 border-vintage-gold/40 p-6 text-center" style={{ boxShadow: '3px 3px 0px rgba(0,0,0,0.6)' }}>
                  <div className="w-16 h-16 rounded-full bg-vintage-gold/10 border border-vintage-gold/30 flex items-center justify-center mx-auto mb-4">
                    <span className="text-vintage-gold text-2xl">🃏</span>
                  </div>
                  <h3 className="text-lg font-bold text-vintage-gold mb-2">No Deck Built</h3>
                  <p className="text-vintage-burnt-gold text-sm mb-4">Create your first deck to start battling!</p>
                  <button
                    onClick={() => onNavigate("deck-builder")}
                    className="tcg-tab-btn px-6 py-3 bg-[#FFD400] hover:bg-yellow-300 text-black font-black border-4 border-black text-sm uppercase tracking-wide transition-all active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
                  >
                    {t('tcgBuildDeck')}
                  </button>
                </div>
              ) : (
                <>
                  {/* Battle Mode Selection */}
                  <div className="bg-vintage-charcoal/50 backdrop-blur-sm rounded-xl border-2 border-vintage-gold/40 overflow-hidden" style={{ boxShadow: '3px 3px 0px rgba(0,0,0,0.6)' }}>
                    <div className="p-3 border-b border-vintage-gold/20 flex items-center justify-between">
                      <h3 className="text-sm font-bold text-vintage-gold uppercase tracking-wide">Battle Mode</h3>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-vintage-burnt-gold">Today:</span>
                        {dailyBattles < REWARDED_BATTLES_PER_DAY ? (
                          <span className="text-green-400 font-bold">{dailyBattles}/{REWARDED_BATTLES_PER_DAY} <span className="text-[10px]">(+{BATTLE_AURA_REWARD} AURA)</span></span>
                        ) : (
                          <span className="text-gray-400">{dailyBattles} (free)</span>
                        )}
                      </div>
                    </div>

                    <div className="p-4 space-y-3">
                      {/* PvE Button */}
                      <button
                        onClick={() => { AudioManager.buttonClick(); onStartPvE(); }}
                        onMouseEnter={() => AudioManager.buttonHover()}
                        className="tcg-btn-cpu w-full px-4 py-3 bg-[#16A34A] hover:bg-green-500 text-white font-black text-sm uppercase tracking-wide border-4 border-black transition-all active:translate-x-[3px] active:translate-y-[3px] active:shadow-none flex items-center justify-center gap-2"
                      >
                        {t('tcgBattleCpu')} {dailyBattles < REWARDED_BATTLES_PER_DAY ? `(+${BATTLE_AURA_REWARD} AURA)` : ""}
                      </button>

                      {/* PvP Section */}
                      <div className="border-t border-vintage-gold/10 pt-3">
                        <p className="text-[10px] text-vintage-burnt-gold uppercase tracking-wide mb-3 text-center">PvP Battle</p>

                        {/* Find Match (Matchmaking -> CPU fallback) */}
                        {isSearching ? (
                          <div className="w-full bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 mb-3 text-center">
                            <div className="flex items-center justify-center gap-2 mb-2">
                              <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                              <span className="text-amber-400 text-sm font-bold">
                                {searchElapsed < 5 ? "Searching for players..." : "Matching vs CPU..."}
                              </span>
                            </div>
                            <p className="text-xs text-vintage-burnt-gold/50 mb-2">{Math.max(0, Math.ceil(5 - searchElapsed))}s</p>
                            <button
                              onClick={handleCancelSearch}
                              className="px-4 py-1.5 text-xs text-red-400 border border-red-500/30 rounded hover:bg-red-900/20 transition"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => { AudioManager.buttonClick(); handleFindMatch(); }}
                            onMouseEnter={() => AudioManager.buttonHover()}
                            disabled={!hasDeck}
                            className="tcg-btn-findmatch w-full px-4 py-3 bg-[#FFD400] hover:bg-yellow-300 text-black font-black text-sm uppercase tracking-wide border-4 border-black transition-all disabled:opacity-40 disabled:cursor-not-allowed active:translate-x-[3px] active:translate-y-[3px] active:shadow-none flex items-center justify-center gap-2 mb-2"
                          >
                            Find Match
                          </button>
                        )}

                        {/* Create / Join Room */}
                        <div className="space-y-2">
                          <button
                            onClick={() => { AudioManager.buttonClick(); handleCreateMatch(); }}
                            onMouseEnter={() => AudioManager.buttonHover()}
                            disabled={!hasDeck}
                            className="tcg-btn-createroom w-full px-3 py-2.5 bg-[#7C3AED] hover:bg-purple-500 text-white font-black text-xs uppercase tracking-wide border-4 border-black transition-all disabled:opacity-40 disabled:cursor-not-allowed active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
                          >
                            Create Room
                          </button>
                          <div className="flex gap-1">
                            <input
                              type="text"
                              value={roomIdInput}
                              onChange={(e) => setRoomIdInput(e.target.value.toUpperCase())}
                              placeholder="ROOM CODE"
                              maxLength={6}
                              disabled={!hasDeck}
                              className="flex-1 bg-black/70 border-2 border-vintage-gold/40 px-2 py-2 text-vintage-gold font-mono text-center uppercase tracking-wider focus:outline-none focus:border-vintage-gold/70 placeholder:text-vintage-burnt-gold/30 text-xs disabled:opacity-40"
                            />
                            <button
                              onClick={() => { if (roomIdInput.length >= 4) { AudioManager.buttonClick(); handleJoinMatch(roomIdInput); } }}
                              onMouseEnter={() => AudioManager.buttonHover()}
                              disabled={!hasDeck || roomIdInput.length < 4}
                              className="tcg-btn-join px-4 py-2 bg-[#CC2222] hover:bg-[#AA1111] text-white font-black text-xs uppercase tracking-wide border-4 border-black transition-all disabled:opacity-40 disabled:cursor-not-allowed active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
                            >
                              Join
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>
                </>
              )}
            </div>

          </div>
        )}

        {lobbyTab === "rules" && (
          <div className="space-y-3 text-sm">
            {/* Basic Rules */}
            <div className="bg-vintage-charcoal/30 border border-vintage-gold/10 rounded-lg p-3">
              <h3 className="font-bold text-vintage-gold mb-2 uppercase tracking-wider text-xs">{t('tcgHowToPlay')}</h3>
              <div className="text-vintage-burnt-gold space-y-1 text-xs">
                <p>{t('tcgHowToPlayDesc1')}</p>
                <p>{t('tcgHowToPlayDesc2')}</p>
                <p>{t('tcgHowToPlayDesc3')}</p>
                <p>{t('tcgHowToPlayDesc4')}</p>
                <p>{t('tcgHowToPlayDesc5')}</p>
              </div>
            </div>

            {/* Energy System */}
            <div className="bg-vintage-charcoal/30 border border-vintage-gold/10 rounded-lg p-3">
              <h3 className="font-bold text-vintage-neon-blue mb-2 uppercase tracking-wider text-xs">{t('tcgEnergySystem')}</h3>
              <div className="text-vintage-burnt-gold space-y-1 text-xs">
                <p>{t('tcgEnergyTurn1')}</p>
                <p>{t('tcgEnergyTurn3')}</p>
                <p>{t('tcgEnergyTurn6')}</p>
                <p className="text-vintage-gold mt-1">{t('tcgEnergySkipBonus')}</p>
              </div>
            </div>

            {/* Card Types */}
            <div className="bg-vintage-charcoal/30 border border-vintage-gold/10 rounded-lg p-3">
              <h3 className="font-bold text-purple-400 mb-2 uppercase tracking-wider text-xs">{t('tcgCardTypes')}</h3>
              <div className="text-vintage-burnt-gold space-y-1 text-xs">
                <p>{t('tcgCardVbms')}</p>
                <p>{t('tcgCardNothing')}</p>
                <p><span className="text-pink-400">{t('tcgCardPrizeFoil')}</span></p>
                <p><span className="text-purple-400">{t('tcgCardStandardFoil')}</span></p>
              </div>
            </div>

            {/* Card Categories */}
            {(() => {
              const categoryConfig: Record<string, { emoji: string; color: string; label: string }> = {
                offensive: { emoji: "⚔️", color: "text-red-400", label: "Offensive" },
                support: { emoji: "💚", color: "text-green-400", label: "Support" },
                control: { emoji: "🎭", color: "text-purple-400", label: "Control" },
                economy: { emoji: "⚡", color: "text-yellow-400", label: "Economy" },
                wildcard: { emoji: "🃏", color: "text-cyan-400", label: "Wildcard" },
              };
              const grouped: Record<string, { key: string; name: string; desc: string }[]> = {
                offensive: [], support: [], control: [], economy: [], wildcard: [],
              };
              Object.entries(tcgAbilities).forEach(([key, ab]) => {
                const cat = (ab as any).category as string;
                if (cat && grouped[cat]) {
                  grouped[cat].push({ key, name: ab.name, desc: ab.description });
                }
              });
              return (
                <div className="bg-vintage-charcoal/30 border border-vintage-gold/10 rounded-lg p-3">
                  <h3 className="font-bold text-vintage-gold mb-3 uppercase tracking-wider text-xs">Card Categories</h3>
                  <div className="space-y-3">
                    {Object.entries(categoryConfig).map(([cat, cfg]) => (
                      <div key={cat}>
                        <div className={`flex items-center gap-1.5 mb-1`}>
                          <span>{cfg.emoji}</span>
                          <span className={`${cfg.color} font-bold text-xs uppercase`}>{cfg.label}</span>
                          <span className="text-vintage-burnt-gold/50 text-[10px]">({grouped[cat]?.length || 0})</span>
                        </div>
                        <div className="grid grid-cols-1 gap-0.5 text-[10px] ml-5">
                          {grouped[cat]?.map((card) => (
                            <p key={card.key}>
                              <span className="text-vintage-gold font-semibold uppercase">{card.key}</span>
                              <span className="text-vintage-burnt-gold/60"> &mdash; {card.desc.length > 60 ? card.desc.slice(0, 57) + "..." : card.desc}</span>
                            </p>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Lane Effects */}
            <div className="bg-vintage-charcoal/30 border border-vintage-gold/10 rounded-lg p-3">
              <h3 className="font-bold text-cyan-400 mb-2 uppercase tracking-wider text-xs">{t('tcgLaneEffects')}</h3>
              <div className="text-vintage-burnt-gold space-y-1 text-xs">
                <p><span className="text-green-400">{t('tcgBuffLabel')}:</span> {t('tcgBuffLanes')}</p>
                <p><span className="text-red-400">{t('tcgDebuffLabel')}:</span> {t('tcgDebuffLanes')}</p>
                <p><span className="text-purple-400">{t('tcgChaosLabel')}:</span> {t('tcgChaosLanesDesc')}</p>
                <p><span className="text-vintage-gold">{t('tcgSpecialLabel')}:</span> {t('tcgSpecialLanesDesc')}</p>
              </div>
            </div>

            {/* Combos */}
            <div className="bg-vintage-charcoal/30 border border-vintage-gold/10 rounded-lg p-3">
              <h3 className="font-bold text-pink-400 mb-2 uppercase tracking-wider text-xs">{t('tcgCombosTotal' as any)}</h3>
              <div className="text-vintage-burnt-gold space-y-2 text-xs">
                <p className="text-vintage-gold font-semibold">{t('tcgSynergyCombos' as any)}</p>
                <div className="grid grid-cols-1 gap-0.5 text-[10px]">
                  <p>👑 <span className="text-yellow-400">ANTONIO + MIGUEL</span> = 2x Power</p>
                  <p>🧠 <span className="text-cyan-400">SARTOCRATES + ZURKCHAD</span> = +60 + Immune</p>
                  <p>📊 <span className="text-orange-400">BETOBUTTER + MORLACOS</span> = 2x Scaling</p>
                  <p>🔀 <span className="text-green-400">RIZKYBEGITU + BRADYMCK</span> = 2x Power</p>
                  <p>🎨 <span className="text-pink-400">SMOLEMARU + JOONX</span> = +35</p>
                  <p>🎄 <span className="text-red-400">NAUGHTY SANTA + GOZARU</span> = +40 lane</p>
                  <p>🕶️ <span className="text-purple-400">LOMBRA JR + SLATERG</span> = Steal 30</p>
                  <p>💸 <span className="text-lime-400">SCUM + BETOBUTTER</span> = Steal 40</p>
                </div>
                <p className="text-vintage-gold font-semibold pt-1">{t('tcgTeamCombos' as any)}</p>
                <div className="grid grid-cols-2 gap-0.5 text-[10px]">
                  <p>👨‍👧 Romero Dynasty</p>
                  <p>👑 Crypto Kings</p>
                  <p>🤖 AI Takeover</p>
                  <p>💩 Dirty Duo</p>
                  <p>🎰 Degen Trio</p>
                  <p>💻 Code Masters</p>
                </div>
                <p className="text-vintage-gold text-[10px] pt-1">{t('tcgClickComboInfo')}</p>
              </div>
            </div>

            {/* Turn Phases & Ability Order */}
            <div className="bg-vintage-charcoal/30 border border-vintage-gold/10 rounded-lg p-3">
              <h3 className="font-bold text-yellow-400 mb-2 uppercase tracking-wider text-xs">{t('tcgSkillOrderTitle' as any)}</h3>
              <div className="text-vintage-burnt-gold space-y-2 text-xs">
                <div className="space-y-1">
                  <p className="text-vintage-gold font-semibold">{t('tcgTurnPhases' as any)}</p>
                  <p><span className="text-blue-400">1. PLAY</span> - {t('tcgPhasePlay' as any)}</p>
                  <p><span className="text-orange-400">2. REVEAL</span> - {t('tcgPhaseReveal' as any)}</p>
                  <p><span className="text-purple-400">3. ABILITIES</span> - {t('tcgPhaseAbilities' as any)}</p>
                  <p><span className="text-green-400">4. RESOLVE</span> - {t('tcgPhaseResolve' as any)}</p>
                </div>
                <div className="border-t border-vintage-gold/20 pt-2 space-y-1">
                  <p className="text-vintage-gold font-semibold">{t('tcgActivationOrder' as any)}</p>
                  <p>&bull; <span className="text-cyan-400">{t('tcgLowerCostFirst' as any)}</span> (Common &rarr; Mythic)</p>
                  <p>&bull; {t('tcgTieBreaker' as any)}</p>
                  <p>&bull; {t('tcgSameLane' as any)}</p>
                </div>
                <div className="border-t border-vintage-gold/20 pt-2">
                  <p className="text-vintage-gold font-semibold mb-1">{t('tcgCostByRarity' as any)}</p>
                  <div className="grid grid-cols-2 gap-1 text-[10px]">
                    <span><span className="text-gray-400">Common</span> = 2⚡</span>
                    <span><span className="text-blue-400">Rare</span> = 3⚡</span>
                    <span><span className="text-purple-400">Epic</span> = 4⚡</span>
                    <span><span className="text-orange-400">Legendary</span> = 5⚡</span>
                    <span><span className="text-pink-400">Mythic</span> = 6⚡</span>
                    <span><span className="text-gray-500">Nothing</span> = 1⚡</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Tips */}
            <div className="bg-vintage-gold/5 border border-vintage-gold/20 rounded-lg p-3">
              <h3 className="font-bold text-vintage-gold mb-2 uppercase tracking-wider text-xs">{t('tcgTipsTitle')}</h3>
              <div className="text-vintage-burnt-gold space-y-1 text-xs">
                <p>- {t('tcgTip1')}</p>
                <p>- {t('tcgTip2')}</p>
                <p>- {t('tcgTip3')}</p>
                <p>- {t('tcgTip4')}</p>
              </div>
            </div>
          </div>
        )}

        {/* Leaderboard Tab */}
        {lobbyTab === "leaderboard" && (
          <div className="space-y-3">
            <div className="bg-gradient-to-b from-vintage-charcoal/60 to-vintage-charcoal/30 border-2 border-vintage-gold/30 rounded-lg p-3" style={{ boxShadow: '3px 3px 0px rgba(0,0,0,0.6)' }}>
              <h3 className="text-xs font-bold text-vintage-gold uppercase tracking-[0.2em] mb-3 text-center">Defense Leaderboard</h3>

              {/* My Pool Status */}
              {myDefensePool?.isActive && (
                <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-2 mb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[9px] text-green-400/70 uppercase tracking-wider">Your Pool</p>
                      <p className="text-sm font-bold text-green-400">{(myDefensePool.poolAmount || 0).toLocaleString()} VBMS</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] text-vintage-burnt-gold/50">W: <span className="text-green-400">{myDefensePool.wins}</span> L: <span className="text-red-400">{myDefensePool.losses}</span></p>
                      <p className="text-[9px] text-vintage-burnt-gold/50">Earned: <span className="text-green-400">+{(myDefensePool.totalEarned || 0).toLocaleString()}</span></p>
                    </div>
                  </div>
                </div>
              )}

              {/* Leaderboard List */}
              {defenseLeaderboard && defenseLeaderboard.length > 0 ? (
                <div className="space-y-1">
                  {defenseLeaderboard.map((entry: any) => {
                    const isMe = address && entry.address.toLowerCase() === address.toLowerCase();
                    return (
                      <div
                        key={entry.address}
                        className={`flex items-center justify-between p-2 rounded ${
                          isMe ? "bg-vintage-gold/10 border border-vintage-gold/30" : "bg-black/20 border border-vintage-gold/5"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold w-6 text-center ${entry.rank <= 3 ? "text-vintage-gold" : "text-vintage-burnt-gold/50"}`}>
                            #{entry.rank}
                          </span>
                          <div>
                            <p className={`text-xs font-bold truncate max-w-[120px] ${isMe ? "text-vintage-gold" : "text-vintage-burnt-gold"}`}>
                              {entry.username}{isMe ? " *" : ""}
                            </p>
                            <p className="text-[8px] text-vintage-burnt-gold/40">{entry.deckName}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <p className="text-xs font-bold text-vintage-gold">{(entry.poolAmount || 0).toLocaleString()}</p>
                            <p className="text-[8px] text-vintage-burnt-gold/40">
                              W:<span className="text-green-400">{entry.wins}</span> L:<span className="text-red-400">{entry.losses}</span>
                            </p>
                          </div>
                          {!isMe && activeDeck && (
                            <button
                              onClick={() => {
                                if (!address) return;
                                setAttackConfirmTarget({
                                  address: entry.address,
                                  username: entry.username,
                                  deckName: entry.deckName,
                                  poolAmount: entry.poolAmount,
                                  attackFee: Math.floor(entry.poolAmount * 0.1),
                                });
                              }}
                              disabled={poolTxStep === "transferring"}
                              className="px-2 py-1.5 bg-orange-600 hover:bg-orange-500 text-white border-2 border-black text-[8px] font-black uppercase tracking-wider transition-all whitespace-nowrap disabled:opacity-40 active:translate-y-[1px] active:shadow-none"
                              style={{ boxShadow: '2px 2px 0px #000' }}
                            >
                              {poolTxStep === "transferring" ? "..." : "Fight"}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-center text-vintage-burnt-gold/40 text-xs py-4">No defenders yet. Be the first to stake!</p>
              )}
            </div>
          </div>
        )}

        {/* Defense Pool Modal */}
        {showPoolModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={() => setShowPoolModal(false)}>
            <div className="bg-gradient-to-b from-vintage-charcoal to-vintage-deep-black border-2 border-vintage-gold/50 rounded-xl p-4 max-w-sm mx-4 w-full" style={{ boxShadow: '4px 4px 0px rgba(0,0,0,0.8)' }} onClick={e => e.stopPropagation()}>
              <h3 className="text-sm font-bold text-vintage-gold uppercase tracking-[0.2em] mb-3 text-center">Defense Pool</h3>

              {myDefensePool?.isActive ? (
                <div className="space-y-3">
                  <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-3 text-center">
                    <p className="text-[9px] text-green-400/70 uppercase tracking-wider mb-1">Active Pool</p>
                    <p className="text-xl font-bold text-green-400">{(myDefensePool.poolAmount || 0).toLocaleString()} VBMS</p>
                    <p className="text-[9px] text-vintage-burnt-gold/50 mt-1">
                      W: {myDefensePool.wins} | L: {myDefensePool.losses} | Earned: +{(myDefensePool.totalEarned || 0).toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={handleWithdrawPool}
                    className="tcg-btn-pool-action w-full py-2 bg-[#CC2222] hover:bg-[#AA1111] text-white border-4 border-black font-black text-xs uppercase tracking-wider transition-all active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
                  >
                    Withdraw Pool
                  </button>
                  <p className="text-[8px] text-vintage-burnt-gold/30 text-center">Withdrawn VBMS go to your inbox (claim on home page)</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <p className="text-[9px] text-vintage-burnt-gold/50 uppercase tracking-wider mb-2">Select Stake Amount</p>
                    <div className="flex gap-1.5 flex-wrap">
                      {[1000, 5000, 10000, 25000, 50000].map(tier => (
                        <button
                          key={tier}
                          onClick={() => setSelectedPoolTier(tier)}
                          className={`tcg-btn-tier px-3 py-1.5 text-[10px] font-black transition-all border-4 border-black active:translate-x-[3px] active:translate-y-[3px] active:shadow-none bg-[#FFD400] hover:bg-yellow-300 text-black ${
                            selectedPoolTier === tier ? "opacity-100" : "opacity-50"
                          }`}
                        >
                          {(tier / 1000).toFixed(0)}k
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="bg-black/30 border border-vintage-gold/10 rounded-lg p-2 space-y-1">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-vintage-burnt-gold/50">You Stake:</span>
                      <span className="text-vintage-gold font-bold">{selectedPoolTier.toLocaleString()} VBMS</span>
                    </div>
                    <div className="flex justify-between text-[10px]">
                      <span className="text-vintage-burnt-gold/50">Attack Fee (10%):</span>
                      <span className="text-vintage-burnt-gold/70">{Math.floor(selectedPoolTier * 0.1).toLocaleString()} VBMS</span>
                    </div>
                    <div className="flex justify-between text-[10px]">
                      <span className="text-vintage-burnt-gold/50">Defense Win:</span>
                      <span className="text-green-400 font-bold">+{Math.floor(selectedPoolTier * 0.1 * 0.9).toLocaleString()} coins</span>
                    </div>
                    <div className="flex justify-between text-[10px]">
                      <span className="text-vintage-burnt-gold/50">Defense Lose:</span>
                      <span className="text-red-400 font-bold">-{selectedPoolTier.toLocaleString()} VBMS (entire pool)</span>
                    </div>
                    <div className="flex justify-between text-[10px]">
                      <span className="text-vintage-burnt-gold/50">Contract Tax:</span>
                      <span className="text-vintage-burnt-gold/40">{Math.floor(selectedPoolTier * 0.1 * 0.1).toLocaleString()} VBMS (10% of fee)</span>
                    </div>
                  </div>

                  <p className="text-[9px] text-vintage-burnt-gold/40 text-center">
                    Your VBMS Balance: {Number(vbmsBalance || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })} VBMS
                  </p>

                  <button
                    onClick={handleActivatePool}
                    disabled={!activeDeck?._id || poolTxStep === "transferring" || Number(vbmsBalance || 0) < selectedPoolTier}
                    className="tcg-btn-pool-action w-full py-2.5 bg-[#16A34A] hover:bg-green-500 text-white font-black text-xs uppercase tracking-wider border-4 border-black transition-all disabled:opacity-40 active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
                  >
                    {poolTxStep === "transferring" ? "Sending VBMS..." : "Activate Defense Pool"}
                  </button>
                  <p className="text-[8px] text-vintage-burnt-gold/30 text-center">VBMS tokens will be sent to the game pool onchain</p>
                </div>
              )}

              <button
                onClick={() => setShowPoolModal(false)}
                className="tcg-btn-pool-action w-full mt-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-vintage-gold border-4 border-black font-black text-[10px] uppercase tracking-wider transition-all active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Attack Confirmation Modal */}
        {attackConfirmTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={() => setAttackConfirmTarget(null)}>
            <div className="bg-gradient-to-b from-vintage-charcoal to-vintage-deep-black border-2 border-orange-500/60 rounded-xl p-4 max-w-sm mx-4 w-full" style={{ boxShadow: '4px 4px 0px rgba(0,0,0,0.8)' }} onClick={e => e.stopPropagation()}>
              <h3 className="text-sm font-bold text-orange-400 uppercase tracking-[0.2em] mb-3 text-center">Confirm Attack</h3>

              <div className="bg-black/30 border border-orange-500/20 rounded-lg p-3 mb-3 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-vintage-burnt-gold/60 uppercase">Target</span>
                  <span className="text-sm font-bold text-vintage-gold">{attackConfirmTarget.username}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-vintage-burnt-gold/60 uppercase">Deck</span>
                  <span className="text-xs text-vintage-burnt-gold">{attackConfirmTarget.deckName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-vintage-burnt-gold/60 uppercase">Pool</span>
                  <span className="text-sm font-bold text-green-400">{attackConfirmTarget.poolAmount.toLocaleString()} VBMS</span>
                </div>
              </div>

              <div className="bg-orange-900/20 border border-orange-500/30 rounded-lg p-3 mb-3 text-center">
                <p className="text-[9px] text-orange-400/70 uppercase tracking-wider mb-1">Attack Fee (10%)</p>
                <p className="text-xl font-bold text-orange-400">{attackConfirmTarget.attackFee.toLocaleString()} VBMS</p>
                <p className="text-[9px] text-vintage-burnt-gold/50 mt-1">
                  Win: +{attackConfirmTarget.poolAmount.toLocaleString()} (entire pool) | Lose: -{attackConfirmTarget.attackFee.toLocaleString()}
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setAttackConfirmTarget(null)}
                  className="flex-1 py-2 bg-gray-800/50 hover:bg-gray-700/50 text-gray-400 border border-gray-600/40 rounded font-bold text-xs uppercase tracking-wider transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAttack}
                  disabled={poolTxStep === "transferring"}
                  className="flex-1 py-2 bg-orange-600 hover:bg-orange-500 text-white font-black text-xs uppercase tracking-wider border-2 border-black transition-all disabled:opacity-40 active:translate-y-[1px] active:shadow-none"
                  style={{ boxShadow: '2px 2px 0px #000' }}
                >
                  {poolTxStep === "transferring" ? "..." : "Attack!"}
                </button>
              </div>
            </div>
          </div>
        )}

        </div>
      </div>

      {/* ===== BOTTOM STATS BAR ===== */}
      <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black via-black/90 to-transparent pt-6 pb-3 px-3">
        <div className="max-w-4xl mx-auto">
          <div className="bg-black/60 backdrop-blur-sm rounded-lg border border-vintage-gold/20 px-4 py-2.5 flex items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-vintage-burnt-gold uppercase tracking-wide">Deck</span>
              {hasDeck ? (
                <span className="text-green-400 font-bold">Ready &#10003;</span>
              ) : (
                <span className="text-red-400 font-bold">None</span>
              )}
            </div>

            <div className="w-px h-4 bg-vintage-gold/20" />

            {hasDeck && (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-vintage-burnt-gold uppercase tracking-wide">Power</span>
                  <span className="font-bold text-purple-400">{activeDeck?.totalPower || 0}</span>
                </div>
                <div className="w-px h-4 bg-vintage-gold/20" />
              </>
            )}

            <div className="flex items-center gap-2">
              <span className="text-vintage-burnt-gold uppercase tracking-wide">Battles</span>
              <span className={`font-bold ${dailyBattles < REWARDED_BATTLES_PER_DAY ? 'text-green-400' : 'text-gray-400'}`}>
                {dailyBattles}/{REWARDED_BATTLES_PER_DAY}
              </span>
            </div>

            <div className="hidden sm:block w-px h-4 bg-vintage-gold/20" />

            <div className="hidden sm:flex items-center gap-2">
              <span className="text-vintage-burnt-gold uppercase tracking-wide">VBMS</span>
              <span className="text-vintage-gold font-bold">{Number(vbmsBalance || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
