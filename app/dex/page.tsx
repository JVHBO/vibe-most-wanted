"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAccount, useBalance } from "wagmi";
import { formatEther } from "viem";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  useMintPrice,
  useVBMSBalance,
  useBuyVBMS,
  useSellVBMS,
  useQuoteSellVBMS,
  BuyStep,
  SellStep,
} from "@/lib/hooks/useVBMSDex";

type SwapMode = "buy" | "sell";

// DEX-specific translations (6 languages)
const dexTranslations = {
  en: {
    title: "DEX",
    infoBanner: "Buy and sell VBMS tokens directly via bonding curve.",
    packInfo: "1 pack = 100,000 VBMS | Current price:",
    ethPerPack: "ETH/pack",
    buyVbms: "BUY VBMS",
    sellVbms: "SELL VBMS",
    youBuy: "Packs to buy",
    youPay: "You pay",
    youSell: "You sell (VBMS)",
    youReceive: "You receive",
    packCount: "pack(s)",
    realQuote: "Real bonding curve quote",
    minting: "Minting pack...",
    waitingMint: "Waiting mint...",
    selling: "Selling...",
    waitingSell: "Waiting sale...",
    complete: "Complete!",
    swapSuccess: "Swap completed successfully!",
    processing: "Processing...",
    buy: "Buy",
    sell: "Sell",
    howItWorks: "How it works?",
    buyStep1: "1. Select number of packs to buy",
    buyStep2: "2. Each pack gives you ~100k VBMS tokens",
    buyStep3: "3. Packs are auto-converted to VBMS",
    sellStep1: "1. Direct sale on bonding curve (any amount!)",
    sellStep2: "2. Single transaction - simple and fast",
    sellStep3: "3. ETH sent directly to your wallet",
    ethBalance: "ETH Balance",
    vbmsBalance: "VBMS Balance",
    packs: "packs",
    insufficientEth: "Insufficient ETH",
    balance: "Balance",
    connectWallet: "Connect your Wallet",
    back: "Back",
    // Zazza credits
    zazzaCredit: "Built with help from",
    zazzaMiniapp: "Poorly Drawn Binders",
    zazzaDescription: "Buy, list, and trade tokens from any Vibechain collection",
    viewMiniapp: "Open Miniapp",
  },
  "pt-BR": {
    title: "DEX",
    infoBanner: "Compre e venda VBMS tokens diretamente via bonding curve.",
    packInfo: "1 pack = 100,000 VBMS | Preço atual:",
    ethPerPack: "ETH/pack",
    buyVbms: "COMPRAR VBMS",
    sellVbms: "VENDER VBMS",
    youBuy: "Packs para comprar",
    youPay: "Você paga",
    youSell: "Você vende (VBMS)",
    youReceive: "Você recebe",
    packCount: "pack(s)",
    realQuote: "Cotação real da bonding curve",
    minting: "Mintando pack...",
    waitingMint: "Aguardando mint...",
    selling: "Vendendo...",
    waitingSell: "Aguardando venda...",
    complete: "Concluído!",
    swapSuccess: "Swap concluído com sucesso!",
    processing: "Processando...",
    buy: "Comprar",
    sell: "Vender",
    howItWorks: "Como funciona?",
    buyStep1: "1. Selecione quantos packs quer comprar",
    buyStep2: "2. Cada pack te dá ~100k VBMS tokens",
    buyStep3: "3. Packs são auto-convertidos em VBMS",
    sellStep1: "1. Venda direta na bonding curve (qualquer quantidade!)",
    sellStep2: "2. Uma única transação - simples e rápido",
    sellStep3: "3. ETH enviado direto para sua wallet",
    ethBalance: "Saldo ETH",
    vbmsBalance: "Saldo VBMS",
    packs: "packs",
    insufficientEth: "ETH insuficiente",
    balance: "Saldo",
    connectWallet: "Conecte sua Wallet",
    back: "Voltar",
    // Zazza credits
    zazzaCredit: "Construído com ajuda de",
    zazzaMiniapp: "Poorly Drawn Binders",
    zazzaDescription: "Compre, liste e negocie tokens de qualquer coleção da Vibechain",
    viewMiniapp: "Abrir Miniapp",
  },
  es: {
    title: "DEX",
    infoBanner: "Compra y vende tokens VBMS directamente via bonding curve.",
    packInfo: "1 pack = 100,000 VBMS | Precio actual:",
    ethPerPack: "ETH/pack",
    buyVbms: "COMPRAR VBMS",
    sellVbms: "VENDER VBMS",
    youBuy: "Packs a comprar",
    youPay: "Pagas",
    youSell: "Vendes (VBMS)",
    youReceive: "Recibes",
    packCount: "pack(s)",
    realQuote: "Cotización real de bonding curve",
    minting: "Minteando pack...",
    waitingMint: "Esperando mint...",
    selling: "Vendiendo...",
    waitingSell: "Esperando venta...",
    complete: "¡Completado!",
    swapSuccess: "¡Swap completado con éxito!",
    processing: "Procesando...",
    buy: "Comprar",
    sell: "Vender",
    howItWorks: "¿Cómo funciona?",
    buyStep1: "1. Selecciona cuántos packs quieres comprar",
    buyStep2: "2. Cada pack te da ~100k tokens VBMS",
    buyStep3: "3. Los packs se auto-convierten en VBMS",
    sellStep1: "1. Venta directa en bonding curve (¡cualquier cantidad!)",
    sellStep2: "2. Una sola transacción - simple y rápido",
    sellStep3: "3. ETH enviado directamente a tu wallet",
    ethBalance: "Saldo ETH",
    vbmsBalance: "Saldo VBMS",
    packs: "packs",
    insufficientEth: "ETH insuficiente",
    balance: "Saldo",
    connectWallet: "Conecta tu Wallet",
    back: "Volver",
    // Zazza credits
    zazzaCredit: "Construido con ayuda de",
    zazzaMiniapp: "Poorly Drawn Binders",
    zazzaDescription: "Compra, lista e intercambia tokens de cualquier colección de Vibechain",
    viewMiniapp: "Abrir Miniapp",
  },
  hi: {
    title: "DEX",
    infoBanner: "बॉन्डिंग कर्व के माध्यम से सीधे VBMS टोकन खरीदें और बेचें।",
    packInfo: "1 पैक = 100,000 VBMS | वर्तमान मूल्य:",
    ethPerPack: "ETH/पैक",
    buyVbms: "VBMS खरीदें",
    sellVbms: "VBMS बेचें",
    youBuy: "खरीदने के लिए पैक",
    youPay: "आप भुगतान करें",
    youSell: "आप बेचें (VBMS)",
    youReceive: "आप प्राप्त करें",
    packCount: "पैक",
    realQuote: "बॉन्डिंग कर्व की वास्तविक कोटेशन",
    minting: "पैक मिंट हो रहा है...",
    waitingMint: "मिंट की प्रतीक्षा...",
    selling: "बेच रहे हैं...",
    waitingSell: "बिक्री की प्रतीक्षा...",
    complete: "पूर्ण!",
    swapSuccess: "स्वैप सफलतापूर्वक पूर्ण!",
    processing: "प्रोसेसिंग...",
    buy: "खरीदें",
    sell: "बेचें",
    howItWorks: "यह कैसे काम करता है?",
    buyStep1: "1. कितने पैक खरीदने हैं चुनें",
    buyStep2: "2. प्रत्येक पैक आपको ~100k VBMS टोकन देता है",
    buyStep3: "3. पैक स्वचालित रूप से VBMS में परिवर्तित हो जाते हैं",
    sellStep1: "1. बॉन्डिंग कर्व पर सीधी बिक्री (कोई भी राशि!)",
    sellStep2: "2. एक ही लेनदेन - सरल और तेज़",
    sellStep3: "3. ETH सीधे आपके वॉलेट में भेजा जाता है",
    ethBalance: "ETH शेष",
    vbmsBalance: "VBMS शेष",
    packs: "पैक",
    insufficientEth: "अपर्याप्त ETH",
    balance: "शेष",
    connectWallet: "अपना वॉलेट कनेक्ट करें",
    back: "वापस",
    // Zazza credits
    zazzaCredit: "की मदद से बनाया गया",
    zazzaMiniapp: "Poorly Drawn Binders",
    zazzaDescription: "किसी भी Vibechain संग्रह से टोकन खरीदें, सूचीबद्ध करें और व्यापार करें",
    viewMiniapp: "मिनीऐप खोलें",
  },
  ru: {
    title: "DEX",
    infoBanner: "Покупайте и продавайте токены VBMS напрямую через bonding curve.",
    packInfo: "1 пак = 100,000 VBMS | Текущая цена:",
    ethPerPack: "ETH/пак",
    buyVbms: "КУПИТЬ VBMS",
    sellVbms: "ПРОДАТЬ VBMS",
    youBuy: "Паков к покупке",
    youPay: "Вы платите",
    youSell: "Вы продаете (VBMS)",
    youReceive: "Вы получаете",
    packCount: "пак(ов)",
    realQuote: "Реальная котировка bonding curve",
    minting: "Минтинг пака...",
    waitingMint: "Ожидание минта...",
    selling: "Продажа...",
    waitingSell: "Ожидание продажи...",
    complete: "Готово!",
    swapSuccess: "Свап успешно завершен!",
    processing: "Обработка...",
    buy: "Купить",
    sell: "Продать",
    howItWorks: "Как это работает?",
    buyStep1: "1. Выберите количество паков для покупки",
    buyStep2: "2. Каждый пак дает вам ~100k токенов VBMS",
    buyStep3: "3. Паки автоматически конвертируются в VBMS",
    sellStep1: "1. Прямая продажа на bonding curve (любая сумма!)",
    sellStep2: "2. Одна транзакция - просто и быстро",
    sellStep3: "3. ETH отправляется прямо на ваш кошелек",
    ethBalance: "Баланс ETH",
    vbmsBalance: "Баланс VBMS",
    packs: "паков",
    insufficientEth: "Недостаточно ETH",
    balance: "Баланс",
    connectWallet: "Подключите кошелек",
    back: "Назад",
    // Zazza credits
    zazzaCredit: "Создано при помощи",
    zazzaMiniapp: "Poorly Drawn Binders",
    zazzaDescription: "Покупайте, размещайте и торгуйте токенами из любой коллекции Vibechain",
    viewMiniapp: "Открыть мини-приложение",
  },
  "zh-CN": {
    title: "DEX",
    infoBanner: "通过联合曲线直接买卖 VBMS 代币。",
    packInfo: "1 包 = 100,000 VBMS | 当前价格:",
    ethPerPack: "ETH/包",
    buyVbms: "购买 VBMS",
    sellVbms: "出售 VBMS",
    youBuy: "要购买的包数",
    youPay: "您支付",
    youSell: "您出售 (VBMS)",
    youReceive: "您收到",
    packCount: "包",
    realQuote: "联合曲线实时报价",
    minting: "正在铸造包...",
    waitingMint: "等待铸造...",
    selling: "出售中...",
    waitingSell: "等待出售...",
    complete: "完成!",
    swapSuccess: "交换成功完成!",
    processing: "处理中...",
    buy: "购买",
    sell: "出售",
    howItWorks: "如何运作?",
    buyStep1: "1. 选择要购买的包数",
    buyStep2: "2. 每个包给您约 100k VBMS 代币",
    buyStep3: "3. 包自动转换为 VBMS",
    sellStep1: "1. 在联合曲线上直接出售(任意数量!)",
    sellStep2: "2. 单笔交易 - 简单快捷",
    sellStep3: "3. ETH 直接发送到您的钱包",
    ethBalance: "ETH 余额",
    vbmsBalance: "VBMS 余额",
    packs: "包",
    insufficientEth: "ETH 不足",
    balance: "余额",
    connectWallet: "连接您的钱包",
    back: "返回",
    // Zazza credits
    zazzaCredit: "在以下帮助下构建",
    zazzaMiniapp: "Poorly Drawn Binders",
    zazzaDescription: "购买、上架和交易任何 Vibechain 收藏的代币",
    viewMiniapp: "打开迷你应用",
  },
};

