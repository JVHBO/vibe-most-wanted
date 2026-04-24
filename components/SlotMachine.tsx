"use client";

import { memo, useState, useCallback, useRef, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAccount } from "wagmi";
import { useProfile } from "@/contexts/ProfileContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import { getVbmsBaccaratImageUrl } from "@/lib/tcg/images";
import { playTrackedAudio } from "@/lib/tcg/audio";
import { sdk } from "@farcaster/miniapp-sdk";
import type { SlotCard } from "@/lib/slot/config";
import { SLOT_CARD_SUIT_RANK } from "@/lib/slot/config";
import {
  SLOT_BET_OPTIONS,
  SLOT_BONUS_COST_MULT,
  SLOT_BONUS_FREE_SPINS,
  SLOT_CARD_LABELS,
  SLOT_CARD_POOL,
  SLOT_COLS,
  SLOT_ROWS,
  SLOT_TOTAL_CELLS,
  SLOT_SUIT_COLOR,
  createSlotCard,  getSlotCardRarity,
  getSlotPatternForIndices,
  isDeveloperSlotAddress,
  pickSlotCard,
  slotCardFromStoredString,
} from "@/lib/slot/config";
import type {
  SlotBonusState,
  SlotComboStep,
  SlotPhase,
} from "@/lib/slot/engine";
import { getSlotComboCatalog, resolveComboAudio } from "@/lib/slot/engine";
import { getBaseAppBlur, isBaseAppWebView } from "@/lib/utils/miniapp";

type SlotUiText = {
  spin: string; deposit: string; withdraw: string; buyBonus: string;
  bet: string; balance: string; freeSpins: string; bonusMode: string;
  bonusSpin: string; bonusRemaining: string; winUpTo: string;
  connectWallet: string; accessDenied: string; accessDeniedDesc: string; welcome: string; slotTitle: string;
  howToPlay: string; combos: string; mechanics: string; howToDeposit: string;
  prev: string; next: string; play: string; missing: string;
  freeSpinsDay: string; noDeposit: string;

  spinLog: string; noSpinsYet: string;
  betPrefix: string;
  bonusBadge: string;
  turboOn: string;
  turboOff: string;
  foilBadge: string;
  lockedBadge: string;

  helpWelcomeSubtitle: string;
  helpComboRateHint: string;
  helpCardDailyFreeSpinsTitle: string;
  helpCardDailyFreeSpinsDesc: string;
  helpCardCascadeTitle: string;
  helpCardCascadeDesc: string;
  helpCardFoilsTitle: string;
  helpCardFoilsDesc: string;
  helpCardBonusModeTitle: string;
  helpCardBonusModeDesc: string;

  helpCombosPayoutTableTitle: string;
  helpRankComboTitle: string;
  helpRankComboTagline: string;
  helpRankComboDesc: string;
  helpRankComboExample: string;
  helpQuadComboTitle: string;
  helpQuadComboTagline: string;
  helpQuadComboDesc: string;
  helpQuadComboExample: string;
  helpCombosPayoutAceLabel: string;
  helpCombosPayoutKingLabel: string;
  helpCombosPayoutQueenLabel: string;
  helpCombosPayoutJackLabel: string;
  helpCombosPayoutTenLabel: string;
  helpCombosPayoutNineLabel: string;
  helpCombosPayoutEightLabel: string;
  helpCombosPayoutSevenLabel: string;
  helpCombosPayoutTwoToSixLabel: string;
  helpMechanicCascadeTitle: string;
  helpMechanicCascadeDesc: string;
  helpMechanicFoilTitle: string;
  helpMechanicFoilDesc: string;
  helpMechanicBonusModeTitle: string;
  helpMechanicBonusModeDesc: string;
  helpMechanicDragukkaTitle: string;
  helpMechanicDragukkaDesc: string;
  helpMechanicWildcardsTitle: string;
  helpMechanicWildcardsDesc: string;

  helpDepositNeedVbmsTitle: string;
  helpDepositStep1Title: string;
  helpDepositStep1Desc: string;
  helpDepositStep2Title: string;
  helpDepositStep2Desc: string;
  helpDepositStep3Title: string;
  helpDepositStep3Desc: string;
  helpDepositStep4Title: string;
  helpDepositStep4Desc: string;
  helpDepositContractLabel: string;
  helpDepositApproveTransferLabel: string;
  helpDepositTransferLabel: string;
  helpDepositApproveLabel: string;
  helpDepositDepositLabel: string;
  helpDepositUniswapLabel: string;
  helpDepositBaseLabel: string;
  helpDepositVbmsLabel: string;
  helpDepositCoinsLabel: string;
  helpDepositTopOfSlotLabel: string;
  helpDepositTwoTxLabel: string;
  helpDepositRatioLabel: string;
  helpDepositWithdrawAnytimeLabel: string;
  helpDepositAddressShort: string;
  helpDepositContractAddressLine: string;
  helpDepositClickDepositQuoted: string;
  helpDepositChooseAmountsLine: string;
  helpDepositTwoTransactionsLine: string;
  helpDepositReceiveCoinsLine: string;

  dragToRotate: string; close: string;
  continue: string; cancel: string; confirm: string;
  bonusWildcardStays: string;
  bonusTitle: string;
  playBonus: string;
  bonusCompleted: string;
  bonusCoinsWon: string;
  shareWin: string;
  closeX: string;
  cardBackAlt: string;
  tapToDismiss: string;

  coins: string;

  errorProfileNotFound: string;
  errorConnectWalletFirst: string;
  errorAccessDeniedDevOnly: string;
  errorInsufficientCoins: string;

  raritySpecial: string;
  rarityMythic: string;
  rarityLegendary: string;
  rarityEpic: string;
  rarityRare: string;
  rarityCommon: string;

  recoveredSpinToast: string;
  winToast: string;
  bonusRoundCast: string;
  bigWinCast: string;
  bigWinLabel: string;
  costLabel: string;
  prizeMultiplierLabel: string;
  currentBalanceLabel: string;
};

