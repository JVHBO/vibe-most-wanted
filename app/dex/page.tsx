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
    // Market info
    marketCap: "Market Cap:",
    ethPrice: "ETH Price:",
    contract: "Contract:",
    bondingCurve: "Bonding Curve:",
    ethTarget: "/2.5 ETH",
    buyPacks: "Buy VBMS Packs",
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
    bondingInfoPhase2Desc: "When 2.5 ETH is reached, liquidity moves to Uniswap for open trading.",
    bondingInfoTarget: "Target: 2.5 ETH",
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
    // Market info
    marketCap: "Market Cap:",
    ethPrice: "Preço ETH:",
    contract: "Contrato:",
    bondingCurve: "Bonding Curve:",
    ethTarget: "/2.5 ETH",
    buyPacks: "Comprar Packs VBMS",
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
    bondingInfoPhase2Desc: "Quando 2.5 ETH for atingido, a liquidez vai para a Uniswap para trading aberto.",
    bondingInfoTarget: "Meta: 2.5 ETH",
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
    // Market info
    marketCap: "Cap. Mercado:",
    ethPrice: "Precio ETH:",
    contract: "Contrato:",
    bondingCurve: "Bonding Curve:",
    ethTarget: "/2.5 ETH",
    buyPacks: "Comprar Packs VBMS",
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
    // Bonding Info Modal
    bondingInfoTitle: "¿Qué es VBMS?",
    bondingInfoDesc1: "VBMS es el token nativo de Vibe Most Wanted, un juego de cartas coleccionables en Base.",
    bondingInfoDesc2: "El token usa un mecanismo de bonding curve donde el precio aumenta cuando se compran más tokens.",
    bondingInfoPhase1: "Fase Bonding",
    bondingInfoPhase1Desc: "Actualmente activa. Compra/vende directamente en la curva. El precio se ajusta automáticamente.",
    bondingInfoPhase2: "Fase Uniswap",
    bondingInfoPhase2Desc: "Cuando se alcancen 2.5 ETH, la liquidez se moverá a Uniswap para trading abierto.",
    bondingInfoTarget: "Meta: 2.5 ETH",
    bondingInfoLearnMore: "Más información sobre las fases del mercado",
    bondingInfoClose: "¡Entendido!",
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
    // Market info
    marketCap: "मार्केट कैप:",
    ethPrice: "ETH मूल्य:",
    contract: "कॉन्ट्रैक्ट:",
    bondingCurve: "बॉन्डिंग कर्व:",
    ethTarget: "/2.5 ETH",
    buyPacks: "VBMS पैक खरीदें",
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
    // Bonding Info Modal
    bondingInfoTitle: "VBMS क्या है?",
    bondingInfoDesc1: "VBMS Vibe Most Wanted का नेटिव टोकन है, बेस पर एक कलेक्टिबल कार्ड गेम।",
    bondingInfoDesc2: "टोकन बॉन्डिंग कर्व मैकेनिज्म का उपयोग करता है जहां अधिक टोकन खरीदे जाने पर कीमत बढ़ती है।",
    bondingInfoPhase1: "बॉन्डिंग फेज",
    bondingInfoPhase1Desc: "वर्तमान में सक्रिय। कर्व पर सीधे खरीदें/बेचें। कीमत स्वचालित रूप से समायोजित होती है।",
    bondingInfoPhase2: "यूनिस्वैप फेज",
    bondingInfoPhase2Desc: "जब 2.5 ETH पहुंच जाए, तरलता ओपन ट्रेडिंग के लिए यूनिस्वैप में जाती है।",
    bondingInfoTarget: "लक्ष्य: 2.5 ETH",
    bondingInfoLearnMore: "मार्केट फेज के बारे में और जानें",
    bondingInfoClose: "समझ गया!",
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
    // Market info
    marketCap: "Капитализация:",
    ethPrice: "Цена ETH:",
    contract: "Контракт:",
    bondingCurve: "Bonding Curve:",
    ethTarget: "/2.5 ETH",
    buyPacks: "Купить паки VBMS",
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
    // Bonding Info Modal
    bondingInfoTitle: "Что такое VBMS?",
    bondingInfoDesc1: "VBMS - нативный токен Vibe Most Wanted, коллекционной карточной игры на Base.",
    bondingInfoDesc2: "Токен использует механизм bonding curve, где цена растет при покупке большего количества токенов.",
    bondingInfoPhase1: "Фаза Bonding",
    bondingInfoPhase1Desc: "Сейчас активна. Покупайте/продавайте напрямую на кривой. Цена регулируется автоматически.",
    bondingInfoPhase2: "Фаза Uniswap",
    bondingInfoPhase2Desc: "При достижении 2.5 ETH ликвидность перемещается на Uniswap для открытой торговли.",
    bondingInfoTarget: "Цель: 2.5 ETH",
    bondingInfoLearnMore: "Подробнее о фазах рынка",
    bondingInfoClose: "Понятно!",
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
    // Market info
    marketCap: "市值:",
    ethPrice: "ETH 价格:",
    contract: "合约:",
    bondingCurve: "联合曲线:",
    ethTarget: "/2.5 ETH",
    buyPacks: "购买 VBMS 包",
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
    // Bonding Info Modal
    bondingInfoTitle: "什么是 VBMS?",
    bondingInfoDesc1: "VBMS 是 Vibe Most Wanted 的原生代币，一款 Base 上的收藏卡牌游戏。",
    bondingInfoDesc2: "该代币使用联合曲线机制，购买越多代币价格越高。",
    bondingInfoPhase1: "联合曲线阶段",
    bondingInfoPhase1Desc: "目前活跃。直接在曲线上买卖。价格自动调整。",
    bondingInfoPhase2: "Uniswap 阶段",
    bondingInfoPhase2Desc: "当达到 2.5 ETH 时，流动性将转移到 Uniswap 进行公开交易。",
    bondingInfoTarget: "目标: 2.5 ETH",
    bondingInfoLearnMore: "了解更多市场阶段",
    bondingInfoClose: "明白了!",
  },
  id: {
    title: "DEX",
    infoBanner: "Beli dan jual token VBMS langsung melalui bonding curve.",
    packInfo: "1 pack = 100,000 VBMS | Harga saat ini:",
    ethPerPack: "ETH/pack",
    buyVbms: "BELI VBMS",
    sellVbms: "JUAL VBMS",
    youBuy: "Pack yang dibeli",
    youPay: "Anda bayar",
    youSell: "Anda jual (VBMS)",
    youReceive: "Anda terima",
    packCount: "pack",
    realQuote: "Kuotasi bonding curve nyata",
    minting: "Minting pack...",
    waitingMint: "Menunggu mint...",
    selling: "Menjual...",
    waitingSell: "Menunggu penjualan...",
    complete: "Selesai!",
    swapSuccess: "Swap berhasil diselesaikan!",
    processing: "Memproses...",
    buy: "Beli",
    sell: "Jual",
    howItWorks: "Bagaimana cara kerjanya?",
    buyStep1: "1. Pilih jumlah pack yang ingin dibeli",
    buyStep2: "2. Setiap pack memberikan ~100k token VBMS",
    buyStep3: "3. Pack otomatis dikonversi ke VBMS",
    sellStep1: "1. Penjualan langsung di bonding curve (jumlah berapa pun!)",
    sellStep2: "2. Satu transaksi - sederhana dan cepat",
    sellStep3: "3. ETH dikirim langsung ke dompet Anda",
    ethBalance: "Saldo ETH",
    vbmsBalance: "Saldo VBMS",
    packs: "pack",
    insufficientEth: "ETH tidak cukup",
    balance: "Saldo",
    connectWallet: "Hubungkan Dompet",
    back: "Kembali",
    // Market info
    marketCap: "Market Cap:",
    ethPrice: "Harga ETH:",
    contract: "Kontrak:",
    bondingCurve: "Bonding Curve:",
    ethTarget: "/2.5 ETH",
    buyPacks: "Beli Pack VBMS",
    // Fees
    feeBreakdown: "Rincian Biaya",
    buyFee: "Beli: ~3.75%",
    sellFee: "Jual: ~7%",
    totalFee: "Total: ~10.5%",
    protocolNote: "Biaya sudah termasuk dalam harga bonding curve",
    // Buy Warning Modal
    buyWarningTitle: "Cara Kerja Pembelian",
    buyWarningText1: "Saat Anda membeli VBMS, secara otomatis terjadi:",
    buyWarningStep1: "1. Beli pack dari bonding curve vibe.market",
    buyWarningStep2: "2. Pack dijual (tertutup) dan dikonversi ke token VBMS",
    buyWarningStep3: "3. Token VBMS dikirim ke dompet Anda",
    buyWarningNote: "Semua ini dilakukan dalam satu transaksi melalui kontrak router kami.",
    buyWarningFees: "Biaya: ~3.75% pada pembelian (termasuk dalam harga bonding curve)",
    buyWarningConfirm: "Saya Mengerti, Lanjutkan",
    buyWarningCancel: "Batal",
    // Zazza credits
    zazzaCredit: "Dibuat dengan bantuan",
    zazzaMiniapp: "Poorly Drawn Binders",
    zazzaDescription: "Beli, listing, dan perdagangkan token dari koleksi Vibechain mana pun",
    viewMiniapp: "Buka Miniapp",
    // Bonding Info Modal
    bondingInfoTitle: "Apa itu VBMS?",
    bondingInfoDesc1: "VBMS adalah token native dari Vibe Most Wanted, game kartu koleksi di Base.",
    bondingInfoDesc2: "Token menggunakan mekanisme bonding curve di mana harga naik saat lebih banyak token dibeli.",
    bondingInfoPhase1: "Fase Bonding",
    bondingInfoPhase1Desc: "Saat ini aktif. Beli/jual langsung di kurva. Harga menyesuaikan otomatis.",
    bondingInfoPhase2: "Fase Uniswap",
    bondingInfoPhase2Desc: "Ketika 2.5 ETH tercapai, likuiditas pindah ke Uniswap untuk trading terbuka.",
    bondingInfoTarget: "Target: 2.5 ETH",
    bondingInfoLearnMore: "Pelajari lebih lanjut tentang fase pasar",
    bondingInfoClose: "Mengerti!",
  },
  fr: {
    title: "DEX",
    infoBanner: "Achetez et vendez des tokens VBMS directement via la courbe de liaison.",
    packInfo: "1 pack = 100 000 VBMS | Prix actuel :",
    ethPerPack: "ETH/pack",
    buyVbms: "ACHETER VBMS",
    sellVbms: "VENDRE VBMS",
    youBuy: "Packs à acheter",
    youPay: "Vous payez",
    youSell: "Vous vendez (VBMS)",
    youReceive: "Vous recevez",
    packCount: "pack(s)",
    realQuote: "Cotation réelle de la courbe de liaison",
    minting: "Minting du pack...",
    waitingMint: "En attente du mint...",
    selling: "Vente en cours...",
    waitingSell: "En attente de la vente...",
    complete: "Terminé !",
    swapSuccess: "Échange réussi !",
    processing: "Traitement...",
    buy: "Acheter",
    sell: "Vendre",
    howItWorks: "Comment ça marche ?",
    buyStep1: "1. Sélectionnez le nombre de packs à acheter",
    buyStep2: "2. Chaque pack vous donne ~100k tokens VBMS",
    buyStep3: "3. Les packs sont auto-convertis en VBMS",
    sellStep1: "1. Vente directe sur la courbe de liaison (n'importe quel montant !)",
    sellStep2: "2. Une seule transaction - simple et rapide",
    sellStep3: "3. ETH envoyé directement à votre portefeuille",
    ethBalance: "Solde ETH",
    vbmsBalance: "Solde VBMS",
    packs: "packs",
    insufficientEth: "ETH insuffisant",
    balance: "Solde",
    connectWallet: "Connectez votre portefeuille",
    back: "Retour",
    // Market info
    marketCap: "Cap. Marché :",
    ethPrice: "Prix ETH :",
    contract: "Contrat :",
    bondingCurve: "Courbe de liaison :",
    ethTarget: "/2.5 ETH",
    buyPacks: "Acheter des Packs VBMS",
    // Fees
    feeBreakdown: "Détail des frais",
    buyFee: "Achat : ~3,75%",
    sellFee: "Vente : ~7%",
    totalFee: "Total : ~10,5%",
    protocolNote: "Frais inclus dans le prix de la courbe de liaison",
    // Buy Warning Modal
    buyWarningTitle: "Comment fonctionne l'achat",
    buyWarningText1: "Lorsque vous achetez des VBMS, cela se passe automatiquement :",
    buyWarningStep1: "1. Achat de pack(s) sur la courbe de liaison vibe.market",
    buyWarningStep2: "2. Le pack est vendu (fermé) et converti en tokens VBMS",
    buyWarningStep3: "3. Les tokens VBMS sont envoyés à votre portefeuille",
    buyWarningNote: "Tout cela se fait en une seule transaction via notre contrat routeur.",
    buyWarningFees: "Frais : ~3,75% à l'achat (inclus dans le prix de la courbe)",
    buyWarningConfirm: "Je comprends, Continuer",
    buyWarningCancel: "Annuler",
    // Zazza credits
    zazzaCredit: "Construit avec l'aide de",
    zazzaMiniapp: "Poorly Drawn Binders",
    zazzaDescription: "Achetez, listez et échangez des tokens de n'importe quelle collection Vibechain",
    viewMiniapp: "Ouvrir Miniapp",
    // Bonding Info Modal
    bondingInfoTitle: "Qu'est-ce que VBMS ?",
    bondingInfoDesc1: "VBMS est le token natif de Vibe Most Wanted, un jeu de cartes à collectionner sur Base.",
    bondingInfoDesc2: "Le token utilise un mécanisme de courbe de liaison où le prix augmente à mesure que plus de tokens sont achetés.",
    bondingInfoPhase1: "Phase Bonding",
    bondingInfoPhase1Desc: "Actuellement active. Achetez/vendez directement sur la courbe. Le prix s'ajuste automatiquement.",
    bondingInfoPhase2: "Phase Uniswap",
    bondingInfoPhase2Desc: "Lorsque 2,5 ETH seront atteints, la liquidité sera transférée vers Uniswap pour le trading ouvert.",
    bondingInfoTarget: "Objectif : 2,5 ETH",
    bondingInfoLearnMore: "En savoir plus sur les phases du marché",
    bondingInfoClose: "Compris !",
  },
  ja: {
    title: "DEX",
    infoBanner: "ボンディングカーブを通じてVBMSトークンを直接売買。",
    packInfo: "1パック = 100,000 VBMS | 現在の価格:",
    ethPerPack: "ETH/パック",
    buyVbms: "VBMSを購入",
    sellVbms: "VBMSを売却",
    youBuy: "購入するパック数",
    youPay: "支払額",
    youSell: "売却 (VBMS)",
    youReceive: "受取額",
    packCount: "パック",
    realQuote: "ボンディングカーブのリアル見積もり",
    minting: "パックをミント中...",
    waitingMint: "ミント待機中...",
    selling: "売却中...",
    waitingSell: "売却待機中...",
    complete: "完了！",
    swapSuccess: "スワップが完了しました！",
    processing: "処理中...",
    buy: "購入",
    sell: "売却",
    howItWorks: "仕組み",
    buyStep1: "1. 購入するパック数を選択",
    buyStep2: "2. 各パックで約10万VBMSトークンを取得",
    buyStep3: "3. パックは自動的にVBMSに変換",
    sellStep1: "1. ボンディングカーブで直接売却（任意の金額！）",
    sellStep2: "2. 単一トランザクション - シンプルで高速",
    sellStep3: "3. ETHは直接ウォレットに送金",
    ethBalance: "ETH残高",
    vbmsBalance: "VBMS残高",
    packs: "パック",
    insufficientEth: "ETH不足",
    balance: "残高",
    connectWallet: "ウォレットを接続",
    back: "戻る",
    // Market info
    marketCap: "時価総額:",
    ethPrice: "ETH価格:",
    contract: "コントラクト:",
    bondingCurve: "ボンディングカーブ:",
    ethTarget: "/2.5 ETH",
    buyPacks: "VBMSパックを購入",
    // Fees
    feeBreakdown: "手数料内訳",
    buyFee: "購入: ~3.75%",
    sellFee: "売却: ~7%",
    totalFee: "合計: ~10.5%",
    protocolNote: "手数料はボンディングカーブ価格に含まれています",
    // Buy Warning Modal
    buyWarningTitle: "購入の仕組み",
    buyWarningText1: "VBMSを購入すると、自動的に以下が実行されます：",
    buyWarningStep1: "1. vibe.marketのボンディングカーブからパックを購入",
    buyWarningStep2: "2. パックが売却（クローズ）されVBMSトークンに変換",
    buyWarningStep3: "3. VBMSトークンがウォレットに送信",
    buyWarningNote: "これらすべてがルーターコントラクトを通じて1回のトランザクションで行われます。",
    buyWarningFees: "手数料：購入時約3.75%（ボンディングカーブ価格に含む）",
    buyWarningConfirm: "理解しました、続行",
    buyWarningCancel: "キャンセル",
    // Zazza credits
    zazzaCredit: "協力：",
    zazzaMiniapp: "Poorly Drawn Binders",
    zazzaDescription: "Vibechainの任意のコレクションからトークンを購入、出品、取引",
    viewMiniapp: "ミニアプリを開く",
    // Bonding Info Modal
    bondingInfoTitle: "VBMSとは？",
    bondingInfoDesc1: "VBMSはVibe Most Wantedのネイティブトークンで、Base上のコレクタブルカードゲームです。",
    bondingInfoDesc2: "トークンはボンディングカーブメカニズムを使用し、より多くのトークンが購入されると価格が上昇します。",
    bondingInfoPhase1: "ボンディングフェーズ",
    bondingInfoPhase1Desc: "現在アクティブ。カーブ上で直接売買。価格は自動調整。",
    bondingInfoPhase2: "Uniswapフェーズ",
    bondingInfoPhase2Desc: "2.5 ETHに達すると、流動性はオープントレード用にUniswapに移行します。",
    bondingInfoTarget: "目標: 2.5 ETH",
    bondingInfoLearnMore: "市場フェーズについて詳しく",
    bondingInfoClose: "了解！",
  },
  it: {
    title: "DEX",
    infoBanner: "Compra e vendi token VBMS direttamente tramite bonding curve.",
    packInfo: "1 pack = 100.000 VBMS | Prezzo attuale:",
    ethPerPack: "ETH/pack",
    buyVbms: "COMPRA VBMS",
    sellVbms: "VENDI VBMS",
    youBuy: "Pack da comprare",
    youPay: "Paghi",
    youSell: "Vendi (VBMS)",
    youReceive: "Ricevi",
    packCount: "pack",
    realQuote: "Quotazione reale della bonding curve",
    minting: "Minting pack...",
    waitingMint: "In attesa del mint...",
    selling: "Vendita in corso...",
    waitingSell: "In attesa della vendita...",
    complete: "Completato!",
    swapSuccess: "Swap completato con successo!",
    processing: "Elaborazione...",
    buy: "Compra",
    sell: "Vendi",
    howItWorks: "Come funziona?",
    buyStep1: "1. Seleziona il numero di pack da comprare",
    buyStep2: "2. Ogni pack ti dà ~100k token VBMS",
    buyStep3: "3. I pack sono auto-convertiti in VBMS",
    sellStep1: "1. Vendita diretta sulla bonding curve (qualsiasi importo!)",
    sellStep2: "2. Una sola transazione - semplice e veloce",
    sellStep3: "3. ETH inviato direttamente al tuo wallet",
    ethBalance: "Saldo ETH",
    vbmsBalance: "Saldo VBMS",
    packs: "pack",
    insufficientEth: "ETH insufficiente",
    balance: "Saldo",
    connectWallet: "Collega il tuo Wallet",
    back: "Indietro",
    // Market info
    marketCap: "Cap. Mercato:",
    ethPrice: "Prezzo ETH:",
    contract: "Contratto:",
    bondingCurve: "Bonding Curve:",
    ethTarget: "/2.5 ETH",
    buyPacks: "Compra Pack VBMS",
    // Fees
    feeBreakdown: "Dettaglio commissioni",
    buyFee: "Acquisto: ~3,75%",
    sellFee: "Vendita: ~7%",
    totalFee: "Totale: ~10,5%",
    protocolNote: "Commissioni incluse nel prezzo della bonding curve",
    // Buy Warning Modal
    buyWarningTitle: "Come funziona l'acquisto",
    buyWarningText1: "Quando acquisti VBMS, avviene automaticamente:",
    buyWarningStep1: "1. Acquisto pack dalla bonding curve di vibe.market",
    buyWarningStep2: "2. Il pack viene venduto (chiuso) e convertito in token VBMS",
    buyWarningStep3: "3. I token VBMS vengono inviati al tuo wallet",
    buyWarningNote: "Tutto questo viene fatto in una singola transazione tramite il nostro contratto router.",
    buyWarningFees: "Commissioni: ~3,75% sull'acquisto (incluso nel prezzo della bonding curve)",
    buyWarningConfirm: "Ho capito, Procedi",
    buyWarningCancel: "Annulla",
    // Zazza credits
    zazzaCredit: "Costruito con l'aiuto di",
    zazzaMiniapp: "Poorly Drawn Binders",
    zazzaDescription: "Compra, lista e scambia token da qualsiasi collezione Vibechain",
    viewMiniapp: "Apri Miniapp",
    // Bonding Info Modal
    bondingInfoTitle: "Cos'è VBMS?",
    bondingInfoDesc1: "VBMS è il token nativo di Vibe Most Wanted, un gioco di carte collezionabili su Base.",
    bondingInfoDesc2: "Il token usa un meccanismo di bonding curve dove il prezzo aumenta man mano che vengono acquistati più token.",
    bondingInfoPhase1: "Fase Bonding",
    bondingInfoPhase1Desc: "Attualmente attiva. Compra/vendi direttamente sulla curva. Il prezzo si regola automaticamente.",
    bondingInfoPhase2: "Fase Uniswap",
    bondingInfoPhase2Desc: "Quando si raggiungono 2,5 ETH, la liquidità si sposta su Uniswap per il trading aperto.",
    bondingInfoTarget: "Obiettivo: 2,5 ETH",
    bondingInfoLearnMore: "Scopri di più sulle fasi di mercato",
    bondingInfoClose: "Capito!",
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
  { code: "id", flag: "🇮🇩", name: "ID" },
  { code: "fr", flag: "🇫🇷", name: "FR" },
  { code: "ja", flag: "🇯🇵", name: "JA" },
  { code: "it", flag: "🇮🇹", name: "IT" },
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
  const [sellAmount, setSellAmount] = useState("100000");

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

  const fmtVBMS = (v: string) => {
    const n = parseFloat(v);
    if (isNaN(n)) return "0";
    if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1).replace(/\.0$/, "") + "B";
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
    if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
    return n.toLocaleString();
  };

  return (
    <div className="h-full flex flex-col bg-vintage-deep-black text-vintage-ice overflow-hidden" style={{ minHeight: "100%" }}>
      {/* Header */}
      <div className="bg-gradient-to-r from-vintage-gold/20 to-vintage-orange/20 border-b-2 border-vintage-gold/50 p-4 flex-shrink-0">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-red-500 hover:text-red-400 transition">
            &larr; {t.back}
          </Link>
          <h1 className="text-2xl font-display font-bold text-vintage-gold">
            {t.title}
          </h1>
          <div className="w-[60px]"></div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
      <div className="max-w-lg mx-auto p-4 flex flex-col">
        {/* Bonding Progress Bar - Compact */}
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-vintage-gold/70">{t.bondingCurve}</span>
            <div className="flex items-center gap-1">
              <span className="text-vintage-gold font-mono font-bold">{bondingProgress.ethBalance.toFixed(4)}</span>
              <span className="text-vintage-ice/50">{t.ethTarget}</span>
              <button onClick={() => setShowBondingInfo(true)} className="ml-1 w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 text-xs font-bold">?</button>
            </div>
          </div>
          <div className="h-2 bg-vintage-deep-black rounded-full overflow-hidden border border-vintage-gold/20">
            <div
              className="h-full bg-gradient-to-r from-vintage-gold via-yellow-400 to-green-400 transition-all duration-500"
              style={{ width: `${Math.min(bondingProgress.progress, 100)}%` }}
            />
          </div>
          <div className="flex justify-end text-[10px] mt-0.5"><span className="text-vintage-ice/40">{bondingProgress.progress.toFixed(1)}%</span></div>
        </div>

        {/* Buy VBMS Packs Link - Compact */}
        <button onClick={() => openMarketplace('https://vibechain.com/market/vibe-most-wanted?ref=XCLR1DJ6LQTT', sdk, isMiniappMode())} className="dex-buy-packs-btn mb-3 w-full flex items-center justify-center gap-2 px-3 py-2 border-2 border-black text-black font-modern font-semibold rounded-lg transition-all duration-300 shadow-[2px_2px_0px_#000] hover:brightness-110 active:translate-y-[2px] active:shadow-none tracking-wider cursor-pointer text-sm" style={{background: 'linear-gradient(145deg, #FFD700, #C9A227)'}}>
          <span>◆</span>
          <span>{t.buyPacks}</span>
        </button>

        {/* Swap Card */}
        <div className="flex flex-col bg-vintage-charcoal/80 backdrop-blur-lg rounded-2xl border-2 border-vintage-gold/30 shadow-gold overflow-hidden">
          {/* Mode Toggle */}
          <div className="flex border-b border-vintage-gold/30">
            <button
              onClick={handleBuyClick}
              className={`flex-1 py-4 font-modern font-bold transition-all ${
                mode === "buy"
                  ? "bg-green-500/20 text-green-400 border-b-2 border-green-400"
                  : "text-vintage-gold/50 hover:text-vintage-gold"
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
                  : "text-vintage-gold/50 hover:text-vintage-gold"
              }`}
            >
              {t.sellVbms}
            </button>
          </div>

          <div className="flex flex-col p-4 space-y-4">
            {mode === "buy" ? (
              <>
                {/* Pack counter row */}
                <div className="flex items-center justify-between gap-3">
                  <button
                    onClick={() => setPackCount(Math.max(1, packCount - 1))}
                    disabled={isLoading || packCount <= 1}
                    className="w-10 h-10 rounded-lg bg-vintage-gold text-black text-2xl font-bold border-2 border-black shadow-[2px_2px_0px_#000] hover:bg-yellow-300 active:translate-y-[1px] active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed transition flex-shrink-0"
                  >-</button>
                  <div className="flex-1 text-center">
                    <span className="text-3xl text-vintage-ice font-mono font-bold">{packCount}</span>
                    <span className="text-vintage-gold/70 text-sm ml-2">{t.packs}</span>
                  </div>
                  <button
                    onClick={() => setPackCount(packCount + 1)}
                    disabled={isLoading}
                    className="w-10 h-10 rounded-lg bg-vintage-gold text-black text-2xl font-bold border-2 border-black shadow-[2px_2px_0px_#000] hover:bg-yellow-300 active:translate-y-[1px] active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed transition flex-shrink-0"
                  >+</button>
                </div>

                {/* Quick + price row */}
                <div className="flex items-center gap-2">
                  {[1, 2, 5, 10].map((n) => (
                    <QuickButton key={n} label={`${n}`} onClick={() => setPackCount(n)} active={packCount === n} />
                  ))}
                  <div className="flex-1 text-right">
                    <span className="text-vintage-gold font-mono font-bold text-sm">
                      {priceLoading ? "..." : parseFloat(priceEth || "0").toFixed(6)} ETH
                    </span>
                  </div>
                </div>
                {!hasEnoughEth && isConnected && (
                  <p className="text-red-400 text-xs text-right -mt-2">{t.insufficientEth}</p>
                )}

                {/* Receive row */}
                <div className="flex items-center justify-between bg-vintage-deep-black/50 rounded-xl px-4 py-3 border border-vintage-gold/10">
                  <span className="text-vintage-gold/70 text-sm">{t.youReceive}</span>
                  <span className="text-vintage-gold text-xl font-mono font-bold">~{estimatedVBMS.toLocaleString()} VBMS</span>
                </div>
              </>
            ) : (
              <>
                {/* Sell input row */}
                <div className="bg-vintage-deep-black rounded-xl px-4 py-3 border border-vintage-gold/20">
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      value={sellAmount}
                      onChange={(e) => setSellAmount(e.target.value)}
                      placeholder="0"
                      className="flex-1 min-w-0 bg-transparent text-3xl text-vintage-ice outline-none font-mono"
                      disabled={isLoading}
                    />
                    <span className="text-vintage-gold font-bold">VBMS</span>
                  </div>
                </div>

                {/* Quick amounts + balance */}
                <div className="flex items-center gap-2">
                  <QuickButton label="100k" onClick={() => setSellAmount("100000")} active={sellAmount === "100000"} />
                  <QuickButton label="500k" onClick={() => setSellAmount("500000")} active={sellAmount === "500000"} />
                  <QuickButton label="1M" onClick={() => setSellAmount("1000000")} active={sellAmount === "1000000"} />
                  <QuickButton label="MAX" onClick={() => setSellAmount(vbmsBalance)} active={sellAmount === vbmsBalance && sellAmount !== ""} />
                  <div className="flex-1 text-right">
                    <span className="text-vintage-gold/60 text-xs">{fmtVBMS(vbmsBalance)} VBMS</span>
                  </div>
                </div>

                {/* Receive row */}
                <div className="flex items-center justify-between bg-vintage-deep-black/50 rounded-xl px-4 py-3 border border-vintage-gold/10">
                  <span className="text-vintage-gold/70 text-sm">{t.youReceive}</span>
                  <span className="text-vintage-gold text-xl font-mono font-bold">
                    {parseFloat(sellQuote.estimatedEth) > 0
                      ? `~${parseFloat(sellQuote.estimatedEth).toFixed(6)}`
                      : "0"} ETH
                  </span>
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
                className="w-full py-4 rounded-xl font-modern font-bold text-lg bg-vintage-charcoal text-vintage-gold/50 cursor-not-allowed"
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
                    ? "bg-vintage-charcoal text-vintage-gold/50 cursor-wait"
                    : mode === "buy"
                    ? "bg-gradient-to-r from-green-500 to-green-600 text-white border-2 border-black shadow-[2px_2px_0px_#000] hover:from-green-400 hover:to-green-500 active:translate-y-[2px] active:shadow-none"
                    : "bg-gradient-to-r from-red-500 to-red-600 text-white border-2 border-black shadow-[2px_2px_0px_#000] hover:from-red-400 hover:to-red-500 active:translate-y-[2px] active:shadow-none"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
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

        {/* Fees + Zazza */}
        <div className="mt-3 flex items-center justify-between text-xs px-1 flex-shrink-0">
          <span className="text-vintage-ice/30">
            <span className="text-green-400/60">{t.buyFee}</span>
            <span className="text-vintage-ice/20 mx-1">|</span>
            <span className="text-red-400/60">{t.sellFee}</span>
          </span>
          <p className="text-purple-300/50">
            {t.zazzaCredit}{" "}
            <a href="https://farcaster.xyz/zazza" target="_blank" rel="noopener noreferrer" className="text-purple-400/70 hover:text-purple-300 font-bold underline">@zazza</a>
          </p>
        </div>

      </div>
      </div>

      {/* Bonding Info Modal */}
      {showBondingInfo && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[10000] flex items-center justify-center px-4 py-16 overflow-hidden">
          <div className="bg-vintage-deep-black border border-vintage-gold/50 rounded-xl w-full max-w-sm p-4 shadow-2xl overflow-x-hidden">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span>💎</span>
                <h3 className="text-sm font-bold text-vintage-gold">{t.bondingInfoTitle}</h3>
              </div>
              <button onClick={() => setShowBondingInfo(false)} className="text-red-500 hover:text-red-400 text-xl leading-none">×</button>
            </div>

            {/* Descriptions */}
            <div className="bg-vintage-charcoal/40 rounded-lg p-2.5 mb-3 space-y-1.5">
              <p className="text-xs text-vintage-ice/80">{t.bondingInfoDesc1}</p>
              <p className="text-xs text-vintage-ice/80">{t.bondingInfoDesc2}</p>
            </div>

            {/* Phases */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-green-400 font-bold text-[11px]">{t.bondingInfoPhase1}</span>
                  <span className="text-green-400 text-[9px] bg-green-500/20 px-1 rounded">ACTIVE</span>
                </div>
                <p className="text-vintage-ice/60 text-[10px]">{t.bondingInfoPhase1Desc}</p>
              </div>
              <div className="bg-vintage-charcoal/30 border border-vintage-gold/10 rounded-lg p-2 opacity-60">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-vintage-ice/50 font-bold text-[11px]">{t.bondingInfoPhase2}</span>
                  <span className="text-vintage-ice/30 text-[9px] px-1">NEXT</span>
                </div>
                <p className="text-vintage-ice/40 text-[10px]">{t.bondingInfoPhase2Desc}</p>
              </div>
            </div>

            {/* Stats */}
            <div className="bg-vintage-charcoal/50 rounded-lg p-2.5 mb-3 space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-vintage-gold/70">{t.marketCap}</span>
                <span className="text-vintage-gold font-mono font-bold">{marketCap.isLoading ? "..." : marketCap.marketCapFormatted}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-vintage-gold/70">{t.ethPrice}</span>
                <span className="text-vintage-gold font-mono font-bold">{bondingProgress.ethPrice ? "$" + bondingProgress.ethPrice.toLocaleString() : "..."}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-vintage-gold/70">{t.bondingCurve}</span>
                <span className="text-vintage-gold font-mono font-bold">{bondingProgress.ethBalance.toFixed(4)} ETH (~${bondingProgress.usdBalance.toFixed(0)})</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-vintage-gold/70">{t.contract}</span>
                <a href="https://basescan.org/token/0xb03439567cd22f278b21e1ffcdfb8e1696763827" target="_blank" rel="noopener noreferrer" className="text-vintage-gold/70 hover:text-vintage-gold font-mono underline">0xb034...3827</a>
              </div>
            </div>

            {/* Fees + Close */}
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-2 py-1.5 flex justify-between text-xs">
                <span className="text-green-400">{t.buyFee}</span>
                <span className="text-red-400">{t.sellFee}</span>
                <span className="text-yellow-400 font-bold">{t.totalFee}</span>
              </div>
              <button
                onClick={() => setShowBondingInfo(false)}
                className="px-4 py-1.5 rounded-lg bg-vintage-gold hover:bg-vintage-burnt-gold text-vintage-black font-bold text-xs transition"
              >{t.bondingInfoClose}</button>
            </div>
          </div>
        </div>
      )}

            {/* Buy Warning Modal */}
      {showBuyWarning && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[10000] flex items-start justify-center pt-2 pb-24 px-3 overflow-hidden">
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
      className={`flex-1 text-xs font-bold py-1.5 px-2 rounded border-2 transition-all active:translate-y-[2px] active:shadow-none ${
        active
          ? "bg-vintage-gold text-black border-black shadow-[2px_2px_0px_#000]"
          : "bg-[#1a1500] text-yellow-400 border-yellow-700/60 shadow-[2px_2px_0px_#92400e] hover:bg-[#2a2200] hover:border-yellow-500"
      }`}
    >
      {label}
    </button>
  );
}
