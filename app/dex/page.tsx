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
import { useVBMSMarketCap } from "@/lib/hooks/useVBMSMarketCap";
import { useBondingProgress } from "@/lib/hooks/useBondingProgress";
import { sdk } from "@farcaster/miniapp-sdk";
import { isMiniappMode } from "@/lib/utils/miniapp";
import { openMarketplace } from "@/lib/marketplace-utils";

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
    // Fees
    feeBreakdown: "Fee Breakdown",
    buyFee: "Buy: ~3.75%",
    sellFee: "Sell: ~7%",
    totalFee: "Total: ~10.5%",
    protocolNote: "Fees built into bonding curve pricing",
    // Buy Warning Modal
    buyWarningTitle: "How Buy Works",
    buyWarningText1: "When you buy VBMS, the following happens automatically:",
    buyWarningStep1: "1. Purchase pack(s) from vibe.market bonding curve",
    buyWarningStep2: "2. Pack is sold (closed) and converted to VBMS tokens",
    buyWarningStep3: "3. VBMS tokens are sent to your wallet",
    buyWarningNote: "This is all done in a single transaction via our router contract.",
    buyWarningFees: "Fees: ~3.75% on purchase (built into bonding curve price)",
    buyWarningConfirm: "I Understand, Proceed",
    buyWarningCancel: "Cancel",
    // Zazza credits
    zazzaCredit: "Built with help from",
    zazzaMiniapp: "Poorly Drawn Binders",
    zazzaDescription: "Buy, list, and trade tokens from any Vibechain collection",
    viewMiniapp: "Open Miniapp",
    // Bonding Info Modal
    bondingInfoTitle: "What is VBMS?",
    bondingInfoDesc1: "VBMS is the native token of Vibe Most Wanted, a collectible card game on Base.",
    bondingInfoDesc2: "The token uses a bonding curve mechanism where price increases as more tokens are bought.",
    bondingInfoPhase1: "Bonding Phase",
    bondingInfoPhase1Desc: "Currently active. Buy/sell directly on the curve. Price adjusts automatically.",
    bondingInfoPhase2: "Uniswap Phase",
    bondingInfoPhase2Desc: "When $10k ETH is reached, liquidity moves to Uniswap for open trading.",
    bondingInfoTarget: "Target: $10,000 USD in ETH",
    bondingInfoLearnMore: "Learn more about market phases",
    bondingInfoClose: "Got it!",
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
    // Fees
    feeBreakdown: "Taxas",
    buyFee: "Compra: ~3.75%",
    sellFee: "Venda: ~7%",
    totalFee: "Total: ~10.5%",
    protocolNote: "Taxas embutidas no preço da bonding curve",
    // Buy Warning Modal
    buyWarningTitle: "Como Funciona a Compra",
    buyWarningText1: "Quando você compra VBMS, acontece automaticamente:",
    buyWarningStep1: "1. Compra pack(s) da bonding curve do vibe.market",
    buyWarningStep2: "2. Pack é vendido (fechado) e convertido em tokens VBMS",
    buyWarningStep3: "3. Tokens VBMS são enviados para sua carteira",
    buyWarningNote: "Tudo isso é feito em uma única transação via nosso contrato router.",
    buyWarningFees: "Taxas: ~3.75% na compra (embutido no preço da bonding curve)",
    buyWarningConfirm: "Entendi, Continuar",
    buyWarningCancel: "Cancelar",
    // Zazza credits
    zazzaCredit: "Construído com ajuda de",
    zazzaMiniapp: "Poorly Drawn Binders",
    zazzaDescription: "Compre, liste e negocie tokens de qualquer coleção da Vibechain",
    viewMiniapp: "Abrir Miniapp",
    // Bonding Info Modal
    bondingInfoTitle: "O que é VBMS?",
    bondingInfoDesc1: "VBMS é o token nativo do Vibe Most Wanted, um jogo de cartas colecionáveis na Base.",
    bondingInfoDesc2: "O token usa um mecanismo de bonding curve onde o preço aumenta conforme mais tokens são comprados.",
    bondingInfoPhase1: "Fase Bonding",
    bondingInfoPhase1Desc: "Atualmente ativa. Compre/venda diretamente na curva. Preço ajusta automaticamente.",
    bondingInfoPhase2: "Fase Uniswap",
    bondingInfoPhase2Desc: "Quando $10k ETH for atingido, a liquidez vai para a Uniswap para trading aberto.",
    bondingInfoTarget: "Meta: $10,000 USD em ETH",
    bondingInfoLearnMore: "Saiba mais sobre as fases do mercado",
    bondingInfoClose: "Entendi!",
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
    // Fees
    feeBreakdown: "Desglose de tarifas",
    buyFee: "Compra: ~3.75%",
    sellFee: "Venta: ~7%",
    totalFee: "Total: ~10.5%",
    protocolNote: "Tarifas incluidas en el precio de la bonding curve",
    // Buy Warning Modal
    buyWarningTitle: "Cómo Funciona la Compra",
    buyWarningText1: "Cuando compras VBMS, sucede automáticamente:",
    buyWarningStep1: "1. Compra pack(s) de la bonding curve de vibe.market",
    buyWarningStep2: "2. El pack se vende (cerrado) y convierte en tokens VBMS",
    buyWarningStep3: "3. Los tokens VBMS se envían a tu cartera",
    buyWarningNote: "Todo esto se hace en una sola transacción via nuestro contrato router.",
    buyWarningFees: "Tarifas: ~3.75% en compra (incluido en el precio de la bonding curve)",
    buyWarningConfirm: "Entendido, Continuar",
    buyWarningCancel: "Cancelar",
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
    // Fees
    feeBreakdown: "शुल्क विवरण",
    buyFee: "खरीद: ~3.75%",
    sellFee: "बिक्री: ~7%",
    totalFee: "कुल: ~10.5%",
    protocolNote: "बॉन्डिंग कर्व मूल्य में शुल्क शामिल",
    // Buy Warning Modal
    buyWarningTitle: "खरीद कैसे काम करती है",
    buyWarningText1: "जब आप VBMS खरीदते हैं, स्वचालित रूप से होता है:",
    buyWarningStep1: "1. vibe.market बॉन्डिंग कर्व से पैक खरीदें",
    buyWarningStep2: "2. पैक बेचा (बंद) और VBMS टोकन में परिवर्तित",
    buyWarningStep3: "3. VBMS टोकन आपके वॉलेट में भेजे गए",
    buyWarningNote: "यह सब हमारे राउटर कॉन्ट्रैक्ट के माध्यम से एक ही लेनदेन में किया जाता है।",
    buyWarningFees: "शुल्क: खरीद पर ~3.75% (बॉन्डिंग कर्व मूल्य में शामिल)",
    buyWarningConfirm: "समझ गया, आगे बढ़ें",
    buyWarningCancel: "रद्द करें",
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
    // Fees
    feeBreakdown: "Комиссии",
    buyFee: "Покупка: ~3.75%",
    sellFee: "Продажа: ~7%",
    totalFee: "Всего: ~10.5%",
    protocolNote: "Комиссии включены в цену bonding curve",
    // Buy Warning Modal
    buyWarningTitle: "Как работает покупка",
    buyWarningText1: "Когда вы покупаете VBMS, автоматически происходит:",
    buyWarningStep1: "1. Покупка пакета из bonding curve vibe.market",
    buyWarningStep2: "2. Пакет продается (закрытый) и конвертируется в токены VBMS",
    buyWarningStep3: "3. Токены VBMS отправляются в ваш кошелек",
    buyWarningNote: "Все это делается в одной транзакции через наш роутер-контракт.",
    buyWarningFees: "Комиссия: ~3.75% при покупке (включена в цену bonding curve)",
    buyWarningConfirm: "Понятно, продолжить",
    buyWarningCancel: "Отмена",
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
    // Fees
    feeBreakdown: "费用明细",
    buyFee: "购买: ~3.75%",
    sellFee: "出售: ~7%",
    totalFee: "总计: ~10.5%",
    protocolNote: "费用已包含在联合曲线定价中",
    // Buy Warning Modal
    buyWarningTitle: "购买如何运作",
    buyWarningText1: "当您购买VBMS时，会自动发生以下操作：",
    buyWarningStep1: "1. 从vibe.market联合曲线购买卡包",
    buyWarningStep2: "2. 卡包被售出（未开封）并转换为VBMS代币",
    buyWarningStep3: "3. VBMS代币发送到您的钱包",
    buyWarningNote: "所有这些都通过我们的路由合约在一次交易中完成。",
    buyWarningFees: "费用：购买时约3.75%（包含在联合曲线价格中）",
    buyWarningConfirm: "我理解，继续",
    buyWarningCancel: "取消",
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

  // Buy warning modal state
  const [showBuyWarning, setShowBuyWarning] = useState(false);
  const [showBondingInfo, setShowBondingInfo] = useState(false);

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
    txHash: buyTxHash,
  } = useBuyVBMS();

  // Sell hook
  const {
    sellVBMS,
    step: sellStep,
    error: sellError,
    isLoading: sellLoading,
    reset: resetSell,
    txHash: sellTxHash,
  } = useSellVBMS();

  // Sell quote
  const sellQuote = useQuoteSellVBMS(mode === "sell" ? sellAmount : "0");

  // VBMS Market Cap
  const marketCap = useVBMSMarketCap();
  const bondingProgress = useBondingProgress();

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

  // Handle swap button click - show warning for buy, direct swap for sell
  const handleSwapButtonClick = () => {
    if (mode === "buy") {
      setShowBuyWarning(true);
    } else {
      handleSwap();
    }
  };

  // Handle actual swap execution
  const handleSwap = async () => {
    try {
      if (mode === "buy") {
        if (!priceWei || packCount < 1) return;
        setShowBuyWarning(false);
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
  const currentTxHash = mode === "buy" ? buyTxHash : sellTxHash;

  // Estimated VBMS for packs (100k per pack, minus 3.75% buy fee)
  const BUY_FEE = 0.0375; // 3.75% fee on buy
  const estimatedVBMS = Math.floor(packCount * 100000 * (1 - BUY_FEE)); // ~96,250 per pack after fees

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
          {/* Spacer for layout balance */}
          <div className="w-[60px]"></div>
        </div>
      </div>

            <div className="max-w-lg mx-auto p-4">
        {/* Market Cap & Bonding Progress - Compact */}
        <div className="mb-3 bg-vintage-charcoal/50 rounded-xl p-3 border border-vintage-gold/20">
          <div className="flex items-center justify-between mb-1">
            <span className="text-vintage-burnt-gold text-xs">Market Cap:</span>
            <span className="text-vintage-gold font-mono font-bold text-sm">{marketCap.isLoading ? "..." : marketCap.marketCapFormatted}</span>
          </div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-vintage-burnt-gold text-xs">ETH Price:</span>
            <span className="text-vintage-gold font-mono font-bold text-sm">{bondingProgress.ethPrice ? "$" + bondingProgress.ethPrice.toLocaleString() : "..."}</span>
          </div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-vintage-burnt-gold text-xs">Contract:</span>
            <a href="https://basescan.org/token/0xb03439567cd22f278b21e1ffcdfb8e1696763827" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 font-mono text-xs underline">0xb034...3827</a>
          </div>
          {/* Bonding Progress Bar */}
          <div className="mt-2">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-vintage-burnt-gold">Bonding Curve:</span>
              <div className="flex items-center gap-1">
                <span className="text-vintage-gold font-mono font-bold">${bondingProgress.usdBalance.toFixed(0)}</span>
                <span className="text-vintage-ice/50">/ $10,000</span>
                <button onClick={() => setShowBondingInfo(true)} className="ml-1 w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 text-xs font-bold">?</button>
              </div>
            </div>
            <div className="h-2 bg-vintage-deep-black rounded-full overflow-hidden border border-vintage-gold/20">
              <div
                className="h-full bg-gradient-to-r from-vintage-gold via-yellow-400 to-green-400 transition-all duration-500"
                style={{ width: `${Math.min(bondingProgress.progress, 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] mt-0.5">
              <span className="text-vintage-ice/40">{bondingProgress.ethBalance.toFixed(4)} ETH</span>
              <span className="text-vintage-ice/40">{bondingProgress.progress.toFixed(1)}%</span>
            </div>
          </div>
        </div>

        {/* Buy VBMS Packs Link - Compact */}
        <button onClick={() => openMarketplace('https://vibechain.com/market/vibe-most-wanted?ref=XCLR1DJ6LQTT', sdk, isMiniappMode())} className="mb-3 w-full flex items-center justify-center gap-2 px-3 py-2 border-2 border-vintage-gold text-vintage-black font-modern font-semibold rounded-lg transition-all duration-300 shadow-gold hover:shadow-gold-lg tracking-wider cursor-pointer text-sm" style={{background: 'linear-gradient(145deg, #FFD700, #C9A227)'}}>
          <span>◆</span>
          <span>Buy VBMS Packs</span>
        </button>

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
              <div className="bg-green-500/20 rounded-lg p-3 text-center space-y-2">
                <span className="text-green-400">{t.swapSuccess}</span>
                {currentTxHash && (
                  <a
                    href={`https://basescan.org/tx/${currentTxHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-sm text-blue-400 hover:text-blue-300 underline"
                  >
                    View on Basescan →
                  </a>
                )}
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
                onClick={handleSwapButtonClick}
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

        {/* Fee Breakdown - Compact */}
        <div className="mt-4 bg-yellow-500/10 rounded-lg border border-yellow-500/30 px-4 py-2">
          <div className="flex items-center justify-center gap-4 text-xs">
            <span className="text-green-400">{t.buyFee}</span>
            <span className="text-vintage-gold/30">|</span>
            <span className="text-red-400">{t.sellFee}</span>
            <span className="text-vintage-gold/30">|</span>
            <span className="text-yellow-400 font-bold">{t.totalFee}</span>
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

        {/* Zazza Credits - Compact */}
        <div className="mt-4 text-center">
          <p className="text-purple-300/60 text-xs">
            {t.zazzaCredit}{" "}
            <a href="https://farcaster.xyz/zazza" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300 font-bold underline">@zazza</a>
            {" "}-{" "}
            <a href="https://farcaster.xyz/miniapps/Eq4-Pg-zw9fX/poorly-drawn-binders" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300 underline">{t.viewMiniapp}</a>
          </p>
        </div>
      </div>

      {/* Bonding Info Modal */}
      {showBondingInfo && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-vintage-deep-black border-2 border-vintage-gold/50 rounded-2xl max-w-md w-full p-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-center gap-2 mb-3">
              <span className="text-2xl">💎</span>
              <h3 className="text-lg font-bold text-vintage-gold">VBMS Token & Bonding Curve</h3>
            </div>

            {/* Vibe Market Badge */}
            <div className="bg-purple-500/20 border border-purple-500/40 rounded-lg p-2 mb-3 text-center">
              <p className="text-purple-300 text-xs">Powered by <span className="font-bold">Vibe Market</span> Bonding Curve</p>
              <p className="text-purple-300/60 text-[10px]">Created: Sep 29, 2025 at 14:16</p>
            </div>

            {/* What is VBMS */}
            <div className="mb-3">
              <h4 className="text-vintage-gold font-bold text-sm mb-1">🎴 What is VBMS?</h4>
              <p className="text-vintage-ice/80 text-xs">VBMS is the native token of <span className="text-vintage-gold">Vibe Most Wanted</span>, a collectible card battle game on Base chain. Unopened packs contain 100,000 VBMS. Once opened, the amount depends on the card rarity.</p>
            </div>

            {/* What is Bonding Curve */}
            <div className="mb-3">
              <h4 className="text-vintage-gold font-bold text-sm mb-1">📈 What is a Bonding Curve?</h4>
              <p className="text-vintage-ice/80 text-xs mb-2">A bonding curve is a smart contract on <span className="text-purple-400 font-bold">Vibe Market</span> that automatically sets token prices based on supply:</p>
              <ul className="text-vintage-ice/70 text-xs space-y-1 ml-3">
                <li>• <span className="text-green-400">Buy</span> → Price goes UP</li>
                <li>• <span className="text-red-400">Sell</span> → Price goes DOWN</li>
                <li>• No order books, instant trades</li>
                <li>• Liquidity always available</li>
              </ul>
            </div>

            {/* Market Phases */}
            <div className="mb-3">
              <h4 className="text-vintage-gold font-bold text-sm mb-2">🔄 Market Phases</h4>
              <div className="space-y-2">
                {/* Phase 1 */}
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-2">
                  <div className="flex items-center gap-2">
                    <span className="text-green-400 text-lg">●</span>
                    <span className="text-green-400 font-bold text-xs">PHASE 1: Bonding Curve</span>
                    <span className="text-green-400 text-[10px] ml-auto bg-green-500/20 px-1.5 py-0.5 rounded">ACTIVE</span>
                  </div>
                  <p className="text-vintage-ice/70 text-[11px] mt-1 ml-6">Trade directly on Vibe Market curve. Price adjusts with each trade.</p>
                </div>

                {/* Phase 2 */}
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-2 opacity-70">
                  <div className="flex items-center gap-2">
                    <span className="text-blue-400 text-lg">○</span>
                    <span className="text-blue-400 font-bold text-xs">PHASE 2: Uniswap</span>
                    <span className="text-blue-400/60 text-[10px] ml-auto bg-blue-500/20 px-1.5 py-0.5 rounded">NEXT</span>
                  </div>
                  <p className="text-vintage-ice/60 text-[11px] mt-1 ml-6">When $10k ETH collected, liquidity migrates to Uniswap V3.</p>
                </div>
              </div>
            </div>

            {/* Bonding Curve Balance */}
            <div className="bg-vintage-charcoal/50 rounded-lg p-3 mb-3">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-vintage-burnt-gold">Bonding Curve Balance</span>
              </div>
              <div className="flex items-center justify-center gap-2 py-2">
                <span className="text-vintage-gold font-mono text-xl font-bold">{bondingProgress.ethBalance.toFixed(4)} ETH</span>
                <span className="text-vintage-ice/50 text-sm">(~${bondingProgress.usdBalance.toFixed(0)})</span>
              </div>
            </div>

            {/* Learn More Link */}
            <a
              href="https://docs.wield.xyz/docs/vibemarket#market-phases"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1 text-purple-400 hover:text-purple-300 text-xs mb-3"
            >
              <span>📚</span>
              <span className="underline">Vibe Market Docs - Market Phases</span>
              <span>→</span>
            </a>

            {/* Close Button */}
            <button
              onClick={() => setShowBondingInfo(false)}
              className="w-full py-2.5 rounded-xl bg-vintage-gold hover:bg-yellow-500 text-vintage-black font-bold transition text-sm"
            >
              Got it! ✓
            </button>
          </div>
        </div>
      )}

      {/* Buy Warning Modal */}
      {showBuyWarning && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-vintage-deep-black border-2 border-yellow-500/50 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            {/* Warning Icon */}
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center">
                <span className="text-4xl">⚠️</span>
              </div>
            </div>

            {/* Title */}
            <h3 className="text-xl font-bold text-yellow-400 text-center mb-4">
              {t.buyWarningTitle}
            </h3>

            {/* Description */}
            <p className="text-vintage-ice/80 text-sm mb-4">
              {t.buyWarningText1}
            </p>

            {/* Steps */}
            <div className="space-y-2 mb-4">
              <div className="flex items-start gap-2 text-sm">
                <span className="text-green-400">📦</span>
                <span className="text-vintage-ice/90">{t.buyWarningStep1}</span>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <span className="text-blue-400">🔄</span>
                <span className="text-vintage-ice/90">{t.buyWarningStep2}</span>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <span className="text-purple-400">💰</span>
                <span className="text-vintage-ice/90">{t.buyWarningStep3}</span>
              </div>
            </div>

            {/* Note */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mb-4">
              <p className="text-blue-300 text-xs">
                ℹ️ {t.buyWarningNote}
              </p>
            </div>

            {/* Fees */}
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mb-3">
              <p className="text-yellow-300 text-xs font-medium">
                💸 {t.buyWarningFees}
              </p>
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowBuyWarning(false)}
                className="flex-1 py-3 px-4 rounded-xl border border-vintage-gold/30 text-vintage-gold hover:bg-vintage-gold/10 transition font-medium"
              >
                {t.buyWarningCancel}
              </button>
              <button
                onClick={handleSwap}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-400 hover:to-green-500 transition font-bold"
              >
                {t.buyWarningConfirm}
              </button>
            </div>
          </div>
        </div>
      )}

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