const SLOT_UI_TRANSLATIONS: Record<string, Partial<SlotUiText>> = {
  en:      { spin:"SPIN",deposit:"DEPOSIT",withdraw:"WITHDRAW",buyBonus:"BUY BONUS",bet:"BET",balance:"BALANCE",freeSpins:"FREE SPINS",bonusMode:"BONUS MODE",bonusSpin:"BONUS SPIN",bonusRemaining:"remaining",winUpTo:"WIN UP TO",connectWallet:"Connect wallet!",accessDenied:"Access restricted!",accessDeniedDesc:"This slot machine is private and under development.",welcome:"Welcome",slotTitle:"Tukka Slots",howToPlay:"How to play →",combos:"Combos",mechanics:"Mechanics",howToDeposit:"How to Deposit",prev:"← Prev",next:"Next →",play:"Play! 🎰",missing:"Missing",freeSpinsDay:"5 free spins per day!",noDeposit:"No deposit needed to start",spinLog:"Spin Log",noSpinsYet:"No spins yet",betPrefix:"bet",bonusBadge:"BONUS",turboOn:"Turbo ON",turboOff:"Turbo OFF",foilBadge:"FOIL",lockedBadge:"LOCKED",helpWelcomeSubtitle:"Card slot with cascading combos",helpComboRateHint:"Target: ~1 combo every 5 spins. First daily spins have higher chance.",helpCardDailyFreeSpinsTitle:"5 free spins",helpCardDailyFreeSpinsDesc:"Every day, no cost",helpCardCascadeTitle:"Cascade",helpCardCascadeDesc:"Chain combos pay more",helpCardFoilsTitle:"Foils",helpCardFoilsDesc:"Golden cards that stack",helpCardBonusModeTitle:"Bonus Mode",helpCardBonusModeDesc:"4+ foils = 10 bonus spins",helpCombosPayoutTableTitle:"Real payouts (% of bet)",helpRankComboTitle:"Rank Combo",helpRankComboTagline:"most common",helpRankComboDesc:"4 cards of the same rank forming one of 23 valid patterns: horizontal, vertical, diagonal or L-shape. Position matters!",helpRankComboExample:"= \"The Anon Council\" 🔥",helpQuadComboTitle:"Quad Combo",helpQuadComboTagline:"3× stronger",helpQuadComboDesc:"4 identical cards (exact same card). Much rarer, pays 3× the rank combo.",helpQuadComboExample:"= \"Tukka Takeover\" 💀",helpCombosPayoutAceLabel:"Ace (A)",helpCombosPayoutKingLabel:"King (K)",helpCombosPayoutQueenLabel:"Queen (Q)",helpCombosPayoutJackLabel:"Jack (J)",helpCombosPayoutTenLabel:"10",helpCombosPayoutNineLabel:"9",helpCombosPayoutEightLabel:"8",helpCombosPayoutSevenLabel:"7",helpCombosPayoutTwoToSixLabel:"2–6",helpMechanicCascadeTitle:"CASCADE",helpMechanicCascadeDesc:"When a combo happens, cards disappear and new ones fall. Today cascade combos have NO extra multiplier: payout is flat per combo.",helpMechanicFoilTitle:"FOIL (gold card)",helpMechanicFoilDesc:"Foil cards are NOT destroyed in combos — they stay on the grid and stack. More foils = higher chance to trigger Bonus Mode.",helpMechanicBonusModeTitle:"BONUS MODE",helpMechanicBonusModeDesc:"4+ foils on the final grid trigger 10 bonus spins. During bonus, getting 4+ foils again adds 10 more spins.",helpMechanicDragukkaTitle:"DRAGUKKA (Joker)",helpMechanicDragukkaDesc:"Appears only in Bonus Mode. Stays on the grid for all 10 spins and can replace any card — but only once per spin.",helpMechanicWildcardsTitle:"NEYMAR & CLAWD (Wildcard)",helpMechanicWildcardsDesc:"Appear in normal mode. They can complete any combo as the missing card, but disappear after being used.",helpDepositNeedVbmsTitle:"Need VBMS to play?",helpDepositStep1Title:"Get VBMS",helpDepositStep1Desc:"Buy VBMS on Uniswap or earn it by playing on the site. Contract: 0xF14C1...728 (Base)",helpDepositStep2Title:"Click \"Deposit\"",helpDepositStep2Desc:"At the top of the slot screen, click the Deposit button. Choose the amount (100, 250, 500, or 1000 VBMS).",helpDepositStep3Title:"Approve and Transfer",helpDepositStep3Desc:"Two transactions in your wallet: 1) Approve (authorize spending), 2) Transfer (send the VBMS).",helpDepositStep4Title:"Receive Coins",helpDepositStep4Desc:"1 VBMS = 10 Coins to play. Coins stay in your account and can be withdrawn back anytime.",bonusWildcardStays:"The Wildcard stays on the grid for the entire bonus!",bonusTitle:"BONUS!",playBonus:"🎰 PLAY BONUS",bonusCompleted:"Bonus Complete!",bonusCoinsWon:"coins won in bonus",shareWin:"🔗 Share Win",dragToRotate:"Drag to rotate",closeX:"✕ Close",cardBackAlt:"Card back",tapToDismiss:"tap anywhere to dismiss",coins:"coins",errorProfileNotFound:"Profile not found",errorConnectWalletFirst:"Please connect wallet first",errorAccessDeniedDevOnly:"Access denied: slot restricted to developer wallets",errorInsufficientCoins:"Insufficient coins. Need {amount} coins to spin.",raritySpecial:"SPECIAL",rarityMythic:"MYTHIC",rarityLegendary:"LEGEND",rarityEpic:"EPIC",rarityRare:"RARE",rarityCommon:"COMMON",recoveredSpinToast:"🎰 Spin recovered! You won +{amount} coins (ID: {id})",winToast:"+{amount} coins!",bonusRoundCast:"🎰 Bonus Round: +{amount} coins{mult} {by} on Tukka Slots!",bigWinCast:"🎰 {label} +{amount} coins{mult} {by} on Tukka Slots!",bigWinLabel:"{label}!",costLabel:"Cost",prizeMultiplierLabel:"Prize multiplier",currentBalanceLabel:"Current balance" },
  "pt-BR": { spin:"GIRAR",deposit:"DEPOSITAR",withdraw:"SACAR",buyBonus:"COMPRAR BÔNUS",bet:"APOSTA",balance:"SALDO",freeSpins:"GIROS GRÁTIS",bonusMode:"MODO BÔNUS",bonusSpin:"GIRO BÔNUS",bonusRemaining:"restantes",winUpTo:"GANHE ATÉ",connectWallet:"Conecte a carteira!",accessDenied:"Acesso restrito!",accessDeniedDesc:"Este slot machine é privado e está em desenvolvimento.",welcome:"Bem-vindo",slotTitle:"Tukka Slots",howToPlay:"Ver como jogar →",combos:"Combos",mechanics:"Mecânicas",howToDeposit:"Como Depositar",prev:"← Anterior",next:"Próximo →",play:"Jogar! 🎰",missing:"Faltou",freeSpinsDay:"5 giros grátis por dia!",noDeposit:"Não precisa depositar para começar",spinLog:"Spin Log",noSpinsYet:"Nenhum spin ainda",betPrefix:"aposta",bonusBadge:"BÔNUS",turboOn:"Turbo ON",turboOff:"Turbo OFF",foilBadge:"FOIL",lockedBadge:"LOCKED",helpWelcomeSubtitle:"Slot de cartas com combos em cascata",helpComboRateHint:"Meta: ~1 combo a cada 5 spins. Primeiros giros do dia têm chance maior.",helpCardDailyFreeSpinsTitle:"5 giros grátis",helpCardDailyFreeSpinsDesc:"Todo dia, sem custo",helpCardCascadeTitle:"Cascata",helpCardCascadeDesc:"Combos encadeiam e pagam mais",helpCardFoilsTitle:"Foils",helpCardFoilsDesc:"Cartas douradas que acumulam",helpCardBonusModeTitle:"Bonus Mode",helpCardBonusModeDesc:"4+ foils = 10 giros bônus",helpCombosPayoutTableTitle:"Pagamentos reais (% da aposta)",helpRankComboTitle:"Rank Combo",helpRankComboTagline:"mais comum",helpRankComboDesc:"4 cartas do mesmo rank formando um dos 23 padrões válidos: horizontal, vertical, diagonal ou L. A posição importa!",helpRankComboExample:"= \"The Anon Council\" 🔥",helpQuadComboTitle:"Quad Combo",helpQuadComboTagline:"3× mais forte",helpQuadComboDesc:"4 cartas idênticas (mesma carta exata). Muito mais raro, paga 3× o rank combo.",helpQuadComboExample:"= \"Tukka Takeover\" 💀",helpMechanicCascadeTitle:"CASCADE",helpMechanicCascadeDesc:"Quando um combo ocorre, as cartas somem e novas caem. Hoje os combos em cascata NÃO têm multiplicador extra: o payout é flat por combo.",helpMechanicFoilTitle:"FOIL (carta dourada)",helpMechanicFoilDesc:"Cartas foil NÃO são destruídas no combo — ficam no grid e acumulam. Quanto mais foils, maior a chance de Bonus Mode.",helpMechanicBonusModeTitle:"BONUS MODE",helpMechanicBonusModeDesc:"4+ foils no grid final ativam 10 giros bônus. Durante o bônus, 4+ foils novamente adicionam mais 10 giros.",helpMechanicDragukkaTitle:"DRAGUKKA (Joker)",helpMechanicDragukkaDesc:"Aparece só no Bonus Mode. Fica no grid por todas as 10 rodadas e pode substituir qualquer carta — mas só 1 vez por rodada.",helpMechanicWildcardsTitle:"NEYMAR & CLAWD (Coringa)",helpMechanicWildcardsDesc:"Aparecem no modo normal. Podem completar qualquer combo no lugar faltando, mas somem após serem usados.",helpDepositNeedVbmsTitle:"Precisa de VBMS para jogar?",helpDepositStep1Title:"Consiga VBMS",helpDepositStep1Desc:"Compre VBMS na Uniswap ou ganhe jogando no site. Contract: 0xF14C1...728 (Base)",helpDepositStep2Title:"Clique em \"Deposit\"",helpDepositStep2Desc:"No topo da tela do slot, clique no botão Deposit. Escolha o valor (100, 250, 500 ou 1000 VBMS).",helpDepositStep3Title:"Aprovar e Transferir",helpDepositStep3Desc:"Duas transações na sua carteira: 1ª Approve (autoriza o gasto), 2ª Transfer (envia os VBMS).",helpDepositStep4Title:"Receba Coins",helpDepositStep4Desc:"1 VBMS = 10 Coins para jogar. Coins ficam na sua conta e podem ser sacados de volta a qualquer hora.",bonusWildcardStays:"A Wildcard permanece no grid durante todo o bônus!",bonusTitle:"BÔNUS!",playBonus:"🎰 JOGAR BÔNUS",bonusCompleted:"Bônus concluído!",bonusCoinsWon:"coins ganhos no bônus",shareWin:"🔗 Compartilhar",dragToRotate:"Arraste para girar",closeX:"✕ Fechar",cardBackAlt:"Verso da carta",tapToDismiss:"toque em qualquer lugar para fechar",coins:"coins",errorProfileNotFound:"Perfil não encontrado",errorConnectWalletFirst:"Conecte a carteira primeiro",errorAccessDeniedDevOnly:"Acesso negado: slot restrito para carteiras dev",errorInsufficientCoins:"Coins insuficientes. Precisa de {amount} coins para girar.",raritySpecial:"SPECIAL",rarityMythic:"MYTHIC",rarityLegendary:"LEGEND",rarityEpic:"EPIC",rarityRare:"RARE",rarityCommon:"COMMON",recoveredSpinToast:"🎰 Spin recuperado! Você ganhou +{amount} coins (ID: {id})",winToast:"+{amount} coins!",bonusRoundCast:"🎰 Rodada bônus: +{amount} coins{mult} {by} no Tukka Slots!",bigWinCast:"🎰 {label} +{amount} coins{mult} {by} no Tukka Slots!",bigWinLabel:"{label}!",costLabel:"Custo",prizeMultiplierLabel:"Multiplicador de prêmio",currentBalanceLabel:"Saldo atual" },
  es:      { spin:"GIRAR",deposit:"DEPOSITAR",withdraw:"RETIRAR",buyBonus:"COMPRAR BONO",bet:"APUESTA",balance:"SALDO",freeSpins:"GIROS GRATIS",bonusMode:"MODO BONO",bonusSpin:"GIRO BONO",bonusRemaining:"restantes",winUpTo:"GANA HASTA",connectWallet:"¡Conecta la billetera!",accessDenied:"¡Acceso restringido!",accessDeniedDesc:"Esta máquina tragamonedas es privada y está en desarrollo.",welcome:"Bienvenido",slotTitle:"Tukka Slots",howToPlay:"Ver cómo jugar →",combos:"Combos",mechanics:"Mecánicas",howToDeposit:"Cómo Depositar",prev:"← Anterior",next:"Siguiente →",play:"¡Jugar! 🎰",missing:"Faltó",freeSpinsDay:"¡5 giros gratis por día!",noDeposit:"No necesitas depositar para empezar",spinLog:"Spin Log",noSpinsYet:"Aún no hay giros",betPrefix:"apuesta",bonusBadge:"BONUS",turboOn:"Turbo ON",turboOff:"Turbo OFF",foilBadge:"FOIL",lockedBadge:"LOCKED",helpWelcomeSubtitle:"Slot de cartas con combos en cascada",helpComboRateHint:"Objetivo: ~1 combo cada 5 giros. Los primeros giros del día tienen más probabilidad.",helpCardDailyFreeSpinsTitle:"5 giros gratis",helpCardDailyFreeSpinsDesc:"Cada día, sin costo",helpCardCascadeTitle:"Cascada",helpCardCascadeDesc:"Los combos encadenados pagan más",helpCardFoilsTitle:"Foils",helpCardFoilsDesc:"Cartas doradas que se acumulan",helpCardBonusModeTitle:"Modo Bonus",helpCardBonusModeDesc:"4+ foils = 10 giros bonus",helpCombosPayoutTableTitle:"Pagos reales (% de la apuesta)",helpRankComboTitle:"Rank Combo",helpRankComboTagline:"más común",helpRankComboDesc:"4 cartas del mismo rango formando uno de los 23 patrones válidos: horizontal, vertical, diagonal o L. ¡La posición importa!",helpRankComboExample:"= \"The Anon Council\" 🔥",helpQuadComboTitle:"Quad Combo",helpQuadComboTagline:"3× más fuerte",helpQuadComboDesc:"4 cartas idénticas (la misma carta exacta). Mucho más raro, paga 3× el rank combo.",helpQuadComboExample:"= \"Tukka Takeover\" 💀",helpMechanicCascadeTitle:"CASCADE",helpMechanicCascadeDesc:"Cuando ocurre un combo, las cartas desaparecen y caen nuevas. Hoy los combos en cascada NO tienen multiplicador extra: el pago es plano por combo.",helpMechanicFoilTitle:"FOIL (carta dorada)",helpMechanicFoilDesc:"Las cartas foil NO se destruyen en el combo: se quedan en la cuadrícula y se acumulan. Más foils = mayor probabilidad de activar el Modo Bonus.",helpMechanicBonusModeTitle:"MODO BONUS",helpMechanicBonusModeDesc:"4+ foils en la cuadrícula final activan 10 giros bonus. Durante el bonus, conseguir 4+ foils de nuevo añade 10 giros más.",helpMechanicDragukkaTitle:"DRAGUKKA (Joker)",helpMechanicDragukkaDesc:"Aparece solo en Modo Bonus. Se queda en la cuadrícula durante los 10 giros y puede reemplazar cualquier carta, pero solo una vez por giro.",helpMechanicWildcardsTitle:"NEYMAR & CLAWD (Comodines)",helpMechanicWildcardsDesc:"Aparecen en el modo normal. Pueden completar cualquier combo como carta faltante, pero desaparecen después de usarse.",helpDepositNeedVbmsTitle:"¿Necesitas VBMS para jugar?",helpDepositStep1Title:"Consigue VBMS",helpDepositStep1Desc:"Compra VBMS en Uniswap o gánalo jugando en el sitio. Contrato: 0xF14C1...728 (Base)",helpDepositStep2Title:"Haz clic en \"Deposit\"",helpDepositStep2Desc:"En la parte superior de la pantalla del slot, haz clic en el botón Deposit. Elige el monto (100, 250, 500 o 1000 VBMS).",helpDepositStep3Title:"Aprobar y Transferir",helpDepositStep3Desc:"Dos transacciones en tu billetera: 1) Approve (autorizar gasto), 2) Transfer (enviar los VBMS).",helpDepositStep4Title:"Recibe Coins",helpDepositStep4Desc:"1 VBMS = 10 Coins para jugar. Las Coins quedan en tu cuenta y se pueden retirar cuando quieras.",bonusWildcardStays:"El comodín permanece en la cuadrícula durante todo el bono.",bonusTitle:"¡BONO!",playBonus:"🎰 JUGAR BONO",bonusCompleted:"¡Bono terminado!",bonusCoinsWon:"monedas ganadas en el bono",shareWin:"🔗 Compartir",dragToRotate:"Arrastra para girar",closeX:"✕ Cerrar",cardBackAlt:"Reverso de la carta",tapToDismiss:"toca en cualquier lugar para cerrar",coins:"monedas",errorProfileNotFound:"Perfil no encontrado",errorConnectWalletFirst:"Conecta la billetera primero",errorAccessDeniedDevOnly:"Acceso denegado: slot restringido a billeteras dev",errorInsufficientCoins:"Monedas insuficientes. Necesitas {amount} monedas para girar.",raritySpecial:"SPECIAL",rarityMythic:"MYTHIC",rarityLegendary:"LEGEND",rarityEpic:"EPIC",rarityRare:"RARE",rarityCommon:"COMMON",recoveredSpinToast:"🎰 ¡Giro recuperado! Ganaste +{amount} monedas (ID: {id})",winToast:"+{amount} monedas!",bonusRoundCast:"🎰 Ronda bonus: +{amount} monedas{mult} {by} en Tukka Slots!",bigWinCast:"🎰 {label} +{amount} monedas{mult} {by} en Tukka Slots!",bigWinLabel:"{label}!",costLabel:"Costo",prizeMultiplierLabel:"Multiplicador",currentBalanceLabel:"Saldo actual" },
  hi:      { spin:"घुमाएं",deposit:"जमा",withdraw:"निकालें",buyBonus:"बोनस खरीदें",bet:"दांव",balance:"शेष",freeSpins:"मुफ्त स्पिन",bonusMode:"बोनस मोड",bonusSpin:"बोनस स्पिन",bonusRemaining:"शेष",winUpTo:"तक जीतें",connectWallet:"वॉलेट कनेक्ट करें!",accessDenied:"पहुँच प्रतिबंधित!",accessDeniedDesc:"यह स्लॉट मशीन निजी है और विकास में है।",welcome:"स्वागत",slotTitle:"Tukka Slots",howToPlay:"खेलना सीखें →",combos:"कॉम्बो",mechanics:"यांत्रिकी",howToDeposit:"जमा कैसे करें",prev:"← पिछला",next:"अगला →",play:"खेलें! 🎰",missing:"कमी",freeSpinsDay:"प्रतिदिन 10 मुफ्त स्पिन!",noDeposit:"शुरू करने के लिए जमा की जरूरत नहीं",spinLog:"Spin Log",noSpinsYet:"अभी तक कोई स्पिन नहीं",betPrefix:"दांव",bonusBadge:"BONUS",turboOn:"Turbo ON",turboOff:"Turbo OFF",foilBadge:"FOIL",lockedBadge:"LOCKED",helpWelcomeSubtitle:"कैस्केडिंग कॉम्बो वाला कार्ड स्लॉट",helpComboRateHint:"लक्ष्य: लगभग हर 5 स्पिन में 1 कॉम्बो। दिन के शुरुआती स्पिन में संभावना अधिक है।",helpCardDailyFreeSpinsTitle:"10 मुफ्त स्पिन",helpCardDailyFreeSpinsDesc:"हर दिन, बिना लागत",helpCardCascadeTitle:"कैस्केड",helpCardCascadeDesc:"चेन कॉम्बो ज़्यादा भुगतान करते हैं",helpCardFoilsTitle:"फॉइल्स",helpCardFoilsDesc:"सुनहरे कार्ड जो जमा होते हैं",helpCardBonusModeTitle:"बोनस मोड",helpCardBonusModeDesc:"4+ फॉइल = 10 बोनस स्पिन",helpCombosPayoutTableTitle:"वास्तविक भुगतान (% दांव)",helpMechanicCascadeTitle:"CASCADE",helpMechanicCascadeDesc:"जब कोई कॉम्बो होता है, कार्ड गायब हो जाते हैं और नए गिरते हैं। आज कैस्केड कॉम्बो का कोई अतिरिक्त गुणक नहीं है: भुगतान प्रति कॉम्बो फ्लैट है।",helpMechanicFoilTitle:"FOIL (गोल्ड कार्ड)",helpMechanicFoilDesc:"Foil कार्ड कॉम्बो में नष्ट नहीं होते — वे ग्रिड पर रहते हैं और जमा होते हैं। अधिक foils = बोनस मोड की अधिक संभावना।",helpMechanicBonusModeTitle:"बोनस मोड",helpMechanicBonusModeDesc:"अंतिम ग्रिड में 4+ foils होने पर 10 बोनस स्पिन मिलते हैं। बोनस के दौरान फिर से 4+ foils मिलने पर 10 और स्पिन जुड़ते हैं।",helpMechanicDragukkaTitle:"DRAGUKKA (Joker)",helpMechanicDragukkaDesc:"केवल बोनस मोड में आता है। पूरे 10 स्पिन तक ग्रिड पर रहता है और किसी भी कार्ड की जगह ले सकता है — लेकिन प्रति स्पिन केवल 1 बार।",helpMechanicWildcardsTitle:"NEYMAR & CLAWD (वाइल्डकार्ड)",helpMechanicWildcardsDesc:"नॉर्मल मोड में आते हैं। किसी भी कॉम्बो में गायब कार्ड की जगह पूरा कर सकते हैं, लेकिन इस्तेमाल के बाद गायब हो जाते हैं।",helpDepositNeedVbmsTitle:"खेलने के लिए VBMS चाहिए?",helpDepositStep1Title:"VBMS प्राप्त करें",helpDepositStep1Desc:"Uniswap पर VBMS खरीदें या साइट पर खेलकर कमाएँ। कॉन्ट्रैक्ट: 0xF14C1...728 (Base)",helpDepositStep2Title:"\"Deposit\" पर क्लिक करें",helpDepositStep2Desc:"स्लॉट स्क्रीन के ऊपर Deposit बटन पर क्लिक करें। राशि चुनें (100, 250, 500, या 1000 VBMS)।",helpDepositStep3Title:"Approve और Transfer",helpDepositStep3Desc:"आपके वॉलेट में दो ट्रांजैक्शन: 1) Approve (खर्च की अनुमति), 2) Transfer (VBMS भेजें)।",helpDepositStep4Title:"Coins प्राप्त करें",helpDepositStep4Desc:"1 VBMS = खेलने के लिए 10 Coins। Coins आपके खाते में रहते हैं और कभी भी वापस निकाले जा सकते हैं।",bonusWildcardStays:"वाइल्डकार्ड पूरे बोनस के दौरान ग्रिड पर रहती है!",bonusTitle:"बोनस!",playBonus:"🎰 बोनस खेलें",bonusCompleted:"बोनस पूरा!",bonusCoinsWon:"बोनस में जीते गए कॉइन्स",shareWin:"🔗 शेयर",dragToRotate:"घुमाने के लिए खींचें",closeX:"✕ बंद करें",cardBackAlt:"कार्ड का पिछला भाग",tapToDismiss:"बंद करने के लिए कहीं भी टैप करें",coins:"कॉइन्स",errorProfileNotFound:"प्रोफ़ाइल नहीं मिली",errorConnectWalletFirst:"पहले वॉलेट कनेक्ट करें",errorAccessDeniedDevOnly:"एक्सेस अस्वीकृत: स्लॉट केवल dev वॉलेट के लिए",errorInsufficientCoins:"कॉइन्स पर्याप्त नहीं। स्पिन करने के लिए {amount} कॉइन्स चाहिए।",raritySpecial:"SPECIAL",rarityMythic:"MYTHIC",rarityLegendary:"LEGEND",rarityEpic:"EPIC",rarityRare:"RARE",rarityCommon:"COMMON",recoveredSpinToast:"🎰 स्पिन रिकवर हुआ! आपने +{amount} कॉइन्स जीते (ID: {id})",winToast:"+{amount} कॉइन्स!",bonusRoundCast:"🎰 बोनस राउंड: +{amount} कॉइन्स{mult} {by} Tukka Slots में!",bigWinCast:"🎰 {label} +{amount} कॉइन्स{mult} {by} Tukka Slots में!",bigWinLabel:"{label}!",costLabel:"लागत",prizeMultiplierLabel:"पुरस्कार गुणक",currentBalanceLabel:"वर्तमान शेष" },
  ru:      { spin:"КРУТИТЬ",deposit:"ПОПОЛНИТЬ",withdraw:"ВЫВЕСТИ",buyBonus:"КУПИТЬ БОНУС",bet:"СТАВКА",balance:"БАЛАНС",freeSpins:"БЕСПЛАТНЫЕ",bonusMode:"БОНУС РЕЖИМ",bonusSpin:"БОНУС СПИН",bonusRemaining:"осталось",winUpTo:"ВЫИГРАЙ ДО",connectWallet:"Подключи кошелёк!",accessDenied:"Доступ закрыт!",accessDeniedDesc:"Этот слот-автомат приватный и находится в разработке.",welcome:"Добро пожаловать",slotTitle:"Tukka Slots",howToPlay:"Как играть →",combos:"Комбо",mechanics:"Механики",howToDeposit:"Как пополнить",prev:"← Назад",next:"Далее →",play:"Играть! 🎰",missing:"Не хватает",freeSpinsDay:"10 бесплатных спинов в день!",noDeposit:"Депозит не нужен для старта",spinLog:"Spin Log",noSpinsYet:"Пока нет спинов",betPrefix:"ставка",bonusBadge:"BONUS",turboOn:"Turbo ON",turboOff:"Turbo OFF",foilBadge:"FOIL",lockedBadge:"LOCKED",helpWelcomeSubtitle:"Карточный слот с каскадными комбо",helpComboRateHint:"Цель: ~1 комбо каждые 5 спинов. Первые спины дня имеют повышенный шанс.",helpCardDailyFreeSpinsTitle:"10 бесплатных спинов",helpCardDailyFreeSpinsDesc:"Каждый день, бесплатно",helpCardCascadeTitle:"Каскад",helpCardCascadeDesc:"Цепочки комбо платят больше",helpCardFoilsTitle:"Фойлы",helpCardFoilsDesc:"Золотые карты, которые накапливаются",helpCardBonusModeTitle:"Бонусный режим",helpCardBonusModeDesc:"4+ фойла = 10 бонусных спинов",helpCombosPayoutTableTitle:"Реальные выплаты (% от ставки)",helpMechanicCascadeTitle:"CASCADE",helpMechanicCascadeDesc:"Когда происходит комбо, карты исчезают и падают новые. Сейчас каскадные комбо НЕ имеют дополнительного множителя: выплата фиксирована за комбо.",helpMechanicFoilTitle:"FOIL (золотая карта)",helpMechanicFoilDesc:"Фойл-карты НЕ уничтожаются в комбо — они остаются на поле и накапливаются. Больше фойлов = выше шанс активировать бонусный режим.",helpMechanicBonusModeTitle:"БОНУС РЕЖИМ",helpMechanicBonusModeDesc:"4+ фойла на финальной сетке дают 10 бонусных спинов. Во время бонуса, если снова собрать 4+ фойла, добавляется ещё 10 спинов.",helpMechanicDragukkaTitle:"DRAGUKKA (Джокер)",helpMechanicDragukkaDesc:"Появляется только в бонусном режиме. Остаётся на поле на все 10 спинов и может заменить любую карту — но только один раз за спин.",helpMechanicWildcardsTitle:"NEYMAR & CLAWD (Вайлдкард)",helpMechanicWildcardsDesc:"Появляются в обычном режиме. Они могут завершить любое комбо как недостающая карта, но исчезают после использования.",helpDepositNeedVbmsTitle:"Нужен VBMS, чтобы играть?",helpDepositStep1Title:"Получите VBMS",helpDepositStep1Desc:"Купите VBMS на Uniswap или заработайте, играя на сайте. Контракт: 0xF14C1...728 (Base)",helpDepositStep2Title:"Нажмите \"Deposit\"",helpDepositStep2Desc:"Вверху экрана слота нажмите кнопку Deposit. Выберите сумму (100, 250, 500 или 1000 VBMS).",helpDepositStep3Title:"Approve и Transfer",helpDepositStep3Desc:"Две транзакции в кошельке: 1) Approve (разрешить списание), 2) Transfer (отправить VBMS).",helpDepositStep4Title:"Получите Coins",helpDepositStep4Desc:"1 VBMS = 10 Coins для игры. Coins остаются на вашем аккаунте и их можно вывести обратно в любое время.",bonusWildcardStays:"Вайлдкард остаётся на поле на весь бонус!",bonusTitle:"БОНУС!",playBonus:"🎰 ИГРАТЬ БОНУС",bonusCompleted:"Бонус завершён!",bonusCoinsWon:"монет выиграно в бонусе",shareWin:"🔗 Поделиться",dragToRotate:"Тяни, чтобы вращать",closeX:"✕ Закрыть",cardBackAlt:"Рубашка карты",tapToDismiss:"нажмите где угодно, чтобы закрыть",coins:"монет",errorProfileNotFound:"Профиль не найден",errorConnectWalletFirst:"Сначала подключите кошелёк",errorAccessDeniedDevOnly:"Доступ запрещён: слот только для dev-кошельков",errorInsufficientCoins:"Недостаточно монет. Нужно {amount} монет для спина.",raritySpecial:"SPECIAL",rarityMythic:"MYTHIC",rarityLegendary:"LEGEND",rarityEpic:"EPIC",rarityRare:"RARE",rarityCommon:"COMMON",recoveredSpinToast:"🎰 Спин восстановлен! Вы выиграли +{amount} монет (ID: {id})",winToast:"+{amount} монет!",bonusRoundCast:"🎰 Бонус-раунд: +{amount} монет{mult} {by} в Tukka Slots!",bigWinCast:"🎰 {label} +{amount} монет{mult} {by} в Tukka Slots!",bigWinLabel:"{label}!",costLabel:"Стоимость",prizeMultiplierLabel:"Множитель",currentBalanceLabel:"Текущий баланс" },
  "zh-CN": { spin:"旋转",deposit:"存入",withdraw:"提取",buyBonus:"购买奖励",bet:"投注",balance:"余额",freeSpins:"免费旋转",bonusMode:"奖励模式",bonusSpin:"奖励旋转",bonusRemaining:"剩余",winUpTo:"最多赢",connectWallet:"连接钱包！",accessDenied:"访问受限！",accessDeniedDesc:"此老虎机为私人测试版，正在开发中。",welcome:"欢迎",slotTitle:"Tukka Slots",howToPlay:"了解玩法 →",combos:"组合",mechanics:"机制",howToDeposit:"如何存入",prev:"← 上一页",next:"下一页 →",play:"开始！🎰",missing:"缺少",freeSpinsDay:"每天10次免费旋转！",noDeposit:"无需存款即可开始",spinLog:"Spin Log",noSpinsYet:"暂无记录",betPrefix:"下注",bonusBadge:"BONUS",turboOn:"Turbo ON",turboOff:"Turbo OFF",foilBadge:"FOIL",lockedBadge:"LOCKED",helpWelcomeSubtitle:"带有连锁组合的卡牌老虎机",helpComboRateHint:"目标：约每 5 次旋转 1 次组合。每日前几次旋转概率更高。",helpCardDailyFreeSpinsTitle:"10 次免费旋转",helpCardDailyFreeSpinsDesc:"每天一次，无成本",helpCardCascadeTitle:"连锁下落",helpCardCascadeDesc:"连锁组合支付更高",helpCardFoilsTitle:"Foils",helpCardFoilsDesc:"会叠加的金色卡牌",helpCardBonusModeTitle:"奖励模式",helpCardBonusModeDesc:"4+ foils = 10 次奖励旋转",helpCombosPayoutTableTitle:"真实赔付（占下注百分比）",helpMechanicCascadeTitle:"CASCADE",helpMechanicCascadeDesc:"当出现组合时，卡牌会消失并有新牌下落。当前连锁组合没有额外倍数：每个组合的赔付固定。",helpMechanicFoilTitle:"FOIL（金卡）",helpMechanicFoilDesc:"Foil 卡不会在组合中被消除——它们会留在格子里并叠加。Foils 越多，触发奖励模式的概率越高。",helpMechanicBonusModeTitle:"奖励模式",helpMechanicBonusModeDesc:"最终格子里有 4+ foils 会触发 10 次奖励旋转。奖励期间再次获得 4+ foils 会再增加 10 次旋转。",helpMechanicDragukkaTitle:"DRAGUKKA（小丑）",helpMechanicDragukkaDesc:"只在奖励模式出现。会在整个 10 次旋转期间留在格子里，并可替代任意卡牌——但每次旋转只能用一次。",helpMechanicWildcardsTitle:"NEYMAR & CLAWD（万能牌）",helpMechanicWildcardsDesc:"在普通模式出现。它们可以作为缺失的卡牌完成任意组合，但使用后会消失。",helpDepositNeedVbmsTitle:"需要 VBMS 才能玩吗？",helpDepositStep1Title:"获取 VBMS",helpDepositStep1Desc:"在 Uniswap 购买 VBMS，或在站内游玩获得。合约：0xF14C1...728（Base）",helpDepositStep2Title:"点击 \"Deposit\"",helpDepositStep2Desc:"在老虎机界面顶部点击 Deposit 按钮。选择数量（100、250、500 或 1000 VBMS）。",helpDepositStep3Title:"Approve 和 Transfer",helpDepositStep3Desc:"钱包中会有两笔交易：1) Approve（授权花费），2) Transfer（发送 VBMS）。",helpDepositStep4Title:"获得 Coins",helpDepositStep4Desc:"1 VBMS = 10 Coins 用于游玩。Coins 会保存在你的账户中，并可随时提现吗。",bonusWildcardStays:"百搭在整个奖励期间都会留在格子里！",bonusTitle:"奖励！",playBonus:"🎰 开始奖励",bonusCompleted:"奖励结束！",bonusCoinsWon:"奖励中赢得的金币",shareWin:"🔗 分享",dragToRotate:"拖动旋转",closeX:"✕ 关闭",cardBackAlt:"卡牌背面",tapToDismiss:"点击任意位置关闭",coins:"金币",errorProfileNotFound:"未找到资料",errorConnectWalletFirst:"请先连接钱包",errorAccessDeniedDevOnly:"拒绝访问：仅限 dev 钱包",errorInsufficientCoins:"金币不足。需要 {amount} 金币才能旋转。",raritySpecial:"SPECIAL",rarityMythic:"MYTHIC",rarityLegendary:"LEGEND",rarityEpic:"EPIC",rarityRare:"RARE",rarityCommon:"COMMON",recoveredSpinToast:"🎰 已恢复旋转！你赢得了 +{amount} 金币（ID: {id}）",winToast:"+{amount} 金币!",bonusRoundCast:"🎰 奖励回合：+{amount} 金币{mult} {by} 在 Tukka Slots!",bigWinCast:"🎰 {label} +{amount} 金币{mult} {by} 在 Tukka Slots!",bigWinLabel:"{label}!",costLabel:"花费",prizeMultiplierLabel:"奖励倍率",currentBalanceLabel:"当前余额" },
  id:      { spin:"PUTAR",deposit:"SETOR",withdraw:"TARIK",buyBonus:"BELI BONUS",bet:"TARUHAN",balance:"SALDO",freeSpins:"PUTARAN GRATIS",bonusMode:"MODE BONUS",bonusSpin:"PUTARAN BONUS",bonusRemaining:"tersisa",winUpTo:"MENANGKAN HINGGA",connectWallet:"Hubungkan dompet!",accessDenied:"Akses dibatasi!",accessDeniedDesc:"Mesin slot ini bersifat pribadi dan sedang dalam pengembangan.",welcome:"Selamat Datang",slotTitle:"Tukka Slots",howToPlay:"Cara bermain →",combos:"Kombo",mechanics:"Mekanisme",howToDeposit:"Cara Setor",prev:"← Sebelumnya",next:"Berikutnya →",play:"Main! 🎰",missing:"Kurang",freeSpinsDay:"10 putaran gratis per hari!",noDeposit:"Tidak perlu setor untuk mulai",spinLog:"Spin Log",noSpinsYet:"Belum ada spin",betPrefix:"taruhan",bonusBadge:"BONUS",turboOn:"Turbo ON",turboOff:"Turbo OFF",foilBadge:"FOIL",lockedBadge:"LOCKED",helpWelcomeSubtitle:"Slot kartu dengan combo berantai",helpComboRateHint:"Target: ~1 combo tiap 5 spin. Spin awal harian punya peluang lebih tinggi.",helpCardDailyFreeSpinsTitle:"10 spin gratis",helpCardDailyFreeSpinsDesc:"Setiap hari, tanpa biaya",helpCardCascadeTitle:"Cascade",helpCardCascadeDesc:"Combo berantai bayar lebih",helpCardFoilsTitle:"Foils",helpCardFoilsDesc:"Kartu emas yang menumpuk",helpCardBonusModeTitle:"Mode Bonus",helpCardBonusModeDesc:"4+ foils = 10 spin bonus",helpCombosPayoutTableTitle:"Pembayaran nyata (% dari taruhan)",helpMechanicCascadeTitle:"CASCADE",helpMechanicCascadeDesc:"Saat kombo terjadi, kartu menghilang dan yang baru jatuh. Saat ini kombo cascade TIDAK punya pengali tambahan: pembayaran flat per kombo.",helpMechanicFoilTitle:"FOIL (kartu emas)",helpMechanicFoilDesc:"Kartu foil TIDAK hancur saat kombo — tetap di grid dan menumpuk. Lebih banyak foils = peluang lebih tinggi memicu Mode Bonus.",helpMechanicBonusModeTitle:"MODE BONUS",helpMechanicBonusModeDesc:"4+ foils di grid akhir memicu 10 spin bonus. Selama bonus, mendapatkan 4+ foils lagi menambah 10 spin.",helpMechanicDragukkaTitle:"DRAGUKKA (Joker)",helpMechanicDragukkaDesc:"Muncul hanya di Mode Bonus. Tetap di grid selama 10 spin dan bisa menggantikan kartu apa pun — tapi hanya sekali per spin.",helpMechanicWildcardsTitle:"NEYMAR & CLAWD (Wildcard)",helpMechanicWildcardsDesc:"Muncul di mode normal. Bisa melengkapi kombo apa pun sebagai kartu yang hilang, tapi hilang setelah digunakan.",helpDepositNeedVbmsTitle:"Butuh VBMS untuk bermain?",helpDepositStep1Title:"Dapatkan VBMS",helpDepositStep1Desc:"Beli VBMS di Uniswap atau dapatkan dengan bermain di situs. Kontrak: 0xF14C1...728 (Base)",helpDepositStep2Title:"Klik \"Deposit\"",helpDepositStep2Desc:"Di bagian atas layar slot, klik tombol Deposit. Pilih jumlah (100, 250, 500, atau 1000 VBMS).",helpDepositStep3Title:"Approve dan Transfer",helpDepositStep3Desc:"Dua transaksi di dompet: 1) Approve (izin belanja), 2) Transfer (kirim VBMS).",helpDepositStep4Title:"Terima Coins",helpDepositStep4Desc:"1 VBMS = 10 Coins untuk bermain. Coins tersimpan di akunmu dan bisa ditarik kembali kapan saja.",bonusWildcardStays:"Wildcard tetap di grid selama bonus!",bonusTitle:"BONUS!",playBonus:"🎰 MAIN BONUS",bonusCompleted:"Bonus selesai!",bonusCoinsWon:"koin menang di bonus",shareWin:"🔗 Bagikan",dragToRotate:"Seret untuk memutar",closeX:"✕ Tutup",cardBackAlt:"Bagian belakang kartu",tapToDismiss:"ketuk di mana saja untuk menutup",coins:"koin",errorProfileNotFound:"Profil tidak ditemukan",errorConnectWalletFirst:"Hubungkan dompet dulu",errorAccessDeniedDevOnly:"Akses ditolak: slot hanya untuk dompet dev",errorInsufficientCoins:"Koin tidak cukup. Perlu {amount} koin untuk memutar.",raritySpecial:"SPECIAL",rarityMythic:"MYTHIC",rarityLegendary:"LEGEND",rarityEpic:"EPIC",rarityRare:"RARE",rarityCommon:"COMMON",recoveredSpinToast:"🎰 Spin dipulihkan! Kamu menang +{amount} koin (ID: {id})",winToast:"+{amount} koin!",bonusRoundCast:"🎰 Ronde bonus: +{amount} koin{mult} {by} di Tukka Slots!",bigWinCast:"🎰 {label} +{amount} koin{mult} {by} di Tukka Slots!",bigWinLabel:"{label}!",costLabel:"Biaya",prizeMultiplierLabel:"Pengali hadiah",currentBalanceLabel:"Saldo saat ini" },
  fr:      { spin:"TOURNER",deposit:"DÉPOSER",withdraw:"RETIRER",buyBonus:"ACHETER BONUS",bet:"MISE",balance:"SOLDE",freeSpins:"TOURS GRATUITS",bonusMode:"MODE BONUS",bonusSpin:"TOUR BONUS",bonusRemaining:"restants",winUpTo:"GAGNER JUSQU'À",connectWallet:"Connectez le portefeuille!",accessDenied:"Accès restreint!",accessDeniedDesc:"Cette machine à sous est privée et en cours de développement.",welcome:"Bienvenue",slotTitle:"Tukka Slots",howToPlay:"Comment jouer →",combos:"Combos",mechanics:"Mécaniques",howToDeposit:"Comment Déposer",prev:"← Précédent",next:"Suivant →",play:"Jouer! 🎰",missing:"Manque",freeSpinsDay:"10 tours gratuits par jour!",noDeposit:"Pas besoin de dépôt pour commencer",spinLog:"Spin Log",noSpinsYet:"Aucun spin pour l'instant",betPrefix:"mise",bonusBadge:"BONUS",turboOn:"Turbo ON",turboOff:"Turbo OFF",foilBadge:"FOIL",lockedBadge:"LOCKED",helpWelcomeSubtitle:"Machine à sous de cartes avec combos en cascade",helpComboRateHint:"Objectif : ~1 combo tous les 5 spins. Les premiers spins du jour ont une probabilité plus élevée.",helpCardDailyFreeSpinsTitle:"10 tours gratuits",helpCardDailyFreeSpinsDesc:"Chaque jour, sans coût",helpCardCascadeTitle:"Cascade",helpCardCascadeDesc:"Les combos en chaîne paient plus",helpCardFoilsTitle:"Foils",helpCardFoilsDesc:"Cartes dorées qui s'accumulent",helpCardBonusModeTitle:"Mode Bonus",helpCardBonusModeDesc:"4+ foils = 10 tours bonus",helpCombosPayoutTableTitle:"Paiements réels (% de la mise)",helpMechanicCascadeTitle:"CASCADE",helpMechanicCascadeDesc:"Quand un combo se produit, les cartes disparaissent et de nouvelles tombent. Aujourd'hui, les combos en cascade n'ont PAS de multiplicateur supplémentaire : le paiement est fixe par combo.",helpMechanicFoilTitle:"FOIL (carte dorée)",helpMechanicFoilDesc:"Les cartes foil ne sont PAS détruites dans un combo : elles restent sur la grille et s'empilent. Plus de foils = plus de chances de déclencher le Mode Bonus.",helpMechanicBonusModeTitle:"MODE BONUS",helpMechanicBonusModeDesc:"4+ foils sur la grille finale déclenchent 10 tours bonus. Pendant le bonus, obtenir à nouveau 4+ foils ajoute 10 tours supplémentaires.",helpMechanicDragukkaTitle:"DRAGUKKA (Joker)",helpMechanicDragukkaDesc:"Apparaît uniquement en Mode Bonus. Reste sur la grille pendant les 10 tours et peut remplacer n'importe quelle carte — mais une seule fois par tour.",helpMechanicWildcardsTitle:"NEYMAR & CLAWD (Wildcard)",helpMechanicWildcardsDesc:"Apparaissent en mode normal. Ils peuvent compléter n'importe quel combo comme carte manquante, mais disparaissent après utilisation.",helpDepositNeedVbmsTitle:"Besoin de VBMS pour jouer ?",helpDepositStep1Title:"Obtenir du VBMS",helpDepositStep1Desc:"Achetez du VBMS sur Uniswap ou gagnez-en en jouant sur le site. Contrat : 0xF14C1...728 (Base)",helpDepositStep2Title:"Cliquez sur \"Deposit\"",helpDepositStep2Desc:"En haut de l'écran de la machine à sous, cliquez sur le bouton Deposit. Choisissez le montant (100, 250, 500 ou 1000 VBMS).",helpDepositStep3Title:"Approve et Transfer",helpDepositStep3Desc:"Deux transactions dans votre portefeuille : 1) Approve (autoriser la dépense), 2) Transfer (envoyer le VBMS).",helpDepositStep4Title:"Recevoir des Coins",helpDepositStep4Desc:"1 VBMS = 10 Coins pour jouer. Les Coins restent sur votre compte et peuvent être retirées à tout moment.",bonusWildcardStays:"Le joker reste sur la grille pendant tout le bonus !",bonusTitle:"BONUS!",playBonus:"🎰 JOUER LE BONUS",bonusCompleted:"Bonus terminé!",bonusCoinsWon:"pièces gagnées en bonus",shareWin:"🔗 Partager",dragToRotate:"Glissez pour tourner",closeX:"✕ Fermer",cardBackAlt:"Dos de carte",tapToDismiss:"touchez n'importe où pour fermer",coins:"pièces",errorProfileNotFound:"Profil introuvable",errorConnectWalletFirst:"Connectez d'abord le portefeuille",errorAccessDeniedDevOnly:"Accès refusé : slot réservé aux portefeuilles dev",errorInsufficientCoins:"Pièces insuffisantes. Il faut {amount} pièces pour tourner.",raritySpecial:"SPECIAL",rarityMythic:"MYTHIC",rarityLegendary:"LEGEND",rarityEpic:"EPIC",rarityRare:"RARE",rarityCommon:"COMMON",recoveredSpinToast:"🎰 Spin récupéré ! Vous avez gagné +{amount} pièces (ID: {id})",winToast:"+{amount} pièces!",bonusRoundCast:"🎰 Tour bonus : +{amount} pièces{mult} {by} sur Tukka Slots!",bigWinCast:"🎰 {label} +{amount} pièces{mult} {by} sur Tukka Slots!",bigWinLabel:"{label}!",costLabel:"Coût",prizeMultiplierLabel:"Multiplicateur",currentBalanceLabel:"Solde actuel" },
  ja:      { spin:"回す",deposit:"入金",withdraw:"出金",buyBonus:"ボーナス購入",bet:"ベット",balance:"残高",freeSpins:"フリースピン",bonusMode:"ボーナスモード",bonusSpin:"ボーナススピン",bonusRemaining:"残り",winUpTo:"最大で獲得",connectWallet:"ウォレットを接続！",accessDenied:"アクセス制限！",accessDeniedDesc:"このスロットマシンはプライベートで開発中です。",welcome:"ようこそ",slotTitle:"Tukka Slots",howToPlay:"遊び方を見る →",combos:"コンボ",mechanics:"仕組み",howToDeposit:"入金方法",prev:"← 前へ",next:"次へ →",play:"プレイ！🎰",missing:"不足",freeSpinsDay:"毎日10回フリースピン！",noDeposit:"開始に入金不要",spinLog:"Spin Log",noSpinsYet:"まだスピンがありません",betPrefix:"ベット",bonusBadge:"BONUS",turboOn:"Turbo ON",turboOff:"Turbo OFF",foilBadge:"FOIL",lockedBadge:"LOCKED",helpWelcomeSubtitle:"カスケードコンボのカードスロット",helpComboRateHint:"目標：およそ 5 スピンに 1 回コンボ。毎日の最初のスピンは確率が高い。",helpCardDailyFreeSpinsTitle:"10 回フリースピン",helpCardDailyFreeSpinsDesc:"毎日、無料",helpCardCascadeTitle:"カスケード",helpCardCascadeDesc:"連鎖コンボほど高配当",helpCardFoilsTitle:"Foils",helpCardFoilsDesc:"重なるゴールドカード",helpCardBonusModeTitle:"ボーナスモード",helpCardBonusModeDesc:"4+ foils = 10 ボーナススピン",helpCombosPayoutTableTitle:"実際の配当（ベット比率%）",helpMechanicCascadeTitle:"CASCADE",helpMechanicCascadeDesc:"コンボが発生するとカードが消え、新しいカードが落ちてきます。現在カスケードコンボに追加倍率はありません：配当はコンボごとに固定です。",helpMechanicFoilTitle:"FOIL（ゴールドカード）",helpMechanicFoilDesc:"Foil カードはコンボで消えません——グリッドに残って蓄積します。Foils が多いほどボーナスモード発動率が上がります。",helpMechanicBonusModeTitle:"ボーナスモード",helpMechanicBonusModeDesc:"最終グリッドで 4+ foils になると 10 回のボーナススピンを獲得。ボーナス中に再び 4+ foils になるとさらに 10 回追加されます。",helpMechanicDragukkaTitle:"DRAGUKKA（ジョーカー）",helpMechanicDragukkaDesc:"ボーナスモードでのみ出現。10 回のスピン中ずっとグリッドに残り、任意のカードとして扱えます——ただし 1 スピンにつき 1 回だけ。",helpMechanicWildcardsTitle:"NEYMAR & CLAWD（ワイルドカード）",helpMechanicWildcardsDesc:"通常モードで出現。欠けている1枚として任意のコンボを完成できますが、使用後に消えます。",helpDepositNeedVbmsTitle:"プレイに VBMS が必要？",helpDepositStep1Title:"VBMS を入手",helpDepositStep1Desc:"Uniswap で VBMS を購入するか、サイトで遊んで獲得します。コントラクト：0xF14C1...728（Base）",helpDepositStep2Title:"\"Deposit\" をクリック",helpDepositStep2Desc:"スロット画面上部の Deposit ボタンをクリック。金額（100 / 250 / 500 / 1000 VBMS）を選択します。",helpDepositStep3Title:"Approve と Transfer",helpDepositStep3Desc:"ウォレットで 2 回のトランザクション：1) Approve（支払い許可）、2) Transfer（VBMS 送信）。",helpDepositStep4Title:"Coins を受け取る",helpDepositStep4Desc:"1 VBMS = 10 Coins。Coins はアカウントに残り、いつでも引き出せます。",bonusWildcardStays:"ワイルドカードはボーナス中ずっと残ります！",bonusTitle:"ボーナス！",playBonus:"🎰 ボーナスをプレイ",bonusCompleted:"ボーナス完了！",bonusCoinsWon:"ボーナスで獲得したコイン",shareWin:"🔗 共有",dragToRotate:"ドラッグして回転",closeX:"✕ 閉じる",cardBackAlt:"カード裏",tapToDismiss:"どこでもタップして閉じる",coins:"コイン",errorProfileNotFound:"プロフィールが見つかりません",errorConnectWalletFirst:"先にウォレットを接続してください",errorAccessDeniedDevOnly:"アクセス拒否：dev ウォレットのみ",errorInsufficientCoins:"コインが足りません。回すには {amount} コイン必要です。",raritySpecial:"SPECIAL",rarityMythic:"MYTHIC",rarityLegendary:"LEGEND",rarityEpic:"EPIC",rarityRare:"RARE",rarityCommon:"COMMON",recoveredSpinToast:"🎰 スピンを復元！+{amount} コイン獲得 (ID: {id})",winToast:"+{amount} コイン!",bonusRoundCast:"🎰 ボーナスラウンド：+{amount} コイン{mult} {by} Tukka Slots!",bigWinCast:"🎰 {label} +{amount} コイン{mult} {by} Tukka Slots!",bigWinLabel:"{label}!",costLabel:"コスト",prizeMultiplierLabel:"倍率",currentBalanceLabel:"現在の残高" },
  it:      { spin:"GIRA",deposit:"DEPOSITA",withdraw:"PRELEVA",buyBonus:"COMPRA BONUS",bet:"PUNTATA",balance:"SALDO",freeSpins:"GIRI GRATUITI",bonusMode:"MODALITÀ BONUS",bonusSpin:"GIRO BONUS",bonusRemaining:"rimasti",winUpTo:"VINCI FINO A",connectWallet:"Connetti il portafoglio!",accessDenied:"Accesso limitato!",accessDeniedDesc:"Questa slot machine è privata ed è in fase di sviluppo.",welcome:"Benvenuto",slotTitle:"Tukka Slots",howToPlay:"Come giocare →",combos:"Combo",mechanics:"Meccaniche",howToDeposit:"Come Depositare",prev:"← Precedente",next:"Successivo →",play:"Gioca! 🎰",missing:"Manca",freeSpinsDay:"10 giri gratuiti al giorno!",noDeposit:"Nessun deposito per iniziare",spinLog:"Spin Log",noSpinsYet:"Nessuno spin ancora",betPrefix:"puntata",bonusBadge:"BONUS",turboOn:"Turbo ON",turboOff:"Turbo OFF",foilBadge:"FOIL",lockedBadge:"LOCKED",helpWelcomeSubtitle:"Slot di carte con combo a cascata",helpComboRateHint:"Obiettivo: ~1 combo ogni 5 spin. I primi spin giornalieri hanno più probabilità.",helpCardDailyFreeSpinsTitle:"10 giri gratuiti",helpCardDailyFreeSpinsDesc:"Ogni giorno, gratis",helpCardCascadeTitle:"Cascade",helpCardCascadeDesc:"Le combo a catena pagano di più",helpCardFoilsTitle:"Foils",helpCardFoilsDesc:"Carte dorate che si accumulano",helpCardBonusModeTitle:"Modalità Bonus",helpCardBonusModeDesc:"4+ foils = 10 giri bonus",helpCombosPayoutTableTitle:"Pagamenti reali (% della puntata)",helpMechanicCascadeTitle:"CASCADE",helpMechanicCascadeDesc:"Quando avviene una combo, le carte spariscono e ne cadono di nuove. Oggi le combo in cascade NON hanno moltiplicatore extra: il pagamento è fisso per combo.",helpMechanicFoilTitle:"FOIL (carta dorata)",helpMechanicFoilDesc:"Le carte foil NON vengono distrutte nelle combo: restano nella griglia e si accumulano. Più foils = maggiore probabilità di attivare la Modalità Bonus.",helpMechanicBonusModeTitle:"MODALITÀ BONUS",helpMechanicBonusModeDesc:"4+ foils nella griglia finale attivano 10 giri bonus. Durante il bonus, ottenere di nuovo 4+ foils aggiunge altri 10 giri.",helpMechanicDragukkaTitle:"DRAGUKKA (Joker)",helpMechanicDragukkaDesc:"Appare solo in Modalità Bonus. Resta nella griglia per tutti i 10 giri e può sostituire qualsiasi carta — ma solo una volta per giro.",helpMechanicWildcardsTitle:"NEYMAR & CLAWD (Wildcard)",helpMechanicWildcardsDesc:"Appaiono in modalità normale. Possono completare qualsiasi combo come carta mancante, ma scompaiono dopo l'uso.",helpDepositNeedVbmsTitle:"Serve VBMS per giocare?",helpDepositStep1Title:"Ottieni VBMS",helpDepositStep1Desc:"Compra VBMS su Uniswap o guadagnalo giocando sul sito. Contratto: 0xF14C1...728 (Base)",helpDepositStep2Title:"Clicca \"Deposit\"",helpDepositStep2Desc:"In alto nella schermata della slot, clicca il pulsante Deposit. Scegli l'importo (100, 250, 500 o 1000 VBMS).",helpDepositStep3Title:"Approve e Transfer",helpDepositStep3Desc:"Due transazioni nel wallet: 1) Approve (autorizza la spesa), 2) Transfer (invia i VBMS).",helpDepositStep4Title:"Ricevi Coins",helpDepositStep4Desc:"1 VBMS = 10 Coins per giocare. Le Coins restano nel tuo account e possono essere prelevate indietro in qualsiasi momento.",bonusWildcardStays:"La wildcard resta nella griglia per tutto il bonus!",bonusTitle:"BONUS!",playBonus:"🎰 GIOCA BONUS",bonusCompleted:"Bonus completato!",bonusCoinsWon:"monete vinte nel bonus",shareWin:"🔗 Condividi",dragToRotate:"Trascina per ruotare",closeX:"✕ Chiudi",cardBackAlt:"Retro carta",tapToDismiss:"tocca ovunque per chiudere",coins:"monete",errorProfileNotFound:"Profilo non trovato",errorConnectWalletFirst:"Connetti prima il portafoglio",errorAccessDeniedDevOnly:"Accesso negato: slot solo per portafogli dev",errorInsufficientCoins:"Monete insufficienti. Servono {amount} monete per girare.",raritySpecial:"SPECIAL",rarityMythic:"MYTHIC",rarityLegendary:"LEGEND",rarityEpic:"EPIC",rarityRare:"RARE",rarityCommon:"COMMON",recoveredSpinToast:"🎰 Spin recuperato! Hai vinto +{amount} monete (ID: {id})",winToast:"+{amount} monete!",bonusRoundCast:"🎰 Round bonus: +{amount} monete{mult} {by} su Tukka Slots!",bigWinCast:"🎰 {label} +{amount} monete{mult} {by} su Tukka Slots!",bigWinLabel:"{label}!",costLabel:"Costo",prizeMultiplierLabel:"Moltiplicatore",currentBalanceLabel:"Saldo attuale" },
};
const SLOT_UI_FALLBACK: Pick<SlotUiText, "spinLog" | "noSpinsYet" | "close" | "continue" | "cancel" | "confirm"> = {
  spinLog: "Spin Log",
  noSpinsYet: "No spins yet",
  close: "Close",
  continue: "Continue",
  cancel: "Cancel",
  confirm: "Confirm",
};