type DexLang = keyof typeof dexTranslations;

// Language display names and flags
const languageOptions: { code: DexLang; flag: string; name: string }[] = [
  { code: "en", flag: "🇺🇸", name: "EN" },
  { code: "pt-BR", flag: "🇧🇷", name: "PT" },
  { code: "es", flag: "🇪🇸", name: "ES" },
  { code: "hi", flag: "🇮🇳", name: "HI" },
  { code: "ru", flag: "🇷🇺", name: "RU" },
  { code: "zh-CN", flag: "🇨🇳", name: "ZH" },
];

export default function DexPage() {
  const { address, isConnected } = useAccount();
  const { data: ethBalance } = useBalance({ address });

  // Use global language context
  const { lang: globalLang, setLang: setGlobalLang } = useLanguage();

  // Map global lang to DEX lang (handle unsupported languages)
  const lang = (globalLang in dexTranslations ? globalLang : "en") as DexLang;
  const t = dexTranslations[lang];

  // Swap state
  const [mode, setMode] = useState<SwapMode>("sell");
  const [packCount, setPackCount] = useState(1);
  const [sellAmount, setSellAmount] = useState("");

  // Language dropdown state
  const [showLangDropdown, setShowLangDropdown] = useState(false);


  const handleBuyClick = () => {
    setMode("buy");
    setPackCount(1);
    resetBuy();
  };


  // Price info for selected pack count
  const { priceWei, priceEth, isLoading: priceLoading, refetch: refetchPrice } = useMintPrice(packCount);
  const { priceEth: pricePerPack } = useMintPrice(1);
  const { balance: vbmsBalance, refetch: refetchVBMS } = useVBMSBalance(address);

  // Buy hook
  const {
    buyVBMS,
    step: buyStep,
    error: buyError,
    isLoading: buyLoading,
    reset: resetBuy,
  } = useBuyVBMS();

  // Sell hook
  const {
    sellVBMS,
    step: sellStep,
    error: sellError,
    isLoading: sellLoading,
    reset: resetSell,
  } = useSellVBMS();

  // Sell quote
  const sellQuote = useQuoteSellVBMS(mode === "sell" ? sellAmount : "0");

  // Refresh balances after swap
  const refreshBalances = useCallback(() => {
    refetchPrice();
    refetchVBMS();
  }, [refetchPrice, refetchVBMS]);

  useEffect(() => {
    if (buyStep === "complete" || sellStep === "complete") {
      refreshBalances();
    }
  }, [buyStep, sellStep, refreshBalances]);

  // Check if user has enough ETH
  const hasEnoughEth = ethBalance && priceWei
    ? BigInt(ethBalance.value) >= priceWei
    : false;

  // Handle swap
  const handleSwap = async () => {
    try {
      if (mode === "buy") {
        if (!priceWei || packCount < 1) return;
        await buyVBMS(packCount, priceWei);
      } else {
        if (!sellAmount || parseFloat(sellAmount) <= 0) return;
        await sellVBMS(sellAmount);
      }
    } catch (err) {
      console.error("Swap failed:", err);
    }
  };

  // Get step message
  const getStepMessage = (step: BuyStep | SellStep): string => {
    const messages: Record<string, string> = {
      idle: "",
      minting: t.minting,
      waiting_mint: t.waitingMint,
      selling: t.selling,
      waiting_sell: t.waitingSell,
      complete: t.complete,
      error: "Error!",
    };
    return messages[step] || "";
  };

  const currentStep = mode === "buy" ? buyStep : sellStep;
  const currentError = mode === "buy" ? buyError : sellError;
  const isLoading = mode === "buy" ? buyLoading : sellLoading;

  // Estimated VBMS for packs (100k per pack)
  const estimatedVBMS = packCount * 100000;

  // Current language option
  const currentLangOption = languageOptions.find((l) => l.code === lang) || languageOptions[0];

  return (
    <div className="min-h-screen bg-vintage-deep-black text-vintage-ice">
      {/* Header */}
      <div className="bg-gradient-to-r from-vintage-gold/20 to-vintage-orange/20 border-b-2 border-vintage-gold/50 p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-vintage-gold hover:text-vintage-orange transition">
            &larr; {t.back}
          </Link>
          <h1 className="text-2xl font-display font-bold text-vintage-gold">
            {t.title}
          </h1>
          {/* Language Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowLangDropdown(!showLangDropdown)}
              className="flex items-center gap-2 bg-vintage-charcoal/80 px-3 py-1.5 rounded-lg border border-vintage-gold/30 hover:border-vintage-gold/60 transition"
            >
              <span className="text-lg">{currentLangOption.flag}</span>
              <span className="text-sm text-vintage-gold">{currentLangOption.name}</span>
              <svg className="w-4 h-4 text-vintage-gold/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showLangDropdown && (
              <div className="absolute right-0 mt-2 bg-vintage-charcoal border border-vintage-gold/30 rounded-lg shadow-lg z-50 overflow-hidden">
                {languageOptions.map((option) => (
                  <button
                    key={option.code}
                    onClick={() => {
                      setGlobalLang(option.code as any);
                      setShowLangDropdown(false);
                    }}
                    className={`w-full flex items-center gap-2 px-4 py-2 hover:bg-vintage-gold/20 transition ${
                      lang === option.code ? "bg-vintage-gold/10" : ""
                    }`}
                  >
                    <span className="text-lg">{option.flag}</span>
                    <span className="text-sm text-vintage-ice">{option.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-6">
        {/* Info Banner */}
        <div className="bg-vintage-charcoal/80 rounded-xl border border-vintage-gold/30 p-4 mb-6">
          <p className="text-vintage-burnt-gold text-sm text-center">
            {t.infoBanner}
            <br />
            <span className="text-vintage-gold/60 text-xs">
              {t.packInfo} ~{pricePerPack || "..."} {t.ethPerPack}
            </span>
          </p>
        </div>

        {/* Swap Card */}
        <div className="bg-vintage-charcoal/80 backdrop-blur-lg rounded-2xl border-2 border-vintage-gold/30 shadow-gold overflow-hidden">
          {/* Mode Toggle */}
          <div className="flex border-b border-vintage-gold/30">
            <button
              onClick={handleBuyClick}
              className={`flex-1 py-4 font-modern font-bold transition-all ${
                mode === "buy"
                  ? "bg-green-500/20 text-green-400 border-b-2 border-green-400"
                  : "text-vintage-burnt-gold/60 hover:text-vintage-burnt-gold"
              }`}
            >
              {t.buyVbms}
            </button>
            <button
              onClick={() => {
                setMode("sell");
                setSellAmount("");
                resetSell();
              }}
              className={`flex-1 py-4 font-modern font-bold transition-all ${
                mode === "sell"
                  ? "bg-red-500/20 text-red-400 border-b-2 border-red-400"
                  : "text-vintage-burnt-gold/60 hover:text-vintage-burnt-gold"
              }`}
            >
              {t.sellVbms}
            </button>
          </div>

          <div className="p-6 space-y-6">
            {mode === "buy" ? (
              <>
                {/* Pack Selection for Buy */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-vintage-burnt-gold">{t.youBuy}</span>
                    <span className="text-vintage-gold/60">
                      {t.balance}: {parseFloat(ethBalance?.formatted || "0").toFixed(4)} ETH
                    </span>
                  </div>
                  <div className="bg-vintage-deep-black rounded-xl p-4 border border-vintage-gold/20">
                    <div className="flex items-center justify-between gap-4">
                      <button
                        onClick={() => setPackCount(Math.max(1, packCount - 1))}
                        disabled={isLoading || packCount <= 1}
                        className="w-12 h-12 rounded-xl bg-vintage-gold/20 text-vintage-gold text-2xl font-bold hover:bg-vintage-gold/30 disabled:opacity-50 disabled:cursor-not-allowed transition"
                      >
                        -
                      </button>
                      <div className="flex-1 text-center">
                        <span className="text-4xl text-vintage-ice font-mono font-bold">
                          {packCount}
                        </span>
                        <span className="text-vintage-gold ml-2">{t.packs}</span>
                      </div>
                      <button
                        onClick={() => setPackCount(packCount + 1)}
                        disabled={isLoading}
                        className="w-12 h-12 rounded-xl bg-vintage-gold/20 text-vintage-gold text-2xl font-bold hover:bg-vintage-gold/30 disabled:opacity-50 disabled:cursor-not-allowed transition"
                      >
                        +
                      </button>
                    </div>
                    {/* Quick pack buttons */}
                    <div className="flex gap-2 mt-4">
                      {[1, 2, 5, 10].map((n) => (
                        <QuickButton
                          key={n}
                          label={`${n}`}
                          onClick={() => setPackCount(n)}
                          active={packCount === n}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Cost display */}
                <div className="bg-vintage-deep-black/50 rounded-xl p-4 border border-vintage-gold/10">
                  <div className="flex justify-between items-center">
                    <span className="text-vintage-burnt-gold text-sm">{t.youPay}:</span>
                    <span className="text-vintage-gold text-xl font-mono font-bold">
                      {priceLoading ? "..." : priceEth} ETH
                    </span>
                  </div>
                  {!hasEnoughEth && isConnected && (
                    <p className="text-red-400 text-xs mt-2 text-right">{t.insufficientEth}</p>
                  )}
                </div>

                {/* Arrow */}
                <div className="flex justify-center">
                  <div className="bg-vintage-gold/20 rounded-full p-3 border border-vintage-gold/30">
                    <svg className="w-6 h-6 text-vintage-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                  </div>
                </div>

                {/* Output Section */}
                <div className="space-y-2">
                  <span className="text-vintage-burnt-gold text-sm">{t.youReceive} (VBMS)</span>
                  <div className="bg-vintage-deep-black rounded-xl p-4 border border-vintage-gold/20">
                    <div className="flex items-center gap-4">
                      <span className="flex-1 text-3xl text-vintage-gold font-mono">
                        ~{estimatedVBMS.toLocaleString()}
                      </span>
                      <span className="text-vintage-gold font-bold">VBMS</span>
                    </div>
                    <p className="text-vintage-gold/40 text-xs mt-2">
                      {packCount} {t.packCount} = ~{estimatedVBMS.toLocaleString()} VBMS
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Sell Input */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-vintage-burnt-gold">{t.youSell}</span>
                    <span className="text-vintage-gold/60">
                      {t.balance}: {parseFloat(vbmsBalance).toLocaleString()} VBMS
                    </span>
                  </div>
                  <div className="bg-vintage-deep-black rounded-xl p-4 border border-vintage-gold/20">
                    <div className="flex items-center gap-4">
                      <input
                        type="number"
                        value={sellAmount}
                        onChange={(e) => setSellAmount(e.target.value)}
                        placeholder="0"
                        className="flex-1 bg-transparent text-3xl text-vintage-ice outline-none font-mono"
                        disabled={isLoading}
                      />
                      <span className="text-vintage-gold font-bold">VBMS</span>
                    </div>
                    {/* Quick amounts */}
                    <div className="flex gap-2 mt-3">
                      <QuickButton label="100k" onClick={() => setSellAmount("100000")} />
                      <QuickButton label="500k" onClick={() => setSellAmount("500000")} />
                      <QuickButton label="1M" onClick={() => setSellAmount("1000000")} />
                      <QuickButton label="MAX" onClick={() => setSellAmount(vbmsBalance)} />
                    </div>
                  </div>
                </div>

                {/* Arrow */}
                <div className="flex justify-center">
                  <div className="bg-vintage-gold/20 rounded-full p-3 border border-vintage-gold/30">
                    <svg className="w-6 h-6 text-vintage-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                  </div>
                </div>

                {/* Output Section */}
                <div className="space-y-2">
                  <span className="text-vintage-burnt-gold text-sm">{t.youReceive} (ETH)</span>
                  <div className="bg-vintage-deep-black rounded-xl p-4 border border-vintage-gold/20">
                    <div className="flex items-center gap-4">
                      <span className="flex-1 text-3xl text-vintage-gold font-mono">
                        {parseFloat(sellQuote.estimatedEth) > 0
                          ? `~${parseFloat(sellQuote.estimatedEth).toFixed(6)}`
                          : "0"}
                      </span>
                      <span className="text-vintage-gold font-bold">ETH</span>
                    </div>
                    <p className="text-vintage-gold/40 text-xs mt-2">{t.realQuote}</p>
                  </div>
                </div>
              </>
            )}

            {/* Status */}
            {currentStep !== "idle" && currentStep !== "complete" && (
              <div className="bg-vintage-gold/10 rounded-lg p-3 text-center">
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-spin w-4 h-4 border-2 border-vintage-gold border-t-transparent rounded-full"></div>
                  <span className="text-vintage-gold text-sm">{getStepMessage(currentStep)}</span>
                </div>
              </div>
            )}

            {currentStep === "complete" && (
              <div className="bg-green-500/20 rounded-lg p-3 text-center">
                <span className="text-green-400">{t.swapSuccess}</span>
              </div>
            )}

            {currentError && (
              <div className="bg-red-500/20 rounded-lg p-3 text-center">
                <span className="text-red-400 text-sm">{currentError}</span>
              </div>
            )}

            {/* Swap Button */}
            {!isConnected ? (
              <button
                disabled
                className="w-full py-4 rounded-xl font-modern font-bold text-lg bg-vintage-charcoal text-vintage-burnt-gold cursor-not-allowed"
              >
                {t.connectWallet}
              </button>
            ) : (
              <button
                onClick={handleSwap}
                disabled={
                  isLoading ||
                  (mode === "buy" && (!hasEnoughEth || packCount < 1)) ||
                  (mode === "sell" && (!sellAmount || parseFloat(sellAmount) <= 0))
                }
                className={`w-full py-4 rounded-xl font-modern font-bold text-lg transition-all ${
                  isLoading
                    ? "bg-vintage-charcoal text-vintage-burnt-gold cursor-wait"
                    : mode === "buy"
                    ? "bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-400 hover:to-green-500 hover:scale-[1.02]"
                    : "bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-400 hover:to-red-500 hover:scale-[1.02]"
                } disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100`}
              >
                {isLoading
                  ? t.processing
                  : mode === "buy"
                  ? `${t.buy} ${packCount} ${t.packs} (~${estimatedVBMS.toLocaleString()} VBMS)`
                  : `${t.sell} ${parseFloat(sellAmount || "0").toLocaleString()} VBMS`}
              </button>
            )}
          </div>
        </div>

        {/* How it works */}
        <div className="mt-6 bg-vintage-charcoal/50 rounded-xl border border-vintage-gold/20 p-4">
          <h3 className="text-vintage-gold font-bold mb-3">{t.howItWorks}</h3>
          <div className="space-y-2 text-sm text-vintage-burnt-gold">
            {mode === "buy" ? (
              <>
                <p>{t.buyStep1}</p>
                <p>{t.buyStep2}</p>
                <p>{t.buyStep3}</p>
              </>
            ) : (
              <>
                <p>{t.sellStep1}</p>
                <p>{t.sellStep2}</p>
                <p>{t.sellStep3}</p>
              </>
            )}
          </div>
        </div>

        {/* Your Balances */}
        {isConnected && (
          <div className="mt-6 grid grid-cols-2 gap-4">
            <div className="bg-vintage-charcoal/50 rounded-xl border border-vintage-gold/20 p-4 text-center">
              <p className="text-vintage-burnt-gold text-sm">{t.ethBalance}</p>
              <p className="text-vintage-gold text-xl font-bold font-mono">
                {parseFloat(ethBalance?.formatted || "0").toFixed(4)}
              </p>
            </div>
            <div className="bg-vintage-charcoal/50 rounded-xl border border-vintage-gold/20 p-4 text-center">
              <p className="text-vintage-burnt-gold text-sm">{t.vbmsBalance}</p>
              <p className="text-vintage-gold text-xl font-bold font-mono">
                {parseFloat(vbmsBalance).toLocaleString()}
              </p>
            </div>
          </div>
        )}

        {/* Zazza Credits */}
        <div className="mt-6 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-xl border border-purple-500/30 p-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-purple-300 text-sm">
                {t.zazzaCredit}{" "}
                <a
                  href="https://farcaster.xyz/zazza"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-400 hover:text-purple-300 font-bold underline"
                >
                  @zazza
                </a>
              </p>
              <p className="text-purple-200/60 text-xs mt-1">{t.zazzaDescription}</p>
            </div>
            <a
              href="https://farcaster.xyz/miniapps/Eq4-Pg-zw9fX/poorly-drawn-binders"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/50 rounded-lg px-3 py-2 text-purple-300 text-sm font-medium transition flex items-center gap-2"
            >
              <span>{t.viewMiniapp}</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        </div>
      </div>

    </div>
  );
}

function QuickButton({
  label,
  onClick,
  active,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 text-xs py-1.5 px-2 rounded border transition ${
        active
          ? "bg-vintage-gold/30 text-vintage-gold border-vintage-gold/60"
          : "bg-vintage-gold/10 text-vintage-gold border-vintage-gold/20 hover:border-vintage-gold/50 hover:bg-vintage-gold/20"
      }`}
    >
      {label}
    </button>
  );
}
