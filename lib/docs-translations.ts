// Translations for the /docs page

export type DocsSupportedLanguage = 'pt-BR' | 'en' | 'es' | 'hi' | 'ru' | 'zh-CN';

export const docsTranslations = {
  "pt-BR": {
    // Navigation
    backToGame: "Voltar ao Jogo",
    documentation: "Documentação",
    subtitle: "Guia completo do Vibe Most Wanted - Tudo que você precisa saber",
    sections: "Seções",

    // Section titles
    economy: "Economia",
    battles: "Batalhas",
    achievements: "Conquistas",
    quests: "Missões",
    cards: "Cartas",
    faq: "FAQ",

    // Economy section
    economyTitle: "Sistema de Economia",
    economyIntro: "O Vibe Most Wanted possui um sistema de moedas virtuais ($TESTVBMS) que você ganha jogando e pode usar para participar de partidas ranqueadas.",

    howToEarnCoins: "Como Ganhar Moedas",
    earnPve: "PvE (Jogador vs IA)",
    earnPveDesc: "Até 30 vitórias/dia. Dificuldades: GEY (+5), TOP (+10), G (+15), MID (+20), GIGACHAD (+120)",
    earnPvp: "PvP (Jogador vs Jogador)",
    earnPvpDesc: "Vitória: +300 moedas. Derrota: -20 moedas. Empate: 0 moedas",
    earnAttack: "Modo Ataque",
    earnAttackDesc: "Até 5 ataques/dia. Vitória rouba pontos do oponente",
    earnAchievements: "Conquistas",
    earnAchievementsDesc: "63 conquistas disponíveis totalizando 302.300 moedas",
    earnQuests: "Missões Diárias e Semanais",
    earnQuestsDesc: "Complete objetivos para ganhar moedas extras",

    dailyLimit: "Limite Diário",
    dailyLimitDesc: "Você pode ganhar no máximo 3.500 moedas por dia (PvE + PvP + Conquistas)",

    entryFees: "Taxas de Entrada",
    entryFeeAttack: "Modo Ataque: 50 moedas por partida",
    entryFeePvp: "PvP: 40 moedas por partida",
    entryFeePve: "PvE: Grátis (sem taxa)",

    // Battles section
    battlesTitle: "Sistema de Batalhas",
    battlesIntro: "Escolha entre 3 modos de batalha, cada um com suas próprias regras e recompensas.",

    pveMode: "PvE - Jogador vs IA",
    pveModeDesc: "Batalhe contra a IA (Dealer) em 5 níveis de dificuldade. Sem taxa de entrada. Limite de 30 vitórias por dia para ganhar moedas.",
    pveDifficulties: "Dificuldades",
    pveGey: "GEY (Muito Fácil)",
    pveTop: "TOP (Fácil)",
    pveG: "G (Médio)",
    pveMid: "MID (Difícil)",
    pveGigachad: "GIGACHAD (Muito Difícil)",

    pvpMode: "PvP - Jogador vs Jogador",
    pvpModeDesc: "Batalhas em tempo real contra outros jogadores. Crie ou entre em salas. Taxa de entrada: 40 moedas.",
    pvpRewards: "Recompensas PvP",
    pvpWin: "Vitória: +300 moedas",
    pvpLoss: "Derrota: -20 moedas",
    pvpTie: "Empate: 0 moedas",

    attackMode: "Modo Ataque",
    attackModeDesc: "Ataque jogadores do ranking para roubar seus pontos. Limite de 5 ataques por dia. Taxa: 50 moedas.",
    attackHow: "Como Funciona",
    attackStep1: "Escolha um oponente do leaderboard",
    attackStep2: "Suas 5 cartas vs deck de defesa do oponente",
    attackStep3: "Vitória rouba pontos, derrota não perde moedas extras",

    // Achievements section
    achievementsTitle: "Sistema de Conquistas",
    achievementsIntro: "63 conquistas disponíveis que recompensam você por coletar cartas raras e completar objetivos.",
    totalRewards: "Total de Recompensas: 302.300 moedas",
    achievementCount: "63 conquistas",

    rarityAchievements: "Conquistas de Raridade",
    rarityDesc: "Colete cartas de diferentes raridades (Common, Uncommon, Rare, Epic, Legendary)",
    rarityCount: "27 conquistas baseadas em raridade",

    wearAchievements: "Conquistas de Condição",
    wearDesc: "Colete cartas em diferentes condições (Poor, Good, Excellent, Pristine)",
    wearCount: "18 conquistas baseadas em condição",

    foilAchievements: "Conquistas de Foil",
    foilDesc: "Colete cartas especiais foil que brilham",
    foilCount: "6 conquistas de cartas foil",

    progressiveAchievements: "Conquistas Progressivas",
    progressiveDesc: "48 conquistas baseadas em milestones de coleção (10, 25, 50, 100 cartas)",

    // Quests section
    questsTitle: "Sistema de Missões",
    questsIntro: "Complete missões diárias e semanais para ganhar moedas extras.",

    dailyQuests: "Missões Diárias",
    dailyQuestsDesc: "Resetam todo dia à meia-noite UTC",
    dailyQuest1: "Defesa da Fortaleza: +100 moedas por vencer 1 defesa PvP",

    weeklyQuests: "Missões Semanais",
    weeklyQuestsDesc: "Resetam toda segunda-feira às 00:00 UTC",
    weeklyQuest1: "Total de Partidas: Jogue 50 partidas (PvE, PvP, Ataque) - 500 moedas",
    weeklyQuest2: "Vitórias em Ataque: Vença 10 ataques - 800 moedas",
    weeklyQuest3: "Vitórias em Defesa: Defenda com sucesso 5 vezes - 300 moedas",
    weeklyQuest4: "Sequência PvE: Vença 10 partidas PvE seguidas - 1.000 moedas",

    weeklyRewards: "Recompensas Semanais",
    weeklyRewardsDesc: "Distribuídas automaticamente todo domingo às 00:00 UTC baseado no seu ranking de poder total",
    weeklyTier1: "1º Lugar: 1.000 moedas",
    weeklyTier2: "2º Lugar: 750 moedas",
    weeklyTier3: "3º Lugar: 500 moedas",
    weeklyTier4: "4º-10º Lugar: 300 moedas cada",

    // Cards section
    cardsTitle: "Sistema de Cartas",
    cardsIntro: "Cada carta NFT possui atributos únicos que determinam seu poder em batalha.",

    cardAttributes: "Atributos das Cartas",
    cardRarity: "Raridade",
    cardRarityDesc: "Common (1x), Uncommon (2x), Rare (3x), Epic (4x), Legendary (5x)",
    cardWear: "Condição (Wear)",
    cardWearDesc: "Poor (0.7x), Good (0.85x), Excellent (1x), Pristine (1.15x)",
    cardFoil: "Foil",
    cardFoilDesc: "Cartas foil ganham +10% de poder extra",

    powerCalculation: "Cálculo de Poder",
    powerFormula: "Poder = Raridade × Condição × (1 + Foil Bonus)",
    powerExample: "Exemplo: Legendary (5) × Pristine (1.15) × Foil (1.1) = 6.325 poder",

    defenseDeck: "Deck de Defesa",
    defenseDeckDesc: "Configure suas 5 melhores cartas para defender quando outros jogadores atacarem você. Atualize sempre que conseguir cartas mais fortes!",

    // FAQ section
    faqTitle: "Perguntas Frequentes",

    faq1Q: "Preciso pagar para jogar?",
    faq1A: "Não! PvE é totalmente grátis. PvP e Ataque têm pequenas taxas de entrada (40 e 50 moedas) que você pode ganhar jogando PvE.",

    faq2Q: "Como consigo mais cartas?",
    faq2A: "Compre packs no Vibe Market ou abra seus packs fechados. Você também pode negociar cartas com outros jogadores.",

    faq3Q: "Posso perder moedas?",
    faq3A: "Em PvE, você não perde moedas. Em PvP, você perde 20 moedas se perder. No Modo Ataque, você só paga a taxa de entrada (50 moedas).",

    faq4Q: "Quanto tempo demora uma partida?",
    faq4A: "PvE: instantâneo. PvP: 1-3 minutos. Ataque: instantâneo.",

    faq5Q: "O que é o ranking de poder total?",
    faq5A: "Seu poder total é a soma do poder das suas 5 cartas mais fortes. Este valor determina sua posição no leaderboard e quanto você pode ganhar nas recompensas semanais.",

    faq6Q: "Posso atacar o mesmo jogador várias vezes?",
    faq6A: "Sim, mas você tem apenas 5 ataques por dia no total, então use com sabedoria!",

    faq7Q: "Como funcionam as conquistas?",
    faq7A: "Conquistas são desbloqueadas automaticamente quando você atinge os critérios (coletar certas cartas). Você precisa clicar em 'Claim' para receber as moedas.",

    faq8Q: "O que acontece se eu não defender um ataque?",
    faq8A: "Seu deck de defesa automaticamente luta por você. Configure suas 5 melhores cartas no deck de defesa!",
  },
  "en": {
    // Navigation
    backToGame: "Back to Game",
    documentation: "Documentation",
    subtitle: "Complete Vibe Most Wanted guide - Everything you need to know",
    sections: "Sections",

    // Section titles
    economy: "Economy",
    battles: "Battles",
    achievements: "Achievements",
    quests: "Quests",
    cards: "Cards",
    faq: "FAQ",

    // Economy section
    economyTitle: "Economy System",
    economyIntro: "Vibe Most Wanted features a virtual currency system ($TESTVBMS) that you earn by playing and can use to participate in ranked matches.",

    howToEarnCoins: "How to Earn Coins",
    earnPve: "PvE (Player vs AI)",
    earnPveDesc: "Up to 30 wins/day. Difficulties: GEY (+5), TOP (+10), G (+15), MID (+20), GIGACHAD (+120)",
    earnPvp: "PvP (Player vs Player)",
    earnPvpDesc: "Win: +300 coins. Loss: -20 coins. Tie: 0 coins",
    earnAttack: "Attack Mode",
    earnAttackDesc: "Up to 5 attacks/day. Win steals opponent's points",
    earnAchievements: "Achievements",
    earnAchievementsDesc: "63 achievements available totaling 302,300 coins",
    earnQuests: "Daily and Weekly Quests",
    earnQuestsDesc: "Complete objectives to earn extra coins",

    dailyLimit: "Daily Limit",
    dailyLimitDesc: "You can earn a maximum of 3,500 coins per day (PvE + PvP + Achievements)",

    entryFees: "Entry Fees",
    entryFeeAttack: "Attack Mode: 50 coins per match",
    entryFeePvp: "PvP: 40 coins per match",
    entryFeePve: "PvE: Free (no fee)",

    // Battles section
    battlesTitle: "Battle System",
    battlesIntro: "Choose from 3 battle modes, each with its own rules and rewards.",

    pveMode: "PvE - Player vs AI",
    pveModeDesc: "Battle against AI (Dealer) in 5 difficulty levels. No entry fee. Limit of 30 wins per day to earn coins.",
    pveDifficulties: "Difficulties",
    pveGey: "GEY (Very Easy)",
    pveTop: "TOP (Easy)",
    pveG: "G (Medium)",
    pveMid: "MID (Hard)",
    pveGigachad: "GIGACHAD (Very Hard)",

    pvpMode: "PvP - Player vs Player",
    pvpModeDesc: "Real-time battles against other players. Create or join rooms. Entry fee: 40 coins.",
    pvpRewards: "PvP Rewards",
    pvpWin: "Win: +300 coins",
    pvpLoss: "Loss: -20 coins",
    pvpTie: "Tie: 0 coins",

    attackMode: "Attack Mode",
    attackModeDesc: "Attack leaderboard players to steal their points. Limit of 5 attacks per day. Fee: 50 coins.",
    attackHow: "How It Works",
    attackStep1: "Choose an opponent from the leaderboard",
    attackStep2: "Your 5 cards vs opponent's defense deck",
    attackStep3: "Win steals points, loss doesn't cost extra coins",

    // Achievements section
    achievementsTitle: "Achievement System",
    achievementsIntro: "63 achievements available that reward you for collecting rare cards and completing objectives.",
    totalRewards: "Total Rewards: 302,300 coins",
    achievementCount: "63 achievements",

    rarityAchievements: "Rarity Achievements",
    rarityDesc: "Collect cards of different rarities (Common, Uncommon, Rare, Epic, Legendary)",
    rarityCount: "27 rarity-based achievements",

    wearAchievements: "Wear Achievements",
    wearDesc: "Collect cards in different conditions (Poor, Good, Excellent, Pristine)",
    wearCount: "18 wear-based achievements",

    foilAchievements: "Foil Achievements",
    foilDesc: "Collect special shiny foil cards",
    foilCount: "6 foil card achievements",

    progressiveAchievements: "Progressive Achievements",
    progressiveDesc: "48 achievements based on collection milestones (10, 25, 50, 100 cards)",

    // Quests section
    questsTitle: "Quest System",
    questsIntro: "Complete daily and weekly quests to earn extra coins.",

    dailyQuests: "Daily Quests",
    dailyQuestsDesc: "Reset every day at midnight UTC",
    dailyQuest1: "Defense Fortress: +100 coins for winning 1 PvP defense",

    weeklyQuests: "Weekly Quests",
    weeklyQuestsDesc: "Reset every Monday at 00:00 UTC",
    weeklyQuest1: "Total Matches: Play 50 matches (PvE, PvP, Attack) - 500 coins",
    weeklyQuest2: "Attack Wins: Win 10 attacks - 800 coins",
    weeklyQuest3: "Defense Wins: Successfully defend 5 times - 300 coins",
    weeklyQuest4: "PvE Streak: Win 10 PvE matches in a row - 1,000 coins",

    weeklyRewards: "Weekly Rewards",
    weeklyRewardsDesc: "Automatically distributed every Sunday at 00:00 UTC based on your total power ranking",
    weeklyTier1: "1st Place: 1,000 coins",
    weeklyTier2: "2nd Place: 750 coins",
    weeklyTier3: "3rd Place: 500 coins",
    weeklyTier4: "4th-10th Place: 300 coins each",

    // Cards section
    cardsTitle: "Card System",
    cardsIntro: "Each NFT card has unique attributes that determine its battle power.",

    cardAttributes: "Card Attributes",
    cardRarity: "Rarity",
    cardRarityDesc: "Common (1x), Uncommon (2x), Rare (3x), Epic (4x), Legendary (5x)",
    cardWear: "Wear Condition",
    cardWearDesc: "Poor (0.7x), Good (0.85x), Excellent (1x), Pristine (1.15x)",
    cardFoil: "Foil",
    cardFoilDesc: "Foil cards gain +10% extra power",

    powerCalculation: "Power Calculation",
    powerFormula: "Power = Rarity × Wear × (1 + Foil Bonus)",
    powerExample: "Example: Legendary (5) × Pristine (1.15) × Foil (1.1) = 6.325 power",

    defenseDeck: "Defense Deck",
    defenseDeckDesc: "Set up your 5 best cards to defend when other players attack you. Update whenever you get stronger cards!",

    // FAQ section
    faqTitle: "Frequently Asked Questions",

    faq1Q: "Do I need to pay to play?",
    faq1A: "No! PvE is completely free. PvP and Attack have small entry fees (40 and 50 coins) that you can earn by playing PvE.",

    faq2Q: "How do I get more cards?",
    faq2A: "Buy packs on Vibe Market or open your unopened packs. You can also trade cards with other players.",

    faq3Q: "Can I lose coins?",
    faq3A: "In PvE, you don't lose coins. In PvP, you lose 20 coins if you lose. In Attack Mode, you only pay the entry fee (50 coins).",

    faq4Q: "How long does a match take?",
    faq4A: "PvE: instant. PvP: 1-3 minutes. Attack: instant.",

    faq5Q: "What is the total power ranking?",
    faq5A: "Your total power is the sum of your 5 strongest cards' power. This value determines your leaderboard position and how much you can earn in weekly rewards.",

    faq6Q: "Can I attack the same player multiple times?",
    faq6A: "Yes, but you only have 5 attacks per day total, so use them wisely!",

    faq7Q: "How do achievements work?",
    faq7A: "Achievements are automatically unlocked when you meet the criteria (collect certain cards). You need to click 'Claim' to receive the coins.",

    faq8Q: "What happens if I don't defend an attack?",
    faq8A: "Your defense deck automatically fights for you. Set up your 5 best cards in the defense deck!",
  },
  "es": {
    // Navigation
    backToGame: "Volver al Juego",
    documentation: "Documentación",
    subtitle: "Guía completa de Vibe Most Wanted - Todo lo que necesitas saber",
    sections: "Secciones",

    // Section titles
    economy: "Economía",
    battles: "Batallas",
    achievements: "Logros",
    quests: "Misiones",
    cards: "Cartas",
    faq: "Preguntas Frecuentes",

    // Economy section
    economyTitle: "Sistema de Economía",
    economyIntro: "Vibe Most Wanted cuenta con un sistema de moneda virtual ($TESTVBMS) que ganas jugando y puedes usar para participar en partidas clasificatorias.",

    howToEarnCoins: "Cómo Ganar Monedas",
    earnPve: "PvE (Jugador vs IA)",
    earnPveDesc: "Hasta 30 victorias/día. Dificultades: GEY (+5), TOP (+10), G (+15), MID (+20), GIGACHAD (+120)",
    earnPvp: "PvP (Jugador vs Jugador)",
    earnPvpDesc: "Victoria: +300 monedas. Derrota: -20 monedas. Empate: 0 monedas",
    earnAttack: "Modo Ataque",
    earnAttackDesc: "Hasta 5 ataques/día. Victoria roba puntos del oponente",
    earnAchievements: "Logros",
    earnAchievementsDesc: "63 logros disponibles con un total de 302,300 monedas",
    earnQuests: "Misiones Diarias y Semanales",
    earnQuestsDesc: "Completa objetivos para ganar monedas extras",

    dailyLimit: "Límite Diario",
    dailyLimitDesc: "Puedes ganar un máximo de 3,500 monedas por día (PvE + PvP + Logros)",

    entryFees: "Tarifas de Entrada",
    entryFeeAttack: "Modo Ataque: 50 monedas por partida",
    entryFeePvp: "PvP: 40 monedas por partida",
    entryFeePve: "PvE: Gratis (sin tarifa)",

    // Battles section
    battlesTitle: "Sistema de Batallas",
    battlesIntro: "Elige entre 3 modos de batalla, cada uno con sus propias reglas y recompensas.",

    pveMode: "PvE - Jugador vs IA",
    pveModeDesc: "Batalla contra la IA (Dealer) en 5 niveles de dificultad. Sin tarifa de entrada. Límite de 30 victorias por día para ganar monedas.",
    pveDifficulties: "Dificultades",
    pveGey: "GEY (Muy Fácil)",
    pveTop: "TOP (Fácil)",
    pveG: "G (Medio)",
    pveMid: "MID (Difícil)",
    pveGigachad: "GIGACHAD (Muy Difícil)",

    pvpMode: "PvP - Jugador vs Jugador",
    pvpModeDesc: "Batallas en tiempo real contra otros jugadores. Crea o únete a salas. Tarifa de entrada: 40 monedas.",
    pvpRewards: "Recompensas PvP",
    pvpWin: "Victoria: +300 monedas",
    pvpLoss: "Derrota: -20 monedas",
    pvpTie: "Empate: 0 monedas",

    attackMode: "Modo Ataque",
    attackModeDesc: "Ataca a jugadores de la tabla de clasificación para robar sus puntos. Límite de 5 ataques por día. Tarifa: 50 monedas.",
    attackHow: "Cómo Funciona",
    attackStep1: "Elige un oponente de la tabla de clasificación",
    attackStep2: "Tus 5 cartas vs mazo de defensa del oponente",
    attackStep3: "Victoria roba puntos, derrota no cuesta monedas extra",

    // Achievements section
    achievementsTitle: "Sistema de Logros",
    achievementsIntro: "63 logros disponibles que te recompensan por coleccionar cartas raras y completar objetivos.",
    totalRewards: "Recompensas Totales: 302,300 monedas",
    achievementCount: "63 logros",

    rarityAchievements: "Logros de Rareza",
    rarityDesc: "Colecciona cartas de diferentes rarezas (Común, Poco Común, Raro, Épico, Legendario)",
    rarityCount: "27 logros basados en rareza",

    wearAchievements: "Logros de Condición",
    wearDesc: "Colecciona cartas en diferentes condiciones (Pobre, Buena, Excelente, Impecable)",
    wearCount: "18 logros basados en condición",

    foilAchievements: "Logros de Foil",
    foilDesc: "Colecciona cartas foil especiales brillantes",
    foilCount: "6 logros de cartas foil",

    progressiveAchievements: "Logros Progresivos",
    progressiveDesc: "48 logros basados en hitos de colección (10, 25, 50, 100 cartas)",

    // Quests section
    questsTitle: "Sistema de Misiones",
    questsIntro: "Completa misiones diarias y semanales para ganar monedas extras.",

    dailyQuests: "Misiones Diarias",
    dailyQuestsDesc: "Se reinician cada día a medianoche UTC",
    dailyQuest1: "Fortaleza de Defensa: +100 monedas por ganar 1 defensa PvP",

    weeklyQuests: "Misiones Semanales",
    weeklyQuestsDesc: "Se reinician cada lunes a las 00:00 UTC",
    weeklyQuest1: "Total de Partidas: Juega 50 partidas (PvE, PvP, Ataque) - 500 monedas",
    weeklyQuest2: "Victorias en Ataque: Gana 10 ataques - 800 monedas",
    weeklyQuest3: "Victorias en Defensa: Defiende exitosamente 5 veces - 300 monedas",
    weeklyQuest4: "Racha PvE: Gana 10 partidas PvE seguidas - 1,000 monedas",

    weeklyRewards: "Recompensas Semanales",
    weeklyRewardsDesc: "Distribuidas automáticamente cada domingo a las 00:00 UTC según tu clasificación de poder total",
    weeklyTier1: "1er Lugar: 1,000 monedas",
    weeklyTier2: "2do Lugar: 750 monedas",
    weeklyTier3: "3er Lugar: 500 monedas",
    weeklyTier4: "4to-10mo Lugar: 300 monedas cada uno",

    // Cards section
    cardsTitle: "Sistema de Cartas",
    cardsIntro: "Cada carta NFT tiene atributos únicos que determinan su poder en batalla.",

    cardAttributes: "Atributos de Cartas",
    cardRarity: "Rareza",
    cardRarityDesc: "Común (1x), Poco Común (2x), Raro (3x), Épico (4x), Legendario (5x)",
    cardWear: "Condición (Wear)",
    cardWearDesc: "Pobre (0.7x), Buena (0.85x), Excelente (1x), Impecable (1.15x)",
    cardFoil: "Foil",
    cardFoilDesc: "Las cartas foil ganan +10% de poder extra",

    powerCalculation: "Cálculo de Poder",
    powerFormula: "Poder = Rareza × Condición × (1 + Bonus Foil)",
    powerExample: "Ejemplo: Legendario (5) × Impecable (1.15) × Foil (1.1) = 6.325 poder",

    defenseDeck: "Mazo de Defensa",
    defenseDeckDesc: "Configura tus 5 mejores cartas para defender cuando otros jugadores te ataquen. ¡Actualiza cuando consigas cartas más fuertes!",

    // FAQ section
    faqTitle: "Preguntas Frecuentes",

    faq1Q: "¿Necesito pagar para jugar?",
    faq1A: "¡No! PvE es completamente gratis. PvP y Ataque tienen pequeñas tarifas de entrada (40 y 50 monedas) que puedes ganar jugando PvE.",

    faq2Q: "¿Cómo consigo más cartas?",
    faq2A: "Compra packs en Vibe Market o abre tus packs sin abrir. También puedes intercambiar cartas con otros jugadores.",

    faq3Q: "¿Puedo perder monedas?",
    faq3A: "En PvE, no pierdes monedas. En PvP, pierdes 20 monedas si pierdes. En Modo Ataque, solo pagas la tarifa de entrada (50 monedas).",

    faq4Q: "¿Cuánto dura una partida?",
    faq4A: "PvE: instantáneo. PvP: 1-3 minutos. Ataque: instantáneo.",

    faq5Q: "¿Qué es la clasificación de poder total?",
    faq5A: "Tu poder total es la suma del poder de tus 5 cartas más fuertes. Este valor determina tu posición en la tabla de clasificación y cuánto puedes ganar en recompensas semanales.",

    faq6Q: "¿Puedo atacar al mismo jugador varias veces?",
    faq6A: "Sí, pero solo tienes 5 ataques por día en total, ¡así que úsalos sabiamente!",

    faq7Q: "¿Cómo funcionan los logros?",
    faq7A: "Los logros se desbloquean automáticamente cuando cumples los criterios (coleccionar ciertas cartas). Necesitas hacer clic en 'Reclamar' para recibir las monedas.",

    faq8Q: "¿Qué pasa si no defiendo un ataque?",
    faq8A: "Tu mazo de defensa lucha automáticamente por ti. ¡Configura tus 5 mejores cartas en el mazo de defensa!",
  },
  "hi": {
    // Navigation
    backToGame: "गेम पर वापस जाएं",
    documentation: "दस्तावेज़ीकरण",
    subtitle: "Vibe Most Wanted की पूरी गाइड - वह सब कुछ जो आपको जानने की ज़रूरत है",
    sections: "अनुभाग",

    // Section titles
    economy: "अर्थव्यवस्था",
    battles: "लड़ाइयाँ",
    achievements: "उपलब्धियाँ",
    quests: "मिशन",
    cards: "कार्ड",
    faq: "अक्सर पूछे जाने वाले प्रश्न",

    // Economy section (abbreviated for brevity - full translation recommended)
    economyTitle: "अर्थव्यवस्था प्रणाली",
    economyIntro: "Vibe Most Wanted में एक वर्चुअल करेंसी सिस्टम ($TESTVBMS) है जो आप खेलकर कमाते हैं और रैंक मैचों में भाग लेने के लिए उपयोग कर सकते हैं।",

    howToEarnCoins: "सिक्के कैसे कमाएं",
    earnPve: "PvE (खिलाड़ी बनाम AI)",
    earnPveDesc: "30 जीत/दिन तक। कठिनाइयाँ: GEY (+5), TOP (+10), G (+15), MID (+20), GIGACHAD (+120)",
    earnPvp: "PvP (खिलाड़ी बनाम खिलाड़ी)",
    earnPvpDesc: "जीत: +300 सिक्के। हार: -20 सिक्के। टाई: 0 सिक्के",
    earnAttack: "हमला मोड",
    earnAttackDesc: "5 हमले/दिन तक। जीत विरोधी के अंक चुराती है",
    earnAchievements: "उपलब्धियाँ",
    earnAchievementsDesc: "63 उपलब्धियाँ उपलब्ध हैं जिनमें कुल 302,300 सिक्के हैं",
    earnQuests: "दैनिक और साप्ताहिक मिशन",
    earnQuestsDesc: "अतिरिक्त सिक्के कमाने के लिए उद्देश्य पूरे करें",

    dailyLimit: "दैनिक सीमा",
    dailyLimitDesc: "आप प्रति दिन अधिकतम 3,500 सिक्के कमा सकते हैं (PvE + PvP + उपलब्धियाँ)",

    entryFees: "प्रवेश शुल्क",
    entryFeeAttack: "हमला मोड: 50 सिक्के प्रति मैच",
    entryFeePvp: "PvP: 40 सिक्के प्रति मैच",
    entryFeePve: "PvE: मुफ़्त (कोई शुल्क नहीं)",

    // Shortened for brevity - remaining sections would follow similar pattern
    battlesTitle: "लड़ाई प्रणाली",
    battlesIntro: "3 लड़ाई मोड में से चुनें, प्रत्येक के अपने नियम और पुरस्कार हैं।",

    achievementsTitle: "उपलब्धि प्रणाली",
    achievementsIntro: "63 उपलब्धियाँ उपलब्ध हैं जो आपको दुर्लभ कार्ड इकट्ठा करने और उद्देश्य पूरे करने के लिए पुरस्कृत करती हैं।",

    questsTitle: "मिशन प्रणाली",
    questsIntro: "अतिरिक्त सिक्के कमाने के लिए दैनिक और साप्ताहिक मिशन पूरे करें।",

    cardsTitle: "कार्ड प्रणाली",
    cardsIntro: "प्रत्येक NFT कार्ड में अद्वितीय विशेषताएं हैं जो उसकी लड़ाई शक्ति निर्धारित करती हैं।",

    faqTitle: "अक्सर पूछे जाने वाले प्रश्न",

    // Key FAQ items
    faq1Q: "क्या मुझे खेलने के लिए भुगतान करना होगा?",
    faq1A: "नहीं! PvE पूरी तरह से मुफ़्त है। PvP और हमले में छोटे प्रवेश शुल्क (40 और 50 सिक्के) हैं जो आप PvE खेलकर कमा सकते हैं।",

    // Abbreviated remaining entries for space
    pveMode: "PvE - खिलाड़ी बनाम AI",
    pvpMode: "PvP - खिलाड़ी बनाम खिलाड़ी",
    attackMode: "हमला मोड",
    dailyQuests: "दैनिक मिशन",
    weeklyQuests: "साप्ताहिक मिशन",
    weeklyRewards: "साप्ताहिक पुरस्कार",
    pveModeDesc: "5 कठिनाई स्तरों में AI (डीलर) के खिलाफ लड़ें। कोई प्रवेश शुल्क नहीं। सिक्के कमाने के लिए प्रति दिन 30 जीत की सीमा।",
    pvpModeDesc: "अन्य खिलाड़ियों के खिलाफ वास्तविक समय की लड़ाई। कमरे बनाएं या शामिल हों। प्रवेश शुल्क: 40 सिक्के।",
    attackModeDesc: "लीडरबोर्ड खिलाड़ियों पर हमला करके उनके अंक चुराएं। प्रति दिन 5 हमलों की सीमा। शुल्क: 50 सिक्के।",
    pveDifficulties: "कठिनाइयाँ",
    pveGey: "GEY (बहुत आसान)",
    pveTop: "TOP (आसान)",
    pveG: "G (मध्यम)",
    pveMid: "MID (कठिन)",
    pveGigachad: "GIGACHAD (बहुत कठिन)",
    pvpRewards: "PvP पुरस्कार",
    pvpWin: "जीत: +300 सिक्के",
    pvpLoss: "हार: -20 सिक्के",
    pvpTie: "टाई: 0 सिक्के",
    attackHow: "यह कैसे काम करता है",
    attackStep1: "लीडरबोर्ड से एक विरोधी चुनें",
    attackStep2: "आपके 5 कार्ड बनाम विरोधी की रक्षा डेक",
    attackStep3: "जीत अंक चुराती है, हार अतिरिक्त सिक्के नहीं लेती",
    totalRewards: "कुल पुरस्कार: 302,300 सिक्के",
    achievementCount: "63 उपलब्धियाँ",
    rarityAchievements: "दुर्लभता उपलब्धियाँ",
    rarityDesc: "विभिन्न दुर्लभताओं के कार्ड इकट्ठा करें (सामान्य, असामान्य, दुर्लभ, महाकाव्य, पौराणिक)",
    rarityCount: "27 दुर्लभता-आधारित उपलब्धियाँ",
    wearAchievements: "स्थिति उपलब्धियाँ",
    wearDesc: "विभिन्न स्थितियों में कार्ड इकट्ठा करें (खराब, अच्छा, उत्कृष्ट, बेदाग)",
    wearCount: "18 स्थिति-आधारित उपलब्धियाँ",
    foilAchievements: "फ़ॉयल उपलब्धियाँ",
    foilDesc: "विशेष चमकदार फ़ॉयल कार्ड इकट्ठा करें",
    foilCount: "6 फ़ॉयल कार्ड उपलब्धियाँ",
    progressiveAchievements: "प्रगतिशील उपलब्धियाँ",
    progressiveDesc: "संग्रह मील के पत्थर पर आधारित 48 उपलब्धियाँ (10, 25, 50, 100 कार्ड)",
    dailyQuestsDesc: "हर दिन मध्यरात्रि UTC पर रीसेट हों",
    dailyQuest1: "रक्षा किला: 1 PvP रक्षा जीतने पर +100 सिक्के",
    weeklyQuestsDesc: "हर सोमवार 00:00 UTC पर रीसेट हों",
    weeklyQuest1: "कुल मैच: 50 मैच खेलें (PvE, PvP, हमला) - 500 सिक्के",
    weeklyQuest2: "हमला जीत: 10 हमले जीतें - 800 सिक्के",
    weeklyQuest3: "रक्षा जीत: 5 बार सफलतापूर्वक रक्षा करें - 300 सिक्के",
    weeklyQuest4: "PvE लकीर: लगातार 10 PvE मैच जीतें - 1,000 सिक्के",
    weeklyRewardsDesc: "हर रविवार 00:00 UTC पर आपकी कुल शक्ति रैंकिंग के आधार पर स्वचालित रूप से वितरित",
    weeklyTier1: "1st स्थान: 1,000 सिक्के",
    weeklyTier2: "2nd स्थान: 750 सिक्के",
    weeklyTier3: "3rd स्थान: 500 सिक्के",
    weeklyTier4: "4th-10th स्थान: 300 सिक्के प्रत्येक",
    cardAttributes: "कार्ड विशेषताएं",
    cardRarity: "दुर्लभता",
    cardRarityDesc: "सामान्य (1x), असामान्य (2x), दुर्लभ (3x), महाकाव्य (4x), पौराणिक (5x)",
    cardWear: "स्थिति (Wear)",
    cardWearDesc: "खराब (0.7x), अच्छा (0.85x), उत्कृष्ट (1x), बेदाग (1.15x)",
    cardFoil: "फ़ॉयल",
    cardFoilDesc: "फ़ॉयल कार्ड +10% अतिरिक्त शक्ति प्राप्त करते हैं",
    powerCalculation: "शक्ति गणना",
    powerFormula: "शक्ति = दुर्लभता × स्थिति × (1 + फ़ॉयल बोनस)",
    powerExample: "उदाहरण: पौराणिक (5) × बेदाग (1.15) × फ़ॉयल (1.1) = 6.325 शक्ति",
    defenseDeck: "रक्षा डेक",
    defenseDeckDesc: "जब अन्य खिलाड़ी आप पर हमला करें तो रक्षा के लिए अपने 5 सर्वश्रेष्ठ कार्ड सेट करें। जब भी आपको मजबूत कार्ड मिलें तो अपडेट करें!",
    faq2Q: "मुझे और कार्ड कैसे मिलें?",
    faq2A: "Vibe Market पर पैक खरीदें या अपने बिना खोले पैक खोलें। आप अन्य खिलाड़ियों के साथ कार्ड का व्यापार भी कर सकते हैं।",
    faq3Q: "क्या मैं सिक्के खो सकता हूं?",
    faq3A: "PvE में, आप सिक्के नहीं खोते। PvP में, आप हारने पर 20 सिक्के खो देते हैं। हमला मोड में, आप केवल प्रवेश शुल्क (50 सिक्के) का भुगतान करते हैं।",
    faq4Q: "एक मैच में कितना समय लगता है?",
    faq4A: "PvE: तुरंत। PvP: 1-3 मिनट। हमला: तुरंत।",
    faq5Q: "कुल शक्ति रैंकिंग क्या है?",
    faq5A: "आपकी कुल शक्ति आपके 5 सबसे मजबूत कार्डों की शक्ति का योग है। यह मान आपकी लीडरबोर्ड स्थिति निर्धारित करता है और आप साप्ताहिक पुरस्कारों में कितना कमा सकते हैं।",
    faq6Q: "क्या मैं एक ही खिलाड़ी पर कई बार हमला कर सकता हूं?",
    faq6A: "हाँ, लेकिन आपके पास कुल मिलाकर केवल प्रति दिन 5 हमले हैं, इसलिए उन्हें बुद्धिमानी से उपयोग करें!",
    faq7Q: "उपलब्धियाँ कैसे काम करती हैं?",
    faq7A: "जब आप मानदंडों को पूरा करते हैं (कुछ कार्ड इकट्ठा करते हैं) तो उपलब्धियाँ स्वचालित रूप से अनलॉक हो जाती हैं। सिक्के प्राप्त करने के लिए आपको 'दावा करें' पर क्लिक करना होगा।",
    faq8Q: "अगर मैं हमले का बचाव नहीं करता तो क्या होता है?",
    faq8A: "आपकी रक्षा डेक स्वचालित रूप से आपके लिए लड़ती है। रक्षा डेक में अपने 5 सर्वश्रेष्ठ कार्ड सेट करें!",
  },
  "ru": {
    // Navigation
    backToGame: "Вернуться к игре",
    documentation: "Документация",
    subtitle: "Полное руководство Vibe Most Wanted - Все, что вам нужно знать",
    sections: "Разделы",

    // Section titles
    economy: "Экономика",
    battles: "Битвы",
    achievements: "Достижения",
    quests: "Квесты",
    cards: "Карты",
    faq: "Часто задаваемые вопросы",

    // Economy section (abbreviated - full translation recommended)
    economyTitle: "Экономическая система",
    economyIntro: "Vibe Most Wanted имеет систему виртуальной валюты ($TESTVBMS), которую вы зарабатываете, играя, и можете использовать для участия в рейтинговых матчах.",

    howToEarnCoins: "Как заработать монеты",
    earnPve: "PvE (Игрок против ИИ)",
    earnPveDesc: "До 30 побед/день. Сложности: GEY (+5), TOP (+10), G (+15), MID (+20), GIGACHAD (+120)",
    earnPvp: "PvP (Игрок против игрока)",
    earnPvpDesc: "Победа: +300 монет. Поражение: -20 монет. Ничья: 0 монет",
    earnAttack: "Режим атаки",
    earnAttackDesc: "До 5 атак/день. Победа крадет очки противника",
    earnAchievements: "Достижения",
    earnAchievementsDesc: "63 достижения на общую сумму 302,300 монет",
    earnQuests: "Ежедневные и еженедельные квесты",
    earnQuestsDesc: "Выполняйте задания, чтобы заработать дополнительные монеты",

    dailyLimit: "Дневной лимит",
    dailyLimitDesc: "Вы можете заработать максимум 3,500 монет в день (PvE + PvP + Достижения)",

    entryFees: "Входная плата",
    entryFeeAttack: "Режим атаки: 50 монет за матч",
    entryFeePvp: "PvP: 40 монет за матч",
    entryFeePve: "PvE: Бесплатно (без платы)",

    // Battles section (abbreviated)
    battlesTitle: "Система битв",
    battlesIntro: "Выберите один из 3 режимов битвы, каждый со своими правилами и наградами.",

    pveMode: "PvE - Игрок против ИИ",
    pveModeDesc: "Сражайтесь против ИИ (Дилера) на 5 уровнях сложности. Без входной платы. Лимит 30 побед в день для заработка монет.",
    pveDifficulties: "Сложности",
    pveGey: "GEY (Очень легко)",
    pveTop: "TOP (Легко)",
    pveG: "G (Средне)",
    pveMid: "MID (Сложно)",
    pveGigachad: "GIGACHAD (Очень сложно)",

    pvpMode: "PvP - Игрок против игрока",
    pvpModeDesc: "Битвы в реальном времени против других игроков. Создайте или присоединитесь к комнатам. Входная плата: 40 монет.",
    pvpRewards: "Награды PvP",
    pvpWin: "Победа: +300 монет",
    pvpLoss: "Поражение: -20 монет",
    pvpTie: "Ничья: 0 монет",

    attackMode: "Режим атаки",
    attackModeDesc: "Атакуйте игроков из таблицы лидеров, чтобы украсть их очки. Лимит 5 атак в день. Плата: 50 монет.",
    attackHow: "Как это работает",
    attackStep1: "Выберите противника из таблицы лидеров",
    attackStep2: "Ваши 5 карт против защитной колоды противника",
    attackStep3: "Победа крадет очки, поражение не стоит дополнительных монет",

    // Achievements section (abbreviated)
    achievementsTitle: "Система достижений",
    achievementsIntro: "63 достижения, которые награждают вас за сбор редких карт и выполнение задач.",
    totalRewards: "Общие награды: 302,300 монет",
    achievementCount: "63 достижения",

    rarityAchievements: "Достижения по редкости",
    rarityDesc: "Собирайте карты разной редкости (Обычный, Необычный, Редкий, Эпический, Легендарный)",
    rarityCount: "27 достижений по редкости",

    wearAchievements: "Достижения по состоянию",
    wearDesc: "Собирайте карты в разных состояниях (Плохое, Хорошее, Отличное, Идеальное)",
    wearCount: "18 достижений по состоянию",

    foilAchievements: "Фольгированные достижения",
    foilDesc: "Собирайте специальные блестящие фольгированные карты",
    foilCount: "6 достижений фольгированных карт",

    progressiveAchievements: "Прогрессивные достижения",
    progressiveDesc: "48 достижений на основе вех коллекции (10, 25, 50, 100 карт)",

    // Quests section (abbreviated)
    questsTitle: "Система квестов",
    questsIntro: "Выполняйте ежедневные и еженедельные квесты, чтобы заработать дополнительные монеты.",

    dailyQuests: "Ежедневные квесты",
    dailyQuestsDesc: "Сбрасываются каждый день в полночь UTC",
    dailyQuest1: "Крепость защиты: +100 монет за победу в 1 защите PvP",

    weeklyQuests: "Еженедельные квесты",
    weeklyQuestsDesc: "Сбрасываются каждый понедельник в 00:00 UTC",
    weeklyQuest1: "Всего матчей: Сыграйте 50 матчей (PvE, PvP, Атака) - 500 монет",
    weeklyQuest2: "Победы в атаке: Выиграйте 10 атак - 800 монет",
    weeklyQuest3: "Победы в защите: Успешно защититесь 5 раз - 300 монет",
    weeklyQuest4: "Серия PvE: Выиграйте 10 матчей PvE подряд - 1,000 монет",

    weeklyRewards: "Еженедельные награды",
    weeklyRewardsDesc: "Автоматически распределяются каждое воскресенье в 00:00 UTC на основе вашего рейтинга общей мощности",
    weeklyTier1: "1-е место: 1,000 монет",
    weeklyTier2: "2-е место: 750 монет",
    weeklyTier3: "3-е место: 500 монет",
    weeklyTier4: "4-10 места: 300 монет каждому",

    // Cards section (abbreviated)
    cardsTitle: "Система карт",
    cardsIntro: "Каждая NFT-карта имеет уникальные атрибуты, которые определяют ее боевую мощность.",

    cardAttributes: "Атрибуты карт",
    cardRarity: "Редкость",
    cardRarityDesc: "Обычный (1x), Необычный (2x), Редкий (3x), Эпический (4x), Легендарный (5x)",
    cardWear: "Состояние (Wear)",
    cardWearDesc: "Плохое (0.7x), Хорошее (0.85x), Отличное (1x), Идеальное (1.15x)",
    cardFoil: "Фольга",
    cardFoilDesc: "Фольгированные карты получают +10% дополнительной мощности",

    powerCalculation: "Расчет мощности",
    powerFormula: "Мощность = Редкость × Состояние × (1 + Бонус фольги)",
    powerExample: "Пример: Легендарный (5) × Идеальное (1.15) × Фольга (1.1) = 6.325 мощности",

    defenseDeck: "Защитная колода",
    defenseDeckDesc: "Установите свои 5 лучших карт для защиты, когда другие игроки атакуют вас. Обновляйте, когда получаете более сильные карты!",

    // FAQ section (abbreviated)
    faqTitle: "Часто задаваемые вопросы",

    faq1Q: "Нужно ли платить, чтобы играть?",
    faq1A: "Нет! PvE полностью бесплатен. PvP и Атака имеют небольшие входные платы (40 и 50 монет), которые вы можете заработать, играя в PvE.",

    faq2Q: "Как получить больше карт?",
    faq2A: "Покупайте паки на Vibe Market или открывайте свои неоткрытые паки. Вы также можете обменивать карты с другими игроками.",

    faq3Q: "Могу ли я потерять монеты?",
    faq3A: "В PvE вы не теряете монеты. В PvP вы теряете 20 монет при поражении. В режиме атаки вы платите только входную плату (50 монет).",

    faq4Q: "Сколько длится матч?",
    faq4A: "PvE: мгновенно. PvP: 1-3 минуты. Атака: мгновенно.",

    faq5Q: "Что такое рейтинг общей мощности?",
    faq5A: "Ваша общая мощность - это сумма мощности ваших 5 сильнейших карт. Это значение определяет вашу позицию в таблице лидеров и сколько вы можете заработать в еженедельных наградах.",

    faq6Q: "Могу ли я атаковать одного и того же игрока несколько раз?",
    faq6A: "Да, но у вас всего 5 атак в день, так что используйте их мудро!",

    faq7Q: "Как работают достижения?",
    faq7A: "Достижения автоматически разблокируются, когда вы выполняете критерии (собираете определенные карты). Вам нужно нажать 'Получить', чтобы получить монеты.",

    faq8Q: "Что происходит, если я не защищаюсь от атаки?",
    faq8A: "Ваша защитная колода автоматически сражается за вас. Установите свои 5 лучших карт в защитную колоду!",
  },
  "zh-CN": {
    // Navigation
    backToGame: "返回游戏",
    documentation: "文档",
    subtitle: "Vibe Most Wanted 完整指南 - 您需要知道的一切",
    sections: "部分",

    // Section titles
    economy: "经济",
    battles: "战斗",
    achievements: "成就",
    quests: "任务",
    cards: "卡牌",
    faq: "常见问题",

    // Economy section (abbreviated)
    economyTitle: "经济系统",
    economyIntro: "Vibe Most Wanted 拥有虚拟货币系统 ($TESTVBMS)，您可以通过游戏赚取并用于参与排名赛。",

    howToEarnCoins: "如何赚取金币",
    earnPve: "PvE (玩家对AI)",
    earnPveDesc: "每天最多30场胜利。难度：GEY (+5)、TOP (+10)、G (+15)、MID (+20)、GIGACHAD (+120)",
    earnPvp: "PvP (玩家对玩家)",
    earnPvpDesc: "胜利: +300 金币。失败: -20 金币。平局: 0 金币",
    earnAttack: "攻击模式",
    earnAttackDesc: "每天最多5次攻击。胜利窃取对手积分",
    earnAchievements: "成就",
    earnAchievementsDesc: "63项成就，总计302,300金币",
    earnQuests: "每日和每周任务",
    earnQuestsDesc: "完成目标以赚取额外金币",

    dailyLimit: "每日限制",
    dailyLimitDesc: "您每天最多可以赚取3,500金币 (PvE + PvP + 成就)",

    entryFees: "入场费",
    entryFeeAttack: "攻击模式: 每场50金币",
    entryFeePvp: "PvP: 每场40金币",
    entryFeePve: "PvE: 免费 (无费用)",

    // Battles section (abbreviated)
    battlesTitle: "战斗系统",
    battlesIntro: "从3种战斗模式中选择，每种都有自己的规则和奖励。",

    pveMode: "PvE - 玩家对AI",
    pveModeDesc: "在5个难度级别对抗AI (庄家)。无入场费。每天最多30场胜利以赚取金币。",
    pveDifficulties: "难度",
    pveGey: "GEY (非常简单)",
    pveTop: "TOP (简单)",
    pveG: "G (中等)",
    pveMid: "MID (困难)",
    pveGigachad: "GIGACHAD (非常困难)",

    pvpMode: "PvP - 玩家对玩家",
    pvpModeDesc: "与其他玩家实时战斗。创建或加入房间。入场费：40金币。",
    pvpRewards: "PvP 奖励",
    pvpWin: "胜利: +300 金币",
    pvpLoss: "失败: -20 金币",
    pvpTie: "平局: 0 金币",

    attackMode: "攻击模式",
    attackModeDesc: "攻击排行榜玩家窃取他们的积分。每天限制5次攻击。费用：50金币。",
    attackHow: "如何运作",
    attackStep1: "从排行榜选择对手",
    attackStep2: "您的5张卡牌对抗对手的防守卡组",
    attackStep3: "胜利窃取积分，失败不花费额外金币",

    // Achievements section (abbreviated)
    achievementsTitle: "成就系统",
    achievementsIntro: "63项成就奖励您收集稀有卡牌和完成目标。",
    totalRewards: "总奖励: 302,300 金币",
    achievementCount: "63 项成就",

    rarityAchievements: "稀有度成就",
    rarityDesc: "收集不同稀有度的卡牌 (普通、罕见、稀有、史诗、传说)",
    rarityCount: "27项基于稀有度的成就",

    wearAchievements: "状态成就",
    wearDesc: "收集不同状态的卡牌 (差、良好、优秀、完美)",
    wearCount: "18项基于状态的成就",

    foilAchievements: "闪卡成就",
    foilDesc: "收集特殊闪亮的闪卡",
    foilCount: "6项闪卡成就",

    progressiveAchievements: "渐进式成就",
    progressiveDesc: "48项基于收藏里程碑的成就 (10、25、50、100张卡牌)",

    // Quests section (abbreviated)
    questsTitle: "任务系统",
    questsIntro: "完成每日和每周任务以赚取额外金币。",

    dailyQuests: "每日任务",
    dailyQuestsDesc: "每天UTC午夜重置",
    dailyQuest1: "防御堡垒: 赢得1场PvP防守 +100 金币",

    weeklyQuests: "每周任务",
    weeklyQuestsDesc: "每周一 00:00 UTC 重置",
    weeklyQuest1: "总比赛: 进行50场比赛 (PvE, PvP, 攻击) - 500 金币",
    weeklyQuest2: "攻击胜利: 赢得10场攻击 - 800 金币",
    weeklyQuest3: "防守胜利: 成功防守5次 - 300 金币",
    weeklyQuest4: "PvE连胜: 连续赢得10场PvE比赛 - 1,000 金币",

    weeklyRewards: "每周奖励",
    weeklyRewardsDesc: "每周日 00:00 UTC 根据您的总力量排名自动分发",
    weeklyTier1: "第1名: 1,000 金币",
    weeklyTier2: "第2名: 750 金币",
    weeklyTier3: "第3名: 500 金币",
    weeklyTier4: "第4-10名: 每人300 金币",

    // Cards section (abbreviated)
    cardsTitle: "卡牌系统",
    cardsIntro: "每张NFT卡牌都有独特的属性，决定其战斗力。",

    cardAttributes: "卡牌属性",
    cardRarity: "稀有度",
    cardRarityDesc: "普通 (1x)、罕见 (2x)、稀有 (3x)、史诗 (4x)、传说 (5x)",
    cardWear: "状态 (Wear)",
    cardWearDesc: "差 (0.7x)、良好 (0.85x)、优秀 (1x)、完美 (1.15x)",
    cardFoil: "闪卡",
    cardFoilDesc: "闪卡获得 +10% 额外力量",

    powerCalculation: "力量计算",
    powerFormula: "力量 = 稀有度 × 状态 × (1 + 闪卡加成)",
    powerExample: "示例: 传说 (5) × 完美 (1.15) × 闪卡 (1.1) = 6.325 力量",

    defenseDeck: "防守卡组",
    defenseDeckDesc: "设置您最好的5张卡牌，当其他玩家攻击您时进行防守。获得更强卡牌时立即更新！",

    // FAQ section (abbreviated)
    faqTitle: "常见问题",

    faq1Q: "我需要付费才能玩吗？",
    faq1A: "不需要！PvE完全免费。PvP和攻击有小额入场费 (40和50金币)，您可以通过玩PvE赚取。",

    faq2Q: "如何获得更多卡牌？",
    faq2A: "在Vibe Market购买卡包或打开您未开封的卡包。您也可以与其他玩家交易卡牌。",

    faq3Q: "我会失去金币吗？",
    faq3A: "在PvE中，您不会失去金币。在PvP中，如果您输了会失去20金币。在攻击模式中，您只支付入场费 (50金币)。",

    faq4Q: "一场比赛需要多长时间？",
    faq4A: "PvE: 即时。PvP: 1-3分钟。攻击: 即时。",

    faq5Q: "什么是总力量排名？",
    faq5A: "您的总力量是您5张最强卡牌的力量总和。此值决定您的排行榜位置以及您在每周奖励中可以赚取多少。",

    faq6Q: "我可以多次攻击同一个玩家吗？",
    faq6A: "可以，但您每天总共只有5次攻击，所以要明智使用！",

    faq7Q: "成就如何运作？",
    faq7A: "当您满足标准 (收集特定卡牌) 时，成就会自动解锁。您需要点击'领取'以获得金币。",

    faq8Q: "如果我不防守攻击会发生什么？",
    faq8A: "您的防守卡组会自动为您战斗。在防守卡组中设置您最好的5张卡牌！",
  },
};

export type DocsTranslationKey = keyof typeof docsTranslations['en'];