function getSlotT(lang: string): SlotUiText {
  return {
    ...SLOT_UI_FALLBACK,
    ...(SLOT_UI_TRANSLATIONS.en ?? {}),
    ...(SLOT_UI_TRANSLATIONS[lang] ?? {}),
  } as SlotUiText;
}
const SLOT_MISC_TRANSLATIONS: Record<string, {
  cancel: string;
  confirm: string;
  jackpotMax: string;
  noWinningLines: string;
  recoveredNoWinToast: string;
}> = {
  en: { cancel: "Cancel", confirm: "Confirm", jackpotMax: "MAX JACKPOT!", noWinningLines: "No winning lines", recoveredNoWinToast: "🎰 Previous spin finished without wins (ID: {id})" },
  "pt-BR": { cancel: "Cancelar", confirm: "Confirmar", jackpotMax: "JACKPOT MÁXIMO!", noWinningLines: "Sem linhas ganhadoras", recoveredNoWinToast: "🎰 Spin anterior concluído sem ganhos (ID: {id})" },
  es: { cancel: "Cancelar", confirm: "Confirmar", jackpotMax: "¡JACKPOT MÁXIMO!", noWinningLines: "Sin líneas ganadoras", recoveredNoWinToast: "🎰 El giro anterior terminó sin ganancias (ID: {id})" },
  hi: { cancel: "रद्द करें", confirm: "पुष्टि करें", jackpotMax: "मैक्स जैकपॉट!", noWinningLines: "कोई जीतने वाली लाइन नहीं", recoveredNoWinToast: "🎰 पिछला स्पिन बिना जीत के पूरा हुआ (ID: {id})" },
  ru: { cancel: "Отмена", confirm: "Подтвердить", jackpotMax: "МАКС ДЖЕКПОТ!", noWinningLines: "Нет выигрышных линий", recoveredNoWinToast: "🎰 Предыдущий спин завершен без выигрыша (ID: {id})" },
  "zh-CN": { cancel: "取消", confirm: "确认", jackpotMax: "最高头奖！", noWinningLines: "没有中奖线", recoveredNoWinToast: "🎰 上一局未中奖（ID: {id}）" },
  id: { cancel: "Batal", confirm: "Konfirmasi", jackpotMax: "JACKPOT MAKS!", noWinningLines: "Tidak ada garis menang", recoveredNoWinToast: "🎰 Spin sebelumnya selesai tanpa menang (ID: {id})" },
  fr: { cancel: "Annuler", confirm: "Confirmer", jackpotMax: "JACKPOT MAX !", noWinningLines: "Aucune ligne gagnante", recoveredNoWinToast: "🎰 Le spin précédent s'est terminé sans gain (ID: {id})" },
  ja: { cancel: "キャンセル", confirm: "確認", jackpotMax: "MAXジャックポット！", noWinningLines: "当たりラインなし", recoveredNoWinToast: "🎰 前回のスピンは当たりなしで終了しました (ID: {id})" },
  it: { cancel: "Annulla", confirm: "Conferma", jackpotMax: "JACKPOT MASSIMO!", noWinningLines: "Nessuna linea vincente", recoveredNoWinToast: "🎰 Lo spin precedente è terminato senza vincite (ID: {id})" },
};

function getSlotMiscT(lang: string) {
  return SLOT_MISC_TRANSLATIONS[lang] ?? SLOT_MISC_TRANSLATIONS.en;
}
const COLS = SLOT_COLS;
const ROWS = SLOT_ROWS;
const TOTAL_CELLS = SLOT_TOTAL_CELLS;
const BET_OPTIONS = [...SLOT_BET_OPTIONS];
const BONUS_COST_MULT = SLOT_BONUS_COST_MULT;
const BONUS_FREE_SPINS = SLOT_BONUS_FREE_SPINS;
const REEL_ROW_GAP_PX = 3;

const SUIT_SYM: Record<string, string> = { hearts: "♥", diamonds: "♦", clubs: "♣", spades: "♠" };
function getCardSuitRank(baccarat: string): { sym: string; rank: string } | null {
  const key = baccarat.toLowerCase();
  const sr = SLOT_CARD_SUIT_RANK[key];
  if (!sr) return null;
  return { sym: SUIT_SYM[sr.suit] ?? "", rank: sr.rank };
}
const REEL_LOOP_CARD_COUNT = 12;
const REEL_LOOP_REPEAT_COUNT = 3;
const REEL_SETTLE_LEAD_COUNT = 5;
const REEL_SETTLE_BUFFER_COUNT = 4;

// GIF de cassino para VBMS Special (slot animation)
// Coloque os arquivos em public/slot-gifs/
const CASINO_SLOT_GIF = "/slot-gifs/casino-slot-animation.gif"; // GIF de cassino para a carta especial
const CASINO_SLOT_POSTER = "/slot-gifs/casino-slot-poster.png";

function getSlotCardImage(baccarat: string, useLiteAsset = false): string | null {
  return baccarat === "dragukka"
    ? (useLiteAsset ? CASINO_SLOT_POSTER : CASINO_SLOT_GIF)
    : getVbmsBaccaratImageUrl(baccarat);
}

function getOverlayBackdropFilter(disableBlur: boolean, blurPx: number): string | undefined {
  return disableBlur ? undefined : `blur(${getBaseAppBlur(blurPx)}px)`;
}

interface SpinResult {
  spinId: string;
  initialGrid: SlotCard[];
  comboSteps: SlotComboStep[];
  finalGrid: SlotCard[];
  winAmount: number;
  maxWin: boolean;
  foilCount: number;
  triggeredBonus: boolean;
  bonusSpinsAwarded: number;
  bonusSpinsRemaining: number;
  bonusState: SlotBonusState;
}
interface ActivePayline { name: string; d: string; color: string; }

const GRID_CENTER_X = [10, 30, 50, 70, 90] as const;
const GRID_CENTER_Y = [17, 50, 83] as const;

function getGridCellCenter(index: number): { x: number; y: number } | null {
  if (index < 0 || index >= TOTAL_CELLS) return null;
  const row = Math.floor(index / COLS);
  const col = index % COLS;
  const x = GRID_CENTER_X[col as 0 | 1 | 2 | 3 | 4];
  const y = GRID_CENTER_Y[row as 0 | 1 | 2];
  if (x === undefined || y === undefined) return null;
  return { x, y };
}

