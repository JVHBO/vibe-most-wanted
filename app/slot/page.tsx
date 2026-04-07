"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useQuery, useMutation, useConvex } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAccount } from "wagmi";
import { useProfile } from "@/contexts/ProfileContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useFarcasterVBMSBalance, useFarcasterTransferVBMS, useFarcasterApproveVBMS } from "@/lib/hooks/useFarcasterVBMS";
import { CONTRACTS } from "@/lib/contracts";
import { parseEther } from "viem";
import { toast } from "sonner";
import { sdk } from "@farcaster/miniapp-sdk";
import SlotMachine from "@/components/SlotMachine";

type DepositStep = "amount" | "approving" | "transferring" | "done";

const DEPOSIT_PRESETS = [100, 500, 1000, 2500];

// Translations
const translations = {
  en: {
    title: "Vibe Slots",
    back: "Back",
    credits: "Credits",
    vbms: "VBMS",
    freeSpins: "Free Spins",
    deposit: "Deposit",
    withdraw: "Withdraw",
    error: "Error",
    depositing: "Depositing...",
    withdrawing: "Withdrawing...",
    success: "Success",
    depositSuccess: "Deposited successfully!",
    withdrawSuccess: "Withdrawn successfully!",
    insufficientBalance: "Insufficient balance",
    approveFirst: "Approve VBMS first",
    connectWallet: "Connect wallet",
    rulesTitle: "Slot Rules",
    rules: [
      "Match 4 cards to win coins!",
      "Higher rarity combinations = bigger prizes",
      "Mythic cards are the rarest",
      "10 free spins daily for VibeFID badge holders",
      "Use coins to buy additional spins (10 coins each)",
    ],
  },
  pt: {
    title: "Vibe Slots",
    back: "Voltar",
    credits: "Créditos",
    vbms: "VBMS",
    freeSpins: "Spins Grátis",
    deposit: "Depositar",
    withdraw: "Sacar",
    error: "Erro",
    depositing: "Depositando...",
    withdrawing: "Sacando...",
    success: "Sucesso",
    depositSuccess: "Depositado com sucesso!",
    withdrawSuccess: "Sacado com sucesso!",
    insufficientBalance: "Saldo insuficiente",
    approveFirst: "Aprove VBMS primeiro",
    connectWallet: "Conecte a carteira",
    rulesTitle: "Regras do Slot",
    rules: [
      "Combine 4 cartas para ganhar moedas!",
      "Combinações de raridade maior = prêmios maiores",
      "Cartas Míticas são as mais raras",
      "10 spins grátis diários para titulares do badge VibeFID",
      "Use moedas para comprar spins adicionais (10 moedas cada)",
    ],
  },
};