function buildPatternPath(indices: readonly number[]): string | null {
  const points = indices
    .map((index) => getGridCellCenter(index))
    .filter((point): point is { x: number; y: number } => point !== null);

  if (points.length < 2) return null;
  return `M${points.map((point) => `${point.x},${point.y}`).join(" L")}`;
}

function getActivePaylineForStep(step: SlotComboStep): ActivePayline | null {
  const comboIndices = [...step.matchedIndices, ...step.wildcardIndices];
  const pattern = getSlotPatternForIndices(comboIndices);
  if (!pattern) return null;

  const path = buildPatternPath(pattern.indices);
  if (!path) return null;

  return {
    name: pattern.id,
    d: path,
    color: getComboColor(step.combo.id),
  };
}


function getComboColor(comboId: string): string {
  if (comboId.startsWith("rank_")) {
    const rank = comboId.replace("rank_", "");
    const rankColors: Record<string, string> = {
      A: "#a855f7", K: "#f59e0b", Q: "#ec4899", J: "#3b82f6",
      "10": "#06b6d4", "9": "#10b981", "8": "#84cc16",
      "7": "#eab308", "6": "#f97316", "5": "#ef4444",
      "4": "#8b5cf6", "3": "#6b7280", "2": "#6b7280",
    };
    return rankColors[rank] ?? "#FFD700";
  }

  if (comboId.startsWith("suit_")) {
    const suit = comboId.replace("suit_", "").split("_")[0] as keyof typeof SLOT_SUIT_COLOR;
    return SLOT_SUIT_COLOR[suit] ?? "#FFD700";
  }

  return "#FFD700";
}

// Web Audio reel tick
let _audioCtx: AudioContext | null = null;
function playTick(freq = 160, vol = 0.07, dur = 0.04) {
  try {
    if (!_audioCtx) _audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const ctx = _audioCtx;
    const osc = ctx.createOscillator(); const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = "square";
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.5, ctx.currentTime + dur);
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + dur);
  } catch(e) {}
}

// Som de carta caindo na mesa
function playCardFall() {
  try {
    if (!_audioCtx) _audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const ctx = _audioCtx;
    const bufferSize = ctx.sampleRate * 0.06;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 3);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 600;
    filter.Q.value = 0.5;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start(ctx.currentTime);
    source.stop(ctx.currentTime + 0.06);
  } catch(e) {}
}

function getRarityLabel(t: SlotUiText, rarity: string): string {
  switch (rarity) {
    case "Special": return t.raritySpecial;
    case "Mythic": return t.rarityMythic;
    case "Legendary": return t.rarityLegendary;
    case "Epic": return t.rarityEpic;
    case "Rare": return t.rarityRare;
    case "Common": return t.rarityCommon;
    default: return rarity;
  }
}

const RS: Record<string, {
  border: string; glow: string; bg: string; labelBg: string;
  borderW: number; icon: string; cornerGrad: string;
}> = {
  Special:   { border:"#FACC15", glow:"#FACC15", bg:"#111827", labelBg:"#4C1D95", borderW:3, icon:"★", cornerGrad:"linear-gradient(135deg,#FACC15 0%,transparent 60%)" },
  Mythic:    { border:"#a855f7", glow:"#a855f7", bg:"#111827", labelBg:"#4C1D95", borderW:3, icon:"♦", cornerGrad:"linear-gradient(135deg,#a855f7 0%,transparent 60%)" },
  Legendary: { border:"#f59e0b", glow:"#f59e0b", bg:"#111827", labelBg:"#4C1D95", borderW:3, icon:"♥", cornerGrad:"linear-gradient(135deg,#f59e0b 0%,transparent 60%)" },
  Epic:      { border:"#ec4899", glow:"#ec4899", bg:"#111827", labelBg:"#4C1D95", borderW:2, icon:"♠", cornerGrad:"linear-gradient(135deg,#ec4899 0%,transparent 60%)" },
  Rare:      { border:"#3b82f6", glow:"#3b82f6", bg:"#111827", labelBg:"#4C1D95", borderW:2, icon:"♣", cornerGrad:"linear-gradient(135deg,#3b82f6 0%,transparent 60%)" },
  Common:    { border:"#6b7280", glow:"#6b7280", bg:"#111827", labelBg:"#1f2937", borderW:1, icon:"·", cornerGrad:"linear-gradient(135deg,#6b7280 0%,transparent 60%)" },
};

const LABELS = SLOT_CARD_LABELS;
const POOL = SLOT_CARD_POOL;

function pick(): SlotCard {
  const card = pickSlotCard();
  return createSlotCard({ baccarat: card.baccarat, rarity: card.rarity });
}


const PAYOUTS: [string, string, string][] = [
  ["Special",     "220", "#FACC15"],["Mythic",    "140",  "#a855f7"],
  ["Legendary",   "80",  "#f59e0b"],["Epic",      "40",   "#ec4899"],
  ["Rare",        "20",  "#3b82f6"],["Common",    "10",   "#6b7280"],
];

export type ReplaySpinData = {
  spinId: string;
  finalGrid: string[]; // "baccarat" or "baccarat:f"
  winAmount: number;
  foilCount: number;
  triggeredBonus: boolean;
};

type SlotMachineProps = {
  onWalletOpen?: () => void;
  duckBgm?: (reason?: "combo" | "bonus") => void;
  restoreBgm?: () => void;
  narrationMuted?: boolean;
  onHelpOpen?: (openFn: () => void) => void;
  isFrameMode?: boolean;
  replaySpins?: ReplaySpinData[];
  replayUsername?: string;
};

type SlotGridCardProps = {
  card: SlotCard;
  idx: number;
  isLocked: boolean;
  spinning: boolean;
  decelerating: boolean;
  isWin: boolean;
  isNew: boolean;
  devFoilAll: boolean;
  lockedGifIdx: number | null;
  showIndices: boolean;
  baseAppLiteMode: boolean;
  stripMode?: boolean;
};

const SlotGridCard = memo(function SlotGridCard({
  card,
  idx,
  isLocked,
  spinning,
  decelerating,
  isWin,
  isNew,
  devFoilAll,
  lockedGifIdx,
  showIndices,
  baseAppLiteMode,
  stripMode = false,
}: SlotGridCardProps) {
  const effectiveCard = devFoilAll ? { ...card, hasFoil: true } : card;
  const s = RS[effectiveCard.rarity] ?? RS.Common;
  const isLockedGif = lockedGifIdx === idx && effectiveCard.baccarat === "dragukka";
  const isDragukka = effectiveCard.baccarat === "dragukka";
  const rawImg = getSlotCardImage(effectiveCard.baccarat, baseAppLiteMode || stripMode);
  const img = rawImg;
  const label = LABELS[effectiveCard.baccarat] ?? effectiveCard.baccarat;
  const cardSR = getCardSuitRank(effectiveCard.baccarat);
  const borderColor = isWin ? "#FFD700" : s.border;
  const borderW = isWin ? 3 : s.borderW;

  const foilEffect = effectiveCard.hasFoil ? {
    animation: baseAppLiteMode ? undefined : "prizeFoilShine 3s linear infinite",
    border: `${borderW}px solid ${isWin ? "#FFD700" : "#FFA500"}`,
    boxShadow: `0 0 15px ${isWin ? "#FFD700" : "#FFA500"}88, inset 0 0 20px ${isWin ? "#FFD70033" : "#FFA50022"}`,
  } : {};

  let rarityAnim: string | undefined;
  if (!baseAppLiteMode && !stripMode && !spinning && !decelerating && !isWin && !effectiveCard.hasFoil) {
    if (effectiveCard.rarity === "Mythic") {
      rarityAnim = "mythic-border 1.6s ease-in-out infinite";
    } else if (effectiveCard.rarity === "Legendary") {
      rarityAnim = "legendary-border 1.8s ease-in-out infinite";
    }
  }

  const isAnimated = !stripMode && (spinning || decelerating || isNew || isWin);
  const showStaticFoil = baseAppLiteMode && !spinning && !stripMode && effectiveCard.hasFoil && !isDragukka;

  if (stripMode) {
    return (
      <div
        className="absolute inset-0 flex flex-col overflow-hidden"
        style={{
          border: `${borderW}px solid ${borderColor}`,
          background: s.bg,
        }}
      >
        <div className="relative flex-1 min-h-0 overflow-hidden" style={{ background: "#111" }}>
          {img ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={img}
              alt=""
              aria-label={label}
              className="w-full h-full object-cover object-center"
              decoding="async"
              draggable={false}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-[9px] font-black text-gray-300 px-0.5 text-center leading-tight">
              {label.toUpperCase()}
            </div>
          )}
          <div
            className="absolute inset-x-0 bottom-0 h-5 pointer-events-none"
            style={{ background: "linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.7) 100%)" }}
          />
        </div>
        <div
          className="shrink-0 px-0.5 py-[2px] text-center"
          style={{ background: s.labelBg }}
        >
          <span
            className="text-[5px] font-black text-white leading-none block truncate"
            style={{ fontSize: label.length > 12 ? "4px" : "5px" }}
          >
            {label.toUpperCase()}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`absolute inset-0 flex flex-col overflow-hidden ${stripMode ? "" : isLocked ? (isWin ? "win-flash" : "") : decelerating ? "slot-decel" : spinning ? "slot-spin" : isNew ? "card-fall-in" : isWin ? "win-flash" : "transition-all duration-150"} ${effectiveCard.hasFoil && !stripMode && !baseAppLiteMode ? "foil-card" : ""}`}
      style={{
        border: isLocked
          ? "2px solid #FACC15"
          : foilEffect.border || `${borderW}px solid ${borderColor}`,
        boxShadow: baseAppLiteMode
          ? (isLocked ? "0 0 6px #FACC1588" : isWin ? "0 0 8px #FFD70088" : effectiveCard.hasFoil ? "0 0 7px #FFA50088, inset 0 0 0 1px #FFD70055" : undefined)
          : isLocked
            ? "0 0 12px #FACC1588, inset 0 0 10px #FACC1522"
            : foilEffect.boxShadow || (isWin ? "0 0 20px #FFD700, 0 0 8px #FFD700, inset 0 0 16px #FFD70033" : undefined),
        animation: baseAppLiteMode || isLocked || stripMode ? undefined : `${rarityAnim || foilEffect.animation || ""}`.trim(),
        background: s.bg,
        willChange: isAnimated ? (baseAppLiteMode ? "transform, opacity" : "transform, filter, opacity") : undefined,
        transform: isAnimated ? "translate3d(0,0,0)" : undefined,
        backfaceVisibility: isAnimated ? "hidden" : undefined,
      }}
    >
      {isLocked && (
        <div className="absolute top-0.5 right-0.5 z-20 text-[8px] leading-none">🔒</div>
      )}

      <div
        className="absolute top-0 left-0 w-5 h-5 z-10 pointer-events-none"
        style={{ background: s.cornerGrad }}
      >
        {cardSR ? (
          <>
            <span className="absolute top-0 left-0.5 text-[6px] font-black leading-none" style={{ color: s.border }}>{cardSR.rank}</span>
            <span className="absolute top-[7px] left-0.5 text-[6px] font-black leading-none" style={{ color: s.border }}>{cardSR.sym}</span>
          </>
        ) : (
          <span className="absolute top-0 left-0.5 text-[7px] font-black leading-none" style={{ color: s.border }}>{s.icon}</span>
        )}
      </div>

      <div className="relative flex-1 min-h-0 overflow-hidden" style={{ background: "#111" }}>
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={img}
            alt=""
            aria-label={label}
            className="w-full h-full object-cover object-center"
            decoding="async"
            draggable={false}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-[9px] font-black text-gray-300 px-0.5 text-center leading-tight">
            {label.toUpperCase()}
          </div>
        )}
        {!spinning && (effectiveCard.rarity === "Mythic" || effectiveCard.rarity === "Legendary" || isDragukka) && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: `linear-gradient(135deg, ${s.glow}22 0%, transparent 50%, ${s.glow}11 100%)` }}
          />
        )}
        {isWin && <div className={`absolute inset-0 bg-yellow-300/20 pointer-events-none ${baseAppLiteMode ? "" : "animate-pulse"}`} />}
        {spinning && !stripMode && <div className="absolute inset-0 bg-black/55 pointer-events-none" />}
        {!baseAppLiteMode && !spinning && !stripMode && effectiveCard.hasFoil && !isDragukka && <div className="prize-foil" />}
        {showStaticFoil && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.28) 0%, rgba(255,215,0,0.18) 28%, transparent 46%, rgba(34,211,238,0.18) 70%, rgba(255,165,0,0.24) 100%)" }}
          />
        )}
        {showStaticFoil && (
          <div className="absolute top-0 right-0 z-30 px-1 py-0.5 text-[7px] font-black text-black rounded-bl" style={{ background: "#FFD700" }}>
            {"FOIL"}
          </div>
        )}
        {isLockedGif && (
          <div className="absolute top-0 right-0 z-30 px-1 py-0.5 text-[7px] font-black text-black rounded-bl" style={{ background: "#FFD700" }}>
            {"LOCKED"}
          </div>
        )}
        {showIndices && !spinning && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
            <span className="text-[10px] font-black text-white" style={{ textShadow: "0 0 4px #000,0 0 8px #000" }}>{idx}</span>
          </div>
        )}
      </div>

      <div
        className="shrink-0 flex items-center gap-0.5 px-0.5 py-[2px]"
        style={{ background: isWin ? "#92400e" : s.labelBg }}
      >
        <span className="text-[6px] font-black leading-none shrink-0" style={{ color: s.border }}>
          {cardSR ? `${cardSR.rank}${cardSR.sym}` : s.icon}
        </span>
        <span
          className="text-[5px] font-black text-white truncate leading-none flex-1 text-center"
          style={{ fontSize: label.length > 12 ? "4px" : "5px" }}
        >
          {label.toUpperCase()}
        </span>
      </div>
    </div>
  );
}, (prev, next) => (
  prev.idx === next.idx &&
  prev.isLocked === next.isLocked &&
  prev.spinning === next.spinning &&
  prev.decelerating === next.decelerating &&
  prev.isWin === next.isWin &&
  prev.isNew === next.isNew &&
  prev.devFoilAll === next.devFoilAll &&
  prev.lockedGifIdx === next.lockedGifIdx &&
  prev.showIndices === next.showIndices &&
  prev.baseAppLiteMode === next.baseAppLiteMode &&
  prev.stripMode === next.stripMode &&
  prev.card.baccarat === next.card.baccarat &&
  prev.card.rarity === next.card.rarity &&
  prev.card.hasFoil === next.card.hasFoil
));

type SlotReelStripProps = {
  col: number;
  liteMotion: boolean;
  stopCards: SlotCard[] | null;
  onStopComplete: (col: number) => void;
};

function createLoopStripCards(count = REEL_LOOP_CARD_COUNT) {
  return Array.from({ length: count }, () => pick());
}

function repeatStripCards(cards: SlotCard[], repeatCount = REEL_LOOP_REPEAT_COUNT) {
  return Array.from({ length: repeatCount }, () => cards).flat();
}

const SlotReelStrip = memo(function SlotReelStrip({
  col,
  liteMotion,
  stopCards,
  onStopComplete,
}: SlotReelStripProps) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const stripRef = useRef<HTMLDivElement | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fallbackTimeoutRef = useRef<number | null>(null);
  const baseCardsRef = useRef<SlotCard[]>([]);
  const offsetRef = useRef(0);
  const stepPxRef = useRef(0);
  const completionRef = useRef(false);
  const [cellHeightPx, setCellHeightPx] = useState(0);
  const loopCardCount = liteMotion ? 7 : REEL_LOOP_CARD_COUNT;
  const loopRepeatCount = liteMotion ? 2 : REEL_LOOP_REPEAT_COUNT;
  const [stripCards, setStripCards] = useState<SlotCard[]>(() => {
    const base = createLoopStripCards(loopCardCount);
    baseCardsRef.current = base;
    return repeatStripCards(base, loopRepeatCount);
  });

  const applyOffset = useCallback((offsetPx: number) => {
    if (!stripRef.current) return;
    stripRef.current.style.transform = `translate3d(0, ${offsetPx}px, 0)`;
  }, []);

  const clearTimers = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (fallbackTimeoutRef.current) {
      clearTimeout(fallbackTimeoutRef.current);
      fallbackTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const updateMetrics = () => {
      const height = viewport.clientHeight;
      if (!height) return;
      const cellHeight = (height - REEL_ROW_GAP_PX * (ROWS - 1)) / ROWS;
      stepPxRef.current = cellHeight + REEL_ROW_GAP_PX;
      setCellHeightPx(cellHeight);
    };

    updateMetrics();

    const observer = new ResizeObserver(updateMetrics);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!cellHeightPx) return;

    clearTimers();
    completionRef.current = false;

    const base = createLoopStripCards(loopCardCount);
    baseCardsRef.current = base;
    setStripCards(repeatStripCards(base, loopRepeatCount));
    offsetRef.current = 0;

    const startLoop = () => {
      if (!stripRef.current) return;
      stripRef.current.style.transition = "none";
      applyOffset(0);
      intervalRef.current = setInterval(() => {
        const stepPx = stepPxRef.current;
        const loopHeight = baseCardsRef.current.length * stepPx;
        if (!stepPx || !loopHeight) return;

        let nextOffset = offsetRef.current - stepPx;
        if (-nextOffset >= loopHeight * 2) {
          nextOffset += loopHeight;
        }

        offsetRef.current = nextOffset;
        applyOffset(nextOffset);
      }, liteMotion ? 100 : 55);
    };

    const rafId = window.requestAnimationFrame(startLoop);
    return () => {
      window.cancelAnimationFrame(rafId);
      clearTimers();
    };
  }, [applyOffset, cellHeightPx, clearTimers, liteMotion]);

  useEffect(() => {
    if (!stopCards || !cellHeightPx) return;

    clearTimers();

    const base = baseCardsRef.current.length ? baseCardsRef.current : createLoopStripCards(loopCardCount);
    const stepPx = stepPxRef.current;
    const traveledSteps = stepPx > 0 ? Math.max(0, Math.round(-offsetRef.current / stepPx)) : 0;
    const startIndex = base.length > 0 ? traveledSteps % base.length : 0;
    const leadCount = liteMotion ? 3 : REEL_SETTLE_LEAD_COUNT;
    const bufferCount = liteMotion ? 2 : REEL_SETTLE_BUFFER_COUNT;
    const leadCards = Array.from(
      { length: leadCount },
      (_, idx) => base[(startIndex + idx) % base.length] ?? pick(),
    );
    const settleBuffer = Array.from({ length: bufferCount }, () => pick());
    const settleCards = [...leadCards, ...settleBuffer, ...stopCards];

    setStripCards(settleCards);

    const finalizeStop = () => {
      if (completionRef.current) return;
      completionRef.current = true;
      if (stripRef.current) {
        stripRef.current.style.transition = "none";
      }
      onStopComplete(col);
    };

    const settle = () => {
      if (!stripRef.current) return;
      stripRef.current.style.transition = "none";
      offsetRef.current = 0;
      applyOffset(0);

      window.requestAnimationFrame(() => {
        if (!stripRef.current) return;
        const settleSteps = leadCards.length + settleBuffer.length;
        const targetOffset = -(settleSteps * stepPxRef.current);
        stripRef.current.style.transition = `transform ${liteMotion ? 680 : 820}ms cubic-bezier(0.22, 1, 0.36, 1)`;
        offsetRef.current = targetOffset;
        applyOffset(targetOffset);

        const handleTransitionEnd = (event: TransitionEvent) => {
          if (event.propertyName !== "transform") return;
          stripRef.current?.removeEventListener("transitionend", handleTransitionEnd);
          finalizeStop();
        };

        stripRef.current.addEventListener("transitionend", handleTransitionEnd);
        fallbackTimeoutRef.current = window.setTimeout(() => {
          stripRef.current?.removeEventListener("transitionend", handleTransitionEnd);
          finalizeStop();
        }, liteMotion ? 780 : 920);
      });
    };

    const rafId = window.requestAnimationFrame(settle);
    return () => window.cancelAnimationFrame(rafId);
  }, [applyOffset, cellHeightPx, clearTimers, col, liteMotion, onStopComplete, stopCards]);

  return (
    <div
      ref={viewportRef}
      className="absolute inset-0 overflow-hidden pointer-events-none"
      style={{ contain: "layout paint size" }}
    >
      <div
        ref={stripRef}
        className="flex flex-col"
        style={{
          gap: `${REEL_ROW_GAP_PX}px`,
          willChange: "transform",
          transform: "translate3d(0, 0, 0)",
          backfaceVisibility: "hidden",
        }}
      >
        {stripCards.map((card, idx) => (
          <div
            key={`${col}-${idx}`}
            className="relative shrink-0"
            style={{ height: `${cellHeightPx}px` }}
          >
            <SlotGridCard
              card={card}
              idx={idx}
              isLocked={false}
              spinning={false}
              decelerating={false}
              isWin={false}
              isNew={false}
              devFoilAll={false}
              lockedGifIdx={null}
              showIndices={false}
              baseAppLiteMode={liteMotion}
              stripMode
            />
          </div>
        ))}
      </div>
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: liteMotion
            ? "linear-gradient(180deg, rgba(0,0,0,0.12) 0%, rgba(0,0,0,0.04) 18%, rgba(0,0,0,0.04) 82%, rgba(0,0,0,0.12) 100%)"
            : "linear-gradient(180deg, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0.06) 18%, rgba(0,0,0,0.06) 82%, rgba(0,0,0,0.18) 100%)",
        }}
      />
    </div>
  );
});

function createEmptyStripStopTargets() {
  return Array.from({ length: COLS }, () => null as SlotCard[] | null);
}

export default function SlotMachine({
  onWalletOpen,
  duckBgm,
  restoreBgm,
  narrationMuted = false,
  onHelpOpen,
  isFrameMode = false,
  replaySpins,
  replayUsername,
}: SlotMachineProps) {
  const { isConnected, address } = useAccount();
  const { userProfile, refreshProfile } = useProfile();
  const { lang } = useLanguage();
  const isBaseApp = isBaseAppWebView();
  const liteMotion = isBaseApp;
  const t = getSlotT(lang);
  const tm = getSlotMiscT(lang);
  const helpWelcomeSubtitle = t.helpWelcomeSubtitle;
  const comboRateHint = t.helpComboRateHint;
  const helpWelcomeCards = [
    { icon:"🎲", title: t.helpCardDailyFreeSpinsTitle, desc: t.helpCardDailyFreeSpinsDesc },
    { icon:"⚡", title: t.helpCardCascadeTitle, desc: t.helpCardCascadeDesc },
    { icon:"✨", title: t.helpCardFoilsTitle, desc: t.helpCardFoilsDesc },
    { icon:"🎰", title: t.helpCardBonusModeTitle, desc: t.helpCardBonusModeDesc },
  ];
  const spinMut = useMutation(api.slot.spinSlot);
  const effectiveAddress = address ?? userProfile?.address ?? "";
  const statsQ  = useQuery(api.slot.getSlotDailyStats, { address: effectiveAddress });

  const [cells, setCells]           = useState<SlotCard[]>(() => Array.from({ length: TOTAL_CELLS }, () => createSlotCard({ baccarat: "claude", rarity: "Common" })));
  const [isSpinning, setIsSpinning] = useState(false);
  const [stopped, setStopped]       = useState<Set<number>>(new Set([0,1,2,3,4]));
  const [winCells, setWinCells]     = useState<Set<number>>(new Set());   // highlighted winners
  const [newCells, setNewCells]     = useState<Set<number>>(new Set());   // cells falling in (cascade)
  const [activePaylines, setActivePaylines] = useState<ActivePayline[]>([]);
  const [winAmt, setWinAmt]         = useState<number | null>(null);
  const [isJackpot, setIsJackpot]   = useState(false);
  const [betIdx, setBetIdx]         = useState(0);
  const [showBonusConfirm, setShowBonusConfirm] = useState(false);
  const [foilCountDisplay, setFoilCountDisplay] = useState(0);
  const [showBonusAnimation, setShowBonusAnimation] = useState(false);
  const [comboDisplay, setComboDisplay] = useState<{ name: string; color: string; winAmt: number } | null>(null);
  const [deceleratingCols, setDeceleratingCols] = useState<Set<number>>(new Set());
  const [foilSuspenseCols, setFoilSuspenseCols]   = useState<Set<number>>(new Set()); // cols glowing with foil suspense
  const [epicFoilCards, setEpicFoilCards]         = useState<Array<{idx:number; card:SlotCard; img:string; row:number; col:number}>|null>(null);
  const [epicFoilPhase, setEpicFoilPhase]         = useState<'fly'|'spin'|null>(null);
  const [lockedGifIdx, setLockedGifIdx]           = useState<number|null>(null);   // index of locked GIF card in grid
  const [showGallery, setShowGallery]           = useState(false);
  const [showIndices, setShowIndices]           = useState(false);
  const [devFoilAll, setDevFoilAll]             = useState(false);
  const [lastWinDetails, setLastWinDetails]     = useState<string[]>([]);
  const [card3D, setCard3D]                     = useState<{ card: SlotCard; img: string; label: string; flyIn: boolean } | null>(null);
  const [card3DCombosOpen, setCard3DCombosOpen] = useState(false);
  const [phase, setPhase]                       = useState<SlotPhase>("IDLE");
  const [bonusState, setBonusState]             = useState<SlotBonusState>({ persistentWildcards: [], spinsRemaining: 0 });
  const [autoBonusMode, setAutoBonusMode]       = useState(false);
  const [showHelp, setShowHelp]                 = useState(false);
  const [helpPage, setHelpPage]                 = useState(0);
  const [stripStopTargets, setStripStopTargets] = useState<Array<SlotCard[] | null>>(() => createEmptyStripStopTargets());
  // Bonus win tracking
  const [bonusWinTotal, setBonusWinTotal]       = useState(0);
  const [bonusWinDisplay, setBonusWinDisplay]   = useState<number | null>(null); // +X durante bonus
  const [showPlayBonus, setShowPlayBonus]       = useState(false);
  const [showBonusSummary, setShowBonusSummary] = useState(false);
  const [bonusSummaryAmount, setBonusSummaryAmount] = useState(0);
  const [bigWinType, setBigWinType]             = useState<'nice' | 'great' | 'big' | 'max' | null>(null);
  const [bigWinAmount, setBigWinAmount]         = useState(0);
  const [bigWinMultX, setBigWinMultX]           = useState(0);
  // Spin history log
  type SpinLog = { bet: number; win: number; combo: string | null; bonus: boolean; ts: number };
  const [spinLog, setSpinLog]                   = useState<SpinLog[]>([]);
  const [showSpinLog, setShowSpinLog]           = useState(false);

  // Auto-open tutorial na primeira visita
  useEffect(() => {
    const seen = localStorage.getItem("slot_tutorial_seen");
    if (!seen) {
      setHelpPage(0);
      setShowHelp(true);
    }
  }, []);

  useEffect(() => { onHelpOpen?.(() => { setShowHelp(true); setHelpPage(0); }); }, [onHelpOpen]);

  // Recuperação de spin após F5 — mostra resultado pendente se ainda recente (< 2 min)
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("slot_pending_spin");
      if (!raw) return;
      const { spinId, winAmount, timestamp } = JSON.parse(raw);
      if (Date.now() - timestamp > 2 * 60 * 1000) { sessionStorage.removeItem("slot_pending_spin"); return; }
      sessionStorage.removeItem("slot_pending_spin");
      if (winAmount > 0) {
        toast.success(
        t.recoveredSpinToast
          .replace("{amount}", winAmount.toLocaleString())
          .replace("{id}", String(spinId).slice(-6)),
      );
      } else {
        toast(tm.recoveredNoWinToast.replace("{id}", String(spinId).slice(-6)));
      }
    } catch {}
  }, []);

  const card3DRotRef  = useRef({ rotY: 0, rotX: 0, dragging: false, lastX: 0, lastY: 0 });
  const card3DInnerRef = useRef<HTMLDivElement | null>(null);
  const playBonusReadyRef = useRef<(() => void) | null>(null);
  const bonusWinTotalRef = useRef(0);
  const ivs = useRef<Record<number, ReturnType<typeof setInterval>>>({});
  const foilsFoundRef = useRef(0);
  const lockedGifRef  = useRef<number|null>(null);
  const spinSequenceRef = useRef(0);
  const sessionIdRef = useRef<string | null>(null);
  const turboRef = useRef(false);
  const [turbo, setTurbo] = useState(false);
  const bonusStateRef = useRef<SlotBonusState>({ persistentWildcards: [], spinsRemaining: 0 });
  const stripStopMetaRef = useRef<Record<number, { cards: SlotCard[]; onDone?: () => void }>>({});
  // Células com dragukka persistente — não animam durante bonus spins
  const lockedCellsRef = useRef<Set<number>>(new Set());
  const [lockedCells, setLockedCells] = useState<Set<number>>(new Set());

  // isBonusActive: derivado — verdadeiro enquanto há animação épica ativa ou phase BONUS
  const isBonusActive = epicFoilCards !== null || phase === "BONUS";

  const freeLeft = statsQ?.remainingFreeSpins ?? 0;
  const coins    = userProfile?.coins ?? 0;
  const betMult  = BET_OPTIONS[betIdx];
  const betCost  = betMult;
  const bonusCost = betCost * BONUS_COST_MULT;
  const maxPossibleWin = betCost * 100;

  useEffect(() => {
    bonusStateRef.current = bonusState;
  }, [bonusState]);

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // Replay mode state
  const isReplayMode = Boolean(replaySpins && replaySpins.length > 0);
  const [replayIndex, setReplayIndex] = useState(0);
  const [replayDone, setReplayDone] = useState(false);
  const replayIndexRef = useRef(0);

  // Access control (dev-only): allow either connected wallet or linked primary profile wallet.
  // In replay mode, access is always granted — anyone can watch a shared replay.
  const isAllowedAddress =
    isReplayMode ||
    isDeveloperSlotAddress(address) ||
    isDeveloperSlotAddress(userProfile?.address);
  const isAllowed = isAllowedAddress;

  const columnHasLockedCells = useCallback((col: number) => {
    for (let row = 0; row < ROWS; row += 1) {
      if (lockedCellsRef.current.has(row * COLS + col)) return true;
    }
    return false;
  }, []);

  const startCol = useCallback((col: number) => {
    if (!columnHasLockedCells(col)) return;
    const intervalMs = liteMotion ? 100 : 55;
    ivs.current[col] = setInterval(() => {
      setCells(prev => {
        const n = [...prev];
        for (let r = 0; r < ROWS; r++) {
          const idx = r * COLS + col;
          if (!lockedCellsRef.current.has(idx)) n[idx] = pick();
        }
        return n;
      });
    }, intervalMs);
  }, [columnHasLockedCells, liteMotion]);

  const handleStripStopComplete = useCallback((col: number) => {
    const meta = stripStopMetaRef.current[col];
    if (!meta) return;

    setCells(prev => {
      const next = [...prev];
      meta.cards.forEach((card, row) => {
        const idx = row * COLS + col;
        if (idx < next.length) next[idx] = card;
      });
      return next;
    });
    setStopped(prev => new Set([...prev, col]));
    setDeceleratingCols(prev => {
      const next = new Set(prev);
      next.delete(col);
      return next;
    });
    setStripStopTargets(prev => {
      const next = [...prev];
      next[col] = null;
      return next;
    });

    delete stripStopMetaRef.current[col];
    if (!liteMotion) playTick(90 + col * 10, 0.07, 0.08);
    meta.onDone?.();
  }, [liteMotion]);

  // Para coluna com desaceleração visual + callback quando termina
  const slowAndStopCol = useCallback((col: number, cards: SlotCard[], onDone?: () => void) => {
    clearInterval(ivs.current[col]);
    delete ivs.current[col];

    // Marcar como desacelerando (CSS diferente)
    setDeceleratingCols(prev => new Set([...prev, col]));

    if (!columnHasLockedCells(col)) {
      stripStopMetaRef.current[col] = { cards, onDone };
      setStripStopTargets(prev => {
        const next = [...prev];
        next[col] = cards;
        return next;
      });
      return;
    }

    // Passos de desaceleração: delays crescentes, cada um mostra carta aleatória
    const slowSteps = liteMotion ? [130, 230, 360] : [110, 170, 250, 350, 480, 620];
    let step = 0;

    const tick = () => {
      if (step >= slowSteps.length) {
        setCells(prev => {
          const n = [...prev];
          cards.forEach((card, row) => {
            if (row * COLS + col < n.length) n[row * COLS + col] = card;
          });
          return n;
        });
        setStopped(prev => new Set([...prev, col]));
        setDeceleratingCols(prev => { const s = new Set(prev); s.delete(col); return s; });
        // Clique suave ao parar coluna
        if (!liteMotion) playTick(90 + col * 10, 0.07, 0.08);
        onDone?.();
        return;
      }
      setCells(prev => {
        const n = [...prev];
        for (let r = 0; r < ROWS; r++) {
          const idx = r * COLS + col;
          if (!lockedCellsRef.current.has(idx)) n[idx] = pick();
        }
        return n;
      });
      setTimeout(tick, slowSteps[step++]);
    };

    setTimeout(tick, slowSteps[step++]);
  }, [columnHasLockedCells, liteMotion]);

  const sleep = (ms: number) => new Promise<void>(res => setTimeout(res, turboRef.current ? Math.min(ms, 40) : ms));

  const waitForTrackedAudio = useCallback(async (audio: HTMLAudioElement | null, fallbackMs: number) => {
    if (!audio) {
      await sleep(fallbackMs);
      return;
    }

    await new Promise<void>((resolve) => {
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        audio.removeEventListener("ended", finish);
        audio.removeEventListener("error", finish);
        resolve();
      };

      audio.addEventListener("ended", finish, { once: true });
      audio.addEventListener("error", finish, { once: true });
      window.setTimeout(finish, fallbackMs);
    });
  }, []);

  const playNarration = useCallback(async (src: string | null, reason: "combo" | "bonus", volume = 0.65) => {
    if (narrationMuted) return;
    duckBgm?.(reason);
    const audio = src ? playTrackedAudio(src, volume) : null;
    await waitForTrackedAudio(audio, reason === "bonus" ? 2400 : 2200);
    restoreBgm?.();
  }, [narrationMuted, duckBgm, restoreBgm, waitForTrackedAudio]);

  const finishSpinVisuals = useCallback((finalGrid: SlotCard[], totalWin: number, maxWin: boolean, details: string[], keepSpinning = false) => {
    // Spin concluído — limpar spin pendente do sessionStorage
    try { sessionStorage.removeItem("slot_pending_spin"); } catch {}
    setPhase("END");
    setCells(finalGrid);
    if (!keepSpinning) setIsSpinning(false);
    setWinAmt(totalWin);
    setIsJackpot(maxWin);
    setLastWinDetails(details);
    setWinCells(new Set());
    setNewCells(new Set());
    setActivePaylines([]);
    setComboDisplay(null);

    if (maxWin && !liteMotion) {
      const rarityOrder = ["Special","Mythic","Legendary","Epic","Rare","Common"];
      const topCard = [...finalGrid].sort((a, b) => rarityOrder.indexOf(a.rarity) - rarityOrder.indexOf(b.rarity))[0];
      if (topCard) {
        const img = getSlotCardImage(topCard.baccarat, liteMotion);
        const label = LABELS[topCard.baccarat] ?? topCard.baccarat;
        setTimeout(() => setCard3D({ card: topCard, img: img || "", label, flyIn: true }), 600);
      }
    }

    if (totalWin > 0) {
      toast.success(t.winToast.replace("{amount}", totalWin.toLocaleString()));
    }

    const gifCellIdx = finalGrid.findIndex((card) => card.baccarat === "dragukka");
    if (gifCellIdx >= 0 && lockedGifRef.current === null) {
      lockedGifRef.current = gifCellIdx;
      setLockedGifIdx(gifCellIdx);
    }

    setTimeout(() => setPhase("IDLE"), 80);
  }, [liteMotion]);

  const playComboResolution = useCallback(async (
    steps: SlotComboStep[],
    finalGrid: SlotCard[],
    totalWin: number,
    sequenceId: number,
  ): Promise<string[]> => {
    let runningWin = 0;
    const details: string[] = [];

    for (const step of steps) {
      if (spinSequenceRef.current !== sequenceId) {
        return details;
      }

      setPhase("COMBO");
      setCells(step.beforeGrid);
      setWinCells(new Set([...step.matchedIndices, ...step.wildcardIndices]));
      const activePayline = getActivePaylineForStep(step);
      setActivePaylines(activePayline ? [activePayline] : []);
      setComboDisplay({
        name: step.combo.name,
        color: getComboColor(step.combo.id),
        winAmt: step.reward,
      });

      await sleep(liteMotion ? 60 : 140);
      if (!turboRef.current) {
        const comboAudio = step.combo.audioPath
          ? { audioPath: step.combo.audioPath, audioVolume: step.combo.audioVolume ?? 0.7 }
          : resolveComboAudio(step.combo.id);
        if (liteMotion) {
          void playNarration(comboAudio.audioPath, "combo", comboAudio.audioVolume);
          await sleep(180);
        } else {
          await playNarration(comboAudio.audioPath, "combo", comboAudio.audioVolume);
        }
      }

      runningWin += step.reward;
      details.push(`${step.combo.name} -> +${step.reward}`);
      setWinAmt(runningWin);

      setPhase("CASCADE");
      if (!liteMotion) playCardFall();
      await sleep(liteMotion ? 100 : 220);
      setWinCells(new Set());
      setCells(step.afterGrid);
      setNewCells(new Set(step.fillIndices));

      if (step.fillIndices.length > 0) {
        const cascadeFreq = 200 + step.fillIndices.length * 20;
        if (!liteMotion) playTick(cascadeFreq, 0.15, 0.1);
      }

      await sleep(liteMotion ? 220 : 520);
      setNewCells(new Set());
      setComboDisplay(null);
      await sleep(liteMotion ? 50 : 120);
    }

    setCells(finalGrid);
    setWinAmt(totalWin);
    setActivePaylines([]);
    return details;
  }, [playNarration, liteMotion]);

  const triggerEpicFoil = useCallback(async (
    foilCells: Array<{idx:number;card:SlotCard;img:string;row:number;col:number}>,
  ) => {
    setPhase("BONUS");
    setShowBonusAnimation(true);

    if (liteMotion) {
      void playNarration("/sounds/evolution.mp3", "bonus", 0.8);
      await sleep(350);
      setShowBonusAnimation(false);
      return;
    }

    setEpicFoilCards(foilCells);
    setEpicFoilPhase("fly");
    window.setTimeout(() => setEpicFoilPhase("spin"), 1400);
    await playNarration("/sounds/evolution.mp3", "bonus", 0.8);
    await sleep(1200);
    setEpicFoilCards(null);
    setEpicFoilPhase(null);
    setShowBonusAnimation(false);
  }, [playNarration, liteMotion]);

  // Detectar categoria de vitória para overlay
  const showBigWinOverlay = useCallback((amount: number, bet: number) => {
    if (amount <= 0) return;
    const multiplierX = bet > 0 ? Math.round(amount / bet) : 0;
    // Thresholds based on bet multiplier
    const type = multiplierX >= 100 ? 'max' : multiplierX >= 20 ? 'big' : multiplierX >= 5 ? 'great' : multiplierX >= 2 ? 'nice' : null;
    if (!type) return;
    setBigWinType(type);
    setBigWinAmount(amount);
    setBigWinMultX(multiplierX);
    // Som de lvlup ao aparecer win screen
    try { const a = new Audio('/sounds/lvlup.wav'); a.volume = 0.55; a.play().catch(() => {}); } catch {}
    // auto-close after 4s — user can also dismiss by tapping
    setTimeout(() => setBigWinType(null), 4000);
  }, []);

  function getConvexSlotErrorMessage(err: unknown): string {
    const raw =
      typeof err === "string" ? err
      : err instanceof Error ? err.message
      : (err as any)?.data?.message ?? (err as any)?.message ?? "";

    const msg = String(raw || "");

    if (msg.includes("Please connect wallet first")) return t.errorConnectWalletFirst;
    if (msg.includes("Profile not found")) return t.errorProfileNotFound;
    if (msg.includes("Access denied")) return t.errorAccessDeniedDevOnly;

    if (msg.includes("Insufficient coins")) {
      const m = msg.match(/Need\s+(\d+)\s+coins/i);
      const amount = m?.[1] ?? "0";
      return t.errorInsufficientCoins.replace("{amount}", amount);
    }

    return msg || "Error";
  }

  // ─── REPLAY MODE ────────────────────────────────────────────────────────────
  // Runs a single stored spin through the SAME animation pipeline as a real spin.
  // No Convex mutation — uses pre-recorded finalGrid + winAmount.
  const replaySpin = async (spinData: ReplaySpinData) => {
    if (isSpinning) return;

    const sequenceId = spinSequenceRef.current + 1;
    spinSequenceRef.current = sequenceId;

    const finalGrid: SlotCard[] = spinData.finalGrid.map(slotCardFromStoredString);

    // Reset state — identical to real spin setup
    setIsSpinning(true);
    setPhase("SPIN");
    setWinCells(new Set());
    setNewCells(new Set());
    setActivePaylines([]);
    setWinAmt(null);
    setIsJackpot(false);
    setStopped(new Set());
    setShowBonusAnimation(false);
    setComboDisplay(null);
    setDeceleratingCols(new Set());
    setFoilSuspenseCols(new Set());
    setEpicFoilCards(null);
    setStripStopTargets(createEmptyStripStopTargets());
    stripStopMetaRef.current = {};
    lockedCellsRef.current = new Set();
    setLockedCells(new Set());
    setEpicFoilPhase(null);
    foilsFoundRef.current = 0;

    const MIN_SPIN_MS = turboRef.current ? 200 : 1600;

    await new Promise<void>((resolve) => {
      const stopSequential = (col: number) => {
        if (col >= COLS) {
          const gifInGrid = finalGrid.findIndex(c => c.baccarat === "dragukka");
          if (gifInGrid >= 0) {
            lockedGifRef.current = gifInGrid;
            setLockedGifIdx(gifInGrid);
          }
          (async () => {
            const details = await playComboResolution([], finalGrid, spinData.winAmount, sequenceId);
            if (spinSequenceRef.current !== sequenceId) { resolve(); return; }
            finishSpinVisuals(finalGrid, spinData.winAmount, false, details, false);
            resolve();
          })().catch(() => resolve());
          return;
        }
        const colCards = Array.from({ length: ROWS }, (_, row) =>
          finalGrid[row * COLS + col] ?? createSlotCard({ baccarat: 'claude', rarity: 'Common' })
        );
        slowAndStopCol(col, colCards, () => {
          const colFoils = colCards.filter(c => c.hasFoil).length;
          foilsFoundRef.current += colFoils;
          if (foilsFoundRef.current >= 2 && col + 1 < COLS) {
            setFoilSuspenseCols(prev => new Set([...prev, col + 1]));
          }
          setTimeout(() => stopSequential(col + 1), turboRef.current ? 10 : 80);
        });
      };
      setTimeout(() => stopSequential(0), MIN_SPIN_MS);
    });
  };

  // Auto-play replay spins sequentially
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!isReplayMode || !mounted) return;
    if (replayDone) return;
    if (isSpinning) return;
    const idx = replayIndexRef.current;
    if (!replaySpins || idx >= replaySpins.length) {
      setReplayDone(true);
      return;
    }
    const spinData = replaySpins[idx];
    if (!spinData) return;
    replayIndexRef.current = idx + 1;
    setReplayIndex(idx + 1);
    const delay = idx === 0 ? 600 : 1200;
    const t = setTimeout(() => { replaySpin(spinData); }, delay);
    return () => clearTimeout(t);
  // trigger after each spin completes (isSpinning goes false)
  }, [isReplayMode, mounted, isSpinning, replayDone]); // eslint-disable-line react-hooks/exhaustive-deps
  // ─── END REPLAY MODE ────────────────────────────────────────────────────────

  const spin = async (isFree: boolean, forceBonusMode = false) => {
    if (!effectiveAddress) { toast.error(t.connectWallet); return; }
    if (!isAllowed) { toast.error(t.accessDenied); return; }
    if (isSpinning) return;

    const isFreeOnly = isFree;

    // BUY BONUS: primeira rodada é spin normal com foils forçados (isBonusMode=false, buyBonusEntry=true)
    // O backend força 4 foils → dispara o bonus. Rodadas seguintes são isBonusMode=true.
    sessionIdRef.current = crypto.randomUUID();
    let bonusMode = false;            // começa false — bonus entra depois do trigger
    let isBuyBonusEntry = forceBonusMode; // true só na primeira rodada do buy bonus
    let bonusEntryPaid = false;
    let currentBonusState = bonusState;
    let sessionTotalWin = 0; // acumulado de toda a sessão (spin + bonus)
    const maxWinCap = betMult * 100; // Max Win = 100× bet

    // Auto-bonus loop: continua enquanto há spins de bônus restantes
    do {
      const sequenceId = spinSequenceRef.current + 1;
      spinSequenceRef.current = sequenceId;

      setIsSpinning(true);
      setPhase("SPIN");
      setWinCells(new Set());
      setNewCells(new Set());
      setActivePaylines([]);
      setWinAmt(null);
      setIsJackpot(false);
      setStopped(new Set());
      setShowBonusAnimation(false);
      setComboDisplay(null);
      setDeceleratingCols(new Set());
      setFoilSuspenseCols(new Set());
      setEpicFoilCards(null);
      setStripStopTargets(createEmptyStripStopTargets());
      stripStopMetaRef.current = {};

      // Células com dragukka persistente ficam travadas durante bonus spins
      if (bonusMode && currentBonusState.persistentWildcards.length > 0) {
        const locked = new Set(currentBonusState.persistentWildcards.map(w => w.index));
        lockedCellsRef.current = locked;
        setLockedCells(locked);
      } else {
        lockedCellsRef.current = new Set();
        setLockedCells(new Set());
      }
      setEpicFoilPhase(null);
      foilsFoundRef.current = 0;

      const spinStartTime = Date.now();
      for (let c = 0; c < COLS; c++) startCol(c);

      const res = await spinMut({
        address: effectiveAddress,
        isFreeSpin: isFreeOnly && !bonusMode && !isBuyBonusEntry,
        buyBonusEntry: isBuyBonusEntry && !bonusEntryPaid,
        betMultiplier: betMult,
        isBonusMode: bonusMode,
        ...(bonusMode ? { bonusState: currentBonusState } : {}),
        sessionId: sessionIdRef.current ?? undefined,
      }) as SpinResult;

      // Salvar spinId imediatamente — permite recuperação se o player recarregar a página
      // O resultado já está salvo no servidor; se houver F5 agora, ainda é possível ver o resultado
      try { sessionStorage.setItem("slot_pending_spin", JSON.stringify({ spinId: res.spinId, winAmount: res.winAmount, timestamp: Date.now() })); } catch {}

      // Após enviar a entry do buy bonus, marcar como pago
      if (isBuyBonusEntry && !bonusEntryPaid) {
        bonusEntryPaid = true;
        isBuyBonusEntry = false;
      }

      if (spinSequenceRef.current !== sequenceId) {
        return;
      }

      // NÃO atualiza bonusState ainda — o contador apareceria antes das foils animarem
      await refreshProfile();

      const MIN_SPIN_MS = turboRef.current ? 200 : 1600;
      const elapsed = Date.now() - spinStartTime;
      const baseDelay = Math.max(0, MIN_SPIN_MS - elapsed);

      // Await the sequential column stop and combo resolution
      await new Promise<void>((resolve, reject) => {
        const stopSequential = (col: number) => {
          if (col >= COLS) {
            const gifInGrid = res.initialGrid.findIndex(c => c.baccarat === "dragukka");
            if (gifInGrid >= 0) {
              lockedGifRef.current = gifInGrid;
              setLockedGifIdx(gifInGrid);
            }

            (async () => {
              try {
                const details = await playComboResolution(
                  res.comboSteps,
                  res.finalGrid,
                  res.winAmount,
                  sequenceId,
                );

                if (spinSequenceRef.current !== sequenceId) {
                  resolve();
                  return;
                }

                // Acumular ganhos do bonus
                if (bonusMode && res.winAmount > 0) {
                  bonusWinTotalRef.current += res.winAmount;
                  setBonusWinTotal(bonusWinTotalRef.current);
                  setBonusWinDisplay(bonusWinTotalRef.current);
                }

                // Registrar no log de spins
                setSpinLog(prev => [{
                  bet: betMult,
                  win: res.winAmount,
                  combo: res.comboSteps.length > 0 ? res.comboSteps[0]!.combo.name : null,
                  bonus: bonusMode,
                  ts: Date.now(),
                }, ...prev].slice(0, 50));

                // Acumular total da sessão e checar max win cap
                sessionTotalWin += res.winAmount;
                if (sessionTotalWin >= maxWinCap) {
                  // Max Win atingido — encerrar bonus spins imediatamente
                  bonusMode = false;
                  lockedCellsRef.current = new Set();
                  setLockedCells(new Set());
                  if (bonusWinTotalRef.current > 0) {
                    setBonusSummaryAmount(bonusWinTotalRef.current);
                    setShowBonusSummary(true);
                    try { const a = new Audio('/sounds/lvlup.wav'); a.volume = 0.55; a.play().catch(() => {}); } catch {}
                    bonusWinTotalRef.current = 0;
                    setBonusWinTotal(0);
                    setBonusWinDisplay(null);
                  }
                }

                // Win overlay só aparece se: não está em bonus, não triggou bonus agora, não é buy bonus entry
                // Se triggou bonus → share espera o bonus terminar (aparece no BonusSummary)
                if (!bonusMode && !isBuyBonusEntry && !res.triggeredBonus) {
                  showBigWinOverlay(sessionTotalWin, betMult);
                }

                if (res.triggeredBonus && res.foilCount >= 4 && !bonusMode) {
                  // Primeiro trigger: animação épica + tela "PLAY BONUS"
                  const finalFoils = res.finalGrid
                    .map((card, idx) => ({
                      idx,
                      card,
                      img: getSlotCardImage(card.baccarat, liteMotion) || "",
                      row: Math.floor(idx / COLS),
                      col: idx % COLS,
                    }))
                    .filter((entry) => entry.card.hasFoil);

                  await triggerEpicFoil(finalFoils);

                  // Pausar e mostrar "PLAY BONUS" antes de entrar no bonus
                  await new Promise<void>(playResolve => {
                    playBonusReadyRef.current = playResolve;
                    setShowPlayBonus(true);
                  });

                  // Só agora mostra o contador — foils já voaram
                  setBonusState(res.bonusState);
                  // Resetar acumulador de ganhos do bonus
                  bonusWinTotalRef.current = 0;
                  setBonusWinTotal(0);
                  setBonusWinDisplay(null);
                } else if (res.triggeredBonus && bonusMode) {
                  // Re-trigger durante bonus: apenas adiciona spins silenciosamente
                  setBonusState(res.bonusState);
                } else {
                  setBonusState(res.bonusState);
                }

                finishSpinVisuals(res.finalGrid, res.winAmount, res.maxWin, details, res.triggeredBonus);
                resolve();
              } catch (e) {
                toast.error(getConvexSlotErrorMessage(e));
                reject(e);
              }
            })().catch(reject);

            return;
          }

          const colCards = Array.from({ length: ROWS }, (_, row) =>
            res.initialGrid[row * COLS + col] ?? pick()
          );

          slowAndStopCol(col, colCards, () => {
            const colFoils = colCards.filter(c => c.hasFoil).length;
            foilsFoundRef.current += colFoils;

            if (foilsFoundRef.current >= 2 && col + 1 < COLS) {
              setFoilSuspenseCols(prev => new Set([...prev, col + 1]));
              if (!liteMotion) playTick(220, 0.09, 0.12);
            }

            setTimeout(() => stopSequential(col + 1), turboRef.current ? 10 : 80);
          });
        };

        setTimeout(() => stopSequential(0), baseDelay);
      });

      // Track bonus spins: decrement and continue while spins remain
      // Max win cap já pode ter setado bonusMode=false — respeitar
      if (bonusMode && sessionTotalWin < maxWinCap) {
        const spinsLeft = res.bonusSpinsRemaining;
        bonusMode = spinsLeft > 0;
        currentBonusState = res.bonusState;

        if (!bonusMode) {
          // Último spin de bonus — mostrar summary
          const totalBonusWin = bonusWinTotalRef.current;
          setBonusSummaryAmount(totalBonusWin);
          setShowBonusSummary(true);
          try { const a = new Audio('/sounds/lvlup.wav'); a.volume = 0.55; a.play().catch(() => {}); } catch {}
          bonusWinTotalRef.current = 0;
          setBonusWinTotal(0);
          setBonusWinDisplay(null);
          lockedCellsRef.current = new Set();
          setLockedCells(new Set());
        }
      } else if (res.triggeredBonus) {
        bonusMode = true;
        currentBonusState = res.bonusState;
      } else {
        bonusMode = false;
        lockedCellsRef.current = new Set();
        setLockedCells(new Set());
      }
    } while (bonusMode);
  };

  const renderCard = (card: SlotCard, idx: number) => {
    const col = idx % COLS;
    const isLocked = lockedCells.has(idx);
    const spinning = !stopped.has(col) && !isLocked;
    return (
      <SlotGridCard
        card={card}
        idx={idx}
        isLocked={isLocked}
        spinning={spinning}
        decelerating={spinning && deceleratingCols.has(col)}
        isWin={!spinning && winCells.has(idx)}
        isNew={!spinning && newCells.has(idx)}
        devFoilAll={devFoilAll}
        lockedGifIdx={lockedGifIdx}
        showIndices={showIndices}
        baseAppLiteMode={liteMotion}
      />
    );
  };

  const wood = "linear-gradient(180deg,#7a4520 0%,#3d1c02 35%,#6b3a1a 65%,#3d1c02 100%)";
  const dark = "linear-gradient(180deg,#1a0900 0%,#0d0500 100%)";

  // Tela de acesso restrito
  if (effectiveAddress && !isAllowed) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 px-8 text-center">
        <div className="text-4xl font-black" style={{ color:"#FFD700" }}>{t.accessDenied}</div>
        <div className="text-sm text-gray-400">{t.accessDeniedDesc}</div>
        <div className="text-xs text-gray-600 font-mono break-all">{effectiveAddress}</div>
      </div>
    );
  }

  return (
    <>
      <style jsx global>{`
        @keyframes slot-blur {
          0%   { transform:translateY(-6px); filter:blur(2.5px) brightness(1.1); }
          50%  { transform:translateY(6px);  filter:blur(3px) brightness(0.85); }
          100% { transform:translateY(-6px); filter:blur(2.5px) brightness(1.1); }
        }
        /* Frame mode: sem filter (GPU-heavy), só opacity */
        @keyframes slot-blur-lite {
          0%   { transform:translateY(-5px); opacity:0.7; }
          50%  { transform:translateY(5px);  opacity:0.85; }
          100% { transform:translateY(-5px); opacity:0.7; }
        }
        @keyframes slot-blur-slow-lite {
          0%   { transform:translateY(-3px); opacity:0.85; }
          50%  { transform:translateY(3px);  opacity:1; }
          100% { transform:translateY(-3px); opacity:0.85; }
        }
        .slot-spin { animation: ${liteMotion ? 'slot-blur-lite 0.16s' : 'slot-blur 0.08s'} ease-in-out infinite; will-change: ${liteMotion ? 'transform, opacity' : 'transform, filter'}; transform: translate3d(0,0,0); backface-visibility: hidden; }
        @keyframes slot-blur-slow {
          0%   { transform:translateY(-3px); filter:blur(1px) brightness(1.05); }
          50%  { transform:translateY(3px);  filter:blur(1.5px) brightness(0.9); }
          100% { transform:translateY(-3px); filter:blur(1px) brightness(1.05); }
        }
        .slot-decel { animation: ${liteMotion ? 'slot-blur-slow-lite 0.28s' : 'slot-blur-slow 0.18s'} ease-in-out infinite; will-change: ${liteMotion ? 'transform, opacity' : 'transform, filter'}; transform: translate3d(0,0,0); backface-visibility: hidden; }
        @keyframes win-pulse {
          0%,100%{ opacity:1; }
          50%    { opacity:0.75; }
        }
        .win-pulse { animation: ${liteMotion ? 'win-pulse 0.7s ease-in-out infinite' : 'win-pulse 0.45s ease-in-out infinite'}; }
        @keyframes jackpot-glow {
          0%,100%{ text-shadow:0 0 6px #a855f7,0 0 14px #a855f7; }
          50%    { text-shadow:0 0 20px #a855f7,0 0 40px #a855f7,0 0 60px #c084fc; }
        }
        .jackpot-text { animation: ${liteMotion ? 'none' : 'jackpot-glow 0.7s ease-in-out infinite'}; }
        @keyframes mythic-border {
          0%,100%{ box-shadow:0 0 8px #a855f7, 0 0 2px #a855f7, inset 0 0 8px rgba(168,85,247,0.15); }
          50%    { box-shadow:0 0 18px #a855f7, 0 0 6px #c084fc, inset 0 0 14px rgba(168,85,247,0.25); }
        }
        @keyframes legendary-border {
          0%,100%{ box-shadow:0 0 8px #f59e0b, 0 0 2px #f59e0b, inset 0 0 6px rgba(245,158,11,0.1); }
          50%    { box-shadow:0 0 16px #fbbf24, 0 0 5px #fde68a, inset 0 0 12px rgba(245,158,11,0.2); }
        }
        @keyframes subtitle-blink {
          0%,45%  { opacity:1; }
          50%,95% { opacity:0.25; }
          100%    { opacity:1; }
        }
        .subtitle-blink { animation: ${liteMotion ? 'subtitle-blink 1.8s ease-in-out infinite' : 'subtitle-blink 1.4s ease-in-out infinite'}; }
        /* foil-card usa .prize-foil de globals.css (mais colorido) */
        .foil-card { }
        /* Foil breathing animation */
        @keyframes foil-breathe {
          0%, 100% { box-shadow: 0 0 15px #FFA500, inset 0 0 20px #FFA50022; }
          50% { box-shadow: 0 0 25px #FACC15, inset 0 0 30px #FACC1533; }
        }
        .foil-card {
          animation: ${liteMotion ? 'none' : 'foil-breathe 3s ease-in-out infinite'};
        }
        @keyframes combo-reveal {
          0%   { opacity:0; transform:scale(0.4) translateY(30px); }
          18%  { opacity:1; transform:scale(1.12) translateY(-4px); }
          28%  { transform:scale(1); }
          68%  { opacity:1; transform:scale(1); }
          100% { opacity:0; transform:scale(0.85) translateY(-24px); }
        }
        .combo-overlay { animation: ${liteMotion ? 'combo-reveal 1.8s ease-out forwards' : 'combo-reveal 2.8s cubic-bezier(.34,1.56,.64,1) forwards'}; }
        @keyframes combo-shimmer {
          0%,100% { text-shadow: 0 0 12px var(--cc), 0 0 30px var(--cc); }
          50%     { text-shadow: 0 0 24px var(--cc), 0 0 60px var(--cc), 0 0 90px var(--cc); }
        }
        .combo-text { animation: ${liteMotion ? 'none' : 'combo-shimmer 0.6s ease-in-out infinite'}; }
        @keyframes card-fall-in {
          0%   { transform: translateY(-100%); opacity: 0; }
          60%  { transform: translateY(6px); opacity: 1; }
          80%  { transform: translateY(-3px); }
          100% { transform: translateY(0); opacity: 1; }
        }
        .card-fall-in { animation: ${liteMotion ? 'card-fall-in 0.28s ease-out forwards' : 'card-fall-in 0.45s cubic-bezier(.34,1.56,.64,1) forwards'}; }
        @keyframes win-flash {
          0%,100% { opacity: 1; }
          30%     { opacity: 0.4; }
          60%     { opacity: 1; }
        }
        .win-flash { animation: ${liteMotion ? 'win-flash 0.42s ease-in-out 2' : 'win-flash 0.35s ease-in-out 3'}; }
        @keyframes payline-draw {
          0%   { stroke-dashoffset: 350; opacity: 1; }
          65%  { stroke-dashoffset: 0; opacity: 1; }
          85%  { opacity: 1; }
          100% { stroke-dashoffset: 0; opacity: 0; }
        }
        .payline-draw { stroke-dasharray: 350; stroke-dashoffset: 350; animation: ${liteMotion ? 'payline-draw 0.55s ease-out forwards' : 'payline-draw 0.85s ease-out forwards'}; }
        /* Foil suspense column glow */
        @keyframes foil-suspense-pulse {
          0%,100% { box-shadow: 0 0 8px #FFA500, 0 0 16px #FFD700; filter: brightness(1.15) saturate(1.2); }
          50%     { box-shadow: 0 0 24px #FFD700, 0 0 48px #FF8C00, 0 0 72px #FF6B00; filter: brightness(1.5) saturate(1.6); }
        }
        .foil-suspense-col { animation: ${liteMotion ? 'none' : 'foil-suspense-pulse 0.38s ease-in-out infinite'}; z-index: 5; }
        /* Epic foil fly-in from grid position */
        @keyframes epic-fly {
          0%   { transform: translate(var(--sx), var(--sy)) scale(0.5); opacity:0; }
          60%  { opacity:1; }
          100% { transform: translate(0,0) scale(1); opacity:1; }
        }
        .epic-foil-fly { animation: ${liteMotion ? 'none' : 'epic-fly 1.1s cubic-bezier(.34,1.56,.64,1) both'}; animation-delay: ${liteMotion ? '0ms' : 'var(--delay)'}; }
        /* Epic foil group spin */
        @keyframes epic-spin {
          0%   { transform: translate(0,0) scale(1) rotateY(0deg); }
          40%  { transform: translate(0,0) scale(1.15) rotateY(180deg); }
          100% { transform: translate(0,0) scale(1) rotateY(360deg); }
        }
        .epic-foil-spin { animation: ${liteMotion ? 'none' : 'epic-spin 1.8s cubic-bezier(.34,1.2,.64,1) both'}; animation-delay: ${liteMotion ? '0ms' : 'var(--delay)'}; }
        /* Bonus text pop */
        @keyframes epic-bonus-pop {
          0%   { transform: scale(0); opacity:0; }
          60%  { transform: scale(1.2); opacity:1; }
          100% { transform: scale(1); opacity:1; }
        }
        .epic-bonus-text { animation: ${liteMotion ? 'none' : 'epic-bonus-pop 0.6s cubic-bezier(.34,1.56,.64,1) both'}; }
        @keyframes card-3d-fly-in {
          0%   { opacity:0; transform:perspective(900px) rotateY(-120deg) translateY(-160px) scale(0.4); }
          55%  { opacity:1; transform:perspective(900px) rotateY(18deg) translateY(8px) scale(1.06); }
          75%  { transform:perspective(900px) rotateY(-8deg) translateY(-4px) scale(0.97); }
          90%  { transform:perspective(900px) rotateY(4deg) translateY(2px) scale(1.01); }
          100% { opacity:1; transform:perspective(900px) rotateY(0deg) translateY(0) scale(1); }
        }
        .card-3d-fly-in { animation: ${liteMotion ? 'none' : 'card-3d-fly-in 0.95s cubic-bezier(.34,1.2,.64,1) forwards'}; }
      `}</style>


      {/* CARD GALLERY MODAL */}
      {showGallery && (
        <div className="fixed inset-0 z-[400] flex flex-col bg-black/95 overflow-hidden" onClick={() => setShowGallery(false)}>
          <div className="flex items-center justify-between px-4 py-2 border-b-2 border-yellow-500 shrink-0" style={{ background:"#0d0500" }} onClick={e => e.stopPropagation()}>
            <span className="font-black text-xs uppercase tracking-widest text-yellow-400">Card Gallery ({POOL.length} cartas)</span>
            <button onClick={() => setShowGallery(false)} className="w-7 h-7 rounded-full bg-red-600 border-2 border-black font-black text-white flex items-center justify-center">×</button>
          </div>
          <div className="overflow-y-auto flex-1 p-2" onClick={e => e.stopPropagation()}>
            {/* Rarity groups */}
            {(["Special","Mythic","Legendary","Epic","Rare","Common"] as const).map(rar => {
              const cards = POOL.filter(c => c.rarity === rar);
              if (!cards.length) return null;
              const rs = RS[rar];
              return (
                <div key={rar} className="mb-4">
                  <div className="text-[10px] font-black uppercase tracking-widest mb-2 px-1" style={{ color: rs.border }}>
                    {getRarityLabel(t, rar)} ({cards.length})
                  </div>
                  <div className="grid gap-1.5" style={{ gridTemplateColumns: "repeat(5, 1fr)" }}>
                    {cards.map(c => {
                      const cImg = getSlotCardImage(c.baccarat, liteMotion);
                      const cLabel = LABELS[c.baccarat] ?? c.baccarat;
                      return (
                        <div
                          key={c.baccarat}
                          className="relative flex flex-col overflow-hidden rounded cursor-pointer active:scale-95 transition-transform"
                          style={{ border:`${rs.borderW}px solid ${rs.border}`, background: rs.bg, aspectRatio:"3/4", boxShadow:`0 0 6px ${rs.border}44` }}
                          onClick={() => {
                            card3DRotRef.current = { rotY: 0, rotX: 0, dragging: false, lastX: 0, lastY: 0 };
                            setCard3D({ card: { baccarat: c.baccarat, rarity: c.rarity }, img: cImg || '', label: cLabel, flyIn: true });
                          }}
                        >
                          <div className="relative flex-1 overflow-hidden" style={{ background:"#111" }}>
                            {cImg ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={cImg} alt="" aria-label={cLabel} className="w-full h-full object-contain object-center" decoding="async" />
                            ) : (
                              <div className="flex items-center justify-center h-full text-[8px] text-gray-300 text-center px-0.5">{cLabel.toUpperCase()}</div>
                            )}
                          </div>
                          <div className="px-0.5 py-0.5 text-center" style={{ background: rs.labelBg }}>
                            <span className="text-[6px] font-black text-white leading-none" style={{ fontSize: cLabel.length > 10 ? "5px" : "6px" }}>{cLabel.toUpperCase()}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            {/* Foil preview row */}
            <div className="mb-4">
              <div className="text-[10px] font-black uppercase tracking-widest mb-2 px-1 text-orange-400">FOIL EFFECT (preview)</div>
              <div className="grid gap-1.5" style={{ gridTemplateColumns: "repeat(5, 1fr)" }}>
                {POOL.slice(0, 5).map(c => {
                  const cImg = getSlotCardImage(c.baccarat, liteMotion);
                  const rs = RS[c.rarity as keyof typeof RS] ?? RS.Common;
                  const cLabel = LABELS[c.baccarat] ?? c.baccarat;
                  return (
                    <div key={c.baccarat+"_foil"} className={`relative ${liteMotion ? "" : "foil-card"} flex flex-col overflow-hidden rounded`} style={{ border:`${rs.borderW}px solid #FFA500`, background: rs.bg, aspectRatio:"3/4", boxShadow: liteMotion ? "0 0 4px #FFA50055" : `0 0 15px #FFA50088` }}>
                      <div className="relative flex-1 overflow-hidden" style={{ background:"#111" }}>
                        {cImg && <img src={cImg} alt="" aria-label={cLabel} className="w-full h-full object-contain object-center" decoding="async" />}
                        {liteMotion ? (
                          <>
                            <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.28) 0%, rgba(255,215,0,0.18) 28%, transparent 46%, rgba(34,211,238,0.18) 70%, rgba(255,165,0,0.24) 100%)" }} />
                            <div className="absolute top-0 right-0 px-1 py-0.5 text-[7px] font-black text-black rounded-bl" style={{ background: "#FFD700" }}>FOIL</div>
                          </>
                        ) : <div className="prize-foil" />}
                      </div>
                      <div className="px-0.5 py-0.5 text-center" style={{ background: rs.labelBg }}>
                        <span className="text-[6px] font-black text-white leading-none">✨ FOIL</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3D CARD VIEWER — igual ao /raffle, drag para girar */}
      {(() => {
        if (!card3D) return null;
        const c3dName = card3D.card.baccarat;
        const c3dCombos = getSlotComboCatalog().filter(
          (entry) => entry.possibleInSlot && entry.availableCards.includes(c3dName)
        );
        return (
        <div
          key="card3d-viewer"
          className="fixed inset-0 z-[500] flex flex-col items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.92)', backdropFilter: getOverlayBackdropFilter(isBaseApp, 12) }}
        >
          <div className="flex flex-col items-center gap-4">
            {/* Rarity tag + Combos button */}
            <div className="flex items-center gap-2">
              <div className="px-3 py-1 rounded-full border-2 font-black text-xs uppercase tracking-widest"
                style={{ borderColor: (RS[card3D.card.rarity] ?? RS.Common).border, color: (RS[card3D.card.rarity] ?? RS.Common).border, background: (RS[card3D.card.rarity] ?? RS.Common).bg }}>
                {getRarityLabel(t, card3D.card.rarity)}
              </div>
              {card3D.card.hasFoil && <div className="px-2 py-1 rounded-full border-2 border-orange-400 text-orange-300 font-black text-xs">✨ FOIL</div>}
              {c3dCombos.length > 0 && (
                <button
                  onClick={(e) => { e.stopPropagation(); setCard3DCombosOpen(!card3DCombosOpen); }}
                  className="px-2 py-1 rounded-full border-2 font-black text-xs uppercase tracking-wider transition-colors"
                  style={{ borderColor: "#a855f7", color: "#c084fc", background: "#0d0015" }}
                >
                  {card3DCombosOpen ? "✕" : `${c3dCombos.length} COMBO${c3dCombos.length > 1 ? "S" : ""}`}
                </button>
              )}
            </div>

            {/* Combos list — expandable below header */}
            {card3DCombosOpen && c3dCombos.length > 0 && (
              <div className="w-[260px] max-h-[160px] overflow-y-auto rounded-xl p-3 flex flex-col gap-2"
                style={{ background: "#0d0d0d", border: "1px solid #222" }}
                onClick={e => e.stopPropagation()}>
                {c3dCombos.map((entry) => {
                  const missing = entry.combo.cards.filter((name) => !entry.availableCards.includes(name));
                  return (
                    <div key={entry.combo.id} className="rounded-lg p-2" style={{ background: "#151515", border: "1px solid #2a2a2a" }}>
                      <div className="text-xs font-black flex items-center gap-1" style={{ color: "#e5e5e5" }}>
                        <span>{entry.combo.emoji}</span>
                        <span>{entry.combo.name}</span>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {entry.combo.cards.map((name, i) => {
                          const inPool = entry.availableCards.includes(name);
                          const isThisCard = name === c3dName;
                          return (
                            <span key={i} className="text-[10px] px-1.5 py-0.5 rounded font-bold"
                              style={{
                                color: inPool ? "#a5f3c4" : "#666",
                                background: isThisCard ? "#a855f733" : "#1a1a1a",
                                border: isThisCard ? "1px solid #a855f766" : "1px solid #222",
                              }}>
                              {name}{missing.length > 0 && !inPool ? "?" : ""}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 3D card wrapper — drag to spin */}
            <div
              className={`select-none ${card3D.flyIn ? "card-3d-fly-in" : ""}`}
              style={{ perspective: '900px', width: 204, height: 310, cursor: 'grab', willChange: 'transform', transform: 'translate3d(0,0,0)' }}
              onMouseDown={e => { card3DRotRef.current.dragging = true; card3DRotRef.current.lastX = e.clientX; card3DRotRef.current.lastY = e.clientY; (e.currentTarget as HTMLDivElement).style.cursor = 'grabbing'; }}
              onMouseMove={e => {
                if (!card3DRotRef.current.dragging) return;
                const dx = e.clientX - card3DRotRef.current.lastX; const dy = e.clientY - card3DRotRef.current.lastY;
                card3DRotRef.current.lastX = e.clientX; card3DRotRef.current.lastY = e.clientY;
                card3DRotRef.current.rotY += dx * 0.7;
                card3DRotRef.current.rotX -= dy * 0.4;
                card3DRotRef.current.rotX = Math.max(-40, Math.min(40, card3DRotRef.current.rotX));
                if (card3DInnerRef.current) card3DInnerRef.current.style.transform = `rotateY(${card3DRotRef.current.rotY}deg) rotateX(${card3DRotRef.current.rotX}deg)`;
              }}
              onMouseUp={e => { card3DRotRef.current.dragging = false; (e.currentTarget as HTMLDivElement).style.cursor = 'grab'; }}
              onMouseLeave={e => { card3DRotRef.current.dragging = false; (e.currentTarget as HTMLDivElement).style.cursor = 'grab'; }}
              onTouchStart={e => { const t = e.touches[0]; card3DRotRef.current.dragging = true; card3DRotRef.current.lastX = t.clientX; card3DRotRef.current.lastY = t.clientY; }}
              onTouchMove={e => {
                if (!card3DRotRef.current.dragging) return;
                const t = e.touches[0];
                const dx = t.clientX - card3DRotRef.current.lastX; const dy = t.clientY - card3DRotRef.current.lastY;
                card3DRotRef.current.lastX = t.clientX; card3DRotRef.current.lastY = t.clientY;
                card3DRotRef.current.rotY += dx * 0.7;
                card3DRotRef.current.rotX -= dy * 0.4;
                card3DRotRef.current.rotX = Math.max(-40, Math.min(40, card3DRotRef.current.rotX));
                if (card3DInnerRef.current) card3DInnerRef.current.style.transform = `rotateY(${card3DRotRef.current.rotY}deg) rotateX(${card3DRotRef.current.rotX}deg)`;
              }}
              onTouchEnd={() => { card3DRotRef.current.dragging = false; }}
            >
              <div
                ref={card3DInnerRef}
                style={{ width: '100%', height: '100%', position: 'relative', transformStyle: 'preserve-3d', transform: 'translate3d(0,0,0) rotateY(0deg) rotateX(0deg)', transition: 'transform 0.05s ease-out', willChange: 'transform' }}
              >
                {/* FRONT — igual ao raffle: imagem preenchendo tudo, sem label */}
                <div style={{
                  position: 'absolute', inset: 0, backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' as any,
                  borderRadius: 12, overflow: 'hidden',
                  boxShadow: `0 0 40px ${(RS[card3D.card.rarity] ?? RS.Common).border}88`,
                  background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {card3D.img && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={card3D.img} alt="" aria-label={card3D.label} draggable={false} decoding="async" style={{ width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }} />
                  )}
                  {!liteMotion && card3D.card.hasFoil && <div className="prize-foil" style={{ borderRadius: 12 }} />}
                </div>
                {/* BACK — igual ao raffle: scale(1.13) para cobrir bordas do formato */}
                <div style={{
                  position: 'absolute', inset: 0, backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' as any,
                  transform: 'rotateY(180deg)', borderRadius: 12, overflow: 'hidden',
                  boxShadow: '0 0 40px rgba(255,215,0,0.5)',
                }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={"/images/card-back.png"} alt={t.cardBackAlt} draggable={false} decoding="async"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', transform: 'scale(1.13) translateY(1.3%)', transformOrigin: 'center', pointerEvents: 'none' }} />
                </div>
              </div>
            </div>

            <p className="text-white/40 text-[10px] uppercase tracking-widest">{t.dragToRotate}</p>
            <button
              onClick={() => { setCard3D(null); card3DRotRef.current = { rotY: 0, rotX: 0, dragging: false, lastX: 0, lastY: 0 }; }}
              className="text-white/30 text-xs font-black uppercase tracking-widest hover:text-white/60 transition-colors"
            >{t.closeX}</button>
          </div>
        </div>
      ); })()}

      {/* PLAY BONUS overlay — aparece após 4 foils, antes de entrar no bonus */}
      {showPlayBonus && (
        <div className="fixed inset-0 z-[650] flex items-center justify-center" style={{ background:'rgba(0,0,0,0.88)', backdropFilter:getOverlayBackdropFilter(isBaseApp, 8) }}>
          <div className="flex flex-col items-center gap-6 text-center px-8">
            <div className="font-black text-5xl" style={{ color:'#FFD700', textShadow:'0 0 30px #FFD700, 0 0 60px #FFA500', animation:'epic-bonus-pop 0.6s cubic-bezier(.34,1.56,.64,1) both' }}>
              {t.bonusTitle}
            </div>
            <div className="font-black text-xl text-white uppercase tracking-widest">
              {BONUS_FREE_SPINS} {t.freeSpins}
            </div>
            <div className="text-gray-400 text-sm">{t.bonusWildcardStays}</div>
            <button
              onClick={() => {
                setShowPlayBonus(false);
                playBonusReadyRef.current?.();
                playBonusReadyRef.current = null;
              }}
              className="px-10 py-4 rounded-2xl font-black text-xl uppercase tracking-widest border-4 border-black active:scale-95 transition-transform"
              style={{ background:'linear-gradient(180deg,#FFD700,#c87941)', color:'#000', boxShadow:'0 6px 0 #000, 0 0 30px #FFD700' }}
            >
              {t.playBonus}
            </button>
          </div>
        </div>
      )}

      {/* BONUS SUMMARY — aparece após os 10 bonus spins */}
      {showBonusSummary && (() => {
        const playerName = userProfile?.username ?? (address ? address.slice(0, 6) + '…' : '');
        const bonusMultX = betMult > 0 ? Math.round(bonusSummaryAmount / betMult) : 0;
        const winType = bonusMultX >= 100 ? 'max' : bonusMultX >= 20 ? 'big' : bonusMultX >= 5 ? 'great' : 'nice';
        const ogParams = new URLSearchParams({ amount: String(bonusSummaryAmount), x: String(bonusMultX), type: winType, ...(playerName ? { user: playerName } : {}), ...(sessionIdRef.current ? { sid: sessionIdRef.current } : {}) });
        const castText = t.bonusRoundCast
          .replace("{amount}", bonusSummaryAmount.toLocaleString())
          .replace("{mult}", bonusMultX >= 2 ? ` (${bonusMultX}×)` : "")
          .replace("{by}", playerName ? `by @${playerName}` : "");
        return (
          <div className="fixed inset-0 z-[650] flex items-center justify-center" style={{ background:'rgba(0,0,0,0.92)', backdropFilter:getOverlayBackdropFilter(isBaseApp, 8) }}>
            <div className="flex flex-col items-center gap-5 text-center px-8 max-w-[320px]">
              <div className="font-black text-2xl uppercase tracking-widest text-yellow-300">{t.bonusCompleted}</div>
              <div className="font-black leading-none" style={{ fontSize: 52, color: bonusSummaryAmount > 0 ? '#4ade80' : '#6b7280', textShadow: bonusSummaryAmount > 0 ? '0 0 20px #4ade80' : undefined }}>
                +{bonusSummaryAmount.toLocaleString()}
              </div>
              <div className="text-gray-400 text-sm uppercase tracking-wider">{t.bonusCoinsWon}</div>
              {bonusSummaryAmount > 0 && (
                <button
                  onClick={() => {
                    const embedUrl = sessionIdRef.current ? `https://vibemostwanted.xyz/slot/replay/${sessionIdRef.current}?${ogParams}` : `https://vibemostwanted.xyz/share/slot?${ogParams}`;
                    const composeUrl = `https://warpcast.com/~/compose?text=${encodeURIComponent(castText)}&embeds[]=${encodeURIComponent(embedUrl)}`;
                    sdk.actions.openUrl(composeUrl).catch(() => window.open(composeUrl, '_blank'));
                  }}
                  className="px-6 py-2.5 rounded-xl font-black text-sm uppercase tracking-widest border-2 border-black active:scale-95 transition-transform"
                  style={{ background:'linear-gradient(180deg,#22c55e,#15803d)', color:'#fff', boxShadow:'0 4px 0 #000' }}
                >
                  {t.shareWin}
                </button>
              )}
              <button
                onClick={() => setShowBonusSummary(false)}
                className="px-8 py-3 rounded-xl font-black text-base uppercase tracking-widest border-2 border-black active:scale-95 transition-transform"
                style={{ background:'linear-gradient(180deg,#7c3aed,#4c1d95)', color:'#FFD700', boxShadow:'0 4px 0 #000' }}
              >
                {t.continue}
              </button>
            </div>
          </div>
        );
      })()}

      {/* BIG WIN overlay */}
      {bigWinType && (() => {
        const cfg = {
          max:   { label: 'MAX WIN',   color: '#a855f7', shadow: '0 0 20px #a855f7, 0 0 60px #c084fc', size: 52 },
          big:   { label: 'BIG WIN',   color: '#FFD700', shadow: '0 0 20px #FFD700, 0 0 50px #FFA500', size: 46 },
          great: { label: 'GREAT WIN', color: '#4ade80', shadow: '0 0 20px #4ade80, 0 0 40px #22c55e', size: 40 },
          nice:  { label: 'NICE WIN',  color: '#38bdf8', shadow: '0 0 16px #38bdf8, 0 0 30px #0ea5e9', size: 34 },
        }[bigWinType];
        const playerName = userProfile?.username ?? (address ? address.slice(0, 6) + '…' : '');
        const ogParams = new URLSearchParams({ amount: String(bigWinAmount), x: String(bigWinMultX), type: bigWinType, ...(playerName ? { user: playerName } : {}), ...(sessionIdRef.current ? { sid: sessionIdRef.current } : {}) });
        const castText = t.bigWinCast
          .replace("{label}", cfg.label)
          .replace("{amount}", bigWinAmount.toLocaleString())
          .replace("{mult}", bigWinMultX >= 2 ? ` (${bigWinMultX}×)` : "")
          .replace("{by}", playerName ? `by @${playerName}` : "");
        return (
          <div
            className="fixed inset-0 z-[640] flex flex-col items-center justify-center gap-3"
            style={{ background: 'rgba(0,0,0,0.82)' }}
            onClick={() => setBigWinType(null)}
          >
            {/* Win label */}
            <div className="font-black uppercase tracking-widest text-center pointer-events-none" style={{
              fontSize: cfg.size, color: cfg.color, textShadow: cfg.shadow,
              animation: 'epic-bonus-pop 0.5s cubic-bezier(.34,1.56,.64,1) both',
            }}>
              {t.bigWinLabel.replace("{label}", cfg.label)}
            </div>

            {/* Multiplier */}
            {bigWinMultX >= 2 && (
              <div className="font-black text-white text-2xl pointer-events-none" style={{ textShadow: `0 0 12px ${cfg.color}` }}>
                {bigWinMultX}×
              </div>
            )}

            {/* Amount */}
            <div className="font-black pointer-events-none" style={{ fontSize: 28, color: cfg.color }}>
              +{bigWinAmount.toLocaleString()} {t.coins}
            </div>

            {/* Player name */}
            {playerName && (
              <div className="pointer-events-none text-base font-bold" style={{ color: '#ffffff88' }}>
                @{playerName}
              </div>
            )}

            {/* Share button — só para ≥ 5× (Great Win+) */}
            {bigWinMultX >= 5 && (
              <button
                onClick={e => {
                  e.stopPropagation();
                  const embedUrl = sessionIdRef.current ? `https://vibemostwanted.xyz/slot/replay/${sessionIdRef.current}?${ogParams}` : `https://vibemostwanted.xyz/share/slot?${ogParams}`;
                  const composeUrl = `https://warpcast.com/~/compose?text=${encodeURIComponent(castText)}&embeds[]=${encodeURIComponent(embedUrl)}`;
                  sdk.actions.openUrl(composeUrl).catch(() => window.open(composeUrl, '_blank'));
                  setBigWinType(null);
                }}
                className="mt-1 px-6 py-2.5 rounded-xl font-black text-sm uppercase tracking-widest border-2 border-black"
                style={{ background: `linear-gradient(180deg,${cfg.color}cc,${cfg.color}88)`, color: '#000', boxShadow: '0 4px 0 #000' }}
              >
                {t.shareWin}
              </button>
            )}

            <div className="text-[10px] text-gray-500 pointer-events-none">{t.tapToDismiss}</div>
          </div>
        );
      })()}

      {/* EPIC FOIL OVERLAY — 4 foil cards flip 3D in-place side by side */}
      {epicFoilCards && epicFoilPhase && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center overflow-hidden pointer-events-none"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: getOverlayBackdropFilter(isBaseApp, 4) }}>
          <div className="relative" style={{ width: 'min(86vw, 360px)', aspectRatio: '5 / 3' }}>
            {epicFoilCards.map((fc, i) => {
              const rs = RS[fc.card.rarity] ?? RS.Common;
              const cellWidth = 100 / COLS;
              const cellHeight = 100 / ROWS;
              return (
                <div
                  key={fc.idx}
                  className={epicFoilPhase === 'fly' ? 'epic-foil-fly' : 'epic-foil-spin'}
                  style={{
                    position: 'absolute',
                    left: `calc(${fc.col * cellWidth}% + 4px)`,
                    top: `calc(${fc.row * cellHeight}% + 4px)`,
                    width: `calc(${cellWidth}% - 8px)`,
                    height: `calc(${cellHeight}% - 8px)`,
                    borderRadius: 8,
                    overflow: 'hidden',
                    border: `3px solid ${rs.border}`,
                    boxShadow: `0 0 20px ${rs.border}88, 0 0 40px #FFA50055`,
                    background: rs.bg,
                    '--delay': `${i * 0.08}s`,
                  } as React.CSSProperties}
                >
                  {fc.img && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={fc.img} alt="" draggable={false} style={{ width:'100%', height:'100%', objectFit:'cover', pointerEvents:'none' }} />
                  )}
                  {!liteMotion && <div className="prize-foil" />}
                </div>
              );
            })}
            {epicFoilPhase === 'spin' && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center epic-bonus-text">
                  <div className="font-black uppercase tracking-widest" style={{ fontSize: 32, color:'#FFD700', textShadow:'0 0 20px #FFD700, 0 0 40px #FFA500' }}>
                    {t.bonusTitle}
                  </div>
                  <div className="font-black text-white text-sm uppercase tracking-widest mt-1" style={{ textShadow:'0 0 10px #a855f7' }}>
                    {t.freeSpins}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de confirmação BUY BONUS */}
      {showBonusConfirm && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-black/85" onClick={() => setShowBonusConfirm(false)}>
          <div
            className="w-full max-w-[280px] overflow-hidden rounded-xl border-4"
            style={{ borderColor:"#7c3aed", background:"#0d0015", boxShadow:"4px 4px 0 #000" }}
            onClick={e => e.stopPropagation()}
          >
            <div className="px-4 py-2 border-b-2 border-[#7c3aed] flex items-center justify-between" style={{ background:"linear-gradient(180deg,#4c1d95,#2e1065)" }}>
              <span className="font-black text-sm uppercase tracking-widest" style={{ color:"#FFD700", textShadow:"1px 1px 0 #000" }}>{t.buyBonus}</span>
              <button onClick={() => setShowBonusConfirm(false)} className="w-6 h-6 rounded-full bg-red-600 border-2 border-black font-black text-white text-sm flex items-center justify-center">×</button>
            </div>
            <div className="p-4 text-center space-y-3">
              <div className="text-white text-sm">{t.costLabel}: <span className="font-black text-purple-300">{bonusCost} {t.coins}</span></div>
              <div className="text-gray-400 text-xs">{t.bonusMode}: <span className="font-black text-green-400">+{BONUS_FREE_SPINS} {t.freeSpins}</span></div>
              <div className="text-gray-500 text-[10px]">{t.currentBalanceLabel}: <span className="text-white font-bold">{coins.toLocaleString()} {t.coins}</span></div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setShowBonusConfirm(false)}
                  className="flex-1 py-2 border-2 border-gray-600 font-black text-xs uppercase text-gray-400 hover:bg-gray-800"
                >
                  {tm.cancel}
                </button>
                <button
                  onClick={() => { setShowBonusConfirm(false); spin(false, true); }}
                  className="flex-1 py-2 border-2 border-black font-black text-xs uppercase active:scale-95 transition-transform"
                  style={{ background:"linear-gradient(180deg,#7c3aed,#4c1d95)", color:"#FFD700", textShadow:"1px 1px 0 #000", boxShadow:"0 3px 0 #000" }}
                >
                  {tm.confirm}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* HELP MODAL */}
      {showHelp && (() => {
        const TOTAL_PAGES = 4;
        const closeHelp = () => {
          localStorage.setItem("slot_tutorial_seen", "1");
          setShowHelp(false);
        };
        return (
          <div className="fixed inset-0 z-[400] flex items-center justify-center p-3 bg-black/92" onClick={closeHelp}>
            <div
              className="w-full max-w-[340px] rounded-2xl border-4 overflow-hidden flex flex-col"
              style={{ borderColor:"#c87941", background:"#0d0500", boxShadow:"0 0 60px #c8794144, 4px 4px 0 #000", maxHeight:"90vh" }}
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="px-4 py-2.5 border-b-2 border-[#c87941] flex items-center justify-between shrink-0" style={{ background:"linear-gradient(180deg,#3a1800,#1a0800)" }}>
                <div className="flex items-center gap-2">
                  <span className="text-lg">🎰</span>
                  <span className="font-black text-sm uppercase tracking-widest" style={{ color:"#FFD700" }}>
                    {helpPage === 0 ? t.welcome : helpPage === 1 ? t.combos : helpPage === 2 ? t.mechanics : t.howToDeposit}
                  </span>
                </div>
                <button onClick={closeHelp} className="w-6 h-6 rounded-full bg-red-600 border-2 border-black font-black text-white text-sm flex items-center justify-center">×</button>
              </div>

              {/* Content */}
              <div className="overflow-y-auto flex-1 p-4">

                {/* PAGE 0 — Bem-vindo */}
                {helpPage === 0 && (
                  <div className="space-y-4">
                    <div className="text-center py-2">
                      <div className="text-5xl mb-2">🃏</div>
                      <div className="font-black text-xl text-yellow-400 tracking-tight">{t.slotTitle}</div>
                      <div className="text-gray-400 text-xs mt-1">{helpWelcomeSubtitle}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {helpWelcomeCards.map(item => (
                        <div key={item.title} className="rounded-lg p-2.5 text-center" style={{ background:"#1a0800", border:"1px solid #3a2000" }}>
                          <div className="text-2xl mb-1">{item.icon}</div>
                          <div className="font-black text-[11px] text-yellow-300">{item.title}</div>
                          <div className="text-gray-500 text-[10px] mt-0.5 leading-tight">{item.desc}</div>
                        </div>
                      ))}
                    </div>
                    <div className="text-center">
                      <button
                        onClick={() => setHelpPage(1)}
                        className="px-6 py-2 rounded-lg font-black text-sm border-2 border-black"
                        style={{ background:"linear-gradient(180deg,#FFD700,#c87941)", color:"#000" }}
                      >
                        {t.howToPlay}
                      </button>
                    </div>
                  </div>
                )}

                {/* PAGE 1 — Combos */}
                {helpPage === 1 && (
                  <div className="space-y-3">
                    {/* Tipo 1 */}
                    <div className="rounded-xl overflow-hidden border-2" style={{ borderColor:"#3a2000" }}>
                      <div className="px-3 py-1.5 flex items-center gap-2" style={{ background:"#1a0800" }}>
                        <span className="text-base">🃏</span>
                        <span className="font-black text-xs text-yellow-300 uppercase tracking-wider">{t.helpRankComboTitle}</span>
                        <span className="ml-auto text-[10px] text-gray-500">{t.helpRankComboTagline}</span>
                      </div>
                      <div className="px-3 py-2 space-y-1.5" style={{ background:"#100500" }}>
                        <div className="text-gray-300 text-[11px] leading-relaxed">
                          {t.helpRankComboDesc}
                        </div>
                        <div className="flex gap-1 mt-1">
                          {["♥A","♦A","♣A","♠A"].map(c => (
                            <div key={c} className="flex-1 rounded text-center py-1 font-black text-[11px]" style={{ background:"#1a0800", color:"#a855f7", border:"1px solid #a855f766" }}>{c}</div>
                          ))}
                        </div>
                        <div className="text-purple-400 font-black text-[10px] text-center">{t.helpRankComboExample}</div>
                      </div>
                    </div>

                    {/* Tipo 2 */}
                    <div className="rounded-xl overflow-hidden border-2" style={{ borderColor:"#3a2000" }}>
                      <div className="px-3 py-1.5 flex items-center gap-2" style={{ background:"#1a0800" }}>
                        <span className="text-base">💀</span>
                        <span className="font-black text-xs text-red-400 uppercase tracking-wider">{t.helpQuadComboTitle}</span>
                        <span className="ml-auto text-[10px] text-gray-500">{t.helpQuadComboTagline}</span>
                      </div>
                      <div className="px-3 py-2 space-y-1.5" style={{ background:"#100500" }}>
                        <div className="text-gray-300 text-[11px] leading-relaxed">
                          {t.helpQuadComboDesc}
                        </div>
                        <div className="flex gap-1 mt-1">
                          {["Tukka","Tukka","Tukka","Tukka"].map((c,i) => (
                            <div key={i} className="flex-1 rounded text-center py-1 font-black text-[9px]" style={{ background:"#1a0800", color:"#ec4899", border:"1px solid #ec489966" }}>{c}</div>
                          ))}
                        </div>
                        <div className="text-pink-400 font-black text-[10px] text-center">{t.helpQuadComboExample}</div>
                      </div>
                    </div>

                    {/* Tabela de payouts */}
                    <div className="rounded-lg overflow-hidden" style={{ border:"1px solid #2a2a2a" }}>
                      <div className="px-3 py-1 text-[10px] font-black uppercase tracking-wider text-gray-500" style={{ background:"#111" }}>{t.helpCombosPayoutTableTitle}</div>
                      <div className="px-2 py-1.5 space-y-0.5" style={{ background:"#0d0d0d" }}>
                        {[
                          { label:t.helpCombosPayoutAceLabel,   color:"#a855f7", payout:"1000%" },
                          { label:t.helpCombosPayoutKingLabel,  color:"#f59e0b", payout:"500%"  },
                          { label:t.helpCombosPayoutQueenLabel, color:"#ec4899", payout:"400%"  },
                          { label:t.helpCombosPayoutJackLabel,  color:"#3b82f6", payout:"300%" },
                          { label:t.helpCombosPayoutTenLabel,   color:"#06b6d4", payout:"250%"  },
                          { label:t.helpCombosPayoutNineLabel,  color:"#10b981", payout:"200%"  },
                          { label:t.helpCombosPayoutEightLabel, color:"#84cc16", payout:"150%"  },
                          { label:t.helpCombosPayoutSevenLabel, color:"#eab308", payout:"100%"  },
                          { label:t.helpCombosPayoutTwoToSixLabel, color:"#6b7280", payout:"15–60%"},
                        ].map(r => (
                          <div key={r.label} className="flex items-center justify-between">
                            <span className="font-black text-[10px]" style={{ color:r.color }}>{r.label}</span>
                            <span className="text-[10px] px-1.5 rounded font-bold" style={{ color:"#e5e5e5", background:"#1a1a1a" }}>{r.payout}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* PAGE 2 — Mecânicas */}
                {helpPage === 2 && (
                  <div className="space-y-2.5">
                    {[
                      {
                        icon:"⚡", color:"#22c55e", title: t.helpMechanicCascadeTitle,
                        desc: t.helpMechanicCascadeDesc,
                      },
                      {
                        icon:"✨", color:"#FFA500", title: t.helpMechanicFoilTitle,
                        desc: t.helpMechanicFoilDesc,
                      },
                      {
                        icon:"🎰", color:"#a855f7", title: t.helpMechanicBonusModeTitle,
                        desc: t.helpMechanicBonusModeDesc,
                      },
                      {
                        icon:"🐉", color:"#FACC15", title: t.helpMechanicDragukkaTitle,
                        desc: t.helpMechanicDragukkaDesc,
                      },
                      {
                        icon:"🃏", color:"#38bdf8", title: t.helpMechanicWildcardsTitle,
                        desc: t.helpMechanicWildcardsDesc,
                      },
                    ].map(item => (
                      <div key={item.title} className="rounded-lg p-2.5 flex gap-2.5" style={{ background:"#111", border:`1px solid ${item.color}33` }}>
                        <span className="text-xl shrink-0 mt-0.5">{item.icon}</span>
                        <div>
                          <div className="font-black text-[11px] uppercase tracking-wider mb-0.5" style={{ color:item.color }}>{item.title}</div>
                          <div className="text-gray-400 text-[10px] leading-relaxed">{item.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* PAGE 3 — Como Depositar */}
                {helpPage === 3 && (
                  <div className="space-y-3">
                    <div className="text-center text-yellow-400 font-black text-xs uppercase tracking-wider mb-1">{t.helpDepositNeedVbmsTitle}</div>

                    {[
                      {
                        step:"1", color:"#22c55e",
                        title: t.helpDepositStep1Title,
                        desc: t.helpDepositStep1Desc,
                        icon:"💰",
                      },
                      {
                        step:"2", color:"#3b82f6",
                        title: t.helpDepositStep2Title,
                        desc: t.helpDepositStep2Desc,
                        icon:"👆",
                      },
                      {
                        step:"3", color:"#f59e0b",
                        title: t.helpDepositStep3Title,
                        desc: t.helpDepositStep3Desc,
                        icon:"✅",
                      },
                      {
                        step:"4", color:"#a855f7",
                        title: t.helpDepositStep4Title,
                        desc: t.helpDepositStep4Desc,
                        icon:"🎮",
                      },
                    ].map(item => (
                      <div key={item.step} className="flex gap-3 items-start">
                        <div className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center font-black text-sm border-2" style={{ background:`${item.color}22`, borderColor:item.color, color:item.color }}>
                          {item.step}
                        </div>
                        <div className="flex-1 rounded-lg p-2.5" style={{ background:"#111", border:`1px solid ${item.color}33` }}>
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span>{item.icon}</span>
                            <span className="font-black text-[11px]" style={{ color:item.color }}>{item.title}</span>
                          </div>
                          <div className="text-gray-400 text-[10px] leading-relaxed">{item.desc}</div>
                        </div>
                      </div>
                    ))}

                    <div className="rounded-lg p-2.5 text-center" style={{ background:"#1a0800", border:"1px solid #c87941" }}>
                      <div className="text-yellow-400 font-black text-[11px]">{t.freeSpinsDay}</div>
                      <div className="text-gray-500 text-[10px] mt-0.5">{t.noDeposit}</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer nav */}
              <div className="shrink-0 px-4 py-2.5 border-t-2 border-[#2a1000] flex items-center justify-between" style={{ background:"#080200" }}>
                <button
                  onClick={() => setHelpPage(p => Math.max(0, p - 1))}
                  disabled={helpPage === 0}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold disabled:opacity-20 transition-opacity"
                  style={{ color:"#FFD700", background:"#1a0800", border:"1px solid #3a2000" }}
                >{t.prev}</button>

                <div className="flex gap-1.5">
                  {Array.from({ length: TOTAL_PAGES }).map((_, p) => (
                    <button key={p} onClick={() => setHelpPage(p)}
                      className="rounded-full transition-all"
                      style={{
                        width: p === helpPage ? 18 : 7,
                        height: 7,
                        background: p === helpPage ? "#FFD700" : "#333",
                      }}
                    />
                  ))}
                </div>

                {helpPage < TOTAL_PAGES - 1 ? (
                  <button
                    onClick={() => setHelpPage(p => p + 1)}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold transition-opacity"
                    style={{ color:"#000", background:"linear-gradient(180deg,#FFD700,#c87941)", border:"1px solid #000" }}
                  >{t.next}</button>
                ) : (
                  <button
                    onClick={closeHelp}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold"
                    style={{ color:"#000", background:"linear-gradient(180deg,#22c55e,#15803d)", border:"1px solid #000" }}
                  >{t.play}</button>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      <div className="flex flex-col h-full w-full max-w-[420px] mx-auto select-none">
        {/* MACHINE FRAME */}
        <div
          className="relative flex flex-col flex-1 min-h-0 w-full overflow-hidden border-4"
          style={{
            borderColor: "#c87941",
            boxShadow: "0 0 0 2px #0d0500, inset 0 1px 0 rgba(255,200,100,0.2)",
            background: wood,
          }}
        >

          {/* REEL AREA — flex-1 preenche o espaço disponível */}
          <div
            className="flex-1 min-h-[270px] relative overflow-hidden"
            style={{
              background: isBonusActive
                ? "linear-gradient(180deg,#1a0040 0%,#0d001f 40%,#050010 70%,#000 100%)"
                : "linear-gradient(180deg,#000 0%,#100500 40%,#080200 70%,#000 100%)",
              boxShadow: isBonusActive
                ? "inset 0 12px 28px rgba(168,85,247,0.4), inset 0 -12px 28px rgba(168,85,247,0.4)"
                : "inset 0 12px 28px rgba(0,0,0,0.98), inset 0 -12px 28px rgba(0,0,0,0.98)",
            }}
          >
            {/* Payline dots — one per row */}
            <div className="absolute left-0.5 top-0 bottom-0 z-20 flex flex-col justify-around pointer-events-none">
              <div className="w-2.5 h-2.5 rounded-full bg-[#FFD700] border border-black shadow-lg" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#FFD700] border border-black shadow-lg" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#FFD700] border border-black shadow-lg" />
            </div>
            <div className="absolute right-0.5 top-0 bottom-0 z-20 flex flex-col justify-around pointer-events-none">
              <div className="w-2.5 h-2.5 rounded-full bg-[#FFD700] border border-black shadow-lg" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#FFD700] border border-black shadow-lg" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#FFD700] border border-black shadow-lg" />
            </div>

            {/* Cards grid — renderizado por coluna para permitir strip animation sem rerender do grid inteiro */}
            <div className="absolute inset-0 mx-3 my-1 flex" style={{ gap: `${REEL_ROW_GAP_PX}px` }}>
              {Array.from({ length: COLS }, (_, col) => {
                const columnStopped = stopped.has(col);
                const useStrip = !columnStopped && !columnHasLockedCells(col);
                const isSuspenseCol = foilSuspenseCols.has(col) && !columnStopped;

                return (
                  <div
                    key={col}
                    className={`relative min-w-0 flex-1 ${isSuspenseCol ? 'foil-suspense-col' : ''}`}
                    style={{
                      borderRight: col < COLS - 1 ? "1px solid rgba(200,121,65,0.18)" : "none",
                    }}
                  >
                    {useStrip ? (
                      <SlotReelStrip
                        col={col}
                        liteMotion={liteMotion}
                        stopCards={stripStopTargets[col]}
                        onStopComplete={handleStripStopComplete}
                      />
                    ) : (
                      <div className="absolute inset-0 flex flex-col" style={{ gap: `${REEL_ROW_GAP_PX}px` }}>
                        {Array.from({ length: ROWS }, (_, row) => {
                          const i = row * COLS + col;
                          return (
                            <div
                              key={row}
                              className="relative min-h-0"
                              style={{
                                flex: 1,
                                cursor: !isSpinning && columnStopped ? 'pointer' : 'default',
                              }}
                              onClick={() => {
                                if (isSpinning || !columnStopped) return;
                                const c = cells[i];
                                const img = getSlotCardImage(c.baccarat, liteMotion);
                                card3DRotRef.current = { rotY: 0, rotX: 0, dragging: false, lastX: 0, lastY: 0 };
                                setCard3D({ card: c, img: img || '', label: LABELS[c.baccarat] ?? c.baccarat, flyIn: true });
                              }}
                            >
                              {renderCard(cells[i], i)}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Payline SVG overlay — draws winning lines */}
            {activePaylines.length > 0 && (
              <svg
                className="absolute inset-0 pointer-events-none z-30"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                style={{ width: "100%", height: "100%", padding: "0 12px 4px 12px", boxSizing: "border-box" }}
              >
                {activePaylines.filter(p => p.d).map((pl, i) => (
                  <path
                    key={i}
                    d={pl.d}
                    stroke={pl.color}
                    strokeWidth="3"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="payline-draw"
                    style={liteMotion ? undefined : { filter: `drop-shadow(0 0 5px ${pl.color})` }}
                  />
                ))}
              </svg>
            )}
          </div>

          {/* COMBO NAME OVERLAY */}
          {comboDisplay && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center pointer-events-none">
              <div
                className="combo-overlay flex flex-col items-center gap-1 px-5 py-3 rounded-xl border-4 border-black"
                style={{
                  background: `linear-gradient(160deg,rgba(0,0,0,0.88) 0%,rgba(0,0,0,0.95) 100%)`,
                  boxShadow: liteMotion ? "4px 4px 0 #000" : `0 0 40px ${comboDisplay.color}88, 0 0 80px ${comboDisplay.color}44, 4px 4px 0 #000`,
                }}
              >
                <div
                  className="combo-text font-black uppercase tracking-widest text-center leading-none"
                  style={{
                    fontSize: "clamp(16px,5vw,26px)",
                    color: comboDisplay.color,
                    ["--cc" as string]: comboDisplay.color,
                  }}
                >
                  {comboDisplay.name}
                </div>
                <div
                  className="font-black text-white text-center"
                  style={{ fontSize: "clamp(12px,3.5vw,18px)", textShadow: liteMotion ? "1px 1px 0 #000" : `1px 1px 0 #000, 0 0 10px ${comboDisplay.color}` }}
                >
                  +{comboDisplay.winAmt.toLocaleString()} {t.coins}
                </div>
              </div>
            </div>
          )}

          {/* BONUS SPINS REMAINING INDICATOR */}
          {(bonusState.spinsRemaining > 0 || showBonusAnimation) && (
            <div className="absolute top-2 right-2 z-30 flex flex-col gap-1 items-end">
              <div className="px-2 py-1 rounded text-xs font-black border-2"
                style={{ background:"#7c3aed", color:"#fff", borderColor:"#000", boxShadow:"0 2px 0 #000" }}
              >
                {showBonusAnimation ? (
                  <span className={liteMotion ? "" : "animate-pulse"}>🎰 {t.bonusMode} +{BONUS_FREE_SPINS}!</span>
                ) : (
                  <span>🎰 {bonusState.spinsRemaining} {t.bonusRemaining}</span>
                )}
              </div>
              {/* Acumulador de ganhos do bonus */}
              {bonusWinDisplay !== null && bonusWinDisplay > 0 && (
                <div className="px-2 py-0.5 rounded text-xs font-black border-2"
                  style={{ background:"#166534", color:"#4ade80", borderColor:"#000", boxShadow:"0 2px 0 #000" }}
                >
                  +{bonusWinDisplay.toLocaleString()} {t.coins}
                </div>
              )}
            </div>
          )}

          {/* WIN BAR */}
          <div
            className={`shrink-0 text-center py-0 border-y-2 border-[#c87941] h-8 flex items-center justify-center overflow-hidden ${winAmt !== null && winAmt > 0 ? "win-pulse" : ""}`}
            style={{
              background: winAmt !== null && winAmt > 0
                ? "linear-gradient(90deg,#78350f 0%,#d97706 40%,#fbbf24 50%,#d97706 60%,#78350f 100%)"
                : dark,
            }}
          >
            {winAmt === null ? (
              <div className="text-center">
                <span className="subtitle-blink text-[10px] font-bold uppercase tracking-widest" style={{ color:"#f59e0b" }}>
                  {t.winUpTo} {maxPossibleWin.toLocaleString()} {t.coins}
                </span>
              </div>
            ) : winAmt > 0 ? (
              <div>
                <div className="text-lg font-black text-white" style={{ textShadow:"1px 1px 0 #000,0 0 10px #FFD700" }}>
                  +{winAmt.toLocaleString()} {t.coins}!
                </div>
                {isJackpot && <div className="text-xs font-black text-purple-300 jackpot-text">{tm.jackpotMax}</div>}
              </div>
            ) : (
              <span className="text-xs font-bold" style={{ color:"#c87941" }}>{tm.noWinningLines}</span>
            )}
          </div>

          {/* BALANCE BAR — abaixo do grid */}
          <div className="shrink-0 flex items-center justify-between px-4 py-1 border-b-2 border-[#c87941]" style={{ background: dark }}>
            <span className="text-[8px] font-bold uppercase text-gray-500">{t.balance}</span>
            <span className="text-base font-black text-green-400">{coins.toLocaleString()} {t.coins}</span>
          </div>

          {/* CONTROLS */}
          <div
            className="shrink-0 px-3 pt-2 pb-2"
            style={{ background: wood, paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
          >
            {/* REPLAY MODE — replace controls with badge + progress */}
            {isReplayMode && (
              <div className="flex flex-col items-center gap-2 py-1">
                {replayDone ? (
                  <div className="flex gap-2 w-full">
                    <a
                      href="/slot"
                      className="flex-1 h-12 rounded-lg border-2 border-black font-black text-sm uppercase tracking-widest flex items-center justify-center"
                      style={{ background: "linear-gradient(180deg,#4ade80,#15803d)", color: "#020617", boxShadow: "0 4px 0 #000" }}
                    >
                      🎰 Jogar
                    </a>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div
                      className="px-3 py-1 rounded font-black text-xs tracking-widest uppercase"
                      style={{ background: "rgba(168,85,247,0.2)", border: "1px solid #a855f7", color: "#a855f7" }}
                    >
                      🎬 REPLAY {replayIndex}/{replaySpins?.length ?? 0}
                    </div>
                    {replayUsername && (
                      <span className="text-xs text-gray-400 font-bold">@{replayUsername}</span>
                    )}
                  </div>
                )}
              </div>
            )}
            {/* Row 1: WALLET | SPIN | BUY BONUS */}
            {!isReplayMode && <div className="flex items-center gap-2 mb-2">

              {/* WALLET (DEP/WIT) */}
              <button
                onClick={onWalletOpen}
                disabled={!onWalletOpen}
                className="flex-1 h-10 border-2 border-black font-black uppercase tracking-wide active:scale-95 transition-transform disabled:opacity-40 flex flex-col items-center justify-center leading-none"
                style={{
                  background: "linear-gradient(180deg,#7a4520,#3d1c02)",
                  color: "#FFD700",
                  boxShadow: "0 3px 0 #000",
                  textShadow: "1px 1px 0 #000",
                  borderColor: "#c87941",
                }}
              >
                <span className="text-[9px]">{t.deposit}</span>
                <span className="text-[8px] font-bold" style={{ color: "#c87941" }}>{t.withdraw}</span>
              </button>

              {/* SPIN — center (with turbo badge) */}
              <div className="relative flex-none">
                <button
                  onClick={() => {
                    spin(true);
                  }}
                  disabled={isSpinning}
                  className="w-14 h-14 rounded-full border-4 border-black font-black flex items-center justify-center disabled:opacity-40 active:scale-95 transition-transform"
                  style={{
                    background: isSpinning
                      ? "linear-gradient(180deg,#6b7280,#4b5563)"
                      : "linear-gradient(180deg,#34d399 0%,#059669 50%,#047857 100%)",
                    boxShadow: isSpinning ? "0 2px 0 #000" : "0 5px 0 #000, 0 0 18px rgba(251,191,36,0.55)",
                    color: "#000",
                    transform: isSpinning ? "translateY(3px)" : undefined,
                  }}
                >
                  <span className={`text-[10px] font-black leading-none tracking-widest ${isSpinning && !liteMotion ? "animate-spin" : ""}`}>
                    {t.spin}
                  </span>
                </button>
                {/* Turbo badge — bottom center of spin button */}
                <button
                  onClick={() => { const next = !turbo; setTurbo(next); turboRef.current = next; }}
                  className="absolute left-1/2 -translate-x-1/2 -bottom-2 rounded-full border border-black font-black flex items-center justify-center active:scale-95 transition-all"
                  style={{
                    width: 18, height: 18, fontSize: 9,
                    background: turbo ? 'linear-gradient(180deg,#f59e0b,#b45309)' : 'linear-gradient(180deg,#374151,#1f2937)',
                    color: turbo ? '#000' : '#6b7280',
                    boxShadow: turbo ? '0 1px 0 #000, 0 0 6px rgba(245,158,11,0.7)' : '0 1px 0 #000',
                    zIndex: 10,
                  }}
                  title={turbo ? t.turboOn : t.turboOff}
                >⚡</button>
              </div>

              {/* BUY BONUS */}
              <button
                onClick={() => setShowBonusConfirm(true)}
                disabled={isSpinning}
                className="flex-1 h-10 border-2 border-black font-black uppercase tracking-wide active:scale-95 transition-transform disabled:opacity-40 flex flex-col items-center justify-center leading-none"
                style={{
                  background: isSpinning
                    ? "linear-gradient(180deg,#374151,#1f2937)"
                    : "linear-gradient(180deg,#7c3aed,#4c1d95)",
                  color: "#FFD700",
                  boxShadow: "0 3px 0 #000",
                  textShadow: "1px 1px 0 #000",
                  borderColor: "#7c3aed",
                }}
              >
                <span className="text-[9px]">{t.buyBonus}</span>
                <span className="text-[8px] font-bold" style={{ color: "#c4b5fd" }}>{bonusCost}c · 20×</span>
              </button>
            </div>}

            {/* Row 2: BET SELECTOR + LOG */}
            {!isReplayMode && <div className="flex items-center gap-2">
              <div
                className="flex-1 flex items-center gap-3 px-3 py-1.5 border-2 border-black rounded"
                style={{ background: "linear-gradient(180deg,#1e3a5f,#172554)" }}
              >
                <button
                  onClick={() => setBetIdx(i => Math.max(0, i - 1))}
                  disabled={betIdx === 0 || isSpinning}
                  className="w-7 h-7 rounded border-2 border-blue-400 bg-blue-900 font-black text-blue-300 text-base flex items-center justify-center disabled:opacity-30 flex-none"
                >−</button>
                <div className="flex-1 text-center">
                  <div className="text-[8px] font-bold uppercase text-blue-300 leading-none">{t.bet}</div>
                  <div className="text-lg font-black text-white leading-tight">{betCost}</div>
                  <div className="text-[8px] font-bold leading-none text-gray-500">{t.coins}</div>
                </div>
                <button
                  onClick={() => setBetIdx(i => Math.min(BET_OPTIONS.length - 1, i + 1))}
                  disabled={betIdx === BET_OPTIONS.length - 1 || isSpinning}
                  className="w-7 h-7 rounded border-2 border-blue-400 bg-blue-900 font-black text-blue-300 text-base flex items-center justify-center disabled:opacity-30 flex-none"
                >+</button>
              </div>
              {/* LOG button */}
              <button
                onClick={() => setShowSpinLog(true)}
                className="w-9 h-full min-h-[40px] rounded border-2 border-black font-black text-sm flex items-center justify-center flex-none"
                style={{ background: "linear-gradient(180deg,#1e3a5f,#172554)", color: "#60a5fa", borderColor: "#3b82f6" }}
                title={t.spinLog}
              >📋</button>
            </div>}

            {/* Spin Log Modal */}
            {showSpinLog && (
              <div className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/75" onClick={() => setShowSpinLog(false)}>
                <div
                  className="w-full max-w-[400px] rounded-t-2xl border-t-4 border-x-4 border-black overflow-hidden flex flex-col"
                  style={{ background: '#0d0814', borderColor: '#3b82f6', maxHeight: '70vh' }}
                  onClick={e => e.stopPropagation()}
                >
                  <div className="px-4 py-2.5 flex items-center justify-between border-b-2 border-blue-900" style={{ background: 'linear-gradient(180deg,#1e3a5f,#0f1f3d)' }}>
                    <span className="font-black text-sm uppercase tracking-widest text-blue-300">📋 {t.spinLog}</span>
                    <button onClick={() => setShowSpinLog(false)} className="w-6 h-6 rounded-full bg-red-600 border-2 border-black font-black text-white text-sm flex items-center justify-center">×</button>
                  </div>
                  <div className="overflow-y-auto flex-1 p-2 space-y-1">
                    {spinLog.length === 0 ? (
                      <div className="text-center text-gray-500 text-xs py-8">{t.noSpinsYet}</div>
                    ) : spinLog.map((entry, i) => {
                      const isWin = entry.win > 0;
                      const mult = entry.bet > 0 ? Math.round(entry.win / entry.bet) : 0;
                      const timeStr = new Date(entry.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                      return (
                        <div
                          key={i}
                          className="flex items-center gap-2 rounded-lg px-3 py-1.5"
                          style={{
                            background: isWin ? 'linear-gradient(90deg,#0f2a0f,#0a1a0a)' : '#0d0814',
                            border: `1px solid ${isWin ? '#16a34a' : '#1e3a5f'}`,
                          }}
                        >
                          <span className="text-[10px] font-mono text-gray-600 shrink-0 w-16">{timeStr}</span>
                          <span className="text-[10px] font-bold text-blue-400 shrink-0">{t.betPrefix} {entry.bet}</span>
                          {entry.bonus && <span className="text-[9px] bg-purple-900 text-purple-300 px-1 rounded shrink-0">{t.bonusBadge}</span>}
                          <span className="flex-1 text-[10px] truncate" style={{ color: isWin ? '#4ade80' : '#6b7280' }}>
                            {entry.combo ?? '—'}
                          </span>
                          <span className="text-[11px] font-black shrink-0" style={{ color: isWin ? '#4ade80' : '#6b7280' }}>
                            {isWin ? `+${entry.win}` : '0'}
                            {mult >= 2 ? <span className="text-yellow-400 text-[9px] ml-1">{mult}×</span> : null}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </>
  );
}