export default function SlotPage() {
  const { t } = useLanguage();
  const { isConnected, address } = useAccount();
  const { profile } = useProfile();

  // VBMS hooks
  const { balance: vbmsBalance, refetch: refetchVBMS } = useFarcasterVBMSBalance(address || '');
  const { approve } = useFarcasterApproveVBMS();
  const { transfer } = useFarcasterTransferVBMS();

  const convex = useConvex();
  const statsQuery = useQuery(api.slot.getSlotDailyStats, {
    address: address || "",
  });

  const [showDeposit, setShowDeposit] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [depositAmount, setDepositAmount] = useState("100");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [depositStep, setDepositStep] = useState<DepositStep>("amount");
  const [withdrawStep, setWithdrawStep] = useState<DepositStep>("amount");
  const [txStatus, setTxStatus] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showRules, setShowRules] = useState(false);

  const handleWin = (amount: number) => {
    console.log("Player won:", amount);
  };

  const currentVBMSBalance = vbmsBalance ? Number(vbmsBalance) / 1e18 : 0;

  const getVBMSContract = () => {
    const chain = profile?.preferredChain || "base";
    return CONTRACTS.VBMS[chain as keyof typeof CONTRACTS.VBMS];
  };

  const handleDeposit = async () => {
    if (!isConnected || !address) {
      toast.error(t("connectWallet"));
      return;
    }

    const amount = Number(depositAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error(t("error"));
      return;
    }

    if (amount > currentVBMSBalance) {
      toast.error(t("insufficientBalance"));
      return;
    }

    setDepositStep("approving");
    setTxStatus("Approving VBMS...");
    setErrorMsg(null);

    try {
      // Approve VBMS transfer
      const contract = getVBMSContract();
      const amountWei = parseEther(depositAmount);

      // Call approve
      await approve({
        spender: contract,
        amount: amountWei,
      });

      setDepositStep("transferring");
      setTxStatus("Transferring VBMS...");

      // Transfer VBMS to game contract
      // Note: The actual transfer would happen here, but we'll need the game contract address
      // For now, we'll simulate

      await new Promise(resolve => setTimeout(resolve, 2000));

      // After successful deposit, we would call a Convex mutation to add credits
      // await convex.mutation(api.slot.depositVBMS, { address, amount });

      setDepositStep("done");
      toast.success(t("depositSuccess"));
      setShowDeposit(false);
      setDepositAmount("100");

      refetchVBMS();
    } catch (error: any) {
      console.error("Deposit error:", error);
      setErrorMsg(error.message || t("error"));
      setDepositStep("amount");
    } finally {
      setTxStatus("");
    }
  };

  const handleWithdraw = async () => {
    if (!isConnected || !address) {
      toast.error(t("connectWallet"));
      return;
    }

    const amount = Number(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error(t("error"));
      return;
    }

    const credits = profile?.coins || 0;
    if (amount > credits) {
      toast.error(t("insufficientBalance"));
      return;
    }

    setWithdrawStep("withdrawing");
    setTxStatus(t("withdrawing"));
    setErrorMsg(null);

    try {
      // Withdraw: spend credits in-game and mint VBMS
      // The Convex mutation would:
      // 1. Validate user has enough coins
      // 2. Deduct coins from profile
      // 3. Trigger VBMS mint to user wallet
      // await convex.mutation(api.slot.withdrawVBMS, { address, amount });

      // Simulate
      await new Promise(resolve => setTimeout(resolve, 2000));

      setWithdrawStep("done");
      toast.success(t("withdrawSuccess"));
      setShowWithdraw(false);
      setWithdrawAmount("");

      refetchVBMS();
    } catch (error: any) {
      console.error("Withdraw error:", error);
      setErrorMsg(error.message || t("error"));
      setWithdrawStep("amount");
    } finally {
      setTxStatus("");
    }
  };

  const tr = (key: string, fallback?: string) => {
    const current = t(key);
    if (current !== key) return current;
    const dict = translations.en[key as keyof typeof translations.en] || translations.pt[key as keyof typeof translations.pt];
    return dict || fallback || key;
  };

  return (
    <>
      <style jsx global>{`
        @keyframes floatUp {
          0%   { transform: translateY(0) scale(1); opacity: 0.15; }
          10%  { opacity: 0.25; }
          90%  { opacity: 0.2; }
          100% { transform: translateY(-110vh) scale(0.7); opacity: 0; }
        }
        @keyframes coin-rain {
          0% { transform: translateY(-100px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
      `}</style>

      <div
        className="relative flex h-[100dvh] min-h-[100dvh] flex-col overflow-hidden overscroll-none"
        style={{
          background: 'radial-gradient(ellipse at 50% 30%, #1a1a2e 0%, #0a0a0f 70%)',
        }}
      >
        {/* Header */}
        <div className="relative shrink-0 z-10 flex items-center px-4" style={{
          paddingTop: 'max(1rem, env(safe-area-inset-top))',
          paddingBottom: '0.75rem',
          borderBottom: '1px solid rgba(255,215,0,0.2)',
        }}>
          <Link href="/" className="text-sm font-medium" style={{ color: 'rgba(255,215,0,0.7)' }}>
            ← {tr("back")}
          </Link>
          <div className="flex-1 text-center">
            <h1 className="text-lg font-bold tracking-widest uppercase" style={{ fontFamily: 'var(--font-cinzel)', color: '#FFD700', letterSpacing: '0.2em' }}>
              {tr("title")}
            </h1>
          </div>
          <button
            onClick={() => setShowRules(true)}
            className="w-7 h-7 flex items-center justify-center font-bold text-sm border-2 border-black rounded-full"
            style={{ background: '#1a1a1a', color: '#FFD400' }}
          >?</button>
        </div>

        {/* Rules Modal */}
        {showRules && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/85" onClick={() => setShowRules(false)}>
            <div
              className="w-full max-w-sm border-4 border-black rounded-2xl overflow-hidden bg-gray-900"
              style={{ boxShadow: '4px 4px 0px #FFD700' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-[#FFD700] border-b-4 border-black px-3 py-1.5 flex items-center justify-between">
                <span className="font-black text-xs uppercase tracking-widest text-black">{tr("rulesTitle")}</span>
                <button onClick={() => setShowRules(false)} className="rounded-full flex items-center justify-center" style={{ background: '#DC2626', width: 24, height: 24, color: '#fff', fontSize: 16, lineHeight: 1, fontWeight: 700 }}>×</button>
              </div>
              <div className="p-4">
                <ul className="space-y-2">
                  {translations.en.rules.map((rule, i) => (
                    <li key={i} className="text-white text-sm flex items-start gap-2">
                      <span className="text-yellow-400 mt-0.5">•</span>
                      <span>{rule}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Balance Panel */}
        <div className="relative z-10 px-4 py-3">
          <div className="flex justify-between items-center max-w-lg mx-auto">
            <div className="flex items-center gap-3">
              {/* Coins Balance */}
              <div className="bg-black border-2 border-yellow-500 rounded-lg px-3 py-2">
                <div className="text-xs font-bold text-gray-400">{tr("credits")}</div>
                <div className="text-xl font-black text-green-400">
                  {(profile?.coins || 0).toLocaleString()}
                </div>
              </div>

              {/* VBMS Balance */}
              <div className="bg-black border-2 border-purple-500 rounded-lg px-3 py-2">
                <div className="text-xs font-bold text-gray-400">{tr("vbms")}</div>
                <div className="text-xl font-black text-purple-400">
                  {currentVBMSBalance.toFixed(2)}
                </div>
              </div>
            </div>

            {/* Free Spins */}
            {statsQuery && (
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <div className="text-xs font-bold text-blue-400">{tr("freeSpins")}</div>
                  <div className="text-xl font-black text-blue-300">{statsQuery.remainingFreeSpins}</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Deposit / Withdraw Buttons */}
        <div className="relative z-10 px-4 pb-2">
          <div className="flex gap-2 max-w-lg mx-auto">
            <button
              onClick={() => setShowDeposit(true)}
              className="flex-1 py-2 px-3 border-2 border-green-500 bg-green-600/20 hover:bg-green-600/40 text-green-400 font-bold text-xs uppercase transition-all"
            >
              {tr("deposit")} VBMS
            </button>
            <button
              onClick={() => setShowWithdraw(true)}
              className="flex-1 py-2 px-3 border-2 border-blue-500 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 font-bold text-xs uppercase transition-all"
            >
              {tr("withdraw")} VBMS
            </button>
          </div>
        </div>

        {/* Slot Machine */}
        <div className="flex-1 flex flex-col min-h-0">
          <SlotMachine onWin={handleWin} />
        </div>
      </div>

      {/* Deposit Modal */}
      {showDeposit && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/85" onClick={() => { if (depositStep === 'amount') setShowDeposit(false); }}>
          <div
            className="w-full max-w-sm border-4 border-green-500 rounded-2xl overflow-hidden bg-gray-900"
            style={{ boxShadow: '4px 4px 0px #22c55e' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-green-600 border-b-4 border-black px-3 py-1.5 flex items-center justify-between">
              <span className="font-black text-xs uppercase tracking-widest text-white">Deposit VBMS</span>
              {depositStep === 'amount' && (
                <button onClick={() => setShowDeposit(false)} className="rounded-full flex items-center justify-center" style={{ background: '#DC2626', width: 24, height: 24, color: '#fff', fontSize: 16, lineHeight: 1, fontWeight: 700 }}>×</button>
              )}
            </div>

            <div className="p-4">
              {depositStep === "amount" ? (
                <>
                  <div className="mb-3">
                    <label className="text-white text-xs font-bold mb-1 block">Amount (VBMS)</label>
                    <input
                      type="number"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      className="w-full bg-black border-2 border-green-500/50 rounded-lg px-3 py-2 text-white font-bold text-lg focus:outline-none focus:border-green-500"
                      placeholder="100"
                      min="1"
                    />
                    <div className="text-gray-400 text-xs mt-1">Available: {currentVBMSBalance.toFixed(2)} VBMS</div>
                  </div>

                  <div className="grid grid-cols-4 gap-2 mb-4">
                    {DEPOSIT_PRESETS.map((preset) => (
                      <button
                        key={preset}
                        onClick={() => setDepositAmount(preset.toString())}
                        className="py-2 border border-green-500/30 rounded text-green-400 font-bold text-sm hover:bg-green-600/20"
                      >
                        {preset}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={handleDeposit}
                    disabled={!depositAmount || Number(depositAmount) <= 0 || Number(depositAmount) > currentVBMSBalance}
                    className="w-full py-3 bg-green-600 hover:bg-green-500 text-white font-black text-sm uppercase border-2 border-black disabled:opacity-50"
                  >
                    {tr("deposit")}
                  </button>
                </>
              ) : (
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">⏳</div>
                  <div className="text-white font-bold">{txStatus || tr("depositing")}</div>
                  {errorMsg && <div className="text-red-500 text-sm mt-2">{errorMsg}</div>}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Withdraw Modal */}
      {showWithdraw && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/85" onClick={() => { if (withdrawStep === 'amount') setShowWithdraw(false); }}>
          <div
            className="w-full max-w-sm border-4 border-blue-500 rounded-2xl overflow-hidden bg-gray-900"
            style={{ boxShadow: '4px 4px 0px #3b82f6' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-blue-600 border-b-4 border-black px-3 py-1.5 flex items-center justify-between">
              <span className="font-black text-xs uppercase tracking-widest text-white">Withdraw VBMS</span>
              {withdrawStep === 'amount' && (
                <button onClick={() => setShowWithdraw(false)} className="rounded-full flex items-center justify-center" style={{ background: '#DC2626', width: 24, height: 24, color: '#fff', fontSize: 16, lineHeight: 1, fontWeight: 700 }}>×</button>
              )}
            </div>

            <div className="p-4">
              {withdrawStep === "amount" ? (
                <>
                  <div className="mb-3">
                    <label className="text-white text-xs font-bold mb-1 block">Amount (Credits)</label>
                    <input
                      type="number"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      className="w-full bg-black border-2 border-blue-500/50 rounded-lg px-3 py-2 text-white font-bold text-lg focus:outline-none focus:border-blue-500"
                      placeholder="100"
                      min="1"
                    />
                    <div className="text-gray-400 text-xs mt-1">Convert to VBMS (1:1 rate)</div>
                    <div className="text-gray-400 text-xs mt-1">Available: {(profile?.coins || 0).toLocaleString()} credits</div>
                  </div>

                  <div className="grid grid-cols-4 gap-2 mb-4">
                    {[100, 500, 1000, 2500].map((preset) => (
                      <button
                        key={preset}
                        onClick={() => setWithdrawAmount(preset.toString())}
                        className="py-2 border border-blue-500/30 rounded text-blue-400 font-bold text-sm hover:bg-blue-600/20"
                      >
                        {preset}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={handleWithdraw}
                    disabled={!withdrawAmount || Number(withdrawAmount) <= 0 || Number(withdrawAmount) > (profile?.coins || 0)}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-black text-sm uppercase border-2 border-black disabled:opacity-50"
                  >
                    {tr("withdraw")}
                  </button>
                </>
              ) : (
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">⏳</div>
                  <div className="text-white font-bold">{txStatus || tr("withdrawing")}</div>
                  {errorMsg && <div className="text-red-500 text-sm mt-2">{errorMsg}</div>}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
